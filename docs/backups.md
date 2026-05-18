# Backups Supabase — Centro Metabólico Pro

## Estado actual (plan Free)

Tu proyecto Supabase: `ikydfxgdugubenkzdbsd`
Plan: **Free** (confirmar en [supabase.com/dashboard/project/ikydfxgdugubenkzdbsd/settings/general](https://supabase.com/dashboard/project/ikydfxgdugubenkzdbsd/settings/general))

### Lo que viene incluido en Free

✅ **Backups diarios automáticos** — 7 días de retention
✅ **Encryption at rest** — AES-256 por default
✅ **Encryption in transit** — TLS 1.2+
❌ **Point-in-Time Recovery (PITR)** — solo plan Pro+ ($25/mes)
❌ **Custom backup schedule** — solo plan Pro+

### Lo que NO tienes hoy

- Si la BD se corrompe y han pasado más de 7 días → **pérdida total**
- No puedes restaurar a un momento específico (ej: "ayer a las 3pm")
- Backups son full snapshots, no incrementales

## Verificar que los backups están corriendo

**1 vez al mes** (recomendado):

1. Ir a [Supabase Dashboard → Database → Backups](https://supabase.com/dashboard/project/ikydfxgdugubenkzdbsd/database/backups)
2. Confirmar:
   - ✅ "Daily backups" está activado
   - ✅ Hay al menos 7 backups recientes en la lista
   - ✅ El más reciente es de hoy o ayer

## Hacer un backup manual (export crítico)

Antes de cambios grandes o cuando tengas pacientes reales, hacer **dump manual local**:

```bash
# Necesita PostgreSQL client (psql, pg_dump) instalado localmente.

# 1. Obtener connection string desde Supabase Dashboard:
#    Settings → Database → Connection string → URI (Direct connection)

# 2. Dump completo (schema + data):
pg_dump "postgresql://postgres:[PASSWORD]@db.ikydfxgdugubenkzdbsd.supabase.co:5432/postgres" \
  --no-owner --no-acl \
  -f backup-$(date +%Y-%m-%d).sql

# 3. Verificar tamaño y guardarlo en lugar seguro
ls -lh backup-*.sql

# 4. Opcional: comprimir
gzip backup-$(date +%Y-%m-%d).sql
```

## Restaurar desde backup automático

Si necesitas recuperar la BD desde un backup de Supabase:

1. Dashboard → Database → Backups
2. Elegir un backup
3. Click "Restore"
4. ⚠️ **Esto reemplaza TODA la BD actual** — confirmar muy bien antes

## Cuándo upgradear a Pro ($25/mes)

Considerar upgrade cuando:

- 🔴 **>10 usuarios reales activos** — pérdida de datos sería catastrófica
- 🔴 **Aceptás pagos reales** — auditoría financiera requiere PITR
- 🟡 **Datos médicos sensibles en producción** — compliance (Ley 19.628 Chile)
- 🟢 **Tráfico crece** — beneficios secundarios (compute más alto, etc.)

### Beneficios concretos de Pro

- ✅ **Point-in-Time Recovery 7 días** — recuperar a cualquier minuto exacto
- ✅ **30 días de retention** vs 7 en Free
- ✅ **Logs extendidos**
- ✅ **Daily backup downloads** vía API

## Checklist mensual

- [ ] Verificar backups corriendo (Dashboard → Database → Backups)
- [ ] Tamaño de DB no creciendo descontroladamente
- [ ] Si hay >5 usuarios: hacer dump manual y guardar local
- [ ] Revisar logs de Postgres por queries lentos o errores

## Lo crítico antes del lanzamiento beta

✅ Verificar que daily backups están activados (Dashboard)
✅ Hacer 1 dump manual completo (referencia "cero usuarios")
✅ Documentar el procedimiento de restore (este doc)
⏳ Si recibes primer pago real → upgrade a Pro (PITR)
