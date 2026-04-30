/**
 * Página de inicio de sesión.
 *
 * Opciones:
 *  1. Email + contraseña (CredentialsProvider) — gestionado por LoginForm (client component)
 *  2. Google OAuth — server action
 *
 * Si ya hay sesión activa, redirige al destino (callbackUrl) o a la raíz.
 * Si no tiene cuenta, el link "Crear cuenta" lleva a /auth/register.
 */
import type { Metadata } from 'next'
import { signIn, auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { LoginForm } from './LoginForm'
import Image from 'next/image'

export const metadata: Metadata = {
  title: 'Iniciar sesión',
  description: 'Accede a tu cuenta para gestionar tus pedidos y continuar con tus compras.',
  robots: { index: false, follow: false },
}

interface PageProps {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>
}

export default async function LoginPage({ searchParams }: PageProps) {
  const session = await auth()
  const { callbackUrl, error } = await searchParams

  if (session?.user) redirect(callbackUrl ?? '/')

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4">
      <div className="bg-white/5 border border-white/10 rounded-2xl p-8 w-full max-w-md">

        {/* Encabezado */}
        <div className="text-center mb-8">
            <Link href="/" className="flex items-center gap-2">
              <Image
                src="/assets/logo.png"
                alt="Electro Motos Tony"
                width={80}
                height={60}
                className="object-contain block mx-auto"
                priority
              />
            </Link>
          <p className="text-white/50 mt-1 text-sm">Inicia sesión en tu cuenta</p>
        </div>

        {/* Error de autenticación (viene de NextAuth via query param) */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg px-4 py-3 mb-6">
            {error === 'CredentialsSignin'
              ? 'Correo o contraseña incorrectos.'
              : 'Error de autenticación. Intenta de nuevo.'}
          </div>
        )}

        {/* Formulario email + contraseña (cliente) */}
        <LoginForm callbackUrl={callbackUrl} />

        {/* Separador */}
        <div className="relative my-5">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-white/10" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-[#0a0a0a] px-3 text-xs text-white/30">o continúa con</span>
          </div>
        </div>

        {/* Google OAuth — server action */}
        <form
          action={async () => {
            'use server'
            await signIn('google', { redirectTo: callbackUrl ?? '/' })
          }}
        >
          <button
            type="submit"
            className="w-full flex items-center justify-center gap-3 border border-white/10 rounded-lg py-2.5 px-4 text-sm font-medium text-white hover:border-white/30 hover:bg-white/5 transition-colors"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Continuar con Google
          </button>
        </form>

        {/* Link a registro */}
        <p className="text-sm text-white/40 text-center mt-6">
          ¿No tienes cuenta?{' '}
          <Link href="/auth/register" className="text-blue-400 font-semibold hover:underline">
            Crear cuenta gratis
          </Link>
        </p>
        <p className='text-sm text-white/40 text-center mt-2'>
          <Link href="/">
            ← Volver a el Inicio
          </Link>
        </p>

        <p className="text-xs text-white/20 text-center mt-3">
          Al ingresar aceptas nuestros términos de uso y política de privacidad.
        </p>
      </div>
    </div>
  )
}
