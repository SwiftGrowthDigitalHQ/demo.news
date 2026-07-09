import { useEffect } from 'react';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { useAuth } from '../lib/auth';
import { useAppNavigation } from '../lib/navigation';
import { User, Mail, Phone, Calendar, Bookmark, Clock, Settings, LogOut } from 'lucide-react';

export function ProfilePage() {
  const { user, profile, signOut, loading } = useAuth();
  const { navigate } = useAppNavigation();

  useEffect(() => {
    document.title = 'My Profile | Buxar News';
  }, []);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      navigate('/login');
    }
  }, [loading, user, navigate]);

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-[#f8f9fa]">
        <Header />
        <main className="mx-auto max-w-[800px] px-4 py-16 text-center">
          <div className="animate-pulse space-y-4">
            <div className="w-24 h-24 rounded-full bg-gray-200 mx-auto" />
            <div className="h-6 bg-gray-200 rounded w-48 mx-auto" />
            <div className="h-4 bg-gray-200 rounded w-64 mx-auto" />
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const userName = profile?.full_name || user.email?.split('@')[0] || 'User';
  const userInitial = userName.charAt(0).toUpperCase();
  const joinDate = user.created_at ? new Date(user.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : 'N/A';

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa]">
      <Header />
      <main className="mx-auto max-w-[800px] px-4 py-10">
        <h1 className="text-2xl font-bold text-gray-900 mb-8 border-l-4 border-red-600 pl-4">My Profile</h1>

        {/* Profile Card */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden mb-6">
          {/* Banner */}
          <div className="h-24 bg-gradient-to-r from-red-600 via-red-700 to-red-800" />
          <div className="px-6 pb-6">
            {/* Avatar */}
            <div className="flex items-end gap-4 -mt-10 mb-4">
              <div className="w-20 h-20 rounded-full bg-red-600 border-4 border-white flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                {userInitial}
              </div>
              <div className="pb-1">
                <h2 className="text-lg font-bold text-gray-900">{userName}</h2>
                {profile?.role_name && (
                  <span className="inline-block text-[10px] font-semibold bg-red-50 text-red-600 px-2 py-0.5 rounded mt-0.5">{profile.role_name}</span>
                )}
              </div>
            </div>

            {/* Info grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 border border-gray-100">
                <Mail className="h-4 w-4 text-red-500 shrink-0" />
                <div>
                  <div className="text-[10px] text-gray-500 font-medium">Email</div>
                  <div className="text-sm text-gray-900">{user.email}</div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 border border-gray-100">
                <Phone className="h-4 w-4 text-red-500 shrink-0" />
                <div>
                  <div className="text-[10px] text-gray-500 font-medium">Mobile</div>
                  <div className="text-sm text-gray-900">{user.phone || 'Not provided'}</div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 border border-gray-100">
                <Calendar className="h-4 w-4 text-red-500 shrink-0" />
                <div>
                  <div className="text-[10px] text-gray-500 font-medium">Joined</div>
                  <div className="text-sm text-gray-900">{joinDate}</div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 border border-gray-100">
                <User className="h-4 w-4 text-red-500 shrink-0" />
                <div>
                  <div className="text-[10px] text-gray-500 font-medium">Account Status</div>
                  <div className="text-sm text-gray-900 capitalize">{profile?.status || 'Active'}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-gray-200 p-5 text-center hover:shadow-md hover:border-red-200 transition-all cursor-pointer">
            <Bookmark className="h-6 w-6 text-red-600 mx-auto mb-2" />
            <div className="text-sm font-bold text-gray-900">Saved Articles</div>
            <div className="text-xs text-gray-500 mt-0.5">0 articles saved</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5 text-center hover:shadow-md hover:border-red-200 transition-all cursor-pointer">
            <Clock className="h-6 w-6 text-blue-600 mx-auto mb-2" />
            <div className="text-sm font-bold text-gray-900">Reading History</div>
            <div className="text-xs text-gray-500 mt-0.5">Track your reads</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5 text-center hover:shadow-md hover:border-red-200 transition-all cursor-pointer">
            <Settings className="h-6 w-6 text-gray-600 mx-auto mb-2" />
            <div className="text-sm font-bold text-gray-900">Settings</div>
            <div className="text-xs text-gray-500 mt-0.5">Preferences & notifications</div>
          </div>
        </div>

        {/* Logout button */}
        <button
          type="button"
          onClick={handleLogout}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors"
        >
          <LogOut className="h-4 w-4" /> Logout
        </button>
      </main>
      <Footer />
    </div>
  );
}
