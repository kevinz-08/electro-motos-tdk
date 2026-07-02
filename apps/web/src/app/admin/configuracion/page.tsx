import { prisma } from '@/infrastructure/database/prisma-client'
import { MercadoPagoToggle } from '@/components/admin/MercadoPagoToggle'
import { CodToggle } from '@/components/admin/CodToggle'
import { ShippingOnlineToggle } from '@/components/admin/ShippingOnlineToggle'

export default async function AdminConfigPage() {
  const [mpSetting, codSetting, shippingOnlineSetting] = await Promise.all([
    prisma.settings.findUnique({ where: { key: 'MERCADOPAGO_ENABLED' } }),
    prisma.settings.findUnique({ where: { key: 'COD_ENABLED' } }),
    prisma.settings.findUnique({ where: { key: 'SHIPPING_ONLINE_ENABLED' } }),
  ])

  const mpEnabled = mpSetting?.value === 'true'
  // Por defecto habilitado si no existe la fila aún — mismo fallback que orders.controller.ts.
  const codEnabled = codSetting ? codSetting.value === 'true' : true
  const shippingOnlineEnabled = shippingOnlineSetting ? shippingOnlineSetting.value === 'true' : true

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-8">Configuración</h1>

      <div className="max-w-2xl space-y-6">

        {/* Pasarelas de pago */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
          <h2 className="font-bold text-white mb-1">Pasarelas de pago</h2>
          <p className="text-sm text-white/40 mb-6">
            Wompi es la pasarela principal y siempre está activa. Mercado Pago es el respaldo
            — actívalo solo si Wompi tiene incidentes.
          </p>

          <div className="space-y-3">
            {/* Wompi — siempre activo */}
            <div className="flex items-center justify-between p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
              <div>
                <p className="font-semibold text-white">Wompi</p>
                <p className="text-xs text-white/40">
                  Pasarela principal · Tarjeta, Nequi, PSE, Bancolombia
                </p>
              </div>
              <span className="text-xs font-bold text-green-400 bg-green-500/20 px-3 py-1 rounded-full">
                Activo
              </span>
            </div>

            {/* Mercado Pago — toggle */}
            <div className="flex items-center justify-between gap-4 p-4 bg-white/5 border border-white/10 rounded-lg">
              <div className="min-w-0">
                <p className="font-semibold text-white">Mercado Pago</p>
                <p className="text-xs text-white/40">
                  Pasarela de respaldo · Actívalo en caso de incidente en Wompi
                </p>
              </div>
              <MercadoPagoToggle enabled={mpEnabled} />
            </div>
          </div>
        </div>

        {/* Métodos de pago alternativos */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
          <h2 className="font-bold text-white mb-1">Pago contra entrega</h2>
          <p className="text-sm text-white/40 mb-6">
            Si lo desactivas, los clientes dejan de ver la opción en el checkout — no se borra
            ninguna funcionalidad, solo deja de ofrecerse hasta que lo reactives.
          </p>

          <div className="flex items-center justify-between gap-4 p-4 bg-white/5 border border-white/10 rounded-lg">
            <div className="min-w-0">
              <p className="font-semibold text-white">Pago contra entrega (COD)</p>
              <p className="text-xs text-white/40">
                El cliente paga en efectivo al repartidor de Vendelo al recibir su pedido
              </p>
            </div>
            <CodToggle enabled={codEnabled} />
          </div>
        </div>

        {/* Flete de pedidos pagados en línea */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
          <h2 className="font-bold text-white mb-1">Flete de pedidos pagados en línea</h2>
          <p className="text-sm text-white/40 mb-6">
            Aplica solo a pedidos pagados por Wompi/Mercado Pago (no a Pago contra entrega, que
            ya es 100% contraentrega). El producto siempre se paga en línea — esto solo decide
            quién asume el costo del flete.
          </p>

          <div className="flex items-center justify-between gap-4 p-4 bg-white/5 border border-white/10 rounded-lg">
            <div className="min-w-0">
              <p className="font-semibold text-white">Flete pagado en línea</p>
              <p className="text-xs text-white/40">
                Activo: el flete lo asume la billetera del negocio ante Vendelo. Desactivado: el
                cliente paga el flete en efectivo al repartidor al recibir su pedido (requiere
                &ldquo;Pago contra entrega&rdquo; habilitado arriba — si no, este toggle no tiene efecto).
              </p>
            </div>
            <ShippingOnlineToggle enabled={shippingOnlineEnabled} />
          </div>
        </div>

        {/* Sincronización */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
          <h2 className="font-bold text-white mb-4">Sincronización con Optimun</h2>
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
            <p className="text-sm text-blue-300">
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
