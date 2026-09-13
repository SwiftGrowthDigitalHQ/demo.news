-- Seed Default Categories for New Tenants
-- Creates 12 default categories with SEO fields and styling

CREATE OR REPLACE FUNCTION public.seed_default_categories(tenant_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_default_categories JSONB;
  v_category JSONB;
  v_count integer;
BEGIN
  -- Check if categories already exist for this tenant
  SELECT COUNT(*) INTO v_count FROM public.categories WHERE categories.tenant_id = seed_default_categories.tenant_id;
  
  IF v_count > 0 THEN
    RETURN; -- Categories already seeded
  END IF;

  -- Define 12 default categories with all metadata
  v_default_categories := '[
    {
      "name": "Home",
      "slug": "home",
      "description": "Latest news and updates from home",
      "icon": "🏠",
      "color": "#3b82f6",
      "sort_order": 1,
      "show_in_navbar": true,
      "show_on_homepage": true,
      "status": "published",
      "seo_title": "Home News | Latest Updates",
      "seo_description": "Stay updated with the latest news and stories"
    },
    {
      "name": "Politics",
      "slug": "politics",
      "description": "Political news, elections, and government updates",
      "icon": "🏛️",
      "color": "#ef4444",
      "sort_order": 2,
      "show_in_navbar": true,
      "show_on_homepage": true,
      "status": "published",
      "seo_title": "Politics News | Elections & Government",
      "seo_description": "Coverage of political events, elections, and government policies"
    },
    {
      "name": "Bihar",
      "slug": "bihar",
      "description": "News specific to Bihar state",
      "icon": "🗺️",
      "color": "#f59e0b",
      "sort_order": 3,
      "show_in_navbar": true,
      "show_on_homepage": true,
      "status": "published",
      "seo_title": "Bihar News | State Updates",
      "seo_description": "Latest news from Bihar including local government and regional events"
    },
    {
      "name": "National",
      "slug": "national",
      "description": "National news from across the country",
      "icon": "🇮🇳",
      "color": "#8b5cf6",
      "sort_order": 4,
      "show_in_navbar": true,
      "show_on_homepage": true,
      "status": "published",
      "seo_title": "National News | India News",
      "seo_description": "National news stories and updates from across India"
    },
    {
      "name": "Crime",
      "slug": "crime",
      "description": "Crime news and investigations",
      "icon": "🚨",
      "color": "#dc2626",
      "sort_order": 5,
      "show_in_navbar": true,
      "show_on_homepage": true,
      "status": "published",
      "seo_title": "Crime News | Latest Crime Reports",
      "seo_description": "Crime stories, investigations, and safety updates"
    },
    {
      "name": "Business",
      "slug": "business",
      "description": "Business news, markets, and economy",
      "icon": "💼",
      "color": "#059669",
      "sort_order": 6,
      "show_in_navbar": true,
      "show_on_homepage": true,
      "status": "published",
      "seo_title": "Business News | Markets & Economy",
      "seo_description": "Business news, stock market updates, and economic analysis"
    },
    {
      "name": "Sports",
      "slug": "sports",
      "description": "Sports news, matches, and athletes",
      "icon": "⚽",
      "color": "#2563eb",
      "sort_order": 7,
      "show_in_navbar": true,
      "show_on_homepage": true,
      "status": "published",
      "seo_title": "Sports News | Live Scores & Updates",
      "seo_description": "Sports news, match results, and athlete updates"
    },
    {
      "name": "Technology",
      "slug": "technology",
      "description": "Tech news, gadgets, and innovations",
      "icon": "💻",
      "color": "#06b6d4",
      "sort_order": 8,
      "show_in_navbar": true,
      "show_on_homepage": true,
      "status": "published",
      "seo_title": "Technology News | Tech Updates & Gadgets",
      "seo_description": "Latest technology news, gadgets, and innovations"
    },
    {
      "name": "Education",
      "slug": "education",
      "description": "Education news, examinations, and institutions",
      "icon": "🎓",
      "color": "#7c3aed",
      "sort_order": 9,
      "show_in_navbar": true,
      "show_on_homepage": true,
      "status": "published",
      "seo_title": "Education News | Exams & Institutions",
      "seo_description": "Education news, exam results, and institutional updates"
    },
    {
      "name": "Entertainment",
      "slug": "entertainment",
      "description": "Entertainment, movies, and celebrities",
      "icon": "🎬",
      "color": "#ec4899",
      "sort_order": 10,
      "show_in_navbar": true,
      "show_on_homepage": true,
      "status": "published",
      "seo_title": "Entertainment News | Movies & Celebrities",
      "seo_description": "Entertainment news, movie reviews, and celebrity updates"
    },
    {
      "name": "Video News",
      "slug": "video-news",
      "description": "Video reports and multimedia stories",
      "icon": "📹",
      "color": "#f43f5e",
      "sort_order": 11,
      "show_in_navbar": true,
      "show_on_homepage": true,
      "status": "published",
      "seo_title": "Video News | Multimedia Stories",
      "seo_description": "Video reports and multimedia news stories"
    },
    {
      "name": "Breaking News",
      "slug": "breaking-news",
      "description": "Breaking news and urgent updates",
      "icon": "⚡",
      "color": "#ff6b6b",
      "sort_order": 12,
      "show_in_navbar": false,
      "show_on_homepage": true,
      "status": "published",
      "seo_title": "Breaking News | Urgent Updates",
      "seo_description": "Breaking news and urgent updates as they happen"
    }
  ]'::jsonb;

  -- Insert default categories
  FOR v_category IN SELECT * FROM jsonb_array_elements(v_default_categories)
  LOOP
    INSERT INTO public.categories (
      tenant_id,
      name,
      slug,
      description,
      icon,
      color,
      sort_order,
      show_in_navbar,
      show_on_homepage,
      status,
      seo_title,
      seo_description
    ) VALUES (
      seed_default_categories.tenant_id,
      v_category->>'name',
      v_category->>'slug',
      v_category->>'description',
      v_category->>'icon',
      v_category->>'color',
      (v_category->>'sort_order')::integer,
      (v_category->>'show_in_navbar')::boolean,
      (v_category->>'show_on_homepage')::boolean,
      v_category->>'status',
      v_category->>'seo_title',
      v_category->>'seo_description'
    );
  END LOOP;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.seed_default_categories(uuid) TO authenticated;

-- Create trigger to auto-seed categories for new tenants
CREATE OR REPLACE FUNCTION public.trigger_seed_tenant_categories()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Seed default categories for new tenant
  PERFORM public.seed_default_categories(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_seed_categories_on_tenant_create ON public.tenants;
CREATE TRIGGER trigger_seed_categories_on_tenant_create
AFTER INSERT ON public.tenants
FOR EACH ROW
EXECUTE FUNCTION public.trigger_seed_tenant_categories();
