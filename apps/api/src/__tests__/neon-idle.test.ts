/**
 * Consumo de Neon (README §27): la caché de la tienda se invalida tras cambios de
 * stock, y las colas no consultan la BD en cada tick si no tienen trabajo.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// PrismaService importa @h2r/database: mockearlo evita cargar el cliente generado.
vi.mock('@h2r/database', () => ({
  prisma: { $connect: vi.fn(), $disconnect: vi.fn() },
  PrismaClient: vi.fn(),
}))

import { StorefrontCacheService } from '../infrastructure/services/StorefrontCacheService'
import { EmailQueueService } from '../infrastructure/services/EmailQueueService'
import { VendeloOrderQueueService } from '../infrastructure/services/VendeloOrderQueueService'

type Tickable = { tick: () => Promise<void> }

describe('StorefrontCacheService', () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    fetchMock.mockReset().mockResolvedValue({ ok: true, status: 200 })
    vi.stubGlobal('fetch', fetchMock)
    process.env['INTERNAL_API_SECRET'] = 'secret'
    process.env['FRONTEND_URL'] = 'https://tienda.test'
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  function makeService(items: Array<{ slug: string; stock: number }>) {
    const prisma = {
      client: {
        orderItem: {
          findMany: vi.fn().mockResolvedValue(items.map((product) => ({ product }))),
        },
      },
    }
    return new StorefrontCacheService(prisma as never)
  }

  function sentTags(): string[] {
    const [, init] = fetchMock.mock.calls[0] as [string, { body: string }]
    return (JSON.parse(init.body) as { tags: string[] }).tags
  }

  it('venta con stock holgado: invalida solo la ficha de cada producto', async () => {
    await makeService([{ slug: 'filtro', stock: 8 }, { slug: 'bujia', stock: 3 }]).revalidateOrderProducts('o1')

    expect(fetchMock).toHaveBeenCalledWith('https://tienda.test/api/internal/revalidate', expect.anything())
    expect(sentTags()).toEqual(['product:filtro', 'product:bujia'])
  })

  it('stock resultante ≤ 1: añade el tag global products (cambia la tarjeta)', async () => {
    await makeService([{ slug: 'filtro', stock: 8 }, { slug: 'cadena', stock: 0 }]).revalidateOrderProducts('o1')

    expect(sentTags()).toEqual(['product:filtro', 'product:cadena', 'products'])
  })

  it('broad (devolución): siempre añade products', async () => {
    await makeService([{ slug: 'filtro', stock: 9 }]).revalidateOrderProducts('o1', { broad: true })

    expect(sentTags()).toEqual(['product:filtro', 'products'])
  })

  it('nunca lanza aunque la web no responda', async () => {
    fetchMock.mockRejectedValue(new Error('ECONNREFUSED'))

    await expect(makeService([{ slug: 'filtro', stock: 9 }]).revalidateOrderProducts('o1')).resolves.toBeUndefined()
  })
})

describe('Colas sin trabajo no consultan la BD', () => {
  it('EmailQueueService: tras un barrido vacío, el siguiente tick no toca la BD hasta un enqueue', async () => {
    const emailQueue = {
      findMany: vi.fn().mockResolvedValue([]),
      count: vi.fn().mockResolvedValue(0),
      create: vi.fn().mockResolvedValue({}),
    }
    const service = new EmailQueueService({ client: { emailQueue } } as never, {} as never)
    const tick = () => (service as unknown as Tickable).tick()

    await tick() // barrido inicial
    expect(emailQueue.findMany).toHaveBeenCalledTimes(1)

    await tick() // sin trabajo: no consulta
    expect(emailQueue.findMany).toHaveBeenCalledTimes(1)
    expect(emailQueue.count).toHaveBeenCalledTimes(1)

    await service.enqueue('a@b.co', 'o1')
    await tick() // hay trabajo: consulta
    expect(emailQueue.findMany).toHaveBeenCalledTimes(2)
  })

  it('EmailQueueService: sigue consultando mientras queden reintentos PENDING', async () => {
    const emailQueue = {
      findMany: vi.fn().mockResolvedValue([]),
      count: vi.fn().mockResolvedValueOnce(1).mockResolvedValue(0),
    }
    const service = new EmailQueueService({ client: { emailQueue } } as never, {} as never)
    const tick = () => (service as unknown as Tickable).tick()

    await tick() // queda 1 reintento
    await tick() // vuelve a consultar; ya no queda nada
    await tick() // no consulta
    expect(emailQueue.findMany).toHaveBeenCalledTimes(2)
  })

  it('VendeloOrderQueueService: tras un barrido vacío no consulta; requeue/enqueue lo reactivan', async () => {
    const vendeloOrderQueue = {
      findMany: vi.fn().mockResolvedValue([]),
      updateMany: vi.fn().mockResolvedValue({ count: 0 }),
      count: vi.fn().mockResolvedValue(0),
      create: vi.fn().mockResolvedValue({}),
    }
    const service = new VendeloOrderQueueService({ client: { vendeloOrderQueue } } as never, {} as never)
    const tick = () => (service as unknown as Tickable).tick()

    await tick()
    await tick()
    expect(vendeloOrderQueue.findMany).toHaveBeenCalledTimes(1)

    await service.enqueue('o1')
    await tick()
    expect(vendeloOrderQueue.findMany).toHaveBeenCalledTimes(2)
  })
})
