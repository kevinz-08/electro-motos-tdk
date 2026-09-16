import { Module } from '@nestjs/common'
import { InfrastructureModule } from '../infrastructure/infrastructure.module'
import { ReviewsController } from './reviews.controller'

@Module({
  imports: [InfrastructureModule],
  controllers: [ReviewsController],
})
export class ReviewsModule {}
