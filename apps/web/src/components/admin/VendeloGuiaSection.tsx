'use client'

/**
 * Sección "Guía Vendelo" del modal de detalle de pedido (`/admin/pedidos`).
 *
 * Hasta ahora, si el despacho automático fallaba (webhook → VendeloOrderQueue →
 * Vendelo) el admin no tenía forma de enterarse ni de recuperarlo sin tocar la
 * base de datos: la alerta CRITICAL solo iba a stderr. Esta sección expone el
 * estado consolidado del despacho y las tres acciones correctivas.
 *
 * La máquina de estados vive en el servidor (`actions` viene calculado desde
 * NestJS): acá solo se decide qué renderizar según los flags recibidos, para
 * que no haya dos versiones de las reglas que se puedan desincronizar.
 */

import { useCallback, useEffect, useState } from 'react'
import { Section, KV, Pill, STATUS_COLOR, formatDateTime } from './order-detail-primitives'

interface ShippingStatus {
  orderId: string
  deliveryMethod: 'HOME_DELIVERY' | 'STORE_PICKUP'
  orderStatus: string
  vendeloOrderId: string | null
  queue: {
    status: string
    attempts: number
    maxAttempts: number
    lastError: string | null
    nextRetry: string
  } | null
  shipment: {
    status: string
    trackingNumber: string | null
    carrier: string | null
    labelUrl: string | null
    updatedAt: string
  } | null
  actions: {
    canRequeue: boolean
    canCreateShipment: boolean
    canGenerateLabel: boolean
  }
}

type Busy = 'requeue' | 'shipment' | null

/** Lectura del estado. Fuera del componente: la usan la carga inicial y el refresco manual. */
async function fetchStatus(orderId: string): Promise<ShippingStatus> {
  const res = await fetch(`/api/admin/vendelo/orders/${orderId}`, { cache: 'no-store' })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`)
  return body as ShippingStatus
}

export function VendeloGuiaSection({ orderId }: { orderId: string }) {
  const [data, setData] = useState<ShippingStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<Busy>(null)
  const [notice, setNotice] = useState<string | null>(null)

  // Carga inicial. El flag `cancelled` evita escribir estado si el admin cierra
  // el modal antes de que responda la API (el componente se desmonta con él).
  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const status = await fetchStatus(orderId)
        if (!cancelled) setData(status)
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Error desconocido')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [orderId])

  /** Refresco manual y tras cada acción. */
  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setData(await fetchStatus(orderId))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }, [orderId])

  /** Dispara una acción y recarga el estado — el servidor es la fuente de verdad. */
  const runAction = useCallback(
    async (kind: Exclude<Busy, null>, path: string, okMessage: string) => {
      setBusy(kind)
      setError(null)
      setNotice(null)
      try {
        const res = await fetch(`/api/admin/vendelo/orders/${orderId}${path}`, { method: 'POST' })
        const body = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`)
        setNotice(okMessage)
        await load()
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Error desconocido')
      } finally {
        setBusy(null)
      }
    },
    [orderId, load],
  )

  if (loading && !data) {
    return (
      <Section title="Guía Vendelo">
        <p className="text-sm text-white/30">Cargando estado del despacho...</p>
      </Section>
    )
  }

  if (!data) {
    return (
      <Section title="Guía Vendelo">
        <ErrorBox message={error ?? 'No se pudo cargar el estado del despacho.'} />
      </Section>
    )
  }

  const { queue, shipment, actions } = data
  const isPickup = data.deliveryMethod === 'STORE_PICKUP'
  const queueInFlight = queue?.status === 'PENDING' || queue?.status === 'PROCESSING'

  return (
    <Section title="Guía Vendelo">
      {/* ── Estado ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2 mb-3">
        {isPickup ? (
          <Pill label="Retiro en tienda — sin guía" />
        ) : (
          <>
            {queue && (
              <Pill
                label={`Cola: ${queue.status}${
                  queue.status === 'FAILED' || queueInFlight
                    ? ` (${queue.attempts}/${queue.maxAttempts})`
                    : ''
                }`}
                color={STATUS_COLOR[queue.status]}
              />
            )}
            {!queue && <Pill label="Nunca encolado" />}
            {data.vendeloOrderId && <Pill label="Creado en Vendelo" color="bg-sky-500/20 text-sky-400" />}
            {shipment && <Pill label={`Guía: ${shipment.status}`} color={STATUS_COLOR[shipment.status]} />}
          </>
        )}
      </div>

      {isPickup && (
        <p className="text-sm text-white/40">
          Este pedido no se despacha por Vendelo: el cliente lo retira en la tienda.
        </p>
      )}

      {/* ── Datos ──────────────────────────────────────────────────────────── */}
      {!isPickup && (
        <>
          {data.vendeloOrderId && <KV label="ID Vendelo" value={data.vendeloOrderId} mono />}
          {shipment?.trackingNumber && <KV label="Tracking" value={shipment.trackingNumber} mono />}
          {shipment?.carrier && <KV label="Transportador" value={shipment.carrier} />}
          {shipment && <KV label="Actualizado" value={formatDateTime(shipment.updatedAt)} />}
          {queueInFlight && queue && (
            <KV label="Próximo intento" value={formatDateTime(queue.nextRetry)} />
          )}
        </>
      )}

      {/* ── Error de la cola ───────────────────────────────────────────────── */}
      {queue?.status === 'FAILED' && queue.lastError && (
        <div className="mt-3 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2.5">
          <p className="text-xs font-bold text-red-400 uppercase tracking-wide mb-1">
            El despacho falló tras {queue.attempts} intento(s)
          </p>
          {/* Error crudo de Vendelo a propósito: sin él, diagnosticar exige entrar a la BD. */}
          <p className="text-xs text-red-300/80 font-mono break-all whitespace-pre-wrap">
            {queue.lastError}
          </p>
        </div>
      )}

      {/* ── Feedback de acciones ───────────────────────────────────────────── */}
      {notice && (
        <div className="mt-3 bg-green-500/10 border border-green-500/30 text-green-400 text-xs rounded-lg px-3 py-2">
          {notice}
        </div>
      )}
      {error && <div className="mt-3"><ErrorBox message={error} /></div>}

      {/* ── Acciones ───────────────────────────────────────────────────────── */}
      {!isPickup && (
        <div className="flex flex-wrap gap-2 mt-4">
          {actions.canRequeue && (
            <ActionButton
              onClick={() => runAction('requeue', '/requeue', 'Pedido reencolado. El worker lo procesará en unos segundos.')}
              busy={busy === 'requeue'}
              tone="danger"
              label="Reintentar envío a Vendelo"
            />
          )}

          {actions.canCreateShipment && (
            <ActionButton
              onClick={() => runAction('shipment', '/shipment', 'Envío solicitado. Vendelo lo crea de forma asincrónica: la guía aparecerá en unos minutos.')}
              busy={busy === 'shipment'}
              tone="primary"
              label="Generar guía"
            />
          )}

          {actions.canGenerateLabel && (
            <>
              <LinkButton
                href={`/api/admin/vendelo/orders/${orderId}/guia?disposition=inline`}
                label="Ver guía PDF"
                tone="primary"
              />
              <LinkButton
                href={`/api/admin/vendelo/orders/${orderId}/guia`}
                label="Descargar guía PDF"
                tone="neutral"
                download
              />
            </>
          )}

          {queueInFlight && (
            <span className="text-xs text-white/30 self-center">
              En cola — el worker reintenta automáticamente.
            </span>
          )}

          <button
            type="button"
            onClick={() => void load()}
            disabled={loading || busy !== null}
            className="text-xs text-white/40 hover:text-white/70 transition-colors self-center disabled:opacity-40"
          >
            Actualizar
          </button>
        </div>
      )}
    </Section>
  )
}

// ── Subcomponentes ───────────────────────────────────────────────────────────

function ErrorBox({ message }: { message: string }) {
  return (
    <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-xs rounded-lg px-3 py-2 break-all">
      {message}
    </div>
  )
}

const TONE: Record<'primary' | 'danger' | 'neutral', string> = {
  primary: 'bg-sky-500/10 text-sky-400 hover:bg-sky-500/20 border-sky-500/30',
  danger: 'bg-red-500/10 text-red-400 hover:bg-red-500/20 border-red-500/30',
  neutral: 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white border-white/10',
}

function ActionButton({
  onClick, busy, label, tone,
}: {
  onClick: () => void
  busy: boolean
  label: string
  tone: 'primary' | 'danger' | 'neutral'
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className={`text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${TONE[tone]}`}
    >
      {busy ? 'Procesando...' : label}
    </button>
  )
}

function LinkButton({
  href, label, tone, download = false,
}: {
  href: string
  label: string
  tone: 'primary' | 'danger' | 'neutral'
  download?: boolean
}) {
  return (
    <a
      href={href}
      target={download ? undefined : '_blank'}
      rel="noopener noreferrer"
      {...(download ? { download: '' } : {})}
      className={`text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors ${TONE[tone]}`}
    >
      {label}
    </a>
  )
}
