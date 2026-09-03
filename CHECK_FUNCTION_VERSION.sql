-- Check if the migration was actually applied by inspecting the function

-- 1. Get the actual source code of reject_payment() currently in DB
SELECT pg_get_functiondef(p.oid) as reject_payment_source
FROM pg_proc p
WHERE p.proname = 'reject_payment'
  AND p.pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- 2. Get the actual source code of approve_subscription_payment() currently in DB
SELECT pg_get_functiondef(p.oid) as approve_subscription_payment_source
FROM pg_proc p
WHERE p.proname = 'approve_subscription_payment'
  AND p.pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- 3. Check if clear_plan_change_state exists
SELECT pg_get_functiondef(p.oid) as clear_plan_change_state_source
FROM pg_proc p
WHERE p.proname = 'clear_plan_change_state'
  AND p.pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');
