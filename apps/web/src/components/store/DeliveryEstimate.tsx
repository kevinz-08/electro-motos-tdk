'use client'

/**
 * Línea de tiempo visual de la entrega: Pedido → Enviado → Entregado (README §22.3).
 *
 * Tres hitos con icono, etiqueta y fecha, unidos por conectores punteados que se
 * "completan" de color en bucle (clases `delivery-track*` en globals.css).
 *
 *   Pedido     → "Hoy"
 *   Enviado    → dispatchDate … dispatchTo (día hábil de despacho + 1 hábil; un
 *                pedido del sábado despacha el lunes, de ahí "máximo dos días")
 *   Entregado  → from … to (minDays/maxDays hábiles desde el despacho)
 *
 * Se calcula en el cliente: la PDP es ISR (revalidate 300) y una fecha calculada en
 * el servidor podría servirse horas después (ej. primera visita de la mañana con la
 * página generada la noche anterior). `useSyncExternalStore` devuelve null en SSR y
 * el minuto actual en el cliente, sin setState en efectos ni mismatch de hidratación.
 * Mientras no hay fechas (SSR + primer render) se pinta la misma estructura con
 * placeholders, así la hidratación no mueve el layout.
 * La zona horaria es siempre Colombia (la maneja estimateDeliveryWindow).
 */
import { useSyncExternalStore, type ReactNode } from 'react'
import { estimateDeliveryWindow } from '@h2r/domain'

interface DeliveryEstimateProps {
  minDays: number
  maxDays: number
  cutoffHour: number
}

const subscribe = () => () => {}
/** Minuto actual — primitivo estable dentro del mismo minuto (requisito de getSnapshot). */
const getMinute = () => Math.floor(Date.now() / 60_000)
const getServerMinute = () => null

const formatDay = (date: Date) =>
  date.toLocaleDateString('es-CO', { day: 'numeric', month: 'long', timeZone: 'UTC' })

/** "18 de septiembre" o "18 de septiembre - 20 de septiembre" si el rango abarca dos días. */
const formatRange = (from: Date, to: Date) =>
  from.getTime() === to.getTime() ? formatDay(from) : `${formatDay(from)} - ${formatDay(to)}`

export function DeliveryEstimate({ minDays, maxDays, cutoffHour }: DeliveryEstimateProps) {
  const minute = useSyncExternalStore(subscribe, getMinute, getServerMinute)
  const estimate =
    minute === null ? null : estimateDeliveryWindow(new Date(minute * 60_000), { minDays, maxDays, cutoffHour })

  return (
    <div data-testid="delivery-estimate" className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-5 sm:px-5">
      <div className="relative">
        {/* Conectores: van de borde a borde entre los centros de las columnas 1-2 y 2-3.
            16.666% = centro de la primera/última columna de la grilla de 3. */}
        <Connector className="left-[calc(16.666%_+_26px)] right-[calc(50%_+_26px)]" />
        <Connector className="left-[calc(50%_+_26px)] right-[calc(16.666%_+_26px)]" delayed />

        <ol className="relative grid grid-cols-3 gap-x-1">
          <Milestone
            label="Pedido"
            date={estimate ? 'Hoy' : null}
            icon={
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.6}
                d="M6 8h12l-1 11a2 2 0 01-2 1.8H9A2 2 0 017 19L6 8zm3 0V6.5a3 3 0 016 0V8"
              />
            }
          />
          <Milestone
            label="Enviado"
            date={estimate ? formatRange(estimate.dispatchDate, estimate.dispatchTo) : null}
            icon={
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.6}
                d="M9 17.5a1.75 1.75 0 11-3.5 0 1.75 1.75 0 013.5 0zm9.5 0a1.75 1.75 0 11-3.5 0 1.75 1.75 0 013.5 0zM5.5 17.5H4V7a1 1 0 011-1h8a1 1 0 011 1v10.5h-5m5 0h1.5m-1.5-8h3.2l2.3 3v5h-1.5"
              />
            }
          />
          <Milestone
            label="Entregado"
            date={estimate ? formatRange(estimate.from, estimate.to) : null}
            icon={
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.6}
                d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3zm0 0l8 4.5M12 3L4 7.5m8 4.5v9m0-9l8-4.5m-8 4.5L4 7.5"
              />
            }
          />
        </ol>
      </div>

      <p className="mt-4 text-center text-xs text-gray-400">
        Estimado en días hábiles · puede variar según la ciudad
      </p>
    </div>
  )
}

/** Línea punteada gris con una capa de color que se completa en bucle. */
function Connector({ className, delayed = false }: { className: string; delayed?: boolean }) {
  return (
    <div className={`absolute top-[26px] h-0.5 ${className}`} aria-hidden="true">
      <div className="delivery-track absolute inset-0" />
      <div
        className={`delivery-track delivery-track-fill absolute inset-0 ${delayed ? 'delivery-track-fill-2' : ''}`}
      />
    </div>
  )
}

function Milestone({ label, date, icon }: { label: string; date: string | null; icon: ReactNode }) {
  return (
    <li className="flex flex-col items-center text-center">
      <span className="flex h-13 w-13 items-center justify-center rounded-full bg-white ring-1 ring-gray-100">
        <svg className="h-6 w-6 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          {icon}
        </svg>
      </span>
      <span className="mt-3 text-sm font-semibold text-gray-900">{label}</span>
      <span className="mt-0.5 block min-h-[2.5rem] text-xs text-gray-500 sm:text-sm">
        {date ?? <span className="inline-block h-3 w-16 animate-pulse rounded bg-gray-200 align-middle" />}
      </span>
    </li>
  )
}
