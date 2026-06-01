import { Injectable, Logger } from '@nestjs/common'
import { VendeloHttpClient } from './VendeloHttpClient'

export interface VendeloAuthInfo {
  message: string
}

export interface VendelloCityItem {
  code: string
  name: string
  subdivision_code: string
  country_code: string
}

interface PaginatedResponse<T> {
  curr_page_token: string
  next_page_token: string
  page_item_count: number
  items: T[]
}

@Injectable()
export class VendeloService {
  private readonly logger = new Logger(VendeloService.name)

  constructor(private readonly http: VendeloHttpClient) {}

  async checkAuth(): Promise<VendeloAuthInfo> {
    this.logger.log('Verificando autenticación con Vendelo API')
    return this.http.get<VendeloAuthInfo>('/v1/admin/check-auth')
  }

  async getCitiesPage(pageToken = '', pageSize = 500): Promise<PaginatedResponse<VendelloCityItem>> {
    const params = new URLSearchParams({ page_size: String(pageSize) })
    if (pageToken) params.set('page_token', pageToken)
    return this.http.get<PaginatedResponse<VendelloCityItem>>(`/v1/admin/region/cities?${params}`)
  }

  async getAllCities(): Promise<VendelloCityItem[]> {
    const cities: VendelloCityItem[] = []
    let pageToken = ''

    do {
      const page = await this.getCitiesPage(pageToken)
      cities.push(...page.items)
      pageToken = page.next_page_token
      this.logger.log(`Ciudades cargadas: ${cities.length} (next_page_token: "${pageToken || 'fin'}")`)
    } while (pageToken !== '')

    return cities
  }
}
