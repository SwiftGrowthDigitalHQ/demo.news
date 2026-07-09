import { useEffect, type ReactNode } from 'react';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';

interface StaticPageProps {
  title: string;
  description?: string;
  children: ReactNode;
}

export function StaticPage({ title, description, children }: StaticPageProps) {
  useEffect(() => {
    document.title = `${title} | Buxar News`;
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc && description) {
      metaDesc.setAttribute('content', description);
    }
  }, [title, description]);

  return (
    <div className="min-h-screen bg-[#f8f9fa]">
      <Header />
      <main className="mx-auto max-w-[900px] px-4 py-10">
        <h1 className="text-2xl font-bold text-gray-900 mb-6 border-l-4 border-red-600 pl-4">{title}</h1>
        <div className="bg-white rounded-xl border border-gray-200 p-6 sm:p-8 shadow-sm prose-container">
          {children}
        </div>
      </main>
      <Footer />
    </div>
  );
}

/* Reusable prose styles */
export function Heading({ children }: { children: ReactNode }) {
  return <h2 className="text-lg font-bold text-gray-900 mt-6 mb-3">{children}</h2>;
}

export function Para({ children }: { children: ReactNode }) {
  return <p className="text-sm text-gray-600 leading-relaxed mb-4">{children}</p>;
}

export function List({ items }: { items: string[] }) {
  return (
    <ul className="list-disc pl-5 space-y-1.5 mb-4">
      {items.map((item, i) => (
        <li key={i} className="text-sm text-gray-600">{item}</li>
      ))}
    </ul>
  );
}
