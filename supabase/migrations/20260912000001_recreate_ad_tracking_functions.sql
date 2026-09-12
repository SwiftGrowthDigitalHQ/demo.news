-- ═══════════════════════════════════════════════════════════════════════════
-- RECREATE AD TRACKING FUNCTIONS
-- Ensure track_ad_impression and track_ad_click RPCs exist in production
-- Date: September 12, 2026
-- ═══════════════════════════════════════════════════════════════════════════

-- Function: Track ad impression (anonymous access)
CREATE OR REPLACE FUNCTION public.track_ad_impression(p_ad_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.advertisements
  SET impression_count = impression_count + 1
  WHERE id = p_ad_id;
END;
$$;

-- Function: Track ad click (anonymous access)
CREATE OR REPLACE FUNCTION public.track_ad_click(p_ad_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.advertisements
  SET click_count = click_count + 1
  WHERE id = p_ad_id;
END;
$$;

-- Grant execute permissions to anon role
GRANT EXECUTE ON FUNCTION public.track_ad_impression(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.track_ad_click(uuid) TO anon;

-- Verify functions are created
-- SELECT count(*) FROM pg_proc WHERE proname = 'track_ad_impression';
-- SELECT count(*) FROM pg_proc WHERE proname = 'track_ad_click';
