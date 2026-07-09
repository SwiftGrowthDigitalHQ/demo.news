# Breaking Carousel Report

Scope: this report covers the homepage breaking-news upgrade in the current repository state. No backend or routing changes were made.

## What Changed

- The homepage hero area now uses a real breaking-news carousel instead of a static featured story.
- The old ticker-style presentation is no longer the primary breaking surface on the homepage.
- The breaking module now shows:
  - one large featured breaking story
  - breaking highlights
  - trending stories
  - autoplay controls
  - keyboard navigation
  - swipe support on touch devices

## Carousel Library

- Library used: `embla-carousel-react`
- Reason: it provides a lightweight, accessible carousel foundation with touch/swipe support and smooth snapping behavior.

## Behavior

- Auto-rotates every 5 seconds
- Previous and Next buttons are available
- Dot indicators update with the active slide
- Left and right arrow keys move between slides
- Swipe gestures work on mobile and tablet

## Data Source

- Breaking slides are derived from existing breaking-news records and article content.
- Trending stories and highlight items also reuse existing CMS records.
- No static demo-only carousel content was added.

## Files Changed

- `src/app/pages/HomePage.tsx`
- `src/app/components/BreakingNewsCarousel.tsx`
- `src/app/components/BreakingNewsTicker.tsx`

## Old Layout

- Simple ticker-style breaking strip
- Static or shallow breaking presentation
- Limited storytelling hierarchy

## New Layout

- Large editorial carousel on the left
- Breaking highlights in the middle
- Trending news on the right
- Full-width, newsroom-style hero treatment

## Mobile Support

- The carousel stacks cleanly on smaller screens
- Swipe support is available on touch devices
- Controls remain usable without requiring hover interactions

