import { Bell, Search, Sun, Moon, Menu, ChevronDown } from 'lucide-react';
import { useCms } from '../../lib/cms';

interface Props {
  section: string;
  darkMode: boolean;
  onToggleDark: () => void;
  onToggleNotifications?: () => void;
  onToggleSidebar: () => void;
}

const sectionTitles: Record<string, { title: string; breadcrumb: string }> = {
  overview: { title: 'Dashboard Overview', breadcrumb: 'Home / Dashboard' },
  analytics: { title: 'Analytics & Reports', breadcrumb: 'Home / Analytics' },
  news: { title: 'News Management', breadcrumb: 'Home / News' },
  categories: { title: 'Categories', breadcrumb: 'Home / Categories' },
  breaking: { title: 'Breaking News Control', breadcrumb: 'Home / Breaking News' },
  media: { title: 'Media Library', breadcrumb: 'Home / Media' },
  journalists: { title: 'Journalist Management', breadcrumb: 'Home / Journalists' },
  users: { title: 'User & Role Management', breadcrumb: 'Home / Users' },
  roles: { title: 'Role Management', breadcrumb: 'Home / Roles' },
  ads: { title: 'Advertisement Management', breadcrumb: 'Home / Ads' },
  subscriptions: { title: 'Subscription System', breadcrumb: 'Home / Subscriptions' },
  seo: { title: 'SEO Management', breadcrumb: 'Home / SEO' },
  notifications: { title: 'Notifications', breadcrumb: 'Home / Notifications' },
  settings: { title: 'System Settings', breadcrumb: 'Home / Settings' },
  security: { title: 'Security & Audit', breadcrumb: 'Home / Security' },
  reports: { title: 'Reports & Exports', breadcrumb: 'Home / Reports' },
};

export function AdminHeader({ section, darkMode, onToggleDark, onToggleNotifications, onToggleSidebar }: Props) {
  const info = sectionTitles[section] || { title: 'Dashboard', breadcrumb: 'Home' };
  const { siteSettings } = useCms();
  const now = new Date();
  const dateStr = now.toLocaleDateString('hi-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <header
      className="flex items-center gap-4 px-6 border-b dark:bg-gray-800 dark:border-gray-700"
      style={{
        height: 60,
        background: darkMode ? undefined : '#ffffff',
        borderColor: darkMode ? undefined : 'rgba(15,23,42,0.08)',
        flexShrink: 0,
        position: 'sticky',
        top: 0,
        zIndex: 20,
      }}
    >
      <button
        onClick={onToggleSidebar}
        className="flex items-center justify-center rounded-lg dark:text-gray-300 dark:border-gray-600"
        style={{ width: 36, height: 36, color: darkMode ? undefined : '#64748b', border: darkMode ? undefined : '1px solid rgba(15,23,42,0.08)' }}
      >
        <Menu size={18} />
      </button>

      <div className="flex-1">
        <h1 className="dark:text-white" style={{ fontSize: 16, fontWeight: 600, color: darkMode ? undefined : '#0f172a', lineHeight: 1.2 }}>{info.title}</h1>
        <p className="dark:text-gray-400" style={{ fontSize: 11, color: darkMode ? undefined : '#94a3b8' }}>{info.breadcrumb}</p>
      </div>

      <div
        className="hidden md:flex items-center gap-2 rounded-lg px-3 dark:bg-gray-700 dark:border-gray-600"
        style={{ background: darkMode ? undefined : '#f8fafc', border: darkMode ? undefined : '1px solid rgba(15,23,42,0.08)', height: 36 }}
      >
        <Search size={14} style={{ color: '#94a3b8' }} />
        <input
          placeholder="Search articles, journalists..."
          className="dark:text-gray-200 dark:placeholder-gray-400"
          style={{ background: 'transparent', border: 'none', outline: 'none', fontSize: 13, color: darkMode ? undefined : '#64748b', width: 220 }}
        />
      </div>

      <div style={{ fontSize: 11, color: '#94a3b8' }} className="hidden lg:block dark:text-gray-400">{dateStr}</div>

      <div className="flex items-center gap-2">
        <button
          onClick={onToggleDark}
          className="flex items-center justify-center rounded-lg dark:text-yellow-400 dark:border-gray-600"
          style={{ width: 36, height: 36, color: darkMode ? undefined : '#64748b', border: darkMode ? undefined : '1px solid rgba(15,23,42,0.08)' }}
        >
          {darkMode ? <Sun size={16} /> : <Moon size={16} />}
        </button>

        <button
          onClick={onToggleNotifications}
          className="relative flex items-center justify-center rounded-lg dark:text-gray-300 dark:border-gray-600"
          style={{ width: 36, height: 36, color: darkMode ? undefined : '#64748b', border: darkMode ? undefined : '1px solid rgba(15,23,42,0.08)' }}
        >
          <Bell size={16} />
          <span
            className="absolute flex items-center justify-center rounded-full"
            style={{ top: 6, right: 6, width: 8, height: 8, background: '#dc2626', fontSize: 9, color: '#fff' }}
          />
        </button>

        <button className="flex items-center gap-2 rounded-lg px-2 dark:border-gray-600 dark:text-white" style={{ height: 36, border: darkMode ? undefined : '1px solid rgba(15,23,42,0.08)' }}>
          <div
            className="rounded-full flex items-center justify-center"
            style={{ width: 26, height: 26, background: 'var(--primary)', color: '#fff', fontSize: 11, fontWeight: 700 }}
          >
            {(siteSettings?.site_name ?? '').slice(0, 1).toUpperCase()}
          </div>
          <span className="dark:text-gray-200" style={{ fontSize: 13, color: darkMode ? undefined : '#0f172a', fontWeight: 500 }}>{siteSettings?.site_name ?? ''}</span>
          <ChevronDown size={13} style={{ color: '#94a3b8' }} />
        </button>
      </div>
    </header>
  );
}
