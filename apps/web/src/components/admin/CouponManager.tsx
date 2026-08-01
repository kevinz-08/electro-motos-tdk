'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { Plus, Pencil, Trash2, X, ChevronDown } from 'lucide-react'
import { apiClient } from '@/lib/api-client'

export interface CouponRow {
  id: string
  code: string
  type: 'PERCENTAGE' | 'FIXED'
  value: number
  restriction: 'NONE' | 'ONCE_PER_CUSTOMER' | 'FIRST_PURCHASE'
  scope: 'STORE' | 'CATEGORY' | 'PRODUCT'
  isActive: boolean
  expiresAt: string
  createdAt: string
  categoryIds: string[]
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

type Scope = 'store' | 'category' | 'product'

interface FormState {
  code: string
  type: 'PERCENTAGE' | 'FIXED'
  value: string
  restriction: 'NONE' | 'ONCE_PER_CUSTOMER' | 'FIRST_PURCHASE'
  expiresAt: string
  scope: Scope
  categoryIds: string[]
  productId: string
}

const EMPTY_FORM: FormState = {
  code: '',
  type: 'PERCENTAGE',
  value: '',
  restriction: 'NONE',
  expiresAt: addDays(30),
  scope: 'store',
  categoryIds: [],
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

// ─── CategoryMultiSelect ──────────────────────────────────────────────────────

interface CategoryMultiSelectProps {
  selected: string[]
  onChange: (ids: string[]) => void
  categories: CategoryOption[]
}

function CategoryMultiSelect({ selected, onChange, categories }: CategoryMultiSelectProps) {
  const parentCategories = categories.filter((c) => c.parentId === null)
  const childCategories = categories.filter((c) => c.parentId !== null)

  function toggleCategory(id: string) {
    onChange(
      selected.includes(id)
        ? selected.filter((s) => s !== id)
        : [...selected, id]
    )
  }

  return (
    <div className="space-y-2">
      {selected.map((id, idx) => {
        const cat = categories.find((c) => c.id === id)
        return (
          <div key={id} className="flex gap-2">
            <select
              value={id}
              onChange={(e) => {
                const next = [...selected]
                next[idx] = e.target.value
                // prevent duplicate
                if (!next.slice(0, idx).includes(e.target.value) && !next.slice(idx + 1).includes(e.target.value)) {
                  onChange(next)
                }
              }}
              className={SELECT_CLASS}
            >
              {parentCategories.map((p) => (
                <optgroup key={p.id} label={p.name}>
                  <option value={p.id}>{p.name} (toda la categoría)</option>
                  {childCategories
                    .filter((s) => s.parentId === p.id)
                    .map((s) => (
                      <option key={s.id} value={s.id}>&nbsp;&nbsp;{s.name}</option>
                    ))}
                </optgroup>
              ))}
            </select>
            <button
              type="button"
              onClick={() => onChange(selected.filter((_, i) => i !== idx))}
              className="flex-shrink-0 w-9 h-9 flex items-center justify-center text-white/30 hover:text-red-400 hover:bg-white/5 rounded-lg transition-colors"
              aria-label="Quitar categoría"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )
      })}

      <button
        type="button"
        onClick={() => {
          const unused = categories.find((c) => !selected.includes(c.id))
          if (unused) onChange([...selected, unused.id])
        }}
        className="flex items-center gap-2 text-xs text-blue-400 hover:text-blue-300 transition-colors py-1"
      >
        <Plus className="w-3.5 h-3.5" />
        Agregar categoría
      </button>

      {selected.length > 0 && selected.some((id) => parentCategories.some((p) => p.id === id)) && (
        <p className="text-xs text-blue-400/70 bg-blue-500/5 border border-blue-500/20 px-3 py-2 rounded-lg">
          Las categorías raíz seleccionadas aplican en cascada a todas sus subcategorías.
        </p>
      )}
    </div>
  )
}

// ─── CouponManager ────────────────────────────────────────────────────────────

type StatusFilter = 'active' | 'inactive' | 'all'
type DateFilter = 'all' | '1m' | '2m'

export function CouponManager({ initialCoupons, categories, products }: CouponManagerProps) {
  const { data: session } = useSession()
  const [coupons, setCoupons] = useState<CouponRow[]>(initialCoupons)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active')
  const [dateFilter, setDateFilter] = useState<DateFilter>('all')
  const [page, setPage] = useState(1)
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
      scope: c.scope === 'STORE' ? 'store' : c.scope === 'PRODUCT' ? 'product' : 'category',
      categoryIds: c.categoryIds,
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

    if (form.scope === 'category' && form.categoryIds.length === 0) {
      setError('Debes seleccionar al menos una categoría')
      setLoading(false)
      return
    }
    if (form.scope === 'product' && !form.productId) {
      setError('Debes seleccionar un producto')
      setLoading(false)
      return
    }

    const scopeEnum = form.scope === 'store' ? 'STORE' : form.scope === 'product' ? 'PRODUCT' : 'CATEGORY'

    const payload = {
      code: form.code.toUpperCase().trim(),
      type: form.type,
      value: valueInCents,
      restriction: form.restriction,
      scope: scopeEnum,
      expiresAt: new Date(form.expiresAt + 'T23:59:59').toISOString(),
      ...(form.scope === 'category' && { categoryIds: form.categoryIds }),
      ...(form.scope === 'product' && { productId: form.productId }),
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

  const PAGE_SIZE = 20
  const now = new Date()
  const ago1m = new Date(now); ago1m.setMonth(ago1m.getMonth() - 1)
  const ago2m = new Date(now); ago2m.setMonth(ago2m.getMonth() - 2)

  const activeCount = coupons.filter((c) => c.isActive && new Date(c.expiresAt) >= now).length

  const filteredCoupons = coupons.filter((c) => {
    const expired = new Date(c.expiresAt) < now
    const isEffective = c.isActive && !expired

    if (statusFilter === 'active' && !isEffective) return false
    if (statusFilter === 'inactive' && isEffective) return false

    const created = new Date(c.createdAt ?? 0)
    if (dateFilter === '1m' && created < ago1m) return false
    if (dateFilter === '2m' && created < ago2m) return false

    return true
  })

  const totalPages = Math.max(1, Math.ceil(filteredCoupons.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const visibleCoupons = filteredCoupons.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  function scopeLabel(c: CouponRow): string {
    if (c.scope === 'STORE') return 'Toda la tienda'
    if (c.scope === 'PRODUCT') {
      return `Producto: ${products.find((p) => p.id === c.productId)?.name ?? c.productId ?? '—'}`
    }
    // CATEGORY
    if (c.categoryIds.length === 0) return '—'
    if (c.categoryIds.length === 1) {
      const cat = categories.find((cat) => cat.id === c.categoryIds[0])
      return `Cat: ${cat?.name ?? c.categoryIds[0]}`
    }
    return `${c.categoryIds.length} categorías`
  }

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Cupones</h1>
          <p className="text-white/30 text-sm mt-0.5">
            {coupons.length} cupón{coupons.length !== 1 && 'es'} · {activeCount} activo{activeCount !== 1 && 's'}
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

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex gap-1 bg-white/5 border border-white/10 rounded-lg p-1">
          {([
            { key: 'active',   label: `Activos (${activeCount})` },
            { key: 'inactive', label: `Inactivos (${coupons.length - activeCount})` },
            { key: 'all',      label: `Todos (${coupons.length})` },
          ] as { key: StatusFilter; label: string }[]).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => { setStatusFilter(key); setPage(1) }}
              className={`px-3 py-1.5 rounded-md text-sm font-semibold transition-colors ${
                statusFilter === key ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/70'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="relative">
          <select
            value={dateFilter}
            onChange={(e) => { setDateFilter(e.target.value as DateFilter); setPage(1) }}
            className="appearance-none bg-white/5 border border-white/10 rounded-lg pl-3 pr-8 py-1.5 text-sm text-white/70 focus:outline-none focus:border-blue-500 transition-colors cursor-pointer"
          >
            <option value="all">Cualquier fecha</option>
            <option value="1m">Último mes</option>
            <option value="2m">Últimos 2 meses</option>
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30 pointer-events-none" />
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
        <div className="grid grid-cols-[1fr_auto_1fr_1fr_auto_auto_auto] gap-4 items-center px-4 py-3 border-b border-white/10">
          {(['CÓDIGO', 'DESCUENTO', 'ALCANCE', 'RESTRICCIÓN', 'VENCE', 'ESTADO', '']).map((h) => (
            <span key={h} className="text-[11px] font-semibold text-white/30 uppercase tracking-widest">{h}</span>
          ))}
        </div>

        {visibleCoupons.length === 0 && (
          <div className="text-center py-12 text-white/30">
            {filteredCoupons.length === 0 && coupons.length > 0
              ? 'Ningún cupón coincide con los filtros.'
              : coupons.length === 0
                ? 'No hay cupones. Crea el primero con el botón de arriba.'
                : 'No hay cupones activos.'}
          </div>
        )}

        {visibleCoupons.map((c) => {
          const expired = new Date(c.expiresAt) < new Date()
          const isEffectivelyActive = c.isActive && !expired

          return (
            <div
              key={c.id}
              className={`grid grid-cols-[1fr_auto_1fr_1fr_auto_auto_auto] gap-4 items-center px-4 py-3 border-b border-white/5 last:border-0 hover:bg-white/[0.03] transition-colors ${!c.isActive ? 'opacity-50' : ''}`}
            >
              <span className="font-mono text-sm font-semibold text-white">{c.code}</span>

              <span className="text-sm text-white/70 whitespace-nowrap">
                {c.type === 'PERCENTAGE' ? `${c.value / 100}%` : formatCOP(c.value)}
              </span>

              <span className="text-sm text-white/50 truncate" title={scopeLabel(c)}>{scopeLabel(c)}</span>

              <span className="text-sm text-white/50">
                {c.restriction === 'NONE'
                  ? 'Sin límite'
                  : c.restriction === 'ONCE_PER_CUSTOMER'
                    ? '1 por cliente'
                    : 'Primera compra'}
              </span>

              <span className={`text-sm whitespace-nowrap ${expired ? 'text-red-400' : 'text-white/50'}`}>
                {formatDate(c.expiresAt)}
              </span>

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

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <span className="text-xs text-white/30">
            {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filteredCoupons.length)} de {filteredCoupons.length}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={safePage === 1}
              className="px-3 py-1.5 rounded-lg text-sm text-white/50 hover:text-white hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              ← Anterior
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                onClick={() => setPage(n)}
                className={`w-8 h-8 rounded-lg text-sm font-semibold transition-colors ${
                  n === safePage ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white hover:bg-white/5'
                }`}
              >
                {n}
              </button>
            ))}
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage === totalPages}
              className="px-3 py-1.5 rounded-lg text-sm text-white/50 hover:text-white hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              Siguiente →
            </button>
          </div>
        </div>
      )}

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
              <div className="flex gap-4 mb-3 flex-wrap">
                {([
                  { value: 'store',    label: 'Toda la tienda' },
                  { value: 'category', label: 'Categoría(s)' },
                  { value: 'product',  label: 'Producto específico' },
                ] as { value: Scope; label: string }[]).map(({ value, label }) => (
                  <label key={value} className="flex items-center gap-2 cursor-pointer text-sm text-white/70 hover:text-white transition-colors">
                    <input
                      type="radio"
                      name="scope"
                      value={value}
                      checked={form.scope === value}
                      onChange={() => setForm({ ...form, scope: value, categoryIds: [], productId: '' })}
                      className="accent-blue-500"
                    />
                    {label}
                  </label>
                ))}
              </div>

              {form.scope === 'store' && (
                <p className="text-xs text-emerald-400/70 bg-emerald-500/5 border border-emerald-500/20 px-3 py-2 rounded-lg">
                  El descuento aplica a todos los productos de la tienda.
                </p>
              )}

              {form.scope === 'category' && (
                <CategoryMultiSelect
                  selected={form.categoryIds}
                  onChange={(ids) => setForm((f) => ({ ...f, categoryIds: ids }))}
                  categories={categories}
                />
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
