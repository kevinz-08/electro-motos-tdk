'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Package, Tag, ShoppingBag,
  AlertTriangle, Settings, RefreshCcw, Image, Ticket, Trash2, Star, Megaphone, Boxes, UserCheck, Wrench, Bike, BookOpen, BarChart3, ShoppingCart,
} from 'lucide-react'

const navItems = [
  { href: '/admin',                           label: 'Dashboard',     Icon: LayoutDashboard },
  { href: '/admin/productos',                 label: 'Productos',     Icon: Package },
  { href: '/admin/productos/papelera',        label: 'Papelera',      Icon: Trash2 },
  { href: '/admin/categorias',                label: 'Categorías',    Icon: Tag },
  { href: '/admin/banners',                   label: 'Banners',       Icon: Image },
  { href: '/admin/promocion',                 label: 'Pop-up',        Icon: Megaphone },
  { href: '/admin/cupones',                   label: 'Cupones',       Icon: Ticket },
  { href: '/admin/compatibilidades',          label: 'Compatibilidades', Icon: Bike },
  { href: '/admin/kits',                      label: 'Kits',          Icon: Boxes },
  { href: '/admin/guias',                     label: 'Guías',         Icon: BookOpen },
  { href: '/admin/indice-precios',            label: 'Índice precios', Icon: BarChart3 },
  { href: '/admin/revisores',                 label: 'Revisores',     Icon: UserCheck },
  { href: '/admin/mantenimiento',             label: 'Mantenimiento', Icon: Wrench },
  { href: '/admin/merchant',                  label: 'Merchant Center', Icon: ShoppingCart },
  { href: '/admin/pedidos',                   label: 'Pedidos',       Icon: ShoppingBag },
  { href: '/admin/resenas',                   label: 'Reseñas',       Icon: Star },
  { href: '/admin/stock',                     label: 'Stock bajo',    Icon: AlertTriangle },
  { href: '/admin/sync',                      label: 'Sincronizar',   Icon: RefreshCcw },
  { href: '/admin/configuracion',             label: 'Configuración', Icon: Settings },
]

export function AdminNav() {
  const pathname = usePathname()
  const activeRef = useRef<HTMLAnchorElement>(null)

  // En pantallas bajas la sección activa puede quedar fuera de la vista del nav
  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: 'nearest' })
  }, [pathname])

  return (
    <nav className="flex-1 min-h-0 overflow-y-auto px-3 pb-3 space-y-0.5 [scrollbar-width:thin] [scrollbar-color:rgb(255_255_255/0.1)_transparent]">
      {navItems.map(({ href, label, Icon }) => {
        const isActive =
          href === '/admin'
            ? pathname === '/admin'
            : href === '/admin/productos'
            ? pathname.startsWith('/admin/productos') && !pathname.startsWith('/admin/productos/papelera')
            : pathname.startsWith(href)
        return (
          <Link
            key={href}
            href={href}
            ref={isActive ? activeRef : undefined}
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
