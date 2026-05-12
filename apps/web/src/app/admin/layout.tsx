import Link from 'next/link'
import type { Metadata } from 'next'
import { auth, signOut } from '@/lib/auth'
import { redirect } from 'next/navigation'

export const metadata: Metadata = {
  title: {
    default: 'Panel Admin',
    template: '%s · Admin | H2R Online Store',
  },
  description: 'Panel administrativo de H2R Online Store.',
  robots: { index: false, follow: false },
}

const navItems = [
  { href: '/admin', label: 'Dashboard', icon: '📊' },
  { href: '/admin/productos', label: 'Productos', icon: '🏍️' },
  { href: '/admin/categorias', label: 'Categorías', icon: '🗂️' },
  { href: '/admin/pedidos', label: 'Pedidos', icon: '📦' },
  { href: '/admin/stock', label: 'Stock bajo', icon: '⚠️' },
  { href: '/admin/configuracion', label: 'Configuración', icon: '⚙️' },
]

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  const user = session?.user as ({ role?: string } & NonNullable<typeof session>['user'])

  if (!session?.user || user.role !== 'ADMIN') redirect('/')

  return (
    <div className="flex h-screen bg-black">

      {/* Sidebar */}
      <aside className="w-64 bg-[#0a0a0a] border-r border-white/10 flex flex-col shrink-0">
        <div className="p-5 border-b border-white/10">
          <Link href="/" className="text-white font-bold text-base hover:text-blue-400 transition-colors">
            Electro Motos Tony
          </Link>
          <p className="text-white/30 text-xs mt-1">Panel Admin</p>
        </div>

        <nav className="flex-1 p-3 space-y-0.5">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-white/60 hover:text-white hover:bg-white/5 transition-colors"
            >
              <span className="text-base">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-white/10 space-y-3">
          <p className="text-xs text-white/30 truncate">{session.user?.email}</p>
          <Link href="/" className="text-xs text-blue-400 hover:text-blue-300 transition-colors block">
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
              className="text-xs text-white/30 hover:text-red-400 transition-colors"
            >
              Cerrar sesión
            </button>
          </form>
        </div>
      </aside>

      {/* Contenido */}
      <div className="flex-1 overflow-auto bg-black">
        <main className="p-8">{children}</main>
      </div>

    </div>
  )
}
