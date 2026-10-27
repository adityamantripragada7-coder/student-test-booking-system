import React, { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { Badge } from '../../components/Badge';
import { CardSkeleton, TableSkeleton } from '../../components/Skeleton';
import { EmptyState } from '../../components/EmptyState';
import { Users, CalendarDays, BookmarkCheck, FileSpreadsheet, ArrowUpRight, Clock, PlusCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

export const AdminDashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalTestSlots: 0,
    totalBookings: 0,
    totalResults: 0,
  });
  const [upcomingTests, setUpcomingTests] = useState<any[]>([]);
  const [recentBookings, setRecentBookings] = useState<any[]>([]);
  const [error, setError] = useState('');

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/stats');
      if (res.success) {
        setStats(res.stats);
        setUpcomingTests(res.upcomingTests || []);
        setRecentBookings(res.recentBookings || []);
      } else {
        setError(res.message || 'Failed to load dashboard metrics');
      }
    } catch (err: any) {
      setError('Error connecting to database server');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
        <TableSkeleton rows={4} cols={4} />
      </div>
    );
  }

  const statCards = [
    {
      title: 'Total Students',
      value: stats.totalStudents,
      icon: Users,
      color: 'bg-blue-500',
      link: '/admin/students',
    },
    {
      title: 'Test Slots',
      value: stats.totalTestSlots,
      icon: CalendarDays,
      color: 'bg-indigo-500',
      link: '/admin/slots',
    },
    {
      title: 'Active Bookings',
      value: stats.totalBookings,
      icon: BookmarkCheck,
      color: 'bg-emerald-500',
      link: '/admin/bookings',
    },
    {
      title: 'Published Results',
      value: stats.totalResults,
      icon: FileSpreadsheet,
      color: 'bg-purple-500',
      link: '/admin/results',
    },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Administrator Overview</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Real-time analytics and management metrics from MongoDB Atlas database.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Link
            to="/admin/slots"
            className="inline-flex items-center space-x-2 px-4 py-2 text-xs font-semibold text-white bg-brand-600 rounded-xl hover:bg-brand-700 shadow-xs transition-colors"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Create Test Slot</span>
          </Link>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.title}
              to={card.link}
              className="group bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs hover:shadow-md transition-all hover:border-brand-200 flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  {card.title}
                </span>
                <div className={`p-2.5 rounded-xl text-white ${card.color} shadow-xs`}>
                  <Icon className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-4 flex items-baseline justify-between">
                <span className="text-2xl font-bold text-slate-900 tracking-tight">
                  {card.value}
                </span>
                <span className="text-xs text-brand-600 font-medium group-hover:translate-x-0.5 transition-transform inline-flex items-center">
                  View <ArrowUpRight className="w-3.5 h-3.5 ml-0.5" />
                </span>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Tables Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Upcoming Test Slots */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden flex flex-col">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-brand-600" />
              <h2 className="text-sm font-semibold text-slate-900">Upcoming Test Slots</h2>
            </div>
            <Link to="/admin/slots" className="text-xs font-semibold text-brand-600 hover:underline">
              Manage Slots &rarr;
            </Link>
          </div>

          <div className="flex-1 overflow-x-auto">
            {upcomingTests.length === 0 ? (
              <EmptyState title="No Test Slots" description="No upcoming examination slots found." />
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-semibold uppercase border-b border-slate-100">
                  <tr>
                    <th className="px-5 py-3">Slot Schedule</th>
                    <th className="px-5 py-3">Start Time</th>
                    <th className="px-5 py-3">Capacity</th>
                    <th className="px-5 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {upcomingTests.map((slot) => (
                    <tr key={slot._id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-5 py-3.5 font-semibold text-slate-900">{slot.testDate}</td>
                      <td className="px-5 py-3.5 font-semibold text-brand-700">
                        {slot.startTime}
                      </td>
                      <td className="px-5 py-3.5 text-slate-600">
                        {slot.bookedCount} / {slot.capacity} seats
                      </td>
                      <td className="px-5 py-3.5">
                        <Badge status={slot.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Recent Active Bookings */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden flex flex-col">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <BookmarkCheck className="w-4 h-4 text-emerald-600" />
              <h2 className="text-sm font-semibold text-slate-900">Recent Student Bookings</h2>
            </div>
            <Link to="/admin/bookings" className="text-xs font-semibold text-brand-600 hover:underline">
              View All &rarr;
            </Link>
          </div>

          <div className="flex-1 overflow-x-auto">
            {recentBookings.length === 0 ? (
              <EmptyState title="No Bookings" description="No active test bookings created yet." />
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-semibold uppercase border-b border-slate-100">
                  <tr>
                    <th className="px-5 py-3">Student</th>
                    <th className="px-5 py-3">Test Slot</th>
                    <th className="px-5 py-3">Test Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentBookings.map((b) => (
                    <tr key={b._id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-5 py-3.5">
                        <p className="font-medium text-slate-900">{b.student?.name || 'Unknown'}</p>
                        <p className="text-slate-400 font-mono text-[11px]">{b.student?.studentId}</p>
                      </td>
                      <td className="px-5 py-3.5 text-slate-700 font-medium">
                        {b.slot?.testTitle || 'Deleted Slot'}
                      </td>
                      <td className="px-5 py-3.5 text-slate-600">
                        {b.slot?.testDate} ({b.slot?.startTime})
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
