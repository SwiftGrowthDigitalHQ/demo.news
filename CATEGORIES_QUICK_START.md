# Categories Module - Quick Start Guide

## For Content Editors

### Adding a New Category

1. Go to **Admin Dashboard** → **Categories**
2. Click **New Category** (red button, top right)
3. Fill in the form:
   - **Name**: e.g., "Politics" (required)
   - **Slug**: Auto-generated as `politics` (can edit if needed)
   - **Icon**: Pick an emoji (e.g., 🏛️)
   - **Color**: Choose a color or enter hex code
   - **Cover Image**: Paste image URL for category header
   - **Description**: Brief category description
4. Choose visibility:
   - ✓ **Show in Navbar**: Display in main navigation
   - ✓ **Show on Homepage**: Feature in homepage sections
   - ✓ **Featured**: Highlight as important
5. Set **Status**: Published (to make live) or Draft (to hide)
6. Add **SEO fields** (optional but recommended):
   - SEO Title: For search engines (60 char limit)
   - SEO Description: For search results (160 char limit)
   - OG Image: For social media previews
   - Canonical URL: For duplicate page handling
7. Click **Create**

### Editing a Category

1. Find the category in the table
2. Click the **pencil icon** (Edit) in Actions column
3. Make changes to any field
4. Click **Update**

### Deleting a Category

1. Find the category in the table
2. Click the **trash icon** (Delete) in Actions column
3. Confirm deletion
4. Category is soft-deleted (can be restored if needed)

### Duplicating a Category

1. Find the category in the table
2. Click the **copy icon** (Duplicate) in Actions column
3. A new draft category is created with "(Copy)" suffix
4. Edit as needed and publish

### Bulk Operations

To perform actions on multiple categories:

1. Select categories using checkboxes
2. Available bulk actions appear:
   - **Publish**: Set to published status
   - **Draft**: Set to draft status
   - **Delete**: Soft delete all selected
3. Confirm action

### Reordering Categories (Drag & Drop)

1. In the table, grab the **grip handle** (left of icon)
2. Drag up or down to reorder
3. Sort order updates automatically
4. Order appears in navbar/homepage

### Searching & Filtering

- **Search box**: Type category name, slug, or description
- **Status filter**: Show Published/Draft/All
- **Featured filter**: Show Featured/Regular/All
- Filters combine (search + status + featured)

---

## For Developers

### Using the Categories API

```typescript
import { 
  listCategories,
  getCategory,
  getCategoryBySlug,
  createCategory,
  updateCategory,
  deleteCategory,
  getNavbarCategories,
  getHomepageCategories,
  getFeaturedCategories,
} from '@/app/lib/categoriesApi';

// List all published categories
const categories = await listCategories({ status: 'published' });

// Get categories for navbar
const navCats = await getNavbarCategories();

// Get by slug (published only)
const politics = await getCategoryBySlug('politics');

// Create new
const newCat = await createCategory({
  name: 'Science',
  description: 'Science news and research',
  icon: '🔬',
  color: '#2563eb',
});

// Update
await updateCategory(categoryId, {
  status: 'draft',
  is_featured: true,
});

// Delete (soft delete)
await deleteCategory(categoryId);
```

### Using with CMS Context

```typescript
import { useCms } from '@/app/lib/cms';

function MyComponent() {
  const { categories, getCategoryBySlug } = useCms();

  // All categories
  console.log(categories);

  // Find by slug
  const cat = getCategoryBySlug('politics');
}
```

### Filtering Articles by Category

```typescript
// In any component with articles
const articles = useMemo(() => {
  return allArticles.filter(a => a.category_slug === 'politics');
}, [allArticles]);
```

### Category Type Definition

```typescript
type PublicCategory = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  cover_image_url: string | null;
  show_in_navbar: boolean;
  show_on_homepage: boolean;
  status: 'published' | 'draft';
  is_featured: boolean;
  sort_order: number;
  seo_title: string | null;
  seo_description: string | null;
  og_image_url: string | null;
  canonical_url: string | null;
  article_count: number;
};
```

### Auto-Seeding for New Tenants

When a new tenant is created:
- 12 default categories are automatically seeded
- Categories: Home, Politics, Bihar, National, Crime, Business, Sports, Technology, Education, Entertainment, Video News, Breaking News
- All set to published, show_in_navbar=true, show_on_homepage=true

---

## Display Locations

### Navbar
- Shows only categories with `show_in_navbar=true`
- Displays in `sort_order`
- Links to `/category/{slug}`

### Homepage
- Dedicated sections for main categories
- Filter by `show_on_homepage=true`
- Displays featured articles from each category

### Category Page
- Archives all articles in the category
- Pagination: 8 articles per page
- Includes sidebar widgets (weather, markets, live TV)
- Shows article count

---

## SEO Best Practices

### Title (60 character limit)
Good: `Politics News in Bihar`
Bad: `This is the Politics category page for the SangTX News Portal`

### Description (160 character limit)
Good: `Latest politics news from Bihar and India. Breaking updates on elections, governance, and policy changes.`
Bad: `Politics`

### OG Image
- Use high-quality image (1200×630px recommended)
- Display category topic visually
- Used in social media preview

### Canonical URL
- Set if category is mirrored elsewhere
- Format: `https://yoursite.com/category/politics`
- Leave blank for primary category pages

---

## Troubleshooting

### Category not showing in navbar?
- Check `show_in_navbar` is enabled
- Check `status` is "Published"
- Verify `sort_order` (higher number = lower in list)

### Category articles not displaying?
- Verify articles have correct `category_slug` assigned
- Check article `status` is "Published"
- Check article's `publish_at` date is in past

### Slug conflicts?
- Slugs must be unique per tenant
- System auto-generates from name
- Edit if manual slug conflicts exist

### Color picker not working?
- Try entering hex code directly (e.g., #dc2626)
- Format: # followed by 6 hex digits
- Fallback: #dc2626 (red) is default

---

## Common Tasks

### Make a category "Featured"
1. Edit the category
2. Check "Featured" toggle
3. Click Update

### Hide a category temporarily
1. Edit the category
2. Change Status to "Draft"
3. Click Update
4. Category disappears from all public areas

### Change navbar order
1. In admin table, drag categories up/down
2. Navbar updates automatically

### Add SEO for social sharing
1. Edit category
2. Fill in OG Image URL (use cover_image_url if available)
3. Add SEO Title and Description
4. Click Update

### Remove from navbar but keep on homepage
1. Edit category
2. Uncheck "Show in Navbar"
3. Keep "Show on Homepage" checked
4. Click Update

---

## API Reference

All API functions are in `src/app/lib/categoriesApi.ts`

### Query Functions (Read-only)
- `listCategories(filters)` - List with filtering
- `getCategory(id)` - Get by ID
- `getCategoryBySlug(slug)` - Get by slug
- `getNavbarCategories()` - Get navbar-visible
- `getHomepageCategories()` - Get homepage-visible
- `getFeaturedCategories()` - Get featured only

### Mutation Functions (Admin only)
- `createCategory(payload)` - Create new
- `updateCategory(id, payload)` - Update existing
- `deleteCategory(id)` - Soft delete
- `restoreCategory(id)` - Restore deleted
- `bulkDeleteCategories(ids)` - Delete multiple
- `bulkUpdateCategoryStatus(ids, status)` - Bulk status
- `updateCategorySort(updates)` - Drag & drop sort
- `duplicateCategory(id)` - Clone category

### Utility Functions
- `generateSlug(text)` - Create URL-friendly slug
- `generateCategorySchema(category, baseUrl)` - JSON-LD schema

---

## Next Steps

1. **Create 3-5 test categories** in admin
2. **Publish articles** and assign to categories
3. **Test navbar display** - verify categories appear
4. **Test category pages** - view article lists
5. **Add SEO fields** for top categories
6. **Monitor analytics** on category pages

---

For more details, see: `CATEGORIES_MODULE_UPGRADE_COMPLETE.md`
