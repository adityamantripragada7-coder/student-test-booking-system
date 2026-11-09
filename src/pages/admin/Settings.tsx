import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/client';
import { ShieldCheck, Server, Database, Key, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';

export const AdminSettings: React.FC = () => {
  const { user } = useAuth();
  const [health, setHealth] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchHealth = () => {
    setLoading(true);
    api.get('/health').then((res) => {
      setHealth(res);
      setLoading(false);
    });
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">System Settings & Configuration</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            View infrastructure health, authentication keys, and database server settings.
          </p>
        </div>
        <button
          onClick={fetchHealth}
          className="p-2 text-slate-500 hover:text-brand-600 hover:bg-slate-50 rounded-xl border border-slate-200 transition-colors"
          title="Refresh Status"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-brand-600' : ''}`} />
        </button>
      </div>

      {/* Admin Profile Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center space-x-3 pb-4 border-b border-slate-100">
          <div className="p-2.5 bg-brand-100 text-brand-700 rounded-xl">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-900">{user?.name}</h2>
            <p className="text-xs text-slate-500">Administrator Username: @{user?.username}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-slate-500 block mb-1">Role & Authority</span>
            <span className="font-semibold text-slate-900">Full System Administrator</span>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-slate-500 block mb-1">Administrator Email</span>
            <span className="font-semibold text-slate-900">{user?.email || 'Not configured'}</span>
          </div>
        </div>
      </div>

      {/* Infrastructure Health */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center space-x-2 font-semibold text-slate-900 border-b border-slate-100 pb-3">
          <Server className="w-5 h-5 text-brand-600" />
          <span>Backend Server & Database Status</span>
        </div>

        {loading ? (
          <p className="text-xs text-slate-500 animate-pulse">Checking API health...</p>
        ) : health?.status === 'healthy' && health?.database?.connected ? (
          <div className="space-y-4">
            <div className="flex items-center space-x-2 text-xs text-emerald-700 bg-emerald-50 p-3 rounded-xl border border-emerald-200 font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Express API & {health?.database?.engine || 'Persistent Database'} are connected and operating normally.</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-500 block mb-1">Database Engine</span>
                <span className="font-semibold text-slate-900">
                  {health?.database?.engine || 'MongoDB Atlas'} ({health?.database?.name || 'test_booking'})
                </span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-500 block mb-1">Environment</span>
                <span className="font-semibold text-slate-900 capitalize">{health.environment}</span>
              </div>
            </div>

            {/* Collection Records in MongoDB Atlas */}
            {health.counts && (
              <div className="pt-2">
                <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider block mb-2">
                  Permanent MongoDB Atlas Records
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 text-xs">
                  <div className="p-3 bg-blue-50/60 border border-blue-200/60 rounded-xl text-center">
                    <span className="text-[11px] text-blue-700 font-medium block">Students</span>
                    <span className="text-lg font-bold text-blue-950">{health.counts.students ?? 0}</span>
                  </div>
                  <div className="p-3 bg-emerald-50/60 border border-emerald-200/60 rounded-xl text-center">
                    <span className="text-[11px] text-emerald-700 font-medium block">Active Bookings</span>
                    <span className="text-lg font-bold text-emerald-950">{health.counts.activeBookings ?? 0}</span>
                  </div>
                  <div className="p-3 bg-amber-50/60 border border-amber-200/60 rounded-xl text-center">
                    <span className="text-[11px] text-amber-700 font-medium block">Slokas</span>
                    <span className="text-lg font-bold text-amber-950">{health.counts.slokas ?? 0}</span>
                  </div>
                  <div className="p-3 bg-purple-50/60 border border-purple-200/60 rounded-xl text-center">
                    <span className="text-[11px] text-purple-700 font-medium block">Test Answers</span>
                    <span className="text-lg font-bold text-purple-950">{health.counts.submittedAnswers ?? 0}</span>
                  </div>
                  <div className="p-3 bg-indigo-50/60 border border-indigo-200/60 rounded-xl text-center">
                    <span className="text-[11px] text-indigo-700 font-medium block">Results</span>
                    <span className="text-lg font-bold text-indigo-950">{health.counts.results ?? 0}</span>
                  </div>
                  <div className="p-3 bg-slate-100 border border-slate-200 rounded-xl text-center">
                    <span className="text-[11px] text-slate-700 font-medium block">Test Slots</span>
                    <span className="text-lg font-bold text-slate-900">{health.counts.testSlots ?? 0}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center space-x-2 text-xs text-rose-700 bg-rose-50 p-3 rounded-xl border border-rose-200">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>Persistent database is not connected. Configure MONGODB_URI in Render/environment variables to ensure persistence.</span>
          </div>
        )}
      </div>

      {/* Render & MongoDB Atlas Setup Guidelines */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3 text-xs text-slate-600 leading-relaxed">
        <div className="flex items-center space-x-2 font-semibold text-slate-900">
          <Database className="w-4 h-4 text-slate-700" />
          <span>Production Deployment Environment Variables (Render)</span>
        </div>
        <p>
          To ensure newly created students, bookings, answers, and results are permanently persisted across Render server reboots and deployments, configure these in Render Dashboard &rarr; <strong>Environment</strong>:
        </p>
        <ul className="list-disc pl-5 space-y-1 font-mono text-[11px] text-slate-700">
          <li>MONGODB_URI = mongodb+srv://&lt;username&gt;:&lt;password&gt;@cluster.mongodb.net/test_booking?retryWrites=true&w=majority</li>
          <li>JWT_SECRET = [min 32 character random string]</li>
          <li>ADMIN_SETUP_SECRET = [secret key for registering new admins]</li>
          <li>NODE_ENV = production</li>
          <li>PORT = 5000</li>
        </ul>
      </div>
    </div>
  );
};
