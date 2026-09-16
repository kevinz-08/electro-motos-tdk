import {
  IsInt, IsNotEmpty, IsOptional, IsString, Matches, Min, MaxLength,
} from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

/** Hero puramente visual (README §22.2): dos imágenes + botón CTA obligatorio, sin título/descripción. */
export class CreateHeroBannerDto {
  @ApiProperty({ maxLength: 120, description: 'Texto alternativo (accesibilidad/SEO) — no se muestra' })
  @IsString() @IsNotEmpty() @MaxLength(120)
  altText: string

  @ApiPropertyOptional({ maxLength: 40, default: 'Comprar ahora' })
  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(40)
  ctaLabel?: string

  @ApiProperty({ description: 'Ruta relativa del sitio o URL completa' })
  @IsString() @IsNotEmpty()
  @Matches(/^(\/|https?:\/\/)/, { message: 'ctaUrl debe ser una ruta relativa o una URL completa' })
  ctaUrl: string

  @ApiProperty({ description: 'secure_url de la imagen horizontal (desktop) devuelta por /admin/banners/upload-image' })
  @IsString() @IsNotEmpty()
  desktopImageUrl: string

  @ApiProperty()
  @IsString() @IsNotEmpty()
  desktopImagePublicId: string

  @ApiProperty({ description: 'secure_url de la imagen vertical (mobile) devuelta por /admin/banners/upload-image' })
  @IsString() @IsNotEmpty()
  mobileImageUrl: string

  @ApiProperty()
  @IsString() @IsNotEmpty()
  mobileImagePublicId: string

  @ApiPropertyOptional({ minimum: 0 })
  @IsOptional() @IsInt() @Min(0)
  order?: number
}
