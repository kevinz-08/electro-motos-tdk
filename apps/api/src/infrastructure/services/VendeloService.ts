import { Injectable, Logger } from '@nestjs/common'
import { Order } from '@h2r/domain'
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

interface VendeloCreateOrderBody {
  pickup_info: {
    contact_name: string
    contact_phone: string
    address_1: string
    city_code: string
    subdivision_code: string
    country_code: string
    postal_code: string
  }
  billing_info: {
    first_name: string
    last_name: string
    email: string
    phone: string
    identification_type: string
    identification: string
  }
  shipping_info: {
    first_name: string
    last_name: string
    address_1: string
    city_code: string
    subdivision_code: string
    country_code: string
    postal_code: string
    phone: string
  }
  line_items: Array<{
    type: 'STANDARD'
    name: string
    sku: string
    quantity: number
    unit_price: number
    weight: number
    weight_unit: 'kg'
    height: number
    width: number
    length: number
    dimensions_unit: 'cm'
  }>
  payment_method_code: 'EXTERNAL_PAYMENT'
  external_order_id: string
  confirmation_status: 'CONFIRMED'
  discounts: []
}

export interface VendeloCreateOrderResponse {
  items: Array<{ id: string; [key: string]: unknown }>
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

  async createOrder(order: Order, userEmail: string): Promise<VendeloCreateOrderResponse> {
    const addr = order.shippingAddress

    const nameParts = addr.fullName.trim().split(/\s+/)
    const firstName = nameParts[0] ?? addr.fullName
    const lastName = nameParts.slice(1).join(' ') || firstName

    const pickupName = process.env['VENDELO_STORE_NAME'] ?? 'Electro Motos TDK'
    const pickupPhone = process.env['VENDELO_STORE_PHONE'] ?? '3000000000'
    const pickupAddress = process.env['VENDELO_STORE_ADDRESS'] ?? 'Dirección de la tienda'
    const pickupCityCode = process.env['VENDELO_STORE_CITY_CODE'] ?? '05001000'
    const pickupSubdivision = process.env['VENDELO_STORE_SUBDIVISION_CODE'] ?? '02'

    const defaultWeightKg = parseFloat(process.env['VENDELO_DEFAULT_WEIGHT_KG'] ?? '0.5')
    const defaultHeight = parseInt(process.env['VENDELO_DEFAULT_HEIGHT_CM'] ?? '10', 10)
    const defaultWidth = parseInt(process.env['VENDELO_DEFAULT_WIDTH_CM'] ?? '10', 10)
    const defaultLength = parseInt(process.env['VENDELO_DEFAULT_LENGTH_CM'] ?? '10', 10)

    const body: VendeloCreateOrderBody = {
      pickup_info: {
        contact_name: pickupName,
        contact_phone: pickupPhone,
        address_1: pickupAddress,
        city_code: pickupCityCode,
        subdivision_code: pickupSubdivision,
        country_code: 'CO',
        postal_code: '',
      },
      billing_info: {
        first_name: firstName,
        last_name: lastName,
        email: userEmail,
        phone: addr.phone,
        identification_type: 'CC',
        identification: addr.phone,
      },
      shipping_info: {
        first_name: firstName,
        last_name: lastName,
        address_1: addr.address,
        city_code: addr.cityCode ?? pickupCityCode,
        subdivision_code: addr.subdivisionCode ?? pickupSubdivision,
        country_code: 'CO',
        postal_code: addr.postalCode ?? '',
        phone: addr.phone,
      },
      line_items: (order.items ?? []).map((item) => ({
        type: 'STANDARD' as const,
        name: `Producto ${item.productId}`,
        sku: item.productId,
        quantity: item.quantity,
        unit_price: item.priceAtPurchase / 100,
        weight: defaultWeightKg,
        weight_unit: 'kg' as const,
        height: defaultHeight,
        width: defaultWidth,
        length: defaultLength,
        dimensions_unit: 'cm' as const,
      })),
      payment_method_code: 'EXTERNAL_PAYMENT',
      external_order_id: order.id,
      confirmation_status: 'CONFIRMED',
      discounts: [],
    }

    this.logger.log(`Creando orden Vendelo para pedido interno ${order.id}`)
    return this.http.post<VendeloCreateOrderResponse>('/v1/admin/orders', body)
  }
}
