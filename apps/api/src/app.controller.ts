import { Controller, Get } from '@nestjs/common'
import { ApiOperation, ApiTags } from '@nestjs/swagger'
import { SkipThrottle } from '@nestjs/throttler'
import { Public } from './auth/decorators/public.decorator'

@ApiTags('health')
@Controller()
export class AppController {
  @Get()
  @Public()
  @SkipThrottle()
  @ApiOperation({ summary: 'Health check' })
  health() {
    return { status: 'ok' }
  }
}
