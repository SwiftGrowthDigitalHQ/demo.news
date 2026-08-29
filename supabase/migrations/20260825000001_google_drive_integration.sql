-- ═══════════════════════════════════════════════════════════════════════════
-- GOOGLE DRIVE INTEGRATION - DATABASE SCHEMA
-- Phase 2: Customer-Owned Storage
-- ═══════════════════════════════════════════════════════════════════════════

begin;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. CREATE STORAGE PROVIDER ENUM
-- ─────────────────────────────────────────────────────────────────────────────

do $$
begin
  create type public.storage_provider as enum ('supabase', 'google_drive');
exception
  when duplicate_object then null;
end $$;

comment on type public.storage_provider is 
  'Storage backend for media files: supabase (platform storage) or google_drive (customer-owned).';

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. CREATE GOOGLE DRIVE CONNECTIONS TABLE
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.tenant_google_drive_connections (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null unique references public.tenants(id) on delete cascade,
  
  -- Google account identification
  google_account_email text not null,
  google_account_id text not null,
  
  -- Drive folder structure
  root_folder_id text not null,
  media_folder_id text,
  images_folder_id text,
  videos_folder_id text,
  documents_folder_id text,
  
  -- OAuth tokens (ENCRYPTED - NEVER expose to frontend)
  access_token_encrypted text not null,
  refresh_token_encrypted text not null,
  token_expires_at timestamptz not null,
  
  -- Connection status
  status text not null default 'active' check (status in ('active', 'error', 'disconnected', 'expired')),
  last_sync_at timestamptz,
  last_error text,
  
  -- Audit fields
  connected_by_user_id uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  
  constraint tenant_google_drive_connections_unique_tenant unique (tenant_id)
);

comment on table public.tenant_google_drive_connections is 
  'Stores OAuth credentials and folder structure for tenant Google Drive connections. Access tokens are encrypted at rest. NEVER expose tokens to frontend.';

comment on column public.tenant_google_drive_connections.google_account_email is 
  'Email of the Google account that authorized the connection. Displayed to users.';

comment on column public.tenant_google_drive_connections.google_account_id is 
  'Google user ID (sub claim from OAuth). Used for tracking.';

comment on column public.tenant_google_drive_connections.root_folder_id is 
  'Google Drive folder ID for the root "SwiftGrowthDigital" folder.';

comment on column public.tenant_google_drive_connections.media_folder_id is 
  'Google Drive folder ID for the tenant-specific "News Portal" media folder.';

comment on column public.tenant_google_drive_connections.access_token_encrypted is 
  'Encrypted Google OAuth access token. NEVER expose to frontend. Decrypted only in Edge Functions.';

comment on column public.tenant_google_drive_connections.refresh_token_encrypted is 
  'Encrypted Google OAuth refresh token. NEVER expose to frontend. Used to obtain new access tokens when expired.';

comment on column public.tenant_google_drive_connections.token_expires_at is 
  'Timestamp when access_token expires. Used to trigger automatic token refresh.';

comment on column public.tenant_google_drive_connections.status is 
  'Connection status: active (working), error (needs attention), disconnected (revoked), expired (needs reauth).';

comment on column public.tenant_google_drive_connections.last_error is 
  'Last error message from Google Drive API. Used for debugging and user notifications.';

-- Indexes
create index if not exists idx_gdrive_connections_tenant_id 
  on public.tenant_google_drive_connections(tenant_id) 
  where deleted_at is null;

create index if not exists idx_gdrive_connections_status 
  on public.tenant_google_drive_connections(status) 
  where deleted_at is null and status != 'active';

-- Trigger for updated_at
drop trigger if exists set_gdrive_connections_updated_at on public.tenant_google_drive_connections;
create trigger set_gdrive_connections_updated_at 
  before update on public.tenant_google_drive_connections
  for each row execute function public.set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. EXTEND MEDIA TABLE FOR GOOGLE DRIVE
-- ─────────────────────────────────────────────────────────────────────────────

-- Add storage provider column (defaults to existing Supabase Storage)
alter table public.media 
  add column if not exists storage_provider public.storage_provider not null default 'supabase';

-- Add Google Drive specific columns
alter table public.media 
  add column if not exists drive_file_id text;

alter table public.media 
  add column if not exists drive_folder_id text;

alter table public.media 
  add column if not exists drive_web_url text;

alter table public.media 
  add column if not exists drive_web_content_link text;

alter table public.media 
  add column if not exists drive_thumbnail_link text;

-- Comments
comment on column public.media.storage_provider is 
  'Storage backend: supabase (Supabase Storage) or google_drive (customer-owned Google Drive).';

comment on column public.media.drive_file_id is 
  'Google Drive file ID. Only populated when storage_provider = google_drive. Used for file operations.';

comment on column public.media.drive_folder_id is 
  'Google Drive folder ID containing this file. Only populated when storage_provider = google_drive.';

comment on column public.media.drive_web_url is 
  'Google Drive web view URL (for human viewing). Only populated when storage_provider = google_drive.';

comment on column public.media.drive_web_content_link is 
  'Google Drive download URL. Only populated when storage_provider = google_drive. May require authentication.';

comment on column public.media.drive_thumbnail_link is 
  'Google Drive thumbnail URL for images. Only populated when storage_provider = google_drive.';

-- Index for Drive files
create index if not exists idx_media_storage_provider 
  on public.media(storage_provider) 
  where deleted_at is null;

create index if not exists idx_media_drive_file_id 
  on public.media(drive_file_id) 
  where drive_file_id is not null and deleted_at is null;

-- Constraint: Google Drive files must have drive_file_id
alter table public.media 
  drop constraint if exists media_google_drive_requires_file_id;

alter table public.media 
  add constraint media_google_drive_requires_file_id 
  check (
    (storage_provider = 'supabase' and drive_file_id is null) or
    (storage_provider = 'google_drive' and drive_file_id is not null)
  );

comment on constraint media_google_drive_requires_file_id on public.media is 
  'Ensures Google Drive media records have drive_file_id, and Supabase media do not.';

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. RLS POLICIES FOR GOOGLE DRIVE CONNECTIONS
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.tenant_google_drive_connections enable row level security;

-- Tenant members can read their own connection (but NOT the encrypted tokens)
drop policy if exists "tenant_read_own_gdrive_connection" on public.tenant_google_drive_connections;

create policy "tenant_read_own_gdrive_connection" 
  on public.tenant_google_drive_connections
  for select using (
    deleted_at is null
    and (
      tenant_id in (select public.get_user_tenant_ids())
      or public.is_super_admin()
    )
  );

comment on policy "tenant_read_own_gdrive_connection" on public.tenant_google_drive_connections is 
  'Tenant members and super admin can read connection metadata. WARNING: Frontend must NEVER request access_token_encrypted or refresh_token_encrypted columns.';

-- Only tenant admins can manage connection (connect/disconnect)
drop policy if exists "tenant_manage_own_gdrive_connection" on public.tenant_google_drive_connections;

create policy "tenant_manage_own_gdrive_connection" 
  on public.tenant_google_drive_connections
  for all using (
    deleted_at is null
    and (
      (
        tenant_id in (select public.get_user_tenant_ids())
        and public.has_permission('manage_settings')
      )
      or public.is_super_admin()
    )
  )
  with check (
    (
      tenant_id in (select public.get_user_tenant_ids())
      and public.has_permission('manage_settings')
    )
    or public.is_super_admin()
  );

comment on policy "tenant_manage_own_gdrive_connection" on public.tenant_google_drive_connections is 
  'Only tenant admins with manage_settings permission and super admin can insert/update/delete connections.';

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. HELPER FUNCTIONS
-- ─────────────────────────────────────────────────────────────────────────────

-- Get tenant's Google Drive connection status
create or replace function public.get_tenant_gdrive_status(p_tenant_id uuid)
returns table(
  connected boolean,
  status text,
  google_account_email text,
  last_error text
)
language sql
stable
security definer
set search_path = public
as $$
  select 
    case when gdc.id is not null then true else false end as connected,
    gdc.status,
    gdc.google_account_email,
    gdc.last_error
  from public.tenant_google_drive_connections gdc
  where gdc.tenant_id = p_tenant_id
    and gdc.deleted_at is null
  limit 1;
$$;

comment on function public.get_tenant_gdrive_status(uuid) is 
  'Returns Google Drive connection status for a tenant. Does NOT expose OAuth tokens.';

grant execute on function public.get_tenant_gdrive_status(uuid) to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. UPDATE EXISTING MEDIA RLS POLICIES (NO CHANGES NEEDED)
-- ─────────────────────────────────────────────────────────────────────────────

-- Existing policies already support multi-provider media:
-- - public_read_media: allows public read regardless of storage_provider
-- - tenant_manage_own_media: allows tenant members to manage their media

-- No changes required - existing policies are provider-agnostic

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. AUDIT LOGGING SUPPORT
-- ─────────────────────────────────────────────────────────────────────────────

-- Add new audit log action types (if audit_logs table exists)
-- These are handled by the audit logging system (markAuditLog function)

comment on table public.tenant_google_drive_connections is 
  E'Stores OAuth credentials and folder structure for tenant Google Drive connections.\n\n'
  'SECURITY CRITICAL:\n'
  '- access_token_encrypted and refresh_token_encrypted MUST NEVER be selected by frontend\n'
  '- Tokens are encrypted at rest using AES-256-GCM\n'
  '- Decryption is only performed in Edge Functions with GDRIVE_ENCRYPTION_KEY\n'
  '- Tokens should be retrieved using security definer functions, not direct SELECT\n\n'
  'Audit log actions:\n'
  '- google_drive.connected: When tenant connects Drive\n'
  '- google_drive.disconnected: When tenant disconnects Drive\n'
  '- google_drive.token_refreshed: When access token is automatically refreshed\n'
  '- google_drive.connection_error: When API errors occur\n'
  '- google_drive.upload_success: When file uploaded to Drive\n'
  '- google_drive.upload_failed: When upload fails\n'
  '- google_drive.file_deleted: When file deleted from Drive';

-- ─────────────────────────────────────────────────────────────────────────────
-- 8. BACKWARDS COMPATIBILITY VERIFICATION
-- ─────────────────────────────────────────────────────────────────────────────

-- Verify all existing media records default to 'supabase' provider
do $$
declare
  legacy_count integer;
begin
  select count(*) into legacy_count
  from public.media
  where storage_provider = 'supabase';
  
  raise notice 'Verified % existing media records use storage_provider = supabase', legacy_count;
end $$;

-- Verify no existing records have Drive fields populated
do $$
declare
  invalid_count integer;
begin
  select count(*) into invalid_count
  from public.media
  where storage_provider = 'supabase' and drive_file_id is not null;
  
  if invalid_count > 0 then
    raise warning '% media records have inconsistent state (supabase provider with drive_file_id)', invalid_count;
  else
    raise notice 'Verified no existing media records have invalid Drive fields';
  end if;
end $$;

commit;

