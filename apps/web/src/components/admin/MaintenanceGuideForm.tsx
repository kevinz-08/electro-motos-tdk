'use client'

/**
 * Guía de mantenimiento de UN modelo — `/admin/mantenimiento/[modelId]`
 * (docs/seo/, Fase 5 — H-20 + H-21).
 *
 * Reglas que el formulario hace visibles (las hace cumplir el servidor):
 *   - La FUENTE y el REVISOR son obligatorios: los intervalos no se inventan y
 *     ninguna guía se publica sin alguien que la firme.
 *   - Cada punto de control lleva su intervalo en km, en meses o en ambos. Los
 *     nombres sugeridos solo insertan el NOMBRE; los números los escribe quien
 *     administra — nunca hay un intervalo por defecto.
 *   - Se puede enlazar el repuesto exacto de H2R en cada punto de control.
 *   - Al guardar, la guía se publica sola en `/guias/mantenimiento/[marca]/[modelo]`.
 *     Mientras el modelo no tenga guía guardada, esa ruta responde 404 y el hub
 *     del modelo no muestra ningún enlace: no existe página genérica.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { ArrowDown, ArrowUp, Plus, Search, Trash2, X } from 'lucide-react'
import {
  MAINTENANCE_GUIDE_NOTES_MAX_LENGTH,
  MAINTENANCE_LABEL_MAX_LENGTH,
  MAINTENANCE_NOTES_MAX_LENGTH,
  MAINTENANCE_SOURCE_MAX_LENGTH,
  MAX_MAINTENANCE_ITEMS,
  MIN_MAINTENANCE_ITEMS,
  SUGGESTED_MAINTENANCE_LABELS,
  validateMaintenanceItem,
} from '@h2r/domain'
import { apiClient } from '@/lib/api-client'
import { revalidateAdminCache } from '@/lib/revalidate'
import { CACHE_TAGS } from '@/lib/cache-tags'
import { formatCOP } from '@/components/store/PriceTag'

export interface GuideReviewerOption {
  id: string
  name: string
  isActive: boolean
}

export interface GuideProductRef {
  id: string
  name: string
  sku: string
  price: number
  stock: number
  isActive: boolean
  image: string | null
}

export interface GuideItemDraft {
  /** Clave estable para React; no se envía al servidor. */
  key: string
  label: string
  /** Texto del input: vacío = sin intervalo por kilometraje. */
  km: string
  months: string
  notes: string
  product: GuideProductRef | null
}

export interface GuideInitial {
  source: string
  reviewerId: string
  notes: string | null
  /** yyyy-mm-dd */
  reviewedAt: string
  items: Array<Omit<GuideItemDraft, 'key'>>
}

interface Props {
  modelId: string
  modelLabel: string
  /** Ruta pública donde se publicará la guía. */
  publicPath: string
  reviewers: GuideReviewerOption[]
  /** null = el modelo aún no tiene guía. */
  initial: GuideInitial | null
}

const INPUT_CLASS = 'w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-blue-500 transition-colors'

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ?? ''
const thumb = (v: string) =>
  v.startsWith('http') ? v : `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/c_fill,w_64,h_64,f_auto,q_auto/${v}`

const today = () => new Date().toISOString().slice(0, 10)
let keyCounter = 0
const newKey = () => `item-${++keyCounter}`

/** "" → null; cualquier otro texto → número (puede salir NaN, que el validador rechaza). */
const toNumberOrNull = (text: string): number | null => (text.trim() === '' ? null : Number(text))

function ProductPicker({ value, onChange, token }: { value: GuideProductRef | null; onChange: (p: GuideProductRef | null) => void; token?: string }) {
  const [query, setQuery] = useState('')
  const [hits, setHits] = useState<GuideProductRef[]>([])
  const [searching, setSearching] = useState(false)
  const requestId = useRef(0)

  useEffect(() => {
    const term = query.trim()
    if (term.length < 2 || !token) return
    const id = ++requestId.current
    const timer = setTimeout(async () => {
      setSearching(true)
      const res = await apiClient(token).get<GuideProductRef[]>(`/admin/products/search?q=${encodeURIComponent(term)}`)
      if (id !== requestId.current) return
      setSearching(false)
      setHits(res.ok ? res.data : [])
    }, 300)
    return () => clearTimeout(timer)
  }, [query, token])
  const shownHits = query.trim().length >= 2 ? hits : []

  if (value) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-2 py-1.5">
        {value.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumb(value.image)} alt="" className="h-8 w-8 shrink-0 rounded object-cover" />
        ) : (
          <span className="h-8 w-8 shrink-0 rounded bg-white/10" />
        )}
        <span className="min-w-0 flex-1">
          <span className="block truncate text-xs text-white/80">{value.name}</span>
          <span className="block text-[11px] text-white/35">
            {value.sku} · {formatCOP(value.price)} · {!value.isActive ? 'Inactivo' : value.stock === 0 ? 'Agotado' : `${value.stock} en stock`}
          </span>
        </span>
        <button type="button" onClick={() => onChange(null)} aria-label="Quitar repuesto" className="p-1 text-white/40 hover:text-white">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    )
  }

  return (
    <div className="relative">
      <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/30" />
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Enlazar repuesto de H2R (opcional)…"
        className={`${INPUT_CLASS} pl-8 text-xs`}
      />
      {(searching || query.trim().length >= 2) && (
        <div className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-white/10 bg-zinc-900 shadow-xl">
          {searching && <p className="px-3 py-2 text-xs text-white/40">Buscando…</p>}
          {!searching && shownHits.length === 0 && <p className="px-3 py-2 text-xs text-white/40">Sin resultados.</p>}
          {shownHits.map((h) => (
            <button
              key={h.id}
              type="button"
              onClick={() => {
                onChange(h)
                setQuery('')
              }}
              className="flex w-full flex-col px-3 py-2 text-left hover:bg-white/5"
            >
              <span className="truncate text-sm text-white">{h.name}</span>
              <span className="text-xs text-white/40">{h.sku} · {formatCOP(h.price)} · {h.stock === 0 ? 'Agotado' : `${h.stock} en stock`}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export function MaintenanceGuideForm({ modelId, modelLabel, publicPath, reviewers, initial }: Props) {
  const router = useRouter()
  const { data: session } = useSession()
  const token = session?.user?.accessToken

  const [reviewerId, setReviewerId] = useState(initial?.reviewerId ?? '')
  const [source, setSource] = useState(initial?.source ?? '')
  const [reviewedAt, setReviewedAt] = useState(initial?.reviewedAt ?? today())
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [items, setItems] = useState<GuideItemDraft[]>(() => (initial?.items ?? []).map((i) => ({ ...i, key: newKey() })))
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const full = items.length >= MAX_MAINTENANCE_ITEMS
  const usedLabels = useMemo(() => new Set(items.map((i) => i.label.trim().toLowerCase())), [items])
  const activeReviewers = reviewers.filter((r) => r.isActive)

  const patch = (index: number, changes: Partial<GuideItemDraft>) =>
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, ...changes } : it)))
  const move = (index: number, delta: -1 | 1) => {
    const target = index + delta
    if (target < 0 || target >= items.length) return
    setItems((prev) => {
      const next = [...prev]
      ;[next[index], next[target]] = [next[target]!, next[index]!]
      return next
    })
  }
  const addItem = (label = '') => {
    if (full) return
    setItems((prev) => [...prev, { key: newKey(), label, km: '', months: '', notes: '', product: null }])
  }

  const validate = (): string | null => {
    if (!reviewerId) return 'Elige el revisor técnico que firma esta guía'
    if (!source.trim()) return 'La fuente de los intervalos es obligatoria (manual, taller, etc.)'
    if (items.length < MIN_MAINTENANCE_ITEMS) return `Agrega al menos ${MIN_MAINTENANCE_ITEMS} punto de control`
    for (const item of items) {
      const itemError = validateMaintenanceItem({
        label: item.label,
        intervalKm: toNumberOrNull(item.km),
        intervalMonths: toNumberOrNull(item.months),
        notes: item.notes || null,
      })
      if (itemError) return itemError
    }
    if (usedLabels.size !== items.length) return 'No repitas un punto de control en la misma guía'
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    const invalid = validate()
    if (invalid) {
      setError(invalid)
      return
    }
    setLoading(true)
    try {
      const payload = {
        source: source.trim(),
        reviewerId,
        notes: notes.trim() || undefined,
        reviewedAt: new Date(`${reviewedAt}T12:00:00`).toISOString(),
        items: items.map((i) => ({
          label: i.label.trim(),
          intervalKm: toNumberOrNull(i.km) ?? undefined,
          intervalMonths: toNumberOrNull(i.months) ?? undefined,
          notes: i.notes.trim() || undefined,
          productId: i.product?.id,
        })),
      }
      const res = await apiClient(token).put<{ id: string }>(`/admin/maintenance/${modelId}`, payload)
      if (!res.ok) throw new Error(res.error ?? 'Error al guardar la guía')

      await revalidateAdminCache([CACHE_TAGS.guides, CACHE_TAGS.products])
      router.push('/admin/mantenimiento')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperado')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    setError(null)
    try {
      const res = await apiClient(token).delete(`/admin/maintenance/${modelId}`)
      if (!res.ok) throw new Error(res.error ?? 'Error al eliminar la guía')
      await revalidateAdminCache([CACHE_TAGS.guides])
      router.push('/admin/mantenimiento')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperado')
      setConfirmDelete(false)
      setDeleting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl space-y-6">
      <div className="rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3 text-xs text-white/50">
        {initial ? (
          <>
            Esta guía está guardada: se publica en <span className="font-mono text-white/70">{publicPath}</span> mientras su revisor esté activo.
          </>
        ) : (
          <>
            {modelLabel} todavía no tiene guía: la ruta <span className="font-mono text-white/70">{publicPath}</span> responde 404 y su hub no muestra ningún enlace.
            Al guardar, se publica sola.
          </>
        )}
      </div>

      {/* ── Firma y fuente ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-white/70">Revisor técnico que firma *</label>
          <select value={reviewerId} onChange={(e) => setReviewerId(e.target.value)} className={INPUT_CLASS}>
            <option value="">Elige un revisor…</option>
            {reviewers.map((r) => (
              <option key={r.id} value={r.id} disabled={!r.isActive && r.id !== initial?.reviewerId}>
                {r.name}{r.isActive ? '' : ' (desactivado)'}
              </option>
            ))}
          </select>
          {activeReviewers.length === 0 && (
            <p className="mt-1 text-xs text-amber-400">
              No hay revisores activos. <Link href="/admin/revisores/nuevo" className="underline">Registra uno primero</Link>.
            </p>
          )}
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-white/70">Fecha de la revisión *</label>
          <input type="date" required max={today()} value={reviewedAt} onChange={(e) => setReviewedAt(e.target.value)} className={INPUT_CLASS} />
          <p className="mt-1 text-xs text-white/30">Se muestra en la página como «revisado el…».</p>
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-white/70">Fuente de los intervalos *</label>
        <input
          type="text"
          required
          maxLength={MAINTENANCE_SOURCE_MAX_LENGTH}
          value={source}
          onChange={(e) => setSource(e.target.value)}
          placeholder="Manual del propietario AKT NKD 125 (2023), pág. 34 — o «Verificado en taller»"
          className={INPUT_CLASS}
        />
        <p className="mt-1 text-xs text-white/30">De dónde salen estos números. Sin fuente no se puede guardar: los intervalos no se inventan.</p>
      </div>

      {/* ── Puntos de control ── */}
      <div className="space-y-3 border-t border-white/10 pt-5">
        <label className="text-sm font-medium text-white/70">
          Puntos de control
          <span className="ml-1.5 text-xs font-normal text-white/30">({items.length}/{MAX_MAINTENANCE_ITEMS})</span>
        </label>

        {items.length === 0 && (
          <p className="text-xs text-white/35">Agrega los puntos de control con los botones de abajo. Escribe tú los intervalos: no hay valores por defecto.</p>
        )}

        <ul className="space-y-3">
          {items.map((item, index) => (
            <li key={item.key} className="space-y-3 rounded-lg border border-white/10 bg-white/[0.03] p-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_110px_110px_auto]">
                <input
                  type="text"
                  list="maintenance-labels"
                  maxLength={MAINTENANCE_LABEL_MAX_LENGTH}
                  value={item.label}
                  onChange={(e) => patch(index, { label: e.target.value })}
                  placeholder="Punto de control (ej. Aceite de motor)"
                  className={INPUT_CLASS}
                />
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={item.km}
                  onChange={(e) => patch(index, { km: e.target.value })}
                  placeholder="Cada km"
                  aria-label="Intervalo en kilómetros"
                  className={INPUT_CLASS}
                />
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={item.months}
                  onChange={(e) => patch(index, { months: e.target.value })}
                  placeholder="Cada meses"
                  aria-label="Intervalo en meses"
                  className={INPUT_CLASS}
                />
                <div className="flex items-center justify-end gap-1">
                  <button type="button" onClick={() => move(index, -1)} disabled={index === 0} aria-label="Subir" className="p-1.5 text-white/40 hover:text-white disabled:opacity-20">
                    <ArrowUp className="h-4 w-4" />
                  </button>
                  <button type="button" onClick={() => move(index, 1)} disabled={index === items.length - 1} aria-label="Bajar" className="p-1.5 text-white/40 hover:text-white disabled:opacity-20">
                    <ArrowDown className="h-4 w-4" />
                  </button>
                  <button type="button" onClick={() => setItems((prev) => prev.filter((_, i) => i !== index))} aria-label="Quitar" className="p-1.5 text-red-400/60 hover:text-red-400">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <input
                type="text"
                maxLength={MAINTENANCE_NOTES_MAX_LENGTH}
                value={item.notes}
                onChange={(e) => patch(index, { notes: e.target.value })}
                placeholder="Detalle opcional (ej. usar 10W-40 JASO MA2)"
                className={`${INPUT_CLASS} text-xs`}
              />
              <ProductPicker value={item.product} onChange={(product) => patch(index, { product })} token={token} />
            </li>
          ))}
        </ul>

        <datalist id="maintenance-labels">
          {SUGGESTED_MAINTENANCE_LABELS.map((l) => <option key={l} value={l} />)}
        </datalist>

        {full ? (
          <p className="text-xs text-white/40">Llegaste al máximo de {MAX_MAINTENANCE_ITEMS} puntos de control.</p>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => addItem()} className="inline-flex items-center gap-1.5 rounded-lg border border-white/20 px-3 py-1.5 text-xs font-medium text-white/80 hover:border-white/40">
              <Plus className="h-3.5 w-3.5" /> Punto de control
            </button>
            <span className="text-xs text-white/25">o agrega solo el nombre:</span>
            {SUGGESTED_MAINTENANCE_LABELS.filter((l) => !usedLabels.has(l.toLowerCase())).map((label) => (
              <button
                key={label}
                type="button"
                onClick={() => addItem(label)}
                className="rounded-full border border-white/10 px-2.5 py-1 text-xs text-white/50 hover:border-white/30 hover:text-white/80"
              >
                + {label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-white/70">
          Nota general <span className="font-normal text-white/30">(opcional)</span>
        </label>
        <textarea
          rows={3}
          maxLength={MAINTENANCE_GUIDE_NOTES_MAX_LENGTH}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Condiciones a las que aplican los intervalos (uso normal, ciudad, carretera…)"
          className={`${INPUT_CLASS} resize-none`}
        />
      </div>

      {error && <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</div>}

      <div className="flex gap-3">
        <button type="submit" disabled={loading} className="rounded-lg bg-blue-600 px-6 py-2.5 font-bold text-white transition-colors hover:bg-blue-500 disabled:opacity-60">
          {loading ? 'Guardando...' : initial ? 'Guardar cambios' : 'Guardar y publicar'}
        </button>
        <button type="button" onClick={() => router.back()} className="rounded-lg border border-white/20 px-6 py-2.5 font-medium text-white/70 transition-colors hover:border-white/40">
          Cancelar
        </button>
      </div>

      {initial && (
        <div className="space-y-3 rounded-xl border border-red-500/20 p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-red-400/50">Zona de peligro</p>
          {confirmDelete ? (
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-sm text-white/60">¿Eliminar la guía de <span className="font-medium text-white">{modelLabel}</span>? Su página vuelve a responder 404.</p>
              <button type="button" onClick={handleDelete} disabled={deleting} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-500 disabled:opacity-60">
                {deleting ? 'Eliminando...' : 'Sí, eliminar'}
              </button>
              <button type="button" onClick={() => setConfirmDelete(false)} disabled={deleting} className="text-sm text-white/40 hover:text-white/70">
                Cancelar
              </button>
            </div>
          ) : (
            <button type="button" onClick={() => setConfirmDelete(true)} className="flex items-center gap-2 text-sm text-red-400/70 transition-colors hover:text-red-400">
              <Trash2 className="h-4 w-4" /> Eliminar guía
            </button>
          )}
        </div>
      )}
    </form>
  )
}
