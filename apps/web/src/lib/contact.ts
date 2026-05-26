export const WHATSAPP_NUMBER =
  process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? ''

const DEFAULT_MESSAGE = 'Hola H2R 👋 ,\nEstoy interesado en algo para mi moto'

export const WHATSAPP_URL = (message?: string) =>
  `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message ?? DEFAULT_MESSAGE)}`
