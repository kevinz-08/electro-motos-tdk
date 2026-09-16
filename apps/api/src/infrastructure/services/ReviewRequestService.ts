import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common'
import { PrismaService } from '../database/prisma.service'
import { EmailQueueService } from './EmailQueueService'

const SCAN_INTERVAL_MS = 60 * 60 * 1000 // cada hora
/** Días tras la creación del pedido antes de pedir la reseña (tiempo para usar el producto). */
const MIN_DAYS_AFTER_ORDER = Number(process.env['REVIEW_REQUEST_MIN_DAYS'] ?? 7)
/** No pedir reseñas de pedidos más viejos que esto. */
const MAX_DAYS_AFTER_ORDER = 60
const BATCH_SIZE = 20

/**
 * Programa el correo "Califica tu compra" (README §22.6).
 *
 * En vez de engancharse a cada punto donde un pedido pasa a DELIVERED (webhook de Vendelo,
 * poller, panel admin), escanea periódicamente pedidos DELIVERED sin `reviewRequestedAt`
 * y los encola en EmailQueue con kind REVIEW_REQUEST — así hereda los reintentos de la cola.
 *
 * Idempotente: `reviewRequestedAt` se marca con un updateMany condicionado a null antes de
 * encolar, de modo que dos instancias de Cloud Run no encolan el mismo pedido.
 */
@Injectable()
export class ReviewRequestService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ReviewRequestService.name)
  private timer?: NodeJS.Timeout

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailQueue: EmailQueueService,
  ) {}

  onModuleInit(): void {
    this.timer = setInterval(() => {
      this.scheduleReviewRequests().catch((e) => this.logger.error(`[ReviewRequest] Error: ${e}`))
    }, SCAN_INTERVAL_MS)
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer)
  }

  async scheduleReviewRequests(now = new Date()): Promise<number> {
    const day = 24 * 60 * 60 * 1000
    const candidates = await this.prisma.client.order.findMany({
      where: {
        status: 'DELIVERED',
        reviewRequestedAt: null,
        contactEmail: { not: '' },
        createdAt: {
          lte: new Date(now.getTime() - MIN_DAYS_AFTER_ORDER * day),
          gte: new Date(now.getTime() - MAX_DAYS_AFTER_ORDER * day),
        },
      },
      select: { id: true, contactEmail: true },
      take: BATCH_SIZE,
    })

    let scheduled = 0
    for (const order of candidates) {
      const claimed = await this.prisma.client.order.updateMany({
        where: { id: order.id, reviewRequestedAt: null },
        data: { reviewRequestedAt: now },
      })
      if (claimed.count === 0) continue
      await this.emailQueue.enqueue(order.contactEmail, order.id, 'REVIEW_REQUEST')
      scheduled++
    }

    if (scheduled > 0) this.logger.log(`[ReviewRequest] ${scheduled} solicitud(es) de reseña encoladas`)
    return scheduled
  }
}
