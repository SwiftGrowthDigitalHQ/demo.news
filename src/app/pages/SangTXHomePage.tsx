import { useState, useEffect, useRef } from 'react';
import { useAppNavigation } from '../lib/navigation';
import { useI18n, type TranslationKey } from '../lib/i18n';
import { LanguageSwitcher } from '../components/LanguageSwitcher';

/* ─────────────────────────────────────────────
   SANGTX PUBLIC HOMEPAGE  ·  Fully localised
   ───────────────────────────────────────────── */

/* ── Icon paths ─────────────────────────────── */
const ICONS = {
  menu: 'M3 12h18M3 6h18M3 18h18',
  x: 'M18 6 6 18M6 6l12 12',
  arrowRight: 'M5 12h14M12 5l7 7-7 7',
  check: 'M20 6 9 17l-5-5',
  chevronDown: 'M6 9l6 6 6-6',
  newspaper: 'M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a4 4 0 0 1-4-4V6',
  layout: 'M3 3h18v18H3zM3 9h18M9 21V9',
  smartphone: 'M17 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2zM12 18h.01',
  palette: 'M2 12a10 10 0 1 0 20 0 10 10 0 0 0-20 0M12 8v4M12 16h.01',
  bell: 'M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.94 1.94 0 0 0 3.4 0',
  barChart: 'M3 3v18h18M18 17V9M13 17V5M8 17v-3',
  search: 'M21 21l-6-6m2-5a7 7 0 1 1-14 0 7 7 0 0 1 14 0',
  image: 'M21 9l-9-9-9 9v11a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9zM9 22V12h6v10',
  users: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75',
  globe: 'M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2zM2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z',
  tag: 'M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82zM7 7h.01',
  zap: 'M13 2 3 14h9l-1 8 10-12h-9l1-8z',
  shield: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
  plus: 'M12 5v14M5 12h14',
  star: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z',
  play: 'M5 3l14 9-14 9V3z',
  externalLink: 'M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14 21 3',
};

function Icon({ d, size = 20, className, style }: { d: string; size?: number; className?: string; style?: React.CSSProperties }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
      className={className} style={style} aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

/* ── Intersection-observer reveal ────────────── */
function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } }, { threshold: 0.1 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return { ref, visible };
}
function Reveal({ children, delay = 0, className }: { children: React.ReactNode; delay?: number; className?: string }) {
  const { ref, visible } = useReveal();
  return (
    <div ref={ref} className={className} style={{ transition: `opacity 0.55s ease ${delay}ms, transform 0.55s ease ${delay}ms`, opacity: visible ? 1 : 0, transform: visible ? 'none' : 'translateY(18px)' }}>
      {children}
    </div>
  );
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#fef2f2', color: '#b91c1c', fontSize: 12, fontWeight: 600, letterSpacing: '0.04em', padding: '4px 12px', borderRadius: 99, border: '1px solid #fecaca' }}>
      {children}
    </span>
  );
}

/* ══════════════════════════════════════════════
   HEADER
══════════════════════════════════════════════ */
function SiteHeader() {
  const { navigate } = useAppNavigation();
  const { t } = useI18n();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', h, { passive: true });
    return () => window.removeEventListener('scroll', h);
  }, []);

  const navLinks = [
    { label: t('nav.features'), href: '#features' },
    { label: t('nav.howItWorks'), href: '#how-it-works' },
    { label: t('nav.pricing'), href: '#pricing' },
    { label: t('nav.demo'), href: '#demo' },
  ];

  function anchor(href: string) {
    setMenuOpen(false);
    if (href.startsWith('#')) document.getElementById(href.slice(1))?.scrollIntoView({ behavior: 'smooth' });
  }

  return (
    <header style={{ position: 'sticky', top: 0, zIndex: 50, background: scrolled ? 'rgba(255,255,255,0.97)' : '#fff', borderBottom: '1px solid #f1f5f9', backdropFilter: scrolled ? 'blur(8px)' : 'none', boxShadow: scrolled ? '0 1px 12px rgba(15,23,42,0.07)' : 'none', transition: 'box-shadow 0.2s' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', height: 60, gap: 32 }}>
          <a href="/" onClick={e => { e.preventDefault(); navigate('/'); }} style={{ display: 'flex', alignItems: 'center', gap: 9, textDecoration: 'none', flexShrink: 0 }} aria-label={t('nav.aria.home')}>
            <div style={{ width: 32, height: 32, background: '#dc2626', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: '#fff', fontSize: 14, fontWeight: 800, letterSpacing: '-0.03em' }}>S</span>
            </div>
            <span style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.04em' }}>SangTX</span>
          </a>

          <nav style={{ display: 'flex', alignItems: 'center', gap: 4, flex: 1 }} aria-label={t('nav.aria.main')}>
            {navLinks.map(link => (
              <button key={link.href} onClick={() => anchor(link.href)}
                style={{ padding: '6px 14px', fontSize: 14, fontWeight: 500, color: '#475569', background: 'none', border: 'none', cursor: 'pointer', borderRadius: 6 }}
                className="sangtx-nav-link">{link.label}</button>
            ))}
          </nav>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }} className="sangtx-header-cta">
            <LanguageSwitcher variant="compact" />
            <a href="/login" onClick={e => { e.preventDefault(); navigate('/login'); }}
              style={{ fontSize: 14, fontWeight: 500, color: '#475569', textDecoration: 'none', padding: '6px 14px', borderRadius: 6 }}>
              {t('nav.login')}
            </a>
            <button onClick={() => navigate('/onboarding')}
              style={{ background: '#dc2626', color: '#fff', fontSize: 14, fontWeight: 600, padding: '8px 20px', borderRadius: 8, border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}>
              {t('nav.startFree')}
            </button>
          </div>

          <button onClick={() => setMenuOpen(v => !v)} aria-label={menuOpen ? t('nav.aria.closeMenu') : t('nav.aria.openMenu')}
            style={{ display: 'none', background: 'none', border: 'none', cursor: 'pointer', color: '#0f172a', padding: 4 }}
            className="sangtx-burger">
            <Icon d={menuOpen ? ICONS.x : ICONS.menu} size={22} />
          </button>
        </div>
      </div>

      {menuOpen && (
        <div style={{ borderTop: '1px solid #f1f5f9', background: '#fff', padding: '12px 24px 20px' }} className="sangtx-mobile-menu">
          {navLinks.map(link => (
            <button key={link.href} onClick={() => anchor(link.href)}
              style={{ display: 'block', width: '100%', textAlign: 'left', padding: '12px 0', fontSize: 16, fontWeight: 500, color: '#0f172a', background: 'none', border: 'none', cursor: 'pointer', borderBottom: '1px solid #f8fafc' }}>
              {link.label}
            </button>
          ))}
          <div style={{ paddingTop: 12, marginBottom: 8 }}>
            <LanguageSwitcher variant="pills" />
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
            <a href="/login" onClick={e => { e.preventDefault(); navigate('/login'); setMenuOpen(false); }}
              style={{ flex: 1, textAlign: 'center', padding: '10px', fontSize: 14, fontWeight: 500, color: '#475569', textDecoration: 'none', border: '1px solid #e2e8f0', borderRadius: 8 }}>
              {t('nav.login')}
            </a>
            <button onClick={() => { navigate('/onboarding'); setMenuOpen(false); }}
              style={{ flex: 1, background: '#dc2626', color: '#fff', fontSize: 14, fontWeight: 600, padding: '10px', borderRadius: 8, border: 'none', cursor: 'pointer' }}>
              {t('nav.startFree')}
            </button>
          </div>
        </div>
      )}
    </header>
  );
}

/* ══════════════════════════════════════════════
   HERO
══════════════════════════════════════════════ */
function HeroSection() {
  const { navigate } = useAppNavigation();
  const { t, lang } = useI18n();
  const isDevanagari = lang === 'hi' || lang === 'bho';

  return (
    <section style={{ background: '#fff', paddingTop: 80, paddingBottom: 80, overflow: 'hidden' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 64, alignItems: 'center' }} className="sangtx-hero-grid">
          <div>
            <Reveal>
              <Pill><Icon d={ICONS.zap} size={12} /> {t('hero.pill')}</Pill>
            </Reveal>
            <Reveal delay={60}>
              <h1 style={{
                marginTop: 20,
                fontSize: isDevanagari ? 'clamp(28px, 4.5vw, 48px)' : 'clamp(32px, 5vw, 54px)',
                fontWeight: 800, color: '#0f172a',
                lineHeight: isDevanagari ? 1.3 : 1.1,
                letterSpacing: isDevanagari ? '0' : '-0.03em',
              }}>
                {t('hero.title1')}<br />
                {t('hero.title2')}<br />
                <span style={{ color: '#dc2626' }}>{t('hero.titleAccent')}</span>
              </h1>
            </Reveal>
            <Reveal delay={120}>
              <p style={{
                marginTop: 20,
                fontSize: isDevanagari ? 16 : 17,
                color: '#475569',
                lineHeight: isDevanagari ? 1.8 : 1.7,
                maxWidth: 480,
              }}>
                {t('hero.description')}
              </p>
            </Reveal>
            <Reveal delay={180}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 32, flexWrap: 'wrap' }}>
                <button onClick={() => navigate('/onboarding')}
                  style={{ background: '#dc2626', color: '#fff', fontSize: 15, fontWeight: 700, padding: '13px 28px', borderRadius: 9, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap' }}>
                  {t('hero.startFree')}
                  <Icon d={ICONS.arrowRight} size={16} />
                </button>
                <button onClick={() => document.getElementById('demo')?.scrollIntoView({ behavior: 'smooth' })}
                  style={{ background: 'transparent', color: '#0f172a', fontSize: 15, fontWeight: 600, padding: '12px 24px', borderRadius: 9, border: '1.5px solid #e2e8f0', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  {t('hero.viewDemo')}
                </button>
              </div>
              <p style={{ marginTop: 14, fontSize: 13, color: '#94a3b8' }}>
                {t('hero.trialNote')}
              </p>
            </Reveal>
          </div>
          <Reveal delay={100} className="sangtx-hero-visual">
            <ProductPreviewCard />
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/* ── Product preview card — intentional sample publication mockup ── */
function ProductPreviewCard() {
  const { t } = useI18n();
  return (
    <div style={{ position: 'relative' }}>
      <div style={{ background: '#0f172a', borderRadius: 14, padding: 2, boxShadow: '0 32px 80px rgba(15,23,42,0.22)' }}>
        <div style={{ background: '#1e293b', borderRadius: '12px 12px 0 0', padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ display: 'flex', gap: 5 }}>
            {['#ef4444','#f59e0b','#22c55e'].map(c => <div key={c} style={{ width: 10, height: 10, borderRadius: '50%', background: c }} />)}
          </div>
          <div style={{ flex: 1, background: '#334155', borderRadius: 5, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: 11, color: '#94a3b8' }}>aajtak.com</span>
          </div>
        </div>
        <div style={{ background: '#fff', borderRadius: '0 0 12px 12px', overflow: 'hidden', height: 320 }}>
          {/* Simulated nav — sample publication, stays fixed */}
          <div style={{ background: '#0f172a', padding: '8px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ color: '#fff', fontSize: 13, fontWeight: 800 }}>Aaj <span style={{ color: '#ef4444' }}>Tak</span></span>
            <div style={{ display: 'flex', gap: 8 }}>
              {['India','Politics','Business','Sports'].map(c => <span key={c} style={{ fontSize: 9, color: '#94a3b8' }}>{c}</span>)}
            </div>
          </div>
          <div style={{ background: '#dc2626', padding: '4px 14px', display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden' }}>
            <span style={{ background: '#fff', color: '#dc2626', fontSize: 8, fontWeight: 800, padding: '1px 6px', borderRadius: 2, flexShrink: 0 }}>BREAKING</span>
            <span style={{ fontSize: 10, color: '#fff', whiteSpace: 'nowrap' }}>देश और दुनिया की बड़ी खबरें, एक जगह • आज की प्रमुख खबरों पर एक नज़र</span>
          </div>
          <div style={{ padding: '10px 14px', display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 8 }}>
            <div style={{ background: '#f1f5f9', borderRadius: 6, overflow: 'hidden', height: 130, position: 'relative' }}>
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)', display: 'flex', alignItems: 'flex-end', padding: 8 }}>
                <div>
                  <div style={{ background: '#dc2626', borderRadius: 2, padding: '1px 5px', fontSize: 7, color: '#fff', fontWeight: 700, marginBottom: 4, display: 'inline-block' }}>TOP STORY</div>
                  <div style={{ fontSize: 11, color: '#fff', fontWeight: 700, lineHeight: 1.3 }}>देशभर से जुड़ी ताज़ा खबरें — पढ़ें पूरी जानकारी</div>
                  <div style={{ fontSize: 8, color: '#94a3b8', marginTop: 3 }}>by Priya Sharma  •  2 min ago</div>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[1,2,3].map(i => (
                <div key={i} style={{ background: '#f8fafc', borderRadius: 5, padding: '6px 8px', border: '1px solid #f1f5f9' }}>
                  <div style={{ height: 6, background: '#e2e8f0', borderRadius: 3, width: '90%', marginBottom: 4 }} />
                  <div style={{ height: 5, background: '#f1f5f9', borderRadius: 3, width: '65%' }} />
                  <div style={{ fontSize: 7, color: '#94a3b8', marginTop: 4 }}>{i === 1 ? 'India' : i === 2 ? 'Politics' : 'Business'} · {i * 8 + 2}m ago</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Marketing UI labels — translated */}
      <div style={{ textAlign: 'center', marginTop: 10 }}>
        <span style={{ fontSize: 10, color: '#94a3b8', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 99, padding: '3px 10px', fontWeight: 500 }}>
          {t('hero.sampleLabel')}
        </span>
      </div>

      {/* Floating mobile badge */}
      <div style={{ position: 'absolute', bottom: 16, right: -20, background: '#0f172a', borderRadius: 14, padding: '10px 12px', boxShadow: '0 8px 24px rgba(15,23,42,0.25)', display: 'flex', alignItems: 'center', gap: 8, minWidth: 130 }}>
        <div style={{ width: 28, height: 48, background: '#1e293b', borderRadius: 5, border: '2px solid #334155', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon d={ICONS.smartphone} size={14} style={{ color: '#94a3b8' }} />
        </div>
        <div>
          <div style={{ fontSize: 10, color: '#94a3b8' }}>{t('hero.badge.androidApp')}</div>
          <div style={{ fontSize: 12, color: '#f1f5f9', fontWeight: 600 }}>Aaj Tak</div>
        </div>
      </div>

      {/* Floating analytics badge */}
      <div style={{ position: 'absolute', top: -16, left: -16, background: '#fff', borderRadius: 12, padding: '8px 12px', boxShadow: '0 4px 16px rgba(15,23,42,0.12)', display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 28, height: 28, background: '#fef2f2', borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon d={ICONS.barChart} size={14} style={{ color: '#dc2626' }} />
        </div>
        <div>
          <div style={{ fontSize: 10, color: '#94a3b8' }}>{t('hero.badge.analytics')}</div>
          <div style={{ fontSize: 12, color: '#0f172a', fontWeight: 600 }}>{t('hero.badge.liveDashboard')}</div>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════
   TRUST BAR
══════════════════════════════════════════════ */
function TrustBar() {
  const { t } = useI18n();
  const items: Array<{ icon: string; key: TranslationKey }> = [
    { icon: ICONS.shield, key: 'trust.dataOwnership' },
    { icon: ICONS.globe, key: 'trust.customDomain' },
    { icon: ICONS.bell, key: 'trust.pushNotifications' },
    { icon: ICONS.smartphone, key: 'trust.androidApp' },
    { icon: ICONS.barChart, key: 'trust.analytics' },
  ];
  return (
    <section style={{ background: '#f8fafc', borderTop: '1px solid #f1f5f9', borderBottom: '1px solid #f1f5f9', padding: '20px 24px' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 32, flexWrap: 'wrap' }}>
          {items.map(item => (
            <div key={item.key} style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#64748b' }}>
              <Icon d={item.icon} size={15} />
              <span style={{ fontSize: 13, fontWeight: 500 }}>{t(item.key)}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════
   FEATURES GRID  —  fully translated
══════════════════════════════════════════════ */
function FeaturesSection() {
  const { t, lang } = useI18n();
  const isDevanagari = lang === 'hi' || lang === 'bho';

  const FEATURES: Array<{ icon: string; titleKey: TranslationKey; descKey: TranslationKey }> = [
    { icon: ICONS.newspaper, titleKey: 'feature.newsManagement', descKey: 'feature.newsManagement.desc' },
    { icon: ICONS.tag,       titleKey: 'feature.categories',     descKey: 'feature.categories.desc' },
    { icon: ICONS.zap,       titleKey: 'feature.breaking',       descKey: 'feature.breaking.desc' },
    { icon: ICONS.image,     titleKey: 'feature.media',          descKey: 'feature.media.desc' },
    { icon: ICONS.users,     titleKey: 'feature.reporters',      descKey: 'feature.reporters.desc' },
    { icon: ICONS.search,    titleKey: 'feature.seo',            descKey: 'feature.seo.desc' },
    { icon: ICONS.barChart,  titleKey: 'feature.ads',            descKey: 'feature.ads.desc' },
    { icon: ICONS.bell,      titleKey: 'feature.push',           descKey: 'feature.push.desc' },
    { icon: ICONS.barChart,  titleKey: 'feature.analyticsCard',  descKey: 'feature.analyticsCard.desc' },
    { icon: ICONS.palette,   titleKey: 'feature.branding',       descKey: 'feature.branding.desc' },
    { icon: ICONS.users,     titleKey: 'feature.users',          descKey: 'feature.users.desc' },
    { icon: ICONS.shield,    titleKey: 'feature.security',       descKey: 'feature.security.desc' },
  ];

  return (
    <section id="features" style={{ padding: '96px 24px', background: '#fff' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <Reveal>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <Pill><Icon d={ICONS.layout} size={12} /> {t('features.pill')}</Pill>
            <h2 style={{
              marginTop: 16,
              fontSize: isDevanagari ? 'clamp(22px, 3.5vw, 34px)' : 'clamp(26px, 4vw, 40px)',
              fontWeight: 800, color: '#0f172a',
              letterSpacing: isDevanagari ? '0' : '-0.03em',
              lineHeight: isDevanagari ? 1.35 : 1.15,
            }}>
              {t('features.title')}
            </h2>
            <p style={{ marginTop: 14, fontSize: 16, color: '#64748b', maxWidth: 520, margin: '14px auto 0', lineHeight: isDevanagari ? 1.8 : 1.7 }}>
              {t('features.description')}
            </p>
          </div>
        </Reveal>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 1, border: '1px solid #f1f5f9', borderRadius: 14, overflow: 'hidden' }}>
          {FEATURES.map((f, i) => (
            <Reveal key={f.titleKey} delay={i * 30}>
              <div style={{ padding: '28px 24px', background: '#fff', borderRight: '1px solid #f1f5f9', borderBottom: '1px solid #f1f5f9', minHeight: 140 }} className="sangtx-feature-card">
                <div style={{ width: 38, height: 38, background: '#fef2f2', borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
                  <Icon d={f.icon} size={18} style={{ color: '#dc2626' }} />
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', marginBottom: 6, letterSpacing: isDevanagari ? '0' : '-0.01em', lineHeight: isDevanagari ? 1.4 : 1.3 }}>
                  {t(f.titleKey)}
                </div>
                <div style={{ fontSize: 13, color: '#64748b', lineHeight: isDevanagari ? 1.7 : 1.6 }}>
                  {t(f.descKey)}
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════
   FEATURE SHOWCASE  —  fully translated
══════════════════════════════════════════════ */
function ShowcaseRow({ number, titleKey, descKey, visual, reverse }: {
  number: string; titleKey: TranslationKey; descKey: TranslationKey;
  visual: React.ReactNode; reverse?: boolean;
}) {
  const { t, lang } = useI18n();
  const isDevanagari = lang === 'hi' || lang === 'bho';
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 64, alignItems: 'center' }}
      className={`sangtx-showcase-row${reverse ? ' sangtx-showcase-reverse' : ''}`}>
      <Reveal className={reverse ? 'sangtx-order-2' : ''}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#dc2626', letterSpacing: '0.08em', marginBottom: 12 }}>{number}</div>
          <h3 style={{
            fontSize: isDevanagari ? 'clamp(20px, 2.5vw, 28px)' : 'clamp(22px, 3vw, 32px)',
            fontWeight: 800, color: '#0f172a',
            letterSpacing: isDevanagari ? '0' : '-0.025em',
            lineHeight: isDevanagari ? 1.4 : 1.2, marginBottom: 16,
          }}>{t(titleKey)}</h3>
          <p style={{ fontSize: 15, color: '#475569', lineHeight: isDevanagari ? 1.85 : 1.75, marginBottom: 24 }}>{t(descKey)}</p>
        </div>
      </Reveal>
      <Reveal delay={80} className={reverse ? 'sangtx-order-1' : ''}>{visual}</Reveal>
    </div>
  );
}

/* ── Dashboard / Branding / Notifications / Analytics visuals
   These are product mockups — internal labels are intentionally kept as-is
   (they represent the admin CMS UI, not marketing copy) ── */
function AdminDashboardVisual() {
  return (
    <div style={{ background: '#0f172a', borderRadius: 12, padding: 16, boxShadow: '0 24px 56px rgba(15,23,42,0.20)' }}>
      <div style={{ fontSize: 11, color: '#64748b', marginBottom: 12, fontWeight: 600, letterSpacing: '0.06em' }}>DASHBOARD OVERVIEW</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
        {[{ l: 'Articles', v: '142', c: '#dc2626' },{ l: 'Published', v: '118', c: '#16a34a' },{ l: 'Views', v: '28.4K', c: '#7c3aed' },{ l: 'Active Ads', v: '6', c: '#f59e0b' }].map(m => (
          <div key={m.l} style={{ background: '#1e293b', borderRadius: 8, padding: '12px 14px' }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: m.c }}>{m.v}</div>
            <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>{m.l}</div>
          </div>
        ))}
      </div>
      <div style={{ background: '#1e293b', borderRadius: 8, padding: '12px 14px' }}>
        <div style={{ fontSize: 10, color: '#64748b', marginBottom: 8 }}>Article trend this week</div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 5, height: 40 }}>
          {[55,70,45,90,60,80,100].map((h, i) => (
            <div key={i} style={{ flex: 1, background: i === 6 ? '#dc2626' : '#334155', borderRadius: '3px 3px 0 0', height: `${h}%` }} />
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
          {['M','T','W','T','F','S','S'].map((d, i) => <span key={i} style={{ fontSize: 8, color: '#475569' }}>{d}</span>)}
        </div>
      </div>
    </div>
  );
}

function BrandingVisual() {
  return (
    <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #f1f5f9', padding: 20, boxShadow: '0 8px 24px rgba(15,23,42,0.07)' }}>
      <div style={{ fontSize: 11, color: '#64748b', marginBottom: 14, fontWeight: 600 }}>SITE SETTINGS</div>
      {[{ label: 'News Name', value: 'Aaj Tak' }, { label: 'Primary Color', value: '#dc2626', color: true }, { label: 'Tagline', value: 'सबसे तेज़, सबसे पहले।' }, { label: 'Domain', value: 'aajtak.com' }].map(row => (
        <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #f8fafc' }}>
          <span style={{ fontSize: 12, color: '#64748b' }}>{row.label}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {row.color && <div style={{ width: 14, height: 14, borderRadius: 3, background: '#dc2626' }} />}
            <span style={{ fontSize: 12, fontWeight: 600, color: '#0f172a' }}>{row.value}</span>
          </div>
        </div>
      ))}
      <div style={{ marginTop: 16, padding: '10px 14px', background: '#f8fafc', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 36, height: 36, background: '#dc2626', borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ color: '#fff', fontSize: 12, fontWeight: 800 }}>AT</span>
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>Aaj Tak</div>
          <div style={{ fontSize: 10, color: '#64748b' }}>aajtak.com</div>
        </div>
      </div>
    </div>
  );
}

function NotificationsVisual() {
  return (
    <div>
      <div style={{ background: '#1e293b', borderRadius: 12, padding: '14px 16px', boxShadow: '0 16px 40px rgba(15,23,42,0.22)', marginBottom: 12 }}>
        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{ width: 32, height: 32, background: '#dc2626', borderRadius: 7, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon d={ICONS.zap} size={14} style={{ color: '#fff' }} />
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#f1f5f9', marginBottom: 3 }}>Breaking News Alert</div>
            <div style={{ fontSize: 11, color: '#94a3b8', lineHeight: 1.5 }}>आज की प्रमुख खबरों पर एक नज़र — अभी पढ़ें</div>
          </div>
        </div>
      </div>
      <div style={{ background: '#fff', border: '1px solid #f1f5f9', borderRadius: 10, padding: '12px 16px', display: 'flex', justifyContent: 'space-between' }}>
        {[{ v: '—', c: '#0f172a', l: 'Email subscribers' }, { v: '—', c: '#dc2626', l: 'Push subscribers' }, { v: '—', c: '#16a34a', l: 'Sent this month' }].map(s => (
          <div key={s.l} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: s.c }}>{s.v}</div>
            <div style={{ fontSize: 10, color: '#64748b' }}>{s.l}</div>
          </div>
        ))}
      </div>
      <p style={{ fontSize: 11, color: '#94a3b8', textAlign: 'center', marginTop: 8 }}>Stats grow with your audience</p>
    </div>
  );
}

function AnalyticsVisual() {
  return (
    <div style={{ background: '#fff', border: '1px solid #f1f5f9', borderRadius: 12, padding: 20, boxShadow: '0 8px 24px rgba(15,23,42,0.07)' }}>
      <div style={{ fontSize: 11, color: '#64748b', marginBottom: 12, fontWeight: 600 }}>TOP ARTICLES</div>
      {[{ title: 'देशभर में मानसून की दस्तक, जानें अपडेट', cat: 'India', views: '4.2K' },
        { title: 'नई सरकारी नीति की घोषणा', cat: 'Politics', views: '3.1K' },
        { title: 'आज के प्रमुख व्यापारिक समाचार', cat: 'Business', views: '2.8K' }].map((a, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid #f8fafc' }}>
          <span style={{ fontSize: 11, fontWeight: 800, color: i === 0 ? '#dc2626' : '#94a3b8', width: 14 }}>{i + 1}</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#0f172a', lineHeight: 1.3 }}>{a.title}</div>
            <span style={{ fontSize: 10, color: '#94a3b8' }}>{a.cat}</span>
          </div>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#475569' }}>{a.views}</span>
        </div>
      ))}
    </div>
  );
}

function FeatureShowcaseSection() {
  return (
    <section style={{ padding: '96px 24px', background: '#f8fafc' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 96 }}>
        <ShowcaseRow number="01" titleKey="showcase.01.title" descKey="showcase.01.desc" visual={<AdminDashboardVisual />} />
        <ShowcaseRow number="02" titleKey="showcase.02.title" descKey="showcase.02.desc" visual={<BrandingVisual />} reverse />
        <ShowcaseRow number="03" titleKey="showcase.03.title" descKey="showcase.03.desc" visual={<NotificationsVisual />} />
        <ShowcaseRow number="04" titleKey="showcase.04.title" descKey="showcase.04.desc" visual={<AnalyticsVisual />} reverse />
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════
   WEBSITE + APP SECTION — fully translated
══════════════════════════════════════════════ */
function WebsiteAppSection() {
  const { t, lang } = useI18n();
  const isDevanagari = lang === 'hi' || lang === 'bho';

  return (
    <section style={{ padding: '96px 24px', background: '#fff' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <Reveal>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <Pill><Icon d={ICONS.smartphone} size={12} /> {t('platform.pill')}</Pill>
            <h2 style={{
              marginTop: 16,
              fontSize: isDevanagari ? 'clamp(22px, 3.5vw, 36px)' : 'clamp(26px, 4vw, 40px)',
              fontWeight: 800, color: '#0f172a',
              letterSpacing: isDevanagari ? '0' : '-0.03em',
              lineHeight: isDevanagari ? 1.4 : 1.15,
            }}>
              {t('platform.title1')}<br />
              {t('platform.titleMid')} <em style={{ fontStyle: 'normal', color: '#dc2626' }}>{t('platform.titleAccent')}</em> {t('platform.titleEnd')}
            </h2>
            <p style={{ marginTop: 14, fontSize: 16, color: '#64748b', maxWidth: 480, margin: '14px auto 0', lineHeight: isDevanagari ? 1.8 : 1.7 }}>
              {t('platform.description')}
            </p>
          </div>
        </Reveal>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 32, alignItems: 'center' }} className="sangtx-platform-grid">
          {/* Website column */}
          <Reveal>
            <div style={{ background: '#f8fafc', borderRadius: 14, border: '1px solid #f1f5f9', overflow: 'hidden', boxShadow: '0 8px 24px rgba(15,23,42,0.07)' }}>
              <div style={{ background: '#0f172a', padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ display: 'flex', gap: 4 }}>
                  {['#ef4444','#f59e0b','#22c55e'].map(c => <div key={c} style={{ width: 8, height: 8, borderRadius: '50%', background: c }} />)}
                </div>
                <div style={{ flex: 1, background: '#1e293b', borderRadius: 4, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: 9, color: '#64748b' }}>aajtak.com</span>
                </div>
              </div>
              <div style={{ background: '#fff', padding: 12 }}>
                <div style={{ background: '#0f172a', borderRadius: 6, padding: '6px 10px', marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#fff', fontSize: 11, fontWeight: 800 }}>Aaj <span style={{ color: '#ef4444' }}>Tak</span></span>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {['India','Politics','Sports'].map(n => <span key={n} style={{ fontSize: 7, color: '#64748b' }}>{n}</span>)}
                  </div>
                </div>
                <div style={{ height: 80, background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)', borderRadius: 6, display: 'flex', alignItems: 'flex-end', padding: '8px 10px' }}>
                  <div>
                    <div style={{ background: '#dc2626', display: 'inline-block', borderRadius: 2, padding: '1px 5px', fontSize: 7, color: '#fff', fontWeight: 700, marginBottom: 4 }}>BREAKING</div>
                    <div style={{ fontSize: 10, color: '#fff', fontWeight: 700, lineHeight: 1.3 }}>देश और दुनिया की ताज़ा खबरें</div>
                  </div>
                </div>
                {[1,2].map(i => (
                  <div key={i} style={{ marginTop: 6, background: '#f8fafc', borderRadius: 5, padding: '6px 8px', border: '1px solid #f1f5f9', display: 'flex', gap: 8 }}>
                    <div style={{ width: 40, height: 28, background: '#e2e8f0', borderRadius: 3, flexShrink: 0 }} />
                    <div>
                      <div style={{ height: 5, background: '#e2e8f0', borderRadius: 3, width: '80%', marginBottom: 4 }} />
                      <div style={{ height: 4, background: '#f1f5f9', borderRadius: 3, width: '50%' }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ textAlign: 'center', marginTop: 14 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>{t('platform.website.title')}</div>
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>{t('platform.website.desc')}</div>
            </div>
          </Reveal>

          {/* Plus divider */}
          <Reveal delay={60}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#fef2f2', border: '1px solid #fecaca', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon d={ICONS.plus} size={18} style={{ color: '#dc2626' }} />
              </div>
              <div style={{ fontSize: 12, color: '#94a3b8', fontWeight: 500 }}>{t('platform.and')}</div>
            </div>
          </Reveal>

          {/* Android App column */}
          <Reveal delay={120}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ width: 140, background: '#0f172a', borderRadius: 20, padding: '10px 6px', boxShadow: '0 16px 40px rgba(15,23,42,0.22)', border: '2px solid #1e293b' }}>
                <div style={{ background: '#fff', borderRadius: 14, overflow: 'hidden' }}>
                  <div style={{ background: '#0f172a', padding: '5px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 8, color: '#fff', fontWeight: 800 }}>Aaj <span style={{ color: '#ef4444' }}>Tak</span></span>
                    <Icon d={ICONS.bell} size={8} style={{ color: '#94a3b8' }} />
                  </div>
                  <div style={{ background: '#dc2626', padding: '2px 6px' }}>
                    <span style={{ fontSize: 7, color: '#fff' }}>● BREAKING — Click to read</span>
                  </div>
                  {[1,2,3,4].map(i => (
                    <div key={i} style={{ padding: '5px 6px', borderBottom: '1px solid #f8fafc', display: 'flex', gap: 5 }}>
                      <div style={{ width: 30, height: 22, background: '#f1f5f9', borderRadius: 3, flexShrink: 0 }} />
                      <div>
                        <div style={{ height: 4, background: '#e2e8f0', borderRadius: 2, width: '85%', marginBottom: 3 }} />
                        <div style={{ height: 3, background: '#f1f5f9', borderRadius: 2, width: '55%' }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ textAlign: 'center', marginTop: 14 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>{t('platform.app.title')}</div>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>{t('platform.app.desc')}</div>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════
   HOW IT WORKS — fully translated
══════════════════════════════════════════════ */
function HowItWorksSection() {
  const { t, lang } = useI18n();
  const isDevanagari = lang === 'hi' || lang === 'bho';

  const STEPS: Array<{ n: string; titleKey: TranslationKey; descKey: TranslationKey }> = [
    { n: '01', titleKey: 'step.01.title', descKey: 'step.01.desc' },
    { n: '02', titleKey: 'step.02.title', descKey: 'step.02.desc' },
    { n: '03', titleKey: 'step.03.title', descKey: 'step.03.desc' },
    { n: '04', titleKey: 'step.04.title', descKey: 'step.04.desc' },
    { n: '05', titleKey: 'step.05.title', descKey: 'step.05.desc' },
  ];

  return (
    <section id="how-it-works" style={{ padding: '96px 24px', background: '#f8fafc' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <Reveal>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <Pill><Icon d={ICONS.play} size={12} /> {t('howitworks.pill')}</Pill>
            <h2 style={{
              marginTop: 16,
              fontSize: isDevanagari ? 'clamp(22px, 3.5vw, 34px)' : 'clamp(26px, 4vw, 40px)',
              fontWeight: 800, color: '#0f172a',
              letterSpacing: isDevanagari ? '0' : '-0.03em',
              lineHeight: isDevanagari ? 1.35 : 1.15,
            }}>
              {t('howitworks.title')}
            </h2>
            <p style={{ marginTop: 14, fontSize: 16, color: '#64748b', maxWidth: 480, margin: '14px auto 0', lineHeight: isDevanagari ? 1.8 : 1.7 }}>
              {t('howitworks.description')}
            </p>
          </div>
        </Reveal>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 24 }}>
          {STEPS.map((step, i) => (
            <Reveal key={step.n} delay={i * 60}>
              <div style={{ position: 'relative' }}>
                {i < STEPS.length - 1 && <div style={{ position: 'absolute', top: 20, right: -12, width: 24, height: 2, background: '#e2e8f0', zIndex: 1 }} className="sangtx-step-connector" />}
                <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #f1f5f9', padding: '24px 20px', boxShadow: '0 2px 8px rgba(15,23,42,0.05)', height: '100%', minHeight: 130 }}>
                  <div style={{ fontSize: 28, fontWeight: 900, color: '#f1f5f9', lineHeight: 1, marginBottom: 12 }}>{step.n}</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', marginBottom: 8, lineHeight: isDevanagari ? 1.4 : 1.3, letterSpacing: isDevanagari ? '0' : '-0.01em' }}>
                    {t(step.titleKey)}
                  </div>
                  <div style={{ fontSize: 13, color: '#64748b', lineHeight: isDevanagari ? 1.7 : 1.6 }}>
                    {t(step.descKey)}
                  </div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
        <Reveal delay={200}>
          <div style={{ textAlign: 'center', marginTop: 48 }}>
            <div style={{ display: 'inline-block', background: '#fff', border: '1px solid #f1f5f9', borderRadius: 10, padding: '14px 28px', boxShadow: '0 2px 8px rgba(15,23,42,0.05)' }}>
              <span style={{ fontSize: 14, color: '#64748b' }}>{t('howitworks.trialNote')}</span>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════
   DEMO SECTION — fully translated
══════════════════════════════════════════════ */
function DemoSection() {
  const { navigate } = useAppNavigation();
  const { t, lang } = useI18n();
  const isDevanagari = lang === 'hi' || lang === 'bho';

  return (
    <section id="demo" style={{ padding: '96px 24px', background: '#fff' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 64, alignItems: 'center' }} className="sangtx-hero-grid">
          <Reveal>
            <Pill><Icon d={ICONS.externalLink} size={12} /> {t('demo.pill')}</Pill>
            <h2 style={{
              marginTop: 16,
              fontSize: isDevanagari ? 'clamp(20px, 3vw, 30px)' : 'clamp(26px, 4vw, 36px)',
              fontWeight: 800, color: '#0f172a',
              letterSpacing: isDevanagari ? '0' : '-0.03em',
              lineHeight: isDevanagari ? 1.45 : 1.15,
            }}>
              {t('demo.title')}
            </h2>
            <p style={{ marginTop: 14, fontSize: 15, color: '#475569', lineHeight: isDevanagari ? 1.85 : 1.75, maxWidth: 420 }}>
              {t('demo.description')}
            </p>
            <div style={{ display: 'flex', gap: 12, marginTop: 28, flexWrap: 'wrap' }}>
              <a href="/demo" onClick={e => { e.preventDefault(); navigate('/demo'); }}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#0f172a', color: '#fff', fontSize: 14, fontWeight: 600, padding: '12px 22px', borderRadius: 9, textDecoration: 'none', whiteSpace: 'nowrap' }}>
                {t('demo.exploreBtn')} <Icon d={ICONS.arrowRight} size={15} />
              </a>
              <a href="/demo/admin" onClick={e => { e.preventDefault(); navigate('/demo/admin'); }}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'transparent', color: '#0f172a', fontSize: 14, fontWeight: 600, padding: '11px 20px', borderRadius: 9, textDecoration: 'none', border: '1.5px solid #e2e8f0', whiteSpace: 'nowrap' }}>
                {t('demo.adminBtn')}
              </a>
            </div>
            <p style={{ marginTop: 12, fontSize: 12, color: '#94a3b8' }}>{t('demo.note')}</p>
          </Reveal>
          <Reveal delay={80}>
            <div style={{ background: '#f8fafc', borderRadius: 14, border: '1px solid #f1f5f9', overflow: 'hidden', boxShadow: '0 16px 48px rgba(15,23,42,0.10)' }}>
              <div style={{ background: '#1e293b', padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ display: 'flex', gap: 4 }}>
                  {['#ef4444','#f59e0b','#22c55e'].map(c => <div key={c} style={{ width: 9, height: 9, borderRadius: '50%', background: c }} />)}
                </div>
                <div style={{ flex: 1, background: '#0f172a', borderRadius: 4, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#16a34a' }} />
                  <span style={{ fontSize: 10, color: '#64748b' }}>demo.sangtx.com</span>
                </div>
              </div>
              <div style={{ background: '#fff' }}>
                <div style={{ background: '#0f172a', padding: '7px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#fff', fontSize: 12, fontWeight: 800 }}>Aaj <span style={{ color: '#ef4444' }}>Tak</span></span>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {['India','Politics','Business','Sports','Technology'].map(n => <span key={n} style={{ fontSize: 8, color: '#64748b' }}>{n}</span>)}
                  </div>
                </div>
                <div style={{ background: '#dc2626', padding: '3px 12px', fontSize: 8, color: 'rgba(255,255,255,0.9)', whiteSpace: 'nowrap', overflow: 'hidden' }}>
                  ● BREAKING: देश और दुनिया की बड़ी खबरें, एक जगह • आज की प्रमुख खबरों पर एक नज़र
                </div>
                <div style={{ padding: '10px 12px' }}>
                  <div style={{ height: 120, background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)', borderRadius: 8, display: 'flex', alignItems: 'flex-end', padding: '10px 12px', marginBottom: 8 }}>
                    <div>
                      <span style={{ background: '#dc2626', borderRadius: 2, padding: '1px 5px', fontSize: 7, color: '#fff', fontWeight: 700 }}>TOP STORY</span>
                      <div style={{ fontSize: 11, color: '#fff', fontWeight: 700, marginTop: 5, lineHeight: 1.4, maxWidth: 300 }}>देशभर से जुड़ी ताज़ा खबरें — आज की प्रमुख खबरों पर एक नज़र</div>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
                    {[1,2,3].map(i => (
                      <div key={i} style={{ background: '#f8fafc', borderRadius: 6, overflow: 'hidden', border: '1px solid #f1f5f9' }}>
                        <div style={{ height: 40, background: `hsl(${220 + i * 20}, 20%, ${88 - i * 4}%)` }} />
                        <div style={{ padding: '5px 6px' }}>
                          <div style={{ height: 4, background: '#e2e8f0', borderRadius: 2, width: '90%', marginBottom: 3 }} />
                          <div style={{ height: 3, background: '#f1f5f9', borderRadius: 2, width: '60%' }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════
   PRICING — fully translated
══════════════════════════════════════════════ */
function PricingSection() {
  const { navigate } = useAppNavigation();
  const { t, lang } = useI18n();
  const isDevanagari = lang === 'hi' || lang === 'bho';

  const PLAN_FEATURES: TranslationKey[] = [
    'plan.feature.website', 'plan.feature.cms', 'plan.feature.breaking',
    'plan.feature.reporters', 'plan.feature.branding', 'plan.feature.seo',
    'plan.feature.ads', 'plan.feature.push', 'plan.feature.newsletter',
    'plan.feature.analytics', 'plan.feature.users', 'plan.feature.security',
  ];

  return (
    <section id="pricing" style={{ padding: '96px 24px', background: '#f8fafc' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <Reveal>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <Pill><Icon d={ICONS.star} size={12} /> {t('pricing.pill')}</Pill>
            <h2 style={{
              marginTop: 16,
              fontSize: isDevanagari ? 'clamp(22px, 3.5vw, 34px)' : 'clamp(26px, 4vw, 40px)',
              fontWeight: 800, color: '#0f172a',
              letterSpacing: isDevanagari ? '0' : '-0.03em',
              lineHeight: isDevanagari ? 1.35 : 1.15,
            }}>
              {t('pricing.title')}
            </h2>
            <p style={{ marginTop: 14, fontSize: 16, color: '#64748b', maxWidth: 440, margin: '14px auto 0', lineHeight: isDevanagari ? 1.8 : 1.7 }}>
              {t('pricing.description')}
            </p>
          </div>
        </Reveal>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24, maxWidth: 720, margin: '0 auto' }}>
          {/* Monthly */}
          <Reveal>
            <div style={{ background: '#fff', borderRadius: 16, border: '1.5px solid #fecaca', padding: '36px 32px', boxShadow: '0 8px 32px rgba(220,38,38,0.10)', display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}>
              <div style={{ position: 'absolute', top: -1, left: 28, background: '#dc2626', color: '#fff', fontSize: 10, fontWeight: 700, padding: '3px 12px', borderRadius: '0 0 8px 8px', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>
                {t('pricing.monthly.badge')}
              </div>
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.1em', marginBottom: 12 }}>{t('pricing.monthly.label')}</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 3, marginBottom: 4 }}>
                  <span style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>₹</span>
                  <span style={{ fontSize: 48, fontWeight: 900, color: '#0f172a', letterSpacing: '-0.04em', lineHeight: 1 }}>499</span>
                  <span style={{ fontSize: 15, color: '#94a3b8', fontWeight: 500 }}>{t('pricing.monthly.per')}</span>
                </div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 99, padding: '4px 10px', marginBottom: 20 }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#dc2626' }} />
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#dc2626' }}>{t('pricing.monthly.free')}</span>
                </div>
              </div>
              <div style={{ flex: 1 }}>
                {PLAN_FEATURES.map(f => (
                  <div key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 9, marginBottom: 9 }}>
                    <div style={{ marginTop: 2, flexShrink: 0, width: 17, height: 17, borderRadius: '50%', background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Icon d={ICONS.check} size={9} style={{ color: '#dc2626' }} />
                    </div>
                    <span style={{ fontSize: 13, color: '#475569', lineHeight: isDevanagari ? 1.7 : 1.5 }}>{t(f)}</span>
                  </div>
                ))}
              </div>
              <button onClick={() => navigate('/onboarding')}
                style={{ marginTop: 28, width: '100%', padding: '14px', borderRadius: 10, border: 'none', background: '#dc2626', color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
                {t('pricing.startFree')}
              </button>
              <p style={{ textAlign: 'center', fontSize: 12, color: '#94a3b8', marginTop: 10, lineHeight: 1.5 }}>{t('pricing.noCard')}</p>
            </div>
          </Reveal>

          {/* Yearly */}
          <Reveal delay={80}>
            <div style={{ background: '#fff', borderRadius: 16, border: '1.5px solid #d1fae5', padding: '36px 32px', boxShadow: '0 8px 32px rgba(22,163,74,0.08)', display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}>
              <div style={{ position: 'absolute', top: -1, left: 28, background: '#16a34a', color: '#fff', fontSize: 10, fontWeight: 700, padding: '3px 12px', borderRadius: '0 0 8px 8px', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>
                {t('pricing.yearly.badge')}
              </div>
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.1em', marginBottom: 12 }}>{t('pricing.yearly.label')}</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 3, marginBottom: 4 }}>
                  <span style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>₹</span>
                  <span style={{ fontSize: 48, fontWeight: 900, color: '#0f172a', letterSpacing: '-0.04em', lineHeight: 1 }}>5,599</span>
                  <span style={{ fontSize: 15, color: '#94a3b8', fontWeight: 500 }}>{t('pricing.yearly.per')}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 99, padding: '4px 10px' }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#16a34a' }} />
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#16a34a' }}>{t('pricing.yearly.free')}</span>
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#16a34a' }}>{t('pricing.yearly.save')}</span>
                </div>
              </div>
              <div style={{ flex: 1 }}>
                {PLAN_FEATURES.map(f => (
                  <div key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 9, marginBottom: 9 }}>
                    <div style={{ marginTop: 2, flexShrink: 0, width: 17, height: 17, borderRadius: '50%', background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Icon d={ICONS.check} size={9} style={{ color: '#16a34a' }} />
                    </div>
                    <span style={{ fontSize: 13, color: '#475569', lineHeight: isDevanagari ? 1.7 : 1.5 }}>{t(f)}</span>
                  </div>
                ))}
              </div>
              <button onClick={() => navigate('/onboarding')}
                style={{ marginTop: 28, width: '100%', padding: '14px', borderRadius: 10, border: '1.5px solid #16a34a', background: '#fff', color: '#16a34a', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
                {t('pricing.startFree')}
              </button>
              <p style={{ textAlign: 'center', fontSize: 12, color: '#94a3b8', marginTop: 10, lineHeight: 1.5 }}>{t('pricing.noCard')}</p>
            </div>
          </Reveal>
        </div>

        {/* Android add-on */}
        <Reveal delay={160}>
          <div style={{ textAlign: 'center', marginTop: 36 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, background: '#fff', border: '1px solid #f1f5f9', borderRadius: 10, padding: '14px 24px', boxShadow: '0 2px 8px rgba(15,23,42,0.05)' }}>
              <Icon d={ICONS.smartphone} size={16} style={{ color: '#475569' }} />
              <span style={{ fontSize: 14, color: '#475569', lineHeight: 1.5 }}>{t('pricing.android')}</span>
            </div>
          </div>
        </Reveal>

        {/* UPI note */}
        <Reveal delay={180}>
          <div style={{ textAlign: 'center', marginTop: 16 }}>
            <span style={{ fontSize: 13, color: '#94a3b8' }}>{t('pricing.upiNote')}</span>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════
   FAQ — fully translated
══════════════════════════════════════════════ */
function FAQItem({ qKey, aKey }: { qKey: TranslationKey; aKey: TranslationKey }) {
  const { t, lang } = useI18n();
  const isDevanagari = lang === 'hi' || lang === 'bho';
  const [open, setOpen] = useState(false);
  const q = t(qKey);
  const a = t(aKey);

  return (
    <div style={{ borderBottom: '1px solid #f1f5f9' }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{ width: '100%', textAlign: 'left', padding: '18px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'none', border: 'none', cursor: 'pointer', gap: 16 }}
        aria-expanded={open}
      >
        <span style={{ fontSize: 15, fontWeight: 600, color: '#0f172a', lineHeight: isDevanagari ? 1.55 : 1.4 }}>{q}</span>
        <div style={{ flexShrink: 0, width: 22, height: 22, borderRadius: '50%', border: '1.5px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}>
          <Icon d={ICONS.chevronDown} size={12} style={{ color: '#64748b' }} />
        </div>
      </button>
      {open && (
        <div style={{ paddingBottom: 18, paddingRight: 40 }}>
          <p style={{ fontSize: 14, color: '#475569', lineHeight: isDevanagari ? 1.9 : 1.75, margin: 0 }}>{a}</p>
        </div>
      )}
    </div>
  );
}

function FAQSection() {
  const { t, lang } = useI18n();
  const isDevanagari = lang === 'hi' || lang === 'bho';

  const FAQS: Array<{ q: TranslationKey; a: TranslationKey }> = [
    { q: 'faq.q1', a: 'faq.a1' }, { q: 'faq.q2', a: 'faq.a2' },
    { q: 'faq.q3', a: 'faq.a3' }, { q: 'faq.q4', a: 'faq.a4' },
    { q: 'faq.q5', a: 'faq.a5' }, { q: 'faq.q6', a: 'faq.a6' },
    { q: 'faq.q7', a: 'faq.a7' }, { q: 'faq.q8', a: 'faq.a8' },
    { q: 'faq.q9', a: 'faq.a9' }, { q: 'faq.q10', a: 'faq.a10' },
    { q: 'faq.q11', a: 'faq.a11' },
  ];

  return (
    <section id="faq" style={{ padding: '96px 24px', background: '#fff' }}>
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        <Reveal>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <Pill>{t('faq.pill')}</Pill>
            <h2 style={{
              marginTop: 16,
              fontSize: isDevanagari ? 'clamp(22px, 3.5vw, 30px)' : 'clamp(24px, 4vw, 36px)',
              fontWeight: 800, color: '#0f172a',
              letterSpacing: isDevanagari ? '0' : '-0.03em',
              lineHeight: isDevanagari ? 1.35 : 1.15,
            }}>
              {t('faq.title')}
            </h2>
          </div>
        </Reveal>
        <div>
          {FAQS.map(faq => (
            <Reveal key={faq.q}>
              <FAQItem qKey={faq.q} aKey={faq.a} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════
   FINAL CTA — fully translated
══════════════════════════════════════════════ */
function FinalCTA() {
  const { navigate } = useAppNavigation();
  const { t, lang } = useI18n();
  const isDevanagari = lang === 'hi' || lang === 'bho';

  return (
    <section style={{ padding: '96px 24px', background: '#0f172a' }}>
      <div style={{ maxWidth: 700, margin: '0 auto', textAlign: 'center' }}>
        <Reveal>
          <h2 style={{
            fontSize: isDevanagari ? 'clamp(24px, 4vw, 40px)' : 'clamp(28px, 5vw, 48px)',
            fontWeight: 900, color: '#f1f5f9',
            letterSpacing: isDevanagari ? '0' : '-0.035em',
            lineHeight: isDevanagari ? 1.35 : 1.1,
          }}>
            {t('cta.title1')}<br />
            <span style={{ color: '#ef4444' }}>{t('cta.titleAccent')}</span>
          </h2>
          <p style={{ marginTop: 18, fontSize: 16, color: '#94a3b8', lineHeight: isDevanagari ? 1.8 : 1.7, maxWidth: 460, margin: '18px auto 0' }}>
            {t('cta.description')}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 36, flexWrap: 'wrap' }}>
            <button onClick={() => navigate('/onboarding')}
              style={{ background: '#dc2626', color: '#fff', fontSize: 15, fontWeight: 700, padding: '14px 30px', borderRadius: 10, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap' }}>
              {t('cta.startFree')} <Icon d={ICONS.arrowRight} size={16} />
            </button>
            <button onClick={() => document.getElementById('demo')?.scrollIntoView({ behavior: 'smooth' })}
              style={{ background: 'transparent', color: '#f1f5f9', fontSize: 15, fontWeight: 600, padding: '13px 26px', borderRadius: 10, border: '1.5px solid rgba(255,255,255,0.15)', cursor: 'pointer', whiteSpace: 'nowrap' }}>
              {t('cta.viewDemo')}
            </button>
          </div>
          <p style={{ marginTop: 16, fontSize: 13, color: '#475569', lineHeight: 1.5 }}>
            {t('cta.trialNote')}
          </p>
        </Reveal>
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════
   FOOTER — fully translated
══════════════════════════════════════════════ */
function SiteFooter() {
  const { navigate } = useAppNavigation();
  const { t, lang } = useI18n();
  const isDevanagari = lang === 'hi' || lang === 'bho';
  function nav(to: string) { navigate(to); window.scrollTo(0, 0); }

  return (
    <footer style={{ background: '#0f172a', borderTop: '1px solid rgba(255,255,255,0.06)', padding: '48px 24px 32px' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr 1fr 1fr', gap: 40, marginBottom: 48 }} className="sangtx-footer-grid">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 14 }}>
              <div style={{ width: 30, height: 30, background: '#dc2626', borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ color: '#fff', fontSize: 13, fontWeight: 800 }}>S</span>
              </div>
              <span style={{ fontSize: 17, fontWeight: 800, color: '#f1f5f9', letterSpacing: '-0.04em' }}>SangTX</span>
            </div>
            <p style={{ fontSize: 13, color: '#64748b', lineHeight: isDevanagari ? 1.8 : 1.7, maxWidth: 260 }}>
              {t('footer.description')}
            </p>
            <div style={{ marginTop: 16 }}>
              <LanguageSwitcher variant="compact" />
            </div>
          </div>

          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.08em', marginBottom: 14 }}>{t('footer.product')}</div>
            {(['features','pricing','demo'] as const).map(l => (
              <button key={l} onClick={() => document.getElementById(l)?.scrollIntoView({ behavior: 'smooth' })}
                style={{ display: 'block', fontSize: 13, color: '#64748b', marginBottom: 10, background: 'none', border: 'none', cursor: 'pointer', padding: 0, textAlign: 'left', lineHeight: 1.5 }}>
                {t(`footer.${l}` as TranslationKey)}
              </button>
            ))}
          </div>

          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.08em', marginBottom: 14 }}>{t('footer.company')}</div>
            <button onClick={() => nav('/contact')} style={{ display: 'block', fontSize: 13, color: '#64748b', marginBottom: 10, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
              {t('footer.contact')}
            </button>
          </div>

          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.08em', marginBottom: 14 }}>{t('footer.account')}</div>
            <button onClick={() => nav('/login')} style={{ display: 'block', fontSize: 13, color: '#64748b', marginBottom: 10, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
              {t('footer.login')}
            </button>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.08em', margin: '20px 0 14px' }}>{t('footer.legal')}</div>
            <button onClick={() => nav('/privacy')} style={{ display: 'block', fontSize: 13, color: '#64748b', marginBottom: 10, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
              {t('footer.privacy')}
            </button>
            <button onClick={() => nav('/terms')} style={{ display: 'block', fontSize: 13, color: '#64748b', marginBottom: 10, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
              {t('footer.terms')}
            </button>
          </div>
        </div>
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <span style={{ fontSize: 12, color: '#475569' }}>
            {t('footer.copyright', { year: String(new Date().getFullYear()) })}
          </span>
          <span style={{ fontSize: 12, color: '#334155' }}>{t('footer.builtBy')}</span>
        </div>
      </div>
    </footer>
  );
}

/* ══════════════════════════════════════════════
   RESPONSIVE + DEVANAGARI TYPOGRAPHY CSS
══════════════════════════════════════════════ */
const GLOBAL_CSS = `
  /* ── Latin font stack (English) ──────────────────────────────── */
  body {
    font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  }

  /* ── Devanagari font stack (Hindi / Bhojpuri) ────────────────── */
  @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Devanagari:wght@400;500;600;700;800;900&display=swap');

  body.lang-devanagari,
  body[data-lang="hi"],
  body[data-lang="bho"] {
    font-family: "Noto Sans Devanagari", "Noto Sans", Arial, sans-serif;
    /* Devanagari needs more line-height and no negative letter-spacing */
    letter-spacing: 0 !important;
  }

  body.lang-devanagari h1,
  body.lang-devanagari h2,
  body.lang-devanagari h3,
  body[data-lang="hi"] h1,
  body[data-lang="hi"] h2,
  body[data-lang="hi"] h3,
  body[data-lang="bho"] h1,
  body[data-lang="bho"] h2,
  body[data-lang="bho"] h3 {
    letter-spacing: 0 !important;
    word-spacing: 0.05em;
    font-family: "Noto Sans Devanagari", "Noto Sans", Arial, sans-serif;
  }

  body.lang-devanagari p,
  body[data-lang="hi"] p,
  body[data-lang="bho"] p {
    font-family: "Noto Sans Devanagari", "Noto Sans", Arial, sans-serif;
    word-spacing: 0.02em;
  }

  /* ── Hover states ─────────────────────────────────────────────── */
  .sangtx-nav-link:hover { color: #0f172a !important; background: #f8fafc !important; }
  .sangtx-feature-card:hover { background: #fafafa !important; }

  /* ── Mobile burger ────────────────────────────────────────────── */
  @media (max-width: 767px) {
    .sangtx-burger { display: flex !important; }
    .sangtx-header-cta { display: none !important; }
    .sangtx-hero-grid { grid-template-columns: 1fr !important; gap: 40px !important; }
    .sangtx-hero-visual { order: -1; }
    .sangtx-showcase-row { grid-template-columns: 1fr !important; gap: 40px !important; }
    .sangtx-showcase-reverse .sangtx-order-1 { order: 1; }
    .sangtx-showcase-reverse .sangtx-order-2 { order: 2; }
    .sangtx-platform-grid { grid-template-columns: 1fr !important; }
    .sangtx-footer-grid { grid-template-columns: 1fr 1fr !important; gap: 32px !important; }
    .sangtx-step-connector { display: none !important; }
  }

  /* ── Tablet ───────────────────────────────────────────────────── */
  @media (min-width: 768px) and (max-width: 1023px) {
    .sangtx-hero-grid { grid-template-columns: 1fr 1fr !important; gap: 40px !important; }
    .sangtx-footer-grid { grid-template-columns: 1fr 1fr !important; }
    .sangtx-platform-grid { grid-template-columns: 1fr auto 1fr !important; }
    .sangtx-showcase-row { grid-template-columns: 1fr 1fr !important; gap: 40px !important; }
  }

  /* ── Small mobile ─────────────────────────────────────────────── */
  @media (max-width: 430px) {
    .sangtx-footer-grid { grid-template-columns: 1fr !important; }
  }

  /* ── Reduced motion ───────────────────────────────────────────── */
  @media (prefers-reduced-motion: reduce) {
    * { transition: none !important; animation: none !important; }
  }

  /* ── Focus visible ────────────────────────────────────────────── */
  button:focus-visible, a:focus-visible {
    outline: 2px solid #dc2626;
    outline-offset: 3px;
    border-radius: 4px;
  }

  /* ── Button overflow fix for long Devanagari text ─────────────── */
  button, a {
    min-width: 0;
    word-break: keep-all;
    overflow-wrap: break-word;
  }
`;

/* ══════════════════════════════════════════════
   ROOT EXPORT
══════════════════════════════════════════════ */
export function SangTXHomePage() {
  const { t, lang } = useI18n();
  const isDevanagari = lang === 'hi' || lang === 'bho';

  // ── Localized SEO metadata ──
  useEffect(() => {
    document.title = t('meta.title');

    function setMeta(sel: string, attr: 'name' | 'property', val: string) {
      let el = document.head.querySelector<HTMLMetaElement>(sel);
      if (!el) {
        el = document.createElement('meta');
        document.head.appendChild(el);
      }
      el.setAttribute(attr, sel.replace(/meta\[(name|property)="/, '').replace('"]', ''));
      el.setAttribute('content', val);
    }

    setMeta('meta[name="description"]', 'name', t('meta.description'));
    setMeta('meta[name="robots"]', 'name', 'index,follow');
    setMeta('meta[property="og:title"]', 'property', t('meta.og.title'));
    setMeta('meta[property="og:description"]', 'property', t('meta.og.description'));
    setMeta('meta[property="og:type"]', 'property', 'website');

    let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      document.head.appendChild(canonical);
    }
    canonical.href = window.location.origin + '/';
  }, [lang, t]);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: GLOBAL_CSS }} />
      <div style={{
        fontFamily: isDevanagari
          ? '"Noto Sans Devanagari", "Noto Sans", Arial, sans-serif'
          : 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        color: '#0f172a',
        background: '#fff',
      }}>
        <SiteHeader />
        <main id="main-content">
          <HeroSection />
          <TrustBar />
          <FeaturesSection />
          <FeatureShowcaseSection />
          <WebsiteAppSection />
          <HowItWorksSection />
          <DemoSection />
          <PricingSection />
          <FAQSection />
          <FinalCTA />
        </main>
        <SiteFooter />
      </div>
    </>
  );
}
