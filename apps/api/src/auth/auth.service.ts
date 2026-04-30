import { ConflictException, Inject, Injectable, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import * as bcrypt from 'bcryptjs'
import { IUserRepository } from '@h2r/domain'
import { PrismaService } from '../infrastructure/database/prisma.service'
import { USER_REPOSITORY } from '../infrastructure/injection-tokens'
import { RegisterDto } from './dto/register.dto'
import { LoginDto } from './dto/login.dto'
import type { JwtPayload } from './strategies/jwt.strategy'

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
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
}
