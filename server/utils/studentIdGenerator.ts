import { Student } from '../models/Student.js';

/**
 * Generates the next sequential unique Student ID in the SL-format (e.g. SL01, SL02, ... SL12, etc.)
 * Scans all existing students in MongoDB to determine the highest number currently in use.
 */
export async function getNextStudentId(): Promise<string> {
  const students = await Student.find({}, { studentId: 1 }).lean();
  let maxNum = 0;

  for (const s of students) {
    if (!s.studentId) continue;
    const match = s.studentId.trim().toUpperCase().match(/^SL(\d+)$/i);
    if (match && match[1]) {
      const num = parseInt(match[1], 10);
      if (!isNaN(num) && num > maxNum) {
        maxNum = num;
      }
    }
  }

  const nextNum = maxNum + 1;
  // Pad with leading zero for numbers under 10 (e.g. SL01, SL02... SL09, SL10, SL11...)
  const formattedNext = nextNum < 10 ? `SL0${nextNum}` : `SL${nextNum}`;
  return formattedNext;
}

/**
 * Validates and formats a student ID
 */
export function formatStudentId(id: string): string {
  return id.toUpperCase().trim();
}

