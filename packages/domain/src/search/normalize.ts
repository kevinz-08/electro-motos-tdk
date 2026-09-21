/**
 * Normalización y tokenización de texto para el buscador del catálogo.
 *
 * Todo es TypeScript puro (sin Prisma ni Next) para poder testearlo y reutilizarlo
 * desde cualquier app del monorepo.
 */

/** Palabras vacías que se descartan de la consulta (no del índice). */
const STOPWORDS = new Set(['de', 'del', 'la', 'las', 'el', 'los', 'para', 'con', 'en', 'y', 'un', 'una'])

/** Máximo de tokens que se procesan de una consulta (evita consultas abusivas). */
const MAX_QUERY_TOKENS = 8

/**
 * Minúsculas, sin tildes ni símbolos, con espacios simples.
 * "Bujía  NGK-CR7/HSA" → "bujia ngk cr7 hsa"
 */
export function normalizeText(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

/**
 * Separa el texto normalizado en tokens y parte en la frontera letra↔número, de modo que
 * "ns200", "ns 200" y "NS-200" produzcan los mismos tokens: ["ns", "200"].
 */
export function tokenize(input: string): string[] {
  return normalizeText(input)
    .replace(/([a-z])(?=\d)/g, '$1 ')
    .replace(/(\d)(?=[a-z])/g, '$1 ')
    .split(' ')
    .filter(Boolean)
}

/** Tokens de una consulta: sin stopwords y acotados. Si todo eran stopwords, se conservan. */
export function tokenizeQuery(query: string): string[] {
  const tokens = tokenize(query)
  const meaningful = tokens.filter((t) => !STOPWORDS.has(t))
  return (meaningful.length > 0 ? meaningful : tokens).slice(0, MAX_QUERY_TOKENS)
}

const isNumeric = (token: string) => /^\d+$/.test(token)

/**
 * Raíz aproximada en español: quita el plural y una vocal final.
 * ramales/ramal → "ramal", aceites/aceite → "aceit", llantas/llanta → "llant".
 * Los números y palabras de ≤3 letras no se tocan.
 */
export function stem(token: string): string {
  if (token.length <= 3 || isNumeric(token)) return token
  let out = token
  if (out.endsWith('es') && out.length > 4) out = out.slice(0, -2)
  else if (out.endsWith('s')) out = out.slice(0, -1)
  if (out.length > 4 && /[aeo]$/.test(out)) out = out.slice(0, -1)
  return out
}

/**
 * Distancia de Damerau-Levenshtein (transposiciones incluidas) con corte temprano:
 * devuelve `max + 1` en cuanto se sabe que la distancia supera `max`.
 */
export function editDistance(a: string, b: string, max: number): number {
  if (a === b) return 0
  if (Math.abs(a.length - b.length) > max) return max + 1

  let prev2: number[] = []
  let prev: number[] = Array.from({ length: b.length + 1 }, (_, j) => j)

  for (let i = 1; i <= a.length; i++) {
    const cur: number[] = [i]
    let rowMin = i
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      let v = Math.min(prev[j]! + 1, cur[j - 1]! + 1, prev[j - 1]! + cost)
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        v = Math.min(v, prev2[j - 2]! + 1)
      }
      cur[j] = v
      if (v < rowMin) rowMin = v
    }
    if (rowMin > max) return max + 1
    prev2 = prev
    prev = cur
  }
  return prev[b.length]!
}

/** Errores tolerados según el largo de la raíz: 0 (≤3), 1 (4–7), 2 (≥8). */
export function maxTypos(stemmed: string): number {
  if (stemmed.length < 4) return 0
  return stemmed.length < 8 ? 1 : 2
}
