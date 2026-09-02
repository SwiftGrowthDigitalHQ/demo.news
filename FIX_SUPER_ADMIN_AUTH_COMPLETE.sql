-- ═══════════════════════════════════════════════════════════════════════════
-- COMPLETE FIX: Super Admin Authorization
-- Ensures at least one super_admin user exists and can approve/reject payments
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

-- ─── STEP 1: Ensure super_admin role exists ──────────────────────────────────

INSERT INTO public.roles (slug, name, is_system, deleted_at)
VALUES ('super_admin', 'Super Administrator', true, NULL)
ON CONFLICT (slug) DO NOTHING;

-- ─── STEP 2: Check if any super_admin user exists ────────────────────────────

DO $$
DECLARE
  v_super_admin_role_id UUID;
  v_super_admin_count INTEGER;
  v_first_user_id UUID;
  v_first_user_email TEXT;
BEGIN
  -- Get super_admin role ID
  SELECT id INTO v_super_admin_role_id
  FROM public.roles
  WHERE slug = 'super_admin';

  IF v_super_admin_role_id IS NULL THEN
    RAISE EXCEPTION 'super_admin role does not exist';
  END IF;

  -- Count existing super_admin users
  SELECT COUNT(*) INTO v_super_admin_count
  FROM public.users u
  WHERE u.role_id = v_super_admin_role_id
    AND u.deleted_at IS NULL;

  RAISE NOTICE 'Found % super_admin users', v_super_admin_count;

  -- If no super_admin exists, assign it to the first user
  IF v_super_admin_count = 0 THEN
    -- Find the first user (by created_at)
    SELECT id, email INTO v_first_user_id, v_first_user_email
    FROM public.users
    WHERE deleted_at IS NULL
    ORDER BY created_at ASC
    LIMIT 1;

    IF v_first_user_id IS NOT NULL THEN
      -- Assign super_admin role to first user
      UPDATE public.users
      SET role_id = v_super_admin_role_id,
          updated_at = NOW()
      WHERE id = v_first_user_id;

      RAISE NOTICE 'Assigned super_admin role to first user: % (id: %)', v_first_user_email, v_first_user_id;
    ELSE
      RAISE WARNING 'No users found in database. Create a user account first.';
    END IF;
  ELSE
    RAISE NOTICE 'Super admin users already exist. No changes needed.';
  END IF;
END $$;

-- ─── STEP 3: Verify is_super_admin() function exists and is correct ──────────

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users u
    JOIN public.roles r ON r.id = u.role_id
    WHERE u.auth_user_id = auth.uid()
      AND r.slug = 'super_admin'
      AND u.deleted_at IS NULL
  );
$$;

-- ─── STEP 4: Verification queries ─────────────────────────────────────────────

-- Show all super_admin users
SELECT 
  'SUPER ADMIN USERS' AS check_type,
  u.id,
  u.auth_user_id,
  u.email,
  u.full_name,
  r.slug AS role,
  u.created_at
FROM public.users u
JOIN public.roles r ON r.id = u.role_id
WHERE r.slug = 'super_admin'
  AND u.deleted_at IS NULL
ORDER BY u.created_at ASC;

-- Test is_super_admin() function structure
SELECT 
  'is_super_admin() FUNCTION' AS check_type,
  p.proname AS function_name,
  CASE WHEN p.prosecdef THEN '✅ SECURITY DEFINER' ELSE '❌ NOT SECURITY DEFINER' END AS security,
  CASE WHEN p.provolatile = 's' THEN '✅ STABLE' ELSE '⚠️ ' || 
    CASE WHEN p.provolatile = 'i' THEN 'IMMUTABLE' ELSE 'VOLATILE' END
  END AS volatility
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.proname = 'is_super_admin';

-- Verify EXECUTE permissions on RPC functions
SELECT 
  'RPC PERMISSIONS' AS check_type,
  p.proname AS function_name,
  CASE
    WHEN has_function_privilege('authenticated', p.oid, 'EXECUTE') 
    THEN '✅ GRANTED'
    ELSE '❌ NOT GRANTED'
  END AS authenticated_can_execute
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' 
  AND p.proname IN ('approve_subscription_payment', 'reject_payment')
ORDER BY p.proname;

COMMIT;

-- ═══════════════════════════════════════════════════════════════════════════
-- POST-EXECUTION INSTRUCTIONS
-- ═══════════════════════════════════════════════════════════════════════════
--
-- After running this script, you should see:
--
-- 1. SUPER ADMIN USERS table showing at least one user with role 'super_admin'
-- 2. is_super_admin() function showing:
--    - ✅ SECURITY DEFINER
--    - ✅ STABLE
-- 3. RPC PERMISSIONS showing:
--    - approve_subscription_payment: ✅ GRANTED
--    - reject_payment: ✅ GRANTED
--
-- NEXT STEPS:
--
-- 1. Login to the application using the email shown in SUPER ADMIN USERS
-- 2. Navigate to /super-admin/payments
-- 3. Test Approve/Reject buttons
-- 4. Check browser console for diagnostic logs
--
-- If the currently logged-in user is NOT the one shown as super_admin:
-- - Either login as the super_admin user shown above, OR
-- - Run this manual UPDATE to make your current user a super_admin:
--
--   UPDATE public.users
--   SET role_id = (SELECT id FROM public.roles WHERE slug = 'super_admin')
--   WHERE email = 'YOUR_CURRENT_USER_EMAIL';
--
-- ═══════════════════════════════════════════════════════════════════════════
