/**
 * Layout raíz de la tienda — aplicado a todas las rutas dentro del grupo (store).
 *
 * Incluye:
 *  - Header sticky con navegación, carrito y botón de sesión
 *  - Footer con info de contacto y categorías
 *
 * Comportamiento del header según rol:
 *  - Sin sesión    → botón "Ingresar" (SignInButton)
 *  - CUSTOMER      → link a /perfil con el primer nombre del usuario
 *  - ADMIN         → link a /admin (panel de administración)
 *
 * Es un Server Component: la sesión se lee en el servidor, sin waterfalls de cliente.
 */
import Link from 'next/link'
import { auth, signOut } from '@/lib/auth'
import { SignInButton } from '@/components/ui/SignInButton'

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()

  return (
    <>
      <header className="sticky top-0 z-50 bg-gray-900 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2 font-bold text-xl text-amber-400">
              <span>⚡</span>
              <span>Electro Motos Tony</span>
            </Link>

            <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
              <Link href="/catalogo" className="hover:text-amber-400 transition-colors">
                Catálogo
              </Link>
              <Link href="/catalogo?category=frenos" className="hover:text-amber-400 transition-colors">
                Frenos
              </Link>
              <Link href="/catalogo?category=motores" className="hover:text-amber-400 transition-colors">
                Motores
              </Link>
              <Link href="/catalogo?category=llantas" className="hover:text-amber-400 transition-colors">
                Llantas
              </Link>
            </nav>

            <div className="flex items-center gap-4">
              <Link
                href="/carrito"
                className="relative p-2 hover:text-amber-400 transition-colors"
                aria-label="Carrito de compras"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </Link>

              {session?.user ? (
                <div className="flex items-center gap-3">
                  <Link
                    href={
                      (session.user as typeof session.user & { role?: string }).role === 'ADMIN'
                        ? '/admin'
                        : '/perfil'
                    }
                    className="text-sm hover:text-amber-400 transition-colors"
                  >
                    {session.user.name?.split(' ')[0] ?? 'Mi cuenta'}
                  </Link>
                  <form
                    action={async () => {
                      'use server'
                      await signOut({ redirectTo: '/' })
                    }}
                  >
                    <button
                      type="submit"
                      className="text-xs text-gray-400 hover:text-red-400 transition-colors"
                    >
                      Salir
                    </button>
                  </form>
                </div>
              ) : (
                <SignInButton />
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="bg-gray-900 text-gray-400 py-10 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <h3 className="text-amber-400 font-bold text-lg mb-3">⚡ Electro Motos Tony</h3>
              <p className="text-sm">Taller especializado en repuestos y servicio técnico de motos en Colombia.</p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-3">Categorías</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/catalogo?category=frenos" className="hover:text-amber-400">Frenos</Link></li>
                <li><Link href="/catalogo?category=motores" className="hover:text-amber-400">Motores</Link></li>
                <li><Link href="/catalogo?category=llantas" className="hover:text-amber-400">Llantas</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-3">Contacto</h4>
              <ul className="space-y-2 text-sm">
                <li>📍 Colombia</li>
                <li>📞 +57 300 000 0000</li>
                <li>✉️ soporte@electromotos-tony.co</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm">
            <p>© {new Date().getFullYear()} Electro Motos Tony. Todos los derechos reservados.</p>
          </div>
        </div>
      </footer>
    </>
  )
}
