'use client'

import { useEffect, useState } from 'react'
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
  'w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-blue-500 transition-colors'

const SELECT_CLASS =
  'w-full bg-[#0a0a0a] border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors'

const LABEL_CLASS = 'block text-xs font-semibold text-white/50 uppercase tracking-widest mb-1.5'

function formatCOP(cents: number) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(cents / 100)
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
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
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  )
}

// ─── CouponManager ────────────────────────────────────────────────────────────

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
      value: String(c.value / 100),
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
    <>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Cupones</h1>
          <p className="text-white/30 text-sm mt-0.5">
            {coupons.length} cupón{coupons.length !== 1 && 'es'} ·{' '}
            {coupons.filter((c) => c.isActive && new Date(c.expiresAt) >= new Date()).length} activo{coupons.filter((c) => c.isActive && new Date(c.expiresAt) >= new Date()).length !== 1 && 's'}
          </p>
        </div>
        <button
          onClick={openCreate}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-blue-500 transition-colors flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Nuevo cupón
        </button>
      </div>

      {/* Tabla */}
      <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
        {/* Encabezado */}
        <div className="grid grid-cols-[1fr_auto_1fr_1fr_auto_auto_auto] gap-4 items-center px-4 py-3 border-b border-white/10">
          {(['CÓDIGO', 'DESCUENTO', 'ALCANCE', 'RESTRICCIÓN', 'VENCE', 'ESTADO', '']).map((h) => (
            <span key={h} className="text-[11px] font-semibold text-white/30 uppercase tracking-widest">{h}</span>
          ))}
        </div>

        {coupons.length === 0 && (
          <div className="text-center py-12 text-white/30">
            No hay cupones. Crea el primero con el botón de arriba.
          </div>
        )}

        {coupons.map((c) => {
          const expired = new Date(c.expiresAt) < new Date()
          const isEffectivelyActive = c.isActive && !expired
          const scopeLabel = c.productId
            ? `Producto: ${products.find((p) => p.id === c.productId)?.name ?? c.productId}`
            : c.categoryId
              ? `Cat: ${categories.find((cat) => cat.id === c.categoryId)?.name ?? c.categoryId}`
              : '—'

          return (
            <div
              key={c.id}
              className={`grid grid-cols-[1fr_auto_1fr_1fr_auto_auto_auto] gap-4 items-center px-4 py-3 border-b border-white/5 last:border-0 hover:bg-white/[0.03] transition-colors ${!c.isActive ? 'opacity-50' : ''}`}
            >
              {/* Código */}
              <span className="font-mono text-sm font-semibold text-white">{c.code}</span>

              {/* Descuento */}
              <span className="text-sm text-white/70 whitespace-nowrap">
                {c.type === 'PERCENTAGE' ? `${c.value / 100}%` : formatCOP(c.value)}
              </span>

              {/* Alcance */}
              <span className="text-sm text-white/50 truncate" title={scopeLabel}>{scopeLabel}</span>

              {/* Restricción */}
              <span className="text-sm text-white/50">
                {c.restriction === 'NONE'
                  ? 'Sin límite'
                  : c.restriction === 'ONCE_PER_CUSTOMER'
                    ? '1 por cliente'
                    : 'Primera compra'}
              </span>

              {/* Vence */}
              <span className={`text-sm whitespace-nowrap ${expired ? 'text-red-400' : 'text-white/50'}`}>
                {formatDate(c.expiresAt)}
              </span>

              {/* Estado */}
              <span
                className={`text-xs font-bold px-2.5 py-1 rounded-full whitespace-nowrap ${
                  isEffectivelyActive
                    ? 'bg-emerald-400/10 text-emerald-400'
                    : expired
                      ? 'bg-orange-400/10 text-orange-400'
                      : 'bg-white/5 text-white/30'
                }`}
              >
                {isEffectivelyActive ? 'Activo' : expired ? 'Vencido' : 'Inactivo'}
              </span>

              {/* Acciones */}
              <div className="flex items-center gap-3 justify-end">
                <button
                  onClick={() => openEdit(c)}
                  className="text-blue-400 hover:text-blue-300 transition-colors"
                  aria-label="Editar cupón"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                {c.isActive && (
                  <button
                    onClick={() => { if (confirm(`¿Desactivar el cupón "${c.code}"?`)) void handleDelete(c.id) }}
                    disabled={deletingId === c.id}
                    className="text-white/20 hover:text-red-400 transition-colors disabled:opacity-50"
                    aria-label="Desactivar cupón"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Modal crear / editar */}
      {showForm && (
        <Modal
          title={editingId ? 'Editar cupón' : 'Nuevo cupón'}
          onClose={closeForm}
        >
          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            {/* Código */}
            <div>
              <label className={LABEL_CLASS}>Código <span className="text-red-400">*</span></label>
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
                <label className={LABEL_CLASS}>Tipo <span className="text-red-400">*</span></label>
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
                <label className={LABEL_CLASS}>
                  Valor <span className="text-red-400">*</span>{' '}
                  <span className="normal-case font-normal tracking-normal">
                    {form.type === 'PERCENTAGE' ? '(%)' : '(COP)'}
                  </span>
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
              <label className={LABEL_CLASS}>Restricción</label>
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
              <label className={LABEL_CLASS}>Fecha de vencimiento <span className="text-red-400">*</span></label>
              <div className="flex gap-2 mb-2">
                {DURATION_PRESETS.map(({ label, days }) => (
                  <button
                    key={days}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, expiresAt: addDays(days) }))}
                    className="text-xs px-3 py-1.5 border border-white/10 rounded-lg text-white/40 hover:text-white hover:border-blue-500/50 hover:bg-blue-500/5 transition-colors"
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
                className={INPUT_CLASS + ' [color-scheme:dark]'}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>

            {/* Alcance */}
            <div>
              <label className={LABEL_CLASS}>Alcance <span className="text-red-400">*</span></label>
              <div className="flex gap-4 mb-3">
                <label className="flex items-center gap-2 cursor-pointer text-sm text-white/70 hover:text-white transition-colors">
                  <input
                    type="radio"
                    name="scope"
                    value="category"
                    checked={form.scope === 'category'}
                    onChange={() => setForm({ ...form, scope: 'category', productId: '' })}
                    className="accent-blue-500"
                  />
                  Categoría / Subcategoría
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-sm text-white/70 hover:text-white transition-colors">
                  <input
                    type="radio"
                    name="scope"
                    value="product"
                    checked={form.scope === 'product'}
                    onChange={() => setForm({ ...form, scope: 'product', categoryId: '' })}
                    className="accent-blue-500"
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
                          <option key={s.id} value={s.id}>&nbsp;&nbsp;{s.name}</option>
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
                <p className="mt-2 text-xs text-blue-400/70 bg-blue-500/5 border border-blue-500/20 px-3 py-2 rounded-lg">
                  El descuento aplicará en cascada a todas las subcategorías de esta categoría.
                </p>
              )}
            </div>

            {/* Acciones */}
            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg text-sm font-bold hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Guardando...' : editingId ? 'Guardar cambios' : 'Crear cupón'}
              </button>
              <button
                type="button"
                onClick={closeForm}
                disabled={loading}
                className="px-5 py-2.5 rounded-lg text-sm font-medium text-white/50 hover:text-white hover:bg-white/5 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  )
}
