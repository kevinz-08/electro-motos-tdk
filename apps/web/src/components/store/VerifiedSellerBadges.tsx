/**
 * Sellos de vendedor verificado en Mercado Libre y Addi (README §31).
 *
 * Un solo componente con tres variantes para repetir el mensaje de confianza
 * en todo el recorrido. Los datos salen de `lib/seller-platforms.ts`.
 *
 *   - `banner`  → home, entre Marcas y Productos destacados.
 *   - `compact` → fila dentro del bloque de confianza de la ficha de producto.
 *   - `footer`  → logos pequeños en la barra inferior (fondo oscuro).
 */
import Image from 'next/image'
import { ArrowUpRight } from 'lucide-react'
import { SELLER_PLATFORMS, type SellerPlatform } from '@/lib/seller-platforms'

type Variant = 'banner' | 'compact' | 'footer'

const EXTERNAL = { target: '_blank', rel: 'noopener noreferrer' } as const

/** Logo recortado en un recuadro del mismo color del fondo del archivo. */
function LogoTile({ platform, className }: { platform: SellerPlatform; className: string }) {
  return (
    <span className={`relative shrink-0 overflow-hidden ${platform.tileClass} ${className}`}>
      <Image
        src={platform.logo}
        alt={`Logo de ${platform.name}`}
        fill
        sizes="80px"
        className={`object-cover ${platform.logoClass}`}
      />
    </span>
  )
}

export function VerifiedSellerBadges({ variant = 'banner' }: { variant?: Variant }) {
  if (variant === 'compact') {
    return (
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 text-sm">
        <p className="text-gray-600">
          <strong className="text-gray-800">Vendedor verificado:</strong>
        </p>
        {SELLER_PLATFORMS.map((p) => (
          <a
            key={p.id}
            href={p.href}
            {...EXTERNAL}
            aria-label={`${p.role} (se abre en una pestaña nueva)`}
            className="group inline-flex items-center gap-2 text-gray-700 hover:text-sky-700 transition-colors"
          >
            <LogoTile platform={p} className="h-7 w-7 rounded-md" />
            <span className="font-medium">{p.name}</span>
          </a>
        ))}
      </div>
    )
  }

  if (variant === 'footer') {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-600 mr-1">Vendedores en</span>
        {SELLER_PLATFORMS.map((p) => (
          <a
            key={p.id}
            href={p.href}
            {...EXTERNAL}
            aria-label={`${p.role} (se abre en una pestaña nueva)`}
            className="inline-flex items-center gap-1.5 rounded bg-white/5 border border-white/10 pr-2.5 hover:border-sky-400/60 transition-colors"
          >
            <LogoTile platform={p} className="h-6 w-6 rounded-l" />
            <span className="text-[11px] font-semibold text-gray-300 tracking-wide">{p.name}</span>
          </a>
        ))}
      </div>
    )
  }

  return (
    <section
      id="vendedor-verificado"
      aria-labelledby="vendedor-verificado-titulo"
      className="py-20 px-4 bg-white border-t border-gray-100"
    >
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2
            id="vendedor-verificado-titulo"
            className="text-3xl md:text-4xl font-bold text-gray-900 tracking-tight"
          >
            Compra tranquilo, estamos donde ya confías
          </h2>
          <p className="mt-3 max-w-lg mx-auto text-gray-500">
            Somos vendedores verificados en las plataformas que miles de colombianos usan cada día
          </p>
        </div>

        <ul className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          {SELLER_PLATFORMS.map((p) => (
            <li key={p.id}>
              <a
                href={p.href}
                {...EXTERNAL}
                aria-label={`${p.role} (se abre en una pestaña nueva)`}
                className="group flex h-full items-center gap-5 rounded-2xl border border-gray-200 bg-white p-5 md:p-6 transition-all duration-300 motion-safe:hover:-translate-y-1 hover:border-sky-300 hover:shadow-md hover:shadow-sky-100/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
              >
                <LogoTile platform={p} className="h-20 w-20 md:h-24 md:w-24 rounded-2xl" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold uppercase tracking-wider text-sky-600">{p.role}</p>
                  <p className="mt-1 text-sm text-gray-600 leading-snug">{p.description}</p>
                  {p.stat && (
                    <p className="mt-2 text-sm text-gray-500">
                      <span className="text-xl font-bold text-gray-900">{p.stat.value}</span> {p.stat.label}
                    </p>
                  )}
                </div>
                <ArrowUpRight
                  className="hidden sm:block h-5 w-5 shrink-0 text-gray-300 transition-colors group-hover:text-sky-500"
                  aria-hidden="true"
                />
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
