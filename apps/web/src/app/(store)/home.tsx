/**
 * Componente de la página de inicio (landing page) de la tienda.
 *
 * Por qué es home.tsx y no page.tsx directamente:
 *   Next.js detecta conflictos de rutas si hay un page.tsx en el grupo (store)
 *   y también en la raíz. El archivo app/(store)/page.tsx simplemente re-exporta
 *   este componente, separando la lógica del componente de la convención de rutas.
 *
 * Secciones de la página:
 *
 *   1. HERO — Sección principal con propuesta de valor, CTA y fondo oscuro
 *      "Repuestos y servicio para tu moto, con garantía real"
 *
 *   2. TRUST BADGES — 4 íconos de confianza (pago seguro, envío, originales, atención)
 *      Importante para la conversión: reduce la fricción de compra
 *
 *   3. CATEGORÍAS — Grid 3 columnas con Frenos, Motores, Llantas
 *      Links directos al catálogo filtrado por categoría
 *
 *   4. PRODUCTOS DESTACADOS — Los 4 productos con stock disponible más recientes
 *      Server-side: PrismaProductRepository.findAll({ inStock: true, limit: 4 })
 *
 *   5. CTA WHATSAPP — Sección final para consultas que no están en el catálogo
 *      Link directo a wa.me con mensaje pre-escrito
 *
 * Flujo de datos (servidor):
 *   PrismaProductRepository.findAll({ inStock: true, limit: 4 }) → featuredProducts
 *   prisma.category.findMany({ take: 3 }) → categories
 */
import Link from 'next/link'
import Image from 'next/image'
import { PrismaProductRepository } from '@/infrastructure/repositories/PrismaProductRepository'
import { prisma } from '@/infrastructure/database/prisma-client'
import { ProductCard } from '@/components/store/ProductCard'
import { HeroBannerCarousel } from '@/components/store/HeroBannerCarousel'

const CAT_ICONS: Record<string, string> = {
  'sistema-electrico': '⚡',
  'repuestos':         '🔧',
  'aceites':           '🛢️',
  'llantas':           '🏍️',
  'accesorios':        '🔩',
}

const CATEGORY_IMAGES: Record<string, string> = {
  'sistema-electrico': '/assets/category/sistema-electrico.jpg',
  'repuestos': '/assets/category/repuestos.jpg',
  'aceites': '/assets/category/aceites.jpg',
  'llantas': '/assets/category/llantas.jpg',
  'accesorios': '/assets/category/accesorios.jpg',
}

const HERO_BANNERS = [
  {
    src: '/assets/heroBanners/hero_banner1.png',
    title: 'Tu moto merece lo mejor.',
    description: 'Repuestos y servicios de alta calidad para cualquier tipo de moto.',
  },
  {
    src: '/assets/heroBanners/hero_banner2.png',
    title: 'Encuentra todo tipo de repuestos',
    description: 'Tenemos opciones para mantener tu vehiculo en excelente estado.',
  },
  {
    src: '/assets/heroBanners/hero_banner3.png',
    title: '¿Buscas equipamiento?',
    description: 'Accesorios y proteccion para cada estilo de conduccion.',
  },
  {
    src: '/assets/heroBanners/hero_banner4.png',
    title: '¿Necesitas un servicio tecnico?',
    description: 'Te ayudamos con diagnostico y soporte para tu moto.',
  },
]

export default async function HomePage() {
  const repo = new PrismaProductRepository()

  // Selecciona 4 productos aleatorios con stock usando ORDER BY RANDOM() de PostgreSQL
  const randomRows = await prisma.$queryRaw<{ id: string }[]>`
    SELECT id FROM "Product" WHERE stock > 0 ORDER BY RANDOM() LIMIT 4
  `
  const featuredProducts = randomRows.length > 0
    ? await Promise.all(randomRows.map((r) => repo.findById(r.id).then((p) => p!)))
    : []
  // Solo categorías padre (parentId null), ordenadas por nombre — resultado determinista
  const categories = await prisma.category.findMany({
    where: { parentId: null },
    orderBy: { name: 'asc' },
  })

  return (
    <>
      {/* Hero carrusel manual */}
      <HeroBannerCarousel banners={HERO_BANNERS} />

      {/* Trust badges */}
      <section id="trust-badges" className="border-y border-white/10 py-4 px-4 bg-black">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { icon: '🚚', label: 'Envío gratis desde $500.000', sub: 'Términos y Condiciones' },
            { icon: '↩️', label: 'Cambio fácil', sub: 'Garantía de 1 año' },
            { icon: '🛡️', label: 'Tu compra está protegida', sub: 'Por Mercado Pago y Addi' },
            { icon: '💬', label: 'Atención personalizada', sub: 'Escríbenos' },
          ].map((badge) => (
            <div key={badge.label} className="flex items-center gap-3">
              <span className="text-xl">{badge.icon}</span>
              <div>
                <p className="font-semibold text-xs md:text-sm text-white">{badge.label}</p>
                <p className="text-[11px] text-white/55">{badge.sub}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Productos destacados */}
      {featuredProducts.length > 0 && (
        <section className="py-16 px-4 bg-white border-t border-gray-200">
          <div className="max-w-5xl mx-auto">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-3xl font-bold text-gray-900">Productos destacados</h2>
              <Link href="/catalogo" className="text-sky-600 font-semibold hover:text-sky-700 hover:underline text-sm">
                Ver todo →
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {featuredProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Categorías */}
      <section id="categorias" className="py-16 px-4 bg-white border-t border-gray-200">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 mb-10 text-center">
            ¿Que estas buscando?
          </h2>
          <div className="flex items-stretch justify-start lg:justify-center gap-3 md:gap-4 overflow-x-auto lg:overflow-visible scrollbar-hide pb-2">
            {categories.map((cat) => (
              <Link
                key={cat.id}
                href={`/catalogo?category=${cat.slug}`}
                className="group shrink-0 w-[130px] sm:w-[140px] md:w-[150px] bg-white border border-gray-200 rounded-2xl p-3 md:p-4 text-center hover:border-sky-300 hover:shadow-sm transition-all"
              >
                <div className="relative aspect-square rounded-xl overflow-hidden bg-gray-50 mb-2.5">
                  <Image
                    src={CATEGORY_IMAGES[cat.slug] ?? '/assets/category/default.jpg'}
                    alt={cat.name}
                    fill
                    sizes="150px"
                    className="object-contain p-2 transition-transform duration-300 group-hover:scale-105"
                  />
                </div>
                <h3 className="text-xs md:text-sm font-semibold text-gray-900 group-hover:text-sky-700 leading-tight">
                  {cat.name}
                </h3>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA WhatsApp */}
      <section className="bg-white text-gray-900 py-16 px-4 border-t border-gray-200">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">¿No encuentras lo que buscas?</h2>
          <p className="text-gray-600 mb-8">
            Cotiza directamente con nosotros. Conseguimos cualquier repuesto.
          </p>
          <a
            href="https://wa.me/573000000000?text=Hola,%20necesito%20un%20repuesto%20para%20mi%20moto"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-sky-400 text-black px-8 py-3 rounded-lg font-bold text-lg hover:bg-sky-500 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
              <path d="M12 0C5.373 0 0 5.373 0 12c0 2.114.552 4.1 1.516 5.827L.057 23.854l6.162-1.617A11.94 11.94 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.8 9.8 0 01-5.002-1.371l-.36-.213-3.657.958.976-3.563-.234-.376A9.79 9.79 0 012.182 12C2.182 6.58 6.58 2.182 12 2.182S21.818 6.58 21.818 12 17.42 21.818 12 21.818z" />
            </svg>
            WhatsApp
          </a>
        </div>
      </section>
    </>
  )
}
