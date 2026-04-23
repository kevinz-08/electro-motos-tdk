import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { ThrottlerModule } from '@nestjs/throttler'
import { InfrastructureModule } from './infrastructure/infrastructure.module'

/**
 * AppModule — raíz de la aplicación NestJS.
 *
 * Módulos de negocio (AuthModule, ProductsModule, OrdersModule, etc.)
 * se agregan aquí en Fase 3 conforme se van creando.
 */
@Module({
  imports: [
    // Variables de entorno disponibles globalmente con ConfigService
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),

    // Rate limiting global: 100 req / 60s por IP
    ThrottlerModule.forRoot({
      throttlers: [{ ttl: 60_000, limit: 100 }],
    }),

    InfrastructureModule,

    // Fase 3: agregar módulos de negocio
    // AuthModule,
    // ProductsModule,
    // OrdersModule,
    // PaymentsModule,
    // AdminModule,
  ],
})
export class AppModule {}
