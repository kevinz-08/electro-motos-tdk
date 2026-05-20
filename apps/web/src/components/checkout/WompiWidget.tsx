'use client'

/**
 * Widget de pago Wompi — estrategia dual:
 *
 * 1. Intento principal: inyectar el form con data-* y cargar widget.js dinámicamente.
 *    Wompi's script escanea el DOM buscando [data-render="button"], por lo que
 *    funciona aunque el <script> se añada después del form (estrategia segura en React).
 *
 * 2. Fallback automático (5 s): si el script no carga o el botón no aparece
 *    (e.g., bloqueador de anuncios, red lenta), se muestra un enlace de redirect
 *    a checkout.wompi.co/p/ — misma experiencia de pago, sin el widget embed.
 */

import { useEffect, useRef, useState } from 'react'

interface WompiWidgetProps {
  publicKey: string
  amountInCents: number
  reference: string
  integritySignature: string
  redirectUrl: string
  onSuccess?: () => void
}

const WIDGET_TIMEOUT_MS = 5_000

export function WompiWidget({
  publicKey,
  amountInCents,
  reference,
  integritySignature,
  redirectUrl,
}: WompiWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [useFallback, setUseFallback] = useState(false)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    container.innerHTML = ''

    // Wompi's widget.js scans the DOM for form[data-render="button"].
    // We create the form first, then append the script so the scanner finds it.
    const form = document.createElement('form')
    form.setAttribute('data-render', 'button')
    form.setAttribute('data-public-key', publicKey)
    form.setAttribute('data-currency', 'COP')
    form.setAttribute('data-amount-in-cents', String(amountInCents))
    form.setAttribute('data-reference', reference)
    form.setAttribute('data-signature:integrity', integritySignature)
    form.setAttribute('data-redirect-url', redirectUrl)
    container.appendChild(form)

    const timer = setTimeout(() => setUseFallback(true), WIDGET_TIMEOUT_MS)

    const script = document.createElement('script')
    script.src = 'https://checkout.wompi.co/widget.js'
    script.async = true
    script.onload = () => clearTimeout(timer)
    script.onerror = () => { clearTimeout(timer); setUseFallback(true) }
    container.appendChild(script)

    return () => {
      clearTimeout(timer)
      container.innerHTML = ''
    }
  }, [publicKey, amountInCents, reference, integritySignature, redirectUrl])

  // Fallback: redirect directo a Wompi (misma experiencia de pago)
  const fallbackUrl = buildWompiUrl({ publicKey, amountInCents, reference, integritySignature, redirectUrl })

  return (
    <div className="space-y-4">
      {/* Widget embed — visible mientras useFallback es false */}
      <div ref={containerRef} className={useFallback ? 'hidden' : 'min-h-[52px]'} />

      {/* Fallback — visible si el script no cargó en 5 s */}
      {useFallback && (
        <a
          href={fallbackUrl}
          className="flex items-center justify-center gap-3 w-full bg-[#00b1eb] hover:bg-[#0099cc] text-white py-3.5 rounded-xl font-bold text-base transition-colors"
        >
          <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z" />
          </svg>
          Pagar con Wompi
        </a>
      )}

      <p className="text-xs text-gray-400 text-center">
        🔒 Pago procesado por Wompi · Certificado PCI DSS
      </p>
    </div>
  )
}

function buildWompiUrl(p: Omit<WompiWidgetProps, 'onSuccess'>): string {
  const url = new URL('https://checkout.wompi.co/p/')
  url.searchParams.set('public-key', p.publicKey)
  url.searchParams.set('currency', 'COP')
  url.searchParams.set('amount-in-cents', String(p.amountInCents))
  url.searchParams.set('reference', p.reference)
  url.searchParams.set('signature:integrity', p.integritySignature)
  url.searchParams.set('redirect-url', p.redirectUrl)
  return url.toString()
}
