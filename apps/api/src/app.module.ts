import { Module } from '@nestjs/common'
import { APP_GUARD } from '@nestjs/core'
import { ConfigModule } from '@nestjs/config'
import { ThrottlerModule } from '@nestjs/throttler'
import { InfrastructureModule } from './infrastructure/infrastructure.module'
import { AuthModule } from './auth/auth.module'
import { ProductsModule } from './products/products.module'
import { OrdersModule } from './orders/orders.module'
import { AdminModule } from './admin/admin.module'
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard'
import { RolesGuard } from './auth/guards/roles.guard'

/**
 * AppModule — raíz de la aplicación NestJS.
 *
 * Guards globales (secure-by-default):
 *   - JwtAuthGuard: todas las rutas requieren JWT salvo las marcadas @Public()
 *   - RolesGuard: comprueba @Roles('ADMIN') donde aplique
 *
 * Fase 4: PaymentsModule (Wompi + MP webhooks)
 */
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env.local', '.env'] }),
    ThrottlerModule.forRoot({ throttlers: [{ ttl: 60_000, limit: 100 }] }),
    InfrastructureModule,
    AuthModule,
    ProductsModule,
    OrdersModule,
    AdminModule,
    // Fase 4: PaymentsModule,
  ],
  providers: [
    // Guards globales: protegen todas las rutas por defecto
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
