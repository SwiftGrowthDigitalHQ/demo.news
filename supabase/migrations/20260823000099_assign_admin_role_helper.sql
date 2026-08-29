-- =============================================================================
-- Migration: Helper function to assign admin role to users
-- Purpose: Allow assigning admin role to users who don't have one
-- Date: 2026-08-23
-- =============================================================================

-- Function to check if a user can assign roles (must be super_admin)
create or replace function public.can_assign_roles()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  user_role_slug text;
begin
  select r.slug into user_role_slug
  from public.users u
  join public.roles r on u.role_id = r.id
  where u.auth_user_id = auth.uid()
    and u.deleted_at is null;
  
  return user_role_slug = 'super_admin';
end;
$$;

-- Function for super_admin to assign roles to users
create or replace function public.assign_user_role(
  target_user_id uuid,
  target_role_slug text
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  target_role_id uuid;
  result json;
begin
  -- Check if caller is super_admin
  if not public.can_assign_roles() then
    return json_build_object(
      'success', false,
      'error', 'Only super_admin can assign roles'
    );
  end if;

  -- Get the role ID
  select id into target_role_id
  from public.roles
  where slug = target_role_slug;

  if target_role_id is null then
    return json_build_object(
      'success', false,
      'error', 'Role not found: ' || target_role_slug
    );
  end if;

  -- Assign the role
  update public.users
  set role_id = target_role_id,
      updated_at = now()
  where id = target_user_id
    and deleted_at is null;

  if not found then
    return json_build_object(
      'success', false,
      'error', 'User not found or deleted'
    );
  end if;

  return json_build_object(
    'success', true,
    'message', 'Role assigned successfully'
  );
end;
$$;

-- Grant execute permission
grant execute on function public.can_assign_roles() to authenticated;
grant execute on function public.assign_user_role(uuid, text) to authenticated;

-- =============================================================================
-- IMPORTANT: Manual role assignment instructions
-- =============================================================================
-- 
-- To assign admin role to a user, the super_admin should run:
--
-- SELECT public.assign_user_role(
--   '<user_id>'::uuid,
--   'admin'
-- );
--
-- To find users without roles:
--
-- SELECT id, email, full_name, role_id
-- FROM public.users
-- WHERE role_id IS NULL AND deleted_at IS NULL;
--
-- =============================================================================

