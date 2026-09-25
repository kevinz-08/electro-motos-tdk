import { Module } from '@nestjs/common'
import { InfrastructureModule } from '../infrastructure/infrastructure.module'
import { AdminProductsController } from './admin-products.controller'
import { AdminSettingsController } from './admin-settings.controller'
import { AdminDashboardController } from './admin-dashboard.controller'
import { AdminCategoriesController } from './admin-categories.controller'
import { AdminEmailsController } from './admin-emails.controller'
import { AdminSyncController } from './admin-sync.controller'
import { AdminBannersController } from './admin-banners.controller'
import { AdminPromoController } from './admin-promo.controller'
import { AdminFitmentsController } from './admin-fitments.controller'
import { AdminKitsController } from './admin-kits.controller'
import { AdminReviewersController } from './admin-reviewers.controller'
import { AdminMaintenanceController } from './admin-maintenance.controller'

@Module({
  imports: [InfrastructureModule],
  controllers: [
    AdminDashboardController,
    AdminProductsController,
    AdminCategoriesController,
    AdminSettingsController,
    AdminEmailsController,
    AdminSyncController,
    AdminBannersController,
    AdminPromoController,
    AdminFitmentsController,
    AdminKitsController,
    AdminReviewersController,
    AdminMaintenanceController,
  ],
})
export class AdminModule {}
