import { IsInt, IsOptional, Max, Min } from 'class-validator'
import { ApiPropertyOptional } from '@nestjs/swagger'
import { CRO_SETTING_RANGES as R } from '@h2r/domain'

/** Umbrales de prueba social y estimación de entrega (README §22.3). Solo se actualizan los campos enviados. */
export class UpdateCroSettingsDto {
  @ApiPropertyOptional({ description: 'Mínimo de unidades vendidas para mostrar el contador' })
  @IsOptional() @IsInt() @Min(R.socialProofMinSold.min) @Max(R.socialProofMinSold.max)
  socialProofMinSold?: number

  @ApiPropertyOptional({ description: 'Mínimo de reseñas aprobadas para mostrar estrellas' })
  @IsOptional() @IsInt() @Min(R.reviewsMinCount.min) @Max(R.reviewsMinCount.max)
  reviewsMinCount?: number

  @ApiPropertyOptional({ description: 'Urgencia "¡Solo quedan X!" cuando 0 < stock < valor' })
  @IsOptional() @IsInt() @Min(R.lowStockThreshold.min) @Max(R.lowStockThreshold.max)
  lowStockThreshold?: number

  @ApiPropertyOptional({ description: 'Días hábiles mínimos de entrega' })
  @IsOptional() @IsInt() @Min(R.shippingEtaMinDays.min) @Max(R.shippingEtaMinDays.max)
  shippingEtaMinDays?: number

  @ApiPropertyOptional({ description: 'Días hábiles máximos de entrega' })
  @IsOptional() @IsInt() @Min(R.shippingEtaMaxDays.min) @Max(R.shippingEtaMaxDays.max)
  shippingEtaMaxDays?: number

  @ApiPropertyOptional({ description: 'Hora de corte (0-24, hora Colombia) para despacho el mismo día' })
  @IsOptional() @IsInt() @Min(R.shippingCutoffHour.min) @Max(R.shippingCutoffHour.max)
  shippingCutoffHour?: number
}
