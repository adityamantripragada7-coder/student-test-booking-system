import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { BookedStudentRecord, GradeType } from '../../types';
import { Badge } from '../../components/Badge';
import { Modal } from '../../components/Modal';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { TableSkeleton } from '../../components/Skeleton';
import { EmptyState } from '../../components/EmptyState';
import {
  Search,
  Edit2,
  Trash2,
  Award,
  AlertCircle,
  CheckCircle2,
  User,
  BookOpen,
  CalendarDays,
  Clock,
  Star,
  Layers,
  Send,
  CheckSquare,
  Square,
  Users,
  Filter,
  RefreshCw,
} from 'lucide-react';
import { formatTimeDisplay } from './Bookings';

export const GRADE_OPTIONS: GradeType[] = ['A+', 'A', 'B+', 'B', 'C+', 'C', 'D', 'Retest'];

export const AdminResults: React.FC = () => {
  const [records, setRecords] = useState<BookedStudentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState(''); // 'Published', 'Pending', or ''

  // Notification Toast
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Selection for bulk actions
  const [selectedBookingIds, setSelectedBookingIds] = useState<string[]>([]);

  // Single Result Modal State
  const [showSingleModal, setShowSingleModal] = useState(false);
  const [targetRecord, setTargetRecord] = useState<BookedStudentRecord | null>(null);
  const [singleMemoryGrade, setSingleMemoryGrade] = useState<GradeType | ''>('');
  const [singleMistakesGrade, setSingleMistakesGrade] = useState<GradeType | ''>('');
  const [singleModalError, setSingleModalError] = useState('');
  const [singleModalLoading, setSingleModalLoading] = useState(false);

  // Bulk Modal State
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkGrades, setBulkGrades] = useState<{ [bookingId: string]: { memoryGrade: GradeType | ''; mistakesGrade: GradeType | '' } }>({});
  const [bulkCommonMemory, setBulkCommonMemory] = useState<GradeType | ''>('');
  const [bulkCommonMistakes, setBulkCommonMistakes] = useState<GradeType | ''>('');
  const [bulkModalError, setBulkModalError] = useState('');
  const [bulkModalLoading, setBulkModalLoading] = useState(false);

  // Delete Result State
  const [deletingRecord, setDeletingRecord] = useState<BookedStudentRecord | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Stats
  const [totalCount, setTotalCount] = useState(0);
  const [publishedCount, setPublishedCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);

  const fetchBookedStudents = async (searchQuery = search, resultStatus = statusFilter) => {
    setLoading(true);
    try {
      const res = await api.get(
        `/results/booked-students?search=${encodeURIComponent(searchQuery)}&resultStatus=${encodeURIComponent(resultStatus)}`
      );
      if (res.success) {
        setRecords(res.records || []);
        setTotalCount(res.totalBookedStudents || (res.records ? res.records.length : 0));
        setPublishedCount(res.publishedCount || 0);
        setPendingCount(res.pendingCount || 0);
      } else {
        setNotification({ type: 'error', message: res.message || 'Failed to load booked students.' });
      }
    } catch (err: any) {
      setNotification({ type: 'error', message: 'Failed to connect to backend server.' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchBookedStudents(search, statusFilter);
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchBookedStudents(search, statusFilter);
  };

  // Toggle individual student selection
  const handleToggleSelect = (bookingId: string) => {
    setSelectedBookingIds((prev) =>
      prev.includes(bookingId) ? prev.filter((id) => id !== bookingId) : [...prev, bookingId]
    );
  };

  // Toggle select all
  const handleSelectAll = () => {
    if (selectedBookingIds.length === records.length) {
      setSelectedBookingIds([]);
    } else {
      setSelectedBookingIds(records.map((r) => r.bookingId));
    }
  };

  // Open single student publish/edit modal
  const openSingleModal = (record: BookedStudentRecord) => {
    setTargetRecord(record);
    setSingleMemoryGrade((record.memoryGrade as GradeType) || '');
    setSingleMistakesGrade((record.mistakesGrade as GradeType) || '');
    setSingleModalError('');
    setShowSingleModal(true);
  };

  // Submit single student result
  const handleSingleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSingleModalError('');

    // MANDATORY VALIDATION: Both Memory and Mistakes are compulsory
    if (!singleMemoryGrade || !singleMistakesGrade) {
      setSingleModalError('Please provide both mandatory results: Memory and Mistakes.');
      return;
    }

    if (!targetRecord) return;

    setSingleModalLoading(true);
    try {
      const payload = {
        studentDbId: targetRecord.studentDbId,
        studentId: targetRecord.studentId,
        bookingId: targetRecord.bookingId,
        slotId: targetRecord.slotId,
        testName: targetRecord.slotTitle || 'Assessment Session',
        memoryGrade: singleMemoryGrade,
        mistakesGrade: singleMistakesGrade,
        status: 'Published',
      };

      const res = await api.post('/results', payload);
      if (res.success) {
        setNotification({
          type: 'success',
          message: `Result successfully published for student ${targetRecord.studentName} (${targetRecord.studentId})!`,
        });
        setShowSingleModal(false);
        fetchBookedStudents(search, statusFilter);
      } else {
        setSingleModalError(res.message || 'Failed to publish student result.');
      }
    } catch (err: any) {
      setSingleModalError('Server connection error while publishing result.');
    } finally {
      setSingleModalLoading(false);
    }
  };

  // Open bulk publish modal for selected students
  const openBulkModal = () => {
    if (selectedBookingIds.length === 0) return;

    const initialBulk: { [bookingId: string]: { memoryGrade: GradeType | ''; mistakesGrade: GradeType | '' } } = {};
    for (const bId of selectedBookingIds) {
      const rec = records.find((r) => r.bookingId === bId);
      initialBulk[bId] = {
        memoryGrade: rec?.memoryGrade || '',
        mistakesGrade: rec?.mistakesGrade || '',
      };
    }
    setBulkGrades(initialBulk);
    setBulkCommonMemory('');
    setBulkCommonMistakes('');
    setBulkModalError('');
    setShowBulkModal(true);
  };

  // Apply common grade to all selected students in bulk modal
  const handleApplyCommonGrades = () => {
    if (!bulkCommonMemory && !bulkCommonMistakes) {
      setBulkModalError('Select at least one common grade to apply to all selected students.');
      return;
    }

    setBulkGrades((prev) => {
      const updated = { ...prev };
      for (const bId of selectedBookingIds) {
        updated[bId] = {
          memoryGrade: bulkCommonMemory ? bulkCommonMemory : updated[bId]?.memoryGrade || '',
          mistakesGrade: bulkCommonMistakes ? bulkCommonMistakes : updated[bId]?.mistakesGrade || '',
        };
      }
      return updated;
    });
    setBulkModalError('');
  };

  // Submit bulk results
  const handleBulkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBulkModalError('');

    // MANDATORY VALIDATION: Every single student in bulk list must have BOTH Memory and Mistakes
    const preparedList = [];
    for (const bId of selectedBookingIds) {
      const rec = records.find((r) => r.bookingId === bId);
      const studentGrades = bulkGrades[bId];

      if (!studentGrades?.memoryGrade || !studentGrades?.mistakesGrade) {
        setBulkModalError('Please provide both mandatory results: Memory and Mistakes for all selected students.');
        return;
      }

      preparedList.push({
        bookingId: bId,
        studentDbId: rec?.studentDbId,
        studentId: rec?.studentId,
        studentName: rec?.studentName,
        slotId: rec?.slotId,
        testName: rec?.slotTitle || 'Assessment Session',
        memoryGrade: studentGrades.memoryGrade,
        mistakesGrade: studentGrades.mistakesGrade,
      });
    }

    setBulkModalLoading(true);
    try {
      const res = await api.post('/results/bulk', { results: preparedList });
      if (res.success) {
        setNotification({
          type: 'success',
          message: res.message || `Results published successfully for ${preparedList.length} students across slots.`,
        });
        setShowBulkModal(false);
        setSelectedBookingIds([]);
        fetchBookedStudents(search, statusFilter);
      } else {
        setBulkModalError(res.message || 'Failed to publish bulk results.');
      }
    } catch (err: any) {
      setBulkModalError('Failed to publish bulk results. Please verify your connection.');
    } finally {
      setBulkModalLoading(false);
    }
  };

  // Handle delete result record
  const handleDeleteConfirm = async () => {
    if (!deletingRecord || !deletingRecord.resultId) return;
    setDeleteLoading(true);
    try {
      const res = await api.delete(`/results/${deletingRecord.resultId}`);
      if (res.success) {
        setNotification({ type: 'success', message: 'Result record deleted from database.' });
        setDeletingRecord(null);
        fetchBookedStudents(search, statusFilter);
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
    <div className="space-y-6 sm:space-y-8 animate-fade-in max-w-7xl mx-auto">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`p-4 rounded-2xl border flex items-center justify-between text-xs sm:text-sm font-medium shadow-sm transition-all ${
            notification.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          <div className="flex items-center space-x-2.5">
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            )}
            <span>{notification.message}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="text-slate-400 hover:text-slate-600 font-bold px-2 py-1"
          >
            &times;
          </button>
        </div>
      )}

      {/* Header Banner & Live Metrics */}
      <div className="bg-white p-6 sm:p-7 rounded-3xl border border-slate-200/90 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div>
          <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-brand-600 mb-1">
            <Award className="w-4 h-4" />
            <span>Centralized Assessment Management</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Student Results Management
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl">
            Publish and manage official <strong className="text-slate-800">Memory ⭐</strong> and{' '}
            <strong className="text-slate-800">Mistakes ⭐</strong> grades for all students who booked test slots across all sessions.
          </p>
        </div>

        {/* Quick Summary Badges */}
        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 shrink-0">
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl px-4 py-2.5 text-center min-w-[90px]">
            <span className="text-[10px] font-bold uppercase text-slate-400 block">Total Booked</span>
            <span className="text-base sm:text-lg font-extrabold text-slate-900">{totalCount}</span>
          </div>
          <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-2xl px-4 py-2.5 text-center min-w-[90px]">
            <span className="text-[10px] font-bold uppercase text-emerald-700 block">Published</span>
            <span className="text-base sm:text-lg font-extrabold text-emerald-800">{publishedCount}</span>
          </div>
          <div className="bg-amber-50/60 border border-amber-200/80 rounded-2xl px-4 py-2.5 text-center min-w-[90px]">
            <span className="text-[10px] font-bold uppercase text-amber-700 block">Pending</span>
            <span className="text-base sm:text-lg font-extrabold text-amber-800">{pendingCount}</span>
          </div>
        </div>
      </div>

      {/* Filter & Action Bar */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/90 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3.5">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
          {/* Search Field */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                fetchBookedStudents(e.target.value, statusFilter);
              }}
              placeholder="Search by student name, student ID, or slot..."
              className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm rounded-2xl border border-slate-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 bg-slate-50/60 transition-colors"
            />
          </div>

          {/* Status Filter */}
          <div className="flex items-center space-x-2">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                fetchBookedStudents(search, e.target.value);
              }}
              className="px-3.5 py-2.5 text-xs sm:text-sm rounded-2xl border border-slate-200 bg-white font-medium text-slate-700 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-colors w-full sm:w-auto"
            >
              <option value="">All Results (Published & Pending)</option>
              <option value="Published">Published Only</option>
              <option value="Pending">Pending (Not Published)</option>
            </select>

            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-2.5 text-slate-500 hover:text-brand-600 bg-slate-50 hover:bg-slate-100 rounded-2xl border border-slate-200/80 transition-colors"
              title="Refresh Records"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Bulk Action Button */}
        {selectedBookingIds.length > 0 && (
          <div className="flex items-center space-x-3 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
            <span className="text-xs font-semibold text-slate-600">
              {selectedBookingIds.length} student(s) selected
            </span>
            <button
              onClick={openBulkModal}
              className="inline-flex items-center justify-center space-x-2 px-4 py-2.5 text-xs sm:text-sm font-bold text-white bg-brand-600 hover:bg-brand-700 active:scale-98 rounded-2xl shadow-sm transition-all"
            >
              <Send className="w-4 h-4" />
              <span>Bulk Publish Results</span>
            </button>
          </div>
        )}
      </div>

      {/* Main Content Area: Students across ALL Booked Slots */}
      {loading ? (
        <TableSkeleton rows={6} cols={6} />
      ) : records.length === 0 ? (
        <EmptyState
          title="No Booked Students Found"
          description="There are currently no student slot bookings matching your search query or status filter."
        />
      ) : (
        <div className="space-y-4">
          {/* Table Header Controls (Select All) */}
          <div className="flex items-center justify-between px-2">
            <button
              onClick={handleSelectAll}
              className="inline-flex items-center space-x-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
            >
              {selectedBookingIds.length === records.length ? (
                <CheckSquare className="w-4 h-4 text-brand-600" />
              ) : (
                <Square className="w-4 h-4 text-slate-400" />
              )}
              <span>
                {selectedBookingIds.length === records.length ? 'Deselect All' : `Select All (${records.length})`}
              </span>
            </button>
            <span className="text-xs text-slate-400 font-medium">
              Showing students across all available slots
            </span>
          </div>

          {/* Mobile Card View (optimized for smartphones) */}
          <div className="grid grid-cols-1 gap-3 sm:hidden">
            {records.map((r) => {
              const isSelected = selectedBookingIds.includes(r.bookingId);
              const isPublished = r.resultStatus === 'Published';

              return (
                <div
                  key={r.bookingId}
                  className={`bg-white p-5 rounded-2xl border transition-all space-y-4 ${
                    isSelected ? 'border-brand-500 ring-2 ring-brand-500/10 shadow-sm' : 'border-slate-200/90 shadow-2xs'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start space-x-3">
                      <button
                        onClick={() => handleToggleSelect(r.bookingId)}
                        className="mt-1 text-slate-400 hover:text-brand-600"
                      >
                        {isSelected ? (
                          <CheckSquare className="w-5 h-5 text-brand-600" />
                        ) : (
                          <Square className="w-5 h-5" />
                        )}
                      </button>
                      <div className="space-y-1">
                        <div className="flex items-center space-x-1.5">
                          <User className="w-4 h-4 text-slate-400 shrink-0" />
                          <span className="font-bold text-slate-900 text-sm">{r.studentName}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="font-mono text-xs font-bold text-brand-700 bg-brand-50 px-2 py-0.5 rounded-md">
                            {r.studentId}
                          </span>
                          {r.studentPhone && (
                            <span className="text-[11px] text-slate-400">{r.studentPhone}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <Badge status={r.resultStatus} className="text-xs px-2.5 py-0.5 shrink-0" />
                  </div>

                  {/* Slot Information */}
                  <div className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-100 text-xs space-y-1.5">
                    <div className="flex items-center space-x-1.5 text-slate-800 font-semibold">
                      <BookOpen className="w-3.5 h-3.5 text-brand-600 shrink-0" />
                      <span className="truncate">{r.slotTitle}</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-600 text-[11px] pt-1 border-t border-slate-200/50">
                      <div className="flex items-center space-x-1">
                        <CalendarDays className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{r.slotDate}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{formatTimeDisplay(r.slotTime.split(' - ')[0])}</span>
                      </div>
                    </div>
                    <div className="text-[11px] text-indigo-700 font-medium">
                      Syllabus: {r.syllabus}
                    </div>
                  </div>

                  {/* Grades & Actions */}
                  <div className="grid grid-cols-2 gap-2 text-center">
                    <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                      <div className="flex items-center justify-center space-x-1 text-[11px] font-bold text-slate-600">
                        <span>MEMORY</span>
                        <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                      </div>
                      <div>
                        {r.memoryGrade ? (
                          <Badge status={r.memoryGrade} className="text-xs px-2.5 py-0.5" />
                        ) : (
                          <span className="text-[11px] text-amber-600 font-semibold bg-amber-50 px-2 py-0.5 rounded">
                            Pending
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                      <div className="flex items-center justify-center space-x-1 text-[11px] font-bold text-slate-600">
                        <span>MISTAKES</span>
                        <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                      </div>
                      <div>
                        {r.mistakesGrade ? (
                          <Badge status={r.mistakesGrade} className="text-xs px-2.5 py-0.5" />
                        ) : (
                          <span className="text-[11px] text-amber-600 font-semibold bg-amber-50 px-2 py-0.5 rounded">
                            Pending
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                    <span className="text-[11px] text-slate-400">
                      Booked: {new Date(r.bookingDate).toLocaleDateString()}
                    </span>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => openSingleModal(r)}
                        className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-xl text-xs font-bold text-brand-700 bg-brand-50 hover:bg-brand-100 transition-colors"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        <span>{isPublished ? 'Edit Result' : 'Publish Result'}</span>
                      </button>
                      {isPublished && r.resultId && (
                        <button
                          onClick={() => setDeletingRecord(r)}
                          className="p-1.5 rounded-xl text-rose-600 hover:bg-rose-50 transition-colors"
                          title="Delete Result"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop Table View */}
          <div className="hidden sm:block bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-slate-50/80 text-slate-500 font-bold uppercase text-[11px] tracking-wider border-b border-slate-200/80">
                  <tr>
                    <th className="px-5 py-4 w-10">
                      <input
                        type="checkbox"
                        checked={selectedBookingIds.length === records.length && records.length > 0}
                        onChange={handleSelectAll}
                        className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                      />
                    </th>
                    <th className="px-5 py-4">Student</th>
                    <th className="px-5 py-4">Booked Slot</th>
                    <th className="px-5 py-4">Booking Date</th>
                    <th className="px-5 py-4">Result Status</th>
                    <th className="px-5 py-4">
                      <span className="flex items-center space-x-1">
                        <span>Memory Grade</span>
                        <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                      </span>
                    </th>
                    <th className="px-5 py-4">
                      <span className="flex items-center space-x-1">
                        <span>Mistakes Grade</span>
                        <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                      </span>
                    </th>
                    <th className="px-5 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {records.map((r) => {
                    const isSelected = selectedBookingIds.includes(r.bookingId);
                    const isPublished = r.resultStatus === 'Published';

                    return (
                      <tr
                        key={r.bookingId}
                        className={`transition-colors ${isSelected ? 'bg-brand-50/40' : 'hover:bg-slate-50/60'}`}
                      >
                        <td className="px-5 py-4">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelect(r.bookingId)}
                            className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                          />
                        </td>
                        <td className="px-5 py-4">
                          <p className="font-bold text-slate-900">{r.studentName}</p>
                          <div className="flex items-center space-x-2 pt-0.5">
                            <span className="font-mono text-xs font-semibold text-brand-700 bg-brand-50 px-1.5 py-0.2 rounded">
                              {r.studentId}
                            </span>
                            {r.studentPhone && (
                              <span className="text-[11px] text-slate-400">{r.studentPhone}</span>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <p className="font-semibold text-slate-800">{r.slotTitle}</p>
                          <p className="text-xs text-slate-500">
                            {r.slotDate} &bull; {formatTimeDisplay(r.slotTime.split(' - ')[0])}
                          </p>
                          <span className="text-[11px] text-indigo-700 font-medium">
                            {r.syllabus}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-slate-500 text-xs font-medium">
                          {new Date(r.bookingDate).toLocaleDateString()}
                        </td>
                        <td className="px-5 py-4">
                          <Badge status={r.resultStatus} className="text-xs px-2.5 py-0.5" />
                        </td>
                        <td className="px-5 py-4">
                          {r.memoryGrade ? (
                            <Badge status={r.memoryGrade} className="text-xs px-2.5 py-0.5" />
                          ) : (
                            <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200/60">
                              Pending
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          {r.mistakesGrade ? (
                            <Badge status={r.mistakesGrade} className="text-xs px-2.5 py-0.5" />
                          ) : (
                            <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200/60">
                              Pending
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-4 text-right space-x-2">
                          <button
                            onClick={() => openSingleModal(r)}
                            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-brand-700 bg-brand-50 hover:bg-brand-100 active:scale-98 transition-all"
                            title={isPublished ? 'Edit Result' : 'Publish Result'}
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            <span>{isPublished ? 'Edit' : 'Publish'}</span>
                          </button>
                          {isPublished && r.resultId && (
                            <button
                              onClick={() => setDeletingRecord(r)}
                              className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                              title="Delete Result"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SINGLE STUDENT PUBLISH / UPDATE MODAL */}
      <Modal
        isOpen={showSingleModal}
        onClose={() => setShowSingleModal(false)}
        title={targetRecord?.resultStatus === 'Published' ? 'Update Student Result' : 'Publish Student Result'}
        maxWidth="lg"
      >
        {targetRecord && (
          <form onSubmit={handleSingleSubmit} className="space-y-5">
            {/* Student & Slot Summary Card */}
            <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200/80 space-y-2">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Candidate</span>
                  <h3 className="text-base font-extrabold text-slate-900">{targetRecord.studentName}</h3>
                </div>
                <span className="font-mono text-xs font-bold text-brand-700 bg-white border border-brand-200 px-2.5 py-1 rounded-lg">
                  {targetRecord.studentId}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 pt-1 border-t border-slate-200/60">
                <span><strong>Booked Slot:</strong> {targetRecord.slotTitle}</span>
                <span>&bull;</span>
                <span><strong>Date:</strong> {targetRecord.slotDate}</span>
                <span>&bull;</span>
                <span><strong>Syllabus:</strong> {targetRecord.syllabus}</span>
              </div>
            </div>

            {/* MANDATORY CATEGORY A: MEMORY ⭐ */}
            <div className="p-4 bg-gradient-to-br from-amber-50/30 to-slate-50 rounded-2xl border border-amber-200/80 space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-xs sm:text-sm font-extrabold text-slate-900 flex items-center space-x-1.5">
                  <span>MEMORY</span>
                  <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                  <span className="text-rose-600 font-bold ml-1">* Compulsory</span>
                </label>
                <span className="text-[11px] font-semibold text-slate-500">Pick one grade</span>
              </div>

              <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5 sm:gap-2 pt-1">
                {GRADE_OPTIONS.map((g) => {
                  const isSelected = singleMemoryGrade === g;
                  return (
                    <button
                      key={g}
                      type="button"
                      onClick={() => {
                        setSingleMemoryGrade(g);
                        setSingleModalError('');
                      }}
                      className={`py-2 px-1 text-center rounded-xl text-xs font-extrabold transition-all ${
                        isSelected
                          ? g === 'Retest'
                            ? 'bg-rose-600 text-white shadow-md ring-2 ring-rose-600/30 scale-105'
                            : 'bg-brand-600 text-white shadow-md ring-2 ring-brand-600/30 scale-105'
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

            {/* MANDATORY CATEGORY B: MISTAKES ⭐ */}
            <div className="p-4 bg-gradient-to-br from-indigo-50/30 to-slate-50 rounded-2xl border border-indigo-200/80 space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-xs sm:text-sm font-extrabold text-slate-900 flex items-center space-x-1.5">
                  <span>MISTAKES</span>
                  <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                  <span className="text-rose-600 font-bold ml-1">* Compulsory</span>
                </label>
                <span className="text-[11px] font-semibold text-slate-500">Pick one grade</span>
              </div>

              <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5 sm:gap-2 pt-1">
                {GRADE_OPTIONS.map((g) => {
                  const isSelected = singleMistakesGrade === g;
                  return (
                    <button
                      key={g}
                      type="button"
                      onClick={() => {
                        setSingleMistakesGrade(g);
                        setSingleModalError('');
                      }}
                      className={`py-2 px-1 text-center rounded-xl text-xs font-extrabold transition-all ${
                        isSelected
                          ? g === 'Retest'
                            ? 'bg-rose-600 text-white shadow-md ring-2 ring-rose-600/30 scale-105'
                            : 'bg-brand-600 text-white shadow-md ring-2 ring-brand-600/30 scale-105'
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

            {/* Validation Error Banner */}
            {singleModalError && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs sm:text-sm text-rose-700 font-medium flex items-center space-x-2.5">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{singleModalError}</span>
              </div>
            )}

            {/* Modal Action Buttons */}
            <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowSingleModal(false)}
                className="px-4 py-2.5 text-xs sm:text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={singleModalLoading || !singleMemoryGrade || !singleMistakesGrade}
                className="px-5 py-2.5 text-xs sm:text-sm font-bold text-white bg-brand-600 rounded-xl hover:bg-brand-700 active:scale-98 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {singleModalLoading
                  ? 'Saving...'
                  : targetRecord.resultStatus === 'Published'
                  ? 'Update Result'
                  : 'Publish Result'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* BULK PUBLISH RESULTS MODAL (ALL SELECTED STUDENTS ACROSS SLOTS) */}
      <Modal
        isOpen={showBulkModal}
        onClose={() => setShowBulkModal(false)}
        title={`Bulk Publish Results (${selectedBookingIds.length} Students)`}
        maxWidth="2xl"
      >
        <form onSubmit={handleBulkSubmit} className="space-y-6">
          <p className="text-xs sm:text-sm text-slate-500">
            Enter both <strong className="text-slate-800">Memory ⭐</strong> and{' '}
            <strong className="text-slate-800">Mistakes ⭐</strong> grades for all selected students across different slots.
          </p>

          {/* Quick Apply Helper */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
            <span className="text-xs font-bold text-slate-800 block">
              Quick Apply to All {selectedBookingIds.length} Students:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-500 block mb-1">Common Memory Grade</label>
                <select
                  value={bulkCommonMemory}
                  onChange={(e) => setBulkCommonMemory(e.target.value as GradeType)}
                  className="w-full text-xs font-medium py-2 px-3 rounded-xl border border-slate-300 bg-white"
                >
                  <option value="">Select Grade...</option>
                  {GRADE_OPTIONS.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-500 block mb-1">Common Mistakes Grade</label>
                <select
                  value={bulkCommonMistakes}
                  onChange={(e) => setBulkCommonMistakes(e.target.value as GradeType)}
                  className="w-full text-xs font-medium py-2 px-3 rounded-xl border border-slate-300 bg-white"
                >
                  <option value="">Select Grade...</option>
                  {GRADE_OPTIONS.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-end">
                <button
                  type="button"
                  onClick={handleApplyCommonGrades}
                  className="w-full py-2 px-3 text-xs font-bold text-brand-700 bg-brand-50 hover:bg-brand-100 rounded-xl border border-brand-200 transition-colors"
                >
                  Apply to All
                </button>
              </div>
            </div>
          </div>

          {/* Individual Entries in Bulk List */}
          <div className="max-h-96 overflow-y-auto space-y-3 pr-1 divide-y divide-slate-100">
            {selectedBookingIds.map((bId) => {
              const rec = records.find((r) => r.bookingId === bId);
              if (!rec) return null;
              const cur = bulkGrades[bId] || { memoryGrade: '', mistakesGrade: '' };

              return (
                <div key={bId} className="pt-3 first:pt-0 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm font-bold text-slate-900">{rec.studentName}</span>
                      <span className="font-mono text-xs text-brand-600 bg-brand-50 px-1.5 py-0.5 rounded ml-2">
                        {rec.studentId}
                      </span>
                    </div>
                    <span className="text-xs text-slate-500 font-medium">{rec.slotTitle} ({rec.slotDate})</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 flex items-center space-x-1 mb-1">
                        <span>Memory Grade</span>
                        <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                        <span className="text-rose-500 font-normal">*</span>
                      </label>
                      <select
                        value={cur.memoryGrade}
                        onChange={(e) =>
                          setBulkGrades((prev) => ({
                            ...prev,
                            [bId]: { ...prev[bId], memoryGrade: e.target.value as GradeType },
                          }))
                        }
                        className="w-full text-xs font-bold py-2 px-3 rounded-xl border border-slate-300 bg-white focus:border-brand-500"
                        required
                      >
                        <option value="">Select Memory Grade...</option>
                        {GRADE_OPTIONS.map((g) => (
                          <option key={g} value={g}>
                            Grade {g}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-700 flex items-center space-x-1 mb-1">
                        <span>Mistakes Grade</span>
                        <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                        <span className="text-rose-500 font-normal">*</span>
                      </label>
                      <select
                        value={cur.mistakesGrade}
                        onChange={(e) =>
                          setBulkGrades((prev) => ({
                            ...prev,
                            [bId]: { ...prev[bId], mistakesGrade: e.target.value as GradeType },
                          }))
                        }
                        className="w-full text-xs font-bold py-2 px-3 rounded-xl border border-slate-300 bg-white focus:border-brand-500"
                        required
                      >
                        <option value="">Select Mistakes Grade...</option>
                        {GRADE_OPTIONS.map((g) => (
                          <option key={g} value={g}>
                            Grade {g}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Bulk Validation Error */}
          {bulkModalError && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs sm:text-sm text-rose-700 font-medium flex items-center space-x-2.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{bulkModalError}</span>
            </div>
          )}

          {/* Modal Actions */}
          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowBulkModal(false)}
              className="px-4 py-2.5 text-xs sm:text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={bulkModalLoading}
              className="px-5 py-2.5 text-xs sm:text-sm font-bold text-white bg-brand-600 rounded-xl hover:bg-brand-700 active:scale-98 shadow-sm disabled:opacity-50 transition-all"
            >
              {bulkModalLoading ? 'Publishing...' : `Publish Results for ${selectedBookingIds.length} Students`}
            </button>
          </div>
        </form>
      </Modal>

      {/* CONFIRM DELETE MODAL */}
      {deletingRecord && (
        <ConfirmDialog
          isOpen={!!deletingRecord}
          onClose={() => setDeletingRecord(null)}
          onConfirm={handleDeleteConfirm}
          title="Delete Student Result?"
          message={`Are you sure you want to permanently delete the published result for student "${deletingRecord.studentName}" (${deletingRecord.studentId})? The status will revert to Pending.`}
          confirmText="Yes, Delete Result"
          loading={deleteLoading}
        />
      )}
    </div>
  );
};
