/**
 * Categorías del hub de modelo, con el número real de repuestos compatibles
 * (docs/seo/, Fase 2).
 *
 * Los conteos vienen de la base de datos: productos vendibles con fitment
 * verificado para ese modelo. Las categorías con cero productos no se pintan —
 * enlazarían a un listado vacío.
 *
 * Server Component.
 */
import Link from 'next/link'
import type { ModelCategoryCount } from '@h2r/domain'

interface Props {
  categories: ModelCategoryCount[]
  brandSlug: string
  modelSlug: string
}

export function ModelCategoryGrid({ categories, brandSlug, modelSlug }: Props) {
  const withProducts = categories.filter((c) => c.productCount > 0)

  if (withProducts.length === 0) return null

  return (
    <section>
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Explora por categoría</h2>

      <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {withProducts.map((category) => (
          <li key={category.categoryId}>
            <Link
              href={`/repuestos/${brandSlug}/${modelSlug}/${category.categorySlug}`}
              className="flex items-center justify-between gap-2 rounded-xl border border-gray-200 px-4 py-3 hover:border-sky-300 hover:bg-sky-50/40 transition-colors"
            >
              <span className="text-sm font-medium text-gray-800">{category.categoryName}</span>
              <span className="shrink-0 text-xs text-gray-400 tabular-nums">
                {category.productCount}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
