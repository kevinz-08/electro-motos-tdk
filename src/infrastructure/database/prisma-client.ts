/**
 * Singleton del cliente de Prisma para toda la aplicación.
 *
 * Por qué Prisma 7 requiere un driver adapter:
 *   Prisma 7 separó el motor de consultas del driver de base de datos.
 *   Ya no incluye un conector directo — se necesita instalar @prisma/adapter-pg
 *   y pasarlo al constructor de PrismaClient.
 *
 * Por qué PrismaPg:
 *   PrismaPg usa el driver `pg` (node-postgres), que es compatible con cualquier
 *   PostgreSQL estándar incluyendo Neon. Soporta SSL necesario para Neon.
 *
 * Por qué singleton:
 *   Next.js con Turbopack recarga los módulos en cada cambio de archivo (hot reload).
 *   Sin singleton, cada recarga crearía una nueva instancia de PrismaClient con
 *   su propio pool de conexiones, agotando rápidamente el límite de conexiones de Neon
 *   (máx. 5-10 en el tier gratuito).
 *
 *   La técnica: guardar la instancia en `globalThis` que persiste entre recargas.
 *   En producción esto no aplica porque no hay hot reload.
 *
 * Logging:
 *   En desarrollo: loguea todas las queries, errores y warnings (útil para depurar)
 *   En producción: solo loguea errores (para no llenar los logs de ruido)
 */
import { PrismaClient } from '@/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

/**
 * Crea una nueva instancia del cliente de Prisma con el adapter de PostgreSQL.
 * Esta función solo se llama UNA VEZ gracias al patrón singleton de abajo.
 */
function createPrismaClient() {
  const adapter = new PrismaPg({ connectionString: process.env['DATABASE_URL'] ?? '' })
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })
}

// Patrón singleton: guardar en globalThis para sobrevivir hot reloads de Next.js
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined }

/**
 * Instancia única de Prisma para toda la aplicación.
 * Importar directamente: `import { prisma } from '@/infrastructure/database/prisma-client'`
 */
export const prisma = globalForPrisma.prisma ?? createPrismaClient()

// Solo en desarrollo: guardar referencia en globalThis para evitar múltiples instancias
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
