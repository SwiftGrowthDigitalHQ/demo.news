import { useState, useEffect, useRef, useCallback } from 'react';
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  useReducedMotion,
  AnimatePresence,
} from 'framer-motion';
import { useAppNavigation } from '../lib/navigation';
import { useI18n, type TranslationKey } from '../lib/i18n';
import { LanguageSwitcher } from '../components/LanguageSwitcher';

/* ─────────────────────────────────────────────
   SANGTX PUBLIC HOMEPAGE  ·  Fully localised
   Premium Motion Edition — Framer Motion v11
   ───────────────────────────────────────────── */

/* ── Motion tokens ──────────────────────────── */
const DUR = {
  fast:      0.18,
  normal:    0.32,
  smooth:    0.52,
  cinematic: 0.82,
} as const;

const EASE = {
  out:      [0.0, 0.0, 0.2, 1.0] as const,
  outQuart: [0.25, 1, 0.5, 1]    as const,
  cinema:   [0.16, 1, 0.3, 1]    as const,
} as const;

const SPR = {
  snappy:   { type: 'spring' as const, stiffness: 400, damping: 30 },
  gentle:   { type: 'spring' as const, stiffness: 280, damping: 22 },
  float:    { type: 'spring' as const, stiffness: 120, damping: 18 },
  magnetic: { type: 'spring' as const, stiffness: 350, damping: 25 },
} as const;

/* ── Framer Motion variants ─────────────────── */
const V = {
  // Hero sequence
  heroSeq: {
    hidden: {},
    visible: { transition: { staggerChildren: 0.11, delayChildren: 0.08 } },
  },
  heroBadge: {
    hidden: { opacity: 0, scale: 0.84, y: 8 },
    visible: { opacity: 1, scale: 1, y: 0, transition: { duration: DUR.normal, ease: EASE.outQuart } },
  },
  heroTitle: {
    hidden: { opacity: 0, y: 28, filter: 'blur(6px)' },
    visible: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: DUR.cinematic, ease: EASE.cinema } },
  },
  heroDesc: {
    hidden: { opacity: 0, y: 16 },
    visible: { opacity: 1, y: 0, transition: { duration: DUR.smooth, ease: EASE.outQuart } },
  },
  heroCta: {
    hidden: { opacity: 0, y: 12 },
    visible: { opacity: 1, y: 0, transition: { duration: DUR.normal, ease: EASE.out } },
  },
  // Dashboard entrance
  dashboard: {
    hidden: { opacity: 0, scale: 0.9, rotateX: 8, y: 36 },
    visible: {
      opacity: 1, scale: 1, rotateX: 2, y: 0,
      transition: { duration: DUR.cinematic + 0.18, ease: EASE.cinema },
    },
  },
  // Floating badges
  floatBadge: {
    hidden: { opacity: 0, scale: 0.78, y: 14 },
    visible: { opacity: 1, scale: 1, y: 0, transition: SPR.gentle },
  },
  // Stagger containers
  staggerSlow: {
    hidden: {},
    visible: { transition: { staggerChildren: 0.09, delayChildren: 0 } },
  },
  staggerFast: {
    hidden: {},
    visible: { transition: { staggerChildren: 0.04, delayChildren: 0 } },
  },
  // Scroll reveal children
  fadeUp: {
    hidden: { opacity: 0, y: 22 },
    visible: { opacity: 1, y: 0, transition: { duration: DUR.smooth, ease: EASE.outQuart } },
  },
  cardReveal: {
    hidden: { opacity: 0, y: 18, scale: 0.97 },
    visible: { opacity: 1, y: 0, scale: 1, transition: { duration: DUR.smooth, ease: EASE.outQuart } },
  },
  scaleIn: {
    hidden: { opacity: 0, scale: 0.88 },
    visible: { opacity: 1, scale: 1, transition: SPR.gentle },
  },
} as const;

/* ── Hooks ──────────────────────────────────── */

// Pointer-based parallax — MotionValues only, no React state re-render
function usePointerParallax() {
  const pX = useMotionValue(0);
  const pY = useMotionValue(0);

  const bindMove = useCallback((e: React.PointerEvent<HTMLElement>) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    pX.set((e.clientX - rect.left) / rect.width - 0.5);
    pY.set((e.clientY - rect.top) / rect.height - 0.5);
  }, [pX, pY]);

  const bindLeave = useCallback(() => {
    pX.set(0);
    pY.set(0);
  }, [pX, pY]);

  return { pX, pY, bindMove, bindLeave };
}

// Ambient float loop — rAF, no state
function useFloat(amplitude = 5, period = 5200): ReturnType<typeof useMotionValue<number>> {
  const y = useMotionValue(0);
  const shouldReduce = useReducedMotion();
  useEffect(() => {
    if (shouldReduce) return;
    let id: number;
    const start = performance.now();
    const tick = (now: number) => {
      y.set(Math.sin(((now - start) / period) * Math.PI * 2) * amplitude);
      id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [y, amplitude, period, shouldReduce]);
  return y;
}

// 3D tilt — spring-backed, pointer-driven
function useTilt(maxTilt = 5) {
  const rX = useMotionValue(0);
  const rY = useMotionValue(0);
  const sc = useMotionValue(1);
  const rotateX = useSpring(rX, SPR.snappy);
  const rotateY = useSpring(rY, SPR.snappy);
  const scale   = useSpring(sc, SPR.snappy);
  const shouldReduce = useReducedMotion();

  const onMove = useCallback((e: React.PointerEvent<HTMLElement>) => {
    if (shouldReduce) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    rX.set(((e.clientY - rect.top)  / rect.height - 0.5) * -maxTilt * 2);
    rY.set(((e.clientX - rect.left) / rect.width  - 0.5) *  maxTilt * 2);
    sc.set(1.012);
  }, [rX, rY, sc, maxTilt, shouldReduce]);

  const onLeave = useCallback(() => {
    rX.set(0); rY.set(0); sc.set(1);
  }, [rX, rY, sc]);

  return { rotateX, rotateY, scale, onMove, onLeave };
}

// Magnetic button effect
function useMagnetic(strength = 0.22) {
  const rX = useMotionValue(0);
  const rY = useMotionValue(0);
  const x = useSpring(rX, SPR.magnetic);
  const y = useSpring(rY, SPR.magnetic);
  const shouldReduce = useReducedMotion();

  const onMove = useCallback((e: React.PointerEvent<HTMLElement>) => {
    if (shouldReduce) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    rX.set((e.clientX - rect.left - rect.width  / 2) * strength);
    rY.set((e.clientY - rect.top  - rect.height / 2) * strength);
  }, [rX, rY, strength, shouldReduce]);

  const onLeave = useCallback(() => { rX.set(0); rY.set(0); }, [rX, rY]);

  return { x, y, onMove, onLeave };
}

/* ── Icon paths ─────────────────────────────── */
const ICONS = {
  menu:         'M3 12h18M3 6h18M3 18h18',
  x:            'M18 6 6 18M6 6l12 12',
  arrowRight:   'M5 12h14M12 5l7 7-7 7',
  check:        'M20 6 9 17l-5-5',
  chevronDown:  'M6 9l6 6 6-6',
  newspaper:    'M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a4 4 0 0 1-4-4V6',
  layout:       'M3 3h18v18H3zM3 9h18M9 21V9',
  smartphone:   'M17 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2zM12 18h.01',
  palette:      'M2 12a10 10 0 1 0 20 0 10 10 0 0 0-20 0M12 8v4M12 16h.01',
  bell:         'M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.94 1.94 0 0 0 3.4 0',
  barChart:     'M3 3v18h18M18 17V9M13 17V5M8 17v-3',
  search:       'M21 21l-6-6m2-5a7 7 0 1 1-14 0 7 7 0 0 1 14 0',
  image:        'M21 9l-9-9-9 9v11a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9zM9 22V12h6v10',
  users:        'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75',
  globe:        'M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2zM2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z',
  tag:          'M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82zM7 7h.01',
  zap:          'M13 2 3 14h9l-1 8 10-12h-9l1-8z',
  shield:       'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
  plus:         'M12 5v14M5 12h14',
  star:         'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z',
  play:         'M5 3l14 9-14 9V3z',
  externalLink: 'M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14 21 3',
};

function Icon({ d, size = 20, className, style }: {
  d: string; size?: number; className?: string; style?: React.CSSProperties;
}) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"
      strokeLinejoin="round" className={className} style={style} aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      background: '#fef2f2', color: '#b91c1c', fontSize: 12, fontWeight: 600,
      letterSpacing: '0.04em', padding: '4px 12px', borderRadius: 99,
      border: '1px solid #fecaca',
    }}>
      {children}
    </span>
  );
}

/* ── ScrollReveal — viewport-triggered, replaces old Reveal ── */
function Reveal({
  children, delay = 0, className, preset = 'fadeUp',
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  preset?: 'fadeUp' | 'cardReveal' | 'scaleIn';
}) {
  const shouldReduce = useReducedMotion();
  if (shouldReduce) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      variants={V[preset]}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.1 }}
      transition={{ delay: delay / 1000 }}
    >
      {children}
    </motion.div>
  );
}

/* ══════════════════════════════════════════════
   HEADER — with scroll-aware elevation + nav link
   hover underline slide + magnetic CTA
══════════════════════════════════════════════ */
function SiteHeader() {
  const { navigate } = useAppNavigation();
  const { t } = useI18n();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const shouldReduce = useReducedMotion();

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', h, { passive: true });
    return () => window.removeEventListener('scroll', h);
  }, []);

  const navLinks = [
    { label: t('nav.features'),    href: '#features' },
    { label: t('nav.howItWorks'),  href: '#how-it-works' },
    { label: t('nav.pricing'),     href: '#pricing' },
    { label: t('nav.demo'),        href: '#demo' },
  ];

  function anchor(href: string) {
    setMenuOpen(false);
    if (href.startsWith('#')) document.getElementById(href.slice(1))?.scrollIntoView({ behavior: 'smooth' });
  }

  // Magnetic CTA
  const ctaMag = useMagnetic(0.18);

  return (
    <motion.header
      style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: scrolled ? 'rgba(255,255,255,0.97)' : '#fff',
        borderBottom: '1px solid #f1f5f9',
        backdropFilter: scrolled ? 'blur(10px)' : 'none',
        boxShadow: scrolled ? '0 1px 16px rgba(15,23,42,0.08)' : 'none',
        transition: 'box-shadow 0.25s ease, backdrop-filter 0.25s ease',
      }}
      initial={shouldReduce ? false : { opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: DUR.normal, ease: EASE.out }}
    >
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px' }} className="sangtx-header-inner">
        <div style={{ display: 'flex', alignItems: 'center', height: 60, gap: 32 }}>

          {/* Logo */}
          <motion.a
            href="/" onClick={e => { e.preventDefault(); navigate('/'); }}
            style={{ display: 'flex', alignItems: 'center', gap: 9, textDecoration: 'none', flexShrink: 0 }}
            aria-label={t('nav.aria.home')}
            whileHover={shouldReduce ? undefined : { scale: 1.02 }}
            transition={SPR.snappy}
          >
            <motion.div
              style={{ width: 32, height: 32, background: '#dc2626', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
              whileHover={shouldReduce ? undefined : { scale: 1.05, rotate: -2 }}
              transition={SPR.gentle}
            >
              <span style={{ color: '#fff', fontSize: 14, fontWeight: 800, letterSpacing: '-0.03em' }}>S</span>
            </motion.div>
            <span style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.04em' }}>SangTX</span>
          </motion.a>

          {/* Desktop nav */}
          <nav style={{ display: 'flex', alignItems: 'center', gap: 4, flex: 1 }} className="sangtx-nav-desktop" aria-label={t('nav.aria.main')}>
            {navLinks.map(link => (
              <NavLink key={link.href} label={link.label} onClick={() => anchor(link.href)} />
            ))}
          </nav>

          {/* CTA area */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }} className="sangtx-header-cta">
            <LanguageSwitcher variant="compact" />
            <motion.a
              href="/login" onClick={e => { e.preventDefault(); navigate('/login'); }}
              style={{ fontSize: 14, fontWeight: 500, color: '#475569', textDecoration: 'none', padding: '6px 14px', borderRadius: 6 }}
              whileHover={shouldReduce ? undefined : { color: '#0f172a', background: '#f8fafc' }}
              transition={{ duration: DUR.fast }}
            >
              {t('nav.login')}
            </motion.a>

            {/* Magnetic primary CTA */}
            <motion.button
              onClick={() => navigate('/onboarding')}
              style={{ background: '#dc2626', color: '#fff', fontSize: 14, fontWeight: 600, padding: '8px 20px', borderRadius: 8, border: 'none', cursor: 'pointer', whiteSpace: 'nowrap', x: ctaMag.x, y: ctaMag.y }}
              onPointerMove={ctaMag.onMove}
              onPointerLeave={ctaMag.onLeave}
              whileHover={shouldReduce ? undefined : { scale: 1.02, background: '#b91c1c', boxShadow: '0 4px 16px rgba(220,38,38,0.35)' }}
              whileTap={shouldReduce ? undefined : { scale: 0.97 }}
              transition={SPR.snappy}
            >
              {t('nav.startFree')}
            </motion.button>
          </div>

          {/* Mobile burger */}
          <motion.button
            onClick={() => setMenuOpen(v => !v)}
            aria-label={menuOpen ? t('nav.aria.closeMenu') : t('nav.aria.openMenu')}
            style={{ display: 'none', background: 'none', border: 'none', cursor: 'pointer', color: '#0f172a', padding: 8, minHeight: 44, minWidth: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 8, marginLeft: 'auto' }}
            className="sangtx-burger"
            whileTap={shouldReduce ? undefined : { scale: 0.92 }}
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={menuOpen ? 'x' : 'menu'}
                initial={shouldReduce ? false : { opacity: 0, rotate: -90 }}
                animate={{ opacity: 1, rotate: 0 }}
                exit={{ opacity: 0, rotate: 90 }}
                transition={{ duration: DUR.fast }}
              >
                <Icon d={menuOpen ? ICONS.x : ICONS.menu} size={22} />
              </motion.span>
            </AnimatePresence>
          </motion.button>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            style={{ borderTop: '1px solid #f1f5f9', background: '#fff', padding: '8px 16px 20px', overflow: 'hidden' }}
            className="sangtx-mobile-menu"
            initial={shouldReduce ? false : { opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: DUR.normal, ease: EASE.outQuart }}
          >
            <nav aria-label={t('nav.aria.main')}>
              {navLinks.map((link, i) => (
                <motion.button
                  key={link.href}
                  onClick={() => anchor(link.href)}
                  style={{ display: 'block', width: '100%', textAlign: 'left', padding: '12px 4px', fontSize: 16, fontWeight: 500, color: '#0f172a', background: 'none', border: 'none', cursor: 'pointer', borderBottom: '1px solid #f8fafc', minHeight: 44 }}
                  initial={shouldReduce ? false : { opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05, duration: DUR.normal, ease: EASE.out }}
                >
                  {link.label}
                </motion.button>
              ))}
            </nav>
            <div style={{ paddingTop: 12, marginBottom: 8 }}>
              <LanguageSwitcher variant="pills" />
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 8 }} className="sangtx-mobile-menu-auth">
              <a href="/login" onClick={e => { e.preventDefault(); navigate('/login'); setMenuOpen(false); }}
                style={{ flex: 1, textAlign: 'center', padding: '12px', fontSize: 14, fontWeight: 500, color: '#475569', textDecoration: 'none', border: '1px solid #e2e8f0', borderRadius: 8, minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {t('nav.login')}
              </a>
              <button onClick={() => { navigate('/onboarding'); setMenuOpen(false); }}
                style={{ flex: 1, background: '#dc2626', color: '#fff', fontSize: 14, fontWeight: 600, padding: '12px', borderRadius: 8, border: 'none', cursor: 'pointer', minHeight: 44 }}>
                {t('nav.startFree')}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}

// Premium nav link with slide-under indicator
function NavLink({ label, onClick }: { label: string; onClick: () => void }) {
  const [hovered, setHovered] = useState(false);
  const shouldReduce = useReducedMotion();
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ position: 'relative', padding: '6px 14px', fontSize: 14, fontWeight: 500, color: hovered ? '#0f172a' : '#475569', background: 'none', border: 'none', cursor: 'pointer', borderRadius: 6, transition: 'color 0.15s ease' }}
      className="sangtx-nav-link"
    >
      {label}
      {!shouldReduce && (
        <motion.span
          style={{ position: 'absolute', bottom: 2, left: 14, right: 14, height: 2, background: '#dc2626', borderRadius: 2 }}
          initial={{ scaleX: 0, opacity: 0 }}
          animate={{ scaleX: hovered ? 1 : 0, opacity: hovered ? 1 : 0 }}
          transition={{ duration: DUR.fast, ease: EASE.outQuart }}
        />
      )}
    </button>
  );
}

/* ══════════════════════════════════════════════
   HERO SECTION — Signature premium experience
   ─ Cinematic entrance sequence
   ─ Pointer parallax on product visualization
   ─ Ambient floating badges
   ─ Magnetic primary CTA
   ─ 3D dashboard depth
══════════════════════════════════════════════ */
function HeroSection() {
  const { navigate } = useAppNavigation();
  const { t, lang } = useI18n();
  const isDevanagari = lang === 'hi' || lang === 'bho';
  const shouldReduce = useReducedMotion();

  // Detect touch
  const isTouch = typeof window !== 'undefined' && window.matchMedia('(hover: none)').matches;

  // Parallax — product visualization responds to pointer
  const { pX, pY, bindMove, bindLeave } = usePointerParallax();

  // Parallax layers with different depths
  const dashX  = useSpring(useTransform(pX, [-0.5, 0.5], shouldReduce || isTouch ? [0,0] : [-8,  8]),  SPR.float);
  const dashY  = useSpring(useTransform(pY, [-0.5, 0.5], shouldReduce || isTouch ? [0,0] : [-5,  5]),  SPR.float);
  const badg1X = useSpring(useTransform(pX, [-0.5, 0.5], shouldReduce || isTouch ? [0,0] : [-14, 14]), SPR.float);
  const badg1Y = useSpring(useTransform(pY, [-0.5, 0.5], shouldReduce || isTouch ? [0,0] : [-10, 10]), SPR.float);
  const badg2X = useSpring(useTransform(pX, [-0.5, 0.5], shouldReduce || isTouch ? [0,0] : [ 12,-12]), SPR.float);
  const badg2Y = useSpring(useTransform(pY, [-0.5, 0.5], shouldReduce || isTouch ? [0,0] : [ -8,  8]), SPR.float);

  // Magnetic CTA
  const ctaMag = useMagnetic(0.20);

  // Ambient float for badges
  const floatAnim1 = useFloat(4, 4800);
  const floatAnim2 = useFloat(5, 6200);

  return (
    <section
      style={{ background: '#fff', paddingTop: 80, paddingBottom: 80, overflow: 'hidden', position: 'relative' }}
      className="sangtx-hero-section"
      onPointerMove={isTouch || shouldReduce ? undefined : bindMove}
      onPointerLeave={isTouch || shouldReduce ? undefined : bindLeave}
    >
      {/* Subtle background atmosphere */}
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }} aria-hidden="true">
        <div style={{
          position: 'absolute', top: '-15%', right: '-5%',
          width: '55%', height: '70%',
          background: 'radial-gradient(ellipse at center, rgba(220,38,38,0.045) 0%, transparent 65%)',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', bottom: '-10%', left: '-5%',
          width: '45%', height: '60%',
          background: 'radial-gradient(ellipse at center, rgba(15,23,42,0.035) 0%, transparent 65%)',
          pointerEvents: 'none',
        }} />
      </div>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', position: 'relative' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 64, alignItems: 'center' }} className="sangtx-hero-grid">

          {/* ── Text Column ── */}
          <motion.div
            className="sangtx-hero-text"
            variants={V.heroSeq}
            initial="hidden"
            animate="visible"
          >
            <motion.div variants={V.heroBadge}>
              <Pill><Icon d={ICONS.zap} size={12} /> {t('hero.pill')}</Pill>
            </motion.div>

            <motion.h1
              variants={V.heroTitle}
              style={{
                marginTop: 20,
                fontSize: isDevanagari ? 'clamp(28px,4.5vw,48px)' : 'clamp(32px,5vw,54px)',
                fontWeight: 800, color: '#0f172a',
                lineHeight: isDevanagari ? 1.3 : 1.1,
                letterSpacing: isDevanagari ? '0' : '-0.03em',
              }}
            >
              {t('hero.title1')}<br />
              {t('hero.title2')}<br />
              <motion.span
                style={{ color: '#dc2626', display: 'inline-block' }}
                initial={shouldReduce ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6, duration: DUR.smooth }}
              >
                {t('hero.titleAccent')}
              </motion.span>
            </motion.h1>

            <motion.p
              variants={V.heroDesc}
              style={{
                marginTop: 20,
                fontSize: isDevanagari ? 16 : 17,
                color: '#475569',
                lineHeight: isDevanagari ? 1.8 : 1.7,
                maxWidth: 480,
              }}
            >
              {t('hero.description')}
            </motion.p>

            <motion.div
              variants={V.heroCta}
              style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 32, flexWrap: 'wrap' }}
              className="sangtx-hero-cta"
            >
              {/* Primary CTA — magnetic */}
              <motion.button
                onClick={() => navigate('/onboarding')}
                style={{
                  background: '#dc2626', color: '#fff', fontSize: 15, fontWeight: 700,
                  padding: '13px 28px', borderRadius: 9, border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 8, minHeight: 44,
                  x: ctaMag.x, y: ctaMag.y,
                }}
                onPointerMove={ctaMag.onMove}
                onPointerLeave={ctaMag.onLeave}
                whileHover={shouldReduce ? undefined : {
                  scale: 1.02, background: '#b91c1c',
                  boxShadow: '0 6px 24px rgba(220,38,38,0.38)',
                }}
                whileTap={shouldReduce ? undefined : { scale: 0.97 }}
                transition={SPR.snappy}
              >
                {t('hero.startFree')}
                <motion.span
                  animate={shouldReduce ? undefined : { x: [0, 3, 0] }}
                  transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut' }}
                >
                  <Icon d={ICONS.arrowRight} size={16} />
                </motion.span>
              </motion.button>

              {/* Secondary CTA */}
              <motion.button
                onClick={() => document.getElementById('demo')?.scrollIntoView({ behavior: 'smooth' })}
                style={{ background: 'transparent', color: '#0f172a', fontSize: 15, fontWeight: 600, padding: '12px 24px', borderRadius: 9, border: '1.5px solid #e2e8f0', cursor: 'pointer', minHeight: 44 }}
                whileHover={shouldReduce ? undefined : { borderColor: '#dc2626', color: '#dc2626', background: '#fef2f2' }}
                whileTap={shouldReduce ? undefined : { scale: 0.97 }}
                transition={{ duration: DUR.fast }}
              >
                {t('hero.viewDemo')}
              </motion.button>
            </motion.div>

            <motion.p
              variants={V.heroDesc}
              style={{ marginTop: 14, fontSize: 13, color: '#94a3b8' }}
            >
              {t('hero.trialNote')}
            </motion.p>
          </motion.div>

          {/* ── Product Visualization Column ── */}
          <motion.div
            className="sangtx-hero-visual"
            variants={V.heroSeq}
            initial="hidden"
            animate="visible"
          >
            <ProductPreviewCard
              dashX={dashX} dashY={dashY}
              badg1X={badg1X} badg1Y={badg1Y} badg1Float={floatAnim1}
              badg2X={badg2X} badg2Y={badg2Y} badg2Float={floatAnim2}
            />
          </motion.div>
        </div>
      </div>
    </section>
  );
}

/* ── Product Preview Card — 3D depth visualization ── */
function ProductPreviewCard({
  dashX, dashY,
  badg1X, badg1Y, badg1Float,
  badg2X, badg2Y, badg2Float,
}: {
  dashX: ReturnType<typeof useMotionValue<number>>;
  dashY: ReturnType<typeof useMotionValue<number>>;
  badg1X: ReturnType<typeof useMotionValue<number>>;
  badg1Y: ReturnType<typeof useMotionValue<number>>;
  badg1Float: ReturnType<typeof useMotionValue<number>>;
  badg2X: ReturnType<typeof useMotionValue<number>>;
  badg2Y: ReturnType<typeof useMotionValue<number>>;
  badg2Float: ReturnType<typeof useMotionValue<number>>;
}) {
  const { t } = useI18n();
  const shouldReduce = useReducedMotion();
  const tilt = useTilt(3.5);

  return (
    <div className="sangtx-product-preview" style={{ position: 'relative' }}>

      {/* Dashboard — 3D depth with tilt */}
      <motion.div
        variants={V.dashboard}
        style={{
          x: dashX, y: dashY,
          rotateX: shouldReduce ? undefined : tilt.rotateX,
          rotateY: shouldReduce ? undefined : tilt.rotateY,
          scale:   shouldReduce ? undefined : tilt.scale,
          transformStyle: 'preserve-3d',
          perspective: 900,
          willChange: 'transform',
        }}
        onPointerMove={shouldReduce ? undefined : tilt.onMove}
        onPointerLeave={shouldReduce ? undefined : tilt.onLeave}
      >
        <div style={{ background: '#0f172a', borderRadius: 14, padding: 2, boxShadow: '0 32px 80px rgba(15,23,42,0.26), 0 8px 20px rgba(15,23,42,0.12)' }}>
          {/* Browser chrome */}
          <div style={{ background: '#1e293b', borderRadius: '12px 12px 0 0', padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ display: 'flex', gap: 5 }}>
              {['#ef4444','#f59e0b','#22c55e'].map(c => (
                <motion.div
                  key={c}
                  style={{ width: 10, height: 10, borderRadius: '50%', background: c }}
                  whileHover={shouldReduce ? undefined : { scale: 1.2 }}
                  transition={SPR.snappy}
                />
              ))}
            </div>
            <div style={{ flex: 1, background: '#334155', borderRadius: 5, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 11, color: '#94a3b8' }}>aajtak.com</span>
            </div>
          </div>

          {/* Dashboard content */}
          <div style={{ background: '#fff', borderRadius: '0 0 12px 12px', overflow: 'hidden', height: 320 }}>
            {/* Simulated nav */}
            <div style={{ background: '#0f172a', padding: '8px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ color: '#fff', fontSize: 13, fontWeight: 800 }}>Aaj <span style={{ color: '#ef4444' }}>Tak</span></span>
              <div style={{ display: 'flex', gap: 8 }}>
                {['India','Politics','Business','Sports'].map(c => (
                  <span key={c} style={{ fontSize: 9, color: '#94a3b8' }}>{c}</span>
                ))}
              </div>
            </div>

            {/* Breaking ticker — subtle internal motion */}
            <div style={{ background: '#dc2626', padding: '4px 14px', display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden' }}>
              <span style={{ background: '#fff', color: '#dc2626', fontSize: 8, fontWeight: 800, padding: '1px 6px', borderRadius: 2, flexShrink: 0 }}>BREAKING</span>
              <motion.span
                style={{ fontSize: 10, color: '#fff', whiteSpace: 'nowrap' }}
                animate={shouldReduce ? undefined : { x: [0, -60, 0] }}
                transition={{ duration: 8, repeat: Infinity, ease: 'linear', repeatType: 'loop' }}
              >
                देश और दुनिया की बड़ी खबरें, एक जगह • आज की प्रमुख खबरों पर एक नज़र
              </motion.span>
            </div>

            {/* Content grid */}
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

            {/* Live activity pulse */}
            <div style={{ padding: '0 14px 10px', display: 'flex', alignItems: 'center', gap: 6 }}>
              <motion.div
                style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e' }}
                animate={shouldReduce ? undefined : { opacity: [1, 0.3, 1], scale: [1, 1.3, 1] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
              />
              <span style={{ fontSize: 9, color: '#64748b' }}>2,341 readers active</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Label */}
      <div style={{ textAlign: 'center', marginTop: 10 }}>
        <span style={{ fontSize: 10, color: '#94a3b8', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 99, padding: '3px 10px', fontWeight: 500 }}>
          {t('hero.sampleLabel')}
        </span>
      </div>

      {/* Floating analytics badge — independent depth layer */}
      <motion.div
        className="sangtx-float-analytics"
        variants={V.floatBadge}
        style={{
          x: badg1X,
          y: badg1Float,
          background: '#fff', borderRadius: 12, padding: '8px 12px',
          boxShadow: '0 4px 20px rgba(15,23,42,0.14)', display: 'flex', alignItems: 'center', gap: 8,
          border: '1px solid rgba(15,23,42,0.06)',
        }}
        whileHover={shouldReduce ? undefined : { scale: 1.03, boxShadow: '0 8px 28px rgba(15,23,42,0.18)' }}
        transition={SPR.gentle}
      >
        <div style={{ width: 28, height: 28, background: '#fef2f2', borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <motion.div
            animate={shouldReduce ? undefined : { scale: [1, 1.12, 1] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
          >
            <Icon d={ICONS.barChart} size={14} style={{ color: '#dc2626' }} />
          </motion.div>
        </div>
        <div>
          <div style={{ fontSize: 10, color: '#94a3b8' }}>{t('hero.badge.analytics')}</div>
          <div style={{ fontSize: 12, color: '#0f172a', fontWeight: 600 }}>{t('hero.badge.liveDashboard')}</div>
        </div>
      </motion.div>

      {/* Floating Android badge — independent depth layer */}
      <motion.div
        className="sangtx-float-android"
        variants={V.floatBadge}
        style={{
          x: badg2X,
          y: badg2Float,
          background: '#0f172a', borderRadius: 14, padding: '10px 12px',
          boxShadow: '0 8px 28px rgba(15,23,42,0.28)', display: 'flex', alignItems: 'center', gap: 8, minWidth: 130,
          border: '1px solid rgba(255,255,255,0.06)',
        }}
        whileHover={shouldReduce ? undefined : { scale: 1.03, boxShadow: '0 12px 36px rgba(15,23,42,0.35)' }}
        transition={SPR.gentle}
      >
        <div style={{ width: 28, height: 48, background: '#1e293b', borderRadius: 5, border: '2px solid #334155', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon d={ICONS.smartphone} size={14} style={{ color: '#94a3b8' }} />
        </div>
        <div>
          <div style={{ fontSize: 10, color: '#94a3b8' }}>{t('hero.badge.androidApp')}</div>
          <div style={{ fontSize: 12, color: '#f1f5f9', fontWeight: 600 }}>Aaj Tak</div>
        </div>
      </motion.div>
    </div>
  );
}

/* ══════════════════════════════════════════════
   TRUST BAR — scroll-triggered stagger
══════════════════════════════════════════════ */
function TrustBar() {
  const { t } = useI18n();
  const shouldReduce = useReducedMotion();
  const items: Array<{ icon: string; key: TranslationKey }> = [
    { icon: ICONS.shield,      key: 'trust.dataOwnership' },
    { icon: ICONS.globe,       key: 'trust.customDomain' },
    { icon: ICONS.bell,        key: 'trust.pushNotifications' },
    { icon: ICONS.smartphone,  key: 'trust.androidApp' },
    { icon: ICONS.barChart,    key: 'trust.analytics' },
  ];
  return (
    <section style={{ background: '#f8fafc', borderTop: '1px solid #f1f5f9', borderBottom: '1px solid #f1f5f9', padding: '20px 24px' }} className="sangtx-trust-bar">
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <motion.div
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 32, flexWrap: 'wrap' }}
          className="sangtx-trust-inner"
          variants={V.staggerFast}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.5 }}
        >
          {items.map(item => (
            <motion.div
              key={item.key}
              variants={V.fadeUp}
              style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#64748b' }}
              whileHover={shouldReduce ? undefined : { color: '#0f172a', scale: 1.02 }}
              transition={{ duration: DUR.fast }}
            >
              <Icon d={item.icon} size={15} />
              <span style={{ fontSize: 13, fontWeight: 500 }}>{t(item.key)}</span>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════
   FEATURES GRID — staggered card reveals
══════════════════════════════════════════════ */
function FeaturesSection() {
  const { t, lang } = useI18n();
  const isDevanagari = lang === 'hi' || lang === 'bho';
  const shouldReduce = useReducedMotion();

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
    <section id="features" style={{ padding: '96px 24px', background: '#fff' }} className="sangtx-section-padded">
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <Reveal>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <Pill><Icon d={ICONS.layout} size={12} /> {t('features.pill')}</Pill>
            <h2 style={{
              marginTop: 16,
              fontSize: isDevanagari ? 'clamp(22px,3.5vw,34px)' : 'clamp(26px,4vw,40px)',
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

        <motion.div
          style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 1, border: '1px solid #f1f5f9', borderRadius: 14, overflow: 'hidden' }}
          variants={V.staggerSlow}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.05 }}
        >
          {FEATURES.map(f => (
            <motion.div
              key={f.titleKey}
              variants={V.cardReveal}
              style={{ padding: '28px 24px', background: '#fff', borderRight: '1px solid #f1f5f9', borderBottom: '1px solid #f1f5f9', minHeight: 140 }}
              className="sangtx-feature-card sangtx-premium-card"
              whileHover={shouldReduce ? undefined : {
                background: '#fafafa',
                y: -2,
                boxShadow: '0 4px 16px rgba(15,23,42,0.06)',
              }}
              transition={{ duration: DUR.fast }}
            >
              <motion.div
                style={{ width: 38, height: 38, background: '#fef2f2', borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}
                whileHover={shouldReduce ? undefined : { scale: 1.08, background: '#fee2e2' }}
                transition={SPR.gentle}
              >
                <Icon d={f.icon} size={18} style={{ color: '#dc2626' }} />
              </motion.div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', marginBottom: 6, letterSpacing: isDevanagari ? '0' : '-0.01em', lineHeight: isDevanagari ? 1.4 : 1.3 }}>
                {t(f.titleKey)}
              </div>
              <div style={{ fontSize: 13, color: '#64748b', lineHeight: isDevanagari ? 1.7 : 1.6 }}>
                {t(f.descKey)}
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════
   FEATURE SHOWCASE — alternating rows with TiltCard visuals
══════════════════════════════════════════════ */
function ShowcaseRow({ number, titleKey, descKey, visual, reverse }: {
  number: string; titleKey: TranslationKey; descKey: TranslationKey;
  visual: React.ReactNode; reverse?: boolean;
}) {
  const { t, lang } = useI18n();
  const isDevanagari = lang === 'hi' || lang === 'bho';
  return (
    <div
      style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 64, alignItems: 'center' }}
      className={`sangtx-showcase-row${reverse ? ' sangtx-showcase-reverse' : ''}`}
    >
      <Reveal className={reverse ? 'sangtx-order-2' : ''}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#dc2626', letterSpacing: '0.08em', marginBottom: 12 }}>{number}</div>
          <h3 style={{
            fontSize: isDevanagari ? 'clamp(20px,2.5vw,28px)' : 'clamp(22px,3vw,32px)',
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

function AdminDashboardVisual() {
  const shouldReduce = useReducedMotion();
  return (
    <motion.div
      style={{ background: '#0f172a', borderRadius: 12, padding: 16, boxShadow: '0 24px 56px rgba(15,23,42,0.22)' }}
      whileHover={shouldReduce ? undefined : { y: -4, boxShadow: '0 32px 64px rgba(15,23,42,0.28)' }}
      transition={SPR.gentle}
    >
      <div style={{ fontSize: 11, color: '#64748b', marginBottom: 12, fontWeight: 600, letterSpacing: '0.06em' }}>DASHBOARD OVERVIEW</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
        {[{ l: 'Articles', v: '142', c: '#dc2626' },{ l: 'Published', v: '118', c: '#16a34a' },{ l: 'Views', v: '28.4K', c: '#7c3aed' },{ l: 'Active Ads', v: '6', c: '#f59e0b' }].map((m, i) => (
          <motion.div
            key={m.l}
            style={{ background: '#1e293b', borderRadius: 8, padding: '12px 14px' }}
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.08, duration: DUR.normal, ease: EASE.out }}
          >
            <div style={{ fontSize: 20, fontWeight: 800, color: m.c }}>{m.v}</div>
            <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>{m.l}</div>
          </motion.div>
        ))}
      </div>
      <div style={{ background: '#1e293b', borderRadius: 8, padding: '12px 14px' }}>
        <div style={{ fontSize: 10, color: '#64748b', marginBottom: 8 }}>Article trend this week</div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 5, height: 40 }}>
          {[55,70,45,90,60,80,100].map((h, i) => (
            <motion.div
              key={i}
              style={{ flex: 1, background: i === 6 ? '#dc2626' : '#334155', borderRadius: '3px 3px 0 0' }}
              initial={shouldReduce ? false : { height: 0 }}
              whileInView={{ height: `${h}%` }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.06 + 0.2, duration: DUR.smooth, ease: EASE.outQuart }}
            />
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
          {['M','T','W','T','F','S','S'].map((d, i) => <span key={i} style={{ fontSize: 8, color: '#475569' }}>{d}</span>)}
        </div>
      </div>
    </motion.div>
  );
}

function BrandingVisual() {
  const shouldReduce = useReducedMotion();
  return (
    <motion.div
      style={{ background: '#fff', borderRadius: 12, border: '1px solid #f1f5f9', padding: 20, boxShadow: '0 8px 24px rgba(15,23,42,0.07)' }}
      whileHover={shouldReduce ? undefined : { y: -4, boxShadow: '0 16px 40px rgba(15,23,42,0.12)' }}
      transition={SPR.gentle}
    >
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
    </motion.div>
  );
}

function NotificationsVisual() {
  const shouldReduce = useReducedMotion();
  return (
    <div>
      <motion.div
        style={{ background: '#1e293b', borderRadius: 12, padding: '14px 16px', boxShadow: '0 16px 40px rgba(15,23,42,0.22)', marginBottom: 12 }}
        whileHover={shouldReduce ? undefined : { y: -4, boxShadow: '0 20px 48px rgba(15,23,42,0.28)' }}
        transition={SPR.gentle}
      >
        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{ width: 32, height: 32, background: '#dc2626', borderRadius: 7, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <motion.div
              animate={shouldReduce ? undefined : { scale: [1, 1.15, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            >
              <Icon d={ICONS.zap} size={14} style={{ color: '#fff' }} />
            </motion.div>
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#f1f5f9', marginBottom: 3 }}>Breaking News Alert</div>
            <div style={{ fontSize: 11, color: '#94a3b8', lineHeight: 1.5 }}>आज की प्रमुख खबरों पर एक नज़र — अभी पढ़ें</div>
          </div>
        </div>
      </motion.div>
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
  const shouldReduce = useReducedMotion();
  return (
    <motion.div
      style={{ background: '#fff', border: '1px solid #f1f5f9', borderRadius: 12, padding: 20, boxShadow: '0 8px 24px rgba(15,23,42,0.07)' }}
      whileHover={shouldReduce ? undefined : { y: -4, boxShadow: '0 16px 40px rgba(15,23,42,0.12)' }}
      transition={SPR.gentle}
    >
      <div style={{ fontSize: 11, color: '#64748b', marginBottom: 12, fontWeight: 600 }}>TOP ARTICLES</div>
      {[{ title: 'देशभर में मानसून की दस्तक, जानें अपडेट', cat: 'India', views: '4.2K' },
        { title: 'नई सरकारी नीति की घोषणा', cat: 'Politics', views: '3.1K' },
        { title: 'आज के प्रमुख व्यापारिक समाचार', cat: 'Business', views: '2.8K' }].map((a, i) => (
        <motion.div
          key={i}
          style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid #f8fafc' }}
          initial={shouldReduce ? false : { opacity: 0, x: -8 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ delay: i * 0.1, duration: DUR.normal, ease: EASE.out }}
        >
          <span style={{ fontSize: 11, fontWeight: 800, color: i === 0 ? '#dc2626' : '#94a3b8', width: 14 }}>{i + 1}</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#0f172a', lineHeight: 1.3 }}>{a.title}</div>
            <span style={{ fontSize: 10, color: '#94a3b8' }}>{a.cat}</span>
          </div>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#475569' }}>{a.views}</span>
        </motion.div>
      ))}
    </motion.div>
  );
}

function FeatureShowcaseSection() {
  return (
    <section style={{ padding: '96px 24px', background: '#f8fafc' }} className="sangtx-section-padded">
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
   WEBSITE + APP SECTION
══════════════════════════════════════════════ */
function WebsiteAppSection() {
  const { t, lang } = useI18n();
  const isDevanagari = lang === 'hi' || lang === 'bho';
  const shouldReduce = useReducedMotion();

  return (
    <section style={{ padding: '96px 24px', background: '#fff' }} className="sangtx-section-padded">
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <Reveal>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <Pill><Icon d={ICONS.smartphone} size={12} /> {t('platform.pill')}</Pill>
            <h2 style={{
              marginTop: 16,
              fontSize: isDevanagari ? 'clamp(22px,3.5vw,36px)' : 'clamp(26px,4vw,40px)',
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
            <motion.div
              style={{ background: '#f8fafc', borderRadius: 14, border: '1px solid #f1f5f9', overflow: 'hidden', boxShadow: '0 8px 24px rgba(15,23,42,0.07)' }}
              whileHover={shouldReduce ? undefined : { y: -6, boxShadow: '0 16px 40px rgba(15,23,42,0.12)' }}
              transition={SPR.gentle}
            >
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
            </motion.div>
            <div style={{ textAlign: 'center', marginTop: 14 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>{t('platform.website.title')}</div>
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>{t('platform.website.desc')}</div>
            </div>
          </Reveal>

          {/* Plus divider */}
          <Reveal delay={60} className="sangtx-platform-divider">
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              <motion.div
                style={{ width: 40, height: 40, borderRadius: '50%', background: '#fef2f2', border: '1px solid #fecaca', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                animate={shouldReduce ? undefined : { scale: [1, 1.06, 1] }}
                transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
              >
                <Icon d={ICONS.plus} size={18} style={{ color: '#dc2626' }} />
              </motion.div>
              <div style={{ fontSize: 12, color: '#94a3b8', fontWeight: 500 }}>{t('platform.and')}</div>
            </div>
          </Reveal>

          {/* Android App column */}
          <Reveal delay={120}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <motion.div
                style={{ width: 140, background: '#0f172a', borderRadius: 20, padding: '10px 6px', boxShadow: '0 16px 40px rgba(15,23,42,0.22)', border: '2px solid #1e293b' }}
                whileHover={shouldReduce ? undefined : { y: -8, boxShadow: '0 24px 52px rgba(15,23,42,0.30)', scale: 1.02 }}
                transition={SPR.gentle}
              >
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
              </motion.div>
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
   HOW IT WORKS
══════════════════════════════════════════════ */
function HowItWorksSection() {
  const { t, lang } = useI18n();
  const isDevanagari = lang === 'hi' || lang === 'bho';
  const shouldReduce = useReducedMotion();

  const STEPS: Array<{ n: string; titleKey: TranslationKey; descKey: TranslationKey }> = [
    { n: '01', titleKey: 'step.01.title', descKey: 'step.01.desc' },
    { n: '02', titleKey: 'step.02.title', descKey: 'step.02.desc' },
    { n: '03', titleKey: 'step.03.title', descKey: 'step.03.desc' },
    { n: '04', titleKey: 'step.04.title', descKey: 'step.04.desc' },
    { n: '05', titleKey: 'step.05.title', descKey: 'step.05.desc' },
  ];

  return (
    <section id="how-it-works" style={{ padding: '96px 24px', background: '#f8fafc' }} className="sangtx-section-padded">
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <Reveal>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <Pill><Icon d={ICONS.play} size={12} /> {t('howitworks.pill')}</Pill>
            <h2 style={{
              marginTop: 16,
              fontSize: isDevanagari ? 'clamp(22px,3.5vw,34px)' : 'clamp(26px,4vw,40px)',
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

        <motion.div
          style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 24 }}
          variants={V.staggerSlow}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.1 }}
        >
          {STEPS.map((step, i) => (
            <motion.div
              key={step.n}
              variants={V.cardReveal}
              style={{ position: 'relative' }}
            >
              {i < STEPS.length - 1 && (
                <div style={{ position: 'absolute', top: 20, right: -12, width: 24, height: 2, background: '#e2e8f0', zIndex: 1 }} className="sangtx-step-connector" />
              )}
              <motion.div
                style={{ background: '#fff', borderRadius: 12, border: '1px solid #f1f5f9', padding: '24px 20px', boxShadow: '0 2px 8px rgba(15,23,42,0.05)', height: '100%', minHeight: 130 }}
                whileHover={shouldReduce ? undefined : { y: -4, boxShadow: '0 8px 24px rgba(15,23,42,0.1)', borderColor: '#fecaca' }}
                transition={SPR.gentle}
              >
                <div style={{ fontSize: 28, fontWeight: 900, color: '#f1f5f9', lineHeight: 1, marginBottom: 12 }}>{step.n}</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', marginBottom: 8, lineHeight: isDevanagari ? 1.4 : 1.3, letterSpacing: isDevanagari ? '0' : '-0.01em' }}>
                  {t(step.titleKey)}
                </div>
                <div style={{ fontSize: 13, color: '#64748b', lineHeight: isDevanagari ? 1.7 : 1.6 }}>
                  {t(step.descKey)}
                </div>
              </motion.div>
            </motion.div>
          ))}
        </motion.div>

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
   DEMO SECTION
══════════════════════════════════════════════ */
function DemoSection() {
  const { navigate } = useAppNavigation();
  const { t, lang } = useI18n();
  const isDevanagari = lang === 'hi' || lang === 'bho';
  const shouldReduce = useReducedMotion();

  return (
    <section id="demo" style={{ padding: '96px 24px', background: '#fff' }} className="sangtx-section-padded">
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 64, alignItems: 'center' }} className="sangtx-hero-grid sangtx-demo-grid">
          <Reveal>
            <Pill><Icon d={ICONS.externalLink} size={12} /> {t('demo.pill')}</Pill>
            <h2 style={{
              marginTop: 16,
              fontSize: isDevanagari ? 'clamp(20px,3vw,30px)' : 'clamp(26px,4vw,36px)',
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
              <motion.a
                href="/demo" onClick={e => { e.preventDefault(); navigate('/demo'); }}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#0f172a', color: '#fff', fontSize: 14, fontWeight: 600, padding: '12px 22px', borderRadius: 9, textDecoration: 'none', whiteSpace: 'nowrap' }}
                whileHover={shouldReduce ? undefined : { scale: 1.02, background: '#1e293b', boxShadow: '0 4px 16px rgba(15,23,42,0.25)' }}
                whileTap={shouldReduce ? undefined : { scale: 0.97 }}
                transition={SPR.snappy}
              >
                {t('demo.exploreBtn')} <Icon d={ICONS.arrowRight} size={15} />
              </motion.a>
              <motion.a
                href="/demo/admin" onClick={e => { e.preventDefault(); navigate('/demo/admin'); }}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'transparent', color: '#0f172a', fontSize: 14, fontWeight: 600, padding: '11px 20px', borderRadius: 9, textDecoration: 'none', border: '1.5px solid #e2e8f0', whiteSpace: 'nowrap' }}
                whileHover={shouldReduce ? undefined : { borderColor: '#dc2626', color: '#dc2626', background: '#fef2f2' }}
                whileTap={shouldReduce ? undefined : { scale: 0.97 }}
                transition={{ duration: DUR.fast }}
              >
                {t('demo.adminBtn')}
              </motion.a>
            </div>
            <p style={{ marginTop: 12, fontSize: 12, color: '#94a3b8' }}>{t('demo.note')}</p>
          </Reveal>

          <Reveal delay={80}>
            <motion.div
              style={{ background: '#f8fafc', borderRadius: 14, border: '1px solid #f1f5f9', overflow: 'hidden', boxShadow: '0 16px 48px rgba(15,23,42,0.10)' }}
              whileHover={shouldReduce ? undefined : { y: -6, boxShadow: '0 24px 60px rgba(15,23,42,0.16)' }}
              transition={SPR.gentle}
            >
              <div style={{ background: '#1e293b', padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ display: 'flex', gap: 4 }}>
                  {['#ef4444','#f59e0b','#22c55e'].map(c => <div key={c} style={{ width: 9, height: 9, borderRadius: '50%', background: c }} />)}
                </div>
                <div style={{ flex: 1, background: '#0f172a', borderRadius: 4, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                  <motion.div
                    style={{ width: 8, height: 8, borderRadius: '50%', background: '#16a34a' }}
                    animate={shouldReduce ? undefined : { opacity: [1, 0.4, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
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
                <div style={{ background: '#dc2626', padding: '3px 12px', fontSize: 8, color: 'rgba(255,255,255,0.9)', overflow: 'hidden' }}>
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
            </motion.div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════
   PRICING SECTION — cards with hover elevation
══════════════════════════════════════════════ */
function PricingSection() {
  const { navigate } = useAppNavigation();
  const { t, lang } = useI18n();
  const isDevanagari = lang === 'hi' || lang === 'bho';
  const shouldReduce = useReducedMotion();

  const PLAN_FEATURES: TranslationKey[] = [
    'plan.feature.website', 'plan.feature.cms', 'plan.feature.breaking',
    'plan.feature.reporters', 'plan.feature.branding', 'plan.feature.seo',
    'plan.feature.ads', 'plan.feature.push', 'plan.feature.newsletter',
    'plan.feature.analytics', 'plan.feature.users', 'plan.feature.security',
  ];

  return (
    <section id="pricing" style={{ padding: '96px 24px', background: '#f8fafc' }} className="sangtx-section-padded">
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <Reveal>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <Pill><Icon d={ICONS.star} size={12} /> {t('pricing.pill')}</Pill>
            <h2 style={{
              marginTop: 16,
              fontSize: isDevanagari ? 'clamp(22px,3.5vw,34px)' : 'clamp(26px,4vw,40px)',
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

        <motion.div
          style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24, maxWidth: 720, margin: '0 auto' }}
          className="sangtx-pricing-grid"
          variants={V.staggerSlow}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.1 }}
        >
          {/* Monthly */}
          <motion.div
            variants={V.cardReveal}
            style={{ background: '#fff', borderRadius: 16, border: '1.5px solid #fecaca', padding: '36px 32px', boxShadow: '0 8px 32px rgba(220,38,38,0.10)', display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}
            whileHover={shouldReduce ? undefined : { y: -8, boxShadow: '0 16px 48px rgba(220,38,38,0.16)', borderColor: '#f87171' }}
            transition={SPR.gentle}
          >
            <div style={{ position: 'absolute', top: -1, left: 28, background: '#dc2626', color: '#fff', fontSize: 10, fontWeight: 700, padding: '3px 12px', borderRadius: '0 0 8px 8px', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>
              {t('pricing.monthly.badge')}
            </div>
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.1em', marginBottom: 12 }}>{t('pricing.monthly.label')}</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 3, marginBottom: 4 }}>
                <span style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>₹</span>
                <span style={{ fontSize: 48, fontWeight: 900, color: '#0f172a', letterSpacing: '-0.04em', lineHeight: 1 }} className="sangtx-price-number">499</span>
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
            <motion.button
              onClick={() => navigate('/onboarding')}
              style={{ marginTop: 28, width: '100%', padding: '14px', borderRadius: 10, border: 'none', background: '#dc2626', color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}
              whileHover={shouldReduce ? undefined : { background: '#b91c1c', scale: 1.01 }}
              whileTap={shouldReduce ? undefined : { scale: 0.98 }}
              transition={SPR.snappy}
            >
              {t('pricing.startFree')}
            </motion.button>
            <p style={{ textAlign: 'center', fontSize: 12, color: '#94a3b8', marginTop: 10, lineHeight: 1.5 }}>{t('pricing.noCard')}</p>
          </motion.div>

          {/* Yearly */}
          <motion.div
            variants={V.cardReveal}
            style={{ background: '#fff', borderRadius: 16, border: '1.5px solid #d1fae5', padding: '36px 32px', boxShadow: '0 8px 32px rgba(22,163,74,0.08)', display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}
            whileHover={shouldReduce ? undefined : { y: -8, boxShadow: '0 16px 48px rgba(22,163,74,0.14)', borderColor: '#6ee7b7' }}
            transition={SPR.gentle}
          >
            <div style={{ position: 'absolute', top: -1, left: 28, background: '#16a34a', color: '#fff', fontSize: 10, fontWeight: 700, padding: '3px 12px', borderRadius: '0 0 8px 8px', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>
              {t('pricing.yearly.badge')}
            </div>
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.1em', marginBottom: 12 }}>{t('pricing.yearly.label')}</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 3, marginBottom: 4 }}>
                <span style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>₹</span>
                <span style={{ fontSize: 48, fontWeight: 900, color: '#0f172a', letterSpacing: '-0.04em', lineHeight: 1 }} className="sangtx-price-number">5,599</span>
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
            <motion.button
              onClick={() => navigate('/onboarding')}
              style={{ marginTop: 28, width: '100%', padding: '14px', borderRadius: 10, border: '1.5px solid #16a34a', background: '#fff', color: '#16a34a', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}
              whileHover={shouldReduce ? undefined : { background: '#f0fdf4', scale: 1.01 }}
              whileTap={shouldReduce ? undefined : { scale: 0.98 }}
              transition={SPR.snappy}
            >
              {t('pricing.startFree')}
            </motion.button>
            <p style={{ textAlign: 'center', fontSize: 12, color: '#94a3b8', marginTop: 10, lineHeight: 1.5 }}>{t('pricing.noCard')}</p>
          </motion.div>
        </motion.div>

        <Reveal delay={160}>
          <div style={{ textAlign: 'center', marginTop: 36 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, background: '#fff', border: '1px solid #f1f5f9', borderRadius: 10, padding: '14px 24px', boxShadow: '0 2px 8px rgba(15,23,42,0.05)' }}>
              <Icon d={ICONS.smartphone} size={16} style={{ color: '#475569' }} />
              <span style={{ fontSize: 14, color: '#475569', lineHeight: 1.5 }}>{t('pricing.android')}</span>
            </div>
          </div>
        </Reveal>
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
   FAQ SECTION — animated accordion
══════════════════════════════════════════════ */
function FAQItem({ qKey, aKey }: { qKey: TranslationKey; aKey: TranslationKey }) {
  const { t, lang } = useI18n();
  const isDevanagari = lang === 'hi' || lang === 'bho';
  const shouldReduce = useReducedMotion();
  const [open, setOpen] = useState(false);

  return (
    <div style={{ borderBottom: '1px solid #f1f5f9' }}>
      <motion.button
        onClick={() => setOpen(v => !v)}
        style={{ width: '100%', textAlign: 'left', padding: '18px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'none', border: 'none', cursor: 'pointer', gap: 16 }}
        aria-expanded={open}
        whileHover={shouldReduce ? undefined : { color: '#0f172a' }}
      >
        <span style={{ fontSize: 15, fontWeight: 600, color: '#0f172a', lineHeight: isDevanagari ? 1.55 : 1.4 }}>{t(qKey)}</span>
        <motion.div
          style={{ flexShrink: 0, width: 22, height: 22, borderRadius: '50%', border: '1.5px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          animate={shouldReduce ? undefined : { rotate: open ? 180 : 0 }}
          transition={{ duration: DUR.normal, ease: EASE.outQuart }}
        >
          <Icon d={ICONS.chevronDown} size={12} style={{ color: '#64748b' }} />
        </motion.div>
      </motion.button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            style={{ overflow: 'hidden' }}
            initial={shouldReduce ? false : { height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: DUR.normal, ease: EASE.outQuart }}
          >
            <div style={{ paddingBottom: 18, paddingRight: 40 }}>
              <p style={{ fontSize: 14, color: '#475569', lineHeight: isDevanagari ? 1.9 : 1.75, margin: 0 }}>{t(aKey)}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
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
    <section id="faq" style={{ padding: '96px 24px', background: '#fff' }} className="sangtx-section-padded">
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        <Reveal>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <Pill>{t('faq.pill')}</Pill>
            <h2 style={{
              marginTop: 16,
              fontSize: isDevanagari ? 'clamp(22px,3.5vw,30px)' : 'clamp(24px,4vw,36px)',
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
   FINAL CTA — dark surface with atmospheric depth
══════════════════════════════════════════════ */
function FinalCTA() {
  const { navigate } = useAppNavigation();
  const { t, lang } = useI18n();
  const isDevanagari = lang === 'hi' || lang === 'bho';
  const shouldReduce = useReducedMotion();
  const ctaMag = useMagnetic(0.18);

  return (
    <section style={{ padding: '96px 24px', background: '#0f172a', position: 'relative', overflow: 'hidden' }} className="sangtx-section-padded">
      {/* Atmospheric background */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} aria-hidden="true">
        <div style={{ position: 'absolute', top: '-20%', left: '50%', transform: 'translateX(-50%)', width: '80%', height: '100%', background: 'radial-gradient(ellipse at 50% 0%, rgba(220,38,38,0.12) 0%, transparent 60%)', pointerEvents: 'none' }} />
      </div>

      <div style={{ maxWidth: 700, margin: '0 auto', textAlign: 'center', position: 'relative' }}>
        <Reveal>
          <motion.h2
            style={{
              fontSize: isDevanagari ? 'clamp(24px,4vw,40px)' : 'clamp(28px,5vw,48px)',
              fontWeight: 900, color: '#f1f5f9',
              letterSpacing: isDevanagari ? '0' : '-0.035em',
              lineHeight: isDevanagari ? 1.35 : 1.1,
            }}
          >
            {t('cta.title1')}<br />
            <motion.span
              style={{ color: '#ef4444', display: 'inline-block' }}
              animate={shouldReduce ? undefined : { opacity: [0.9, 1, 0.9] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            >
              {t('cta.titleAccent')}
            </motion.span>
          </motion.h2>
          <p style={{ marginTop: 18, fontSize: 16, color: '#94a3b8', lineHeight: isDevanagari ? 1.8 : 1.7, maxWidth: 460, margin: '18px auto 0' }}>
            {t('cta.description')}
          </p>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 36, flexWrap: 'wrap' }} className="sangtx-final-cta-btns">
            {/* Primary CTA — magnetic */}
            <motion.button
              onClick={() => navigate('/onboarding')}
              style={{ background: '#dc2626', color: '#fff', fontSize: 15, fontWeight: 700, padding: '14px 30px', borderRadius: 10, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, minHeight: 44, x: ctaMag.x, y: ctaMag.y }}
              onPointerMove={ctaMag.onMove}
              onPointerLeave={ctaMag.onLeave}
              whileHover={shouldReduce ? undefined : { scale: 1.02, background: '#b91c1c', boxShadow: '0 8px 28px rgba(220,38,38,0.4)' }}
              whileTap={shouldReduce ? undefined : { scale: 0.97 }}
              transition={SPR.snappy}
            >
              {t('cta.startFree')} <Icon d={ICONS.arrowRight} size={16} />
            </motion.button>

            <motion.button
              onClick={() => document.getElementById('demo')?.scrollIntoView({ behavior: 'smooth' })}
              style={{ background: 'transparent', color: '#f1f5f9', fontSize: 15, fontWeight: 600, padding: '13px 26px', borderRadius: 10, border: '1.5px solid rgba(255,255,255,0.15)', cursor: 'pointer', minHeight: 44 }}
              whileHover={shouldReduce ? undefined : { borderColor: 'rgba(255,255,255,0.35)', background: 'rgba(255,255,255,0.05)' }}
              whileTap={shouldReduce ? undefined : { scale: 0.97 }}
              transition={{ duration: DUR.fast }}
            >
              {t('cta.viewDemo')}
            </motion.button>
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
   FOOTER
══════════════════════════════════════════════ */
function SiteFooter() {
  const { navigate } = useAppNavigation();
  const { t, lang } = useI18n();
  const isDevanagari = lang === 'hi' || lang === 'bho';
  const shouldReduce = useReducedMotion();
  function nav(to: string) { navigate(to); window.scrollTo(0, 0); }

  return (
    <footer style={{ background: '#0f172a', borderTop: '1px solid rgba(255,255,255,0.06)', padding: '48px 24px 32px' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }} className="sangtx-footer-inner">
        <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr 1fr 1fr', gap: 40, marginBottom: 48 }} className="sangtx-footer-grid">
          <div>
            <motion.div
              style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 14 }}
              whileHover={shouldReduce ? undefined : { scale: 1.01 }}
              transition={SPR.snappy}
            >
              <div style={{ width: 30, height: 30, background: '#dc2626', borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ color: '#fff', fontSize: 13, fontWeight: 800 }}>S</span>
              </div>
              <span style={{ fontSize: 17, fontWeight: 800, color: '#f1f5f9', letterSpacing: '-0.04em' }}>SangTX</span>
            </motion.div>
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
              <motion.button
                key={l}
                onClick={() => document.getElementById(l)?.scrollIntoView({ behavior: 'smooth' })}
                style={{ display: 'block', fontSize: 13, color: '#64748b', marginBottom: 10, background: 'none', border: 'none', cursor: 'pointer', padding: 0, textAlign: 'left', lineHeight: 1.5 }}
                whileHover={shouldReduce ? undefined : { color: '#e2e8f0', x: 3 }}
                transition={{ duration: DUR.fast }}
              >
                {t(`footer.${l}` as TranslationKey)}
              </motion.button>
            ))}
          </div>

          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.08em', marginBottom: 14 }}>{t('footer.company')}</div>
            <motion.button
              onClick={() => nav('/contact')}
              style={{ display: 'block', fontSize: 13, color: '#64748b', marginBottom: 10, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              whileHover={shouldReduce ? undefined : { color: '#e2e8f0', x: 3 }}
              transition={{ duration: DUR.fast }}
            >
              {t('footer.contact')}
            </motion.button>
          </div>

          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.08em', marginBottom: 14 }}>{t('footer.account')}</div>
            <motion.button
              onClick={() => nav('/login')}
              style={{ display: 'block', fontSize: 13, color: '#64748b', marginBottom: 10, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              whileHover={shouldReduce ? undefined : { color: '#e2e8f0', x: 3 }}
              transition={{ duration: DUR.fast }}
            >
              {t('footer.login')}
            </motion.button>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.08em', margin: '20px 0 14px' }}>{t('footer.legal')}</div>
            {(['privacy','terms'] as const).map(l => (
              <motion.button
                key={l}
                onClick={() => nav(`/${l}`)}
                style={{ display: 'block', fontSize: 13, color: '#64748b', marginBottom: 10, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                whileHover={shouldReduce ? undefined : { color: '#e2e8f0', x: 3 }}
                transition={{ duration: DUR.fast }}
              >
                {t(`footer.${l}` as TranslationKey)}
              </motion.button>
            ))}
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
   RESPONSIVE + GLOBAL CSS (unchanged from original)
══════════════════════════════════════════════ */
const GLOBAL_CSS = `
  *, *::before, *::after { box-sizing: border-box; }
  html, body { overflow-x: hidden; max-width: 100%; }

  body {
    font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  }

  @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Devanagari:wght@400;500;600;700;800;900&display=swap');

  body.lang-devanagari,
  body[data-lang="hi"],
  body[data-lang="bho"] {
    font-family: "Noto Sans Devanagari", "Noto Sans", Arial, sans-serif;
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

  /* Nav link hover */
  .sangtx-nav-link:hover { color: #0f172a !important; background: #f8fafc !important; }

  /* Feature card hover */
  .sangtx-feature-card:hover { background: #fafafa !important; }

  /* Desktop nav hidden on mobile */
  .sangtx-nav-desktop { display: flex; }

  /* Hero visual container */
  .sangtx-hero-visual { width: 100%; min-width: 0; }

  /* Product preview wrapper */
  .sangtx-product-preview { position: relative; width: 100%; }

  /* Floating badges — desktop positions */
  .sangtx-float-analytics {
    position: absolute;
    top: -16px;
    left: -16px;
    z-index: 10;
  }
  .sangtx-float-android {
    position: absolute;
    bottom: 40px;
    right: -20px;
    z-index: 10;
  }

  /* ── MOBILE (≤ 767px) ── */
  @media (max-width: 767px) {
    .sangtx-burger { display: flex !important; }
    .sangtx-header-cta { display: none !important; }
    .sangtx-nav-desktop { display: none !important; }
    .sangtx-header-inner { padding: 0 16px !important; }
    .sangtx-mobile-menu button { min-height: 44px; }

    .sangtx-hero-section { padding-top: 48px !important; padding-bottom: 48px !important; }
    .sangtx-hero-section > div > div { padding-left: 16px !important; padding-right: 16px !important; }
    .sangtx-hero-grid { grid-template-columns: 1fr !important; gap: 32px !important; }
    .sangtx-hero-text { order: 0 !important; }
    .sangtx-hero-visual { order: 1 !important; }

    .sangtx-hero-cta { flex-direction: column !important; align-items: stretch !important; }
    .sangtx-hero-cta button,
    .sangtx-hero-cta a { width: 100% !important; justify-content: center !important; }

    .sangtx-float-analytics { top: -10px; left: -8px; padding: 6px 8px !important; }
    .sangtx-float-android { right: -8px; bottom: 10px; min-width: 110px !important; padding: 8px 10px !important; }
    .sangtx-product-preview { padding: 14px 14px 20px; }

    .sangtx-section-padded { padding: 56px 16px !important; }
    .sangtx-showcase-row { grid-template-columns: 1fr !important; gap: 36px !important; }
    .sangtx-showcase-reverse .sangtx-order-1 { order: 1; }
    .sangtx-showcase-reverse .sangtx-order-2 { order: 2; }
    .sangtx-platform-grid { grid-template-columns: 1fr !important; gap: 32px !important; }
    .sangtx-platform-divider { display: none !important; }
    .sangtx-step-connector { display: none !important; }
    .sangtx-demo-grid { grid-template-columns: 1fr !important; gap: 32px !important; }
    .sangtx-pricing-grid { gap: 16px !important; }
    .sangtx-price-number { font-size: 40px !important; }
    .sangtx-final-cta-btns { flex-direction: column !important; align-items: stretch !important; }
    .sangtx-final-cta-btns button,
    .sangtx-final-cta-btns a { width: 100% !important; justify-content: center !important; }
    .sangtx-footer-grid { grid-template-columns: 1fr 1fr !important; gap: 32px !important; }
    .sangtx-footer-inner { padding: 40px 16px 24px !important; }
    .sangtx-trust-bar { padding: 16px !important; }
    .sangtx-trust-inner { gap: 16px !important; justify-content: flex-start !important; }
  }

  /* ── TABLET (768–1023px) ── */
  @media (min-width: 768px) and (max-width: 1023px) {
    .sangtx-hero-grid { grid-template-columns: 1fr 1fr !important; gap: 40px !important; }
    .sangtx-footer-grid { grid-template-columns: 1fr 1fr !important; }
    .sangtx-platform-grid { grid-template-columns: 1fr auto 1fr !important; }
    .sangtx-showcase-row { grid-template-columns: 1fr 1fr !important; gap: 40px !important; }
    .sangtx-demo-grid { grid-template-columns: 1fr 1fr !important; gap: 40px !important; }
    .sangtx-float-android { right: -10px; }
    .sangtx-header-inner { padding: 0 20px !important; }
  }

  /* ── SMALL MOBILE (≤ 390px) ── */
  @media (max-width: 390px) {
    .sangtx-footer-grid { grid-template-columns: 1fr !important; }
    .sangtx-float-analytics { display: none !important; }
    .sangtx-float-android { right: 4px; min-width: 100px !important; }
    .sangtx-hero-section { padding-top: 36px !important; padding-bottom: 36px !important; }
  }

  /* ── VERY SMALL (≤ 360px) ── */
  @media (max-width: 360px) {
    .sangtx-pricing-grid { grid-template-columns: 1fr !important; }
    .sangtx-float-android { display: none !important; }
  }

  /* ── REDUCED MOTION — disable all framer motion + css animations ── */
  @media (prefers-reduced-motion: reduce) {
    * { transition: none !important; animation: none !important; }
  }

  /* ── Focus visible ── */
  button:focus-visible, a:focus-visible {
    outline: 2px solid #dc2626;
    outline-offset: 3px;
    border-radius: 4px;
  }

  button, a { min-width: 0; word-break: keep-all; overflow-wrap: break-word; }
  img { max-width: 100%; height: auto; }
`;

/* ══════════════════════════════════════════════
   ROOT EXPORT
══════════════════════════════════════════════ */
export function SangTXHomePage() {
  const { t, lang } = useI18n();
  const isDevanagari = lang === 'hi' || lang === 'bho';

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

    setMeta('meta[name="description"]',       'name',     t('meta.description'));
    setMeta('meta[name="robots"]',             'name',     'index,follow');
    setMeta('meta[property="og:title"]',       'property', t('meta.og.title'));
    setMeta('meta[property="og:description"]', 'property', t('meta.og.description'));
    setMeta('meta[property="og:type"]',        'property', 'website');

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
