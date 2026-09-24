import { Type } from 'class-transformer'
import { ArrayMaxSize, IsArray, IsBoolean, IsNotEmpty, IsOptional, IsString, MaxLength, ValidateNested } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { CROSS_SELL_REASON_MAX_LENGTH, MAX_CROSS_SELLS } from '@h2r/domain'

export class CrossSellItemDto {
  @ApiProperty({ description: 'Id del producto sugerido' })
  @IsString() @IsNotEmpty() @MaxLength(64)
  relatedId: string

  @ApiPropertyOptional({ maxLength: CROSS_SELL_REASON_MAX_LENGTH, description: 'Motivo visible (opcional)' })
  @IsOptional() @IsString() @MaxLength(CROSS_SELL_REASON_MAX_LENGTH)
  reason?: string

  @ApiPropertyOptional({ description: 'También sugerir este producto en la ficha del sugerido' })
  @IsOptional() @IsBoolean()
  reciprocal?: boolean
}

/** Lista COMPLETA y ordenada de sugerencias: lo que no venga se elimina. */
export class SetCrossSellsDto {
  @ApiProperty({ type: [CrossSellItemDto], maxItems: MAX_CROSS_SELLS })
  @IsArray() @ArrayMaxSize(MAX_CROSS_SELLS) @ValidateNested({ each: true }) @Type(() => CrossSellItemDto)
  items: CrossSellItemDto[]
}
