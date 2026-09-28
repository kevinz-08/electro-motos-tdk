'use client'

/**
 * Marca, MPN, tipo y garantía del repuesto, dentro del formulario de producto
 * (docs/seo/, Fase 7 — H-18). Google Merchant Center necesita marca y MPN para
 * aceptar el producto; también completan el JSON-LD de la ficha.
 *
 * Como el editor de compatibilidades, guarda con su propio botón y no con
 * "Guardar cambios": botones `type="button"` y Enter bloqueado para no enviar
 * el formulario del producto.
 */
import { useEffect, useState, type KeyboardEvent } from 'react'
import { useSession } from 'next-auth/react'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { MAX_WARRANTY_MONTHS, MPN_MAX_LENGTH, PART_BRAND_MAX_LENGTH, type PartType } from '@h2r/domain'
import { apiClient } from '@/lib/api-client'
import { revalidateAdminCache } from '@/lib/revalidate'
import { CACHE_TAGS } from '@/lib/cache-tags'

interface Identifiers {
  partBrand: string | null
  mpn: string | null
  partType: PartType | null
  warrantyMonths: number | null
}

const INPUT =
  'w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-blue-500'

const blockEnter = (e: KeyboardEvent) => {
  if (e.key === 'Enter') e.preventDefault()
}

export function ProductIdentifiersEditor({ productId }: { productId?: string }) {
  const { data: session } = useSession()
  const token = session?.user?.accessToken
  const [form, setForm] = useState({ partBrand: '', mpn: '', partType: '', warrantyMonths: '' })
  const [loaded, setLoaded] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!productId || !token) return
    let cancelled = false
    void apiClient(token)
      .get<Identifiers>(`/admin/products/${productId}/identifiers`)
      .then((res) => {
        if (cancelled) return
        if (!res.ok) return setLoadError(res.error)
        setForm({
          partBrand: res.data.partBrand ?? '',
          mpn: res.data.mpn ?? '',
          partType: res.data.partType ?? '',
          warrantyMonths: res.data.warrantyMonths?.toString() ?? '',
        })
        setLoaded(true)
      })
    return () => {
      cancelled = true
    }
  }, [productId, token])

  if (!productId) {
    return (
      <div className="space-y-1">
        <label className="text-sm font-medium text-white/70">Identificación del repuesto</label>
        <p className="text-xs text-white/30">Guarda el producto primero para cargar marca y MPN.</p>
      </div>
    )
  }

  const save = async () => {
    setSaving(true)
    const res = await apiClient(token).put(`/admin/products/${productId}/identifiers`, {
      partBrand: form.partBrand.trim() || null,
      mpn: form.mpn.trim() || null,
      partType: form.partType || null,
      warrantyMonths: form.warrantyMonths.trim() ? Number(form.warrantyMonths) : null,
    })
    setSaving(false)
    if (!res.ok) return toast.error(res.error)
    toast.success('Identificación del repuesto guardada')
    await revalidateAdminCache([CACHE_TAGS.products])
  }

  return (
    <div className="space-y-3 rounded-xl border border-white/10 p-4" onKeyDown={blockEnter}>
      <div>
        <label className="text-sm font-medium text-white/70">Identificación del repuesto</label>
        <p className="mt-0.5 text-xs text-white/30">
          La marca y el MPN los exige Google Merchant Center para mostrar el producto en Shopping. El MPN es la referencia
          del fabricante del repuesto (no el SKU de H2R). Se guardan con el botón de este bloque.
        </p>
      </div>

      {loadError && <p className="text-xs text-red-400/80">No se pudieron cargar ({loadError}).</p>}
      {!loaded && !loadError && (
        <p className="flex items-center gap-2 text-xs text-white/30">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Cargando…
        </p>
      )}

      {loaded && (
        <>
          <div className="grid gap-2 sm:grid-cols-2">
            <input
              value={form.partBrand}
              maxLength={PART_BRAND_MAX_LENGTH}
              onChange={(e) => setForm({ ...form, partBrand: e.target.value })}
              placeholder="Marca del repuesto (ej: Magna, NGK, Bosch)"
              aria-label="Marca del repuesto"
              className={INPUT}
            />
            <input
              value={form.mpn}
              maxLength={MPN_MAX_LENGTH}
              onChange={(e) => setForm({ ...form, mpn: e.target.value })}
              placeholder="MPN (ej: MAGX7L-BS)"
              aria-label="MPN"
              className={INPUT}
            />
            <select
              value={form.partType}
              onChange={(e) => setForm({ ...form, partType: e.target.value })}
              aria-label="Tipo de repuesto"
              className={INPUT}
            >
              <option value="">Tipo: sin indicar</option>
              <option value="ORIGINAL">Original (de la marca de la moto)</option>
              <option value="HOMOLOGADO">Homologado (alternativo de calidad)</option>
              <option value="GENERICO">Genérico</option>
            </select>
            <input
              type="number"
              min={0}
              max={MAX_WARRANTY_MONTHS}
              value={form.warrantyMonths}
              onChange={(e) => setForm({ ...form, warrantyMonths: e.target.value })}
              placeholder="Garantía en meses (vacío = la general)"
              aria-label="Garantía en meses"
              className={INPUT}
            />
          </div>
          <p className="text-xs text-white/30">
            Si el repuesto no tiene marca, deja la marca vacía y elige &ldquo;Genérico&rdquo;: Google rechaza &ldquo;sin
            marca&rdquo; o &ldquo;genérico&rdquo; como marca.
          </p>
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-2 text-sm font-medium text-white hover:bg-white/15 disabled:opacity-40"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />} Guardar identificación
          </button>
        </>
      )}
    </div>
  )
}
