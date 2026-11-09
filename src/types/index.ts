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

export interface Question {
  _id: string;
  questionText: string;
  options: string[];
  correctOptionIndex?: number;
  explanation?: string;
  marks: number;
}

export interface Sloka {
  _id: string;
  syllabus: string;
  chapter: number;
  slokaNumber: number;
  title: string;
  sanskritText: string;
  transliteration?: string;
  englishMeaning: string;
  questions: Question[];
  isActive: boolean;
}

export interface StudentAnswerItem {
  slokaId: string;
  questionId: string;
  questionText: string;
  selectedOptionIndex: number;
  selectedOptionText: string;
  correctOptionIndex: number;
  isCorrect: boolean;
  marksAwarded: number;
  maxMarks: number;
}

export interface StudentAnswer {
  _id: string;
  student: Student | string;
  booking?: Booking | string;
  syllabus: string;
  testName: string;
  answers: StudentAnswerItem[];
  totalScore: number;
  maxScore: number;
  percentage: number;
  grade: GradeType;
  submittedAt: string;
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
