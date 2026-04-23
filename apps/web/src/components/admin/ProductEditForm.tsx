'use client'

/**
 * Formulario de creación y edición de productos para el panel admin.
 *
 * Conversión de precio:
 *   - El formulario muestra el precio en pesos COP (ej: 85000).
 *   - Al enviar, se multiplica × 100 para almacenar en centavos (8500000).
 *   - Al cargar un producto existente, se divide / 100 para mostrar en pesos.
 *
 * El slug se genera automáticamente desde el nombre del producto (URL-friendly),
 * pero puede editarse manualmente si se necesita una URL diferente.
 *
 * Imágenes:
 *   - Las imágenes se suben a Cloudinary vía POST /api/admin/products/upload-image.
 *   - Se muestran en una cuadrícula con botón de eliminación por imagen.
 *   - El array de URLs se incluye en el payload final al guardar el producto.
 *
 * Usa POST /api/admin/products para crear y PUT /api/admin/products/[id] para editar.
 */
import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Product } from '@h2r/domain'
import { X, ImagePlus, Loader2 } from 'lucide-react'

interface Category {
  id: string
  name: string
  slug: string
}

interface ProductEditFormProps {
  product?: Product
  categories: Category[]
}

export function ProductEditForm({ product, categories }: ProductEditFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [images, setImages] = useState<string[]>(product?.images ?? [])
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState({
    name: product?.name ?? '',
    slug: product?.slug ?? '',
    description: product?.description ?? '',
    price: product ? String(product.price / 100) : '',
    stock: product ? String(product.stock) : '0',
    sku: product?.sku ?? '',
    categoryId: product?.categoryId ?? (categories[0]?.id ?? ''),
    isActive: product?.isActive ?? true,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const payload = {
      ...form,
      price: Math.round(parseFloat(form.price) * 100),
      stock: parseInt(form.stock, 10),
      images,
    }

    const url = product ? `/api/admin/products/${product.id}` : '/api/admin/products'
    const method = product ? 'PUT' : 'POST'

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const data = (await res.json()) as { error?: string }
        throw new Error(data.error ?? 'Error al guardar el producto')
      }

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
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .trim()

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
        const res = await fetch('/api/admin/products/upload-image', {
          method: 'POST',
          body: formData,
        })

        if (!res.ok) {
          const data = (await res.json()) as { error?: string }
          throw new Error(data.error ?? 'Error al subir la imagen')
        }

        const data = (await res.json()) as { url: string }
        setImages((prev) => [...prev, data.url])
      } catch (e) {
        setUploadError(e instanceof Error ? e.message : 'Error al subir imagen')
      }
    }

    setUploading(false)
    // Reset input so the same file can be re-selected if needed
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const removeImage = (url: string) => {
    setImages((prev) => prev.filter((u) => u !== url))
  }

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
            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-white/70 mb-1">Slug (URL)</label>
          <input
            type="text"
            value={form.slug}
            onChange={(e) => setForm({ ...form, slug: e.target.value })}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white font-mono placeholder-white/20 focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-white/70 mb-1">Descripción *</label>
          <textarea
            required
            rows={4}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-blue-500 transition-colors resize-none"
          />
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
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-blue-500 transition-colors"
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
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
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
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white font-mono placeholder-white/20 focus:outline-none focus:border-blue-500 transition-colors"
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

      {/* ── Imágenes ── */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-4">
        <h2 className="text-sm font-semibold text-white/40 uppercase tracking-widest">
          Imágenes del producto
        </h2>

        {/* Grid de imágenes actuales */}
        {images.length > 0 && (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
            {images.map((url) => (
              <div key={url} className="relative group aspect-square rounded-lg overflow-hidden bg-white/5 border border-white/10">
                <Image
                  src={url}
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

        {/* Zona de subida */}
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
                <span className="text-sm text-white/50">
                  Haz clic para subir imágenes - MAXIMO 4 IMAGENES
                </span>
                <span className="text-xs text-white/25">PNG, JPG, WEBP · Máx. 10 MB</span>
              </>
            )}
          </label>
        </div>

        {uploadError && (
          <p className="text-sm text-red-400">{uploadError}</p>
        )}

        {images.length === 0 && !uploading && (
          <p className="text-xs text-white/25 text-center">
            Sin imágenes — se mostrará un placeholder en el catálogo
          </p>
        )}
      </div>

      {/* ── Error de guardado ── */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      {/* ── Acciones ── */}
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
    </form>
  )
}
