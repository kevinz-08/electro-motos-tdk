/**
 * Datos de identificación de un repuesto (docs/seo/, Fase 7 — tarea H-18).
 *
 * Marca del repuesto, MPN (referencia del fabricante del repuesto), tipo
 * (original / homologado / genérico) y garantía. Los necesita Google Merchant
 * Center para aceptar un producto y el JSON-LD `Product` para ser completo.
 *
 * Nada se deduce del nombre del producto: lo carga una persona, uno a uno en el
 * formulario o en bloque con un CSV (`parseIdentifiersCsv`).
 */
import { parseCsvLine } from '../use-cases/fitment/ParseFitmentCsv'
import type { PartType } from './Motorcycle'

export const PART_TYPES: readonly PartType[] = ['ORIGINAL', 'HOMOLOGADO', 'GENERICO']

export const PART_BRAND_MAX_LENGTH = 70
export const MPN_MAX_LENGTH = 70
export const MAX_WARRANTY_MONTHS = 120

/**
 * Valores que Google rechaza como marca ("sin marca", "genérico"…). Un
 * repuesto genérico se declara con `partType = GENERICO`, no inventando una
 * marca que no existe.
 */
const INVALID_BRANDS = ['generico', 'generica', 'sin marca', 'n/a', 'na', 'no aplica', 'ninguna', 'ninguno', 'otro', 'otros', 'varios', 'unbranded', 'generic', 'none']

export interface ProductIdentifiers {
  partBrand: string | null
  mpn: string | null
  partType: PartType | null
  warrantyMonths: number | null
}

const normalizeKey = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase()

/** Devuelve el motivo del rechazo, o `null` si los datos son válidos. */
export function validateProductIdentifiers(input: ProductIdentifiers): string | null {
  if (input.partBrand !== null) {
    const brand = input.partBrand.trim()
    if (!brand) return 'La marca no puede ser solo espacios (déjala vacía si no la conoces)'
    if (brand.length > PART_BRAND_MAX_LENGTH) return `La marca admite máximo ${PART_BRAND_MAX_LENGTH} caracteres`
    if (INVALID_BRANDS.includes(normalizeKey(brand))) {
      return `"${brand}" no es una marca: si el repuesto no tiene marca, deja el campo vacío y marca el tipo como genérico`
    }
  }
  if (input.mpn !== null) {
    const mpn = input.mpn.trim()
    if (!mpn) return 'El MPN no puede ser solo espacios'
    if (mpn.length > MPN_MAX_LENGTH) return `El MPN admite máximo ${MPN_MAX_LENGTH} caracteres`
  }
  if (input.partType !== null && !PART_TYPES.includes(input.partType)) return 'Tipo de repuesto no válido'
  if (input.warrantyMonths !== null) {
    if (!Number.isInteger(input.warrantyMonths) || input.warrantyMonths < 0 || input.warrantyMonths > MAX_WARRANTY_MONTHS) {
      return `La garantía debe ser un número entero de meses entre 0 y ${MAX_WARRANTY_MONTHS}`
    }
  }
  return null
}

/** Recorta textos y convierte vacíos en `null`. */
export function normalizeProductIdentifiers(input: ProductIdentifiers): ProductIdentifiers {
  return {
    partBrand: input.partBrand?.trim() || null,
    mpn: input.mpn?.trim() || null,
    partType: input.partType,
    warrantyMonths: input.warrantyMonths,
  }
}

// ── Carga masiva por CSV ─────────────────────────────────────────────────────

/**
 * Una fila del CSV. Cada campo es:
 *   - `undefined` → celda vacía: NO se toca el dato existente;
 *   - `null`      → la celda dice "-": se BORRA el dato;
 *   - un valor    → se guarda.
 * Así un CSV parcial (solo marcas, por ejemplo) no borra nada por accidente.
 */
export interface IdentifiersCsvRow {
  line: number
  sku: string
  partBrand?: string | null
  mpn?: string | null
  partType?: PartType | null
  warrantyMonths?: number | null
}

export interface IdentifiersCsvResult {
  rows: IdentifiersCsvRow[]
  errors: Array<{ line: number; message: string }>
}

const TYPE_ALIASES: Record<string, PartType> = {
  original: 'ORIGINAL',
  oem: 'ORIGINAL',
  homologado: 'HOMOLOGADO',
  homologada: 'HOMOLOGADO',
  alternativo: 'HOMOLOGADO',
  generico: 'GENERICO',
  generica: 'GENERICO',
}

export const IDENTIFIERS_CSV_HEADER = 'sku,marca,mpn,tipo,garantia_meses'

/** Lee y valida el CSV `sku,marca,mpn,tipo,garantia_meses`. Nunca lanza. */
export function parseIdentifiersCsv(text: string): IdentifiersCsvResult {
  const lines = text.replace(/^﻿/, '').replace(/\r\n?/g, '\n').split('\n')
  const result: IdentifiersCsvResult = { rows: [], errors: [] }
  const header = parseCsvLine(lines[0] ?? '').map(normalizeKey)
  const col = (name: string) => header.indexOf(name)
  if (col('sku') === -1) {
    result.errors.push({ line: 1, message: `Falta la columna "sku". Cabecera esperada: ${IDENTIFIERS_CSV_HEADER}` })
    return result
  }

  const seen = new Set<string>()
  for (let i = 1; i < lines.length; i++) {
    const raw = lines[i]!
    if (!raw.trim()) continue
    const line = i + 1
    const cells = parseCsvLine(raw)
    const cell = (name: string): string | undefined => {
      const idx = col(name)
      const value = idx === -1 ? undefined : cells[idx]?.trim()
      return value ? value : undefined
    }
    const orNull = (v: string | undefined) => (v === '-' ? null : v)

    const sku = cell('sku')
    if (!sku) {
      result.errors.push({ line, message: 'Falta el SKU' })
      continue
    }
    if (seen.has(sku)) {
      result.errors.push({ line, message: `El SKU "${sku}" está repetido en el archivo` })
      continue
    }
    seen.add(sku)

    const row: IdentifiersCsvRow = { line, sku, partBrand: orNull(cell('marca')), mpn: orNull(cell('mpn')) }

    const type = orNull(cell('tipo'))
    if (type !== undefined) {
      if (type === null) row.partType = null
      else {
        const mapped = TYPE_ALIASES[normalizeKey(type)]
        if (!mapped) {
          result.errors.push({ line, message: `Tipo "${type}" no válido: usa original, homologado o genérico` })
          continue
        }
        row.partType = mapped
      }
    }

    const warranty = orNull(cell('garantia_meses'))
    if (warranty !== undefined) {
      if (warranty === null) row.warrantyMonths = null
      else if (!/^\d+$/.test(warranty)) {
        result.errors.push({ line, message: `Garantía "${warranty}" no válida: escribe un número entero de meses` })
        continue
      } else row.warrantyMonths = Number(warranty)
    }

    const invalid = validateProductIdentifiers({
      partBrand: row.partBrand ?? null,
      mpn: row.mpn ?? null,
      partType: row.partType ?? null,
      warrantyMonths: row.warrantyMonths ?? null,
    })
    if (invalid) {
      result.errors.push({ line, message: invalid })
      continue
    }
    if (row.partBrand === undefined && row.mpn === undefined && row.partType === undefined && row.warrantyMonths === undefined) {
      result.errors.push({ line, message: 'La fila no trae ningún dato para actualizar' })
      continue
    }
    result.rows.push(row)
  }
  return result
}
