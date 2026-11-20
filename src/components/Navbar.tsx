import React from 'react';
import { useAuth } from '../context/AuthContext';
import { LogOut, GraduationCap, Menu, UserCheck, ShieldCheck } from 'lucide-react';

interface NavbarProps {
  onToggleSidebar?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleSidebar }) => {
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-2xs">
      <div className="flex h-16 items-center justify-between px-4 sm:px-6 max-w-7xl mx-auto w-full">
        {/* Left Side: Brand Logo & Mobile Toggle */}
        <div className="flex items-center space-x-3">
          {onToggleSidebar && (
            <button
              onClick={onToggleSidebar}
              className="md:hidden p-2.5 rounded-xl text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-colors"
              aria-label="Toggle Navigation Menu"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}

          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-brand-600 text-white rounded-xl shadow-xs">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">
                EduTest
              </span>
              <span className="hidden sm:inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-50 text-brand-700 border border-brand-200/60 uppercase tracking-wider">
                Portal v2.0
              </span>
            </div>
          </div>
        </div>

        {/* Right Side: User Profile & Actions */}
        {user && (
          <div className="flex items-center space-x-3 sm:space-x-4">
            <div className="flex items-center space-x-2.5 bg-slate-50 px-3 py-1.5 rounded-2xl border border-slate-200/80 shadow-2xs">
              {user.role === 'admin' ? (
                <div className="p-1 rounded-lg bg-brand-100 text-brand-700">
                  <ShieldCheck className="w-4 h-4" />
                </div>
              ) : (
                <div className="p-1 rounded-lg bg-teal-100 text-teal-700">
                  <UserCheck className="w-4 h-4" />
                </div>
              )}
              <div className="text-left text-xs">
                <p className="font-bold text-slate-900 leading-tight max-w-[120px] sm:max-w-[180px] truncate">
                  {user.name}
                </p>
                <p className="text-[11px] text-slate-500 font-medium capitalize">
                  {user.role === 'admin' ? 'Administrator' : `ID: ${user.studentId}`}
                </p>
              </div>
            </div>

            <button
              onClick={logout}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 hover:text-rose-600 hover:border-rose-200 focus:outline-none focus:ring-2 focus:ring-slate-200 transition-colors shadow-2xs active:scale-98"
              title="Sign Out"
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
