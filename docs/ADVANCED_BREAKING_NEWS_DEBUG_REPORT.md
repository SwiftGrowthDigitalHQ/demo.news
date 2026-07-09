# Advanced Breaking News Debug Report

Scope: debug-only audit of the breaking-news render path. No fixes were made while gathering this evidence.

## 1. Homepage Render Tree

```text
App
└─ AppNavigationProvider
   └─ AuthProvider
      └─ CmsProvider
         └─ Toaster
         └─ BrandingBridge
         └─ AppRouter
            └─ HomePage
               ├─ Header
               ├─ AdBanner
               ├─ Navigation
               ├─ BreakingNewsCarousel
               ├─ AdBanner
               ├─ Latest News section
               │  ├─ NewsCard
               │  └─ CompactStoryList
               ├─ AdBanner
               ├─ CategoryRail
               ├─ VideoNews
               ├─ Newsletter block
               ├─ SidebarNewsTabs
               ├─ AdBanner
               ├─ Footer
```

Route references:
- [`src/app/App.tsx:15`](/c:/Users/Office/Downloads/Designsitamarhilivehomepage/src/app/App.tsx#L15)
- [`src/app/App.tsx:50`](/c:/Users/Office/Downloads/Designsitamarhilivehomepage/src/app/App.tsx#L50)
- [`src/app/pages/HomePage.tsx:131`](/c:/Users/Office/Downloads/Designsitamarhilivehomepage/src/app/pages/HomePage.tsx#L131)
- [`src/app/pages/HomePage.tsx:200`](/c:/Users/Office/Downloads/Designsitamarhilivehomepage/src/app/pages/HomePage.tsx#L200)

## 2. Usage Map

| Symbol | File | Imported? | Rendered? | Dead Code? | Evidence |
| --- | --- | --- | --- | --- | --- |
| `BreakingNewsCarousel` | [`src/app/pages/HomePage.tsx:4`](/c:/Users/Office/Downloads/Designsitamarhilivehomepage/src/app/pages/HomePage.tsx#L4) | Yes | Yes | No | Rendered at [`src/app/pages/HomePage.tsx:200`](/c:/Users/Office/Downloads/Designsitamarhilivehomepage/src/app/pages/HomePage.tsx#L200) |
| `BreakingNewsTicker` | [`src/app/pages/ArticlePage.tsx:5`](/c:/Users/Office/Downloads/Designsitamarhilivehomepage/src/app/pages/ArticlePage.tsx#L5), [`src/app/pages/CategoryPage.tsx:4`](/c:/Users/Office/Downloads/Designsitamarhilivehomepage/src/app/pages/CategoryPage.tsx#L4), [`src/app/pages/SearchPage.tsx:5`](/c:/Users/Office/Downloads/Designsitamarhilivehomepage/src/app/pages/SearchPage.tsx#L5) | Yes | Yes | No | Rendered at [`src/app/pages/ArticlePage.tsx:46`](/c:/Users/Office/Downloads/Designsitamarhilivehomepage/src/app/pages/ArticlePage.tsx#L46), [`src/app/pages/ArticlePage.tsx:69`](/c:/Users/Office/Downloads/Designsitamarhilivehomepage/src/app/pages/ArticlePage.tsx#L69), [`src/app/pages/CategoryPage.tsx:33`](/c:/Users/Office/Downloads/Designsitamarhilivehomepage/src/app/pages/CategoryPage.tsx#L33), [`src/app/pages/SearchPage.tsx:50`](/c:/Users/Office/Downloads/Designsitamarhilivehomepage/src/app/pages/SearchPage.tsx#L50) |
| `BreakingNewsSlider` | [`src/app/components/BreakingNewsTicker.tsx:1`](/c:/Users/Office/Downloads/Designsitamarhilivehomepage/src/app/components/BreakingNewsTicker.tsx#L1) | Yes, via wrapper | Yes, via wrapper | No | Rendered inside [`src/app/components/BreakingNewsTicker.tsx:9`](/c:/Users/Office/Downloads/Designsitamarhilivehomepage/src/app/components/BreakingNewsTicker.tsx#L9) |

## 3. Route Behavior

| Route | Visible Breaking Component | Notes |
| --- | --- | --- |
| `/` | `BreakingNewsCarousel` | No `BreakingNewsTicker` is mounted on the homepage. |
| `/article/demo-article-1` | `BreakingNewsTicker` and nested `BreakingNewsSlider` | The ticker wrapper is visible first, then the slider renders below it. |
| `/category/%E0%A4%AC%E0%A4%BF%E0%A4%B9%E0%A4%BE%E0%A4%B0` | `BreakingNewsTicker` and nested `BreakingNewsSlider` | Same route pattern as article pages. |
| `/search?q=...` | `BreakingNewsTicker` and nested `BreakingNewsSlider` | Same route pattern as article pages. |

## 4. Runtime Evidence

Console output collected in [`docs/debug-shots/breaking-debug.json`](/c:/Users/Office/Downloads/Designsitamarhilivehomepage/docs/debug-shots/breaking-debug.json):

- Home route:
  - `carousel runtime {articles: 0, breakingNews: 0, slides: 5}`
  - `carousel runtime {articles: 50, breakingNews: 20, slides: 20}`
- Article route:
  - `ticker runtime`
  - `slider runtime {articles: 0, breakingNews: 0, featuredSlides: 0}`
  - `slider runtime {articles: 50, breakingNews: 20, featuredSlides: 20}`
- Category route:
  - `ticker runtime`
  - `slider runtime {articles: 0, breakingNews: 0, featuredSlides: 0}`
  - `slider runtime {articles: 50, breakingNews: 20, featuredSlides: 20}`

Data at runtime:
- `articles.length = 50`
- `breakingNews.length = 20`
- `featuredSlides.length = 20`
- `slides.length = 20`

## 5. Console Evidence

- React DevTools advisory message appeared.
- Vite connected successfully.
- No page errors were recorded.
- No hydration errors were recorded.
- No React warning stack traces were observed during the capture run.

## 6. DOM Evidence

The browser DOM contained the temporary fixed labels on the expected routes:

- Home:
  - `<div class="fixed left-4 top-44 ...">BREAKING CAROUSEL ACTIVE</div>`
- Article:
  - `<div class="fixed left-4 top-24 ...">BREAKING TICKER ACTIVE</div>`
  - `<div class="fixed left-4 top-4 ...">BREAKING SLIDER ACTIVE</div>`
- Category:
  - `<div class="fixed left-4 top-24 ...">BREAKING TICKER ACTIVE</div>`
  - `<div class="fixed left-4 top-4 ...">BREAKING SLIDER ACTIVE</div>`

This shows that the slider is mounted inside the ticker wrapper on non-home routes.

## 7. CSS Evidence

Search results for the three breaking components show:

- No `display:none`
- No `opacity-0`
- No hard CSS rule hiding the main breaking components
- Only responsive helper hiding exists for secondary metadata:
  - `hidden sm:flex` in [`src/app/components/BreakingNewsSlider.tsx:180`](/c:/Users/Office/Downloads/Designsitamarhilivehomepage/src/app/components/BreakingNewsSlider.tsx#L180)
  - `hidden sm:inline-flex` in [`src/app/components/BreakingNewsCarousel.tsx:240`](/c:/Users/Office/Downloads/Designsitamarhilivehomepage/src/app/components/BreakingNewsCarousel.tsx#L240)

Relevant overflow / stacking rules:
- [`src/app/components/BreakingNewsSlider.tsx:155`](/c:/Users/Office/Downloads/Designsitamarhilivehomepage/src/app/components/BreakingNewsSlider.tsx#L155)
- [`src/app/components/BreakingNewsSlider.tsx:163`](/c:/Users/Office/Downloads/Designsitamarhilivehomepage/src/app/components/BreakingNewsSlider.tsx#L163)
- [`src/app/components/BreakingNewsCarousel.tsx:141`](/c:/Users/Office/Downloads/Designsitamarhilivehomepage/src/app/components/BreakingNewsCarousel.tsx#L141)
- [`src/app/components/BreakingNewsCarousel.tsx:159`](/c:/Users/Office/Downloads/Designsitamarhilivehomepage/src/app/components/BreakingNewsCarousel.tsx#L159)

Conclusion from CSS audit:
- The breaking component is not being hidden by CSS.
- The visible red bar is a route and composition issue, not a `display:none` issue.

## 8. Screenshot Evidence

- Home page: [`docs/debug-shots/home.png`](/c:/Users/Office/Downloads/Designsitamarhilivehomepage/docs/debug-shots/home.png)
- Article page: [`docs/debug-shots/article.png`](/c:/Users/Office/Downloads/Designsitamarhilivehomepage/docs/debug-shots/article.png)
- Category page: [`docs/debug-shots/category.png`](/c:/Users/Office/Downloads/Designsitamarhilivehomepage/docs/debug-shots/category.png)

What the screenshots show:
- Home page displays `BREAKING CAROUSEL ACTIVE`.
- Article and category pages display `BREAKING TICKER ACTIVE` and `BREAKING SLIDER ACTIVE`.

## 9. Dead Component Audit

- `BreakingNewsCarousel`: not dead, used on the homepage.
- `BreakingNewsTicker`: not dead, used on article, category, and search pages.
- `BreakingNewsSlider`: not dead, mounted by `BreakingNewsTicker`.

No dead breaking-news component was found.

## 10. Root Cause Analysis

The mismatch came from route-specific composition, not from a broken import.

1. The homepage renders `BreakingNewsCarousel` directly.
2. Article, category, and search pages render `BreakingNewsTicker`.
3. `BreakingNewsTicker` is a wrapper that mounts `BreakingNewsSlider` inside it.
4. The visible red ticker bar is therefore expected on non-home routes.
5. The slider is not a standalone top-level route component, so it can look "missing" if you only expect it where the ticker wrapper is mounted.
6. The earlier component reports did not clearly separate route-level mounting from nested component mounting.

In short:
- `BreakingNewsCarousel` is the homepage breaking hero.
- `BreakingNewsTicker` is the non-home breaking wrapper.
- `BreakingNewsSlider` is nested inside the ticker wrapper.

