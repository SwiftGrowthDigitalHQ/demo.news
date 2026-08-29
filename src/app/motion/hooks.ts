/**
 * SangTX Motion Design System — Interaction Hooks
 *
 * Performance-first hooks that use MotionValues to avoid
 * triggering React state re-renders on pointer events.
 */

import { useMotionValue, useSpring, useTransform, type MotionValue } from 'framer-motion';
import { useCallback, useRef, useEffect } from 'react';
import { SPRING } from './variants';

// ─── Reduced motion check ─────────────────────────────────────────────────────

export function usePrefersReducedMotion(): boolean {
  const query =
    typeof window !== 'undefined'
      ? window.matchMedia('(prefers-reduced-motion: reduce)')
      : null;
  return query?.matches ?? false;
}

// ─── Mouse parallax (global, uses MotionValues — no React state) ──────────────

interface MouseParallaxResult {
  mouseX: MotionValue<number>;
  mouseY: MotionValue<number>;
  bindPointerMove: (e: React.PointerEvent<HTMLElement>) => void;
}

export function useMouseParallax(containerRef?: React.RefObject<HTMLElement>): MouseParallaxResult {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const reducedMotion = usePrefersReducedMotion();

  const bindPointerMove = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      if (reducedMotion) return;
      // Prefer pointer events for performance (not mouse)
      const target = (containerRef?.current ?? e.currentTarget) as HTMLElement;
      const rect = target.getBoundingClientRect();
      // Normalize to -0.5 → +0.5
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      mouseX.set(x);
      mouseY.set(y);
    },
    [mouseX, mouseY, reducedMotion, containerRef],
  );

  return { mouseX, mouseY, bindPointerMove };
}

// ─── 3D Tilt (card-level, spring physics) ────────────────────────────────────

interface TiltResult {
  rotateX: MotionValue<number>;
  rotateY: MotionValue<number>;
  scale: MotionValue<number>;
  onPointerMove: (e: React.PointerEvent<HTMLElement>) => void;
  onPointerLeave: () => void;
}

export function useTilt(
  maxTilt = 6,
  maxScale = 1.015,
): TiltResult {
  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const rawScale = useMotionValue(1);
  const reducedMotion = usePrefersReducedMotion();

  const rotateX = useSpring(rawX, SPRING.snappy);
  const rotateY = useSpring(rawY, SPRING.snappy);
  const scale = useSpring(rawScale, SPRING.snappy);

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      if (reducedMotion) return;
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const x = ((e.clientY - rect.top) / rect.height - 0.5) * -maxTilt * 2;
      const y = ((e.clientX - rect.left) / rect.width - 0.5) * maxTilt * 2;
      rawX.set(x);
      rawY.set(y);
      rawScale.set(maxScale);
    },
    [rawX, rawY, rawScale, reducedMotion, maxTilt, maxScale],
  );

  const onPointerLeave = useCallback(() => {
    rawX.set(0);
    rawY.set(0);
    rawScale.set(1);
  }, [rawX, rawY, rawScale]);

  return { rotateX, rotateY, scale, onPointerMove, onPointerLeave };
}

// ─── Magnetic button (pointer approach attraction) ────────────────────────────

interface MagneticResult {
  x: MotionValue<number>;
  y: MotionValue<number>;
  onPointerMove: (e: React.PointerEvent<HTMLElement>) => void;
  onPointerLeave: () => void;
}

export function useMagnetic(strength = 0.22): MagneticResult {
  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const reducedMotion = usePrefersReducedMotion();

  const x = useSpring(rawX, SPRING.magnetic);
  const y = useSpring(rawY, SPRING.magnetic);

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      if (reducedMotion) return;
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      rawX.set((e.clientX - cx) * strength);
      rawY.set((e.clientY - cy) * strength);
    },
    [rawX, rawY, reducedMotion, strength],
  );

  const onPointerLeave = useCallback(() => {
    rawX.set(0);
    rawY.set(0);
  }, [rawX, rawY]);

  return { x, y, onPointerMove, onPointerLeave };
}

// ─── Parallax layer (scroll-based depth offset) ──────────────────────────────

export function useParallaxLayer(
  mouseX: MotionValue<number>,
  mouseY: MotionValue<number>,
  depth: number, // range: 0.0 (none) → 1.0 (max)
): { x: MotionValue<number>; y: MotionValue<number> } {
  const maxPx = depth * 18; // absolute max ±18px at depth 1.0

  const x = useSpring(
    useTransform(mouseX, [-0.5, 0.5], [-maxPx, maxPx]),
    SPRING.float,
  );
  const y = useSpring(
    useTransform(mouseY, [-0.5, 0.5], [-maxPx, maxPx]),
    SPRING.float,
  );

  return { x, y };
}

// ─── Ambient float (continuous very-slow loop) ───────────────────────────────

export function useAmbientFloat(
  amplitude = 6,
  period = 5000,
): MotionValue<number> {
  const y = useMotionValue(0);
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    if (reducedMotion) return;
    let frameId: number;
    const start = performance.now();

    function tick(now: number) {
      const t = (now - start) / period;
      y.set(Math.sin(t * Math.PI * 2) * amplitude);
      frameId = requestAnimationFrame(tick);
    }

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [y, amplitude, period, reducedMotion]);

  return y;
}

// ─── Is touch device ─────────────────────────────────────────────────────────

export function useIsTouchDevice(): boolean {
  return (
    typeof window !== 'undefined' &&
    (window.matchMedia('(hover: none)').matches || 'ontouchstart' in window)
  );
}

// ─── Scroll-triggered parallax (depth-aware) ──────────────────────────────────

interface ScrollParallaxResult {
  y: MotionValue<number>;
  opacity: MotionValue<number>;
  scale: MotionValue<number>;
}

export function useScrollParallax(
  depth: number = 0.3, // 0–1 range
): ScrollParallaxResult {
  const y = useMotionValue(0);
  const opacity = useMotionValue(1);
  const scale = useMotionValue(1);

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      y.set(scrollY * depth * -0.05); // Subtle offset
      const fadeStart = 2000;
      const fadeEnd = 4000;
      if (scrollY < fadeStart) {
        opacity.set(1);
      } else if (scrollY > fadeEnd) {
        opacity.set(0.3);
      } else {
        opacity.set(1 - (scrollY - fadeStart) / (fadeEnd - fadeStart) * 0.7);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [y, opacity, scale, depth]);

  return { y, opacity, scale };
}

// ─── Card shine effect (pseudo-light) ──────────────────────────────────────────

interface ShineEffectResult {
  shineX: MotionValue<number>;
  shineY: MotionValue<number>;
}

export function useShineEffect(): ShineEffectResult {
  const shineX = useMotionValue(0);
  const shineY = useMotionValue(0);

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLElement>) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    shineX.set((e.clientX - rect.left) / rect.width);
    shineY.set((e.clientY - rect.top) / rect.height);
  }, [shineX, shineY]);

  return { shineX, shineY };
}

// ─── Soft glow on hover ────────────────────────────────────────────────────────

interface GlowEffectResult {
  glowIntensity: MotionValue<number>;
  glowX: MotionValue<number>;
  glowY: MotionValue<number>;
  onPointerMove: (e: React.PointerEvent<HTMLElement>) => void;
  onPointerLeave: () => void;
}

export function useGlowEffect(): GlowEffectResult {
  const glowIntensity = useMotionValue(0);
  const glowX = useMotionValue(0);
  const glowY = useMotionValue(0);

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLElement>) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    glowX.set((e.clientX - rect.left) / rect.width);
    glowY.set((e.clientY - rect.top) / rect.height);
    glowIntensity.set(1);
  }, [glowIntensity, glowX, glowY]);

  const onPointerLeave = useCallback(() => {
    glowIntensity.set(0);
  }, [glowIntensity]);

  return { glowIntensity, glowX, glowY, onPointerMove, onPointerLeave };
}
