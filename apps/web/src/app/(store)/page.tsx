/**
 * Home de la tienda.
 *
 * El componente vive en `./home.tsx`; aquí solo se reexporta y se declara la
 * metadata de la página.
 *
 * Por qué hay metadata propia (Fase 1 del proyecto SEO, docs/seo/):
 * la home heredaba el título y la descripción genéricos del layout raíz
 * ("Taller especializado en motos eléctricas y a gasolina"), que no decían qué
 * se vende ni dónde se entrega. Ahora declara su propio título, su descripción
 * con los medios de pago reales y su canonical absoluto.
 *
 * Búsqueda de marca (README §26.12): el título empieza por "Tienda H2R" —como
 * lo busca la gente; el dominio es tiendah2r.com— y la descripción nombra la
 * marca. Antes Google mostraba /sobre-nosotros para "tienda h2r". `absolute`
 * evita el sufijo "| H2R Online Store" del layout, que la repetiría.
 */
import type { Metadata } from 'next'
import { buildSocialMetadata } from '@/lib/opengraph'
import { canonical } from '@/lib/seo'

// El texto no menciona el pago contra entrega porque es un método que el admin
// puede desactivar (Settings.COD_ENABLED): una descripción estática no puede
// prometerlo. Wompi (PSE, Nequi y tarjetas) sí está siempre activo.
const TITLE = 'Tienda H2R | Repuestos para moto con envío a toda Colombia'
const DESCRIPTION =
  'Tienda H2R (H2R Online Store): repuestos, aceites, llantas y accesorios para moto en Bucaramanga, ' +
  'con envío a toda Colombia. Paga con PSE, Nequi o tarjeta.'

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: canonical('/'),
  ...buildSocialMetadata({ title: TITLE, description: DESCRIPTION, url: '/' }),
}

export { default } from './home'
