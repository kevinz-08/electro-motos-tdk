'use client'

/**
 * Vídeo de fondo del hero del catálogo — carga diferida y condicional.
 *
 * Por qué existe (Fase 1 del proyecto SEO, docs/seo/):
 * el hero cargaba `/assets/video-hero-catalog.mp4` con `autoplay preload="auto"`.
 * El archivo pesaba 87 MB en el repositorio (unos 30 MB transferidos) y era el
 * elemento LCP de `/catalogo`: 6,8 s de LCP y 31,8 MB de página en móvil.
 *
 * Ahora:
 *   1. El póster (12 KB) lo pinta `CatalogHero` como imagen normal — ese es el
 *      LCP, y se ve igual desde el primer frame.
 *   2. Este componente monta el `<video>` solo cuando se cumple todo esto:
 *        - la pantalla es de escritorio (≥ 1024 px): en móvil el vídeo no
 *          aporta nada que justifique el consumo de datos del usuario;
 *        - el usuario no pidió "reducir movimiento" (`prefers-reduced-motion`);
 *        - el navegador no reporta conexión lenta o ahorro de datos
 *          (`navigator.connection`);
 *        - el hilo principal está libre (`requestIdleCallback`).
 *   3. El vídeo aparece con una transición suave sobre el póster, así que no
 *      hay salto visual ni CLS.
 *
 * El archivo además se recomprimió a 1280×720 sin pista de audio (el vídeo
 * siempre estuvo `muted`): 87 MB → 3,7 MB.
 */
import { useEffect, useState } from 'react'

/** Tipo mínimo de la Network Information API, que TypeScript no trae. */
type NetworkInformation = { saveData?: boolean; effectiveType?: string }

const SLOW_CONNECTIONS = ['slow-2g', '2g', '3g']

function shouldLoadVideo(): boolean {
  if (typeof window === 'undefined') return false
  if (!window.matchMedia('(min-width: 1024px)').matches) return false
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false

  const connection = (navigator as Navigator & { connection?: NetworkInformation }).connection
  if (connection?.saveData) return false
  if (connection?.effectiveType && SLOW_CONNECTIONS.includes(connection.effectiveType)) return false

  return true
}

export function CatalogHeroVideo({ src }: { src: string }) {
  const [mounted, setMounted] = useState(false)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!shouldLoadVideo()) return

    const idle = window.requestIdleCallback ?? ((cb: IdleRequestCallback) => window.setTimeout(cb, 1500))
    const cancel = window.cancelIdleCallback ?? window.clearTimeout
    const handle = idle(() => setMounted(true))

    return () => cancel(handle as number)
  }, [])

  if (!mounted) return null

  return (
    <video
      src={src}
      autoPlay
      loop
      muted
      playsInline
      // El póster ya está pintado debajo: este vídeo nunca debe precargarse
      // antes de que el navegador decida montarlo.
      preload="none"
      aria-hidden
      onCanPlay={() => setVisible(true)}
      className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
    />
  )
}
