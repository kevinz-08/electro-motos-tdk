import { Type } from 'class-transformer'
import {
  ArrayMaxSize, IsArray, IsDate, IsIn, IsNotEmpty, IsOptional, IsString, Matches, MaxLength,
} from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import {
  ARTICLE_AUTHOR_MAX_LENGTH, ARTICLE_BODY_MAX_LENGTH, ARTICLE_KINDS, ARTICLE_MAX_SOURCES,
  ARTICLE_META_DESCRIPTION_MAX_LENGTH, ARTICLE_SLUG_MAX_LENGTH, ARTICLE_SOURCE_MAX_LENGTH, ARTICLE_STATUSES,
  ARTICLE_TITLE_MAX_LENGTH, DIRECT_ANSWER_MAX_LENGTH,
} from '@h2r/domain'

/**
 * Artículo de contenido (docs/seo/, Fase 5 — ítem 1). Aquí solo la forma: las
 * reglas de publicación (respuesta directa de 40–60 palabras, revisor activo,
 * fecha de revisión) viven en `SaveArticle`.
 */
export class SaveArticleDto {
  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(ARTICLE_TITLE_MAX_LENGTH)
  title: string

  @ApiProperty({ description: 'URL-friendly, único. "mantenimiento" está reservado.' })
  @IsString() @IsNotEmpty() @MaxLength(ARTICLE_SLUG_MAX_LENGTH)
  @Matches(/^[a-z0-9]+(-[a-z0-9]+)*$/, { message: 'El slug solo admite minúsculas, números y guiones' })
  slug: string

  @ApiProperty({ enum: ARTICLE_KINDS }) @IsIn([...ARTICLE_KINDS])
  kind: 'GUIA' | 'COMPARATIVA'

  @ApiProperty({ enum: ARTICLE_STATUSES }) @IsIn([...ARTICLE_STATUSES])
  status: 'DRAFT' | 'IN_REVIEW' | 'PUBLISHED'

  @ApiPropertyOptional({ description: 'Respuesta directa de apertura, 40 a 60 palabras' })
  @IsOptional() @IsString() @MaxLength(DIRECT_ANSWER_MAX_LENGTH)
  directAnswer?: string

  @ApiPropertyOptional({ description: 'Markdown restringido (##, ###, listas, tablas, **negrita**, enlaces)' })
  @IsOptional() @IsString() @MaxLength(ARTICLE_BODY_MAX_LENGTH)
  body?: string

  @ApiPropertyOptional({ nullable: true })
  @IsOptional() @IsString() @MaxLength(ARTICLE_META_DESCRIPTION_MAX_LENGTH)
  metaDescription?: string | null

  @ApiPropertyOptional({ type: [String] })
  @IsOptional() @IsArray() @ArrayMaxSize(ARTICLE_MAX_SOURCES)
  @IsString({ each: true }) @MaxLength(ARTICLE_SOURCE_MAX_LENGTH, { each: true })
  sources?: string[]

  @ApiProperty({ example: 'Equipo H2R' }) @IsString() @IsNotEmpty() @MaxLength(ARTICLE_AUTHOR_MAX_LENGTH)
  authorName: string

  @ApiPropertyOptional({ nullable: true }) @IsOptional() @IsString() @MaxLength(64)
  reviewerId?: string | null

  @ApiPropertyOptional({ nullable: true, example: '2026-09-26' })
  @IsOptional() @Type(() => Date) @IsDate()
  reviewedAt?: Date | null

  @ApiPropertyOptional({ nullable: true }) @IsOptional() @IsString() @MaxLength(64)
  modelId?: string | null
}
