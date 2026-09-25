'use client'

/**
 * Editor de venta cruzada dentro del formulario de producto
 * (docs/seo/plan-venta-cruzada.md).
 *
 * Es un componente CONTROLADO: la lista vive en `ProductEditForm` y se guarda
 * junto con el producto (`PUT /admin/products/:id/cross-sells`). Recibe `null`
 * mientras carga o si la carga falló; en ese caso el formulario NO envía la
 * lista, para que un error de lectura nunca borre las sugerencias existentes.
 *
 * Reglas visibles para quien administra:
 *   - Máximo 4 sugerencias, en el orden en que se muestran.
 *   - El motivo es opcional (máx. 120 caracteres).
 *   - "También sugerir en sentido inverso" agrega ESTE producto a la lista del
 *     sugerido si tiene cupo; no reemplaza ni quita nada de esa lista.
 *   - Un producto agotado o inactivo se puede vincular, pero la ficha lo oculta
 *     mientras no tenga stock.
 */
import { useEffect, useRef, useState } from 'react'
import { useSession } from 'next-auth/react'
import { ArrowDown, ArrowUp, Loader2, Search, Trash2 } from 'lucide-react'
import { CROSS_SELL_REASON_MAX_LENGTH, MAX_CROSS_SELLS } from '@h2r/domain'
import { apiClient } from '@/lib/api-client'
import { formatCOP } from '@/components/store/PriceTag'

export interface CrossSellDraft {
  id: string
  name: string
  sku: string
  price: number
  stock: number
  isActive: boolean
  image: string | null
  reason: string
  reciprocal: boolean
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

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ?? ''
const thumb = (v: string) =>
  v.startsWith('http') ? v : `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/c_fill,w_80,h_80,f_auto,q_auto/${v}`

interface Props {
  /** Id del producto que se edita. Sin él (producto nuevo) no se puede vincular. */
  productId?: string
  /** `null` = cargando o no disponible. */
  items: CrossSellDraft[] | null
  loadError: string | null
  onChange: (items: CrossSellDraft[]) => void
}

export function CrossSellEditor({ productId, items, loadError, onChange }: Props) {
  const { data: session } = useSession()
  const [query, setQuery] = useState('')
  const [hits, setHits] = useState<SearchHit[]>([])
  const [searching, setSearching] = useState(false)
  const requestId = useRef(0)

  // Búsqueda con debounce; ignora respuestas de consultas ya reemplazadas.
  useEffect(() => {
    const term = query.trim()
    if (term.length < 2 || !productId) return
    const id = ++requestId.current
    const timer = setTimeout(async () => {
      setSearching(true)
      const res = await apiClient(session?.user?.accessToken).get<SearchHit[]>(
        `/admin/products/search?q=${encodeURIComponent(term)}&excludeId=${encodeURIComponent(productId)}`,
      )
      if (id !== requestId.current) return
      setSearching(false)
      setHits(res.ok ? res.data : [])
    }, 300)
    return () => clearTimeout(timer)
  }, [query, productId, session?.user?.accessToken])

  if (!productId) {
    return (
      <div className="space-y-1">
        <label className="text-sm font-medium text-white/70">Venta cruzada</label>
        <p className="text-xs text-white/30">Guarda el producto primero para poder vincular otros productos.</p>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="space-y-1">
        <label className="text-sm font-medium text-white/70">Venta cruzada</label>
        <p className="text-xs text-red-400/80">
          No se pudieron cargar las sugerencias ({loadError}). Se conservan tal como están: al guardar el
          producto no se modifican.
        </p>
      </div>
    )
  }

  if (items === null) {
    return (
      <div className="flex items-center gap-2 text-xs text-white/30">
        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Cargando sugerencias…
      </div>
    )
  }

  // Con menos de 2 caracteres se ignoran los resultados viejos (sin setState en el efecto).
  const shownHits = query.trim().length >= 2 ? hits : []
  const full = items.length >= MAX_CROSS_SELLS
  const patch = (index: number, changes: Partial<CrossSellDraft>) =>
    onChange(items.map((it, i) => (i === index ? { ...it, ...changes } : it)))
  const move = (index: number, delta: -1 | 1) => {
    const target = index + delta
    if (target < 0 || target >= items.length) return
    const next = [...items]
    ;[next[index], next[target]] = [next[target]!, next[index]!]
    onChange(next)
  }
  const add = (hit: SearchHit) => {
    if (full || items.some((i) => i.id === hit.id)) return
    onChange([...items, { ...hit, reason: '', reciprocal: false }])
    setQuery('')
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="text-sm font-medium text-white/70">
          Venta cruzada — &ldquo;normalmente se cambia junto con…&rdquo;
          <span className="ml-1.5 text-white/30 font-normal text-xs">
            ({items.length}/{MAX_CROSS_SELLS})
          </span>
        </label>
        <p className="text-xs text-white/30 mt-0.5">
          Productos que se sugieren en la ficha de este y en el carrito. Solo se muestran los que tengan stock.
        </p>
      </div>

      {items.length > 0 && (
        <ul className="space-y-2">
          {items.map((it, index) => (
            <li key={it.id} className="rounded-lg border border-white/10 bg-white/[0.03] p-3 space-y-2">
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
                      <span className="text-amber-400">Inactivo (no se mostrará)</span>
                    ) : it.stock === 0 ? (
                      <span className="text-amber-400">Agotado (no se mostrará)</span>
                    ) : (
                      <span>{it.stock} en stock</span>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button type="button" onClick={() => move(index, -1)} disabled={index === 0} aria-label="Subir"
                    className="p-1.5 text-white/40 hover:text-white disabled:opacity-20"><ArrowUp className="w-4 h-4" /></button>
                  <button type="button" onClick={() => move(index, 1)} disabled={index === items.length - 1} aria-label="Bajar"
                    className="p-1.5 text-white/40 hover:text-white disabled:opacity-20"><ArrowDown className="w-4 h-4" /></button>
                  <button type="button" onClick={() => onChange(items.filter((_, i) => i !== index))} aria-label="Quitar"
                    className="p-1.5 text-red-400/60 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
              <input
                type="text"
                value={it.reason}
                maxLength={CROSS_SELL_REASON_MAX_LENGTH}
                onChange={(e) => patch(index, { reason: e.target.value })}
                placeholder="Motivo (opcional). Ej: se cambia junto con las pastillas"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder-white/20 focus:outline-none focus:border-blue-500"
              />
              <label className="flex items-center gap-2 text-xs text-white/50 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={it.reciprocal}
                  onChange={(e) => patch(index, { reciprocal: e.target.checked })}
                  className="accent-blue-500"
                />
                También sugerir en sentido inverso (este producto aparecerá en la ficha de ese)
              </label>
            </li>
          ))}
        </ul>
      )}

      {full ? (
        <p className="text-xs text-white/40">Llegaste al máximo de {MAX_CROSS_SELLS}. Quita uno para agregar otro.</p>
      ) : (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar producto por nombre o SKU para vincular…"
            className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-blue-500"
          />
          {(searching || shownHits.length > 0 || query.trim().length >= 2) && (
            <div className="absolute z-20 mt-1 w-full max-h-72 overflow-auto rounded-lg border border-white/10 bg-zinc-900 shadow-xl">
              {searching && <p className="px-3 py-2 text-xs text-white/40">Buscando…</p>}
              {!searching && shownHits.length === 0 && query.trim().length >= 2 && (
                <p className="px-3 py-2 text-xs text-white/40">Sin resultados.</p>
              )}
              {shownHits.map((h) => {
                const already = items.some((i) => i.id === h.id)
                return (
                  <button
                    key={h.id}
                    type="button"
                    disabled={already}
                    onClick={() => add(h)}
                    className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-white/5 disabled:opacity-40"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm text-white truncate">{h.name}</span>
                      <span className="block text-xs text-white/40">
                        {h.sku} · {formatCOP(h.price)} · {h.stock === 0 ? 'Agotado' : `${h.stock} en stock`}
                        {!h.isActive && ' · Inactivo'}
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
  )
}
