-- Presence heartbeat per authenticated owner + device, used to warn when the same account is open on several devices.
-- Already applied to the linked Supabase project; kept here so fresh installs match the deployed Edge Function.
create table if not exists public.anbaryar_device_presence (
  owner_id uuid not null,
  device_id text not null,
  label text,
  app_build text,
  last_seen timestamptz not null default now(),
  primary key (owner_id, device_id)
);
create index if not exists anbaryar_device_presence_owner_seen
  on public.anbaryar_device_presence(owner_id, last_seen desc);
alter table public.anbaryar_device_presence enable row level security;
-- No client policies: only the Edge Function (service role) reads or writes this table.
revoke all on table public.anbaryar_device_presence from anon, authenticated;
