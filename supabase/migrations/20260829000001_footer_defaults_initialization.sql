-- ═══════════════════════════════════════════════════════════════════════════
-- FOOTER DEFAULTS INITIALIZATION (IDEMPOTENT)
--
-- Ensures every existing tenant has a usable footer without ever overwriting
-- existing footer configuration:
--
--   IF footer settings already exist        -> DO NOTHING
--   IF footer settings do not exist         -> CREATE sensible defaults derived
--                                              from site_settings / current values
--
-- Safe to execute multiple times: every step is guarded by NOT EXISTS checks
-- and no duplicates of social links, columns or links can be created.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.initialize_tenant_footer_defaults()
RETURNS TABLE (tenant_id UUID, action TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  t RECORD;
  ss RECORD;
  new_settings_id UUID;
  col_quick UUID;
  col_legal UUID;
  social_row RECORD;
  social_order INTEGER;
BEGIN
  FOR t IN SELECT id FROM public.tenants LOOP
    -- ─────────────────────────────────────────────
    -- 1. FOOTER SETTINGS (never overwrite)
    -- ─────────────────────────────────────────────
    SELECT * INTO ss FROM public.site_settings
      WHERE tenant_id = t.id ORDER BY updated_at DESC NULLS LAST LIMIT 1;

    IF NOT EXISTS (
      SELECT 1 FROM public.tenant_footer_settings
      WHERE tenant_id = t.id AND deleted_at IS NULL
    ) THEN
      INSERT INTO public.tenant_footer_settings (
        tenant_id,
        brand_name,
        tagline,
        description,
        logo_url,
        copyright_text,
        contact_enabled,
        contact_title,
        contact_phone,
        contact_email,
        show_google_play,
        google_play_url,
        show_app_store,
        app_store_url,
        newsletter_enabled,
        footer_ad_enabled
      ) VALUES (
        t.id,
        COALESCE(ss.site_name, 'News Portal'),
        COALESCE(ss.theme_config->>'tagline', 'Fast. Accurate. Trusted.'),
        COALESCE(NULLIF(btrim(COALESCE(ss.footer_text, '')), ''), 'Your trusted digital news platform.'),
        COALESCE(ss.theme_config->>'logo', ss.logo_url),
        '© ' || to_char(now(), 'YYYY') || ' ' || COALESCE(ss.site_name, 'News Portal') || '. All Rights Reserved.',
        TRUE,
        'Editorial Office',
        ss.contact_phone,
        ss.contact_email,
        FALSE,
        NULL,
        FALSE,
        NULL,
        TRUE,
        FALSE
      )
      ON CONFLICT (tenant_id) DO NOTHING
      RETURNING id INTO new_settings_id;

      IF new_settings_id IS NOT NULL THEN
        tenant_id := t.id; action := 'settings_created';
        RETURN NEXT;
      END IF;
    END IF;

    -- ─────────────────────────────────────────────
    -- 2. SOCIAL LINKS (only if tenant has none)
    -- ─────────────────────────────────────────────
    IF NOT EXISTS (
      SELECT 1 FROM public.tenant_footer_social_links
      WHERE tenant_id = t.id AND deleted_at IS NULL
    ) THEN
      social_order := 0;
      FOR social_row IN
        SELECT key AS platform, value AS url
        FROM jsonb_each_text(COALESCE(ss.social_links, '{}'::jsonb))
        WHERE btrim(value) <> ''
        AND key IN ('facebook','twitter','instagram','youtube','telegram','whatsapp','linkedin','threads','pinterest')
      LOOP
        INSERT INTO public.tenant_footer_social_links (
          tenant_id, platform, platform_name, profile_url, follower_count, enabled, sort_order
        ) VALUES (
          t.id,
          social_row.platform,
          initcap(social_row.platform),
          social_row.url,
          NULL,
          TRUE,
          social_order
        );
        social_order := social_order + 1;
      END LOOP;

      IF social_order > 0 THEN
        tenant_id := t.id; action := 'social_links_created';
        RETURN NEXT;
      END IF;
    END IF;

    -- ─────────────────────────────────────────────
    -- 3. DEFAULT COLUMNS + LINKS (only if no columns exist)
    -- ─────────────────────────────────────────────
    IF NOT EXISTS (
      SELECT 1 FROM public.tenant_footer_columns
      WHERE tenant_id = t.id AND deleted_at IS NULL
    ) THEN
      INSERT INTO public.tenant_footer_columns (tenant_id, title, enabled, sort_order)
      VALUES (t.id, 'Quick Links', TRUE, 0)
      RETURNING id INTO col_quick;

      INSERT INTO public.tenant_footer_columns (tenant_id, title, enabled, sort_order)
      VALUES (t.id, 'Legal', TRUE, 1)
      RETURNING id INTO col_legal;

      INSERT INTO public.tenant_footer_links (tenant_id, column_id, title, url, link_type, is_external, open_new_tab, enabled, sort_order) VALUES
        (t.id, col_quick, 'Home',            '/',                 'system', FALSE, FALSE, TRUE, 0),
        (t.id, col_quick, 'About Us',        '/about-us',         'system', FALSE, FALSE, TRUE, 1),
        (t.id, col_quick, 'Contact Us',      '/contact-us',       'system', FALSE, FALSE, TRUE, 2),
        (t.id, col_quick, 'Advertise With Us','/advertise-with-us','system', FALSE, FALSE, TRUE, 3);

      INSERT INTO public.tenant_footer_links (tenant_id, column_id, title, url, link_type, is_external, open_new_tab, enabled, sort_order) VALUES
        (t.id, col_legal, 'Privacy Policy',       '/privacy-policy',        'system', FALSE, FALSE, TRUE, 0),
        (t.id, col_legal, 'Terms & Conditions',   '/terms-and-conditions',  'system', FALSE, FALSE, TRUE, 1),
        (t.id, col_legal, 'Disclaimer',           '/disclaimer',            'system', FALSE, FALSE, TRUE, 2),
        (t.id, col_legal, 'Cookie Policy',        '/cookie-policy',         'system', FALSE, FALSE, TRUE, 3);

      tenant_id := t.id; action := 'columns_created';
      RETURN NEXT;
    END IF;
  END LOOP;

  RETURN;
END;
$$;

-- Run immediately so applying the migration is enough
SELECT * FROM public.initialize_tenant_footer_defaults();
