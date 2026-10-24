'use client'

/**
 * "Productos destacados" de la home: baraja en el navegador los candidatos que
 * cachea el servidor (`getCachedFeaturedProducts`) y muestra 4.
 *
 * La aleatoriedad vive aquí y no en el servidor porque la home se cachea sin TTL
 * (README §27): un `ORDER BY RANDOM()` en el servidor quedaría congelado.
 *
 * `useSyncExternalStore` da semilla 0 en el servidor y durante la hidratación
 * (se pintan los 4 más recientes, sin diferencias de hidratación) y una semilla
 * aleatoria por carga de página en el cliente, que baraja.
 */
import { useSyncExternalStore } from 'react'
import type { Product } from '@h2r/domain'
import { ProductCard } from './ProductCard'

const VISIBLE_COUNT = 4

let clientSeed: number | undefined
const subscribe = () => () => {}
const getClientSeed = () => (clientSeed ??= 1 + Math.floor(Math.random() * 2 ** 31))
const getServerSeed = () => 0

/** Fisher–Yates con un PRNG determinista (mulberry32). Semilla 0 = orden original. */
function seededShuffle<T>(items: readonly T[], seed: number): T[] {
  const copy = [...items]
  if (seed === 0) return copy
  let state = seed
  const random = () => {
    state = (state + 0x6d2b79f5) | 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

export function FeaturedProducts({ products }: { products: Product[] }) {
  const seed = useSyncExternalStore(subscribe, getClientSeed, getServerSeed)
  const visible = seededShuffle(products, seed).slice(0, VISIBLE_COUNT)

  return (
    <>
      {/*
        Sin `priority`: los destacados van bajo el hero, que es el
        elemento LCP de la home. Precargarlos generaba dos
        <link rel="preload"> que le competían el ancho de banda
        (docs/seo/01-resultados.md).
      */}
      {visible.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </>
  )
}
