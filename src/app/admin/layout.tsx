/**
 * Layout del panel de administración.
 *
 * Doble verificación de rol ADMIN (proxy.ts + este layout):
 *  - proxy.ts (src/proxy.ts) rechaza en el borde de red (antes de renderizar)
 *  - Este layout verifica nuevamente en el servidor como defensa en profundidad
 *
 * Si el usuario no tiene sesión o no es ADMIN, redirige a '/'.
 * El sidebar muestra el email del admin y un link para volver a la tienda.
 */
import Link from 'next/link'
import { auth, signOut } from '@/lib/auth'
import { redirect } from 'next/navigation'

const navItems = [
  { href: '/admin', label: 'Dashboard', icon: '📊' },
  { href: '/admin/productos', label: 'Productos', icon: '🏍️' },
  { href: '/admin/pedidos', label: 'Pedidos', icon: '📦' },
  { href: '/admin/stock', label: 'Stock bajo', icon: '⚠️' },
  { href: '/admin/configuracion', label: 'Configuración', icon: '⚙️' },
]

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  const user = session?.user as ({ role?: string } & NonNullable<typeof session>['user'])

  if (!session?.user || user.role !== 'ADMIN') redirect('/')

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-900 text-white flex flex-col">
        <div className="p-5 border-b border-gray-800">
          <Link href="/" className="text-amber-400 font-bold text-lg">
            ⚡ Electro Motos Tony
          </Link>
          <p className="text-gray-500 text-xs mt-1">Panel Admin</p>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-800 space-y-2">
          <p className="text-xs text-gray-500 truncate">{session.user?.email}</p>
          <Link href="/" className="text-xs text-amber-400 hover:underline block">
            ← Ver tienda
          </Link>
          <form
            action={async () => {
              'use server'
              await signOut({ redirectTo: '/auth/login' })
            }}
          >
            <button
              type="submit"
              className="text-xs text-gray-500 hover:text-red-400 transition-colors"
            >
              Cerrar sesión
            </button>
          </form>
        </div>
      </aside>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        <main className="p-8">{children}</main>
      </div>
    </div>
  )
}
