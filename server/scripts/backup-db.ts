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

async function runBackup() {
  console.log('📦 Starting MongoDB Database Backup Procedure...');
  await connectDB();

  const backupDir = path.resolve(process.cwd(), 'data', 'backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFileName = `backup-${timestamp}.json`;
  const backupFilePath = path.join(backupDir, backupFileName);
  const latestBackupFilePath = path.join(backupDir, 'latest-backup.json');

  const [students, bookings, slots, results, admins, slokas, answers] = await Promise.all([
    Student.find({}).lean(),
    Booking.find({}).lean(),
    TestSlot.find({}).lean(),
    Result.find({}).lean(),
    Admin.find({}).lean(),
    Sloka.find({}).lean(),
    StudentAnswer.find({}).lean(),
  ]);

  const backupData = {
    metadata: {
      timestamp: new Date().toISOString(),
      engine: process.env.MONGODB_URI?.includes('mongodb+srv') ? 'MongoDB Atlas' : 'MongoDB',
      counts: {
        students: students.length,
        bookings: bookings.length,
        slots: slots.length,
        results: results.length,
        admins: admins.length,
        slokas: slokas.length,
        answers: answers.length,
      },
    },
    students,
    bookings,
    slots,
    results,
    admins,
    slokas,
    answers,
  };

  fs.writeFileSync(backupFilePath, JSON.stringify(backupData, null, 2), 'utf-8');
  fs.writeFileSync(latestBackupFilePath, JSON.stringify(backupData, null, 2), 'utf-8');

  console.log(`✅ Backup successfully saved to: ${backupFilePath}`);
  console.log(`📊 Backup Summary:`);
  console.log(`   - Students: ${students.length}`);
  console.log(`   - Bookings: ${bookings.length}`);
  console.log(`   - Test Slots: ${slots.length}`);
  console.log(`   - Results: ${results.length}`);
  console.log(`   - Slokas: ${slokas.length}`);
  console.log(`   - Answers: ${answers.length}`);
  console.log(`   - Admins: ${admins.length}`);

  process.exit(0);
}

runBackup().catch((err) => {
  console.error('❌ Backup failed:', err);
  process.exit(1);
});

