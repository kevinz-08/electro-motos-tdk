import { Injectable, Logger } from '@nestjs/common'

interface RequestOptions {
  method: string
  path: string
  body?: unknown
  attempt?: number
}

const MAX_ATTEMPTS = 4 // 1 initial + 3 retries
const RETRY_DELAYS_MS = [1_000, 2_000, 4_000]
const TIMEOUT_MS = 10_000

const isRetryable = (status: number) => status === 429 || status >= 500

@Injectable()
export class VendeloHttpClient {
  private readonly logger = new Logger(VendeloHttpClient.name)
  private readonly apiKey: string
  private readonly baseUrl: string

  constructor() {
    this.apiKey = process.env['VENDELO_API_KEY'] ?? ''
    this.baseUrl = (process.env['VENDELO_API_URL'] ?? 'https://api.vendelo.co').replace(/\/$/, '')
  }

  async get<T>(path: string): Promise<T> {
    return this.request<T>({ method: 'GET', path })
  }

  async post<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>({ method: 'POST', path, body })
  }

  async patch<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>({ method: 'PATCH', path, body })
  }

  private async request<T>({ method, path, body, attempt = 1 }: RequestOptions): Promise<T> {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS)
    const start = Date.now()

    try {
      const res = await fetch(`${this.baseUrl}${path}`, {
        method,
        headers: {
          'X-Venndelo-Api-Key': this.apiKey,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      })

      const latency = Date.now() - start
      this.logger.log(`${method} ${path} → ${res.status} (${latency}ms)`)

      if (isRetryable(res.status) && attempt < MAX_ATTEMPTS) {
        const delay = RETRY_DELAYS_MS[attempt - 1] ?? 4_000
        this.logger.warn(`Vendelo ${res.status} — reintentando en ${delay}ms (intento ${attempt}/${MAX_ATTEMPTS - 1})`)
        await new Promise<void>((r) => setTimeout(r, delay))
        return this.request<T>({ method, path, body, attempt: attempt + 1 })
      }

      if (!res.ok) {
        const text = await res.text().catch(() => '')
        this.logger.error(`Vendelo error ${res.status}: ${text}`, { method, path })
        throw new Error(`Vendelo API ${res.status}: ${text}`)
      }

      return res.json() as Promise<T>
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        this.logger.error(`Vendelo timeout (>${TIMEOUT_MS}ms): ${method} ${path}`)
        throw new Error(`Vendelo request timeout: ${method} ${path}`)
      }
      throw err
    } finally {
      clearTimeout(timeout)
    }
  }
}
