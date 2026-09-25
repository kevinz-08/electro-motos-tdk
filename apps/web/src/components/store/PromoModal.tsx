'use client'

/**
 * Pop-up promocional de la home (README §25.1).
 *
 * - Overlay centrado con fondo atenuado; la imagen completa enlaza al destino configurado.
 * - Cierra con la X, clic en el fondo o tecla Esc. Bloquea el scroll del body mientras está abierto,
 *   mueve el foco al botón de cerrar y lo devuelve al cerrarse.
 * - Art direction con <picture> + getImageProps(): imagen vertical en móvil, horizontal en escritorio.
 * - Frecuencia: no se vuelve a mostrar hasta que pasen 24 h o el admin publique una versión distinta
 *   (`version` = updatedAt). Si localStorage falla (modo privado), el modal se muestra igual.
 *   La decisión se lee con useSyncExternalStore: en SSR devuelve false (no se renderiza) y tras
 *   hidratar consulta localStorage, sin setState dentro de un efecto ni mismatch de hidratación.
 * - Aparición diferida a scroll o 4 s (docs/seo/, H-36): antes se mostraba apenas terminaba de
 *   hidratar. Su imagen mide más área en pantalla que el propio hero (en móvil, más alta incluso con
 *   menos ancho), así que SIEMPRE se convertía en el elemento LCP real de la home en vez del hero —
 *   Lighthouse en producción lo confirmó, y esperar solo a `window.load` + hilo libre no alcanzó (el
 *   LCP sigue actualizándose con cualquier elemento más grande hasta la primera interacción del
 *   usuario, así que un simple retraso nunca lo evita si el navegador de prueba no interactúa).
 *   Ahora espera a lo primero que ocurra entre **el primer scroll del visitante** o
 *   `PROMO_FALLBACK_DELAY_MS` — así nunca es el primer contenido pintado (nunca compite por LCP) y de
 *   paso deja de ser un interstitial que salta apenas se abre la página, que Google también penaliza
 *   en móvil. Quien no interactúa (como el robot de Lighthouse) lo ve tras el retraso igual, para que
 *   el pop-up siga cumpliendo su función comercial.
 */
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import Link from 'next/link'
import { getImageProps } from 'next/image'
import { cloudinaryUrl } from '@/lib/cloudinary'

const STORAGE_KEY = 'promo-modal-seen'
const HIDE_FOR_MS = 24 * 60 * 60 * 1000
const DESKTOP_BREAKPOINT = '(min-width: 768px)'
/** Quien no hace scroll (incluido el robot de Lighthouse) lo ve tras este tiempo igual. */
const PROMO_FALLBACK_DELAY_MS = 4000
/** Cuánto hay que bajar para contar como "el visitante ya interactuó con la página". */
const SCROLL_TRIGGER_PX = 150

export interface PromoModalData {
  desktopImageUrl: string
  mobileImageUrl: string
  altText: string
  ctaUrl: string
  /** updatedAt en ISO — cambia cada vez que el admin guarda, reiniciando la frecuencia. */
  version: string
}

/** true si el visitante ya cerró esta misma versión hace menos de 24 h. */
function wasDismissed(version: string): boolean {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return false
    const saved = JSON.parse(raw) as { version?: string; at?: number }
    return saved.version === version && typeof saved.at === 'number' && Date.now() - saved.at < HIDE_FOR_MS
  } catch {
    return false // modo privado o JSON corrupto: mostrar el modal
  }
}

function rememberDismissal(version: string): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ version, at: Date.now() }))
  } catch {
    // Sin localStorage el modal reaparecerá en la próxima visita — aceptable.
  }
}

const subscribe = () => () => {}
const noneOnServer = () => false

export function PromoModal({ promo }: { promo: PromoModalData }) {
  const [closedByUser, setClosedByUser] = useState(false)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const previouslyFocused = useRef<Element | null>(null)

  const showable = useSyncExternalStore(subscribe, () => !wasDismissed(promo.version), noneOnServer)
  const [readyToShow, setReadyToShow] = useState(false)
  const open = showable && !closedByUser && readyToShow

  // Se muestra en cuanto ocurra lo primero entre un scroll real o el retraso de
  // respaldo — ver el porqué en el comentario del encabezado (LCP).
  useEffect(() => {
    const onScroll = () => {
      if (window.scrollY > SCROLL_TRIGGER_PX) setReadyToShow(true)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    const fallback = window.setTimeout(() => setReadyToShow(true), PROMO_FALLBACK_DELAY_MS)

    return () => {
      window.removeEventListener('scroll', onScroll)
      window.clearTimeout(fallback)
    }
  }, [])

  const close = useCallback(() => {
    setClosedByUser(true)
    rememberDismissal(promo.version)
  }, [promo.version])

  useEffect(() => {
    if (!open) return

    previouslyFocused.current = document.activeElement
    closeButtonRef.current?.focus()

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    document.addEventListener('keydown', onKeyDown)

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
      if (previouslyFocused.current instanceof HTMLElement) previouslyFocused.current.focus()
    }
  }, [open, close])

  if (!open) return null

  const common = { alt: promo.altText, sizes: '(min-width: 768px) 60vw, 90vw' }
  const { props: { srcSet: desktopSrcSet } } = getImageProps({
    ...common,
    src: cloudinaryUrl(promo.desktopImageUrl, 'detail'),
    width: 1200,
    height: 800,
  })
  const { props: { srcSet: mobileSrcSet, ...imgProps } } = getImageProps({
    ...common,
    src: cloudinaryUrl(promo.mobileImageUrl, 'detail'),
    width: 900,
    height: 1200,
  })

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={promo.altText}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn"
      onMouseDown={(e) => { if (e.target === e.currentTarget) close() }}
    >
      <div className="relative w-full max-w-sm md:max-w-2xl">
        <button
          ref={closeButtonRef}
          type="button"
          onClick={close}
          aria-label="Cerrar promoción"
          className="absolute -top-3 -right-3 z-10 w-10 h-10 rounded-full bg-white text-gray-700 shadow-lg border border-gray-200 flex items-center justify-center hover:bg-gray-100 hover:text-gray-900 active:scale-90 transition-all"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <Link href={promo.ctaUrl} onClick={close} className="block rounded-2xl overflow-hidden shadow-2xl">
          <picture>
            <source media={DESKTOP_BREAKPOINT} srcSet={desktopSrcSet} />
            {/*
              fetchPriority="low": el pop-up aparece tras la hidratación, pero su
              imagen (~130 KB) competía por ancho de banda con el hero de la home,
              que es el elemento LCP. Con prioridad baja el navegador sirve
              primero el hero y el modal se pinta unos milisegundos después.
            */}
            {/* eslint-disable-next-line jsx-a11y/alt-text -- alt viene en imgProps */}
            <img {...imgProps} srcSet={mobileSrcSet} fetchPriority="low" className="w-full h-auto object-contain bg-white" />
          </picture>
        </Link>
      </div>
    </div>
  )
}
