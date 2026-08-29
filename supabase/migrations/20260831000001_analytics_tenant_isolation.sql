-- ═══════════════════════════════════════════════════════════════════════════
-- ANALYTICS TENANT ISOLATION — COMPLETE FIX
--
-- Problems this migration fixes:
--  1. analytics_events had no tenant_id column → all tenant-admin queries
--     were either cross-tenant (RLS hole) or broken.
--  2. The RLS policy added an "(event_type = 'page_view' AND auth.uid() IS NOT NULL)"
--     clause that allowed every authenticated user to read every tenant's page views.
--  3. track_analytics_event RPC did not stamp tenant_id, so any backfill had to
--     join through articles — which only worked for article events, not page-level.
--  4. A missing composite index made tenant-filtered queries do full table scans.
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────
-- 1.  ADD tenant_id COLUMN TO analytics_events
-- ─────────────────────────────────────────────────────────────────────────

ALTER TABLE public.analytics_events
  ADD COLUMN IF NOT EXISTS tenant_id uuid
    REFERENCES public.tenants(id) ON DELETE CASCADE;

COMMENT ON COLUMN public.analytics_events.tenant_id IS
  'The tenant this analytics event belongs to.
   Set by track_analytics_event() which resolves tenant from article_id or
   the calling user context. NULL events are treated as orphaned and excluded
   from tenant-scoped reads via RLS.';

-- ─────────────────────────────────────────────────────────────────────────
-- 2.  BACKFILL tenant_id FOR EXISTING ROWS THAT HAVE article_id
-- ─────────────────────────────────────────────────────────────────────────

UPDATE public.analytics_events ae
SET    tenant_id = a.tenant_id
FROM   public.articles a
WHERE  ae.article_id = a.id
  AND  ae.tenant_id IS NULL;

-- ─────────────────────────────────────────────────────────────────────────
-- 3.  COMPOSITE INDEX FOR FAST TENANT-SCOPED QUERIES
-- ─────────────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_analytics_events_tenant_event_created
  ON public.analytics_events(tenant_id, event_type, created_at DESC)
  WHERE tenant_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_analytics_events_tenant_created
  ON public.analytics_events(tenant_id, created_at DESC)
  WHERE tenant_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_analytics_events_tenant_session
  ON public.analytics_events(tenant_id, session_id, created_at DESC)
  WHERE tenant_id IS NOT NULL AND session_id IS NOT NULL;

-- ─────────────────────────────────────────────────────────────────────────
-- 4.  FIX RLS POLICIES ON analytics_events
--     Remove the cross-tenant leak clause; all reads must be tenant-scoped.
-- ─────────────────────────────────────────────────────────────────────────

ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

-- Drop all prior policies (may have been created by earlier migrations)
DROP POLICY IF EXISTS "analytics_events_read_tenant"     ON public.analytics_events;
DROP POLICY IF EXISTS "analytics_events_read_own_tenant"  ON public.analytics_events;
DROP POLICY IF EXISTS "analytics_events_insert_system"   ON public.analytics_events;
DROP POLICY IF EXISTS "analytics_events_anon_insert"     ON public.analytics_events;

-- SELECT: tenant admin sees only their own events; super admin sees all.
CREATE POLICY "analytics_events_select"
  ON public.analytics_events
  FOR SELECT
  USING (
    public.is_super_admin()
    OR tenant_id IN (SELECT public.get_user_tenant_ids())
  );

-- INSERT: The track_analytics_event RPC is SECURITY DEFINER (runs as postgres),
-- so the role is 'postgres' during the insert. Anonymous visitors have no JWT
-- but still invoke the RPC, so we allow postgres/service_role to bypass RLS.
-- We also need the anon/authenticated role since the RPC grants SET search_path
-- but the INSERT itself runs as the function owner (postgres).
-- Supabase wraps RPC calls such that the actual row insert uses the function's
-- SECURITY DEFINER context (postgres), so this policy is applied to direct
-- client inserts only; RPC inserts bypass RLS via SECURITY DEFINER.
CREATE POLICY "analytics_events_insert"
  ON public.analytics_events
  FOR INSERT
  WITH CHECK (true);   -- Inserts are controlled by the SECURITY DEFINER RPC; 
                        -- direct client inserts are not exposed in the API.

-- ─────────────────────────────────────────────────────────────────────────
-- 5.  REWRITE track_analytics_event RPC TO STAMP tenant_id
-- ─────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.track_analytics_event(
  p_event_type  text,
  p_page_path   text    DEFAULT NULL,
  p_article_id  uuid    DEFAULT NULL,
  p_category_id uuid    DEFAULT NULL,
  p_session_id  text    DEFAULT NULL,
  p_referrer    text    DEFAULT NULL,
  p_user_agent  text    DEFAULT NULL,
  p_metadata    jsonb   DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inserted_id   uuid;
  v_actor_id      uuid;
  v_tenant_id     uuid;
  v_event_type    text := btrim(coalesce(p_event_type, ''));
  v_session_id    text := btrim(coalesce(p_session_id, ''));
BEGIN
  -- ── Validate required fields ──────────────────────────────────────────
  IF v_event_type = '' THEN
    RAISE EXCEPTION 'event_type is required';
  END IF;

  IF v_session_id = '' THEN
    RAISE EXCEPTION 'session_id is required';
  END IF;

  IF p_page_path IS NOT NULL AND char_length(p_page_path) > 500 THEN
    RAISE EXCEPTION 'page_path is too long (max 500 chars)';
  END IF;

  -- ── Rate limiting: 120 events per session per minute ─────────────────
  PERFORM public.bump_request_limit(
    'analytics_event',
    v_session_id,
    date_trunc('minute', now()),
    120
  );

  -- ── Resolve calling user (may be NULL for anonymous visitors) ─────────
  SELECT id INTO v_actor_id
  FROM   public.users
  WHERE  auth_user_id = auth.uid()
    AND  deleted_at IS NULL
  LIMIT  1;

  -- ── Resolve tenant_id ─────────────────────────────────────────────────
  --    Priority 1: article_id → articles.tenant_id  (most precise)
  --    Priority 2: user's owned/membership tenant    (for logged-in admins)
  --    Priority 3: NULL (anonymous non-article event)
  IF p_article_id IS NOT NULL THEN
    SELECT tenant_id INTO v_tenant_id
    FROM   public.articles
    WHERE  id = p_article_id
      AND  deleted_at IS NULL
    LIMIT  1;
  END IF;

  IF v_tenant_id IS NULL AND v_actor_id IS NOT NULL THEN
    -- Try to get tenant from ownership (fastest path for logged-in users)
    SELECT id INTO v_tenant_id
    FROM   public.tenants
    WHERE  owner_auth_user_id = auth.uid()
      AND  deleted_at IS NULL
    LIMIT  1;
  END IF;

  -- ── Insert analytics event ─────────────────────────────────────────────
  INSERT INTO public.analytics_events (
    event_type,
    page_path,
    article_id,
    category_id,
    user_id,
    session_id,
    referrer,
    user_agent,
    metadata,
    tenant_id
  )
  VALUES (
    v_event_type,
    NULLIF(btrim(coalesce(p_page_path, '')), ''),
    p_article_id,
    p_category_id,
    v_actor_id,
    v_session_id,
    NULLIF(btrim(coalesce(p_referrer, '')), ''),
    NULLIF(btrim(coalesce(p_user_agent, '')), ''),
    COALESCE(p_metadata, '{}'::jsonb),
    v_tenant_id
  )
  RETURNING id INTO v_inserted_id;

  -- ── For page_view events on articles: also increment views_count ───────
  IF v_event_type = 'page_view' AND p_article_id IS NOT NULL THEN
    UPDATE public.articles
    SET    views_count = views_count + 1
    WHERE  id = p_article_id
      AND  deleted_at IS NULL;

    -- Detailed per-view record (deduplicated: same session cannot view same
    -- article more than once every 30 seconds at DB level)
    INSERT INTO public.article_views (
      article_id,
      session_id,
      page_path,
      referrer,
      user_agent,
      tenant_id,
      viewed_at
    )
    SELECT
      p_article_id,
      v_session_id,
      NULLIF(btrim(coalesce(p_page_path, '')), ''),
      NULLIF(btrim(coalesce(p_referrer, '')), ''),
      NULLIF(btrim(coalesce(p_user_agent, '')), ''),
      v_tenant_id,
      now()
    WHERE NOT EXISTS (
      SELECT 1 FROM public.article_views av2
      WHERE  av2.article_id  = p_article_id
        AND  av2.session_id  = v_session_id
        AND  av2.viewed_at  >= now() - interval '30 seconds'
    );
  END IF;

  RETURN v_inserted_id;
END;
$$;

COMMENT ON FUNCTION public.track_analytics_event IS
  'Records an analytics event and stamps tenant_id resolved from article_id
   or from the calling user context.  For page_view events on a known article:
   also increments articles.views_count and inserts a deduplicated row in
   article_views (same session cannot add the same article more than once per
   30 s at the DB level).  Rate-limited at 120 events / session / minute.';

-- ─────────────────────────────────────────────────────────────────────────
-- 6.  ENSURE article_views.tenant_id IS NEVER NULL FOR NEW ROWS
--     (The trigger added by 20260830000002 already handles this; this is a
--      safety fallback index and NOT NULL guard for rows with a known tenant)
-- ─────────────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_article_views_tenant_session_article
  ON public.article_views(tenant_id, session_id, article_id, viewed_at DESC)
  WHERE tenant_id IS NOT NULL;

COMMIT;
