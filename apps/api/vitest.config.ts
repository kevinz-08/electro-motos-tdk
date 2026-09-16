import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    globals: true,
    setupFiles: ['reflect-metadata'],
    // Firma de enlaces de pedido (shared/order-access-token.ts) — valor fijo solo para tests.
    env: { INTERNAL_API_SECRET: 'test-internal-secret' },
  },
  resolve: {
    alias: {
      '@/domain': path.resolve(__dirname, '../../packages/domain/src'),
    },
  },
})
