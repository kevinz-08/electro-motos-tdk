/**
 * /garantias — página comercial de garantías (Fase 4, ítem 10, fricción C6).
 *
 * Resume en lenguaje llano lo que ya dicen las políticas legales; NO crea
 * compromisos nuevos. Fuente de cada dato:
 *   - "hasta 6 meses contra defectos de fábrica" → H-17, confirmado 2026-09-23.
 *   - Cambios en 5 días calendario → H-15, confirmado.
 *   - Proceso, plazo de 15 días hábiles, bono y excepciones → sección 6 de
 *     /legal/politica-de-envios, que es el texto que manda.
 * No existe (y no se promete) cambio por incompatibilidad con la moto: H-16.
 */
import type { Metadata } from 'next'
import Link from 'next/link'
import { canonical } from '@/lib/seo'
import { ORGANIZATION } from '@/lib/structured-data'
import { WHATSAPP_URL } from '@/lib/contact'

export const metadata: Metadata = {
  title: { absolute: 'Garantía de repuestos para moto | H2R Online Store' },
  description:
    'Garantía de hasta 6 meses contra defectos de fábrica en repuestos para moto. Cómo reclamarla, en qué plazo se resuelve y qué casos no cubre.',
  alternates: canonical('/garantias'),
  robots: { index: true, follow: true },
}

const STEPS = [
  { title: 'Escríbenos', text: 'Por WhatsApp o al correo, con tu número de pedido.' },
  { title: 'Cuéntanos el defecto', text: 'Descríbelo y adjunta fotos o un video donde se vea.' },
  { title: 'Lo gestionamos', text: 'Resolvemos en máximo 15 días hábiles desde que recibimos el producto.' },
]

export default function GarantiasPage() {
  const email = ORGANIZATION.email
  return (
    <div className="bg-white">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20">
        <span className="inline-block text-xs font-semibold uppercase tracking-wider text-sky-600 bg-sky-50 px-3 py-1 rounded-full">
          Garantías
        </span>
        <h1 className="mt-4 text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight">
          Garantía de hasta 6 meses contra defectos de fábrica
        </h1>
        <p className="mt-4 text-gray-600 leading-relaxed">
          Si un repuesto que compraste en H2R llega con un defecto de fabricación, lo reparamos, lo cambiamos o te
          devolvemos tu dinero, sin costo adicional para ti. La garantía cuenta desde el día en que recibes el producto.
        </p>

        <h2 className="mt-10 text-xl font-bold text-gray-900">Cómo reclamarla</h2>
        <ol className="mt-4 grid gap-3 sm:grid-cols-3">
          {STEPS.map((s, i) => (
            <li key={s.title} className="rounded-2xl border border-gray-100 bg-gray-50/60 p-5">
              <span className="text-xs font-bold text-sky-600">Paso {i + 1}</span>
              <p className="mt-1 text-sm font-semibold text-gray-900">{s.title}</p>
              <p className="mt-1 text-sm text-gray-500 leading-relaxed">{s.text}</p>
            </li>
          ))}
        </ol>
        <p className="mt-4 text-sm text-gray-600">
          Escríbenos por{' '}
          <a
            href={WHATSAPP_URL('Hola H2R, quiero reclamar la garantía de un producto. Mi número de pedido es: ')}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sky-600 underline hover:text-sky-700"
          >
            WhatsApp
          </a>{' '}
          o a{' '}
          <a href={`mailto:${email}`} className="text-sky-600 underline hover:text-sky-700">
            {email}
          </a>
          .
        </p>

        <h2 className="mt-10 text-xl font-bold text-gray-900">Qué puedes elegir</h2>
        <ul className="mt-3 list-disc pl-5 space-y-1.5 text-gray-700">
          <li>Reparación gratuita del defecto de fabricación.</li>
          <li>Cambio por otro producto igual o de las mismas especificaciones, si no se puede reparar.</li>
          <li>Devolución del dinero cuando la falla se repite o no hay reparación ni cambio posible.</li>
        </ul>
        <p className="mt-3 text-sm text-gray-500">
          Si no se logra una solución, el producto se cambia por uno nuevo o recibes un bono por el valor de tu compra,
          redimible durante 6 meses.
        </p>

        <h2 className="mt-10 text-xl font-bold text-gray-900">Qué no cubre</h2>
        <ul className="mt-3 list-disc pl-5 space-y-1.5 text-gray-700">
          <li>Uso indebido, negligencia o manipulación no autorizada.</li>
          <li>Instalación o mantenimiento distinto al indicado en el manual.</li>
          <li>Alteración o modificación del producto.</li>
          <li>Desgaste natural por uso normal.</li>
        </ul>

        <h2 className="mt-10 text-xl font-bold text-gray-900">Garantía no es lo mismo que cambio</h2>
        <p className="mt-3 text-gray-700 leading-relaxed">
          La garantía cubre defectos de fábrica. Si simplemente quieres cambiar un producto sin uso, tienes{' '}
          <strong>5 días calendario</strong> desde que lo recibes, con el empaque original y sin instalar. Antes de
          comprar, confirma con un asesor que el repuesto le sirve a tu moto.
        </p>

        <div className="mt-10 rounded-2xl border border-gray-200 p-5 text-sm text-gray-600">
          Condiciones completas en la{' '}
          <Link href="/legal/politica-de-envios#seccion-garantia" className="text-sky-600 underline hover:text-sky-700">
            política de garantía
          </Link>{' '}
          y la{' '}
          <Link href="/legal/politica-de-cambios" className="text-sky-600 underline hover:text-sky-700">
            política de cambios
          </Link>
          .
        </div>
      </div>
    </div>
  )
}
