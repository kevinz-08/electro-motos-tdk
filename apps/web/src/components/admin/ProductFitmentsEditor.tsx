'use client'

/**
 * Compatibilidades y referencias OEM de un producto, dentro del formulario de
 * producto (docs/seo/, H-37).
 *
 * A diferencia de la venta cruzada, este editor NO espera al botón "Guardar
 * cambios": cada alta, verificación o borrado se guarda al momento contra la API
 * e invalida la caché (`fitments` + `products`), porque cada compatibilidad es un
 * dato independiente con su propia fuente, no un campo del producto.
 *
 * Vive dentro del <form> del producto, así que:
 *   - todos sus botones son `type="button"`;
 *   - Enter en sus campos no envía el formulario del producto.
 *
 * Reglas visibles (las hace cumplir `SaveFitment` en el dominio):
 *   - La fuente es obligatoria. Sin ella no hay forma de verificar el dato.
 *   - Solo lo marcado como verificado se publica.
 *   - Aquí no se crean modelos: se dan de alta en /admin/compatibilidades.
 */
import { useCallback, useEffect, useState, type KeyboardEvent } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { toast } from 'sonner'
import { CheckCircle2, CircleDashed, Loader2, Plus, Trash2 } from 'lucide-react'
import { FITMENT_NOTES_MAX_LENGTH, FITMENT_SOURCE_MAX_LENGTH, positionLabel } from '@h2r/domain'
import type { FitmentPosition, FitmentWithModel, MotorcycleModelWithBrand, OemReference } from '@h2r/domain'
import { apiClient } from '@/lib/api-client'
import { revalidateAdminCache } from '@/lib/revalidate'
import { CACHE_TAGS } from '@/lib/cache-tags'

const INPUT =
  'w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-blue-500'

const emptyDraft = {
  modelId: '',
  position: 'AMBAS' as FitmentPosition,
  yearFrom: '',
  yearTo: '',
  notes: '',
  source: '',
  verified: true,
}

/** Evita que Enter en un campo del editor envíe el formulario del producto. */
const blockEnter = (e: KeyboardEvent) => {
  if (e.key === 'Enter') e.preventDefault()
}

const yearsLabel = (from: number | null, to: number | null) =>
  from == null && to == null ? 'Todos los años' : `${from ?? '…'}–${to ?? 'hoy'}`

export function ProductFitmentsEditor({ productId }: { productId?: string }) {
  const { data: session } = useSession()
  const accessToken = session?.user?.accessToken
  const [models, setModels] = useState<MotorcycleModelWithBrand[]>([])
  const [fitments, setFitments] = useState<FitmentWithModel[] | null>(null)
  const [oems, setOems] = useState<OemReference[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)
  const [draft, setDraft] = useState(emptyDraft)
  const [oemDraft, setOemDraft] = useState({ reference: '', manufacturer: '' })
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    if (!productId || !accessToken) return
    const api = apiClient(accessToken)
    const [m, f] = await Promise.all([
      api.get<MotorcycleModelWithBrand[]>('/admin/fitments/models'),
      api.get<{ fitments: FitmentWithModel[]; oemReferences: OemReference[] }>(`/admin/fitments/product/${productId}`),
    ])
    if (!m.ok || !f.ok) {
      setLoadError(!m.ok ? m.error : !f.ok ? f.error : null)
      return
    }
    setLoadError(null)
    setModels(m.data)
    setFitments(f.data.fitments)
    setOems(f.data.oemReferences)
  }, [productId, accessToken])

  useEffect(() => {
    // Carga inicial desde la API; `load` solo actualiza estado al resolver.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load()
  }, [load])

  if (!productId) {
    return (
      <div className="space-y-1">
        <label className="text-sm font-medium text-white/70">Compatibilidades y referencias OEM</label>
        <p className="text-xs text-white/30">Guarda el producto primero para poder cargarle compatibilidades.</p>
      </div>
    )
  }

  const afterChange = async (message: string) => {
    toast.success(message)
    await revalidateAdminCache([CACHE_TAGS.fitments, CACHE_TAGS.products])
    await load()
  }

  const save = async (body: Record<string, unknown>, message: string) => {
    setBusy(true)
    const res = await apiClient(accessToken).post('/admin/fitments', body)
    setBusy(false)
    if (!res.ok) {
      toast.error(res.error)
      return false
    }
    await afterChange(message)
    return true
  }

  const addFitment = async () => {
    if (!draft.modelId) return toast.error('Elige el modelo de moto')
    if (!draft.source.trim()) return toast.error('La fuente es obligatoria')
    const ok = await save(
      {
        productId,
        modelId: draft.modelId,
        position: draft.position,
        yearFrom: draft.yearFrom ? Number(draft.yearFrom) : null,
        yearTo: draft.yearTo ? Number(draft.yearTo) : null,
        notes: draft.notes.trim() || null,
        source: draft.source.trim(),
        verified: draft.verified,
      },
      'Compatibilidad guardada',
    )
    // Se conserva la fuente: lo habitual es cargar varias motos desde el mismo manual o catálogo.
    if (ok) setDraft({ ...emptyDraft, source: draft.source, verified: draft.verified })
  }

  const toggleVerified = (f: FitmentWithModel) =>
    save(
      {
        productId,
        modelId: f.modelId,
        position: f.position,
        yearFrom: f.yearFrom,
        yearTo: f.yearTo,
        notes: f.notes,
        source: f.source,
        verified: !f.verified,
      },
      f.verified ? 'Compatibilidad despublicada' : 'Compatibilidad verificada y publicada',
    )

  const removeFitment = async (f: FitmentWithModel) => {
    if (!confirm(`¿Eliminar la compatibilidad con ${f.model.brand.name} ${f.model.name}?`)) return
    setBusy(true)
    const res = await apiClient(accessToken).delete(`/admin/fitments/${f.id}`)
    setBusy(false)
    if (!res.ok) return toast.error(res.error)
    await afterChange('Compatibilidad eliminada')
  }

  const addOem = async () => {
    if (!oemDraft.reference.trim()) return toast.error('Escribe la referencia')
    setBusy(true)
    const res = await apiClient(accessToken).post('/admin/fitments/oem', {
      productId,
      reference: oemDraft.reference.trim(),
      ...(oemDraft.manufacturer.trim() ? { manufacturer: oemDraft.manufacturer.trim() } : {}),
    })
    setBusy(false)
    if (!res.ok) return toast.error(res.error)
    setOemDraft({ reference: '', manufacturer: '' })
    await afterChange('Referencia OEM guardada')
  }

  const removeOem = async (o: OemReference) => {
    if (!confirm(`¿Eliminar la referencia ${o.reference}?`)) return
    setBusy(true)
    const res = await apiClient(accessToken).delete(`/admin/fitments/oem/${o.id}`)
    setBusy(false)
    if (!res.ok) return toast.error(res.error)
    await afterChange('Referencia eliminada')
  }

  return (
    <div className="space-y-4 rounded-xl border border-white/10 p-4">
      <div>
        <label className="text-sm font-medium text-white/70">
          Compatibilidades
          {fitments && (
            <span className="ml-1.5 text-xs font-normal text-white/30">
              ({fitments.filter((f) => f.verified).length} verificadas · {fitments.filter((f) => !f.verified).length}{' '}
              pendientes)
            </span>
          )}
        </label>
        <p className="mt-0.5 text-xs text-white/30">
          Se guardan al momento, sin el botón &ldquo;Guardar cambios&rdquo;. Solo las verificadas se publican en la
          ficha y en el hub del modelo. ¿Falta un modelo? Dalo de alta en{' '}
          <Link href="/admin/compatibilidades" className="underline hover:text-white/60">
            Compatibilidades
          </Link>
          .
        </p>
      </div>

      {loadError && <p className="text-xs text-red-400/80">No se pudieron cargar ({loadError}).</p>}
      {!loadError && fitments === null && (
        <p className="flex items-center gap-2 text-xs text-white/30">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Cargando compatibilidades…
        </p>
      )}

      {fitments && fitments.length > 0 && (
        <ul className="divide-y divide-white/[0.06] rounded-lg border border-white/10">
          {fitments.map((f) => (
            <li key={f.id} className="flex items-start gap-3 px-3 py-2.5">
              {f.verified ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" aria-label="Verificada" />
              ) : (
                <CircleDashed className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" aria-label="Pendiente" />
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm text-white">
                  {f.model.brand.name} {f.model.name}
                  <span className="text-white/40">
                    {' '}
                    · {yearsLabel(f.yearFrom, f.yearTo)}
                    {positionLabel(f.position) && ` · ${positionLabel(f.position)}`}
                  </span>
                </p>
                <p className="truncate text-xs text-white/35" title={f.source}>
                  Fuente: {f.source}
                  {f.notes && ` · ${f.notes}`}
                </p>
              </div>
              <button
                type="button"
                disabled={busy}
                onClick={() => toggleVerified(f)}
                className="shrink-0 rounded-md border border-white/10 px-2 py-1 text-xs text-white/60 hover:border-white/30 hover:text-white disabled:opacity-40"
              >
                {f.verified ? 'Despublicar' : 'Verificar'}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => removeFitment(f)}
                aria-label="Eliminar compatibilidad"
                className="shrink-0 p-1 text-red-400/60 hover:text-red-400 disabled:opacity-40"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {fitments && (
        <div className="grid gap-2 rounded-lg bg-white/[0.02] p-3 sm:grid-cols-6" onKeyDown={blockEnter}>
          <select
            value={draft.modelId}
            onChange={(e) => setDraft({ ...draft, modelId: e.target.value })}
            className={`${INPUT} sm:col-span-3`}
            aria-label="Modelo de moto"
          >
            <option value="">Modelo de moto…</option>
            {models.map((m) => (
              <option key={m.id} value={m.id}>
                {m.brand.name} {m.name}
              </option>
            ))}
          </select>
          <select
            value={draft.position}
            onChange={(e) => setDraft({ ...draft, position: e.target.value as FitmentPosition })}
            className={`${INPUT} sm:col-span-1`}
            aria-label="Posición"
          >
            <option value="AMBAS">Sin posición / ambas</option>
            <option value="DELANTERA">Delantera</option>
            <option value="TRASERA">Trasera</option>
          </select>
          <input
            type="number"
            inputMode="numeric"
            placeholder="Año desde"
            value={draft.yearFrom}
            onChange={(e) => setDraft({ ...draft, yearFrom: e.target.value })}
            className={`${INPUT} sm:col-span-1`}
            aria-label="Año desde (vacío = todos)"
          />
          <input
            type="number"
            inputMode="numeric"
            placeholder="Año hasta"
            value={draft.yearTo}
            onChange={(e) => setDraft({ ...draft, yearTo: e.target.value })}
            className={`${INPUT} sm:col-span-1`}
            aria-label="Año hasta (vacío = abierto)"
          />
          <input
            type="text"
            placeholder="Fuente (obligatoria): manual, catálogo del proveedor, verificado en taller…"
            maxLength={FITMENT_SOURCE_MAX_LENGTH}
            value={draft.source}
            onChange={(e) => setDraft({ ...draft, source: e.target.value })}
            className={`${INPUT} sm:col-span-3`}
          />
          <input
            type="text"
            placeholder="Notas (opcional). Ej: solo versión carburada"
            maxLength={FITMENT_NOTES_MAX_LENGTH}
            value={draft.notes}
            onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
            className={`${INPUT} sm:col-span-3`}
          />
          <label className="flex cursor-pointer select-none items-center gap-2 text-xs text-white/50 sm:col-span-4">
            <input
              type="checkbox"
              checked={draft.verified}
              onChange={(e) => setDraft({ ...draft, verified: e.target.checked })}
              className="accent-blue-500"
            />
            Verificada — se publica en la ficha y en el hub del modelo
          </label>
          <button
            type="button"
            disabled={busy}
            onClick={addFitment}
            className="flex items-center justify-center gap-1.5 rounded-lg bg-white/10 px-3 py-2 text-sm font-medium text-white hover:bg-white/15 disabled:opacity-40 sm:col-span-2"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Agregar compatibilidad
          </button>
        </div>
      )}

      {fitments && (
        <div className="space-y-2 border-t border-white/[0.06] pt-4">
          <p className="text-sm font-medium text-white/70">
            Referencias OEM <span className="text-xs font-normal text-white/30">(número de parte original)</span>
          </p>
          {oems.length > 0 && (
            <ul className="flex flex-wrap gap-2">
              {oems.map((o) => (
                <li key={o.id} className="flex items-center gap-1.5 rounded-md bg-white/5 py-1 pl-2.5 pr-1 text-xs text-white/70">
                  {o.reference}
                  {o.manufacturer && <span className="text-white/35">· {o.manufacturer}</span>}
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => removeOem(o)}
                    aria-label={`Eliminar referencia ${o.reference}`}
                    className="p-0.5 text-red-400/60 hover:text-red-400"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="grid gap-2 sm:grid-cols-6" onKeyDown={blockEnter}>
            <input
              type="text"
              placeholder="Referencia. Ej: 5VL-F5121-00"
              maxLength={80}
              value={oemDraft.reference}
              onChange={(e) => setOemDraft({ ...oemDraft, reference: e.target.value })}
              className={`${INPUT} sm:col-span-3`}
            />
            <input
              type="text"
              placeholder="Fabricante (opcional)"
              maxLength={60}
              value={oemDraft.manufacturer}
              onChange={(e) => setOemDraft({ ...oemDraft, manufacturer: e.target.value })}
              className={`${INPUT} sm:col-span-2`}
            />
            <button
              type="button"
              disabled={busy}
              onClick={addOem}
              className="rounded-lg bg-white/10 px-3 py-2 text-sm font-medium text-white hover:bg-white/15 disabled:opacity-40"
            >
              Agregar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
