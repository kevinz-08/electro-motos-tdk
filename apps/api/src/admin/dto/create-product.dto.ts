import {
  IsArray, IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, Min,
} from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class CreateProductDto {
  @ApiProperty() @IsString() @IsNotEmpty() name: string
  @ApiProperty() @IsString() @IsNotEmpty() slug: string
  @ApiProperty() @IsString() @IsNotEmpty() description: string
  @ApiProperty({ description: 'Precio en centavos COP', minimum: 0 }) @IsInt() @Min(0) price: number
  @ApiProperty({ minimum: 0 }) @IsInt() @Min(0) stock: number
  @ApiProperty() @IsString() @IsNotEmpty() sku: string
  @ApiProperty() @IsString() @IsNotEmpty() categoryId: string
  @ApiPropertyOptional({ default: true }) @IsOptional() @IsBoolean() isActive?: boolean
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() @IsString({ each: true }) images?: string[]
}
