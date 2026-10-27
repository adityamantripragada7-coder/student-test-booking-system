import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/client';
import { ShieldCheck, Server, Database, Key, CheckCircle2, AlertCircle } from 'lucide-react';

export const AdminSettings: React.FC = () => {
  const { user } = useAuth();
  const [health, setHealth] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/health').then((res) => {
      setHealth(res);
      setLoading(false);
    });
  }, []);

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <h1 className="text-xl font-bold text-slate-900">System Settings & Configuration</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          View infrastructure health, authentication keys, and database server settings.
        </p>
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
          <span>Backend Server Health</span>
        </div>

        {loading ? (
          <p className="text-xs text-slate-500 animate-pulse">Checking API health...</p>
        ) : health?.status === 'healthy' ? (
          <div className="space-y-3">
            <div className="flex items-center space-x-2 text-xs text-emerald-700 bg-emerald-50 p-3 rounded-xl border border-emerald-200 font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Express API & MongoDB Atlas are running and fully healthy.</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-500 block mb-1">API Status</span>
                <span className="font-semibold text-slate-900 uppercase">{health.status}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-500 block mb-1">Environment</span>
                <span className="font-semibold text-slate-900 capitalize">{health.environment}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center space-x-2 text-xs text-rose-700 bg-rose-50 p-3 rounded-xl border border-rose-200">
            <AlertCircle className="w-4 h-4 text-rose-600" />
            <span>Health check failed or server unreachable.</span>
          </div>
        )}
      </div>

      {/* Vercel & MongoDB Atlas Setup Guidelines */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3 text-xs text-slate-600 leading-relaxed">
        <div className="flex items-center space-x-2 font-semibold text-slate-900">
          <Database className="w-4 h-4 text-slate-700" />
          <span>Deployment Environment Variables</span>
        </div>
        <p>
          The system relies on persistent environment variables configured in Vercel or your local <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-800 font-mono">.env</code> file:
        </p>
        <ul className="list-disc pl-5 space-y-1 font-mono text-[11px] text-slate-700">
          <li>MONGODB_URI = mongodb+srv://...</li>
          <li>JWT_SECRET = [min 32 character random string]</li>
          <li>ADMIN_SETUP_SECRET = [secret key for registering new admins]</li>
        </ul>
      </div>
    </div>
  );
};
