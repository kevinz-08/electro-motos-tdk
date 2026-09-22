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
 */
import type { Metadata } from 'next'
import { buildSocialMetadata } from '@/lib/opengraph'
import { canonical } from '@/lib/seo'

// El texto no menciona el pago contra entrega porque es un método que el admin
// puede desactivar (Settings.COD_ENABLED): una descripción estática no puede
// prometerlo. Wompi (PSE, Nequi y tarjetas) sí está siempre activo.
const TITLE = 'Repuestos para moto con envío a toda Colombia'
const DESCRIPTION =
  'Repuestos, aceites, llantas y accesorios para moto con envío a toda Colombia. ' +
  'Pago seguro con Wompi: PSE, Nequi y tarjetas de crédito o débito.'

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: canonical('/'),
  ...buildSocialMetadata({ title: TITLE, description: DESCRIPTION, url: '/' }),
}

export { default } from './home'
