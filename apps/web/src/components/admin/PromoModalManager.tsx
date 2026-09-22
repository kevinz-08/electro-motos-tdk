'use client'

/**
 * Configuración del pop-up promocional de la home (README §25.1).
 *
 * Mismo patrón que BannerManager: dos imágenes (desktop y mobile) subidas a Cloudinary
 * vía la API, texto alternativo y destino elegido de una lista en vez de escribir una URL.
 * A diferencia de los banners, aquí hay una sola promoción: el formulario hace un PUT
 * que crea o actualiza esa fila única.
 */
import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { ImagePlus, Loader2, X } from 'lucide-react'
import { apiClient } from '@/lib/api-client'
import { revalidateAdminCache } from '@/lib/revalidate'
import { CACHE_TAGS } from '@/lib/cache-tags'
import { WHATSAPP_URL } from '@/lib/contact'

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type PromoModalRow = {
  isActive: boolean
  desktopImageUrl: string
  desktopImagePublicId: string
  mobileImageUrl: string
  mobileImagePublicId: string
  altText: string
  ctaUrl: string
}

export type CategoryOption = { slug: string; name: string; isChild: boolean }
export type ProductOption = { slug: string; name: string; sku: string }

type DestinationType = 'catalogo' | 'categoria' | 'producto' | 'whatsapp' | 'custom'

const DESTINATION_LABELS: Record<DestinationType, string> = {
  catalogo: 'Catálogo completo',
  categoria: 'Una categoría o subcategoría',
  producto: 'Un producto específico',
  whatsapp: 'WhatsApp (contacto)',
  custom: 'Otro enlace (avanzado)',
}

/** Reconstruye la selección a partir del ctaUrl guardado. */
function inferDestination(ctaUrl: string | undefined) {
  const empty = { type: 'catalogo' as DestinationType, categorySlug: '', productSlug: '', customUrl: '' }
  if (!ctaUrl || ctaUrl === '/catalogo') return empty
  const category = ctaUrl.match(/^\/catalogo\?category=([a-z0-9-]+)$/)
  if (category) return { ...empty, type: 'categoria' as DestinationType, categorySlug: category[1]! }
  const product = ctaUrl.match(/^\/producto\/([a-z0-9-]+)$/)
  if (product) return { ...empty, type: 'producto' as DestinationType, productSlug: product[1]! }
  if (ctaUrl.startsWith('https://wa.me/')) return { ...empty, type: 'whatsapp' as DestinationType }
  return { ...empty, type: 'custom' as DestinationType, customUrl: ctaUrl }
}

function buildCtaUrl(type: DestinationType, categorySlug: string, productSlug: string, customUrl: string): string {
  switch (type) {
    case 'catalogo': return '/catalogo'
    case 'categoria': return categorySlug ? `/catalogo?category=${categorySlug}` : ''
    case 'producto': return productSlug ? `/producto/${productSlug}` : ''
    case 'whatsapp': return WHATSAPP_URL()
    case 'custom': return customUrl
  }
}

type ImageVariant = 'desktop' | 'mobile'
type UploadedImage = { url: string; publicId: string }

const VARIANT_META: Record<ImageVariant, { label: string; hint: string; previewClass: string }> = {
  desktop: {
    label: 'Imagen para computador',
    hint: 'Horizontal · sugerido 1200 × 800 px (3:2)',
    previewClass: 'aspect-[3/2] w-full',
  },
  mobile: {
    label: 'Imagen para celular',
    hint: 'Vertical · sugerido 900 × 1200 px (3:4)',
    previewClass: 'aspect-[3/4] w-44',
  },
}

const INPUT_CLASS = 'w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-blue-500 transition-colors'
const SELECT_CLASS = 'w-full bg-[#0a0a0a] border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors'

// ─── Carga de imagen ──────────────────────────────────────────────────────────

function ImageField({
  variant, image, uploading, error, onFile, onRemove,
}: {
  variant: ImageVariant
  image: UploadedImage | null
  uploading: boolean
  error: string | null
  onFile: (file: File) => void
  onRemove: () => void
}) {
  const meta = VARIANT_META[variant]
  const inputRef = useRef<HTMLInputElement>(null)
  const inputId = `promo-image-${variant}`

  return (
    <div>
      <label className="block text-xs font-semibold text-white/50 uppercase tracking-widest mb-1">
        {meta.label} <span className="text-red-400">*</span>
      </label>
      <p className="text-xs text-white/30 mb-1.5">{meta.hint}</p>

      {image ? (
        <div className={`relative ${meta.previewClass} rounded-lg overflow-hidden bg-white/5 border border-white/10 group`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={image.url} alt="" className="absolute inset-0 w-full h-full object-contain" />
          <button
            type="button"
            onClick={onRemove}
            aria-label={`Quitar ${meta.label.toLowerCase()}`}
            className="absolute top-1.5 right-1.5 bg-black/70 hover:bg-red-600 text-white rounded-full p-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <div>
          <input
            ref={inputRef}
            id={inputId}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            disabled={uploading}
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) onFile(file)
              if (inputRef.current) inputRef.current.value = ''
            }}
          />
          <label
            htmlFor={inputId}
            className={`flex flex-col items-center justify-center gap-2 w-full h-28 rounded-xl border-2 border-dashed cursor-pointer transition-colors ${
              uploading ? 'border-blue-500/50 bg-blue-500/5 cursor-not-allowed' : 'border-white/10 hover:border-blue-500/50 hover:bg-blue-500/5'
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
      {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
    </div>
  )
}

// ─── Formulario ───────────────────────────────────────────────────────────────

export function PromoModalManager({
  promo, categories, products,
}: { promo: PromoModalRow | null; categories: CategoryOption[]; products: ProductOption[] }) {
  const router = useRouter()
  const { data: session } = useSession()
  const token = session?.user?.accessToken

  const initialDestination = inferDestination(promo?.ctaUrl)
  const [isActive, setIsActive] = useState(promo?.isActive ?? false)
  const [altText, setAltText] = useState(promo?.altText ?? '')
  const [destination, setDestination] = useState<DestinationType>(initialDestination.type)
  const [categorySlug, setCategorySlug] = useState(initialDestination.categorySlug)
  const [productSlug, setProductSlug] = useState(initialDestination.productSlug)
  const [customUrl, setCustomUrl] = useState(initialDestination.customUrl)
  const [productQuery, setProductQuery] = useState(
    products.find((p) => p.slug === initialDestination.productSlug)?.name ?? '',
  )
  const [images, setImages] = useState<Record<ImageVariant, UploadedImage | null>>({
    desktop: promo ? { url: promo.desktopImageUrl, publicId: promo.desktopImagePublicId } : null,
    mobile: promo ? { url: promo.mobileImageUrl, publicId: promo.mobileImagePublicId } : null,
  })
  const [uploading, setUploading] = useState<Record<ImageVariant, boolean>>({ desktop: false, mobile: false })
  const [imageErrors, setImageErrors] = useState<Record<ImageVariant, string | null>>({ desktop: null, mobile: null })
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const filteredProducts = productQuery.trim().length >= 2
    ? products.filter((p) => `${p.name} ${p.sku}`.toLowerCase().includes(productQuery.trim().toLowerCase())).slice(0, 8)
    : []

  async function handleFile(variant: ImageVariant, file: File) {
    setUploading((prev) => ({ ...prev, [variant]: true }))
    setImageErrors((prev) => ({ ...prev, [variant]: null }))

    const formData = new FormData()
    formData.append('file', file)
    formData.append('variant', variant)

    const res = await apiClient(token).postForm<UploadedImage>('/admin/promo-modal/upload-image', formData)
    if (!res.ok) {
      setImageErrors((prev) => ({ ...prev, [variant]: res.error ?? 'Error al subir la imagen' }))
    } else {
      setImages((prev) => ({ ...prev, [variant]: { url: res.data.url, publicId: res.data.publicId } }))
    }
    setUploading((prev) => ({ ...prev, [variant]: false }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setStatus(null)

    if (!altText.trim()) return setError('Escribe el texto alternativo de la imagen')
    if (!images.desktop || !images.mobile) {
      setImageErrors({
        desktop: images.desktop ? null : 'Sube la imagen para computador',
        mobile: images.mobile ? null : 'Sube la imagen para celular',
      })
      return
    }
    const ctaUrl = buildCtaUrl(destination, categorySlug, productSlug, customUrl.trim())
    if (!ctaUrl) return setError('Elige el destino del enlace')
    if (destination === 'custom' && !/^(\/|https?:\/\/)/.test(ctaUrl)) {
      return setError('El enlace debe ser una ruta del sitio ("/promo") o una URL completa ("https://...")')
    }

    setSaving(true)
    try {
      const res = await apiClient(token).put<PromoModalRow>('/admin/promo-modal', {
        isActive,
        altText: altText.trim(),
        ctaUrl,
        desktopImageUrl: images.desktop.url,
        desktopImagePublicId: images.desktop.publicId,
        mobileImageUrl: images.mobile.url,
        mobileImagePublicId: images.mobile.publicId,
      })
      if (!res.ok) {
        setError(res.error ?? 'Error al guardar')
        return
      }
      await revalidateAdminCache([CACHE_TAGS.promo])
      setStatus(isActive ? 'Pop-up guardado y activo en la home' : 'Pop-up guardado (desactivado)')
      router.refresh()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Pop-up promocional</h1>
        <p className="text-white/30 text-sm mt-1">
          Se muestra sobre la home al entrar. Quien lo cierra no vuelve a verlo por 24 horas, salvo que publiques
          una promoción distinta.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="max-w-2xl space-y-5 bg-white/5 border border-white/10 rounded-xl p-6">
        {/* Activación */}
        <div className="flex items-center justify-between gap-4 p-4 bg-white/5 border border-white/10 rounded-lg">
          <div className="min-w-0">
            <p className="font-semibold text-white">Mostrar el pop-up en la home</p>
            <p className="text-xs text-white/40">
              Desactivado, la configuración se conserva pero los visitantes no lo ven.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={isActive}
            onClick={() => setIsActive((v) => !v)}
            className={`relative w-12 h-6 rounded-full shrink-0 transition-colors ${isActive ? 'bg-emerald-500' : 'bg-white/20'}`}
          >
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${isActive ? 'translate-x-6' : ''}`} />
          </button>
        </div>

        {(['desktop', 'mobile'] as const).map((variant) => (
          <ImageField
            key={variant}
            variant={variant}
            image={images[variant]}
            uploading={uploading[variant]}
            error={imageErrors[variant]}
            onFile={(file) => handleFile(variant, file)}
            onRemove={() => setImages((prev) => ({ ...prev, [variant]: null }))}
          />
        ))}

        {/* Texto alternativo */}
        <div>
          <label htmlFor="promo-alt" className="block text-xs font-semibold text-white/50 uppercase tracking-widest mb-1.5">
            Texto alternativo <span className="text-red-400">*</span>
          </label>
          <input
            id="promo-alt"
            type="text"
            maxLength={120}
            value={altText}
            onChange={(e) => setAltText(e.target.value)}
            placeholder="Ej: 20% de descuento en llantas Michelin"
            className={INPUT_CLASS}
          />
          <p className="text-white/25 text-xs mt-1">No se ve en pantalla: describe la imagen para accesibilidad y Google.</p>
        </div>

        {/* Destino */}
        <div>
          <label htmlFor="promo-destino" className="block text-xs font-semibold text-white/50 uppercase tracking-widest mb-1.5">
            Al hacer clic, lleva a <span className="text-red-400">*</span>
          </label>
          <select
            id="promo-destino"
            value={destination}
            onChange={(e) => setDestination(e.target.value as DestinationType)}
            className={SELECT_CLASS}
          >
            {(Object.keys(DESTINATION_LABELS) as DestinationType[]).map((type) => (
              <option key={type} value={type}>{DESTINATION_LABELS[type]}</option>
            ))}
          </select>
        </div>

        {destination === 'categoria' && (
          <div>
            <label htmlFor="promo-categoria" className="block text-xs font-semibold text-white/50 uppercase tracking-widest mb-1.5">
              ¿Cuál categoría?
            </label>
            <select
              id="promo-categoria"
              value={categorySlug}
              onChange={(e) => setCategorySlug(e.target.value)}
              className={SELECT_CLASS}
            >
              <option value="">Selecciona una categoría...</option>
              {categories.map((c) => (
                <option key={c.slug} value={c.slug}>{c.isChild ? `— ${c.name}` : c.name}</option>
              ))}
            </select>
          </div>
        )}

        {destination === 'producto' && (
          <div>
            <label htmlFor="promo-producto" className="block text-xs font-semibold text-white/50 uppercase tracking-widest mb-1.5">
              ¿Cuál producto?
            </label>
            <input
              id="promo-producto"
              type="text"
              value={productQuery}
              onChange={(e) => { setProductQuery(e.target.value); setProductSlug('') }}
              placeholder="Escribe el nombre o el SKU..."
              className={INPUT_CLASS}
              autoComplete="off"
            />
            {productSlug ? (
              <p className="text-emerald-400 text-xs mt-1">Seleccionado: /producto/{productSlug}</p>
            ) : (
              filteredProducts.length > 0 && (
                <ul className="mt-1 border border-white/10 rounded-lg overflow-hidden divide-y divide-white/5">
                  {filteredProducts.map((p) => (
                    <li key={p.slug}>
                      <button
                        type="button"
                        onClick={() => { setProductSlug(p.slug); setProductQuery(p.name) }}
                        className="w-full text-left px-4 py-2 text-sm text-white/80 hover:bg-white/10 transition-colors"
                      >
                        {p.name} <span className="text-white/30 font-mono text-xs">{p.sku}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )
            )}
          </div>
        )}

        {destination === 'custom' && (
          <div>
            <label htmlFor="promo-url" className="block text-xs font-semibold text-white/50 uppercase tracking-widest mb-1.5">
              URL de destino
            </label>
            <input
              id="promo-url"
              type="text"
              value={customUrl}
              onChange={(e) => setCustomUrl(e.target.value)}
              placeholder="https://... o /una-ruta-del-sitio"
              className={`${INPUT_CLASS} font-mono`}
            />
          </div>
        )}

        {error && (
          <p role="alert" className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-lg">{error}</p>
        )}

        <div className="flex items-center gap-3 pt-1">
          <button
            type="submit"
            disabled={saving || uploading.desktop || uploading.mobile}
            className="bg-blue-600 text-white px-5 py-2.5 rounded-lg text-sm font-bold hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
          {status && <p className="text-sm text-emerald-400">{status}</p>}
        </div>
      </form>
    </div>
  )
}
