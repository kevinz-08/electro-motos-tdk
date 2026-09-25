import { Type } from 'class-transformer'
import {
  ArrayMaxSize, ArrayMinSize, IsArray, IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString,
  Matches, Max, MaxLength, Min, ValidateNested,
} from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { MAX_KIT_ITEMS, MIN_KIT_ITEMS } from '@h2r/domain'

export class KitItemDto {
  @ApiProperty({ description: 'Id del producto' })
  @IsString() @IsNotEmpty() @MaxLength(64)
  productId: string

  @ApiProperty({ minimum: 1, description: 'Cantidad de este producto en el kit' })
  @IsInt() @Min(1) @Max(999)
  quantity: number
}

export class SetKitDto {
  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(160)
  name: string

  @ApiProperty({ description: 'URL-friendly, único' })
  @IsString() @IsNotEmpty() @MaxLength(180) @Matches(/^[a-z0-9]+(-[a-z0-9]+)*$/, { message: 'El slug solo admite minúsculas, números y guiones' })
  slug: string

  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional() @IsString() @MaxLength(500)
  description?: string

  @ApiProperty({ description: 'Centavos COP a descontar de la suma de los productos. 0 = sin descuento' })
  @IsInt() @Min(0)
  discountCents: number

  @ApiPropertyOptional({ description: 'Id del MotorcycleModel al que se asocia (opcional)' })
  @IsOptional() @IsString() @MaxLength(64)
  modelId?: string

  @ApiProperty({ default: true })
  @IsBoolean()
  isActive: boolean

  @ApiProperty({ type: [KitItemDto], minItems: MIN_KIT_ITEMS, maxItems: MAX_KIT_ITEMS })
  @IsArray() @ArrayMinSize(MIN_KIT_ITEMS) @ArrayMaxSize(MAX_KIT_ITEMS) @ValidateNested({ each: true }) @Type(() => KitItemDto)
  items: KitItemDto[]
}
