'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { z } from 'zod'
import { apiClient } from '@/lib/api-client'
import { revalidateAdminCache } from '@/lib/revalidate'
import { CACHE_TAGS } from '@/lib/cache'

// ─── Types ────────────────────────────────────────────────────────────────────

export type CategoryRow = {
  id: string
  name: string
  slug: string
  description: string | null
  imageUrl: string | null
  parentId: string | null
  parent: { id: string; name: string } | null
  _count: { products: number }
}

// ─── Validation ───────────────────────────────────────────────────────────────

const categorySchema = z.object({
  name: z.string().min(2, 'Mínimo 2 caracteres').max(80, 'Máximo 80 caracteres'),
  slug: z
    .string()
    .min(2, 'Mínimo 2 caracteres')
    .max(80, 'Máximo 80 caracteres')
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Solo letras minúsculas, números y guiones'),
  description: z.string().max(500, 'Máximo 500 caracteres').optional(),
  imageUrl: z.string().url('URL inválida').optional().or(z.literal('')),
  parentId: z.string().optional().or(z.literal('')),
})

type CategoryFormData = z.infer<typeof categorySchema>
type FormErrors = Partial<Record<keyof CategoryFormData, string>>

// ─── Helpers ─────────────────────────────────────────────────────────────────

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

// ─── Category Form ────────────────────────────────────────────────────────────

interface CategoryFormProps {
  initial?: CategoryRow
  rootCategories: CategoryRow[]
  onSuccess: () => void
  onCancel: () => void
  token: string | undefined
}

function CategoryForm({ initial, rootCategories, onSuccess, onCancel, token }: CategoryFormProps) {
  const [form, setForm] = useState<CategoryFormData>({
    name: initial?.name ?? '',
    slug: initial?.slug ?? '',
    description: initial?.description ?? '',
    imageUrl: initial?.imageUrl ?? '',
    parentId: initial?.parentId ?? '',
  })
  const [errors, setErrors] = useState<FormErrors>({})
  const [serverError, setServerError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const isEdit = !!initial

  function setField<K extends keyof CategoryFormData>(key: K, value: CategoryFormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }))
  }

  function handleNameChange(value: string) {
    setField('name', value)
    if (!isEdit) setField('slug', toSlug(value))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setServerError(null)

    const parsed = categorySchema.safeParse(form)
    if (!parsed.success) {
      const fieldErrors: FormErrors = {}
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof CategoryFormData
        if (!fieldErrors[key]) fieldErrors[key] = issue.message
      }
      setErrors(fieldErrors)
      return
    }

    setLoading(true)
    try {
      const payload = {
        name: parsed.data.name,
        slug: parsed.data.slug,
        description: parsed.data.description || null,
        imageUrl: parsed.data.imageUrl || null,
        parentId: parsed.data.parentId || null,
      }

      const client = apiClient(token)
      const res = isEdit
        ? await client.put(`/admin/categories/${initial.id}`, payload)
        : await client.post('/admin/categories', payload)

      if (!res.ok) {
        const data = (await res.json()) as { message?: string }
        setServerError(data.message ?? 'Error inesperado')
        return
      }

      await revalidateAdminCache([CACHE_TAGS.categories, CACHE_TAGS.catalog])
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

      {/* Nombre */}
      <div>
        <label className="block text-xs font-semibold text-white/50 uppercase tracking-widest mb-1.5">
          Nombre <span className="text-red-400">*</span>
        </label>
        <input
          type="text"
          value={form.name}
          onChange={(e) => handleNameChange(e.target.value)}
          placeholder="Ej: Sistema Eléctrico"
          className={`w-full bg-white/5 border rounded-lg px-4 py-2.5 text-sm text-white placeholder:text-white/25 focus:outline-none transition-colors ${
            errors.name ? 'border-red-500/60' : 'border-white/10 focus:border-blue-500'
          }`}
        />
        {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name}</p>}
      </div>

      {/* Slug */}
      <div>
        <label className="block text-xs font-semibold text-white/50 uppercase tracking-widest mb-1.5">
          Slug <span className="text-red-400">*</span>
        </label>
        <input
          type="text"
          value={form.slug}
          onChange={(e) => setField('slug', e.target.value)}
          placeholder="Ej: sistema-electrico"
          className={`w-full bg-white/5 border rounded-lg px-4 py-2.5 text-sm text-white placeholder:text-white/25 focus:outline-none font-mono transition-colors ${
            errors.slug ? 'border-red-500/60' : 'border-white/10 focus:border-blue-500'
          }`}
        />
        {errors.slug && <p className="text-red-400 text-xs mt-1">{errors.slug}</p>}
        <p className="text-white/25 text-xs mt-1">Se usa en la URL del catálogo</p>
      </div>

      {/* Categoría padre */}
      <div>
        <label className="block text-xs font-semibold text-white/50 uppercase tracking-widest mb-1.5">
          Categoría padre
        </label>
        <select
          value={form.parentId ?? ''}
          onChange={(e) => setField('parentId', e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
        >
          <option value="">— Sin padre (categoría raíz)</option>
          {rootCategories
            .filter((c) => c.id !== initial?.id)
            .map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
        </select>
      </div>

      {/* Descripción */}
      <div>
        <label className="block text-xs font-semibold text-white/50 uppercase tracking-widest mb-1.5">
          Descripción
        </label>
        <textarea
          value={form.description ?? ''}
          onChange={(e) => setField('description', e.target.value)}
          placeholder="Descripción breve de la categoría..."
          rows={3}
          className={`w-full bg-white/5 border rounded-lg px-4 py-2.5 text-sm text-white placeholder:text-white/25 focus:outline-none resize-none transition-colors ${
            errors.description ? 'border-red-500/60' : 'border-white/10 focus:border-blue-500'
          }`}
        />
        {errors.description && <p className="text-red-400 text-xs mt-1">{errors.description}</p>}
      </div>

      {/* Imagen */}
      <div>
        <label className="block text-xs font-semibold text-white/50 uppercase tracking-widest mb-1.5">
          URL de imagen
        </label>
        <input
          type="url"
          value={form.imageUrl ?? ''}
          onChange={(e) => setField('imageUrl', e.target.value)}
          placeholder="https://res.cloudinary.com/..."
          className={`w-full bg-white/5 border rounded-lg px-4 py-2.5 text-sm text-white placeholder:text-white/25 focus:outline-none transition-colors ${
            errors.imageUrl ? 'border-red-500/60' : 'border-white/10 focus:border-blue-500'
          }`}
        />
        {errors.imageUrl && <p className="text-red-400 text-xs mt-1">{errors.imageUrl}</p>}
      </div>

      {/* Acciones */}
      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg text-sm font-bold hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Crear categoría'}
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
      <div className="w-full max-w-lg bg-[#111] border border-white/10 rounded-2xl shadow-2xl">
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

// ─── Category Manager (main component) ───────────────────────────────────────

interface CategoryManagerProps {
  categories: CategoryRow[]
}

type ModalState =
  | { type: 'closed' }
  | { type: 'create' }
  | { type: 'edit'; category: CategoryRow }

export function CategoryManager({ categories }: CategoryManagerProps) {
  const router = useRouter()
  const { data: session } = useSession()
  const token = session?.user?.accessToken

  const [modal, setModal] = useState<ModalState>({ type: 'closed' })
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<Record<string, string>>({})
  const [deleteLoading, setDeleteLoading] = useState(false)

  const rootCategories = categories.filter((c) => c.parentId === null)

  function closeModal() { setModal({ type: 'closed' }) }

  function handleSuccess() {
    closeModal()
    router.refresh()
  }

  async function handleDelete(id: string) {
    setDeleteLoading(true)
    setDeleteError((prev) => ({ ...prev, [id]: '' }))
    try {
      const res = await apiClient(token).delete(`/admin/categories/${id}`)
      if (!res.ok) {
        const data = (await res.json()) as { message?: string }
        setDeleteError((prev) => ({ ...prev, [id]: data.message ?? 'Error al eliminar' }))
        return
      }
      await revalidateAdminCache([CACHE_TAGS.categories, CACHE_TAGS.catalog])
      setDeletingId(null)
      router.refresh()
    } catch {
      setDeleteError((prev) => ({ ...prev, [id]: 'Error de red' }))
    } finally {
      setDeleteLoading(false)
    }
  }

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Categorías</h1>
          <p className="text-white/30 text-sm mt-0.5">{categories.length} categorías en total</p>
        </div>
        <button
          onClick={() => setModal({ type: 'create' })}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-blue-500 transition-colors"
        >
          + Nueva categoría
        </button>
      </div>

      {/* Tabla */}
      <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-white/10">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-white/50 uppercase tracking-wide">
                Nombre
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-white/50 uppercase tracking-wide">
                Slug
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-white/50 uppercase tracking-wide">
                Padre
              </th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-white/50 uppercase tracking-wide">
                Productos
              </th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {categories.map((cat) => (
              <tr key={cat.id} className="hover:bg-white/5 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {cat.parentId === null && (
                      <span className="text-[10px] font-bold text-blue-400 bg-blue-400/10 px-1.5 py-0.5 rounded uppercase tracking-wide">
                        Raíz
                      </span>
                    )}
                    <span className="font-medium text-white">{cat.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 font-mono text-xs text-white/40">{cat.slug}</td>
                <td className="px-4 py-3 text-white/50 text-sm">
                  {cat.parent?.name ?? <span className="text-white/20">—</span>}
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={`font-bold ${cat._count.products > 0 ? 'text-white' : 'text-white/25'}`}>
                    {cat._count.products}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-2">
                    {/* Error de borrado */}
                    {deleteError[cat.id] && (
                      <span className="text-red-400 text-xs max-w-[180px] text-right">
                        {deleteError[cat.id]}
                      </span>
                    )}

                    {/* Confirmación de borrado */}
                    {deletingId === cat.id ? (
                      <>
                        <button
                          onClick={() => handleDelete(cat.id)}
                          disabled={deleteLoading}
                          className="text-xs font-bold text-red-400 hover:text-red-300 transition-colors disabled:opacity-50"
                        >
                          {deleteLoading ? 'Eliminando...' : '¿Confirmar?'}
                        </button>
                        <button
                          onClick={() => { setDeletingId(null); setDeleteError({}) }}
                          className="text-xs text-white/30 hover:text-white transition-colors"
                        >
                          Cancelar
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => setModal({ type: 'edit', category: cat })}
                          className="text-blue-400 hover:text-blue-300 text-xs transition-colors"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => { setDeletingId(cat.id); setDeleteError({}) }}
                          className="text-white/20 hover:text-red-400 text-xs transition-colors"
                        >
                          Eliminar
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {categories.length === 0 && (
          <div className="text-center py-12 text-white/30">
            No hay categorías. Crea la primera.
          </div>
        )}
      </div>

      {/* Modal crear */}
      {modal.type === 'create' && (
        <Modal title="Nueva categoría" onClose={closeModal}>
          <CategoryForm
            rootCategories={rootCategories}
            onSuccess={handleSuccess}
            onCancel={closeModal}
            token={token}
          />
        </Modal>
      )}

      {/* Modal editar */}
      {modal.type === 'edit' && (
        <Modal title={`Editar: ${modal.category.name}`} onClose={closeModal}>
          <CategoryForm
            initial={modal.category}
            rootCategories={rootCategories}
            onSuccess={handleSuccess}
            onCancel={closeModal}
            token={token}
          />
        </Modal>
      )}
    </>
  )
}
