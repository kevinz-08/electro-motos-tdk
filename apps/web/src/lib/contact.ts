export const WHATSAPP_NUMBER =
  process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? ''

const DEFAULT_MESSAGE = 'Hola H2R,\nEstoy interesado en algo para mi moto'

export const WHATSAPP_URL = (message?: string) =>
  `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message ?? DEFAULT_MESSAGE)}`

/** Dirección física de la tienda — usada en el checkout para retiro en tienda. */
export const STORE_ADDRESS = 'Cra 21 #21-58, Comuna 4 Occidental, Bucaramanga, Santander'
export const STORE_CITY = 'Bucaramanga'

/** Embed de Google Maps sin necesidad de API key (modo `output=embed`). */
export const STORE_MAP_EMBED_URL =
  `https://www.google.com/maps?q=${encodeURIComponent(STORE_ADDRESS)}&output=embed`
