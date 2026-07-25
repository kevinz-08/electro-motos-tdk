'use client'

import { useState, type FormEvent } from 'react'
import { apiClient } from '@/lib/api-client'

type PqrType = 'PETICION' | 'QUEJA' | 'RECLAMO' | 'SUGERENCIA'

const PQR_TYPES: { value: PqrType; label: string }[] = [
  { value: 'PETICION', label: 'Petición' },
  { value: 'QUEJA', label: 'Queja' },
  { value: 'RECLAMO', label: 'Reclamo' },
  { value: 'SUGERENCIA', label: 'Sugerencia' },
]

interface FormData {
  name: string
  email: string
  type: PqrType
  message: string
}

type FieldErrors = Partial<Record<keyof FormData, string>>

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function validate(form: FormData): FieldErrors {
  const errors: FieldErrors = {}
  if (!form.name.trim()) errors.name = 'Ingresa tu nombre completo'
  if (!form.email.trim()) errors.email = 'Ingresa tu correo'
  else if (!EMAIL_REGEX.test(form.email)) errors.email = 'Correo inválido'
  if (!form.message.trim()) errors.message = 'Cuéntanos qué necesitas'
  else if (form.message.trim().length < 10) errors.message = 'Danos un poco más de detalle (mín. 10 caracteres)'
  return errors
}

const inputBase =
  'w-full rounded-xl border bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 outline-none transition-colors duration-150 focus:ring-2'

function fieldClasses(hasError: boolean) {
  return hasError
    ? `${inputBase} border-red-300 focus:border-red-500 focus:ring-red-100`
    : `${inputBase} border-gray-200 focus:border-sky-500 focus:ring-sky-100`
}

export function PqrForm() {
  const [form, setForm] = useState<FormData>({ name: '', email: '', type: 'PETICION', message: '' })
  const [errors, setErrors] = useState<FieldErrors>({})
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle')
  const [serverError, setServerError] = useState<string | null>(null)

  const handleChange = (field: keyof FormData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }))
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }))
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const fieldErrors = validate(form)
    setErrors(fieldErrors)
    if (Object.keys(fieldErrors).length > 0) return

    setStatus('submitting')
    setServerError(null)

    const res = await apiClient().post('/contact', form)

    if (res.ok) {
      setStatus('success')
      setForm({ name: '', email: '', type: 'PETICION', message: '' })
    } else {
      setStatus('error')
      setServerError(res.error)
    }
  }

  if (status === 'success') {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-6 py-10 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
          <svg className="h-6 w-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        </div>
        <h3 className="text-base font-semibold text-emerald-900">¡Mensaje enviado!</h3>
        <p className="mt-1.5 text-sm text-emerald-700">
          Recibimos tu PQR. Te responderemos al correo que nos dejaste en un plazo máximo de 48 horas hábiles.
        </p>
        <button
          type="button"
          onClick={() => setStatus('idle')}
          className="mt-5 text-sm font-medium text-emerald-700 underline underline-offset-2 hover:text-emerald-800"
        >
          Enviar otro mensaje
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5" aria-label="Formulario de PQR">
      <div>
        <label htmlFor="pqr-name" className="mb-1.5 block text-sm font-medium text-gray-700">
          Nombre completo
        </label>
        <input
          id="pqr-name"
          type="text"
          autoComplete="name"
          value={form.name}
          onChange={handleChange('name')}
          placeholder="Tu nombre"
          className={fieldClasses(!!errors.name)}
          aria-invalid={!!errors.name}
          aria-describedby={errors.name ? 'pqr-name-error' : undefined}
        />
        {errors.name && (
          <p id="pqr-name-error" className="mt-1.5 text-xs text-red-600">{errors.name}</p>
        )}
      </div>

      <div>
        <label htmlFor="pqr-email" className="mb-1.5 block text-sm font-medium text-gray-700">
          Correo electrónico
        </label>
        <input
          id="pqr-email"
          type="email"
          autoComplete="email"
          value={form.email}
          onChange={handleChange('email')}
          placeholder="tucorreo@ejemplo.com"
          className={fieldClasses(!!errors.email)}
          aria-invalid={!!errors.email}
          aria-describedby={errors.email ? 'pqr-email-error' : undefined}
        />
        {errors.email && (
          <p id="pqr-email-error" className="mt-1.5 text-xs text-red-600">{errors.email}</p>
        )}
      </div>

      <div>
        <label htmlFor="pqr-type" className="mb-1.5 block text-sm font-medium text-gray-700">
          Tipo de PQR
        </label>
        <select
          id="pqr-type"
          value={form.type}
          onChange={handleChange('type')}
          className={`${fieldClasses(false)} appearance-none bg-[url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" fill="none" stroke="%236b7280" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>')] bg-[length:1.1rem] bg-[right_0.9rem_center] bg-no-repeat pr-10`}
        >
          {PQR_TYPES.map(({ value, label }) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="pqr-message" className="mb-1.5 block text-sm font-medium text-gray-700">
          Mensaje
        </label>
        <textarea
          id="pqr-message"
          rows={5}
          value={form.message}
          onChange={handleChange('message')}
          placeholder="Cuéntanos con detalle qué pasó o qué necesitas..."
          className={`${fieldClasses(!!errors.message)} resize-none`}
          aria-invalid={!!errors.message}
          aria-describedby={errors.message ? 'pqr-message-error' : undefined}
        />
        {errors.message && (
          <p id="pqr-message-error" className="mt-1.5 text-xs text-red-600">{errors.message}</p>
        )}
      </div>

      {status === 'error' && serverError && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          No pudimos enviar tu mensaje: {serverError}
        </div>
      )}

      <button
        type="submit"
        disabled={status === 'submitting'}
        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-sky-600 px-6 py-3 text-sm font-semibold text-white transition-colors duration-150 hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {status === 'submitting' ? (
          <>
            <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
            Enviando...
          </>
        ) : (
          'Enviar mensaje'
        )}
      </button>
    </form>
  )
}
