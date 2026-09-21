/**
 * Índice y ranking de búsqueda del catálogo (en memoria, JSON-serializable).
 *
 * Flujo: `buildSearchDoc(producto)` una vez por producto → `searchDocs(docs, consulta)`
 * por cada búsqueda. El índice no depende de la BD, así que la capa de infraestructura
 * decide de dónde salen los productos y cuánto tiempo se cachea.
 *
 * Reglas de coincidencia por palabra de la consulta (todas deben coincidir, AND):
 *   exacta (raíz igual) > prefijo (≥3 letras, "ram" → "ramal") > difusa (typos, solo letras).
 * Los números solo coinciden exactos ("200" no encuentra "250"); para el "escribiendo…"
 * numérico ("ns20") existe un respaldo por texto compacto (sin separadores).
 */
import { editDistance, maxTypos, stem, tokenize, tokenizeQuery } from './normalize'

// ── Tipos ────────────────────────────────────────────────────────────────────

/** Producto tal como lo entrega la infraestructura (texto crudo). */
export interface SearchableProduct {
  id: string
  name: string
  sku: string
  description?: string | null
  categoryId: string
  categoryName?: string | null
  parentCategoryName?: string | null
  /** Etiquetas libres: hoy, marcas/modelos de moto compatibles. */
  tags?: string[]
  price: number
  stock: number
  isActive: boolean
  /** Epoch en ms — se usa como desempate (más nuevo primero). */
  createdAt: number
}

/** Documento indexado: raíces por campo + datos mínimos para filtrar sin ir a la BD. */
export interface SearchDoc {
  id: string
  categoryId: string
  price: number
  stock: number
  isActive: boolean
  createdAt: number
  name: string[]
  sku: string[]
  category: string[]
  tags: string[]
  description: string[]
  /** Raíces del nombre entre espacios: sirve para detectar la frase completa. */
  nameKey: string
  /** Tokens sin raíz y pegados ("filtro ns 200" → "filtrons200"): respaldo de coincidencia parcial. */
  compactName: string
  compactSku: string
}

export interface SearchHit {
  id: string
  score: number
}

export interface SearchOptions {
  /** Filtro previo al ranking (categoría, stock, precio, activo). */
  filter?: (doc: SearchDoc) => boolean
  limit?: number
}

// ── Configuración ────────────────────────────────────────────────────────────

type Field = 'name' | 'sku' | 'category' | 'tags' | 'description'

const FIELD_WEIGHT: Record<Field, number> = {
  name: 10,
  sku: 9,
  category: 4,
  tags: 4,
  description: 1.5,
}

const FIELDS = Object.keys(FIELD_WEIGHT) as Field[]

/** En la descripción solo exacta/prefijo: el fuzzy en texto largo genera ruido. */
const FUZZY_FIELDS = new Set<Field>(['name', 'sku', 'category', 'tags'])

const MAX_DESCRIPTION_TOKENS = 150
const PHRASE_BONUS = 15
const ALL_IN_NAME_BONUS = 8
const COMPACT_ONLY_SCORE = 6
const MIN_PREFIX_LENGTH = 3
const MIN_COMPACT_LENGTH = 3

/** Grupos de sinónimos del negocio (palabras completas; se comparan por raíz). */
const SYNONYM_GROUPS: string[][] = [
  ['aceite', 'lubricante'],
  ['llanta', 'neumatico'],
]

const SYNONYMS_BY_STEM = new Map<string, string[]>()
for (const group of SYNONYM_GROUPS) {
  const stems = group.map(stem)
  for (const s of stems) SYNONYMS_BY_STEM.set(s, stems.filter((o) => o !== s))
}

// ── Indexado ─────────────────────────────────────────────────────────────────

const stems = (text: string | null | undefined) => (text ? tokenize(text).map(stem) : [])

/** Convierte un producto en su documento de búsqueda. */
export function buildSearchDoc(p: SearchableProduct): SearchDoc {
  const nameStems = stems(p.name)
  return {
    id: p.id,
    categoryId: p.categoryId,
    price: p.price,
    stock: p.stock,
    isActive: p.isActive,
    createdAt: p.createdAt,
    name: nameStems,
    sku: stems(p.sku),
    category: [...stems(p.categoryName), ...stems(p.parentCategoryName)],
    tags: (p.tags ?? []).flatMap(stems),
    description: [...new Set(stems(p.description))].slice(0, MAX_DESCRIPTION_TOKENS),
    nameKey: ` ${nameStems.join(' ')} `,
    compactName: tokenize(p.name).join(''),
    compactSku: tokenize(p.sku).join(''),
  }
}

// ── Consulta ─────────────────────────────────────────────────────────────────

interface QueryToken {
  stem: string
  numeric: boolean
  /** Raíces equivalentes (sinónimos). */
  alts: string[]
}

interface ParsedQuery {
  tokens: QueryToken[]
  /** Raíces unidas por espacio: "ns200" y "ns 200" dan "ns 200". */
  phrase: string
  /** Tokens crudos pegados. */
  compact: string
}

function parseQuery(query: string): ParsedQuery | null {
  const raw = tokenizeQuery(query)
  if (raw.length === 0) return null
  const tokens = raw.map((t): QueryToken => {
    const s = stem(t)
    return { stem: s, numeric: /^\d+$/.test(s), alts: SYNONYMS_BY_STEM.get(s) ?? [] }
  })
  return { tokens, phrase: tokens.map((t) => t.stem).join(' '), compact: raw.join('') }
}

// ── Coincidencia y ranking ───────────────────────────────────────────────────

/** Calidad de la coincidencia de una palabra en un campo: 0 (no), hasta 1 (exacta). */
function matchQuality(token: QueryToken, fieldTokens: string[], allowFuzzy: boolean): number {
  let best = 0
  for (const term of [token.stem, ...token.alts]) {
    const numeric = token.numeric && term === token.stem
    const typos = allowFuzzy && !numeric ? maxTypos(term) : 0
    for (const ft of fieldTokens) {
      if (ft === term) return 1
      if (numeric) continue
      if (term.length >= MIN_PREFIX_LENGTH && ft.startsWith(term)) {
        best = Math.max(best, 0.85)
      } else if (typos > 0 && ft[0] === term[0]) {
        const d = editDistance(term, ft, typos)
        if (d <= typos) best = Math.max(best, d === 1 ? 0.6 : 0.45)
      }
    }
  }
  return best
}

function scoreDoc(doc: SearchDoc, q: ParsedQuery): number {
  let total = 0
  let allInName = true

  for (const token of q.tokens) {
    let best = 0
    let inName = false
    for (const field of FIELDS) {
      const quality = matchQuality(token, doc[field], FUZZY_FIELDS.has(field))
      if (quality === 0) continue
      best = Math.max(best, quality * FIELD_WEIGHT[field])
      if (field === 'name') inName = true
    }
    if (best === 0) return compactScore(doc, q)
    if (!inName) allInName = false
    total += best
  }

  if (allInName) total += ALL_IN_NAME_BONUS
  if (q.tokens.length > 1 && doc.nameKey.includes(` ${q.phrase} `)) total += PHRASE_BONUS
  return total
}

/** Respaldo: la consulta pegada aparece como texto parcial en nombre o SKU ("ns20" ⊂ "…ns200"). */
function compactScore(doc: SearchDoc, q: ParsedQuery): number {
  if (q.compact.length < MIN_COMPACT_LENGTH) return 0
  return doc.compactName.includes(q.compact) || doc.compactSku.includes(q.compact)
    ? COMPACT_ONLY_SCORE
    : 0
}

/**
 * Busca y ordena por relevancia. Devuelve solo los documentos que pasan `filter` y
 * coinciden con TODAS las palabras. Consulta vacía → `[]`.
 * Desempate: con stock primero, luego más nuevo.
 */
export function searchDocs(docs: SearchDoc[], query: string, options: SearchOptions = {}): SearchHit[] {
  const q = parseQuery(query)
  if (!q) return []

  const hits: Array<SearchHit & { inStock: boolean; createdAt: number }> = []
  for (const doc of docs) {
    if (options.filter && !options.filter(doc)) continue
    const score = scoreDoc(doc, q)
    if (score > 0) hits.push({ id: doc.id, score, inStock: doc.stock > 0, createdAt: doc.createdAt })
  }

  hits.sort(
    (a, b) =>
      b.score - a.score ||
      Number(b.inStock) - Number(a.inStock) ||
      b.createdAt - a.createdAt ||
      a.id.localeCompare(b.id),
  )

  const out = hits.map(({ id, score }) => ({ id, score }))
  return options.limit ? out.slice(0, options.limit) : out
}
