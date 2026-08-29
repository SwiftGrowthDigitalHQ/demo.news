/** DEMO DATA — Single canonical source for the SangTX demo tenant. All content is fictional. */
import type {
  PublicCategory, PublicArticle, BreakingHeadline, SiteSettings, AdvertisementPlacement,
} from './cms';
import type {
  AdminReporter, AdminMediaItem, AdminAd, BreakingNewsRow,
  NotificationRow, SeoSetting, AdminUser, AdminRole, AuditLogRow,
  AnalyticsEventRow, SubscriptionRow,
} from './admin';

// ─── SITE SETTINGS ────────────────────────────────────────────────────────────
export const DEMO_SITE_SETTINGS: SiteSettings = {
  site_name: 'Demo News',
  logo_url: null,
  contact_name: 'Demo Newsroom',
  contact_phone: '+91 98765 00001',
  contact_email: 'demo@sangtx.com',
  social_links: {
    facebook: 'https://facebook.com/',
    twitter: 'https://x.com/',
    instagram: 'https://instagram.com/',
    youtube: 'https://youtube.com/',
    whatsapp: 'https://wa.me/',
  },
  footer_text: 'Demo News is a fictional publication demonstrating the SangTX news platform. All content is sample data.',
  theme_config: {
    primary_color: '#dc2626',
    secondary_color: '#0f172a',
    tagline: 'Trusted. Fast. Independent.',
    site_url: 'https://demo.sangtx.com',
    breaking_ticker: true,
  },
};

// ─── CATEGORIES ───────────────────────────────────────────────────────────────
export const DEMO_CATEGORIES: PublicCategory[] = [
  { id: 'demo-cat-1', name: 'Bihar', slug: 'bihar', description: 'State news, government, and development reporting.', sort_order: 1, is_featured: true, seo_title: 'Bihar News – Demo News', seo_description: 'Latest news and updates from Bihar state.' },
  { id: 'demo-cat-2', name: 'Politics', slug: 'politics', description: 'Elections, parliament, and civic affairs.', sort_order: 2, is_featured: true, seo_title: 'Politics News – Demo News', seo_description: 'Political news, analysis and election coverage.' },
  { id: 'demo-cat-3', name: 'Crime', slug: 'crime', description: 'Police, courts, and public safety reporting.', sort_order: 3, is_featured: true, seo_title: 'Crime News – Demo News', seo_description: 'Crime and public safety reporting.' },
  { id: 'demo-cat-4', name: 'Education', slug: 'education', description: 'Schools, exams, results and student news.', sort_order: 4, is_featured: true, seo_title: 'Education News – Demo News', seo_description: 'Education news and exam updates.' },
  { id: 'demo-cat-5', name: 'Sports', slug: 'sports', description: 'Cricket, football, kabaddi and athletics.', sort_order: 5, is_featured: false, seo_title: 'Sports News – Demo News', seo_description: 'Sports results and match coverage.' },
  { id: 'demo-cat-6', name: 'Technology', slug: 'technology', description: 'Digital innovation and technology news.', sort_order: 6, is_featured: false, seo_title: 'Technology News – Demo News', seo_description: 'Technology and digital innovation news.' },
  { id: 'demo-cat-7', name: 'Business', slug: 'business', description: 'Markets, commerce and entrepreneurship.', sort_order: 7, is_featured: false, seo_title: 'Business News – Demo News', seo_description: 'Business and market news.' },
  { id: 'demo-cat-8', name: 'Entertainment', slug: 'entertainment', description: 'Cinema, music, and cultural events.', sort_order: 8, is_featured: false, seo_title: 'Entertainment News – Demo News', seo_description: 'Entertainment and culture news.' },
  { id: 'demo-cat-9', name: 'Health', slug: 'health', description: 'Healthcare, medicine and wellness.', sort_order: 9, is_featured: false, seo_title: 'Health News – Demo News', seo_description: 'Health and wellness news.' },
  { id: 'demo-cat-10', name: 'National', slug: 'national', description: 'News from across India.', sort_order: 10, is_featured: false, seo_title: 'National News – Demo News', seo_description: 'National news and updates from India.' },
];

// ─── REPORTERS ────────────────────────────────────────────────────────────────
export const DEMO_REPORTERS: AdminReporter[] = [
  { id: 'demo-rep-1', full_name: 'Priya Sharma', slug: 'priya-sharma', bio: 'Senior political correspondent covering Bihar assembly and Lok Sabha elections.', specialty: 'Politics', avatar_url: null, status: 'active', social_links: { twitter: 'https://x.com/', facebook: 'https://facebook.com/' }, user_id: 'demo-user-3', created_at: '2026-01-10T09:00:00Z', updated_at: '2026-01-10T09:00:00Z', deleted_at: null, email: 'priya@demo.sangtx.com', role_slug: 'reporter' },
  { id: 'demo-rep-2', full_name: 'Rajesh Kumar', slug: 'rajesh-kumar', bio: 'Crime and courts reporter with 8 years of field experience across Bihar districts.', specialty: 'Crime', avatar_url: null, status: 'active', social_links: { twitter: 'https://x.com/' }, user_id: 'demo-user-4', created_at: '2026-01-15T09:00:00Z', updated_at: '2026-01-15T09:00:00Z', deleted_at: null, email: 'rajesh@demo.sangtx.com', role_slug: 'reporter' },
  { id: 'demo-rep-3', full_name: 'Ananya Singh', slug: 'ananya-singh', bio: 'Education and health desk reporter, focused on rural Bihar communities and public services.', specialty: 'Education', avatar_url: null, status: 'active', social_links: { facebook: 'https://facebook.com/' }, user_id: 'demo-user-5', created_at: '2026-02-01T09:00:00Z', updated_at: '2026-02-01T09:00:00Z', deleted_at: null, email: 'ananya@demo.sangtx.com', role_slug: 'reporter' },
  { id: 'demo-rep-4', full_name: 'Vikram Pandey', slug: 'vikram-pandey', bio: 'Business and technology correspondent, tracking startups, digital trends and market news.', specialty: 'Technology', avatar_url: null, status: 'active', social_links: { twitter: 'https://x.com/', instagram: 'https://instagram.com/' }, user_id: 'demo-user-6', created_at: '2026-02-15T09:00:00Z', updated_at: '2026-02-15T09:00:00Z', deleted_at: null, email: 'vikram@demo.sangtx.com', role_slug: 'reporter' },
  { id: 'demo-rep-5', full_name: 'Sunita Devi', slug: 'sunita-devi', bio: 'Sports reporter covering Bihar cricket, kabaddi and district athletics tournaments.', specialty: 'Sports', avatar_url: null, status: 'active', social_links: { facebook: 'https://facebook.com/' }, user_id: null, created_at: '2026-03-01T09:00:00Z', updated_at: '2026-03-01T09:00:00Z', deleted_at: null, email: 'sunita@demo.sangtx.com', role_slug: 'reporter' },
];

// ─── ROLES ────────────────────────────────────────────────────────────────────
export const DEMO_ROLES: AdminRole[] = [
  { id: 'demo-role-1', name: 'Super Admin', slug: 'super_admin', description: 'Full unrestricted access to all platform features.', is_system: true, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z', deleted_at: null, user_count: 1 },
  { id: 'demo-role-2', name: 'Admin', slug: 'admin', description: 'Operational administration access.', is_system: true, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z', deleted_at: null, user_count: 1 },
  { id: 'demo-role-3', name: 'Editor', slug: 'editor', description: 'Content editing and publishing access.', is_system: true, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z', deleted_at: null, user_count: 1 },
  { id: 'demo-role-4', name: 'Reporter', slug: 'reporter', description: 'Reporter article submission access.', is_system: true, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z', deleted_at: null, user_count: 4 },
];

// ─── USERS ────────────────────────────────────────────────────────────────────
export const DEMO_USERS: AdminUser[] = [
  { id: 'demo-user-1', auth_user_id: null, role_id: 'demo-role-1', full_name: 'Demo Super Admin', email: 'superadmin@demo.sangtx.com', avatar_url: null, phone: null, bio: 'Platform administrator for Demo News.', status: 'active', last_login_at: '2026-08-12T10:00:00Z', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-08-12T10:00:00Z', deleted_at: null, role_name: 'Super Admin', role_slug: 'super_admin' },
  { id: 'demo-user-2', auth_user_id: null, role_id: 'demo-role-3', full_name: 'Mohan Tiwari', email: 'editor@demo.sangtx.com', avatar_url: null, phone: null, bio: 'Managing Editor of Demo News.', status: 'active', last_login_at: '2026-08-11T14:30:00Z', created_at: '2026-01-05T00:00:00Z', updated_at: '2026-08-11T14:30:00Z', deleted_at: null, role_name: 'Editor', role_slug: 'editor' },
  { id: 'demo-user-3', auth_user_id: null, role_id: 'demo-role-4', full_name: 'Priya Sharma', email: 'priya@demo.sangtx.com', avatar_url: null, phone: null, bio: 'Political reporter.', status: 'active', last_login_at: '2026-08-10T11:00:00Z', created_at: '2026-01-10T00:00:00Z', updated_at: '2026-08-10T11:00:00Z', deleted_at: null, role_name: 'Reporter', role_slug: 'reporter' },
  { id: 'demo-user-4', auth_user_id: null, role_id: 'demo-role-4', full_name: 'Rajesh Kumar', email: 'rajesh@demo.sangtx.com', avatar_url: null, phone: null, bio: 'Crime reporter.', status: 'active', last_login_at: '2026-08-09T08:00:00Z', created_at: '2026-01-15T00:00:00Z', updated_at: '2026-08-09T08:00:00Z', deleted_at: null, role_name: 'Reporter', role_slug: 'reporter' },
  { id: 'demo-user-5', auth_user_id: null, role_id: 'demo-role-4', full_name: 'Ananya Singh', email: 'ananya@demo.sangtx.com', avatar_url: null, phone: null, bio: 'Education reporter.', status: 'active', last_login_at: '2026-08-08T09:00:00Z', created_at: '2026-02-01T00:00:00Z', updated_at: '2026-08-08T09:00:00Z', deleted_at: null, role_name: 'Reporter', role_slug: 'reporter' },
  { id: 'demo-user-6', auth_user_id: null, role_id: 'demo-role-4', full_name: 'Vikram Pandey', email: 'vikram@demo.sangtx.com', avatar_url: null, phone: null, bio: 'Technology reporter.', status: 'active', last_login_at: '2026-08-07T16:00:00Z', created_at: '2026-02-15T00:00:00Z', updated_at: '2026-08-07T16:00:00Z', deleted_at: null, role_name: 'Reporter', role_slug: 'reporter' },
];
