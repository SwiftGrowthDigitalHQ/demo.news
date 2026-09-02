-- ═══════════════════════════════════════════════════════════════════════════
-- Fix log_super_admin_action Function
-- Ensures the function exists with explicit parameter types
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Issue: Error "function public.log_super_admin_action(unknown, unknown, uuid, jsonb) does not exist"
-- Root Cause: Function may not exist in database, or parameter types not explicitly defined
-- Solution: Recreate function with explicit TEXT type casting for parameters
--
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

-- Drop existing function if it exists (to ensure clean recreation)
DROP FUNCTION IF EXISTS public.log_super_admin_action(text, text, uuid, jsonb);

-- Recreate function with explicit parameter types
CREATE OR REPLACE FUNCTION public.log_super_admin_action(
  p_action      TEXT,        -- Explicitly TEXT, not unknown
  p_entity_type TEXT,        -- Explicitly TEXT, not unknown  
  p_entity_id   UUID,        -- Explicitly UUID
  p_metadata    JSONB DEFAULT '{}'::jsonb
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
  -- Verify caller is super admin
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'only super_admin can log super admin actions';
  END IF;
  
  -- Get actor user id
  SELECT id INTO actor_id
  FROM public.users
  WHERE auth_user_id = auth.uid()
    AND deleted_at IS NULL;
  
  -- Insert audit log
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
  
  RETURN log_id;
END;
$$;

-- Grant execute permission to authenticated users (RLS inside function checks super_admin)
GRANT EXECUTE ON FUNCTION public.log_super_admin_action(TEXT, TEXT, UUID, JSONB) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION public.log_super_admin_action IS 
  'Logs super admin actions to audit_logs table. 
   Automatically captures actor_user_id and IP address.
   Only callable by users with super_admin role.
   Returns: audit log UUID';

COMMIT;
