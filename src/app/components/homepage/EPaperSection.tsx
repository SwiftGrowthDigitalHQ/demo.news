import { AppLink } from '../../lib/navigation';
import { FileText, Download, BookOpen, Archive } from 'lucide-react';

export function EPaperSection() {
  return (
    <section className="rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="flex items-center gap-2 text-sm font-bold text-gray-900">
          <FileText className="h-4 w-4 text-amber-600" /> E-Paper
        </h2>
        <span className="text-[9px] text-amber-700">{new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {[
          { icon: FileText, label: "Today's Paper", href: '/search?q=epaper' },
          { icon: Download, label: 'Download PDF', href: '/search?q=pdf' },
          { icon: BookOpen, label: 'Read Online', href: '/search?q=read' },
          { icon: Archive, label: 'Archive', href: '/search?q=archive' },
        ].map(item => (
          <AppLink key={item.label} to={item.href} className="flex flex-col items-center gap-1.5 p-2.5 rounded-lg bg-white border border-amber-100 hover:border-amber-300 hover:shadow transition-all group">
            <item.icon className="h-5 w-5 text-amber-600 group-hover:scale-110 transition-transform" />
            <span className="text-[9px] font-semibold text-gray-700 text-center leading-tight">{item.label}</span>
          </AppLink>
        ))}
      </div>
    </section>
  );
}
