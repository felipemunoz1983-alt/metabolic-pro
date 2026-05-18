import { describe, it, expect, beforeEach } from 'vitest'
import { checkRateLimit, _resetRateLimitState, CHAT_LIMIT } from './rate-limit'

describe('checkRateLimit', () => {
  beforeEach(() => {
    _resetRateLimitState()
  })

  describe('comportamiento básico', () => {
    it('primera llamada → allowed con remaining = max - 1', () => {
      const r = checkRateLimit('user-1:chat', CHAT_LIMIT, 1000)
      expect(r.allowed).toBe(true)
      expect(r.remaining).toBe(19)
      expect(r.retryAfterSec).toBe(0)
    })

    it('llamadas consecutivas decrementan remaining', () => {
      const r1 = checkRateLimit('user-1:chat', CHAT_LIMIT, 1000)
      const r2 = checkRateLimit('user-1:chat', CHAT_LIMIT, 2000)
      const r3 = checkRateLimit('user-1:chat', CHAT_LIMIT, 3000)
      expect(r1.remaining).toBe(19)
      expect(r2.remaining).toBe(18)
      expect(r3.remaining).toBe(17)
    })

    it('alcanza el límite y bloquea la siguiente', () => {
      // Consumir los 20 permitidos
      let last: ReturnType<typeof checkRateLimit> = { allowed: true, remaining: 0, retryAfterSec: 0, resetAtMs: 0 }
      for (let i = 0; i < 20; i++) {
        last = checkRateLimit('user-1:chat', CHAT_LIMIT, 1000 + i)
        expect(last.allowed, `iteración ${i}`).toBe(true)
      }
      expect(last.remaining).toBe(0)

      // La 21 debe ser bloqueada
      const blocked = checkRateLimit('user-1:chat', CHAT_LIMIT, 1000)
      expect(blocked.allowed).toBe(false)
      expect(blocked.remaining).toBe(0)
      expect(blocked.retryAfterSec).toBeGreaterThan(0)
    })
  })

  describe('aislamiento entre buckets', () => {
    it('diferentes usuarios tienen quotas independientes', () => {
      for (let i = 0; i < 20; i++) {
        checkRateLimit('user-1:chat', CHAT_LIMIT, 1000)
      }
      const blockedA = checkRateLimit('user-1:chat', CHAT_LIMIT, 1000)
      const allowedB = checkRateLimit('user-2:chat', CHAT_LIMIT, 1000)

      expect(blockedA.allowed).toBe(false)
      expect(allowedB.allowed).toBe(true)
    })

    it('diferentes endpoints del mismo usuario tienen quotas independientes', () => {
      for (let i = 0; i < 20; i++) {
        checkRateLimit('user-1:chat', CHAT_LIMIT, 1000)
      }
      const blockedChat = checkRateLimit('user-1:chat', CHAT_LIMIT, 1000)
      const allowedScan = checkRateLimit('user-1:food-scan', CHAT_LIMIT, 1000)

      expect(blockedChat.allowed).toBe(false)
      expect(allowedScan.allowed).toBe(true)
    })
  })

  describe('reseteo de ventana', () => {
    it('después de windowMs la ventana se resetea y permite nuevas llamadas', () => {
      // Llenar el bucket
      for (let i = 0; i < 20; i++) {
        checkRateLimit('user-1:chat', CHAT_LIMIT, 1000)
      }
      expect(checkRateLimit('user-1:chat', CHAT_LIMIT, 1000).allowed).toBe(false)

      // Avanzar el tiempo más allá de la ventana (5 min = 300000 ms)
      const afterWindow = 1000 + 300_000 + 1
      const r = checkRateLimit('user-1:chat', CHAT_LIMIT, afterWindow)
      expect(r.allowed).toBe(true)
      expect(r.remaining).toBe(19)
    })

    it('justo antes del fin de ventana sigue bloqueando', () => {
      for (let i = 0; i < 20; i++) {
        checkRateLimit('user-1:chat', CHAT_LIMIT, 1000)
      }
      // 1 ms antes del reseteo
      const r = checkRateLimit('user-1:chat', CHAT_LIMIT, 1000 + 300_000 - 1)
      expect(r.allowed).toBe(false)
    })
  })

  describe('retryAfterSec', () => {
    it('reporta tiempo correcto hasta el reset', () => {
      // Llenar bucket en t=1000
      for (let i = 0; i < 20; i++) {
        checkRateLimit('user-1:chat', CHAT_LIMIT, 1000)
      }
      // Consultar a los 100s
      const r = checkRateLimit('user-1:chat', CHAT_LIMIT, 1000 + 100_000)
      expect(r.allowed).toBe(false)
      // Ventana = 300s, transcurridos 100s, debe quedar ~200s
      expect(r.retryAfterSec).toBeGreaterThanOrEqual(199)
      expect(r.retryAfterSec).toBeLessThanOrEqual(201)
    })
  })

  describe('configuración custom', () => {
    it('respeta configuración con max=1, windowMs=10000', () => {
      const config = { max: 1, windowMs: 10_000 }

      const r1 = checkRateLimit('test-1', config, 0)
      expect(r1.allowed).toBe(true)
      expect(r1.remaining).toBe(0)

      const r2 = checkRateLimit('test-1', config, 1000)
      expect(r2.allowed).toBe(false)

      // Avanzar más allá de la ventana
      const r3 = checkRateLimit('test-1', config, 10_001)
      expect(r3.allowed).toBe(true)
    })
  })

  describe('resetAtMs', () => {
    it('expone el timestamp absoluto del reset (útil para headers HTTP)', () => {
      const now = 1_000_000
      const r = checkRateLimit('user-1', CHAT_LIMIT, now)
      // Ventana de 5 min = 300_000 ms
      expect(r.resetAtMs).toBe(now + 300_000)
    })

    it('resetAtMs se mantiene a través de llamadas en la misma ventana', () => {
      const r1 = checkRateLimit('user-1', CHAT_LIMIT, 1000)
      const r2 = checkRateLimit('user-1', CHAT_LIMIT, 2000)
      const r3 = checkRateLimit('user-1', CHAT_LIMIT, 5000)
      // Todos calculan el mismo resetAtMs porque el bucket es el mismo
      expect(r1.resetAtMs).toBe(r2.resetAtMs)
      expect(r2.resetAtMs).toBe(r3.resetAtMs)
    })
  })
})
