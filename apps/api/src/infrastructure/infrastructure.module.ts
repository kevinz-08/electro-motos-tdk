import { Module } from '@nestjs/common'
import { PrismaModule } from './database/prisma.module'
import { PRODUCT_REPOSITORY, ORDER_REPOSITORY, USER_REPOSITORY, PAYMENT_SERVICE } from './injection-tokens'
import { PrismaProductRepository } from './repositories/PrismaProductRepository'
import { PrismaOrderRepository } from './repositories/PrismaOrderRepository'
import { PrismaUserRepository } from './repositories/PrismaUserRepository'
import { WompiService } from './services/WompiService'
import { MercadoPagoService } from './services/MercadoPagoService'
import { ResendEmailService } from './services/ResendEmailService'
import { CloudinaryService } from './services/CloudinaryService'

@Module({
  imports: [PrismaModule],
  providers: [
    { provide: PRODUCT_REPOSITORY, useClass: PrismaProductRepository },
    { provide: ORDER_REPOSITORY,   useClass: PrismaOrderRepository },
    { provide: USER_REPOSITORY,    useClass: PrismaUserRepository },
    // PAYMENT_SERVICE token → Wompi (pasarela principal Colombia)
    { provide: PAYMENT_SERVICE,    useClass: WompiService },
    // Servicios concretos también disponibles por clase para inyección directa en controllers
    WompiService,
    MercadoPagoService,
    ResendEmailService,
    CloudinaryService,
  ],
  exports: [
    PrismaModule,
    PRODUCT_REPOSITORY,
    ORDER_REPOSITORY,
    USER_REPOSITORY,
    PAYMENT_SERVICE,
    WompiService,
    MercadoPagoService,
    ResendEmailService,
    CloudinaryService,
  ],
})
export class InfrastructureModule {}
