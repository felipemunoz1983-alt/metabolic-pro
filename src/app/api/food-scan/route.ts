import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest): Promise<NextResponse> {
  let imageData: string
  let mediaType: 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif'

  try {
    const body = await req.json()
    if (!body.image) throw new Error('missing image')

    // Strip data URI prefix if present (e.g. "data:image/jpeg;base64,...")
    const raw: string = body.image
    const match = raw.match(/^data:(image\/(?:jpeg|png|webp|gif));base64,(.+)$/)
    if (match) {
      mediaType = match[1] as typeof mediaType
      imageData = match[2]
    } else {
      // Assume JPEG base64 if no prefix
      mediaType = 'image/jpeg'
      imageData = raw
    }
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 503 })
  }

  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: mediaType, data: imageData },
            },
            {
              type: 'text',
              text: `Eres un nutricionista clínico experto. Analiza los alimentos visibles en esta imagen y estima su aporte nutricional.

Responde ÚNICAMENTE con un objeto JSON válido, sin texto adicional, con esta estructura exacta:
{
  "alimentos": [
    {
      "nombre": "Nombre del alimento",
      "porcion": "Estimación de porción (ej: 1 taza, 200g, 1 unidad)",
      "kcal": 250,
      "proteina": 10,
      "carbohidratos": 30,
      "grasa": 8
    }
  ],
  "total": {
    "kcal": 250,
    "proteina": 10,
    "carbohidratos": 30,
    "grasa": 8
  },
  "confianza": "alta|media|baja",
  "notas": "Nota breve sobre la estimación (máx 1 oración)"
}

Reglas:
- Incluye TODOS los alimentos visibles, incluso guarniciones o bebidas
- Los macros son en gramos
- Si no puedes identificar un alimento, inclúyelo como "Alimento no identificado" con estimación conservadora
- Si la imagen no contiene alimentos, devuelve alimentos: [] y total con ceros`,
            },
          ],
        },
      ],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''

    // Extract JSON from response (handles markdown code blocks if present)
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No JSON in response')
    const result = JSON.parse(jsonMatch[0])

    return NextResponse.json(result)
  } catch (err) {
    console.error('[food-scan] error:', err)
    return NextResponse.json({ error: 'Error al analizar la imagen' }, { status: 500 })
  }
}
