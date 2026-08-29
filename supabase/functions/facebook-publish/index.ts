/**
 * Facebook Article Publishing
 * 
 * Publishes news articles to connected Facebook Page.
 * - Validates tenant connection
 * - Prevents duplicate publishing
 * - Decrypts Page access token server-side
 * - Creates Facebook Page post with article details
 * - Tracks publishing history
 * 
 * Security:
 * - Validates authentication and tenant ownership
 * - Never exposes OAuth tokens to frontend
 * - Enforces tenant isolation
 * - Checks duplicate before publishing
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const FB_ENCRYPTION_KEY = Deno.env.get('FB_ENCRYPTION_KEY') || '';
const FRONTEND_URL = Deno.env.get('SITE_URL') || 'http://localhost:5173';

interface ErrorResponse {
  error: string;
  details?: string;
}

interface PublishRequest {
  article_id: string;
  include_image?: boolean;
}

interface Article {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  featured_image_url: string | null;
  tenant_id: string;
}

interface FacebookConnection {
  id: string;
  tenant_id: string;
  facebook_page_id: string;
  facebook_page_name: string;
  access_token_encrypted: string;
  status: string;
}

interface FacebookPostResponse {
  id: string; // Format: {page-id}_{post-id}
}

/**
 * AES-256-GCM decryption
 */
async function decryptToken(encryptedToken: string): Promise<string> {
  const combined = Uint8Array.from(atob(encryptedToken), c => c.charCodeAt(0));
  
  // Extract IV (first 12 bytes) and encrypted data
  const iv = combined.slice(0, 12);
  const encrypted = combined.slice(12);
  
  // Import decryption key
  const keyData = Uint8Array.from(atob(FB_ENCRYPTION_KEY), c => c.charCodeAt(0));
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'AES-GCM' },
    false,
    ['decrypt']
  );
  
  // Decrypt
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    cryptoKey,
    encrypted
  );
  
  const decoder = new TextDecoder();
  return decoder.decode(decrypted);
}

/**
 * Get authenticated user's tenant ID
 */
async function getUserTenantId(authHeader: string): Promise<string> {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  
  const token = authHeader.replace('Bearer ', '');
  
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  
  if (authError || !user) {
    throw new Error('Not authenticated');
  }
  
  const { data: membership, error: membershipError } = await supabase
    .from('tenant_memberships')
    .select('tenant_id')
    .eq('auth_user_id', user.id)
    .limit(1)
    .single();
  
  if (membershipError || !membership) {
    throw new Error('No tenant membership found');
  }
  
  return membership.tenant_id;
}

/**
 * Get article details
 */
async function getArticle(articleId: string, tenantId: string): Promise<Article> {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  
  console.log('[Facebook Publish] Fetching article:', articleId);
  
  const { data, error } = await supabase
    .from('articles')
    .select('id, title, slug, excerpt, featured_image_url, tenant_id')
    .eq('id', articleId)
    .eq('tenant_id', tenantId)
    .single();
  
  if (error || !data) {
    console.error('[Facebook Publish] Article not found:', error);
    throw new Error('Article not found');
  }
  
  console.log('[Facebook Publish] Article found:', data.title);
  
  return data as Article;
}

/**
 * Get Facebook connection
 */
async function getConnection(tenantId: string): Promise<FacebookConnection> {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  
  console.log('[Facebook Publish] Fetching connection for tenant:', tenantId);
  
  const { data, error } = await supabase
    .from('facebook_connections')
    .select('id, tenant_id, facebook_page_id, facebook_page_name, access_token_encrypted, status')
    .eq('tenant_id', tenantId)
    .eq('status', 'active')
    .is('deleted_at', null)
    .single();
  
  if (error || !data) {
    console.error('[Facebook Publish] Connection not found:', error);
    throw new Error('Facebook not connected. Please connect your Facebook Page first.');
  }
  
  console.log('[Facebook Publish] Connection found:', data.facebook_page_name);
  
  return data as FacebookConnection;
}

/**
 * Check if article already published
 */
async function checkDuplicate(tenantId: string, articleId: string, pageId: string): Promise<boolean> {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  
  const { data, error } = await supabase
    .from('facebook_publish_history')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('article_id', articleId)
    .eq('facebook_page_id', pageId)
    .eq('status', 'published')
    .maybeSingle();
  
  return !!data;
}

/**
 * Build article URL
 */
function buildArticleUrl(article: Article): string {
  // Construct full article URL
  return `${FRONTEND_URL}/article/${article.slug}`;
}

/**
 * Publish to Facebook
 */
async function publishToFacebook(
  connection: FacebookConnection,
  article: Article,
  includeImage: boolean
): Promise<FacebookPostResponse> {
  // Decrypt Page access token
  console.log('[Facebook Publish] Decrypting access token...');
  const accessToken = await decryptToken(connection.access_token_encrypted);
  
  // Build article URL
  const articleUrl = buildArticleUrl(article);
  
  // Create post message
  const postMessage = `${article.title}\n\n${article.excerpt}\n\n${articleUrl}`;
  
  // Build Facebook Graph API request
  const postUrl = `https://graph.facebook.com/v18.0/${connection.facebook_page_id}/feed`;
  
  const postData: any = {
    message: postMessage,
    link: articleUrl,
    access_token: accessToken,
  };
  
  // Add featured image if available and requested
  if (includeImage && article.featured_image_url) {
    // For link posts with image, we use the 'link' parameter
    // Facebook will scrape the image from the article page
    console.log('[Facebook Publish] Including featured image from article URL');
  }
  
  console.log('[Facebook Publish] Publishing post to Facebook...');
  console.log('[Facebook Publish] Page ID:', connection.facebook_page_id);
  console.log('[Facebook Publish] Article URL:', articleUrl);
  
  const response = await fetch(postUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(postData),
  });
  
  console.log('[Facebook Publish] Facebook API - HTTP Status:', response.status);
  
  if (!response.ok) {
    const errorBody = await response.text();
    console.error('[Facebook Publish] Facebook API error:', errorBody);
    
    // Parse error message
    let errorMessage = 'Failed to publish to Facebook';
    try {
      const errorData = JSON.parse(errorBody);
      if (errorData.error?.message) {
        errorMessage = errorData.error.message;
      }
    } catch (e) {
      // Keep generic error
    }
    
    throw new Error(errorMessage);
  }
  
  const postResponse: FacebookPostResponse = await response.json();
  console.log('[Facebook Publish] Post published successfully, ID:', postResponse.id);
  
  return postResponse;
}

/**
 * Record publishing history
 */
async function recordHistory(
  tenantId: string,
  articleId: string,
  connectionId: string,
  pageId: string,
  postId: string | null,
  postUrl: string | null,
  status: 'published' | 'failed',
  errorMessage: string | null,
  article: Article
) {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  
  const payload = {
    tenant_id: tenantId,
    article_id: articleId,
    facebook_connection_id: connectionId,
    facebook_page_id: pageId,
    facebook_post_id: postId,
    post_url: postUrl,
    status: status,
    error_message: errorMessage,
    post_title: article.title,
    post_excerpt: article.excerpt,
    post_image_url: article.featured_image_url,
    article_url: buildArticleUrl(article),
    published_at: status === 'published' ? new Date().toISOString() : null,
  };
  
  const { error } = await supabase
    .from('facebook_publish_history')
    .upsert(payload, {
      onConflict: 'tenant_id,article_id,facebook_page_id',
    });
  
  if (error) {
    console.error('[Facebook Publish] Failed to record history:', error);
    // Don't throw - history recording failure shouldn't block publishing
  }
}

/**
 * Main handler
 */
serve(async (req: Request) => {
  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': FRONTEND_URL,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
  
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }
  
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' } as ErrorResponse),
      {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
  
  try {
    // Validate authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Not authenticated' } as ErrorResponse),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
    
    // Parse request body
    const publishReq: PublishRequest = await req.json();
    
    if (!publishReq.article_id) {
      return new Response(
        JSON.stringify({ error: 'Article ID required' } as ErrorResponse),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
    
    // Get tenant ID
    const tenantId = await getUserTenantId(authHeader);
    
    // Get article
    const article = await getArticle(publishReq.article_id, tenantId);
    
    // Get Facebook connection
    const connection = await getConnection(tenantId);
    
    // Check duplicate
    const isDuplicate = await checkDuplicate(tenantId, article.id, connection.facebook_page_id);
    
    if (isDuplicate) {
      console.log('[Facebook Publish] Article already published');
      return new Response(
        JSON.stringify({
          error: 'Already published',
          details: 'This article has already been published to Facebook.',
        } as ErrorResponse),
        {
          status: 409,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
    
    // Publish to Facebook
    const postResponse = await publishToFacebook(
      connection,
      article,
      publishReq.include_image !== false // Default true
    );
    
    // Build post URL
    const postUrl = `https://www.facebook.com/${postResponse.id.replace('_', '/posts/')}`;
    
    // Record success in history
    await recordHistory(
      tenantId,
      article.id,
      connection.id,
      connection.facebook_page_id,
      postResponse.id,
      postUrl,
      'published',
      null,
      article
    );
    
    console.log('[Facebook Publish] Publishing complete');
    
    // Return success
    return new Response(
      JSON.stringify({
        success: true,
        post_id: postResponse.id,
        post_url: postUrl,
        page_name: connection.facebook_page_name,
        published_at: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
    
  } catch (err) {
    console.error('[Facebook Publish] Error:', err);
    
    const errorMessage = err instanceof Error ? err.message : 'Failed to publish to Facebook';
    
    // Try to record failure in history (if we have enough context)
    // This is best-effort, don't fail if it doesn't work
    
    return new Response(
      JSON.stringify({
        error: 'Publishing failed',
        details: errorMessage,
      } as ErrorResponse),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
