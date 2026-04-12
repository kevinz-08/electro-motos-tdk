import { prisma } from '@/infrastructure/database/prisma-client'
import { MercadoPagoToggle } from '@/components/admin/MercadoPagoToggle'

export default async function AdminConfigPage() {
  const mpSetting = await prisma.settings.findUnique({
    where: { key: 'MERCADOPAGO_ENABLED' },
  })

  const mpEnabled = mpSetting?.value === 'true'

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Configuración</h1>

      <div className="max-w-2xl space-y-6">
        {/* Pasarelas de pago */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="font-bold text-gray-900 mb-1">Pasarelas de pago</h2>
          <p className="text-sm text-gray-500 mb-6">
            Wompi es la pasarela principal y siempre está activa. Mercado Pago es el respaldo
            — actívalo solo si Wompi tiene incidentes.
          </p>

          <div className="space-y-4">
            {/* Wompi — siempre activo */}
            <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
              <div>
                <p className="font-semibold text-green-800">Wompi</p>
                <p className="text-xs text-green-600">
                  Pasarela principal · Tarjeta, Nequi, PSE, Bancolombia
                </p>
              </div>
              <span className="text-xs font-bold text-green-700 bg-green-100 px-3 py-1 rounded-full">
                Activo
              </span>
            </div>

            {/* Mercado Pago — toggle */}
            <div className="flex items-center justify-between p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <div>
                <p className="font-semibold text-gray-900">Mercado Pago</p>
                <p className="text-xs text-gray-500">
                  Pasarela de respaldo · Actívalo en caso de incidente en Wompi
                </p>
              </div>
              <MercadoPagoToggle enabled={mpEnabled} />
            </div>
          </div>
        </div>

        {/* Info del sistema */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="font-bold text-gray-900 mb-4">Sincronización con Optimun</h2>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <p className="text-sm text-amber-800">
              <span className="font-semibold">Fase 2</span> — La sincronización automática con
              Optimun está planificada para la próxima versión. Por ahora usa el importador CSV
              en la sección de Stock para actualizar inventario manualmente.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
