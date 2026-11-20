import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/client';
import { Booking, Result, TestSlot } from '../../types';
import { Badge } from '../../components/Badge';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { CardSkeleton } from '../../components/Skeleton';
import { TestAssessmentModal } from '../../components/TestAssessmentModal';
import {
  CalendarPlus,
  Award,
  Clock,
  MapPin,
  AlertCircle,
  CheckCircle2,
  UserCheck,
  CalendarDays,
  ArrowRight,
  BookOpen,
  Send,
  Star,
  Users,
  Calendar,
  CheckCircle,
  Sparkles,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatTimeDisplay } from '../admin/Bookings';

export const StudentDashboard: React.FC = () => {
  const { user } = useAuth();
  const [activeBooking, setActiveBooking] = useState<Booking | null>(null);
  const [latestResult, setLatestResult] = useState<Result | null>(null);
  const [availableSlots, setAvailableSlots] = useState<TestSlot[]>([]);
  const [historyResults, setHistoryResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(true);

  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Cancel Modal State
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);

  // Test Assessment Modal State
  const [showTestModal, setShowTestModal] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [bookingRes, resultRes, slotsRes] = await Promise.all([
        api.get('/bookings/my'),
        api.get('/results/my'),
        api.get('/slots?status=Available'),
      ]);

      if (bookingRes.success) {
        setActiveBooking(bookingRes.booking);
      }
      if (resultRes.success) {
        setLatestResult(resultRes.latestResult);
        setHistoryResults(resultRes.history || []);
      }
      if (slotsRes.success) {
        setAvailableSlots(slotsRes.slots || []);
      }
    } catch (err: any) {
      setNotification({ type: 'error', message: 'Failed to sync student dashboard' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCancelBooking = async () => {
    if (!activeBooking) return;
    setCancelLoading(true);
    try {
      const res = await api.post(`/bookings/cancel/${activeBooking._id}`);
      if (res.success) {
        setNotification({
          type: 'success',
          message: 'Booking cancelled successfully. You can now select another slot.',
        });
        setShowCancelModal(false);
        setActiveBooking(null);
        fetchData();
      } else {
        setNotification({ type: 'error', message: res.message || 'Failed to cancel booking.' });
      }
    } catch (err: any) {
      setNotification({ type: 'error', message: 'Network error cancelling booking.' });
    } finally {
      setCancelLoading(false);
    }
  };

  const handleTestSubmitted = (data: any) => {
    setNotification({
      type: 'success',
      message: `Test answers successfully submitted and evaluated! Score: ${data.submission.totalScore}/${data.submission.maxScore} (Grade: ${data.submission.grade})`,
    });
    fetchData();
  };

  if (loading) {
    return (
      <div className="space-y-6 max-w-6xl mx-auto">
        <CardSkeleton />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <CardSkeleton />
          <CardSkeleton />
        </div>
      </div>
    );
  }

  const slot = activeBooking && typeof activeBooking.slot === 'object' ? activeBooking.slot : null;

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in max-w-6xl mx-auto">
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

      {/* Hero Welcome Banner */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-8 rounded-3xl shadow-xl border border-white/10">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-52 h-52 bg-brand-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-2.5">
            <div className="inline-flex items-center space-x-2 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-xs font-semibold text-teal-300 border border-white/15">
              <UserCheck className="w-3.5 h-3.5 text-teal-400" />
              <span>EduTest Student Workspace</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Welcome, {user?.name}!
            </h1>
            <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm text-slate-300">
              <div className="flex items-center space-x-1.5">
                <span>Student ID:</span>
                <span className="font-mono font-bold text-white bg-white/15 px-2.5 py-0.5 rounded-lg border border-white/10">
                  {user?.studentId}
                </span>
              </div>
              {user?.phone && (
                <div className="hidden sm:flex items-center space-x-1 text-slate-300">
                  <span>•</span>
                  <span>Phone: {user.phone}</span>
                </div>
              )}
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2 lg:pt-0">
            <Link
              to="/student/book"
              className="inline-flex items-center justify-center space-x-2 px-5 py-3 text-xs sm:text-sm font-bold text-slate-900 bg-white rounded-2xl hover:bg-slate-100 active:scale-98 shadow-md transition-all"
            >
              <CalendarPlus className="w-4 h-4 text-brand-600" />
              <span>Book Test Slot</span>
            </Link>
            <Link
              to="/student/results"
              className="inline-flex items-center justify-center space-x-2 px-5 py-3 text-xs sm:text-sm font-semibold text-white bg-white/10 hover:bg-white/20 active:scale-98 border border-white/20 rounded-2xl backdrop-blur-md transition-all"
            >
              <Award className="w-4 h-4 text-amber-400" />
              <span>My Published Results</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Quick Summary Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Booking Status */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Booking Status</span>
            <div className="p-1.5 rounded-lg bg-brand-50 text-brand-600">
              <CalendarDays className="w-4 h-4" />
            </div>
          </div>
          <p className="text-base sm:text-lg font-extrabold text-slate-900">
            {activeBooking ? 'Active Reservation' : 'No Active Booking'}
          </p>
          <span className="text-[11px] text-slate-400 block truncate">
            {activeBooking && slot ? `${slot.testDate}` : 'Ready to reserve'}
          </span>
        </div>

        {/* Metric 2: Syllabus Enrolled */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Enrolled Syllabus</span>
            <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
              <BookOpen className="w-4 h-4" />
            </div>
          </div>
          <p className="text-base sm:text-lg font-extrabold text-slate-900 truncate">
            {activeBooking ? activeBooking.syllabus : 'Not Chosen'}
          </p>
          <span className="text-[11px] text-slate-400 block truncate">
            {activeBooking ? 'Target evaluation module' : 'Choose in booking modal'}
          </span>
        </div>

        {/* Metric 3: Total Tests Taken */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Evaluations Taken</span>
            <div className="p-1.5 rounded-lg bg-teal-50 text-teal-600">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <p className="text-base sm:text-lg font-extrabold text-slate-900">
            {historyResults.length} {historyResults.length === 1 ? 'Exam' : 'Exams'}
          </p>
          <span className="text-[11px] text-slate-400 block truncate">
            Official records on file
          </span>
        </div>

        {/* Metric 4: Latest Grade */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Latest Performance</span>
            <div className="p-1.5 rounded-lg bg-amber-50 text-amber-600">
              <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
            </div>
          </div>
          <p className="text-base sm:text-lg font-extrabold text-brand-600">
            {latestResult ? latestResult.grade || 'Published' : 'Pending'}
          </p>
          <span className="text-[11px] text-slate-400 block truncate">
            {latestResult ? latestResult.testName : 'Awaiting first test'}
          </span>
        </div>
      </div>

      {/* Main Grid: Active Booking & Latest Result */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Booking Card */}
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 sm:p-7 flex flex-col justify-between space-y-5 hover:shadow-md transition-shadow">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-brand-50 border border-brand-100">
                  <CalendarDays className="w-5 h-5 text-brand-600" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-slate-900">Current Slot Booking</h2>
                  <p className="text-[11px] text-slate-400">Your registered examination schedule</p>
                </div>
              </div>
              {activeBooking && <Badge status={activeBooking.status} />}
            </div>

            {activeBooking && slot ? (
              <div className="mt-5 space-y-4">
                {/* Slot Details Box */}
                <div className="p-4 sm:p-5 bg-gradient-to-br from-slate-50 to-brand-50/30 rounded-2xl border border-slate-200/70 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-brand-600 block">Booked Session</span>
                      <h3 className="text-sm sm:text-base font-bold text-slate-900">
                        {slot.testTitle || 'General Examination Session'}
                      </h3>
                    </div>
                    <span className="font-mono text-[10px] text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded-md shrink-0">
                      ID: {activeBooking._id.slice(-6)}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                    <div className="flex items-center space-x-2 text-xs font-semibold text-slate-700 bg-white p-2.5 rounded-xl border border-slate-100 shadow-2xs">
                      <CalendarDays className="w-4 h-4 text-brand-600 shrink-0" />
                      <span>{slot.testDate}</span>
                    </div>

                    <div className="flex items-center space-x-2 text-xs font-semibold text-slate-700 bg-white p-2.5 rounded-xl border border-slate-100 shadow-2xs">
                      <Clock className="w-4 h-4 text-brand-600 shrink-0" />
                      <span>{formatTimeDisplay(slot.startTime)}</span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 text-xs font-semibold text-indigo-950 bg-indigo-50/70 px-3 py-2 rounded-xl border border-indigo-100">
                    <BookOpen className="w-4 h-4 text-indigo-600 shrink-0" />
                    <span className="truncate">
                      Syllabus: <strong className="text-indigo-900">{activeBooking.syllabus || 'General Syllabus'}</strong>
                    </span>
                  </div>

                  {slot.location && (
                    <div className="flex items-center space-x-2 text-xs text-slate-600 pt-0.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{slot.location}</span>
                    </div>
                  )}
                </div>

                {/* Primary Actions: Take Test & Cancel */}
                <div className="pt-2 flex flex-col sm:flex-row items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => setShowTestModal(true)}
                    className="w-full sm:flex-1 inline-flex items-center justify-center space-x-2 px-4 py-3 text-xs sm:text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-98 rounded-2xl shadow-xs transition-all"
                  >
                    <Send className="w-4 h-4 shrink-0" />
                    <span>Take Test & Submit Answers</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowCancelModal(true)}
                    className="w-full sm:w-auto px-4 py-3 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 active:scale-98 border border-rose-200/80 rounded-2xl transition-all"
                  >
                    Cancel Booking
                  </button>
                </div>

                <div className="pt-1 text-center sm:text-left">
                  <span className="text-[11px] text-slate-400">
                    Booked on {new Date(activeBooking.bookedAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ) : (
              <div className="py-10 text-center space-y-4">
                <div className="w-12 h-12 mx-auto rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">
                  <CalendarPlus className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-slate-700">No active test booking</p>
                  <p className="text-xs text-slate-400 max-w-xs mx-auto">
                    You have not reserved any examination slot yet. Choose from the available sessions to book.
                  </p>
                </div>
                <Link
                  to="/student/book"
                  className="inline-flex items-center space-x-2 px-5 py-2.5 text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 rounded-xl shadow-xs transition-colors"
                >
                  <span>Browse Available Slots</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Published Result Card */}
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 sm:p-7 flex flex-col justify-between space-y-5 hover:shadow-md transition-shadow">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-amber-50 border border-amber-100">
                  <Award className="w-5 h-5 text-amber-500" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-slate-900">Latest Test Result</h2>
                  <p className="text-[11px] text-slate-400">Academic performance evaluation</p>
                </div>
              </div>
              {latestResult && <Badge status={latestResult.status || 'Published'} />}
            </div>

            {latestResult ? (
              <div className="mt-5 space-y-4">
                <div className="p-4 sm:p-5 bg-gradient-to-br from-slate-50 to-indigo-50/20 rounded-2xl border border-slate-200/70 space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Assessment</span>
                      <h3 className="text-sm sm:text-base font-bold text-slate-900">{latestResult.testName}</h3>
                    </div>
                    <span className="text-[11px] font-medium text-slate-400">
                      {new Date(latestResult.dateUploaded).toLocaleDateString()}
                    </span>
                  </div>

                  {/* Two Result Categories: Memory & Mistakes or Overall Grade */}
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div className="p-3.5 bg-white rounded-2xl border border-slate-200/80 shadow-2xs space-y-1.5 text-center">
                      <div className="flex items-center justify-center space-x-1 text-xs font-bold text-slate-700">
                        <span>MEMORY</span>
                        <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                      </div>
                      <div>
                        <Badge status={latestResult.grade || 'A+'} className="text-sm px-3 py-0.5" />
                      </div>
                    </div>

                    <div className="p-3.5 bg-white rounded-2xl border border-slate-200/80 shadow-2xs space-y-1.5 text-center">
                      <div className="flex items-center justify-center space-x-1 text-xs font-bold text-slate-700">
                        <span>MISTAKES</span>
                        <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                      </div>
                      <div>
                        <Badge status={latestResult.grade || 'A+'} className="text-sm px-3 py-0.5" />
                      </div>
                    </div>
                  </div>

                  {latestResult.marksObtained !== null && latestResult.marksObtained !== undefined && (
                    <div className="flex items-center justify-between text-xs text-slate-600 pt-1 border-t border-slate-200/50">
                      <span>Score Obtained:</span>
                      <span className="font-bold text-slate-900">
                        {latestResult.marksObtained} {latestResult.maxMarks ? `/ ${latestResult.maxMarks}` : ''}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-slate-400">Official Evaluation</span>
                  <Link
                    to="/student/results"
                    className="inline-flex items-center space-x-1.5 text-xs font-bold text-brand-600 hover:text-brand-700 hover:underline"
                  >
                    <span>View Full Grade History</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ) : (
              <div className="py-10 text-center space-y-3">
                <div className="w-12 h-12 mx-auto rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-500">
                  <Award className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-slate-700">Results are not yet published</p>
                  <p className="text-xs text-slate-400 max-w-xs mx-auto">
                    Your assessment evaluations will appear here once submitted and verified.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Available Slots Quick Preview */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 sm:p-7 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center space-x-2">
              <Calendar className="w-5 h-5 text-brand-600" />
              <span>Upcoming Examination Sessions</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Current open test slots available for student booking
            </p>
          </div>
          <Link
            to="/student/book"
            className="text-xs font-bold text-brand-600 hover:text-brand-700 hover:underline inline-flex items-center space-x-1"
          >
            <span>View All Sessions</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {availableSlots.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-400">
            No upcoming examination slots scheduled right now.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {availableSlots.slice(0, 3).map((s) => (
              <div
                key={s._id}
                className="p-4 rounded-2xl border border-slate-200/80 bg-slate-50/50 hover:bg-white hover:border-brand-300 hover:shadow-xs transition-all space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div className="font-bold text-sm text-slate-900">{s.testDate}</div>
                  <Badge status={s.status} />
                </div>
                <div className="space-y-1 text-xs text-slate-600">
                  <div className="flex items-center space-x-1.5">
                    <Clock className="w-3.5 h-3.5 text-brand-600" />
                    <span>Time: {formatTimeDisplay(s.startTime)}</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <Users className="w-3.5 h-3.5 text-slate-400" />
                    <span>
                      <strong className="text-emerald-700">{s.availableSeats}</strong> seats open
                    </span>
                  </div>
                </div>
                <Link
                  to="/student/book"
                  className="block text-center py-2 px-3 text-xs font-bold text-brand-600 bg-white hover:bg-brand-50 border border-brand-200 rounded-xl transition-colors"
                >
                  Reserve Slot &rarr;
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Cancel Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showCancelModal}
        title="Cancel Test Slot Booking"
        message="Are you sure you want to cancel this booking? The slot will be released back to other students and you will be able to choose a new slot."
        confirmText={cancelLoading ? 'Cancelling...' : 'Yes, Cancel Booking'}
        onConfirm={handleCancelBooking}
        onClose={() => setShowCancelModal(false)}
        isDanger={true}
        loading={cancelLoading}
      />

      {/* Test Assessment Modal */}
      {activeBooking && (
        <TestAssessmentModal
          isOpen={showTestModal}
          onClose={() => setShowTestModal(false)}
          bookingId={activeBooking._id}
          syllabus={activeBooking.syllabus}
          onSuccess={handleTestSubmitted}
        />
      )}
    </div>
  );
};
