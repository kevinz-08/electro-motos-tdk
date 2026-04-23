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
import { PrismaProductRepository } from '@/infrastructure/repositories/PrismaProductRepository'
import { prisma } from '@/infrastructure/database/prisma-client'
import { ProductCard } from '@/components/store/ProductCard'
import { ScrollDownArrow } from '@/components/ui/ScrollDownArrow'

const CAT_ICONS: Record<string, string> = {
  'sistema-electrico': '⚡',
  'repuestos':         '🔧',
  'aceites':           '🛢️',
  'llantas':           '🏍️',
  'accesorios':        '🔩',
}

export default async function HomePage() {
  const repo = new PrismaProductRepository()
  const { items: featuredProducts } = await repo.findAll({ inStock: true, limit: 4, page: 1 })
  // Solo categorías padre (parentId null), ordenadas por nombre — resultado determinista
  const categories = await prisma.category.findMany({
    where: { parentId: null },
    orderBy: { name: 'asc' },
  })

  return (
    <>
      {/* Hero */}
      <section className="relative h-screen min-h-[600px] overflow-hidden bg-black text-white">
        {/* Video de fondo */}
        <video
          autoPlay
          muted
          loop
          playsInline
          className="absolute inset-0 w-full h-full object-cover opacity-40"
        >
          <source
            src="https://res.cloudinary.com/dip8uoaue/video/upload/f_auto,q_auto/hero-video_jcgpbo.mp4"
            type="video/mp4"
          />
        </video>

        {/* Overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/30 to-transparent" />

        {/* Contenido — alineado a la izquierda, verticalmente centrado */}
        <div className="relative z-10 h-full flex flex-col justify-center px-8 md:px-20 max-w-2xl">
          <p className="text-blue-400 text-sm font-semibold tracking-widest uppercase mb-4">
            H2r Online Store
          </p>
          <h1 className="text-5xl md:text-7xl font-black leading-none mb-6">
            Tu moto<br />merece lo<br />mejor.
          </h1>
          <p className="text-white/50 text-base tracking-wide">
            Repuestos y servicios de alta calidad para cualquier tipo de moto.
          </p>
        </div>

        {/* Flecha scroll */}
        <div className="absolute bottom-24 left-8 md:left-20 z-10">
          <ScrollDownArrow targetId="trust-badges" />
        </div>
      </section>

      {/* Trust badges */}
      <section id="trust-badges" className="border-b border-white/10 py-8 px-4 bg-black">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { icon: '🔒', label: 'Pago seguro', sub: 'Wompi · Nequi · PSE' },
            { icon: '🚚', label: 'Envío nacional', sub: 'Todo Colombia' },
            { icon: '✅', label: 'Repuestos originales', sub: 'Con garantía' },
            { icon: '⚡', label: 'Atención rápida', sub: 'Lun–Sáb 8am–6pm' },
          ].map((badge) => (
            <div key={badge.label} className="flex items-center gap-3">
              <span className="text-2xl">{badge.icon}</span>
              <div>
                <p className="font-semibold text-sm text-white">{badge.label}</p>
                <p className="text-xs text-white/50">{badge.sub}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Categorías */}
      <section id="categorias" className="py-16 px-4 bg-black">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-white mb-8 text-center">
            Encuentra tu repuesto
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {categories.map((cat) => (
              <Link
                key={cat.id}
                href={`/catalogo?category=${cat.slug}`}
                className="group bg-white/5 border border-white/10 rounded-xl p-6 text-center hover:border-blue-500 hover:bg-blue-500/5 transition-all"
              >
                <div className="text-3xl mb-3">
                  {CAT_ICONS[cat.slug] ?? '📦'}
                </div>
                <h3 className="text-sm font-bold text-white group-hover:text-blue-400 leading-tight">
                  {cat.name}
                </h3>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Productos destacados */}
      {featuredProducts.length > 0 && (
        <section className="py-16 px-4 bg-black">
          <div className="max-w-5xl mx-auto">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-3xl font-bold text-white">Productos destacados</h2>
              <Link href="/catalogo" className="text-blue-400 font-semibold hover:underline text-sm">
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

      {/* CTA WhatsApp */}
      <section className="bg-black text-white py-16 px-4 border-t border-white/10">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">¿No encuentras lo que buscas?</h2>
          <p className="text-white/60 mb-8">
            Cotiza directamente con nosotros. Conseguimos cualquier repuesto.
          </p>
          <a
            href="https://wa.me/573000000000?text=Hola,%20necesito%20un%20repuesto%20para%20mi%20moto"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-green-500 text-white px-8 py-3 rounded-lg font-bold text-lg hover:bg-green-400 transition-colors"
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
