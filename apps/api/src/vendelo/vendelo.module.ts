import { Module } from '@nestjs/common'
import { InfrastructureModule } from '../infrastructure/infrastructure.module'
import { VendeloController } from './vendelo.controller'
import { VendeloWebhookController } from './vendelo-webhook.controller'

@Module({
  imports: [InfrastructureModule],
  controllers: [VendeloController, VendeloWebhookController],
})
export class VendeloModule {}
