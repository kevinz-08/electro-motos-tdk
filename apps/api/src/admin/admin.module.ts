import { Module } from '@nestjs/common'
import { InfrastructureModule } from '../infrastructure/infrastructure.module'
import { AdminProductsController } from './admin-products.controller'
import { AdminStockController } from './admin-stock.controller'
import { AdminSettingsController } from './admin-settings.controller'
import { AdminDashboardController } from './admin-dashboard.controller'

@Module({
  imports: [InfrastructureModule],
  controllers: [
    AdminDashboardController,
    AdminProductsController,
    AdminStockController,
    AdminSettingsController,
  ],
})
export class AdminModule {}
