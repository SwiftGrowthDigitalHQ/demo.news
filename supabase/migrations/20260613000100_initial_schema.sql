create extension if not exists "pgcrypto";
create extension if not exists "pg_trgm";

do $$
begin
  create type public.user_status as enum ('active', 'inactive', 'suspended');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.article_status as enum ('draft', 'scheduled', 'review', 'published', 'archived');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.campaign_status as enum ('draft', 'active', 'paused', 'completed', 'archived');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.ad_type as enum ('adsense', 'direct');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.notification_status as enum ('draft', 'scheduled', 'sent', 'cancelled');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.subscription_status as enum ('active', 'paused', 'cancelled');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.payment_status as enum ('pending', 'paid', 'failed', 'refunded');
exception
  when duplicate_object then null;
end $$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.roles (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  is_system boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.permissions (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  name text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.role_permissions (
  role_id uuid not null references public.roles(id) on delete cascade,
  permission_id uuid not null references public.permissions(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (role_id, permission_id)
);

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users(id) on delete cascade,
  role_id uuid references public.roles(id) on delete set null,
  full_name text not null,
  email text not null unique,
  avatar_url text,
  phone text,
  bio text,
  status public.user_status not null default 'active',
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  sort_order integer not null default 0,
  is_featured boolean not null default false,
  seo_title text,
  seo_description text,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.reporters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references public.users(id) on delete set null,
  full_name text not null,
  slug text not null unique,
  bio text,
  specialty text,
  avatar_url text,
  status text not null default 'active',
  social_links jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.media (
  id uuid primary key default gen_random_uuid(),
  uploader_id uuid references public.users(id) on delete set null,
  file_name text not null,
  file_path text not null unique,
  storage_bucket text not null default 'media',
  mime_type text not null,
  file_size bigint not null default 0,
  width integer,
  height integer,
  alt_text text,
  caption text,
  usage_count integer not null default 0,
  is_featured boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.articles (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories(id) on delete restrict,
  author_id uuid references public.users(id) on delete set null,
  title text not null,
  slug text not null unique,
  excerpt text not null,
  content jsonb not null default '[]'::jsonb,
  featured_image text,
  seo_title text,
  seo_description text,
  status public.article_status not null default 'draft',
  featured boolean not null default false,
  trending boolean not null default false,
  breaking boolean not null default false,
  publish_at timestamptz,
  scheduled_at timestamptz,
  read_time text,
  views_count bigint not null default 0,
  media_type text not null default 'article',
  video_url text,
  search_document tsvector generated always as (
    setweight(to_tsvector('simple', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(excerpt, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(content::text, '')), 'C')
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.article_tags (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null references public.articles(id) on delete cascade,
  tag text not null,
  created_at timestamptz not null default now(),
  unique (article_id, tag)
);

create table if not exists public.breaking_news (
  id uuid primary key default gen_random_uuid(),
  headline text not null,
  link_url text,
  is_active boolean not null default true,
  starts_at timestamptz,
  ends_at timestamptz,
  sort_order integer not null default 0,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  advertiser_name text not null,
  campaign_type public.ad_type not null default 'direct',
  status public.campaign_status not null default 'draft',
  budget numeric(14,2) not null default 0,
  spent numeric(14,2) not null default 0,
  impressions bigint not null default 0,
  clicks bigint not null default 0,
  start_date date,
  end_date date,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.advertisements (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid references public.campaigns(id) on delete set null,
  placement text not null,
  ad_type public.ad_type not null default 'direct',
  advertiser_name text not null,
  title text not null,
  target_url text,
  banner_url text,
  sponsored_article_id uuid references public.articles(id) on delete set null,
  position text,
  start_date date,
  end_date date,
  click_count bigint not null default 0,
  impression_count bigint not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  message text not null,
  channel text not null default 'in-app',
  status public.notification_status not null default 'draft',
  scheduled_at timestamptz,
  sent_at timestamptz,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.seo_settings (
  id uuid primary key default gen_random_uuid(),
  page_path text not null unique,
  meta_title text,
  meta_description text,
  og_title text,
  og_description text,
  twitter_title text,
  twitter_description text,
  schema_json jsonb not null default '{}'::jsonb,
  canonical_url text,
  is_indexed boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.site_settings (
  id uuid primary key default gen_random_uuid(),
  site_name text not null,
  logo_url text,
  contact_name text,
  contact_phone text,
  contact_email text,
  social_links jsonb not null default '{}'::jsonb,
  footer_text text,
  theme_config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  page_path text,
  article_id uuid references public.articles(id) on delete set null,
  category_id uuid references public.categories(id) on delete set null,
  user_id uuid references public.users(id) on delete set null,
  session_id text,
  referrer text,
  user_agent text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  full_name text,
  status public.subscription_status not null default 'active',
  source text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid references public.subscriptions(id) on delete set null,
  provider text not null,
  external_id text,
  amount numeric(14,2) not null default 0,
  currency text not null default 'INR',
  status public.payment_status not null default 'pending',
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references public.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  ip_address inet,
  created_at timestamptz not null default now()
);

create index if not exists roles_slug_idx on public.roles (slug);
create index if not exists permissions_key_idx on public.permissions (key);
create index if not exists users_email_idx on public.users (email);
create index if not exists users_role_id_idx on public.users (role_id);
create index if not exists categories_sort_order_idx on public.categories (sort_order);
create index if not exists categories_slug_idx on public.categories (slug);
create index if not exists reporters_slug_idx on public.reporters (slug);
create index if not exists articles_category_id_idx on public.articles (category_id);
create index if not exists articles_author_id_idx on public.articles (author_id);
create index if not exists articles_status_idx on public.articles (status);
create index if not exists articles_publish_at_idx on public.articles (publish_at desc nulls last);
create index if not exists articles_search_document_idx on public.articles using gin (search_document);
create index if not exists article_tags_article_id_idx on public.article_tags (article_id);
create index if not exists article_tags_tag_idx on public.article_tags (tag);
create index if not exists breaking_news_active_idx on public.breaking_news (is_active, sort_order);
create index if not exists campaigns_status_idx on public.campaigns (status);
create index if not exists advertisements_campaign_id_idx on public.advertisements (campaign_id);
create index if not exists advertisements_placement_idx on public.advertisements (placement);
create index if not exists notifications_status_idx on public.notifications (status);
create index if not exists seo_settings_page_path_idx on public.seo_settings (page_path);
create index if not exists analytics_events_event_type_idx on public.analytics_events (event_type);
create index if not exists analytics_events_created_at_idx on public.analytics_events (created_at desc);
create index if not exists subscriptions_email_idx on public.subscriptions (email);

insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do update
set name = excluded.name,
    public = true;

drop trigger if exists set_roles_updated_at on public.roles;
create trigger set_roles_updated_at before update on public.roles
for each row execute function public.set_updated_at();

drop trigger if exists set_permissions_updated_at on public.permissions;
create trigger set_permissions_updated_at before update on public.permissions
for each row execute function public.set_updated_at();

drop trigger if exists set_users_updated_at on public.users;
create trigger set_users_updated_at before update on public.users
for each row execute function public.set_updated_at();

drop trigger if exists set_categories_updated_at on public.categories;
create trigger set_categories_updated_at before update on public.categories
for each row execute function public.set_updated_at();

drop trigger if exists set_reporters_updated_at on public.reporters;
create trigger set_reporters_updated_at before update on public.reporters
for each row execute function public.set_updated_at();

drop trigger if exists set_media_updated_at on public.media;
create trigger set_media_updated_at before update on public.media
for each row execute function public.set_updated_at();

drop trigger if exists set_articles_updated_at on public.articles;
create trigger set_articles_updated_at before update on public.articles
for each row execute function public.set_updated_at();

drop trigger if exists set_breaking_news_updated_at on public.breaking_news;
create trigger set_breaking_news_updated_at before update on public.breaking_news
for each row execute function public.set_updated_at();

drop trigger if exists set_campaigns_updated_at on public.campaigns;
create trigger set_campaigns_updated_at before update on public.campaigns
for each row execute function public.set_updated_at();

drop trigger if exists set_advertisements_updated_at on public.advertisements;
create trigger set_advertisements_updated_at before update on public.advertisements
for each row execute function public.set_updated_at();

drop trigger if exists set_notifications_updated_at on public.notifications;
create trigger set_notifications_updated_at before update on public.notifications
for each row execute function public.set_updated_at();

drop trigger if exists set_seo_settings_updated_at on public.seo_settings;
create trigger set_seo_settings_updated_at before update on public.seo_settings
for each row execute function public.set_updated_at();

drop trigger if exists set_site_settings_updated_at on public.site_settings;
create trigger set_site_settings_updated_at before update on public.site_settings
for each row execute function public.set_updated_at();

drop trigger if exists set_subscriptions_updated_at on public.subscriptions;
create trigger set_subscriptions_updated_at before update on public.subscriptions
for each row execute function public.set_updated_at();

drop trigger if exists set_payments_updated_at on public.payments;
create trigger set_payments_updated_at before update on public.payments
for each row execute function public.set_updated_at();

create table if not exists public.api_request_limits (
  scope text not null,
  bucket_key text not null,
  window_started_at timestamptz not null default now(),
  request_count integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (scope, bucket_key)
);

create or replace function public.strip_site_settings_theme_config(theme_config jsonb)
returns jsonb
language sql
immutable
set search_path = public
as $$
  select (
    coalesce(theme_config, '{}'::jsonb)
    - 'openai_key'
    - 'fcm_key'
    - 'google_analytics_id'
    - 'adsense_publisher_id'
    - 'map_key'
    - 'api_key'
    - 'secret'
    - 'token'
  );
$$;

create or replace function public.sanitize_site_settings_theme_config_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.theme_config = public.strip_site_settings_theme_config(new.theme_config);
  return new;
end;
$$;

drop trigger if exists sanitize_site_settings_theme_config on public.site_settings;
create trigger sanitize_site_settings_theme_config before insert or update on public.site_settings
for each row execute function public.sanitize_site_settings_theme_config_trigger();

update public.site_settings
set theme_config = public.strip_site_settings_theme_config(theme_config);

create or replace function public.bump_request_limit(
  p_scope text,
  p_bucket_key text,
  p_window_started_at timestamptz,
  p_limit integer
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_count integer;
begin
  insert into public.api_request_limits (scope, bucket_key, window_started_at, request_count, updated_at)
  values (p_scope, p_bucket_key, p_window_started_at, 1, now())
  on conflict (scope, bucket_key) do update
    set request_count = case
      when public.api_request_limits.window_started_at < p_window_started_at then 1
      else public.api_request_limits.request_count + 1
    end,
    window_started_at = case
      when public.api_request_limits.window_started_at < p_window_started_at then p_window_started_at
      else public.api_request_limits.window_started_at
    end,
    updated_at = now();

  select request_count
  into current_count
  from public.api_request_limits
  where scope = p_scope
    and bucket_key = p_bucket_key;

  if current_count > p_limit then
    raise exception 'rate limit exceeded';
  end if;
end;
$$;

create or replace function public.track_analytics_event(
  p_event_type text,
  p_page_path text default null,
  p_article_id uuid default null,
  p_category_id uuid default null,
  p_session_id text default null,
  p_referrer text default null,
  p_user_agent text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  inserted_id uuid;
  actor_id uuid;
  normalized_event_type text := btrim(coalesce(p_event_type, ''));
  normalized_session_id text := btrim(coalesce(p_session_id, ''));
begin
  if normalized_event_type = '' then
    raise exception 'event_type is required';
  end if;

  if normalized_session_id = '' then
    raise exception 'session_id is required';
  end if;

  if p_page_path is not null and char_length(p_page_path) > 500 then
    raise exception 'page_path is too long';
  end if;

  perform public.bump_request_limit('analytics_event', normalized_session_id, date_trunc('minute', now()), 120);

  select id
  into actor_id
  from public.users
  where auth_user_id = auth.uid()
    and deleted_at is null
  limit 1;

  insert into public.analytics_events (
    event_type,
    page_path,
    article_id,
    category_id,
    user_id,
    session_id,
    referrer,
    user_agent,
    metadata
  )
  values (
    normalized_event_type,
    nullif(btrim(p_page_path), ''),
    p_article_id,
    p_category_id,
    actor_id,
    normalized_session_id,
    nullif(btrim(p_referrer), ''),
    nullif(btrim(p_user_agent), ''),
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning id into inserted_id;

  return inserted_id;
end;
$$;

create or replace function public.create_newsletter_subscription(
  p_email text,
  p_full_name text default null,
  p_source text default null,
  p_session_id text default null,
  p_referrer text default null,
  p_user_agent text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  subscription_id uuid;
  normalized_email text := lower(btrim(coalesce(p_email, '')));
begin
  if normalized_email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' then
    raise exception 'invalid email address';
  end if;

  if btrim(coalesce(p_session_id, '')) = '' then
    raise exception 'session_id is required';
  end if;

  perform public.bump_request_limit('newsletter_subscription', normalized_email, date_trunc('hour', now()), 5);

  insert into public.subscriptions (
    email,
    full_name,
    status,
    source
  )
  values (
    normalized_email,
    nullif(btrim(p_full_name), ''),
    'active',
    nullif(btrim(p_source), '')
  )
  on conflict (email) do update
    set full_name = coalesce(excluded.full_name, public.subscriptions.full_name),
        status = 'active',
        source = coalesce(excluded.source, public.subscriptions.source),
        deleted_at = null,
        updated_at = now()
  returning id into subscription_id;

  perform public.track_analytics_event(
    'newsletter_signup',
    '/newsletter',
    null,
    null,
    p_session_id,
    p_referrer,
    p_user_agent,
    jsonb_build_object('source', p_source)
  );

  return subscription_id;
end;
$$;

create or replace function public.current_role_slug()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select r.slug
  from public.users u
  join public.roles r on r.id = u.role_id
  where u.auth_user_id = auth.uid()
    and u.deleted_at is null
  limit 1;
$$;

create or replace function public.has_role(required_roles text[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select current_role_slug() = any(required_roles)
    ),
    false
  );
$$;

create or replace function public.has_permission(required_permission text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    exists (
      select 1
      from public.users u
      join public.roles r on r.id = u.role_id
      join public.role_permissions rp on rp.role_id = r.id
      join public.permissions p on p.id = rp.permission_id
      where u.auth_user_id = auth.uid()
        and u.deleted_at is null
        and r.deleted_at is null
        and p.deleted_at is null
        and p.key = required_permission
    ),
    false
  );
$$;

create or replace function public.touch_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (auth_user_id, full_name, email, status)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    new.email,
    'active'
  )
  on conflict (auth_user_id) do update
    set email = excluded.email,
        full_name = excluded.full_name,
        updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.touch_new_auth_user();

alter table public.roles enable row level security;
alter table public.permissions enable row level security;
alter table public.role_permissions enable row level security;
alter table public.users enable row level security;
alter table public.categories enable row level security;
alter table public.reporters enable row level security;
alter table public.media enable row level security;
alter table public.articles enable row level security;
alter table public.article_tags enable row level security;
alter table public.breaking_news enable row level security;
alter table public.campaigns enable row level security;
alter table public.advertisements enable row level security;
alter table public.notifications enable row level security;
alter table public.seo_settings enable row level security;
alter table public.site_settings enable row level security;
alter table public.analytics_events enable row level security;
alter table public.subscriptions enable row level security;
alter table public.payments enable row level security;
alter table public.audit_logs enable row level security;

create policy "public read active categories" on public.categories
for select using (deleted_at is null);

create policy "manage categories" on public.categories
for all using (public.has_permission('manage_categories') or public.has_role(array['super_admin', 'admin', 'editor']))
with check (public.has_permission('manage_categories') or public.has_role(array['super_admin', 'admin', 'editor']));

create policy "public read published articles" on public.articles
for select using (deleted_at is null and status = 'published');

create policy "manage articles" on public.articles
for all using (
  public.has_permission('manage_articles')
  or public.has_permission('publish_articles')
  or public.has_role(array['super_admin', 'admin', 'editor'])
  or (author_id in (select id from public.users where auth_user_id = auth.uid()) and status in ('draft', 'review', 'scheduled'))
)
with check (
  public.has_permission('manage_articles')
  or public.has_permission('publish_articles')
  or public.has_role(array['super_admin', 'admin', 'editor'])
  or (author_id in (select id from public.users where auth_user_id = auth.uid()) and status in ('draft', 'review', 'scheduled'))
);

create policy "public read article tags" on public.article_tags
for select using (
  exists (
    select 1
    from public.articles a
    where a.id = article_id
      and a.deleted_at is null
      and a.status = 'published'
  )
);

create policy "manage article tags" on public.article_tags
for all using (public.has_permission('manage_articles') or public.has_role(array['super_admin', 'admin', 'editor']))
with check (public.has_permission('manage_articles') or public.has_role(array['super_admin', 'admin', 'editor']));

create policy "public read breaking news" on public.breaking_news
for select using (
  deleted_at is null
  and is_active = true
  and (starts_at is null or starts_at <= now())
  and (ends_at is null or ends_at >= now())
);

create policy "manage breaking news" on public.breaking_news
for all using (public.has_permission('manage_breaking_news') or public.has_role(array['super_admin', 'admin', 'editor']))
with check (public.has_permission('manage_breaking_news') or public.has_role(array['super_admin', 'admin', 'editor']));

create policy "public read site settings" on public.site_settings
for select using (deleted_at is null);

create policy "manage site settings" on public.site_settings
for all using (public.has_permission('manage_settings') or public.has_role(array['super_admin', 'admin']))
with check (public.has_permission('manage_settings') or public.has_role(array['super_admin', 'admin']));

create policy "public read seo settings" on public.seo_settings
for select using (deleted_at is null);

create policy "manage seo settings" on public.seo_settings
for all using (public.has_permission('manage_seo') or public.has_role(array['super_admin', 'admin', 'editor']))
with check (public.has_permission('manage_seo') or public.has_role(array['super_admin', 'admin', 'editor']));

create policy "public read active ads" on public.advertisements
for select using (deleted_at is null and is_active = true);

create policy "manage ads" on public.advertisements
for all using (public.has_permission('manage_ads') or public.has_role(array['super_admin', 'admin']))
with check (public.has_permission('manage_ads') or public.has_role(array['super_admin', 'admin']));

create policy "public read active campaigns" on public.campaigns
for select using (deleted_at is null and status in ('active', 'paused', 'completed'));

create policy "manage campaigns" on public.campaigns
for all using (public.has_permission('manage_ads') or public.has_role(array['super_admin', 'admin']))
with check (public.has_permission('manage_ads') or public.has_role(array['super_admin', 'admin']));

create policy "public read active reporters" on public.reporters
for select using (deleted_at is null and status = 'active');

create policy "manage reporters" on public.reporters
for all using (public.has_permission('manage_reporters') or public.has_role(array['super_admin', 'admin', 'editor']))
with check (public.has_permission('manage_reporters') or public.has_role(array['super_admin', 'admin', 'editor']));

create policy "manage users" on public.users
for all using (public.has_permission('manage_users') or public.has_role(array['super_admin', 'admin']))
with check (public.has_permission('manage_users') or public.has_role(array['super_admin', 'admin']));

create policy "manage roles" on public.roles
for all using (public.has_permission('manage_roles') or public.has_role(array['super_admin']))
with check (public.has_permission('manage_roles') or public.has_role(array['super_admin']));

create policy "manage permissions" on public.permissions
for all using (public.has_permission('manage_permissions') or public.has_role(array['super_admin']))
with check (public.has_permission('manage_permissions') or public.has_role(array['super_admin']));

create policy "manage role permissions" on public.role_permissions
for all using (public.has_permission('manage_permissions') or public.has_role(array['super_admin']))
with check (public.has_permission('manage_permissions') or public.has_role(array['super_admin']));

create policy "manage media" on public.media
for all using (public.has_permission('manage_media') or public.has_role(array['super_admin', 'admin', 'editor', 'reporter']))
with check (public.has_permission('manage_media') or public.has_role(array['super_admin', 'admin', 'editor', 'reporter']));

create policy "public read media bucket" on storage.objects
for select using (bucket_id = 'media');

create policy "manage analytics" on public.analytics_events
for select using (public.has_permission('view_analytics') or public.has_role(array['super_admin', 'admin', 'editor']));

create policy "manage media bucket uploads" on storage.objects
for insert with check (
  bucket_id = 'media'
  and (
    public.has_permission('manage_media')
    or public.has_role(array['super_admin', 'admin', 'editor', 'reporter'])
  )
);

create policy "manage media bucket updates" on storage.objects
for update using (
  bucket_id = 'media'
  and (
    public.has_permission('manage_media')
    or public.has_role(array['super_admin', 'admin', 'editor', 'reporter'])
  )
)
with check (
  bucket_id = 'media'
  and (
    public.has_permission('manage_media')
    or public.has_role(array['super_admin', 'admin', 'editor', 'reporter'])
  )
);

create policy "manage media bucket deletes" on storage.objects
for delete using (
  bucket_id = 'media'
  and (
    public.has_permission('manage_media')
    or public.has_role(array['super_admin', 'admin', 'editor', 'reporter'])
  )
);

create policy "manage subscriptions" on public.subscriptions
for select using (public.has_permission('manage_subscriptions') or public.has_role(array['super_admin', 'admin']));

create policy "manage payments" on public.payments
for all using (public.has_permission('manage_subscriptions') or public.has_role(array['super_admin', 'admin']))
with check (public.has_permission('manage_subscriptions') or public.has_role(array['super_admin', 'admin']));

create policy "manage notifications" on public.notifications
for all using (public.has_permission('manage_notifications') or public.has_role(array['super_admin', 'admin', 'editor']))
with check (public.has_permission('manage_notifications') or public.has_role(array['super_admin', 'admin', 'editor']));

create policy "manage audit logs" on public.audit_logs
for select using (public.has_permission('manage_security') or public.has_role(array['super_admin', 'admin']));

create policy "insert audit logs" on public.audit_logs
for insert with check (public.has_permission('manage_security') or public.has_role(array['super_admin', 'admin']));

insert into public.roles (name, slug, description) values
  ('Super Admin', 'super_admin', 'Full unrestricted access'),
  ('Admin', 'admin', 'Operational administration access'),
  ('Editor', 'editor', 'Content editing and publishing access'),
  ('Reporter', 'reporter', 'Reporter submission access')
on conflict (slug) do nothing;

insert into public.permissions (key, name, description) values
  ('manage_users', 'Manage Users', 'Create, edit, and remove users'),
  ('manage_roles', 'Manage Roles', 'Manage role assignments'),
  ('manage_permissions', 'Manage Permissions', 'Manage access permissions'),
  ('manage_articles', 'Manage Articles', 'Create and edit articles'),
  ('publish_articles', 'Publish Articles', 'Publish or schedule articles'),
  ('manage_categories', 'Manage Categories', 'Create and reorder categories'),
  ('manage_media', 'Manage Media', 'Upload and maintain media assets'),
  ('manage_breaking_news', 'Manage Breaking News', 'Create and schedule ticker items'),
  ('manage_ads', 'Manage Ads', 'Create and maintain campaigns'),
  ('manage_notifications', 'Manage Notifications', 'Create and schedule notifications'),
  ('manage_seo', 'Manage SEO', 'Edit SEO metadata and structured data'),
  ('manage_settings', 'Manage Settings', 'Change site settings'),
  ('view_analytics', 'View Analytics', 'See analytics dashboards'),
  ('manage_security', 'Manage Security', 'Review audit logs and security settings'),
  ('manage_reporters', 'Manage Reporters', 'Create and edit reporter profiles'),
  ('manage_subscriptions', 'Manage Subscriptions', 'Review subscribers and payments')
on conflict (key) do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
cross join public.permissions p
where r.slug = 'super_admin'
on conflict do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.key in (
  'manage_users',
  'manage_articles',
  'publish_articles',
  'manage_categories',
  'manage_media',
  'manage_breaking_news',
  'manage_ads',
  'manage_notifications',
  'manage_seo',
  'manage_settings',
  'view_analytics',
  'manage_security',
  'manage_reporters',
  'manage_subscriptions'
)
where r.slug = 'admin'
on conflict do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.key in (
  'manage_articles',
  'publish_articles',
  'manage_categories',
  'manage_media',
  'manage_breaking_news',
  'manage_reporters'
)
where r.slug = 'editor'
on conflict do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.key in (
  'manage_articles',
  'manage_media'
)
where r.slug = 'reporter'
on conflict do nothing;

create or replace function public.search_articles(search_term text, result_limit integer default 12, result_offset integer default 0)
returns table (
  id uuid,
  slug text,
  title text,
  excerpt text,
  category_slug text,
  category_name text,
  author_name text,
  author_role text,
  publish_at timestamptz,
  read_time text,
  featured_image text,
  featured boolean,
  trending boolean,
  breaking boolean,
  tags jsonb,
  views_count bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select
    a.id,
    a.slug,
    a.title,
    a.excerpt,
    c.slug as category_slug,
    c.name as category_name,
    u.full_name as author_name,
    coalesce(rr.name, 'Reporter') as author_role,
    a.publish_at,
    a.read_time,
    a.featured_image,
    a.featured,
    a.trending,
    a.breaking,
    coalesce(tags.tags, '[]'::jsonb) as tags,
    a.views_count
  from public.articles a
  join public.categories c on c.id = a.category_id
  left join public.users u on u.id = a.author_id
  left join public.roles rr on rr.id = u.role_id
  left join lateral (
    select jsonb_agg(at.tag order by at.tag) as tags
    from public.article_tags at
    where at.article_id = a.id
  ) tags on true
  where a.deleted_at is null
    and a.status = 'published'
    and (
      coalesce(search_term, '') = ''
      or a.search_document @@ websearch_to_tsquery('simple', search_term)
      or c.name ilike '%' || search_term || '%'
      or exists (
        select 1
        from public.article_tags at2
        where at2.article_id = a.id
          and at2.tag ilike '%' || search_term || '%'
      )
    )
  order by a.publish_at desc nulls last, a.created_at desc
  limit greatest(result_limit, 1)
  offset greatest(result_offset, 0);
$$;
