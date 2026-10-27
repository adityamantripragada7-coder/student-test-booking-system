import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { Result, GradeType, Pagination as PaginationType } from '../../types';
import { Badge } from '../../components/Badge';
import { Modal } from '../../components/Modal';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { Pagination } from '../../components/Pagination';
import { TableSkeleton } from '../../components/Skeleton';
import { EmptyState } from '../../components/EmptyState';
import { PlusCircle, Search, Edit2, Trash2, Award, AlertCircle, CheckCircle2, User, BookOpen } from 'lucide-react';

const GRADE_OPTIONS: GradeType[] = ['A+', 'A', 'B+', 'B', 'C+', 'C', 'Retest'];

export const AdminResults: React.FC = () => {
  const [results, setResults] = useState<Result[]>([]);
  const [pagination, setPagination] = useState<PaginationType>({ total: 0, page: 1, limit: 10, pages: 1 });
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [gradeFilter, setGradeFilter] = useState('');

  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingResult, setEditingResult] = useState<Result | null>(null);

  const [studentIdInput, setStudentIdInput] = useState('');
  const [testNameInput, setTestNameInput] = useState('');
  const [marksInput, setMarksInput] = useState<number | ''>('');
  const [maxMarksInput, setMaxMarksInput] = useState<number | ''>('');
  const [gradeInput, setGradeInput] = useState<GradeType>('A+');

  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  // Delete State
  const [deletingResult, setDeletingResult] = useState<Result | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchResults = async (page = 1, searchQuery = search, grade = gradeFilter) => {
    setLoading(true);
    try {
      const res = await api.get(
        `/results?page=${page}&limit=10&search=${encodeURIComponent(searchQuery)}&grade=${encodeURIComponent(grade)}`
      );
      if (res.success) {
        setResults(res.results);
        setPagination(res.pagination);
      } else {
        setNotification({ type: 'error', message: res.message || 'Failed to fetch results' });
      }
    } catch (err: any) {
      setNotification({ type: 'error', message: 'Failed to connect to backend server' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResults(1, search, gradeFilter);
  }, []);

  const openAddModal = () => {
    setEditingResult(null);
    setStudentIdInput('');
    setTestNameInput('');
    setMarksInput('');
    setMaxMarksInput('');
    setGradeInput('A+');
    setFormError('');
    setShowModal(true);
  };

  const openEditModal = (resItem: Result) => {
    setEditingResult(resItem);
    const student = typeof resItem.student === 'object' ? resItem.student : null;
    setStudentIdInput(student ? student.studentId : '');
    setTestNameInput(resItem.testName);
    setMarksInput(resItem.marksObtained !== null && resItem.marksObtained !== undefined ? resItem.marksObtained : '');
    setMaxMarksInput(resItem.maxMarks !== null && resItem.maxMarks !== undefined ? resItem.maxMarks : '');
    setGradeInput((GRADE_OPTIONS.includes(resItem.grade as GradeType) ? resItem.grade : 'A+') as GradeType);
    setFormError('');
    setShowModal(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!testNameInput.trim()) {
      setFormError('Test name is required.');
      return;
    }

    if (!editingResult && !studentIdInput.trim()) {
      setFormError('Student ID is required.');
      return;
    }

    if (!gradeInput || !GRADE_OPTIONS.includes(gradeInput)) {
      setFormError('Please select a valid required Grade (A+, A, B+, B, C+, C, Retest).');
      return;
    }

    // Marks validation (optional)
    if (marksInput !== '' && Number(marksInput) < 0) {
      setFormError('Marks obtained cannot be negative.');
      return;
    }

    if (maxMarksInput !== '' && Number(maxMarksInput) <= 0) {
      setFormError('Maximum marks must be greater than 0.');
      return;
    }

    if (marksInput !== '' && maxMarksInput !== '' && Number(marksInput) > Number(maxMarksInput)) {
      setFormError('Marks obtained cannot exceed maximum marks.');
      return;
    }

    setFormLoading(true);
    try {
      const payload = {
        studentId: studentIdInput.trim().toUpperCase(),
        testName: testNameInput.trim(),
        marksObtained: marksInput === '' ? null : Number(marksInput),
        maxMarks: maxMarksInput === '' ? null : Number(maxMarksInput),
        grade: gradeInput,
      };

      if (editingResult) {
        const res = await api.put(`/results/${editingResult._id}`, payload);
        if (res.success) {
          setNotification({ type: 'success', message: 'Test result updated successfully.' });
          setShowModal(false);
          fetchResults(pagination.page);
        } else {
          setFormError(res.message || 'Failed to update result.');
        }
      } else {
        const res = await api.post('/results', payload);
        if (res.success) {
          setNotification({ type: 'success', message: 'Test result published successfully.' });
          setShowModal(false);
          fetchResults(1);
        } else {
          setFormError(res.message || 'Failed to publish result.');
        }
      }
    } catch (err: any) {
      setFormError('Server request error.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingResult) return;
    setDeleteLoading(true);
    try {
      const res = await api.delete(`/results/${deletingResult._id}`);
      if (res.success) {
        setNotification({ type: 'success', message: 'Result record deleted.' });
        setDeletingResult(null);
        fetchResults(pagination.page);
      } else {
        setNotification({ type: 'error', message: res.message || 'Failed to delete result.' });
      }
    } catch (err: any) {
      setNotification({ type: 'error', message: 'Connection error.' });
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between text-xs font-medium shadow-xs ${
            notification.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          <div className="flex items-center space-x-2">
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{notification.message}</span>
          </div>
          <button onClick={() => setNotification(null)} className="text-slate-400 hover:text-slate-600 text-base leading-none">
            &times;
          </button>
        </div>
      )}

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Student Results Management</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Record required letter grades (A+, A, B+, B, C+, C, Retest) with optional marks.
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="inline-flex items-center justify-center space-x-2 px-4 py-2.5 text-xs font-semibold text-white bg-brand-600 rounded-xl hover:bg-brand-700 active:scale-98 shadow-xs transition-all shrink-0 w-full sm:w-auto"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Publish Test Result</span>
        </button>
      </div>

      {/* Filter Controls */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          {/* Search Box */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                fetchResults(1, e.target.value, gradeFilter);
              }}
              placeholder="Search student ID, name or test..."
              className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-300 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 bg-slate-50/50 transition-colors"
            />
          </div>

          {/* Grade Filter (replacing removed status filter) */}
          <select
            value={gradeFilter}
            onChange={(e) => {
              setGradeFilter(e.target.value);
              fetchResults(1, search, e.target.value);
            }}
            className="w-full sm:w-44 px-3 py-2 text-xs rounded-xl border border-slate-300 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 bg-white font-medium transition-colors"
          >
            <option value="">All Grades</option>
            {GRADE_OPTIONS.map((g) => (
              <option key={g} value={g}>
                Grade {g}
              </option>
            ))}
          </select>
        </div>

        <span className="text-xs text-slate-500 font-medium self-end sm:self-center">
          Total Results: <strong className="text-slate-800">{pagination.total}</strong>
        </span>
      </div>

      {/* Results Content */}
      {loading ? (
        <TableSkeleton rows={6} cols={5} />
      ) : results.length === 0 ? (
        <EmptyState
          title="No Results Published"
          description="No student test results match your search or grade filter."
          actionText="Publish New Result"
          onAction={openAddModal}
        />
      ) : (
        <div className="space-y-4">
          {/* Mobile Card View (optimized for mobile screens) */}
          <div className="grid grid-cols-1 gap-3 sm:hidden">
            {results.map((r) => {
              const student = typeof r.student === 'object' ? r.student : null;

              return (
                <div
                  key={r._id}
                  className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-0.5">
                      <div className="flex items-center space-x-1.5">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        <span className="font-semibold text-slate-900 text-sm">{student?.name || 'Unknown'}</span>
                      </div>
                      <span className="font-mono text-xs text-brand-600 bg-brand-50 px-2 py-0.5 rounded-md inline-block">
                        {student?.studentId}
                      </span>
                    </div>
                    <Badge status={r.grade} className="text-xs px-2.5 py-1" />
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs space-y-1">
                    <div className="flex items-center space-x-1.5 text-slate-700 font-medium">
                      <BookOpen className="w-3.5 h-3.5 text-slate-400" />
                      <span className="truncate">{r.testName}</span>
                    </div>
                    <div className="flex items-center justify-between pt-1 text-[11px] text-slate-500 border-t border-slate-200/60 mt-1.5">
                      <span>Marks:</span>
                      {r.marksObtained !== null && r.marksObtained !== undefined ? (
                        <span className="font-semibold text-slate-800">
                          {r.marksObtained} {r.maxMarks ? `/ ${r.maxMarks}` : ''}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">Optional (Not entered)</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                    <span className="text-[11px] text-slate-400">
                      {new Date(r.dateUploaded).toLocaleDateString()}
                    </span>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => openEditModal(r)}
                        className="p-2 rounded-lg text-slate-600 hover:text-brand-600 hover:bg-brand-50 active:bg-brand-100 transition-colors"
                        title="Edit Result"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeletingResult(r)}
                        className="p-2 rounded-lg text-slate-600 hover:text-rose-600 hover:bg-rose-50 active:bg-rose-100 transition-colors"
                        title="Delete Result"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop Table View */}
          <div className="hidden sm:block bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-semibold uppercase border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4">Student</th>
                    <th className="px-6 py-4">Test Name</th>
                    <th className="px-6 py-4">Grade (Required)</th>
                    <th className="px-6 py-4">Marks (Optional)</th>
                    <th className="px-6 py-4">Date Uploaded</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {results.map((r) => {
                    const student = typeof r.student === 'object' ? r.student : null;

                    return (
                      <tr key={r._id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-6 py-4">
                          <p className="font-semibold text-slate-900">{student?.name || 'Unknown'}</p>
                          <p className="font-mono text-[11px] text-slate-400">{student?.studentId}</p>
                        </td>
                        <td className="px-6 py-4 font-medium text-slate-800">{r.testName}</td>
                        <td className="px-6 py-4">
                          <Badge status={r.grade} className="text-xs px-2.5 py-0.5" />
                        </td>
                        <td className="px-6 py-4 text-slate-700">
                          {r.marksObtained !== null && r.marksObtained !== undefined ? (
                            <span className="font-semibold">
                              {r.marksObtained} {r.maxMarks ? `/ ${r.maxMarks}` : ''}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic">Optional (—)</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-slate-500">
                          {new Date(r.dateUploaded).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-right space-x-2">
                          <button
                            onClick={() => openEditModal(r)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-brand-600 hover:bg-brand-50 transition-colors"
                            title="Edit Result"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeletingResult(r)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            title="Delete Result"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <Pagination pagination={pagination} onPageChange={(p) => fetchResults(p, search, gradeFilter)} />
          </div>

          {/* Mobile Pagination */}
          <div className="sm:hidden">
            <Pagination pagination={pagination} onPageChange={(p) => fetchResults(p, search, gradeFilter)} />
          </div>
        </div>
      )}

      {/* Publish / Edit Result Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingResult ? 'Edit Test Result' : 'Publish Test Result'}
        maxWidth="md"
      >
        <form onSubmit={handleFormSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Student ID {editingResult ? '(Locked)' : '(Required)'}
            </label>
            <input
              type="text"
              required
              disabled={!!editingResult}
              value={studentIdInput}
              onChange={(e) => setStudentIdInput(e.target.value.toUpperCase())}
              placeholder="e.g. S001"
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm uppercase font-mono focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-100"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Test Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={testNameInput}
              onChange={(e) => setTestNameInput(e.target.value)}
              placeholder="e.g. Assessment Session"
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
            />
          </div>

          {/* Grade - REQUIRED SECTION */}
          <div className="p-3.5 bg-brand-50/40 rounded-xl border border-brand-100 space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-900">
                Grade <span className="text-rose-600">* Required</span>
              </label>
              <span className="text-[11px] text-slate-500">Pick one grade</span>
            </div>

            <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5 pt-1">
              {GRADE_OPTIONS.map((g) => {
                const isSelected = gradeInput === g;
                return (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setGradeInput(g)}
                    className={`py-2 px-1 text-center rounded-xl text-xs font-bold transition-all ${
                      isSelected
                        ? g === 'Retest'
                          ? 'bg-rose-600 text-white shadow-sm ring-2 ring-rose-600/30 scale-102'
                          : 'bg-brand-600 text-white shadow-sm ring-2 ring-brand-600/30 scale-102'
                        : g === 'Retest'
                        ? 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
                        : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {g}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Marks - OPTIONAL SECTION */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-slate-700">
                Marks <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <span className="text-[11px] text-slate-400">Leave blank if not applicable</span>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-1">Marks Obtained</label>
                <input
                  type="number"
                  min="0"
                  value={marksInput}
                  onChange={(e) => setMarksInput(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="Optional (e.g. 85)"
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm bg-white focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-1">Maximum Marks</label>
                <input
                  type="number"
                  min="1"
                  value={maxMarksInput}
                  onChange={(e) => setMaxMarksInput(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="Optional (e.g. 100)"
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm bg-white focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                />
              </div>
            </div>
          </div>

          {formError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="px-4 py-2.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={formLoading}
              className="px-5 py-2.5 text-xs font-semibold text-white bg-brand-600 rounded-xl hover:bg-brand-700 active:scale-98 shadow-xs disabled:opacity-50 transition-all"
            >
              {formLoading ? 'Saving...' : editingResult ? 'Update Result' : 'Publish Result'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Confirm Delete */}
      {deletingResult && (
        <ConfirmDialog
          isOpen={!!deletingResult}
          onClose={() => setDeletingResult(null)}
          onConfirm={handleDeleteConfirm}
          title="Delete Result Record?"
          message="Are you sure you want to permanently delete this examination result record?"
          confirmText="Yes, Delete Result"
          loading={deleteLoading}
        />
      )}
    </div>
  );
};
