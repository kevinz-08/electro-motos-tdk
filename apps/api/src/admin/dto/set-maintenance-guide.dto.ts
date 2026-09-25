import { Type } from 'class-transformer'
import {
  ArrayMaxSize, ArrayMinSize, IsArray, IsDateString, IsInt, IsNotEmpty, IsOptional, IsString, Max, MaxLength, Min, ValidateNested,
} from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import {
  MAINTENANCE_GUIDE_NOTES_MAX_LENGTH, MAINTENANCE_LABEL_MAX_LENGTH, MAINTENANCE_NOTES_MAX_LENGTH,
  MAINTENANCE_SOURCE_MAX_LENGTH, MAX_INTERVAL_KM, MAX_INTERVAL_MONTHS, MAX_MAINTENANCE_ITEMS, MIN_MAINTENANCE_ITEMS,
} from '@h2r/domain'

export class MaintenanceItemDto {
  @ApiProperty({ maxLength: MAINTENANCE_LABEL_MAX_LENGTH }) @IsString() @IsNotEmpty() @MaxLength(MAINTENANCE_LABEL_MAX_LENGTH)
  label: string

  @ApiPropertyOptional({ description: 'Cada cuántos km' }) @IsOptional() @IsInt() @Min(1) @Max(MAX_INTERVAL_KM)
  intervalKm?: number

  @ApiPropertyOptional({ description: 'Cada cuántos meses' }) @IsOptional() @IsInt() @Min(1) @Max(MAX_INTERVAL_MONTHS)
  intervalMonths?: number

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(MAINTENANCE_NOTES_MAX_LENGTH)
  notes?: string

  @ApiPropertyOptional({ description: 'Producto exacto de H2R para este punto de control' }) @IsOptional() @IsString() @MaxLength(64)
  productId?: string
}

/** Guía completa de un modelo (H-20): lo que no venga en `items` se elimina. */
export class SetMaintenanceGuideDto {
  @ApiProperty({ description: 'De dónde salen los intervalos (obligatorio: no se inventan)', maxLength: MAINTENANCE_SOURCE_MAX_LENGTH })
  @IsString() @IsNotEmpty() @MaxLength(MAINTENANCE_SOURCE_MAX_LENGTH)
  source: string

  @ApiProperty({ description: 'Id del revisor técnico que firma la guía (obligatorio)' })
  @IsString() @IsNotEmpty() @MaxLength(64)
  reviewerId: string

  @ApiPropertyOptional({ maxLength: MAINTENANCE_GUIDE_NOTES_MAX_LENGTH })
  @IsOptional() @IsString() @MaxLength(MAINTENANCE_GUIDE_NOTES_MAX_LENGTH)
  notes?: string

  @ApiPropertyOptional({ description: 'Fecha de la revisión (ISO). Por defecto, hoy' })
  @IsOptional() @IsDateString()
  reviewedAt?: string

  @ApiProperty({ type: [MaintenanceItemDto], minItems: MIN_MAINTENANCE_ITEMS, maxItems: MAX_MAINTENANCE_ITEMS })
  @IsArray() @ArrayMinSize(MIN_MAINTENANCE_ITEMS) @ArrayMaxSize(MAX_MAINTENANCE_ITEMS) @ValidateNested({ each: true }) @Type(() => MaintenanceItemDto)
  items: MaintenanceItemDto[]
}
