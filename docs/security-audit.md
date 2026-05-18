# Security Audit — Centro Metabólico Pro

Auditoría de seguridad del backend (Supabase + endpoints API).
**Última revisión: 2026-05-18**

## 1. Rate Limiting + Auth en endpoints API

| Endpoint | Auth | Rate Limit (5m) | Rate Limit (24h) | Estado |
|---|---|---|---|---|
| `/api/chat` | ✅ Required | 20 msg | 200 msg | ✅ Protegido |
| `/api/food-scan` | ✅ Required | 10 scan | 50 scan | ✅ Protegido |
| `/api/admin/stats` | ✅ Admin only | N/A | N/A | ✅ Protegido |
| `/api/email/*` | ⚠️ Server-only | N/A | N/A | ✅ No expuesto a clientes |
| `/api/cron/*` | ✅ CRON_SECRET | N/A | N/A | ✅ Protegido |
| `/api/push/*` | ✅ Auth required | N/A | N/A | Ver código |
| `/api/patients/*` | ✅ Auth required | N/A | N/A | Ver código |
| `/api/webpay/*` | ✅ Transbank sig | N/A | N/A | ✅ Firma criptográfica |

**Implementación:**
- `src/lib/auth-server.ts` — helper `getAuthUser()`
- `src/lib/rate-limit.ts` — bucket in-memory con LRU
- Tests: `src/lib/rate-limit.test.ts` (11 tests)

## 2. RLS de Supabase

### Tablas con RLS habilitado

| Tabla | RLS | Owner-only | Professional read | Comentarios |
|---|---|---|---|---|
| `profiles` | ✅ | self | linked patients | + búsqueda libre por auth users |
| `planes_nutricionales` | ✅ | user_id | EXISTS profile link | INSERT bug previo: ✅ fixed |
| `registros_diarios` | ✅ | user_id | EXISTS profile link | |
| `payments` | ✅ | user_id | N/A | `using(true)` leak: ✅ fixed |
| `push_subscriptions` | ✅ | user_id | N/A | |
| `api_rate_limits` | ✅ | service role only | N/A | Bloqueado para non-service |

### Cómo verificar en producción

Correr en **Supabase Dashboard → SQL Editor**:

```sql
-- Copiar todo el contenido de supabase/rls-audit.sql
```

Output esperado:
1. **Todas las tablas críticas con `rls_enabled = true`**
2. **Todas las policies con `auth.uid() = user_id` o equivalente**
3. **Cero rows en query 3** (no hay `using(true)` peligrosos)
4. **Cero rows en query 4** (todas las tablas con RLS tienen al menos una policy)

### Prueba manual de leak (recomendada antes del lanzamiento beta)

```bash
# 1. Crear 2 usuarios de prueba en Supabase
# 2. Generar plan con usuario A
# 3. Intentar acceder con usuario B:
curl -H "Authorization: Bearer <USER_B_TOKEN>" \
  "https://<project>.supabase.co/rest/v1/planes_nutricionales?user_id=eq.<USER_A_ID>"
# Debe retornar [] (vacío) — NUNCA los datos de A
```

## 3. Secrets Management

| Secret | Ubicación | Rotation policy |
|---|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | Vercel (encrypted, secret) | Rotar si compromiso |
| `ANTHROPIC_API_KEY` | Vercel (encrypted) | Rotar trimestral o si compromiso |
| `GITHUB_TOKEN` | Vercel (encrypted) | Solo scope `repo` read |
| `RESEND_API_KEY` | Vercel (encrypted) | Rotar si compromiso |
| `CRON_SECRET` | Vercel (encrypted) | Rotar anual |
| `VAPID_PRIVATE_KEY` | Vercel (encrypted) | No rotar (rompe subs existentes) |
| `TRANSBANK_*` | Vercel (encrypted) | Según Transbank policy |

**Buenas prácticas activas:**
- ✅ Service role key marcada como "Sensitive" en Vercel (no se descarga a local)
- ✅ Anon key cleaning (strip BOM) en `src/lib/supabase.ts`
- ✅ `.env*` ignorado en `.gitignore`

## 4. Defensa en profundidad

### Capa 1: Network / DDoS
- ✅ Vercel CDN absorbe ataques superficiales
- ⏳ **Pendiente**: rate limit por IP a nivel global (Vercel WAF, plan Pro)

### Capa 2: Auth
- ✅ Supabase Auth con email verification
- ✅ Cookies HttpOnly + Secure (managed por Supabase SSR)
- ✅ Sesiones con refresh automático
- ⏳ **Pendiente**: MFA opcional para profesionales

### Capa 3: Authorization
- ✅ RLS en todas las tablas con datos sensibles
- ✅ Service role usado solo en server-side trusted contexts
- ✅ Admin endpoints validan email match

### Capa 4: API limits
- ✅ Rate limiting per-user en endpoints Anthropic
- ✅ Daily caps duros
- ✅ Anthropic API tiene su propio rate limit a nivel cuenta (fallback)

### Capa 5: Data
- ⏳ **Pendiente**: encryption at rest (Supabase lo hace por default)
- ⏳ **Pendiente**: backups automáticos verificados (ver `docs/backups.md`)

## 5. Brechas conocidas (pendientes)

| # | Brecha | Riesgo | Esfuerzo |
|---|---|---|---|
| 1 | Rate limit no persiste cross-lambda | Bypass parcial con muchos workers | 2h (Upstash Redis) |
| 2 | Sin MFA para profesionales | Account takeover | 4h |
| 3 | Sin audit log de cambios sensibles | Incident response difícil | 3h |
| 4 | Sin alerta de uso anómalo de API | Costo Anthropic descontrolado | 2h |
| 5 | Backups Supabase no verificados | Pérdida total si BD falla | 30 min (verificar UI) |

## 6. Procedimiento de respuesta a incidente

Si se detecta un compromiso (ejemplo: leak de datos, abuso de API):

1. **Contener** — rotar inmediatamente:
   - `SUPABASE_SERVICE_ROLE_KEY` (Supabase Dashboard → Settings → API)
   - `ANTHROPIC_API_KEY` (console.anthropic.com → API Keys)
   - Forzar logout de todos: revocar todas las sesiones en Supabase Auth UI

2. **Investigar** — queries de auditoría en `supabase/rls-audit.sql`

3. **Notificar** — si hay leak de datos médicos:
   - Pacientes afectados (email)
   - Profesionales vinculados
   - Compliance (Chile: Ley 19.628 protección datos personales)

4. **Remediar** — patch + tests + redeploy

## 7. Auditoría futura

Próxima revisión recomendada: **al primer mes de tener 10+ usuarios reales**, o **inmediatamente si**:
- Se agrega nueva tabla con datos personales
- Se agrega nuevo endpoint API que llama a APIs externas pagadas
- Se cambia provider de auth (Supabase, Auth0, etc.)
- Se detecta uso anómalo (factura inesperada de Anthropic/Resend/Supabase)
