/**
 * POST /api/chat
 * Nutritional AI chat powered by Claude.
 * Replaces the missing Supabase Edge Function.
 *
 * Protección:
 *  1. Auth requerido (sin sesión → 401)
 *  2. Rate limit corto: CHAT_LIMIT (20 msgs / 5 min)
 *  3. Rate limit diario: CHAT_DAILY_LIMIT (200 msgs / día)
 *  4. Headers HTTP X-RateLimit-* para transparencia al cliente
 */
import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { getAuthUser } from '@/lib/auth-server'
import {
  checkRateLimit,
  CHAT_LIMIT,
  CHAT_DAILY_LIMIT,
} from '@/lib/rate-limit'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

interface Message {
  role: 'user' | 'assistant'
  content: string
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  // ── Auth guard ────────────────────────────────────────────────────────────
  const user = await getAuthUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // ── Rate limit (short window) ─────────────────────────────────────────────
  const short = checkRateLimit(`${user.id}:chat`, CHAT_LIMIT)
  if (!short.allowed) {
    return NextResponse.json(
      {
        error: 'Demasiados mensajes. Intenta de nuevo en unos minutos.',
        retryAfterSec: short.retryAfterSec,
      },
      {
        status: 429,
        headers: {
          'Retry-After': String(short.retryAfterSec),
          'X-RateLimit-Limit': String(CHAT_LIMIT.max),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(Math.floor(short.resetAtMs / 1000)),
        },
      }
    )
  }

  // ── Rate limit (daily cap) ────────────────────────────────────────────────
  const daily = checkRateLimit(`${user.id}:chat:daily`, CHAT_DAILY_LIMIT)
  if (!daily.allowed) {
    return NextResponse.json(
      {
        error: 'Has alcanzado el límite diario de mensajes. Vuelve mañana.',
        retryAfterSec: daily.retryAfterSec,
      },
      {
        status: 429,
        headers: {
          'Retry-After': String(daily.retryAfterSec),
          'X-RateLimit-Limit': String(CHAT_DAILY_LIMIT.max),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(Math.floor(daily.resetAtMs / 1000)),
        },
      }
    )
  }

  // ── Body validation ───────────────────────────────────────────────────────
  let messages: Message[]
  let system: string

  try {
    const body = await req.json()
    messages = body.messages
    system   = body.system ?? 'Eres un nutricionista virtual de Centro Metabólico Pro.'
    if (!messages?.length) throw new Error('no messages')
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 })
  }

  // ── Anthropic call ────────────────────────────────────────────────────────
  try {
    const response = await client.messages.create({
      model:      'claude-haiku-4-5',
      max_tokens: 512,
      system,
      messages: messages.map(m => ({ role: m.role, content: m.content })),
    })

    const reply = response.content[0]?.type === 'text'
      ? response.content[0].text
      : 'No pude generar una respuesta.'

    return NextResponse.json({ reply }, {
      headers: {
        'X-RateLimit-Limit': String(CHAT_LIMIT.max),
        'X-RateLimit-Remaining': String(short.remaining),
        'X-RateLimit-Reset': String(Math.floor(short.resetAtMs / 1000)),
      },
    })
  } catch (err) {
    console.error('[/api/chat] Claude error:', err)
    return NextResponse.json({ error: 'Claude API error' }, { status: 502 })
  }
}
