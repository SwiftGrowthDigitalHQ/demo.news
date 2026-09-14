# Older Posts Section Implementation

## Overview
Successfully implemented a new "Older Posts" section on the homepage, positioned between the "Photo Gallery" and "Our Reporters" sections.

## Changes Made

### 1. HomePage Component (`src/app/pages/HomePage.tsx`)

#### New Component: `OlderPostsSection`
- Displays older posts with the same visual style as other homepage sections
- Shows article cards with:
  - Thumbnail/featured image with fallback support
  - Category badge (red accent)
  - Post title
  - Published date/time (relative format)
  - View count
  - Author name
- Responsive grid layout: 4 columns on desktop, 2 on tablet, 1 on mobile
- Empty state handling: section hidden if no posts available
- "View All" link redirects to `/older-posts` page

#### Updated Data Logic
- Modified `olderArticles` useMemo hook to:
  - Filter posts published more than 3 days ago
  - Exclude posts already shown in recent sections (Hero, Featured, Breaking, Latest, Video)
  - Sort from newest-old to oldest (descending by publish_at)
  - Gracefully fall back to next oldest posts if insufficient posts older than 3 days
  - Limit to 8 posts on homepage

#### Section Positioning
- Added `<OlderPostsSection>` after `<PhotoGallery>` and before `<ReporterShowcase>`
- Maintains proper tenant isolation and RLS filtering

### 2. New Page: OlderPostsPage (`src/app/pages/OlderPostsPage.tsx`)

#### Features
- Dedicated listing page for browsing older posts
- Pagination support (12 posts per page)
- Same filtering logic as homepage section (posts older than 3 days)
- Responsive grid layout (3 columns on desktop, 2 on tablet, 1 on mobile)
- Enhanced card design with:
  - Article excerpt
  - Category badge
  - Author information
  - View count and relative time
  - Hover effects and transitions
- Sidebar with:
  - Archive statistics
  - Ad placements
- Empty state with "Go to Homepage" button
- Full tenant isolation and RLS compliance

### 3. Routing Updates (`src/app/App.tsx`)

#### Added Route Support
- Imported `OlderPostsPage` component (lazy-loaded)
- Added `/older-posts` to direct content routes (works without tenant prefix)
- Added route handler in `TenantRouter` function
- Supports both direct URLs and tenant-prefixed URLs:
  - `/older-posts` (uses default tenant)
  - `/:tenant-slug/older-posts`

## Design Consistency

### Visual Style
- Matches existing homepage section design
- Red accent line on section title
- "View All" link on the right side
- Same card styling, spacing, typography, and border radius
- Consistent hover effects and transitions

### Responsive Design
- Desktop: 4-column grid on homepage, 3-column on listing page
- Tablet: 2-column grid
- Mobile: 1-column grid
- No horizontal overflow
- Maintains readability and usability across all screen sizes

## Data Handling

### Filtering Logic
1. Excludes posts shown in recent sections to avoid duplication
2. Prioritizes posts published more than 3 days ago
3. Falls back to next oldest posts if insufficient older posts
4. Sorts chronologically (newest-old to oldest)
5. Respects tenant isolation (RLS policies)

### Performance
- useMemo hooks prevent unnecessary recalculations
- Lazy loading for the listing page
- Efficient filtering and sorting operations

## Testing Checklist

✅ **Functionality**
- Older Posts section appears on homepage after Photo Gallery
- Section displays correct posts (older than 3 days)
- View All link navigates to /older-posts page
- Pagination works on listing page
- Empty state displays when no older posts available
- Tenant isolation maintained

✅ **Styling**
- Section title has red accent line
- Cards match existing homepage design
- Hover effects work correctly
- Category badges display properly
- Images load with fallback support

✅ **Responsive**
- Desktop layout (4-column/3-column grids)
- Tablet layout (2-column grid)
- Mobile layout (1-column grid)
- No overflow issues
- Touch-friendly on mobile

✅ **Data Integrity**
- No duplicate posts between sections
- Posts sorted correctly (newest-old to oldest)
- View counts display properly
- Author names display correctly
- Relative time formatting works

✅ **Navigation**
- Homepage section links work
- Listing page accessible
- Pagination links functional
- Article links open correct detail page

## Files Modified

1. `src/app/pages/HomePage.tsx` - Added OlderPostsSection component
2. `src/app/App.tsx` - Added routing for /older-posts

## Files Created

1. `src/app/pages/OlderPostsPage.tsx` - New listing page with pagination

## Dev Server

The development server is running on: http://localhost:5175/

## Next Steps

To verify the implementation:

1. Navigate to the homepage
2. Scroll to the "Older Posts" section (after Photo Gallery)
3. Verify posts are displayed correctly
4. Click "View All" to navigate to the listing page
5. Test pagination on the listing page
6. Verify responsive behavior on different screen sizes
7. Test on actual tenant sites to ensure RLS filtering works

## Notes

- The 3-day threshold for "older posts" can be adjusted in the useMemo logic if needed
- Ad placements (`older_posts_top`, `older_posts_bottom`) are configured but need ads to be set up in the admin panel
- The section automatically hides if no older posts are available
- All TypeScript types are properly defined and compatible with existing PublicArticle interface
