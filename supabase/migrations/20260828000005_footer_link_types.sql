-- Add link_type column to tenant_footer_links
ALTER TABLE public.tenant_footer_links 
ADD COLUMN IF NOT EXISTS link_type TEXT DEFAULT 'internal' CHECK (link_type IN ('system', 'custom_page', 'internal', 'external'));

-- Add custom_page_id for linking to custom pages
ALTER TABLE public.tenant_footer_links 
ADD COLUMN IF NOT EXISTS custom_page_id UUID REFERENCES public.tenant_custom_pages(id) ON DELETE SET NULL;

-- Add index for custom page lookups
CREATE INDEX IF NOT EXISTS idx_footer_links_custom_page ON public.tenant_footer_links(custom_page_id) WHERE deleted_at IS NULL;
