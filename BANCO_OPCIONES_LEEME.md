# Fase 1 — Banco de opciones (Next.js + Supabase)

Endpoint que llena el banco de preparaciones de un plan: por cada comida genera
opciones con la skill `preparaciones-culinarias` (Modo A + B), valida que cada
una cuadre con el target (±10 %) y las guarda dentro de `plan_data.comidas[].opciones[]`.

**Adaptado a tu esquema real** de Centro Metabólico Pro (verificado por inspección).

## Tu esquema (lo relevante)

```
planes(id, user_id, patient_id, professional_id, objetivo, kcal, macros jsonb, plan_data jsonb, ...)
  plan_data = { comidas: [ { nombre, kcal, p, items: string[] } ], plan: [...] }
perfiles_digestivos(user_id, hinchazon, diag, intolerancias[], ...)
profiles(id, nombre, email, role, ...)   <- identidad/suscripcion, NO nutricion
```

El banco **agrega** `opciones[]` dentro de cada comida (junto a `items`, sin
reemplazarlo). `lib/repositorioPlanes.ts` traduce entre este shape y el modelo de
dominio, asi que el resto de los archivos no dependen de la forma de la DB.

## Donde va cada archivo

```
types/banco.ts                                  -> tipos de dominio
lib/aporte.ts                                   -> validador determinista (probado)
lib/generadorRecetas.ts                         -> llamada a la IA (Modo A + B)
lib/repositorioPlanes.ts                        -> Supabase, ya apuntado a planes.plan_data
app/api/planes/[planId]/banco-opciones/route.ts -> el endpoint
supabase/migrations/001_perfiles_nutricionales.sql -> OPCIONAL (cerrar hueco de datos)
```

Asume el alias `@/*` (default de Next.js). Si no lo usas, cambia a rutas relativas.

## Instalar

```bash
npm i @anthropic-ai/sdk @supabase/supabase-js
```

## Variables de entorno (server-only)

```
ANTHROPIC_API_KEY=sk-ant-...
SUPABASE_URL=https://ikydfxgdugubenkzdbsd.supabase.co
SUPABASE_SERVICE_ROLE_KEY=...        # NUNCA exponer al cliente
ANTHROPIC_MODEL_RECETAS=claude-sonnet-4-6   # opcional; Haiku para abaratar lotes
```

## Dos cosas que debes saber antes de usarlo

### 1. Hueco de datos: alergias y preferencias (decision "a" vs "b")

Tu esquema almacena el contexto **digestivo** (`perfiles_digestivos`) y **medico**
(`perfiles_suplementacion`), pero NO alergias, alimentos rechazados/preferidos,
presupuesto, tiempo de cocina ni habilidad culinaria.

- **Opcion a (actual):** el banco ya funciona con el contexto digestivo. En
  `obtenerContextoPaciente` esos campos faltantes salen vacios/default, asi que el
  generador no filtra por alergias todavia. **Revisa las recetas antes de mostrarlas.**
- **Opcion b (recomendada a mediano plazo):** corre `001_perfiles_nutricionales.sql`,
  captura esos campos en el onboarding, y mapealos en `obtenerContextoPaciente`
  (hay un comentario que marca exactamente donde). El generador los respetara solo.

### 2. Targets de CHO/grasa por comida son DERIVADOS

Tus comidas guardan `kcal` + `p` (proteina), pero no CHO/grasa por comida. El repo
los deriva del kcal restante (split 60/40 configurable en `repositorioPlanes.ts`).
Si algun dia guardas CHO/grasa por comida, usalos directo en `targetDeComida`.

## Usar

```bash
curl -X POST https://centro-metabolico-pro.vercel.app/api/planes/<PLAN_UUID>/banco-opciones \
  -H "Content-Type: application/json" \
  -d '{ "opciones_base_por_tiempo": 3, "variantes_por_base": 1, "temporada_actual": "invierno" }'
```

## Antes de produccion (datos clinicos)

1. **Protege la ruta.** Usa service role (bypassa RLS). Hay un `TODO(seguridad)` en
   `route.ts`: valida ahi que el llamador es un profesional autenticado.
2. **Prueba en staging** con un plan de prueba (tienes 4 filas en `planes`).
3. **Revisa las primeras tandas** antes de mostrarlas al paciente (mas critico
   mientras el filtro de alergias no este activo - ver punto 1 del hueco de datos).

## Plataforma (Vercel)

`route.ts` declara `maxDuration = 300`. Activa Fluid Compute si te acercas al limite.
El tiempo esperando IA/DB no se factura como CPU activa.

## Sobre las dos tablas de plan

Tienes `planes` (4 filas, con `comidas`) y `planes_nutricionales` (12 filas). El
repo apunta a `planes`. Si la vista `/paciente` lee `planes_nutricionales`
(`plan_json`), cambia las constantes `TABLA_PLANES` / `COL_PLAN_DATA` arriba del
repo. A mediano plazo conviene consolidar en una sola fuente de verdad.

## Verificacion incluida

`lib/aporte.ts` se verifico contra la version Python original: mismos resultados en
los 4 escenarios (cuadra, reescala proteina, rechaza grasa baja salvo post-entreno,
rechaza kcal incoherente).
