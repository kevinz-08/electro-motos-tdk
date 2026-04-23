import { Module } from '@nestjs/common'
import { PrismaModule } from './database/prisma.module'
import {
  PRODUCT_REPOSITORY,
  ORDER_REPOSITORY,
  USER_REPOSITORY,
} from './injection-tokens'

/**
 * InfrastructureModule — registra todas las implementaciones concretas
 * de las interfaces del dominio.
 *
 * En Fase 2 se agregarán:
 *   PrismaProductRepository, PrismaOrderRepository, PrismaUserRepository
 *   WompiService, MercadoPagoService, ResendEmailService, CloudinaryService
 *
 * Por ahora solo expone PrismaModule (global) para que los módulos de negocio
 * puedan importar InfrastructureModule y recibir PrismaService.
 */
@Module({
  imports: [PrismaModule],
  providers: [
    // Fase 2: descomentar cuando se migren los repositorios desde apps/web
    // { provide: PRODUCT_REPOSITORY, useClass: PrismaProductRepository },
    // { provide: ORDER_REPOSITORY,   useClass: PrismaOrderRepository },
    // { provide: USER_REPOSITORY,    useClass: PrismaUserRepository },
  ],
  exports: [
    PrismaModule,
    // Fase 2: agregar los tokens aquí cuando estén implementados
    // PRODUCT_REPOSITORY,
    // ORDER_REPOSITORY,
    // USER_REPOSITORY,
  ],
})
export class InfrastructureModule {}
