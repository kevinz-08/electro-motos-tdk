/**
 * Singleton del cliente Prisma para todo el monorepo.
 *
 * Por qué está en @h2r/database:
 *   Prisma 7 requiere un driver adapter (PrismaPg) y un paso de `generate` que
 *   escribe el cliente en ./src/generated/prisma/. Centralizar evita que cada
 *   consumidor (apps/web, apps/api) configure su propio adapter o mantenga
 *   su propia copia del cliente generado.
 *
 * Por qué singleton con globalThis:
 *   Next.js + Turbopack recargan módulos en cada cambio. Sin el patrón global,
 *   cada recarga crearía una nueva PrismaClient con su propio pool de conexiones
 *   y agotaría el límite de Neon (5-10 conexiones en tier gratuito).
 *
 * Consumo:
 *   import { prisma } from '@h2r/database'
 *
 * Nota sobre el generated client:
 *   Se genera en `./generated/prisma/` via `prisma generate` (script `generate`
 *   de este paquete). La carpeta está en .gitignore. Antes de un build limpio
 *   correr `pnpm --filter @h2r/database generate`.
 */
import { PrismaClient } from './generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

function createPrismaClient(): PrismaClient {
  const connectionString = process.env['DATABASE_URL']
  if (!connectionString) {
    throw new Error(
      '@h2r/database: DATABASE_URL no está definida. ' +
        'Configurá el .env de la app consumidora (apps/web o apps/api).',
    )
  }
  const adapter = new PrismaPg({ connectionString })
  return new PrismaClient({
    adapter,
    log:
      process.env['NODE_ENV'] === 'development'
        ? ['query', 'error', 'warn']
        : ['error'],
  })
}

const globalForPrisma = globalThis as unknown as {
  __h2rPrisma: PrismaClient | undefined
}

export const prisma: PrismaClient =
  globalForPrisma.__h2rPrisma ?? createPrismaClient()

if (process.env['NODE_ENV'] !== 'production') {
  globalForPrisma.__h2rPrisma = prisma
}

// Re-exportar tipos generados para que los consumidores no tengan que importarlos
// desde la ruta interna ./generated/prisma/*
export { PrismaClient } from './generated/prisma/client'
export type { Prisma } from './generated/prisma/client'
export * from './generated/prisma/enums'
export * from './generated/prisma/models'
