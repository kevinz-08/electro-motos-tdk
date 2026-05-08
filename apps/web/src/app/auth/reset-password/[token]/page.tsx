import type { Metadata } from 'next'
import Link from 'next/link'
import { ResetPasswordForm } from './ResetPasswordForm'

export const metadata: Metadata = {
  title: 'Nueva contraseña',
  description: 'Establece una nueva contraseña para tu cuenta.',
  robots: { index: false, follow: false },
}

interface PageProps {
  params: Promise<{ token: string }>
}

export default async function ResetPasswordPage({ params }: PageProps) {
  const { token } = await params

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4">
      <div className="w-full max-w-sm">

        <div className="text-center mb-8">
          <Link href="/" className="text-white font-bold text-lg hover:text-blue-400 transition-colors">
            Electro Motos Tony
          </Link>
          <h1 className="text-2xl font-black text-white mt-6 mb-2">Nueva contraseña</h1>
          <p className="text-white/40 text-sm">
            Elige una contraseña segura para tu cuenta.
          </p>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <ResetPasswordForm token={token} />
        </div>

      </div>
    </div>
  )
}
