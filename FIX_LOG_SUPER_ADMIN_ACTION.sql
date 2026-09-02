-- ═══════════════════════════════════════════════════════════════════════════
-- FIX: log_super_admin_action Function
-- Run this in Supabase SQL Editor to fix the function
-- ═══════════════════════════════════════════════════════════════════════════
--
-- ERROR: function public.log_super_admin_action(unknown, unknown, uuid, jsonb) does not exist
--
-- This script recreates the function with explicit parameter types to ensure
-- PostgreSQL can properly match the function signature when called from other
-- SQL functions like update_tenant_status_rpc and extend_tenant_trial_rpc.
--
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

-- Drop existing function (if any) to ensure clean recreation
DROP FUNCTION IF EXISTS public.log_super_admin_action(text, text, uuid, jsonb);
DROP FUNCTION IF EXISTS public.log_super_admin_action(text, text, uuid);

-- Recreate with explicit types
CREATE OR REPLACE FUNCTION public.log_super_admin_action(
  p_action      TEXT,        -- Action name (e.g., 'tenant_status_changed')
  p_entity_type TEXT,        -- Entity type (e.g., 'tenants', 'tenant_payment')
  p_entity_id   UUID,        -- Entity UUID
  p_metadata    JSONB DEFAULT '{}'::jsonb  -- Additional metadata
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  log_id UUID;
  actor_id UUID;
BEGIN
  -- 1. Verify caller is super admin
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'only super_admin can log super admin actions';
  END IF;
  
  -- 2. Get actor user id from auth.uid()
  SELECT id INTO actor_id
  FROM public.users
  WHERE auth_user_id = auth.uid()
    AND deleted_at IS NULL;
  
  IF actor_id IS NULL THEN
    RAISE EXCEPTION 'super admin user not found in users table';
  END IF;
  
  -- 3. Insert audit log entry
  INSERT INTO public.audit_logs (
    actor_user_id,
    action,
    entity_type,
    entity_id,
    metadata,
    ip_address
  )
  VALUES (
    actor_id,
    p_action,
    p_entity_type,
    p_entity_id,
    p_metadata,
    inet_client_addr()
  )
  RETURNING id INTO log_id;
  
  -- 4. Return the audit log ID
  RETURN log_id;

EXCEPTION
  WHEN OTHERS THEN
    -- Re-raise with context
    RAISE EXCEPTION 'log_super_admin_action failed: %', SQLERRM;
END;
$$;

-- Grant execute permission to authenticated users
-- (The function itself checks for super_admin role internally)
GRANT EXECUTE ON FUNCTION public.log_super_admin_action(TEXT, TEXT, UUID, JSONB) TO authenticated;

-- Add documentation comment
COMMENT ON FUNCTION public.log_super_admin_action(TEXT, TEXT, UUID, JSONB) IS 
  'Logs super admin actions to audit_logs table.
   Automatically captures actor_user_id from auth.uid() and IP address.
   Only callable by users with super_admin role.
   
   Parameters:
     p_action: Action name (e.g., "tenant_status_changed", "payment_approved")
     p_entity_type: Entity type (e.g., "tenants", "tenant_payment")  
     p_entity_id: UUID of the affected entity
     p_metadata: Additional context as JSONB (default empty object)
     
   Returns: UUID of the created audit log entry
   
   Called by:
     - update_tenant_status_rpc
     - extend_tenant_trial_rpc
     - approve_subscription_payment
     - reject_payment
     - TypeScript logAuditEvent() function';

COMMIT;

-- ═══════════════════════════════════════════════════════════════════════════
-- VERIFICATION
-- Run this after applying the fix to confirm it works:
-- ═══════════════════════════════════════════════════════════════════════════

-- Check function exists with correct signature
SELECT 
  p.proname AS function_name,
  pg_get_function_arguments(p.oid) AS arguments
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname = 'log_super_admin_action';

-- Expected output:
-- function_name: log_super_admin_action
-- arguments: p_action text, p_entity_type text, p_entity_id uuid, p_metadata jsonb DEFAULT '{}'::jsonb
