/**
 * Supabase Edge Function: notify-subscribers
 *
 * Triggered when an article status changes to 'published'.
 * Sends email notifications via Resend and push via Firebase Admin SDK (FCM HTTP v1 API).
 *
 * SETUP:
 * 1. Deploy: supabase functions deploy notify-subscribers
 * 2. Set secrets:
 *    supabase secrets set RESEND_API_KEY=re_xxxxx
 *    supabase secrets set FIREBASE_PROJECT_ID=buxar-news-3e075
 *    supabase secrets set FIREBASE_CLIENT_EMAIL=firebase-adminsdk-fbsvc@buxar-news-3e075.iam.gserviceaccount.com
 *    supabase secrets set FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
 *    supabase secrets set SITE_URL=https://yourdomain.com
 * 3. Create database webhook in Supabase Dashboard:
 *    - Table: articles
 *    - Event: UPDATE
 *    - Condition: old_record.status != 'published' AND new_record.status = 'published'
 *    - Function: notify-subscribers
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Environment variables (set via supabase secrets)
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') || '';
const FIREBASE_PROJECT_ID = Deno.env.get('FIREBASE_PROJECT_ID') || '';
const FIREBASE_CLIENT_EMAIL = Deno.env.get('FIREBASE_CLIENT_EMAIL') || '';
const FIREBASE_PRIVATE_KEY = (Deno.env.get('FIREBASE_PRIVATE_KEY') || '').replace(/\\n/g, '\n');
const SITE_URL = Deno.env.get('SITE_URL') || 'http://localhost:5173';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

interface ArticlePayload {
  id: string;
  title: string;
  excerpt: string;
  slug: string;
  featured_image: string | null;
}

// ═══════════════════════════════════════════
// Firebase Admin SDK - OAuth2 Token Generation
// ═══════════════════════════════════════════

/**
 * Generate a Google OAuth2 access token using service account credentials.
 * This replaces the legacy server key approach with the modern Admin SDK method.
 */
async function getFirebaseAccessToken(): Promise<string> {
  if (!FIREBASE_CLIENT_EMAIL || !FIREBASE_PRIVATE_KEY) {
    throw new Error('Firebase Admin credentials not configured.');
  }

  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = {
    iss: FIREBASE_CLIENT_EMAIL,
    sub: FIREBASE_CLIENT_EMAIL,
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
  };

  // Base64url encode
  const encode = (obj: unknown) => {
    const json = JSON.stringify(obj);
    const bytes = new TextEncoder().encode(json);
    return btoa(String.fromCharCode(...bytes)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  };

  const headerB64 = encode(header);
  const payloadB64 = encode(payload);
  const unsignedToken = `${headerB64}.${payloadB64}`;

  // Sign with private key using Web Crypto API
  const pemContents = FIREBASE_PRIVATE_KEY
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s/g, '');

  const binaryDer = Uint8Array.from(atob(pemContents), (c) => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    binaryDer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signatureBuffer = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    new TextEncoder().encode(unsignedToken)
  );

  const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signatureBuffer)))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  const jwt = `${unsignedToken}.${signatureB64}`;

  // Exchange JWT for access token
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });

  if (!tokenResponse.ok) {
    const errText = await tokenResponse.text();
    throw new Error(`Failed to get Firebase access token: ${errText}`);
  }

  const tokenData = await tokenResponse.json();
  return tokenData.access_token;
}

/**
 * Send push notification via FCM HTTP v1 API (Firebase Admin SDK approach)
 */
async function sendFCMNotification(
  accessToken: string,
  fcmToken: string,
  article: ArticlePayload,
  articleUrl: string
): Promise<{ success: boolean; error?: string }> {
  const response = await fetch(
    `https://fcm.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/messages:send`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: {
          token: fcmToken,
          notification: {
            title: article.title,
            body: article.excerpt,
            image: article.featured_image || undefined,
          },
          webpush: {
            fcm_options: {
              link: articleUrl,
            },
            notification: {
              icon: `${SITE_URL}/icon-192.png`,
              badge: `${SITE_URL}/icon-72.png`,
              vibrate: [200, 100, 200],
            },
          },
          data: {
            title: article.title,
            body: article.excerpt,
            image: article.featured_image || '',
            click_action: articleUrl,
            article_id: article.id,
          },
        },
      }),
    }
  );

  if (response.ok) {
    return { success: true };
  }

  const errData = await response.json().catch(() => ({}));
  const errorMsg = errData?.error?.message || response.statusText;

  // Check if token is invalid/expired
  if (
    errorMsg.includes('UNREGISTERED') ||
    errorMsg.includes('INVALID_ARGUMENT') ||
    errorMsg.includes('NOT_FOUND')
  ) {
    return { success: false, error: 'token_expired' };
  }

  return { success: false, error: errorMsg };
}

// ═══════════════════════════════════════════
// Main Handler
// ═══════════════════════════════════════════

Deno.serve(async (req) => {
  try {
    const body = await req.json();
    const record = body.record || body;
    const oldRecord = body.old_record;

    // Only proceed if status changed to published
    if (oldRecord && oldRecord.status === 'published') {
      return new Response(JSON.stringify({ message: 'Already published, skipping.' }), { status: 200 });
    }
    if (record.status !== 'published') {
      return new Response(JSON.stringify({ message: 'Not a publish event, skipping.' }), { status: 200 });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Fetch full article
    const { data: article } = await supabase
      .from('articles')
      .select('id, title, excerpt, slug, featured_image')
      .eq('id', record.id)
      .single();

    if (!article) {
      return new Response(JSON.stringify({ error: 'Article not found' }), { status: 404 });
    }

    const articleUrl = `${SITE_URL}/article/${article.slug}`;
    let emailsSent = 0;
    let pushSent = 0;
    const errors: string[] = [];

    // ═══ EMAIL NOTIFICATIONS (via Resend) ═══
    if (RESEND_API_KEY) {
      const { data: subscribers } = await supabase
        .from('subscriptions')
        .select('id, email, unsubscribe_token')
        .eq('status', 'active')
        .is('deleted_at', null);

      for (const sub of subscribers || []) {
        const unsubUrl = `${SITE_URL}/unsubscribe?id=${sub.unsubscribe_token}`;
        try {
          const emailRes = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${RESEND_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              from: 'Buxar News <notifications@buxarnews.com>',
              to: [sub.email],
              subject: `Breaking News: ${article.title}`,
              html: buildEmailHTML(article, articleUrl, unsubUrl),
            }),
          });

          if (emailRes.ok) {
            emailsSent++;
            await supabase.from('notification_logs').insert({
              article_id: article.id,
              subscriber_email: sub.email,
              channel: 'email',
              status: 'sent',
              sent_at: new Date().toISOString(),
            });
          } else {
            const errText = await emailRes.text();
            errors.push(`Email to ${sub.email}: ${errText}`);
            await supabase.from('notification_logs').insert({
              article_id: article.id,
              subscriber_email: sub.email,
              channel: 'email',
              status: 'failed',
              error_message: errText,
            });
          }
        } catch (err) {
          errors.push(`Email to ${sub.email}: ${(err as Error).message}`);
        }
      }

      // Update last_notified_at
      await supabase
        .from('subscriptions')
        .update({ last_notified_at: new Date().toISOString() })
        .eq('status', 'active')
        .is('deleted_at', null);
    }

    // ═══ PUSH NOTIFICATIONS (via Firebase Admin SDK - FCM HTTP v1) ═══
    if (FIREBASE_PROJECT_ID && FIREBASE_CLIENT_EMAIL && FIREBASE_PRIVATE_KEY) {
      let accessToken: string;
      try {
        accessToken = await getFirebaseAccessToken();
      } catch (err) {
        errors.push(`FCM Auth failed: ${(err as Error).message}`);
        return new Response(
          JSON.stringify({ success: true, emailsSent, pushSent, errors }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }

      const { data: pushSubs } = await supabase
        .from('push_subscribers')
        .select('id, fcm_token')
        .eq('status', 'active');

      for (const ps of pushSubs || []) {
        try {
          const result = await sendFCMNotification(accessToken, ps.fcm_token, article, articleUrl);

          if (result.success) {
            pushSent++;
            await supabase.from('notification_logs').insert({
              article_id: article.id,
              subscriber_email: ps.fcm_token.slice(0, 20) + '...',
              channel: 'push',
              status: 'sent',
              sent_at: new Date().toISOString(),
            });
          } else {
            // Mark expired tokens
            if (result.error === 'token_expired') {
              await supabase.from('push_subscribers').update({ status: 'expired' }).eq('id', ps.id);
            }
            await supabase.from('notification_logs').insert({
              article_id: article.id,
              subscriber_email: ps.fcm_token.slice(0, 20) + '...',
              channel: 'push',
              status: 'failed',
              error_message: result.error || 'Unknown FCM error',
            });
          }
        } catch (err) {
          errors.push(`Push to ${ps.fcm_token.slice(0, 10)}...: ${(err as Error).message}`);
        }
      }

      // Update last_notified_at for push subscribers
      await supabase
        .from('push_subscribers')
        .update({ last_notified_at: new Date().toISOString() })
        .eq('status', 'active');
    }

    return new Response(
      JSON.stringify({ success: true, emailsSent, pushSent, errors: errors.length ? errors : undefined }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});

// ═══════════════════════════════════════════
// Email Template
// ═══════════════════════════════════════════

function buildEmailHTML(article: ArticlePayload, articleUrl: string, unsubUrl: string): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f8f9fa;">
  <div style="max-width:600px;margin:0 auto;background:#ffffff;">
    <div style="background:#0f172a;padding:20px 30px;text-align:center;">
      <h1 style="margin:0;font-size:24px;color:#ffffff;">Buxar<span style="color:#ef4444;"> News</span></h1>
      <p style="margin:4px 0 0;font-size:11px;color:#9ca3af;letter-spacing:1px;">BREAKING NEWS ALERT</p>
    </div>
    ${article.featured_image ? `<img src="${article.featured_image}" alt="${article.title}" style="width:100%;height:auto;display:block;">` : ''}
    <div style="padding:30px;">
      <h2 style="margin:0 0 12px;font-size:20px;color:#111827;line-height:1.3;">${article.title}</h2>
      <p style="margin:0 0 20px;font-size:14px;color:#6b7280;line-height:1.6;">${article.excerpt}</p>
      <a href="${articleUrl}" style="display:inline-block;background:#dc2626;color:#ffffff;padding:12px 28px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600;">
        Read Full Article →
      </a>
    </div>
    <div style="background:#f1f5f9;padding:20px 30px;text-align:center;border-top:1px solid #e2e8f0;">
      <p style="margin:0 0 8px;font-size:12px;color:#6b7280;">You're receiving this because you subscribed to Buxar News.</p>
      <a href="${unsubUrl}" style="font-size:12px;color:#dc2626;text-decoration:underline;">Unsubscribe</a>
    </div>
  </div>
</body>
</html>`;
}
