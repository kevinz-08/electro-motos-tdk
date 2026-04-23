/**
 * Factory de cliente HTTP hacia la API NestJS.
 *
 * Uso en server components: apiClient(token).get('/products')
 * Uso en client components: const { data: session } = useSession()
 *                           apiClient(session?.user?.accessToken).post('/orders', body)
 *
 * NEXT_PUBLIC_API_URL se puede inyectar desde .env.local y es seguro exponerlo al browser
 * porque apunta al NestJS público (no contiene secretos).
 */
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

export function apiClient(accessToken?: string | null) {
  const bearer: Record<string, string> = accessToken
    ? { Authorization: `Bearer ${accessToken}` }
    : {}
  const json: Record<string, string> = { 'Content-Type': 'application/json', ...bearer }

  const base = (path: string) => `${API_BASE}${path}`

  return {
    get: (path: string, init?: RequestInit) =>
      fetch(base(path), { ...init, headers: { ...bearer, ...init?.headers } }),

    post: (path: string, body?: unknown) =>
      fetch(base(path), {
        method: 'POST',
        headers: json,
        body: body !== undefined ? JSON.stringify(body) : undefined,
      }),

    put: (path: string, body?: unknown) =>
      fetch(base(path), {
        method: 'PUT',
        headers: json,
        body: body !== undefined ? JSON.stringify(body) : undefined,
      }),

    patch: (path: string, body?: unknown) =>
      fetch(base(path), {
        method: 'PATCH',
        headers: json,
        body: body !== undefined ? JSON.stringify(body) : undefined,
      }),

    delete: (path: string) =>
      fetch(base(path), { method: 'DELETE', headers: bearer }),

    /** Multipart/form-data — omite Content-Type para que el browser lo fije con el boundary */
    postForm: (path: string, formData: FormData) =>
      fetch(base(path), { method: 'POST', headers: bearer, body: formData }),
  }
}
