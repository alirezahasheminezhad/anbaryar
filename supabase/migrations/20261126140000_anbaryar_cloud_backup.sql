-- AnbarYar cloud backup schema. Infrastructure was provisioned in the linked Supabase project.
create table if not exists public.anbaryar_backup_files (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  object_path text not null unique,
  size_bytes bigint not null check (size_bytes > 0),
  app_build text,
  schema_version integer,
  created_at timestamptz not null default now()
);
create index if not exists anbaryar_backup_files_owner_created_idx
  on public.anbaryar_backup_files (owner_id, created_at desc);
alter table public.anbaryar_backup_files enable row level security;
revoke all on table public.anbaryar_backup_files from anon, authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('anbaryar-backups', 'anbaryar-backups', false, 47185920, array['application/gzip'])
on conflict (id) do update set public=false, file_size_limit=47185920, allowed_mime_types=array['application/gzip'];

create table if not exists public.anbaryar_heartbeat (
  id integer primary key check (id=1),
  last_ping_at timestamptz not null default now()
);
insert into public.anbaryar_heartbeat(id) values(1) on conflict(id) do nothing;
alter table public.anbaryar_heartbeat enable row level security;
drop policy if exists "AnbarYar heartbeat read" on public.anbaryar_heartbeat;
drop policy if exists "AnbarYar heartbeat update" on public.anbaryar_heartbeat;
create policy "AnbarYar heartbeat read" on public.anbaryar_heartbeat for select to anon, authenticated using (id=1);
create policy "AnbarYar heartbeat update" on public.anbaryar_heartbeat for update to anon, authenticated using (id=1) with check (id=1);
grant select, update on public.anbaryar_heartbeat to anon, authenticated;
create or replace function public.anbaryar_keepalive()
returns timestamptz language sql volatile set search_path=public,pg_temp as $$
  update public.anbaryar_heartbeat set last_ping_at=now() where id=1 returning last_ping_at;
$$;
revoke all on function public.anbaryar_keepalive() from public;
grant execute on function public.anbaryar_keepalive() to anon, authenticated;
