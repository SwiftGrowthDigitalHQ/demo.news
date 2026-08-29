-- ═══════════════════════════════════════════════════════════════════════════
-- AUTO TENANT CONTEXT FOR NEW CONTENT
-- Automatically sets tenant_id based on current user's membership
-- ═══════════════════════════════════════════════════════════════════════════

begin;

-- ─────────────────────────────────────────────────────────────────────────────
-- GET CURRENT USER'S SINGLE TENANT
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.get_current_tenant_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  -- Return the user's tenant (assumes user belongs to exactly one tenant)
  -- If user belongs to multiple tenants, returns NULL (ambiguous)
  -- Super admins should explicitly set tenant_id
  select case
    when public.is_super_admin() then null  -- Super admin must explicitly set tenant
    when count(*) = 1 then min(tenant_id)   -- Single tenant: use it
    else null  -- Multiple tenants or none: must be explicit
  end
  from public.tenant_memberships
  where auth_user_id = auth.uid()
    and deleted_at is null;
$$;

comment on function public.get_current_tenant_id() is 
  'Returns current user''s tenant_id if they belong to exactly one tenant. Returns NULL for super_admin or if ambiguous.';

-- ─────────────────────────────────────────────────────────────────────────────
-- TRIGGER FUNCTION: AUTO-SET TENANT_ID ON INSERT
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.set_tenant_id_from_context()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- If tenant_id not explicitly set, try to auto-set it
  if new.tenant_id is null then
    new.tenant_id := public.get_current_tenant_id();
    
    -- If still null (super admin or ambiguous), raise error
    if new.tenant_id is null then
      raise exception 'tenant_id must be explicitly set. Could not determine tenant context.';
    end if;
  end if;
  
  -- Verify user has access to the specified tenant
  if not public.is_tenant_member(new.tenant_id) and not public.is_super_admin() then
    raise exception 'Access denied: you are not a member of tenant %', new.tenant_id;
  end if;
  
  return new;
end;
$$;

comment on function public.set_tenant_id_from_context() is 
  'Trigger function that auto-sets tenant_id on INSERT and validates tenant access.';

-- ─────────────────────────────────────────────────────────────────────────────
-- APPLY TRIGGERS TO TENANT-SCOPED TABLES
-- ─────────────────────────────────────────────────────────────────────────────

create trigger set_tenant_id_on_article_insert
  before insert on public.articles
  for each row
  execute function public.set_tenant_id_from_context();

create trigger set_tenant_id_on_category_insert
  before insert on public.categories
  for each row
  execute function public.set_tenant_id_from_context();

create trigger set_tenant_id_on_breaking_news_insert
  before insert on public.breaking_news
  for each row
  execute function public.set_tenant_id_from_context();

create trigger set_tenant_id_on_advertisement_insert
  before insert on public.advertisements
  for each row
  execute function public.set_tenant_id_from_context();

create trigger set_tenant_id_on_media_insert
  before insert on public.media
  for each row
  execute function public.set_tenant_id_from_context();

create trigger set_tenant_id_on_reporter_insert
  before insert on public.reporters
  for each row
  execute function public.set_tenant_id_from_context();

create trigger set_tenant_id_on_notification_insert
  before insert on public.notifications
  for each row
  execute function public.set_tenant_id_from_context();

create trigger set_tenant_id_on_campaign_insert
  before insert on public.campaigns
  for each row
  execute function public.set_tenant_id_from_context();

commit;
