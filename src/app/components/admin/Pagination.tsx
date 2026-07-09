import { useState } from 'react';

interface PaginationProps {
  total: number;
  page: number;
  perPage: number;
  onPageChange: (page: number) => void;
  onPerPageChange?: (perPage: number) => void;
}

/**
 * Reusable Admin Pagination Component
 * Shows: "Showing X–Y of Z records" | Page size selector | Prev/Next + page numbers
 */
export function Pagination({ total, page, perPage, onPageChange, onPerPageChange }: PaginationProps) {
  const totalPages = Math.ceil(total / perPage);

  if (total <= perPage) return null;

  const start = page * perPage + 1;
  const end = Math.min((page + 1) * perPage, total);

  // Calculate visible page numbers (max 5)
  const getVisiblePages = () => {
    if (totalPages <= 5) return Array.from({ length: totalPages }, (_, i) => i);
    const startPage = Math.max(0, Math.min(page - 2, totalPages - 5));
    return Array.from({ length: 5 }, (_, i) => startPage + i);
  };

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-gray-100">
      {/* Left: Info + Page size */}
      <div className="flex items-center gap-3">
        <span className="text-xs text-gray-500">
          Showing <strong>{start}–{end}</strong> of <strong>{total}</strong> records
        </span>
        {onPerPageChange && (
          <select
            value={perPage}
            onChange={e => { onPerPageChange(Number(e.target.value)); onPageChange(0); }}
            className="h-7 rounded border border-gray-200 px-1.5 text-[10px] text-gray-600 bg-white focus:outline-none focus:ring-1 focus:ring-red-400"
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
          </select>
        )}
      </div>

      {/* Right: Navigation */}
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => onPageChange(Math.max(0, page - 1))}
          disabled={page === 0}
          className="px-2.5 py-1 rounded border border-gray-200 text-xs font-medium text-gray-600 hover:bg-red-50 hover:text-red-600 hover:border-red-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          ← Prev
        </button>
        {getVisiblePages().map(pn => (
          <button
            key={pn}
            type="button"
            onClick={() => onPageChange(pn)}
            className={`w-7 h-7 rounded text-[10px] font-bold transition-colors ${
              pn === page
                ? 'bg-red-600 text-white shadow-sm'
                : 'border border-gray-200 text-gray-600 hover:bg-red-50 hover:text-red-600'
            }`}
          >
            {pn + 1}
          </button>
        ))}
        <button
          type="button"
          onClick={() => onPageChange(Math.min(totalPages - 1, page + 1))}
          disabled={page === totalPages - 1}
          className="px-2.5 py-1 rounded border border-gray-200 text-xs font-medium text-gray-600 hover:bg-red-50 hover:text-red-600 hover:border-red-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Next →
        </button>
      </div>
    </div>
  );
}

/**
 * Hook for pagination state management
 */
export function usePagination(defaultPerPage = 10) {
  const [page, setPage] = useState(0);
  const [perPage, setPerPage] = useState(defaultPerPage);

  const reset = () => setPage(0);

  const paginate = <T,>(items: T[]): T[] => {
    return items.slice(page * perPage, (page + 1) * perPage);
  };

  return { page, perPage, setPage, setPerPage, reset, paginate };
}
