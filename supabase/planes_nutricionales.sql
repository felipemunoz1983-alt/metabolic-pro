-- Run this in the Supabase SQL editor
create table if not exists planes_nutricionales (
  id             uuid default gen_random_uuid() primary key,
  user_id        uuid references profiles(id) on delete cascade not null,
  professional_id uuid references profiles(id) on delete set null,
  objetivo       text not null,
  kcal           integer not null,
  proteina       integer not null,
  carbohidrato   integer not null,
  grasa          integer not null,
  plan_json      jsonb not null,   -- { form: FormData, result: NutritionResult }
  created_at     timestamptz default now() not null
);

-- Index for fast user lookups
create index if not exists planes_user_id_idx on planes_nutricionales(user_id, created_at desc);

-- RLS
alter table planes_nutricionales enable row level security;

create policy "Users see own plans"
  on planes_nutricionales for select
  using (auth.uid() = user_id);

create policy "Users insert own plans"
  on planes_nutricionales for insert
  with check (auth.uid() = user_id);

create policy "Professional sees patient plans"
  on planes_nutricionales for select
  using (
    exists (
      select 1 from profiles
      where id = auth.uid()
        and role = 'professional'
        and id = planes_nutricionales.professional_id
    )
  );
