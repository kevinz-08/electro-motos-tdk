'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { z } from 'zod'
import { ImagePlus, Loader2, X } from 'lucide-react'
import { apiClient } from '@/lib/api-client'
import { revalidateAdminCache } from '@/lib/revalidate'
import { CACHE_TAGS } from '@/lib/cache-tags'
import { WHATSAPP_URL } from '@/lib/contact'
import { AdminHelpButton } from './AdminHelpButton'
import { bannersHelpContent } from './help-content/banners'

// ─── Types ────────────────────────────────────────────────────────────────────

export type BannerRow = {
  id: string
  imageUrl: string
  imagePublicId: string
  title: string
  description: string | null
  ctaLabel: string | null
  ctaUrl: string | null
  order: number
  isActive: boolean
}

/** Categoría o subcategoría disponible para el destino "Categoría" del botón. */
export type CategoryOption = {
  slug: string
  name: string
  isChild: boolean
}

// ─── Destino del botón ────────────────────────────────────────────────────────
//
// El admin no maneja URLs — elige de una lista de destinos conocidos y, si
// aplica, la categoría específica. La URL real (ctaUrl) se arma a partir de
// esa elección y solo se expone como texto libre en el destino "avanzado".

type DestinationType = 'ninguno' | 'catalogo' | 'categoria' | 'whatsapp' | 'custom'

const DESTINATION_LABELS: Record<DestinationType, string> = {
  ninguno: 'Sin botón',
  catalogo: 'Catálogo completo',
  categoria: 'Una categoría o subcategoría',
  whatsapp: 'WhatsApp (contacto)',
  custom: 'Otro enlace (avanzado)',
}

const DESTINATION_DEFAULT_LABEL: Record<DestinationType, string> = {
  ninguno: '',
  catalogo: 'Ver catálogo',
  categoria: 'Ver productos',
  whatsapp: 'Escríbenos',
  custom: '',
}

/** Reconstruye la selección de destino a partir de un ctaUrl ya guardado (modo edición). */
function inferDestination(ctaUrl: string | null | undefined): { type: DestinationType; categorySlug: string; customUrl: string } {
  if (!ctaUrl) return { type: 'ninguno', categorySlug: '', customUrl: '' }
  if (ctaUrl === '/catalogo') return { type: 'catalogo', categorySlug: '', customUrl: '' }
  const categoryMatch = ctaUrl.match(/^\/catalogo\?category=([a-z0-9-]+)$/)
  if (categoryMatch) return { type: 'categoria', categorySlug: categoryMatch[1]!, customUrl: '' }
  if (ctaUrl.startsWith('https://wa.me/')) return { type: 'whatsapp', categorySlug: '', customUrl: '' }
  return { type: 'custom', categorySlug: '', customUrl: ctaUrl }
}

function buildCtaUrl(type: DestinationType, categorySlug: string, customUrl: string): string {
  switch (type) {
    case 'ninguno': return ''
    case 'catalogo': return '/catalogo'
    case 'categoria': return categorySlug ? `/catalogo?category=${categorySlug}` : ''
    case 'whatsapp': return WHATSAPP_URL()
    case 'custom': return customUrl
  }
}

// ─── Validation ───────────────────────────────────────────────────────────────

const bannerSchema = z.object({
  title: z.string().min(1, 'Requerido').max(80, 'Máximo 80 caracteres'),
  description: z.string().max(200, 'Máximo 200 caracteres'),
  ctaLabel: z.string().max(40, 'Máximo 40 caracteres'),
})

const customUrlSchema = z
  .string()
  .min(1, 'Escribe la URL de destino')
  .regex(/^(\/|https?:\/\/)/, 'Debe ser una ruta relativa ("/promo") o una URL completa ("https://...")')

type BannerFormData = z.infer<typeof bannerSchema>
type FormErrors = Partial<Record<keyof BannerFormData, string>> & { categorySlug?: string; customUrl?: string }

// ─── Banner Form ──────────────────────────────────────────────────────────────

interface BannerFormProps {
  initial?: BannerRow
  nextOrder: number
  categories: CategoryOption[]
  onSuccess: () => void
  onCancel: () => void
  token: string | undefined
}

function BannerForm({ initial, nextOrder, categories, onSuccess, onCancel, token }: BannerFormProps) {
  const isEdit = !!initial
  const initialDestination = inferDestination(initial?.ctaUrl)

  const [form, setForm] = useState<BannerFormData>({
    title: initial?.title ?? '',
    description: initial?.description ?? '',
    ctaLabel: initial?.ctaLabel ?? '',
  })
  const [destination, setDestination] = useState<DestinationType>(initialDestination.type)
  const [categorySlug, setCategorySlug] = useState(initialDestination.categorySlug)
  const [customUrl, setCustomUrl] = useState(initialDestination.customUrl)
  const [image, setImage] = useState<{ url: string; publicId: string } | null>(
    initial ? { url: initial.imageUrl, publicId: initial.imagePublicId } : null,
  )
  const [errors, setErrors] = useState<FormErrors>({})
  const [imageError, setImageError] = useState<string | null>(null)
  const [serverError, setServerError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [loading, setLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function setField<K extends keyof BannerFormData>(key: K, value: BannerFormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }))
  }

  /** Cambiar de destino sugiere un texto de botón por defecto, pero nunca pisa uno que el admin ya escribió. */
  function handleDestinationChange(type: DestinationType) {
    setDestination(type)
    setErrors((prev) => ({ ...prev, categorySlug: undefined, customUrl: undefined }))
    if (!form.ctaLabel.trim() && DESTINATION_DEFAULT_LABEL[type]) {
      setField('ctaLabel', DESTINATION_DEFAULT_LABEL[type])
    }
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || uploading) return

    setUploading(true)
    setImageError(null)

    const formData = new FormData()
    formData.append('file', file)
    formData.append('slug', form.title || 'banner')

    const res = await apiClient(token).postForm<{ url: string; publicId: string }>(
      '/admin/banners/upload-image',
      formData,
    )
    if (!res.ok) {
      setImageError(res.error ?? 'Error al subir la imagen')
    } else {
      setImage({ url: res.data.url, publicId: res.data.publicId })
    }
    setUploading(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setServerError(null)

    const parsed = bannerSchema.safeParse(form)
    const fieldErrors: FormErrors = {}
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof BannerFormData
        if (!fieldErrors[key]) fieldErrors[key] = issue.message
      }
    }

    // El destino "categoría" y "avanzado" requieren su propio campo lleno;
    // cualquier destino distinto de "ninguno" necesita texto de botón.
    if (destination === 'categoria' && !categorySlug) {
      fieldErrors.categorySlug = 'Selecciona una categoría'
    }
    if (destination === 'custom') {
      const urlCheck = customUrlSchema.safeParse(customUrl)
      if (!urlCheck.success) fieldErrors.customUrl = urlCheck.error.issues[0]?.message
    }
    if (destination !== 'ninguno' && !form.ctaLabel.trim()) {
      fieldErrors.ctaLabel = 'Escribe el texto del botón'
    }

    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors)
      return
    }
    if (!image) {
      setImageError('Sube una imagen para el banner')
      return
    }

    const ctaUrl = buildCtaUrl(destination, categorySlug, customUrl)

    setLoading(true)
    try {
      const payload = {
        title: form.title,
        description: form.description || undefined,
        ctaLabel: destination === 'ninguno' ? undefined : (form.ctaLabel || undefined),
        ctaUrl: ctaUrl || undefined,
        imageUrl: image.url,
        imagePublicId: image.publicId,
        ...(isEdit ? {} : { order: nextOrder }),
      }

      const client = apiClient(token)
      const res = isEdit
        ? await client.put<void>(`/admin/banners/${initial.id}`, payload)
        : await client.post<void>('/admin/banners', payload)

      if (!res.ok) {
        setServerError(res.error ?? 'Error inesperado')
        return
      }

      await revalidateAdminCache([CACHE_TAGS.hero])
      onSuccess()
    } catch {
      setServerError('Error de red. Verifica tu conexión.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {serverError && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-lg">
          {serverError}
        </div>
      )}

      {/* Imagen */}
      <div>
        <label className="block text-xs font-semibold text-white/50 uppercase tracking-widest mb-1.5">
          Imagen <span className="text-red-400">*</span>
        </label>

        {image ? (
          <div className="relative w-full aspect-[21/9] rounded-lg overflow-hidden bg-white/5 border border-white/10 group">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={image.url} alt="" className="absolute inset-0 w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => setImage(null)}
              className="absolute top-1.5 right-1.5 bg-black/70 hover:bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-all"
              aria-label="Quitar imagen"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileChange}
              className="sr-only"
              id="banner-image-upload"
              disabled={uploading}
            />
            <label
              htmlFor="banner-image-upload"
              className={`flex flex-col items-center justify-center gap-2 w-full h-28 rounded-xl border-2 border-dashed cursor-pointer transition-colors ${
                uploading
                  ? 'border-blue-500/50 bg-blue-500/5 cursor-not-allowed'
                  : 'border-white/10 hover:border-blue-500/50 hover:bg-blue-500/5'
              }`}
            >
              {uploading ? (
                <>
                  <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
                  <span className="text-sm text-white/50">Subiendo...</span>
                </>
              ) : (
                <>
                  <ImagePlus className="w-6 h-6 text-white/30" />
                  <span className="text-sm text-white/50">Haz clic para subir la imagen</span>
                  <span className="text-xs text-white/25">JPG, PNG, WEBP · Máx. 5 MB</span>
                </>
              )}
            </label>
          </div>
        )}
        {imageError && <p className="text-red-400 text-xs mt-1">{imageError}</p>}
      </div>

      {/* Título */}
      <div>
        <label className="block text-xs font-semibold text-white/50 uppercase tracking-widest mb-1.5">
          Título <span className="text-red-400">*</span>
        </label>
        <input
          type="text"
          value={form.title}
          onChange={(e) => setField('title', e.target.value)}
          placeholder="Ej: Tu moto merece lo mejor."
          maxLength={80}
          className={`w-full bg-white/5 border rounded-lg px-4 py-2.5 text-sm text-white placeholder:text-white/25 focus:outline-none transition-colors ${
            errors.title ? 'border-red-500/60' : 'border-white/10 focus:border-blue-500'
          }`}
        />
        {errors.title && <p className="text-red-400 text-xs mt-1">{errors.title}</p>}
      </div>

      {/* Descripción */}
      <div>
        <label className="block text-xs font-semibold text-white/50 uppercase tracking-widest mb-1.5">
          Descripción
        </label>
        <textarea
          value={form.description}
          onChange={(e) => setField('description', e.target.value)}
          placeholder="Repuestos de alta calidad para cualquier tipo de moto."
          rows={2}
          maxLength={200}
          className={`w-full bg-white/5 border rounded-lg px-4 py-2.5 text-sm text-white placeholder:text-white/25 focus:outline-none resize-none transition-colors ${
            errors.description ? 'border-red-500/60' : 'border-white/10 focus:border-blue-500'
          }`}
        />
        {errors.description && <p className="text-red-400 text-xs mt-1">{errors.description}</p>}
      </div>

      {/* CTA — destino del botón, elegido de una lista en vez de escribir una URL */}
      <div>
        <label className="block text-xs font-semibold text-white/50 uppercase tracking-widest mb-1.5">
          Botón que redirige a:
        </label>
        <select
          value={destination}
          onChange={(e) => handleDestinationChange(e.target.value as DestinationType)}
          className="w-full bg-[#0a0a0a] border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
        >
          {(Object.keys(DESTINATION_LABELS) as DestinationType[]).map((type) => (
            <option key={type} value={type}>{DESTINATION_LABELS[type]}</option>
          ))}
        </select>
      </div>

      {/* Selector de categoría — solo si el destino es "Una categoría o subcategoría" */}
      {destination === 'categoria' && (
        <div>
          <label className="block text-xs font-semibold text-white/50 uppercase tracking-widest mb-1.5">
            ¿Cuál categoría?
          </label>
          <select
            value={categorySlug}
            onChange={(e) => {
              setCategorySlug(e.target.value)
              setErrors((prev) => ({ ...prev, categorySlug: undefined }))
            }}
            className={`w-full bg-[#0a0a0a] border rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none transition-colors ${
              errors.categorySlug ? 'border-red-500/60' : 'border-white/10 focus:border-blue-500'
            }`}
          >
            <option value="">Selecciona una categoría...</option>
            {categories.map((c) => (
              <option key={c.slug} value={c.slug}>{c.isChild ? `— ${c.name}` : c.name}</option>
            ))}
          </select>
          {errors.categorySlug && <p className="text-red-400 text-xs mt-1">{errors.categorySlug}</p>}
        </div>
      )}

      {/* URL personalizada — solo para el destino "avanzado" */}
      {destination === 'custom' && (
        <div>
          <label className="block text-xs font-semibold text-white/50 uppercase tracking-widest mb-1.5">
            URL de destino
          </label>
          <input
            type="text"
            value={customUrl}
            onChange={(e) => {
              setCustomUrl(e.target.value)
              setErrors((prev) => ({ ...prev, customUrl: undefined }))
            }}
            placeholder="https://... o /una-ruta-del-sitio"
            className={`w-full bg-white/5 border rounded-lg px-4 py-2.5 text-sm text-white placeholder:text-white/25 focus:outline-none font-mono transition-colors ${
              errors.customUrl ? 'border-red-500/60' : 'border-white/10 focus:border-blue-500'
            }`}
          />
          {errors.customUrl
            ? <p className="text-red-400 text-xs mt-1">{errors.customUrl}</p>
            : <p className="text-white/25 text-xs mt-1">Solo para casos que no están en la lista — si tienes dudas, pide ayuda técnica.</p>}
        </div>
      )}

      {/* Texto del botón — solo aplica si el banner va a tener botón */}
      {destination !== 'ninguno' && (
        <div>
          <label className="block text-xs font-semibold text-white/50 uppercase tracking-widest mb-1.5">
            Texto del botón
          </label>
          <input
            type="text"
            value={form.ctaLabel}
            onChange={(e) => setField('ctaLabel', e.target.value)}
            placeholder="Comprar ahora"
            maxLength={40}
            className={`w-full bg-white/5 border rounded-lg px-4 py-2.5 text-sm text-white placeholder:text-white/25 focus:outline-none transition-colors ${
              errors.ctaLabel ? 'border-red-500/60' : 'border-white/10 focus:border-blue-500'
            }`}
          />
          {errors.ctaLabel && <p className="text-red-400 text-xs mt-1">{errors.ctaLabel}</p>}
        </div>
      )}

      {/* Acciones */}
      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={loading || uploading}
          className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg text-sm font-bold hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Crear banner'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="px-5 py-2.5 rounded-lg text-sm font-medium text-white/50 hover:text-white hover:bg-white/5 transition-colors"
        >
          Cancelar
        </button>
      </div>
    </form>
  )
}

// ─── Modal ────────────────────────────────────────────────────────────────────

interface ModalProps {
  title: string
  onClose: () => void
  children: React.ReactNode
}

function Modal({ title, onClose, children }: ModalProps) {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-lg bg-[#111] border border-white/10 rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <h2 className="text-base font-bold text-white">{title}</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  )
}

// ─── Banner Manager (main component) ─────────────────────────────────────────

interface BannerManagerProps {
  banners: BannerRow[]
  categories: CategoryOption[]
}

type ModalState =
  | { type: 'closed' }
  | { type: 'create' }
  | { type: 'edit'; banner: BannerRow }

export function BannerManager({ banners, categories }: BannerManagerProps) {
  const router = useRouter()
  const { data: session } = useSession()
  const token = session?.user?.accessToken

  const [modal, setModal] = useState<ModalState>({ type: 'closed' })
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [rowError, setRowError] = useState<Record<string, string>>({})
  const [rowLoading, setRowLoading] = useState<string | null>(null)

  const nextOrder = banners.length > 0 ? Math.max(...banners.map((b) => b.order)) + 1 : 0

  function closeModal() { setModal({ type: 'closed' }) }

  function handleSuccess() {
    closeModal()
    router.refresh()
  }

  async function handleDelete(id: string) {
    setRowLoading(id)
    setRowError((prev) => ({ ...prev, [id]: '' }))
    try {
      const res = await apiClient(token).delete<void>(`/admin/banners/${id}`)
      if (!res.ok) {
        setRowError((prev) => ({ ...prev, [id]: res.error ?? 'Error al eliminar' }))
        return
      }
      await revalidateAdminCache([CACHE_TAGS.hero])
      setDeletingId(null)
      router.refresh()
    } catch {
      setRowError((prev) => ({ ...prev, [id]: 'Error de red' }))
    } finally {
      setRowLoading(null)
    }
  }

  async function toggleActive(banner: BannerRow) {
    setRowLoading(banner.id)
    setRowError((prev) => ({ ...prev, [banner.id]: '' }))
    const res = await apiClient(token).put<void>(`/admin/banners/${banner.id}`, {
      isActive: !banner.isActive,
    })
    if (!res.ok) {
      setRowError((prev) => ({ ...prev, [banner.id]: res.error ?? 'Error al actualizar' }))
      setRowLoading(null)
      return
    }
    await revalidateAdminCache([CACHE_TAGS.hero])
    router.refresh()
  }

  /** Intercambia el `order` de dos banners adyacentes — solo se envían esos dos al backend. */
  async function swapOrder(index: number, direction: 'up' | 'down') {
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= banners.length) return

    const current = banners[index]!
    const target = banners[targetIndex]!

    setRowLoading(current.id)
    const res = await apiClient(token).put<void>('/admin/banners/reorder', {
      items: [
        { id: current.id, order: target.order },
        { id: target.id, order: current.order },
      ],
    })
    if (!res.ok) {
      setRowError((prev) => ({ ...prev, [current.id]: res.error ?? 'Error al reordenar' }))
      setRowLoading(null)
      return
    }
    await revalidateAdminCache([CACHE_TAGS.hero])
    router.refresh()
  }

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Banners del Hero</h1>
          <p className="text-white/30 text-sm mt-0.5">
            {banners.length} banner{banners.length !== 1 && 's'} · {banners.filter((b) => b.isActive).length} activo{banners.filter((b) => b.isActive).length !== 1 && 's'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <AdminHelpButton content={bannersHelpContent} />
          <button
            onClick={() => setModal({ type: 'create' })}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-blue-500 transition-colors"
          >
            + Nuevo banner
          </button>
        </div>
      </div>

      {/* Lista */}
      <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
        {banners.map((banner, index) => (
          <div
            key={banner.id}
            className="flex items-center gap-4 px-4 py-3 border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors"
          >
            {/* Reorder */}
            <div className="flex flex-col shrink-0">
              <button
                onClick={() => swapOrder(index, 'up')}
                disabled={index === 0 || rowLoading === banner.id}
                aria-label="Subir banner"
                className="text-white/30 hover:text-white disabled:opacity-20 disabled:hover:text-white/30 transition-colors leading-none py-0.5"
              >
                ▲
              </button>
              <button
                onClick={() => swapOrder(index, 'down')}
                disabled={index === banners.length - 1 || rowLoading === banner.id}
                aria-label="Bajar banner"
                className="text-white/30 hover:text-white disabled:opacity-20 disabled:hover:text-white/30 transition-colors leading-none py-0.5"
              >
                ▼
              </button>
            </div>

            {/* Miniatura */}
            <div className="relative w-24 h-12 shrink-0 rounded-lg overflow-hidden bg-white/5 border border-white/10">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={banner.imageUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{banner.title}</p>
              {banner.ctaLabel && banner.ctaUrl && (
                <p className="text-xs text-white/30 truncate">
                  {banner.ctaLabel} → <span className="font-mono">{banner.ctaUrl}</span>
                </p>
              )}
              {rowError[banner.id] && (
                <p className="text-red-400 text-xs mt-0.5">{rowError[banner.id]}</p>
              )}
            </div>

            {/* Activo */}
            <button
              onClick={() => toggleActive(banner)}
              disabled={rowLoading === banner.id}
              className={`shrink-0 text-xs font-bold px-2.5 py-1 rounded-full transition-colors disabled:opacity-50 ${
                banner.isActive
                  ? 'bg-emerald-400/10 text-emerald-400 hover:bg-emerald-400/20'
                  : 'bg-white/5 text-white/30 hover:bg-white/10'
              }`}
            >
              {banner.isActive ? 'Activo' : 'Inactivo'}
            </button>

            {/* Acciones */}
            <div className="flex items-center gap-3 shrink-0">
              {deletingId === banner.id ? (
                <>
                  <button
                    onClick={() => handleDelete(banner.id)}
                    disabled={rowLoading === banner.id}
                    className="text-xs font-bold text-red-400 hover:text-red-300 transition-colors disabled:opacity-50"
                  >
                    {rowLoading === banner.id ? 'Eliminando...' : '¿Confirmar?'}
                  </button>
                  <button
                    onClick={() => { setDeletingId(null); setRowError((prev) => ({ ...prev, [banner.id]: '' })) }}
                    className="text-xs text-white/30 hover:text-white transition-colors"
                  >
                    Cancelar
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setModal({ type: 'edit', banner })}
                    className="text-blue-400 hover:text-blue-300 text-xs transition-colors"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => setDeletingId(banner.id)}
                    className="text-white/20 hover:text-red-400 text-xs transition-colors"
                  >
                    Eliminar
                  </button>
                </>
              )}
            </div>
          </div>
        ))}

        {banners.length === 0 && (
          <div className="text-center py-12 text-white/30">
            No hay banners. Crea el primero — hasta entonces el Hero de la home no se muestra.
          </div>
        )}
      </div>

      {/* Modal crear */}
      {modal.type === 'create' && (
        <Modal title="Nuevo banner" onClose={closeModal}>
          <BannerForm
            nextOrder={nextOrder}
            categories={categories}
            onSuccess={handleSuccess}
            onCancel={closeModal}
            token={token}
          />
        </Modal>
      )}

      {/* Modal editar */}
      {modal.type === 'edit' && (
        <Modal title={`Editar: ${modal.banner.title}`} onClose={closeModal}>
          <BannerForm
            initial={modal.banner}
            nextOrder={nextOrder}
            categories={categories}
            onSuccess={handleSuccess}
            onCancel={closeModal}
            token={token}
          />
        </Modal>
      )}
    </>
  )
}
