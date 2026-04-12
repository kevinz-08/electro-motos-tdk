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
      redirect: false, // Manejamos la redirección manualmente para mostrar errores inline
    })

    setLoading(false)

    if (result?.error) {
      setError('Correo o contraseña incorrectos. Verifica tus datos.')
      return
    }

    // Login exitoso → redirigir
    router.push(callbackUrl ?? '/')
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Error inline */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      {/* Email */}
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
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
          className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-amber-400 transition-colors"
        />
      </div>

      {/* Contraseña */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label htmlFor="password" className="block text-sm font-medium text-gray-700">
            Contraseña
          </label>
          {/* Mostrar/ocultar contraseña */}
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="text-xs text-gray-400 hover:text-gray-600"
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
          className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-amber-400 transition-colors"
        />
      </div>

      {/* Botón */}
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-amber-400 text-gray-900 py-2.5 rounded-lg text-sm font-bold hover:bg-amber-300 active:scale-95 transition-all disabled:opacity-60"
      >
        {loading ? 'Ingresando...' : 'Ingresar'}
      </button>

      {/* Link olvidé contraseña (placeholder — pendiente implementar) */}
      <p className="text-xs text-center text-gray-400">
        ¿Olvidaste tu contraseña?{' '}
        <Link href="/auth/login?magic=1" className="text-amber-600 hover:underline">
          Recuperar por correo
        </Link>
      </p>
    </form>
  )
}
