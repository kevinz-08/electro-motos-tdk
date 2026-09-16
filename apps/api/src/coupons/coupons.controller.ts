import {
  Body, Controller, Delete, Get, Inject, NotFoundException, Param, Patch, Post, HttpCode,
  UnprocessableEntityException,
} from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import {
  ICouponRepository,
  IOrderRepository,
  ValidateCoupon,
  normalizeBuyerIdKey,
  validateCouponGuestRule,
} from '@h2r/domain'
import { COUPON_REPOSITORY, ORDER_REPOSITORY } from '../infrastructure/injection-tokens'
import { Roles } from '../auth/decorators/roles.decorator'
import { CurrentUser, JwtUser } from '../auth/decorators/current-user.decorator'
import { OptionalAuth } from '../auth/decorators/optional-auth.decorator'
import { CreateCouponDto } from './dto/create-coupon.dto'
import { UpdateCouponDto } from './dto/update-coupon.dto'
import { ValidateCouponDto } from './dto/validate-coupon.dto'

@ApiTags('coupons')
@ApiBearerAuth('access-token')
@Controller('coupons')
export class CouponsController {
  constructor(
    @Inject(COUPON_REPOSITORY) private readonly couponRepo: ICouponRepository,
    @Inject(ORDER_REPOSITORY)  private readonly orderRepo: IOrderRepository,
  ) {}

  /**
   * Valida un cupón contra los ítems del carrito — con sesión o como invitado.
   * Retorna el descuento calculable y qué productos están cubiertos.
   * Invitados (README §22.5): 403 si el cupón exige cuenta; `buyer` obligatorio
   * para cupones de un uso por cliente.
   */
  @Post('validate')
  @HttpCode(200)
  @OptionalAuth()
  @Throttle({ default: { ttl: 60_000, limit: 20 } })
  @ApiOperation({ summary: 'Validar cupón contra ítems del carrito (con sesión o invitado)' })
  async validate(@Body() dto: ValidateCouponDto, @CurrentUser() user: JwtUser | undefined) {
    const useCase = new ValidateCoupon(this.couponRepo, this.orderRepo)
    const buyerIdKey = dto.buyer ? normalizeBuyerIdKey(dto.buyer.idType, dto.buyer.idNumber) : null
    const result = await useCase.execute({
      code: dto.code,
      userId: user?.id ?? null,
      buyerIdKey: buyerIdKey || null,
      items: dto.items,
    })
    if (!result.ok) throw result.error
    return result.value
  }

  @Get()
  @Roles('ADMIN')
  @ApiOperation({ summary: '[ADMIN] Listar todos los cupones' })
  async findAll() {
    return this.couponRepo.findAll()
  }

  @Post()
  @Roles('ADMIN')
  @HttpCode(201)
  @ApiOperation({ summary: '[ADMIN] Crear cupón' })
  async create(@Body() dto: CreateCouponDto) {
    const guestRuleError = validateCouponGuestRule(dto.restriction, dto.allowGuest ?? false)
    if (guestRuleError) throw new UnprocessableEntityException(guestRuleError)

    return this.couponRepo.create({
      code: dto.code,
      type: dto.type,
      value: dto.value,
      restriction: dto.restriction,
      scope: dto.scope,
      allowGuest: dto.allowGuest ?? false,
      expiresAt: new Date(dto.expiresAt),
      categoryIds: dto.categoryIds,
      productId: dto.productId,
    })
  }

  @Patch(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: '[ADMIN] Editar cupón' })
  async update(@Param('id') id: string, @Body() dto: UpdateCouponDto) {
    if (dto.restriction !== undefined || dto.allowGuest !== undefined) {
      const current = await this.couponRepo.findById(id)
      if (!current) throw new NotFoundException('Cupón no encontrado')
      const guestRuleError = validateCouponGuestRule(
        dto.restriction ?? current.restriction,
        dto.allowGuest ?? current.allowGuest,
      )
      if (guestRuleError) throw new UnprocessableEntityException(guestRuleError)
    }

    return this.couponRepo.update(id, {
      ...(dto.code        !== undefined && { code:        dto.code }),
      ...(dto.type        !== undefined && { type:        dto.type }),
      ...(dto.value       !== undefined && { value:       dto.value }),
      ...(dto.restriction !== undefined && { restriction: dto.restriction }),
      ...(dto.scope       !== undefined && { scope:       dto.scope }),
      ...(dto.allowGuest  !== undefined && { allowGuest:  dto.allowGuest }),
      ...(dto.expiresAt   !== undefined && { expiresAt:   new Date(dto.expiresAt) }),
      ...(dto.isActive    !== undefined && { isActive:    dto.isActive }),
      ...('categoryIds' in dto && { categoryIds: dto.categoryIds }),
      ...('productId'   in dto && { productId:   dto.productId }),
    })
  }

  @Delete(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: '[ADMIN] Desactivar cupón (soft delete)' })
  async remove(@Param('id') id: string) {
    await this.couponRepo.delete(id)
    return { success: true }
  }

}
