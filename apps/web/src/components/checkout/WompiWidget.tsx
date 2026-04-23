'use client'

/**
 * Widget embebido de Wompi para pagos seguros.
 *
 * Cómo funciona el Widget de Wompi:
 *   1. Se crea un formulario HTML con los parámetros del pago como campos hidden
 *   2. Se carga el script oficial de Wompi (checkout.wompi.co/widget.js)
 *   3. El script de Wompi verifica la firma de integridad y renderiza el botón de pago
 *   4. Al hacer click, el usuario es redirigido a checkout.wompi.co para pagar
 *   5. Después del pago, Wompi redirige al redirectUrl con el resultado
 *
 * Responsabilidades de este componente vs el servidor:
 *   - SERVIDOR (CheckoutForm + /api/payments/wompi/integrity):
 *     calcula la referencia y la firma integritySignature
 *   - ESTE COMPONENTE (cliente):
 *     recibe esos datos ya calculados y los inyecta en el formulario del Widget
 *
 * El secreto WOMPI_INTEGRITY_SECRET NUNCA llega al cliente.
 * Solo llega la firma (un hash de 64 caracteres) que Wompi puede verificar.
 *
 * Estado del pago:
 *   La redirección post-pago NO es confiable para confirmar el pago
 *   (el usuario podría manipular los parámetros de la URL).
 *   La confirmación real viene del webhook en /api/payments/wompi/webhook.
 *
 * @see https://docs.wompi.co/docs/colombia/pagos-con-widget/
 */
import { useEffect, useRef } from 'react'

interface WompiWidgetProps {
  /** Llave pública del comercio en Wompi. Empieza con "pub_test_" o "pub_prod_" */
  publicKey: string
  /** Monto en centavos COP. Ej: 8500000 para $85.000 */
  amountInCents: number
  /** Referencia única del pedido. Formato: "ORDER-{orderId}-{timestamp}" */
  reference: string
  /** Firma SHA256 calculada en el servidor. Vincula referencia + monto + secret */
  integritySignature: string
  /** URL a donde Wompi redirige después del pago. Ej: /checkout/confirmacion?orderId=xxx */
  redirectUrl: string
  /** Callback opcional que se llama cuando el usuario vuelve de un pago exitoso */
  onSuccess?: () => void
}
export function WompiWidget({
  publicKey,
  amountInCents,
  reference,
  integritySignature,
  redirectUrl,
  onSuccess,
}: WompiWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return

    // Limpiar contenido previo
    containerRef.current.innerHTML = ''

    // Crear el formulario con los atributos del Widget de Wompi
    const form = document.createElement('form')
    form.action = 'https://checkout.wompi.co/p/'
    form.method = 'GET'

    const fields: Record<string, string> = {
      'public-key': publicKey,
      currency: 'COP',
      'amount-in-cents': String(amountInCents),
      reference: reference,
      'signature:integrity': integritySignature,
      'redirect-url': redirectUrl,
    }

    for (const [name, value] of Object.entries(fields)) {
      const input = document.createElement('input')
      input.type = 'hidden'
      input.name = name
      input.value = value
      form.appendChild(input)
    }

    // Script oficial del Widget de Wompi
    const script = document.createElement('script')
    script.src = 'https://checkout.wompi.co/widget.js'
    script.setAttribute('data-render', 'button')

    form.appendChild(script)
    containerRef.current.appendChild(form)

    // Escuchar redirección de éxito desde URL
    const checkSuccess = () => {
      if (window.location.search.includes('id=') && onSuccess) {
        onSuccess()
      }
    }
    window.addEventListener('focus', checkSuccess)
    return () => window.removeEventListener('focus', checkSuccess)
  }, [publicKey, amountInCents, reference, integritySignature, redirectUrl, onSuccess])

  return (
    <div>
      <div ref={containerRef} />
      <p className="text-xs text-gray-400 mt-4 text-center">
        🔒 Pago procesado por Wompi · Certificado PCI DSS
      </p>
    </div>
  )
}
