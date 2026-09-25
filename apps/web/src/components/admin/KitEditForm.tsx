'use client'

/**
 * Crear/editar un kit — `/admin/kits` (docs/seo/plan-kits.md).
 *
 * A diferencia de la venta cruzada, un kit vive en su propia entidad: este
 * formulario no cuelga de `ProductEditForm`. Reutiliza el mismo patrón de
 * buscador con debounce (`GET /admin/products/search`, ya existente) y el
 * mismo generador de slug que `ProductEditForm`.
 *
 * El precio final se recalcula en el navegador en cada cambio SOLO para que el
 * admin vea el efecto de inmediato; la fuente de verdad es el servidor
 * (`SetKit`), que vuelve a calcular la suma a partir del precio real de cada
 * producto y rechaza un descuento que no cuadre.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { ArrowDown, ArrowUp, Search, Trash2 } from 'lucide-react'
import { MAX_KIT_ITEMS, MIN_KIT_ITEMS, computeKitAvailability, computeKitPrice, validateKitPricing } from '@h2r/domain'
import { apiClient } from '@/lib/api-client'
import { revalidateAdminCache } from '@/lib/revalidate'
import { CACHE_TAGS } from '@/lib/cache-tags'
import { formatCOP } from '@/components/store/PriceTag'

export interface KitModelOption {
  id: string
  name: string
  brandSlug: string
  brandName: string
}

export interface KitItemDraft {
  productId: string
  name: string
  sku: string
  price: number
  stock: number
  isActive: boolean
  image: string | null
  quantity: number
}

interface SearchHit {
  id: string
  name: string
  sku: string
  price: number
  stock: number
  isActive: boolean
  image: string | null
}

interface KitEditFormProps {
  kit?: {
    id: string
    name: string
    slug: string
    description: string | null
    discountCents: number
    modelId: string | null
    isActive: boolean
    items: KitItemDraft[]
  }
  modelOptions: KitModelOption[]
}

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ?? ''
const thumb = (v: string) =>
  v.startsWith('http') ? v : `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/c_fill,w_80,h_80,f_auto,q_auto/${v}`

const INPUT_CLASS = 'w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-blue-500 transition-colors'

export function KitEditForm({ kit, modelOptions }: KitEditFormProps) {
  const router = useRouter()
  const { data: session } = useSession()
  const accessToken = session?.user?.accessToken

  const [name, setName] = useState(kit?.name ?? '')
  const [slug, setSlug] = useState(kit?.slug ?? '')
  const [slugTouched, setSlugTouched] = useState(!!kit)
  const [description, setDescription] = useState(kit?.description ?? '')
  const [modelId, setModelId] = useState(kit?.modelId ?? '')
  const [isActive, setIsActive] = useState(kit?.isActive ?? true)
  const [discountInput, setDiscountInput] = useState(kit ? String(kit.discountCents / 100) : '0')
  const [items, setItems] = useState<KitItemDraft[]>(kit?.items ?? [])
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const generateSlug = (value: string) =>
    value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .trim()

  // ── Buscador de productos ────────────────────────────────────────────────
  const [query, setQuery] = useState('')
  const [hits, setHits] = useState<SearchHit[]>([])
  const [searching, setSearching] = useState(false)
  const requestId = useRef(0)

  useEffect(() => {
    const term = query.trim()
    if (term.length < 2 || !accessToken) return
    const id = ++requestId.current
    const timer = setTimeout(async () => {
      setSearching(true)
      const res = await apiClient(accessToken).get<SearchHit[]>(`/admin/products/search?q=${encodeURIComponent(term)}`)
      if (id !== requestId.current) return
      setSearching(false)
      setHits(res.ok ? res.data : [])
    }, 300)
    return () => clearTimeout(timer)
  }, [query, accessToken])
  const shownHits = query.trim().length >= 2 ? hits : []

  // ── Precio y disponibilidad en vivo (solo para mostrar; el servidor decide) ─
  const discountCents = Math.round((parseFloat(discountInput || '0') || 0) * 100)
  const itemsTotal = useMemo(() => items.reduce((sum, i) => sum + i.price * i.quantity, 0), [items])
  const pricingError = items.length > 0 ? validateKitPricing(itemsTotal, discountCents) : null
  const finalPrice = computeKitPrice(itemsTotal, discountCents)
  const availableUnits = useMemo(() => computeKitAvailability(items.map((i) => ({ ...i, deletedAt: null }))), [items])

  const full = items.length >= MAX_KIT_ITEMS
  const patch = (index: number, changes: Partial<KitItemDraft>) =>
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
  const addProduct = (hit: SearchHit) => {
    if (full || items.some((i) => i.productId === hit.id)) return
    setItems((prev) => [...prev, { productId: hit.id, name: hit.name, sku: hit.sku, price: hit.price, stock: hit.stock, isActive: hit.isActive, image: hit.image, quantity: 1 }])
    setQuery('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (items.length < MIN_KIT_ITEMS) {
      setError(`El kit debe tener al menos ${MIN_KIT_ITEMS} productos`)
      return
    }
    if (pricingError) {
      setError(pricingError)
      return
    }

    setLoading(true)
    try {
      const payload = {
        name: name.trim(),
        slug: slug.trim(),
        description: description.trim() || undefined,
        discountCents,
        modelId: modelId || undefined,
        isActive,
        items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
      }
      const client = apiClient(accessToken)
      const res = kit
        ? await client.put<{ id: string }>(`/admin/kits/${kit.id}`, payload)
        : await client.post<{ id: string }>('/admin/kits', payload)
      if (!res.ok) throw new Error(res.error ?? 'Error al guardar el kit')

      await revalidateAdminCache([CACHE_TAGS.kits, CACHE_TAGS.products])
      router.push('/admin/kits')
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error inesperado')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!kit) return
    setDeleting(true)
    try {
      const res = await apiClient(accessToken).delete(`/admin/kits/${kit.id}`)
      if (!res.ok) throw new Error(res.error ?? 'Error al eliminar el kit')
      await revalidateAdminCache([CACHE_TAGS.kits, CACHE_TAGS.products])
      router.push('/admin/kits')
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error inesperado')
      setDeleting(false)
    }
  }

  const selectedModel = modelOptions.find((m) => m.id === modelId) ?? null

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium text-white/70 block mb-1.5">Nombre del kit *</label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => {
              setName(e.target.value)
              if (!slugTouched) setSlug(generateSlug(e.target.value))
            }}
            placeholder="Kit de mantenimiento NKD 125"
            className={INPUT_CLASS}
          />
        </div>
        <div>
          <label className="text-sm font-medium text-white/70 block mb-1.5">Slug (URL) *</label>
          <input
            type="text"
            required
            value={slug}
            onChange={(e) => {
              setSlug(generateSlug(e.target.value))
              setSlugTouched(true)
            }}
            placeholder="kit-mantenimiento-nkd-125"
            className={`${INPUT_CLASS} font-mono`}
          />
          <p className="text-xs text-white/30 mt-1">/kits/{slug || '…'}</p>
        </div>
      </div>

      <div>
        <label className="text-sm font-medium text-white/70 block mb-1.5">
          Descripción <span className="font-normal text-white/30">(opcional)</span>
        </label>
        <textarea
          rows={2}
          maxLength={500}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Para el cambio de aceite completo, incluye filtro y bujía."
          className={`${INPUT_CLASS} resize-none`}
        />
      </div>

      <div>
        <label className="text-sm font-medium text-white/70 block mb-1.5">
          Modelo de moto <span className="font-normal text-white/30">(opcional — agrupa el kit en su hub)</span>
        </label>
        <select value={modelId} onChange={(e) => setModelId(e.target.value)} className={INPUT_CLASS}>
          <option value="">Kit genérico (sin moto asociada)</option>
          {modelOptions.map((m) => (
            <option key={m.id} value={m.id}>{m.brandName} {m.name}</option>
          ))}
        </select>
      </div>

      <label className="flex items-center gap-2 text-sm text-white/70 cursor-pointer select-none">
        <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="accent-blue-500" />
        Kit activo (visible en la tienda si tiene disponibilidad)
      </label>

      {/* ── Productos del kit ── */}
      <div className="space-y-3 border-t border-white/10 pt-5">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-white/70">
            Productos del kit
            <span className="ml-1.5 text-white/30 font-normal text-xs">
              ({items.length}/{MAX_KIT_ITEMS}, mínimo {MIN_KIT_ITEMS})
            </span>
          </label>
        </div>

        {items.length > 0 && (
          <ul className="space-y-2">
            {items.map((it, index) => (
              <li key={it.productId} className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
                <div className="flex items-center gap-3">
                  {it.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={thumb(it.image)} alt="" className="w-10 h-10 rounded object-cover bg-white/5 shrink-0" />
                  ) : (
                    <div className="w-10 h-10 rounded bg-white/5 shrink-0" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-white truncate">{it.name}</p>
                    <p className="text-xs text-white/40">
                      {it.sku} · {formatCOP(it.price)} ·{' '}
                      {!it.isActive ? (
                        <span className="text-amber-400">Inactivo</span>
                      ) : it.stock === 0 ? (
                        <span className="text-amber-400">Agotado</span>
                      ) : (
                        <span>{it.stock} en stock</span>
                      )}
                    </p>
                  </div>
                  <label className="flex items-center gap-1.5 shrink-0 text-xs text-white/50">
                    Cant.
                    <input
                      type="number"
                      min={1}
                      max={999}
                      value={it.quantity}
                      onChange={(e) => patch(index, { quantity: Math.max(1, parseInt(e.target.value, 10) || 1) })}
                      className="w-14 bg-white/5 border border-white/10 rounded px-2 py-1 text-sm text-white text-center"
                    />
                  </label>
                  <div className="flex items-center gap-1 shrink-0">
                    <button type="button" onClick={() => move(index, -1)} disabled={index === 0} aria-label="Subir"
                      className="p-1.5 text-white/40 hover:text-white disabled:opacity-20"><ArrowUp className="w-4 h-4" /></button>
                    <button type="button" onClick={() => move(index, 1)} disabled={index === items.length - 1} aria-label="Bajar"
                      className="p-1.5 text-white/40 hover:text-white disabled:opacity-20"><ArrowDown className="w-4 h-4" /></button>
                    <button type="button" onClick={() => setItems((prev) => prev.filter((_, i) => i !== index))} aria-label="Quitar"
                      className="p-1.5 text-red-400/60 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}

        {full ? (
          <p className="text-xs text-white/40">Llegaste al máximo de {MAX_KIT_ITEMS} productos.</p>
        ) : (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar producto por nombre o SKU para agregar al kit…"
              className={`${INPUT_CLASS} pl-9`}
            />
            {(searching || shownHits.length > 0 || query.trim().length >= 2) && (
              <div className="absolute z-20 mt-1 w-full max-h-72 overflow-auto rounded-lg border border-white/10 bg-zinc-900 shadow-xl">
                {searching && <p className="px-3 py-2 text-xs text-white/40">Buscando…</p>}
                {!searching && shownHits.length === 0 && query.trim().length >= 2 && (
                  <p className="px-3 py-2 text-xs text-white/40">Sin resultados.</p>
                )}
                {shownHits.map((h) => {
                  const already = items.some((i) => i.productId === h.id)
                  return (
                    <button key={h.id} type="button" disabled={already} onClick={() => addProduct(h)}
                      className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-white/5 disabled:opacity-40">
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm text-white truncate">{h.name}</span>
                        <span className="block text-xs text-white/40">
                          {h.sku} · {formatCOP(h.price)} · {h.stock === 0 ? 'Agotado' : `${h.stock} en stock`}
                        </span>
                      </span>
                      {already && <span className="text-xs text-white/40">Ya agregado</span>}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Precio ── */}
      <div className="border-t border-white/10 pt-5 space-y-3">
        <div>
          <label className="text-sm font-medium text-white/70 block mb-1.5">Descuento del kit (COP)</label>
          <input
            type="number"
            min={0}
            step={100}
            value={discountInput}
            onChange={(e) => setDiscountInput(e.target.value)}
            className={`${INPUT_CLASS} max-w-[200px]`}
          />
          <p className="text-xs text-white/30 mt-1">0 = sin descuento, el precio del kit es la suma de sus productos.</p>
        </div>

        {items.length > 0 && (
          <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4 text-sm space-y-1">
            <div className="flex justify-between text-white/50">
              <span>Suma de productos</span>
              <span>{formatCOP(itemsTotal)}</span>
            </div>
            {discountCents > 0 && (
              <div className="flex justify-between text-red-400">
                <span>Descuento</span>
                <span>-{formatCOP(discountCents)}</span>
              </div>
            )}
            <div className="flex justify-between text-white font-bold pt-1 border-t border-white/10">
              <span>Precio final del kit</span>
              <span>{formatCOP(finalPrice)}</span>
            </div>
            <p className="text-xs text-white/40 pt-1">
              Disponibilidad hoy: {availableUnits === 0 ? <span className="text-amber-400">sin stock (no se mostrará)</span> : `${availableUnits} kit(s) armables`}
            </p>
            {selectedModel && <p className="text-xs text-white/40">Se agrupará en el hub de {selectedModel.brandName} {selectedModel.name}.</p>}
            {pricingError && <p className="text-xs text-red-400">{pricingError}</p>}
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg px-4 py-3">{error}</div>
      )}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={loading || items.length < MIN_KIT_ITEMS}
          className="bg-blue-600 text-white px-6 py-2.5 rounded-lg font-bold hover:bg-blue-500 transition-colors disabled:opacity-60"
        >
          {loading ? 'Guardando...' : kit ? 'Guardar cambios' : 'Crear kit'}
        </button>
        <button type="button" onClick={() => router.back()} className="border border-white/20 text-white/70 px-6 py-2.5 rounded-lg font-medium hover:border-white/40 transition-colors">
          Cancelar
        </button>
      </div>

      {kit && (
        <div className="border border-red-500/20 rounded-xl p-5 space-y-3">
          <p className="text-[11px] font-semibold tracking-[0.18em] text-red-400/50 uppercase">Zona de peligro</p>
          {confirmDelete ? (
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-sm text-white/60">¿Eliminar <span className="text-white font-medium">{kit.name}</span>?</p>
              <div className="flex items-center gap-2">
                <button type="button" onClick={handleDelete} disabled={deleting}
                  className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-red-500 transition-colors disabled:opacity-60">
                  {deleting ? 'Eliminando...' : 'Sí, eliminar'}
                </button>
                <button type="button" onClick={() => setConfirmDelete(false)} disabled={deleting}
                  className="text-sm text-white/40 hover:text-white/70 transition-colors disabled:opacity-40">
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <button type="button" onClick={() => setConfirmDelete(true)} className="flex items-center gap-2 text-sm text-red-400/70 hover:text-red-400 transition-colors">
              <Trash2 className="w-4 h-4" /> Eliminar kit
            </button>
          )}
        </div>
      )}
    </form>
  )
}
