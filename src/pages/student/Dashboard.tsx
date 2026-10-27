import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/client';
import { Booking, Result } from '../../types';
import { Badge } from '../../components/Badge';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { CardSkeleton } from '../../components/Skeleton';
import { EmptyState } from '../../components/EmptyState';
import { CalendarPlus, Award, Clock, MapPin, AlertCircle, CheckCircle2, UserCheck, CalendarDays, ArrowRight, BookOpen } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatTimeDisplay } from '../admin/Bookings';

export const StudentDashboard: React.FC = () => {
  const { user } = useAuth();
  const [activeBooking, setActiveBooking] = useState<Booking | null>(null);
  const [latestResult, setLatestResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(true);

  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Cancel Modal State
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [bookingRes, resultRes] = await Promise.all([
        api.get('/bookings/my'),
        api.get('/results/my'),
      ]);

      if (bookingRes.success) {
        setActiveBooking(bookingRes.booking);
      }
      if (resultRes.success) {
        setLatestResult(resultRes.latestResult);
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
        setNotification({ type: 'success', message: 'Booking cancelled successfully. You can now book another slot.' });
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

  if (loading) {
    return (
      <div className="space-y-6">
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

      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-slate-900 to-navy-900 text-white p-6 sm:p-8 rounded-2xl shadow-md flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center space-x-2 px-3 py-1 bg-white/10 backdrop-blur-xs rounded-full text-xs font-medium text-blue-200 border border-white/10">
            <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Student Portal</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Welcome back, {user?.name}!</h1>
          <p className="text-xs text-slate-300">
            Student ID: <strong className="text-white font-mono bg-white/10 px-2 py-0.5 rounded">{user?.studentId}</strong>
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            to="/student/book"
            className="inline-flex items-center justify-center space-x-2 px-4 py-2.5 text-xs font-semibold text-slate-900 bg-white rounded-xl hover:bg-slate-100 shadow-sm transition-colors"
          >
            <CalendarPlus className="w-4 h-4 text-brand-600" />
            <span>Book Test Slot</span>
          </Link>
          <Link
            to="/student/results"
            className="inline-flex items-center justify-center space-x-2 px-4 py-2.5 text-xs font-semibold text-white bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl transition-colors"
          >
            <Award className="w-4 h-4 text-amber-400" />
            <span>View My Results</span>
          </Link>
        </div>
      </div>

      {/* Main Grid: Active Booking & Latest Result */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Active Booking Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-6 flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center space-x-2">
              <CalendarDays className="w-5 h-5 text-brand-600" />
              <h2 className="text-base font-bold text-slate-900">Current Booking Status</h2>
            </div>
            {activeBooking && <Badge status={activeBooking.status} />}
          </div>

          {activeBooking && slot ? (
            <div className="space-y-4">
              <div className="p-4 bg-brand-50/50 rounded-xl border border-brand-100 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-xs font-semibold text-brand-900">
                    <CalendarDays className="w-4 h-4 text-brand-600" />
                    <span>Test Session: {slot.testDate}</span>
                  </div>
                  <span className="font-mono text-[10px] text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded font-medium" title="Booking ID">
                    ID: {activeBooking._id}
                  </span>
                </div>

                <div className="flex items-center space-x-2 text-xs font-bold text-brand-700 bg-white px-2.5 py-1 rounded-lg border border-brand-200/60 w-fit">
                  <Clock className="w-3.5 h-3.5 text-brand-600" />
                  <span>Start Time: {formatTimeDisplay(slot.startTime)}</span>
                </div>

                {/* Selected Test Syllabus */}
                <div className="flex items-center space-x-2 text-xs font-semibold text-indigo-950 bg-indigo-50/80 px-2.5 py-1.5 rounded-lg border border-indigo-200/60">
                  <BookOpen className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                  <span>Syllabus: <strong className="text-indigo-900">{activeBooking.syllabus || 'General Syllabus'}</strong></span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-[11px] text-slate-400">
                  Booked on {new Date(activeBooking.bookedAt).toLocaleDateString()}
                </span>
                <button
                  onClick={() => setShowCancelModal(true)}
                  className="px-3 py-1.5 text-xs font-medium text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors"
                >
                  Cancel Booking
                </button>
              </div>
            </div>
          ) : (
            <div className="py-6 text-center space-y-3">
              <p className="text-xs text-slate-500 leading-relaxed">
                You do not have any active test bookings right now.
              </p>
              <Link
                to="/student/book"
                className="inline-flex items-center space-x-2 text-xs font-semibold text-brand-600 hover:text-brand-700 hover:underline"
              >
                <span>Select & Book Available Test Slot</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}
        </div>

        {/* Latest Result Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-6 flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center space-x-2">
              <Award className="w-5 h-5 text-amber-500" />
              <h2 className="text-base font-bold text-slate-900">Latest Test Result</h2>
            </div>
            {latestResult && <Badge status={latestResult.grade} />}
          </div>

          {latestResult ? (
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <h3 className="text-sm font-bold text-slate-900">{latestResult.testName}</h3>
                <div className="flex items-baseline justify-between pt-1">
                  <div>
                    <span className="text-xs text-slate-500 block">Marks (Optional)</span>
                    <span className="text-xl font-bold text-slate-900">
                      {latestResult.marksObtained !== null && latestResult.marksObtained !== undefined
                        ? `${latestResult.marksObtained}${latestResult.maxMarks ? ` / ${latestResult.maxMarks}` : ''}`
                        : '—'}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-slate-500 block">Grade</span>
                    <span className="text-lg font-mono font-bold text-brand-600">
                      {latestResult.grade}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-[11px] text-slate-400">
                  Published on {new Date(latestResult.dateUploaded).toLocaleDateString()}
                </span>
                <Link
                  to="/student/results"
                  className="text-xs font-semibold text-brand-600 hover:underline"
                >
                  Full History &rarr;
                </Link>
              </div>
            </div>
          ) : (
            <div className="py-6 text-center space-y-3">
              <p className="text-xs text-slate-500 leading-relaxed">
                No examination results have been published for your profile yet.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Cancel Confirmation Modal */}
      {activeBooking && (
        <ConfirmDialog
          isOpen={showCancelModal}
          onClose={() => setShowCancelModal(false)}
          onConfirm={handleCancelBooking}
          title="Cancel Your Test Booking?"
          message="Are you sure you want to cancel your test slot? Cancelling will release your reserved seat immediately so other students can book it."
          confirmText="Yes, Cancel Booking"
          loading={cancelLoading}
        />
      )}
    </div>
  );
};
