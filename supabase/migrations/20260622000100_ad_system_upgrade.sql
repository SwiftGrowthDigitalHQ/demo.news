-- ============================================
-- Advertisement System Upgrade
-- Adds adsense_code, priority, and helper function
-- ============================================

-- Add missing columns
do $$ begin
  if not exists (select 1 from information_schema.columns where table_name='advertisements' and column_name='adsense_code') then
    alter table public.advertisements add column adsense_code text;
  end if;
  if not exists (select 1 from information_schema.columns where table_name='advertisements' and column_name='priority') then
    alter table public.advertisements add column priority integer not null default 0;
  end if;
end $$;

-- Function: Get active ads for a placement (respects dates, priority, active status)
create or replace function public.get_active_ads(p_placement text, p_limit integer default 3)
returns setof public.advertisements
language sql
security definer
stable
as $$
  select *
  from public.advertisements
  where placement = p_placement
    and is_active = true
    and deleted_at is null
    and (start_date is null or start_date <= current_date)
    and (end_date is null or end_date >= current_date)
  order by priority desc, created_at desc
  limit p_limit;
$$;

-- Function: Track ad impression
create or replace function public.track_ad_impression(p_ad_id uuid)
returns void
language plpgsql
security definer
as $$
begin
  update public.advertisements
  set impression_count = impression_count + 1
  where id = p_ad_id;
end;
$$;

-- Function: Track ad click
create or replace function public.track_ad_click(p_ad_id uuid)
returns void
language plpgsql
security definer
as $$
begin
  update public.advertisements
  set click_count = click_count + 1
  where id = p_ad_id;
end;
$$;

-- Function: Get ad stats for admin dashboard
create or replace function public.get_ad_stats()
returns json
language plpgsql
security definer
as $$
declare
  v_total integer;
  v_active integer;
  v_impressions bigint;
  v_clicks bigint;
begin
  select count(*) into v_total from public.advertisements where deleted_at is null;
  select count(*) into v_active from public.advertisements where is_active=true and deleted_at is null and (start_date is null or start_date<=current_date) and (end_date is null or end_date>=current_date);
  select coalesce(sum(impression_count),0) into v_impressions from public.advertisements where deleted_at is null;
  select coalesce(sum(click_count),0) into v_clicks from public.advertisements where deleted_at is null;
  return json_build_object(
    'total_ads', v_total,
    'active_ads', v_active,
    'total_impressions', v_impressions,
    'total_clicks', v_clicks,
    'ctr', case when v_impressions > 0 then round((v_clicks::numeric / v_impressions::numeric) * 100, 2) else 0 end
  );
end;
$$;

-- Allow anon to call get_active_ads (public frontend)
grant execute on function public.get_active_ads(text, integer) to anon;
grant execute on function public.track_ad_impression(uuid) to anon;
grant execute on function public.track_ad_click(uuid) to anon;
