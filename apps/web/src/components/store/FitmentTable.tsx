/**
 * Tabla "Compatible con" de la ficha de producto (docs/seo/, Fase 2).
 *
 * Es el bloque que responde a la única pregunta que importa en repuestos:
 * "¿esto le sirve a mi moto?". Cada fila enlaza al hub de ese modelo, de modo
 * que el enlazado interno va producto ↔ modelo en los dos sentidos.
 *
 * Todo lo que aparece aquí viene de fitments con `verified = true` (el
 * repositorio ya los filtra). Si un producto no tiene ninguno verificado, el
 * bloque no se renderiza: mejor no decir nada que insinuar una compatibilidad
 * que nadie ha comprobado.
 *
 * El aviso final es deliberado: la lista es de compatibilidades confirmadas, no
 * una lista cerrada. Que una moto no esté no significa que no sirva, significa
 * que no se ha verificado — y para eso está el WhatsApp.
 *
 * Server Component.
 */
import Link from 'next/link'
import { formatYearRange, positionLabel, type FitmentWithModel, type OemReference } from '@h2r/domain'
import { WHATSAPP_URL } from '@/lib/contact'

interface Props {
  fitments: FitmentWithModel[]
  oemReferences: OemReference[]
  productName: string
  productSku: string
}

/** Años del fitment si los acota; si no, los del modelo; si no, nada. */
function yearsFor(fitment: FitmentWithModel): string | null {
  const own = formatYearRange({ yearFrom: fitment.yearFrom, yearTo: fitment.yearTo })
  if (own) return own
  return formatYearRange({ yearFrom: fitment.model.yearFrom, yearTo: fitment.model.yearTo })
}

export function FitmentTable({ fitments, oemReferences, productName, productSku }: Props) {
  if (fitments.length === 0 && oemReferences.length === 0) return null

  return (
    <section className="mt-10 border-t border-gray-100 pt-8" id="compatibilidad">
      {fitments.length > 0 && (
        <>
          <h2 className="text-lg font-bold text-gray-900">Compatible con</h2>
          <p className="mt-1 mb-4 text-xs text-gray-500">
            {fitments.length === 1
              ? '1 moto con compatibilidad verificada por el equipo de H2R.'
              : `${fitments.length} motos con compatibilidad verificada por el equipo de H2R.`}
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-xs uppercase tracking-wide text-gray-400">
                  <th scope="col" className="py-2 pr-4 font-medium">Moto</th>
                  <th scope="col" className="py-2 pr-4 font-medium">Años</th>
                  <th scope="col" className="py-2 pr-4 font-medium">Posición</th>
                  <th scope="col" className="py-2 font-medium">Notas</th>
                </tr>
              </thead>
              <tbody>
                {fitments.map((fitment) => {
                  const years = yearsFor(fitment)
                  const position = positionLabel(fitment.position)
                  return (
                    <tr key={fitment.id} className="border-b border-gray-100 last:border-0">
                      <td className="py-2.5 pr-4">
                        <Link
                          href={`/repuestos/${fitment.model.brand.slug}/${fitment.model.slug}`}
                          className="font-medium text-sky-700 hover:text-sky-800 hover:underline"
                        >
                          {fitment.model.brand.name} {fitment.model.name}
                        </Link>
                        {fitment.model.cc !== null && (
                          <span className="ml-1.5 text-xs text-gray-400">{fitment.model.cc} cc</span>
                        )}
                      </td>
                      <td className="py-2.5 pr-4 text-gray-600 whitespace-nowrap">{years ?? '—'}</td>
                      <td className="py-2.5 pr-4 text-gray-600">{position ?? '—'}</td>
                      <td className="py-2.5 text-gray-500">{fitment.notes ?? '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {oemReferences.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-2">Referencias originales</h3>
          <ul className="flex flex-wrap gap-2">
            {oemReferences.map((ref) => (
              <li key={ref.id}>
                <Link
                  href={`/referencia/${encodeURIComponent(ref.reference)}`}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-2.5 py-1 font-mono text-xs text-gray-700 hover:border-sky-300 hover:bg-sky-50/40 transition-colors"
                >
                  {ref.reference}
                  {ref.manufacturer && (
                    <span className="font-sans text-[10px] text-gray-400">{ref.manufacturer}</span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="mt-6 text-xs text-gray-400">
        ¿Tu moto no está en la lista? No quiere decir que no sirva: quiere decir que todavía no lo
        hemos verificado.{' '}
        <a
          href={WHATSAPP_URL(
            `Hola H2R, quiero confirmar si ${productName} (SKU ${productSku}) le sirve a mi moto.`,
          )}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sky-600 underline hover:text-sky-700"
        >
          Confírmalo por WhatsApp
        </a>{' '}
        antes de comprar.
      </p>
    </section>
  )
}
