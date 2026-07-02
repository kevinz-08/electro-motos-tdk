'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Image from 'next/image'
import { Product } from '@h2r/domain'
import { X, ImagePlus, Loader2, Plus, Trash2 } from 'lucide-react'
import { apiClient } from '@/lib/api-client'
import { revalidateAdminCache } from '@/lib/revalidate'
import { CACHE_TAGS } from '@/lib/cache-tags'

interface Category {
  id: string
  name: string
  slug: string
}

interface Benefit {
  body: string
  order: number
}

interface ProductEditFormProps {
  product?: Product
  categories: Category[]
  initialBenefits?: Benefit[]
}

const INPUT_CLASS = 'w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-blue-500 transition-colors'

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ?? ''

function toImageUrl(publicIdOrUrl: string): string {
  if (publicIdOrUrl.startsWith('http')) return publicIdOrUrl
  return `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/${publicIdOrUrl}`
}

export function ProductEditForm({ product, categories, initialBenefits = [] }: ProductEditFormProps) {
  const router = useRouter()
  const { data: session } = useSession()
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [images, setImages] = useState<string[]>(
    (product?.images ?? []).filter((url) => typeof url === 'string' && url.trim().length > 0),
  )
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [benefits, setBenefits] = useState<Benefit[]>(initialBenefits)

  const [form, setForm] = useState({
    name: product?.name ?? '',
    slug: product?.slug ?? '',
    description: product?.description ?? '',
    price: product ? String(product.price / 100) : '',
    stock: product ? String(product.stock) : '0',
    sku: product?.sku ?? '',
    categoryId: product?.categoryId ?? (categories[0]?.id ?? ''),
    isActive: product?.isActive ?? true,
    weightKg: product?.weightKg != null ? String(product.weightKg) : '',
    heightCm: product?.heightCm != null ? String(product.heightCm) : '',
    widthCm: product?.widthCm != null ? String(product.widthCm) : '',
    lengthCm: product?.lengthCm != null ? String(product.lengthCm) : '',
  })

  // ── Beneficios ────────────────────────────────────────────────────────────

  const addBenefit = () => {
    if (benefits.length >= 10) return
    setBenefits((prev) => [...prev, { body: '', order: prev.length }])
  }

  const removeBenefit = (index: number) => {
    setBenefits((prev) =>
      prev.filter((_, i) => i !== index).map((b, i) => ({ ...b, order: i })),
    )
  }

  const updateBenefit = (index: number, value: string) => {
    setBenefits((prev) =>
      prev.map((b, i) => (i === index ? { ...b, body: value } : b)),
    )
  }

  // ── Delete ────────────────────────────────────────────────────────────────

  const handleDelete = async () => {
    if (!product) return
    setDeleting(true)
    setError(null)
    const res = await apiClient(session?.user?.accessToken).delete(`/admin/products/${product.id}`)
    if (!res.ok) {
      setError(res.error ?? 'Error al eliminar el producto')
      setDeleting(false)
      setConfirmDelete(false)
      return
    }
    await revalidateAdminCache([CACHE_TAGS.products])
    router.push('/admin/productos')
    router.refresh()
  }

  // ── Submit ────────────────────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const payload = {
      ...form,
      price: Math.round(parseFloat(form.price) * 100),
      stock: parseInt(form.stock, 10),
      images,
      weightKg: form.weightKg.trim() ? parseFloat(form.weightKg) : undefined,
      heightCm: form.heightCm.trim() ? parseInt(form.heightCm, 10) : undefined,
      widthCm: form.widthCm.trim() ? parseInt(form.widthCm, 10) : undefined,
      lengthCm: form.lengthCm.trim() ? parseInt(form.lengthCm, 10) : undefined,
    }

    const client = apiClient(session?.user?.accessToken)

    try {
      let productId = product?.id

      if (product) {
        const res = await client.put<void>(`/admin/products/${product.id}`, payload)
        if (!res.ok) throw new Error(res.error ?? 'Error al guardar el producto')
      } else {
        const res = await client.post<{ id: string }>('/admin/products', payload)
        if (!res.ok) throw new Error(res.error ?? 'Error al guardar el producto')
        productId = res.data.id
      }

      // Guardar beneficios junto con el producto (lista puede ser vacía para limpiar)
      if (productId) {
        await client.put(`/admin/products/${productId}/description`, {
          benefits: benefits
            .filter((b) => b.body.trim())
            .map((b, i) => ({ body: b.body.trim(), order: i })),
        })
      }

      await revalidateAdminCache([CACHE_TAGS.products])
      router.push('/admin/productos')
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error inesperado')
    } finally {
      setLoading(false)
    }
  }

  const generateSlug = (name: string) =>
    name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .trim()

  // ── Imágenes ──────────────────────────────────────────────────────────────

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    if (files.length === 0) return

    setUploading(true)
    setUploadError(null)

    for (const file of files) {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('sku', form.sku || 'producto')

      try {
        const res = await apiClient(session?.user?.accessToken).postForm<{ url: string }>(
          '/admin/products/upload-image',
          formData,
        )
        if (!res.ok) throw new Error(res.error ?? 'Error al subir la imagen')
        setImages((prev) => [...prev, res.data.url])
      } catch (e) {
        setUploadError(e instanceof Error ? e.message : 'Error al subir imagen')
      }
    }

    setUploading(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const removeImage = (url: string) => {
    setImages((prev) => prev.filter((u) => u !== url))
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">

      {/* ── Información general ── */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-4">
        <h2 className="text-sm font-semibold text-white/40 uppercase tracking-widest">
          Información general
        </h2>

        <div>
          <label className="block text-sm font-medium text-white/70 mb-1">Nombre *</label>
          <input
            required
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value, slug: generateSlug(e.target.value) })}
            className={INPUT_CLASS}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-white/70 mb-1">Slug (URL)</label>
          <input
            type="text"
            value={form.slug}
            onChange={(e) => setForm({ ...form, slug: e.target.value })}
            className={`${INPUT_CLASS} font-mono`}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-white/70 mb-1">Descripción *</label>
          <textarea
            required
            rows={4}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className={`${INPUT_CLASS} resize-none`}
          />
        </div>

        {/* ── Beneficios — inline, justo debajo de Descripción ── */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-white/70">
              Beneficios
              {benefits.length > 0 && (
                <span className="ml-1.5 text-white/30 font-normal text-xs">({benefits.length}/10)</span>
              )}
            </label>
            <button
              type="button"
              onClick={addBenefit}
              disabled={benefits.length >= 10}
              className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Agregar beneficio
            </button>
          </div>

          {benefits.map((benefit, index) => (
            <div key={index} className="flex items-center gap-2">
              <span className="text-xs text-white/20 w-4 text-right shrink-0">{index + 1}.</span>
              <input
                type="text"
                value={benefit.body}
                onChange={(e) => updateBenefit(index, e.target.value)}
                placeholder={`Beneficio ${index + 1} — ej: Alta durabilidad y resistencia`}
                maxLength={200}
                className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-blue-500 transition-colors"
              />
              <button
                type="button"
                onClick={() => removeBenefit(index)}
                aria-label="Eliminar beneficio"
                className="text-white/20 hover:text-red-400 transition-colors shrink-0"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-white/70 mb-1">Precio (COP) *</label>
            <input
              required
              type="number"
              min="0"
              step="100"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
              className={INPUT_CLASS}
              placeholder="85000"
            />
            <p className="text-xs text-white/30 mt-1">En pesos (sin centavos)</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-white/70 mb-1">Stock</label>
            <input
              type="number"
              min="0"
              value={form.stock}
              onChange={(e) => setForm({ ...form, stock: e.target.value })}
              className={INPUT_CLASS}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-white/70 mb-1">SKU *</label>
            <input
              required
              type="text"
              value={form.sku}
              onChange={(e) => setForm({ ...form, sku: e.target.value })}
              className={`${INPUT_CLASS} font-mono`}
              placeholder="FRE-BRE-FZ25-001"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white/70 mb-1">Categoría *</label>
            <select
              required
              value={form.categoryId}
              onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
              className="w-full bg-[#0a0a0a] border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="isActive"
            checked={form.isActive}
            onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
            className="w-4 h-4 accent-blue-600"
          />
          <label htmlFor="isActive" className="text-sm font-medium text-white/70">
            Producto activo (visible en el catálogo)
          </label>
        </div>
      </div>

      {/* ── Envío (Vendelo) ── */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-4">
        <h2 className="text-sm font-semibold text-white/40 uppercase tracking-widest">
          Envío
        </h2>
        <p className="text-xs text-white/30">
          Peso y dimensiones reales embalados. Si se dejan vacíos, la cotización de envío
          usa un valor por defecto genérico que puede no coincidir con el flete real cobrado.
        </p>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-white/70 mb-1">Peso (kg)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.weightKg}
              onChange={(e) => setForm({ ...form, weightKg: e.target.value })}
              className={INPUT_CLASS}
              placeholder="0.5"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-white/70 mb-1">Alto (cm)</label>
            <input
              type="number"
              min="0"
              step="1"
              value={form.heightCm}
              onChange={(e) => setForm({ ...form, heightCm: e.target.value })}
              className={INPUT_CLASS}
              placeholder="10"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-white/70 mb-1">Ancho (cm)</label>
            <input
              type="number"
              min="0"
              step="1"
              value={form.widthCm}
              onChange={(e) => setForm({ ...form, widthCm: e.target.value })}
              className={INPUT_CLASS}
              placeholder="10"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-white/70 mb-1">Largo (cm)</label>
            <input
              type="number"
              min="0"
              step="1"
              value={form.lengthCm}
              onChange={(e) => setForm({ ...form, lengthCm: e.target.value })}
              className={INPUT_CLASS}
              placeholder="10"
            />
          </div>
        </div>
      </div>

      {/* ── Imágenes ── */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-4">
        <h2 className="text-sm font-semibold text-white/40 uppercase tracking-widest">
          Imágenes del producto
        </h2>

        {images.length > 0 && (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
            {images.map((url) => (
              <div key={url} className="relative group aspect-square rounded-lg overflow-hidden bg-white/5 border border-white/10">
                <Image
                  src={toImageUrl(url)}
                  alt="Imagen del producto"
                  fill
                  className="object-cover"
                  sizes="160px"
                />
                <button
                  type="button"
                  onClick={() => removeImage(url)}
                  className="absolute top-1.5 right-1.5 bg-black/70 hover:bg-red-600 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-all"
                  aria-label="Eliminar imagen"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileChange}
            className="sr-only"
            id="image-upload"
          />
          <label
            htmlFor="image-upload"
            className={`flex flex-col items-center justify-center gap-2 w-full h-28 rounded-xl border-2 border-dashed cursor-pointer transition-colors
              ${uploading
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
                <span className="text-sm text-white/50">Haz clic para subir imágenes — máximo 4</span>
                <span className="text-xs text-white/25">PNG, JPG, WEBP · Máx. 10 MB</span>
              </>
            )}
          </label>
        </div>

        {uploadError && <p className="text-sm text-red-400">{uploadError}</p>}

        {images.length === 0 && !uploading && (
          <p className="text-xs text-white/25 text-center">
            Sin imágenes — se mostrará un placeholder en el catálogo
          </p>
        )}
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={loading || uploading}
          className="bg-blue-600 text-white px-6 py-2.5 rounded-lg font-bold hover:bg-blue-500 transition-colors disabled:opacity-60"
        >
          {loading ? 'Guardando...' : product ? 'Guardar cambios' : 'Crear producto'}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="border border-white/20 text-white/70 px-6 py-2.5 rounded-lg font-medium hover:border-white/40 transition-colors"
        >
          Cancelar
        </button>
      </div>

      {/* ── Zona de peligro (solo en edición) ── */}
      {product && (
        <div className="border border-red-500/20 rounded-xl p-5 space-y-3">
          <p className="text-[11px] font-semibold tracking-[0.18em] text-red-400/50 uppercase">
            Zona de peligro
          </p>
          {confirmDelete ? (
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-sm text-white/60">
                ¿Eliminar <span className="text-white font-medium">{product.name}</span> permanentemente?
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-red-500 transition-colors disabled:opacity-60"
                >
                  {deleting ? 'Eliminando...' : 'Sí, eliminar'}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  disabled={deleting}
                  className="text-sm text-white/40 hover:text-white/70 transition-colors disabled:opacity-40"
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="flex items-center gap-2 text-sm text-red-400/70 hover:text-red-400 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Eliminar producto
            </button>
          )}
        </div>
      )}
    </form>
  )
}
