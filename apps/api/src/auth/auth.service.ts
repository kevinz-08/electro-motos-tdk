import { BadRequestException, ConflictException, Inject, Injectable, Logger, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import * as bcrypt from 'bcryptjs'
import { createHash, randomBytes } from 'crypto'
import { IUserRepository } from '@h2r/domain'
import { PrismaService } from '../infrastructure/database/prisma.service'
import { ResendEmailService } from '../infrastructure/services/ResendEmailService'
import { USER_REPOSITORY } from '../infrastructure/injection-tokens'
import { RegisterDto } from './dto/register.dto'
import { LoginDto } from './dto/login.dto'
import { ForgotPasswordDto } from './dto/forgot-password.dto'
import { ResetPasswordDto } from './dto/reset-password.dto'
import type { JwtPayload } from './strategies/jwt.strategy'

const TOKEN_EXPIRY_MS = 60 * 60 * 1000 // 1 hora

function hashToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex')
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly emailService: ResendEmailService,
    @Inject(USER_REPOSITORY) private readonly userRepo: IUserRepository,
  ) {}

  async register(dto: RegisterDto): Promise<{ message: string }> {
    const existing = await this.userRepo.findByEmail(dto.email)
    if (existing) throw new ConflictException('El email ya está registrado')

    const hashed = await bcrypt.hash(dto.password, 12)
    await this.prisma.client.user.create({
      data: { name: dto.name, email: dto.email, password: hashed, role: 'CUSTOMER' },
    })
    return { message: 'Usuario registrado correctamente' }
  }

  async login(dto: LoginDto): Promise<{
    accessToken: string
    role: string
    userId: string
    name: string
    email: string
  }> {
    const user = await this.userRepo.findByEmail(dto.email)
    if (!user) throw new UnauthorizedException('Credenciales inválidas')

    // findByEmail del repositorio no expone el hash — lo leemos directamente
    const raw = await this.prisma.client.user.findUnique({ where: { email: dto.email } })
    if (!raw?.password) throw new UnauthorizedException('Credenciales inválidas')

    const valid = await bcrypt.compare(dto.password, raw.password)
    if (!valid) throw new UnauthorizedException('Credenciales inválidas')

    const payload: JwtPayload = { sub: user.id, email: user.email, role: user.role }
    return {
      accessToken: this.jwtService.sign(payload),
      role: user.role,
      userId: user.id,
      name: user.name ?? '',
      email: user.email,
    }
  }

  /** Usado por NextAuth server-side para emitir un JWT NestJS a usuarios OAuth (Google). */
  async issueTokenByEmail(email: string): Promise<{ accessToken: string; role: string }> {
    const user = await this.userRepo.findByEmail(email)
    if (!user) throw new UnauthorizedException('Usuario no encontrado')
    const payload: JwtPayload = { sub: user.id, email: user.email, role: user.role }
    return { accessToken: this.jwtService.sign(payload), role: user.role }
  }

  /**
   * Inicia el flujo de recuperación de contraseña.
   * Siempre responde con éxito para no filtrar si el email existe (anti-enumeración).
   */
  async forgotPassword(dto: ForgotPasswordDto): Promise<{ message: string }> {
    const SAFE_RESPONSE = { message: 'Si el correo está registrado, recibirás un enlace de recuperación.' }

    const user = await this.prisma.client.user.findUnique({
      where: { email: dto.email },
      select: { id: true, email: true, name: true, password: true },
    })

    // Usuarios OAuth no tienen contraseña — no aplicar flujo de reset
    if (!user?.password) return SAFE_RESPONSE

    // Invalidar tokens anteriores pendientes del mismo usuario
    await this.prisma.client.passwordResetToken.updateMany({
      where: { userId: user.id, usedAt: null, expiresAt: { gt: new Date() } },
      data: { usedAt: new Date() },
    })

    const rawToken = randomBytes(32).toString('hex')
    const tokenHash = hashToken(rawToken)

    await this.prisma.client.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt: new Date(Date.now() + TOKEN_EXPIRY_MS),
      },
    })

    this.emailService
      .sendPasswordReset(user.email, user.name ?? 'Usuario', rawToken)
      .catch((e) => this.logger.error(`sendPasswordReset failed userId=${user.id}: ${e}`))

    return SAFE_RESPONSE
  }

  /** Valida el token y actualiza la contraseña del usuario. */
  async resetPassword(dto: ResetPasswordDto): Promise<{ message: string }> {
    const tokenHash = hashToken(dto.token)

    const record = await this.prisma.client.passwordResetToken.findUnique({
      where: { tokenHash },
      include: { user: { select: { id: true, email: true } } },
    })

    if (!record || record.usedAt || record.expiresAt < new Date()) {
      throw new BadRequestException('El enlace de recuperación no es válido o ya expiró.')
    }

    const hashedPassword = await bcrypt.hash(dto.password, 12)

    await this.prisma.client.$transaction([
      this.prisma.client.user.update({
        where: { id: record.userId },
        data: { password: hashedPassword },
      }),
      this.prisma.client.passwordResetToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
    ])

    return { message: 'Contraseña actualizada correctamente. Ya puedes iniciar sesión.' }
  }
}
