-- =============================================================================
-- Fix 1: Update the touch_new_auth_user trigger to assign the admin role
-- to the primary admin user, and ensure existing admin gets their role.
-- =============================================================================

-- Assign super_admin role to the existing admin user (if they exist in users table)
update public.users
set role_id = (select id from public.roles where slug = 'super_admin' limit 1)
where email = 'hello@swiftgrowthdigital.com'
  and role_id is null;

-- Also handle if they authenticated but trigger created a row without role
update public.users
set role_id = (select id from public.roles where slug = 'super_admin' limit 1)
where auth_user_id = '94be6aea-b4ec-4e65-9304-fef744bb429c'
  and role_id is null;

-- =============================================================================
-- Fix 2: Add a SELECT policy on users table so authenticated users can read
-- their own profile row. Without this, auth.tsx loadProfile() fails for
-- non-admin users.
-- =============================================================================

create policy "users can read own profile" on public.users
for select using (auth_user_id = auth.uid());

-- =============================================================================
-- Fix 3: Add a SELECT policy on roles table so that the user profile join
-- to roles works for authenticated users.
-- =============================================================================

create policy "authenticated read roles" on public.roles
for select using (true);

-- =============================================================================
-- Fix 4: Add a public read policy on media table so images are accessible
-- on the frontend (published article images).
-- =============================================================================

create policy "public read media" on public.media
for select using (deleted_at is null);

-- =============================================================================
-- Fix 5: Improve the touch_new_auth_user trigger to assign super_admin role
-- to the first registered user (bootstrapping) if no other users exist.
-- =============================================================================

create or replace function public.touch_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  default_role_id uuid;
  user_count integer;
begin
  -- Check if this is the first user (gets super_admin)
  select count(*) into user_count from public.users where deleted_at is null;
  
  if user_count = 0 then
    select id into default_role_id from public.roles where slug = 'super_admin' limit 1;
  end if;

  insert into public.users (auth_user_id, full_name, email, status, role_id)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    new.email,
    'active',
    default_role_id
  )
  on conflict (auth_user_id) do update
    set email = excluded.email,
        full_name = excluded.full_name,
        role_id = coalesce(public.users.role_id, excluded.role_id),
        updated_at = now();
  return new;
end;
$$;
