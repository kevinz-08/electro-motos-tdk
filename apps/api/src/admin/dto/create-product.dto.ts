import {
  IsArray, IsBoolean, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Max, Min, ValidateIf,
} from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class CreateProductDto {
  @ApiProperty() @IsString() @IsNotEmpty() name: string
  @ApiProperty() @IsString() @IsNotEmpty() slug: string
  @ApiProperty() @IsString() @IsNotEmpty() description: string
  @ApiProperty({ description: 'Precio en centavos COP', minimum: 0 }) @IsInt() @Min(0) price: number
  @ApiPropertyOptional({ description: 'Precio de referencia tachado en centavos COP. null = sin precio ancla. Debe ser > price', nullable: true })
  @IsOptional() @ValidateIf((_, v) => v !== null) @IsInt() @Min(1) compareAtPrice?: number | null
  @ApiProperty({ minimum: 0 }) @IsInt() @Min(0) stock: number
  @ApiPropertyOptional({ description: 'Clientes de la tienda física que compraron o recomiendan el producto', minimum: 0, default: 0 })
  @IsOptional() @IsInt() @Min(0) @Max(1_000_000) storeRecommendations?: number
  @ApiProperty() @IsString() @IsNotEmpty() sku: string
  @ApiProperty() @IsString() @IsNotEmpty() categoryId: string
  @ApiPropertyOptional({ default: true }) @IsOptional() @IsBoolean() isActive?: boolean
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() @IsString({ each: true }) images?: string[]
  @ApiPropertyOptional({ description: 'Peso real embalado en kg (para cotización Vendelo)', minimum: 0 })
  @IsOptional() @IsNumber() @Min(0) weightKg?: number
  @ApiPropertyOptional({ description: 'Alto real embalado en cm', minimum: 0 })
  @IsOptional() @IsInt() @Min(0) heightCm?: number
  @ApiPropertyOptional({ description: 'Ancho real embalado en cm', minimum: 0 })
  @IsOptional() @IsInt() @Min(0) widthCm?: number
  @ApiPropertyOptional({ description: 'Largo real embalado en cm', minimum: 0 })
  @IsOptional() @IsInt() @Min(0) lengthCm?: number
}
