import React from 'react';

export const TableSkeleton: React.FC<{ rows?: number; cols?: number }> = ({
  rows = 5,
  cols = 5,
}) => {
  return (
    <div className="w-full bg-white rounded-3xl shadow-sm border border-slate-200/90 overflow-hidden animate-pulse">
      <div className="h-14 bg-slate-100/80 border-b border-slate-200/80 px-6 flex items-center space-x-4">
        {Array.from({ length: cols }).map((_, i) => (
          <div key={i} className="h-4 bg-slate-200/80 rounded-lg flex-1" />
        ))}
      </div>
      <div className="divide-y divide-slate-100">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="h-16 px-6 flex items-center space-x-4">
            {Array.from({ length: cols }).map((_, c) => (
              <div key={c} className="h-4 bg-slate-100 rounded-lg flex-1" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

export const CardSkeleton: React.FC = () => {
  return (
    <div className="p-6 sm:p-7 bg-white rounded-3xl border border-slate-200/90 shadow-sm animate-pulse space-y-4">
      <div className="flex items-center justify-between">
        <div className="h-4 w-28 bg-slate-200 rounded-lg" />
        <div className="h-10 w-10 bg-slate-100 rounded-xl" />
      </div>
      <div className="h-8 w-24 bg-slate-200 rounded-lg" />
      <div className="h-3 w-40 bg-slate-100 rounded-lg" />
    </div>
  );
};
