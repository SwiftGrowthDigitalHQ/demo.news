-- ═══════════════════════════════════════════════════════════════════════════
-- PROVISION TENANT-SPECIFIC SITE SETTINGS
-- Creates default site_settings for each existing tenant
-- ═══════════════════════════════════════════════════════════════════════════

begin;

-- Create site_settings for each tenant that doesn't have one yet
insert into public.site_settings (
  tenant_id,
  site_name,
  logo_url,
  contact_name,
  contact_phone,
  contact_email,
  social_links,
  footer_text,
  theme_config,
  created_at,
  updated_at
)
select 
  t.id as tenant_id,
  t.name as site_name,
  t.logo_url,
  null as contact_name,
  t.contact_phone,
  t.contact_email,
  coalesce(t.social_links, '{}'::jsonb) as social_links,
  'Powered by SangTX' as footer_text,
  jsonb_build_object(
    'primary_color', coalesce(t.primary_color, '#dc2626'),
    'secondary_color', coalesce(t.secondary_color, '#1e40af'),
    'logo', t.logo_url,
    'favicon', t.favicon_url,
    'tagline', t.tagline,
    'site_url', 'https://' || t.slug || '.example.com',
    'articles_per_page', 12,
    'breaking_ticker', true,
    'comments_enabled', false,
    'maintenance_mode', false,
    'dark_mode', false
  ) as theme_config,
  now() as created_at,
  now() as updated_at
from public.tenants t
where t.deleted_at is null
  and not exists (
    select 1 
    from public.site_settings s
    where s.tenant_id = t.id
      and s.deleted_at is null
  );

-- Log what was created
do $$
declare
  created_count int;
begin
  select count(*) 
  into created_count
  from public.site_settings
  where tenant_id is not null 
    and deleted_at is null;
  
  raise notice 'Created site_settings for % tenants', created_count;
end $$;

commit;
