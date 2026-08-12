/**
 * /pricing — renders the full SangTX homepage scrolled to #pricing.
 */
import { useEffect } from 'react';
import { SangTXHomePage } from './SangTXHomePage';

export function SangTXPricingPage() {
  useEffect(() => {
    const el = document.getElementById('pricing');
    if (el) {
      const t = setTimeout(() => el.scrollIntoView({ behavior: 'smooth' }), 120);
      return () => clearTimeout(t);
    }
  }, []);

  return <SangTXHomePage />;
}
