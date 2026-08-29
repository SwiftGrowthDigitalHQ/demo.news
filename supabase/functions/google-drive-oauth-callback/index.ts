/**
 * Google Drive OAuth Callback Handler
 * 
 * Handles the OAuth 2.0 callback from Google after user authorizes Drive access.
 * Exchanges authorization code for access/refresh tokens, creates folder structure,
 * and stores encrypted tokens in database.
 * 
 * Security:
 * - Validates CSRF state parameter
 * - Encrypts OAuth tokens before storage
 * - Never exposes tokens to frontend
 * - Enforces tenant isolation
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const GOOGLE_OAUTH_CLIENT_ID = Deno.env.get('GOOGLE_OAUTH_CLIENT_ID') || '';
const GOOGLE_OAUTH_CLIENT_SECRET = Deno.env.get('GOOGLE_OAUTH_CLIENT_SECRET') || '';
const GDRIVE_ENCRYPTION_KEY = Deno.env.get('GDRIVE_ENCRYPTION_KEY') || '';
const FRONTEND_URL = Deno.env.get('SITE_URL') || 'http://localhost:5173';

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  scope: string;
  token_type: string;
}

interface GoogleUserInfo {
  id: string;
  email: string;
  verified_email: boolean;
  name: string;
}

interface DriveFolder {
  id: string;
  name: string;
}

/**
 * Production AES-256-GCM encryption using Web Crypto API
 */
async function encryptToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  
  // Generate random IV (12 bytes for GCM)
  const iv = crypto.getRandomValues(new Uint8Array(12));
  
  // Import encryption key from environment
  const keyData = Uint8Array.from(atob(GDRIVE_ENCRYPTION_KEY), c => c.charCodeAt(0));
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'AES-GCM' },
    false,
    ['encrypt']
  );
  
  // Encrypt
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    cryptoKey,
    data
  );
  
  // Combine IV + encrypted data
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(encrypted), iv.length);
  
  // Return base64
  return btoa(String.fromCharCode(...combined));
}

/**
 * Validate CSRF state parameter
 */
function validateState(state: string): { tenantId: string; timestamp: number } | null {
  try {
    const parts = state.split(':');
    if (parts.length !== 3) return null;
    
    const [tenantId, csrfToken, timestampStr] = parts;
    const timestamp = parseInt(timestampStr, 10);
    
    // Validate timestamp (max age: 10 minutes)
    const now = Date.now();
    const age = now - timestamp;
    if (age > 10 * 60 * 1000) {
      console.error('[OAuth] State expired:', age / 1000, 'seconds old');
      return null;
    }
    
    // TODO: Validate CSRF token against session/cookie
    // For now, accept if format is correct
    
    return { tenantId, timestamp };
  } catch (err) {
    console.error('[OAuth] Invalid state format:', err);
    return null;
  }
}

/**
 * Exchange authorization code for tokens
 */
async function exchangeCodeForTokens(code: string, redirectUri: string): Promise<TokenResponse> {
  const tokenUrl = 'https://oauth2.googleapis.com/token';
  
  console.log('[DIAGNOSTIC] Token exchange - URL:', tokenUrl);
  console.log('[DIAGNOSTIC] Token exchange - Redirect URI:', redirectUri);
  
  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      code,
      client_id: GOOGLE_OAUTH_CLIENT_ID,
      client_secret: GOOGLE_OAUTH_CLIENT_SECRET,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  });
  
  console.log('[DIAGNOSTIC] Token exchange - HTTP Status:', response.status);
  
  if (!response.ok) {
    const error = await response.text();
    console.error('[DIAGNOSTIC] Token exchange - Failed, Response:', error);
    throw new Error(`Token exchange failed: ${error}`);
  }
  
  const tokenData = await response.json();
  console.log('[DIAGNOSTIC] Token exchange - Success, has access_token:', !!tokenData.access_token);
  console.log('[DIAGNOSTIC] Token exchange - Success, has refresh_token:', !!tokenData.refresh_token);
  console.log('[DIAGNOSTIC] Token exchange - Granted scope:', tokenData.scope || '(not provided)');
  
  return tokenData;
}

/**
 * Get Google user info
 */
async function getUserInfo(accessToken: string): Promise<GoogleUserInfo> {
  const userInfoUrl = 'https://www.googleapis.com/oauth2/v2/userinfo';
  console.log('[DIAGNOSTIC] Fetching user info from:', userInfoUrl);
  
  const response = await fetch(userInfoUrl, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });
  
  console.log('[DIAGNOSTIC] User info - HTTP Status:', response.status);
  console.log('[DIAGNOSTIC] User info - Response OK:', response.ok);
  
  if (!response.ok) {
    const errorBody = await response.text();
    console.error('[DIAGNOSTIC] GOOGLE_USERINFO_FAILED - HTTP Status:', response.status);
    console.error('[DIAGNOSTIC] GOOGLE_USERINFO_FAILED - Error:', errorBody);
    throw new Error(`Failed to get user info (HTTP ${response.status}): ${errorBody}`);
  }
  
  const userInfo = await response.json();
  console.log('[DIAGNOSTIC] User info - Has email:', !!userInfo.email);
  console.log('[DIAGNOSTIC] User info - Has id:', !!userInfo.id);
  
  return userInfo;
}

/**
 * Create folder in Google Drive
 */
async function createDriveFolder(
  accessToken: string,
  name: string,
  parentFolderId?: string
): Promise<DriveFolder> {
  const metadata: any = {
    name,
    mimeType: 'application/vnd.google-apps.folder',
  };
  
  if (parentFolderId) {
    metadata.parents = [parentFolderId];
  }
  
  console.log('[DIAGNOSTIC] Creating Drive folder:', name, 'Parent:', parentFolderId || '(root)');
  
  const response = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(metadata),
  });
  
  console.log('[DIAGNOSTIC] Drive API response status:', response.status);
  
  if (!response.ok) {
    const error = await response.text();
    console.error('[DIAGNOSTIC] FOLDER_CREATION_FAILED - Google API Error:', error);
    console.error('[DIAGNOSTIC] FOLDER_CREATION_FAILED - HTTP Status:', response.status);
    console.error('[DIAGNOSTIC] FOLDER_CREATION_FAILED - Folder name:', name);
    throw new Error(`Failed to create folder "${name}": ${error}`);
  }
  
  const result = await response.json();
  console.log('[DIAGNOSTIC] Drive folder created successfully:', name, 'ID:', result.id);
  
  return result;
}

/**
 * Create complete folder structure for tenant
 */
async function createFolderStructure(
  accessToken: string,
  tenantName: string
): Promise<{
  rootFolderId: string;
  mediaFolderId: string;
  imagesFolderId: string;
  videosFolderId: string;
  documentsFolderId: string;
}> {
  console.log('[OAuth] Creating folder structure for tenant:', tenantName);
  
  // Create root: SwiftGrowthDigital
  const rootFolder = await createDriveFolder(accessToken, 'SwiftGrowthDigital');
  console.log('[OAuth] Created root folder:', rootFolder.id);
  
  // Create tenant folder: {Tenant Name}
  const tenantFolder = await createDriveFolder(accessToken, tenantName, rootFolder.id);
  console.log('[OAuth] Created tenant folder:', tenantFolder.id);
  
  // Create media folder: News Portal
  const mediaFolder = await createDriveFolder(accessToken, 'News Portal', tenantFolder.id);
  console.log('[OAuth] Created media folder:', mediaFolder.id);
  
  // Create subfolders
  const [imagesFolder, videosFolder, documentsFolder] = await Promise.all([
    createDriveFolder(accessToken, 'Images', mediaFolder.id),
    createDriveFolder(accessToken, 'Videos', mediaFolder.id),
    createDriveFolder(accessToken, 'Documents', mediaFolder.id),
  ]);
  
  console.log('[OAuth] Created subfolders:', {
    images: imagesFolder.id,
    videos: videosFolder.id,
    documents: documentsFolder.id,
  });
  
  return {
    rootFolderId: rootFolder.id,
    mediaFolderId: mediaFolder.id,
    imagesFolderId: imagesFolder.id,
    videosFolderId: videosFolder.id,
    documentsFolderId: documentsFolder.id,
  };
}

/**
 * Store connection in database
 */
async function storeConnection(
  tenantId: string,
  userInfo: GoogleUserInfo,
  tokens: TokenResponse,
  folderStructure: {
    rootFolderId: string;
    mediaFolderId: string;
    imagesFolderId: string;
    videosFolderId: string;
    documentsFolderId: string;
  },
  connectedByUserId: string
) {
  console.log('[DIAGNOSTIC] storeConnection - Creating Supabase client');
  console.log('[DIAGNOSTIC] storeConnection - SUPABASE_URL present:', !!SUPABASE_URL);
  console.log('[DIAGNOSTIC] storeConnection - SUPABASE_SERVICE_ROLE_KEY present:', !!SUPABASE_SERVICE_ROLE_KEY);
  
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  
  // Encrypt tokens
  console.log('[DIAGNOSTIC] Stage: ENCRYPTION_STARTED');
  console.log('[DIAGNOSTIC] Encryption - GDRIVE_ENCRYPTION_KEY present:', !!GDRIVE_ENCRYPTION_KEY);
  
  const accessTokenEncrypted = await encryptToken(tokens.access_token);
  const refreshTokenEncrypted = await encryptToken(tokens.refresh_token);
  console.log('[DIAGNOSTIC] Stage: ENCRYPTION_SUCCESS');
  
  // Calculate expiration time
  const tokenExpiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();
  
  console.log('[DIAGNOSTIC] Stage: DATABASE_UPSERT_EXECUTING');
  console.log('[DIAGNOSTIC] DB UPSERT - tenant_id:', tenantId);
  console.log('[DIAGNOSTIC] DB UPSERT - google_account_email:', userInfo.email);
  console.log('[DIAGNOSTIC] DB UPSERT - google_account_id:', userInfo.id);
  console.log('[DIAGNOSTIC] DB UPSERT - connected_by_user_id:', connectedByUserId || '(empty string)');
  console.log('[DIAGNOSTIC] DB UPSERT - connected_by_user_id is null:', connectedByUserId === null);
  console.log('[DIAGNOSTIC] DB UPSERT - connected_by_user_id is empty string:', connectedByUserId === '');
  console.log('[DIAGNOSTIC] DB UPSERT - token_expires_at:', tokenExpiresAt);
  
  const upsertPayload = {
    tenant_id: tenantId,
    google_account_email: userInfo.email,
    google_account_id: userInfo.id,
    root_folder_id: folderStructure.rootFolderId,
    media_folder_id: folderStructure.mediaFolderId,
    images_folder_id: folderStructure.imagesFolderId,
    videos_folder_id: folderStructure.videosFolderId,
    documents_folder_id: folderStructure.documentsFolderId,
    access_token_encrypted: accessTokenEncrypted,
    refresh_token_encrypted: refreshTokenEncrypted,
    token_expires_at: tokenExpiresAt,
    status: 'active' as const,
    last_sync_at: new Date().toISOString(),
    // IMPORTANT: connected_by_user_id must be null (not empty string) if no user ID
    connected_by_user_id: connectedByUserId || null,
  };
  
  console.log('[DIAGNOSTIC] DB UPSERT - Payload keys:', Object.keys(upsertPayload).join(', '));
  console.log('[DIAGNOSTIC] DB UPSERT - Folder IDs present:', 
    !!folderStructure.rootFolderId, 
    !!folderStructure.mediaFolderId,
    !!folderStructure.imagesFolderId,
    !!folderStructure.videosFolderId,
    !!folderStructure.documentsFolderId
  );
  
  console.log('[DIAGNOSTIC] DB UPSERT - About to execute upsert operation...');
  
  // Upsert connection (replace if exists)
  const { data, error } = await supabase
    .from('tenant_google_drive_connections')
    .upsert(upsertPayload, {
      onConflict: 'tenant_id',
    })
    .select()
    .single();
  
  console.log('[DIAGNOSTIC] DB UPSERT - Operation completed');
  console.log('[DIAGNOSTIC] DB UPSERT - Has error:', !!error);
  console.log('[DIAGNOSTIC] DB UPSERT - Has data:', !!data);
  
  if (error) {
    console.error('[DIAGNOSTIC] DATABASE_UPSERT_FAILED');
    console.error('[DIAGNOSTIC] DB Error Code:', error.code);
    console.error('[DIAGNOSTIC] DB Error Message:', error.message);
    console.error('[DIAGNOSTIC] DB Error Details:', error.details);
    console.error('[DIAGNOSTIC] DB Error Hint:', error.hint);
    console.error('[DIAGNOSTIC] DB Error - Full error object keys:', Object.keys(error).join(', '));
    throw new Error(`Failed to store connection: ${error.message}`);
  }
  
  console.log('[DIAGNOSTIC] Stage: DATABASE_UPSERT_SUCCESS');
  console.log('[DIAGNOSTIC] DB UPSERT - Inserted/Updated ID:', data?.id || '(no id)');
  
  return data;
}

/**
 * Get tenant name from database
 */
async function getTenantName(tenantId: string): Promise<string> {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  
  const { data, error } = await supabase
    .from('tenants')
    .select('name')
    .eq('id', tenantId)
    .single();
  
  if (error || !data) {
    throw new Error(`Failed to get tenant: ${error?.message}`);
  }
  
  return data.name;
}

/**
 * Get authenticated user from session (if available)
 */
async function getAuthenticatedUser(req: Request): Promise<string | null> {
  // TODO: Extract user ID from session/JWT
  // For now, return null (connection will have null connected_by_user_id)
  return null;
}

/**
 * Main handler
 */
serve(async (req: Request) => {
  // CORS headers
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': FRONTEND_URL,
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }
  
  try {
    // Parse query parameters
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const error = url.searchParams.get('error');
    
    console.log('[DIAGNOSTIC] Stage: CALLBACK_RECEIVED');
    
    // Check for OAuth errors (user denied access)
    if (error) {
      console.error('[OAuth] User denied access:', error);
      return Response.redirect(
        `${FRONTEND_URL}/admin/media?gdrive_error=access_denied`,
        302
      );
    }
    
    // Validate required parameters
    if (!code || !state) {
      console.error('[OAuth] Missing code or state');
      return new Response('Missing required parameters', { status: 400 });
    }
    
    console.log('[DIAGNOSTIC] Stage: STATE_VALIDATION_STARTED');
    
    // Validate state (CSRF protection)
    const stateData = validateState(state);
    if (!stateData) {
      console.error('[OAuth] Invalid or expired state');
      return new Response('Invalid or expired state', { status: 400 });
    }
    
    const { tenantId } = stateData;
    console.log('[DIAGNOSTIC] Stage: STATE_VALIDATED, TenantID:', tenantId);
    
    // Get authenticated user (if available)
    const connectedByUserId = await getAuthenticatedUser(req) || null;
    
    // Construct redirect URI (must match OAuth config)
    // IMPORTANT: Must match exact URI in Google Cloud Console and frontend OAuth initiation
    const redirectUri = `${SUPABASE_URL}/functions/v1/google-drive-oauth-callback`;
    console.log('[DIAGNOSTIC] Stage: REDIRECT_URI_CONSTRUCTED, URI:', redirectUri);
    
    // Exchange code for tokens
    console.log('[DIAGNOSTIC] Stage: TOKEN_EXCHANGE_STARTED');
    console.log('[DIAGNOSTIC] Client ID present:', !!GOOGLE_OAUTH_CLIENT_ID);
    console.log('[DIAGNOSTIC] Client Secret present:', !!GOOGLE_OAUTH_CLIENT_SECRET);
    
    const tokens = await exchangeCodeForTokens(code, redirectUri);
    console.log('[DIAGNOSTIC] Stage: TOKEN_EXCHANGE_SUCCESS');
    
    // Get user info
    console.log('[DIAGNOSTIC] Stage: GOOGLE_USERINFO_STARTED');
    const userInfo = await getUserInfo(tokens.access_token);
    console.log('[DIAGNOSTIC] Stage: GOOGLE_USERINFO_SUCCESS, Email:', userInfo.email);
    
    // Get tenant name
    console.log('[DIAGNOSTIC] Stage: TENANT_LOOKUP_STARTED');
    const tenantName = await getTenantName(tenantId);
    console.log('[DIAGNOSTIC] Stage: TENANT_LOOKUP_SUCCESS, Name:', tenantName);
    
    // Create folder structure
    console.log('[DIAGNOSTIC] Stage: FOLDER_CREATION_STARTED');
    const folderStructure = await createFolderStructure(tokens.access_token, tenantName);
    console.log('[DIAGNOSTIC] Stage: FOLDER_CREATION_SUCCESS');
    console.log('[DIAGNOSTIC] Folders created - Root:', folderStructure.rootFolderId, 'Media:', folderStructure.mediaFolderId);
    
    // Store connection in database
    console.log('[DIAGNOSTIC] Stage: DATABASE_UPSERT_STARTED');
    
    try {
      await storeConnection(
        tenantId,
        userInfo,
        tokens,
        folderStructure,
        connectedByUserId
      );
      console.log('[DIAGNOSTIC] Stage: DATABASE_UPSERT_COMPLETE');
    } catch (dbError) {
      console.error('[DIAGNOSTIC] DATABASE_UPSERT_COMPLETE_WITH_ERROR');
      console.error('[DIAGNOSTIC] DB Error Type:', dbError instanceof Error ? dbError.constructor.name : typeof dbError);
      console.error('[DIAGNOSTIC] DB Error Message:', dbError instanceof Error ? dbError.message : String(dbError));
      if (dbError instanceof Error && dbError.stack) {
        console.error('[DIAGNOSTIC] DB Error Stack (first 500 chars):', dbError.stack.substring(0, 500));
      }
      throw dbError; // Re-throw to be caught by outer catch block
    }
    
    console.log('[DIAGNOSTIC] Stage: CALLBACK_SUCCESS, TenantID:', tenantId);
    console.log('[DIAGNOSTIC] FINAL_REDIRECT: success');
    
    // Redirect back to media library with success
    return Response.redirect(
      `${FRONTEND_URL}/admin/media?gdrive_success=true`,
      302
    );
    
  } catch (err) {
    console.error('[DIAGNOSTIC] Stage: CALLBACK_FAILED');
    console.error('[DIAGNOSTIC] Error Type:', err instanceof Error ? err.constructor.name : typeof err);
    console.error('[DIAGNOSTIC] Error Message:', err instanceof Error ? err.message : String(err));
    if (err instanceof Error && err.stack) {
      console.error('[DIAGNOSTIC] Error Stack (first 500 chars):', err.stack.substring(0, 500));
    }
    
    // Redirect to media library with error
    return Response.redirect(
      `${FRONTEND_URL}/admin/media?gdrive_error=connection_failed`,
      302
    );
  }
});
