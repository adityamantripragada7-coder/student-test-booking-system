import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { connectDB } from '../db.js';
import { Student } from '../models/Student.js';
import { Booking } from '../models/Booking.js';
import { TestSlot } from '../models/TestSlot.js';
import { Result } from '../models/Result.js';
import { Admin } from '../models/Admin.js';
import { Sloka } from '../models/Sloka.js';
import { StudentAnswer } from '../models/StudentAnswer.js';

dotenv.config();

async function runRestore() {
  const customFile = process.argv[2];
  const backupFilePath = customFile
    ? path.resolve(process.cwd(), customFile)
    : path.resolve(process.cwd(), 'data', 'backups', 'latest-backup.json');

  if (!fs.existsSync(backupFilePath)) {
    console.error(`❌ Backup file not found at: ${backupFilePath}`);
    process.exit(1);
  }

  console.log(`📥 Starting Safe Database Restore from: ${backupFilePath}`);
  await connectDB();

  const raw = fs.readFileSync(backupFilePath, 'utf-8');
  const backupData = JSON.parse(raw);

  let restoredStudents = 0;
  let restoredSlots = 0;
  let restoredBookings = 0;
  let restoredResults = 0;
  let restoredSlokas = 0;

  // 1. Restore Students safely
  if (Array.isArray(backupData.students)) {
    for (const s of backupData.students) {
      if (!s.studentId) continue;
      const exists = await Student.findOne({ studentId: s.studentId.toUpperCase().trim() });
      if (!exists) {
        await Student.create({
          _id: s._id,
          studentId: s.studentId.toUpperCase().trim(),
          name: s.name,
          phone: s.phone || '',
          registrationDate: s.registrationDate || new Date(),
        });
        restoredStudents++;
      }
    }
  }

  // 2. Restore Slots safely
  if (Array.isArray(backupData.slots)) {
    for (const slot of backupData.slots) {
      const exists = await TestSlot.findById(slot._id);
      if (!exists) {
        await TestSlot.create(slot);
        restoredSlots++;
      }
    }
  }

  // 3. Restore Bookings safely
  if (Array.isArray(backupData.bookings)) {
    for (const b of backupData.bookings) {
      const exists = await Booking.findById(b._id);
      if (!exists) {
        await Booking.create(b);
        restoredBookings++;
      }
    }
  }

  // 4. Restore Results safely
  if (Array.isArray(backupData.results)) {
    for (const r of backupData.results) {
      const exists = await Result.findById(r._id);
      if (!exists) {
        await Result.create(r);
        restoredResults++;
      }
    }
  }

  // 5. Restore Slokas safely
  if (Array.isArray(backupData.slokas)) {
    for (const sl of backupData.slokas) {
      const exists = await Sloka.findById(sl._id);
      if (!exists) {
        await Sloka.create(sl);
        restoredSlokas++;
      }
    }
  }

  console.log('✅ Restore complete without overwriting existing records:');
  console.log(`   - New Students Restored: ${restoredStudents}`);
  console.log(`   - New Test Slots Restored: ${restoredSlots}`);
  console.log(`   - New Bookings Restored: ${restoredBookings}`);
  console.log(`   - New Results Restored: ${restoredResults}`);
  console.log(`   - New Slokas Restored: ${restoredSlokas}`);

  process.exit(0);
}

runRestore().catch((err) => {
  console.error('❌ Restore failed:', err);
  process.exit(1);
});

