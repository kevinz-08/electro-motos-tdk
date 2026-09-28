import { IsBoolean } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

/** Marcar o desmarcar una subcategoría como marca (Índice de Precios, H-55). */
export class SetCategoryBrandDto {
  @ApiProperty({ description: 'true = la subcategoría es una marca y el índice la suma a su categoría padre' })
  @IsBoolean()
  isBrand: boolean
}
