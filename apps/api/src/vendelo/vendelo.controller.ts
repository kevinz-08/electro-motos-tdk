import { Controller, Get, Post, HttpCode } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { Roles } from '../auth/decorators/roles.decorator'
import { VendeloService } from '../infrastructure/services/VendeloService'
import { PrismaService } from '../infrastructure/database/prisma.service'

@ApiTags('admin / vendelo')
@ApiBearerAuth('access-token')
@Roles('ADMIN')
@Controller('admin/vendelo')
export class VendeloController {
  constructor(
    private readonly vendeloService: VendeloService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('health')
  @ApiOperation({ summary: 'Smoke test: verifica conectividad y autenticación con Vendelo API' })
  async checkHealth() {
    const info = await this.vendeloService.checkAuth()
    return { ok: true, vendelo: info }
  }

  @Post('sync-cities')
  @HttpCode(200)
  @ApiOperation({ summary: 'Descarga todas las ciudades de Vendelo y las sincroniza en la BD local' })
  async syncCities() {
    const cities = await this.vendeloService.getAllCities()

    await this.prisma.client.vendeloCity.deleteMany()
    await this.prisma.client.vendeloCity.createMany({
      data: cities.map((c) => ({
        code: c.code,
        name: c.name,
        subdivisionCode: c.subdivision_code,
        countryCode: c.country_code ?? 'CO',
      })),
      skipDuplicates: true,
    })

    return { synced: cities.length }
  }
}
