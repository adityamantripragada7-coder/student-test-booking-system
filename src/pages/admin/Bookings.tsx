import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../../api/client';
import { Booking, Result, GradeType, Pagination as PaginationType } from '../../types';
import { Badge } from '../../components/Badge';
import { Modal } from '../../components/Modal';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { Pagination } from '../../components/Pagination';
import { TableSkeleton } from '../../components/Skeleton';
import { EmptyState } from '../../components/EmptyState';
import {
  Search,
  Calendar,
  XCircle,
  AlertCircle,
  CheckCircle2,
  Copy,
  Check,
  Award,
  Clock,
  Users,
  LayoutGrid,
  List,
  Sparkles,
  BookOpen,
  Phone,
} from 'lucide-react';

const GRADE_OPTIONS: GradeType[] = ['A+', 'A', 'B+', 'B', 'C+', 'C', 'Retest'];

export const formatTimeDisplay = (timeStr?: string): string => {
  if (!timeStr) return 'Unscheduled Time';
  const parts = timeStr.trim().split(':');
  let hours = parseInt(parts[0], 10);
  const minutes = parts[1] || '00';
  if (isNaN(hours)) return timeStr;
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  return `${hours}:${minutes} ${ampm}`;
};

export const AdminBookings: React.FC = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [existingResults, setExistingResults] = useState<Result[]>([]);
  const [pagination, setPagination] = useState<PaginationType>({ total: 0, page: 1, limit: 50, pages: 1 });
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [viewMode, setViewMode] = useState<'categorized' | 'flat'>('categorized');

  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Cancel Booking Modal State
  const [cancellingBooking, setCancellingBooking] = useState<Booking | null>(null);
  const [cancelLoading, setCancelLoading] = useState(false);

  // Post Result Modal State
  const [showResultModal, setShowResultModal] = useState(false);
  const [resultTargetBooking, setResultTargetBooking] = useState<Booking | null>(null);
  const [resultStudentId, setResultStudentId] = useState('');
  const [resultStudentName, setResultStudentName] = useState('');
  const [resultTestName, setResultTestName] = useState('');
  const [resultGrade, setResultGrade] = useState<GradeType>('A+');
  const [resultMarks, setResultMarks] = useState<number | ''>('');
  const [resultMaxMarks, setResultMaxMarks] = useState<number | ''>('');
  const [resultFormError, setResultFormError] = useState('');
  const [resultLoading, setResultLoading] = useState(false);

  const fetchBookings = async (page = 1, searchQuery = search, status = statusFilter, date = dateFilter) => {
    setLoading(true);
    try {
      const [bookingsRes, resultsRes] = await Promise.all([
        api.get(
          `/bookings?page=${page}&limit=50&search=${encodeURIComponent(searchQuery)}&status=${encodeURIComponent(
            status
          )}&date=${encodeURIComponent(date)}`
        ),
        api.get('/results?limit=100'),
      ]);

      if (bookingsRes.success) {
        setBookings(bookingsRes.bookings);
        setPagination(bookingsRes.pagination);
      } else {
        setNotification({ type: 'error', message: bookingsRes.message || 'Failed to load bookings' });
      }

      if (resultsRes.success && resultsRes.results) {
        setExistingResults(resultsRes.results);
      }
    } catch (err: any) {
      setNotification({ type: 'error', message: 'Failed to connect to server' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings(1, search, statusFilter, dateFilter);
  }, []);

  // Map of studentId -> latest result
  const resultsByStudentId = useMemo(() => {
    const map: Record<string, Result> = {};
    for (const r of existingResults) {
      const student = typeof r.student === 'object' ? r.student : null;
      if (student?.studentId) {
        map[student.studentId.toUpperCase()] = r;
      }
    }
    return map;
  }, [existingResults]);

  // Group bookings by Slot Start Time (e.g., 06:00, 12:00)
  const groupedBookings = useMemo(() => {
    const groups: Record<
      string,
      {
        rawTime: string;
        displayTime: string;
        bookings: Booking[];
      }
    > = {};

    for (const b of bookings) {
      const slot = typeof b.slot === 'object' ? b.slot : null;
      const rawTime = slot?.startTime ? slot.startTime.trim() : '00:00';
      const key = rawTime;

      if (!groups[key]) {
        groups[key] = {
          rawTime,
          displayTime: formatTimeDisplay(rawTime),
          bookings: [],
        };
      }
      groups[key].bookings.push(b);
    }

    // Sort sections chronologically
    return Object.values(groups).sort((a, b) => a.rawTime.localeCompare(b.rawTime));
  }, [bookings]);

  // Copy individual booking details
  const handleCopyBooking = (booking: Booking) => {
    const student = typeof booking.student === 'object' ? booking.student : null;
    const studentName = student?.name || 'Unknown Student';
    const studentId = student?.studentId || 'N/A';
    const syllabus = booking.syllabus || 'General Syllabus';
    const phone = student?.phone || 'N/A';

    const textToCopy = `Name : ${studentName}\nStudent Id: ${studentId}\nSyllabus : ${syllabus}\nPhone number : ${phone}`;

    navigator.clipboard
      .writeText(textToCopy)
      .then(() => {
        setCopiedId(booking._id);
        setNotification({
          type: 'success',
          message: `Copied details for ${studentName} to clipboard!`,
        });
        setTimeout(() => setCopiedId(null), 2000);
      })
      .catch(() => {
        setNotification({ type: 'error', message: 'Failed to copy to clipboard' });
      });
  };

  // Copy all bookings in a time section
  const handleCopySection = (displayTime: string, sectionBookings: Booking[]) => {
    const entries = sectionBookings.map((b) => {
      const student = typeof b.student === 'object' ? b.student : null;
      const studentName = student?.name || 'Unknown Student';
      const studentId = student?.studentId || 'N/A';
      const syllabus = b.syllabus || 'General Syllabus';
      const phone = student?.phone || 'N/A';
      return `Name : ${studentName}\nStudent Id: ${studentId}\nSyllabus : ${syllabus}\nPhone number : ${phone}`;
    });

    const fullText = entries.join('\n\n');

    navigator.clipboard
      .writeText(fullText)
      .then(() => {
        setNotification({
          type: 'success',
          message: `Copied details of ${sectionBookings.length} students for ${displayTime}!`,
        });
      })
      .catch(() => {
        setNotification({ type: 'error', message: 'Failed to copy section details' });
      });
  };

  // Open "Post Result" Modal
  const openPostResultModal = (booking: Booking) => {
    const student = typeof booking.student === 'object' ? booking.student : null;
    const slot = typeof booking.slot === 'object' ? booking.slot : null;

    setResultTargetBooking(booking);
    setResultStudentId(student ? student.studentId : '');
    setResultStudentName(student ? student.name : '');

    const syllabusName = booking.syllabus || 'Assessment Session';
    const defaultTestName = slot?.testDate
      ? `${syllabusName} (${slot.testDate})`
      : `${syllabusName}`;
    setResultTestName(defaultTestName);

    // If an existing result exists, prefill its grade/marks
    const existing = student ? resultsByStudentId[student.studentId.toUpperCase()] : null;
    if (existing) {
      setResultGrade(existing.grade);
      setResultMarks(existing.marksObtained ?? '');
      setResultMaxMarks(existing.maxMarks ?? '');
      setResultTestName(existing.testName);
    } else {
      setResultGrade('A+');
      setResultMarks('');
      setResultMaxMarks('');
    }

    setResultFormError('');
    setShowResultModal(true);
  };

  // Submit Result
  const handleResultSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setResultFormError('');

    if (!resultTestName.trim()) {
      setResultFormError('Test name is required.');
      return;
    }

    if (!resultGrade || !GRADE_OPTIONS.includes(resultGrade)) {
      setResultFormError('Please select a required Grade (A+, A, B+, B, C+, C, Retest).');
      return;
    }

    if (resultMarks !== '' && Number(resultMarks) < 0) {
      setResultFormError('Marks obtained cannot be negative.');
      return;
    }

    if (resultMaxMarks !== '' && Number(resultMaxMarks) <= 0) {
      setResultFormError('Max marks must be greater than 0.');
      return;
    }

    if (resultMarks !== '' && resultMaxMarks !== '' && Number(resultMarks) > Number(resultMaxMarks)) {
      setResultFormError('Marks obtained cannot exceed maximum marks.');
      return;
    }

    setResultLoading(true);
    try {
      const payload = {
        studentId: resultStudentId.trim().toUpperCase(),
        testName: resultTestName.trim(),
        marksObtained: resultMarks === '' ? null : Number(resultMarks),
        maxMarks: resultMaxMarks === '' ? null : Number(resultMaxMarks),
        grade: resultGrade,
      };

      const res = await api.post('/results', payload);
      if (res.success) {
        setNotification({
          type: 'success',
          message: `Result (${resultGrade}) published successfully for ${resultStudentName} (${resultStudentId})!`,
        });
        setShowResultModal(false);
        fetchBookings(pagination.page);
      } else {
        setResultFormError(res.message || 'Failed to publish result.');
      }
    } catch (err: any) {
      setResultFormError('Server error while publishing result.');
    } finally {
      setResultLoading(false);
    }
  };

  const handleCancelConfirm = async () => {
    if (!cancellingBooking) return;
    setCancelLoading(true);
    try {
      const res = await api.post(`/bookings/cancel/${cancellingBooking._id}`);
      if (res.success) {
        setNotification({ type: 'success', message: 'Booking cancelled. Seat capacity released.' });
        setCancellingBooking(null);
        fetchBookings(pagination.page);
      } else {
        setNotification({ type: 'error', message: res.message || 'Failed to cancel booking.' });
      }
    } catch (err: any) {
      setNotification({ type: 'error', message: 'Error cancelling booking.' });
    } finally {
      setCancelLoading(false);
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
          <h1 className="text-xl font-bold text-slate-900">Student Booking Management</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Bookings categorized by slot start time (e.g. 6:00 AM, 12:00 PM) with one-click result posting.
          </p>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl self-start sm:self-auto border border-slate-200/80">
          <button
            onClick={() => setViewMode('categorized')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              viewMode === 'categorized'
                ? 'bg-white text-brand-700 shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>By Time Section</span>
          </button>
          <button
            onClick={() => setViewMode('flat')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              viewMode === 'flat'
                ? 'bg-white text-brand-700 shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <List className="w-3.5 h-3.5" />
            <span>Table View</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Controls */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
          {/* Search Input */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                fetchBookings(1, e.target.value, statusFilter, dateFilter);
              }}
              placeholder="Search student ID or Name..."
              className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-300 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 bg-slate-50/50"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              fetchBookings(1, search, e.target.value, dateFilter);
            }}
            className="w-full sm:w-40 px-3 py-2 text-xs rounded-xl border border-slate-300 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 bg-white"
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="cancelled">Cancelled</option>
            <option value="completed">Completed</option>
          </select>

          {/* Date Filter */}
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => {
              setDateFilter(e.target.value);
              fetchBookings(1, search, statusFilter, e.target.value);
            }}
            className="w-full sm:w-40 px-3 py-2 text-xs rounded-xl border border-slate-300 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 bg-white"
          />

          {(search || statusFilter || dateFilter) && (
            <button
              onClick={() => {
                setSearch('');
                setStatusFilter('');
                setDateFilter('');
                fetchBookings(1, '', '', '');
              }}
              className="text-xs text-rose-600 hover:underline font-medium px-2 py-1"
            >
              Clear Filters
            </button>
          )}
        </div>

        <span className="text-xs text-slate-500 font-medium self-end md:self-center">
          Total Bookings: <strong className="text-slate-800">{pagination.total}</strong>
        </span>
      </div>

      {/* Bookings Content */}
      {loading ? (
        <TableSkeleton rows={6} cols={5} />
      ) : bookings.length === 0 ? (
        <EmptyState
          title="No Bookings Found"
          description="No student test bookings match the specified criteria."
        />
      ) : viewMode === 'categorized' ? (
        /* TIME CATEGORIZED VIEW: e.g. 6:00 AM Section, 12:00 PM Section */
        <div className="space-y-6">
          {groupedBookings.map((group) => (
            <div
              key={group.rawTime}
              className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden"
            >
              {/* Section Header */}
              <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-50 to-brand-50/30 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center space-x-3">
                  <div className="p-2.5 rounded-xl bg-brand-600 text-white shadow-xs">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h2 className="text-base font-bold text-slate-900 tracking-tight">
                        {group.displayTime} Session Bookings
                      </h2>
                      <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-brand-100 text-brand-800 border border-brand-200">
                        {group.bookings.length} {group.bookings.length === 1 ? 'Student' : 'Students'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Assigned examination session starting at {group.displayTime}
                    </p>
                  </div>
                </div>

                {/* Section Action: Copy All */}
                <button
                  onClick={() => handleCopySection(group.displayTime, group.bookings)}
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 hover:text-brand-600 active:scale-98 shadow-2xs transition-all self-start sm:self-auto"
                  title={`Copy all student booking details for ${group.displayTime}`}
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy All ({group.bookings.length})</span>
                </button>
              </div>

              {/* Bookings inside this Time Section */}
              <div className="divide-y divide-slate-100">
                {group.bookings.map((booking) => {
                  const student = typeof booking.student === 'object' ? booking.student : null;
                  const slot = typeof booking.slot === 'object' ? booking.slot : null;
                  const studentId = student?.studentId?.toUpperCase() || '';
                  const existingResult = studentId ? resultsByStudentId[studentId] : null;
                  const isCopied = copiedId === booking._id;

                  return (
                    <div
                      key={booking._id}
                      className="p-4 sm:px-6 sm:py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 hover:bg-slate-50/60 transition-colors"
                    >
                      {/* Student Info & Slot Date */}
                      <div className="space-y-1.5 flex-1">
                        <div className="flex items-center flex-wrap gap-2">
                          <span className="font-bold text-slate-900 text-sm">{student?.name || 'Unknown Student'}</span>
                          <span className="font-mono text-xs text-brand-700 bg-brand-50 border border-brand-200/80 px-2 py-0.5 rounded-md font-semibold">
                            {student?.studentId}
                          </span>
                          <span className="inline-flex items-center space-x-1 font-mono text-[11px] text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md font-semibold" title="Student Mobile Number">
                            <Phone className="w-3 h-3 text-emerald-600" />
                            <span>{student?.phone || 'No phone'}</span>
                          </span>
                          <Badge status={booking.status} className="text-[11px]" />
                        </div>

                        <div className="flex items-center flex-wrap gap-x-3 gap-y-1.5 text-xs text-slate-600">
                          {/* Test Syllabus Badge */}
                          <div className="inline-flex items-center space-x-1.5 font-bold text-indigo-950 bg-indigo-50/90 border border-indigo-200 px-2.5 py-0.5 rounded-md">
                            <BookOpen className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                            <span>Syllabus: {booking.syllabus || 'General Syllabus'}</span>
                          </div>

                          {/* Date & Time Slot */}
                          <div className="flex items-center space-x-1 font-medium text-slate-700">
                            <Calendar className="w-3.5 h-3.5 text-brand-600" />
                            <span>Date: {slot?.testDate || 'N/A'}</span>
                          </div>

                          <div className="flex items-center space-x-1 font-semibold text-brand-700 bg-brand-50/80 px-2 py-0.5 rounded border border-brand-200/60">
                            <Clock className="w-3.5 h-3.5 text-brand-600" />
                            <span>Slot: {formatTimeDisplay(slot?.startTime)}</span>
                          </div>

                          <span className="text-slate-300">•</span>
                          <span className="text-slate-400">Booked: {new Date(booking.bookedAt || booking.createdAt).toLocaleDateString()}</span>

                          {existingResult && (
                            <>
                              <span className="text-slate-300">•</span>
                              <span className="inline-flex items-center space-x-1 font-semibold text-emerald-700">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Published: Grade {existingResult.grade}</span>
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Actions: Post Result, Copy Icon, Cancel */}
                      <div className="flex items-center space-x-2 self-end sm:self-auto">
                        {/* Copy Icon Button */}
                        <button
                          onClick={() => handleCopyBooking(booking)}
                          className={`p-2 rounded-xl border transition-all ${
                            isCopied
                              ? 'bg-emerald-50 border-emerald-300 text-emerald-700 scale-105'
                              : 'bg-white border-slate-200 text-slate-600 hover:text-brand-600 hover:bg-brand-50/50 hover:border-brand-200'
                          }`}
                          title="Copy test booking details"
                        >
                          {isCopied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                        </button>

                        {/* Post Result Button */}
                        <button
                          onClick={() => openPostResultModal(booking)}
                          className={`inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-semibold shadow-xs transition-all active:scale-98 ${
                            existingResult
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                              : 'bg-brand-600 text-white hover:bg-brand-700 ring-1 ring-brand-700/20'
                          }`}
                        >
                          <Award className="w-3.5 h-3.5" />
                          <span>{existingResult ? `Result: ${existingResult.grade}` : 'Post Result'}</span>
                        </button>

                        {/* Cancel Booking (if active) */}
                        {booking.status === 'active' && (
                          <button
                            onClick={() => setCancellingBooking(booking)}
                            className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-colors"
                            title="Cancel Booking"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* FLAT TABLE VIEW */
        <div className="space-y-4">
          {/* Mobile Cards */}
          <div className="grid grid-cols-1 gap-3 sm:hidden">
            {bookings.map((booking) => {
              const student = typeof booking.student === 'object' ? booking.student : null;
              const slot = typeof booking.slot === 'object' ? booking.slot : null;
              const studentId = student?.studentId?.toUpperCase() || '';
              const existingResult = studentId ? resultsByStudentId[studentId] : null;
              const isCopied = copiedId === booking._id;

              return (
                <div
                  key={booking._id}
                  className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-slate-900 text-sm">{student?.name || 'Unknown Student'}</p>
                      <div className="flex items-center space-x-2 mt-0.5">
                        <span className="font-mono text-xs text-brand-600 bg-brand-50 px-2 py-0.5 rounded-md inline-block font-semibold">
                          {student?.studentId}
                        </span>
                        <span className="inline-flex items-center space-x-1 font-mono text-[10px] text-emerald-800 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded font-semibold" title="Mobile Number">
                          <Phone className="w-3 h-3 text-emerald-600" />
                          <span>{student?.phone || 'No phone'}</span>
                        </span>
                      </div>
                    </div>
                    <Badge status={booking.status} />
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs space-y-2">
                    {/* Test Syllabus */}
                    <div className="flex items-center space-x-1.5 text-indigo-950 font-bold bg-indigo-50/80 p-2 rounded-lg border border-indigo-200/70">
                      <BookOpen className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                      <span>Syllabus: {booking.syllabus || 'General Syllabus'}</span>
                    </div>

                    <div className="flex items-center justify-between text-slate-700 font-medium">
                      <div className="flex items-center space-x-1">
                        <Calendar className="w-3.5 h-3.5 text-brand-600" />
                        <span>Date: {slot?.testDate}</span>
                      </div>
                      <div className="flex items-center space-x-1 text-brand-700 font-bold bg-brand-50 px-2 py-0.5 rounded border border-brand-200/60">
                        <Clock className="w-3.5 h-3.5 text-brand-600" />
                        <span>Slot: {formatTimeDisplay(slot?.startTime)}</span>
                      </div>
                    </div>

                    <p className="text-[11px] text-slate-400 pt-0.5">
                      Booked on: {new Date(booking.bookedAt || booking.createdAt).toLocaleDateString()}
                    </p>
                    {existingResult && (
                      <p className="text-[11px] font-semibold text-emerald-700">
                        ✓ Published Grade: {existingResult.grade}
                      </p>
                    )}
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                    <button
                      onClick={() => handleCopyBooking(booking)}
                      className={`p-2 rounded-xl border transition-all ${
                        isCopied
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                          : 'bg-white border-slate-200 text-slate-600'
                      }`}
                      title="Copy booking details"
                    >
                      {isCopied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                    </button>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => openPostResultModal(booking)}
                        className={`inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl shadow-xs transition-colors ${
                          existingResult
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-brand-600 text-white hover:bg-brand-700'
                        }`}
                      >
                        <Award className="w-3.5 h-3.5" />
                        <span>{existingResult ? `Result: ${existingResult.grade}` : 'Post Result'}</span>
                      </button>

                      {booking.status === 'active' && (
                        <button
                          onClick={() => setCancellingBooking(booking)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop Table */}
          <div className="hidden sm:block bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-semibold uppercase border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4">Student & ID</th>
                    <th className="px-6 py-4">Test Syllabus</th>
                    <th className="px-6 py-4">Session Date & Time</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Booking Date</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {bookings.map((booking) => {
                    const student = typeof booking.student === 'object' ? booking.student : null;
                    const slot = typeof booking.slot === 'object' ? booking.slot : null;
                    const studentId = student?.studentId?.toUpperCase() || '';
                    const existingResult = studentId ? resultsByStudentId[studentId] : null;
                    const isCopied = copiedId === booking._id;

                    return (
                      <tr key={booking._id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-6 py-4">
                          <p className="font-semibold text-slate-900">{student?.name || 'Unknown Student'}</p>
                          <div className="flex items-center space-x-1.5 mt-0.5">
                            <span className="font-mono text-[11px] font-semibold text-brand-700 bg-brand-50 px-1.5 py-0.5 rounded">
                              {student?.studentId}
                            </span>
                            <span className="inline-flex items-center space-x-1 font-mono text-[11px] text-emerald-800 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded font-medium" title="Mobile Number">
                              <Phone className="w-3 h-3 text-emerald-600" />
                              <span>{student?.phone || 'No phone'}</span>
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="inline-flex items-center space-x-1.5 font-bold text-indigo-950 bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded-lg text-xs">
                            <BookOpen className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                            <span>{booking.syllabus || 'General Syllabus'}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-2 font-semibold text-slate-800">
                            <Calendar className="w-3.5 h-3.5 text-brand-600" />
                            <span>{slot?.testDate}</span>
                            <span className="text-slate-300">•</span>
                            <span className="text-brand-700 bg-brand-50 px-2 py-0.5 rounded text-[11px] border border-brand-200/60">
                              {formatTimeDisplay(slot?.startTime)}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <Badge status={booking.status} />
                        </td>
                        <td className="px-6 py-4 text-slate-500">
                          {new Date(booking.bookedAt || booking.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-right space-x-2">
                          {/* Copy Icon Button */}
                          <button
                            onClick={() => handleCopyBooking(booking)}
                            className={`p-1.5 rounded-lg border transition-all inline-flex items-center ${
                              isCopied
                                ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                                : 'bg-white border-slate-200 text-slate-500 hover:text-brand-600 hover:bg-brand-50'
                            }`}
                            title="Copy test booking details"
                          >
                            {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>

                          {/* Post Result Button */}
                          <button
                            onClick={() => openPostResultModal(booking)}
                            className={`inline-flex items-center space-x-1 px-3 py-1.5 text-xs font-semibold rounded-lg shadow-xs transition-colors ${
                              existingResult
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                                : 'bg-brand-600 text-white hover:bg-brand-700'
                            }`}
                          >
                            <Award className="w-3.5 h-3.5" />
                            <span>{existingResult ? `Grade: ${existingResult.grade}` : 'Post Result'}</span>
                          </button>

                          {booking.status === 'active' && (
                            <button
                              onClick={() => setCancellingBooking(booking)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                              title="Cancel Booking"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <Pagination
              pagination={pagination}
              onPageChange={(p) => fetchBookings(p, search, statusFilter, dateFilter)}
            />
          </div>
        </div>
      )}

      {/* Post Result Modal */}
      <Modal
        isOpen={showResultModal}
        onClose={() => setShowResultModal(false)}
        title="Post Assessment Result"
        maxWidth="md"
      >
        <form onSubmit={handleResultSubmit} className="space-y-4">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-xs space-y-1">
            <span className="text-slate-400 block text-[11px]">Student Information</span>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-slate-900 text-sm">{resultStudentName}</span>
              <span className="font-mono text-xs font-semibold text-brand-700 bg-brand-50 border border-brand-200 px-2 py-0.5 rounded">
                {resultStudentId}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Test Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={resultTestName}
              onChange={(e) => setResultTestName(e.target.value)}
              placeholder="e.g. Assessment Session"
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
            />
          </div>

          {/* Grade - Required */}
          <div className="p-3.5 bg-brand-50/40 rounded-xl border border-brand-100 space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-900">
                Grade <span className="text-rose-600">* Required</span>
              </label>
              <span className="text-[11px] text-slate-500">Pick one grade</span>
            </div>

            <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5 pt-1">
              {GRADE_OPTIONS.map((g) => {
                const isSelected = resultGrade === g;
                return (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setResultGrade(g)}
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

          {/* Marks - Optional */}
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
                  value={resultMarks}
                  onChange={(e) => setResultMarks(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="Optional (e.g. 85)"
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm bg-white focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-1">Maximum Marks</label>
                <input
                  type="number"
                  min="1"
                  value={resultMaxMarks}
                  onChange={(e) => setResultMaxMarks(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="Optional (e.g. 100)"
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm bg-white focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                />
              </div>
            </div>
          </div>

          {resultFormError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{resultFormError}</span>
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowResultModal(false)}
              className="px-4 py-2.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={resultLoading}
              className="px-5 py-2.5 text-xs font-semibold text-white bg-brand-600 rounded-xl hover:bg-brand-700 active:scale-98 shadow-xs disabled:opacity-50 transition-all"
            >
              {resultLoading ? 'Publishing...' : 'Publish Result'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Cancel Confirmation Modal */}
      {cancellingBooking && (
        <ConfirmDialog
          isOpen={!!cancellingBooking}
          onClose={() => setCancellingBooking(null)}
          onConfirm={handleCancelConfirm}
          title="Cancel Student Booking?"
          message="Are you sure you want to cancel this student's test slot booking? The seat will immediately be released back to the slot capacity."
          confirmText="Yes, Cancel Booking"
          loading={cancelLoading}
        />
      )}
    </div>
  );
};
