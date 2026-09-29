/**
 * `<h1>` de la home (docs/seo/, búsqueda de marca "tienda h2r" — README §26.12).
 *
 * El hero es un carrusel de imágenes y la home no tenía ningún `<h1>`: Google no
 * encontraba en ella un encabezado que dijera qué es H2R, y para la búsqueda de
 * marca prefería /sobre-nosotros. Va DEBAJO del carrusel a propósito: arriba
 * podría convertirse en el elemento LCP en vez del hero.
 *
 * Server Component, sin interacción.
 */
import Link from 'next/link'

export function HomeIntro() {
  return (
    <section className="border-b border-gray-100 bg-white px-4 py-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-gray-900 md:text-3xl">
            H2R Online Store: tienda de repuestos para moto
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Bucaramanga · envíos a toda Colombia · compatibilidad verificada por modelo
          </p>
        </div>
        <Link
          href="/repuestos"
          className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-sky-600 transition-colors hover:text-sky-700"
        >
          Repuestos por moto
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>
    </section>
  )
}
