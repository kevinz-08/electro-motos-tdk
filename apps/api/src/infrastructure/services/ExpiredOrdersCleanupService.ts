import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common'
import { PrismaService } from '../database/prisma.service'

const CLEANUP_INTERVAL_MS = 60 * 60 * 1000 // cada hora
const EXPIRY_HOURS = 2

@Injectable()
export class ExpiredOrdersCleanupService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ExpiredOrdersCleanupService.name)
  private timer?: NodeJS.Timeout

  constructor(private readonly prisma: PrismaService) {}

  onModuleInit(): void {
    this.timer = setInterval(() => {
      this.cancelExpiredOrders().catch((e) =>
        this.logger.error(`[ExpiredOrdersCleanup] Error en limpieza: ${e}`),
      )
    }, CLEANUP_INTERVAL_MS)
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer)
  }

  async cancelExpiredOrders(): Promise<void> {
    const expiryDate = new Date(Date.now() - EXPIRY_HOURS * 60 * 60 * 1000)

    const expired = await this.prisma.client.order.findMany({
      where: { status: 'PENDING', createdAt: { lt: expiryDate } },
      select: { id: true },
    })
    if (expired.length === 0) return
    const ids = expired.map((o) => o.id)

    const result = await this.prisma.client.$transaction(async (tx) => {
      const cancelled = await tx.order.updateMany({
        where: { id: { in: ids }, status: 'PENDING' },
        data: { status: 'CANCELLED' },
      })
      // Libera el uso de cupón solo de los que realmente quedaron CANCELLED
      // (un webhook pudo aprobar alguno entre el findMany y el updateMany).
      await tx.couponRedemption.updateMany({
        where: { orderId: { in: ids }, order: { status: 'CANCELLED' }, status: { not: 'RELEASED' } },
        data: { status: 'RELEASED', activeUniqueKey: null },
      })
      return cancelled
    })

    if (result.count > 0) {
      this.logger.warn(
        `[ExpiredOrdersCleanup] ${result.count} orden(es) PENDING expiradas marcadas CANCELLED (umbral: ${EXPIRY_HOURS}h)`,
      )
    }
  }
}
