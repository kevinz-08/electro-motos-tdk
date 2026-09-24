/**
 * /sobre-nosotros — quiénes somos (Fase 4, ítem 10; E-E-A-T de la Fase 5).
 *
 * Solo lleva hechos ya publicados o confirmados: la descripción del negocio que
 * ya estaba en /contacto, los datos de la empresa de `ORGANIZATION` (los mismos
 * del JSON-LD), la tienda física (H-10) y las redes oficiales.
 *
 * TODO(humano): historia del negocio, fundadores y equipo. Las redes sociales
 * no son legibles sin sesión, así que no se redactó nada de eso: inventar una
 * historia o unos perfiles de equipo sería justo lo que la Fase 5 prohíbe.
 * Se registra en docs/seo/HUMAN_TASKS.md.
 */
import type { Metadata } from 'next'
import Link from 'next/link'
import { canonical } from '@/lib/seo'
import { ORGANIZATION } from '@/lib/structured-data'
import { STORE_ADDRESS, WHATSAPP_URL } from '@/lib/contact'

export const metadata: Metadata = {
  title: { absolute: 'Sobre nosotros | H2R Online Store' },
  description:
    'H2R Online Store: tienda de repuestos y accesorios multimarca para motos en Bucaramanga, con envíos a toda Colombia. Datos de la empresa y cómo contactarnos.',
  alternates: canonical('/sobre-nosotros'),
  robots: { index: true, follow: true },
}

const PILLARS = [
  {
    title: 'Qué hacemos',
    text: 'Comercializamos repuestos y accesorios multimarca para motocicletas en Colombia, con un catálogo completo, seguro y al alcance de un clic.',
  },
  {
    title: 'Cómo trabajamos',
    text: 'Seleccionamos piezas de calidad, te asesoramos por WhatsApp para elegir la correcta para tu moto y despachamos a todo el país.',
  },
  {
    title: 'Dónde estamos',
    text: `Tenemos punto físico en ${STORE_ADDRESS}, donde también puedes recoger tu pedido.`,
  },
]

const SOCIALS = [
  { label: 'Instagram', href: ORGANIZATION.sameAs[0] },
  { label: 'Facebook', href: ORGANIZATION.sameAs[1] },
  { label: 'TikTok', href: ORGANIZATION.sameAs[2] },
]

export default function SobreNosotrosPage() {
  return (
    <div className="bg-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20">
        <span className="inline-block text-xs font-semibold uppercase tracking-wider text-sky-600 bg-sky-50 px-3 py-1 rounded-full">
          Sobre nosotros
        </span>
        <h1 className="mt-4 text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight">
          Repuestos para tu moto, con respaldo real
        </h1>
        <p className="mt-4 text-gray-600 leading-relaxed max-w-2xl">
          En H2R Online Store queremos ser la mejor opción para tu motocicleta: piezas de alta calidad, envíos rápidos
          y un proceso de compra fácil y confiable, donde estés.
        </p>

        <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
          {PILLARS.map(({ title, text }) => (
            <div key={title} className="rounded-2xl border border-gray-100 bg-gray-50/60 p-5">
              <h2 className="text-sm font-semibold text-gray-900 mb-1.5">{title}</h2>
              <p className="text-sm text-gray-500 leading-relaxed">{text}</p>
            </div>
          ))}
        </div>

        <h2 className="mt-14 text-xl font-bold text-gray-900">Datos de la empresa</h2>
        <dl className="mt-4 divide-y divide-gray-100 rounded-2xl border border-gray-200 text-sm">
          {[
            ['Razón social', ORGANIZATION.legalName],
            ['NIT', ORGANIZATION.taxId],
            ['Dirección', `${ORGANIZATION.address.street}, ${ORGANIZATION.address.locality}, ${ORGANIZATION.address.region}`],
            ['Teléfono / WhatsApp', ORGANIZATION.telephone],
            ['Correo', ORGANIZATION.email],
          ].map(([term, value]) => (
            <div key={term} className="flex flex-col gap-0.5 px-5 py-3 sm:flex-row sm:gap-4">
              <dt className="w-44 shrink-0 text-gray-500">{term}</dt>
              <dd className="font-medium text-gray-900">{value}</dd>
            </div>
          ))}
        </dl>

        <h2 className="mt-14 text-xl font-bold text-gray-900">Compra con tranquilidad</h2>
        <ul className="mt-3 list-disc pl-5 space-y-1.5 text-gray-700">
          <li>
            <Link href="/garantias" className="text-sky-600 underline hover:text-sky-700">
              Garantía de hasta 6 meses
            </Link>{' '}
            contra defectos de fábrica.
          </li>
          <li>
            Pago seguro con Wompi (tarjetas, PSE, Nequi), Addi y pago contra entrega.
          </li>
          <li>
            <Link href="/legal/politica-de-envios" className="text-sky-600 underline hover:text-sky-700">
              Envíos a todo Colombia
            </Link>{' '}
            con transportadoras reconocidas.
          </li>
        </ul>

        <div className="mt-14 flex flex-wrap items-center gap-3">
          <a
            href={WHATSAPP_URL('Hola H2R, quiero más información')}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-xl bg-sky-500 px-5 py-2.5 text-sm font-bold text-white hover:bg-sky-600 transition-colors"
          >
            Escríbenos por WhatsApp
          </a>
          <Link href="/contacto" className="rounded-xl border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50">
            Radicar una PQR
          </Link>
          {SOCIALS.map((s) => (
            <a
              key={s.label}
              href={s.href}
              target="_blank"
              rel="noopener noreferrer me"
              className="text-sm text-gray-500 underline hover:text-sky-600"
            >
              {s.label}
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}
