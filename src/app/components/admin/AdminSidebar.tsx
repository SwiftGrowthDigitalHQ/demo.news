import { ChevronRight, LogOut, X, Building2 } from 'lucide-react';
import { useAuth } from '../../lib/auth';
import { useTenant } from '../../lib/useTenant';
import { 
  getRoleDisplayName, 
  isSuperAdmin,
} from '../../lib/permissions';
import { 
  getSuperAdminNavItems, 
  getTenantNavItems, 
  groupNavItemsByCategory 
} from '../../lib/navConfig';
import { resolveAssetUrl } from '../../lib/assetResolver';

interface Props {
  activeSection: string;
  onNavigate: (id: string) => void;
  collapsed: boolean;
  onClose?: () => void;
  onLogout?: () => void;
}

export function AdminSidebar({ activeSection, onNavigate, collapsed, onClose, onLogout }: Props) {
  const { profile } = useAuth();
  const { tenant } = useTenant();
  
  const roleDisplayName = getRoleDisplayName(profile);
  const isSA = isSuperAdmin(profile);
  
  // CRITICAL: Get correct nav items based on role
  const visibleItems = isSA ? getSuperAdminNavItems() : getTenantNavItems();
  
  // Group items by category
  const navSections = groupNavItemsByCategory(visibleItems);
  
  // Branding: Super Admin vs Tenant Admin
  const brandName = isSA 
    ? 'SangTX Platform' 
    : (tenant?.name ?? 'News Portal');
  
  const brandLogo = isSA 
    ? null 
    : (tenant?.logoUrl ? resolveAssetUrl(tenant.logoUrl) : null);
  
  const brandColor = tenant?.primaryColor ?? '#dc2626';
  
  // User profile
  const userEmail = profile?.email ?? '';
  const userInitials = profile?.full_name
    ? profile.full_name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : roleDisplayName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  
  // User avatar from profile
  const userAvatarUrl = profile?.avatar_url ? resolveAssetUrl(profile.avatar_url) : null;
  
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
      {/* Logo & Brand */}
      <div
        className="flex items-center gap-3 px-4 border-b"
        style={{
          height: 60,
          borderColor: 'var(--admin-sidebar-border)',
          flexShrink: 0,
        }}
      >
        {brandLogo ? (
          // Tenant logo
          <div
            className="flex items-center justify-center rounded-lg flex-shrink-0 overflow-hidden"
            style={{ 
              width: 36, 
              height: 36, 
              background: '#f8fafc',
              border: '1px solid rgba(15,23,42,0.1)',
            }}
          >
            <img
              src={brandLogo}
              alt={brandName}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
              }}
              onError={(e) => {
                // Fallback to icon if image fails to load
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                const parent = target.parentElement;
                if (parent) {
                  parent.style.background = brandColor;
                  const fallback = document.createElement('div');
                  fallback.innerHTML = brandName.substring(0, 2).toUpperCase();
                  fallback.style.color = '#fff';
                  fallback.style.fontSize = '14px';
                  fallback.style.fontWeight = '700';
                  parent.appendChild(fallback);
                }
              }}
            />
          </div>
        ) : (
          // Generic icon for Super Admin or no logo
          <div
            className="flex items-center justify-center rounded-lg flex-shrink-0"
            style={{ width: 36, height: 36, background: brandColor }}
          >
            <Building2 size={18} color="#fff" />
          </div>
        )}
        {!collapsed && (
          <div className="flex-1 min-w-0">
            <div 
              style={{ 
                color: '#f1f5f9', 
                fontSize: 14, 
                fontWeight: 700, 
                lineHeight: 1.2, 
                letterSpacing: '-0.01em',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {brandName}
            </div>
            <div style={{ color: 'var(--admin-sidebar-muted)', fontSize: 11 }}>{roleDisplayName}</div>
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
                  title={collapsed ? item.label : undefined}
                >
                  {isActive && (
                    <div
                      style={{
                        position: 'absolute', left: 0, top: '20%', bottom: '20%',
                        width: 3, background: brandColor, borderRadius: '0 2px 2px 0',
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

      {/* User Profile */}
      <div
        className="border-t p-3 flex items-center gap-3"
        style={{ borderColor: 'var(--admin-sidebar-border)', flexShrink: 0 }}
      >
        {userAvatarUrl ? (
          // User's profile picture
          <img
            src={userAvatarUrl}
            alt={profile?.full_name ?? roleDisplayName}
            className="rounded-full flex-shrink-0"
            style={{ 
              width: 32, 
              height: 32,
              objectFit: 'cover',
            }}
            onError={(e) => {
              // Fallback to initials if image fails
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
            }}
          />
        ) : (
          // Fallback to initials
          <div
            className="rounded-full flex items-center justify-center flex-shrink-0"
            style={{ 
              width: 32, 
              height: 32, 
              background: brandColor, 
              color: '#fff', 
              fontSize: 13, 
              fontWeight: 700 
            }}
          >
            {userInitials}
          </div>
        )}
        {!collapsed && (
          <>
            <div className="flex-1 min-w-0">
              <div style={{ color: '#e2e8f0', fontSize: 12, fontWeight: 500 }}>{roleDisplayName}</div>
              <div style={{ 
                color: 'var(--admin-sidebar-muted)', 
                fontSize: 11, 
                overflow: 'hidden', 
                textOverflow: 'ellipsis', 
                whiteSpace: 'nowrap' 
              }}>
                {userEmail}
              </div>
            </div>
            <button 
              onClick={onLogout} 
              style={{ color: 'var(--admin-sidebar-muted)' }}
              title="Logout"
            >
              <LogOut size={15} />
            </button>
          </>
        )}
      </div>
    </aside>
  );
}
