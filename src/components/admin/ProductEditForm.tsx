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
 * Usa POST /api/admin/products para crear y PUT /api/admin/products/[id] para editar.
 */
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Product } from '@/domain/entities/Product'

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

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
      <div className="bg-[#0a0a0a] border border-gray-200 rounded-xl p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-white-700 mb-1">Nombre *</label>
          <input
            required
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value, slug: generateSlug(e.target.value) })}
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-blue-400"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-white-700 mb-1">Slug (URL)</label>
          <input
            type="text"
            value={form.slug}
            onChange={(e) => setForm({ ...form, slug: e.target.value })}
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-blue-400"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-white-700 mb-1">Descripción *</label>
          <textarea
            required
            rows={4}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-blue-400 resize-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-white-700 mb-1">
              Precio (COP) *
            </label>
            <input
              required
              type="number"
              min="0"
              step="100"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-blue-400"
              placeholder="85000"
            />
            <p className="text-xs text-gray-400 mt-1">En pesos colombianos (sin centavos)</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-white-700 mb-1">Stock</label>
            <input
              type="number"
              min="0"
              value={form.stock}
              onChange={(e) => setForm({ ...form, stock: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-blue-400"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-white-700 mb-1">SKU *</label>
            <input
              required
              type="text"
              value={form.sku}
              onChange={(e) => setForm({ ...form, sku: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-blue-400 font-mono"
              placeholder="FRE-BRE-FZ25-001"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white-700 mb-1">Categoría *</label>
            <select
              required
              value={form.categoryId}
              onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-blue-400 bg-black"
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
          <label htmlFor="isActive" className="text-sm font-medium text-white-700">
            Producto activo (visible en el catálogo)
          </label>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 text-white-900 px-6 py-2.5 rounded-lg font-bold hover:bg-blue-500 transition-colors disabled:opacity-60"
        >
          {loading ? 'Guardando...' : product ? 'Guardar cambios' : 'Crear producto'}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="border border-gray-300 text-white-700 px-6 py-2.5 rounded-lg font-medium hover:border-red-600 transition-colors"
        >
          Cancelar
        </button>
      </div>
    </form>
  )
}
