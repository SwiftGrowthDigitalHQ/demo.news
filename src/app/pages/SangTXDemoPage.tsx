/**
 * /demo — renders the full SangTX homepage scrolled to #demo section.
 * Also provides a direct link to the Buxar News tenant for live exploration.
 */
import { useEffect } from 'react';
import { SangTXHomePage } from './SangTXHomePage';

export function SangTXDemoPage() {
  useEffect(() => {
    const el = document.getElementById('demo');
    if (el) {
      const t = setTimeout(() => el.scrollIntoView({ behavior: 'smooth' }), 120);
      return () => clearTimeout(t);
    }
  }, []);

  return <SangTXHomePage />;
}
