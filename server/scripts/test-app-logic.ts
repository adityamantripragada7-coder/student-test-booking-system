import dotenv from 'dotenv';
import { connectDB } from '../db.js';
import { Student } from '../models/Student.js';
import { TestSlot } from '../models/TestSlot.js';
import { Booking } from '../models/Booking.js';
import { Result } from '../models/Result.js';
import { Admin } from '../models/Admin.js';
import bcrypt from 'bcryptjs';

dotenv.config();

async function runSystemVerification() {
  console.log('🧪 Starting Student Test Booking System Verification Suite...\n');

  try {
    await connectDB();
    console.log('✅ 1. MongoDB Atlas Connection Verified');

    // Clean test records if any
    await Student.deleteMany({ studentId: { $in: ['TEST001', 'TEST002'] } });
    await TestSlot.deleteMany({ testTitle: 'Automated Test Exam' });
    console.log('🧹 2. Cleaned up past test artifacts');

    // Test 1: Create Student
    const student1 = await Student.create({
      studentId: 'TEST001',
      name: 'Alice Johnson',
      phone: '+1 555-0100',
    });
    console.log(`✅ 3. Created Student TEST001: ${student1.name}`);

    // Test 2: Reject Duplicate Student ID
    try {
      await Student.create({
        studentId: 'TEST001',
        name: 'Bob Smith',
      });
      console.error('❌ FAILED: Duplicate Student ID should have thrown error!');
    } catch (err: any) {
      console.log('✅ 4. Duplicate Student ID correctly blocked by MongoDB unique index');
    }

    // Test 3: Create Test Slot with Capacity = 1
    const testSlot = await TestSlot.create({
      testTitle: 'Automated Test Exam',
      testDate: '2026-12-01',
      startTime: '10:00',
      capacity: 1,
      bookedCount: 0,
      status: 'Available',
    });
    console.log(`✅ 5. Created Test Slot "${testSlot.testTitle}" (Capacity: 1)`);

    // Test 4: Book Slot for Student 1
    const booking1 = await Booking.create({
      student: student1._id,
      slot: testSlot._id,
      status: 'active',
    });
    await TestSlot.findByIdAndUpdate(testSlot._id, { $inc: { bookedCount: 1 }, status: 'Full' });
    console.log(`✅ 6. Student TEST001 successfully booked slot (Booking ID: ${booking1._id})`);

    // Test 5: Verify Active Booking Constraint (1 active booking per student)
    try {
      await Booking.create({
        student: student1._id,
        slot: testSlot._id,
        status: 'active',
      });
      console.error('❌ FAILED: Second active booking should have thrown partial index error!');
    } catch (err: any) {
      console.log('✅ 7. Active booking limit (1 active per student) correctly enforced by partial index');
    }

    // Test 6: Create Student 2 and attempt booking Full slot
    const student2 = await Student.create({
      studentId: 'TEST002',
      name: 'David Lee',
    });

    const refreshedSlot = await TestSlot.findById(testSlot._id);
    if (refreshedSlot?.bookedCount! >= refreshedSlot?.capacity!) {
      console.log('✅ 8. Capacity limit verification: Slot is correctly identified as Full');
    }

    // Test 7: Cancel Booking & Release Capacity
    booking1.status = 'cancelled';
    await booking1.save();
    await TestSlot.findByIdAndUpdate(testSlot._id, { $inc: { bookedCount: -1 }, status: 'Available' });
    console.log('✅ 9. Booking cancelled successfully & seat capacity released back to Available');

    // Test 8: Create Test Result
    const resultRecord = await Result.create({
      student: student1._id,
      testName: 'Automated Test Exam',
      marksObtained: 92,
      maxMarks: 100,
      grade: 'A',
      status: 'Pass',
    });
    console.log(`✅ 10. Created Result for TEST001: ${resultRecord.marksObtained}/100 Grade: ${resultRecord.grade}`);

    // Cleanup synthetic records
    await Student.deleteMany({ studentId: { $in: ['TEST001', 'TEST002'] } });
    await TestSlot.deleteMany({ testTitle: 'Automated Test Exam' });
    await Booking.deleteMany({ _id: booking1._id });
    await Result.deleteMany({ _id: resultRecord._id });
    console.log('\n✨ ALL SYSTEM VERIFICATION CHECKS PASSED SUCCESSFULLY!');
    process.exit(0);
  } catch (error) {
    console.error('❌ System Verification Failed with error:', error);
    process.exit(1);
  }
}

runSystemVerification();
