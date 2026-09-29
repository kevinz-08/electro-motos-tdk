import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator'
import { ApiPropertyOptional } from '@nestjs/swagger'
import { MAX_WARRANTY_MONTHS, MPN_MAX_LENGTH, PART_BRAND_MAX_LENGTH, PART_TYPES } from '@h2r/domain'

/**
 * Marca, MPN, tipo y garantía de un repuesto (Fase 7, H-18). `null` o ausente
 * = sin dato. Las reglas de negocio (marcas no válidas como "genérico") están
 * en `validateProductIdentifiers`.
 */
export class SetProductIdentifiersDto {
  @ApiPropertyOptional({ nullable: true, example: 'Magna' })
  @IsOptional() @IsString() @MaxLength(PART_BRAND_MAX_LENGTH)
  partBrand?: string | null

  @ApiPropertyOptional({ nullable: true, example: 'MAGX7L-BS', description: 'Referencia del fabricante del repuesto' })
  @IsOptional() @IsString() @MaxLength(MPN_MAX_LENGTH)
  mpn?: string | null

  @ApiPropertyOptional({ nullable: true, enum: ['ORIGINAL', 'HOMOLOGADO', 'GENERICO'] })
  @IsOptional() @IsIn([...PART_TYPES])
  partType?: 'ORIGINAL' | 'HOMOLOGADO' | 'GENERICO' | null

  @ApiPropertyOptional({ nullable: true, minimum: 0, maximum: MAX_WARRANTY_MONTHS })
  @IsOptional() @IsInt() @Min(0) @Max(MAX_WARRANTY_MONTHS)
  warrantyMonths?: number | null
}
