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
import Image from 'next/image'
import { auth, signOut } from '@/lib/auth'
import { SignInButton } from '@/components/ui/SignInButton'
import { CartIcon } from '@/components/ui/CartIcon'
import { WhatsAppButton } from '@/components/ui/WhatsAppButton'

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()

  return (
    <>
      <header className="sticky top-0 z-50 bg-black text-white shadow-lg border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2">
              <Image
                src="/assets/logo.png"
                alt="Electro Motos Tony"
                width={80}
                height={60}
                className="object-contain"
                priority
              />
            </Link>

            <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-white">
              <Link href="/catalogo" className="hover:text-blue-400 transition-colors">
                Catálogo
              </Link>
              <Link href="/catalogo?category=frenos" className="hover:text-blue-400 transition-colors">
                Frenos
              </Link>
              <Link href="/catalogo?category=motores" className="hover:text-blue-400 transition-colors">
                Motores
              </Link>
              <Link href="/catalogo?category=llantas" className="hover:text-blue-400 transition-colors">
                Llantas
              </Link>
            </nav>

            <div className="flex items-center gap-4">
              <CartIcon />

              {session?.user ? (
                <div className="flex items-center gap-3">
                  <Link
                    href={
                      (session.user as typeof session.user & { role?: string }).role === 'ADMIN'
                        ? '/admin'
                        : '/perfil'
                    }
                    className="text-sm text-white hover:text-blue-400 transition-colors"
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
                      className="text-xs text-white/50 hover:text-red-400 transition-colors"
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
      <WhatsAppButton />

      <footer className="bg-black text-white/60 py-10 mt-16 border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <Image src="/assets/logo.png" alt="Electro Motos Tony" width={120} height={34} className="object-contain mb-3" />
              <p className="text-sm">Taller especializado en repuestos y servicio técnico de motos en Colombia.</p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-3">Categorías</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/catalogo?category=frenos" className="hover:text-blue-400 transition-colors">Frenos</Link></li>
                <li><Link href="/catalogo?category=motores" className="hover:text-blue-400 transition-colors">Motores</Link></li>
                <li><Link href="/catalogo?category=llantas" className="hover:text-blue-400 transition-colors">Llantas</Link></li>
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
          <div className="border-t border-white/10 mt-8 pt-8 text-center text-sm">
            <p>© {new Date().getFullYear()} Electro Motos Tony. Todos los derechos reservados.</p>
          </div>
        </div>
      </footer>
    </>
  )
}
