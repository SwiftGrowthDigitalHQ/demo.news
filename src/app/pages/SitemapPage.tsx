import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { AppLink } from '../lib/navigation';
import { useCms } from '../lib/cms';
import { useEffect } from 'react';

export function SitemapPage() {
  const { categories } = useCms();

  useEffect(() => {
    document.title = 'Sitemap | Buxar News';
  }, []);

  return (
    <div className="min-h-screen bg-[#f8f9fa]">
      <Header />
      <main className="mx-auto max-w-[900px] px-4 py-10">
        <h1 className="text-2xl font-bold text-gray-900 mb-8 border-l-4 border-red-600 pl-4">Sitemap</h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Main Pages */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <h2 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span className="w-1 h-4 bg-red-600 rounded-full" />
              Main Pages
            </h2>
            <ul className="space-y-2.5">
              <li><AppLink to="/" className="text-sm text-gray-600 hover:text-red-600 transition-colors">Home</AppLink></li>
              <li><AppLink to="/about-us" className="text-sm text-gray-600 hover:text-red-600 transition-colors">About Us</AppLink></li>
              <li><AppLink to="/contact-us" className="text-sm text-gray-600 hover:text-red-600 transition-colors">Contact Us</AppLink></li>
              <li><AppLink to="/advertise-with-us" className="text-sm text-gray-600 hover:text-red-600 transition-colors">Advertise With Us</AppLink></li>
              <li><AppLink to="/search" className="text-sm text-gray-600 hover:text-red-600 transition-colors">Search</AppLink></li>
            </ul>
          </div>

          {/* Categories */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <h2 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span className="w-1 h-4 bg-red-600 rounded-full" />
              Categories
            </h2>
            <ul className="space-y-2.5">
              {categories.map(cat => (
                <li key={cat.slug}>
                  <AppLink to={`/category/${cat.slug}`} className="text-sm text-gray-600 hover:text-red-600 transition-colors">
                    {cat.name}
                  </AppLink>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal Pages */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <h2 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span className="w-1 h-4 bg-red-600 rounded-full" />
              Legal Pages
            </h2>
            <ul className="space-y-2.5">
              <li><AppLink to="/privacy-policy" className="text-sm text-gray-600 hover:text-red-600 transition-colors">Privacy Policy</AppLink></li>
              <li><AppLink to="/terms-and-conditions" className="text-sm text-gray-600 hover:text-red-600 transition-colors">Terms & Conditions</AppLink></li>
              <li><AppLink to="/disclaimer" className="text-sm text-gray-600 hover:text-red-600 transition-colors">Disclaimer</AppLink></li>
              <li><AppLink to="/editorial-policy" className="text-sm text-gray-600 hover:text-red-600 transition-colors">Editorial Policy</AppLink></li>
              <li><AppLink to="/cookie-policy" className="text-sm text-gray-600 hover:text-red-600 transition-colors">Cookie Policy</AppLink></li>
            </ul>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
