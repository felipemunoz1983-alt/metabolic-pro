#!/bin/bash
# ─── Vercel Ignored Build Step ────────────────────────────────────────────────
# Vercel ejecuta este script desde la raíz del repo antes de cada build.
#   exit 1 → BUILD (Vercel procede con el deploy)
#   exit 0 → SKIP (Vercel cancela el deploy)
#
# Lógica:
#   1. Consulta GitHub API el estado del check "Tests + Typecheck + Lint"
#      para el commit SHA que Vercel está intentando deployar.
#   2. Si el check pasó → build
#   3. Si el check falló o se canceló → skip (no deploy de código roto)
#   4. Si el check sigue corriendo → espera (poll cada 15s, máx 3 min)
#   5. Si se acaba el tiempo de espera → skip (default seguro)
#
# Requisitos:
#   - Variable de entorno GITHUB_TOKEN configurada en Vercel
#     (Settings → Environment Variables, scope: repo read-only)

set -u

REPO="felipemunoz1983-alt/metabolic-pro"
CHECK_NAME="Tests + Typecheck + Lint"
MAX_WAIT=180   # 3 minutos máximo de poll
INTERVAL=15    # segundos entre polls

# ─── Safety fallbacks ─────────────────────────────────────────────────────────

if [ -z "${GITHUB_TOKEN:-}" ]; then
  echo "⚠️  GITHUB_TOKEN no está configurado en Vercel — building (fail-open)"
  exit 1
fi

if [ -z "${VERCEL_GIT_COMMIT_SHA:-}" ]; then
  echo "ℹ️  No commit SHA detectado (probably manual trigger) — building"
  exit 1
fi

# ─── Poll GitHub API hasta que el check tenga conclusion definitiva ──────────

SHA="$VERCEL_GIT_COMMIT_SHA"
WAITED=0

echo "🔍 Checking CI status for commit $SHA..."
echo "   Looking for check: \"$CHECK_NAME\""
echo ""

while [ $WAITED -lt $MAX_WAIT ]; do
  RESPONSE=$(curl -s -H "Authorization: Bearer $GITHUB_TOKEN" \
    -H "Accept: application/vnd.github+json" \
    "https://api.github.com/repos/$REPO/commits/$SHA/check-runs?per_page=50")

  # Parser robusto: busca el bloque del check por nombre y extrae conclusion + status.
  # No usamos jq porque no está garantizado en el runtime de Vercel.
  CONCLUSION=$(printf '%s' "$RESPONSE" \
    | python3 -c "
import sys, json
data = json.loads(sys.stdin.read() or '{}')
for run in data.get('check_runs', []):
    if run.get('name') == '$CHECK_NAME':
        print(run.get('conclusion') or 'null')
        sys.exit(0)
print('not_found')
" 2>/dev/null || echo "parse_error")

  case "$CONCLUSION" in
    success)
      echo "✅ CI passed for $SHA — proceeding with deploy"
      exit 1
      ;;
    failure|cancelled|timed_out|action_required|stale)
      echo "❌ CI failed for $SHA (conclusion: $CONCLUSION) — skipping deploy"
      echo "   Fix the CI and re-push to deploy."
      exit 0
      ;;
    null)
      # Check todavía corriendo
      echo "⏳ CI still running... (waited ${WAITED}s of ${MAX_WAIT}s)"
      ;;
    not_found)
      echo "⚠️  Check \"$CHECK_NAME\" no encontrado todavía... (waited ${WAITED}s)"
      ;;
    parse_error)
      echo "⚠️  Error parseando respuesta de GitHub — reintento..."
      ;;
    *)
      echo "⚠️  Conclusion inesperada: $CONCLUSION — reintento..."
      ;;
  esac

  sleep $INTERVAL
  WAITED=$((WAITED + INTERVAL))
done

echo ""
echo "⏰ CI no terminó dentro de ${MAX_WAIT}s — skipping deploy (default seguro)"
echo "   Si quieres forzar el deploy, re-pushea o usa Vercel UI \"Redeploy\""
exit 0
