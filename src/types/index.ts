export interface User {
  id: string;
  role: 'admin' | 'student';
  username?: string;
  studentId?: string;
  name: string;
  email?: string;
  phone?: string;
  registrationDate?: string;
}

export interface Student {
  _id: string;
  studentId: string;
  name: string;
  phone?: string;
  registrationDate: string;
  createdAt: string;
}

export type GradeType = 'A+' | 'A' | 'B+' | 'B' | 'C+' | 'C' | 'Retest';

export interface TestSlot {
  _id: string;
  testTitle?: string;
  testDate: string; // YYYY-MM-DD
  startTime: string;
  endTime?: string;
  capacity: number;
  bookedCount: number;
  availableSeats: number;
  status: 'Available' | 'Full' | 'Cancelled';
  location?: string;
  createdAt: string;
}

export interface Booking {
  _id: string;
  student: Student | string;
  slot: TestSlot | string;
  syllabus: string;
  status: 'active' | 'cancelled' | 'completed';
  bookedAt: string;
  createdAt: string;
}

export interface Result {
  _id: string;
  student: Student | string;
  testName: string;
  marksObtained?: number | null;
  maxMarks?: number | null;
  grade: GradeType;
  status?: string;
  dateUploaded: string;
}

export interface Pagination {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  [key: string]: any;
}
