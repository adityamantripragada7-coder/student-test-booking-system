import fs from 'fs';
import path from 'path';
import { Student } from './models/Student.js';
import { Admin } from './models/Admin.js';
import { Result } from './models/Result.js';
import { TestSlot } from './models/TestSlot.js';

export async function migrateExistingData(): Promise<void> {
  const dataFile = path.resolve(process.cwd(), 'data', 'db.json');
  if (!fs.existsSync(dataFile)) {
    return;
  }

  try {
    const raw = fs.readFileSync(dataFile, 'utf-8');
    const data = JSON.parse(raw);

    // 1. Preserve and Migrate Admins
    if (Array.isArray(data.admins)) {
      for (const adminData of data.admins) {
        if (!adminData.username) continue;
        const exists = await Admin.findOne({ username: adminData.username.toLowerCase().trim() });
        if (!exists) {
          await Admin.create({
            username: adminData.username.toLowerCase().trim(),
            name: adminData.name || 'System Administrator',
            email: adminData.email || 'admin@institution.edu',
            passwordHash: adminData.passwordHash,
          });
          console.log(`✅ Preserved admin user in persistent DB: ${adminData.username}`);
        }
      }
    }

    // 2. Preserve and Migrate Students (especially SL01 - Dattaji)
    const oldIdToMongoDoc = new Map<string, any>();
    if (Array.isArray(data.students)) {
      for (const studentData of data.students) {
        if (!studentData.studentId) continue;
        const formattedId = studentData.studentId.toUpperCase().trim();
        let mongoStudent = await Student.findOne({ studentId: formattedId });
        if (!mongoStudent) {
          mongoStudent = await Student.create({
            studentId: formattedId,
            name: studentData.name || 'Student',
            phone: studentData.phone || '',
            registrationDate: studentData.registrationDate ? new Date(studentData.registrationDate) : new Date(),
          });
          console.log(`✅ Preserved student record in persistent DB: ${formattedId} (${mongoStudent.name})`);
        }
        oldIdToMongoDoc.set(studentData._id, mongoStudent);
        oldIdToMongoDoc.set(formattedId, mongoStudent);
      }
    }

    // 3. Preserve and Migrate Results
    if (Array.isArray(data.results)) {
      for (const resultData of data.results) {
        if (!resultData.testName) continue;
        const targetStudent = oldIdToMongoDoc.get(resultData.student) || 
                              await Student.findOne({ studentId: 'SL01' });
        if (targetStudent) {
          const exists = await Result.findOne({
            student: targetStudent._id,
            testName: resultData.testName,
          });
          if (!exists) {
            await Result.create({
              student: targetStudent._id,
              testName: resultData.testName,
              marksObtained: resultData.marksObtained ?? null,
              maxMarks: resultData.maxMarks ?? null,
              grade: resultData.grade || 'A+',
              status: resultData.status || 'Published',
              dateUploaded: resultData.dateUploaded ? new Date(resultData.dateUploaded) : new Date(),
            });
            console.log(`✅ Preserved result record in persistent DB for: ${targetStudent.studentId} (${resultData.testName})`);
          }
        }
      }
    }

    // 4. Preserve and Migrate Test Slots if any
    if (Array.isArray(data.slots)) {
      for (const slotData of data.slots) {
        if (!slotData.testDate || !slotData.startTime) continue;
        const exists = await TestSlot.findOne({
          testDate: slotData.testDate,
          startTime: slotData.startTime,
        });
        if (!exists) {
          await TestSlot.create({
            testTitle: slotData.testTitle || 'Assessment Slot',
            testDate: slotData.testDate,
            startTime: slotData.startTime,
            endTime: slotData.endTime || '',
            capacity: slotData.capacity || 10,
            bookedCount: slotData.bookedCount || 0,
            status: slotData.status || 'Available',
            location: slotData.location || 'Main Examination Hall',
          });
          console.log(`✅ Preserved test slot in persistent DB: ${slotData.testTitle} (${slotData.testDate})`);
        }
      }
    }
  } catch (error) {
    console.error('⚠️ Data migration warning (non-fatal):', error);
  }
}
