/**
 * Migas de pan visibles + JSON-LD `BreadcrumbList` (docs/seo/, Fase 2).
 *
 * El marcado y lo que se ve son lo mismo: se generan del mismo array, así que
 * nunca pueden contradecirse. Google penaliza el structured data que no
 * corresponde con el contenido visible.
 *
 * El último elemento no enlaza (es la página actual) y se marca con
 * `aria-current="page"`.
 *
 * Server Component: no necesita interacción.
 */
import Link from 'next/link'
import { absoluteUrl } from '@/lib/seo'

export interface BreadcrumbItem {
  label: string
  /** Sin `href` = elemento actual: ni enlaza ni se puede clicar. */
  href?: string
}

export function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  if (items.length === 0) return null

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.label,
      ...(item.href ? { item: absoluteUrl(item.href) } : {}),
    })),
  }

  return (
    <>
      <script
        type="application/ld+json"
        // Mismo escape que en la ficha de producto: evita cerrar el <script>
        // con contenido de la base de datos.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
      />
      <nav aria-label="Ruta de navegación">
        <ol className="flex flex-wrap items-center gap-1.5 text-xs text-gray-400">
          {items.map((item, index) => (
            <li key={`${item.label}-${index}`} className="flex items-center gap-1.5">
              {index > 0 && <span aria-hidden="true">/</span>}
              {item.href ? (
                <Link href={item.href} className="hover:text-gray-600 transition-colors">
                  {item.label}
                </Link>
              ) : (
                <span className="text-gray-600" aria-current="page">
                  {item.label}
                </span>
              )}
            </li>
          ))}
        </ol>
      </nav>
    </>
  )
}
