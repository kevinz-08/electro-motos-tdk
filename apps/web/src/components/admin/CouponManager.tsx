'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { Plus, Pencil, Trash2, X } from 'lucide-react'
import { apiClient } from '@/lib/api-client'

export interface CouponRow {
  id: string
  code: string
  type: 'PERCENTAGE' | 'FIXED'
  value: number
  restriction: 'NONE' | 'ONCE_PER_CUSTOMER' | 'FIRST_PURCHASE'
  isActive: boolean
  expiresAt: string
  categoryId: string | null
  productId: string | null
}

export interface CategoryOption {
  id: string
  name: string
  parentId: string | null
}

export interface ProductOption {
  id: string
  name: string
}

interface CouponManagerProps {
  initialCoupons: CouponRow[]
  categories: CategoryOption[]
  products: ProductOption[]
}

const DURATION_PRESETS = [
  { label: '30 días', days: 30 },
  { label: '60 días', days: 60 },
  { label: '90 días', days: 90 },
]

const INPUT_CLASS =
  'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-sky-400'
const SELECT_CLASS =
  'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-sky-400 bg-white'

function formatCOP(cents: number) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(cents / 100)
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })
}

function addDays(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0] as string
}

type Scope = 'category' | 'product'

interface FormState {
  code: string
  type: 'PERCENTAGE' | 'FIXED'
  value: string
  restriction: 'NONE' | 'ONCE_PER_CUSTOMER' | 'FIRST_PURCHASE'
  expiresAt: string
  scope: Scope
  categoryId: string
  productId: string
}

const EMPTY_FORM: FormState = {
  code: '',
  type: 'PERCENTAGE',
  value: '',
  restriction: 'NONE',
  expiresAt: addDays(30),
  scope: 'category',
  categoryId: '',
  productId: '',
}

export function CouponManager({ initialCoupons, categories, products }: CouponManagerProps) {
  const { data: session } = useSession()
  const [coupons, setCoupons] = useState<CouponRow[]>(initialCoupons)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const client = apiClient(session?.user?.accessToken)

  function openCreate() {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setError(null)
    setShowForm(true)
  }

  function openEdit(c: CouponRow) {
    setEditingId(c.id)
    setForm({
      code: c.code,
      type: c.type,
      value: c.type === 'PERCENTAGE' ? String(c.value / 100) : String(c.value / 100),
      restriction: c.restriction,
      expiresAt: c.expiresAt.split('T')[0] as string,
      scope: c.productId ? 'product' : 'category',
      categoryId: c.categoryId ?? '',
      productId: c.productId ?? '',
    })
    setError(null)
    setShowForm(true)
  }

  function closeForm() {
    setShowForm(false)
    setEditingId(null)
    setError(null)
  }

  function setPreset(days: number) {
    setForm((f) => ({ ...f, expiresAt: addDays(days) }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const rawValue = parseFloat(form.value)
    if (isNaN(rawValue) || rawValue <= 0) {
      setError('El valor debe ser mayor a 0')
      setLoading(false)
      return
    }
    const valueInCents = Math.round(rawValue * 100)

    const payload = {
      code: form.code.toUpperCase().trim(),
      type: form.type,
      value: valueInCents,
      restriction: form.restriction,
      expiresAt: new Date(form.expiresAt + 'T23:59:59').toISOString(),
      categoryId: form.scope === 'category' && form.categoryId ? form.categoryId : null,
      productId: form.scope === 'product' && form.productId ? form.productId : null,
    }

    if (!payload.categoryId && !payload.productId) {
      setError('Debes seleccionar una categoría o un producto')
      setLoading(false)
      return
    }

    try {
      if (editingId) {
        const res = await client.patch<CouponRow>(`/coupons/${editingId}`, payload)
        if (!res.ok) throw new Error(res.error ?? 'Error al actualizar')
        setCoupons((prev) => prev.map((c) => (c.id === editingId ? res.data : c)))
      } else {
        const res = await client.post<CouponRow>('/coupons', payload)
        if (!res.ok) throw new Error(res.error ?? 'Error al crear')
        setCoupons((prev) => [res.data, ...prev])
      }
      closeForm()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperado')
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id)
    try {
      const res = await client.delete<{ success: boolean }>(`/coupons/${id}`)
      if (!res.ok) throw new Error(res.error ?? 'Error al desactivar')
      setCoupons((prev) => prev.map((c) => (c.id === id ? { ...c, isActive: false } : c)))
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error inesperado')
    } finally {
      setDeletingId(null)
    }
  }

  const parentCategories = categories.filter((c) => c.parentId === null)
  const childCategories = categories.filter((c) => c.parentId !== null)

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Cupones</h1>
          <p className="text-sm text-gray-500 mt-1">Gestiona códigos de descuento por categoría o producto.</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-sky-500 text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-sky-600 transition-colors"
        >
          <Plus className="w-4 h-4" /> Nuevo cupón
        </button>
      </div>

      {/* Tabla */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Código</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Descuento</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Alcance</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Restricción</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Vence</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Estado</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {coupons.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center py-10 text-gray-400">No hay cupones aún.</td>
              </tr>
            )}
            {coupons.map((c) => {
              const expired = new Date(c.expiresAt) < new Date()
              const scope = c.productId
                ? `Producto: ${products.find((p) => p.id === c.productId)?.name ?? c.productId}`
                : c.categoryId
                  ? `Cat: ${categories.find((cat) => cat.id === c.categoryId)?.name ?? c.categoryId}`
                  : '—'
              return (
                <tr key={c.id} className={`${!c.isActive ? 'opacity-50' : ''}`}>
                  <td className="px-4 py-3 font-mono font-semibold text-gray-900">{c.code}</td>
                  <td className="px-4 py-3 text-gray-700">
                    {c.type === 'PERCENTAGE' ? `${c.value / 100}%` : formatCOP(c.value)}
                  </td>
                  <td className="px-4 py-3 text-gray-600 max-w-xs truncate">{scope}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {c.restriction === 'NONE' ? 'Sin límite' : c.restriction === 'ONCE_PER_CUSTOMER' ? '1 por cliente' : 'Primera compra'}
                  </td>
                  <td className={`px-4 py-3 ${expired ? 'text-red-500' : 'text-gray-600'}`}>{formatDate(c.expiresAt)}</td>
                  <td className="px-4 py-3">
                    {c.isActive && !expired
                      ? <span className="text-xs font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded-full">Activo</span>
                      : expired
                        ? <span className="text-xs font-medium text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">Vencido</span>
                        : <span className="text-xs font-medium text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">Inactivo</span>
                    }
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 justify-end">
                      <button onClick={() => openEdit(c)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-800 transition-colors">
                        <Pencil className="w-4 h-4" />
                      </button>
                      {c.isActive && (
                        <button
                          onClick={() => { if (confirm(`¿Desactivar cupón ${c.code}?`)) void handleDelete(c.id) }}
                          disabled={deletingId === c.id}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors disabled:opacity-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Modal de creación/edición */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="font-bold text-gray-900">{editingId ? 'Editar cupón' : 'Nuevo cupón'}</h2>
              <button onClick={closeForm} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={(e) => void handleSubmit(e)} className="p-6 space-y-4">
              {/* Código */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Código *</label>
                <input
                  required
                  type="text"
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                  className={INPUT_CLASS + ' font-mono uppercase'}
                  placeholder="HALLOWEEN20"
                />
              </div>

              {/* Tipo + Valor */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo *</label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value as 'PERCENTAGE' | 'FIXED' })}
                    className={SELECT_CLASS}
                  >
                    <option value="PERCENTAGE">Porcentaje (%)</option>
                    <option value="FIXED">Monto fijo (COP)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Valor * {form.type === 'PERCENTAGE' ? '(%)' : '(COP)'}
                  </label>
                  <input
                    required
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={form.value}
                    onChange={(e) => setForm({ ...form, value: e.target.value })}
                    className={INPUT_CLASS}
                    placeholder={form.type === 'PERCENTAGE' ? '20' : '50000'}
                  />
                </div>
              </div>

              {/* Restricción */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Restricción</label>
                <select
                  value={form.restriction}
                  onChange={(e) => setForm({ ...form, restriction: e.target.value as FormState['restriction'] })}
                  className={SELECT_CLASS}
                >
                  <option value="NONE">Sin límite por cliente</option>
                  <option value="ONCE_PER_CUSTOMER">Una vez por cliente</option>
                  <option value="FIRST_PURCHASE">Solo primera compra</option>
                </select>
              </div>

              {/* Vencimiento */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de vencimiento *</label>
                <div className="flex gap-2 mb-2">
                  {DURATION_PRESETS.map(({ label, days }) => (
                    <button
                      key={days}
                      type="button"
                      onClick={() => setPreset(days)}
                      className="text-xs px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-sky-50 hover:border-sky-400 hover:text-sky-700 transition-colors"
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <input
                  required
                  type="date"
                  value={form.expiresAt}
                  onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
                  className={INPUT_CLASS}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>

              {/* Alcance */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Alcance *</label>
                <div className="flex gap-3 mb-3">
                  <label className="flex items-center gap-2 cursor-pointer text-sm">
                    <input
                      type="radio"
                      name="scope"
                      value="category"
                      checked={form.scope === 'category'}
                      onChange={() => setForm({ ...form, scope: 'category', productId: '' })}
                      className="accent-sky-500"
                    />
                    Categoría / Subcategoría
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-sm">
                    <input
                      type="radio"
                      name="scope"
                      value="product"
                      checked={form.scope === 'product'}
                      onChange={() => setForm({ ...form, scope: 'product', categoryId: '' })}
                      className="accent-sky-500"
                    />
                    Producto específico
                  </label>
                </div>

                {form.scope === 'category' && (
                  <select
                    value={form.categoryId}
                    onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                    className={SELECT_CLASS}
                    required
                  >
                    <option value="">— Selecciona categoría —</option>
                    {parentCategories.map((c) => (
                      <optgroup key={c.id} label={c.name}>
                        <option value={c.id}>{c.name} (aplica a toda la categoría)</option>
                        {childCategories
                          .filter((s) => s.parentId === c.id)
                          .map((s) => (
                            <option key={s.id} value={s.id}>
                              &nbsp;&nbsp;{s.name}
                            </option>
                          ))}
                      </optgroup>
                    ))}
                  </select>
                )}

                {form.scope === 'product' && (
                  <select
                    value={form.productId}
                    onChange={(e) => setForm({ ...form, productId: e.target.value })}
                    className={SELECT_CLASS}
                    required
                  >
                    <option value="">— Selecciona producto —</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                )}

                {form.scope === 'category' && form.categoryId && parentCategories.some((c) => c.id === form.categoryId) && (
                  <p className="mt-1.5 text-xs text-sky-700 bg-sky-50 px-3 py-1.5 rounded-lg">
                    El descuento aplicará en cascada a todas las subcategorías de esta categoría.
                  </p>
                )}
              </div>

              {error && (
                <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeForm}
                  className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-sky-500 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-sky-600 disabled:opacity-60 transition-colors"
                >
                  {loading ? 'Guardando...' : editingId ? 'Guardar cambios' : 'Crear cupón'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
