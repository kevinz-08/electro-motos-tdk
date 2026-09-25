'use client'

/**
 * Crear/editar un revisor técnico — `/admin/revisores` (docs/seo/, Fase 5 — H-21).
 *
 * Todo lo que el administrador escribe aquí se publica tal cual en
 * `/autores/[slug]` y en cada guía que el revisor firma: nombre, foto, títulos,
 * años de experiencia y trayectoria. Nada se completa por defecto.
 *
 * La foto sigue el patrón de los banners: se sube a Cloudinary en cuanto se
 * elige (`POST /admin/reviewers/upload-image`) y el formulario guarda la URL y
 * el `public_id`. Si se reemplaza una foto que aún no se había guardado, la
 * anterior se borra del CDN; la foto ya guardada la borra la API al actualizar.
 */
import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { ImagePlus, Loader2, Trash2, X } from 'lucide-react'
import {
  MAX_REVIEWER_CREDENTIALS,
  MAX_REVIEWER_EXPERIENCE_YEARS,
  REVIEWER_BIO_MAX_LENGTH,
  REVIEWER_CREDENTIAL_MAX_LENGTH,
  REVIEWER_HEADLINE_MAX_LENGTH,
  validateReviewerProfile,
} from '@h2r/domain'
import { apiClient } from '@/lib/api-client'
import { revalidateAdminCache } from '@/lib/revalidate'
import { CACHE_TAGS } from '@/lib/cache-tags'

export interface ReviewerFormData {
  id: string
  name: string
  slug: string
  headline: string | null
  yearsExperience: number | null
  bio: string
  credentials: string[]
  photoUrl: string | null
  photoPublicId: string | null
  isActive: boolean
  guideCount: number
}

interface UploadedImage {
  url: string
  publicId: string
}

const INPUT_CLASS = 'w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-blue-500 transition-colors'

const generateSlug = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')

export function ReviewerEditForm({ reviewer }: { reviewer?: ReviewerFormData }) {
  const router = useRouter()
  const { data: session } = useSession()
  const token = session?.user?.accessToken

  const [name, setName] = useState(reviewer?.name ?? '')
  const [slug, setSlug] = useState(reviewer?.slug ?? '')
  const [slugTouched, setSlugTouched] = useState(!!reviewer)
  const [headline, setHeadline] = useState(reviewer?.headline ?? '')
  const [years, setYears] = useState(reviewer?.yearsExperience !== null && reviewer?.yearsExperience !== undefined ? String(reviewer.yearsExperience) : '')
  const [bio, setBio] = useState(reviewer?.bio ?? '')
  const [credentialsText, setCredentialsText] = useState((reviewer?.credentials ?? []).join('\n'))
  const [photo, setPhoto] = useState<UploadedImage | null>(
    reviewer?.photoUrl && reviewer.photoPublicId ? { url: reviewer.photoUrl, publicId: reviewer.photoPublicId } : null,
  )
  const [isActive, setIsActive] = useState(reviewer?.isActive ?? true)

  const [uploading, setUploading] = useState(false)
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  /** Foto subida en esta sesión y todavía sin guardar: si se descarta, hay que borrarla del CDN. */
  const unsavedUpload = photo && photo.publicId !== reviewer?.photoPublicId ? photo : null

  const discardUnsaved = (image: UploadedImage | null) => {
    if (image) void apiClient(token).post('/admin/reviewers/image/delete', { publicId: image.publicId }).catch(() => {})
  }

  const credentials = credentialsText.split('\n').map((c) => c.trim()).filter(Boolean)
  const yearsValue = years.trim() === '' ? null : Number(years)
  const profileError = validateReviewerProfile({ name, slug, headline, yearsExperience: yearsValue, bio, credentials })

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setError(null)
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('slug', slug || generateSlug(name) || 'revisor')
      const res = await apiClient(token).postForm<UploadedImage>('/admin/reviewers/upload-image', formData)
      if (!res.ok) throw new Error(res.error ?? 'No se pudo subir la foto')
      discardUnsaved(unsavedUpload)
      setPhoto(res.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo subir la foto')
    } finally {
      setUploading(false)
    }
  }

  const removePhoto = () => {
    discardUnsaved(unsavedUpload)
    setPhoto(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (profileError) {
      setError(profileError)
      return
    }
    setLoading(true)
    try {
      const payload = {
        name: name.trim(),
        slug: slug.trim(),
        headline: headline.trim() || undefined,
        yearsExperience: yearsValue ?? undefined,
        bio: bio.trim(),
        credentials,
        photoUrl: photo?.url,
        photoPublicId: photo?.publicId,
        isActive,
      }
      const client = apiClient(token)
      const res = reviewer
        ? await client.put<{ id: string }>(`/admin/reviewers/${reviewer.id}`, payload)
        : await client.post<{ id: string }>('/admin/reviewers', payload)
      if (!res.ok) throw new Error(res.error ?? 'Error al guardar el revisor')

      await revalidateAdminCache([CACHE_TAGS.guides])
      router.push('/admin/revisores')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperado')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!reviewer) return
    setDeleting(true)
    setError(null)
    try {
      const res = await apiClient(token).delete(`/admin/reviewers/${reviewer.id}`)
      if (!res.ok) throw new Error(res.error ?? 'Error al eliminar el revisor')
      await revalidateAdminCache([CACHE_TAGS.guides])
      router.push('/admin/revisores')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperado')
      setConfirmDelete(false)
      setDeleting(false)
    }
  }

  const handleCancel = () => {
    discardUnsaved(unsavedUpload)
    router.back()
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
      {/* ── Foto ── */}
      <div>
        <label className="text-sm font-medium text-white/70 block mb-2">Fotografía</label>
        <div className="flex items-center gap-4">
          <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-full border border-white/10 bg-white/5">
            {photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photo.url} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-white/20">
                <ImagePlus className="h-8 w-8" />
              </div>
            )}
            {uploading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                <Loader2 className="h-6 w-6 animate-spin text-white" />
              </div>
            )}
          </div>
          <div className="space-y-2">
            <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFile} className="hidden" />
            <button
              type="button"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
              className="rounded-lg border border-white/20 px-4 py-2 text-sm font-medium text-white/80 hover:border-white/40 disabled:opacity-50"
            >
              {photo ? 'Cambiar foto' : 'Subir foto'}
            </button>
            {photo && (
              <button type="button" onClick={removePhoto} className="flex items-center gap-1.5 text-xs text-red-400/70 hover:text-red-400">
                <X className="h-3.5 w-3.5" /> Quitar foto
              </button>
            )}
            <p className="text-xs text-white/30">JPEG, PNG o WebP, hasta 5 MB. Se muestra en la página del revisor y en cada guía que firma.</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="text-sm font-medium text-white/70 block mb-1.5">Nombre completo *</label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => {
              setName(e.target.value)
              if (!slugTouched) setSlug(generateSlug(e.target.value))
            }}
            placeholder="Carlos Pérez"
            className={INPUT_CLASS}
          />
        </div>
        <div>
          <label className="text-sm font-medium text-white/70 block mb-1.5">Slug (URL) *</label>
          <input
            type="text"
            required
            value={slug}
            onChange={(e) => {
              setSlug(generateSlug(e.target.value))
              setSlugTouched(true)
            }}
            placeholder="carlos-perez"
            className={`${INPUT_CLASS} font-mono`}
          />
          <p className="mt-1 text-xs text-white/30">/autores/{slug || '…'}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="sm:col-span-2">
          <label className="text-sm font-medium text-white/70 block mb-1.5">
            Título o rol <span className="font-normal text-white/30">(opcional)</span>
          </label>
          <input
            type="text"
            maxLength={REVIEWER_HEADLINE_MAX_LENGTH}
            value={headline}
            onChange={(e) => setHeadline(e.target.value)}
            placeholder="Mecánico de motos"
            className={INPUT_CLASS}
          />
        </div>
        <div>
          <label className="text-sm font-medium text-white/70 block mb-1.5">
            Años de experiencia <span className="font-normal text-white/30">(opcional)</span>
          </label>
          <input
            type="number"
            min={0}
            max={MAX_REVIEWER_EXPERIENCE_YEARS}
            step={1}
            value={years}
            onChange={(e) => setYears(e.target.value)}
            className={INPUT_CLASS}
          />
        </div>
      </div>

      <div>
        <label className="text-sm font-medium text-white/70 block mb-1.5">Resumen de trayectoria *</label>
        <textarea
          rows={5}
          required
          maxLength={REVIEWER_BIO_MAX_LENGTH}
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder="Dónde ha trabajado, en qué marcas y modelos se ha especializado, qué tipo de trabajos hace…"
          className={`${INPUT_CLASS} resize-none`}
        />
        <p className="mt-1 text-right text-xs text-white/30">{bio.length}/{REVIEWER_BIO_MAX_LENGTH}</p>
      </div>

      <div>
        <label className="text-sm font-medium text-white/70 block mb-1.5">
          Certificaciones o formación <span className="font-normal text-white/30">(una por línea, máx. {MAX_REVIEWER_CREDENTIALS})</span>
        </label>
        <textarea
          rows={3}
          value={credentialsText}
          onChange={(e) => setCredentialsText(e.target.value)}
          placeholder={'Técnico en mecánica de motocicletas — SENA\nCurso de inyección electrónica'}
          className={`${INPUT_CLASS} resize-none`}
        />
        <p className="mt-1 text-xs text-white/30">
          {credentials.length}/{MAX_REVIEWER_CREDENTIALS} · máx. {REVIEWER_CREDENTIAL_MAX_LENGTH} caracteres cada una. Escribe solo lo que puedas demostrar.
        </p>
      </div>

      <label className="flex cursor-pointer select-none items-center gap-2 text-sm text-white/70">
        <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="accent-blue-500" />
        Revisor activo (su página es pública y sus guías se publican)
      </label>
      {!isActive && reviewer && reviewer.guideCount > 0 && (
        <p className="text-xs text-amber-400">
          Desactivarlo oculta sus {reviewer.guideCount} {reviewer.guideCount === 1 ? 'guía' : 'guías'} publicadas hasta que lo actives de nuevo o las reasignes.
        </p>
      )}

      {error && <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</div>}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={loading || uploading}
          className="rounded-lg bg-blue-600 px-6 py-2.5 font-bold text-white transition-colors hover:bg-blue-500 disabled:opacity-60"
        >
          {loading ? 'Guardando...' : reviewer ? 'Guardar cambios' : 'Crear revisor'}
        </button>
        <button type="button" onClick={handleCancel} className="rounded-lg border border-white/20 px-6 py-2.5 font-medium text-white/70 transition-colors hover:border-white/40">
          Cancelar
        </button>
      </div>

      {reviewer && (
        <div className="space-y-3 rounded-xl border border-red-500/20 p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-red-400/50">Zona de peligro</p>
          {confirmDelete ? (
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-sm text-white/60">¿Eliminar a <span className="font-medium text-white">{reviewer.name}</span>?</p>
              <button type="button" onClick={handleDelete} disabled={deleting} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-500 disabled:opacity-60">
                {deleting ? 'Eliminando...' : 'Sí, eliminar'}
              </button>
              <button type="button" onClick={() => setConfirmDelete(false)} disabled={deleting} className="text-sm text-white/40 hover:text-white/70">
                Cancelar
              </button>
            </div>
          ) : (
            <button type="button" onClick={() => setConfirmDelete(true)} className="flex items-center gap-2 text-sm text-red-400/70 transition-colors hover:text-red-400">
              <Trash2 className="h-4 w-4" /> Eliminar revisor
            </button>
          )}
          {reviewer.guideCount > 0 && (
            <p className="text-xs text-white/30">
              Firma {reviewer.guideCount} {reviewer.guideCount === 1 ? 'guía' : 'guías'}: para eliminarlo primero reasígnalas a otro revisor.
            </p>
          )}
        </div>
      )}
    </form>
  )
}
