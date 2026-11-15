import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { Result } from '../../types';
import { Badge } from '../../components/Badge';
import { TableSkeleton } from '../../components/Skeleton';
import { EmptyState } from '../../components/EmptyState';
import { Award, AlertCircle, BookOpen, Star, CalendarDays, Clock, CheckCircle2 } from 'lucide-react';
import { formatTimeDisplay } from '../admin/Bookings';

export const StudentMyResults: React.FC = () => {
  const [latestResult, setLatestResult] = useState<Result | null>(null);
  const [history, setHistory] = useState<Result[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    api
      .get('/results/my')
      .then((res) => {
        if (res.success) {
          setLatestResult(res.latestResult);
          setHistory(res.history || []);
        } else {
          setError(res.message || 'Failed to fetch test results.');
        }
      })
      .catch(() => setError('Error loading test results.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto">
        <TableSkeleton rows={4} cols={4} />
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in max-w-5xl mx-auto">
      {/* Header Banner */}
      <div className="bg-white p-6 sm:p-7 rounded-3xl border border-slate-200/90 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-brand-600 mb-1">
            <Award className="w-4 h-4" />
            <span>Academic Assessment</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900">My Examination Results</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Official evaluations for Memory ⭐ and Mistakes ⭐ categories across your booked test sessions.
          </p>
        </div>
        <div className="shrink-0 flex items-center space-x-2 bg-slate-50 px-3.5 py-2 rounded-2xl border border-slate-200/60">
          <span className="text-xs text-slate-500 font-medium">Published Records:</span>
          <span className="text-sm font-bold text-slate-900">{history.length}</span>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs sm:text-sm text-rose-700 flex items-center space-x-2.5">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Latest Result Card (Featured) */}
      {latestResult && (
        <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-8 rounded-3xl shadow-xl border border-white/10 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-white/10">
            <div className="flex items-center space-x-2">
              <Award className="w-5 h-5 text-amber-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Latest Published Evaluation
              </span>
            </div>
            <Badge status={latestResult.status || 'Published'} className="self-start sm:self-auto text-xs px-3 py-1" />
          </div>

          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="space-y-1.5">
              <h2 className="text-xl sm:text-2xl font-extrabold text-white">{latestResult.testName}</h2>
              <p className="text-xs sm:text-sm text-slate-300">
                Published on {new Date(latestResult.dateUploaded).toLocaleDateString()}
              </p>
            </div>

            {/* TWO MANDATORY RESULT CATEGORIES */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4 shrink-0">
              {/* Category A: MEMORY */}
              <div className="bg-white/10 backdrop-blur-md p-4 sm:p-5 rounded-2xl border border-white/15 space-y-2 min-w-[130px] sm:min-w-[150px]">
                <div className="flex items-center space-x-1 text-xs font-bold text-amber-300">
                  <span>MEMORY</span>
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                </div>
                <div className="text-2xl sm:text-3xl font-extrabold font-mono text-white">
                  {latestResult.memoryGrade || latestResult.grade || '—'}
                </div>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-300 block">
                  Compulsory Category
                </span>
              </div>

              {/* Category B: MISTAKES */}
              <div className="bg-white/10 backdrop-blur-md p-4 sm:p-5 rounded-2xl border border-white/15 space-y-2 min-w-[130px] sm:min-w-[150px]">
                <div className="flex items-center space-x-1 text-xs font-bold text-amber-300">
                  <span>MISTAKES</span>
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                </div>
                <div className="text-2xl sm:text-3xl font-extrabold font-mono text-white">
                  {latestResult.mistakesGrade || latestResult.grade || '—'}
                </div>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-300 block">
                  Compulsory Category
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Results History */}
      {history.length === 0 ? (
        <EmptyState
          title="Results are not yet published"
          description="Your test results have not been published by the administration yet. Once published, your Memory and Mistakes grades will appear here."
        />
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-base sm:text-lg font-bold text-slate-900">All Examination Records</h3>
            <span className="text-xs text-slate-400">Isolated & Private to Your Account</span>
          </div>

          {/* Mobile Card View (optimized for smartphones) */}
          <div className="grid grid-cols-1 gap-3 sm:hidden">
            {history.map((r) => (
              <div
                key={r._id}
                className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-1.5 text-slate-900 font-bold text-sm">
                      <BookOpen className="w-4 h-4 text-brand-600 shrink-0" />
                      <span>{r.testName}</span>
                    </div>
                    <span className="text-[11px] text-slate-400 block">
                      Published on {new Date(r.dateUploaded).toLocaleDateString()}
                    </span>
                  </div>
                  <Badge status={r.status || 'Published'} className="text-xs px-2.5 py-0.5" />
                </div>

                <div className="grid grid-cols-2 gap-2.5 pt-1">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-center space-y-1">
                    <div className="flex items-center justify-center space-x-1 text-[11px] font-bold text-slate-700">
                      <span>MEMORY</span>
                      <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                    </div>
                    <div className="pt-0.5">
                      <Badge status={r.memoryGrade || r.grade || '—'} className="text-xs px-3 py-0.5" />
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-center space-y-1">
                    <div className="flex items-center justify-center space-x-1 text-[11px] font-bold text-slate-700">
                      <span>MISTAKES</span>
                      <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                    </div>
                    <div className="pt-0.5">
                      <Badge status={r.mistakesGrade || r.grade || '—'} className="text-xs px-3 py-0.5" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table View */}
          <div className="hidden sm:block bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-slate-50/80 text-slate-500 font-bold uppercase text-[11px] tracking-wider border-b border-slate-200/80">
                  <tr>
                    <th className="px-6 py-4">Assessment / Slot</th>
                    <th className="px-6 py-4">
                      <span className="flex items-center space-x-1">
                        <span>Memory Grade</span>
                        <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                      </span>
                    </th>
                    <th className="px-6 py-4">
                      <span className="flex items-center space-x-1">
                        <span>Mistakes Grade</span>
                        <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                      </span>
                    </th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Published Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {history.map((r) => (
                    <tr key={r._id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-6 py-4 font-semibold text-slate-900">
                        <div className="flex items-center space-x-2">
                          <BookOpen className="w-4 h-4 text-brand-600 shrink-0" />
                          <span>{r.testName}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <Badge status={r.memoryGrade || r.grade || '—'} className="text-xs px-3 py-0.5" />
                      </td>
                      <td className="px-6 py-4">
                        <Badge status={r.mistakesGrade || r.grade || '—'} className="text-xs px-3 py-0.5" />
                      </td>
                      <td className="px-6 py-4">
                        <Badge status={r.status || 'Published'} className="text-xs px-2.5 py-0.5" />
                      </td>
                      <td className="px-6 py-4 text-right text-slate-500 font-medium">
                        {new Date(r.dateUploaded).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
