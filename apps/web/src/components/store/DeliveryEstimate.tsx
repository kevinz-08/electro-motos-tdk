'use client'

/**
 * "Cómpralo hoy y recíbelo entre el [día] y el [día]" (README §22.3).
 *
 * Se calcula en el cliente: la PDP es ISR (revalidate 300) y una fecha calculada en
 * el servidor podría servirse horas después (ej. primera visita de la mañana con la
 * página generada la noche anterior). `useSyncExternalStore` devuelve null en SSR y
 * el minuto actual en el cliente, sin setState en efectos ni mismatch de hidratación.
 * La zona horaria es siempre Colombia (la maneja estimateDeliveryWindow).
 */
import { useSyncExternalStore } from 'react'
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
  date.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' })

export function DeliveryEstimate({ minDays, maxDays, cutoffHour }: DeliveryEstimateProps) {
  const minute = useSyncExternalStore(subscribe, getMinute, getServerMinute)

  return (
    <div className="flex items-start gap-2.5 rounded-xl bg-sky-50 border border-sky-100 px-4 py-3 text-sm text-gray-700 min-h-[52px]">
      <svg className="w-5 h-5 text-sky-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zm10 0a2 2 0 11-4 0 2 2 0 014 0zM5 17H3V7a1 1 0 011-1h9a1 1 0 011 1v10h-2m-8 0h8m0-10l4 4h-4v-4z" />
      </svg>
      {minute === null ? (
        <span className="text-gray-500">Envío a todo Colombia</span>
      ) : (
        <DeliveryText now={new Date(minute * 60_000)} minDays={minDays} maxDays={maxDays} cutoffHour={cutoffHour} />
      )}
    </div>
  )
}

function DeliveryText({ now, ...options }: DeliveryEstimateProps & { now: Date }) {
  const { from, to } = estimateDeliveryWindow(now, options)
  const sameDay = from.getTime() === to.getTime()
  return (
    <span>
      Cómpralo hoy y recíbelo{' '}
      {sameDay ? (
        <>el <strong className="font-semibold text-gray-900">{formatDay(from)}</strong></>
      ) : (
        <>
          entre el <strong className="font-semibold text-gray-900">{formatDay(from)}</strong> y el{' '}
          <strong className="font-semibold text-gray-900">{formatDay(to)}</strong>
        </>
      )}
      <span className="block text-xs text-gray-400 mt-0.5">Estimado en días hábiles · puede variar según la ciudad</span>
    </span>
  )
}
