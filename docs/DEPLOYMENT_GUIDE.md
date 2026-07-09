# Deployment Guide

This project is a single-tenant newsroom CMS. Deploy one clone per customer, then rebrand it through `site_settings.theme_config` and the top-level site settings record.

## 1. Supabase Setup

1. Create a Supabase project.
2. Run the SQL migration in `supabase/migrations/20260613000100_initial_schema.sql`.
3. Confirm the following objects exist:
   - Tables for articles, categories, media, reporters, users, roles, ads, SEO, notifications, settings, subscriptions, audit logs, and analytics
   - RLS policies
   - The `search_articles` RPC
4. Create a `media` storage bucket and make it public if you want media previews to render from direct URLs.

## 2. Environment Variables

### Frontend

Set these in Vercel and in local development:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

### Demo Seeder

Use these only for the seed script:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

### Optional

If you use a separate deployment URL for links or metadata, keep it inside the site settings record rather than hardcoding it in components.

## 3. Local Verification

1. Install dependencies.
2. Run the app locally.
3. Confirm the homepage, article page, category page, search page, and admin dashboard render with live Supabase data.
4. Run the demo seed command if the database is empty:

```bash
npm run seed:demo
```

## 4. Vercel Deployment

1. Import the repository into Vercel.
2. Set the build command to `npm run build`.
3. Set the output directory to `dist`.
4. Add the frontend environment variables listed above.
5. Deploy the project.

If you use preview deployments, make sure each preview has the same Supabase environment variables so the app can still render data.

## 5. Domain Connection

1. Add the custom domain in Vercel.
2. Update DNS records as Vercel instructs.
3. Wait for DNS propagation.
4. Verify the domain loads the public homepage and the admin login path.

## 6. Post-Deploy Checklist

- Homepage loads with branding from `site_settings`
- Article pages resolve by slug
- Category pages resolve by slug
- Search page returns results
- Admin dashboard loads after authentication
- Media previews render from Supabase Storage URLs
- Demo seed command is not run on production unless you explicitly want demo content

## 7. Rebranding Flow

To rebrand a clone for a new customer, update only the single branding record:

- `site_name`
- `logo_url`
- `favicon`
- `primary_color`
- `secondary_color`
- `contact_email`
- `contact_phone`
- `social_links`

That is enough to change the visual identity across the shell without changing layout or routes.
