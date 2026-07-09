# Homepage Breaking Layout Report

Scope: this report reflects the actual homepage implementation in the repository after the breaking-news layout pass.

## Homepage Component Tree

```text
HomePage
├─ Header
├─ AdBanner (header placement)
├─ Navigation
├─ BreakingNewsTicker
├─ BreakingNewsCarousel
├─ AdBanner (hero placement)
├─ Latest News
├─ AdBanner (mid-content placement)
├─ Category rails
├─ VideoNews
├─ Newsletter
└─ Footer
```

Current homepage order in code:
- `Header`
- `Navigation`
- `BreakingNewsTicker`
- `BreakingNewsCarousel`
- `Latest News`
- `Footer`

## Ticker Data Source

The homepage ticker is rendered by [`src/app/components/BreakingNewsTicker.tsx`](../src/app/components/BreakingNewsTicker.tsx).

Implementation details:
- It reads `breakingNews` and `articles` from `useCms()`.
- It builds ticker items from active `breaking_news` rows and resolves article links when available.
- If no live breaking-news rows are available, it falls back to articles marked `breaking`.

Relevant files:
- [`src/app/components/BreakingNewsTicker.tsx`](../src/app/components/BreakingNewsTicker.tsx)
- [`src/app/lib/cms.tsx`](../src/app/lib/cms.tsx)
- [`supabase/migrations/20260613000100_initial_schema.sql`](../supabase/migrations/20260613000100_initial_schema.sql)

Important schema note:
- The current schema exposes `public.breaking_news.is_active`.
- There are no `show_in_ticker` or `show_in_slider` columns in the checked-in schema, so the split is implemented at the component level rather than through separate database flags.

## Carousel Data Source

The homepage carousel is rendered by [`src/app/components/BreakingNewsCarousel.tsx`](../src/app/components/BreakingNewsCarousel.tsx).

Implementation details:
- It reads `breakingNews` and `articles` from `useCms()`.
- It creates slides from active breaking-news links joined to published articles.
- If fewer than five breaking-news articles are available, it falls back to the first published articles and then demo content.
- Autoplay advances every 5 seconds and pauses on hover.

Relevant files:
- [`src/app/components/BreakingNewsCarousel.tsx`](../src/app/components/BreakingNewsCarousel.tsx)
- [`src/app/lib/cms.tsx`](../src/app/lib/cms.tsx)
- [`src/app/lib/demoContent.ts`](../src/app/lib/demoContent.ts)

## Screenshot Proof

Captured homepage screenshot:
- [`docs/breaking-home.png`](./breaking-home.png)

Observed runtime layout from browser verification:
- Ticker section top position: `y = 520`
- Carousel section top position: `y = 622`

That confirms the ticker renders above the carousel on the homepage.

## Summary

The homepage now shows both breaking-news systems independently:
- A red breaking ticker above the hero area
- A full breaking-news carousel below it

The existing homepage composition remains unchanged apart from adding the ticker above the carousel.
