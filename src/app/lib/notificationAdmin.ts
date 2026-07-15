import { getSupabaseClient } from '../../lib/supabase';

export type NewsletterStats = {
  total_subscribers: number;
  active_subscribers: number;
  cancelled_subscribers: number;
  push_total: number;
  push_active: number;
  notifications_sent: number;
};

export type SubscriberRow = {
  id: string;
  email: string;
  full_name: string | null;
  status: string;
  source: string | null;
  last_notified_at: string | null;
  unsubscribe_token: string | null;
  created_at: string;
  updated_at: string;
};

export type NotificationLogRow = {
  id: string;
  article_id: string | null;
  subscriber_email: string | null;
  channel: string;
  status: string;
  sent_at: string | null;
  error_message: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type PushSubscriberRow = {
  id: string;
  user_id: string | null;
  fcm_token: string;
  device_type: string;
  browser: string | null;
  status: string;
  last_notified_at: string | null;
  created_at: string;
  updated_at: string;
};

function client() {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('Supabase not configured.');
  return supabase;
}

/**
 * Get newsletter stats
 */
export async function getNewsletterStats(): Promise<NewsletterStats> {
  const supabase = client();
  const { data, error } = await supabase.rpc('get_newsletter_stats');
  if (error) throw error;
  return data as NewsletterStats;
}

/**
 * List all newsletter subscribers
 */
export async function listSubscribers(options?: { status?: string; search?: string }): Promise<SubscriberRow[]> {
  const supabase = client();
  let query = supabase
    .from('subscriptions')
    .select('*')
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (options?.status && options.status !== 'all') {
    query = query.eq('status', options.status);
  }
  if (options?.search) {
    query = query.ilike('email', `%${options.search}%`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as SubscriberRow[];
}

/**
 * Delete a subscriber (soft delete)
 */
export async function deleteSubscriber(id: string): Promise<void> {
  const supabase = client();
  const { error } = await supabase
    .from('subscriptions')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

/**
 * Export subscribers as CSV string
 */
export async function exportSubscribersCSV(): Promise<string> {
  const subscribers = await listSubscribers();
  const header = 'Email,Name,Status,Source,Subscribed At\n';
  const rows = subscribers.map(s =>
    `"${s.email}","${s.full_name || ''}","${s.status}","${s.source || ''}","${s.created_at}"`
  ).join('\n');
  return header + rows;
}

/**
 * List notification logs
 */
export async function listNotificationLogs(limit = 50): Promise<NotificationLogRow[]> {
  const supabase = client();
  const { data, error } = await supabase
    .from('notification_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as NotificationLogRow[];
}

/**
 * List push subscribers
 */
export async function listPushSubscribers(): Promise<PushSubscriberRow[]> {
  const supabase = client();
  const { data, error } = await supabase
    .from('push_subscribers')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as PushSubscriberRow[];
}

/**
 * Send notification to all active subscribers when article is published.
 * This creates log entries. Actual email delivery requires a Supabase Edge Function
 * or external service (Resend, SendGrid, etc.).
 *
 * For push notifications, this sends via FCM Admin SDK (requires Edge Function).
 */
export async function triggerArticleNotification(articleId: string): Promise<{ sent: number; failed: number }> {
  const supabase = client();

  // Fetch article details
  const { data: article, error: articleError } = await supabase
    .from('articles')
    .select('id, title, excerpt, slug, featured_image')
    .eq('id', articleId)
    .single();

  if (articleError || !article) throw articleError || new Error('Article not found');

  // Fetch active email subscribers
  const { data: subscribers, error: subError } = await supabase
    .from('subscriptions')
    .select('id, email')
    .eq('status', 'active')
    .is('deleted_at', null);

  if (subError) throw subError;

  let sent = 0;
  let failed = 0;

  // Create notification log entries for email subscribers
  const emailLogs = (subscribers ?? []).map(sub => ({
    article_id: article.id,
    subscriber_email: sub.email,
    channel: 'email',
    status: 'pending',
    metadata: {
      title: article.title,
      excerpt: article.excerpt,
      slug: article.slug,
      image: article.featured_image,
    },
  }));

  if (emailLogs.length > 0) {
    const { error: logError } = await supabase.from('notification_logs').insert(emailLogs);
    if (logError) {
      failed += emailLogs.length;
    } else {
      sent += emailLogs.length;
    }
  }

  // Create notification log entries for push subscribers
  const { data: pushSubs } = await supabase
    .from('push_subscribers')
    .select('id, fcm_token')
    .eq('status', 'active');

  const pushLogs = (pushSubs ?? []).map(ps => ({
    article_id: article.id,
    subscriber_email: ps.fcm_token.slice(0, 20) + '...',
    channel: 'push',
    status: 'pending',
    metadata: {
      title: article.title,
      body: article.excerpt,
      image: article.featured_image,
      click_action: `/article/${article.slug}`,
    },
  }));

  if (pushLogs.length > 0) {
    const { error: pushLogError } = await supabase.from('notification_logs').insert(pushLogs);
    if (pushLogError) {
      failed += pushLogs.length;
    } else {
      sent += pushLogs.length;
    }
  }

  // Update last_notified_at for subscribers
  await supabase
    .from('subscriptions')
    .update({ last_notified_at: new Date().toISOString() })
    .eq('status', 'active')
    .is('deleted_at', null);

  return { sent, failed };
}

/**
 * Unsubscribe a user via token (called from unsubscribe page)
 */
export async function unsubscribeByToken(token: string): Promise<'success' | 'not_found'> {
  const supabase = client();
  const { data, error } = await supabase.rpc('unsubscribe_by_token', { p_token: token });
  if (error) throw error;
  return data as 'success' | 'not_found';
}
