# Vercel Deploy Gates — Configuración

Para que Vercel **NO despliegue cuando el CI está rojo**, hay 2 capas:

## Capa 1: GitHub Branch Protection (ya configurada ✅)

Activa via `gh` API. Ver `.github/workflows/ci.yml` para los gates del CI.

```bash
gh api repos/felipemunoz1983-alt/metabolic-pro/branches/main/protection
```

**Resultado:**
- ✅ `main` está protegida
- ✅ Required status check: `Tests + Typecheck + Lint`
- ✅ Force pushes bloqueados
- ✅ Deletions bloqueados
- ⚠️  Admin enforce: **no** (Felipe puede saltar en emergencias justificadas)

**Qué bloquea hoy:**
- Pull Requests hacia `main` no se pueden mergear si el CI falla
- Push directo a `main` aún funciona (porque Felipe es admin y enforce_admins=false)

## Capa 2: Vercel "Wait for CI" (config manual en UI — pendiente)

GitHub Branch Protection no detiene a Vercel de hacer deploys automáticos.
Para cerrar ese gap hay que configurar Vercel en su UI.

### Pasos exactos

1. **Entra a [vercel.com/dashboard](https://vercel.com/dashboard)**
2. Selecciona el proyecto **centro-metabolico-pro**
3. Ve a **Settings** → **Git**
4. Busca la sección **Deploy Hooks** o **Build & Development Settings**
5. Activa:
   - ✅ **"Wait for GitHub Checks to succeed before deploying"** (si existe)
   - O activa **"Ignored Build Step"** con el script siguiente

### Script alternativo: Ignored Build Step

Si Vercel no tiene la opción "Wait for checks", agrega esto en
**Settings → Git → Ignored Build Step**:

```bash
#!/bin/bash
# Solo construir si los GitHub Actions del commit pasaron.
# Vercel inyecta VERCEL_GIT_COMMIT_SHA automáticamente.

if [ -z "$VERCEL_GIT_COMMIT_SHA" ]; then
  echo "✅ No SHA — building (probably manual trigger)"
  exit 1
fi

# Consultar GitHub API el estado de los checks del commit
STATUS=$(curl -s -H "Authorization: Bearer $GITHUB_TOKEN" \
  "https://api.github.com/repos/felipemunoz1983-alt/metabolic-pro/commits/$VERCEL_GIT_COMMIT_SHA/check-runs" \
  | grep -o '"conclusion":"[^"]*"' | grep -c '"success"')

CI_NAME="Tests + Typecheck + Lint"
if curl -s -H "Authorization: Bearer $GITHUB_TOKEN" \
     "https://api.github.com/repos/felipemunoz1983-alt/metabolic-pro/commits/$VERCEL_GIT_COMMIT_SHA/check-runs" \
     | grep -A 5 "$CI_NAME" | grep -q '"conclusion":"success"'; then
  echo "✅ CI passed — building"
  exit 1
else
  echo "❌ CI not green for SHA $VERCEL_GIT_COMMIT_SHA — skipping deploy"
  exit 0
fi
```

Requiere agregar variable de entorno `GITHUB_TOKEN` en Vercel
con scope `repo` (read-only).

### Forma más simple sin token

Si no quieres lidiar con GitHub API en el script, la alternativa
es **NO usar push directo a main** y forzar siempre PRs.
La branch protection ya bloquea el merge si CI rojo,
y Vercel deploya solo lo que está en main.

## Workflow recomendado (Felipe)

Antes de cualquier deploy a producción:

```bash
# 1. Trabajar en nextjs (o feature branch)
git checkout nextjs

# 2. Hacer cambios + commit (pre-commit hook valida lint)
git add . && git commit -m "..."

# 3. Push a nextjs (pre-push hook valida tsc + 242 tests)
git push origin nextjs

# 4. Esperar CI verde en GitHub (~45s)
gh run watch

# 5. Opción A — merge directo (si admin override):
git checkout main && git merge nextjs && git push origin main

# 5. Opción B — vía PR (más seguro):
gh pr create --base main --head nextjs --fill
# CI se ejecuta; mergear cuando esté verde
gh pr merge --auto --merge
```

## Lo que aún queda fuera

- [ ] Vercel "Wait for checks" en UI (1 click pero requiere abrir vercel.com)
- [ ] Required signatures (firma GPG en commits)
- [ ] Require linear history (no merges, solo rebase)
