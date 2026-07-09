import { useState, useEffect } from 'react';
import { Bell, X } from 'lucide-react';
import { isPushSupported, getPermissionStatus, requestPushPermission } from '../lib/pushNotifications';

/**
 * Push notification permission popup.
 * Shows a non-intrusive banner asking users to enable notifications.
 * Appears after 5 seconds on first visit if permission is 'default'.
 */
export function PushNotificationPrompt() {
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Don't show if not supported or already decided
    if (!isPushSupported()) return;
    const permission = getPermissionStatus();
    if (permission !== 'default') return;

    // Check if user dismissed before
    const dismissed = sessionStorage.getItem('push_prompt_dismissed');
    if (dismissed) return;

    // Show after 5 seconds
    const timer = setTimeout(() => setVisible(true), 5000);
    return () => clearTimeout(timer);
  }, []);

  const handleAllow = async () => {
    setLoading(true);
    const result = await requestPushPermission();
    setLoading(false);
    if (result.success) {
      setVisible(false);
    }
  };

  const handleDismiss = () => {
    setVisible(false);
    sessionStorage.setItem('push_prompt_dismissed', '1');
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 sm:left-auto sm:right-4 sm:w-[360px] z-[60] animate-slide-in-left">
      <div className="bg-white rounded-xl border border-gray-200 shadow-2xl p-4 relative">
        <button
          type="button"
          onClick={handleDismiss}
          className="absolute top-2 right-2 p-1 rounded-full hover:bg-gray-100 text-gray-400"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
            <Bell className="h-5 w-5 text-red-600" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold text-gray-900 mb-0.5">Stay Updated!</h3>
            <p className="text-xs text-gray-500 mb-3">
              Get breaking news notifications directly on your device. Never miss an important story.
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleAllow}
                disabled={loading}
                className="px-4 py-1.5 rounded-lg bg-red-600 text-white text-xs font-bold hover:bg-red-700 transition-colors disabled:opacity-60"
              >
                {loading ? 'Enabling...' : 'Allow Notifications'}
              </button>
              <button
                type="button"
                onClick={handleDismiss}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-gray-500 hover:bg-gray-100 transition-colors"
              >
                Not now
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
