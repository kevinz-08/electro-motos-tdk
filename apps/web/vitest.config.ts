import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    // Solo tests unitarios; los specs de Playwright viven en e2e/ y no deben ejecutarse aquí.
    include: ['src/**/*.test.ts'],
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
})
