'use client'

/**
 * Selector "¿Qué moto tienes?" (docs/seo/, Fase 2).
 *
 * Marca → modelo → año (opcional). Guarda la elección en la cookie `h2r-moto`
 * (ver `lib/my-motorcycle.ts` para el porqué de la cookie y no localStorage).
 *
 * Detalles deliberados:
 *   - El año es **opcional**: pedirlo como obligatorio pierde compradores, y la
 *     regla de compatibilidad ya trata "sin año" como compatible.
 *   - Al guardar se emite un evento al que están suscritos los badges de
 *     compatibilidad, así que se actualizan al momento **sin recargar la página
 *     ni invalidar el caché del servidor** — las fichas siguen siendo estáticas.
 *   - El catálogo de motos llega como prop desde un Server Component: el
 *     selector no hace fetch al abrirse.
 */
import { useMemo, useState, useSyncExternalStore } from 'react'
import {
  clearMyMotorcycle,
  readMyMotorcycle,
  subscribeToMyMotorcycle,
  writeMyMotorcycle,
  type MyMotorcycle,
} from '@/lib/my-motorcycle'

export interface MotorcycleOption {
  slug: string
  name: string
  brandSlug: string
  brandName: string
  cc: number | null
}

interface Props {
  brands: { slug: string; name: string }[]
  models: MotorcycleOption[]
  /** Compacto para el header; amplio para bloques dentro de la página. */
  variant?: 'header' | 'block'
}

/** En el servidor no hay cookie: el botón se pinta sin moto seleccionada. */
const noneOnServer = (): MyMotorcycle | null => null

/** Rango de años ofrecido: los últimos 25, del más nuevo al más viejo. */
function yearOptions(): number[] {
  const current = new Date().getFullYear()
  return Array.from({ length: 25 }, (_, i) => current - i)
}

export function MotorcycleSelector({ brands, models, variant = 'header' }: Props) {
  const current = useSyncExternalStore(subscribeToMyMotorcycle, readMyMotorcycle, noneOnServer)

  const [open, setOpen] = useState(false)
  const [brandSlug, setBrandSlug] = useState('')
  const [modelSlug, setModelSlug] = useState('')
  const [year, setYear] = useState<string>('')

  const modelsOfBrand = useMemo(
    () => models.filter((m) => m.brandSlug === brandSlug),
    [models, brandSlug],
  )

  const save = () => {
    const model = models.find((m) => m.brandSlug === brandSlug && m.slug === modelSlug)
    if (!model) return

    const moto: MyMotorcycle = {
      brandSlug: model.brandSlug,
      modelSlug: model.slug,
      label: `${model.brandName} ${model.name}`,
      year: year ? Number(year) : null,
    }

    writeMyMotorcycle(moto)
    setOpen(false)
  }

  const clear = () => {
    clearMyMotorcycle()
    setBrandSlug('')
    setModelSlug('')
    setYear('')
    setOpen(false)
  }

  // Sin catálogo de motos cargado no se muestra nada: un selector vacío solo
  // genera desconfianza.
  if (brands.length === 0 || models.length === 0) return null

  const label = current ? current.label : '¿Qué moto tienes?'

  return (
    <div className={variant === 'header' ? 'relative' : 'relative w-full'}>
      <button
        type="button"
        onClick={() => {
          // Al abrir, los desplegables arrancan en la moto ya guardada.
          if (!open && current) {
            setBrandSlug(current.brandSlug)
            setModelSlug(current.modelSlug)
            setYear(current.year ? String(current.year) : '')
          }
          setOpen((v) => !v)
        }}
        aria-expanded={open}
        aria-haspopup="dialog"
        className={
          variant === 'header'
            ? 'inline-flex items-center gap-1.5 rounded-full border border-white/20 px-3 py-1.5 text-xs text-white/80 hover:border-white/40 hover:text-white transition-colors'
            : 'inline-flex w-full items-center justify-between gap-2 rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-700 hover:border-sky-300 transition-colors'
        }
      >
        <span className="flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M5 17a2 2 0 100-4 2 2 0 000 4zm14 0a2 2 0 100-4 2 2 0 000 4zM7 15h6l3-6h3M6 9h5" />
          </svg>
          {label}
        </span>
        {current && <span className="text-[10px] uppercase tracking-wide opacity-60">cambiar</span>}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Selecciona tu moto"
          className={
            variant === 'header'
              ? 'absolute right-0 z-50 mt-2 w-72 rounded-2xl border border-gray-200 bg-white p-4 shadow-xl'
              : 'absolute left-0 right-0 z-50 mt-2 rounded-2xl border border-gray-200 bg-white p-4 shadow-xl'
          }
        >
          <p className="mb-3 text-xs text-gray-500">
            Te mostramos si cada repuesto le sirve a tu moto.
          </p>

          <label className="block text-xs font-medium text-gray-700">
            Marca
            <select
              value={brandSlug}
              onChange={(e) => {
                setBrandSlug(e.target.value)
                setModelSlug('')
              }}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-sky-400 focus:outline-none"
            >
              <option value="">Selecciona una marca</option>
              {brands.map((b) => (
                <option key={b.slug} value={b.slug}>{b.name}</option>
              ))}
            </select>
          </label>

          <label className="mt-3 block text-xs font-medium text-gray-700">
            Modelo
            <select
              value={modelSlug}
              onChange={(e) => setModelSlug(e.target.value)}
              disabled={!brandSlug}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 disabled:bg-gray-50 disabled:text-gray-400 focus:border-sky-400 focus:outline-none"
            >
              <option value="">Selecciona un modelo</option>
              {modelsOfBrand.map((m) => (
                <option key={m.slug} value={m.slug}>
                  {m.name}{m.cc !== null ? ` · ${m.cc} cc` : ''}
                </option>
              ))}
            </select>
          </label>

          <label className="mt-3 block text-xs font-medium text-gray-700">
            Año <span className="font-normal text-gray-400">(opcional)</span>
            <select
              value={year}
              onChange={(e) => setYear(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-sky-400 focus:outline-none"
            >
              <option value="">No lo sé</option>
              {yearOptions().map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </label>

          <div className="mt-4 flex items-center gap-2">
            <button
              type="button"
              onClick={save}
              disabled={!modelSlug}
              className="flex-1 rounded-lg bg-sky-600 px-3 py-2 text-sm font-semibold text-white hover:bg-sky-700 disabled:bg-gray-200 disabled:text-gray-400 transition-colors"
            >
              Guardar
            </button>
            {current && (
              <button
                type="button"
                onClick={clear}
                className="rounded-lg border border-gray-200 px-3 py-2 text-xs text-gray-500 hover:text-gray-700 transition-colors"
              >
                Quitar
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
