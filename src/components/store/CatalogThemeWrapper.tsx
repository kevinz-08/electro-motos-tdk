'use client'

/**
 * Wrapper cliente del catálogo.
 *
 * Responsabilidades:
 *  - Aplica la clase CSS `catalog-light` al contenedor raíz cuando el usuario
 *    activa el modo claro. Eso activa las variables --c-* definidas en globals.css.
 *  - Persiste la preferencia en localStorage para que se recuerde entre visitas.
 *  - Renderiza el botón flotante de cambio de tema (encima del botón de WhatsApp).
 *
 * Patrón de hidratación:
 *  El estado inicial es `false` (oscuro) para que el HTML del servidor y el del
 *  cliente coincidan. El efecto lee localStorage DESPUÉS de hidratar, evitando
 *  el warning de hydration mismatch.
 */
import { useState, useEffect } from 'react'

interface Props {
  children: React.ReactNode
}

export function CatalogThemeWrapper({ children }: Props) {
  const [isLight, setIsLight] = useState(false)

  useEffect(() => {
    if (localStorage.getItem('catalog-theme') === 'light') setIsLight(true)
  }, [])

  const toggle = () => {
    const next = !isLight
    setIsLight(next)
    localStorage.setItem('catalog-theme', next ? 'light' : 'dark')
  }

  return (
    <div className={`transition-colors duration-300${isLight ? ' catalog-light' : ''}`}>
      {children}

      {/* ── Botón flotante de tema (sobre el botón de WhatsApp) ── */}
      <button
        onClick={toggle}
        aria-label={isLight ? 'Cambiar a modo oscuro' : 'Cambiar a modo claro'}
        title={isLight ? 'Modo oscuro' : 'Modo claro'}
        className="fixed bottom-[5.5rem] right-6 z-40 w-11 h-11 rounded-full bg-[var(--c-surface)] border border-[var(--c-border)] shadow-xl flex items-center justify-center hover:border-blue-500 hover:scale-105 transition-all duration-200"
      >
        {isLight ? (
          /* Luna — cambiar a oscuro */
          <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
          </svg>
        ) : (
          /* Sol — cambiar a claro */
          <svg className="w-5 h-5 text-yellow-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        )}
      </button>
    </div>
  )
}
