import React from 'react';

interface BadgeProps {
  status: string;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ status, className = '' }) => {
  const getStyle = (val: string) => {
    switch (val.toLowerCase()) {
      case 'a+':
        return 'bg-purple-50 text-purple-700 border-purple-200 ring-purple-500/10 font-bold';
      case 'a':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200 ring-emerald-500/10 font-bold';
      case 'b+':
        return 'bg-teal-50 text-teal-700 border-teal-200 ring-teal-500/10 font-bold';
      case 'b':
        return 'bg-blue-50 text-blue-700 border-blue-200 ring-blue-500/10 font-bold';
      case 'c+':
        return 'bg-amber-50 text-amber-700 border-amber-200 ring-amber-500/10 font-bold';
      case 'c':
        return 'bg-orange-50 text-orange-700 border-orange-200 ring-orange-500/10 font-bold';
      case 'retest':
        return 'bg-rose-100 text-rose-800 border-rose-300 ring-rose-500/20 font-bold';
      case 'pass':
      case 'available':
      case 'active':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200 ring-emerald-500/10';
      case 'fail':
      case 'full':
      case 'cancelled':
        return 'bg-rose-50 text-rose-700 border-rose-200 ring-rose-500/10';
      case 'pending':
        return 'bg-amber-50 text-amber-700 border-amber-200 ring-amber-500/10';
      case 'completed':
        return 'bg-blue-50 text-blue-700 border-blue-200 ring-blue-500/10';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200 ring-slate-500/10';
    }
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border shadow-xs transition-colors ${getStyle(
        status
      )} ${className}`}
    >
      <span className="w-1.5 h-1.5 rounded-full mr-1.5 fill-current opacity-75 bg-current" />
      {status}
    </span>
  );
};
