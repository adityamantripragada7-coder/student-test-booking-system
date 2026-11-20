import React from 'react';
import { Inbox } from 'lucide-react';

interface EmptyStateProps {
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  actionText,
  onAction,
  icon,
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 sm:p-14 bg-white rounded-3xl border border-slate-200/90 shadow-sm text-center">
      <div className="p-4 bg-slate-50 rounded-2xl text-slate-400 mb-4 border border-slate-100 shadow-2xs">
        {icon || <Inbox className="w-8 h-8" />}
      </div>
      <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-1.5">{title}</h3>
      <p className="text-xs sm:text-sm text-slate-500 max-w-sm mb-6 leading-relaxed">{description}</p>
      {actionText && onAction && (
        <button
          onClick={onAction}
          className="inline-flex items-center px-5 py-2.5 text-xs sm:text-sm font-bold text-white bg-brand-600 rounded-xl hover:bg-brand-700 shadow-xs transition-all active:scale-98 focus:ring-4 focus:ring-brand-500/20"
        >
          {actionText}
        </button>
      )}
    </div>
  );
};
