import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { TestSlot, Booking } from '../../types';
import { Badge } from '../../components/Badge';
import { Modal } from '../../components/Modal';
import { CardSkeleton } from '../../components/Skeleton';
import { EmptyState } from '../../components/EmptyState';
import { SYLLABUS_OPTIONS } from '../../constants/syllabuses';
import {
  Calendar,
  Clock,
  Users,
  CheckCircle2,
  AlertCircle,
  Info,
  CalendarPlus,
  BookOpen,
  Check,
  Copy,
  Sparkles,
  ArrowRight,
  Search,
  MapPin,
  Tag,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { formatTimeDisplay } from '../admin/Bookings';

interface BookingSuccessData {
  bookingId: string;
  testDate: string;
  timeSlot: string;
  syllabus: string;
  studentName?: string;
  studentId?: string;
}

export const StudentBookSlot: React.FC = () => {
  const navigate = useNavigate();
  const [slots, setSlots] = useState<TestSlot[]>([]);
  const [activeBooking, setActiveBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);

  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Booking Step Modal State
  const [bookingSlotTarget, setBookingSlotTarget] = useState<TestSlot | null>(null);
  const [selectedSyllabus, setSelectedSyllabus] = useState<string>('');
  const [customSyllabusInput, setCustomSyllabusInput] = useState<string>('');
  const [isCustomSelected, setIsCustomSelected] = useState<boolean>(false);
  const [syllabusError, setSyllabusError] = useState<string>('');
  const [bookingLoading, setBookingLoading] = useState(false);

  // Search & Filter for syllabus options
  const [syllabusSearch, setSyllabusSearch] = useState<string>('');
  const [syllabusFilterTab, setSyllabusFilterTab] = useState<'all' | 'range' | 'milestone'>('all');

  // Success Popup Modal State
  const [successModalData, setSuccessModalData] = useState<BookingSuccessData | null>(null);
  const [copiedSuccessId, setCopiedSuccessId] = useState(false);

  const filteredSyllabusOptions = React.useMemo(() => {
    return SYLLABUS_OPTIONS.filter((opt) => {
      const q = syllabusSearch.toLowerCase().trim();
      const matches = !q || opt.title.toLowerCase().includes(q) || opt.category.toLowerCase().includes(q);
      if (!matches) return false;
      if (syllabusFilterTab === 'range') return opt.type === 'range';
      if (syllabusFilterTab === 'milestone') return opt.type !== 'range';
      return true;
    });
  }, [syllabusSearch, syllabusFilterTab]);

  const fetchSlotsData = async () => {
    setLoading(true);
    try {
      const [slotsRes, myBookingRes] = await Promise.all([
        api.get('/slots?status=Available'),
        api.get('/bookings/my'),
      ]);

      if (slotsRes.success) {
        setSlots(slotsRes.slots || []);
      }
      if (myBookingRes.success) {
        setActiveBooking(myBookingRes.booking);
      }
    } catch (err: any) {
      setNotification({ type: 'error', message: 'Failed to connect to backend server' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSlotsData();
  }, []);

  const openBookingModal = (slot: TestSlot) => {
    setBookingSlotTarget(slot);
    setSelectedSyllabus('');
    setCustomSyllabusInput('');
    setIsCustomSelected(false);
    setSyllabusError('');
    setSyllabusSearch('');
    setSyllabusFilterTab('all');
  };

  const handleSelectStandardSyllabus = (title: string) => {
    setSelectedSyllabus(title);
    setIsCustomSelected(false);
    setSyllabusError('');
  };

  const handleSelectCustomSyllabus = () => {
    setIsCustomSelected(true);
    setSelectedSyllabus(customSyllabusInput.trim());
    setSyllabusError('');
  };

  const handleCustomInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setCustomSyllabusInput(val);
    setSelectedSyllabus(val.trim());
    if (val.trim()) {
      setSyllabusError('');
    }
  };

  const handleConfirmBook = async () => {
    if (!bookingSlotTarget) return;

    const finalSyllabus = isCustomSelected ? customSyllabusInput.trim() : selectedSyllabus.trim();
    if (!finalSyllabus) {
      setSyllabusError('Syllabus selection is mandatory. Please choose one syllabus before booking.');
      return;
    }

    setBookingLoading(true);
    try {
      const res = await api.post('/bookings/book', {
        slotId: bookingSlotTarget._id,
        syllabus: finalSyllabus,
      });

      if (res.success && res.booking) {
        const slotObj = typeof res.booking.slot === 'object' ? res.booking.slot : bookingSlotTarget;
        const studentObj = typeof res.booking.student === 'object' ? res.booking.student : null;

        setSuccessModalData({
          bookingId: res.booking._id,
          testDate: slotObj.testDate,
          timeSlot: formatTimeDisplay(slotObj.startTime),
          syllabus: res.booking.syllabus || finalSyllabus,
          studentName: studentObj?.name,
          studentId: studentObj?.studentId,
        });

        setNotification({
          type: 'success',
          message: `Booking completed successfully! Booking Reference ID: ${res.booking._id}`,
        });

        setBookingSlotTarget(null);
        fetchSlotsData();
      } else {
        setSyllabusError(res.message || 'Failed to complete test booking.');
      }
    } catch (err: any) {
      setSyllabusError('Network error while booking test slot.');
    } finally {
      setBookingLoading(false);
    }
  };

  const handleCopyBookingId = (id: string) => {
    navigator.clipboard.writeText(id).then(() => {
      setCopiedSuccessId(true);
      setTimeout(() => setCopiedSuccessId(false), 2000);
    });
  };

  if (loading) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto">
        <CardSkeleton />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <CardSkeleton />
          <CardSkeleton />
        </div>
      </div>
    );
  }

  const activeSlotObj = activeBooking && typeof activeBooking.slot === 'object' ? activeBooking.slot : null;

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in max-w-5xl mx-auto">
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

      {/* Page Header */}
      <div className="bg-white p-6 sm:p-7 rounded-3xl border border-slate-200/90 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-brand-600 mb-1">
            <CalendarPlus className="w-4 h-4" />
            <span>Test Scheduling</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900">Book Examination Slot</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Select an active examination date, choose your assigned syllabus module, and reserve your seat.
          </p>
        </div>
        <div className="shrink-0 flex items-center space-x-2 bg-slate-50 px-3.5 py-2 rounded-2xl border border-slate-200/60">
          <span className="text-xs text-slate-500 font-medium">Available Sessions:</span>
          <span className="text-sm font-bold text-slate-900">{slots.length}</span>
        </div>
      </div>

      {/* Active Booking Notice Banner if student already has active booking */}
      {activeBooking && activeSlotObj && (
        <div className="bg-amber-50/90 border border-amber-200/80 rounded-3xl p-5 sm:p-6 text-xs sm:text-sm text-amber-950 flex items-start space-x-3.5 shadow-sm">
          <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1.5">
            <h2 className="font-bold text-sm sm:text-base text-amber-950">Active Booking Restriction</h2>
            <p className="leading-relaxed text-amber-900">
              You currently hold an active reservation for{' '}
              <strong className="text-amber-950 font-bold">
                {activeSlotObj.testDate} at {formatTimeDisplay(activeSlotObj.startTime)}
              </strong>
              {activeBooking.syllabus && (
                <>
                  {' '}for syllabus <strong className="text-amber-950 font-bold">{activeBooking.syllabus}</strong>
                </>
              )}.
            </p>
            <p className="text-amber-800 text-xs">
              Students can hold only <strong>1 active booking at a time</strong>. To choose a different slot, cancel your existing booking from your{' '}
              <Link to="/student" className="underline font-bold text-amber-950 hover:text-amber-800">
                Student Dashboard
              </Link>.
            </p>
          </div>
        </div>
      )}

      {/* Available Slots Grid */}
      {slots.length === 0 ? (
        <EmptyState
          title="No Available Slots"
          description="There are currently no active test slots scheduled for booking. Please check back later or contact your course coordinator."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
          {slots.map((slot) => {
            const isFull = slot.availableSeats <= 0 || slot.status === 'Full';
            const isCurrentActive = activeSlotObj && activeSlotObj._id === slot._id;
            const bookedPct = Math.min(100, Math.round((slot.bookedCount / slot.capacity) * 100));

            return (
              <div
                key={slot._id}
                className={`bg-white rounded-3xl border p-6 sm:p-7 shadow-sm flex flex-col justify-between transition-all ${
                  isCurrentActive
                    ? 'border-brand-500 ring-2 ring-brand-500/20 shadow-md'
                    : 'border-slate-200/90 hover:border-slate-300 hover:shadow-md'
                }`}
              >
                <div className="space-y-4">
                  {/* Slot Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <span className="text-[11px] font-bold text-brand-600 uppercase tracking-wider bg-brand-50 px-2.5 py-0.5 rounded-lg border border-brand-100">
                        Assessment Session
                      </span>
                      <h3 className="font-extrabold text-slate-900 text-lg flex items-center space-x-2 pt-1">
                        <Calendar className="w-4 h-4 text-brand-600 shrink-0" />
                        <span>{slot.testDate}</span>
                      </h3>
                      {slot.testTitle && (
                        <p className="text-xs text-slate-500 font-medium">{slot.testTitle}</p>
                      )}
                    </div>
                    <Badge status={isFull ? 'Full' : slot.status} />
                  </div>

                  {/* Session Metrics */}
                  <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-100 space-y-3 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 font-medium">Session Start Time</span>
                      <div className="flex items-center space-x-1.5 font-bold text-brand-700 bg-white px-3 py-1 rounded-xl border border-slate-200/80 shadow-2xs">
                        <Clock className="w-3.5 h-3.5 text-brand-600" />
                        <span>{formatTimeDisplay(slot.startTime)}</span>
                      </div>
                    </div>

                    {slot.location && (
                      <div className="flex items-center justify-between pt-1 border-t border-slate-200/50">
                        <span className="text-slate-500 font-medium">Venue / Hall</span>
                        <div className="flex items-center space-x-1 font-semibold text-slate-700">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          <span>{slot.location}</span>
                        </div>
                      </div>
                    )}

                    {/* Seat Availability Bar */}
                    <div className="pt-2 border-t border-slate-200/50 space-y-1.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-500 font-medium flex items-center space-x-1">
                          <Users className="w-3.5 h-3.5 text-slate-400" />
                          <span>Seat Capacity</span>
                        </span>
                        <span className="font-bold text-slate-800">
                          {slot.availableSeats > 0 ? (
                            <span className="text-emerald-600">{slot.availableSeats} seats remaining</span>
                          ) : (
                            <span className="text-rose-600">Full</span>
                          )}{' '}
                          <span className="text-slate-400 font-normal">
                            ({slot.bookedCount}/{slot.capacity})
                          </span>
                        </span>
                      </div>

                      <div className="w-full bg-slate-200/80 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            bookedPct >= 100
                              ? 'bg-rose-500'
                              : bookedPct >= 75
                              ? 'bg-amber-500'
                              : 'bg-emerald-500'
                          }`}
                          style={{ width: `${bookedPct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Action Button */}
                <div className="pt-5 border-t border-slate-100 mt-5">
                  {isCurrentActive ? (
                    <div className="w-full text-center py-3 px-4 bg-brand-50 text-brand-700 font-bold text-xs sm:text-sm rounded-2xl border border-brand-200">
                      ✓ Your Current Active Booking
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => openBookingModal(slot)}
                      disabled={isFull || !!activeBooking}
                      className={`w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-2xl text-xs sm:text-sm font-bold shadow-sm transition-all active:scale-98 ${
                        isFull || activeBooking
                          ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                          : 'bg-brand-600 hover:bg-brand-700 text-white focus:ring-4 focus:ring-brand-500/20'
                      }`}
                    >
                      <CalendarPlus className="w-4 h-4 shrink-0" />
                      <span>
                        {isFull
                          ? 'Slot Fully Booked'
                          : activeBooking
                          ? 'Active Booking Exists'
                          : 'Choose Slot & Syllabus'}
                      </span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Step 2: Syllabus Selection & Confirmation Modal */}
      {bookingSlotTarget && (
        <Modal
          isOpen={!!bookingSlotTarget}
          onClose={() => setBookingSlotTarget(null)}
          title="Choose Syllabus & Confirm Booking"
          subtitle="Select exactly one syllabus module for your scheduled evaluation session."
          maxWidth="3xl"
          footer={
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="flex items-center space-x-2 text-xs text-slate-600">
                <span className="font-medium text-slate-500">Chosen Syllabus:</span>
                {selectedSyllabus ? (
                  <span className="inline-flex items-center space-x-1 font-bold text-brand-700 bg-brand-50 px-2.5 py-1 rounded-lg border border-brand-200">
                    <Check className="w-3.5 h-3.5 text-brand-600" />
                    <span>{selectedSyllabus}</span>
                  </span>
                ) : (
                  <span className="text-slate-400 italic">None selected yet</span>
                )}
              </div>

              <div className="flex items-center space-x-2.5 justify-end">
                <button
                  type="button"
                  onClick={() => setBookingSlotTarget(null)}
                  className="px-4 py-2.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 active:scale-98 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmBook}
                  disabled={bookingLoading || !selectedSyllabus.trim()}
                  className={`inline-flex items-center justify-center space-x-2 px-5 py-2.5 rounded-xl text-xs font-bold shadow-sm transition-all active:scale-98 ${
                    !selectedSyllabus.trim() || bookingLoading
                      ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                      : 'bg-brand-600 text-white hover:bg-brand-700 focus:ring-4 focus:ring-brand-500/20'
                  }`}
                >
                  <CalendarPlus className="w-4 h-4 shrink-0" />
                  <span>{bookingLoading ? 'Reserving Seat...' : 'Confirm Test Booking'}</span>
                </button>
              </div>
            </div>
          }
        >
          <div className="space-y-4">
            {/* Slot Summary Banner */}
            <div className="p-3.5 sm:p-4 bg-brand-50/70 rounded-2xl border border-brand-200 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center space-x-2 font-bold text-brand-950">
                <Calendar className="w-4 h-4 text-brand-600 shrink-0" />
                <span>Session Date: {bookingSlotTarget.testDate}</span>
              </div>
              <div className="flex items-center space-x-1.5 font-bold text-brand-700 bg-white px-2.5 py-1 rounded-xl border border-brand-200 shadow-2xs">
                <Clock className="w-3.5 h-3.5 text-brand-600 shrink-0" />
                <span>Start: {formatTimeDisplay(bookingSlotTarget.startTime)}</span>
              </div>
              <div className="text-slate-600 font-medium">
                <span className="font-bold text-emerald-700">{bookingSlotTarget.availableSeats} seats</span> remaining
              </div>
            </div>

            {/* Quick Search & Category Tabs */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-1">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 absolute left-3.5 top-3 text-slate-400" />
                <input
                  type="text"
                  value={syllabusSearch}
                  onChange={(e) => setSyllabusSearch(e.target.value)}
                  placeholder="Search syllabus (e.g. 1-5, Monthly, Prefinal, Final)..."
                  className="w-full pl-9 pr-8 py-2 text-xs rounded-xl border border-slate-300 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 bg-slate-50/60 text-slate-900 transition-colors"
                />
                {syllabusSearch && (
                  <button
                    type="button"
                    onClick={() => setSyllabusSearch('')}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 text-xs font-bold"
                  >
                    &times;
                  </button>
                )}
              </div>

              {/* Category Filter Pills */}
              <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl border border-slate-200/80 text-[11px] self-start sm:self-auto overflow-x-auto max-w-full">
                <button
                  type="button"
                  onClick={() => setSyllabusFilterTab('all')}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-all shrink-0 ${
                    syllabusFilterTab === 'all'
                      ? 'bg-white text-brand-700 shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  All ({SYLLABUS_OPTIONS.length})
                </button>
                <button
                  type="button"
                  onClick={() => setSyllabusFilterTab('range')}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-all shrink-0 ${
                    syllabusFilterTab === 'range'
                      ? 'bg-white text-brand-700 shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Lesson Ranges (22)
                </button>
                <button
                  type="button"
                  onClick={() => setSyllabusFilterTab('milestone')}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-all shrink-0 ${
                    syllabusFilterTab === 'milestone'
                      ? 'bg-white text-brand-700 shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Exams & Milestones (8)
                </button>
              </div>
            </div>

            {/* Error Message if user tries booking without choosing syllabus */}
            {syllabusError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{syllabusError}</span>
              </div>
            )}

            {/* Responsive Grid of Syllabus Cards */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 px-0.5">
                <span>Select One Module:</span>
                <span>Showing {filteredSyllabusOptions.length} available</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-[46vh] sm:max-h-[50vh] overflow-y-auto overscroll-contain pr-1 pb-1">
                {filteredSyllabusOptions.map((opt) => {
                  const isSelected = !isCustomSelected && selectedSyllabus === opt.title;
                  const isMilestone = opt.type !== 'range';

                  return (
                    <div
                      key={opt.id}
                      onClick={() => handleSelectStandardSyllabus(opt.title)}
                      className={`p-3 rounded-2xl border cursor-pointer transition-all flex items-start space-x-3 select-none relative ${
                        isSelected
                          ? 'bg-brand-50/90 border-brand-600 ring-2 ring-brand-500/20 shadow-xs'
                          : isMilestone
                          ? 'bg-teal-50/40 border-teal-200/80 hover:border-brand-300 hover:bg-brand-50/40'
                          : 'bg-white border-slate-200 hover:border-brand-300 hover:bg-slate-50/80'
                      }`}
                    >
                      <div className="pt-0.5 shrink-0">
                        <div
                          className={`w-4 h-4 rounded-full border flex items-center justify-center transition-all ${
                            isSelected
                              ? 'border-brand-600 bg-brand-600 text-white'
                              : 'border-slate-300 bg-white'
                          }`}
                        >
                          {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </div>
                      </div>
                      <div className="space-y-0.5 flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <span
                            className={`text-xs font-bold leading-tight truncate ${
                              isSelected ? 'text-brand-950 font-extrabold' : 'text-slate-900'
                            }`}
                          >
                            {opt.title}
                          </span>
                          {isMilestone && (
                            <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded bg-teal-100 text-teal-800 shrink-0">
                              {opt.type}
                            </span>
                          )}
                        </div>
                        <span
                          className={`text-[10px] font-medium leading-tight block truncate ${
                            isMilestone ? 'text-teal-700' : 'text-slate-500'
                          }`}
                        >
                          {opt.category}
                        </span>
                      </div>
                    </div>
                  );
                })}

                {filteredSyllabusOptions.length === 0 && (
                  <div className="col-span-full py-8 text-center text-xs text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                    No syllabus option matches "{syllabusSearch}".
                  </div>
                )}
              </div>
            </div>

            {/* Custom / Other Syllabus Option */}
            <div
              onClick={handleSelectCustomSyllabus}
              className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex items-start space-x-3 select-none ${
                isCustomSelected
                  ? 'bg-brand-50/90 border-brand-600 ring-2 ring-brand-500/20 shadow-xs'
                  : 'bg-white border-slate-200 hover:border-brand-300 hover:bg-slate-50/80'
              }`}
            >
              <div className="pt-0.5 shrink-0">
                <div
                  className={`w-4 h-4 rounded-full border flex items-center justify-center transition-all ${
                    isCustomSelected
                      ? 'border-brand-600 bg-brand-600 text-white'
                      : 'border-slate-300 bg-white'
                  }`}
                >
                  {isCustomSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                </div>
              </div>
              <div className="space-y-1 flex-1">
                <span className={`text-xs font-bold leading-tight ${isCustomSelected ? 'text-brand-950 font-extrabold' : 'text-slate-900'}`}>
                  Custom / Specialized Syllabus Option
                </span>
                <p className="text-[11px] text-slate-500">
                  Select this if you are scheduled for a specialized chapter or catch-up examination module.
                </p>
                {isCustomSelected && (
                  <input
                    type="text"
                    autoFocus
                    value={customSyllabusInput}
                    onChange={handleCustomInputChange}
                    onClick={(e) => e.stopPropagation()}
                    placeholder="Type customized syllabus (e.g. Chapter 1-10 Revision)"
                    className="w-full mt-2 rounded-xl border border-slate-300 px-3.5 py-2 text-xs bg-white focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 text-slate-900"
                  />
                )}
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* POPUP: Booking Completed Successfully Modal */}
      {successModalData && (
        <Modal
          isOpen={!!successModalData}
          onClose={() => setSuccessModalData(null)}
          title="Booking Completed Successfully"
          maxWidth="md"
        >
          <div className="space-y-5 text-center sm:text-left">
            {/* Header Badge */}
            <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-3.5 p-4 bg-emerald-50 rounded-2xl border border-emerald-200">
              <div className="p-3 rounded-2xl bg-emerald-600 text-white shadow-xs shrink-0">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-emerald-950">
                  Seat Confirmed! Booking Successful
                </h3>
                <p className="text-xs text-emerald-800">
                  Your examination slot is confirmed and permanently synced in MongoDB Atlas.
                </p>
              </div>
            </div>

            {/* Receipt Summary Card */}
            <div className="p-4 bg-slate-50/90 rounded-2xl border border-slate-200 space-y-3 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200/80">
                <span className="text-slate-500 font-medium">Booking Reference ID:</span>
                <div className="flex items-center space-x-1.5">
                  <span className="font-mono font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                    {successModalData.bookingId}
                  </span>
                  <button
                    onClick={() => handleCopyBookingId(successModalData.bookingId)}
                    className="p-1 rounded-md text-slate-400 hover:text-brand-600 hover:bg-white transition-colors"
                    title="Copy Reference ID"
                  >
                    {copiedSuccessId ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>

              {successModalData.studentName && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Student Name:</span>
                  <span className="font-bold text-slate-900">{successModalData.studentName}</span>
                </div>
              )}

              {successModalData.studentId && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Student ID:</span>
                  <span className="font-mono font-bold text-brand-700">{successModalData.studentId}</span>
                </div>
              )}

              <div className="flex items-center justify-between">
                <span className="text-slate-500">Scheduled Date:</span>
                <span className="font-bold text-slate-900">{successModalData.testDate}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-500">Session Time:</span>
                <span className="font-bold text-slate-900">{successModalData.timeSlot}</span>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-200/80">
                <span className="text-slate-500">Selected Syllabus:</span>
                <span className="font-bold text-indigo-950 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                  {successModalData.syllabus}
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setSuccessModalData(null)}
                className="w-full sm:w-auto px-4 py-2.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors"
              >
                Close Receipt
              </button>
              <button
                type="button"
                onClick={() => {
                  setSuccessModalData(null);
                  navigate('/student');
                }}
                className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-5 py-2.5 text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 rounded-xl shadow-xs transition-colors"
              >
                <span>Return to Student Dashboard</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
