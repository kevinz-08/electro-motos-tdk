import {
  Body, Controller, Delete, HttpCode, Inject, Param,
  Patch, Post, Put, UploadedFile, UseInterceptors,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger'
import { IProductRepository } from '@h2r/domain'
import { PRODUCT_REPOSITORY } from '../infrastructure/injection-tokens'
import { CloudinaryService } from '../infrastructure/services/CloudinaryService'
import { Roles } from '../auth/decorators/roles.decorator'
import { CreateProductDto } from './dto/create-product.dto'
import { UpdateProductDto } from './dto/update-product.dto'
import { UpdateStockDto } from './dto/update-stock.dto'

@ApiTags('admin / products')
@ApiBearerAuth('access-token')
@Roles('ADMIN')
@Controller('admin/products')
export class AdminProductsController {
  constructor(
    @Inject(PRODUCT_REPOSITORY) private readonly productRepo: IProductRepository,
    private readonly cloudinary: CloudinaryService,
  ) {}

  @Post()
  @HttpCode(201)
  @ApiOperation({ summary: 'Crear producto' })
  create(@Body() dto: CreateProductDto) {
    return this.productRepo.save({
      name: dto.name,
      slug: dto.slug,
      description: dto.description,
      price: dto.price,
      stock: dto.stock,
      sku: dto.sku,
      categoryId: dto.categoryId,
      isActive: dto.isActive ?? true,
      images: dto.images ?? [],
    })
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar producto' })
  update(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.productRepo.update(id, dto)
  }

  @Delete(':id')
  @HttpCode(200)
  @ApiOperation({ summary: 'Eliminar producto' })
  async delete(@Param('id') id: string) {
    await this.productRepo.delete(id)
    return { success: true }
  }

  @Patch(':id/stock')
  @ApiOperation({ summary: 'Actualizar stock de un producto' })
  async updateStock(@Param('id') id: string, @Body() dto: UpdateStockDto) {
    await this.productRepo.updateStock(id, dto.stock)
    return { success: true }
  }

  @Post('upload-image')
  @HttpCode(201)
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Subir imagen de producto a Cloudinary' })
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }))
  async uploadImage(
    @UploadedFile() file: { buffer: Buffer; originalname: string },
    @Body('sku') sku: string,
  ) {
    const result = await this.cloudinary.uploadProductImage(file.buffer, sku)
    return { url: result.secureUrl }
  }
}
