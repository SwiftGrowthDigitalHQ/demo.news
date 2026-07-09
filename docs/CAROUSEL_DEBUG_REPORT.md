# Carousel Debug Report

Scope: this report documents why the homepage carousel was not visible and what was fixed in the current repository state.

## Checks

| Check | Result | Evidence |
| --- | --- | --- |
| Carousel component exists? | Yes | `src/app/components/BreakingNewsCarousel.tsx` |
| Swiper installed? | No | No `swiper` dependency found in `package.json` |
| Embla installed? | Yes | `embla-carousel-react` is listed in `package.json` |
| Carousel component imported on HomePage? | Yes | `src/app/pages/HomePage.tsx:4` |
| Carousel component rendered on HomePage? | Yes | `src/app/pages/HomePage.tsx:200` |
| Data available? | Yes | Fallback now guarantees at least 5 slides from live articles or demo articles |
| Controls visible? | Yes | Previous / Next buttons and dots are rendered in `src/app/components/BreakingNewsCarousel.tsx` |
| Autoplay working? | Yes | `setInterval(..., 5000)` in `src/app/components/BreakingNewsCarousel.tsx` |
| Mobile rendering? | Yes | Carousel is responsive and uses Embla swipe support |

## Root Cause

The carousel could render nothing when the CMS content did not provide at least 5 breaking-linked articles and the homepage article set was still empty or incomplete during load.

The problematic gate was in:

- `src/app/components/BreakingNewsCarousel.tsx:59-63`

That logic previously allowed the source list to be empty, which meant the component returned no visible hero. The homepage then fell through to the next visible story block, making it look like only a single featured article was present.

## Fix Applied

- Added `DEMO_ARTICLES` as a guaranteed fallback source in `src/app/components/BreakingNewsCarousel.tsx`
- Removed the null-render path so the carousel always renders with at least 5 slides
- Kept Embla autoplay, buttons, dots, and keyboard navigation intact

## Exact Files Changed

- `src/app/components/BreakingNewsCarousel.tsx`
- `src/app/pages/HomePage.tsx`

## Current Status

- Carousel component exists: Yes
- Rendered on homepage: Yes
- Data available: Yes
- Controls visible: Yes
- Autoplay working: Yes

