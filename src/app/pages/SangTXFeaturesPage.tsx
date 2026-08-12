/**
 * /features — renders the full SangTX homepage scrolled to #features.
 * This keeps a single source of truth while giving features its own URL.
 */
import { useEffect } from 'react';
import { SangTXHomePage } from './SangTXHomePage';

export function SangTXFeaturesPage() {
  useEffect(() => {
    // After mount, scroll to the features section
    const el = document.getElementById('features');
    if (el) {
      // Small delay so the page has finished rendering
      const t = setTimeout(() => el.scrollIntoView({ behavior: 'smooth' }), 120);
      return () => clearTimeout(t);
    }
  }, []);

  return <SangTXHomePage />;
}
