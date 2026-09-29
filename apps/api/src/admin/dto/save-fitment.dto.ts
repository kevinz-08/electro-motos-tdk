import { IsBoolean, IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { FITMENT_NOTES_MAX_LENGTH, FITMENT_SOURCE_MAX_LENGTH } from '@h2r/domain'

/**
 * Alta o edición de una compatibilidad desde el panel (docs/seo/, H-37).
 * Las reglas de negocio (fuente obligatoria, orden de los años, modelo activo)
 * viven en `SaveFitment`; aquí solo se valida la forma.
 */
export class SaveFitmentDto {
  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(64)
  productId: string

  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(64)
  modelId: string

  @ApiProperty({ enum: ['DELANTERA', 'TRASERA', 'AMBAS'] })
  @IsIn(['DELANTERA', 'TRASERA', 'AMBAS'])
  position: 'DELANTERA' | 'TRASERA' | 'AMBAS'

  @ApiPropertyOptional({ example: 2018, nullable: true })
  @IsOptional() @IsInt() @Min(1950) @Max(2100)
  yearFrom?: number | null

  @ApiPropertyOptional({ example: 2024, nullable: true })
  @IsOptional() @IsInt() @Min(1950) @Max(2100)
  yearTo?: number | null

  @ApiPropertyOptional({ example: 'Solo versión carburada', nullable: true })
  @IsOptional() @IsString() @MaxLength(FITMENT_NOTES_MAX_LENGTH)
  notes?: string | null

  @ApiProperty({ example: 'Manual AKT NKD 125 2023, pág. 42' })
  @IsString() @MaxLength(FITMENT_SOURCE_MAX_LENGTH)
  source: string

  @ApiProperty({ description: 'Solo las verificadas se publican' })
  @IsBoolean()
  verified: boolean
}
