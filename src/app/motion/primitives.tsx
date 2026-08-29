/**
 * SangTX Motion Design System — Reusable Primitives
 *
 * High-level, composable motion components that can be dropped
 * anywhere without duplicating animation logic.
 */

import React from 'react';
import { motion, useReducedMotion, type MotionValue } from 'framer-motion';
import {
  fadeUp,
  fadeIn,
  scaleIn,
  cardReveal,
  sectionReveal,
  staggerContainer,
  staggerContainerFast,
  staggerContainerSlow,
  SPRING,
  DURATION,
  EASE,
  buttonHoverGrow,
} from './variants';
import { useTilt, useMagnetic, useAmbientFloat, useParallaxLayer } from './hooks';

// ─── ScrollReveal ─────────────────────────────────────────────────────────────
// Wraps any content in a viewport-triggered fade+rise animation.

interface ScrollRevealProps {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  style?: React.CSSProperties;
  /** Which preset to use */
  preset?: 'fadeUp' | 'fadeIn' | 'scaleIn' | 'card' | 'section';
  once?: boolean;
}

export function ScrollReveal({
  children,
  delay = 0,
  className,
  style,
  preset = 'fadeUp',
  once = true,
}: ScrollRevealProps) {
  const shouldReduceMotion = useReducedMotion();

  const variantsMap = {
    fadeUp,
    fadeIn,
    scaleIn,
    card: cardReveal,
    section: sectionReveal,
  };

  const variants = variantsMap[preset];

  if (shouldReduceMotion) {
    return (
      <div className={className} style={style}>
        {children}
      </div>
    );
  }

  return (
    <motion.div
      className={className}
      style={style}
      variants={variants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once, amount: 0.12 }}
      transition={{ delay: delay / 1000 }}
    >
      {children}
    </motion.div>
  );
}

// ─── StaggerContainer ─────────────────────────────────────────────────────────
// Orchestrates staggered children. Wrap StaggerItem children in this.

interface StaggerContainerProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  speed?: 'fast' | 'normal' | 'slow';
  once?: boolean;
  amount?: number;
  as?: 'div' | 'section' | 'ul' | 'ol';
}

export function StaggerContainer({
  children,
  className,
  style,
  speed = 'normal',
  once = true,
  amount = 0.1,
  as = 'div',
}: StaggerContainerProps) {
  const shouldReduceMotion = useReducedMotion();

  const variantsMap = {
    fast: staggerContainerFast,
    normal: staggerContainer,
    slow: staggerContainerSlow,
  };

  const MotionEl = motion[as];

  if (shouldReduceMotion) {
    const El = as;
    return (
      <El className={className} style={style}>
        {children}
      </El>
    );
  }

  return (
    <MotionEl
      className={className}
      style={style}
      variants={variantsMap[speed]}
      initial="hidden"
      whileInView="visible"
      viewport={{ once, amount }}
    >
      {children}
    </MotionEl>
  );
}

// ─── StaggerItem ──────────────────────────────────────────────────────────────
// Each child item inside a StaggerContainer.

interface StaggerItemProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  preset?: 'fadeUp' | 'card' | 'scaleIn' | 'fadeIn';
}

export function StaggerItem({
  children,
  className,
  style,
  preset = 'card',
}: StaggerItemProps) {
  const variantsMap = {
    fadeUp,
    card: cardReveal,
    scaleIn,
    fadeIn,
  };

  return (
    <motion.div
      className={className}
      style={style}
      variants={variantsMap[preset]}
    >
      {children}
    </motion.div>
  );
}

// ─── TiltCard ─────────────────────────────────────────────────────────────────
// A card with subtle 3D tilt response to pointer position.
// Automatically disabled on touch devices.

interface TiltCardProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  maxTilt?: number;
  disabled?: boolean;
}

export function TiltCard({
  children,
  className,
  style,
  maxTilt = 5,
  disabled = false,
}: TiltCardProps) {
  const shouldReduceMotion = useReducedMotion();
  const { rotateX, rotateY, scale, onPointerMove, onPointerLeave } = useTilt(
    maxTilt,
    1.012,
  );

  // Check for touch device
  const isTouch =
    typeof window !== 'undefined' &&
    window.matchMedia('(hover: none)').matches;

  if (disabled || shouldReduceMotion || isTouch) {
    return (
      <div className={className} style={style}>
        {children}
      </div>
    );
  }

  return (
    <motion.div
      className={className}
      style={{
        ...style,
        perspective: 800,
        rotateX,
        rotateY,
        scale,
        transformStyle: 'preserve-3d',
      }}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
    >
      {children}
    </motion.div>
  );
}

// ─── FadeIn (simple wrapper) ──────────────────────────────────────────────────

interface FadeInProps {
  children: React.ReactNode;
  delay?: number;
  duration?: number;
  className?: string;
  style?: React.CSSProperties;
}

export function FadeIn({
  children,
  delay = 0,
  duration = DURATION.smooth,
  className,
  style,
}: FadeInProps) {
  const shouldReduceMotion = useReducedMotion();

  if (shouldReduceMotion) {
    return (
      <div className={className} style={style}>
        {children}
      </div>
    );
  }

  return (
    <motion.div
      className={className}
      style={style}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration, delay, ease: EASE.out }}
    >
      {children}
    </motion.div>
  );
}

// ─── ScaleIn (for small UI elements like badges) ──────────────────────────────

interface ScaleInElProps {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  style?: React.CSSProperties;
}

export function ScaleIn({
  children,
  delay = 0,
  className,
  style,
}: ScaleInElProps) {
  const shouldReduceMotion = useReducedMotion();

  if (shouldReduceMotion) {
    return (
      <div className={className} style={style}>
        {children}
      </div>
    );
  }

  return (
    <motion.div
      className={className}
      style={style}
      initial={{ opacity: 0, scale: 0.88 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ ...SPRING.gentle, delay }}
    >
      {children}
    </motion.div>
  );
}

// ─── PremiumButton (Magnetic + Micro-interactions) ─────────────────────────────
// A button with magnetic attraction, hover elevation, and premium transitions.

interface PremiumButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
  loading?: boolean;
}

export function PremiumButton({
  children,
  variant = 'primary',
  className,
  disabled,
  loading,
  ...props
}: PremiumButtonProps) {
  const shouldReduceMotion = useReducedMotion();
  const { x, y, onPointerMove, onPointerLeave } = useMagnetic(0.18);

  const isTouch =
    typeof window !== 'undefined' &&
    window.matchMedia('(hover: none)').matches;

  const baseClasses =
    variant === 'primary'
      ? 'bg-red-600 text-white hover:bg-red-700'
      : 'border border-gray-200 text-gray-900 hover:bg-gray-50';

  if (shouldReduceMotion || isTouch) {
    return (
      <button
        className={`${baseClasses} ${className || ''}`}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? 'Loading...' : children}
      </button>
    );
  }

  return (
    <motion.button
      className={`${baseClasses} ${className || ''} relative`}
      style={{ x, y }}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      whileHover="hover"
      whileTap="tap"
      variants={buttonHoverGrow}
      initial="default"
      disabled={disabled || loading}
      {...(props as any)}
    >
      {loading ? 'Loading...' : children}
    </motion.button>
  );
}

// ─── PremiumCard (Depth + Hover Elevation) ───────────────────────────────────
// A card with smooth hover elevation and subtle depth increase.

interface PremiumCardProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export function PremiumCard({
  children,
  className,
  style,
}: PremiumCardProps) {
  const shouldReduceMotion = useReducedMotion();
  const { cardHoverElevation } = { cardHoverElevation: buttonHoverGrow }; // Reuse as a concept

  if (shouldReduceMotion) {
    return (
      <div className={className} style={style}>
        {children}
      </div>
    );
  }

  return (
    <motion.div
      className={className}
      style={style}
      whileHover={{ y: -6, transition: { duration: DURATION.normal } }}
      initial={{ y: 0 }}
    >
      {children}
    </motion.div>
  );
}

// ─── DividerLine (animated gradient draw) ───────────────────────────────────

interface DividerLineProps {
  className?: string;
  delay?: number;
}

export function DividerLine({ className, delay = 0 }: DividerLineProps) {
  const shouldReduceMotion = useReducedMotion();

  if (shouldReduceMotion) {
    return <div className={className} />;
  }

  return (
    <motion.div
      className={className}
      initial={{ scaleX: 0, opacity: 0 }}
      whileInView={{ scaleX: 1, opacity: 1 }}
      viewport={{ once: true }}
      transition={{
        duration: DURATION.smooth,
        ease: EASE.out,
        delay: delay / 1000,
      }}
      style={{ transformOrigin: 'left' }}
    />
  );
}

// ─── TextReveal (Premium text animation) ────────────────────────────────────
// Reveals text word-by-word or line-by-line with premium motion.

interface TextRevealProps {
  children: string;
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'p' | 'span';
  className?: string;
  variant?: 'word' | 'line';
  delay?: number;
}

export function TextReveal({
  children,
  as: Tag = 'p',
  className,
  variant = 'line',
  delay = 0,
}: TextRevealProps) {
  const shouldReduceMotion = useReducedMotion();

  if (shouldReduceMotion) {
    return React.createElement(Tag, { className }, children);
  }

  if (variant === 'word') {
    const words = children.split(' ');
    return (
      <motion.div
        className={className}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.5 }}
        variants={{
          hidden: {},
          visible: {
            transition: {
              staggerChildren: 0.05,
              delayChildren: delay / 1000,
            },
          },
        }}
      >
        {words.map((word, idx) => (
          <motion.span
            key={idx}
            variants={{
              hidden: { opacity: 0, y: 8 },
              visible: {
                opacity: 1,
                y: 0,
                transition: { duration: DURATION.normal, ease: EASE.out },
              },
            }}
            className="inline-block mr-2"
          >
            {word}
          </motion.span>
        ))}
      </motion.div>
    );
  }

  // Line variant (default)
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.5 }}
      transition={{
        duration: DURATION.smooth,
        ease: EASE.outQuart,
        delay: delay / 1000,
      }}
    >
      {children}
    </motion.div>
  );
}

// ─── FloatingBadge (Ambient float + parallax) ──────────────────────────────
// A badge with continuous ambient floating and parallax response.

interface FloatingBadgeProps {
  children: React.ReactNode;
  className?: string;
  amplitude?: number;
  period?: number;
  parallaxDepth?: number;
  mouseX?: MotionValue<number>;
  mouseY?: MotionValue<number>;
}

export function FloatingBadge({
  children,
  className,
  amplitude = 5,
  period = 5000,
  parallaxDepth = 0.4,
  mouseX,
  mouseY,
}: FloatingBadgeProps) {
  const shouldReduceMotion = useReducedMotion();
  const floatY = useAmbientFloat(amplitude, period);

  if (shouldReduceMotion) {
    return (
      <div className={className}>{children}</div>
    );
  }

  if (!mouseX || !mouseY) {
    return (
      <motion.div
        className={className}
        style={{
          y: floatY,
        }}
      >
        {children}
      </motion.div>
    );
  }

  const { x: parallaxX, y: parallaxY } = useParallaxLayer(mouseX, mouseY, parallaxDepth);

  return (
    <motion.div
      className={className}
      style={{
        y: floatY,
        x: parallaxX,
      }}
    >
      {children}
    </motion.div>
  );
}
