'use client'

/**
 * Formulario de checkout en dos pasos:
 *
 * Paso 1 — "shipping": Recoge datos de envío. Al confirmar:
 *   a) POST /api/orders → crea el pedido con estado PENDING
 *   b) POST /api/payments/wompi/integrity → obtiene la firma SHA256 del servidor
 *
 * Paso 2 — "payment": Muestra el Widget de Wompi con los parámetros obtenidos.
 *   El Widget redirige a Wompi donde el cliente paga. El webhook /api/payments/wompi/webhook
 *   es quien confirma o rechaza el pago de forma asíncrona.
 *
 * Nota: el precio en el formulario se muestra en pesos COP (display),
 * pero internamente todo se maneja en centavos.
 */
import { useState } from 'react'
import { useSession } from 'next-auth/react'
import type { CreateOrderResponse } from '@h2r/types'
import { useCart } from '@/lib/cart'
import { WompiWidget } from './WompiWidget'
import { CitySelector } from './CitySelector'
import { apiClient } from '@/lib/api-client'

interface CheckoutFormProps {
  userEmail: string
}

interface CityOption {
  code: string
  name: string
  subdivisionCode: string
}

interface ShippingFormData {
  fullName: string
  address: string
  phone: string
  notes: string
}

function formatCOP(cents: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(cents / 100)
}

export function CheckoutForm({ userEmail }: CheckoutFormProps) {
  const { data: session } = useSession()
  const { items, total } = useCart()
  const [step, setStep] = useState<'shipping' | 'payment'>('shipping')
  const [orderId, setOrderId] = useState<string | null>(null)
  const [wompiParams, setWompiParams] = useState<CreateOrderResponse['payment'] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [acceptedPolicies, setAcceptedPolicies] = useState(false)

  const [form, setForm] = useState<ShippingFormData>({
    fullName: '',
    address: '',
    phone: '',
    notes: '',
  })
  const [selectedCity, setSelectedCity] = useState<CityOption | null>(null)

  const cartTotal = total()

  const handleSubmitShipping = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedCity) {
      setError('Por favor selecciona una ciudad de la lista.')
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
        paymentProvider: 'WOMPI',
      })

      if (!orderRes.ok) {
        throw new Error(orderRes.error ?? 'Error al crear el pedido')
      }

      const { order, payment } = orderRes.data

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
              {loading ? 'Procesando...' : 'Continuar al pago →'}
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
          <div className="border-t border-gray-100 pt-4">
            <div className="flex justify-between font-bold text-gray-900">
              <span>Total</span>
              <span>{formatCOP(cartTotal)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
