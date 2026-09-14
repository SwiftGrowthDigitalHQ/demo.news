import { useState, useEffect, useMemo } from 'react';
import { getSupabaseClient } from '../../lib/supabase';
import { useCms, type PublicArticle } from './cms';

/**
 * Custom hook to fetch older posts from Supabase
 * 
 * This hook fetches posts that are NOT in the recent articles array,
 * ensuring that Older Posts section always has content when available.
 * 
 * @param limit - Number of posts to fetch (default: 8 for homepage, more for listing page)
 * @param recentArticleIds - Set of article IDs to exclude (already shown in recent sections)
 */
export function useOlderPosts(limit: number = 8, recentArticleIds?: Set<string>) {
  const { tenantId } = useCms();
  const [olderPosts, setOlderPosts] = useState<PublicArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Convert Set to sorted array for stable dependency
  const excludeIds = useMemo(
    () => (recentArticleIds && recentArticleIds.size > 0 ? Array.from(recentArticleIds).sort() : []),
    [recentArticleIds]
  );
  const excludeIdsKey = excludeIds.join(',');

  useEffect(() => {
    async function fetchOlderPosts() {
      console.log('[useOlderPosts] Starting fetch, tenantId:', tenantId, 'limit:', limit, 'excludeIds count:', excludeIds.length);
      
      if (!tenantId) {
        console.log('[useOlderPosts] No tenantId, returning empty');
        setOlderPosts([]);
        setLoading(false);
        return;
      }

      const client = getSupabaseClient();
      if (!client) {
        console.log('[useOlderPosts] No Supabase client, returning empty');
        setOlderPosts([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Calculate date threshold (3 days ago)
        const threeDaysAgo = new Date();
        threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
        const threeDaysAgoISO = threeDaysAgo.toISOString();
        
        console.log('[useOlderPosts] Fetching posts older than:', threeDaysAgoISO);

        // First, try to fetch posts older than 3 days
        let query = client
          .from('articles')
          .select(`
            id,
            slug,
            title,
            excerpt,
            content,
            category_id,
            featured_image,
            media_type,
            video_url,
            seo_title,
            seo_description,
            status,
            featured,
            trending,
            breaking,
            publish_at,
            read_time,
            views_count,
            category:categories!articles_category_id_fkey(id, name, slug),
            author:users!articles_author_id_fkey(
              id,
              full_name,
              role:roles(slug, name)
            ),
            tags:article_tags(tag)
          `)
          .eq('tenant_id', tenantId)
          .eq('status', 'published')
          .is('deleted_at', null)
          .lt('publish_at', threeDaysAgoISO) // Posts older than 3 days
          .order('publish_at', { ascending: false, nullsFirst: false });

        // Exclude recent article IDs if provided
        if (excludeIds.length > 0) {
          query = query.not('id', 'in', `(${excludeIds.join(',')})`);
        }

        const { data: olderData, error: olderError } = await query.limit(limit);

        if (olderError) {
          console.error('[useOlderPosts] Error in primary query:', olderError);
          throw olderError;
        }

        let fetchedPosts = olderData ?? [];
        
        console.log(`[useOlderPosts] Fetched ${fetchedPosts.length} posts older than 3 days`);

        // If we got fewer posts than requested, fetch additional older posts (without 3-day filter)
        if (fetchedPosts.length < limit) {
          console.log(`[useOlderPosts] Need ${limit - fetchedPosts.length} more posts, running fallback query`);
          
          const remaining = limit - fetchedPosts.length;
          const existingIds = new Set(fetchedPosts.map(p => p.id));
          
          // Combine existing IDs with recent IDs to exclude
          const allExcludedIds = [
            ...Array.from(existingIds),
            ...excludeIds,
          ];

          let fallbackQuery = client
            .from('articles')
            .select(`
              id,
              slug,
              title,
              excerpt,
              content,
              category_id,
              featured_image,
              media_type,
              video_url,
              seo_title,
              seo_description,
              status,
              featured,
              trending,
              breaking,
              publish_at,
              read_time,
              views_count,
              category:categories!articles_category_id_fkey(id, name, slug),
              author:users!articles_author_id_fkey(
                id,
                full_name,
                role:roles(slug, name)
              ),
              tags:article_tags(tag)
            `)
            .eq('tenant_id', tenantId)
            .eq('status', 'published')
            .is('deleted_at', null)
            .order('publish_at', { ascending: false, nullsFirst: false });

          // Exclude all already-included IDs
          if (allExcludedIds.length > 0) {
            fallbackQuery = fallbackQuery.not('id', 'in', `(${allExcludedIds.join(',')})`);
          }

          const { data: fallbackData, error: fallbackError } = await fallbackQuery.limit(remaining);

          if (fallbackError) {
            console.error('[useOlderPosts] Error in fallback query:', fallbackError);
            throw fallbackError;
          }

          console.log(`[useOlderPosts] Fallback query returned ${(fallbackData ?? []).length} posts`);

          // Combine both results
          fetchedPosts = [...fetchedPosts, ...(fallbackData ?? [])];
        }

        console.log(`[useOlderPosts] Total posts after processing: ${fetchedPosts.length}`);

        // Transform the data to PublicArticle format
        const transformedPosts: PublicArticle[] = fetchedPosts.map((row: any) => {
          const category = Array.isArray(row.category) ? row.category[0] : row.category;
          const author = Array.isArray(row.author) ? row.author[0] : row.author;
          const role = Array.isArray(author?.role) ? author.role[0] : author?.role;

          // Format content
          let contentArray: string[] = [];
          if (Array.isArray(row.content)) {
            contentArray = row.content.map((item: any) => String(item));
          } else if (typeof row.content === 'string') {
            try {
              const parsed = JSON.parse(row.content);
              contentArray = Array.isArray(parsed) ? parsed.map((item: any) => String(item)) : [row.content];
            } catch {
              contentArray = [row.content];
            }
          }

          // Format tags
          const tags = Array.isArray(row.tags)
            ? row.tags
                .map((tag: any) => {
                  if (typeof tag === 'string') return tag;
                  if (tag && typeof tag === 'object' && 'tag' in tag) {
                    return String(tag.tag ?? '');
                  }
                  return '';
                })
                .filter(Boolean)
            : [];

          return {
            id: String(row.id),
            slug: String(row.slug),
            title: String(row.title),
            excerpt: String(row.excerpt),
            content: contentArray,
            category_id: String(row.category_id),
            category_name: String(category?.name ?? 'News'),
            category_slug: String(category?.slug ?? 'news'),
            author_name: String(author?.full_name ?? 'Editorial Desk'),
            author_role: String(role?.name ?? 'Reporter'),
            publish_at: typeof row.publish_at === 'string' ? row.publish_at : null,
            read_time: typeof row.read_time === 'string' ? row.read_time : null,
            featured_image: typeof row.featured_image === 'string' ? row.featured_image : null,
            media_type: String(row.media_type ?? 'article'),
            video_url: typeof row.video_url === 'string' ? row.video_url : null,
            seo_title: typeof row.seo_title === 'string' ? row.seo_title : null,
            seo_description: typeof row.seo_description === 'string' ? row.seo_description : null,
            featured: Boolean(row.featured),
            trending: Boolean(row.trending),
            breaking: Boolean(row.breaking),
            views_count: Number(row.views_count ?? 0),
            tags,
          };
        });

        console.log(`[useOlderPosts] Successfully transformed ${transformedPosts.length} posts`);
        setOlderPosts(transformedPosts);
      } catch (err) {
        console.error('[useOlderPosts] Error fetching older posts:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch older posts');
        setOlderPosts([]);
      } finally {
        setLoading(false);
      }
    }

    void fetchOlderPosts();
  }, [tenantId, limit, excludeIdsKey]); // Use string key instead of Set for stable dependency

  return { olderPosts, loading, error };
}
