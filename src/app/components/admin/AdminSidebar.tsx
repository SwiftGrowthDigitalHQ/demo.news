import {
  LayoutDashboard, Newspaper, Users, Megaphone, Image, Search,
  CreditCard, Shield, BarChart3, Settings, ChevronRight,
  Radio, FileText, Bell, LogOut, Star, X, Tag
} from 'lucide-react';
import { useCms } from '../../lib/cms';

const navSections = [
  {
    label: 'OVERVIEW',
    items: [
      { id: 'overview', label: 'Dashboard', icon: LayoutDashboard },
      { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    ]
  },
  {
    label: 'CONTENT',
    items: [
      { id: 'news', label: 'News Management', icon: Newspaper },
      { id: 'categories', label: 'Categories', icon: Tag },
      { id: 'breaking', label: 'Breaking News', icon: Radio },
      { id: 'media', label: 'Media Library', icon: Image },
    ]
  },
  {
    label: 'TEAM',
    items: [
      { id: 'journalists', label: 'Reporters', icon: Users },
      { id: 'users', label: 'Users', icon: Shield },
      { id: 'roles', label: 'Roles', icon: Shield },
    ]
  },
  {
    label: 'MONETIZATION',
    items: [
      { id: 'ads', label: 'Advertisements', icon: Megaphone },
      { id: 'subscriptions', label: 'Subscriptions', icon: CreditCard },
    ]
  },
  {
    label: 'GROWTH',
    items: [
      { id: 'seo', label: 'SEO Management', icon: Search },
      { id: 'notifications', label: 'Notifications', icon: Bell },
    ]
  },
  {
    label: 'SYSTEM',
    items: [
      { id: 'settings', label: 'Settings', icon: Settings },
      { id: 'security', label: 'Security', icon: Shield },
      { id: 'reports', label: 'Reports', icon: FileText },
    ]
  }
];

interface Props {
  activeSection: string;
  onNavigate: (id: string) => void;
  collapsed: boolean;
  onClose?: () => void;
  onLogout?: () => void;
}

export function AdminSidebar({ activeSection, onNavigate, collapsed, onClose, onLogout }: Props) {
  const { siteSettings } = useCms();
  const brandName = siteSettings?.site_name ?? '';
  return (
    <aside
      className="flex flex-col h-full overflow-hidden"
      style={{
        background: 'var(--admin-sidebar)',
        width: collapsed ? 64 : 240,
        transition: 'width 0.2s ease',
        minHeight: '100vh',
      }}
    >
      {/* Logo */}
      <div
        className="flex items-center gap-3 px-4 border-b"
        style={{
          height: 60,
          borderColor: 'var(--admin-sidebar-border)',
          flexShrink: 0,
        }}
      >
        <div
          className="flex items-center justify-center rounded-lg flex-shrink-0"
          style={{ width: 36, height: 36, background: 'var(--primary)' }}
        >
          <Star size={18} color="#fff" fill="#fff" />
        </div>
        {!collapsed && (
          <div className="flex-1 min-w-0">
            <div style={{ color: '#f1f5f9', fontSize: 14, fontWeight: 700, lineHeight: 1.2, letterSpacing: '-0.01em' }}>
              {brandName}
            </div>
            <div style={{ color: 'var(--admin-sidebar-muted)', fontSize: 11 }}>Super Admin</div>
          </div>
        )}
        {!collapsed && onClose && (
          <button onClick={onClose} className="lg:hidden" style={{ color: 'var(--admin-sidebar-muted)' }}>
            <X size={16} />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3" style={{ scrollbarWidth: 'none' }}>
        {navSections.map((section) => (
          <div key={section.label} className="mb-1">
            {!collapsed && (
              <div
                className="px-4 mb-1"
                style={{ color: 'var(--admin-sidebar-muted)', fontSize: 10, fontWeight: 600, letterSpacing: '0.08em' }}
              >
                {section.label}
              </div>
            )}
            {section.items.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  className="w-full flex items-center gap-3 relative"
                  style={{
                    padding: collapsed ? '10px 16px' : '9px 16px',
                    background: isActive ? 'var(--admin-sidebar-accent)' : 'transparent',
                    color: isActive ? '#f1f5f9' : 'var(--admin-sidebar-muted)',
                    fontSize: 13,
                    fontWeight: isActive ? 500 : 400,
                    justifyContent: collapsed ? 'center' : 'flex-start',
                    transition: 'all 0.15s ease',
                    cursor: 'pointer',
                    border: 'none',
                  }}
                >
                  {isActive && (
                    <div
                      style={{
                        position: 'absolute', left: 0, top: '20%', bottom: '20%',
                        width: 3, background: '#dc2626', borderRadius: '0 2px 2px 0',
                      }}
                    />
                  )}
                  <Icon size={16} style={{ flexShrink: 0 }} />
                  {!collapsed && (
                    <>
                      <span style={{ flex: 1, textAlign: 'left' }}>{item.label}</span>
                      {isActive && <ChevronRight size={14} />}
                    </>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      {/* User */}
      <div
        className="border-t p-3 flex items-center gap-3"
        style={{ borderColor: 'var(--admin-sidebar-border)', flexShrink: 0 }}
      >
        <div
          className="rounded-full flex items-center justify-center flex-shrink-0"
          style={{ width: 32, height: 32, background: 'var(--primary)', color: '#fff', fontSize: 13, fontWeight: 700 }}
        >
          SA
        </div>
        {!collapsed && (
          <>
            <div className="flex-1 min-w-0">
            <div style={{ color: '#e2e8f0', fontSize: 12, fontWeight: 500 }}>Super Admin</div>
              <div style={{ color: 'var(--admin-sidebar-muted)', fontSize: 11 }}>{siteSettings?.contact_email || ''}</div>
            </div>
            <button onClick={onLogout} style={{ color: 'var(--admin-sidebar-muted)' }}>
              <LogOut size={15} />
            </button>
          </>
        )}
      </div>
    </aside>
  );
}
