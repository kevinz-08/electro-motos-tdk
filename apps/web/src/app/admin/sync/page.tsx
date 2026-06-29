import type { Metadata } from 'next'
import { SyncForm } from '@/components/admin/SyncForm'
import { AdminHelpButton } from '@/components/admin/AdminHelpButton'
import { syncHelpContent } from '@/components/admin/help-content/sync'

export const metadata: Metadata = { title: 'Sincronizar inventario' }

export default function AdminSyncPage() {
  return (
    <div>
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Sincronizar inventario</h1>
          <p className="text-sm text-white/40 mt-1">
            Actualiza el stock y precio de los productos de la tienda con el export de Optimun.
            Solo se modifican productos que ya existen en la tienda.
          </p>
        </div>
        <AdminHelpButton content={syncHelpContent} />
      </div>

      <div className="max-w-3xl">
        <SyncForm />
      </div>
    </div>
  )
}
