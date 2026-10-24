import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common'
import { Order } from '@h2r/domain'
import { PrismaService } from '../database/prisma.service'
import { ResendEmailService } from './ResendEmailService'

const PROCESS_INTERVAL_MS = 2 * 60 * 1000 // tick cada 2 minutos (solo CPU si no hay trabajo)
/**
 * Barrido de seguridad: consulta la BD aunque esta instancia no haya encolado nada,
 * para recoger filas de una instancia de Cloud Run que murió antes de enviarlas.
 */
const SAFETY_SWEEP_MS = 60 * 60 * 1000
const MAX_ATTEMPTS = 3
const BACKOFF_SECONDS = [5, 30, 120] // por intento fallido

export type EmailKind = 'ORDER_CONFIRMATION' | 'REVIEW_REQUEST'

@Injectable()
export class EmailQueueService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(EmailQueueService.name)
  private timer?: NodeJS.Timeout
  /**
   * Hay (o puede haber) filas PENDING que esta instancia conoce. Mientras sea false,
   * el tick no consulta la BD: Neon cobra por tiempo encendido y una query cada
   * 2 min lo mantenía despierto todo el día (README §27). Arranca en true para hacer
   * un barrido inicial.
   */
  private hasPendingWork = true
  /** Se incrementa en cada `enqueue` — detecta encolados ocurridos durante un tick. */
  private enqueueGeneration = 0
  private lastQueryAt = 0

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: ResendEmailService,
  ) {}

  onModuleInit(): void {
    this.timer = setInterval(() => {
      this.tick().catch((e) => this.logger.error(`[EmailQueue] Error en procesamiento: ${e}`))
    }, PROCESS_INTERVAL_MS)
  }

  /**
   * Procesa la cola solo si hay trabajo conocido o toca el barrido de seguridad.
   * Tras procesar, cuenta las filas PENDING que quedan (reintentos con backoff):
   * si no queda ninguna, los siguientes ticks no tocan la BD.
   */
  private async tick(): Promise<void> {
    const now = Date.now()
    if (!this.hasPendingWork && now - this.lastQueryAt < SAFETY_SWEEP_MS) return
    this.lastQueryAt = now

    const generation = this.enqueueGeneration
    await this.processNext()
    const remaining = await this.prisma.client.emailQueue.count({ where: { status: 'PENDING' } })
    this.hasPendingWork = remaining > 0 || generation !== this.enqueueGeneration
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer)
  }

  /**
   * Encola un correo del pedido.
   *   ORDER_CONFIRMATION (default) — pago aprobado / pedido COD confirmado.
   *   REVIEW_REQUEST               — "Califica tu compra" (ReviewRequestService, README §22.6).
   */
  async enqueue(to: string, orderId: string, kind: EmailKind = 'ORDER_CONFIRMATION'): Promise<void> {
    await this.prisma.client.emailQueue.create({
      data: { to, orderId, kind, status: 'PENDING' },
    })
    this.enqueueGeneration++
    this.hasPendingWork = true
    this.logger.log(`[EmailQueue] Encolado email ${kind} orderId=${orderId}`)
  }

  async processNext(): Promise<void> {
    const pending = await this.prisma.client.emailQueue.findMany({
      where: { status: 'PENDING', nextRetry: { lte: new Date() } },
      take: 10,
      orderBy: { createdAt: 'asc' },
    })

    if (pending.length === 0) return

    this.logger.log(`[EmailQueue] Procesando ${pending.length} email(s) pendiente(s)`)

    for (const item of pending) {
      try {
        const order = await this.prisma.client.order.findUnique({
          where: { id: item.orderId },
          include: { items: { include: { product: { select: { name: true } } } } },
        })

        if (!order) {
          await this.prisma.client.emailQueue.update({
            where: { id: item.id },
            data: { status: 'FAILED', lastError: 'Pedido no encontrado', attempts: item.attempts + 1 },
          })
          this.logger.warn(`[EmailQueue] Pedido no encontrado orderId=${item.orderId}, marcando FAILED`)
          continue
        }

        if (item.kind === 'REVIEW_REQUEST') {
          await this.emailService.sendReviewRequest(
            order.id,
            (order.shippingAddress as { fullName?: string } | null)?.fullName ?? '',
            order.items.map((i) => ({ orderItemId: i.id, productName: i.product.name })),
            item.to,
          )
        } else {
          await this.emailService.sendOrderConfirmation(order as unknown as Order, item.to)
        }

        await this.prisma.client.emailQueue.update({
          where: { id: item.id },
          data: { status: 'SENT', attempts: item.attempts + 1 },
        })
        this.logger.log(`[EmailQueue] Email enviado exitosamente orderId=${item.orderId}`)
      } catch (e) {
        const attempts = item.attempts + 1
        const backoffSecs = BACKOFF_SECONDS[attempts - 1] ?? BACKOFF_SECONDS[BACKOFF_SECONDS.length - 1]
        const nextRetry = new Date(Date.now() + backoffSecs * 1000)
        const status = attempts >= MAX_ATTEMPTS ? 'FAILED' : 'PENDING'

        await this.prisma.client.emailQueue.update({
          where: { id: item.id },
          data: { attempts, lastError: String(e), status, nextRetry },
        })

        this.logger.error(
          `[EmailQueue] Intento ${attempts}/${MAX_ATTEMPTS} fallido orderId=${item.orderId} status=${status}: ${e}`,
        )
      }
    }
  }

  async findFailed(limit = 50) {
    return this.prisma.client.emailQueue.findMany({
      where: { status: 'FAILED' },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })
  }
}
