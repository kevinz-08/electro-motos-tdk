import { Injectable, Logger } from '@nestjs/common'
import { VendeloHttpClient } from './VendeloHttpClient'

export interface VendeloAuthInfo {
  id: number
  name: string
  email: string
  role: string
}

@Injectable()
export class VendeloService {
  private readonly logger = new Logger(VendeloService.name)

  constructor(private readonly http: VendeloHttpClient) {}

  async checkAuth(): Promise<VendeloAuthInfo> {
    this.logger.log('Verificando autenticación con Vendelo API')
    return this.http.get<VendeloAuthInfo>('/v1/admin/check-auth')
  }
}
