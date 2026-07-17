# Production Deployment Checklist

Scope: checklist for taking this newsroom CMS live after the blocker-fix pass.

## 1. Supabase Setup

- Create or confirm the target Supabase project.
- Run `supabase/migrations/20260613000100_initial_schema.sql`.
- Confirm the `media` bucket is created automatically.
- Confirm storage policies allow read, upload, update, and delete for the intended newsroom roles.
- Confirm analytics and newsletter RPCs exist:
  - `track_analytics_event`
  - `create_newsletter_subscription`

## 2. Migration Execution

- Run the migration on the production database.
- Verify the schema includes tables, indexes, constraints, triggers, and RLS policies.
- Verify seed/demo SQL is not executed in production unless explicitly desired.

## 3. Storage Bucket Verification

- Confirm `media` is public for read access.
- Confirm uploads succeed for authorized admin/editor/reporters.
- Confirm file deletes remove the object and soft-delete the row.
- Confirm public readers cannot write objects.

## 4. Environment Variables

Required frontend variables:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_SITE_URL`

Optional deployment variables:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

## 5. Domain Setup

- Point the production domain at the deployed host.
- Update DNS records.
- Confirm canonical URLs and sitemap URLs use the production domain.

## 6. SSL Verification

- Confirm the production domain serves over HTTPS.
- Confirm the certificate is valid.
- Confirm mixed-content warnings do not appear.

## 7. Post-Deploy Verification

- Verify the homepage loads.
- Verify article, category, search, login, and admin routes return successfully.
- Verify `robots.txt` and `sitemap.xml` are reachable.
- Verify admin authentication works with a real production user.
