import { Module } from '@nestjs/common'
import { PrismaModule } from './database/prisma.module'
import { PRODUCT_REPOSITORY, PRODUCT_DESCRIPTION_REPOSITORY, ORDER_REPOSITORY, USER_REPOSITORY, PAYMENT_SERVICE } from './injection-tokens'
import { PrismaProductRepository } from './repositories/PrismaProductRepository'
import { PrismaProductDescriptionRepository } from './repositories/PrismaProductDescriptionRepository'
import { PrismaOrderRepository } from './repositories/PrismaOrderRepository'
import { PrismaUserRepository } from './repositories/PrismaUserRepository'
import { WompiService } from './services/WompiService'
import { MercadoPagoService } from './services/MercadoPagoService'
import { ResendEmailService } from './services/ResendEmailService'
import { CloudinaryService } from './services/CloudinaryService'
import { EmailQueueService } from './services/EmailQueueService'

@Module({
  imports: [PrismaModule],
  providers: [
    { provide: PRODUCT_REPOSITORY,             useClass: PrismaProductRepository },
    { provide: PRODUCT_DESCRIPTION_REPOSITORY, useClass: PrismaProductDescriptionRepository },
    { provide: ORDER_REPOSITORY,               useClass: PrismaOrderRepository },
    { provide: USER_REPOSITORY,                useClass: PrismaUserRepository },
    // PAYMENT_SERVICE token → Wompi (pasarela principal Colombia)
    { provide: PAYMENT_SERVICE,    useClass: WompiService },
    // Servicios concretos también disponibles por clase para inyección directa en controllers
    WompiService,
    MercadoPagoService,
    ResendEmailService,
    CloudinaryService,
    EmailQueueService,
  ],
  exports: [
    PrismaModule,
    PRODUCT_REPOSITORY,
    PRODUCT_DESCRIPTION_REPOSITORY,
    ORDER_REPOSITORY,
    USER_REPOSITORY,
    PAYMENT_SERVICE,
    WompiService,
    MercadoPagoService,
    ResendEmailService,
    CloudinaryService,
    EmailQueueService,
  ],
})
export class InfrastructureModule {}
