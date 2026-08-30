"use client";

import * as React from "react";
import { cn } from "./utils";
import { useIsMobile } from "./use-mobile";

interface MobileTableProps<T> {
  data: T[];
  columns: Column<T>[];
  keyExtractor: (item: T) => string;
  renderRow: (item: T, index: number) => React.ReactNode;
  renderCard?: (item: T, index: number) => React.ReactNode;
  emptyMessage?: string;
  className?: string;
  pagination?: {
    page: number;
    perPage: number;
    total: number;
    onPageChange: (page: number) => void;
    onPerPageChange?: (perPage: number) => void;
  };
}

interface Column<T> {
  key: string;
  header: string;
  width?: string;
  hideOnMobile?: boolean;
}

export function MobileTable<T>({
  data,
  columns,
  keyExtractor,
  renderRow,
  renderCard,
  emptyMessage = "No data available",
  className,
  pagination,
}: MobileTableProps<T>) {
  const isMobile = useIsMobile();
  const visibleColumns = columns.filter((col) => !col.hideOnMobile || !isMobile);

  if (data.length === 0) {
    return (
      <div
        className={cn(
          "rounded-xl border border-gray-200 bg-gray-50 p-8 text-center",
          className,
        )}
      >
        <p className="text-gray-500">{emptyMessage}</p>
      </div>
    );
  }

  const paginatedData = pagination
    ? data.slice(
        pagination.page * pagination.perPage,
        (pagination.page + 1) * pagination.perPage,
      )
    : data;

  if (isMobile && renderCard) {
    return (
      <div
        className={cn(
          "flex flex-col gap-3",
          className,
        )}
      >
        {paginatedData.map((item, index) => (
          <div
            key={keyExtractor(item)}
            className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
          >
            {renderCard(item, pagination ? pagination.page * pagination.perPage + index : index)}
          </div>
        ))}
        {pagination && (
          <MobilePagination
            total={pagination.total}
            page={pagination.page}
            perPage={pagination.perPage}
            onPageChange={pagination.onPageChange}
            onPerPageChange={pagination.onPerPageChange}
          />
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative w-full overflow-x-auto rounded-xl border border-gray-200 bg-white",
        className,
      )}
    >
      <table className="w-full caption-bottom text-sm">
        <thead className="[&_tr]:border-b border-gray-100">
          <tr>
            {visibleColumns.map((column) => (
              <th
                key={column.key}
                className="h-10 px-3 text-left align-middle font-medium whitespace-nowrap text-gray-600"
                style={{ width: column.width }}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="[&_tr:last-child]:border-0">
          {paginatedData.map((item, index) => (
            <tr
              key={keyExtractor(item)}
              className="border-b border-gray-50 hover:bg-gray-50 transition-colors"
            >
              {visibleColumns.map((column) => (
                <td
                  key={column.key}
                  className="p-3 align-middle whitespace-nowrap"
                >
                  {renderRow(item, pagination ? pagination.page * pagination.perPage + index : index)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {pagination && (
        <MobilePagination
          total={pagination.total}
          page={pagination.page}
          perPage={pagination.perPage}
          onPageChange={pagination.onPageChange}
          onPerPageChange={pagination.onPerPageChange}
        />
      )}
    </div>
  );
}

interface MobilePaginationProps {
  total: number;
  page: number;
  perPage: number;
  onPageChange: (page: number) => void;
  onPerPageChange?: (perPage: number) => void;
}

export function MobilePagination({
  total,
  page,
  perPage,
  onPageChange,
  onPerPageChange,
}: MobilePaginationProps) {
  const isMobile = useIsMobile();
  const totalPages = Math.ceil(total / perPage);

  if (total <= perPage) return null;

  const start = page * perPage + 1;
  const end = Math.min((page + 1) * perPage, total);

  const getVisiblePages = () => {
    if (totalPages <= 5) return Array.from({ length: totalPages }, (_, i) => i);
    const startPage = Math.max(0, Math.min(page - 2, totalPages - 5));
    return Array.from({ length: 5 }, (_, i) => startPage + i);
  };

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 px-4 py-3 border-t border-gray-100",
        isMobile ? "flex-col" : "flex-row",
      )}
    >
      <div className="flex items-center gap-3">
        <span className="text-xs text-gray-500">
          Showing <strong>{start}–{end}</strong> of <strong>{total}</strong>
        </span>
        {onPerPageChange && (
          <select
            value={perPage}
            onChange={(e) => {
              onPerPageChange(Number(e.target.value));
              onPageChange(0);
            }}
            className="h-9 rounded border border-gray-200 px-2 text-xs text-gray-600 bg-white focus:outline-none focus:ring-1 focus:ring-red-400 min-w-[100px]"
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
          </select>
        )}
      </div>

      <div className="flex items-center gap-1.5 flex-wrap justify-center">
        <button
          type="button"
          onClick={() => onPageChange(Math.max(0, page - 1))}
          disabled={page === 0}
          className={cn(
            "px-3 py-1.5 rounded border border-gray-200 text-xs font-medium text-gray-600 hover:bg-red-50 hover:text-red-600 hover:border-red-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors min-h-[40px] min-w-[40px]",
            isMobile ? "flex-1" : "",
          )}
        >
          ← Prev
        </button>
        {getVisiblePages().map((pn) => (
          <button
            key={pn}
            type="button"
            onClick={() => onPageChange(pn)}
            className={cn(
              "w-9 h-9 rounded text-[10px] font-bold transition-colors",
              pn === page
                ? "bg-red-600 text-white shadow-sm"
                : "border border-gray-200 text-gray-600 hover:bg-red-50 hover:text-red-600",
            )}
          >
            {pn + 1}
          </button>
        ))}
        <button
          type="button"
          onClick={() => onPageChange(Math.min(totalPages - 1, page + 1))}
          disabled={page === totalPages - 1}
          className={cn(
            "px-3 py-1.5 rounded border border-gray-200 text-xs font-medium text-gray-600 hover:bg-red-50 hover:text-red-600 hover:border-red-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors min-h-[40px] min-w-[40px]",
            isMobile ? "flex-1" : "",
          )}
        >
          Next →
        </button>
      </div>
    </div>
  );
}

export function useMobilePagination(defaultPerPage = 10) {
  const [page, setPage] = React.useState(0);
  const [perPage, setPerPage] = React.useState(defaultPerPage);

  const reset = () => setPage(0);

  const paginate = <T,>(items: T[]): T[] => {
    return items.slice(page * perPage, (page + 1) * perPage);
  };

  return { page, perPage, setPage, setPerPage, reset, paginate };
}