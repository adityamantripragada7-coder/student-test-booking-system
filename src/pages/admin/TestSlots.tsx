import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../../api/client';
import { TestSlot, Booking, Result, GradeType, Pagination as PaginationType } from '../../types';
import { Badge } from '../../components/Badge';
import { Modal } from '../../components/Modal';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { Pagination } from '../../components/Pagination';
import { TableSkeleton } from '../../components/Skeleton';
import { EmptyState } from '../../components/EmptyState';
import {
  PlusCircle,
  Search,
  Edit2,
  Trash2,
  Calendar,
  Clock,
  Users,
  AlertCircle,
  CheckCircle2,
  Copy,
  Check,
  Award,
  LayoutGrid,
  List,
  BookOpen,
  Phone,
} from 'lucide-react';
import { formatTimeDisplay } from './Bookings';

const GRADE_OPTIONS: GradeType[] = ['A+', 'A', 'B+', 'B', 'C+', 'C', 'Retest'];

export const AdminTestSlots: React.FC = () => {
  const [slots, setSlots] = useState<TestSlot[]>([]);
  const [pagination, setPagination] = useState<PaginationType>({ total: 0, page: 1, limit: 10, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [viewMode, setViewMode] = useState<'categorized' | 'flat'>('categorized');

  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [copiedSlotId, setCopiedSlotId] = useState<string | null>(null);
  const [copiedBookingId, setCopiedBookingId] = useState<string | null>(null);

  // Modal State for Slot Create / Edit
  const [showModal, setShowModal] = useState(false);
  const [editingSlot, setEditingSlot] = useState<TestSlot | null>(null);

  const [dateInput, setDateInput] = useState('');
  const [startTimeInput, setStartTimeInput] = useState('');
  const [capacityInput, setCapacityInput] = useState<number | ''>(20);
  const [statusInput, setStatusInput] = useState<'Available' | 'Full' | 'Cancelled'>('Available');
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  // Delete State
  const [deletingSlot, setDeletingSlot] = useState<TestSlot | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // View Slot Bookings Modal State
  const [viewingSlotBookings, setViewingSlotBookings] = useState<TestSlot | null>(null);
  const [slotBookingsList, setSlotBookingsList] = useState<Booking[]>([]);
  const [slotBookingsLoading, setSlotBookingsLoading] = useState(false);

  // Post Result Modal State (when triggered from Slot Bookings)
  const [showPostResultModal, setShowPostResultModal] = useState(false);
  const [resultStudentId, setResultStudentId] = useState('');
  const [resultStudentName, setResultStudentName] = useState('');
  const [resultTestName, setResultTestName] = useState('');
  const [resultGrade, setResultGrade] = useState<GradeType>('A+');
  const [resultMarks, setResultMarks] = useState<number | ''>('');
  const [resultMaxMarks, setResultMaxMarks] = useState<number | ''>('');
  const [resultFormError, setResultFormError] = useState('');
  const [resultLoading, setResultLoading] = useState(false);

  const fetchSlots = async (page = 1, searchQuery = search, status = statusFilter) => {
    setLoading(true);
    try {
      const res = await api.get(
        `/slots?page=${page}&limit=50&search=${encodeURIComponent(searchQuery)}&status=${encodeURIComponent(status)}`
      );
      if (res.success) {
        setSlots(res.slots);
        setPagination(res.pagination);
      } else {
        setNotification({ type: 'error', message: res.message || 'Failed to fetch test slots' });
      }
    } catch (err: any) {
      setNotification({ type: 'error', message: 'Failed to connect to backend server' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSlots(1, search, statusFilter);
  }, []);

  // Categorize slots by start time (e.g. 06:00, 12:00)
  const groupedSlots = useMemo(() => {
    const groups: Record<
      string,
      {
        rawTime: string;
        displayTime: string;
        slots: TestSlot[];
      }
    > = {};

    for (const s of slots) {
      const rawTime = s.startTime ? s.startTime.trim() : '00:00';
      if (!groups[rawTime]) {
        groups[rawTime] = {
          rawTime,
          displayTime: formatTimeDisplay(rawTime),
          slots: [],
        };
      }
      groups[rawTime].slots.push(s);
    }

    return Object.values(groups).sort((a, b) => a.rawTime.localeCompare(b.rawTime));
  }, [slots]);

  const openAddModal = () => {
    setEditingSlot(null);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setDateInput(tomorrow.toISOString().split('T')[0]);
    setStartTimeInput('09:00');
    setCapacityInput(25);
    setStatusInput('Available');
    setFormError('');
    setShowModal(true);
  };

  const openEditModal = (slot: TestSlot) => {
    setEditingSlot(slot);
    setDateInput(slot.testDate);
    setStartTimeInput(slot.startTime);
    setCapacityInput(slot.capacity);
    setStatusInput(slot.status);
    setFormError('');
    setShowModal(true);
  };

  // Open "View Bookings" modal for a slot
  const openViewBookingsModal = async (slot: TestSlot) => {
    setViewingSlotBookings(slot);
    setSlotBookingsLoading(true);
    try {
      const res = await api.get(`/bookings?slotId=${slot._id}&limit=100`);
      if (res.success) {
        setSlotBookingsList(res.bookings || []);
      } else {
        setSlotBookingsList([]);
      }
    } catch (err) {
      setSlotBookingsList([]);
    } finally {
      setSlotBookingsLoading(false);
    }
  };

  // Copy slot details
  const handleCopySlotDetails = (slot: TestSlot) => {
    const formatted = `Test Slot: ${slot.testDate} at ${formatTimeDisplay(slot.startTime)} | Capacity: ${slot.bookedCount}/${slot.capacity} | Status: ${slot.status}`;
    navigator.clipboard
      .writeText(formatted)
      .then(() => {
        setCopiedSlotId(slot._id);
        setNotification({ type: 'success', message: 'Test slot details copied to clipboard!' });
        setTimeout(() => setCopiedSlotId(null), 2000);
      })
      .catch(() => {
        setNotification({ type: 'error', message: 'Failed to copy to clipboard' });
      });
  };

  // Copy individual student booking inside slot bookings modal
  const handleCopyBookingInSlot = (booking: Booking) => {
    const student = typeof booking.student === 'object' ? booking.student : null;
    const studentName = student?.name || 'Unknown Student';
    const studentId = student?.studentId || 'N/A';
    const syllabus = booking.syllabus || 'General Syllabus';
    const phone = student?.phone || 'N/A';
    const text = `Name : ${studentName}\nStudent Id: ${studentId}\nSyllabus : ${syllabus}\nPhone number : ${phone}`;

    navigator.clipboard
      .writeText(text)
      .then(() => {
        setCopiedBookingId(booking._id);
        setNotification({ type: 'success', message: `Copied details for ${studentName}!` });
        setTimeout(() => setCopiedBookingId(null), 2000);
      })
      .catch(() => {
        setNotification({ type: 'error', message: 'Failed to copy' });
      });
  };

  // Copy all bookings in a slot
  const handleCopyAllSlotBookings = () => {
    if (!viewingSlotBookings || slotBookingsList.length === 0) return;
    const entries = slotBookingsList.map((b) => {
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
          message: `Copied details of ${slotBookingsList.length} students!`,
        });
      })
      .catch(() => {
        setNotification({ type: 'error', message: 'Failed to copy' });
      });
  };

  // Open Post Result modal for student in slot
  const openPostResultForStudent = (booking: Booking) => {
    const student = typeof booking.student === 'object' ? booking.student : null;
    const slot = viewingSlotBookings;
    const syllabus = booking.syllabus || 'Assessment Session';

    setResultStudentId(student ? student.studentId : '');
    setResultStudentName(student ? student.name : '');
    setResultTestName(slot ? `${syllabus} (${slot.testDate})` : syllabus);
    setResultGrade('A+');
    setResultMarks('');
    setResultMaxMarks('');
    setResultFormError('');
    setShowPostResultModal(true);
  };

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
          message: `Result (${resultGrade}) published for ${resultStudentName} (${resultStudentId})!`,
        });
        setShowPostResultModal(false);
      } else {
        setResultFormError(res.message || 'Failed to publish result.');
      }
    } catch (err: any) {
      setResultFormError('Server request error.');
    } finally {
      setResultLoading(false);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!dateInput || !startTimeInput || !capacityInput) {
      setFormError('Test Date, Start Time, and Capacity are required.');
      return;
    }

    if (Number(capacityInput) < 1) {
      setFormError('Capacity must be at least 1.');
      return;
    }

    const todayStr = new Date().toISOString().split('T')[0];
    if (dateInput < todayStr) {
      setFormError('Test slot date cannot be in the past.');
      return;
    }

    setFormLoading(true);
    try {
      const payload = {
        testDate: dateInput,
        startTime: startTimeInput,
        capacity: Number(capacityInput),
        status: statusInput,
      };

      if (editingSlot) {
        const res = await api.put(`/slots/${editingSlot._id}`, payload);
        if (res.success) {
          setNotification({ type: 'success', message: `Test slot (${dateInput} at ${startTimeInput}) updated.` });
          setShowModal(false);
          fetchSlots(pagination.page);
        } else {
          setFormError(res.message || 'Failed to update test slot.');
        }
      } else {
        const res = await api.post('/slots', payload);
        if (res.success) {
          setNotification({
            type: 'success',
            message: `Test slot created successfully for ${dateInput} at ${startTimeInput}.`,
          });
          setShowModal(false);
          fetchSlots(1);
        } else {
          setFormError(res.message || 'Failed to create test slot.');
        }
      }
    } catch (err: any) {
      setFormError('Server request error.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingSlot) return;
    setDeleteLoading(true);
    try {
      const res = await api.delete(`/slots/${deletingSlot._id}`);
      if (res.success) {
        setNotification({ type: 'success', message: res.message || 'Slot deleted.' });
        setDeletingSlot(null);
        fetchSlots(pagination.page);
      } else {
        setNotification({ type: 'error', message: res.message || 'Failed to delete slot.' });
      }
    } catch (err: any) {
      setNotification({ type: 'error', message: 'Failed to connect to backend server.' });
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
          <h1 className="text-xl font-bold text-slate-900">Test Slot Management</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Sessions categorized by start time (e.g. 6:00 AM, 12:00 PM) with attendee rosters and result posting.
          </p>
        </div>

        <div className="flex items-center space-x-3 self-start sm:self-auto">
          {/* View Mode Toggle */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/80">
            <button
              onClick={() => setViewMode('categorized')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                viewMode === 'categorized'
                  ? 'bg-white text-brand-700 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>By Time</span>
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
              <span>Table</span>
            </button>
          </div>

          <button
            onClick={openAddModal}
            className="inline-flex items-center justify-center space-x-2 px-4 py-2 text-xs font-semibold text-white bg-brand-600 rounded-xl hover:bg-brand-700 active:scale-98 shadow-xs transition-all shrink-0"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Create Slot</span>
          </button>
        </div>
      </div>

      {/* Controls Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                fetchSlots(1, e.target.value, statusFilter);
              }}
              placeholder="Search by date (YYYY-MM-DD) or time..."
              className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-300 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 bg-slate-50/50 transition-colors"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              fetchSlots(1, search, e.target.value);
            }}
            className="w-full sm:w-40 px-3 py-2 text-xs rounded-xl border border-slate-300 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 bg-white font-medium transition-colors"
          >
            <option value="">All Statuses</option>
            <option value="Available">Available</option>
            <option value="Full">Full</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </div>

        <span className="text-xs text-slate-500 font-medium self-end sm:self-center">
          Total Slots: <strong className="text-slate-800">{pagination.total}</strong>
        </span>
      </div>

      {/* Content */}
      {loading ? (
        <TableSkeleton rows={5} cols={4} />
      ) : slots.length === 0 ? (
        <EmptyState
          title="No Test Slots"
          description="No test slots match your search or filter criteria."
          actionText="Create New Slot"
          onAction={openAddModal}
        />
      ) : viewMode === 'categorized' ? (
        /* TIME CATEGORIZED SECTIONS */
        <div className="space-y-6">
          {groupedSlots.map((group) => (
            <div key={group.rawTime} className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              {/* Section Header */}
              <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-50 to-brand-50/30 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2.5 rounded-xl bg-brand-600 text-white shadow-xs">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h2 className="text-base font-bold text-slate-900 tracking-tight">
                        {group.displayTime} Sessions
                      </h2>
                      <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-brand-100 text-brand-800 border border-brand-200">
                        {group.slots.length} {group.slots.length === 1 ? 'Slot' : 'Slots'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      All test sessions scheduled for start time {group.displayTime}
                    </p>
                  </div>
                </div>
              </div>

              {/* Slots List in this Time Section */}
              <div className="divide-y divide-slate-100">
                {group.slots.map((slot) => {
                  const bookedPct = Math.min(100, Math.round((slot.bookedCount / slot.capacity) * 100));
                  const isCopied = copiedSlotId === slot._id;

                  return (
                    <div
                      key={slot._id}
                      className="p-4 sm:px-6 sm:py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 hover:bg-slate-50/60 transition-colors"
                    >
                      {/* Slot Details */}
                      <div className="space-y-1.5">
                        <div className="flex items-center space-x-2">
                          <Calendar className="w-4 h-4 text-brand-600" />
                          <span className="font-bold text-slate-900 text-sm">{slot.testDate}</span>
                          <span className="text-brand-700 bg-brand-50 px-2 py-0.5 rounded-md text-xs font-semibold border border-brand-200/60">
                            {formatTimeDisplay(slot.startTime)}
                          </span>
                          <Badge status={slot.status} className="text-[11px]" />
                        </div>

                        {/* Capacity meter */}
                        <div className="flex items-center space-x-3 text-xs text-slate-600">
                          <span className="flex items-center space-x-1">
                            <Users className="w-3.5 h-3.5 text-slate-400" />
                            <strong>{slot.bookedCount} / {slot.capacity}</strong> booked
                          </span>
                          <span className="text-slate-400">({slot.availableSeats} available)</span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center space-x-2 self-end sm:self-auto">
                        {/* Copy Slot Button */}
                        <button
                          onClick={() => handleCopySlotDetails(slot)}
                          className={`p-2 rounded-xl border transition-all ${
                            isCopied
                              ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                              : 'bg-white border-slate-200 text-slate-600 hover:text-brand-600 hover:bg-brand-50'
                          }`}
                          title="Copy slot details"
                        >
                          {isCopied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                        </button>

                        {/* View Bookings Button */}
                        <button
                          onClick={() => openViewBookingsModal(slot)}
                          className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-brand-50 hover:text-brand-700 text-slate-700 border border-slate-200 transition-colors"
                        >
                          <Users className="w-3.5 h-3.5 text-brand-600" />
                          <span>View Bookings ({slot.bookedCount})</span>
                        </button>

                        {/* Edit Slot */}
                        <button
                          onClick={() => openEditModal(slot)}
                          className="p-2 rounded-xl text-slate-500 hover:text-brand-600 hover:bg-brand-50 border border-transparent hover:border-brand-200 transition-colors"
                          title="Edit Slot"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>

                        {/* Delete Slot */}
                        <button
                          onClick={() => setDeletingSlot(slot)}
                          className="p-2 rounded-xl text-slate-500 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-colors"
                          title="Delete Slot"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
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
          {/* Mobile Card View */}
          <div className="grid grid-cols-1 gap-3 sm:hidden">
            {slots.map((slot) => {
              const bookedPct = Math.min(100, Math.round((slot.bookedCount / slot.capacity) * 100));
              const isCopied = copiedSlotId === slot._id;

              return (
                <div
                  key={slot._id}
                  className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="p-2 rounded-xl bg-brand-50 text-brand-600">
                        <Calendar className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="font-bold text-slate-900 text-sm">{slot.testDate}</span>
                        <div className="flex items-center space-x-1 text-slate-500 text-xs">
                          <Clock className="w-3 h-3 text-brand-600" />
                          <span className="font-semibold text-brand-700">{formatTimeDisplay(slot.startTime)}</span>
                        </div>
                      </div>
                    </div>
                    <Badge status={slot.status} />
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500 flex items-center space-x-1">
                        <Users className="w-3.5 h-3.5 text-slate-400" />
                        <span>Seat Bookings</span>
                      </span>
                      <span className="font-semibold text-slate-800">
                        {slot.bookedCount} / {slot.capacity}
                        <span className="text-[11px] text-slate-400 font-normal ml-1">
                          ({slot.availableSeats} left)
                        </span>
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          bookedPct >= 100
                            ? 'bg-rose-500'
                            : bookedPct >= 75
                            ? 'bg-amber-500'
                            : 'bg-brand-600'
                        }`}
                        style={{ width: `${bookedPct}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => handleCopySlotDetails(slot)}
                        className={`p-2 rounded-xl border transition-all ${
                          isCopied ? 'bg-emerald-50 border-emerald-300 text-emerald-700' : 'bg-white border-slate-200'
                        }`}
                        title="Copy slot info"
                      >
                        {isCopied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => openViewBookingsModal(slot)}
                        className="px-2.5 py-1.5 text-xs font-semibold bg-brand-50 text-brand-700 rounded-xl border border-brand-200"
                      >
                        Bookings ({slot.bookedCount})
                      </button>
                    </div>

                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => openEditModal(slot)}
                        className="p-2 rounded-lg text-slate-600 hover:text-brand-600"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeletingSlot(slot)}
                        className="p-2 rounded-lg text-slate-600 hover:text-rose-600"
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
                    <th className="px-6 py-4">Slot Schedule</th>
                    <th className="px-6 py-4">Start Time</th>
                    <th className="px-6 py-4">Bookings / Capacity</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {slots.map((slot) => {
                    const bookedPct = Math.min(100, Math.round((slot.bookedCount / slot.capacity) * 100));
                    const isCopied = copiedSlotId === slot._id;

                    return (
                      <tr key={slot._id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-2 font-semibold text-slate-900">
                            <Calendar className="w-4 h-4 text-brand-600" />
                            <span>{slot.testDate}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 font-semibold text-slate-800">
                          <div className="flex items-center space-x-1.5 text-brand-700 bg-brand-50/60 px-2.5 py-1 rounded-lg w-fit border border-brand-100">
                            <Clock className="w-3.5 h-3.5 text-brand-600" />
                            <span>{formatTimeDisplay(slot.startTime)}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="space-y-1 max-w-[200px]">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-semibold text-slate-800">
                                {slot.bookedCount} / {slot.capacity}
                              </span>
                              <span className="text-[11px] text-slate-400">
                                ({slot.availableSeats} available)
                              </span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  bookedPct >= 100
                                    ? 'bg-rose-500'
                                    : bookedPct >= 75
                                    ? 'bg-amber-500'
                                    : 'bg-brand-600'
                                }`}
                                style={{ width: `${bookedPct}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <Badge status={slot.status} />
                        </td>
                        <td className="px-6 py-4 text-right space-x-2">
                          <button
                            onClick={() => handleCopySlotDetails(slot)}
                            className={`p-1.5 rounded-lg border transition-all inline-flex items-center ${
                              isCopied
                                ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                                : 'bg-white border-slate-200 text-slate-500 hover:text-brand-600'
                            }`}
                            title="Copy slot details"
                          >
                            {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                          <button
                            onClick={() => openViewBookingsModal(slot)}
                            className="inline-flex items-center space-x-1 px-2.5 py-1 text-xs font-semibold text-brand-700 bg-brand-50 hover:bg-brand-100 border border-brand-200 rounded-lg transition-colors"
                          >
                            <Users className="w-3.5 h-3.5" />
                            <span>Bookings ({slot.bookedCount})</span>
                          </button>
                          <button
                            onClick={() => openEditModal(slot)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-brand-600 hover:bg-brand-50 transition-colors"
                            title="Edit Slot"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeletingSlot(slot)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            title="Delete Slot"
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
            <Pagination pagination={pagination} onPageChange={(p) => fetchSlots(p, search, statusFilter)} />
          </div>
        </div>
      )}

      {/* View Bookings in Slot Modal */}
      {viewingSlotBookings && (
        <Modal
          isOpen={!!viewingSlotBookings}
          onClose={() => setViewingSlotBookings(null)}
          title={`Bookings for ${viewingSlotBookings.testDate} at ${formatTimeDisplay(viewingSlotBookings.startTime)}`}
          maxWidth="lg"
        >
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs">
              <div>
                <span className="text-slate-500">Total Booked Students:</span>
                <strong className="text-slate-900 ml-1.5">
                  {slotBookingsList.length} of {viewingSlotBookings.capacity} seats
                </strong>
              </div>
              {slotBookingsList.length > 0 && (
                <button
                  onClick={handleCopyAllSlotBookings}
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-700 font-medium hover:bg-slate-50 transition-colors self-start sm:self-auto"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy All Bookings</span>
                </button>
              )}
            </div>

            {slotBookingsLoading ? (
              <TableSkeleton rows={4} cols={4} />
            ) : slotBookingsList.length === 0 ? (
              <EmptyState
                title="No Bookings Yet"
                description="No students have registered for this specific test slot yet."
              />
            ) : (
              <div className="divide-y divide-slate-100 max-h-[60vh] overflow-y-auto pr-1">
                {slotBookingsList.map((booking) => {
                  const student = typeof booking.student === 'object' ? booking.student : null;
                  const isCopied = copiedBookingId === booking._id;

                  return (
                    <div
                      key={booking._id}
                      className="py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 hover:bg-slate-50/50 p-2 rounded-xl transition-colors"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center flex-wrap gap-2">
                          <span className="font-semibold text-slate-900 text-sm">
                            {student?.name || 'Unknown Student'}
                          </span>
                          <span className="font-mono text-xs text-brand-700 bg-brand-50 border border-brand-200/80 px-2 py-0.5 rounded-md font-semibold">
                            {student?.studentId}
                          </span>
                          <span className="inline-flex items-center space-x-1 font-mono text-[10px] text-emerald-800 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded font-semibold" title="Student Mobile Number">
                            <Phone className="w-3 h-3 text-emerald-600" />
                            <span>{student?.phone || 'No phone'}</span>
                          </span>
                          <Badge status={booking.status} className="text-[11px]" />
                        </div>
                        <div className="flex items-center flex-wrap gap-2 text-xs">
                          <div className="inline-flex items-center space-x-1.5 font-bold text-indigo-950 bg-indigo-50 border border-indigo-200/80 px-2.5 py-0.5 rounded-md text-[11px]">
                            <BookOpen className="w-3 h-3 text-indigo-600 shrink-0" />
                            <span>Syllabus: {booking.syllabus || 'General Syllabus'}</span>
                          </div>
                          <span className="text-[11px] text-slate-400">
                            Booked: {new Date(booking.bookedAt || booking.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      {/* Post Result & Copy Buttons */}
                      <div className="flex items-center space-x-2 self-end sm:self-auto">
                        <button
                          onClick={() => handleCopyBookingInSlot(booking)}
                          className={`p-2 rounded-xl border transition-all ${
                            isCopied
                              ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                              : 'bg-white border-slate-200 text-slate-600 hover:text-brand-600'
                          }`}
                          title="Copy student booking details"
                        >
                          {isCopied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                        </button>

                        <button
                          onClick={() => openPostResultForStudent(booking)}
                          className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 active:scale-98 shadow-xs transition-colors"
                        >
                          <Award className="w-3.5 h-3.5" />
                          <span>Post Result</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Post Result Modal */}
      <Modal
        isOpen={showPostResultModal}
        onClose={() => setShowPostResultModal(false)}
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
              onClick={() => setShowPostResultModal(false)}
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

      {/* Create / Edit Slot Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingSlot ? 'Edit Test Slot' : 'Create New Test Slot'}
        maxWidth="md"
      >
        <form onSubmit={handleFormSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Test Date <span className="text-rose-500">*</span>
            </label>
            <input
              type="date"
              required
              value={dateInput}
              onChange={(e) => setDateInput(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Start Time <span className="text-rose-500">*</span>
            </label>
            <input
              type="time"
              required
              value={startTimeInput}
              onChange={(e) => setStartTimeInput(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Seat Capacity <span className="text-rose-500">*</span>
            </label>
            <input
              type="number"
              required
              min="1"
              value={capacityInput}
              onChange={(e) => setCapacityInput(e.target.value === '' ? '' : Number(e.target.value))}
              placeholder="e.g. 25"
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
            />
          </div>

          {editingSlot && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Status Override</label>
              <select
                value={statusInput}
                onChange={(e) => setStatusInput(e.target.value as any)}
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 bg-white"
              >
                <option value="Available">Available</option>
                <option value="Full">Full</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>
          )}

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
              {formLoading ? 'Saving...' : editingSlot ? 'Update Slot' : 'Create Slot'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Dialog */}
      {deletingSlot && (
        <ConfirmDialog
          isOpen={!!deletingSlot}
          onClose={() => setDeletingSlot(null)}
          onConfirm={handleDeleteConfirm}
          title={`Delete Test Slot?`}
          message={`Are you sure you want to delete the slot scheduled for ${deletingSlot.testDate} at ${deletingSlot.startTime}? All student bookings regarding this test slot will also be permanently deleted.`}
          confirmText="Yes, Delete Slot & Bookings"
          loading={deleteLoading}
        />
      )}
    </div>
  );
};
