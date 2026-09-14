import { useState, useEffect, useMemo } from 'react';
import { getSupabaseClient } from '../../lib/supabase';
import { useCms, type PublicArticle } from './cms';

/**
 * Custom hook to fetch older posts from Supabase
 * 
 * Fetches the next older published articles after excluding recent homepage content.
 * Does NOT require posts to be older than a specific number of days.
 * Simply returns the remaining older posts sorted by publish_at DESC.
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
      if (!tenantId) {
        console.log('[useOlderPosts] No tenantId, skipping fetch');
        setOlderPosts([]);
        setLoading(false);
        return;
      }

      const client = getSupabaseClient();
      if (!client) {
        console.log('[useOlderPosts] No Supabase client, skipping fetch');
        setOlderPosts([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        console.log('[useOlderPosts] === TEST A: Fetch ALL published articles (no filters) ===');
        
        // TEST A: Fetch published articles WITHOUT exclusion
        const testQueryA = client
          .from('articles')
          .select('id, title, publish_at, status, tenant_id')
          .eq('tenant_id', tenantId)
          .eq('status', 'published')
          .is('deleted_at', null)
          .order('publish_at', { ascending: false, nullsFirst: false })
          .limit(20);

        const { data: testDataA, error: testErrorA } = await testQueryA;

        if (testErrorA) {
          console.error('[useOlderPosts] TEST A ERROR:', {
            message: testErrorA.message,
            code: testErrorA.code,
            details: testErrorA.details,
            hint: testErrorA.hint,
          });
        } else {
          console.log(`[useOlderPosts] TEST A: Found ${testDataA?.length || 0} total articles`);
          if (testDataA && testDataA.length > 0) {
            console.log('[useOlderPosts] TEST A: First 5 articles:', testDataA.slice(0, 5).map((a: any) => ({
              id: a.id,
              title: a.title?.substring(0, 50),
              publish_at: a.publish_at,
              status: a.status,
              tenant_id: a.tenant_id,
            })));
          }
        }

        console.log('[useOlderPosts] === TEST B: With exclusion of', excludeIds.length, 'IDs ===');
        console.log('[useOlderPosts] Excluded IDs:', excludeIds);

        // TEST B: Same query but with exclusion
        let testQueryB = client
          .from('articles')
          .select('id, title, publish_at, status, tenant_id')
          .eq('tenant_id', tenantId)
          .eq('status', 'published')
          .is('deleted_at', null)
          .order('publish_at', { ascending: false, nullsFirst: false });

        if (excludeIds.length > 0) {
          testQueryB = testQueryB.not('id', 'in', `(${excludeIds.join(',')})`);
        }

        const { data: testDataB, error: testErrorB } = await testQueryB.limit(20);

        if (testErrorB) {
          console.error('[useOlderPosts] TEST B ERROR:', {
            message: testErrorB.message,
            code: testErrorB.code,
            details: testErrorB.details,
            hint: testErrorB.hint,
          });
        } else {
          console.log(`[useOlderPosts] TEST B: Found ${testDataB?.length || 0} articles after exclusion`);
          if (testDataB && testDataB.length > 0) {
            console.log('[useOlderPosts] TEST B: Remaining articles:', testDataB.map((a: any) => ({
              id: a.id,
              title: a.title?.substring(0, 50),
              publish_at: a.publish_at,
            })));
          }
        }

        console.log('[useOlderPosts] === MAIN QUERY: Full data fetch ===');

        // Main query with full select for transformation
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
          .order('publish_at', { ascending: false, nullsFirst: false });

        // Exclude articles already shown in recent sections
        if (excludeIds.length > 0) {
          query = query.not('id', 'in', `(${excludeIds.join(',')})`);
        }

        const { data, error: queryError } = await query.limit(limit);

        if (queryError) {
          console.error('[useOlderPosts] MAIN QUERY ERROR:', {
            message: queryError.message,
            code: queryError.code,
            details: queryError.details,
            hint: queryError.hint,
          });
          throw queryError;
        }

        const fetchedPosts = data ?? [];
        
        console.log(`[useOlderPosts] Debug: tenantId=${tenantId}, excludedCount=${excludeIds.length}, fetchedCount=${fetchedPosts.length}`);

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

        setOlderPosts(transformedPosts);
      } catch (err) {
        console.error('[useOlderPosts] Error:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch older posts');
        setOlderPosts([]);
      } finally {
        setLoading(false);
      }
    }

    void fetchOlderPosts();
  }, [tenantId, limit, excludeIdsKey]);

  return { olderPosts, loading, error };
}
