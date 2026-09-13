-- Add reporter_id column to articles table for reporter selector feature
-- This allows articles to be authored by reporters instead of just generic users
-- Maintains backward compatibility with existing author_id field

alter table public.articles
  add column if not exists reporter_id uuid references public.reporters(id) on delete set null;

comment on column public.articles.reporter_id is
  'Reporter who authored this article. Foreign key to reporters table. Allows direct reporter attribution.';

-- Create index for efficient reporter-based queries
create index if not exists articles_reporter_id_idx on public.articles (reporter_id);

-- Add RLS policy to allow tenant members to update reporter_id on articles they can edit
-- This reuses the existing article UPDATE policy pattern which already checks tenant isolation
drop policy if exists "articles_update_reporter" on public.articles;

create policy "articles_update_reporter" on public.articles
  for update
  using (
    public.has_permission('manage_articles')
    or public.has_role(array['super_admin', 'admin', 'editor'])
    or (author_id in (select id from public.users where auth_user_id = auth.uid()) 
        and status in ('draft', 'review', 'scheduled'))
  )
  with check (
    public.has_permission('manage_articles')
    or public.has_role(array['super_admin', 'admin', 'editor'])
    or (author_id in (select id from public.users where auth_user_id = auth.uid()) 
        and status in ('draft', 'review', 'scheduled'))
  );

-- Verify RLS is enabled
alter table public.articles enable row level security;
