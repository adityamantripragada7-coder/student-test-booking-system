import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  BookmarkCheck,
  FileSpreadsheet,
  Settings,
  CalendarPlus,
  Award,
  User,
  ShieldCheck,
  GraduationCap,
  Sparkles,
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const adminNavItems = [
    { name: 'Dashboard', path: '/admin', icon: LayoutDashboard },
    { name: 'Students', path: '/admin/students', icon: Users },
    { name: 'Test Slots', path: '/admin/slots', icon: CalendarDays },
    { name: 'Bookings', path: '/admin/bookings', icon: BookmarkCheck },
    { name: 'Results', path: '/admin/results', icon: FileSpreadsheet },
    { name: 'Settings', path: '/admin/settings', icon: Settings },
  ];

  const studentNavItems = [
    { name: 'Dashboard', path: '/student', icon: LayoutDashboard },
    { name: 'Book Test Slot', path: '/student/book', icon: CalendarPlus },
    { name: 'My Results', path: '/student/results', icon: Award },
    { name: 'Profile', path: '/student/profile', icon: User },
  ];

  const items = isAdmin ? adminNavItems : studentNavItems;

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-xs md:hidden transition-opacity"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Navigation Panel (Navy #0F172A) */}
      <aside
        className={`fixed top-16 bottom-0 left-0 z-40 w-64 bg-[#0F172A] text-slate-300 transform transition-transform duration-200 ease-in-out md:translate-x-0 border-r border-slate-800/80 shadow-xl ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full justify-between p-4">
          <div className="space-y-6">
            <div className="px-3 pt-2 pb-1 flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                {isAdmin ? 'Administrator Portal' : 'Student Workspace'}
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" title="Cloud Active" />
            </div>

            <nav className="space-y-1.5">
              {items.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    end={item.path === '/admin' || item.path === '/student'}
                    onClick={onClose}
                    className={({ isActive }) =>
                      `flex items-center space-x-3 px-4 py-3 rounded-2xl text-xs sm:text-sm font-medium transition-all ${
                        isActive
                          ? 'bg-[#2563EB] text-white shadow-md font-bold'
                          : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
                      }`
                    }
                  >
                    <Icon className="w-4 h-4 shrink-0 opacity-90" />
                    <span>{item.name}</span>
                  </NavLink>
                );
              })}
            </nav>
          </div>

          {/* Sidebar Footer Badge */}
          <div className="p-3.5 bg-slate-900/80 rounded-2xl border border-slate-800 text-xs text-slate-400 space-y-1">
            <div className="flex items-center space-x-2 text-slate-200 font-bold">
              <Sparkles className="w-3.5 h-3.5 text-teal-400" />
              <span>EduTest Engine</span>
            </div>
            <p className="text-[11px] text-slate-400">
              MongoDB Atlas Cloud Connected
            </p>
          </div>
        </div>
      </aside>
    </>
  );
};
