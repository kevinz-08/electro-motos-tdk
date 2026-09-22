import { IsArray, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

/**
 * Alta o edición de un modelo de moto (docs/seo/, Fase 2).
 *
 * `cc`, `yearFrom` y `yearTo` son opcionales a proposito: si el dato no esta
 * confirmado se queda en null y la web no lo muestra, en vez de estimarlo.
 */
export class CreateMotorcycleModelDto {
  @ApiProperty({ example: 'AKT', description: 'Marca de la moto. Se crea si no existe.' })
  @IsString() @MaxLength(60)
  brandName: string

  @ApiProperty({ example: 'NKD 125', description: 'Nombre del modelo, sin la marca.' })
  @IsString() @MaxLength(80)
  name: string

  @ApiPropertyOptional({ example: 'nkd-125', description: 'Slug de la URL. Por defecto se deriva del nombre.' })
  @IsOptional() @IsString() @MaxLength(80)
  slug?: string

  @ApiPropertyOptional({ example: 125, description: 'Cilindrada. Solo si esta confirmada.' })
  @IsOptional() @IsInt() @Min(49) @Max(2500)
  cc?: number

  @ApiPropertyOptional({ example: 2018 })
  @IsOptional() @IsInt() @Min(1950) @Max(2100)
  yearFrom?: number

  @ApiPropertyOptional({ example: 2024 })
  @IsOptional() @IsInt() @Min(1950) @Max(2100)
  yearTo?: number

  @ApiPropertyOptional({
    example: ['NKD', 'AK125NKD'],
    description: 'Como lo escribe la gente al buscar. Alimenta el buscador interno.',
  })
  @IsOptional() @IsArray() @IsString({ each: true })
  aliases?: string[]

  @ApiPropertyOptional({ description: 'Introduccion del hub. La escribe un humano; sin ella el hub va sin texto.' })
  @IsOptional() @IsString() @MaxLength(2000)
  intro?: string
}
