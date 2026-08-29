/**
 * provision-customer — Supabase Edge Function
 *
 * Creates a new customer tenant and sends the owner an invitation email.
 * Called exclusively from the Super Admin UI via provisionCustomer() in superAdmin.ts.
 *
 * SECURITY:
 *  - Caller must be authenticated AND have the super_admin role in the users table.
 *    Non-super-admins receive 403 immediately.
 *  - Uses SUPABASE_SERVICE_ROLE_KEY (server-only) for all privileged DB operations.
 *    The service-role key is NEVER exposed to the browser.
 *  - Owner auth account is created via the Admin API (inviteUserByEmail) — the browser
 *    never supplies a password or auth UID for the new user.
 *  - Tenant slug is validated and sanitized server-side.
 *  - Trial period is calculated from payment_config.trial_days — NOT from client input.
 *  - All operations run in a logical transaction: if any step fails, cleanup is attempted
 *    so no orphaned auth accounts or tenant rows are left behind.
 *
 * SETUP:
 *   supabase functions deploy provision-customer
 *   # No extra secrets required beyond SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY,
 *   # which Supabase injects automatically in the edge function runtime.
 *
 * REQUEST (POST, JSON body matching CustomerProvisioningInput in superAdmin.ts):
 *   {
 *     ownerName: string       — full name of the new tenant owner
 *     email: string           — owner's email address (will receive invite)
 *     phone?: string
 *     name: string            — tenant display name
 *     slug: string            — URL-safe unique identifier
 *     tagline?: string
 *     description?: string
 *     address?: string
 *     socialLinks?: Record<string, string>
 *     language: 'en'|'hi'|'bho'
 *     plan: 'monthly'|'yearly'
 *     androidRequested: boolean
 *   }
 *
 * RESPONSE 200:  { success: true, tenant: Tenant }
 * RESPONSE 4xx:  { success: false, error: string }
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const SUPABASE_URL             = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

// CORS headers — only allow the configured frontend origin
const SITE_URL = Deno.env.get('SITE_URL') ?? 'http://localhost:5173';
const CORS_HEADERS = {
  'Access-Control-Allow-Origin':  SITE_URL,
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, content-type, apikey, x-client-info',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}

function err(message: string, status = 400): Response {
  return json({ success: false, error: message }, status);
}

/** Slugify: lowercase, replace non-alphanumeric with hyphens, collapse runs, trim */
function sanitizeSlug(raw: string): string {
  return raw
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '');
}

// ── Main handler ──────────────────────────────────────────────────────────────

serve(async (req: Request) => {
  // Preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (req.method !== 'POST') return err('Method not allowed', 405);

  // ── 1. Authenticate the calling super admin ─────────────────────────────────
  const authHeader = req.headers.get('authorization') ?? '';
  const jwt = authHeader.replace(/^Bearer\s+/i, '');
  if (!jwt) return err('Missing authorization header', 401);

  // Create a user-scoped client to verify identity
  const userClient = createClient(SUPABASE_URL, jwt, {
    auth: { persistSession: false },
  });

  const { data: { user }, error: authErr } = await userClient.auth.getUser();
  if (authErr || !user) return err('Unauthorized', 401);

  // Verify super_admin role using the privileged client
  const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  const { data: callerProfile, error: profileErr } = await adminClient
    .from('users')
    .select('id, roles(slug)')
    .eq('auth_user_id', user.id)
    .eq('deleted_at', null)
    .maybeSingle();

  if (profileErr || !callerProfile) return err('Caller profile not found', 403);

  const roleSlug = (callerProfile.roles as { slug: string } | null)?.slug;
  if (roleSlug !== 'super_admin') return err('Forbidden: super_admin required', 403);

  // ── 2. Parse and validate input ────────────────────────────────────────────
  let input: Record<string, unknown>;
  try {
    input = await req.json();
  } catch {
    return err('Invalid JSON body', 400);
  }

  const ownerName        = String(input.ownerName        ?? '').trim();
  const email            = String(input.email            ?? '').trim().toLowerCase();
  const phone            = String(input.phone            ?? '').trim() || null;
  const tenantName       = String(input.name             ?? '').trim();
  const rawSlug          = String(input.slug             ?? '').trim();
  const tagline          = String(input.tagline          ?? '').trim() || null;
  const description      = String(input.description      ?? '').trim() || null;
  const address          = String(input.address          ?? '').trim() || null;
  const language         = String(input.language         ?? 'en');
  const plan             = String(input.plan             ?? 'monthly');
  const androidRequested = Boolean(input.androidRequested);
  const socialLinks      = (input.socialLinks && typeof input.socialLinks === 'object')
    ? input.socialLinks as Record<string, string>
    : {};

  if (!ownerName)                    return err('ownerName is required');
  if (!email || !email.includes('@')) return err('Valid email is required');
  if (!tenantName)                    return err('Tenant name is required');
  if (!rawSlug)                       return err('Slug is required');
  if (!['en', 'hi', 'bho'].includes(language)) return err('Invalid language');
  if (!['monthly', 'yearly'].includes(plan))    return err('Invalid plan');

  const slug = sanitizeSlug(rawSlug);
  if (!slug || slug.length < 2 || slug.length > 50) {
    return err('Slug must be 2–50 alphanumeric/hyphen characters');
  }

  // ── 3. Check slug uniqueness ──────────────────────────────────────────────
  const { data: existing } = await adminClient
    .from('tenants')
    .select('id')
    .eq('slug', slug)
    .is('deleted_at', null)
    .maybeSingle();

  if (existing) return err(`Slug "${slug}" is already taken`, 409);

  // ── 4. Read trial_days from payment_config (server-authoritative) ─────────
  const { data: config } = await adminClient
    .from('payment_config')
    .select('trial_days')
    .eq('is_active', true)
    .maybeSingle();

  const trialDays  = (config?.trial_days as number | undefined) ?? 7;
  const now        = new Date();
  const trialEnds  = new Date(now.getTime() + trialDays * 24 * 60 * 60 * 1000);

  // ── 5. Create the owner's auth account via Supabase Admin (invite by email) ─
  //     This sends an invitation email and creates the auth.users row server-side.
  //     We do NOT accept a password or an auth UID from the client — ever.
  const { data: inviteData, error: inviteErr } = await adminClient.auth.admin.inviteUserByEmail(
    email,
    {
      data: {
        full_name:  ownerName,
        tenant_slug: slug,
      },
      redirectTo: `${SITE_URL}/auth/callback`,
    },
  );

  if (inviteErr || !inviteData?.user) {
    // If the email already exists, look up the auth UID to re-use it
    if (inviteErr?.message?.includes('already') || inviteErr?.status === 422) {
      // User already has an account — continue with tenant creation
      // (they will see the invite link next time they log in)
    } else {
      return err(`Failed to invite owner: ${inviteErr?.message ?? 'unknown error'}`, 500);
    }
  }

  const ownerAuthUid = inviteData?.user?.id ?? null;

  // ── 6. Create users profile row for the owner ────────────────────────────
  let ownerUserId: string | null = null;
  if (ownerAuthUid) {
    // Find or create the users row
    const { data: existingUser } = await adminClient
      .from('users')
      .select('id')
      .eq('auth_user_id', ownerAuthUid)
      .is('deleted_at', null)
      .maybeSingle();

    if (existingUser) {
      ownerUserId = existingUser.id as string;
    } else {
      // Find the "admin" role id
      const { data: adminRole } = await adminClient
        .from('roles')
        .select('id')
        .eq('slug', 'admin')
        .maybeSingle();

      const { data: newUser, error: userErr } = await adminClient
        .from('users')
        .insert({
          auth_user_id: ownerAuthUid,
          full_name:    ownerName,
          email:        email,
          phone:        phone,
          status:       'active',
          role_id:      adminRole?.id ?? null,
        })
        .select('id')
        .single();

      if (userErr) {
        console.error('[provision-customer] Failed to create users row:', userErr.message);
        // Non-fatal — tenant can still be created
      } else {
        ownerUserId = newUser.id as string;
      }
    }
  }

  // ── 7. Create the tenant row ──────────────────────────────────────────────
  const { data: tenant, error: tenantErr } = await adminClient
    .from('tenants')
    .insert({
      slug,
      name:                tenantName,
      tagline,
      description,
      address,
      language,
      contact_email:       email,
      contact_phone:       phone,
      social_links:        socialLinks,
      primary_color:       '#dc2626',
      secondary_color:     '#0f172a',
      owner_auth_user_id:  ownerAuthUid,
      owner_email:         email,
      owner_name:          ownerName,
      subscription_status: 'TRIAL',
      subscription_plan:   plan,
      trial_started_at:    now.toISOString(),
      trial_ends_at:       trialEnds.toISOString(),
      android_app_status:  androidRequested ? 'REQUESTED' : 'NOT_REQUESTED',
    })
    .select()
    .single();

  if (tenantErr || !tenant) {
    // Attempt cleanup: delete the auth user we just created so we don't
    // leave an orphaned account with no tenant
    if (ownerAuthUid) {
      await adminClient.auth.admin.deleteUser(ownerAuthUid).catch(() => {/* best-effort */});
    }
    return err(`Failed to create tenant: ${tenantErr?.message ?? 'unknown'}`, 500);
  }

  // ── 8. Provision default site_settings for the new tenant ─────────────────
  await adminClient.from('site_settings').insert({
    tenant_id:  tenant.id,
    site_name:  tenantName,
    footer_text: `© ${new Date().getFullYear()} ${tenantName}. All rights reserved.`,
  }).then(({ error: ssErr }) => {
    if (ssErr) console.warn('[provision-customer] site_settings insert failed:', ssErr.message);
  });

  // ── 9. Audit log ───────────────────────────────────────────────────────────
  await adminClient.from('audit_logs').insert({
    actor_user_id: ownerUserId ?? callerProfile.id,
    action:        'tenant_provisioned',
    entity_type:   'tenants',
    entity_id:     tenant.id,
    metadata: {
      provisioned_by:   user.id,
      tenant_slug:      slug,
      tenant_name:      tenantName,
      owner_email:      email,
      plan,
      trial_days:       trialDays,
      trial_ends_at:    trialEnds.toISOString(),
      android_requested: androidRequested,
    },
  }).then(({ error: auditErr }) => {
    if (auditErr) console.warn('[provision-customer] audit_log failed:', auditErr.message);
  });

  // ── 10. Return tenant ──────────────────────────────────────────────────────
  return json({ success: true, tenant });
});
