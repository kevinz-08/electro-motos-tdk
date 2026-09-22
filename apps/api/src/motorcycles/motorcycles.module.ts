import { Module } from '@nestjs/common'
import { InfrastructureModule } from '../infrastructure/infrastructure.module'
import { FitmentQueryController, MotorcyclesController } from './motorcycles.controller'

/**
 * Sistema de compatibilidad por modelo de moto (docs/seo/, Fase 2).
 * Lectura publica: marcas, modelos, hub de modelo, compatibilidades de un
 * producto y busqueda por referencia OEM.
 */
@Module({
  imports: [InfrastructureModule],
  controllers: [MotorcyclesController, FitmentQueryController],
})
export class MotorcyclesModule {}
