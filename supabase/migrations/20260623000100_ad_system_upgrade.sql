-- ============================================
-- AD SYSTEM UPGRADE
-- Adds adsense_code, priority fields and tracking function
-- ============================================

-- Add adsense_code column for Google AdSense integration
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'advertisements' and column_name = 'adsense_code'
  ) then
    alter table public.advertisements add column adsense_code text;
  end if;
end $$;

-- Add priority column for ad ordering
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'advertisements' and column_name = 'priority'
  ) then
    alter table public.advertisements add column priority integer not null default 0;
  end if;
end $$;

-- Create index on placement + is_active for fast frontend queries
create index if not exists advertisements_placement_active_idx
on public.advertisements (placement, is_active, priority desc)
where deleted_at is null;

-- Function: Track ad impression (anonymous access)
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

-- Function: Track ad click (anonymous access)
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

-- Function: Get active ads by placement (respects dates, priority, status)
create or replace function public.get_active_ads(p_placement text, p_limit integer default 5)
returns setof public.advertisements
language plpgsql
security definer
as $$
begin
  return query
    select *
    from public.advertisements
    where placement = p_placement
      and is_active = true
      and deleted_at is null
      and (start_date is null or start_date <= current_date)
      and (end_date is null or end_date >= current_date)
    order by priority desc, created_at desc
    limit p_limit;
end;
$$;

-- Allow anon to call tracking functions
grant execute on function public.track_ad_impression(uuid) to anon;
grant execute on function public.track_ad_click(uuid) to anon;
grant execute on function public.get_active_ads(text) to anon;

-- Allow anon to read active advertisements (for frontend rendering)
create policy "public_read_active_ads" on public.advertisements
for select using (is_active = true and deleted_at is null);

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
  v_ctr numeric;
begin
  select count(*) into v_total from public.advertisements where deleted_at is null;
  select count(*) into v_active from public.advertisements where is_active = true and deleted_at is null;
  select coalesce(sum(impression_count), 0) into v_impressions from public.advertisements where deleted_at is null;
  select coalesce(sum(click_count), 0) into v_clicks from public.advertisements where deleted_at is null;
  
  if v_impressions > 0 then
    v_ctr := round((v_clicks::numeric / v_impressions::numeric) * 100, 2);
  else
    v_ctr := 0;
  end if;

  return json_build_object(
    'total_ads', v_total,
    'active_ads', v_active,
    'total_impressions', v_impressions,
    'total_clicks', v_clicks,
    'ctr', v_ctr
  );
end;
$$;

grant execute on function public.get_ad_stats() to authenticated;
