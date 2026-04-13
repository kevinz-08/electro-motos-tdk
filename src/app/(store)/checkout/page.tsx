import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { CheckoutForm } from '@/components/checkout/CheckoutForm'

/** Checkout — requiere sesión (el middleware también lo valida) */
export default async function CheckoutPage() {
  const session = await auth()
  if (!session?.user) redirect('/auth/login?callbackUrl=/checkout')

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <h1 className="text-3xl font-bold text-white-900 mb-8">Finalizar compra</h1>
      <CheckoutForm userEmail={session.user.email ?? ''} />
    </div>
  )
}
