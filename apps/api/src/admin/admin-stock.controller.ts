import { Body, Controller, Patch } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { PrismaService } from '../infrastructure/database/prisma.service'
import { Roles } from '../auth/decorators/roles.decorator'
import { BulkStockUpdateDto } from './dto/bulk-stock-update.dto'

@ApiTags('admin / stock')
@ApiBearerAuth('access-token')
@Roles('ADMIN')
@Controller('admin/stock')
export class AdminStockController {
  constructor(private readonly prisma: PrismaService) {}

  @Patch('bulk')
  @ApiOperation({ summary: 'Actualización masiva de stock por SKU (importación CSV)' })
  async bulkUpdate(@Body() dto: BulkStockUpdateDto) {
    const results = await Promise.allSettled(
      dto.updates.map(({ sku, stock }) =>
        this.prisma.client.product.updateMany({ where: { sku }, data: { stock } }),
      ),
    )
    const updated = results.filter((r) => r.status === 'fulfilled').length
    return { updated }
  }
}
