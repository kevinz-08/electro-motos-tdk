'use client'

/**
 * Botón de pago Wompi para aplicaciones React/Next.js.
 *
 * Por qué no usamos el widget embebido (widget.js):
 *   El widget oficial de Wompi usa document.currentScript para localizar
 *   su form padre. Esto solo funciona cuando el <script> es parseado
 *   directamente por el browser desde HTML estático. En React, todos los
 *   scripts se añaden dinámicamente, por lo que document.currentScript
 *   siempre es null y el widget no puede encontrar los parámetros.
 *
 * Solución: redirect directo a la URL de checkout de Wompi con los
 * parámetros como query string. Es exactamente lo que hace el widget
 * internamente — la experiencia para el usuario es idéntica.
 */

interface WompiWidgetProps {
  publicKey: string
  amountInCents: number
  reference: string
  integritySignature: string
  redirectUrl: string
  onSuccess?: () => void
}

export function WompiWidget({
  publicKey,
  amountInCents,
  reference,
  integritySignature,
  redirectUrl,
}: WompiWidgetProps) {
  const wompiUrl = new URL('https://checkout.wompi.co/p/')
  wompiUrl.searchParams.set('public-key', publicKey)
  wompiUrl.searchParams.set('currency', 'COP')
  wompiUrl.searchParams.set('amount-in-cents', String(amountInCents))
  wompiUrl.searchParams.set('reference', reference)
  wompiUrl.searchParams.set('signature:integrity', integritySignature)
  wompiUrl.searchParams.set('redirect-url', redirectUrl)

  return (
    <div className="space-y-4">
      <a
        href={wompiUrl.toString()}
        className="flex items-center justify-center gap-3 w-full bg-[#00b1eb] hover:bg-[#0099cc] text-white py-3.5 rounded-xl font-bold text-base transition-colors"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/>
        </svg>
        Pagar con Wompi
      </a>
      <p className="text-xs text-gray-400 text-center">
        🔒 Pago procesado por Wompi · Certificado PCI DSS
      </p>
    </div>
  )
}
