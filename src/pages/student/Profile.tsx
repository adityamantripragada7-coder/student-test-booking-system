import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/client';
import {
  UserCheck,
  Shield,
  Phone,
  Calendar,
  Hash,
  Save,
  CheckCircle2,
  AlertCircle,
  User,
  KeyRound,
  Sparkles,
} from 'lucide-react';

export const StudentProfile: React.FC = () => {
  const { user, updateUser } = useAuth();

  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setPhone(user.phone || '');
    }
  }, [user]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!name.trim()) {
      setErrorMsg('Full Name cannot be left blank.');
      return;
    }

    if (!phone.trim()) {
      setErrorMsg('Mobile number cannot be left blank.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.put('/auth/profile', {
        name: name.trim(),
        phone: phone.trim(),
      });

      if (res.success && res.user) {
        updateUser(res.user);
        setSuccessMsg('Your profile details have been updated successfully!');
        setTimeout(() => setSuccessMsg(''), 4000);
      } else {
        setErrorMsg(res.message || 'Failed to update profile.');
      }
    } catch (err: any) {
      setErrorMsg('Server connection error while updating profile.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in max-w-4xl mx-auto">
      {/* Page Header */}
      <div className="bg-white p-6 sm:p-7 rounded-3xl border border-slate-200/90 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-brand-600 mb-1">
            <User className="w-4 h-4" />
            <span>Account Management</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900">Student Profile & Settings</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Review your institutional registration details and update your personal contact information.
          </p>
        </div>
        <div className="shrink-0 flex items-center space-x-2 bg-slate-50 px-3.5 py-2 rounded-2xl border border-slate-200/60">
          <span className="text-xs text-slate-500 font-medium">Account Status:</span>
          <span className="inline-flex items-center space-x-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Active Student</span>
          </span>
        </div>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs sm:text-sm text-emerald-800 flex items-center space-x-2.5 shadow-2xs">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span className="font-medium">{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs sm:text-sm text-rose-800 flex items-center space-x-2.5 shadow-2xs">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span className="font-medium">{errorMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: ID Card & Status */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-sm space-y-6 flex flex-col justify-between">
          <div className="space-y-5">
            {/* User Avatar & Title */}
            <div className="flex items-center space-x-4 pb-5 border-b border-slate-100">
              <div className="p-3.5 bg-gradient-to-br from-brand-500 to-indigo-600 text-white rounded-2xl shadow-sm">
                <UserCheck className="w-7 h-7" />
              </div>
              <div className="min-w-0">
                <h2 className="text-lg font-bold text-slate-900 truncate">{user?.name}</h2>
                <p className="text-xs text-slate-400 capitalize">{user?.role} Portal Access</p>
              </div>
            </div>

            {/* Official Credentials */}
            <div className="space-y-3 text-xs">
              <div className="p-3.5 bg-slate-50/80 rounded-2xl border border-slate-200/70 space-y-1">
                <div className="flex items-center justify-between text-slate-500 font-medium">
                  <span className="flex items-center space-x-1">
                    <Hash className="w-3.5 h-3.5 text-brand-600" />
                    <span>Official Student ID</span>
                  </span>
                  <span className="text-[10px] uppercase font-bold text-slate-400">Permanent</span>
                </div>
                <p className="font-mono font-extrabold text-base text-brand-700">
                  {user?.studentId || 'N/A'}
                </p>
              </div>

              <div className="p-3.5 bg-slate-50/80 rounded-2xl border border-slate-200/70 space-y-1">
                <div className="flex items-center space-x-1.5 text-slate-500 font-medium">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>Enrolled Since</span>
                </div>
                <p className="font-semibold text-slate-800">
                  {user?.registrationDate
                    ? new Date(user.registrationDate).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })
                    : 'N/A'}
                </p>
              </div>
            </div>
          </div>

          <div className="p-3.5 bg-teal-50/70 rounded-2xl border border-teal-200/70 text-xs text-teal-900 space-y-1">
            <span className="font-bold block text-teal-950">Database Persistence</span>
            <p className="text-[11px] text-teal-800 leading-relaxed">
              Student record is synced permanently with MongoDB Atlas cloud database.
            </p>
          </div>
        </div>

        {/* Right Column: Editable Profile Form */}
        <div className="lg:col-span-2 bg-white p-6 sm:p-7 rounded-3xl border border-slate-200/90 shadow-sm space-y-6">
          <div className="pb-4 border-b border-slate-100">
            <h3 className="text-base font-bold text-slate-900">Personal Details</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Update your registered name and mobile contact number.
            </p>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-5">
            {/* Full Name */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Full Name *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Dattaji"
                className="w-full px-4 py-3 rounded-2xl border border-slate-300 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 text-sm font-semibold text-slate-900 bg-slate-50/50 transition-colors"
              />
              <p className="mt-1.5 text-[11px] text-slate-400">
                This name will appear on examination certificates and test evaluations.
              </p>
            </div>

            {/* Mobile Number */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Registered Mobile Phone Number *
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-4 top-3.5" />
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. 9876543210"
                  className="w-full pl-11 pr-4 py-3 rounded-2xl border border-slate-300 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 text-sm font-semibold text-slate-900 bg-slate-50/50 transition-colors"
                />
              </div>
              <p className="mt-1.5 text-[11px] text-slate-400">
                Used for slot confirmation alerts and emergency academic notifications.
              </p>
            </div>

            {/* Read-Only Student ID */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Assigned Student ID (Immutable)
              </label>
              <input
                type="text"
                disabled
                value={user?.studentId || ''}
                className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-sm font-mono font-bold text-slate-500 bg-slate-100 cursor-not-allowed"
              />
              <p className="mt-1.5 text-[11px] text-slate-400">
                Student IDs are institutional identifiers assigned at registration and cannot be altered.
              </p>
            </div>

            {/* Action Button */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-end">
              <button
                type="submit"
                disabled={loading}
                className={`inline-flex items-center space-x-2 px-6 py-3 rounded-2xl text-xs sm:text-sm font-bold text-white shadow-sm transition-all active:scale-98 ${
                  loading
                    ? 'bg-slate-300 cursor-not-allowed text-slate-500'
                    : 'bg-brand-600 hover:bg-brand-700 focus:ring-4 focus:ring-brand-500/20'
                }`}
              >
                <Save className="w-4 h-4 shrink-0" />
                <span>{loading ? 'Saving Changes...' : 'Save Profile Changes'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Security Architecture Documentation Card */}
      <div className="p-6 bg-slate-100/80 border border-slate-200/90 rounded-3xl text-xs text-slate-600 space-y-2.5 leading-relaxed">
        <div className="flex items-center space-x-2 font-bold text-sm text-slate-900">
          <Shield className="w-4 h-4 text-brand-600 shrink-0" />
          <span>Security & Authentication Architecture</span>
        </div>
        <p>
          Your student account authenticates using your registered <strong>Student ID</strong> for frictionless examination bookings and evaluation checks.
        </p>
        <p className="text-slate-500">
          Institutional multi-factor authentication, single sign-on (SSO), and SMS verification can be enabled per institutional policy.
        </p>
      </div>
    </div>
  );
};
