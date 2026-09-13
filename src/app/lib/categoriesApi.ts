/**
 * Categories API - Production-ready SaaS News CMS
 * Comprehensive CRUD operations with filtering, sorting, and bulk operations
 */

import {
  listAdminCategories,
  upsertAdminCategory,
  deleteAdminCategory,
  getAdminCategoryBySlug,
  restoreAdminCategory,
  bulkDeleteAdminCategories,
  bulkUpdateAdminCategoryStatus,
  getNavbarAdminCategories,
  getHomepageAdminCategories,
  updateAdminCategorySort,
  AdminCategory,
} from './admin';

// Type aliases
export type Category = AdminCategory;

export interface CategoryFilter {
  search?: string;
  status?: 'published' | 'draft';
  featured?: boolean;
  navbarOnly?: boolean;
  homepageOnly?: boolean;
  sortBy?: 'sort_order' | 'name' | 'article_count' | 'updated_at';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

// Re-export core admin functions
export async function listCategories(filters: CategoryFilter = {}): Promise<Category[]> {
  // Get all categories
  let categories = await listAdminCategories();

  // Apply filters client-side (since admin.ts doesn't have filter support)
  if (filters.status) {
    categories = categories.filter(c => c.status === filters.status);
  }

  if (filters.featured !== undefined) {
    categories = categories.filter(c => c.is_featured === filters.featured);
  }

  if (filters.navbarOnly) {
    categories = categories.filter(c => c.show_in_navbar === true);
  }

  if (filters.homepageOnly) {
    categories = categories.filter(c => c.show_on_homepage === true);
  }

  if (filters.search) {
    const search = filters.search.toLowerCase();
    categories = categories.filter(c =>
      c.name.toLowerCase().includes(search) ||
      c.slug.toLowerCase().includes(search) ||
      c.description?.toLowerCase().includes(search)
    );
  }

  // Apply sorting
  const sortBy = filters.sortBy || 'sort_order';
  const sortOrder = filters.sortOrder || 'asc';
  categories.sort((a, b) => {
    let aVal: any = a[sortBy as keyof AdminCategory];
    let bVal: any = b[sortBy as keyof AdminCategory];
    if (aVal === null || aVal === undefined) aVal = '';
    if (bVal === null || bVal === undefined) bVal = '';
    const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
    return sortOrder === 'asc' ? comparison : -comparison;
  });

  // Apply pagination
  if (filters.limit) {
    const offset = filters.offset || 0;
    categories = categories.slice(offset, offset + filters.limit);
  }

  return categories;
}

export async function getCategory(id: string): Promise<Category> {
  const categories = await listAdminCategories();
  const category = categories.find(c => c.id === id);
  if (!category) throw new Error(`Category not found: ${id}`);
  return category;
}

export const getCategoryBySlug = getAdminCategoryBySlug;

export async function createCategory(payload: Partial<Category> & { name: string; slug?: string }): Promise<Category> {
  const slug = payload.slug || generateSlug(payload.name);
  return upsertAdminCategory({ ...payload, name: payload.name, slug });
}

export async function updateCategory(id: string, payload: Partial<Category>): Promise<Category> {
  return upsertAdminCategory({ ...payload, id, name: payload.name || '', slug: payload.slug || '' });
}

export const deleteCategory = deleteAdminCategory;
export const restoreCategory = restoreAdminCategory;
export const bulkDeleteCategories = bulkDeleteAdminCategories;
export const bulkUpdateCategoryStatus = bulkUpdateAdminCategoryStatus;

/**
 * Update category sort order (drag & drop)
 */
export async function updateCategorySort(sortUpdates: Array<{ id: string; sort_order: number }>): Promise<void> {
  return updateAdminCategorySort(sortUpdates);
}

/**
 * Duplicate category
 */
export async function duplicateCategory(id: string): Promise<Category> {
  const original = await getCategory(id);
  const duplicate = await createCategory({
    name: `${original.name} (Copy)`,
    slug: `${original.slug}-copy-${Date.now()}`,
    description: original.description,
    icon: original.icon,
    color: original.color,
    cover_image_url: original.cover_image_url,
    show_in_navbar: original.show_in_navbar,
    show_on_homepage: original.show_on_homepage,
    status: 'draft',
    is_featured: false,
    seo_title: original.seo_title,
    seo_description: original.seo_description,
    og_image_url: original.og_image_url,
    canonical_url: original.canonical_url,
  });
  return duplicate;
}

// Re-export navbar/homepage helpers
export const getNavbarCategories = getNavbarAdminCategories;
export const getHomepageCategories = getHomepageAdminCategories;

/**
 * Generate URL-friendly slug from text
 */
export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

/**
 * Generate JSON-LD Category schema
 */
export function generateCategorySchema(category: Category, baseUrl: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    '@id': `${baseUrl}/category/${category.slug}`,
    name: category.name,
    description: category.description || category.seo_description,
    image: category.og_image_url || category.cover_image_url,
    url: `${baseUrl}/category/${category.slug}`,
    potentialAction: {
      '@type': 'SearchAction',
      target: `${baseUrl}/search?category=${category.slug}&q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  };
}
