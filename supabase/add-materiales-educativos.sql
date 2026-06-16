-- ============================================================
-- Materiales educativos del profesional (feedback Maria Jose Serrano, Sprint 3-E)
-- Run in: Supabase Dashboard -> SQL Editor (proyecto Centro Metabolico Pro)
-- URL: https://supabase.com/dashboard/project/ikydfxgdugubenkzdbsd/sql/new
-- ============================================================
-- Cada profesional sube material educativo a la app. Por default es visible
-- a TODOS sus pacientes (biblioteca general). Opcionalmente puede marcarlo
-- para UN paciente especifico (paciente_id IS NOT NULL).
--
-- 4 tipos soportados:
--   'pdf'    -> archivo subido a bucket privado
--   'imagen' -> archivo subido a bucket privado (jpg/png/webp/heic)
--   'video'  -> archivo subido a bucket privado (mp4 corto, <=50MB recomendado)
--   'link'   -> URL externa (YouTube, blog, Drive) — NO usa storage
-- ============================================================

-- 1) Tabla principal
CREATE TABLE IF NOT EXISTS materiales_educativos (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profesional_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  paciente_id     UUID NULL REFERENCES profiles(id) ON DELETE CASCADE,
  titulo          TEXT NOT NULL,
  descripcion     TEXT NULL,
  tipo            TEXT NOT NULL CHECK (tipo IN ('pdf','imagen','video','link')),
  -- Para tipo 'link': URL externa. Para los otros: path dentro del bucket.
  url_o_path      TEXT NOT NULL,
  mime_type       TEXT NULL,
  size_bytes      BIGINT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ NULL
);

CREATE INDEX IF NOT EXISTS idx_materiales_profesional
  ON materiales_educativos (profesional_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_materiales_paciente
  ON materiales_educativos (paciente_id) WHERE deleted_at IS NULL AND paciente_id IS NOT NULL;

-- 2) RLS: el profesional ve/modifica solo SUS materiales.
--    El paciente ve materiales (a) generales de su pro o (b) asignados a el.
ALTER TABLE materiales_educativos ENABLE ROW LEVEL SECURITY;

-- Profesional: full access a sus propios materiales
DROP POLICY IF EXISTS materiales_profesional_all ON materiales_educativos;
CREATE POLICY materiales_profesional_all ON materiales_educativos
  FOR ALL
  USING (profesional_id = auth.uid())
  WITH CHECK (profesional_id = auth.uid());

-- Paciente: solo lee materiales de su pro asignado (generales o personales)
DROP POLICY IF EXISTS materiales_paciente_read ON materiales_educativos;
CREATE POLICY materiales_paciente_read ON materiales_educativos
  FOR SELECT
  USING (
    deleted_at IS NULL
    AND (
      paciente_id = auth.uid()
      OR (
        paciente_id IS NULL
        AND profesional_id = (
          SELECT professional_id FROM profiles WHERE id = auth.uid()
        )
      )
    )
  );

-- 3) Storage bucket privado para los archivos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'materiales-educativos',
  'materiales-educativos',
  false,                                       -- privado, requiere signed URL
  52428800,                                    -- 50 MB max por archivo
  ARRAY['application/pdf',
        'image/jpeg','image/png','image/webp','image/heic',
        'video/mp4','video/quicktime','video/webm']
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit    = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 4) Policies del bucket
-- Profesional: INSERT/SELECT/DELETE en su propio prefix "<prof_uuid>/..."
DROP POLICY IF EXISTS bucket_materiales_prof_insert ON storage.objects;
CREATE POLICY bucket_materiales_prof_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'materiales-educativos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS bucket_materiales_prof_select ON storage.objects;
CREATE POLICY bucket_materiales_prof_select ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'materiales-educativos'
    AND (
      -- Profesional ve sus propios archivos
      (storage.foldername(name))[1] = auth.uid()::text
      OR
      -- Paciente ve archivos de su profesional asignado
      (storage.foldername(name))[1] = (
        SELECT professional_id::text FROM profiles WHERE id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS bucket_materiales_prof_delete ON storage.objects;
CREATE POLICY bucket_materiales_prof_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'materiales-educativos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ============================================================
-- Despues de correr esto:
--   - Tabla materiales_educativos lista
--   - Bucket 'materiales-educativos' privado con limite 50MB
--   - RLS configurada: pro full access, paciente solo SELECT
-- Inspeccion:
--   SELECT * FROM materiales_educativos ORDER BY created_at DESC LIMIT 10;
--   SELECT * FROM storage.objects WHERE bucket_id = 'materiales-educativos';
-- ============================================================
