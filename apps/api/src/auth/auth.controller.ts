import { Body, Controller, Headers, HttpCode, Post, UnauthorizedException } from '@nestjs/common'
import { ApiOperation, ApiTags } from '@nestjs/swagger'
import { SkipThrottle, Throttle } from '@nestjs/throttler'
import { AuthService } from './auth.service'
import { RegisterDto } from './dto/register.dto'
import { LoginDto } from './dto/login.dto'
import { SessionTokenDto } from './dto/session-token.dto'
import { Public } from './decorators/public.decorator'

@ApiTags('auth')
@Public()
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @HttpCode(201)
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @ApiOperation({ summary: 'Registrar nuevo usuario' })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto)
  }

  @Post('login')
  @HttpCode(200)
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @ApiOperation({ summary: 'Iniciar sesión y obtener JWT' })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto)
  }

  /**
   * Endpoint interno: emite un JWT NestJS para un usuario ya autenticado via OAuth (Google).
   * Solo accesible desde el servidor Next.js mediante el secreto compartido INTERNAL_API_SECRET.
   */
  @Post('session-token')
  @SkipThrottle()
  @HttpCode(200)
  @ApiOperation({ summary: '[INTERNAL] Emitir JWT para usuario OAuth (solo Next.js server-side)' })
  sessionToken(
    @Body() dto: SessionTokenDto,
    @Headers('x-internal-secret') secret: string,
  ) {
    if (!secret || secret !== process.env['INTERNAL_API_SECRET']) {
      throw new UnauthorizedException('Acceso no autorizado')
    }
    return this.authService.issueTokenByEmail(dto.email)
  }
}
