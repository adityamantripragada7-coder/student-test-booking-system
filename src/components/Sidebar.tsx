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
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-slate-900/40 backdrop-blur-xs md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-16 bottom-0 left-0 z-30 w-64 bg-slate-900 text-slate-300 transform transition-transform duration-200 ease-in-out md:translate-x-0 border-r border-slate-800 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full justify-between p-4">
          <div className="space-y-6">
            <div className="px-3 py-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                {isAdmin ? 'Administrator Portal' : 'Student Workspace'}
              </span>
            </div>

            <nav className="space-y-1">
              {items.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    end={item.path === '/admin' || item.path === '/student'}
                    onClick={onClose}
                    className={({ isActive }) =>
                      `flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                        isActive
                          ? 'bg-brand-600 text-white shadow-sm font-semibold'
                          : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                      }`
                    }
                  >
                    <Icon className="w-5 h-5 opacity-90" />
                    <span>{item.name}</span>
                  </NavLink>
                );
              })}
            </nav>
          </div>

          <div className="p-3 bg-slate-850/60 rounded-xl border border-slate-800 text-xs text-slate-400 space-y-1">
            <p className="font-semibold text-slate-200">EduTest Engine</p>
            <p>Persistent MongoDB Atlas connected.</p>
          </div>
        </div>
      </aside>
    </>
  );
};
