/**
 * Utilidades para contactar clientes por WhatsApp desde el panel admin.
 *
 * Todo es lógica pura (sin red ni BD): el mensaje se envía abriendo un enlace
 * `wa.me` desde la sesión de WhatsApp del propio admin. No hay API de
 * WhatsApp Business ni registro de mensajes enviados.
 */

export interface WhatsAppTemplate {
  id: string
  label: string
  /** Cuerpo con variables `{nombre}`, `{pedido}`, `{total}` y `{estado}`. */
  body: string
}

export interface TemplateVars {
  nombre: string
  pedido: string
  total: string
  estado: string
}

export const WHATSAPP_TEMPLATES: readonly WhatsAppTemplate[] = [
  {
    id: 'soporte',
    label: 'Soporte general',
    body:
      'Hola! Hablas con el soporte de Tiendah2r, ¿presentas algún problema con tu pedido? ' +
      '¿en qué podemos ayudarte?',
  },
  {
    id: 'confirmacion',
    label: 'Pedido recibido',
    body:
      'Hola {nombre}! Te escribimos de Tiendah2r: recibimos tu pedido {pedido} por {total} ' +
      'y ya lo estamos preparando. Cualquier duda, escríbenos por aquí.',
  },
  {
    id: 'enviado',
    label: 'Pedido enviado',
    body:
      'Hola {nombre}! Tu pedido {pedido} de Tiendah2r ya fue despachado. ' +
      'Número de guía: [ESCRIBE LA GUÍA]. Te avisamos cualquier novedad.',
  },
  {
    id: 'pago-pendiente',
    label: 'Pago pendiente o con problema',
    body:
      'Hola {nombre}! Te escribimos de Tiendah2r: tu pedido {pedido} por {total} aún no registra ' +
      'el pago (estado: {estado}). ¿Tuviste algún inconveniente? Con gusto te ayudamos a completarlo.',
  },
  {
    id: 'anticipo',
    label: 'Recordatorio de anticipo',
    body:
      'Hola {nombre}! Para despachar tu pedido {pedido} contraentrega en Tiendah2r necesitamos ' +
      'que se complete el anticipo. ¿Podemos ayudarte con el pago?',
  },
  {
    id: 'resena',
    label: 'Solicitar reseña',
    body:
      'Hola {nombre}! Esperamos que tu pedido {pedido} de Tiendah2r haya llegado muy bien. ' +
      '¿Nos regalas una reseña de tu compra? Nos ayuda muchísimo. ¡Gracias!',
  },
  {
    id: 'personalizado',
    label: 'Mensaje personalizado',
    body: 'Hola {nombre}! Te escribimos de Tiendah2r sobre tu pedido {pedido}. ',
  },
]

/**
 * Normaliza un teléfono colombiano de texto libre a formato internacional
 * sin "+" (`573001234567`). Devuelve `null` si no es un celular válido:
 * 10 dígitos que empiecen en 3, con o sin prefijo 57.
 */
export function normalizeColombianPhone(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  let digits = raw.replace(/\D/g, '')
  if (digits.length === 12 && digits.startsWith('57')) digits = digits.slice(2)
  if (!/^3\d{9}$/.test(digits)) return null
  return `57${digits}`
}

/** Sustituye `{variable}` por su valor; las variables desconocidas se dejan tal cual. */
export function renderTemplate(template: string, vars: TemplateVars): string {
  return template.replace(/\{(nombre|pedido|total|estado)\}/g, (_, key: keyof TemplateVars) => vars[key])
}

/** Enlace `wa.me` con el mensaje codificado (tildes, ¿, ¡ y saltos de línea incluidos). */
export function buildWhatsAppUrl(phone: string, message: string): string {
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
}
