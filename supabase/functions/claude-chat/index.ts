/**
 * claude-chat — Proxy seguro hacia la API de Anthropic (Claude Haiku)
 *
 * Variables de entorno requeridas (configurar en Supabase Dashboard → Edge Functions → Secrets):
 *   ANTHROPIC_API_KEY   Tu clave de API de Anthropic
 *
 * Recibe: POST { messages: [{role,content}], system?: string }
 * Devuelve: { reply: string }
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY') ?? '';
const MODEL             = 'claude-haiku-4-5';
const MAX_TOKENS        = 1024;

const CORS = {
  'Access-Control-Allow-Origin' : '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey',
};

serve(async (req) => {
  // Preflight CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Método no permitido' }), {
      status: 405,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }

  if (!ANTHROPIC_API_KEY) {
    return new Response(JSON.stringify({ error: 'ANTHROPIC_API_KEY no configurada en el servidor.' }), {
      status: 500,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }

  let body: { messages?: { role: string; content: string }[]; system?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'JSON inválido' }), {
      status: 400,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }

  const messages = body.messages ?? [];
  const system   = body.system   ?? '';

  if (messages.length === 0) {
    return new Response(JSON.stringify({ error: 'Se requiere al menos un mensaje.' }), {
      status: 400,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }

  // Llamada a Anthropic Messages API
  const anthropicResp = await fetch('https://api.anthropic.com/v1/messages', {
    method : 'POST',
    headers: {
      'Content-Type'      : 'application/json',
      'x-api-key'         : ANTHROPIC_API_KEY,
      'anthropic-version' : '2023-06-01',
    },
    body: JSON.stringify({
      model     : MODEL,
      max_tokens: MAX_TOKENS,
      system    : system || undefined,
      messages,
    }),
  });

  if (!anthropicResp.ok) {
    const err = await anthropicResp.json().catch(() => ({}));
    const msg = (err as { error?: { message?: string } }).error?.message ?? `HTTP ${anthropicResp.status}`;
    return new Response(JSON.stringify({ error: msg }), {
      status: anthropicResp.status,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }

  const result = await anthropicResp.json() as {
    content?: { type: string; text: string }[];
  };
  const reply = result.content?.find((c) => c.type === 'text')?.text ?? 'Sin respuesta.';

  return new Response(JSON.stringify({ reply }), {
    status : 200,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
});
