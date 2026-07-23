/**
 * Landing page principal — tienda H2R.
 *
 * Secciones (de arriba a abajo):
 *   1. HERO — Carrusel full-screen con CTA principal + explorar
 *   2. TRUST BAR — Sellos de confianza con iconos SVG
 *   3. CATEGORÍAS — Grid horizontal de categorías con imágenes
 *   4. PRODUCTOS DESTACADOS — 4 productos in-stock más recientes
 *   5. SOCIAL PROOF — Testimonios + estadísticas de clientes
 *   6. FAQ — Acordeón de preguntas frecuentes
 *   7. CTA FINAL — Sección combinada de contacto directo
 */
import Link from 'next/link'
import { ProductCard } from '@/components/store/ProductCard'
import { HeroBannerCarousel } from '@/components/store/HeroBannerCarousel'
import { TrustBadges } from '@/components/store/TrustBadges'
import { CategoryGrid } from '@/components/store/CategoryGrid'
import { SocialProof } from '@/components/store/SocialProof'
import { CtaMidSection } from '@/components/store/CtaMidSection'
import { FAQ } from '@/components/store/FAQ'
import { getCachedFeaturedProducts, getCachedHomeCategories, getCachedHeroBanners } from '@/lib/cache'

export default async function HomePage() {
  const [featuredProducts, categories, heroBanners] = await Promise.all([
    getCachedFeaturedProducts(),
    getCachedHomeCategories(),
    getCachedHeroBanners(),
  ])

  const banners = heroBanners.map((b) => ({
    id: b.id,
    src: b.imageUrl,
    title: b.title,
    description: b.description ?? '',
    cta: b.ctaLabel && b.ctaUrl ? { label: b.ctaLabel, href: b.ctaUrl } : undefined,
  }))

  return (
    <>
      {/* 1. Hero carrusel con CTA — banners administrables desde /admin/banners */}
      <HeroBannerCarousel banners={banners} />

      {/* 2. Trust badges (iconos SVG) */}
      <TrustBadges />

      {/* 3. Categorías */}
      {categories.length > 0 && <CategoryGrid categories={categories} />}

      {/* 4. Productos destacados */}
      {featuredProducts.length > 0 && (
        <section className="py-20 px-4 bg-white border-t border-gray-100">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-end justify-between mb-10">
              <div>
                <h2 className="text-3xl md:text-4xl font-bold text-gray-900 tracking-tight">
                  Productos destacados
                </h2>
                <p className="text-gray-500 mt-2 text-sm">
                  Los repuestos más buscados por nuestros clientes
                </p>
              </div>
              <Link
                href="/catalogo?showAll=true"
                className="hidden sm:inline-flex items-center gap-1 text-sky-600 font-semibold hover:text-sky-700 text-sm transition-colors"
              >
                Ver todo
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {featuredProducts.map((product, index) => (
                <ProductCard key={product.id} product={product} priority={index < 2} />
              ))}
            </div>
            <div className="mt-8 text-center sm:hidden">
              <Link
                href="/catalogo?showAll=true"
                className="inline-flex items-center gap-1 text-sky-600 font-semibold hover:text-sky-700 text-sm transition-colors"
              >
                Ver todos los productos
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* 5. Social proof (testimonios + stats) */}
      <SocialProof />

      {/* 6. FAQ */}
      <FAQ />

      {/* 7. CTA final combinado */}
      <CtaMidSection />
    </>
  )
}
