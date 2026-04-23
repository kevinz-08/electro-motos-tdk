import { IsArray, IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator'
import { ApiPropertyOptional } from '@nestjs/swagger'

export class UpdateProductDto {
  @ApiPropertyOptional() @IsOptional() @IsString() name?: string
  @ApiPropertyOptional() @IsOptional() @IsString() slug?: string
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) price?: number
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) stock?: number
  @ApiPropertyOptional() @IsOptional() @IsString() sku?: string
  @ApiPropertyOptional() @IsOptional() @IsString() categoryId?: string
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() @IsString({ each: true }) images?: string[]
}
