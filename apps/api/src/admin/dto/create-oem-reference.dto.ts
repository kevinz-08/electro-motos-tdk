import { IsOptional, IsString, MaxLength } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

/** Alta de una referencia original del fabricante para un producto. */
export class CreateOemReferenceDto {
  @ApiProperty() @IsString()
  productId: string

  @ApiProperty({ example: '5VL-F5121-00', description: 'Tal como la imprime el fabricante.' })
  @IsString() @MaxLength(80)
  reference: string

  @ApiPropertyOptional({ example: 'Yamaha' })
  @IsOptional() @IsString() @MaxLength(60)
  manufacturer?: string
}
