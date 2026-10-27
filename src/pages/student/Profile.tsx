import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { UserCheck, Shield, Phone, Calendar, Hash } from 'lucide-react';

export const StudentProfile: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl">
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <h1 className="text-xl font-bold text-slate-900">Student Profile</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Your institutional registration details and portal access parameters.
        </p>
      </div>

      <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-xs space-y-6">
        <div className="flex items-center space-x-4 pb-6 border-b border-slate-100">
          <div className="p-3 bg-emerald-100 text-emerald-700 rounded-2xl">
            <UserCheck className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">{user?.name}</h2>
            <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 mt-1 bg-slate-100 text-slate-700 text-xs font-mono font-bold rounded-md border border-slate-200">
              <Hash className="w-3 h-3 text-slate-400" />
              <span>Student ID: {user?.studentId}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
            <div className="flex items-center space-x-1.5 text-slate-500 font-medium">
              <Phone className="w-3.5 h-3.5 text-slate-400" />
              <span>Registered Phone</span>
            </div>
            <p className="font-semibold text-slate-900 text-sm">{user?.phone || 'Not provided'}</p>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
            <div className="flex items-center space-x-1.5 text-slate-500 font-medium">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>Registration Date</span>
            </div>
            <p className="font-semibold text-slate-900 text-sm">
              {user?.registrationDate ? new Date(user.registrationDate).toLocaleDateString() : 'N/A'}
            </p>
          </div>
        </div>

        {/* Security Limitation Documentation Card */}
        <div className="p-5 bg-brand-50/70 border border-brand-200 rounded-xl text-xs text-brand-900 space-y-2 leading-relaxed">
          <div className="flex items-center space-x-2 font-bold text-sm text-brand-950">
            <Shield className="w-4 h-4 text-brand-600" />
            <span>Authentication Architecture & Security Note</span>
          </div>
          <p>
            Your student portal currently uses your assigned <strong>Student ID</strong> for convenient access.
          </p>
          <p className="text-brand-800">
            Because Student ID-only authentication is designed for streamlined test slot booking, this application is structured to support institutional Single Sign-On (SSO), OTP verification, or password protection for enhanced security environments.
          </p>
        </div>
      </div>
    </div>
  );
};
