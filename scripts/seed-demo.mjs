import { createClient } from '@supabase/supabase-js';
import {
  DEMO_ADVERTISEMENTS,
  DEMO_ARTICLES,
  DEMO_BREAKING_NEWS,
  DEMO_CATEGORIES,
  DEMO_REPORTERS,
  DEMO_SITE_SETTINGS,
} from './demo-content.mjs';

function env(...keys) {
  for (const key of keys) {
    const value = process.env[key];
    if (value) return value;
  }
  return '';
}

const url = env('SUPABASE_URL', 'VITE_SUPABASE_URL');
const serviceRoleKey = env('SUPABASE_SERVICE_ROLE_KEY');

if (!url || !serviceRoleKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

const supabase = createClient(url, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const roleSlugs = ['super_admin', 'admin', 'editor', 'reporter'];
const { data: roles, error: rolesError } = await supabase.from('roles').select('id, slug').in('slug', roleSlugs);
if (rolesError) {
  console.error('Failed to load roles:', rolesError.message);
  process.exit(1);
}

const roleIdBySlug = Object.fromEntries((roles ?? []).map(role => [role.slug, role.id]));
for (const slug of roleSlugs) {
  if (!roleIdBySlug[slug]) {
    console.error(`Missing role in database: ${slug}. Run the schema migration first.`);
    process.exit(1);
  }
}

const demoUsers = [
  { id: 'demo-user-admin', full_name: 'Newsroom Admin', email: 'admin@newsroom.local', role_slug: 'super_admin', bio: 'Demo newsroom administrator' },
  ...DEMO_REPORTERS.map((reporter, index) => ({
    id: `demo-user-${index + 1}`,
    full_name: reporter.full_name,
    email: `${reporter.slug}@newsroom.local`,
    role_slug: 'reporter',
    bio: reporter.bio,
  })),
].map(user => ({
  id: user.id,
  auth_user_id: null,
  role_id: roleIdBySlug[user.role_slug],
  full_name: user.full_name,
  email: user.email,
  avatar_url: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.full_name)}`,
  phone: null,
  bio: user.bio,
  status: 'active',
  last_login_at: new Date().toISOString(),
}));

let result = await supabase.from('users').upsert(demoUsers, { onConflict: 'id' }).select('id');
if (result.error) {
  console.error('Failed to seed users:', result.error.message);
  process.exit(1);
}

const usersById = Object.fromEntries(demoUsers.map(user => [user.id, user]));

const reporters = DEMO_REPORTERS.map((reporter, index) => ({
  id: `demo-reporter-${index + 1}`,
  full_name: reporter.full_name,
  slug: reporter.slug,
  bio: reporter.bio,
  specialty: reporter.role,
  avatar_url: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(reporter.full_name)}`,
  status: 'active',
  social_links: {
    facebook: `https://facebook.com/${reporter.slug}`,
    x: `https://x.com/${reporter.slug}`,
  },
  user_id: usersById[`demo-user-${index + 1}`]?.id ?? null,
}));

result = await supabase.from('reporters').upsert(reporters, { onConflict: 'id' }).select('id');
if (result.error) {
  console.error('Failed to seed reporters:', result.error.message);
  process.exit(1);
}

result = await supabase.from('categories').upsert(DEMO_CATEGORIES, { onConflict: 'id' }).select('id');
if (result.error) {
  console.error('Failed to seed categories:', result.error.message);
  process.exit(1);
}

result = await supabase.from('articles').upsert(
  DEMO_ARTICLES.map(article => ({
    id: article.id,
    category_id: article.category_id,
    author_id: article.author_id,
    title: article.title,
    slug: article.slug,
    excerpt: article.excerpt,
    content: article.content,
    featured_image: article.featured_image,
    seo_title: article.seo_title,
    seo_description: article.seo_description,
    status: article.status,
    featured: article.featured,
    trending: article.trending,
    breaking: article.breaking,
    publish_at: article.publish_at,
    read_time: article.read_time,
    views_count: article.views_count,
    media_type: article.media_type,
    video_url: article.video_url,
  })),
  { onConflict: 'id' },
).select('id');
if (result.error) {
  console.error('Failed to seed articles:', result.error.message);
  process.exit(1);
}

const articleIds = DEMO_ARTICLES.map(article => article.id);
const { error: tagDeleteError } = await supabase.from('article_tags').delete().in('article_id', articleIds);
if (tagDeleteError) {
  console.error('Failed to clear article tags:', tagDeleteError.message);
  process.exit(1);
}

const articleTags = DEMO_ARTICLES.flatMap(article => article.tags.map(tag => ({
  id: `${article.id}-${tag}`.replace(/[^a-z0-9-]+/gi, '-').toLowerCase(),
  article_id: article.id,
  tag,
})));

result = await supabase.from('article_tags').upsert(articleTags, { onConflict: 'id' }).select('id');
if (result.error) {
  console.error('Failed to seed article tags:', result.error.message);
  process.exit(1);
}

result = await supabase.from('breaking_news').upsert(DEMO_BREAKING_NEWS, { onConflict: 'id' }).select('id');
if (result.error) {
  console.error('Failed to seed breaking news:', result.error.message);
  process.exit(1);
}

result = await supabase.from('advertisements').upsert(DEMO_ADVERTISEMENTS, { onConflict: 'id' }).select('id');
if (result.error) {
  console.error('Failed to seed advertisements:', result.error.message);
  process.exit(1);
}

result = await supabase.from('site_settings').upsert(DEMO_SITE_SETTINGS, { onConflict: 'id' }).select('id');
if (result.error) {
  console.error('Failed to seed site settings:', result.error.message);
  process.exit(1);
}

console.log('Demo seed completed successfully.');
console.log(`Seeded: ${DEMO_CATEGORIES.length} categories, ${demoUsers.length} users, ${reporters.length} reporters, ${DEMO_ARTICLES.length} articles, ${DEMO_BREAKING_NEWS.length} breaking items, ${DEMO_ADVERTISEMENTS.length} ads.`);
