-- ─── Informes antropométricos ────────────────────────────────────────────────
-- Tabla + bucket Storage + RLS para que el profesional suba PDFs de evaluación
-- antropométrica (InBody, ISAK, DEXA, antropometría manual, etc.) y el
-- paciente vinculado los pueda visualizar/descargar en su app.
--
-- Run en Supabase SQL editor UNA VEZ antes de habilitar el feature.
-- Idempotente: usa IF NOT EXISTS y ON CONFLICT.

-- ─── Tabla ───────────────────────────────────────────────────────────────────
create table if not exists informes_antropometricos (
  id                uuid default gen_random_uuid() primary key,
  paciente_id       uuid references profiles(id) on delete cascade not null,
  profesional_id    uuid references profiles(id) on delete cascade not null,

  -- Storage
  storage_path      text not null,          -- ej: 'paciente-uuid/2026-05-29-inbody.pdf'
  filename_original text,                   -- nombre original del archivo subido
  file_size_bytes   integer,                -- tamaño en bytes
  mime_type         text default 'application/pdf',

  -- Metadata clínica
  titulo            text not null,          -- "Evaluación inicial mayo 2026"
  fecha_eval        date not null,          -- fecha del análisis
  tipo              text not null default 'antropometria',
                                            -- 'inbody' | 'isak' | 'dexa' |
                                            -- 'antropometria' | 'bioimpedancia' | 'otro'
  metricas          jsonb,                  -- opcional: {peso, %grasa, masa_muscular, ...}
  notas             text,                   -- nota del profesional al paciente

  -- Tracking
  visto_por_paciente_en timestamptz,        -- null = no abierto aún
  created_at            timestamptz default now() not null,
  updated_at            timestamptz default now() not null
);

-- ─── Índices ─────────────────────────────────────────────────────────────────
create index if not exists informes_paciente_idx
  on informes_antropometricos(paciente_id, fecha_eval desc);
create index if not exists informes_profesional_idx
  on informes_antropometricos(profesional_id, created_at desc);
create index if not exists informes_visto_idx
  on informes_antropometricos(paciente_id) where visto_por_paciente_en is null;

-- ─── RLS ─────────────────────────────────────────────────────────────────────
alter table informes_antropometricos enable row level security;

-- Paciente ve sus propios informes
create policy "paciente_ve_propios_informes"
  on informes_antropometricos for select
  using (auth.uid() = paciente_id);

-- Profesional ve los informes que él creó (de sus pacientes)
create policy "profesional_ve_informes_creados"
  on informes_antropometricos for select
  using (auth.uid() = profesional_id);

-- Profesional inserta nuevos informes (solo de sus pacientes vinculados)
create policy "profesional_sube_informes"
  on informes_antropometricos for insert
  with check (
    auth.uid() = profesional_id
    and exists (
      select 1 from profiles p
      where p.id = paciente_id
        and p.professional_id = auth.uid()
    )
  );

-- Profesional actualiza/borra solo sus propios informes
create policy "profesional_modifica_informes"
  on informes_antropometricos for update
  using (auth.uid() = profesional_id);

create policy "profesional_borra_informes"
  on informes_antropometricos for delete
  using (auth.uid() = profesional_id);

-- Paciente puede marcar como visto (UPDATE solo del campo visto_por_paciente_en)
create policy "paciente_marca_visto"
  on informes_antropometricos for update
  using (auth.uid() = paciente_id)
  with check (auth.uid() = paciente_id);

-- Trigger updated_at
create or replace function update_informes_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists informes_updated_at on informes_antropometricos;
create trigger informes_updated_at
  before update on informes_antropometricos
  for each row execute procedure update_informes_updated_at();

-- ─── Storage bucket ──────────────────────────────────────────────────────────
-- Crear bucket PRIVADO via SQL (equivale a hacerlo desde Storage UI)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'informes-antropometricos',
  'informes-antropometricos',
  false,                                    -- privado: solo accesible via signed URL
  10485760,                                 -- 10 MB max por archivo
  array['application/pdf']
)
on conflict (id) do update set
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- ─── Storage RLS ─────────────────────────────────────────────────────────────
-- Las policies aplican a storage.objects donde bucket_id = 'informes-antropometricos'

-- Path convention: {paciente_id}/{filename}
-- Esto permite que las policies validen que el primer segmento del path sea el ID
-- del paciente, y que el caller sea el paciente mismo o su profesional vinculado.

-- Paciente lee sus propios PDFs (primer segmento del path = su UUID)
create policy "paciente_lee_su_pdf"
  on storage.objects for select
  using (
    bucket_id = 'informes-antropometricos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Profesional lee PDFs de sus pacientes vinculados
create policy "profesional_lee_pdf_paciente"
  on storage.objects for select
  using (
    bucket_id = 'informes-antropometricos'
    and exists (
      select 1 from profiles p
      where p.id::text = (storage.foldername(name))[1]
        and p.professional_id = auth.uid()
    )
  );

-- Profesional sube PDFs solo para sus pacientes vinculados
create policy "profesional_sube_pdf"
  on storage.objects for insert
  with check (
    bucket_id = 'informes-antropometricos'
    and exists (
      select 1 from profiles p
      where p.id::text = (storage.foldername(name))[1]
        and p.professional_id = auth.uid()
    )
  );

-- Profesional borra PDFs de sus pacientes
create policy "profesional_borra_pdf"
  on storage.objects for delete
  using (
    bucket_id = 'informes-antropometricos'
    and exists (
      select 1 from profiles p
      where p.id::text = (storage.foldername(name))[1]
        and p.professional_id = auth.uid()
    )
  );
