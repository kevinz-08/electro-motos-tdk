import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'

export const metadata: Metadata = {
  title: 'Error de inicio de sesión',
  robots: { index: false, follow: false },
}

const ERROR_MESSAGES: Record<string, string> = {
  OAuthAccountNotLinked:
    'Ya existe una cuenta con este email usando otro método de inicio de sesión. Inicia sesión con el método original.',
  OAuthCallbackError:
    'No se pudo completar el inicio de sesión con Google. Intenta de nuevo.',
  CredentialsSignin: 'Email o contraseña incorrectos.',
  AccessDenied: 'No tienes permiso para acceder a esta cuenta.',
  Verification: 'El enlace de verificación expiró o ya fue usado.',
}

interface PageProps {
  searchParams: Promise<{ error?: string }>
}

export default async function AuthErrorPage({ searchParams }: PageProps) {
  const { error } = await searchParams
  const message =
    (error && ERROR_MESSAGES[error]) ?? 'Ocurrió un error al iniciar sesión.'

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
          <p className="text-white/50 mt-1 text-sm">Error de autenticación</p>
        </div>

        {/* Mensaje de error */}
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-5 py-4 mb-8 text-center">
          <p className="text-2xl mb-3">⚠️</p>
          <p className="text-red-400 text-sm leading-relaxed">{message}</p>
        </div>

        {/* Acciones */}
        <div className="flex flex-col gap-3">
          <Link
            href="/auth/login"
            className="w-full text-center bg-white text-black font-semibold rounded-lg py-2.5 px-4 text-sm hover:bg-white/90 transition-colors"
          >
            Volver a intentar
          </Link>
          <Link
            href="/"
            className="w-full text-center border border-white/10 rounded-lg py-2.5 px-4 text-sm font-medium text-white hover:border-white/30 hover:bg-white/5 transition-colors"
          >
            Ir al inicio
          </Link>
        </div>

      </div>
    </div>
  )
}
