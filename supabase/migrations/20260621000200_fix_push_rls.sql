-- Fix: Allow anon users to upsert into push_subscribers
-- The previous migration only had INSERT policy, but upsert needs UPDATE + SELECT too

-- Drop the old insert-only policy if it exists (safe to re-run)
drop policy if exists "anon_insert_push_subscriber" on public.push_subscribers;
drop policy if exists "anon_update_push_subscriber" on public.push_subscribers;
drop policy if exists "anon_select_push_subscriber" on public.push_subscribers;

-- Allow anyone to insert (new token registration)
create policy "anon_insert_push_subscriber" on public.push_subscribers
for insert with check (true);

-- Allow anyone to update (token re-registration / upsert)
create policy "anon_update_push_subscriber" on public.push_subscribers
for update using (true) with check (true);

-- Allow anyone to select (needed for upsert conflict detection)
create policy "anon_select_push_subscriber" on public.push_subscribers
for select using (true);
