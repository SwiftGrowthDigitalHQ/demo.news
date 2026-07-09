import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { useEffect } from 'react';
import { BarChart3, Play, FileText, Star, Phone, Mail } from 'lucide-react';

export function AdvertisePage() {
  useEffect(() => {
    document.title = 'Advertise With Us | Buxar News';
  }, []);

  const adTypes = [
    {
      icon: BarChart3,
      title: 'Banner Ads',
      desc: 'High-visibility banner placements across homepage, category pages, and article pages. Available in leaderboard (728×90), medium rectangle (300×250), and skyscraper (300×600) formats.',
      sizes: ['728×90', '300×250', '300×600', '970×250'],
    },
    {
      icon: FileText,
      title: 'Sponsored Posts',
      desc: 'Native content articles written by your team or ours, clearly labeled as sponsored. Includes social media promotion and newsletter inclusion.',
      sizes: ['Article format', 'Social sharing', 'Newsletter feature'],
    },
    {
      icon: Star,
      title: 'Featured Listings',
      desc: 'Premium placement in our "Featured" and "Sponsored" sections. Your business appears alongside top news stories with high engagement.',
      sizes: ['Homepage feature', 'Category highlight', 'Sidebar pin'],
    },
    {
      icon: Play,
      title: 'Video Ads',
      desc: 'Pre-roll and mid-roll video advertisements on our video news content. High completion rates with targeted placement.',
      sizes: ['Pre-roll (15s/30s)', 'Mid-roll (15s)', 'Sponsored video'],
    },
  ];

  return (
    <div className="min-h-screen bg-[#f8f9fa]">
      <Header />
      <main className="mx-auto max-w-[1000px] px-4 py-10">
        <h1 className="text-2xl font-bold text-gray-900 mb-2 border-l-4 border-red-600 pl-4">Advertise With Us</h1>
        <p className="text-sm text-gray-500 mb-8 pl-5">Reach thousands of engaged readers across Bihar and India</p>

        {/* Stats bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          {[
            { label: 'Monthly Pageviews', value: '500K+' },
            { label: 'Daily Visitors', value: '15K+' },
            { label: 'Avg. Time on Site', value: '4.2 min' },
            { label: 'Newsletter Subscribers', value: '25K+' },
          ].map(stat => (
            <div key={stat.label} className="bg-white rounded-xl border border-gray-200 p-4 text-center shadow-sm">
              <div className="text-xl font-bold text-red-600">{stat.value}</div>
              <div className="text-xs text-gray-500 mt-1">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Ad Types */}
        <h2 className="text-lg font-bold text-gray-900 mb-5">Advertising Options</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-10">
          {adTypes.map(ad => (
            <div key={ad.title} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow-md hover:border-red-200 transition-all">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center">
                  <ad.icon className="h-5 w-5 text-red-600" />
                </div>
                <h3 className="text-base font-bold text-gray-900">{ad.title}</h3>
              </div>
              <p className="text-sm text-gray-600 mb-3 leading-relaxed">{ad.desc}</p>
              <div className="flex flex-wrap gap-1.5">
                {ad.sizes.map(s => (
                  <span key={s} className="px-2 py-0.5 rounded bg-gray-100 text-[10px] font-medium text-gray-600">{s}</span>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Contact CTA */}
        <div className="bg-gradient-to-r from-red-600 to-red-700 rounded-xl p-8 text-white text-center">
          <h2 className="text-xl font-bold mb-2">Ready to Advertise?</h2>
          <p className="text-sm text-red-100 mb-6">Contact our advertising team for rates, media kit, and custom packages.</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a href="mailto:hello@swiftgrowthdigital.com" className="flex items-center gap-2 bg-white text-red-600 px-5 py-2.5 rounded-lg text-sm font-bold hover:bg-red-50 transition-colors">
              <Mail className="h-4 w-4" /> hello@swiftgrowthdigital.com
            </a>
            <a href="tel:+919229721835" className="flex items-center gap-2 bg-white/10 border border-white/30 text-white px-5 py-2.5 rounded-lg text-sm font-bold hover:bg-white/20 transition-colors">
              <Phone className="h-4 w-4" /> +91 9229721835
            </a>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
