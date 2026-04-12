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

export default async function HomePage() {
  const repo = new PrismaProductRepository()
  const { items: featuredProducts } = await repo.findAll({ inStock: true, limit: 4, page: 1 })
  const categories = await prisma.category.findMany({ take: 3 })

  return (
    <>
      {/* Hero */}
      <section className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white py-24 px-4">
        <div className="max-w-5xl mx-auto text-center">
          <div className="inline-block bg-amber-400/10 border border-amber-400/20 rounded-full px-4 py-1.5 text-amber-400 text-sm font-medium mb-6">
            🏍️ Taller especializado en Colombia
          </div>
          <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
            Repuestos y servicio para tu moto,{' '}
            <span className="text-amber-400">con garantía real</span>
          </h1>
          <p className="text-gray-400 text-lg md:text-xl max-w-2xl mx-auto mb-8">
            Más de 500 referencias en stock. Envíos a todo Colombia. Pago seguro con Wompi,
            Nequi, PSE y tarjetas.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/catalogo"
              className="bg-amber-400 text-gray-900 px-8 py-3 rounded-lg font-bold text-lg hover:bg-amber-300 transition-colors"
            >
              Ver catálogo
            </Link>
            <Link
              href="/#categorias"
              className="border border-gray-600 text-white px-8 py-3 rounded-lg font-bold text-lg hover:border-amber-400 hover:text-amber-400 transition-colors"
            >
              Ver categorías
            </Link>
          </div>
        </div>
      </section>

      {/* Trust badges */}
      <section className="border-b border-gray-100 py-8 px-4">
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
                <p className="font-semibold text-sm text-gray-900">{badge.label}</p>
                <p className="text-xs text-gray-500">{badge.sub}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Categorías */}
      <section id="categorias" className="py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">
            Encuentra tu repuesto
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {categories.map((cat) => (
              <Link
                key={cat.id}
                href={`/catalogo?category=${cat.slug}`}
                className="group bg-gray-50 border border-gray-200 rounded-xl p-8 text-center hover:border-amber-400 hover:bg-amber-50 transition-all"
              >
                <div className="text-4xl mb-4">
                  {cat.slug === 'frenos' ? '🛑' : cat.slug === 'motores' ? '⚙️' : '🛞'}
                </div>
                <h3 className="text-xl font-bold text-gray-900 group-hover:text-amber-600 mb-2">
                  {cat.name}
                </h3>
                <p className="text-sm text-gray-500">{cat.description}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Productos destacados */}
      {featuredProducts.length > 0 && (
        <section className="py-16 px-4 bg-gray-50">
          <div className="max-w-5xl mx-auto">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-3xl font-bold text-gray-900">Productos destacados</h2>
              <Link href="/catalogo" className="text-amber-600 font-semibold hover:underline text-sm">
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
      <section className="bg-gray-900 text-white py-16 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">¿No encuentras lo que buscas?</h2>
          <p className="text-gray-400 mb-8">
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
