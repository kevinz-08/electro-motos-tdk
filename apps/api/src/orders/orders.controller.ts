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

    const useCase = new CreateOrder(this.orderRepo, this.productRepo, paymentService)
    const result = await useCase.execute({
      userId: user.id,
      items: dto.items,
      shippingAddress: dto.shippingAddress,
      paymentProvider: dto.paymentProvider,
    })

    if (!result.ok) throw result.error

    // Fire-and-forget: nunca bloquea ni falla la respuesta del pedido
    this.emailService
      .sendOrderReceived(result.value.order, user.email)
      .catch((e) => this.logger.error(`Email sendOrderReceived failed orderId=${result.value.order.id}: ${e}`))

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
