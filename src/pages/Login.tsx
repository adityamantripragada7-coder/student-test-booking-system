import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { GraduationCap, ShieldCheck, UserCheck, KeyRound, AlertCircle, CheckCircle2, UserPlus } from 'lucide-react';
import { Modal } from '../components/Modal';

export const Login: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'student' | 'admin'>('student');
  
  // Student Login Form State
  const [studentIdInput, setStudentIdInput] = useState('');
  const [studentError, setStudentError] = useState('');
  const [studentLoading, setStudentLoading] = useState(false);

  // Admin Login Form State
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminError, setAdminError] = useState('');
  const [adminLoading, setAdminLoading] = useState(false);

  // Admin Setup Modal State
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [setupUsername, setSetupUsername] = useState('');
  const [setupPassword, setSetupPassword] = useState('');
  const [setupName, setSetupName] = useState('');
  const [setupEmail, setSetupEmail] = useState('');
  const [setupSecret, setSetupSecret] = useState('');
  const [setupError, setSetupError] = useState('');
  const [setupSuccess, setSetupSuccess] = useState('');
  const [setupLoading, setSetupLoading] = useState(false);

  const { loginAdmin, loginStudent, hasAdmin, refreshSetupStatus } = useAuth();
  const navigate = useNavigate();

  // Handle Student Login
  const handleStudentLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setStudentError('');

    if (!studentIdInput.trim()) {
      setStudentError('Please enter your assigned Student ID.');
      return;
    }

    setStudentLoading(true);
    try {
      const res = await api.post('/auth/student/login', {
        studentId: studentIdInput.trim(),
      });

      if (res.success && res.token && res.user) {
        loginStudent(res.token, res.user);
        navigate('/student');
      } else {
        setStudentError(res.message || 'Login failed. Please check your Student ID.');
      }
    } catch (err: any) {
      setStudentError('Server connection error. Please try again.');
    } finally {
      setStudentLoading(false);
    }
  };

  // Handle Admin Login
  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminError('');

    if (!adminUsername.trim() || !adminPassword) {
      setAdminError('Username and password are required.');
      return;
    }

    setAdminLoading(true);
    try {
      const res = await api.post('/auth/admin/login', {
        username: adminUsername.trim(),
        password: adminPassword,
      });

      if (res.success && res.token && res.user) {
        loginAdmin(res.token, res.user);
        navigate('/admin');
      } else {
        setAdminError(res.message || 'Invalid administrator credentials.');
      }
    } catch (err: any) {
      setAdminError('Server connection error. Please try again.');
    } finally {
      setAdminLoading(false);
    }
  };

  // Handle Initial Admin Setup Submit
  const handleAdminSetupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSetupError('');
    setSetupSuccess('');

    if (!setupUsername.trim() || !setupPassword || !setupName.trim()) {
      setSetupError('Username, password, and full name are required.');
      return;
    }

    setSetupLoading(true);
    try {
      const res = await api.post('/auth/admin/setup', {
        username: setupUsername.trim(),
        password: setupPassword,
        name: setupName.trim(),
        email: setupEmail.trim(),
        setupSecret: setupSecret.trim(),
      });

      if (res.success && res.token && res.user) {
        setSetupSuccess('Admin account setup successfully! Logging in...');
        loginAdmin(res.token, res.user);
        await refreshSetupStatus();
        setTimeout(() => {
          setShowSetupModal(false);
          navigate('/admin');
        }, 1000);
      } else {
        setSetupError(res.message || 'Setup failed. Check secret key and inputs.');
      }
    } catch (err: any) {
      setSetupError('Server error during admin setup.');
    } finally {
      setSetupLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="p-3 bg-brand-600 text-white rounded-2xl shadow-md">
            <GraduationCap className="w-9 h-9" />
          </div>
        </div>
        <h2 className="mt-4 text-center text-2xl font-bold tracking-tight text-slate-900">
          Student Test Booking System
        </h2>
        <p className="mt-1 text-center text-sm text-slate-500">
          Educational Examination & Assessment Management
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-white py-8 px-4 shadow-md border border-slate-200 sm:rounded-2xl sm:px-10">
          {/* Tabs */}
          <div className="flex rounded-xl bg-slate-100 p-1 mb-6 border border-slate-200">
            <button
              onClick={() => setActiveTab('student')}
              className={`flex-1 flex items-center justify-center space-x-2 py-2.5 text-xs font-semibold rounded-lg transition-all ${
                activeTab === 'student'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <UserCheck className="w-4 h-4 text-emerald-600" />
              <span>Student Login</span>
            </button>
            <button
              onClick={() => setActiveTab('admin')}
              className={`flex-1 flex items-center justify-center space-x-2 py-2.5 text-xs font-semibold rounded-lg transition-all ${
                activeTab === 'admin'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ShieldCheck className="w-4 h-4 text-brand-600" />
              <span>Admin Login</span>
            </button>
          </div>

          {/* Student Login Form */}
          {activeTab === 'student' && (
            <form onSubmit={handleStudentLogin} className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                  Assigned Student ID
                </label>
                <div className="relative rounded-xl shadow-2xs">
                  <input
                    type="text"
                    value={studentIdInput}
                    onChange={(e) => setStudentIdInput(e.target.value)}
                    placeholder="e.g. S001"
                    className="block w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 placeholder-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 text-sm font-medium uppercase transition-colors"
                  />
                </div>
                <p className="mt-1.5 text-xs text-slate-400">
                  Enter the Student ID registered by your administrator.
                </p>
              </div>

              {studentError && (
                <div className="flex items-center space-x-2 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{studentError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={studentLoading}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50 transition-colors"
              >
                {studentLoading ? 'Authenticating...' : 'Sign In as Student'}
              </button>

              {/* Student Security Note */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-500 leading-relaxed">
                <p className="font-medium text-slate-700 mb-0.5">ℹ️ Security Note:</p>
                Student ID authentication provides direct portal access for rapid exam booking. Institutional SSO or password authentication can be configured.
              </div>
            </form>
          )}

          {/* Admin Login Form */}
          {activeTab === 'admin' && (
            <form onSubmit={handleAdminLogin} className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                  Admin Username
                </label>
                <input
                  type="text"
                  value={adminUsername}
                  onChange={(e) => setAdminUsername(e.target.value)}
                  placeholder="admin"
                  className="block w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 placeholder-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 text-sm font-medium transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                  Password
                </label>
                <input
                  type="password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder="••••••••"
                  className="block w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 placeholder-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 text-sm font-medium transition-colors"
                />
              </div>

              {adminError && (
                <div className="flex items-center space-x-2 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{adminError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={adminLoading}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 disabled:opacity-50 transition-colors"
              >
                {adminLoading ? 'Authenticating...' : 'Sign In as Administrator'}
              </button>

              {/* Initial Setup Banner / Button */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500">First time setup?</span>
                <button
                  type="button"
                  onClick={() => setShowSetupModal(true)}
                  className="font-semibold text-brand-600 hover:text-brand-700 hover:underline flex items-center space-x-1"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Setup Admin Account</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Admin Initial Setup Modal */}
      <Modal
        isOpen={showSetupModal}
        onClose={() => setShowSetupModal(false)}
        title="Initial Administrator Setup"
        maxWidth="md"
      >
        <form onSubmit={handleAdminSetupSubmit} className="space-y-4">
          <p className="text-xs text-slate-500 leading-relaxed">
            Create the primary administrator account for this system. If an admin user already exists in MongoDB, the correct <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-800 font-mono">ADMIN_SETUP_SECRET</code> key is required.
          </p>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
            <input
              type="text"
              required
              value={setupName}
              onChange={(e) => setSetupName(e.target.value)}
              placeholder="System Administrator"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Username</label>
            <input
              type="text"
              required
              value={setupUsername}
              onChange={(e) => setSetupUsername(e.target.value)}
              placeholder="admin"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Email (Optional)</label>
            <input
              type="email"
              value={setupEmail}
              onChange={(e) => setSetupEmail(e.target.value)}
              placeholder="admin@institution.edu"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Password</label>
            <input
              type="password"
              required
              value={setupPassword}
              onChange={(e) => setSetupPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              One-Time Setup Secret Key
            </label>
            <input
              type="password"
              value={setupSecret}
              onChange={(e) => setSetupSecret(e.target.value)}
              placeholder="Enter ADMIN_SETUP_SECRET"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
            />
          </div>

          {setupError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{setupError}</span>
            </div>
          )}

          {setupSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-700 flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{setupSuccess}</span>
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowSetupModal(false)}
              className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={setupLoading}
              className="px-4 py-2 text-xs font-semibold text-white bg-brand-600 rounded-lg hover:bg-brand-700 disabled:opacity-50"
            >
              {setupLoading ? 'Creating Account...' : 'Complete Admin Setup'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
