import type { Metadata } from 'next'
import { auth } from '@/lib/auth'
import { prisma } from '@/infrastructure/database/prisma-client'
import { CheckoutForm } from '@/components/checkout/CheckoutForm'
import { CartFunnelTracker } from '@/components/analytics/CartFunnelTracker'

export const metadata: Metadata = {
  title: 'Finalizar compra',
  description: 'Completa tus datos de envío y pago para confirmar tu pedido.',
  robots: { index: false, follow: false },
}

/**
 * Checkout — con sesión o como invitado (guest checkout, README §22.4).
 * Sin sesión, CheckoutForm pide el email de contacto y ofrece iniciar sesión.
 */
export default async function CheckoutPage() {
  const session = await auth()

  const [codSetting, shippingOnlineSetting] = await Promise.all([
    prisma.settings.findUnique({ where: { key: 'COD_ENABLED' } }),
    prisma.settings.findUnique({ where: { key: 'SHIPPING_ONLINE_ENABLED' } }),
  ])
  // Por defecto habilitado si no existe la fila aún — mismo fallback que orders.controller.ts.
  const codEnabled = codSetting ? codSetting.value === 'true' : true
  // Default FALSE si no existe la fila — no empezar a cobrar flete extra sin
  // opt-in explícito del admin (mismo criterio que orders.controller.ts).
  const shippingOnlineEnabled = shippingOnlineSetting?.value === 'true'

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <CartFunnelTracker event="begin_checkout" />
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Finalizar compra</h1>
      <CheckoutForm
        userEmail={session?.user ? (session.user.email ?? '') : null}
        codEnabled={codEnabled}
        shippingOnlineEnabled={shippingOnlineEnabled}
      />
    </div>
  )
}
