/**
 * Sección "Marcas que respaldan tu moto" de la home (README §30).
 *
 * Sección de fondo blanco (como CategoryGrid) con los logos de las marcas
 * aliadas en tarjetas con borde y acento celeste al pasar el cursor. Cada tarjeta enlaza al buscador del
 * catálogo con el nombre de la marca; el índice de búsqueda incluye `partBrand`
 * (apps/web/src/lib/search-index.ts), así que el enlace lista sus productos.
 *
 * Los logos viven en /public/assets/marcasConocidas/. Para añadir o cambiar una
 * marca basta con editar el array `BRANDS`.
 */
import Link from 'next/link'
import Image from 'next/image'

interface Brand {
  name: string
  /** Texto que recibe el buscador del catálogo. */
  query: string
  logo: string
}

const BRANDS: Brand[] = [
  { name: 'Bosch', query: 'bosch', logo: '/assets/marcasConocidas/Bosch-Logo.png' },
  { name: 'Liqui Moly', query: 'liqui moly', logo: '/assets/marcasConocidas/Liqui-Moly-Logo.jpg' },
  { name: 'Dunlop', query: 'dunlop', logo: '/assets/marcasConocidas/Dunlop-logo.png' },
  { name: 'Kontrol', query: 'kontrol', logo: '/assets/marcasConocidas/kontrol-LOGO.webp' },
  { name: 'Varroc', query: 'varroc', logo: '/assets/marcasConocidas/varroc-logo.webp' },
  { name: 'Magna', query: 'magna', logo: '/assets/marcasConocidas/magna-logo.png' },
  { name: 'Motoled', query: 'motoled', logo: '/assets/marcasConocidas/motoled-logo.webp' },
  { name: 'NGK', query: 'ngk', logo: '/assets/marcasConocidas/NGK-Logo.png' },
]

export function BrandsShowcase() {
  return (
    <section
      id="marcas"
      aria-labelledby="marcas-titulo"
      className="py-20 px-4 bg-white border-t border-gray-100"
    >
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2
            id="marcas-titulo"
            className="text-3xl md:text-4xl font-bold text-gray-900 tracking-tight"
          >
            Marcas que respaldan tu moto
          </h2>
          <p className="mt-3 max-w-md mx-auto text-gray-500">
            Trabajamos con los fabricantes que ya conoces y en los que confías
          </p>
        </div>

        <ul className="grid grid-cols-2 sm:grid-cols-4 gap-4 md:gap-6">
          {BRANDS.map((brand) => (
            <li key={brand.name}>
              <Link
                href={`/catalogo?search=${encodeURIComponent(brand.query)}`}
                aria-label={`Ver productos ${brand.name}`}
                className="group relative flex aspect-[3/2] items-center justify-center rounded-2xl bg-white border border-gray-200 transition-all duration-300 motion-safe:hover:-translate-y-1 hover:border-sky-300 hover:shadow-md hover:shadow-sky-100/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
              >
                <Image
                  src={brand.logo}
                  alt={`Logo de ${brand.name}`}
                  fill
                  sizes="(min-width: 1152px) 260px, (min-width: 640px) 22vw, 45vw"
                  className="object-contain p-5 md:p-7 transition-transform duration-500 motion-safe:group-hover:scale-105"
                />
              </Link>
            </li>
          ))}
        </ul>

        <p className="mt-10 text-center text-sm text-gray-500">
          Y muchas marcas más en nuestro catálogo.{' '}
          <Link
            href="/catalogo?showAll=true"
            className="inline-flex items-center gap-1 font-semibold text-sky-600 hover:text-sky-700 transition-colors"
          >
            Ver catálogo completo
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </p>
      </div>
    </section>
  )
}
