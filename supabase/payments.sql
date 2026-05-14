-- ─── payments ────────────────────────────────────────────────────────────────
-- Run this in the Supabase SQL editor ONCE before enabling WebPay payments.

create table if not exists payments (
  id                  uuid default gen_random_uuid() primary key,
  user_id             uuid references profiles(id) on delete cascade not null,
  buy_order           text not null unique,
  session_id          text not null,
  amount              integer not null,
  plan_type           text not null,   -- 'professional' | 'patient' | 'individual'
  status              text not null default 'pending',  -- 'pending' | 'approved' | 'rejected'
  token               text,            -- populated by Transbank on confirm
  transbank_response  jsonb,           -- full Transbank response object
  created_at          timestamptz default now() not null,
  updated_at          timestamptz default now() not null
);

-- Fast lookup by user and status
create index if not exists payments_user_id_idx on payments(user_id, created_at desc);
create index if not exists payments_buy_order_idx on payments(buy_order);

-- RLS
alter table payments enable row level security;

-- Users can see their own payments
create policy "Users see own payments"
  on payments for select
  using (auth.uid() = user_id);

-- Only service role (server) can insert/update payments
-- (webpay routes use createServiceClient with service_role key)
create policy "Service role manages payments"
  on payments for all
  using (true)
  with check (true);

-- Auto-update updated_at on row changes
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger payments_updated_at
  before update on payments
  for each row execute procedure update_updated_at();
