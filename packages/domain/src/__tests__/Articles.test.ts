import { describe, it, expect } from 'vitest'
import {
  articlePublishBlockers,
  countWords,
  isArticlePublishable,
  validateArticleDraft,
  type Article,
} from '@/domain/entities/Article'
import {
  extractArticleHeadings,
  extractInternalLinks,
  inlineToText,
  isSafeHref,
  parseArticleBody,
  parseInline,
  slugifyHeading,
} from '@/domain/entities/ArticleBody'
import { SaveArticle } from '@/domain/use-cases/content/SaveArticle'
import type { IArticleRepository, SaveArticleRecord } from '@/domain/repositories/IArticleRepository'
import type { ITechnicalReviewerRepository } from '@/domain/repositories/ITechnicalReviewerRepository'

const words = (n: number) => Array.from({ length: n }, (_, i) => `palabra${i}`).join(' ')

const draft = {
  slug: 'original-vs-generico',
  title: 'Repuesto original vs genérico',
  kind: 'COMPARATIVA' as const,
  directAnswer: words(50),
  body: '## ¿Cuál conviene?\n\nDepende.',
  metaDescription: null,
  sources: ['Manual AKT 2023'],
  authorName: 'Equipo H2R',
}

// ── Reglas de la entidad ─────────────────────────────────────────────────────

describe('countWords', () => {
  it('cuenta palabras separadas por cualquier espacio', () => {
    expect(countWords('')).toBe(0)
    expect(countWords('   ')).toBe(0)
    expect(countWords(' uno  dos\ntres ')).toBe(3)
  })
})

describe('validateArticleDraft', () => {
  it('acepta un borrador mínimo', () => {
    expect(validateArticleDraft({ ...draft, directAnswer: '', body: '', sources: [] })).toBeNull()
  })
  it('exige título, slug válido y autor', () => {
    expect(validateArticleDraft({ ...draft, title: ' ' })).toMatch(/título/)
    expect(validateArticleDraft({ ...draft, slug: 'Con Espacios' })).toMatch(/slug/)
    expect(validateArticleDraft({ ...draft, slug: '' })).toMatch(/slug/)
    expect(validateArticleDraft({ ...draft, authorName: '' })).toMatch(/escribió/)
  })
  it('reserva el slug "mantenimiento" (choca con /guias/mantenimiento)', () => {
    expect(validateArticleDraft({ ...draft, slug: 'mantenimiento' })).toMatch(/reservado/)
  })
  it('limita largos, cantidad de fuentes y tipo', () => {
    expect(validateArticleDraft({ ...draft, title: 'x'.repeat(121) })).not.toBeNull()
    expect(validateArticleDraft({ ...draft, metaDescription: 'x'.repeat(161) })).not.toBeNull()
    expect(validateArticleDraft({ ...draft, sources: Array(11).fill('f') })).not.toBeNull()
    expect(validateArticleDraft({ ...draft, sources: ['x'.repeat(301)] })).not.toBeNull()
    expect(validateArticleDraft({ ...draft, body: 'x'.repeat(60_001) })).not.toBeNull()
    expect(validateArticleDraft({ ...draft, directAnswer: 'x'.repeat(601) })).not.toBeNull()
    expect(validateArticleDraft({ ...draft, authorName: 'x'.repeat(81) })).not.toBeNull()
    expect(validateArticleDraft({ ...draft, kind: 'NOTICIA' as never })).not.toBeNull()
  })
})

describe('articlePublishBlockers', () => {
  const ready = { ...draft, reviewerId: 'r1', reviewedAt: new Date('2026-09-20') }
  const active = { isActive: true }

  it('un borrador nunca está bloqueado', () => {
    expect(articlePublishBlockers({ ...ready, body: '', sources: [] }, 'DRAFT', null)).toEqual([])
  })
  it('en revisión exige respuesta de 40–60 palabras, cuerpo y fuente, pero no revisor', () => {
    expect(articlePublishBlockers({ ...ready, reviewerId: null, reviewedAt: null }, 'IN_REVIEW', null)).toEqual([])
    const blockers = articlePublishBlockers({ ...ready, directAnswer: words(39), body: ' ', sources: [' '] }, 'IN_REVIEW', null)
    expect(blockers).toHaveLength(3)
    expect(articlePublishBlockers({ ...ready, directAnswer: words(61) }, 'IN_REVIEW', null)[0]).toMatch(/tiene 61/)
    expect(articlePublishBlockers({ ...ready, directAnswer: words(40) }, 'IN_REVIEW', null)).toEqual([])
    expect(articlePublishBlockers({ ...ready, directAnswer: words(60) }, 'IN_REVIEW', null)).toEqual([])
  })
  it('publicar exige revisor activo y fecha de revisión', () => {
    expect(articlePublishBlockers(ready, 'PUBLISHED', active)).toEqual([])
    expect(articlePublishBlockers({ ...ready, reviewerId: null }, 'PUBLISHED', null)[0]).toMatch(/revisor/)
    expect(articlePublishBlockers(ready, 'PUBLISHED', { isActive: false })[0]).toMatch(/desactivado/)
    expect(articlePublishBlockers({ ...ready, reviewedAt: null }, 'PUBLISHED', active)[0]).toMatch(/fecha/)
  })
  it('isArticlePublishable: solo publicado, completo y con revisor activo', () => {
    expect(isArticlePublishable({ ...ready, status: 'PUBLISHED' }, active)).toBe(true)
    expect(isArticlePublishable({ ...ready, status: 'IN_REVIEW' }, active)).toBe(false)
    expect(isArticlePublishable({ ...ready, status: 'PUBLISHED' }, { isActive: false })).toBe(false)
  })
})

// ── Markdown restringido ─────────────────────────────────────────────────────

describe('parseInline', () => {
  it('interpreta negrita, cursiva, código y enlaces', () => {
    expect(parseInline('a **b** *c* `d` [e](/producto/x)')).toEqual([
      { type: 'text', text: 'a ' },
      { type: 'strong', children: [{ type: 'text', text: 'b' }] },
      { type: 'text', text: ' ' },
      { type: 'em', children: [{ type: 'text', text: 'c' }] },
      { type: 'text', text: ' ' },
      { type: 'code', text: 'd' },
      { type: 'text', text: ' ' },
      { type: 'link', href: '/producto/x', internal: true, children: [{ type: 'text', text: 'e' }] },
    ])
  })
  it('un enlace inseguro queda como texto plano', () => {
    const nodes = parseInline('[clic](javascript:alert)')
    expect(nodes).toEqual([{ type: 'text', text: 'clic' }])
  })
  it('marca externos los enlaces absolutos', () => {
    const [link] = parseInline('[Bajaj](https://www.bajaj.com.co)')
    expect(link).toMatchObject({ type: 'link', internal: false })
  })
  it('texto sin marcas queda intacto (incluidos asteriscos sueltos)', () => {
    expect(parseInline('2 * 3 = 6')).toEqual([{ type: 'text', text: '2 * 3 = 6' }])
  })
})

describe('isSafeHref', () => {
  it('solo http(s) y rutas internas', () => {
    expect(isSafeHref('https://a.co')).toBe(true)
    expect(isSafeHref('http://a.co')).toBe(true)
    expect(isSafeHref('/guias')).toBe(true)
    expect(isSafeHref('//evil.com')).toBe(false)
    expect(isSafeHref('javascript:alert(1)')).toBe(false)
    expect(isSafeHref('data:text/html,x')).toBe(false)
  })
})

describe('parseArticleBody', () => {
  const md = [
    '## ¿Cuál dura más?',
    '',
    'Primera línea',
    'segunda línea.',
    '',
    '- uno',
    '- dos',
    '',
    '1. paso',
    '2) otro paso',
    '',
    '### Detalle',
    '| Pieza | Original | Genérico |',
    '|---|:---:|---|',
    '| Pastillas | 12.000 km | 8.000 km |',
    '| Kit | 20.000 km |',
    '',
    '## ¿Cuál dura más?',
  ].join('\r\n')
  const blocks = parseArticleBody(md)

  it('reconoce encabezados, párrafos, listas y tablas', () => {
    expect(blocks.map((b) => b.type)).toEqual(['heading', 'paragraph', 'list', 'list', 'heading', 'table', 'heading'])
  })
  it('une las líneas de un párrafo', () => {
    expect(blocks[1]).toEqual({ type: 'paragraph', children: [{ type: 'text', text: 'Primera línea segunda línea.' }] })
  })
  it('distingue listas numeradas', () => {
    expect(blocks[2]).toMatchObject({ type: 'list', ordered: false })
    expect(blocks[3]).toMatchObject({ type: 'list', ordered: true })
  })
  it('normaliza las filas de la tabla al número de columnas de la cabecera', () => {
    const table = blocks[5]
    if (table?.type !== 'table') throw new Error('no es tabla')
    expect(table.header).toHaveLength(3)
    expect(table.rows[1]).toHaveLength(3)
    expect(inlineToText(table.rows[1]![2]!)).toBe('')
  })
  it('da ids únicos a encabezados repetidos y extrae el índice de h2', () => {
    expect(extractArticleHeadings(blocks)).toEqual([
      { id: 'cual-dura-mas', text: '¿Cuál dura más?' },
      { id: 'cual-dura-mas-2', text: '¿Cuál dura más?' },
    ])
  })
  it('un "#" suelto (h1) se trata como párrafo: el h1 es el título', () => {
    expect(parseArticleBody('# Título')[0]?.type).toBe('paragraph')
  })
  it('texto vacío = sin bloques', () => {
    expect(parseArticleBody('   \n\n')).toEqual([])
  })
})

describe('utilidades del cuerpo', () => {
  it('slugifyHeading quita tildes y signos', () => {
    expect(slugifyHeading('¿Cada cuánto se cambia el aceite?')).toBe('cada-cuanto-se-cambia-el-aceite')
  })
  it('extractInternalLinks recorre encabezados, párrafos, listas, tablas y anidados', () => {
    const blocks = parseArticleBody(
      '## [Hub](/repuestos/akt/nkd-125)\n\nVer **[kit](/kits/nkd)** y [fuera](https://x.co)\n\n- [a](/producto/a)\n\n| x |\n|---|\n| [b](/producto/b) |',
    )
    expect(extractInternalLinks(blocks)).toEqual(['/repuestos/akt/nkd-125', '/kits/nkd', '/producto/a', '/producto/b'])
  })
})

// ── SaveArticle ──────────────────────────────────────────────────────────────

function makeRepos(
  opts: { existing?: Partial<Article>; slugTaken?: boolean; reviewerActive?: boolean; modelExists?: boolean } = {},
) {
  const saved: SaveArticleRecord[] = []
  const repo: IArticleRepository = {
    save: async (r) => {
      saved.push(r)
      return { ...r, id: r.id ?? 'a1', createdAt: new Date(), updatedAt: new Date() } as Article
    },
    findById: async (id) => (opts.existing && id === 'a1' ? ({ id, publishedAt: null, ...opts.existing } as Article) : null),
    slugExists: async () => opts.slugTaken ?? false,
    modelExists: async () => opts.modelExists ?? true,
    delete: async () => {},
  }
  const reviewerRepo = {
    findById: async (id: string) => (id === 'r1' ? { id, isActive: opts.reviewerActive ?? true } : null),
  } as unknown as ITechnicalReviewerRepository
  return { repo, reviewerRepo, saved }
}

describe('SaveArticle', () => {
  const input = { ...draft, status: 'PUBLISHED' as const, reviewerId: 'r1', reviewedAt: new Date('2026-09-20') }

  it('publica y fija publishedAt la primera vez', async () => {
    const { repo, reviewerRepo, saved } = makeRepos()
    const result = await new SaveArticle(repo, reviewerRepo).execute(input)
    expect(result.ok).toBe(true)
    expect(saved[0]!.publishedAt).toBeInstanceOf(Date)
  })
  it('conserva la fecha de publicación original al editar', async () => {
    const original = new Date('2026-01-01')
    const { repo, reviewerRepo, saved } = makeRepos({ existing: { publishedAt: original } })
    await new SaveArticle(repo, reviewerRepo).execute({ ...input, id: 'a1' })
    expect(saved[0]!.publishedAt).toBe(original)
  })
  it('un borrador se guarda incompleto y sin publishedAt; normaliza textos', async () => {
    const { repo, reviewerRepo, saved } = makeRepos()
    const result = await new SaveArticle(repo, reviewerRepo).execute({
      slug: ' borrador ', title: ' T ', kind: 'GUIA', authorName: ' Equipo ', status: 'DRAFT', sources: [' a ', ' '],
      metaDescription: '  ', reviewerId: '', modelId: '',
    })
    expect(result.ok).toBe(true)
    expect(saved[0]).toMatchObject({
      slug: 'borrador', title: 'T', authorName: 'Equipo', sources: ['a'], metaDescription: null,
      reviewerId: null, modelId: null, publishedAt: null, body: '', directAnswer: '',
    })
  })
  it('no publica sin revisor ni con el revisor desactivado', async () => {
    const a = makeRepos()
    const noReviewer = await new SaveArticle(a.repo, a.reviewerRepo).execute({ ...input, reviewerId: null })
    expect(!noReviewer.ok && noReviewer.error.message).toMatch(/revisor/)
    const b = makeRepos({ reviewerActive: false })
    const inactive = await new SaveArticle(b.repo, b.reviewerRepo).execute(input)
    expect(!inactive.ok && inactive.error.message).toMatch(/desactivado/)
    expect(a.saved).toHaveLength(0)
    expect(b.saved).toHaveLength(0)
  })
  it('rechaza slug repetido, artículo, revisor o modelo inexistentes', async () => {
    const taken = makeRepos({ slugTaken: true })
    expect((await new SaveArticle(taken.repo, taken.reviewerRepo).execute(input)).ok).toBe(false)
    const missing = makeRepos()
    const r1 = await new SaveArticle(missing.repo, missing.reviewerRepo).execute({ ...input, id: 'zzz' })
    expect(!r1.ok && r1.error.code).toBe('NOT_FOUND')
    const r2 = await new SaveArticle(missing.repo, missing.reviewerRepo).execute({ ...input, reviewerId: 'nadie' })
    expect(!r2.ok && r2.error.code).toBe('NOT_FOUND')
    const noModel = makeRepos({ modelExists: false })
    const r3 = await new SaveArticle(noModel.repo, noModel.reviewerRepo).execute({ ...input, modelId: 'm1' })
    expect(!r3.ok && r3.error.code).toBe('NOT_FOUND')
  })
  it('valida el borrador antes de tocar la base', async () => {
    const { repo, reviewerRepo, saved } = makeRepos()
    const result = await new SaveArticle(repo, reviewerRepo).execute({ ...input, slug: 'mantenimiento' })
    expect(!result.ok && result.error.code).toBe('VALIDATION_ERROR')
    expect(saved).toHaveLength(0)
  })
  it('INTERNAL_ERROR si falla el repositorio', async () => {
    const { repo, reviewerRepo } = makeRepos()
    const broken: IArticleRepository = { ...repo, save: async () => { throw new Error('db') } }
    const result = await new SaveArticle(broken, reviewerRepo).execute(input)
    expect(!result.ok && result.error.code).toBe('INTERNAL_ERROR')
  })
})
