'use client'

import { useEffect } from 'react'

interface GlobalErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    console.error('[app/global-error]', error)
  }, [error])

  return (
    <html lang="es">
      <body>
        <div
          style={{
            display: 'flex',
            minHeight: '100vh',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '1rem',
            padding: '1rem',
            textAlign: 'center',
            fontFamily: 'sans-serif',
          }}
        >
          <h2 style={{ fontSize: '1.5rem', fontWeight: 600, color: '#1f2937' }}>
            Error crítico de la aplicación
          </h2>
          <p style={{ maxWidth: '28rem', color: '#6b7280' }}>
            Ocurrió un error que impidió cargar la aplicación. Por favor recarga la página.
          </p>
          <button
            onClick={reset}
            style={{
              borderRadius: '0.375rem',
              background: '#2563eb',
              padding: '0.5rem 1.25rem',
              fontSize: '0.875rem',
              fontWeight: 500,
              color: '#fff',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Recargar
          </button>
        </div>
      </body>
    </html>
  )
}
