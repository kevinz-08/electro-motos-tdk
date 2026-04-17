'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import { CartIcon } from '@/components/ui/CartIcon'

// ─── Datos de categorías ──────────────────────────────────────────────────────
// Agregar nuevas categorías aquí para que aparezcan automáticamente en el dropdown.

const ALL_CATEGORIES = [
  { name: 'Frenos', slug: 'frenos' },
  { name: 'Motores', slug: 'motores' },
  { name: 'Llantas', slug: 'llantas' },
  { name: 'Aceites', slug: 'aceites' },
  { name: 'Accesorios', slug: 'accesorios' },
  { name: 'Sistema Eléctrico', slug: 'electrico' },
  { name: 'Repuestos', slug: 'repuestos' },
]

const TOP_CATEGORIES = [
  { name: 'Sistema Eléctrico', slug: 'electrico' },
  { name: 'Repuestos', slug: 'repuestos' },
  { name: 'Aceites', slug: 'aceites' },
  { name: 'Llantas', slug: 'llantas' },
  { name: 'Accesorios', slug: 'accesorios' },
]

// ─── Navbar ───────────────────────────────────────────────────────────────────

export function Navbar() {
  const { data: session } = useSession()
  const user = session?.user as ({ name?: string | null; email?: string | null; role?: string }) | undefined
  const isAdmin = user?.role === 'ADMIN'
  const firstName = user?.name?.split(' ')[0] ?? 'Mi cuenta'

  const pathname      = usePathname()
  const searchParams  = useSearchParams()
  const router        = useRouter()
  const isCatalog     = pathname === '/catalogo' || pathname.startsWith('/catalogo')

  // Estado del buscador contextual del catálogo
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

  // Sincronizar campo si el usuario navega con back/forward
  useEffect(() => {
    setCatalogSearch(searchParams.get('search') ?? '')
  }, [searchParams])

  // Estados de apertura
  const [catOpen, setCatOpen] = useState(false)
  const [userOpen, setUserOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [mobileCatOpen, setMobileCatOpen] = useState(false)

  // Refs para cerrar al hacer click fuera
  const catRef = useRef<HTMLDivElement>(null)
  const userRef = useRef<HTMLDivElement>(null)
  const catLeaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (catRef.current && !catRef.current.contains(e.target as Node)) setCatOpen(false)
      if (userRef.current && !userRef.current.contains(e.target as Node)) setUserOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Hover con pequeño delay para evitar cierre accidental
  const handleCatEnter = () => {
    if (catLeaveTimer.current) clearTimeout(catLeaveTimer.current)
    setCatOpen(true)
  }
  const handleCatLeave = () => {
    catLeaveTimer.current = setTimeout(() => setCatOpen(false), 120)
  }

  // ── Layout especial para el catálogo ─────────────────────────────────────
  if (isCatalog) {
    return (
      <header className="sticky top-0 z-50 bg-black border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4 h-16">

            {/* Logo */}
            <Link href="/" className="shrink-0">
              <Image src="/assets/LogoPage.png" alt="Electro Motos Tony" width={70} height={52} className="object-contain" priority />
            </Link>

            {/* Buscador centrado — ocupa el espacio restante */}
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
              {/* Mi cuenta */}
              <div ref={userRef} className="relative">
                <button
                  onClick={() => setUserOpen((v) => !v)}
                  className="flex items-center gap-1.5 px-3 py-2 text-white/70 hover:text-white hover:bg-white/5 rounded-lg transition-colors text-sm"
                  aria-label="Mi cuenta"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span className="hidden sm:inline text-xs font-medium">{firstName}</span>
                </button>

                {userOpen && (
                  <div className="absolute top-full right-0 mt-2 w-56 bg-[#111] border border-white/10 rounded-xl shadow-2xl overflow-hidden">
                    {session?.user ? (
                      <>
                        <div className="px-4 py-3 border-b border-white/10">
                          <p className="text-sm font-semibold text-white truncate">{firstName}</p>
                          <p className="text-xs text-white/40 truncate">{user?.email}</p>
                        </div>
                        <div className="p-1.5 space-y-0.5">
                          <Link href={isAdmin ? '/admin' : '/perfil'} className="flex items-center gap-2 px-3 py-2 text-sm text-white/70 hover:text-white hover:bg-white/5 rounded-lg transition-colors" onClick={() => setUserOpen(false)}>Mi cuenta</Link>
                          <Link href="/pedidos" className="flex items-center gap-2 px-3 py-2 text-sm text-white/70 hover:text-white hover:bg-white/5 rounded-lg transition-colors" onClick={() => setUserOpen(false)}>Mis pedidos</Link>
                          <div className="my-1 border-t border-white/10" />
                          <button onClick={() => { signOut({ callbackUrl: '/' }); setUserOpen(false) }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 rounded-lg transition-colors">Cerrar sesión</button>
                        </div>
                      </>
                    ) : (
                      <div className="p-1.5 space-y-0.5">
                        <Link href="/auth/register" className="flex items-center gap-2 px-3 py-2 text-sm text-white/70 hover:text-white hover:bg-white/5 rounded-lg transition-colors" onClick={() => setUserOpen(false)}>Crear cuenta</Link>
                        <Link href="/auth/login" className="flex items-center gap-2 px-3 py-2 text-sm font-semibold text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors" onClick={() => setUserOpen(false)}>Iniciar sesión</Link>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Carrito */}
              <CartIcon />
            </div>

          </div>
        </div>
      </header>
    )
  }

  // ── Layout estándar (resto de páginas) ────────────────────────────────────
  return (
    <header className="sticky top-0 z-50 bg-black border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-3 items-center h-16">

          {/* ── Col 1: Logo (izquierda) ── */}
          <div className="flex items-center">
            <Link href="/" className="">
              <Image
                src="/assets/LogoPage.png"
                alt="Electro Motos Tony"
                width={80}
                height={60}
                className="object-contain"
                priority
              />
            </Link>
          </div>

          {/* ── Col 2: Nav links (centro absoluto) ── */}
          <nav className="hidden md:flex items-center justify-center gap-1">

            {/* Dropdown Categorías */}
            <div
              ref={catRef}
              className="relative"
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

              {catOpen && (
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-[480px] bg-[#111] border border-white/10 rounded-xl shadow-2xl overflow-hidden">
                  <div className="px-5 py-3 border-b border-white/10 flex items-center justify-between">
                    <span className="text-xs text-white/40 uppercase tracking-widest font-semibold">Explorar</span>
                    <Link
                      href="/catalogo"
                      className="text-sm font-semibold text-blue-400 hover:text-blue-300 transition-colors"
                      onClick={() => setCatOpen(false)}
                    >
                      Todas las categorías →
                    </Link>
                  </div>

                  <div className="grid grid-cols-2 divide-x divide-white/10">
                    <div className="p-4">
                      <p className="text-xs text-white/30 uppercase tracking-widest mb-2 font-semibold px-3">Categorías</p>
                      <ul className="space-y-0.5">
                        {ALL_CATEGORIES.map((cat) => (
                          <li key={cat.slug}>
                            <Link
                              href={`/catalogo?category=${cat.slug}`}
                              className="block px-3 py-2 text-sm text-white/70 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                              onClick={() => setCatOpen(false)}
                            >
                              {cat.name}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="p-4">
                      <p className="text-xs text-white/30 uppercase tracking-widest mb-2 font-semibold px-3">Más buscadas</p>
                      <ul className="space-y-0.5">
                        {TOP_CATEGORIES.map((cat) => (
                          <li key={cat.slug}>
                            <Link
                              href={`/catalogo?category=${cat.slug}`}
                              className="flex items-center gap-2.5 px-3 py-2 text-sm text-white/70 hover:text-blue-400 hover:bg-blue-500/5 rounded-lg transition-colors group"
                              onClick={() => setCatOpen(false)}
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0 group-hover:bg-blue-400 transition-colors" />
                              {cat.name}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Catálogo */}
            <Link
              href="/catalogo"
              className="px-4 py-2 text-sm font-medium tracking-wide text-white/80 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
            >
              Catálogo
            </Link>

            {/* Contáctanos — pendiente implementar */}
            {/* <Link href="/contacto" className="px-4 py-2 text-sm font-medium tracking-wide text-white/80 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
              Contáctanos
            </Link> */}
            <button
              disabled
              className="px-4 py-2 text-sm font-medium tracking-wide text-white/25 cursor-not-allowed rounded-lg"
              title="Próximamente"
            >
              Contáctanos
            </button>
          </nav>

          {/* ── Col 3: Iconos (derecha) ── */}
          <div className="flex items-center justify-end gap-1">

            {/* Búsqueda */}
            <button
              className="p-2 text-white/70 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
              aria-label="Buscar producto"
              title="Búsqueda próximamente"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>

            {/* Cuenta de usuario */}
            <div ref={userRef} className="relative">
              <button
                onClick={() => setUserOpen((v) => !v)}
                className="p-2 text-white/70 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                aria-label="Mi cuenta"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </button>

              {userOpen && (
                <div className="absolute top-full right-0 mt-2 w-56 bg-[#111] border border-white/10 rounded-xl shadow-2xl overflow-hidden">
                  {session?.user ? (
                    <>
                      <div className="px-4 py-3 border-b border-white/10">
                        <p className="text-sm font-semibold text-white truncate">{firstName}</p>
                        <p className="text-xs text-white/40 truncate">{user?.email}</p>
                      </div>
                      <div className="p-1.5 space-y-0.5">
                        <Link
                          href={isAdmin ? '/admin' : '/perfil'}
                          className="flex items-center gap-2 px-3 py-2 text-sm text-white/70 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                          onClick={() => setUserOpen(false)}
                        >
                          Mi cuenta
                        </Link>
                        <Link
                          href="/pedidos"
                          className="flex items-center gap-2 px-3 py-2 text-sm text-white/70 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                          onClick={() => setUserOpen(false)}
                        >
                          Mis pedidos
                        </Link>
                        <Link
                          href="/catalogo"
                          className="flex items-center gap-2 px-3 py-2 text-sm text-white/70 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                          onClick={() => setUserOpen(false)}
                        >
                          Realizar un pedido
                        </Link>
                        <div className="my-1 border-t border-white/10" />
                        <button
                          onClick={() => { signOut({ callbackUrl: '/' }); setUserOpen(false) }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                        >
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
              )}
            </div>

            {/* Carrito — funcionalidad intacta */}
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
              <svg
                className={`w-4 h-4 transition-transform duration-200 ${mobileCatOpen ? 'rotate-180' : ''}`}
                fill="none" stroke="currentColor" viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {mobileCatOpen && (
              <div className="mt-1 ml-3 space-y-0.5">
                <Link
                  href="/catalogo"
                  className="block px-3 py-2 text-sm font-semibold text-blue-400 hover:bg-white/5 rounded-lg transition-colors"
                  onClick={() => setMobileOpen(false)}
                >
                  Todas las categorías →
                </Link>
                {ALL_CATEGORIES.map((cat) => (
                  <Link
                    key={cat.slug}
                    href={`/catalogo?category=${cat.slug}`}
                    className="block px-3 py-2 text-sm text-white/60 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                    onClick={() => setMobileOpen(false)}
                  >
                    {cat.name}
                  </Link>
                ))}
              </div>
            )}
          </div>

          <Link
            href="/catalogo"
            className="block px-3 py-2.5 text-sm font-medium text-white hover:bg-white/5 rounded-lg transition-colors"
            onClick={() => setMobileOpen(false)}
          >
            Catálogo
          </Link>

          <button
            disabled
            className="w-full text-left px-3 py-2.5 text-sm font-medium text-white/25 cursor-not-allowed rounded-lg"
          >
            Contáctanos (próximamente)
          </button>
        </div>
      )}
    </header>
  )
}
