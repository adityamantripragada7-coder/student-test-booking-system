import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { Result } from '../../types';
import { Badge } from '../../components/Badge';
import { TableSkeleton } from '../../components/Skeleton';
import { EmptyState } from '../../components/EmptyState';
import { Award, AlertCircle, BookOpen } from 'lucide-react';

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
      <div className="space-y-6 max-w-5xl">
        <TableSkeleton rows={4} cols={4} />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in max-w-5xl">
      {/* Header */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs">
        <h1 className="text-xl font-bold text-slate-900">My Examination Results</h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
          Review your academic letter grades (A+, A, B+, B, C+, C, Retest) and assessment evaluations.
        </p>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Latest Result Banner */}
      {latestResult && (
        <div className="bg-gradient-to-r from-brand-900 to-navy-950 text-white p-6 rounded-2xl shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <div className="flex items-center space-x-2">
              <Award className="w-5 h-5 text-amber-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Latest Assessment Result
              </span>
            </div>
            <Badge status={latestResult.grade} className="text-xs px-3 py-1" />
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-white">{latestResult.testName}</h2>
              <p className="text-xs text-slate-300 mt-0.5">
                Published on {new Date(latestResult.dateUploaded).toLocaleDateString()}
              </p>
            </div>

            <div className="flex items-center space-x-6 bg-white/10 px-5 py-3 rounded-xl border border-white/10 self-start sm:self-auto">
              <div>
                <span className="text-[11px] text-slate-300 block">Grade</span>
                <span className="text-2xl font-mono font-bold text-amber-300">
                  {latestResult.grade}
                </span>
              </div>
              <div className="border-l border-white/20 pl-6">
                <span className="text-[11px] text-slate-300 block">Marks (Optional)</span>
                <span className="text-xl font-bold text-white">
                  {latestResult.marksObtained !== null && latestResult.marksObtained !== undefined
                    ? `${latestResult.marksObtained}${latestResult.maxMarks ? ` / ${latestResult.maxMarks}` : ''}`
                    : '—'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Results History */}
      {history.length === 0 ? (
        <EmptyState
          title="No Examination Results"
          description="You do not have any published test results on file yet."
        />
      ) : (
        <div className="space-y-4">
          {/* Mobile Card View */}
          <div className="grid grid-cols-1 gap-3 sm:hidden">
            {history.map((r) => (
              <div
                key={r._id}
                className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-1.5 text-slate-800 font-semibold text-sm">
                      <BookOpen className="w-4 h-4 text-brand-600 shrink-0" />
                      <span>{r.testName}</span>
                    </div>
                    <span className="text-[11px] text-slate-400 block">
                      Published: {new Date(r.dateUploaded).toLocaleDateString()}
                    </span>
                  </div>
                  <Badge status={r.grade} className="text-xs px-2.5 py-0.5" />
                </div>

                <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-xs">
                  <span className="text-slate-500 font-medium">Marks:</span>
                  <span className="font-semibold text-slate-800">
                    {r.marksObtained !== null && r.marksObtained !== undefined
                      ? `${r.marksObtained}${r.maxMarks ? ` / ${r.maxMarks}` : ''}`
                      : 'Optional (—)'}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table View */}
          <div className="hidden sm:block bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">Complete Results History</h3>
              <span className="text-xs text-slate-500 font-medium">{history.length} Records</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-semibold uppercase border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4">Test Name</th>
                    <th className="px-6 py-4">Grade</th>
                    <th className="px-6 py-4">Marks (Optional)</th>
                    <th className="px-6 py-4">Date Uploaded</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {history.map((r) => (
                    <tr key={r._id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-6 py-4 font-semibold text-slate-900">{r.testName}</td>
                      <td className="px-6 py-4">
                        <Badge status={r.grade} className="text-xs px-2.5 py-0.5" />
                      </td>
                      <td className="px-6 py-4 text-slate-700">
                        {r.marksObtained !== null && r.marksObtained !== undefined ? (
                          <span className="font-semibold">
                            {r.marksObtained}{r.maxMarks ? ` / ${r.maxMarks}` : ''}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">Optional (—)</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-slate-500">
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
