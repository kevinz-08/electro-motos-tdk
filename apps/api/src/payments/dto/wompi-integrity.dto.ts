import { IsInt, IsOptional, IsPositive, IsString } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class WompiIntegrityDto {
  @ApiProperty({ description: 'ID del pedido en la base de datos' })
  @IsString()
  orderId: string

  @ApiProperty({ description: 'Monto total en centavos (COP)' })
  @IsInt()
  @IsPositive()
  amountInCents: number

  @ApiProperty({ default: 'COP', required: false })
  @IsOptional()
  @IsString()
  currency?: string
}
