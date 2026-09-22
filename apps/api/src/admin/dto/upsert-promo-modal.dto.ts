import { IsBoolean, IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

/** Pop-up promocional de la home (README §25.1). Fila única: se crea o actualiza en un solo PUT. */
export class UpsertPromoModalDto {
  @ApiPropertyOptional({ default: false, description: 'Switch de activación del modal' })
  @IsOptional() @IsBoolean()
  isActive?: boolean

  @ApiProperty({ maxLength: 120, description: 'Texto alternativo (accesibilidad/SEO) — no se muestra' })
  @IsString() @IsNotEmpty() @MaxLength(120)
  altText: string

  @ApiProperty({ description: 'Destino al hacer clic: ruta relativa del sitio o URL completa' })
  @IsString() @IsNotEmpty()
  @Matches(/^(\/|https?:\/\/)/, { message: 'ctaUrl debe ser una ruta relativa o una URL completa' })
  ctaUrl: string

  @ApiProperty({ description: 'secure_url de la imagen horizontal (desktop)' })
  @IsString() @IsNotEmpty()
  desktopImageUrl: string

  @ApiProperty()
  @IsString() @IsNotEmpty()
  desktopImagePublicId: string

  @ApiProperty({ description: 'secure_url de la imagen vertical (mobile)' })
  @IsString() @IsNotEmpty()
  mobileImageUrl: string

  @ApiProperty()
  @IsString() @IsNotEmpty()
  mobileImagePublicId: string
}
