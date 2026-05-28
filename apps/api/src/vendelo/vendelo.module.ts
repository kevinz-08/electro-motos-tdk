import { Module } from '@nestjs/common'
import { InfrastructureModule } from '../infrastructure/infrastructure.module'
import { VendeloController } from './vendelo.controller'

@Module({
  imports: [InfrastructureModule],
  controllers: [VendeloController],
})
export class VendeloModule {}
