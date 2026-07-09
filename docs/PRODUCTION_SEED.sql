-- Production seed for the newsroom CMS.
-- Safe to run multiple times.
-- Assumes the Supabase schema migration has already been applied.
-- If the admin auth user does not exist yet, create it in Supabase Auth first.

begin;

insert into public.roles (id, name, slug, description, is_system)
values
  ('10000000-0000-0000-0000-000000000001', 'Super Admin', 'super_admin', 'Full unrestricted access', true),
  ('10000000-0000-0000-0000-000000000002', 'Admin', 'admin', 'Operational administration access', true),
  ('10000000-0000-0000-0000-000000000003', 'Editor', 'editor', 'Content editing and publishing access', true),
  ('10000000-0000-0000-0000-000000000004', 'Reporter', 'reporter', 'Reporter submission access', true)
on conflict (slug) do update
set
  name = excluded.name,
  description = excluded.description,
  is_system = excluded.is_system,
  updated_at = now();

insert into public.permissions (id, key, name, description)
values
  ('20000000-0000-0000-0000-000000000001', 'manage_users', 'Manage Users', 'Create, edit, and remove users'),
  ('20000000-0000-0000-0000-000000000002', 'manage_roles', 'Manage Roles', 'Manage role assignments'),
  ('20000000-0000-0000-0000-000000000003', 'manage_permissions', 'Manage Permissions', 'Manage access permissions'),
  ('20000000-0000-0000-0000-000000000004', 'manage_articles', 'Manage Articles', 'Create and edit articles'),
  ('20000000-0000-0000-0000-000000000005', 'publish_articles', 'Publish Articles', 'Publish or schedule articles'),
  ('20000000-0000-0000-0000-000000000006', 'manage_categories', 'Manage Categories', 'Create and reorder categories'),
  ('20000000-0000-0000-0000-000000000007', 'manage_media', 'Manage Media', 'Upload and maintain media assets'),
  ('20000000-0000-0000-0000-000000000008', 'manage_breaking_news', 'Manage Breaking News', 'Create and schedule ticker items'),
  ('20000000-0000-0000-0000-000000000009', 'manage_ads', 'Manage Ads', 'Create and maintain campaigns'),
  ('20000000-0000-0000-0000-000000000010', 'manage_notifications', 'Manage Notifications', 'Create and schedule notifications'),
  ('20000000-0000-0000-0000-000000000011', 'manage_seo', 'Manage SEO', 'Edit SEO metadata and structured data'),
  ('20000000-0000-0000-0000-000000000012', 'manage_settings', 'Manage Settings', 'Change site settings'),
  ('20000000-0000-0000-0000-000000000013', 'view_analytics', 'View Analytics', 'See analytics dashboards'),
  ('20000000-0000-0000-0000-000000000014', 'manage_security', 'Manage Security', 'Review audit logs and security settings'),
  ('20000000-0000-0000-0000-000000000015', 'manage_reporters', 'Manage Reporters', 'Create and edit reporter profiles'),
  ('20000000-0000-0000-0000-000000000016', 'manage_subscriptions', 'Manage Subscriptions', 'Review subscribers and payments')
on conflict (key) do update
set
  name = excluded.name,
  description = excluded.description,
  updated_at = now();

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
cross join public.permissions p
where r.slug = 'super_admin'
on conflict do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.key in (
  'manage_users',
  'manage_articles',
  'publish_articles',
  'manage_categories',
  'manage_media',
  'manage_breaking_news',
  'manage_ads',
  'manage_notifications',
  'manage_seo',
  'manage_settings',
  'view_analytics',
  'manage_security',
  'manage_reporters',
  'manage_subscriptions'
)
where r.slug = 'admin'
on conflict do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.key in (
  'manage_articles',
  'publish_articles',
  'manage_categories',
  'manage_media',
  'manage_breaking_news',
  'manage_reporters'
)
where r.slug = 'editor'
on conflict do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.key in (
  'manage_articles',
  'manage_media'
)
where r.slug = 'reporter'
on conflict do nothing;

insert into public.site_settings (
  id,
  site_name,
  logo_url,
  contact_name,
  contact_phone,
  contact_email,
  social_links,
  footer_text,
  theme_config
)
values (
  '30000000-0000-0000-0000-000000000001',
  'Newsroom',
  null,
  'Editorial Office',
  '+91 98765 43210',
  'editorial@newsroom.local',
  jsonb_build_object(
    'facebook', 'https://facebook.com/newsroom',
    'twitter', 'https://x.com/newsroom',
    'instagram', 'https://instagram.com/newsroom',
    'youtube', 'https://youtube.com/@newsroom',
    'whatsapp', 'https://wa.me/919876543210'
  ),
  'Single-tenant newsroom CMS production seed.',
  jsonb_build_object(
    'tagline', 'Bihar Ki Khabar',
    'site_url', 'https://newsroom.local',
    'primary_color', '#dc2626',
    'secondary_color', '#0f172a'
  )
)
on conflict (id) do update
set
  site_name = excluded.site_name,
  logo_url = excluded.logo_url,
  contact_name = excluded.contact_name,
  contact_phone = excluded.contact_phone,
  contact_email = excluded.contact_email,
  social_links = excluded.social_links,
  footer_text = excluded.footer_text,
  theme_config = excluded.theme_config,
  updated_at = now();

insert into public.categories (
  id,
  name,
  slug,
  description,
  sort_order,
  is_featured,
  seo_title,
  seo_description,
  created_by
)
values
  ('31000000-0000-0000-0000-000000000001', 'Bihar', 'bihar', 'Statewide news, policy, and development updates.', 1, true, 'Bihar News', 'Statewide news, policy, and development updates.', null),
  ('31000000-0000-0000-0000-000000000002', 'Sitamarhi', 'sitamarhi', 'Local district reporting and community updates.', 2, true, 'Sitamarhi News', 'Local district reporting and community updates.', null),
  ('31000000-0000-0000-0000-000000000003', 'Politics', 'politics', 'Election coverage, government decisions, and civic affairs.', 3, true, 'Politics News', 'Election coverage, government decisions, and civic affairs.', null),
  ('31000000-0000-0000-0000-000000000004', 'Crime', 'crime', 'Police, courts, and public safety reporting.', 4, true, 'Crime News', 'Police, courts, and public safety reporting.', null),
  ('31000000-0000-0000-0000-000000000005', 'Education', 'education', 'Schools, exams, results, and student updates.', 5, false, 'Education News', 'Schools, exams, results, and student updates.', null)
on conflict (slug) do update
set
  name = excluded.name,
  description = excluded.description,
  sort_order = excluded.sort_order,
  is_featured = excluded.is_featured,
  seo_title = excluded.seo_title,
  seo_description = excluded.seo_description,
  updated_at = now();

insert into public.users (
  id,
  auth_user_id,
  role_id,
  full_name,
  email,
  avatar_url,
  bio,
  status,
  last_login_at
)
select
  '32000000-0000-0000-0000-000000000001',
  au.id,
  r.id,
  'Newsroom Admin',
  'admin@newsroom.local',
  null,
  'Editorial administrator for the newsroom CMS.',
  'active',
  now()
from public.roles r
left join auth.users au on lower(au.email) = 'admin@newsroom.local'
where r.slug = 'super_admin'
on conflict (email) do update
set
  auth_user_id = excluded.auth_user_id,
  role_id = excluded.role_id,
  full_name = excluded.full_name,
  avatar_url = excluded.avatar_url,
  bio = excluded.bio,
  status = excluded.status,
  last_login_at = excluded.last_login_at,
  updated_at = now();

insert into public.users (
  id,
  auth_user_id,
  role_id,
  full_name,
  email,
  avatar_url,
  bio,
  status,
  last_login_at
)
values
  ('32000000-0000-0000-0000-000000000002', null, (select id from public.roles where slug = 'reporter' limit 1), 'Aman Kumar', 'aman.kumar@newsroom.local', null, 'Political reporting and state affairs.', 'active', now()),
  ('32000000-0000-0000-0000-000000000003', null, (select id from public.roles where slug = 'reporter' limit 1), 'Pooja Kumari', 'pooja.kumari@newsroom.local', null, 'Local district reporting and community updates.', 'active', now()),
  ('32000000-0000-0000-0000-000000000004', null, (select id from public.roles where slug = 'reporter' limit 1), 'Rahul Jha', 'rahul.jha@newsroom.local', null, 'Crime and court reporting.', 'active', now()),
  ('32000000-0000-0000-0000-000000000005', null, (select id from public.roles where slug = 'reporter' limit 1), 'Nidhi Singh', 'nidhi.singh@newsroom.local', null, 'Education and exam coverage.', 'active', now())
on conflict (email) do update
set
  role_id = excluded.role_id,
  full_name = excluded.full_name,
  avatar_url = excluded.avatar_url,
  bio = excluded.bio,
  status = excluded.status,
  last_login_at = excluded.last_login_at,
  updated_at = now();

insert into public.reporters (
  id,
  user_id,
  full_name,
  slug,
  bio,
  specialty,
  avatar_url,
  status,
  social_links
)
values
  ('33000000-0000-0000-0000-000000000001', '32000000-0000-0000-0000-000000000002', 'Aman Kumar', 'aman-kumar', 'Political reporting and state affairs.', 'Politics', null, 'active', jsonb_build_object('facebook', 'https://facebook.com/aman-kumar', 'x', 'https://x.com/aman-kumar')),
  ('33000000-0000-0000-0000-000000000002', '32000000-0000-0000-0000-000000000003', 'Pooja Kumari', 'pooja-kumari', 'Local district reporting and community updates.', 'Local News', null, 'active', jsonb_build_object('facebook', 'https://facebook.com/pooja-kumari', 'x', 'https://x.com/pooja-kumari')),
  ('33000000-0000-0000-0000-000000000003', '32000000-0000-0000-0000-000000000004', 'Rahul Jha', 'rahul-jha', 'Crime and court reporting.', 'Crime', null, 'active', jsonb_build_object('facebook', 'https://facebook.com/rahul-jha', 'x', 'https://x.com/rahul-jha')),
  ('33000000-0000-0000-0000-000000000004', '32000000-0000-0000-0000-000000000005', 'Nidhi Singh', 'nidhi-singh', 'Education and exam coverage.', 'Education', null, 'active', jsonb_build_object('facebook', 'https://facebook.com/nidhi-singh', 'x', 'https://x.com/nidhi-singh'))
on conflict (slug) do update
set
  user_id = excluded.user_id,
  full_name = excluded.full_name,
  bio = excluded.bio,
  specialty = excluded.specialty,
  avatar_url = excluded.avatar_url,
  status = excluded.status,
  social_links = excluded.social_links,
  updated_at = now();

insert into public.articles (
  id,
  category_id,
  author_id,
  title,
  slug,
  excerpt,
  content,
  featured_image,
  seo_title,
  seo_description,
  status,
  featured,
  trending,
  breaking,
  publish_at,
  scheduled_at,
  read_time,
  views_count,
  media_type,
  video_url
)
values
  (
    '34000000-0000-0000-0000-000000000001',
    '31000000-0000-0000-0000-000000000001',
    '32000000-0000-0000-0000-000000000002',
    'Bihar launches district development review',
    'bihar-launches-district-development-review',
    'Officials announced a new district review process focused on roads, health, and local administration.',
    jsonb_build_array(
      'The state has launched a district development review to track priority projects and public service delivery.',
      'The newsroom seed uses this story to populate the homepage, category pages, and article detail pages with realistic content.',
      'Editors can replace this article with live reporting after production launch.'
    ),
    null,
    'Bihar launches district development review | Newsroom',
    'Officials announced a new district review process focused on roads, health, and local administration.',
    'published',
    true,
    true,
    false,
    now() - interval '1 day',
    null,
    '4 min read',
    1825,
    'article',
    null
  ),
  (
    '34000000-0000-0000-0000-000000000002',
    '31000000-0000-0000-0000-000000000002',
    '32000000-0000-0000-0000-000000000003',
    'Sitamarhi traffic plan revised before festival season',
    'sitamarhi-traffic-plan-revised-before-festival-season',
    'The local administration updated traffic routes and parking guidance ahead of the festival rush.',
    jsonb_build_array(
      'New parking zones and diversions were announced to reduce congestion in busy market areas.',
      'The update gives the homepage and category page enough live content to render without fallback demo rows.'
    ),
    null,
    'Sitamarhi traffic plan revised before festival season | Newsroom',
    'The local administration updated traffic routes and parking guidance ahead of the festival rush.',
    'published',
    false,
    true,
    false,
    now() - interval '18 hours',
    null,
    '3 min read',
    1410,
    'article',
    null
  ),
  (
    '34000000-0000-0000-0000-000000000003',
    '31000000-0000-0000-0000-000000000003',
    '32000000-0000-0000-0000-000000000002',
    'Opposition questions budget allocation in state assembly',
    'opposition-questions-budget-allocation-in-state-assembly',
    'Lawmakers debated whether the latest budget fully addresses infrastructure and public health needs.',
    jsonb_build_array(
      'Assembly members raised questions about allocation priorities and the rollout timeline for key projects.',
      'This record creates a realistic political story for dashboard cards and public article pages.'
    ),
    null,
    'Opposition questions budget allocation in state assembly | Newsroom',
    'Lawmakers debated whether the latest budget fully addresses infrastructure and public health needs.',
    'published',
    false,
    true,
    false,
    now() - interval '14 hours',
    null,
    '5 min read',
    1688,
    'article',
    null
  ),
  (
    '34000000-0000-0000-0000-000000000004',
    '31000000-0000-0000-0000-000000000004',
    '32000000-0000-0000-0000-000000000004',
    'Police announce action after night robbery case',
    'police-announce-action-after-night-robbery-case',
    'Officials say they have identified suspects after a late-night robbery in the district.',
    jsonb_build_array(
      'Investigators are reviewing CCTV footage and witness statements as the case moves forward.',
      'This story supports the crime category and gives the breaking-news ticker a matching article.'
    ),
    null,
    'Police announce action after night robbery case | Newsroom',
    'Officials say they have identified suspects after a late-night robbery in the district.',
    'published',
    false,
    false,
    true,
    now() - interval '9 hours',
    null,
    '4 min read',
    2204,
    'article',
    null
  ),
  (
    '34000000-0000-0000-0000-000000000005',
    '31000000-0000-0000-0000-000000000005',
    '32000000-0000-0000-0000-000000000005',
    'Schools release exam schedule and scholarship updates',
    'schools-release-exam-schedule-and-scholarship-updates',
    'Education authorities published dates for the next examination cycle and scholarship deadlines.',
    jsonb_build_array(
      'Teachers and administrators are sharing the updated calendar with students and parents.',
      'The seed content mirrors a realistic education desk workflow for the public site.'
    ),
    null,
    'Schools release exam schedule and scholarship updates | Newsroom',
    'Education authorities published dates for the next examination cycle and scholarship deadlines.',
    'published',
    false,
    false,
    false,
    now() - interval '7 hours',
    null,
    '3 min read',
    1092,
    'article',
    null
  ),
  (
    '34000000-0000-0000-0000-000000000006',
    '31000000-0000-0000-0000-000000000001',
    '32000000-0000-0000-0000-000000000003',
    'Job fair draws strong attendance from local youth',
    'job-fair-draws-strong-attendance-from-local-youth',
    'A district job fair attracted students and first-time job seekers from across the region.',
    jsonb_build_array(
      'Organizers said the turnout exceeded expectations and several employers collected applications.',
      'This article keeps the business and development coverage active in the newsroom CMS.'
    ),
    null,
    'Job fair draws strong attendance from local youth | Newsroom',
    'A district job fair attracted students and first-time job seekers from across the region.',
    'published',
    true,
    false,
    false,
    now() - interval '4 hours',
    null,
    '4 min read',
    875,
    'article',
    null
  ),
  (
    '34000000-0000-0000-0000-000000000007',
    '31000000-0000-0000-0000-000000000002',
    '32000000-0000-0000-0000-000000000002',
    'Cricket academy opens new training center',
    'cricket-academy-opens-new-training-center',
    'The academy added new pitches and coaching slots for younger players.',
    jsonb_build_array(
      'Local sports coverage benefits from a second public article and a visible hero candidate.',
      'This content can be swapped for live match reporting once the newsroom begins publishing.'
    ),
    null,
    'Cricket academy opens new training center | Newsroom',
    'The academy added new pitches and coaching slots for younger players.',
    'draft',
    false,
    false,
    false,
    now() - interval '3 hours',
    null,
    '3 min read',
    140,
    'article',
    null
  ),
  (
    '34000000-0000-0000-0000-000000000008',
    '31000000-0000-0000-0000-000000000001',
    '32000000-0000-0000-0000-000000000004',
    'Local business group reports steady growth',
    'local-business-group-reports-steady-growth',
    'Small businesses say order volume and hiring have improved over the last quarter.',
    jsonb_build_array(
      'This story gives the homepage another varied article card and fills the business-development slot.',
      'It also provides enough data for the dashboard to show non-empty article counts and views.'
    ),
    null,
    'Local business group reports steady growth | Newsroom',
    'Small businesses say order volume and hiring have improved over the last quarter.',
    'published',
    false,
    false,
    false,
    now() - interval '90 minutes',
    null,
    '3 min read',
    620,
    'article',
    null
  )
on conflict (slug) do update
set
  category_id = excluded.category_id,
  author_id = excluded.author_id,
  title = excluded.title,
  excerpt = excluded.excerpt,
  content = excluded.content,
  featured_image = excluded.featured_image,
  seo_title = excluded.seo_title,
  seo_description = excluded.seo_description,
  status = excluded.status,
  featured = excluded.featured,
  trending = excluded.trending,
  breaking = excluded.breaking,
  publish_at = excluded.publish_at,
  scheduled_at = excluded.scheduled_at,
  read_time = excluded.read_time,
  views_count = excluded.views_count,
  media_type = excluded.media_type,
  video_url = excluded.video_url,
  deleted_at = null,
  updated_at = now();

delete from public.article_tags
where article_id in (
  '34000000-0000-0000-0000-000000000001',
  '34000000-0000-0000-0000-000000000002',
  '34000000-0000-0000-0000-000000000003',
  '34000000-0000-0000-0000-000000000004',
  '34000000-0000-0000-0000-000000000005',
  '34000000-0000-0000-0000-000000000006',
  '34000000-0000-0000-0000-000000000007',
  '34000000-0000-0000-0000-000000000008'
);

insert into public.article_tags (id, article_id, tag)
values
  ('35000000-0000-0000-0000-000000000001', '34000000-0000-0000-0000-000000000001', 'Bihar'),
  ('35000000-0000-0000-0000-000000000002', '34000000-0000-0000-0000-000000000001', 'Development'),
  ('35000000-0000-0000-0000-000000000003', '34000000-0000-0000-0000-000000000002', 'Sitamarhi'),
  ('35000000-0000-0000-0000-000000000004', '34000000-0000-0000-0000-000000000002', 'Traffic'),
  ('35000000-0000-0000-0000-000000000005', '34000000-0000-0000-0000-000000000003', 'Politics'),
  ('35000000-0000-0000-0000-000000000006', '34000000-0000-0000-0000-000000000004', 'Crime'),
  ('35000000-0000-0000-0000-000000000007', '34000000-0000-0000-0000-000000000005', 'Education'),
  ('35000000-0000-0000-0000-000000000008', '34000000-0000-0000-0000-000000000006', 'Jobs'),
  ('35000000-0000-0000-0000-000000000009', '34000000-0000-0000-0000-000000000007', 'Sports'),
  ('35000000-0000-0000-0000-000000000010', '34000000-0000-0000-0000-000000000008', 'Business')
on conflict (article_id, tag) do update
set tag = excluded.tag;

insert into public.breaking_news (
  id,
  headline,
  link_url,
  is_active,
  starts_at,
  ends_at,
  sort_order,
  created_by
)
values
  ('36000000-0000-0000-0000-000000000001', 'Breaking: Bihar review panel meets on district projects', '/article/bihar-launches-district-development-review', true, now() - interval '2 hours', null, 1, '32000000-0000-0000-0000-000000000001'),
  ('36000000-0000-0000-0000-000000000002', 'Sitamarhi traffic restrictions announced for festival week', '/article/sitamarhi-traffic-plan-revised-before-festival-season', true, now() - interval '90 minutes', null, 2, '32000000-0000-0000-0000-000000000001'),
  ('36000000-0000-0000-0000-000000000003', 'Police report progress in robbery investigation', '/article/police-announce-action-after-night-robbery-case', true, now() - interval '60 minutes', null, 3, '32000000-0000-0000-0000-000000000001')
on conflict (id) do update
set
  headline = excluded.headline,
  link_url = excluded.link_url,
  is_active = excluded.is_active,
  starts_at = excluded.starts_at,
  ends_at = excluded.ends_at,
  sort_order = excluded.sort_order,
  created_by = excluded.created_by,
  updated_at = now();

insert into public.advertisements (
  id,
  campaign_id,
  placement,
  ad_type,
  advertiser_name,
  title,
  target_url,
  banner_url,
  position,
  start_date,
  end_date,
  click_count,
  impression_count,
  is_active
)
values
  ('37000000-0000-0000-0000-000000000001', null, 'header', 'adsense', 'Google AdSense', 'Google AdSense Advertisement', 'https://ads.google.com', null, '728x90', null, null, 0, 0, true),
  ('37000000-0000-0000-0000-000000000002', null, 'sidebar', 'adsense', 'Google AdSense', 'Google AdSense Advertisement', 'https://ads.google.com', null, '300x250', null, null, 0, 0, true),
  ('37000000-0000-0000-0000-000000000003', null, 'hero', 'direct', 'Sitamarhi Hospital Network', '24x7 Emergency and ICU Care', 'https://example.com/patna-hospital', null, '728x90', null, null, 0, 0, true),
  ('37000000-0000-0000-0000-000000000004', null, 'category', 'direct', 'Local Education Partner', 'Admissions Open for the New Batch', 'https://example.com/coaching', null, '300x250', null, null, 0, 0, true)
on conflict (id) do update
set
  campaign_id = excluded.campaign_id,
  placement = excluded.placement,
  ad_type = excluded.ad_type,
  advertiser_name = excluded.advertiser_name,
  title = excluded.title,
  target_url = excluded.target_url,
  banner_url = excluded.banner_url,
  position = excluded.position,
  start_date = excluded.start_date,
  end_date = excluded.end_date,
  click_count = excluded.click_count,
  impression_count = excluded.impression_count,
  is_active = excluded.is_active,
  deleted_at = null,
  updated_at = now();

insert into public.audit_logs (
  id,
  actor_user_id,
  action,
  entity_type,
  entity_id,
  metadata,
  ip_address
)
values (
  '38000000-0000-0000-0000-000000000001',
  '32000000-0000-0000-0000-000000000001',
  'content.seeded',
  'seed_bundle',
  null,
  jsonb_build_object(
    'seed', 'production',
    'articles', 8,
    'categories', 5,
    'reporters', 4,
    'ads', 4,
    'breaking_news', 3
  ),
  null
)
on conflict (id) do update
set
  actor_user_id = excluded.actor_user_id,
  action = excluded.action,
  entity_type = excluded.entity_type,
  entity_id = excluded.entity_id,
  metadata = excluded.metadata,
  ip_address = excluded.ip_address;

commit;
