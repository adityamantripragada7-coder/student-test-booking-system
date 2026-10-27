import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { Student, Pagination as PaginationType } from '../../types';
import { Modal } from '../../components/Modal';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { Pagination } from '../../components/Pagination';
import { TableSkeleton } from '../../components/Skeleton';
import { EmptyState } from '../../components/EmptyState';
import { UserPlus, Search, Edit2, Trash2, AlertCircle, CheckCircle2 } from 'lucide-react';

export const AdminStudents: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [pagination, setPagination] = useState<PaginationType>({ total: 0, page: 1, limit: 10, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Notification Toast State
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Add/Edit Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [studentIdInput, setStudentIdInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [phoneInput, setPhoneInput] = useState('');
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  // Delete Confirm State
  const [deletingStudent, setDeletingStudent] = useState<Student | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchStudents = async (page = 1, searchQuery = search) => {
    setLoading(true);
    try {
      const res = await api.get(`/students?page=${page}&limit=10&search=${encodeURIComponent(searchQuery)}`);
      if (res.success) {
        setStudents(res.students);
        setPagination(res.pagination);
      } else {
        setNotification({ type: 'error', message: res.message || 'Failed to fetch students' });
      }
    } catch (err: any) {
      setNotification({ type: 'error', message: 'Failed to connect to backend server' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents(1, search);
  }, []);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearch(val);
    fetchStudents(1, val);
  };

  const openAddModal = () => {
    setEditingStudent(null);
    setStudentIdInput('');
    setNameInput('');
    setPhoneInput('');
    setFormError('');
    setShowModal(true);
  };

  const openEditModal = (student: Student) => {
    setEditingStudent(student);
    setStudentIdInput(student.studentId);
    setNameInput(student.name);
    setPhoneInput(student.phone || '');
    setFormError('');
    setShowModal(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!nameInput.trim()) {
      setFormError('Full Name is required.');
      return;
    }

    if (!editingStudent && !studentIdInput.trim()) {
      setFormError('Student ID is required.');
      return;
    }

    if (!phoneInput.trim()) {
      setFormError('Mobile number is mandatory.');
      return;
    }

    setFormLoading(true);
    try {
      if (editingStudent) {
        // Edit mode
        const res = await api.put(`/students/${editingStudent._id}`, {
          name: nameInput.trim(),
          phone: phoneInput.trim(),
        });

        if (res.success) {
          setNotification({ type: 'success', message: `Student ${editingStudent.studentId} updated successfully.` });
          setShowModal(false);
          fetchStudents(pagination.page);
        } else {
          setFormError(res.message || 'Failed to update student.');
        }
      } else {
        // Add mode
        const res = await api.post('/students', {
          studentId: studentIdInput.trim(),
          name: nameInput.trim(),
          phone: phoneInput.trim(),
        });

        if (res.success) {
          setNotification({ type: 'success', message: `Student ${res.student.studentId} added successfully.` });
          setShowModal(false);
          fetchStudents(1);
        } else {
          setFormError(res.message || 'Failed to add student.');
        }
      }
    } catch (err: any) {
      setFormError('An error occurred. Please try again.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingStudent) return;
    setDeleteLoading(true);
    try {
      const res = await api.delete(`/students/${deletingStudent._id}`);
      if (res.success) {
        setNotification({ type: 'success', message: res.message || 'Student deleted safely.' });
        setDeletingStudent(null);
        fetchStudents(pagination.page);
      } else {
        setNotification({ type: 'error', message: res.message || 'Failed to delete student.' });
      }
    } catch (err: any) {
      setNotification({ type: 'error', message: 'Error deleting student.' });
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between text-xs font-medium shadow-xs ${
            notification.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          <div className="flex items-center space-x-2">
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600" />
            )}
            <span>{notification.message}</span>
          </div>
          <button onClick={() => setNotification(null)} className="text-slate-400 hover:text-slate-600">
            &times;
          </button>
        </div>
      )}

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Student Directory</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Manage student registrations, profile details, and access authorizations.
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="inline-flex items-center space-x-2 px-4 py-2.5 text-xs font-semibold text-white bg-brand-600 rounded-xl hover:bg-brand-700 shadow-xs transition-colors shrink-0"
        >
          <UserPlus className="w-4 h-4" />
          <span>Add New Student</span>
        </button>
      </div>

      {/* Controls Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={handleSearchChange}
            placeholder="Search by Student ID, Name or Phone..."
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-300 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 bg-slate-50/50"
          />
        </div>
        <span className="text-xs text-slate-500 font-medium">
          Total Registered: <strong className="text-slate-800">{pagination.total}</strong>
        </span>
      </div>

      {/* Students Table */}
      {loading ? (
        <TableSkeleton rows={6} cols={5} />
      ) : students.length === 0 ? (
        <EmptyState
          title="No Students Found"
          description={search ? `No student matched "${search}".` : 'No student records registered in database yet.'}
          actionText="Add First Student"
          onAction={openAddModal}
        />
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold uppercase border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4">Student ID</th>
                  <th className="px-6 py-4">Full Name</th>
                  <th className="px-6 py-4">Phone Number</th>
                  <th className="px-6 py-4">Registered Date</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {students.map((student) => (
                  <tr key={student._id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-6 py-4 font-mono font-bold text-slate-900">
                      <span className="px-2 py-1 bg-slate-100 rounded-md border border-slate-200 text-slate-800">
                        {student.studentId}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-semibold text-slate-900">{student.name}</td>
                    <td className="px-6 py-4 text-slate-600">{student.phone || 'N/A'}</td>
                    <td className="px-6 py-4 text-slate-500">
                      {new Date(student.registrationDate).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button
                        onClick={() => openEditModal(student)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-brand-600 hover:bg-brand-50 transition-colors"
                        title="Edit Student"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeletingStudent(student)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        title="Delete Student"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination pagination={pagination} onPageChange={(p) => fetchStudents(p, search)} />
        </div>
      )}

      {/* Add / Edit Student Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingStudent ? `Edit Student (${editingStudent.studentId})` : 'Add New Student'}
        maxWidth="md"
      >
        <form onSubmit={handleFormSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Student ID {editingStudent && '(Immutable)'}
            </label>
            <input
              type="text"
              required
              disabled={!!editingStudent}
              value={studentIdInput}
              onChange={(e) => setStudentIdInput(e.target.value.toUpperCase())}
              placeholder="e.g. S001"
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm uppercase font-mono focus:border-brand-500 focus:ring-1 focus:ring-brand-500 disabled:bg-slate-100 text-slate-900"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
            <input
              type="text"
              required
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              placeholder="John Doe"
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500 text-slate-900"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Mobile Number (Phone) <span className="text-rose-500">* Mandatory</span>
            </label>
            <input
              type="text"
              required
              value={phoneInput}
              onChange={(e) => setPhoneInput(e.target.value)}
              placeholder="e.g. 9876543210"
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500 text-slate-900"
            />
          </div>

          {formError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={formLoading}
              className="px-4 py-2 text-xs font-semibold text-white bg-brand-600 rounded-xl hover:bg-brand-700 disabled:opacity-50"
            >
              {formLoading ? 'Saving...' : editingStudent ? 'Update Student' : 'Add Student'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Dialog */}
      {deletingStudent && (
        <ConfirmDialog
          isOpen={!!deletingStudent}
          onClose={() => setDeletingStudent(null)}
          onConfirm={handleDeleteConfirm}
          title={`Delete Student ${deletingStudent.studentId}?`}
          message={`Are you sure you want to delete ${deletingStudent.name} (${deletingStudent.studentId})? Deleting this student will also safely release any active test bookings and remove associated result records.`}
          confirmText="Yes, Delete Student"
          loading={deleteLoading}
        />
      )}
    </div>
  );
};
