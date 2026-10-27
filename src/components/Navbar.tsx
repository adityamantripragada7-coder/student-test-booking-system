import React from 'react';
import { useAuth } from '../context/AuthContext';
import { LogOut, GraduationCap, Menu, UserCheck, ShieldCheck } from 'lucide-react';

interface NavbarProps {
  onToggleSidebar?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleSidebar }) => {
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-2xs">
      <div className="flex h-16 items-center justify-between px-4 sm:px-6">
        {/* Left Side: Brand Logo & Mobile Toggle */}
        <div className="flex items-center space-x-3">
          {onToggleSidebar && (
            <button
              onClick={onToggleSidebar}
              className="md:hidden p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
              aria-label="Toggle Navigation"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}

          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-brand-600 text-white rounded-xl shadow-xs">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <span className="text-lg font-bold text-slate-900 tracking-tight">EduTest</span>
              <span className="hidden sm:inline ml-2 text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                Portal v1.0
              </span>
            </div>
          </div>
        </div>

        {/* Right Side: User Profile & Actions */}
        {user && (
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
              {user.role === 'admin' ? (
                <ShieldCheck className="w-4 h-4 text-brand-600" />
              ) : (
                <UserCheck className="w-4 h-4 text-emerald-600" />
              )}
              <div className="text-left text-xs">
                <p className="font-semibold text-slate-800 leading-tight">
                  {user.name}
                </p>
                <p className="text-slate-500 capitalize">
                  {user.role === 'admin' ? 'Administrator' : `ID: ${user.studentId}`}
                </p>
              </div>
            </div>

            <button
              onClick={logout}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 hover:text-rose-600 focus:outline-none focus:ring-2 focus:ring-slate-200 transition-colors shadow-2xs"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
