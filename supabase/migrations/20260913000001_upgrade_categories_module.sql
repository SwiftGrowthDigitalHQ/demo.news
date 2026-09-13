-- Upgrade Categories Module to Production-Ready SaaS News CMS
-- Add all required fields for comprehensive category management

-- Add new columns to categories table
ALTER TABLE public.categories 
ADD COLUMN IF NOT EXISTS icon text,
ADD COLUMN IF NOT EXISTS color text DEFAULT '#dc2626',
ADD COLUMN IF NOT EXISTS cover_image_url text,
ADD COLUMN IF NOT EXISTS show_in_navbar boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS show_on_homepage boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS status text DEFAULT 'published' CHECK (status IN ('published', 'draft')),
ADD COLUMN IF NOT EXISTS og_image_url text,
ADD COLUMN IF NOT EXISTS canonical_url text,
ADD COLUMN IF NOT EXISTS article_count integer DEFAULT 0;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_categories_tenant_status ON public.categories(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_categories_tenant_navbar ON public.categories(tenant_id, show_in_navbar);
CREATE INDEX IF NOT EXISTS idx_categories_tenant_homepage ON public.categories(tenant_id, show_on_homepage);
CREATE INDEX IF NOT EXISTS idx_categories_sort_order ON public.categories(tenant_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_categories_slug ON public.categories(tenant_id, slug);

-- Create view for featured categories (for easy queries)
CREATE OR REPLACE VIEW featured_categories AS
SELECT * FROM public.categories
WHERE is_featured = true AND status = 'published' AND deleted_at IS NULL;

-- Function to auto-generate slug from name
CREATE OR REPLACE FUNCTION public.generate_category_slug(name text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT lower(
    regexp_replace(
      regexp_replace(
        name,
        '[^a-zA-Z0-9\s-]', '', 'g'
      ),
      '\s+', '-', 'g'
    )
  )
$$;

-- Function to update article count for a category
CREATE OR REPLACE FUNCTION public.update_category_article_count(category_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.categories
  SET article_count = (
    SELECT COUNT(*) FROM public.articles
    WHERE category_id = $1 AND deleted_at IS NULL
  )
  WHERE id = $1;
END;
$$;

-- Trigger to update category article count when articles are added/removed
CREATE OR REPLACE FUNCTION public.trigger_update_category_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.update_category_article_count(OLD.category_id);
  ELSIF TG_OP = 'INSERT' THEN
    PERFORM public.update_category_article_count(NEW.category_id);
  ELSIF TG_OP = 'UPDATE' AND OLD.category_id != NEW.category_id THEN
    PERFORM public.update_category_article_count(OLD.category_id);
    PERFORM public.update_category_article_count(NEW.category_id);
  END IF;
  RETURN NULL;
END;
$$;

-- Create trigger on articles table
DROP TRIGGER IF EXISTS trigger_article_category_count ON public.articles;
CREATE TRIGGER trigger_article_category_count
AFTER INSERT OR UPDATE OR DELETE ON public.articles
FOR EACH ROW
EXECUTE FUNCTION public.trigger_update_category_count();

-- RLS Policies for categories
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- Drop old incorrect policies if they exist
DROP POLICY IF EXISTS "categories_view_published" ON public.categories CASCADE;
DROP POLICY IF EXISTS "categories_manage_admin" ON public.categories CASCADE;
DROP POLICY IF EXISTS "categories_delete_own_tenant" ON public.categories CASCADE;
DROP POLICY IF EXISTS "categories_manage_own_tenant" ON public.categories CASCADE;

-- NOTE: categories_read_own_tenant, categories_insert_own_tenant, categories_update_delete_own_tenant
-- are recreated below in this migration and will be replaced by migration 20260915000001
-- which creates improved versions with deleted_at checks

-- RLS policies will be created by migration 20260915000001_fix_categories_crud_complete.sql
-- This ensures a single source of truth for RLS policies across CREATE, READ, UPDATE, DELETE operations

-- Grant execute permission on functions
GRANT EXECUTE ON FUNCTION public.generate_category_slug(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_category_article_count(uuid) TO authenticated;
