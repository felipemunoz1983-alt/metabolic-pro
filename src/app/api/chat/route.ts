/**
 * POST /api/chat
 * Nutritional AI chat powered by Claude.
 * Replaces the missing Supabase Edge Function.
 */
import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

interface Message {
  role: 'user' | 'assistant'
  content: string
}

export async function POST(req: NextRequest): Promise<NextResponse> {
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

    return NextResponse.json({ reply })
  } catch (err) {
    console.error('[/api/chat] Claude error:', err)
    return NextResponse.json({ error: 'Claude API error' }, { status: 502 })
  }
}
