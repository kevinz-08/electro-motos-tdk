import { IsArray, IsEnum, IsNotEmpty, IsInt, IsString, Min, ValidateNested, IsOptional } from 'class-validator'
import { Type } from 'class-transformer'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Transform } from 'class-transformer'

export class ValidateCouponItemDto {
  @ApiProperty() @IsString() @IsNotEmpty() productId: string
  @ApiProperty() @IsString() @IsNotEmpty() categoryId: string
  @ApiProperty({ nullable: true }) @IsOptional() @IsString() parentCategoryId: string | null
  @ApiProperty() @IsInt() @Min(1) price: number
  @ApiProperty() @IsInt() @Min(1) quantity: number
}

/** Documento del comprador — permite rastrear cupones "una vez por cliente" sin cuenta. */
export class ValidateCouponBuyerDto {
  @ApiProperty({ enum: ['CC', 'CE', 'NIT', 'PASAPORTE'] })
  @IsEnum(['CC', 'CE', 'NIT', 'PASAPORTE'])
  idType: 'CC' | 'CE' | 'NIT' | 'PASAPORTE'

  @ApiProperty() @IsString() @IsNotEmpty()
  idNumber: string
}

export class ValidateCouponDto {
  @ApiProperty({ example: 'HALLOWEEN20' })
  @IsString() @IsNotEmpty()
  @Transform(({ value }: { value: string }) => value?.toUpperCase().trim())
  code: string

  @ApiProperty({ type: [ValidateCouponItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ValidateCouponItemDto)
  items: ValidateCouponItemDto[]

  @ApiPropertyOptional({ type: ValidateCouponBuyerDto, description: 'Obligatorio para invitados con cupones de un uso por cliente' })
  @IsOptional()
  @ValidateNested()
  @Type(() => ValidateCouponBuyerDto)
  buyer?: ValidateCouponBuyerDto
}
