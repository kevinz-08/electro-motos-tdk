import Link from 'next/link'
import Image from 'next/image'
import { Category } from '@h2r/domain'

const CAT_ICONS: Record<string, string> = {
  'sistema-electrico': '⚡',
  'repuestos': '🔧',
  'aceites': '🛢️',
  'llantas': '🏍️',
  'accesorios': '🔩',
}

const CATEGORY_IMAGES: Record<string, string> = {
  'sistema-electrico': '/assets/category/sistema-electrico.webp',
  'repuestos': '/assets/category/repuestos.webp',
  'aceites': '/assets/category/aceites.webp',
  'llantas': '/assets/category/llantas.webp',
  'accesorios': '/assets/category/accesorios.webp',
}

const CATEGORY_DESCRIPTIONS: Record<string, string> = {
  'sistema-electrico': 'Baterías, luces, bobinas y más',
  'repuestos': 'Piezas originales y alternativas',
  'aceites': 'Lubricantes para todo tipo de motor',
  'llantas': 'Neumáticos de alto rendimiento',
  'accesorios': 'Cascos, guantes y equipo',
}

interface CategoryGridProps {
  categories: Category[]
}

export function CategoryGrid({ categories }: CategoryGridProps) {
  return (
    <section id="categorias" className="py-20 px-4 bg-white">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 tracking-tight">
            ¿Qué estás buscando?
          </h2>
          <p className="text-gray-500 mt-3 max-w-md mx-auto">
            Explora nuestras categorías y encuentra todo para tu moto
          </p>
        </div>

        <div className="flex items-stretch justify-start lg:justify-center gap-4 overflow-x-auto lg:overflow-visible scrollbar-hide pb-2">
          {categories.map((cat) => {
            const icon = CAT_ICONS[cat.slug]
            const desc = CATEGORY_DESCRIPTIONS[cat.slug]
            const imgSrc = CATEGORY_IMAGES[cat.slug] ?? '/assets/category/default.jpg'

            return (
              <Link
                key={cat.id}
                href={`/catalogo?category=${cat.slug}`}
                className="group shrink-0 w-[140px] sm:w-[160px] md:w-[180px] bg-white border border-gray-200 rounded-2xl p-4 hover:border-sky-300 hover:shadow-md hover:shadow-sky-100/50 transition-all duration-300"
              >
                <div className="relative aspect-square rounded-xl overflow-hidden bg-gray-50 mb-3">
                  <Image
                    src={imgSrc}
                    alt={cat.name}
                    fill
                    sizes="180px"
                    className="object-contain p-3 transition-transform duration-500 group-hover:scale-110"
                  />
                  {icon && (
                    <span className="absolute top-1.5 right-1.5 text-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      {icon}
                    </span>
                  )}
                </div>
                <h3 className="text-sm md:text-base font-semibold text-gray-900 group-hover:text-sky-700 transition-colors leading-tight">
                  {cat.name}
                </h3>
                {desc && (
                  <p className="text-[11px] text-gray-400 mt-1 leading-tight line-clamp-2">
                    {desc}
                  </p>
                )}
              </Link>
            )
          })}
        </div>
      </div>
    </section>
  )
}
