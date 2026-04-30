import {
  IsArray, IsEnum, IsInt, IsNotEmpty, IsOptional,
  IsString, Min, ValidateNested,
} from 'class-validator'
import { Type } from 'class-transformer'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class ShippingAddressDto {
  @ApiProperty() @IsString() @IsNotEmpty() fullName: string
  @ApiProperty() @IsString() @IsNotEmpty() address: string
  @ApiProperty() @IsString() @IsNotEmpty() city: string
  @ApiProperty() @IsString() @IsNotEmpty() department: string
  @ApiProperty() @IsString() @IsNotEmpty() phone: string
  @ApiPropertyOptional() @IsOptional() @IsString() postalCode?: string
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string
}

export class OrderItemDto {
  @ApiProperty() @IsString() @IsNotEmpty() productId: string
  @ApiProperty({ minimum: 1 }) @IsInt() @Min(1) quantity: number
}

export class CreateOrderDto {
  @ApiProperty({ type: [OrderItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[]

  @ApiProperty()
  @ValidateNested()
  @Type(() => ShippingAddressDto)
  shippingAddress: ShippingAddressDto

  @ApiProperty({ enum: ['WOMPI', 'MERCADO_PAGO'] })
  @IsEnum(['WOMPI', 'MERCADO_PAGO'])
  paymentProvider: 'WOMPI' | 'MERCADO_PAGO'
}
