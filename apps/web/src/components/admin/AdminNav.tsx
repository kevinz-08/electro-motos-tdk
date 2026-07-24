'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Package, Tag, ShoppingBag,
  AlertTriangle, Settings, RefreshCcw, Image, Ticket,
} from 'lucide-react'

const navItems = [
  { href: '/admin',               label: 'Dashboard',     Icon: LayoutDashboard },
  { href: '/admin/productos',     label: 'Productos',     Icon: Package },
  { href: '/admin/categorias',    label: 'Categorías',    Icon: Tag },
  { href: '/admin/banners',       label: 'Banners',       Icon: Image },
  { href: '/admin/cupones',       label: 'Cupones',       Icon: Ticket },
  { href: '/admin/pedidos',       label: 'Pedidos',       Icon: ShoppingBag },
  { href: '/admin/stock',         label: 'Stock bajo',    Icon: AlertTriangle },
  { href: '/admin/sync',          label: 'Sincronizar',   Icon: RefreshCcw },
  { href: '/admin/configuracion', label: 'Configuración', Icon: Settings },
]

export function AdminNav() {
  const pathname = usePathname()

  return (
    <nav className="flex-1 px-3 space-y-0.5">
      {navItems.map(({ href, label, Icon }) => {
        const isActive = href === '/admin' ? pathname === '/admin' : pathname.startsWith(href)
        return (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
              isActive
                ? 'bg-white/[0.07] text-white font-medium'
                : 'text-white/40 hover:text-white/70 hover:bg-white/[0.04]'
            }`}
          >
            <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-white/30'}`} />
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
