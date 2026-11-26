-- Single mutable cloud-sync snapshot per authenticated owner.
-- This schema was already applied to the linked Supabase project; this migration keeps
-- fresh installations and database resets in sync with the deployed Edge Function.
alter table public.anbaryar_backup_files
  add column if not exists is_sync_state boolean not null default false,
  add column if not exists sync_revision bigint not null default 0,
  add column if not exists device_id text;

create unique index if not exists anbaryar_backup_files_one_sync_state_per_owner
  on public.anbaryar_backup_files(owner_id)
  where is_sync_state = true;

comment on column public.anbaryar_backup_files.is_sync_state is
  'True for the current mutable synchronization snapshot; false for retained historical backups.';
comment on column public.anbaryar_backup_files.sync_revision is
  'Optimistic concurrency revision for cloud synchronization.';

-- Browser clients must not query backup metadata directly.
-- All reads/writes go through the authenticated Edge Function using the service role.
drop policy if exists "AnbarYar users can read own backup metadata"
  on public.anbaryar_backup_files;
revoke all on table public.anbaryar_backup_files from anon, authenticated;
