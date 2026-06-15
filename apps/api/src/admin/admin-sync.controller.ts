import {
  BadRequestException,
  Controller,
  HttpCode,
  HttpException,
  HttpStatus,
  Inject,
  Logger,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger'
import { IStockSyncRepository, StockSyncItem, SyncReport, SyncStock } from '@h2r/domain'
import { Roles } from '../auth/decorators/roles.decorator'
import { INVENTORY_REPOSITORY } from '../infrastructure/injection-tokens'
import { SyncFileParserService } from '../infrastructure/services/SyncFileParserService'

// Keeps HTTP status mapping local to this layer — the domain never speaks HTTP.
const DOMAIN_TO_HTTP: Record<string, number> = {
  VALIDATION_ERROR: HttpStatus.UNPROCESSABLE_ENTITY,
  NOT_FOUND:        HttpStatus.NOT_FOUND,
  INTERNAL_ERROR:   HttpStatus.INTERNAL_SERVER_ERROR,
}

// 5 MB ceiling — matches the parser's internal MAX_FILE_BYTES so the interceptor
// rejects oversized files before the parser even reads the buffer.
const MAX_FILE_BYTES = 5 * 1024 * 1024

@ApiTags('admin / sync')
@ApiBearerAuth('access-token')
@Roles('ADMIN')
@Controller('admin/sync')
export class AdminSyncController {
  private readonly logger = new Logger(AdminSyncController.name)

  constructor(
    @Inject(INVENTORY_REPOSITORY) private readonly syncRepo: IStockSyncRepository,
    private readonly parser: SyncFileParserService,
  ) {}

  /**
   * Sincroniza stock y precio de los productos de la web con el export de Optimun.
   *
   * Acepta el archivo .xlsx generado por Optimun (exportación estándar de inventario).
   * Solo actualiza productos existentes en la web — nunca crea ni elimina.
   * La invalidación de caché se realiza como best-effort: si falla, el TTL
   * del caché expira normalmente sin afectar el resultado de la sincronización.
   */
  @Post('stock')
  @HttpCode(HttpStatus.OK)
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Sincronizar stock y precio desde export de Optimun (.xlsx)' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: { type: 'string', format: 'binary', description: 'Export .xlsx de Optimun' },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: MAX_FILE_BYTES } }),
  )
  async syncStock(
    @UploadedFile() file: { buffer: Buffer; originalname: string } | undefined,
  ): Promise<SyncReport> {
    if (!file?.buffer) {
      throw new BadRequestException('Se requiere un archivo .xlsx en el campo "file"')
    }

    const rawRows = this.parser.parse(file.buffer)

    const items: StockSyncItem[] = rawRows.map(r => ({
      codigo: r.codigo,
      nombre: r.nombre,
      stock:  r.stock,
      detal:  r.detal,
    }))

    const result = await new SyncStock(this.syncRepo).execute(items)

    if (!result.ok) {
      const status = DOMAIN_TO_HTTP[result.error.code] ?? HttpStatus.INTERNAL_SERVER_ERROR
      throw new HttpException(result.error.message, status)
    }

    this.invalidateProductCache()

    return result.value
  }

  // ── Private ─────────────────────────────────────────────────────────────────

  private invalidateProductCache(): void {
    const frontendUrl = process.env['FRONTEND_URL'] ?? 'http://localhost:3000'
    const secret = process.env['INTERNAL_API_SECRET']

    if (!secret) {
      this.logger.warn('INTERNAL_API_SECRET no configurado — cache no invalidado tras sync')
      return
    }

    fetch(`${frontendUrl}/api/admin/revalidate`, {
      method:  'POST',
      headers: {
        'Content-Type':      'application/json',
        'x-internal-secret': secret,
      },
      body: JSON.stringify({ tags: ['products', 'catalog', 'home'] }),
    }).catch((e: unknown) => {
      this.logger.warn(
        `Revalidación de caché fallida (best-effort): ${e instanceof Error ? e.message : String(e)}`,
      )
    })
  }
}
