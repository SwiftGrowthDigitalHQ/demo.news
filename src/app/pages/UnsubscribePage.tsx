import { useEffect, useState } from 'react';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { useAppNavigation } from '../lib/navigation';
import { unsubscribeByToken } from '../lib/notificationAdmin';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';

export function UnsubscribePage() {
  const { search } = useAppNavigation();
  const [status, setStatus] = useState<'loading' | 'success' | 'not_found' | 'error'>('loading');

  useEffect(() => {
    document.title = 'Unsubscribe | Buxar News';

    const params = new URLSearchParams(search);
    const token = params.get('id') || params.get('token');

    if (!token) {
      setStatus('not_found');
      return;
    }

    void unsubscribeByToken(token)
      .then(result => setStatus(result === 'success' ? 'success' : 'not_found'))
      .catch(() => setStatus('error'));
  }, [search]);

  return (
    <div className="min-h-screen bg-[#f8f9fa]">
      <Header />
      <main className="mx-auto max-w-[500px] px-4 py-16 text-center">
        {status === 'loading' && (
          <div className="space-y-4">
            <Loader2 className="h-12 w-12 text-red-600 mx-auto animate-spin" />
            <p className="text-sm text-gray-600">Processing your request...</p>
          </div>
        )}

        {status === 'success' && (
          <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
            <CheckCircle2 className="h-14 w-14 text-green-600 mx-auto mb-4" />
            <h1 className="text-xl font-bold text-gray-900 mb-2">Unsubscribed Successfully</h1>
            <p className="text-sm text-gray-600 mb-6">
              You have been removed from our newsletter. You will no longer receive email notifications from Buxar News.
            </p>
            <p className="text-xs text-gray-400">
              If this was a mistake, you can subscribe again anytime from our website.
            </p>
          </div>
        )}

        {status === 'not_found' && (
          <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
            <XCircle className="h-14 w-14 text-orange-500 mx-auto mb-4" />
            <h1 className="text-xl font-bold text-gray-900 mb-2">Link Invalid or Expired</h1>
            <p className="text-sm text-gray-600">
              This unsubscribe link is no longer valid. You may have already unsubscribed, or the link has expired.
            </p>
          </div>
        )}

        {status === 'error' && (
          <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
            <XCircle className="h-14 w-14 text-red-500 mx-auto mb-4" />
            <h1 className="text-xl font-bold text-gray-900 mb-2">Something Went Wrong</h1>
            <p className="text-sm text-gray-600">
              We couldn't process your request. Please try again later or contact us at hello@swiftgrowthdigital.com.
            </p>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
