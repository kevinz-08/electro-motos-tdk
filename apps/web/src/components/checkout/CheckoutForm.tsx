'use client'

/**
 * Formulario de checkout en dos pasos:
 *
 * Paso 1 — "shipping": Recoge datos de envío y el método de pago. Al confirmar:
 *   - Pago online (WOMPI): POST /api/orders crea el pedido PENDING + inicia la
 *     transacción → se avanza al paso "payment" para mostrar el Widget de Wompi.
 *     El webhook /api/payments/wompi/webhook confirma o rechaza el pago de forma asíncrona.
 *   - Pago contra entrega (COD): POST /api/orders crea el pedido ya confirmado
 *     (no hay pasarela que esperar) → se redirige directo a /checkout/confirmacion.
 *
 * Nota: el precio en el formulario se muestra en pesos COP (display),
 * pero internamente todo se maneja en centavos.
 */
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import type { CreateOrderResponse } from '@h2r/types'
import { useCart } from '@/lib/cart'
import { WompiWidget } from './WompiWidget'
import { CitySelector } from './CitySelector'
import { apiClient } from '@/lib/api-client'
import { useShippingQuote } from '@/lib/shipping-quote'

type PaymentMethod = 'WOMPI' | 'COD'

interface CheckoutFormProps {
  userEmail: string
  /** Si el admin desactivó COD en /admin/configuracion, la opción no se muestra. */
  codEnabled: boolean
  /**
   * Política global (no elegible por el cliente): si el admin la desactivó en
   * /admin/configuracion, todos los pedidos pagados en línea (WOMPI) nacen con
   * el flete contraentrega en vez de cobrarse desde la billetera del negocio.
   * Solo se usa para mostrar una nota informativa — el backend decide el valor real.
   */
  shippingOnlineEnabled: boolean
}

interface ShippingFormData {
  fullName: string
  address: string
  phone: string
  notes: string
}

type BuyerIdType = 'CC' | 'CE' | 'NIT' | 'PASAPORTE'

interface BuyerFormData {
  idType: BuyerIdType
  idNumber: string
  businessName: string
}

function formatCOP(cents: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(cents / 100)
}

export function CheckoutForm({ userEmail, codEnabled, shippingOnlineEnabled }: CheckoutFormProps) {
  const { data: session } = useSession()
  const router = useRouter()
  const { items, total, selectedCity, setSelectedCity } = useCart()
  const [step, setStep] = useState<'shipping' | 'payment'>('shipping')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('WOMPI')
  const [wompiParams, setWompiParams] = useState<CreateOrderResponse['payment'] | null>(null)
  const [orderId, setOrderId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [acceptedPolicies, setAcceptedPolicies] = useState(false)

  const [form, setForm] = useState<ShippingFormData>({
    fullName: '',
    address: '',
    phone: '',
    notes: '',
  })
  const [buyer, setBuyer] = useState<BuyerFormData>({
    idType: 'CC',
    idNumber: '',
    businessName: '',
  })

  const cartTotal = total()
  const shippingItems = items.map((i) => ({ productId: i.product.id, quantity: i.quantity }))
  // Mismo cálculo que orders.controller.ts: si el admin desactivó el flete online (y COD
  // sigue habilitado para que el repartidor pueda recaudar), todo pedido WOMPI nace con
  // flete contraentrega — no es una elección del cliente, es política global del negocio.
  const shippingWillBeCod = paymentMethod === 'COD' || (!shippingOnlineEnabled && codEnabled)
  const quotePaymentMethod = shippingWillBeCod ? 'COD' : 'EXTERNAL_PAYMENT'
  const { quote: shippingQuote, loading: shippingLoading, error: shippingError } = useShippingQuote(selectedCity, shippingItems, quotePaymentMethod)
  const shippingCost = shippingQuote && !shippingQuote.freeShipping ? shippingQuote.quotedShippingTotal : 0

  const handleSubmitShipping = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedCity) {
      setError('Por favor selecciona una ciudad de la lista.')
      return
    }
    if (buyer.idNumber.trim().length < 5) {
      setError('Ingresa un número de documento válido (mínimo 5 caracteres).')
      return
    }
    if (buyer.idType === 'NIT' && buyer.businessName.trim().length === 0) {
      setError('Cuando el documento es NIT, la razón social es obligatoria.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const client = apiClient(session?.user?.accessToken)

      const orderRes = await client.post<CreateOrderResponse>('/orders', {
        items: items.map((i) => ({ productId: i.product.id, quantity: i.quantity })),
        shippingAddress: {
          fullName: form.fullName,
          address: form.address,
          city: selectedCity.name,
          cityCode: selectedCity.code,
          subdivisionCode: selectedCity.subdivisionCode,
          phone: form.phone,
          notes: form.notes || undefined,
        },
        buyer: {
          idType: buyer.idType,
          idNumber: buyer.idNumber.trim(),
          ...(buyer.idType === 'NIT' && { businessName: buyer.businessName.trim() }),
        },
        paymentProvider: paymentMethod,
        policiesAcceptedAt: new Date().toISOString(),
      })

      if (!orderRes.ok) {
        throw new Error(orderRes.error ?? 'Error al crear el pedido')
      }

      const { order, payment } = orderRes.data

      if (paymentMethod === 'COD') {
        // El pedido COD ya nació confirmado — no hay widget de pago que mostrar.
        router.push(`/checkout/confirmacion?orderId=${order.id}`)
        return
      }

      if (!payment?.publicKey) {
        throw new Error('Configuración de pago incompleta. Contacta al administrador.')
      }

      setOrderId(order.id)
      setWompiParams(payment)
      setStep('payment')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error inesperado')
    } finally {
      setLoading(false)
    }
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-10 text-gray-500">
        Tu carrito está vacío.{' '}
        <a href="/catalogo" className="text-sky-600 hover:underline">
          Volver al catálogo
        </a>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Formulario */}
      <div className="lg:col-span-2">
        {step === 'shipping' ? (
          <form onSubmit={handleSubmitShipping} className="space-y-5">
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <h2 className="font-bold text-gray-900 mb-5">Datos de envío</h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label htmlFor="checkout-fullName" className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre completo *
                  </label>
                  <input
                    id="checkout-fullName"
                    required
                    aria-required="true"
                    type="text"
                    value={form.fullName}
                    onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-sky-400"
                    placeholder="Juan Pérez"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="checkout-address" className="block text-sm font-medium text-gray-700 mb-1">
                    Dirección *
                  </label>
                  <input
                    id="checkout-address"
                    required
                    aria-required="true"
                    type="text"
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-sky-400"
                    placeholder="Calle 45 # 23-10, Apto 302"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="checkout-city" className="block text-sm font-medium text-gray-700 mb-1">
                    Ciudad *
                    {!selectedCity && (
                      <span className="ml-1 text-xs text-gray-400 font-normal">(escribe para buscar)</span>
                    )}
                  </label>
                  <CitySelector
                    value={selectedCity}
                    onChange={setSelectedCity}
                    required
                    disabled={loading}
                  />
                </div>

                <div>
                  <label htmlFor="checkout-phone" className="block text-sm font-medium text-gray-700 mb-1">
                    Teléfono *
                  </label>
                  <input
                    id="checkout-phone"
                    required
                    aria-required="true"
                    type="tel"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-sky-400"
                    placeholder="3001234567"
                  />
                </div>

                <div>
                  <label htmlFor="checkout-email" className="block text-sm font-medium text-gray-700 mb-1">
                    Correo electrónico
                  </label>
                  <input
                    id="checkout-email"
                    type="email"
                    disabled
                    aria-disabled="true"
                    value={userEmail}
                    className="w-full border border-gray-200 bg-gray-50 rounded-lg px-4 py-2.5 text-sm text-gray-400 cursor-not-allowed"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="checkout-notes" className="block text-sm font-medium text-gray-700 mb-1">
                    Notas adicionales
                  </label>
                  <textarea
                    id="checkout-notes"
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    rows={2}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-sky-400 resize-none"
                    placeholder="Instrucciones para el mensajero..."
                  />
                </div>
              </div>
            </div>

            {/* Datos del comprador — para comprobante de venta y Vendelo */}
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <h2 className="font-bold text-gray-900 mb-1">Datos del comprador</h2>
              <p className="text-xs text-gray-500 mb-5">
                Quedan registrados en el comprobante de venta. Si el comprador es una empresa, elige NIT.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="buyer-id-type" className="block text-sm font-medium text-gray-700 mb-1">
                    Tipo de documento *
                  </label>
                  <select
                    id="buyer-id-type"
                    value={buyer.idType}
                    onChange={(e) => setBuyer({ ...buyer, idType: e.target.value as BuyerIdType })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-sky-400 bg-white"
                  >
                    <option value="CC">Cédula de Ciudadanía (CC)</option>
                    <option value="CE">Cédula de Extranjería (CE)</option>
                    <option value="NIT">NIT (empresa)</option>
                    <option value="PASAPORTE">Pasaporte</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="buyer-id-number" className="block text-sm font-medium text-gray-700 mb-1">
                    Número *
                  </label>
                  <input
                    id="buyer-id-number"
                    required
                    aria-required="true"
                    type="text"
                    inputMode={buyer.idType === 'CC' ? 'numeric' : 'text'}
                    value={buyer.idNumber}
                    onChange={(e) => setBuyer({ ...buyer, idNumber: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-sky-400"
                    placeholder={buyer.idType === 'NIT' ? '900123456-7' : '1000123456'}
                  />
                </div>

                {buyer.idType === 'NIT' && (
                  <div className="sm:col-span-3">
                    <label htmlFor="buyer-business-name" className="block text-sm font-medium text-gray-700 mb-1">
                      Razón social *
                    </label>
                    <input
                      id="buyer-business-name"
                      required
                      aria-required="true"
                      type="text"
                      value={buyer.businessName}
                      onChange={(e) => setBuyer({ ...buyer, businessName: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-sky-400"
                      placeholder="H2R Online Store S.A.S."
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Método de pago — el selector solo se muestra si el admin habilitó COD */}
            {codEnabled && (
              <div className="bg-white border border-gray-200 rounded-xl p-6">
                <h2 className="font-bold text-gray-900 mb-1">Método de pago</h2>
                <p className="text-xs text-gray-500 mb-5">
                  Con pago contra entrega pagas en efectivo al repartidor cuando recibas tu pedido.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label
                    className={`flex items-start gap-3 border rounded-lg px-4 py-3 cursor-pointer transition-colors ${
                      paymentMethod === 'WOMPI' ? 'border-sky-400 bg-sky-50' : 'border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="WOMPI"
                      checked={paymentMethod === 'WOMPI'}
                      onChange={() => setPaymentMethod('WOMPI')}
                      className="mt-0.5 accent-sky-500"
                    />
                    <span>
                      <span className="block text-sm font-semibold text-gray-900">Pago en línea</span>
                      <span className="block text-xs text-gray-500">Tarjeta, Nequi, PSE o Bancolombia (Wompi)</span>
                    </span>
                  </label>

                  <label
                    className={`flex items-start gap-3 border rounded-lg px-4 py-3 cursor-pointer transition-colors ${
                      paymentMethod === 'COD' ? 'border-sky-400 bg-sky-50' : 'border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="COD"
                      checked={paymentMethod === 'COD'}
                      onChange={() => setPaymentMethod('COD')}
                      className="mt-0.5 accent-sky-500"
                    />
                    <span>
                      <span className="block text-sm font-semibold text-gray-900">Pago contra entrega</span>
                      <span className="block text-xs text-gray-500">Pagas en efectivo al recibir tu pedido</span>
                    </span>
                  </label>
                </div>

                {/* Nota informativa — no es una elección del cliente, es una política global
                    del negocio (toggle "Flete pagado en línea" en /admin/configuracion). */}
                {paymentMethod === 'WOMPI' && shippingWillBeCod && (
                  <div className="mt-3 flex items-start gap-3 border border-dashed border-amber-300 bg-amber-50 rounded-lg px-4 py-3">
                    <span>
                      <span className="block text-sm font-semibold text-gray-900">El flete se paga contraentrega</span>
                      <span className="block text-xs text-gray-500">
                        Pagas el producto ahora en línea y el flete en efectivo al repartidor cuando recibas tu pedido
                      </span>
                    </span>
                  </div>
                )}
              </div>
            )}

            {error && (
              <div role="alert" className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
                {error}
              </div>
            )}

            {/* Aceptación de políticas — obligatoria antes de proceder al pago */}
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
              <label className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={acceptedPolicies}
                  onChange={(e) => setAcceptedPolicies(e.target.checked)}
                  aria-required="true"
                  aria-describedby="policies-description"
                  className="mt-0.5 w-4 h-4 shrink-0 rounded border-gray-300 text-sky-500 focus:ring-sky-500 accent-sky-500"
                />
                <span
                  id="policies-description"
                  className="text-xs text-gray-600 leading-relaxed group-hover:text-gray-800 transition-colors"
                >
                  Al realizar este pedido confirmo que he leído y acepto la{' '}
                  <a
                    href="/legal/politica-de-envios"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sky-600 underline hover:text-sky-700"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Política de envíos
                  </a>
                  , la{' '}
                  <a
                    href="/legal/politica-de-cambios"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sky-600 underline hover:text-sky-700"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Política de cambios
                  </a>{' '}
                  y los{' '}
                  <a
                    href="/legal/terminos-y-condiciones"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sky-600 underline hover:text-sky-700"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Términos y condiciones
                  </a>{' '}
                  de H2R Online Store.
                </span>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading || !selectedCity || !acceptedPolicies}
              aria-disabled={!acceptedPolicies}
              className="w-full bg-sky-500 text-white py-3 rounded-xl font-bold text-base hover:bg-sky-600 active:scale-95 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? 'Procesando...' : paymentMethod === 'COD' ? 'Confirmar pedido →' : 'Continuar al pago →'}
            </button>
          </form>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <h2 className="font-bold text-gray-900 mb-2">Pago seguro con Wompi</h2>
            <p className="text-sm text-gray-500 mb-6">
              Completa tu pago. Aceptamos Tarjeta, Nequi, PSE y Bancolombia.
            </p>
            {wompiParams && wompiParams.publicKey && wompiParams.integritySignature && (
              <WompiWidget
                {...wompiParams}
                publicKey={wompiParams.publicKey}
                integritySignature={wompiParams.integritySignature}
                redirectUrl={`${process.env.NEXT_PUBLIC_APP_URL ?? (typeof window !== 'undefined' ? window.location.origin : '')}/checkout/confirmacion?orderId=${orderId}`}
              />
            )}
          </div>
        )}
      </div>

      {/* Resumen */}
      <div>
        <div className="bg-white border border-gray-200 rounded-xl p-6 sticky top-24">
          <h2 className="font-bold text-gray-900 mb-4">Tu pedido</h2>
          <div className="space-y-3 mb-4">
            {items.map(({ product, quantity }) => (
              <div key={product.id} className="flex justify-between text-sm">
                <span className="text-gray-600 line-clamp-1 flex-1">
                  {product.name} ×{quantity}
                </span>
                <span className="text-gray-900 font-medium ml-2 shrink-0">
                  {formatCOP(product.price * quantity)}
                </span>
              </div>
            ))}
          </div>
          <div className="border-t border-gray-100 pt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Envío</span>
              {!selectedCity && <span className="text-gray-400 italic">Selecciona tu ciudad</span>}
              {selectedCity && shippingLoading && <span className="text-gray-400">Calculando...</span>}
              {selectedCity && !shippingLoading && shippingQuote && shippingQuote.freeShipping && (
                <span className="inline-flex items-center gap-1 text-green-600 font-semibold text-xs bg-green-50 px-2 py-0.5 rounded-full">
                  🎉 ¡Envío gratis!
                </span>
              )}
              {selectedCity && !shippingLoading && shippingQuote && !shippingQuote.freeShipping && (
                <span className="text-gray-700 font-medium">{formatCOP(shippingQuote.quotedShippingTotal)}</span>
              )}
              {selectedCity && !shippingLoading && shippingError && (
                <span className="text-gray-400 italic text-xs">No se pudo calcular ahora</span>
              )}
            </div>

            <div className="flex justify-between font-bold text-gray-900 pt-1">
              <span>{shippingCost > 0 ? 'Total estimado' : 'Total'}</span>
              <span>{formatCOP(cartTotal + shippingCost)}</span>
            </div>
            <p className="text-xs text-gray-400">
              El envío lo cobra Vendelo directamente al recibir tu pedido — esto es solo un estimado.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
