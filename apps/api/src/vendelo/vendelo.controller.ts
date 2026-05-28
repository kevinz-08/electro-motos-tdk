import { Controller, Get } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { Roles } from '../auth/decorators/roles.decorator'
import { VendeloService } from '../infrastructure/services/VendeloService'

@ApiTags('admin / vendelo')
@ApiBearerAuth('access-token')
@Roles('ADMIN')
@Controller('admin/vendelo')
export class VendeloController {
  constructor(private readonly vendeloService: VendeloService) {}

  @Get('health')
  @ApiOperation({ summary: 'Smoke test: verifica conectividad y autenticación con Vendelo API' })
  async checkHealth() {
    const info = await this.vendeloService.checkAuth()
    return { ok: true, vendelo: info }
  }
}
