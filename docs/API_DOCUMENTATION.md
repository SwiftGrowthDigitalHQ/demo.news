# API Documentation

Scope: this project uses Supabase directly from the frontend. The app does not expose a custom server API layer.

## Authentication

### Sign In
- Method: `supabase.auth.signInWithPassword`
- Input:
```json
{ "email": "admin@example.com", "password": "secret" }
```
- Output: Supabase session payload
- Auth: email and password

### Sign Out
- Method: `supabase.auth.signOut`
- Output: void
- Auth: active session

### Forgot Password
- Method: `supabase.auth.resetPasswordForEmail`
- Input:
```json
{ "email": "admin@example.com" }
```
- Output: reset email dispatch status
- Auth: none

### Reset Password
- Method: `supabase.auth.updateUser`
- Input:
```json
{ "password": "new-password" }
```
- Output: updated auth user
- Auth: password reset session

## Public Content Queries

### Load Site Settings
- Table: `site_settings`
- Query: latest row with `deleted_at is null`
- Auth: public read

### Load Navigation Categories
- Table: `categories`
- Query: active categories ordered by `sort_order`
- Auth: public read

### Load Breaking News
- Table: `breaking_news`
- Query: active items with schedule checks
- Auth: public read

### Load Homepage Articles
- Table: `articles`
- Query: published rows joined with `categories`, `users`, and `article_tags`
- Auth: public read

### Search Articles
- RPC: `search_articles(search_term, result_limit, result_offset)`
- Returns:
  - `id`
  - `slug`
  - `title`
  - `excerpt`
  - `category_slug`
  - `category_name`
  - `author_name`
  - `author_role`
  - `publish_at`
  - `read_time`
  - `featured_image`
  - `featured`
  - `trending`
  - `breaking`
  - `tags`
  - `views_count`
- Auth: public read

## Admin Content Operations

The frontend is built to call Supabase table mutations directly for:
- `articles`
- `categories`
- `media`
- `reporters`
- `breaking_news`
- `advertisements`
- `campaigns`
- `notifications`
- `seo_settings`
- `site_settings`
- `subscriptions`
- `payments`
- `audit_logs`

Access is controlled by RLS policies and role permissions in the migration.

## Storage

Media uploads are intended to use Supabase Storage bucket `media`.

Expected operations:
- Upload image
- Delete image
- Select featured image
- Read metadata

Allowed file types:
- `jpg`
- `png`
- `webp`

