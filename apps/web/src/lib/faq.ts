/**
 * Preguntas frecuentes de la home (docs/seo/, Fase 3).
 *
 * Viven aquí, y no dentro del componente, porque las consumen dos sitios: el
 * acordeón que ve el usuario y el `FAQPage` de JSON-LD que lee Google. Si cada
 * uno tuviera su copia, acabarían desincronizados — y un marcado que no coincide
 * con el contenido visible es motivo de penalización, además de una mentira.
 *
 * Las respuestas son las que ya estaban publicadas en el sitio. Al tocarlas hay
 * que comprobar que siguen siendo ciertas: envío gratis desde $500.000 (H-14),
 * garantía de hasta 6 meses (H-17) y cambios en 5 días (H-15) son datos del
 * negocio, no del código.
 */

export interface FaqItem {
  q: string
  a: string
}

export const FAQ_ITEMS: FaqItem[] = [
  {
    q: '¿Cuánto tiempo tarda el envío?',
    a: 'El tiempo de entrega depende de tu ubicación. Para Bucaramanga y área metropolitana, el envío es de 1 a 2 días hábiles. Para el resto de Colombia, el tiempo estimado es de 3 a 7 días hábiles.',
  },
  {
    q: '¿Hacen envíos a todo Colombia?',
    a: 'Sí, hacemos envíos a todos los departamentos de Colombia. El envío es gratis para pedidos superiores a $500.000 COP.',
  },
  {
    q: '¿Cómo puedo pagar?',
    a: 'Aceptamos pagos con Wompi (tarjeta de crédito o débito, Nequi, PSE o Bancolombia) y Addi (crédito en cuotas sin tarjeta).',
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
