import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common'
import { PrismaService } from '../database/prisma.service'
import { VendeloService } from './VendeloService'

const PROCESS_INTERVAL_MS = 2 * 60 * 1000 // cada 2 minutos
const MAX_ATTEMPTS = 3
const BACKOFF_SECONDS = [5, 30, 120] // por intento fallido

@Injectable()
export class VendeloOrderQueueService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(VendeloOrderQueueService.name)
  private timer?: NodeJS.Timeout

  constructor(
    private readonly prisma: PrismaService,
    private readonly vendeloService: VendeloService,
  ) {}

  onModuleInit(): void {
    this.timer = setInterval(() => {
      this.processNext().catch((e) => this.logger.error(`[VendeloOrderQueue] Error en procesamiento: ${e}`))
    }, PROCESS_INTERVAL_MS)
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer)
  }

  async enqueue(orderId: string): Promise<void> {
    await this.prisma.client.vendeloOrderQueue.create({
      data: { orderId, status: 'PENDING' },
    })
    this.logger.log(`[VendeloOrderQueue] Encolado orderId=${orderId}`)
  }

  async processNext(): Promise<void> {
    const pending = await this.prisma.client.vendeloOrderQueue.findMany({
      where: { status: 'PENDING', nextRetry: { lte: new Date() } },
      take: 10,
      orderBy: { createdAt: 'asc' },
    })

    if (pending.length === 0) return

    this.logger.log(`[VendeloOrderQueue] Procesando ${pending.length} orden(es) pendiente(s)`)

    for (const item of pending) {
      try {
        const order = await this.prisma.client.order.findUnique({
          where: { id: item.orderId },
          include: { items: true },
        })

        if (!order) {
          await this.prisma.client.vendeloOrderQueue.update({
            where: { id: item.id },
            data: { status: 'FAILED', lastError: 'Pedido no encontrado', attempts: item.attempts + 1 },
          })
          this.logger.warn(`[VendeloOrderQueue] Pedido no encontrado orderId=${item.orderId}, marcando FAILED`)
          continue
        }

        const user = await this.prisma.client.user.findUnique({
          where: { id: order.userId },
          select: { email: true },
        })

        // Mapear desde Prisma al tipo de dominio Order
        const domainOrder = {
          ...order,
          shippingAddress: order.shippingAddress as unknown as import('@h2r/domain').ShippingAddress,
          items: order.items.map((i) => ({
            id: i.id,
            orderId: i.orderId,
            productId: i.productId,
            quantity: i.quantity,
            priceAtPurchase: i.priceAtPurchase,
          })),
        } as import('@h2r/domain').Order

        const vendeloRes = await this.vendeloService.createOrder(domainOrder, user?.email ?? '')

        const vendeloOrderId = vendeloRes.items?.[0]?.id as string | undefined

        await this.prisma.client.$transaction([
          this.prisma.client.vendeloOrderQueue.update({
            where: { id: item.id },
            data: { status: 'SENT', attempts: item.attempts + 1 },
          }),
          ...(vendeloOrderId
            ? [this.prisma.client.order.update({
                where: { id: order.id },
                data: { vendeloOrderId },
              })]
            : []),
        ])

        this.logger.log(
          `[VendeloOrderQueue] Orden creada exitosamente orderId=${order.id} vendeloOrderId=${vendeloOrderId ?? 'n/a'}`,
        )
      } catch (e) {
        const attempts = item.attempts + 1
        const backoffSecs = BACKOFF_SECONDS[attempts - 1] ?? BACKOFF_SECONDS[BACKOFF_SECONDS.length - 1]
        const nextRetry = new Date(Date.now() + backoffSecs * 1000)
        const status = attempts >= MAX_ATTEMPTS ? 'FAILED' : 'PENDING'

        await this.prisma.client.vendeloOrderQueue.update({
          where: { id: item.id },
          data: { attempts, lastError: String(e), status, nextRetry },
        })

        this.logger.error(
          `[VendeloOrderQueue] Intento ${attempts}/${MAX_ATTEMPTS} fallido orderId=${item.orderId} status=${status}: ${e}`,
        )
      }
    }
  }

  async findFailed(limit = 50) {
    return this.prisma.client.vendeloOrderQueue.findMany({
      where: { status: 'FAILED' },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })
  }
}
