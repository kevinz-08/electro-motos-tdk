/**
 * Información de políticas de la ficha de producto: franja "Pago seguro con
 * Wompi / Envío a todo Colombia", acordeones (Compatibilidad, Envíos, Cambios y
 * devoluciones) y el bloque Medios de pago / Garantía / Razón social.
 *
 * La ficha lo pinta en DOS posiciones según el ancho (README, "Ficha de
 * producto en móvil: lo importante primero"):
 *   - escritorio (`hidden md:block`): bajo la galería, en la columna izquierda;
 *   - móvil (`md:hidden`): después de "Beneficios", al final de la columna de
 *     compra, para que el nombre, el precio y los botones de compra vayan antes.
 * Así el orden del HTML coincide con el visual en cada tamaño (teclado y
 * lectores de pantalla). Server Component: no añade JavaScript.
 */
import Link from 'next/link'
import { Motorbike, RefreshCw, Truck } from 'lucide-react'
import { ProductTrustBlock } from '@/components/store/ProductTrustBlock'
import { formatCOP } from '@/components/store/PriceTag'

interface Props {
  /** Textos libres del acordeón "Compatibilidad" (descripción estructurada del producto). */
  compatibility: ReadonlyArray<{ id: string; body: string }>
  /** Umbral de envío gratis en centavos (Settings). 0 = sin umbral. */
  freeShippingThreshold: number
  warrantyMonths: number | null
  className?: string
}

export function ProductPolicyInfo({ compatibility, freeShippingThreshold, warrantyMonths, className = '' }: Props) {
  return (
    <div className={className}>
      <div className="flex items-center bg-gray-50 border border-gray-100 rounded-xl px-4 py-3">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <svg
            className="w-4 h-4 text-sky-500 shrink-0"
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-12V7a4 4 0 10-8 0v4h8z" />
          </svg>
          <span>Pago seguro con Wompi</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-600 border-l border-gray-200 ml-4 pl-4">
          <svg
            className="w-4 h-4 text-sky-500 shrink-0"
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zm10 0a2 2 0 11-4 0 2 2 0 014 0zM5 17H3V7a1 1 0 011-1h9a1 1 0 011 1v10h-2m-8 0h8m0-10l4 4h-4v-4z" />
          </svg>
          <span>Envío a todo Colombia</span>
        </div>
      </div>

      {/* Acordeón de compatibilidad, envíos y cambios */}
      <div className="mt-4 space-y-2">
        {compatibility.length > 0 && (
          <details className="group border border-gray-200 rounded-xl overflow-hidden">
            <summary className="flex items-center justify-between px-4 py-3 cursor-pointer select-none list-none bg-gray-50 hover:bg-gray-100 transition-colors">
              <span className="inline-flex items-center gap-2 text-sm font-medium text-gray-700">
                <Motorbike className="w-4 h-4 text-sky-500" aria-hidden="true" />
                Compatibilidad
              </span>
              <svg
                className="w-4 h-4 text-gray-400 transition-transform group-open:rotate-180"
                fill="none" stroke="currentColor" viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </summary>
            <div className="px-4 py-3 text-xs text-gray-600 space-y-1.5 bg-white border-t border-gray-100">
              {compatibility.map((c) => (
                <p key={c.id}>• {c.body}</p>
              ))}
            </div>
          </details>
        )}

        <details className="group border border-gray-200 rounded-xl overflow-hidden">
          <summary className="flex items-center justify-between px-4 py-3 cursor-pointer select-none list-none bg-gray-50 hover:bg-gray-100 transition-colors">
            <span className="inline-flex items-center gap-2 text-sm font-medium text-gray-700">
              <Truck className="w-4 h-4 text-sky-500" aria-hidden="true" />
              Envíos
            </span>
            <svg
              className="w-4 h-4 text-gray-400 transition-transform group-open:rotate-180"
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </summary>
          <div className="px-4 py-3 text-xs text-gray-600 space-y-1.5 bg-white border-t border-gray-100">
            <p>• Despacho en <strong>1 a 5 días hábiles</strong> desde la confirmación del pago.</p>
            {freeShippingThreshold > 0 && (
              <p>• Envío <strong>gratis</strong> en compras superiores a {formatCOP(freeShippingThreshold)} COP.</p>
            )}
            <p>• Cobertura a <strong>todo Colombia</strong> con Coordinadora, Envía e Interrapidísimo.</p>
            <p>• Una vez despachado, no se aceptan cambios de dirección.</p>
            <Link
              href="/legal/politica-de-envios"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block mt-1 text-sky-600 underline hover:text-sky-700"
            >
              Ver política completa de envíos →
            </Link>
          </div>
        </details>

        <details className="group border border-gray-200 rounded-xl overflow-hidden">
          <summary className="flex items-center justify-between px-4 py-3 cursor-pointer select-none list-none bg-gray-50 hover:bg-gray-100 transition-colors">
            <span className="inline-flex items-center gap-2 text-sm font-medium text-gray-700">
              <RefreshCw className="w-4 h-4 text-sky-500" aria-hidden="true" />
              Cambios y devoluciones
            </span>
            <svg
              className="w-4 h-4 text-gray-400 transition-transform group-open:rotate-180"
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </summary>
          <div className="px-4 py-3 text-xs text-gray-600 space-y-1.5 bg-white border-t border-gray-100">
            <p>• Tienes <strong>5 días calendario</strong> desde la recepción para solicitar un cambio.</p>
            <p>• El producto debe estar sin uso, en su <strong>embalaje original</strong> e intacto.</p>
            <p>• El cambio se gestiona en un plazo máximo de <strong>30 días calendario</strong>.</p>
            <p>• Los reembolsos aplican únicamente por garantía o derecho de retracto.</p>
            <Link
              href="/legal/politica-de-cambios"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block mt-1 text-sky-600 underline hover:text-sky-700"
            >
              Ver política completa de cambios →
            </Link>
          </div>
        </details>
      </div>

      {/* Medios de pago, garantía y datos de la empresa — bajo los acordeones */}
      <ProductTrustBlock warrantyMonths={warrantyMonths} className="mt-4" />
    </div>
  )
}
