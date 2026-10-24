/**
 * Preguntas frecuentes de la home (docs/seo/, Fase 3).
 *
 * Viven aquí, y no dentro del componente, porque las consumen dos sitios: el
 * acordeón que ve el usuario y el `FAQPage` de JSON-LD que lee Google. Si cada
 * uno tuviera su copia, acabarían desincronizados — y un marcado que no coincide
 * con el contenido visible es motivo de penalización, además de una mentira.
 *
 * Las respuestas son las que ya estaban publicadas en el sitio. Al tocarlas hay
 * que comprobar que siguen siendo ciertas: garantía de hasta 6 meses (H-17,
 * confirmada) y cambios en 5 días (H-15) son datos del negocio, no del código.
 * El umbral de envío gratis NO está escrito aquí: llega de `Settings`
 * (`FREE_SHIPPING_THRESHOLD`, H-14) para que exista una sola fuente de verdad.
 * Lo mismo la hora de corte y si hay contra entrega: la respuesta de pagos dice
 * lo mismo que "Por qué comprar en H2R" (texto aprobado el 2026-10-24).
 */
import { formatCOP } from '@/components/store/PriceTag'
import { ORGANIZATION } from '@/lib/structured-data'
import { WOMPI_METHODS, formatHour } from '@/lib/store-facts'

export interface FaqItem {
  q: string
  a: string
}

interface FaqFacts {
  /** Centavos COP; 0 = sin envío gratis. */
  freeShippingThreshold: number
  /** Hora (0–23) antes de la cual un pago confirmado sale el mismo día hábil. */
  cutoffHour: number
  cashOnDelivery: boolean
}

export function buildFaqItems({ freeShippingThreshold, cutoffHour, cashOnDelivery }: FaqFacts): FaqItem[] {
  return [
  {
    // Búsqueda de marca (README §26.12): datos de ORGANIZATION, los mismos del JSON-LD.
    q: '¿Qué es Tienda H2R?',
    a: `Tienda H2R es ${ORGANIZATION.name} (NIT ${ORGANIZATION.taxId}), una tienda de repuestos y accesorios para moto ` +
      `con punto físico en ${ORGANIZATION.address.street}, ${ORGANIZATION.address.locality}, y envíos a toda Colombia. ` +
      'Vende en línea en tiendah2r.com y solo indica que un repuesto le sirve a tu moto cuando la compatibilidad está verificada.',
  },
  {
    q: '¿Cuánto tiempo tarda el envío?',
    a: 'El tiempo de entrega depende de tu ubicación. Para Bucaramanga y área metropolitana, el envío es de 1 a 2 días hábiles. Para el resto de Colombia, el tiempo estimado es de 3 a 7 días hábiles.',
  },
  {
    q: '¿Hacen envíos a todo Colombia?',
    a: 'Sí, hacemos envíos a todos los departamentos de Colombia. ' +
      (freeShippingThreshold > 0
        ? `El envío es gratis para pedidos superiores a ${formatCOP(freeShippingThreshold)} COP.`
        : 'El costo del envío se calcula según el destino.'),
  },
  {
    q: '¿Cómo puedo pagar?',
    a: `Pago en línea a través de Wompi: ${WOMPI_METHODS.join(', ')}. ` +
      (cashOnDelivery ? 'Contra entrega: pagas cuando recibes tu pedido; solo aplica para ciudades principales. ' : '') +
      'A cuotas con Addi: un asesor te acompaña por WhatsApp para coordinar el pago. ' +
      'Pago seguro: tus datos de tarjeta se procesan directamente en la pasarela de pagos de Wompi; H2R no los almacena. ' +
      `Si tu pago en línea se confirma antes de las ${formatHour(cutoffHour)} en un día hábil, tu pedido sale ese mismo día.`,
  },
  {
    q: '¿Tienen garantía los repuestos?',
    a: 'Todos nuestros productos tienen garantía de hasta 6 meses contra defectos de fábrica. Si tienes algún problema, escríbenos y te damos solución rápida.',
  },
  {
    q: '¿Puedo devolver un producto?',
    a: 'Sí, aceptamos cambios hasta un máximo de 5 días posteriores a la compra. El producto debe estar en su empaque original y sin usar. Escríbenos y coordinamos el cambio.',
  },
  {
    q: '¿Cómo sé qué repuesto necesita mi moto?',
    a: 'Puedes consultar nuestro catálogo por categoría o escribirnos a WhatsApp con el modelo y año de tu moto. Te asesoramos para encontrar la pieza correcta.',
  },
  ]
}
