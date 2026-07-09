import { getSupabaseClient } from '../../lib/supabase';

/**
 * Push Notification System using Firebase Cloud Messaging (FCM)
 *
 * SETUP REQUIRED:
 * 1. Create Firebase project at https://console.firebase.google.com
 * 2. Enable Cloud Messaging
 * 3. Get your config from Project Settings > General > Your Apps > Web app
 * 4. Replace values in .env:
 *    VITE_FIREBASE_API_KEY=
 *    VITE_FIREBASE_AUTH_DOMAIN=
 *    VITE_FIREBASE_PROJECT_ID=
 *    VITE_FIREBASE_STORAGE_BUCKET=
 *    VITE_FIREBASE_MESSAGING_SENDER_ID=
 *    VITE_FIREBASE_APP_ID=
 *    VITE_FIREBASE_VAPID_KEY=
 * 5. Update public/firebase-messaging-sw.js with same config
 */

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY || '';

let firebaseApp: unknown = null;
let messagingInstance: unknown = null;

async function getFirebaseMessaging() {
  if (messagingInstance) return messagingInstance;

  const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
  if (!apiKey) {
    console.warn('[Push] Firebase not configured. Set VITE_FIREBASE_* env vars.');
    return null;
  }

  try {
    const { initializeApp } = await import('firebase/app');
    const { getMessaging, getToken, onMessage } = await import('firebase/messaging');

    if (!firebaseApp) {
      firebaseApp = initializeApp({
        apiKey,
        authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
        projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
        storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
        messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
        appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
      });
    }

    messagingInstance = getMessaging(firebaseApp as ReturnType<typeof initializeApp>);
    return messagingInstance;
  } catch (err) {
    console.warn('[Push] Failed to initialize Firebase:', err);
    return null;
  }
}

/**
 * Check if push notifications are supported in this browser
 */
export function isPushSupported(): boolean {
  return 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;
}

/**
 * Get current permission status
 */
export function getPermissionStatus(): NotificationPermission | 'unsupported' {
  if (!isPushSupported()) return 'unsupported';
  return Notification.permission;
}

/**
 * Request notification permission and register FCM token
 */
export async function requestPushPermission(): Promise<{ success: boolean; token?: string; error?: string }> {
  if (!isPushSupported()) {
    return { success: false, error: 'Push notifications not supported in this browser.' };
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return { success: false, error: 'Permission denied by user.' };
    }

    // Register service worker
    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
    await navigator.serviceWorker.ready;

    // Get FCM token
    const messaging = await getFirebaseMessaging();
    if (!messaging) {
      return { success: false, error: 'Firebase not configured.' };
    }

    const { getToken } = await import('firebase/messaging');
    const token = await getToken(messaging as ReturnType<typeof import('firebase/messaging').getMessaging>, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration,
    });

    if (!token) {
      return { success: false, error: 'Failed to get FCM token.' };
    }

    // Save token to Supabase
    await savePushToken(token);

    return { success: true, token };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[Push] Registration failed:', message);
    return { success: false, error: message };
  }
}

/**
 * Save FCM token to Supabase push_subscribers table
 */
async function savePushToken(token: string): Promise<void> {
  const client = getSupabaseClient();
  if (!client) return;

  const browser = navigator.userAgent.includes('Chrome')
    ? 'Chrome'
    : navigator.userAgent.includes('Firefox')
      ? 'Firefox'
      : navigator.userAgent.includes('Edge')
        ? 'Edge'
        : 'Other';

  // Use insert with conflict ignore — avoids needing UPDATE RLS policy
  const { error } = await client.from('push_subscribers').insert(
    {
      fcm_token: token,
      device_type: 'web',
      browser,
      status: 'active',
    }
  );

  // Ignore duplicate key error (token already exists)
  if (error && !error.message.includes('duplicate') && !error.code?.includes('23505')) {
    console.error('[Push] Failed to save token:', error.message);
  }
}

/**
 * Listen for foreground messages
 */
export async function onForegroundMessage(
  callback: (payload: { title: string; body: string; image?: string; url?: string }) => void
): Promise<(() => void) | null> {
  const messaging = await getFirebaseMessaging();
  if (!messaging) return null;

  const { onMessage } = await import('firebase/messaging');
  const unsubscribe = onMessage(messaging as ReturnType<typeof import('firebase/messaging').getMessaging>, (payload) => {
    const data = payload.data || {};
    const notification = payload.notification || {};
    callback({
      title: notification.title || data.title || 'Buxar News',
      body: notification.body || data.body || '',
      image: notification.image || data.image,
      url: data.click_action || '/',
    });
  });

  return unsubscribe;
}

/**
 * Unregister push notifications
 */
export async function unregisterPush(): Promise<void> {
  try {
    const messaging = await getFirebaseMessaging();
    if (!messaging) return;

    const { deleteToken } = await import('firebase/messaging');
    await deleteToken(messaging as ReturnType<typeof import('firebase/messaging').getMessaging>);
  } catch (err) {
    console.warn('[Push] Unregister failed:', err);
  }
}
