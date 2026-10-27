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

  // Search & Filter for the 30 syllabus options
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

        // Open Success Popup with all booking details
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
      <div className="space-y-6 max-w-5xl">
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
    <div className="space-y-8 animate-fade-in max-w-5xl">
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
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600" />
            )}
            <span>{notification.message}</span>
          </div>
          <button onClick={() => setNotification(null)} className="text-slate-400 hover:text-slate-600">
            &times;
          </button>
        </div>
      )}

      {/* Page Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <h1 className="text-xl font-bold text-slate-900">Book Test Slot</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Select your convenient examination session, choose your required test syllabus, and reserve your seat.
        </p>
      </div>

      {/* Active Booking Notice Banner if student already has active booking */}
      {activeBooking && activeSlotObj && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-xs text-amber-900 flex items-start space-x-3 shadow-xs">
          <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h2 className="font-bold text-sm text-amber-950">Active Booking Restriction</h2>
            <p className="leading-relaxed">
              You currently hold an active booking on{' '}
              <strong className="text-amber-950">
                {activeSlotObj.testDate} at {formatTimeDisplay(activeSlotObj.startTime)}
              </strong>
              {activeBooking.syllabus && (
                <>
                  {' '}for syllabus <strong className="text-amber-950">{activeBooking.syllabus}</strong>
                </>
              )}.
            </p>
            <p className="text-amber-700">
              Students can hold only <strong>1 active booking at a time</strong>. To choose a different slot below, please cancel your active booking first from your{' '}
              <Link to="/student" className="underline font-semibold">
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
          description="There are currently no active test slots scheduled for booking. Please check back later."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {slots.map((slot) => {
            const isFull = slot.availableSeats <= 0 || slot.status === 'Full';
            const isCurrentActive = activeSlotObj && activeSlotObj._id === slot._id;
            const bookedPct = Math.min(100, Math.round((slot.bookedCount / slot.capacity) * 100));

            return (
              <div
                key={slot._id}
                className={`bg-white rounded-2xl border p-5 sm:p-6 shadow-2xs flex flex-col justify-between transition-all ${
                  isCurrentActive
                    ? 'border-brand-500 ring-2 ring-brand-500/20'
                    : 'border-slate-200 hover:border-slate-300 hover:shadow-md'
                }`}
              >
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <span className="text-[11px] font-bold text-brand-600 uppercase tracking-wider bg-brand-50 px-2 py-0.5 rounded-md">
                        Test Assessment Slot
                      </span>
                      <h3 className="font-bold text-slate-900 text-lg flex items-center space-x-2 pt-0.5">
                        <Calendar className="w-4 h-4 text-brand-600" />
                        <span>{slot.testDate}</span>
                      </h3>
                    </div>
                    <Badge status={isFull ? 'Full' : slot.status} />
                  </div>

                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 font-medium">Session Start Time</span>
                      <div className="flex items-center space-x-1 font-bold text-brand-700 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                        <Clock className="w-3.5 h-3.5 text-brand-600" />
                        <span>{formatTimeDisplay(slot.startTime)}</span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-200/60 space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500 flex items-center space-x-1">
                          <Users className="w-3.5 h-3.5 text-slate-400" />
                          <span>Seat Availability</span>
                        </span>
                        <span className="font-semibold text-slate-800">
                          {slot.availableSeats} of {slot.capacity} seats left
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
                  </div>
                </div>

                <div className="pt-5 border-t border-slate-100 mt-5">
                  {isCurrentActive ? (
                    <div className="w-full text-center py-2.5 px-4 bg-brand-50 text-brand-700 font-semibold text-xs rounded-xl border border-brand-200">
                      ✓ Your Current Active Booking
                    </div>
                  ) : (
                    <button
                      onClick={() => openBookingModal(slot)}
                      disabled={isFull || !!activeBooking}
                      className={`w-full flex items-center justify-center space-x-2 py-2.5 px-4 rounded-xl text-xs font-semibold shadow-xs transition-all active:scale-98 ${
                        isFull || activeBooking
                          ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                          : 'bg-brand-600 text-white hover:bg-brand-700 focus:ring-2 focus:ring-brand-500/20'
                      }`}
                    >
                      <CalendarPlus className="w-4 h-4" />
                      <span>{isFull ? 'Slot Fully Booked' : activeBooking ? 'Active Booking Exists' : 'Choose Slot & Syllabus'}</span>
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
          title="Select Syllabus & Book Test"
          maxWidth="lg"
        >
          <div className="space-y-5">
            {/* Slot Summary Banner */}
            <div className="p-3.5 bg-brand-50/60 rounded-xl border border-brand-200 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center space-x-2 font-semibold text-brand-900">
                <Calendar className="w-4 h-4 text-brand-600" />
                <span>Date: {bookingSlotTarget.testDate}</span>
              </div>
              <div className="flex items-center space-x-1.5 font-bold text-brand-700 bg-white px-2.5 py-1 rounded-lg border border-brand-200">
                <Clock className="w-3.5 h-3.5 text-brand-600" />
                <span>Start Time: {formatTimeDisplay(bookingSlotTarget.startTime)}</span>
              </div>
              <div className="text-slate-600">
                <span>{bookingSlotTarget.availableSeats} seats remaining</span>
              </div>
            </div>

            {/* Syllabus Selection (Mandatory - Select Exactly One) */}
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-2 border-b border-slate-100">
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center space-x-1.5">
                    <BookOpen className="w-4 h-4 text-brand-600 shrink-0" />
                    <span>Select syllabus from the following options before booking:</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Choose one syllabus option. Only one syllabus slot can be chosen at a time.
                  </p>
                </div>
                {selectedSyllabus && (
                  <span className="self-start sm:self-auto inline-flex items-center space-x-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 shadow-2xs">
                    <Check className="w-3.5 h-3.5" />
                    <span>Selected: {selectedSyllabus}</span>
                  </span>
                )}
              </div>

              {/* Quick Search & Category Tabs */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    value={syllabusSearch}
                    onChange={(e) => setSyllabusSearch(e.target.value)}
                    placeholder="Search syllabus (e.g. 1-5, Monthly, Prefinal, Final)..."
                    className="w-full pl-9 pr-7 py-1.5 text-xs rounded-xl border border-slate-300 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 bg-slate-50/50"
                  />
                  {syllabusSearch && (
                    <button
                      type="button"
                      onClick={() => setSyllabusSearch('')}
                      className="absolute right-2.5 top-1.5 text-slate-400 hover:text-slate-600 text-xs"
                    >
                      &times;
                    </button>
                  )}
                </div>

                <div className="flex items-center space-x-1 bg-slate-100 p-0.5 rounded-xl border border-slate-200/80 text-[11px] self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={() => setSyllabusFilterTab('all')}
                    className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
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
                    className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                      syllabusFilterTab === 'range'
                        ? 'bg-white text-brand-700 shadow-2xs font-bold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Lesson Ranges
                  </button>
                  <button
                    type="button"
                    onClick={() => setSyllabusFilterTab('milestone')}
                    className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                      syllabusFilterTab === 'milestone'
                        ? 'bg-white text-brand-700 shadow-2xs font-bold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Milestones & Exams
                  </button>
                </div>
              </div>

              {/* Grid of the 30 Syllabus Options */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[44vh] overflow-y-auto pr-1 pt-1">
                {filteredSyllabusOptions.map((opt) => {
                  const isSelected = !isCustomSelected && selectedSyllabus === opt.title;
                  const isMilestone = opt.type !== 'range';

                  return (
                    <div
                      key={opt.id}
                      onClick={() => handleSelectStandardSyllabus(opt.title)}
                      className={`p-2.5 rounded-xl border cursor-pointer transition-all flex items-start space-x-2.5 select-none relative ${
                        isSelected
                          ? 'bg-brand-50/90 border-brand-500 ring-2 ring-brand-500/20 shadow-xs'
                          : isMilestone
                          ? 'bg-indigo-50/30 border-indigo-200/70 hover:border-brand-300 hover:bg-brand-50/30'
                          : 'bg-white border-slate-200 hover:border-brand-200 hover:bg-slate-50/60'
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
                        <span className={`text-xs font-bold leading-tight block truncate ${isSelected ? 'text-brand-950 font-extrabold' : 'text-slate-900'}`}>
                          {opt.title}
                        </span>
                        <span className={`text-[10px] font-semibold tracking-wide block truncate ${
                          isMilestone ? 'text-indigo-600' : 'text-slate-400'
                        }`}>
                          {opt.category}
                        </span>
                      </div>
                    </div>
                  );
                })}

                {filteredSyllabusOptions.length === 0 && (
                  <div className="col-span-full py-8 text-center text-xs text-slate-400">
                    No syllabus option matches "{syllabusSearch}".
                  </div>
                )}
              </div>

              {/* Custom / Other Syllabus Option */}
              <div
                onClick={handleSelectCustomSyllabus}
                className={`p-3 rounded-xl border cursor-pointer transition-all flex items-start space-x-3 select-none ${
                  isCustomSelected
                    ? 'bg-brand-50/80 border-brand-500 ring-2 ring-brand-500/20 shadow-xs'
                    : 'bg-white border-slate-200 hover:border-brand-200 hover:bg-slate-50/60'
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
                  <span className={`text-xs font-bold leading-tight ${isCustomSelected ? 'text-brand-950' : 'text-slate-900'}`}>
                    Other / Specialized Course Syllabus
                  </span>
                  <p className="text-[11px] text-slate-500">
                    Need a custom syllabus? Enter a specialized topic or elective course
                  </p>
                  {isCustomSelected && (
                    <input
                      type="text"
                      autoFocus
                      value={customSyllabusInput}
                      onChange={handleCustomInputChange}
                      onClick={(e) => e.stopPropagation()}
                      placeholder="e.g. Specialized Revision Module"
                      className="w-full mt-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs bg-white focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                    />
                  )}
                </div>
              </div>
            </div>

            {/* Error Message if user tries booking without choosing syllabus */}
            {syllabusError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{syllabusError}</span>
              </div>
            )}

            {/* Footer Buttons: Cancel & Book Test */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-100">
              <div className="text-xs text-slate-500 self-start sm:self-auto">
                Selected Syllabus:{' '}
                <strong className={selectedSyllabus ? "text-brand-700 font-bold" : "text-slate-500"}>
                  {selectedSyllabus || (isCustomSelected ? customSyllabusInput || 'Typing custom...' : 'None chosen yet')}
                </strong>
              </div>

              <div className="flex items-center space-x-3 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => setBookingSlotTarget(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmBook}
                  disabled={bookingLoading || !selectedSyllabus.trim()}
                  className={`inline-flex items-center justify-center space-x-2 px-5 py-2.5 rounded-xl text-xs font-semibold shadow-xs transition-all active:scale-98 ${
                    !selectedSyllabus.trim() || bookingLoading
                      ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                      : 'bg-brand-600 text-white hover:bg-brand-700 ring-1 ring-brand-700/20'
                  }`}
                >
                  <CalendarPlus className="w-4 h-4" />
                  <span>{bookingLoading ? 'Processing Booking...' : 'Book Test'}</span>
                </button>
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
            <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-3 p-4 bg-emerald-50 rounded-2xl border border-emerald-200">
              <div className="p-2.5 rounded-xl bg-emerald-600 text-white shadow-xs shrink-0">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-emerald-950">
                  Seat Confirmed! Booking Successful
                </h3>
                <p className="text-xs text-emerald-800">
                  Your test booking is confirmed and synced directly to the Administrator Portal.
                </p>
              </div>
            </div>

            {/* Prominent Booking Reference ID Card */}
            <div className="p-4 bg-gradient-to-r from-brand-50 to-indigo-50/70 rounded-2xl border-2 border-brand-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-brand-700 block">
                  Booking Reference ID:
                </span>
                <span className="font-mono text-base sm:text-lg font-extrabold text-slate-900 tracking-wide select-all">
                  {successModalData.bookingId}
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleCopyBookingId(successModalData.bookingId)}
                className="inline-flex items-center space-x-1.5 px-3.5 py-2 text-xs font-bold text-brand-700 bg-white border border-brand-200 rounded-xl hover:bg-brand-50 hover:border-brand-300 shadow-2xs transition-all active:scale-98 self-stretch sm:self-auto justify-center"
                title="Copy Booking Reference ID"
              >
                {copiedSuccessId ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-700">Copied Reference ID!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-brand-600" />
                    <span>Copy Reference ID</span>
                  </>
                )}
              </button>
            </div>

            {/* Booking Details Card */}
            <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4 sm:p-5 space-y-3 text-xs">
              <div className="flex items-center justify-between pb-2.5 border-b border-slate-200">
                <span className="text-slate-500 font-medium">Booking Reference ID:</span>
                <span className="font-mono font-bold text-brand-700 bg-white px-2.5 py-0.5 rounded border border-slate-200 text-xs">
                  {successModalData.bookingId}
                </span>
              </div>

              <div className="flex items-center justify-between pb-2.5 border-b border-slate-200">
                <span className="text-slate-500 font-medium">Test Date:</span>
                <div className="flex items-center space-x-1 font-bold text-slate-900">
                  <Calendar className="w-3.5 h-3.5 text-brand-600" />
                  <span>{successModalData.testDate}</span>
                </div>
              </div>

              <div className="flex items-center justify-between pb-2.5 border-b border-slate-200">
                <span className="text-slate-500 font-medium">Time Slot:</span>
                <div className="flex items-center space-x-1 font-bold text-brand-700 bg-brand-50 px-2 py-0.5 rounded border border-brand-200/80">
                  <Clock className="w-3.5 h-3.5 text-brand-600" />
                  <span>{successModalData.timeSlot}</span>
                </div>
              </div>

              <div className="flex items-center justify-between pb-2.5 border-b border-slate-200">
                <span className="text-slate-500 font-medium">Test Syllabus:</span>
                <span className="font-bold text-indigo-900 bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded-md text-right max-w-[240px] truncate">
                  {successModalData.syllabus}
                </span>
              </div>

              {successModalData.studentName && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Student Registered:</span>
                  <span className="font-semibold text-slate-800">
                    {successModalData.studentName} ({successModalData.studentId})
                  </span>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSuccessModalData(null)}
                className="w-full sm:w-auto px-4 py-2.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  setSuccessModalData(null);
                  navigate('/student');
                }}
                className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-5 py-2.5 text-xs font-semibold text-white bg-brand-600 rounded-xl hover:bg-brand-700 shadow-xs transition-colors"
              >
                <span>View in Dashboard</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
