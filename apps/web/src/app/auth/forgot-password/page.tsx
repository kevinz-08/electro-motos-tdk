import type { Metadata } from 'next'
import Link from 'next/link'
import { ForgotPasswordForm } from './ForgotPasswordForm'

export const metadata: Metadata = {
  title: 'Recuperar contraseña',
  description: 'Ingresa tu correo y te enviaremos un enlace para restablecer tu contraseña.',
  robots: { index: false, follow: false },
}

export default function ForgotPasswordPage() {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4">
      <div className="w-full max-w-sm">

        <div className="text-center mb-8">
          <Link href="/" className="text-white font-bold text-lg hover:text-blue-400 transition-colors">
            Electro Motos Tony
          </Link>
          <h1 className="text-2xl font-black text-white mt-6 mb-2">Recuperar contraseña</h1>
          <p className="text-white/40 text-sm">
            Ingresa tu correo y te enviaremos un enlace de acceso.
          </p>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <ForgotPasswordForm />
        </div>

        <p className="text-center text-sm text-white/30 mt-6">
          ¿Recordaste tu contraseña?{' '}
          <Link href="/auth/login" className="text-blue-400 hover:underline">
            Inicia sesión
          </Link>
        </p>

      </div>
    </div>
  )
}
