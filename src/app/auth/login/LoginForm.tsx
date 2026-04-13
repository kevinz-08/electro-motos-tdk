'use client'

/**
 * Formulario de login con email + contraseña.
 *
 * Es un Client Component porque necesita manejar estado de error inline
 * (sin redirigir a /auth/error) y mostrar el spinner de carga.
 *
 * Usa `signIn('credentials', ...)` de next-auth/react.
 * Si las credenciales son incorrectas, NextAuth retorna error 'CredentialsSignin'
 * que capturamos y mostramos directamente en el formulario.
 */
import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface LoginFormProps {
  callbackUrl?: string
}

export function LoginForm({ callbackUrl }: LoginFormProps) {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
    })

    setLoading(false)

    if (result?.error) {
      setError('Correo o contraseña incorrectos. Verifica tus datos.')
      return
    }

    router.push(callbackUrl ?? '/')
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Error inline */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      {/* Email */}
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-white/70 mb-1">
          Correo electrónico
        </label>
        <input
          id="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="tu@correo.com"
          className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-blue-500 transition-colors"
        />
      </div>

      {/* Contraseña */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label htmlFor="password" className="block text-sm font-medium text-white/70">
            Contraseña
          </label>
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="text-xs text-white/30 hover:text-white/60 transition-colors"
          >
            {showPassword ? 'Ocultar' : 'Mostrar'}
          </button>
        </div>
        <input
          id="password"
          type={showPassword ? 'text' : 'password'}
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-blue-500 transition-colors"
        />
      </div>

      {/* Botón */}
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 text-white py-2.5 rounded-lg text-sm font-bold hover:bg-blue-500 active:scale-95 transition-all disabled:opacity-60"
      >
        {loading ? 'Ingresando...' : 'Ingresar'}
      </button>

      <p className="text-xs text-center text-white/30">
        ¿Olvidaste tu contraseña?{' '}
        <Link href="/auth/login?magic=1" className="text-blue-400 hover:underline">
          Recuperar por correo
        </Link>
      </p>
    </form>
  )
}
