/**
 * Bloque de confianza de la ficha (Fase 4, ítem 4). Server Component.
 *
 * Tres datos, todos ya sostenidos en otra parte del sitio:
 *   - Medios de pago: los mismos de `SecurePaymentBadge` y el checkout.
 *   - Garantía: si el producto tiene `warrantyMonths` cargado se muestra ese
 *     plazo; si no, el general confirmado por el negocio: "hasta 6 meses"
 *     (H-17), el mismo que dicen el FAQ, el footer y la home.
 *   - Empresa: razón social, NIT y ciudad, desde la misma constante que
 *     alimenta el JSON-LD `Organization`, para que nunca diverjan.
 */
import Link from 'next/link'
import { ORGANIZATION } from '@/lib/structured-data'

/** Garantía general confirmada por el negocio (H-17): "hasta 6 meses". */
const DEFAULT_WARRANTY_MONTHS = 6

export function ProductTrustBlock({
  warrantyMonths,
  className = '',
}: {
  warrantyMonths: number | null
  className?: string
}) {
  return (
    <section
      aria-label="Compra con respaldo"
      className={`rounded-xl border border-gray-200 divide-y divide-gray-100 text-sm ${className}`}
    >
      <div className="flex items-start gap-3 px-4 py-3">
        <span aria-hidden="true">💳</span>
        <p className="text-gray-600">
          <strong className="text-gray-800">Medios de pago:</strong> tarjeta de crédito y débito, PSE, Nequi,
          Addi y pago contra entrega.
        </p>
      </div>
      <div className="flex items-start gap-3 px-4 py-3">
        <span aria-hidden="true">🛡️</span>
        <p className="text-gray-600">
          <strong className="text-gray-800">Garantía:</strong>{' '}
          {warrantyMonths && warrantyMonths > 0
            ? `${warrantyMonths} ${warrantyMonths === 1 ? 'mes' : 'meses'} contra defectos de fábrica. `
            : `Hasta ${DEFAULT_WARRANTY_MONTHS} meses contra defectos de fábrica. `}
          <Link href="/garantias" className="text-sky-600 underline hover:text-sky-700">
            Ver condiciones
          </Link>
        </p>
      </div>
      <div className="flex items-start gap-3 px-4 py-3">
        <span aria-hidden="true">🏪</span>
        <p className="text-gray-600">
          <strong className="text-gray-800">{ORGANIZATION.legalName}</strong> · NIT {ORGANIZATION.taxId} ·{' '}
          {ORGANIZATION.address.locality}, {ORGANIZATION.address.region}
        </p>
      </div>
    </section>
  )
}
