import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Pagination as PaginationType } from '../types';

interface PaginationProps {
  pagination: PaginationType;
  onPageChange: (page: number) => void;
}

export const Pagination: React.FC<PaginationProps> = ({ pagination, onPageChange }) => {
  const { page, pages, total } = pagination;

  if (pages <= 1) return null;

  return (
    <div className="flex items-center justify-between px-4 py-3.5 bg-white border-t border-slate-200/80 sm:px-6 rounded-b-3xl">
      <div className="flex justify-between flex-1 sm:hidden">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="relative inline-flex items-center px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 disabled:opacity-40 transition-colors"
        >
          Previous
        </button>
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= pages}
          className="relative inline-flex items-center px-4 py-2 ml-3 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 disabled:opacity-40 transition-colors"
        >
          Next
        </button>
      </div>

      <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
        <div>
          <p className="text-xs sm:text-sm text-slate-500">
            Showing page <span className="font-bold text-slate-900">{page}</span> of{' '}
            <span className="font-bold text-slate-900">{pages}</span> ({total} total records)
          </p>
        </div>
        <div>
          <nav className="inline-flex space-x-1" aria-label="Pagination">
            <button
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
              className="relative inline-flex items-center p-2 text-slate-400 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 hover:text-slate-600 disabled:opacity-40 transition-colors"
              aria-label="Previous Page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => onPageChange(p)}
                className={`relative inline-flex items-center px-3.5 py-1.5 text-xs font-bold rounded-xl border transition-all ${
                  p === page
                    ? 'z-10 bg-brand-600 text-white border-brand-600 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                }`}
              >
                {p}
              </button>
            ))}
            <button
              onClick={() => onPageChange(page + 1)}
              disabled={page >= pages}
              className="relative inline-flex items-center p-2 text-slate-400 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 hover:text-slate-600 disabled:opacity-40 transition-colors"
              aria-label="Next Page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </nav>
        </div>
      </div>
    </div>
  );
};
