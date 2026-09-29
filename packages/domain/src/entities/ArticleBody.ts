/**
 * Markdown restringido para el cuerpo de los artículos (docs/seo/, Fase 5).
 *
 * No es un Markdown completo a propósito. Solo lo que un artículo de repuestos
 * necesita, y nada que permita inyectar HTML:
 *
 *   ## Encabezado         → h2 (el h1 es el título del artículo)
 *   ### Subencabezado     → h3
 *   párrafos              → separados por una línea en blanco
 *   - item / * item       → lista
 *   1. item               → lista numerada
 *   | a | b |             → tabla (la segunda fila es el separador |---|---|)
 *   **negrita** *cursiva* `código` [texto](url)
 *
 * Los enlaces solo se aceptan si son `https://`, `http://` o rutas internas que
 * empiezan por `/`: un `javascript:` queda como texto plano. El resultado es un
 * árbol de datos; la web lo pinta como elementos React, nunca con
 * `dangerouslySetInnerHTML`.
 *
 * TypeScript puro: se prueba sin navegador y lo reutiliza el reporte de
 * enlazado interno (B7) para contar los enlaces de cada artículo.
 */

export type InlineNode =
  | { type: 'text'; text: string }
  | { type: 'strong'; children: InlineNode[] }
  | { type: 'em'; children: InlineNode[] }
  | { type: 'code'; text: string }
  | { type: 'link'; href: string; internal: boolean; children: InlineNode[] }

export type ArticleBlock =
  | { type: 'heading'; level: 2 | 3; id: string; text: string; children: InlineNode[] }
  | { type: 'paragraph'; children: InlineNode[] }
  | { type: 'list'; ordered: boolean; items: InlineNode[][] }
  | { type: 'table'; header: InlineNode[][]; rows: InlineNode[][][] }

/** Id estable para un encabezado: "¿Cada cuánto se cambia?" → "cada-cuanto-se-cambia". */
export function slugifyHeading(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/** Solo http(s) o rutas internas. Todo lo demás (javascript:, data:, //host) se rechaza. */
export function isSafeHref(href: string): boolean {
  return /^https?:\/\//i.test(href) || (href.startsWith('/') && !href.startsWith('//'))
}

const INLINE_PATTERN = /(\*\*[^*]+\*\*|\*[^*\s][^*]*\*|`[^`]+`|\[[^\]]+\]\([^)\s]+\))/

/** Interpreta negrita, cursiva, código y enlaces dentro de una línea. */
export function parseInline(text: string): InlineNode[] {
  const nodes: InlineNode[] = []
  let rest = text

  while (rest) {
    const match = INLINE_PATTERN.exec(rest)
    if (!match) {
      nodes.push({ type: 'text', text: rest })
      break
    }
    if (match.index > 0) nodes.push({ type: 'text', text: rest.slice(0, match.index) })
    const token = match[0]

    if (token.startsWith('**')) {
      nodes.push({ type: 'strong', children: parseInline(token.slice(2, -2)) })
    } else if (token.startsWith('`')) {
      nodes.push({ type: 'code', text: token.slice(1, -1) })
    } else if (token.startsWith('[')) {
      const close = token.indexOf('](')
      const label = token.slice(1, close)
      const href = token.slice(close + 2, -1)
      if (isSafeHref(href)) {
        nodes.push({ type: 'link', href, internal: href.startsWith('/'), children: parseInline(label) })
      } else {
        nodes.push({ type: 'text', text: label })
      }
    } else {
      nodes.push({ type: 'em', children: parseInline(token.slice(1, -1)) })
    }
    rest = rest.slice(match.index + token.length)
  }

  // Une textos consecutivos (queda un árbol más limpio y fácil de comparar en tests).
  return nodes.reduce<InlineNode[]>((acc, node) => {
    const last = acc[acc.length - 1]
    if (node.type === 'text' && last?.type === 'text') last.text += node.text
    else acc.push(node)
    return acc
  }, [])
}

const splitRow = (line: string) =>
  line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim())

const isTableSeparator = (line: string) => /^\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)*\|?$/.test(line.trim())

/** Convierte el Markdown restringido en bloques. Nunca lanza. */
export function parseArticleBody(markdown: string): ArticleBlock[] {
  const lines = markdown.replace(/\r\n?/g, '\n').split('\n')
  const blocks: ArticleBlock[] = []
  const usedIds = new Map<string, number>()
  let i = 0

  const uniqueId = (text: string) => {
    const base = slugifyHeading(text) || 'seccion'
    const n = usedIds.get(base) ?? 0
    usedIds.set(base, n + 1)
    return n === 0 ? base : `${base}-${n + 1}`
  }

  while (i < lines.length) {
    const line = lines[i]!
    const trimmed = line.trim()

    if (!trimmed) {
      i++
      continue
    }

    const heading = /^(#{2,3})\s+(.+)$/.exec(trimmed)
    if (heading) {
      const text = heading[2]!.trim()
      blocks.push({ type: 'heading', level: heading[1]!.length as 2 | 3, id: uniqueId(text), text, children: parseInline(text) })
      i++
      continue
    }

    if (trimmed.startsWith('|') && i + 1 < lines.length && isTableSeparator(lines[i + 1]!)) {
      const header = splitRow(trimmed).map(parseInline)
      const rows: InlineNode[][][] = []
      i += 2
      while (i < lines.length && lines[i]!.trim().startsWith('|')) {
        const cells = splitRow(lines[i]!)
        // Normaliza al número de columnas de la cabecera.
        rows.push(header.map((_, c) => parseInline(cells[c] ?? '')))
        i++
      }
      blocks.push({ type: 'table', header, rows })
      continue
    }

    const bullet = /^[-*]\s+/
    const numbered = /^\d+[.)]\s+/
    if (bullet.test(trimmed) || numbered.test(trimmed)) {
      const ordered = numbered.test(trimmed)
      const marker = ordered ? numbered : bullet
      const items: InlineNode[][] = []
      while (i < lines.length && marker.test(lines[i]!.trim())) {
        items.push(parseInline(lines[i]!.trim().replace(marker, '')))
        i++
      }
      blocks.push({ type: 'list', ordered, items })
      continue
    }

    // Párrafo: líneas seguidas hasta una en blanco o el inicio de otro bloque.
    const paragraph: string[] = []
    while (i < lines.length) {
      const current = lines[i]!.trim()
      if (!current || /^#{2,3}\s/.test(current) || bullet.test(current) || numbered.test(current)) break
      if (current.startsWith('|') && i + 1 < lines.length && isTableSeparator(lines[i + 1]!)) break
      paragraph.push(current)
      i++
    }
    blocks.push({ type: 'paragraph', children: parseInline(paragraph.join(' ')) })
  }

  return blocks
}

/** Encabezados h2 del artículo, para el índice de contenidos. */
export function extractArticleHeadings(blocks: ArticleBlock[]): { id: string; text: string }[] {
  return blocks.flatMap((b) => (b.type === 'heading' && b.level === 2 ? [{ id: b.id, text: b.text }] : []))
}

/** Rutas internas enlazadas desde el cuerpo (para el reporte de enlazado interno). */
export function extractInternalLinks(blocks: ArticleBlock[]): string[] {
  const links: string[] = []
  const walk = (nodes: InlineNode[]) => {
    for (const n of nodes) {
      if (n.type === 'link') {
        if (n.internal) links.push(n.href)
        walk(n.children)
      } else if (n.type === 'strong' || n.type === 'em') walk(n.children)
    }
  }
  for (const b of blocks) {
    if (b.type === 'heading' || b.type === 'paragraph') walk(b.children)
    else if (b.type === 'list') b.items.forEach(walk)
    else {
      b.header.forEach(walk)
      b.rows.forEach((r) => r.forEach(walk))
    }
  }
  return links
}

/** Texto plano de nodos inline (para meta descripciones y JSON-LD). */
export function inlineToText(nodes: InlineNode[]): string {
  return nodes
    .map((n) => (n.type === 'text' || n.type === 'code' ? n.text : inlineToText(n.children)))
    .join('')
}
