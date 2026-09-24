/**
 * /carrito — Server Component delgado. Solo lee el umbral de envío gratis desde
 * `Settings` (única fuente de verdad, H-14) y se lo pasa a la vista cliente, que
 * necesita Zustand para el estado del carrito.
 */
import { getCachedCroSettings } from '@/lib/cache'
import { CartView } from './CartView'

export default async function CartPage() {
  const { freeShippingThreshold } = await getCachedCroSettings()
  return <CartView freeShippingThreshold={freeShippingThreshold} />
}
