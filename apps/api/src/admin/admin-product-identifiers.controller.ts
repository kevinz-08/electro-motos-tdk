import {
  Body, Controller, Get, HttpCode, NotFoundException, Param, Post, Put,
  UnprocessableEntityException, UploadedFile, UseInterceptors,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger'
import {
  normalizeProductIdentifiers,
  parseIdentifiersCsv,
  validateProductIdentifiers,
  IDENTIFIERS_CSV_HEADER,
} from '@h2r/domain'
import { PrismaService } from '../infrastructure/database/prisma.service'
import { IndexNowService } from '../infrastructure/services/IndexNowService'
import { Roles } from '../auth/decorators/roles.decorator'
import { SetProductIdentifiersDto } from './dto/set-product-identifiers.dto'

const IDENTIFIER_SELECT = { id: true, slug: true, partBrand: true, mpn: true, partType: true, warrantyMonths: true } as const

/**
 * Marca, MPN, tipo y garantía de cada repuesto (docs/seo/, Fase 7 — H-18).
 *
 * Las columnas existen desde la Fase 2 pero no había forma de cargarlas desde
 * el panel. Uno a uno (formulario de producto) o en bloque (CSV). Cada cambio
 * avisa a IndexNow: la marca y el MPN aparecen en el JSON-LD de la ficha.
 */
@ApiTags('admin / products')
@ApiBearerAuth('access-token')
@Roles('ADMIN')
@Controller('admin/products')
export class AdminProductIdentifiersController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly indexNow: IndexNowService,
  ) {}

  @Get(':id/identifiers')
  @ApiOperation({ summary: 'Marca, MPN, tipo y garantía de un repuesto' })
  async get(@Param('id') id: string) {
    const product = await this.prisma.client.product.findUnique({ where: { id }, select: IDENTIFIER_SELECT })
    if (!product) throw new NotFoundException('Producto no encontrado')
    return product
  }

  @Put(':id/identifiers')
  @ApiOperation({ summary: 'Guardar marca, MPN, tipo y garantía de un repuesto' })
  async set(@Param('id') id: string, @Body() dto: SetProductIdentifiersDto) {
    const data = normalizeProductIdentifiers({
      partBrand: dto.partBrand ?? null,
      mpn: dto.mpn ?? null,
      partType: dto.partType ?? null,
      warrantyMonths: dto.warrantyMonths ?? null,
    })
    const invalid = validateProductIdentifiers(data)
    if (invalid) throw new UnprocessableEntityException(invalid)

    const exists = await this.prisma.client.product.findUnique({ where: { id }, select: { id: true } })
    if (!exists) throw new NotFoundException('Producto no encontrado')

    const updated = await this.prisma.client.product.update({ where: { id }, data, select: IDENTIFIER_SELECT })
    this.indexNow.notifyProduct(updated.slug)
    return updated
  }

  @Post('identifiers/import')
  @HttpCode(200)
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Cargar marca, MPN, tipo y garantía desde CSV',
    description: `Cabecera: ${IDENTIFIERS_CSV_HEADER}. Celda vacía = no tocar; "-" = borrar. Reporte por línea.`,
  })
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 2 * 1024 * 1024 } }))
  async import(@UploadedFile() file: { buffer: Buffer } | undefined) {
    if (!file) throw new UnprocessableEntityException('No se recibió ningún archivo')
    const { rows, errors } = parseIdentifiersCsv(file.buffer.toString('utf8'))

    let updated = 0
    for (const row of rows) {
      const product = await this.prisma.client.product.findUnique({ where: { sku: row.sku }, select: { id: true } })
      if (!product) {
        errors.push({ line: row.line, message: `No existe ningún producto con SKU "${row.sku}"` })
        continue
      }
      // Solo los campos presentes en la fila (undefined = no tocar).
      const data = Object.fromEntries(
        (['partBrand', 'mpn', 'partType', 'warrantyMonths'] as const)
          .filter((key) => row[key] !== undefined)
          .map((key) => [key, row[key]]),
      )
      const saved = await this.prisma.client.product.update({ where: { id: product.id }, data, select: { slug: true } })
      this.indexNow.notifyProduct(saved.slug)
      updated++
    }

    return { updated, failed: errors.length, errors: errors.sort((a, b) => a.line - b.line) }
  }
}
