create or replace function public.get_auth_level()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select
    case
      when auth.uid() is null then 'NOT_AUTHENTICATED'
      when exists (
        select 1 from public.users u
        join public.roles r on r.id = u.role_id
        where u.auth_user_id = auth.uid()
          and r.slug = 'super_admin'
          and u.deleted_at is null
      ) then 'SUPER_ADMIN'
      when exists (
        select 1 from public.users u
        join public.roles r on r.id = u.role_id
        where u.auth_user_id = auth.uid()
          and r.slug in ('admin', 'editor')
          and u.deleted_at is null
      ) then 'CUSTOMER_ADMIN'
      else 'CUSTOMER'
    end;
$$;
