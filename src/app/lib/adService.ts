import { getSupabaseClient } from '../../lib/supabase';

export type AdPlacement = string;

export type AdRecord = {
  id: string;
  campaign_id: string | null;
  placement: string;
  ad_type: 'adsense' | 'direct';
  advertiser_name: string;
  title: string;
  target_url: string | null;
  banner_url: string | null;
  adsense_code: string | null;
  position: string | null;
  priority: number;
  start_date: string | null;
  end_date: string | null;
  click_count: number;
  impression_count: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type AdStats = {
  total_ads: number;
  active_ads: number;
  total_impressions: number;
  total_clicks: number;
  ctr: number;
};

/**
 * Fetch active ads for a specific slot.
 * Checks placement column against multiple name variants for backward compatibility.
 */
export async function getActiveAds(slot: AdPlacement, limit = 3): Promise<AdRecord[]> {
  const client = getSupabaseClient();
  if (!client) return [];

  // Build list of names to search for
  const names: string[] = [slot];
  
  // Map new underscore names to old hyphen/legacy names
  const legacyMap: Record<string, string[]> = {
    'homepage_top_banner': ['homepage-header-banner'],
    'homepage_mid_banner': ['hero'],
    'homepage_footer_banner': ['footer', 'category', 'homepage-footer-banner'],
    'sidebar_top': ['sidebar', 'sidebar-top'],
    'sidebar_top_2': ['sidebar-top-2'],
    'sidebar_middle': ['sidebar-middle'],
    'sidebar_bottom': ['sidebar-bottom'],
    'article_top': ['article-top'],
    'article_middle': ['article-middle'],
    'article_sidebar': ['article-sidebar'],
    'article_bottom': ['article-bottom'],
  };

  // For sidebar slots, determine offset to pick different ads
  let offset = 0;
  if (slot === 'sidebar_top_2') offset = 1;
  if (slot === 'sidebar_middle') offset = 2;
  if (slot === 'sidebar_bottom') offset = 3;
  
  if (legacyMap[slot]) names.push(...legacyMap[slot]);
  const hyphenated = slot.replace(/_/g, '-');
  if (!names.includes(hyphenated)) names.push(hyphenated);
  if (!names.includes(hyphenated)) names.push(hyphenated);

  try {
    // Query: find ads where placement is in our list of names
    const { data, error } = await client
      .from('advertisements')
      .select('*')
      .in('placement', names)
      .eq('is_active', true)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(limit + offset + 2);

    if (!error && data && data.length > 0) {
      // Filter out ads with no content (no banner image and no adsense code)
      const usable = data.filter((ad: AdRecord) => ad.banner_url || ad.adsense_code);
      // Use offset to pick different ads for different sidebar positions
      if (usable.length > offset) return [usable[offset]];
      if (usable.length > 0) return [usable[0]];
    }

    // Also try position column
    const { data: posData } = await client
      .from('advertisements')
      .select('*')
      .in('position', names)
      .eq('is_active', true)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(limit + offset + 2);

    if (posData && posData.length > 0) {
      const usable = posData.filter((ad: AdRecord) => ad.banner_url || ad.adsense_code);
      if (usable.length > offset) return [usable[offset]];
      if (usable.length > 0) return [usable[0]];
    }

    return [];
  } catch {
    return [];
  }
}

/**
 * Track an ad impression
 */
export async function trackImpression(adId: string): Promise<void> {
  const client = getSupabaseClient();
  if (!client) return;
  try { await client.rpc('track_ad_impression', { p_ad_id: adId }); } catch { /* ignore */ }
}

/**
 * Track an ad click
 */
export async function trackClick(adId: string): Promise<void> {
  const client = getSupabaseClient();
  if (!client) return;
  try { await client.rpc('track_ad_click', { p_ad_id: adId }); } catch { /* ignore */ }
}

/**
 * Get ad analytics stats (admin)
 */
export async function getAdStats(): Promise<AdStats | null> {
  const client = getSupabaseClient();
  if (!client) return null;
  const { data, error } = await client.rpc('get_ad_stats');
  if (error) return null;
  return data as AdStats;
}

/**
 * Admin: List all ads
 */
export async function listAllAds(): Promise<AdRecord[]> {
  const client = getSupabaseClient();
  if (!client) return [];
  const { data, error } = await client
    .from('advertisements')
    .select('*')
    .is('deleted_at', null)
    .order('priority', { ascending: false })
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as AdRecord[];
}

/**
 * Admin: Create or update ad
 */
export async function upsertAd(payload: Partial<AdRecord> & {
  title: string;
  placement: string;
  advertiser_name: string;
}): Promise<AdRecord> {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase not configured');

  const body = {
    title: payload.title,
    placement: payload.placement,
    ad_type: payload.ad_type ?? 'direct',
    advertiser_name: payload.advertiser_name,
    target_url: payload.target_url ?? null,
    banner_url: payload.banner_url ?? null,
    adsense_code: payload.adsense_code ?? null,
    position: payload.position ?? null,
    priority: payload.priority ?? 0,
    start_date: payload.start_date ?? null,
    end_date: payload.end_date ?? null,
    is_active: payload.is_active ?? true,
  };

  const result = payload.id
    ? await client.from('advertisements').update(body).eq('id', payload.id).select('*').single()
    : await client.from('advertisements').insert(body).select('*').single();

  if (result.error) throw result.error;
  return result.data as AdRecord;
}

/**
 * Admin: Delete ad (soft)
 */
export async function deleteAd(id: string): Promise<void> {
  const client = getSupabaseClient();
  if (!client) return;
  await client.from('advertisements').update({ deleted_at: new Date().toISOString() }).eq('id', id);
}
