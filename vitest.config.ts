import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    environment: 'node',           // los tests son de lógica pura, no DOM
    include: ['src/**/*.test.ts'],
    globals: true,                 // permite `describe`, `it`, `expect` sin import
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
