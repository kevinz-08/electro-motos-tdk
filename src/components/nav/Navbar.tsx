'use client'

/**
 * Navbar — barra de navegación principal.
 *
 * ── Corrección de bug (sesión perdida tras 404) ─────────────────────────────
 * El Navbar vive dentro de un <Suspense> (requerido por useSearchParams).
 * Al navegar a una ruta inexistente (/perfil) y volver con Atrás, el boundary
 * suspende brevemente y el componente remonta desde cero.  En ese intervalo
 * useSession() parte de status:"loading" → session=null → firstName="Mi cuenta"
 * y los event-handlers aún no están conectados.
 *
 * Dos correcciones:
 *   1. Cachear el firstName en sessionStorage.  Al remontar, el useEffect
 *      lee el valor guardado → no hay flash de "Mi cuenta".
 *   2. Reemplazar el link a /perfil (ruta inexistente) por ProfileModal.
 *      Esto elimina la fuente del 404 y evita que el ciclo se repita.
 *
 * ── Layouts ─────────────────────────────────────────────────────────────────
 *   isCatalog  → barra compacta con buscador central
 *   default    → barra completa con dropdown de categorías + nav links
 */
import { useState, useRef, useEffect, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import { CartIcon } from '@/components/ui/CartIcon'
import { ProfileModal } from '@/components/nav/ProfileModal'

// ─── Datos del mega menu ──────────────────────────────────────────────────────

const MEGA_MENU = [
  {
    name: 'Sistema Eléctrico', slug: 'sistema-electrico',
    children: [
      { name: 'Ramales',     slug: 'ramales' },
      { name: 'Reguladores', slug: 'reguladores' },
      { name: 'CDI',         slug: 'cdi' },
      { name: 'Baterías',    slug: 'baterias' },
      { name: 'Estatores',   slug: 'estatores' },
      { name: 'Bobinas',     slug: 'bobinas' },
      { name: 'Sensores',     slug: 'sensores' },
    ],
  },
  {
    name: 'Repuestos', slug: 'repuestos',
    children: [
      { name: 'Filtro de Aire',  slug: 'filtro-de-aire' },
      { name: 'Bujías',          slug: 'bujias' },
      { name: 'Conectores',      slug: 'conectores' },
      { name: 'Frenos',          slug: 'frenos' },
      { name: 'Repuestos Motor', slug: 'repuestos-motor' },
    ],
  },
  {
    name: 'Aceites', slug: 'aceites',
    children: [
      { name: 'Liquimoly', slug: 'liquimoly' },
      { name: 'SKY',       slug: 'sky' },
    ],
  },
  {
    name: 'Llantas', slug: 'llantas',
    children: [],
  },
  {
    name: 'Accesorios', slug: 'accesorios',
    children: [
      { name: 'Espejos',       slug: 'espejos' },
      { name: 'Exploradores',  slug: 'exploradores' },
      { name: 'Bombillas LED', slug: 'bombillas-led' },
      { name: 'Equipamiento',  slug: 'equipamiento' },
      { name: 'Objetivo',      slug: 'objetivo' },
    ],
  },
]

// Alias planos para el menú móvil
const ALL_CATEGORIES = MEGA_MENU.map(({ name, slug }) => ({ name, slug }))

const SESSION_KEY = 'tdk-user-firstname'

// ─── Navbar ───────────────────────────────────────────────────────────────────

export function Navbar() {
  const { data: session, status } = useSession()
  const user = session?.user as
    | { name?: string | null; email?: string | null; role?: string }
    | undefined
  const isAdmin = user?.role === 'ADMIN'

  // ── Corrección: caché del nombre en sessionStorage ────────────────────────
  // Arranca con "Mi cuenta" para evitar mismatch SSR/cliente.
  // En el primer useEffect del cliente carga el valor cacheado,
  // y cuando la sesión resuelve actualiza el caché para futuros remounts.
  const [cachedName, setCachedName] = useState<string>('Mi cuenta')

  useEffect(() => {
    const saved = sessionStorage.getItem(SESSION_KEY)
    if (saved) setCachedName(saved)
  }, [])

  useEffect(() => {
    const name = user?.name?.split(' ')[0]
    if (name) {
      setCachedName(name)
      sessionStorage.setItem(SESSION_KEY, name)
    }
  }, [user?.name])

  // Durante "loading" usar el nombre cacheado → evita flash de "Mi cuenta"
  const firstName = status === 'loading'
    ? cachedName
    : (user?.name?.split(' ')[0] ?? cachedName)

  // ── Navegación y buscador ─────────────────────────────────────────────────
  const pathname     = usePathname()
  const searchParams = useSearchParams()
  const router       = useRouter()
  const isCatalog    = pathname === '/catalogo' || pathname.startsWith('/catalogo')

  const [catalogSearch, setCatalogSearch] = useState(searchParams.get('search') ?? '')

  const handleCatalogSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const params = new URLSearchParams(searchParams.toString())
    if (catalogSearch.trim()) {
      params.set('search', catalogSearch.trim())
    } else {
      params.delete('search')
    }
    params.delete('page')
    router.push(`/catalogo?${params.toString()}`)
  }

  useEffect(() => {
    setCatalogSearch(searchParams.get('search') ?? '')
  }, [searchParams])

  // ── Estados de UI ─────────────────────────────────────────────────────────
  const [catOpen,       setCatOpen]      = useState(false)
  const [userOpen,      setUserOpen]     = useState(false)
  const [profileOpen,   setProfileOpen]  = useState(false)
  const [mobileOpen,    setMobileOpen]   = useState(false)
  const [mobileCatOpen, setMobileCatOpen] = useState(false)

  // Cerrar dropdowns al cambiar de ruta
  useEffect(() => {
    setCatOpen(false)
    setUserOpen(false)
    setMobileOpen(false)
  }, [pathname])

  // ── Click fuera → cerrar dropdowns ────────────────────────────────────────
  // panelRef apunta al panel del mega menu para que el mousedown al hacer clic
  // en un link dentro del panel NO cierre el menú antes de que dispare el click.
  const catRef   = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const userRef  = useRef<HTMLDivElement>(null)
  const catLeaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleClickOutside = useCallback((e: MouseEvent) => {
    const t = e.target as Node
    const inCatTrigger = catRef.current?.contains(t)
    const inCatPanel   = panelRef.current?.contains(t)
    if (!inCatTrigger && !inCatPanel) setCatOpen(false)
    if (userRef.current && !userRef.current.contains(t)) setUserOpen(false)
  }, [])

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [handleClickOutside])

  const handleCatEnter = () => {
    if (catLeaveTimer.current) clearTimeout(catLeaveTimer.current)
    setCatOpen(true)
  }
  const handleCatLeave = () => {
    catLeaveTimer.current = setTimeout(() => setCatOpen(false), 120)
  }

  const openProfile = useCallback(() => {
    setUserOpen(false)
    setProfileOpen(true)
  }, [])

  // ── Iniciales para el mini-avatar ─────────────────────────────────────────
  const initials = (user?.name ?? firstName)
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('') || 'U'

  // ─────────────────────────────────────────────────────────────────────────
  // Dropdown de usuario reutilizado en ambos layouts
  // ─────────────────────────────────────────────────────────────────────────
  function UserDropdown() {
    return (
      <div className="absolute top-full right-0 mt-2 w-56 bg-[#111] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50">
        {session?.user ? (
          <>
            {/* Cabecera clicable → abre modal de perfil */}
            <button
              onClick={openProfile}
              className="w-full text-left px-4 py-3 border-b border-white/10 hover:bg-white/5 transition-colors group"
            >
              <p className="text-sm font-semibold text-white truncate group-hover:text-blue-400 transition-colors">
                {firstName}
              </p>
              <p className="text-xs text-white/40 truncate">{user?.email}</p>
            </button>

            <div className="p-1.5 space-y-0.5">
              {/* Mi cuenta → modal (sin navegar a /perfil) */}
              <button
                onClick={openProfile}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-white/70 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
              >
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Mi cuenta
              </button>

              <Link
                href="/pedidos"
                className="flex items-center gap-2 px-3 py-2 text-sm text-white/70 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                onClick={() => setUserOpen(false)}
              >
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                Mis pedidos
              </Link>

              {isAdmin && (
                <Link
                  href="/admin"
                  className="flex items-center gap-2 px-3 py-2 text-sm text-white/70 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                  onClick={() => setUserOpen(false)}
                >
                  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Panel admin
                </Link>
              )}

              <div className="my-1 border-t border-white/10" />
              <button
                onClick={() => { signOut({ callbackUrl: '/' }); setUserOpen(false) }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
              >
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Cerrar sesión
              </button>
            </div>
          </>
        ) : (
          <div className="p-1.5 space-y-0.5">
            <Link
              href="/auth/register"
              className="flex items-center gap-2 px-3 py-2 text-sm text-white/70 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
              onClick={() => setUserOpen(false)}
            >
              Crear cuenta
            </Link>
            <Link
              href="/auth/login"
              className="flex items-center gap-2 px-3 py-2 text-sm font-semibold text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"
              onClick={() => setUserOpen(false)}
            >
              Iniciar sesión
            </Link>
          </div>
        )}
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Layout catálogo
  // ─────────────────────────────────────────────────────────────────────────
  if (isCatalog) {
    return (
      <>
        <header className="sticky top-0 z-50 bg-black border-b border-white/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-4 h-16">

              {/* Logo */}
              <Link href="/" className="shrink-0">
                <Image src="/assets/LogoPage.png" alt="Electro Motos Tony" width={70} height={52} className="object-contain" priority />
              </Link>

              {/* Buscador central */}
              <form onSubmit={handleCatalogSearch} className="flex-1 flex items-center max-w-2xl mx-auto">
                <div className="flex w-full rounded-full overflow-hidden border border-white/15 bg-white/5 focus-within:border-white/30 transition-colors">
                  <input
                    type="text"
                    value={catalogSearch}
                    onChange={(e) => setCatalogSearch(e.target.value)}
                    placeholder="Buscar productos..."
                    className="flex-1 bg-transparent text-white placeholder-white/35 text-sm px-5 py-2.5 focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="shrink-0 bg-white/10 hover:bg-white/20 transition-colors px-5 flex items-center justify-center"
                    aria-label="Buscar"
                  >
                    <svg className="w-4 h-4 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </button>
                </div>
              </form>

              {/* Iconos derecha */}
              <div className="shrink-0 flex items-center gap-1">
                <div ref={userRef} className="relative">
                  <button
                    onClick={() => setUserOpen((v) => !v)}
                    className="flex items-center gap-1.5 px-3 py-2 text-white/70 hover:text-white hover:bg-white/5 rounded-lg transition-colors text-sm"
                    aria-label="Mi cuenta"
                    aria-expanded={userOpen}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <span className="hidden sm:inline text-xs font-medium">{firstName}</span>
                  </button>
                  {userOpen && <UserDropdown />}
                </div>
                <CartIcon />
              </div>
            </div>
          </div>
        </header>

        {/* Modal de perfil — fuera del <header> para evitar conflictos de z-index/overflow */}
        <ProfileModal isOpen={profileOpen} onClose={() => setProfileOpen(false)} user={user} />
      </>
    )
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Layout estándar
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <>
      <header className="sticky top-0 z-50 bg-black/50 backdrop-blur-md border-b border-white/10 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-3 items-center h-16">

            {/* ── Col 1: Logo ── */}
            <div className="flex items-center">
              <Link href="/">
                <Image src="/assets/LogoPage.png" alt="Electro Motos Tony" width={80} height={60} className="object-contain" priority />
              </Link>
            </div>

            {/* ── Col 2: Nav links (centro) ── */}
            <nav className="hidden md:flex items-center justify-center gap-1">

              {/* Mega menu Categorías */}
              <div
                ref={catRef}
                onMouseEnter={handleCatEnter}
                onMouseLeave={handleCatLeave}
              >
                <button className="flex items-center gap-1 px-4 py-2 text-sm font-medium tracking-wide text-white/80 hover:text-white transition-colors rounded-lg hover:bg-white/5">
                  Categorías
                  <svg
                    className={`w-3 h-3 transition-transform duration-200 ${catOpen ? 'rotate-180' : ''}`}
                    fill="none" stroke="currentColor" viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>

              <Link href="/catalogo" className="px-4 py-2 text-sm font-medium tracking-wide text-white/80 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
                Catálogo
              </Link>

              <button disabled className="px-4 py-2 text-sm font-medium tracking-wide text-white/25 cursor-not-allowed rounded-lg" title="Próximamente">
                Contáctanos
              </button>
            </nav>

            {/* ── Col 3: Iconos (derecha) ── */}
            <div className="flex items-center justify-end gap-1">

              {/* Búsqueda */}
              <button className="p-2 text-white/70 hover:text-white hover:bg-white/5 rounded-lg transition-colors" aria-label="Buscar producto" title="Búsqueda próximamente">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>

              {/* Cuenta */}
              <div ref={userRef} className="relative">
                <button
                  onClick={() => setUserOpen((v) => !v)}
                  className="p-2 text-white/70 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                  aria-label="Mi cuenta"
                  aria-expanded={userOpen}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </button>
                {userOpen && <UserDropdown />}
              </div>

              <CartIcon />

              {/* Hamburger móvil */}
              <button
                className="md:hidden p-2 text-white/70 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                onClick={() => setMobileOpen((v) => !v)}
                aria-label="Abrir menú"
              >
                {mobileOpen ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                )}
              </button>
            </div>

          </div>
        </div>

        {/* ── Mega menu desktop (full-width, dentro del header sticky) ── */}
        {catOpen && (
          <div
            ref={panelRef}
            onMouseEnter={handleCatEnter}
            onMouseLeave={handleCatLeave}
            className="hidden md:block absolute top-full left-0 right-0 w-full bg-[#0d0d0d] border-t border-white/10 shadow-2xl z-50"
          >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

              {/* Cabecera del mega menu */}
              <div className="flex items-center justify-between mb-7">
                <p className="text-[11px] font-bold text-white/30 uppercase tracking-[0.2em]">Categorías</p>
                <Link
                  href="/catalogo"
                  className="text-xs font-semibold text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1"
                  onClick={() => setCatOpen(false)}
                >
                  Ver catálogo completo
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>

              {/* Columnas — una por categoría padre */}
              <div className="grid grid-cols-5 gap-6">
                {MEGA_MENU.map((parent) => (
                  <div key={parent.slug}>
                    {/* Título padre */}
                    <Link
                      href={`/catalogo?category=${parent.slug}`}
                      onClick={() => setCatOpen(false)}
                      className="group block mb-3"
                    >
                      <span className="text-base font-bold text-white group-hover:text-blue-400 transition-colors leading-tight">
                        {parent.name}
                      </span>
                      {/* Línea subrayado animada */}
                      <span className="block mt-1 h-px w-8 bg-blue-500/50 group-hover:w-full transition-all duration-300 ease-out" />
                    </Link>

                    {/* Subcategorías */}
                    {parent.children.length > 0 ? (
                      <ul className="space-y-1.5">
                        {parent.children.map((child) => (
                          <li key={child.slug}>
                            <Link
                              href={`/catalogo?category=${child.slug}`}
                              onClick={() => setCatOpen(false)}
                              className="text-sm text-white/50 hover:text-white/90 transition-colors leading-snug"
                            >
                              {child.name}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs text-white/25 italic">Próximamente</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Menú móvil ── */}
        {mobileOpen && (
          <div className="md:hidden border-t border-white/10 bg-[#0a0a0a] px-4 py-3 space-y-1">

            {/* Categorías con acordeón */}
            <div>
              <button
                onClick={() => setMobileCatOpen((v) => !v)}
                className="w-full flex items-center justify-between px-3 py-2.5 text-sm font-medium text-white hover:bg-white/5 rounded-lg transition-colors"
              >
                Categorías
                <svg className={`w-4 h-4 transition-transform duration-200 ${mobileCatOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {mobileCatOpen && (
                <div className="mt-1 ml-3 space-y-3 pb-1">
                  <Link href="/catalogo" className="block px-3 py-2 text-sm font-semibold text-blue-400 hover:bg-white/5 rounded-lg transition-colors" onClick={() => setMobileOpen(false)}>
                    Ver todo el catálogo →
                  </Link>
                  {MEGA_MENU.map((parent) => (
                    <div key={parent.slug}>
                      <Link
                        href={`/catalogo?category=${parent.slug}`}
                        className="block px-3 py-1.5 text-sm font-semibold text-white hover:text-blue-400 transition-colors"
                        onClick={() => setMobileOpen(false)}
                      >
                        {parent.name}
                      </Link>
                      {parent.children.length > 0 && (
                        <div className="ml-3 mt-0.5 space-y-0.5 border-l border-white/10 pl-3">
                          {parent.children.map((child) => (
                            <Link
                              key={child.slug}
                              href={`/catalogo?category=${child.slug}`}
                              className="block px-2 py-1 text-xs text-white/50 hover:text-white/90 transition-colors"
                              onClick={() => setMobileOpen(false)}
                            >
                              {child.name}
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Link href="/catalogo" className="block px-3 py-2.5 text-sm font-medium text-white hover:bg-white/5 rounded-lg transition-colors" onClick={() => setMobileOpen(false)}>
              Catálogo
            </Link>

            {/* Cuenta en móvil */}
            {session?.user ? (
              <>
                <div className="border-t border-white/10 pt-2 mt-2">
                  <button
                    onClick={() => { setMobileOpen(false); setProfileOpen(true) }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-white hover:bg-white/5 rounded-lg transition-colors"
                  >
                    <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                      {initials}
                    </div>
                    <div className="text-left min-w-0">
                      <p className="font-semibold text-white truncate">{firstName}</p>
                      <p className="text-xs text-white/40 truncate">{user?.email}</p>
                    </div>
                  </button>
                </div>
                <button
                  onClick={() => { signOut({ callbackUrl: '/' }); setMobileOpen(false) }}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                >
                  Cerrar sesión
                </button>
              </>
            ) : (
              <div className="border-t border-white/10 pt-2 mt-2 space-y-0.5">
                <Link href="/auth/login" className="block px-3 py-2.5 text-sm font-semibold text-blue-400 hover:bg-white/5 rounded-lg transition-colors" onClick={() => setMobileOpen(false)}>
                  Iniciar sesión
                </Link>
                <Link href="/auth/register" className="block px-3 py-2.5 text-sm text-white/70 hover:bg-white/5 rounded-lg transition-colors" onClick={() => setMobileOpen(false)}>
                  Crear cuenta
                </Link>
              </div>
            )}

            <button disabled className="w-full text-left px-3 py-2.5 text-sm font-medium text-white/25 cursor-not-allowed rounded-lg">
              Contáctanos (próximamente)
            </button>
          </div>
        )}
      </header>

      {/* Modal de perfil — fuera del <header> para evitar conflictos de z-index/overflow */}
      <ProfileModal isOpen={profileOpen} onClose={() => setProfileOpen(false)} user={user} />
    </>
  )
}
