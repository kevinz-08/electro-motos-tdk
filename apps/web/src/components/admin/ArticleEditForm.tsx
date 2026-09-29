'use client'

/**
 * Crear/editar un artículo — `/admin/guias` (docs/seo/, Fase 5 — ítem 1).
 *
 * Lo que el editor enseña mientras se escribe es exactamente lo que el dominio
 * va a exigir al guardar (`articlePublishBlockers`): el contador de palabras de
 * la respuesta directa, y la lista de lo que falta para pasar a "En revisión" o
 * a "Publicado". La API vuelve a comprobarlo; el editor solo avisa antes.
 *
 * La vista previa usa el mismo parser y el mismo componente que la página
 * pública, así que se ve igual que como quedará publicado (en tema oscuro).
 */
import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { toast } from 'sonner'
import { Eye, Loader2, Pencil, Trash2 } from 'lucide-react'
import {
  ARTICLE_BODY_MAX_LENGTH,
  ARTICLE_KIND_LABELS,
  ARTICLE_MAX_SOURCES,
  ARTICLE_META_DESCRIPTION_MAX_LENGTH,
  ARTICLE_STATUS_LABELS,
  ARTICLE_TITLE_MAX_LENGTH,
  DIRECT_ANSWER_MAX_LENGTH,
  DIRECT_ANSWER_MAX_WORDS,
  DIRECT_ANSWER_MIN_WORDS,
  articlePublishBlockers,
  countWords,
  parseArticleBody,
  slugifyHeading,
  type ArticleKind,
  type ArticleStatus,
} from '@h2r/domain'
import { apiClient } from '@/lib/api-client'
import { revalidateAdminCache } from '@/lib/revalidate'
import { CACHE_TAGS } from '@/lib/cache-tags'
import { ArticleBody } from '@/components/content/ArticleBody'

export interface ArticleFormData {
  id: string
  slug: string
  title: string
  kind: ArticleKind
  directAnswer: string
  body: string
  metaDescription: string | null
  sources: string[]
  authorName: string
  reviewerId: string | null
  /** YYYY-MM-DD */
  reviewedAt: string | null
  modelId: string | null
  status: ArticleStatus
}

export interface ReviewerOption {
  id: string
  name: string
  isActive: boolean
}

export interface ModelOption {
  id: string
  label: string
}

const INPUT =
  'w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-blue-500'
const LABEL = 'text-sm font-medium text-white/70'

const MARKDOWN_HELP = [
  '## Pregunta como encabezado',
  '### Subtítulo',
  '**negrita**, *cursiva*, [enlace](/producto/slug)',
  '- lista  ·  1. lista numerada',
  '| Col 1 | Col 2 |  +  |---|---|  +  filas',
]

export function ArticleEditForm({
  article,
  reviewers,
  models,
}: {
  article?: ArticleFormData
  reviewers: ReviewerOption[]
  models: ModelOption[]
}) {
  const router = useRouter()
  const { data: session } = useSession()
  const token = session?.user?.accessToken
  const [form, setForm] = useState({
    title: article?.title ?? '',
    slug: article?.slug ?? '',
    kind: article?.kind ?? ('GUIA' as ArticleKind),
    status: article?.status ?? ('DRAFT' as ArticleStatus),
    directAnswer: article?.directAnswer ?? '',
    body: article?.body ?? '',
    metaDescription: article?.metaDescription ?? '',
    sources: (article?.sources ?? []).join('\n'),
    authorName: article?.authorName ?? 'Equipo H2R',
    reviewerId: article?.reviewerId ?? '',
    reviewedAt: article?.reviewedAt ?? '',
    modelId: article?.modelId ?? '',
  })
  // Mientras no se toque el slug a mano, se deriva del título (solo al crear).
  const [slugTouched, setSlugTouched] = useState(Boolean(article))
  const [preview, setPreview] = useState(false)
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => setForm((f) => ({ ...f, [key]: value }))

  const sources = form.sources.split('\n').map((s) => s.trim()).filter(Boolean)
  const words = countWords(form.directAnswer)
  const wordsOk = words >= DIRECT_ANSWER_MIN_WORDS && words <= DIRECT_ANSWER_MAX_WORDS
  const reviewer = reviewers.find((r) => r.id === form.reviewerId) ?? null
  const blocks = useMemo(() => (preview ? parseArticleBody(form.body) : []), [preview, form.body])

  const blockersFor = (target: ArticleStatus) =>
    articlePublishBlockers(
      {
        directAnswer: form.directAnswer,
        body: form.body,
        sources,
        reviewerId: form.reviewerId || null,
        reviewedAt: form.reviewedAt ? new Date(form.reviewedAt) : null,
      },
      target,
      reviewer,
    )
  const publishBlockers = blockersFor('PUBLISHED')
  const currentBlockers = blockersFor(form.status)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (currentBlockers.length > 0) {
      toast.error(`No se puede guardar como "${ARTICLE_STATUS_LABELS[form.status]}": revisa la lista de pendientes`)
      return
    }
    setSaving(true)
    const payload = {
      title: form.title.trim(),
      slug: form.slug.trim(),
      kind: form.kind,
      status: form.status,
      directAnswer: form.directAnswer,
      body: form.body,
      metaDescription: form.metaDescription.trim() || null,
      sources,
      authorName: form.authorName.trim(),
      reviewerId: form.reviewerId || null,
      reviewedAt: form.reviewedAt || null,
      modelId: form.modelId || null,
    }
    const client = apiClient(token)
    const res = article ? await client.put(`/admin/articles/${article.id}`, payload) : await client.post('/admin/articles', payload)
    setSaving(false)
    if (!res.ok) {
      toast.error(res.error)
      return
    }
    toast.success(form.status === 'PUBLISHED' ? 'Artículo publicado' : 'Artículo guardado')
    await revalidateAdminCache([CACHE_TAGS.guides])
    router.push('/admin/guias')
    router.refresh()
  }

  const handleDelete = async () => {
    if (!article) return
    setSaving(true)
    const res = await apiClient(token).delete(`/admin/articles/${article.id}`)
    setSaving(false)
    if (!res.ok) return toast.error(res.error)
    toast.success('Artículo eliminado')
    await revalidateAdminCache([CACHE_TAGS.guides])
    router.push('/admin/guias')
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-[1fr_300px]">
      <div className="space-y-5">
        <div className="space-y-1.5">
          <label className={LABEL} htmlFor="title">Título</label>
          <input
            id="title"
            required
            maxLength={ARTICLE_TITLE_MAX_LENGTH}
            value={form.title}
            onChange={(e) => {
              set('title', e.target.value)
              if (!slugTouched) set('slug', slugifyHeading(e.target.value))
            }}
            placeholder="Ej: Pastillas de freno originales vs genéricas para la NKD 125"
            className={INPUT}
          />
        </div>

        <div className="space-y-1.5">
          <label className={LABEL} htmlFor="slug">URL</label>
          <div className="flex items-center gap-2">
            <span className="text-sm text-white/30">/guias/</span>
            <input
              id="slug"
              required
              value={form.slug}
              onChange={(e) => {
                setSlugTouched(true)
                set('slug', e.target.value)
              }}
              className={INPUT}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-baseline justify-between">
            <label className={LABEL} htmlFor="answer">Respuesta directa</label>
            <span className={`text-xs ${wordsOk ? 'text-emerald-400' : 'text-amber-400'}`}>
              {words} palabras (entre {DIRECT_ANSWER_MIN_WORDS} y {DIRECT_ANSWER_MAX_WORDS})
            </span>
          </div>
          <textarea
            id="answer"
            rows={4}
            maxLength={DIRECT_ANSWER_MAX_LENGTH}
            value={form.directAnswer}
            onChange={(e) => set('directAnswer', e.target.value)}
            placeholder="Responde la pregunta del título en 40–60 palabras, con datos concretos. Es lo primero que se lee y lo que citan buscadores e IAs."
            className={INPUT}
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className={LABEL} htmlFor="body">Cuerpo</label>
            <button
              type="button"
              onClick={() => setPreview((p) => !p)}
              className="flex items-center gap-1.5 text-xs text-white/50 hover:text-white"
            >
              {preview ? <Pencil className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              {preview ? 'Editar' : 'Vista previa'}
            </button>
          </div>
          {preview ? (
            <div className="min-h-[320px] rounded-lg border border-white/10 bg-white/[0.02] p-4">
              {blocks.length ? <ArticleBody blocks={blocks} tone="dark" /> : <p className="text-sm text-white/30">Sin contenido.</p>}
            </div>
          ) : (
            <textarea
              id="body"
              rows={18}
              maxLength={ARTICLE_BODY_MAX_LENGTH}
              value={form.body}
              onChange={(e) => set('body', e.target.value)}
              className={`${INPUT} font-mono text-[13px]`}
            />
          )}
          <p className="text-xs text-white/30">Formato: {MARKDOWN_HELP.join('  ·  ')}. No se admite HTML.</p>
        </div>

        <div className="space-y-1.5">
          <label className={LABEL} htmlFor="sources">Fuentes (una por línea, máx. {ARTICLE_MAX_SOURCES})</label>
          <textarea
            id="sources"
            rows={3}
            value={form.sources}
            onChange={(e) => set('sources', e.target.value)}
            placeholder={'Manual de servicio Bajaj Boxer CT100 (2023), pág. 42\nCatálogo del fabricante de pastillas, 2026'}
            className={INPUT}
          />
        </div>

        <div className="space-y-1.5">
          <label className={LABEL} htmlFor="meta">Meta descripción (opcional)</label>
          <input
            id="meta"
            maxLength={ARTICLE_META_DESCRIPTION_MAX_LENGTH}
            value={form.metaDescription}
            onChange={(e) => set('metaDescription', e.target.value)}
            placeholder="Si se deja vacía, se usa la respuesta directa."
            className={INPUT}
          />
        </div>
      </div>

      <aside className="space-y-5">
        <div className="space-y-4 rounded-xl border border-white/10 p-4">
          <div className="space-y-1.5">
            <label className={LABEL} htmlFor="status">Estado</label>
            <select id="status" value={form.status} onChange={(e) => set('status', e.target.value as ArticleStatus)} className={INPUT}>
              {(Object.keys(ARTICLE_STATUS_LABELS) as ArticleStatus[]).map((s) => (
                <option key={s} value={s}>{ARTICLE_STATUS_LABELS[s]}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className={LABEL} htmlFor="kind">Tipo</label>
            <select id="kind" value={form.kind} onChange={(e) => set('kind', e.target.value as ArticleKind)} className={INPUT}>
              {(Object.keys(ARTICLE_KIND_LABELS) as ArticleKind[]).map((k) => (
                <option key={k} value={k}>{ARTICLE_KIND_LABELS[k]}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className={LABEL} htmlFor="author">Autor</label>
            <input id="author" value={form.authorName} onChange={(e) => set('authorName', e.target.value)} className={INPUT} />
          </div>
          <div className="space-y-1.5">
            <label className={LABEL} htmlFor="reviewer">Revisor técnico</label>
            <select id="reviewer" value={form.reviewerId} onChange={(e) => set('reviewerId', e.target.value)} className={INPUT}>
              <option value="">Sin asignar</option>
              {reviewers.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                  {!r.isActive && ' (inactivo)'}
                </option>
              ))}
            </select>
            {reviewers.length === 0 && (
              <p className="text-xs text-amber-400/80">No hay revisores. Regístralo en Revisores para poder publicar.</p>
            )}
          </div>
          <div className="space-y-1.5">
            <label className={LABEL} htmlFor="reviewedAt">Fecha de revisión</label>
            <input id="reviewedAt" type="date" value={form.reviewedAt} onChange={(e) => set('reviewedAt', e.target.value)} className={INPUT} />
            <p className="text-xs text-white/30">El día en que el revisor aprobó este texto.</p>
          </div>
          <div className="space-y-1.5">
            <label className={LABEL} htmlFor="model">Modelo de moto (opcional)</label>
            <select id="model" value={form.modelId} onChange={(e) => set('modelId', e.target.value)} className={INPUT}>
              <option value="">Ninguno</option>
              {models.map((m) => (
                <option key={m.id} value={m.id}>{m.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="rounded-xl border border-white/10 p-4 text-xs">
          <p className="font-semibold text-white/70">Para publicar</p>
          {publishBlockers.length === 0 ? (
            <p className="mt-2 text-emerald-400">Listo: cumple todo lo necesario.</p>
          ) : (
            <ul className="mt-2 list-disc space-y-1 pl-4 text-amber-400/90">
              {publishBlockers.map((b) => <li key={b}>{b}</li>)}
            </ul>
          )}
        </div>

        <button
          type="submit"
          disabled={saving}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-6 py-2.5 font-bold text-white hover:bg-blue-500 disabled:opacity-60"
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          {article ? 'Guardar cambios' : 'Crear artículo'}
        </button>

        {article &&
          (confirmDelete ? (
            <div className="space-y-2 rounded-xl border border-red-500/30 p-3 text-xs">
              <p className="text-white/60">¿Eliminar este artículo? Si está publicado, su URL dejará de existir.</p>
              <div className="flex gap-2">
                <button type="button" onClick={handleDelete} disabled={saving} className="rounded-lg bg-red-600 px-3 py-1.5 font-bold text-white">
                  Sí, eliminar
                </button>
                <button type="button" onClick={() => setConfirmDelete(false)} className="text-white/50">
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="flex w-full items-center justify-center gap-1.5 text-xs text-red-400/60 hover:text-red-400"
            >
              <Trash2 className="h-3.5 w-3.5" /> Eliminar artículo
            </button>
          ))}
      </aside>
    </form>
  )
}
