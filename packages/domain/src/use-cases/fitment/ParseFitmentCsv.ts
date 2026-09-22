/**
 * Lectura y validación del CSV de compatibilidades (docs/seo/, Fase 2).
 *
 * Es la puerta por la que entran los datos reales al sistema: el equipo llena
 * una hoja de cálculo con qué producto le sirve a qué moto, la exporta a CSV y
 * la sube desde el panel. Todo lo que entre por aquí acaba diciéndole a un
 * comprador "esto le sirve a tu moto", así que la validación es deliberadamente
 * estricta y **ninguna fila dudosa se acepta a medias**: o es válida, o se
 * rechaza con el número de línea y el motivo.
 *
 * Formato esperado (la cabecera es obligatoria, el orden de columnas no importa):
 *
 *   sku,marca_moto,modelo_moto,posicion,anio_desde,anio_hasta,fuente,notas,verificado
 *   3-MAG7L,Bajaj,Boxer CT100,ambas,2018,,Manual Bajaj 2023 pag 42,,si
 *
 *   sku          (obligatorio) SKU del producto en el catálogo
 *   marca_moto   (obligatorio) marca de la moto
 *   modelo_moto  (obligatorio) modelo, o uno de sus alias
 *   posicion     delantera | trasera | ambas — por defecto "ambas"
 *   anio_desde   año inicial; vacío = todos los años
 *   anio_hasta   año final; vacío = abierto
 *   fuente       (obligatorio) de dónde sale el dato
 *   notas        matiz de versión
 *   verificado   si | no — por defecto "no"
 *
 * TypeScript puro: se puede probar sin base de datos y reutilizar desde la API
 * o desde un script.
 */

/** Fila ya validada, lista para que `ImportFitments` la aplique. */
export interface FitmentCsvRow {
  /** Número de línea en el archivo (1 = cabecera), para poder señalar el error. */
  line: number
  sku: string
  brandName: string
  modelName: string
  position: 'DELANTERA' | 'TRASERA' | 'AMBAS'
  yearFrom: number | null
  yearTo: number | null
  notes: string | null
  source: string
  verified: boolean
}

export interface FitmentCsvError {
  line: number
  message: string
}

export interface FitmentCsvParseResult {
  rows: FitmentCsvRow[]
  errors: FitmentCsvError[]
}

const REQUIRED_HEADERS = ['sku', 'marca_moto', 'modelo_moto', 'fuente'] as const

const POSITIONS: Record<string, FitmentCsvRow['position']> = {
  delantera: 'DELANTERA',
  delantero: 'DELANTERA',
  trasera: 'TRASERA',
  trasero: 'TRASERA',
  ambas: 'AMBAS',
  ambos: 'AMBAS',
  '': 'AMBAS',
}

const TRUTHY = new Set(['si', 'sí', 'yes', 'true', '1', 'x'])
const FALSY = new Set(['no', 'false', '0', ''])

/** Año más antiguo aceptable. Antes de eso, casi seguro es un error de tecleo. */
const MIN_YEAR = 1950

/**
 * Parte una línea de CSV respetando las comillas dobles, porque las notas y las
 * fuentes llevan comas ("Manual Bajaj 2023, pág. 42").
 */
export function parseCsvLine(line: string): string[] {
  const values: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]

    if (char === '"') {
      // Comilla doble escapada dentro de un campo entrecomillado.
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
      continue
    }

    if (char === ',' && !inQuotes) {
      values.push(current)
      current = ''
      continue
    }

    current += char
  }

  values.push(current)
  return values.map((v) => v.trim())
}

/** Año válido, o error descriptivo. Vacío devuelve `null` sin error. */
function parseYear(raw: string, field: string): { value: number | null; error?: string } {
  if (raw === '') return { value: null }

  const year = Number(raw)
  if (!Number.isInteger(year)) return { value: null, error: `${field} no es un año válido: "${raw}"` }

  const maxYear = new Date().getFullYear() + 2
  if (year < MIN_YEAR || year > maxYear) {
    return { value: null, error: `${field} fuera de rango (${MIN_YEAR}-${maxYear}): ${year}` }
  }

  return { value: year }
}

/**
 * Lee el CSV completo y separa filas válidas de errores.
 *
 * Nunca lanza: un archivo corrupto devuelve `rows: []` y un error explicando qué
 * pasa, para que el panel pueda mostrarlo tal cual.
 */
export function parseFitmentCsv(content: string): FitmentCsvParseResult {
  const errors: FitmentCsvError[] = []
  const rows: FitmentCsvRow[] = []

  // El BOM de Excel se cuela en el nombre de la primera columna y rompe la cabecera.
  const clean = content.replace(/^﻿/, '')
  const lines = clean.split(/\r?\n/).filter((l) => l.trim().length > 0)

  if (lines.length === 0) {
    return { rows, errors: [{ line: 1, message: 'El archivo está vacío' }] }
  }

  const headers = parseCsvLine(lines[0]).map((h) => h.toLowerCase())
  const missing = REQUIRED_HEADERS.filter((h) => !headers.includes(h))
  if (missing.length > 0) {
    return {
      rows,
      errors: [{ line: 1, message: `Faltan columnas obligatorias: ${missing.join(', ')}` }],
    }
  }

  const columnIndex = (name: string) => headers.indexOf(name)
  const idx = {
    sku: columnIndex('sku'),
    brand: columnIndex('marca_moto'),
    model: columnIndex('modelo_moto'),
    position: columnIndex('posicion'),
    yearFrom: columnIndex('anio_desde'),
    yearTo: columnIndex('anio_hasta'),
    source: columnIndex('fuente'),
    notes: columnIndex('notas'),
    verified: columnIndex('verificado'),
  }

  const at = (values: string[], index: number) => (index >= 0 ? (values[index] ?? '') : '')

  /** Detecta la misma combinación repetida dentro del propio archivo. */
  const seen = new Set<string>()

  for (let i = 1; i < lines.length; i++) {
    const line = i + 1
    const values = parseCsvLine(lines[i])

    const sku = at(values, idx.sku)
    const brandName = at(values, idx.brand)
    const modelName = at(values, idx.model)
    const source = at(values, idx.source)

    const rowErrors: string[] = []
    if (!sku) rowErrors.push('falta el sku')
    if (!brandName) rowErrors.push('falta la marca de la moto')
    if (!modelName) rowErrors.push('falta el modelo de la moto')
    if (!source) rowErrors.push('falta la fuente del dato (sin fuente no se puede verificar)')

    const rawPosition = at(values, idx.position).toLowerCase()
    const position = POSITIONS[rawPosition]
    if (position === undefined) {
      rowErrors.push(`posición no reconocida: "${rawPosition}" (usa delantera, trasera o ambas)`)
    }

    const from = parseYear(at(values, idx.yearFrom), 'anio_desde')
    if (from.error) rowErrors.push(from.error)
    const to = parseYear(at(values, idx.yearTo), 'anio_hasta')
    if (to.error) rowErrors.push(to.error)

    if (from.value !== null && to.value !== null && from.value > to.value) {
      rowErrors.push(`anio_desde (${from.value}) es posterior a anio_hasta (${to.value})`)
    }

    const rawVerified = at(values, idx.verified).toLowerCase()
    let verified = false
    if (TRUTHY.has(rawVerified)) verified = true
    else if (!FALSY.has(rawVerified)) {
      rowErrors.push(`verificado no reconocido: "${rawVerified}" (usa si o no)`)
    }

    if (rowErrors.length > 0) {
      errors.push({ line, message: rowErrors.join('; ') })
      continue
    }

    const key = `${sku.toLowerCase()}|${brandName.toLowerCase()}|${modelName.toLowerCase()}|${position}`
    if (seen.has(key)) {
      errors.push({ line, message: `fila duplicada dentro del archivo (${sku} / ${brandName} ${modelName})` })
      continue
    }
    seen.add(key)

    rows.push({
      line,
      sku,
      brandName,
      modelName,
      position: position as FitmentCsvRow['position'],
      yearFrom: from.value,
      yearTo: to.value,
      notes: at(values, idx.notes) || null,
      source,
      verified,
    })
  }

  return { rows, errors }
}
