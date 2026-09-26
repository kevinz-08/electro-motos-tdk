/**
 * Gráfico del Índice de Precios (Fase 5, ítem 4): por categoría, la mediana
 * (marcador) sobre el rango intercuartílico P25–P75 (barra clara). Una sola
 * serie → un solo tono, sin leyenda (el título la nombra); los valores van como
 * texto en tinta, no en el color de la serie.
 *
 * Server Component, sin librerías: HTML + CSS. El tooltip por fila aparece con
 * hover y con foco de teclado (cada fila es enfocable). La tabla de datos de la
 * página es la vista accesible equivalente.
 */
import type { PriceIndexCategory } from '@h2r/domain'
import { formatCOP } from '@/components/store/PriceTag'

export function PriceIndexChart({ categories }: { categories: PriceIndexCategory[] }) {
  // Escala común desde 0 hasta el mayor P75 (+5 % de aire). Los máximos se
  // muestran en el tooltip y en la tabla, no en el eje: un solo producto caro
  // aplastaría todas las barras.
  const top = Math.max(...categories.map((c) => c.p75)) * 1.05
  const pct = (v: number) => `${Math.min(100, (v / top) * 100)}%`

  return (
    <figure className="mt-6">
      <div
        role="img"
        aria-label="Mediana y rango intercuartílico del precio por categoría. Los datos completos están en la tabla siguiente."
        className="space-y-2"
      >
        {categories.map((c) => (
          <div
            key={c.slug}
            tabIndex={0}
            className="group relative grid grid-cols-[minmax(0,9rem)_1fr_auto] items-center gap-3 rounded-md px-1 py-1 outline-none hover:bg-gray-50 focus-visible:bg-gray-50 focus-visible:ring-2 focus-visible:ring-sky-500 sm:grid-cols-[12rem_1fr_6.5rem]"
          >
            <span className="truncate text-sm text-gray-700" title={c.name}>
              {c.name}
            </span>
            <span className="relative h-5">
              {/* Línea base recesiva */}
              <span className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-gray-200" />
              {/* Rango intercuartílico */}
              <span
                className="absolute top-1/2 h-2.5 -translate-y-1/2 rounded-[4px] bg-sky-200"
                style={{ left: pct(c.p25), width: `calc(${pct(c.p75)} - ${pct(c.p25)})` }}
              />
              {/* Mediana */}
              <span
                className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-sky-700"
                style={{ left: pct(c.median) }}
              />
            </span>
            <span className="text-right text-sm font-semibold tabular-nums text-gray-900">{formatCOP(c.median)}</span>

            {/* Tooltip */}
            <span
              role="tooltip"
              className="pointer-events-none absolute left-1/2 top-full z-10 mt-1 hidden w-60 -translate-x-1/2 rounded-lg border border-gray-200 bg-white p-3 text-xs text-gray-700 shadow-lg group-hover:block group-focus-visible:block"
            >
              <span className="block font-semibold text-gray-900">{c.name}</span>
              <span className="mt-1 block">Mediana: {formatCOP(c.median)}</span>
              <span className="block">
                50 % central: {formatCOP(c.p25)} – {formatCOP(c.p75)}
              </span>
              <span className="block">
                Rango: {formatCOP(c.min)} – {formatCOP(c.max)}
              </span>
              <span className="block text-gray-500">{c.count} referencias</span>
            </span>
          </div>
        ))}
      </div>
      <figcaption className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-gray-500">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full border-2 border-white bg-sky-700 ring-1 ring-gray-200" /> Mediana
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-5 rounded-[4px] bg-sky-200" /> 50 % central de los precios (P25–P75)
        </span>
        <span>Escala común, desde $0.</span>
      </figcaption>
    </figure>
  )
}
