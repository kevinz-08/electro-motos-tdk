import type { AdminHelpContent } from '../AdminHelpButton'

export const pedidosHelpContent: AdminHelpContent = {
  title: 'Pedidos',
  summary:
    'Lista todos los pedidos de la tienda con su estado de pago y envío. Puedes filtrar por ' +
    'estado, cambiar el estado manualmente, y revisar el detalle completo de cada pedido sin ' +
    'descargar el comprobante.',
  steps: [
    'Usa los botones de arriba (Todos, Pendiente, Pagado, Enviado, Entregado, Cancelado) para filtrar la lista.',
    'El selector "Cambiar estado" actualiza el pedido al instante — no pide confirmación, así que revisa bien antes de cambiarlo. El sistema no valida que el cambio siga un orden lógico (por ejemplo, puedes marcar "Entregado" un pedido que nunca pasó por "Pagado"), así que es tu responsabilidad mantener el estado correcto.',
    'El botón ⓘ abre el detalle completo del pedido (comprador, dirección, productos, pago) sin tener que descargar el PDF.',
    'La columna "Guía" resume el despacho de cada pedido con un punto de color (ver la leyenda debajo de la tabla). Un punto rojo significa que el envío a Vendelo falló y el pedido está pagado pero sin despachar: ábrelo y reintenta.',
    'La sección "Guía Vendelo" del detalle muestra qué pasó con el despacho y ofrece las acciones según el momento: "Reintentar envío a Vendelo" si falló, "Generar guía" si el pedido ya existe en Vendelo pero aún no tiene envío, y "Ver / Descargar guía PDF" cuando la guía ya está lista.',
    'Tras "Reintentar envío a Vendelo" o "Generar guía", el resultado no es inmediato: Vendelo procesa de forma asincrónica. Usa "Actualizar" en esa misma sección al cabo de unos minutos en vez de repetir la acción.',
    'Si el reintento vuelve a fallar, el mensaje rojo muestra el error exacto que devolvió Vendelo — normalmente apunta a un dato del comprador o de la dirección que Vendelo rechaza.',
    'Resolver novedades de transporte (paquetes con incidencia) todavía no tiene pantalla propia en el panel.',
    'El botón ↓ descarga el comprobante de venta en PDF.',
  ],
}
