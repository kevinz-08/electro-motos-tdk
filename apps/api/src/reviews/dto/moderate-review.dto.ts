import { IsEnum } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class ModerateReviewDto {
  @ApiProperty({ enum: ['APPROVED', 'REJECTED', 'PENDING'] })
  @IsEnum(['APPROVED', 'REJECTED', 'PENDING'])
  status: 'APPROVED' | 'REJECTED' | 'PENDING'
}
