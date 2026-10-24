import { Controller, Get } from '@nestjs/common'
import { ApiOperation, ApiTags } from '@nestjs/swagger'
import { SkipThrottle } from '@nestjs/throttler'
import { Public } from './auth/decorators/public.decorator'
import { PrismaService } from './infrastructure/database/prisma.service'

@ApiTags('health')
@Controller()
export class AppController {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Liveness del proceso, SIN tocar la BD. Neon cobra por tiempo de compute
   * encendido: un monitor de uptime que hiciera `SELECT 1` cada pocos minutos lo
   * mantendría despierto todo el día (README §27).
   */
  @Get('health')
  @Public()
  @SkipThrottle()
  @ApiOperation({ summary: 'Health check del proceso (no consulta la BD)' })
  health() {
    return { status: 'ok', uptime: process.uptime() }
  }

  /** Diagnóstico manual de la conexión a la BD. Despierta Neon: no usarlo en monitores. */
  @Get('health/db')
  @Public()
  @SkipThrottle()
  @ApiOperation({ summary: 'Health check con SELECT 1 a la BD (solo diagnóstico manual)' })
  async healthDb() {
    // If this throws, the exception bubbles to HttpExceptionFilter → 500
    await this.prisma.client.$queryRaw`SELECT 1`
    return { status: 'ok', db: 'ok', uptime: process.uptime() }
  }
}
