import { Injectable, BadRequestException, Logger } from '@nestjs/common'
import * as XLSX from 'xlsx'

// ── Types ─────────────────────────────────────────────────────────────────────

export type RawStockRow = {
  readonly codigo: string
  readonly nombre: string
  readonly stock: number
  readonly detal: number // centavos COP (ya convertido desde pesos)
}

// ── Constants ─────────────────────────────────────────────────────────────────

// 0-based column indices matching the Optimun Excel export layout.
// Col A (0) is always empty in Optimun exports — data starts at B.
const COL = {
  CODIGO: 1,      // B
  NOMBRE: 2,      // C
  EXISTENCIAS: 4, // E
  DETAL: 9,       // J — falls outside usedRange in COM-exported files; range is forced below
} as const

// Normalised expected headers (accent-insensitive comparison applied at runtime).
// Header row position is auto-detected (see locateHeaderRow) because Optimun
// may export with or without an initial blank row depending on the version.
const REQUIRED_HEADERS: ReadonlyArray<{ col: number; label: string }> = [
  { col: COL.CODIGO,      label: 'CODIGO' },
  { col: COL.NOMBRE,      label: 'NOMBRE PRODUCTO' },
  { col: COL.EXISTENCIAS, label: 'EXISTENCIAS' },
  { col: COL.DETAL,       label: 'DETAL' },
]

// Optimun codes are always: {digits}-{alphanumeric+}, with no second dash.
// e.g. 9-00017, 10-4009, 9-MSCPL, 6-CDIDTMN
// The $ anchor is critical: without it, dates like "01-01-2024" pass because
// "01" matches \d+ and "0" matches [A-Za-z0-9] before the second dash.
const VALID_CODE_RE = /^\d+-[A-Za-z0-9]+$/

// A full Optimun catalog (~750 rows) is well under 1 MB when exported.
// 5 MB is a generous ceiling that still rejects obvious non-Excel uploads.
const MAX_FILE_BYTES = 5 * 1024 * 1024

// ── Helpers ───────────────────────────────────────────────────────────────────

function stripAccents(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '')
}

function normalizeHeader(s: string): string {
  return stripAccents(s).toUpperCase().trim()
}

// ── Service ───────────────────────────────────────────────────────────────────

@Injectable()
export class SyncFileParserService {
  private readonly logger = new Logger(SyncFileParserService.name)

  /**
   * Parses an Optimun-exported .xlsx buffer into typed stock rows.
   * Throws BadRequestException for any structural or size violation.
   *
   * Guarantees:
   * - All string fields are trimmed.
   * - `detal` is in centavos COP (pesos × 100).
   * - `stock` and `detal` are non-negative integers (0 if unparseable).
   * - Rows with empty CÓDIGO are silently skipped.
   */
  parse(buffer: Buffer): RawStockRow[] {
    this.assertSize(buffer)

    const sheet = this.loadSheet(buffer)

    const allRows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
      header: 1,
      defval: '',
    })

    const headerRowIndex = this.findAndValidateHeaders(allRows)

    const result: RawStockRow[] = []

    for (let i = headerRowIndex + 1; i < allRows.length; i++) {
      const row = allRows[i] as unknown[]
      const codigo = String(row[COL.CODIGO] ?? '').trim()

      if (!codigo) continue

      result.push({
        codigo,
        nombre: String(row[COL.NOMBRE] ?? '').trim(),
        stock:  this.toSafeInt(row[COL.EXISTENCIAS]),
        detal:  this.toSafeInt(row[COL.DETAL]) * 100,
      })
    }

    if (result.length === 0) {
      throw new BadRequestException(
        'El archivo no contiene filas de producto válidas',
      )
    }

    this.logger.log(`Parsed ${result.length} rows from Optimun export`)
    return result
  }

  /**
   * Returns true for codes that follow the Optimun format ({digits}-{alnum}).
   * Codes that fail this check are likely date values auto-formatted by Excel.
   * Exported so the use-case layer can use it without coupling to infrastructure.
   */
  isValidCode(code: string): boolean {
    return VALID_CODE_RE.test(code)
  }

  // ── Private ─────────────────────────────────────────────────────────────────

  private assertSize(buffer: Buffer): void {
    if (buffer.byteLength > MAX_FILE_BYTES) {
      throw new BadRequestException(
        `El archivo supera el límite de ${MAX_FILE_BYTES / 1024 / 1024} MB`,
      )
    }
  }

  private loadSheet(buffer: Buffer): XLSX.WorkSheet {
    let workbook: XLSX.WorkBook
    try {
      workbook = XLSX.read(buffer, { type: 'buffer', cellDates: false })
    } catch {
      throw new BadRequestException('El archivo no es un .xlsx válido')
    }

    const sheetName = workbook.SheetNames[0]
    if (!sheetName) {
      throw new BadRequestException('El archivo .xlsx no contiene hojas')
    }

    const sheet = workbook.Sheets[sheetName]!

    // COM-exported files set usedRange ending at the last non-empty column
    // detected by the COM object, which often stops at col I and silently
    // drops col J (DETAL). Force the range to always include col J.
    const ref = sheet['!ref']
    if (ref) {
      const range = XLSX.utils.decode_range(ref)
      if (range.e.c < COL.DETAL) {
        range.e.c = COL.DETAL
        sheet['!ref'] = XLSX.utils.encode_range(range)
      }
    }

    return sheet
  }

  /**
   * Scans the first 5 rows for the header row (identified by CODIGO in col B),
   * validates all required columns, and returns the 0-based header row index.
   * This handles both Optimun export variants: with and without an initial blank row.
   */
  private findAndValidateHeaders(rows: unknown[][]): number {
    const headerRowIndex = this.locateHeaderRow(rows)
    const headerRow = (rows[headerRowIndex] as unknown[]) ?? []

    for (const { col, label } of REQUIRED_HEADERS) {
      const actual = normalizeHeader(String(headerRow[col] ?? ''))
      if (actual !== label) {
        throw new BadRequestException(
          `Columna inválida en posición ${col + 1}: ` +
          `se esperaba "${label}", se recibió "${actual || '(vacía)'}"`,
        )
      }
    }

    return headerRowIndex
  }

  private locateHeaderRow(rows: unknown[][]): number {
    for (let i = 0; i < Math.min(rows.length, 5); i++) {
      const row = (rows[i] ?? []) as unknown[]
      if (normalizeHeader(String(row[COL.CODIGO] ?? '')) === 'CODIGO') return i
    }
    throw new BadRequestException(
      'No se encontró la columna "CODIGO" en las primeras 5 filas del archivo. ' +
      'Verifica que sea el export estándar de Optimun (.xlsx).',
    )
  }

  private toSafeInt(value: unknown): number {
    const n = parseInt(String(value ?? '0'), 10)
    return isNaN(n) || n < 0 ? 0 : n
  }
}
