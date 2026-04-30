import { IsArray, IsInt, IsNotEmpty, IsString, Min, ValidateNested } from 'class-validator'
import { Type } from 'class-transformer'
import { ApiProperty } from '@nestjs/swagger'

export class StockUpdateItemDto {
  @ApiProperty() @IsString() @IsNotEmpty() sku: string
  @ApiProperty({ minimum: 0 }) @IsInt() @Min(0) stock: number
}

export class BulkStockUpdateDto {
  @ApiProperty({ type: [StockUpdateItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StockUpdateItemDto)
  updates: StockUpdateItemDto[]
}
