import { Module } from '@nestjs/common'
import { InfrastructureModule } from '../infrastructure/infrastructure.module'
import { VendeloController } from './vendelo.controller'
import { VendeloWebhookController } from './vendelo-webhook.controller'
import { ShippingAdminService } from './services/shipping-admin.service'

@Module({
  imports: [InfrastructureModule],
  controllers: [VendeloController, VendeloWebhookController],
  providers: [ShippingAdminService],
})
export class VendeloModule {}
