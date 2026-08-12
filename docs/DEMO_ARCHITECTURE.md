# SangTX Demo Tenant Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        SangTX Platform                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌───────────────┐     ┌────────────────┐     ┌─────────────┐ │
│  │   Marketing   │     │  Demo Tenant   │     │   Customer  │ │
│  │   Homepage    │────▶│    /demo       │     │   Tenants   │ │
│  │      /        │     └────────────────┘     │  /buxar-*   │ │
│  └───────────────┘                            └─────────────┘ │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Demo Tenant Structure

```
/demo (Demo Tenant)
├── Public Website
│   ├── /demo                    → HomePage with demo data
│   ├── /demo/article/:slug      → ArticlePage with demo data
│   ├── /demo/category/:slug     → CategoryPage with demo data
│   └── /demo/search             → SearchPage with demo data
│
└── Admin CMS
    ├── /demo/admin              → Dashboard
    ├── /demo/admin/news         → News Management
    ├── /demo/admin/categories   → Categories
    ├── /demo/admin/breaking     → Breaking News
    ├── /demo/admin/media        → Media Library
    ├── /demo/admin/journalists  → Reporters
    ├── /demo/admin/users        → User Management
    ├── /demo/admin/roles        → Role Management
    ├── /demo/admin/ads          → Advertisements
    ├── /demo/admin/seo          → SEO
    ├── /demo/admin/notifications → Notifications
    ├── /demo/admin/settings     → Settings
    ├── /demo/admin/reports      → Reports
    └── /demo/admin/analytics    → Analytics
```

## Component Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                         App.tsx                                  │
│                    (Main Router)                                 │
└─────────────────┬────────────────────────────────────────────────┘
                  │
         ┌────────┴────────┐
         │                 │
    ┌────▼─────┐     ┌────▼──────┐
    │   SaaS   │     │   Demo    │
    │  Routes  │     │  Routes   │
    └──────────┘     └────┬──────┘
                          │
                  ┌───────▼────────┐
                  │ DemoPortalV2   │
                  │  (Router)      │
                  └───┬────────┬───┘
                      │        │
            ┌─────────▼──┐  ┌─▼──────────┐
            │   Public   │  │   Admin    │
            └─────┬──────┘  └──┬─────────┘
                  │            │
          ┌───────▼─────────┐  │
          │ DemoCmsProvider │  │
          │  (Data Layer)   │◀─┘
          └───────┬─────────┘
                  │
       ┌──────────▼───────────┐
       │   demoTenant.ts      │
       │  (Static Demo Data)  │
       └──────────────────────┘
       - DEMO_ARTICLES (50+)
       - DEMO_CATEGORIES (10)
       - DEMO_REPORTERS (5)
       - DEMO_ADS (5)
       - DEMO_BREAKING_NEWS (3)
       - DEMO_SITE_SETTINGS
```

## Data Flow

### Public Website Flow

```
User visits /demo/article/some-slug
         │
         ▼
    App.tsx resolves route → type: 'demo'
         │
         ▼
    DemoPortalV2 (mode: 'article')
         │
         ▼
    DemoCmsProvider wraps ArticlePage
         │
         ▼
    ArticlePage calls useDemoCms()
         │
         ▼
    getDemoArticleBySlug('some-slug')
         │
         ▼
    Returns article from DEMO_ARTICLES
         │
         ▼
    ArticlePage renders with demo data
```

### Admin Flow

```
User visits /demo/admin/news
         │
         ▼
    App.tsx resolves route → type: 'demo'
         │
         ▼
    DemoPortalV2 (mode: 'admin')
         │
         ▼
    DemoAdminPage renders NewsManagement
         │
         ▼
    DemoCmsProvider wraps admin component
         │
         ▼
    NewsManagement calls useDemoCms()
         │
         ▼
    Returns DEMO_ARTICLES
         │
         ▼
    NewsManagement renders table
         │
         ▼
    User tries to edit → Button disabled (CSS)
```

## Isolation Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Production System                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────┐              ┌───────────────────┐   │
│  │  Real Tenants   │              │   Demo Tenant     │   │
│  │  (/buxar-news)  │              │     (/demo)       │   │
│  └────────┬────────┘              └─────────┬─────────┘   │
│           │                                  │             │
│           ▼                                  ▼             │
│  ┌─────────────────┐              ┌───────────────────┐   │
│  │  CmsProvider    │              │ DemoCmsProvider   │   │
│  │  (Production)   │              │  (Demo Data)      │   │
│  └────────┬────────┘              └─────────┬─────────┘   │
│           │                                  │             │
│           ▼                                  ▼             │
│  ┌─────────────────┐              ┌───────────────────┐   │
│  │   Supabase      │              │  Static Local     │   │
│  │   Database      │              │  Demo Data        │   │
│  └─────────────────┘              └───────────────────┘   │
│                                                             │
│  ✅ Production data                ✅ Demo data            │
│  ✅ Read/Write                     ✅ Read-only            │
│  ✅ Real customers                 ✅ Fictional content    │
│  ✅ Backend connected              ✅ No backend          │
│                                                             │
│          │                                  │               │
│          └──────────────────────────────────┘               │
│                         │                                   │
│                    NO OVERLAP                               │
│                   Demo CANNOT access production             │
│                   Production CANNOT see demo                │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Read-Only Enforcement

```
┌──────────────────────────────────────────────────────────┐
│              Demo Mutation Prevention                    │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  Layer 1: No Backend Connection                         │
│  ┌────────────────────────────────────────────┐         │
│  │  Demo uses static data (no API calls)      │         │
│  │  No Supabase client initialized             │         │
│  │  No mutation endpoints available            │         │
│  └────────────────────────────────────────────┘         │
│                                                          │
│  Layer 2: CSS Disabling                                 │
│  ┌────────────────────────────────────────────┐         │
│  │  Mutation buttons: pointer-events: none    │         │
│  │  Visual feedback: opacity: 0.5              │         │
│  │  Cursor: not-allowed                        │         │
│  └────────────────────────────────────────────┘         │
│                                                          │
│  Layer 3: Context Isolation                             │
│  ┌────────────────────────────────────────────┐         │
│  │  Demo NEVER mounts CmsProvider             │         │
│  │  Uses separate DemoCmsProvider              │         │
│  │  No cross-context access possible          │         │
│  └────────────────────────────────────────────┘         │
│                                                          │
│  Layer 4: Clear UI Signaling                            │
│  ┌────────────────────────────────────────────┐         │
│  │  Top banner: "DEMO MODE — READ ONLY"       │         │
│  │  Disabled buttons clearly marked            │         │
│  │  "Demo Data" labels throughout              │         │
│  └────────────────────────────────────────────┘         │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

## Component Reuse Strategy

```
┌───────────────────────────────────────────────────────────┐
│           Production Components (Unchanged)               │
├───────────────────────────────────────────────────────────┤
│                                                           │
│  HomePage.tsx                                            │
│  ArticlePage.tsx                                         │
│  CategoryPage.tsx                                        │
│  SearchPage.tsx                                          │
│  AdminPage.tsx                                           │
│  NewsManagement.tsx                                      │
│  MediaLibrary.tsx                                        │
│  SettingsPanel.tsx                                       │
│  ... etc (40+ components)                                │
│                                                           │
└─────────────┬─────────────────────────────┬───────────────┘
              │                             │
              │                             │
     ┌────────▼──────────┐        ┌────────▼──────────┐
     │  CmsProvider      │        │  DemoCmsProvider  │
     │  (Production)     │        │  (Demo)           │
     └────────┬──────────┘        └────────┬──────────┘
              │                             │
              │                             │
     ┌────────▼──────────┐        ┌────────▼──────────┐
     │  useCms()         │        │  useDemoCms()     │
     │  (Same Interface) │        │  (Same Interface) │
     └────────┬──────────┘        └────────┬──────────┘
              │                             │
              └─────────────┬───────────────┘
                            │
                    Same Interface ✅
                    
                    {
                      loading: boolean
                      ready: boolean
                      articles: Article[]
                      categories: Category[]
                      getArticleBySlug: (slug) => Article
                      searchArticles: (q) => Article[]
                      ...
                    }
                    
          Components work with BOTH contexts
                WITHOUT MODIFICATION
```

## Marketing Integration

```
┌──────────────────────────────────────────────────────────┐
│              SangTX Marketing Homepage                   │
│                    (/)                                   │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  [Hero Section]                                          │
│  [Features Section]                                      │
│  [How It Works]                                          │
│                                                          │
│  ╔═══════════════════════════════════════╗              │
│  ║        📱 Live Demo Section          ║              │
│  ║                                       ║              │
│  ║  Experience SangTX in action          ║              │
│  ║                                       ║              │
│  ║  ┌─────────────────┐  ┌─────────────┐║              │
│  ║  │ Explore Demo  ──┼─▶│   /demo     │║              │
│  ║  └─────────────────┘  └─────────────┘║              │
│  ║                                       ║              │
│  ║  ┌─────────────────┐  ┌─────────────┐║              │
│  ║  │  Admin Panel  ──┼─▶│ /demo/admin │║              │
│  ║  └─────────────────┘  └─────────────┘║              │
│  ║                                       ║              │
│  ║  [Browser Mockup Visual]              ║              │
│  ╚═══════════════════════════════════════╝              │
│                                                          │
│  [Pricing Section]                                       │
│  [FAQ]                                                   │
│  [Footer]                                                │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

## Visitor Journey Map

```
Marketing Visit → Demo Exploration → Trial Conversion

Step 1: Discovery
┌─────────────────┐
│ Land on /       │ → SangTX marketing homepage
└────────┬────────┘
         │
         ▼
Step 2: Interest
┌─────────────────┐
│ Scroll to Demo  │ → See "Live Demo" section
└────────┬────────┘
         │
         ▼
Step 3: Exploration
┌─────────────────┐
│ Click "Explore" │ → Navigate to /demo
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Browse Articles │ → Read actual content
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Try Search      │ → See real search results
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Filter Category │ → Experience filtering
└────────┬────────┘
         │
         ▼
Step 4: Deep Dive
┌─────────────────┐
│ Open Admin      │ → Navigate to /demo/admin
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ View Dashboard  │ → See metrics
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Check Features  │ → Explore news, media, ads, etc.
└────────┬────────┘
         │
         ▼
Step 5: Conversion
┌─────────────────┐
│ Click "Start    │ → Navigate to /pricing
│  Free Trial"    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Sign Up         │ → Begin onboarding
└─────────────────┘
         │
         ▼
     Customer ✅
```

## Files & Responsibilities

```
src/app/
├── lib/
│   ├── demoTenant.ts          ← Demo data (50+ articles, categories, etc.)
│   ├── demoCmsProvider.tsx    ← Demo CMS context wrapper
│   ├── demoContent.ts          ← Legacy compatibility exports
│   ├── cms.tsx                 ← Production CMS provider (unchanged)
│   └── ...
│
├── pages/
│   ├── DemoPortalV2.tsx        ← Demo router & admin
│   ├── DemoPortal.tsx          ← Old demo (can be removed)
│   ├── HomePage.tsx            ← Shared by demo & production
│   ├── ArticlePage.tsx         ← Shared by demo & production
│   ├── CategoryPage.tsx        ← Shared by demo & production
│   ├── SearchPage.tsx          ← Shared by demo & production
│   ├── AdminPage.tsx           ← Production admin (unchanged)
│   ├── SangTXHomePage.tsx      ← Marketing homepage (updated buttons)
│   └── ...
│
└── App.tsx                      ← Main router (demo routes added)
```

## Security Model

```
┌──────────────────────────────────────────────────────────┐
│                 Demo Security Layers                     │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  ✅ No Database Access                                   │
│     Demo data is static TypeScript objects              │
│     No connection strings, no credentials               │
│                                                          │
│  ✅ No Backend API Calls                                 │
│     Demo bypasses all API layers                        │
│     No network requests for data                        │
│                                                          │
│  ✅ Isolated Context                                     │
│     DemoCmsProvider ≠ CmsProvider                       │
│     No shared state                                      │
│                                                          │
│  ✅ Read-Only UI                                         │
│     All mutation controls disabled                      │
│     Clear visual feedback                               │
│                                                          │
│  ✅ Fictional Content                                    │
│     All names, events are made up                       │
│     No real PII, no copyright issues                    │
│                                                          │
│  ✅ Route Isolation                                      │
│     /demo/* routes never access /buxar-news/*          │
│     Routing logic prevents cross-contamination         │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

---

## Deployment Workflow

```
Developer Pushes Code
         │
         ▼
GitHub Repository
         │
         ▼
Vercel Build System
         │
         ├──▶ npm run typecheck  ✅
         ├──▶ npm run build      ✅
         └──▶ Deploy to CDN      ✅
                  │
                  ▼
        Production Site
                  │
    ┌─────────────┼─────────────┐
    │             │             │
    ▼             ▼             ▼
    /          /demo       /buxar-news
Marketing    Demo Tenant   Real Tenant
```

---

**Architecture Documentation**  
**Created:** 2026-08-12  
**Version:** 1.0  
**Status:** Production-Ready
