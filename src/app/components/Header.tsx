import { useState, useEffect, useRef } from 'react';
import {
  Search, Menu, X, Bell, User, Facebook, Twitter, Youtube, Instagram,
  CloudSun, LogOut, Settings, Bookmark, LayoutDashboard, ChevronDown,
} from 'lucide-react';
import { AppLink, useAppNavigation } from '../lib/navigation';
import { useCms } from '../lib/cms';
import { useAuth } from '../lib/auth';

const NAV_ITEMS = [
  { label: 'Home', path: '/' },
  { label: 'Politics', path: '/category/politics' },
  { label: 'Bihar', path: '/category/bihar' },
  { label: 'National', path: '/category/sitamarhi' },
  { label: 'Crime', path: '/category/crime' },
  { label: 'Business', path: '/search?q=business' },
  { label: 'Sports', path: '/search?q=sports' },
  { label: 'Technology', path: '/search?q=technology' },
  { label: 'Education', path: '/category/education' },
  { label: 'Entertainment', path: '/search?q=entertainment' },
  { label: 'Video News', path: '/search?q=video' },
];

export function Header() {
  const { navigate, pathname } = useAppNavigation();
  const { siteSettings, breakingNews } = useCms();
  const { user, profile, canAccessAdmin, signOut } = useAuth();
  const [query, setQuery] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [tickerIndex, setTickerIndex] = useState(0);
  const profileRef = useRef<HTMLDivElement>(null);
  const socialLinks = (siteSettings?.social_links ?? {}) as Record<string, string>;

  const brandName = siteSettings?.site_name ?? 'Buxar News';
  const brandFirst = brandName.replace(/News.*/, '') || 'Buxar';
  const brandSecond = brandName.includes('News') ? 'News' : '';

  const isAuthenticated = Boolean(user);
  const userName = profile?.full_name || user?.email?.split('@')[0] || 'User';
  const userInitial = userName.charAt(0).toUpperCase();

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const tickerItems = breakingNews.slice(0, 6);

  useEffect(() => {
    if (tickerItems.length <= 1) return;
    const timer = setInterval(() => setTickerIndex(prev => (prev + 1) % tickerItems.length), 3500);
    return () => clearInterval(timer);
  }, [tickerItems.length]);

  // Close profile menu on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleLogout = async () => {
    setProfileMenuOpen(false);
    await signOut();
    navigate('/');
  };

  return (
    <header className="w-full z-50">
      {/* === TOP BAR === */}
      <div className="bg-[#111827] text-white">
        <div className="mx-auto max-w-[1400px] px-4 h-9 flex items-center justify-between text-xs">
          <div className="flex items-center gap-4 overflow-hidden">
            <span className="shrink-0 text-gray-300">{today}</span>
            <span className="hidden sm:flex items-center gap-1 text-gray-300">
              <CloudSun className="h-3 w-3" /> 32°C
            </span>
            {tickerItems.length > 0 && (
              <div className="hidden md:flex items-center gap-2 overflow-hidden">
                <span className="shrink-0 bg-red-600 text-white px-2 py-0.5 rounded text-[10px] font-bold uppercase">Breaking</span>
                <span className="text-gray-200 truncate max-w-[320px]">{tickerItems[tickerIndex]?.headline}</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            <a href={socialLinks.facebook || '#'} aria-label="Facebook" className="text-gray-400 hover:text-white transition-colors"><Facebook className="h-3.5 w-3.5" /></a>
            <a href={socialLinks.twitter || '#'} aria-label="Twitter" className="text-gray-400 hover:text-white transition-colors"><Twitter className="h-3.5 w-3.5" /></a>
            <a href={socialLinks.instagram || '#'} aria-label="Instagram" className="text-gray-400 hover:text-white transition-colors"><Instagram className="h-3.5 w-3.5" /></a>
            <a href={socialLinks.youtube || '#'} aria-label="YouTube" className="text-gray-400 hover:text-white transition-colors"><Youtube className="h-3.5 w-3.5" /></a>
          </div>
        </div>
      </div>

      {/* === MAIN HEADER === */}
      <div className="bg-white border-b border-gray-100 shadow-sm">
        <div className="mx-auto max-w-[1400px] px-4 h-16 flex items-center justify-between gap-3">
          {/* Mobile hamburger */}
          <button type="button" className="lg:hidden p-2 text-gray-700" onClick={() => setMobileMenuOpen(true)} aria-label="Menu">
            <Menu className="h-6 w-6" />
          </button>

          {/* Logo */}
          <AppLink to="/" className="shrink-0 flex items-center gap-1.5">
            {siteSettings?.logo_url && (
              <img src={siteSettings.logo_url} alt={brandName} className="h-9 w-9 rounded object-cover" />
            )}
            <div className="leading-tight">
              <span className="text-xl font-extrabold text-[#111827]">{brandFirst}</span>
              <span className="text-xl font-extrabold text-red-600">{brandSecond}</span>
              <p className="text-[9px] text-gray-500 tracking-wider -mt-0.5">Fast. Accurate. Trusted.</p>
            </div>
          </AppLink>

          {/* Search */}
          <form
            className="hidden md:flex flex-1 max-w-lg mx-6"
            onSubmit={e => { e.preventDefault(); if (query.trim()) navigate(`/search?q=${encodeURIComponent(query.trim())}`); }}
          >
            <div className="relative w-full">
              <input
                type="search"
                placeholder="Search news, topics, categories..."
                className="w-full h-10 rounded-full border border-gray-200 bg-gray-50 pl-4 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-400 transition-all"
                value={query}
                onChange={e => setQuery(e.target.value)}
              />
              <button type="submit" className="absolute right-1 top-1 h-8 w-8 flex items-center justify-center rounded-full bg-red-600 text-white hover:bg-red-700 transition-colors">
                <Search className="h-4 w-4" />
              </button>
            </div>
          </form>

          {/* Right actions */}
          <div className="flex items-center gap-2">

            {/* ═══ GUEST: Login/Register ═══ */}
            {!isAuthenticated && (
              <>
                <AppLink to="/login" className="hidden sm:flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-100 transition-colors">
                  <User className="h-3.5 w-3.5" /> Login
                </AppLink>
                <AppLink to="/register" className="hidden sm:flex items-center gap-1 bg-red-600 text-white px-3 py-2 rounded-lg text-xs font-bold hover:bg-red-700 transition-colors">
                  Register
                </AppLink>
              </>
            )}

            {/* ═══ AUTHENTICATED: Notification + Profile ═══ */}
            {isAuthenticated && (
              <>
                {/* Notification bell */}
                <button type="button" className="flex items-center justify-center w-9 h-9 rounded-full border border-gray-200 text-gray-600 hover:bg-gray-50 relative" aria-label="Notifications">
                  <Bell className="h-4 w-4" />
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-red-600 text-[9px] font-bold text-white flex items-center justify-center">3</span>
                </button>

                {/* Profile dropdown */}
                <div className="relative" ref={profileRef}>
                  <button
                    type="button"
                    onClick={() => setProfileMenuOpen(prev => !prev)}
                    className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="w-8 h-8 rounded-full bg-red-600 flex items-center justify-center text-white text-sm font-bold">
                      {userInitial}
                    </div>
                    <ChevronDown className={`h-3 w-3 text-gray-500 transition-transform ${profileMenuOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {/* Dropdown menu */}
                  {profileMenuOpen && (
                    <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl border border-gray-200 shadow-xl py-2 z-[100]">
                      {/* User info */}
                      <div className="px-4 py-2.5 border-b border-gray-100">
                        <div className="text-sm font-semibold text-gray-900 truncate">{userName}</div>
                        <div className="text-xs text-gray-500 truncate">{user?.email}</div>
                        {profile?.role_name && (
                          <span className="inline-block mt-1 text-[10px] font-semibold bg-red-50 text-red-600 px-2 py-0.5 rounded">{profile.role_name}</span>
                        )}
                      </div>

                      {/* Menu items */}
                      <div className="py-1">
                        <AppLink to="/profile" onClick={() => setProfileMenuOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                          <User className="h-4 w-4 text-gray-400" /> My Profile
                        </AppLink>
                        <AppLink to="/profile" onClick={() => setProfileMenuOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                          <Bookmark className="h-4 w-4 text-gray-400" /> Saved News
                        </AppLink>
                        <AppLink to="/profile" onClick={() => setProfileMenuOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                          <Settings className="h-4 w-4 text-gray-400" /> Settings
                        </AppLink>

                        {/* Admin Dashboard — only for admin/editor roles */}
                        {canAccessAdmin && (
                          <AppLink to="/admin" onClick={() => setProfileMenuOpen(false)}
                            className="flex items-center gap-2.5 px-4 py-2 text-sm text-red-600 font-medium hover:bg-red-50 transition-colors">
                            <LayoutDashboard className="h-4 w-4" /> Admin Dashboard
                          </AppLink>
                        )}
                      </div>

                      {/* Logout */}
                      <div className="border-t border-gray-100 pt-1">
                        <button type="button" onClick={handleLogout}
                          className="flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors w-full text-left">
                          <LogOut className="h-4 w-4 text-gray-400" /> Logout
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Live TV button (always visible) */}
            <AppLink
              to="/search?q=live"
              className="flex items-center gap-1.5 bg-red-600 text-white px-3 py-2 rounded-full text-xs font-bold hover:bg-red-700 transition-colors shadow-sm"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
              </span>
              <span className="hidden sm:inline">Live TV</span>
            </AppLink>
          </div>
        </div>
      </div>

      {/* === NAVIGATION === */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
        <div className="mx-auto max-w-[1400px] px-4">
          <div className="hidden lg:flex items-center h-11 gap-0 overflow-x-auto scrollbar-hide">
            {NAV_ITEMS.map(item => {
              const isActive = pathname === item.path || (item.path !== '/' && pathname.startsWith(item.path));
              return (
                <AppLink
                  key={item.path + item.label}
                  to={item.path}
                  className={`relative whitespace-nowrap px-3.5 py-2 text-[13px] font-semibold transition-colors ${
                    isActive ? 'text-red-600' : 'text-gray-700 hover:text-red-600'
                  }`}
                >
                  {item.label}
                  {isActive && <span className="absolute bottom-0 left-3.5 right-3.5 h-[2.5px] bg-red-600 rounded-full" />}
                </AppLink>
              );
            })}
          </div>
        </div>
      </nav>

      {/* === MOBILE MENU === */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-[200] lg:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-80 bg-white shadow-2xl overflow-y-auto animate-slide-in-left">
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <span className="text-lg font-extrabold text-gray-900">{brandName}</span>
              <button type="button" onClick={() => setMobileMenuOpen(false)} className="p-1.5 rounded-full hover:bg-gray-100">
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            {/* Mobile: Auth status */}
            {isAuthenticated ? (
              <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-red-600 flex items-center justify-center text-white text-lg font-bold">{userInitial}</div>
                  <div>
                    <div className="text-sm font-semibold text-gray-900">{userName}</div>
                    <div className="text-xs text-gray-500">{user?.email}</div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="px-4 py-3 border-b border-gray-100 flex gap-2">
                <AppLink to="/login" onClick={() => setMobileMenuOpen(false)} className="flex-1 text-center py-2 rounded-lg border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50">Login</AppLink>
                <AppLink to="/register" onClick={() => setMobileMenuOpen(false)} className="flex-1 text-center py-2 rounded-lg bg-red-600 text-sm font-semibold text-white hover:bg-red-700">Register</AppLink>
              </div>
            )}

            {/* Mobile search */}
            <form
              className="px-4 pt-3"
              onSubmit={e => { e.preventDefault(); if (query.trim()) { navigate(`/search?q=${encodeURIComponent(query.trim())}`); setMobileMenuOpen(false); } }}
            >
              <div className="relative">
                <input type="search" placeholder="Search..." className="w-full h-10 rounded-lg border border-gray-200 pl-4 pr-10 text-sm" value={query} onChange={e => setQuery(e.target.value)} />
                <Search className="absolute right-3 top-3 h-4 w-4 text-gray-400" />
              </div>
            </form>

            <nav className="p-4 space-y-0.5">
              {NAV_ITEMS.map(item => (
                <AppLink key={item.path + item.label} to={item.path}
                  className="flex items-center px-3 py-2.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-red-50 hover:text-red-600 transition-colors"
                  onClick={() => setMobileMenuOpen(false)}>
                  {item.label}
                </AppLink>
              ))}

              {/* Mobile menu: authenticated actions */}
              {isAuthenticated && (
                <>
                  <div className="border-t border-gray-100 my-3" />
                  <AppLink to="/profile" className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-red-50 hover:text-red-600" onClick={() => setMobileMenuOpen(false)}>
                    <User className="h-4 w-4" /> My Profile
                  </AppLink>
                  {canAccessAdmin && (
                    <AppLink to="/admin" className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50" onClick={() => setMobileMenuOpen(false)}>
                      <LayoutDashboard className="h-4 w-4" /> Admin Dashboard
                    </AppLink>
                  )}
                  <button type="button" onClick={() => { setMobileMenuOpen(false); void handleLogout(); }}
                    className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-red-50 hover:text-red-600 w-full text-left">
                    <LogOut className="h-4 w-4" /> Logout
                  </button>
                </>
              )}
            </nav>
          </aside>
        </div>
      )}
    </header>
  );
}
