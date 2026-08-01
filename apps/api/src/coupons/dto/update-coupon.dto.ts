import {
  IsArray, IsBoolean, IsDateString, IsEnum, IsInt, IsOptional, IsString,
  Min, IsNotEmpty,
} from 'class-validator'
import { Transform } from 'class-transformer'
import { ApiPropertyOptional } from '@nestjs/swagger'

export class UpdateCouponDto {
  @ApiPropertyOptional()
  @IsOptional() @IsString() @IsNotEmpty()
  @Transform(({ value }: { value: string }) => value?.toUpperCase().trim())
  code?: string

  @ApiPropertyOptional({ enum: ['PERCENTAGE', 'FIXED'] })
  @IsOptional() @IsEnum(['PERCENTAGE', 'FIXED'])
  type?: 'PERCENTAGE' | 'FIXED'

  @ApiPropertyOptional()
  @IsOptional() @IsInt() @Min(1)
  value?: number

  @ApiPropertyOptional({ enum: ['NONE', 'ONCE_PER_CUSTOMER', 'FIRST_PURCHASE'] })
  @IsOptional() @IsEnum(['NONE', 'ONCE_PER_CUSTOMER', 'FIRST_PURCHASE'])
  restriction?: 'NONE' | 'ONCE_PER_CUSTOMER' | 'FIRST_PURCHASE'

  @ApiPropertyOptional({ enum: ['STORE', 'CATEGORY', 'PRODUCT'] })
  @IsOptional() @IsEnum(['STORE', 'CATEGORY', 'PRODUCT'])
  scope?: 'STORE' | 'CATEGORY' | 'PRODUCT'

  @ApiPropertyOptional()
  @IsOptional() @IsDateString()
  expiresAt?: string

  @ApiPropertyOptional({ description: 'Reemplaza todas las categorías del cupón. null para limpiar.', type: [String] })
  @IsOptional() @IsArray() @IsString({ each: true }) @IsNotEmpty({ each: true })
  categoryIds?: string[] | null

  @ApiPropertyOptional({ description: 'null para limpiar el scope de producto' })
  @IsOptional() @IsString()
  productId?: string | null

  @ApiPropertyOptional()
  @IsOptional() @IsBoolean()
  isActive?: boolean
}
