import Link from 'next/link'
import type { Metadata } from 'next'
import { auth, signOut } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { ArrowUpRight, LogOut } from 'lucide-react'
import { AdminNav } from '@/components/admin/AdminNav'

export const metadata: Metadata = {
  title: {
    default: 'Panel Admin',
    template: '%s · Admin | H2R Online Store',
  },
  description: 'Panel administrativo de H2R Online Store.',
  robots: { index: false, follow: false },
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  const user = session?.user as ({ role?: string } & NonNullable<typeof session>['user'])

  if (!session?.user || user.role !== 'ADMIN') redirect('/')

  const initials = session.user?.name
    ? session.user.name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
    : (session.user?.email?.[0] ?? 'A').toUpperCase()

  return (
    <div className="fixed inset-0 flex bg-[#080808] overflow-hidden">

      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <aside className="w-[220px] shrink-0 flex flex-col border-r border-white/[0.06]">

        {/* Brand */}
        <div className="px-6 pt-7 pb-6">
          <p className="text-[11px] font-semibold tracking-[0.18em] text-white/30 uppercase mb-1">
            Admin Panel
          </p>
          <Link href="/" className="text-white font-bold text-sm leading-tight hover:text-white/70 transition-colors">
            H2R Online Store
          </Link>
        </div>

        {/* Nav */}
        <AdminNav />

        {/* Footer */}
        <div className="px-4 py-5 border-t border-white/[0.06] space-y-4">
          {/* Avatar + email */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center shrink-0">
              <span className="text-[11px] font-bold text-white/70">{initials}</span>
            </div>
            <p className="text-xs text-white/30 truncate leading-tight">
              {session.user?.email}
            </p>
          </div>

          <div className="flex items-center justify-between">
            <Link
              href="/"
              className="flex items-center gap-1 text-xs text-white/30 hover:text-white/70 transition-colors"
            >
              Ver tienda
              <ArrowUpRight className="w-3 h-3" />
            </Link>

            <form action={async () => {
              'use server'
              await signOut({ redirectTo: '/auth/login' })
            }}>
              <button
                type="submit"
                className="flex items-center gap-1 text-xs text-white/30 hover:text-red-400 transition-colors"
              >
                <LogOut className="w-3 h-3" />
                Salir
              </button>
            </form>
          </div>
        </div>
      </aside>

      {/* ── Contenido ───────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-auto bg-[#080808]">
        <main className="p-8 max-w-[1400px] min-h-full">{children}</main>
      </div>
    </div>
  )
}
