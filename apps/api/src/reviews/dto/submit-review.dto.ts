import { IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { REVIEW_COMMENT_MAX_LENGTH } from '@h2r/domain'

export class SubmitReviewDto {
  @ApiProperty() @IsString() @IsNotEmpty()
  orderItemId: string

  @ApiProperty({ description: 'Token firmado del enlace del correo (HMAC review:orderItemId)' })
  @IsString() @IsNotEmpty()
  token: string

  @ApiProperty({ minimum: 1, maximum: 5 }) @IsInt() @Min(1) @Max(5)
  rating: number

  @ApiProperty() @IsBoolean()
  recommends: boolean

  @ApiPropertyOptional({ maxLength: REVIEW_COMMENT_MAX_LENGTH })
  @IsOptional() @IsString() @MaxLength(REVIEW_COMMENT_MAX_LENGTH)
  comment?: string
}
