import {
  Body, Controller, ForbiddenException, HttpCode,
  Inject, Logger, Param, Patch, Post,
} from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import {
  IOrderRepository, IProductRepository, IPaymentService,
  CreateOrder, OrderStatus,
} from '@h2r/domain'
import {
  ORDER_REPOSITORY, PRODUCT_REPOSITORY, PAYMENT_SERVICE,
} from '../infrastructure/injection-tokens'
import { MercadoPagoService } from '../infrastructure/services/MercadoPagoService'
import { WompiService } from '../infrastructure/services/WompiService'
import { ResendEmailService } from '../infrastructure/services/ResendEmailService'
import { EmailQueueService } from '../infrastructure/services/EmailQueueService'
import { VendeloOrderQueueService } from '../infrastructure/services/VendeloOrderQueueService'
import { PrismaService } from '../infrastructure/database/prisma.service'
import { Roles } from '../auth/decorators/roles.decorator'
import { CurrentUser, JwtUser } from '../auth/decorators/current-user.decorator'
import { CreateOrderDto } from './dto/create-order.dto'
import { UpdateOrderStatusDto } from './dto/update-order-status.dto'

@ApiTags('orders')
@ApiBearerAuth('access-token')
@Controller('orders')
export class OrdersController {
  private readonly logger = new Logger(OrdersController.name)

  constructor(
    @Inject(ORDER_REPOSITORY)   private readonly orderRepo: IOrderRepository,
    @Inject(PRODUCT_REPOSITORY) private readonly productRepo: IProductRepository,
    @Inject(PAYMENT_SERVICE)    private readonly wompiService: IPaymentService,
    private readonly mercadoPagoService: MercadoPagoService,
    private readonly emailService: ResendEmailService,
    private readonly emailQueue: EmailQueueService,
    private readonly vendeloOrderQueue: VendeloOrderQueueService,
    private readonly prisma: PrismaService,
  ) {}

  @Post()
  @HttpCode(201)
  @ApiOperation({ summary: 'Crear pedido e iniciar pago' })
  async create(@Body() dto: CreateOrderDto, @CurrentUser() user: JwtUser) {
    let paymentService: IPaymentService = this.wompiService
    if (dto.paymentProvider === 'MERCADO_PAGO') {
      const setting = await this.prisma.client.settings.findUnique({
        where: { key: 'MERCADOPAGO_ENABLED' },
      })
      if (!setting || setting.value !== 'true') {
        throw new ForbiddenException('Mercado Pago no está disponible en este momento')
      }
      paymentService = this.mercadoPagoService
    }

    let shippingCod = false

    if (dto.paymentProvider === 'COD') {
      // Por defecto habilitado (sin fila aún en Settings) — el admin puede desactivarlo
      // desde /admin/configuracion, que crea la fila en false.
      const setting = await this.prisma.client.settings.findUnique({
        where: { key: 'COD_ENABLED' },
      })
      if (setting && setting.value !== 'true') {
        throw new ForbiddenException('Pago contra entrega no está disponible en este momento')
      }
    } else {
      // Pedido pagado en línea (WOMPI/MERCADO_PAGO): si el admin desactivó
      // SHIPPING_ONLINE_ENABLED, el flete de TODOS estos pedidos se cobra
      // contraentrega en vez de descontarse de la billetera Vendelo. Es una
      // política global del negocio, no una elección del cliente — se calcula
      // acá, el DTO ya no acepta shippingCod desde el frontend.
      const [shippingOnlineSetting, codSetting] = await Promise.all([
        this.prisma.client.settings.findUnique({ where: { key: 'SHIPPING_ONLINE_ENABLED' } }),
        this.prisma.client.settings.findUnique({ where: { key: 'COD_ENABLED' } }),
      ])
      const shippingOnlineEnabled = !shippingOnlineSetting || shippingOnlineSetting.value === 'true'
      const codEnabled = !codSetting || codSetting.value === 'true'
      // Solo forzamos flete contraentrega si el repartidor puede recaudar efectivo
      // (COD_ENABLED) — si no, degradamos a flete online en vez de bloquear el
      // checkout por una combinación de configuración conflictiva.
      shippingCod = !shippingOnlineEnabled && codEnabled
    }

    const useCase = new CreateOrder(this.orderRepo, this.productRepo, paymentService)
    const result = await useCase.execute({
      userId: user.id,
      items: dto.items,
      shippingAddress: dto.shippingAddress,
      buyer: dto.buyer,
      paymentProvider: dto.paymentProvider,
      shippingCod,
    })

    if (!result.ok) throw result.error

    // Persiste el timestamp de aceptación de políticas si el cliente lo envió
    if (dto.policiesAcceptedAt) {
      await this.prisma.client.order.update({
        where: { id: result.value.order.id },
        data: { policiesAcceptedAt: new Date(dto.policiesAcceptedAt) },
      })
    }

    if (dto.paymentProvider === 'COD') {
      // COD no tiene webhook de pasarela que confirme el pago — el pedido ya nació
      // PAID (CreateOrder lo confirmó al crearlo), así que disparamos aquí mismo
      // los efectos secundarios que para pagos online dispara ConfirmPayment.
      await this.emailQueue.enqueue(user.email, result.value.order.id)
      await this.vendeloOrderQueue.enqueue(result.value.order.id)
    } else {
      // Fire-and-forget: nunca bloquea ni falla la respuesta del pedido
      this.emailService
        .sendOrderReceived(result.value.order, user.email)
        .catch((e) => this.logger.error(`Email sendOrderReceived failed orderId=${result.value.order.id}: ${e}`))
    }

    return result.value
  }

  @Patch(':id/status')
  @Roles('ADMIN')
  @ApiOperation({ summary: '[ADMIN] Actualizar estado de un pedido' })
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    await this.orderRepo.updateStatus(id, dto.status as OrderStatus)
    return { success: true, status: dto.status }
  }
}
