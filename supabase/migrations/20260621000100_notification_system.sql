-- ============================================
-- NOTIFICATION SYSTEM MIGRATION
-- Newsletter notification logs + Push subscribers
-- ============================================

-- Notification logs: tracks every email/push sent
create table if not exists public.notification_logs (
  id uuid primary key default gen_random_uuid(),
  article_id uuid references public.articles(id) on delete set null,
  subscriber_email text,
  channel text not null default 'email', -- 'email' | 'push'
  status text not null default 'pending', -- 'pending' | 'sent' | 'failed'
  sent_at timestamptz,
  error_message text,
  metadata jsonb default '{}',
  created_at timestamptz not null default now()
);

create index if not exists notification_logs_article_id_idx on public.notification_logs (article_id);
create index if not exists notification_logs_status_idx on public.notification_logs (status);
create index if not exists notification_logs_created_at_idx on public.notification_logs (created_at desc);

-- Push subscribers: stores FCM tokens for web push
create table if not exists public.push_subscribers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete set null,
  fcm_token text not null unique,
  device_type text default 'web', -- 'web' | 'android' | 'ios'
  browser text,
  status text not null default 'active', -- 'active' | 'inactive' | 'expired'
  last_notified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists push_subscribers_status_idx on public.push_subscribers (status);
create index if not exists push_subscribers_fcm_token_idx on public.push_subscribers (fcm_token);

-- Add last_notified_at to subscriptions if not exists
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'subscriptions' and column_name = 'last_notified_at'
  ) then
    alter table public.subscriptions add column last_notified_at timestamptz;
  end if;
end $$;

-- Add unsubscribe_token to subscriptions for secure unsubscribe links
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'subscriptions' and column_name = 'unsubscribe_token'
  ) then
    alter table public.subscriptions add column unsubscribe_token uuid default gen_random_uuid();
  end if;
end $$;

-- Trigger to update push_subscribers.updated_at
drop trigger if exists set_push_subscribers_updated_at on public.push_subscribers;
create trigger set_push_subscribers_updated_at before update on public.push_subscribers
for each row execute function public.set_updated_at();

-- RLS policies
alter table public.notification_logs enable row level security;
alter table public.push_subscribers enable row level security;

-- Admin can view notification logs
create policy "admin_view_notification_logs" on public.notification_logs
for select using (public.has_role(array['super_admin', 'admin', 'editor']));

-- Admin can manage push subscribers
create policy "admin_manage_push_subscribers" on public.push_subscribers
for all using (public.has_role(array['super_admin', 'admin']))
with check (public.has_role(array['super_admin', 'admin']));

-- Anyone can insert their own push subscription (anon)
create policy "anon_insert_push_subscriber" on public.push_subscribers
for insert with check (true);

-- Anyone can update their own push subscription (needed for upsert on token re-registration)
create policy "anon_update_push_subscriber" on public.push_subscribers
for update using (true) with check (true);

-- Anyone can read their own token (needed for getToken check)
create policy "anon_select_push_subscriber" on public.push_subscribers
for select using (true);

-- Function: unsubscribe by token
create or replace function public.unsubscribe_by_token(p_token uuid)
returns text
language plpgsql
security definer
as $$
declare
  v_email text;
begin
  update public.subscriptions
  set status = 'cancelled', updated_at = now()
  where unsubscribe_token = p_token and status = 'active'
  returning email into v_email;

  if v_email is null then
    return 'not_found';
  end if;

  return 'success';
end;
$$;

-- Function: get newsletter stats for admin
create or replace function public.get_newsletter_stats()
returns json
language plpgsql
security definer
as $$
declare
  v_total integer;
  v_active integer;
  v_cancelled integer;
  v_push_total integer;
  v_push_active integer;
  v_notifications_sent integer;
begin
  select count(*) into v_total from public.subscriptions where deleted_at is null;
  select count(*) into v_active from public.subscriptions where status = 'active' and deleted_at is null;
  select count(*) into v_cancelled from public.subscriptions where status = 'cancelled' and deleted_at is null;
  select count(*) into v_push_total from public.push_subscribers;
  select count(*) into v_push_active from public.push_subscribers where status = 'active';
  select count(*) into v_notifications_sent from public.notification_logs where status = 'sent';

  return json_build_object(
    'total_subscribers', v_total,
    'active_subscribers', v_active,
    'cancelled_subscribers', v_cancelled,
    'push_total', v_push_total,
    'push_active', v_push_active,
    'notifications_sent', v_notifications_sent
  );
end;
$$;
