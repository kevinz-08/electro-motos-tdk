import { Module } from '@nestjs/common'
import { InfrastructureModule } from '../infrastructure/infrastructure.module'
import { AdminProductsController } from './admin-products.controller'
import { AdminStockController } from './admin-stock.controller'
import { AdminSettingsController } from './admin-settings.controller'
import { AdminDashboardController } from './admin-dashboard.controller'
import { AdminCategoriesController } from './admin-categories.controller'
import { AdminEmailsController } from './admin-emails.controller'
import { AdminSyncController } from './admin-sync.controller'

@Module({
  imports: [InfrastructureModule],
  controllers: [
    AdminDashboardController,
    AdminProductsController,
    AdminCategoriesController,
    AdminStockController,
    AdminSettingsController,
    AdminEmailsController,
    AdminSyncController,
  ],
})
export class AdminModule {}
