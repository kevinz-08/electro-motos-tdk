import {
  ArrayMaxSize, IsArray, IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, Matches, Max, MaxLength, Min,
} from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import {
  MAX_REVIEWER_CREDENTIALS, MAX_REVIEWER_EXPERIENCE_YEARS, REVIEWER_BIO_MAX_LENGTH,
  REVIEWER_CREDENTIAL_MAX_LENGTH, REVIEWER_HEADLINE_MAX_LENGTH,
} from '@h2r/domain'

/** Revisor técnico (docs/seo/, Fase 5 — H-21). */
export class SaveReviewerDto {
  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(120)
  name: string

  @ApiProperty({ description: 'URL-friendly, único' })
  @IsString() @IsNotEmpty() @MaxLength(140) @Matches(/^[a-z0-9]+(-[a-z0-9]+)*$/, { message: 'El slug solo admite minúsculas, números y guiones' })
  slug: string

  @ApiPropertyOptional({ maxLength: REVIEWER_HEADLINE_MAX_LENGTH })
  @IsOptional() @IsString() @MaxLength(REVIEWER_HEADLINE_MAX_LENGTH)
  headline?: string

  @ApiPropertyOptional({ minimum: 0, maximum: MAX_REVIEWER_EXPERIENCE_YEARS })
  @IsOptional() @IsInt() @Min(0) @Max(MAX_REVIEWER_EXPERIENCE_YEARS)
  yearsExperience?: number

  @ApiProperty({ maxLength: REVIEWER_BIO_MAX_LENGTH, description: 'Resumen de trayectoria' })
  @IsString() @IsNotEmpty() @MaxLength(REVIEWER_BIO_MAX_LENGTH)
  bio: string

  @ApiPropertyOptional({ type: [String], maxItems: MAX_REVIEWER_CREDENTIALS })
  @IsOptional() @IsArray() @ArrayMaxSize(MAX_REVIEWER_CREDENTIALS) @IsString({ each: true }) @MaxLength(REVIEWER_CREDENTIAL_MAX_LENGTH, { each: true })
  credentials?: string[]

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500)
  photoUrl?: string

  @ApiPropertyOptional({ description: 'public_id de Cloudinary de la foto' }) @IsOptional() @IsString() @MaxLength(300)
  photoPublicId?: string

  @ApiProperty() @IsBoolean()
  isActive: boolean
}
