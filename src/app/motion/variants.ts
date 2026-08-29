/**
 * SangTX Motion Design System — Variants
 *
 * Centralized animation variants for consistent motion language
 * across the entire SangTX marketing experience.
 */

import type { Variants } from 'framer-motion';

// ─── Motion Tokens ────────────────────────────────────────────────────────────

export const DURATION = {
  instant:   0.1,
  fast:      0.18,
  normal:    0.3,
  smooth:    0.5,
  cinematic: 0.8,
  ambient:   1.2,
} as const;

export const EASE = {
  // Standard easing curves
  out:       [0.0, 0.0, 0.2, 1.0] as const,
  inOut:     [0.4, 0.0, 0.2, 1.0] as const,
  in:        [0.4, 0.0, 1.0, 1.0] as const,
  // Premium curves (Framer-level polish)
  outExpo:   [0.19, 1, 0.22, 1] as const,
  outQuart:  [0.25, 1, 0.5, 1] as const,
  cinematic: [0.16, 1, 0.3, 1] as const,
} as const;

export const SPRING = {
  // Interactive UI — responsive, no overshoot
  snappy: {
    type: 'spring' as const,
    stiffness: 400,
    damping: 30,
  },
  // Product cards — slightly more bounce
  gentle: {
    type: 'spring' as const,
    stiffness: 280,
    damping: 22,
  },
  // Floating elements — slow, dreamy
  float: {
    type: 'spring' as const,
    stiffness: 120,
    damping: 18,
  },
  // Magnetic/attraction effects
  magnetic: {
    type: 'spring' as const,
    stiffness: 350,
    damping: 25,
  },
} as const;

// ─── Fade + Rise (primary reveal) ─────────────────────────────────────────────

export const fadeUp: Variants = {
  hidden: {
    opacity: 0,
    y: 20,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: DURATION.smooth,
      ease: EASE.outQuart,
    },
  },
};

// More cinematic — used for hero headline
export const fadeUpCinematic: Variants = {
  hidden: {
    opacity: 0,
    y: 30,
    filter: 'blur(4px)',
  },
  visible: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: {
      duration: DURATION.cinematic,
      ease: EASE.cinematic,
    },
  },
};

// Subtle — used for secondary text
export const fadeIn: Variants = {
  hidden: {
    opacity: 0,
  },
  visible: {
    opacity: 1,
    transition: {
      duration: DURATION.smooth,
      ease: EASE.out,
    },
  },
};

// Scale + fade — used for badges and pills
export const scaleIn: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.88,
  },
  visible: {
    opacity: 1,
    scale: 1,
    transition: SPRING.gentle,
  },
};

// Scale from slightly above — used for floating cards
export const floatIn: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.92,
    y: 16,
  },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      duration: DURATION.cinematic,
      ease: EASE.cinematic,
    },
  },
};

// Slide in from left — used for hero text block
export const slideInLeft: Variants = {
  hidden: {
    opacity: 0,
    x: -24,
  },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      duration: DURATION.smooth,
      ease: EASE.outQuart,
    },
  },
};

// ─── Stagger Containers ────────────────────────────────────────────────────────

export const staggerContainer: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.07,
      delayChildren: 0,
    },
  },
};

export const staggerContainerFast: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.04,
      delayChildren: 0,
    },
  },
};

export const staggerContainerSlow: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0,
    },
  },
};

// ─── Hero sequence (controlled cinematic entrance) ────────────────────────────

// Used for the complete hero entrance — each child staggered
export const heroSequence: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.1,
    },
  },
};

export const heroBadge: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.85,
    y: 8,
  },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      duration: DURATION.normal,
      ease: EASE.outQuart,
    },
  },
};

export const heroTitle: Variants = {
  hidden: {
    opacity: 0,
    y: 28,
    filter: 'blur(6px)',
  },
  visible: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: {
      duration: DURATION.cinematic,
      ease: EASE.cinematic,
    },
  },
};

export const heroDescription: Variants = {
  hidden: {
    opacity: 0,
    y: 16,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: DURATION.smooth,
      ease: EASE.outQuart,
    },
  },
};

export const heroCta: Variants = {
  hidden: {
    opacity: 0,
    y: 14,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: DURATION.normal,
      ease: EASE.out,
    },
  },
};

// ─── Scroll reveal (section-level) ───────────────────────────────────────────

export const sectionReveal: Variants = {
  hidden: {
    opacity: 0,
    y: 24,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: DURATION.smooth,
      ease: EASE.outQuart,
    },
  },
};

// Card reveal with subtle scale
export const cardReveal: Variants = {
  hidden: {
    opacity: 0,
    y: 20,
    scale: 0.97,
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: DURATION.smooth,
      ease: EASE.outQuart,
    },
  },
};

// ─── Dashboard product 3D entrance ───────────────────────────────────────────

export const dashboardEntrance: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.91,
    rotateX: 6,
    y: 32,
  },
  visible: {
    opacity: 1,
    scale: 1,
    rotateX: 2,
    y: 0,
    transition: {
      duration: DURATION.cinematic + 0.2,
      ease: EASE.cinematic,
    },
  },
};

// Floating badge entrance — delayed after dashboard
export const badgeEntrance: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.8,
    y: 12,
  },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: SPRING.gentle,
  },
};

// ─── Premium Text Animations ──────────────────────────────────────────────────

// Line-by-line reveal with subtle blur-to-sharp
export const textLineReveal: Variants = {
  hidden: {
    opacity: 0,
    y: 12,
    filter: 'blur(3px)',
  },
  visible: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: {
      duration: DURATION.smooth,
      ease: EASE.outQuart,
    },
  },
};

// Word-by-word stagger container
export const wordStagger: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.04,
      delayChildren: 0,
    },
  },
};

// Individual word reveal
export const wordReveal: Variants = {
  hidden: {
    opacity: 0,
    y: 8,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: DURATION.normal,
      ease: EASE.outQuart,
    },
  },
};

// ─── Premium 3D Depth Effects ────────────────────────────────────────────────

// Card hover — elevation + subtle glow
export const cardHoverElevation: Variants = {
  default: {
    y: 0,
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
  },
  hover: {
    y: -6,
    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15)',
    transition: {
      duration: DURATION.normal,
      ease: EASE.out,
      type: 'spring',
      stiffness: 300,
      damping: 22,
    },
  },
};

// Premium dashboard 3D entrance with more cinematic depth
export const dashboardPremium: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.88,
    rotateX: 12,
    rotateY: -2,
    y: 40,
  },
  visible: {
    opacity: 1,
    scale: 1,
    rotateX: 2,
    rotateY: 0,
    y: 0,
    transition: {
      duration: DURATION.cinematic + 0.3,
      ease: EASE.cinematic,
      delay: 0.2,
    },
  },
};

// ─── Scroll-based depth reveal ────────────────────────────────────────────────

export const depthReveal: Variants = {
  hidden: {
    opacity: 0,
    y: 32,
    scale: 0.95,
    filter: 'blur(2px)',
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    filter: 'blur(0px)',
    transition: {
      duration: DURATION.smooth + 0.1,
      ease: EASE.cinematic,
    },
  },
};

// ─── Feature card premium animations ──────────────────────────────────────────

// Icon scale on card entrance
export const featureIconScale: Variants = {
  hidden: {
    scale: 0.6,
    opacity: 0,
    rotate: -8,
  },
  visible: {
    scale: 1,
    opacity: 1,
    rotate: 0,
    transition: {
      duration: DURATION.cinematic,
      ease: EASE.outQuart,
      type: 'spring',
      stiffness: 300,
      damping: 20,
    },
  },
};

// ─── Pricing tier highlight ──────────────────────────────────────────────────

export const pricingTierHighlight: Variants = {
  default: {
    scale: 1,
    borderColor: 'rgba(15, 23, 42, 0.1)',
  },
  highlight: {
    scale: 1.02,
    borderColor: '#dc2626',
    boxShadow: '0 0 0 1px #dc2626, 0 20px 40px rgba(220, 38, 38, 0.1)',
    transition: {
      duration: DURATION.normal,
      ease: EASE.out,
    },
  },
};

// ─── Button micro-interactions ───────────────────────────────────────────────

export const buttonHoverGrow: Variants = {
  default: {
    scale: 1,
    y: 0,
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
  },
  hover: {
    scale: 1.018,
    y: -2,
    boxShadow: '0 12px 24px rgba(220, 38, 38, 0.15)',
    transition: {
      duration: DURATION.fast,
      ease: EASE.out,
    },
  },
  tap: {
    scale: 0.98,
    y: 0,
  },
};

// ─── Section divider animation ───────────────────────────────────────────────

export const dividerDraw: Variants = {
  hidden: {
    scaleX: 0,
    opacity: 0,
  },
  visible: {
    scaleX: 1,
    opacity: 1,
    transition: {
      duration: DURATION.smooth,
      ease: EASE.out,
      delay: 0.3,
    },
  },
};

// ─── Footer stagger column ───────────────────────────────────────────────────

export const footerColumnReveal: Variants = {
  hidden: {
    opacity: 0,
    y: 20,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: DURATION.smooth,
      ease: EASE.outQuart,
    },
  },
};

// ─── News card premium entrance ──────────────────────────────────────────────

export const newsCardEntrance: Variants = {
  hidden: {
    opacity: 0,
    y: 24,
    scale: 0.96,
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: DURATION.smooth,
      ease: EASE.outQuart,
    },
  },
};
