import { Student } from '../models/Student.js';
import { Counter } from '../models/Counter.js';

/**
 * Generates the next sequential unique Student ID in the SL-format (e.g. SL01, SL02, ... SL12, etc.)
 * Uses an atomic MongoDB Counter synchronized with existing records to prevent race conditions.
 */
export async function getNextStudentId(): Promise<string> {
  // Scan existing students to guarantee the counter is never lower than any existing SL-number
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

  // Ensure counter document exists and is at least maxNum
  const currentDoc = await Counter.findById('studentId');
  if (!currentDoc || currentDoc.seq < maxNum) {
    await Counter.findByIdAndUpdate(
      'studentId',
      { $max: { seq: maxNum } },
      { upsert: true }
    );
  }

  // Atomically increment counter
  const counter = await Counter.findByIdAndUpdate(
    'studentId',
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );

  const nextNum = counter.seq;
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
