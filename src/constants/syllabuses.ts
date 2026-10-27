export interface SyllabusOption {
  id: string;
  title: string;
  type: 'range' | 'monthly' | 'term' | 'final';
  category: string;
  topics: string;
}

export const SYLLABUS_OPTIONS: SyllabusOption[] = [
  { id: 'opt-1-5', title: '1-5', type: 'range', category: 'Lessons 1 to 5', topics: 'Foundation topics 1 - 5' },
  { id: 'opt-6-10', title: '6-10', type: 'range', category: 'Lessons 6 to 10', topics: 'Core modules 6 - 10' },
  { id: 'opt-11-15', title: '11-15', type: 'range', category: 'Lessons 11 to 15', topics: 'Advanced modules 11 - 15' },
  { id: 'opt-16-20', title: '16-20', type: 'range', category: 'Lessons 16 to 20', topics: 'Modules 16 - 20' },
  { id: 'opt-monthly-1', title: 'Monthly test-1', type: 'monthly', category: 'Monthly Assessment', topics: 'Cumulative Monthly Evaluation 1' },
  { id: 'opt-21-25', title: '21-25', type: 'range', category: 'Lessons 21 to 25', topics: 'Modules 21 - 25' },
  { id: 'opt-quaterly', title: 'Quaterly', type: 'term', category: 'Quarterly Exam', topics: 'Quarterly Term Assessment' },
  { id: 'opt-26-30', title: '26-30', type: 'range', category: 'Lessons 26 to 30', topics: 'Modules 26 - 30' },
  { id: 'opt-31-35', title: '31-35', type: 'range', category: 'Lessons 31 to 35', topics: 'Modules 31 - 35' },
  { id: 'opt-36-40', title: '36-40', type: 'range', category: 'Lessons 36 to 40', topics: 'Modules 36 - 40' },
  { id: 'opt-monthly-2', title: 'Monthly test-2', type: 'monthly', category: 'Monthly Assessment', topics: 'Cumulative Monthly Evaluation 2' },
  { id: 'opt-halfyearly', title: 'Halfyearly (1-50)', type: 'term', category: 'Half-Yearly Exam', topics: 'Complete Lessons 1 to 50' },
  { id: 'opt-41-45', title: '41-45', type: 'range', category: 'Lessons 41 to 45', topics: 'Modules 41 - 45' },
  { id: 'opt-46-50', title: '46-50', type: 'range', category: 'Lessons 46 to 50', topics: 'Modules 46 - 50' },
  { id: 'opt-51-55', title: '51-55', type: 'range', category: 'Lessons 51 to 55', topics: 'Modules 51 - 55' },
  { id: 'opt-56-60', title: '56-60', type: 'range', category: 'Lessons 56 to 60', topics: 'Modules 56 - 60' },
  { id: 'opt-monthly-3', title: 'Monthly test-3', type: 'monthly', category: 'Monthly Assessment', topics: 'Cumulative Monthly Evaluation 3' },
  { id: 'opt-61-65', title: '61-65', type: 'range', category: 'Lessons 61 to 65', topics: 'Modules 61 - 65' },
  { id: 'opt-66-70', title: '66-70', type: 'range', category: 'Lessons 66 to 70', topics: 'Modules 66 - 70' },
  { id: 'opt-71-75', title: '71-75', type: 'range', category: 'Lessons 71 to 75', topics: 'Modules 71 - 75' },
  { id: 'opt-76-80', title: '76-80', type: 'range', category: 'Lessons 76 to 80', topics: 'Modules 76 - 80' },
  { id: 'opt-monthly-4', title: 'Monthly test-4', type: 'monthly', category: 'Monthly Assessment', topics: 'Cumulative Monthly Evaluation 4' },
  { id: 'opt-81-85', title: '81-85', type: 'range', category: 'Lessons 81 to 85', topics: 'Modules 81 - 85' },
  { id: 'opt-86-90', title: '86-90', type: 'range', category: 'Lessons 86 to 90', topics: 'Modules 86 - 90' },
  { id: 'opt-91-95', title: '91-95', type: 'range', category: 'Lessons 91 to 95', topics: 'Modules 91 - 95' },
  { id: 'opt-96-100', title: '96-100', type: 'range', category: 'Lessons 96 to 100', topics: 'Modules 96 - 100' },
  { id: 'opt-prefinal-1', title: 'Prefinal-1', type: 'final', category: 'Pre-Board Examination', topics: 'Prefinal Comprehensive Assessment 1' },
  { id: 'opt-prefinal-2', title: 'Prefinal-2', type: 'final', category: 'Pre-Board Examination', topics: 'Prefinal Comprehensive Assessment 2' },
  { id: 'opt-final-test', title: 'Final Test', type: 'final', category: 'Annual Final Exam', topics: 'Complete Academic Final Evaluation' },
  { id: 'opt-revision-test', title: 'Revision Test', type: 'final', category: 'Revision Examination', topics: 'Full Syllabus Mock & Revision Assessment' },
];
