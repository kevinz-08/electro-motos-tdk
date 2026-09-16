import { BadRequestException, Body, Controller, Patch, Put } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { PrismaService } from '../infrastructure/database/prisma.service'
import { Roles } from '../auth/decorators/roles.decorator'
import { CRO_SETTING_KEYS, CroSettingName, parseCroSettings } from '@h2r/domain'
import { ToggleSettingDto } from './dto/toggle-setting.dto'
import { UpdateCroSettingsDto } from './dto/update-cro-settings.dto'

@ApiTags('admin / settings')
@ApiBearerAuth('access-token')
@Roles('ADMIN')
@Controller('admin/settings')
export class AdminSettingsController {
  constructor(private readonly prisma: PrismaService) {}

  @Patch('mercadopago')
  @ApiOperation({ summary: 'Habilitar o deshabilitar Mercado Pago como pasarela de pago' })
  async toggleMercadoPago(@Body() dto: ToggleSettingDto) {
    await this.prisma.client.settings.upsert({
      where: { key: 'MERCADOPAGO_ENABLED' },
      update: { value: dto.enabled ? 'true' : 'false' },
      create: { key: 'MERCADOPAGO_ENABLED', value: dto.enabled ? 'true' : 'false' },
    })
    return { success: true, enabled: dto.enabled }
  }

  @Patch('cod')
  @ApiOperation({ summary: 'Habilitar o deshabilitar el pago contra entrega (COD)' })
  async toggleCod(@Body() dto: ToggleSettingDto) {
    await this.prisma.client.settings.upsert({
      where: { key: 'COD_ENABLED' },
      update: { value: dto.enabled ? 'true' : 'false' },
      create: { key: 'COD_ENABLED', value: dto.enabled ? 'true' : 'false' },
    })
    return { success: true, enabled: dto.enabled }
  }

  @Patch('shipping-online')
  @ApiOperation({
    summary: 'Habilitar/deshabilitar que el flete de pedidos pagados en línea se sume al cobro de '
      + 'Wompi/MercadoPago. Deshabilitado (default) = el negocio absorbe el flete desde su billetera Vendelo.',
  })
  async toggleShippingOnline(@Body() dto: ToggleSettingDto) {
    await this.prisma.client.settings.upsert({
      where: { key: 'SHIPPING_ONLINE_ENABLED' },
      update: { value: dto.enabled ? 'true' : 'false' },
      create: { key: 'SHIPPING_ONLINE_ENABLED', value: dto.enabled ? 'true' : 'false' },
    })
    return { success: true, enabled: dto.enabled }
  }

  @Put('cro')
  @ApiOperation({ summary: 'Actualizar umbrales de prueba social y estimación de entrega (README §22.3)' })
  async updateCroSettings(@Body() dto: UpdateCroSettingsDto) {
    const entries = (Object.keys(CRO_SETTING_KEYS) as CroSettingName[])
      .filter((name) => dto[name] !== undefined)
      .map((name) => ({ key: CRO_SETTING_KEYS[name], value: String(dto[name]) }))

    const current = parseCroSettings(
      await this.prisma.client.settings.findMany({
        where: { key: { in: Object.values(CRO_SETTING_KEYS) } },
      }),
    )
    const minDays = dto.shippingEtaMinDays ?? current.shippingEtaMinDays
    const maxDays = dto.shippingEtaMaxDays ?? current.shippingEtaMaxDays
    if (maxDays < minDays) {
      throw new BadRequestException('Los días máximos de entrega deben ser mayores o iguales a los mínimos')
    }

    await this.prisma.client.$transaction(
      entries.map(({ key, value }) =>
        this.prisma.client.settings.upsert({ where: { key }, update: { value }, create: { key, value } }),
      ),
    )
    return { success: true, updated: entries.length }
  }
}
