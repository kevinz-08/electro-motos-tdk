import {
  IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, Matches, Min, MaxLength,
} from 'class-validator'
import { ApiPropertyOptional } from '@nestjs/swagger'

export class UpdateHeroBannerDto {
  @ApiPropertyOptional({ maxLength: 120 })
  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(120)
  altText?: string

  @ApiPropertyOptional({ maxLength: 40 })
  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(40)
  ctaLabel?: string

  @ApiPropertyOptional({ description: 'Ruta relativa del sitio o URL completa' })
  @IsOptional() @IsString() @IsNotEmpty()
  @Matches(/^(\/|https?:\/\/)/, { message: 'ctaUrl debe ser una ruta relativa o una URL completa' })
  ctaUrl?: string

  @ApiPropertyOptional()
  @IsOptional() @IsString() @IsNotEmpty()
  desktopImageUrl?: string

  @ApiPropertyOptional()
  @IsOptional() @IsString() @IsNotEmpty()
  desktopImagePublicId?: string

  @ApiPropertyOptional()
  @IsOptional() @IsString() @IsNotEmpty()
  mobileImageUrl?: string

  @ApiPropertyOptional()
  @IsOptional() @IsString() @IsNotEmpty()
  mobileImagePublicId?: string

  @ApiPropertyOptional({ minimum: 0 })
  @IsOptional() @IsInt() @Min(0)
  order?: number

  @ApiPropertyOptional()
  @IsOptional() @IsBoolean()
  isActive?: boolean
}
