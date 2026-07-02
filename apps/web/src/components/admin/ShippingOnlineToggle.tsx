'use client'

/**
 * Toggle switch que decide cómo se cobra el flete de los pedidos pagados
 * en línea (WOMPI/MERCADO_PAGO).
 *
 * Estado persistido en la BD (tabla Settings, clave SHIPPING_ONLINE_ENABLED).
 * Por defecto habilitado (si no existe la fila aún, orders.controller.ts lo
 * trata como activo — mismo fallback que CodToggle).
 *
 * Cuando se activa (comportamiento por defecto):
 *   - El flete se cobra "en línea": Vendelo no recauda nada al entregar
 *     (payment_method_code: 'EXTERNAL_PAYMENT'), el costo lo asume la
 *     billetera del negocio.
 *
 * Cuando se desactiva:
 *   - TODOS los pedidos pagados en línea nacen con shippingCod:true —
 *     el producto se paga por WOMPI/MERCADO_PAGO como siempre, pero el
 *     flete se cobra en efectivo al repartidor al recibir el pedido.
 *   - Esto es una política global calculada por orders.controller.ts, no
 *     una elección del cliente — no hay checkbox en el checkout.
 *   - Si COD_ENABLED está desactivado (el repartidor no puede recaudar
 *     efectivo), este toggle no tiene efecto: el pedido cae de vuelta a
 *     flete 100% en línea en vez de bloquear el checkout.
 *
 * Mismo patrón que CodToggle/MercadoPagoToggle: estado inicial por SSR,
 * PATCH optimista, deshabilitado mientras la petición está en curso.
 */
import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { apiClient } from '@/lib/api-client'

interface ShippingOnlineToggleProps {
  /** Estado inicial del toggle, leído desde la BD al cargar la página */
  enabled: boolean
}

export function ShippingOnlineToggle({ enabled: initial }: ShippingOnlineToggleProps) {
  const { data: session } = useSession()
  const [enabled, setEnabled] = useState(initial)
  const [loading, setLoading] = useState(false)

  const toggle = async () => {
    setLoading(true)
    try {
      const res = await apiClient(session?.user?.accessToken).patch<void>(
        '/admin/settings/shipping-online',
        { enabled: !enabled },
      )
      if (res.ok) setEnabled(!enabled)
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200 focus:outline-none disabled:opacity-50 ${
        enabled ? 'bg-green-500' : 'bg-gray-300'
      }`}
      role="switch"
      aria-checked={enabled}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${
          enabled ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  )
}
