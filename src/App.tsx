import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

import { Login } from './pages/Login';
import { AdminDashboard } from './pages/admin/Dashboard';
import { AdminStudents } from './pages/admin/Students';
import { AdminTestSlots } from './pages/admin/TestSlots';
import { AdminBookings } from './pages/admin/Bookings';
import { AdminResults } from './pages/admin/Results';
import { AdminSettings } from './pages/admin/Settings';

import { StudentDashboard } from './pages/student/Dashboard';
import { StudentBookSlot } from './pages/student/BookSlot';
import { StudentMyResults } from './pages/student/MyResults';
import { StudentProfile } from './pages/student/Profile';

import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';

const ProtectedLayout: React.FC<{ children: React.ReactNode; allowedRole: 'admin' | 'student' }> = ({
  children,
  allowedRole,
}) => {
  const { user, loading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-10 h-10 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-semibold text-slate-600">Loading EduTest Portal...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role !== allowedRole) {
    return <Navigate to={user.role === 'admin' ? '/admin' : '/student'} replace />;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
      <div className="flex">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <main className="flex-1 md:ml-64 p-4 sm:p-6 lg:p-8 max-w-7xl">
          {children}
        </main>
      </div>
    </div>
  );
};

const RootRedirect: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-3 border-brand-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={user.role === 'admin' ? '/admin' : '/student'} replace />;
};

export const AppContent: React.FC = () => {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      {/* Admin Protected Routes */}
      <Route
        path="/admin"
        element={
          <ProtectedLayout allowedRole="admin">
            <AdminDashboard />
          </ProtectedLayout>
        }
      />
      <Route
        path="/admin/students"
        element={
          <ProtectedLayout allowedRole="admin">
            <AdminStudents />
          </ProtectedLayout>
        }
      />
      <Route
        path="/admin/slots"
        element={
          <ProtectedLayout allowedRole="admin">
            <AdminTestSlots />
          </ProtectedLayout>
        }
      />
      <Route
        path="/admin/bookings"
        element={
          <ProtectedLayout allowedRole="admin">
            <AdminBookings />
          </ProtectedLayout>
        }
      />
      <Route
        path="/admin/results"
        element={
          <ProtectedLayout allowedRole="admin">
            <AdminResults />
          </ProtectedLayout>
        }
      />
      <Route
        path="/admin/settings"
        element={
          <ProtectedLayout allowedRole="admin">
            <AdminSettings />
          </ProtectedLayout>
        }
      />

      {/* Student Protected Routes */}
      <Route
        path="/student"
        element={
          <ProtectedLayout allowedRole="student">
            <StudentDashboard />
          </ProtectedLayout>
        }
      />
      <Route
        path="/student/book"
        element={
          <ProtectedLayout allowedRole="student">
            <StudentBookSlot />
          </ProtectedLayout>
        }
      />
      <Route
        path="/student/results"
        element={
          <ProtectedLayout allowedRole="student">
            <StudentMyResults />
          </ProtectedLayout>
        }
      />
      <Route
        path="/student/profile"
        element={
          <ProtectedLayout allowedRole="student">
            <StudentProfile />
          </ProtectedLayout>
        }
      />

      {/* Fallback Catch-All */}
      <Route path="*" element={<RootRedirect />} />
    </Routes>
  );
};

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
