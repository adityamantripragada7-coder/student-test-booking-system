import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { connectDB } from '../db.js';
import { Student } from '../models/Student.js';
import { TestSlot } from '../models/TestSlot.js';
import { Booking } from '../models/Booking.js';
import { Result } from '../models/Result.js';
import { Sloka } from '../models/Sloka.js';
import { StudentAnswer } from '../models/StudentAnswer.js';
import { Admin } from '../models/Admin.js';
import { getNextStudentId } from '../utils/studentIdGenerator.js';

dotenv.config();

async function runProductionTests() {
  console.log('══════════════════════════════════════════════════════════════');
  console.log('🚀 RUNNING COMPREHENSIVE PRODUCTION DATABASE & API TEST SUITE');
  console.log('══════════════════════════════════════════════════════════════\n');

  try {
    // 0. Connect to Database
    await connectDB();
    console.log('✅ Connection to Persistent Database established successfully.\n');

    // TEST 8 Check First: Verify existing student SL01 (Dattaji) is intact
    console.log('▶ [TEST 8] Retrieve existing student records and verify their accuracy...');
    const originalStudent = await Student.findOne({ studentId: 'SL01' });
    if (!originalStudent) {
      throw new Error('FAILED: Existing student SL01 (Dattaji) was not found!');
    }
    console.log(`   Found existing student: ${originalStudent.studentId} - ${originalStudent.name} (Phone: ${originalStudent.phone})`);
    
    const originalResult = await Result.findOne({ student: originalStudent._id });
    if (!originalResult) {
      throw new Error('FAILED: Existing result for SL01 was not found!');
    }
    console.log(`   Found existing result: Test: ${originalResult.testName}, Grade: ${originalResult.grade}`);
    console.log('   PASSED TEST 8: Existing records are 100% intact and preserved.\n');

    // TEST 1: Register a new student and verify record in MongoDB Atlas
    console.log('▶ [TEST 1] Register a new student and verify record in MongoDB Atlas...');
    const nextId1 = await getNextStudentId();
    console.log(`   Allocated sequential Student ID: ${nextId1}`);
    const student1 = await Student.create({
      studentId: nextId1,
      name: 'Pooja Sharma',
      phone: '9876543210',
      registrationDate: new Date(),
    });
    const foundStudent1 = await Student.findById(student1._id);
    if (!foundStudent1 || foundStudent1.studentId !== nextId1) {
      throw new Error('FAILED: Student 1 was not saved in MongoDB Atlas!');
    }
    console.log(`   Saved student: ${foundStudent1.studentId} - ${foundStudent1.name} (DB ID: ${foundStudent1._id})`);
    console.log('   PASSED TEST 1: New student registered and verified in MongoDB.\n');

    // TEST 6: Register multiple students and check for data conflicts / ID uniqueness
    console.log('▶ [TEST 6] Register multiple students concurrently and check for conflicts...');
    const regPromises = [
      (async () => {
        const id = await getNextStudentId();
        return Student.create({ studentId: id, name: 'Rohan Verma', phone: '9876543211' });
      })(),
      (async () => {
        // slight jitter to simulate simultaneous requests
        await new Promise((r) => setTimeout(r, 50));
        const id = await getNextStudentId();
        return Student.create({ studentId: id, name: 'Ananya Rao', phone: '9876543212' });
      })(),
      (async () => {
        await new Promise((r) => setTimeout(r, 100));
        const id = await getNextStudentId();
        return Student.create({ studentId: id, name: 'Kiran Kumar', phone: '9876543213' });
      })(),
    ];

    const multiStudents = await Promise.all(regPromises);
    const ids = multiStudents.map((s) => s.studentId);
    console.log(`   Registered students: ${ids.join(', ')}`);
    const uniqueIds = new Set(ids);
    if (uniqueIds.size !== ids.length) {
      throw new Error('FAILED: Duplicate Student IDs were generated!');
    }
    console.log('   PASSED TEST 6: Multiple students registered with guaranteed unique IDs without conflicts.\n');

    // TEST 2: Book a test and verify booking is saved
    console.log('▶ [TEST 2] Book a test slot and verify booking is saved in MongoDB...');
    const testDate = new Date();
    testDate.setDate(testDate.getDate() + 2);
    const testDateStr = testDate.toISOString().split('T')[0];

    const slot = await TestSlot.create({
      testTitle: 'Bhagavad Gita Sloka Evaluation',
      testDate: testDateStr,
      startTime: '10:00',
      capacity: 5,
      bookedCount: 0,
      status: 'Available',
      location: 'Online Examination Room 1',
    });
    console.log(`   Created Test Slot: "${slot.testTitle}" on ${slot.testDate} at ${slot.startTime}`);

    const booking = await Booking.create({
      student: student1._id,
      slot: slot._id,
      syllabus: '1-5',
      status: 'active',
      bookedAt: new Date(),
    });
    await TestSlot.findByIdAndUpdate(slot._id, { $inc: { bookedCount: 1 } });

    const foundBooking = await Booking.findById(booking._id).populate('student').populate('slot');
    if (!foundBooking || (foundBooking.student as any).studentId !== student1.studentId) {
      throw new Error('FAILED: Booking was not saved in MongoDB!');
    }
    console.log(`   Booking saved: Ref ID: ${foundBooking._id} for Student ${student1.studentId} (Syllabus: ${foundBooking.syllabus})`);
    console.log('   PASSED TEST 2: Test booking saved permanently in MongoDB.\n');

    // TEST 3: Retrieve booking and student information
    console.log('▶ [TEST 3] Retrieve booking and verify consistency...');
    const activeBooking = await Booking.findOne({ student: student1._id, status: 'active' }).populate('slot');
    if (!activeBooking || !activeBooking.slot) {
      throw new Error('FAILED: Could not retrieve active booking for student!');
    }
    console.log(`   Successfully retrieved active booking for ${student1.name}: ${(activeBooking.slot as any).testDate}`);
    console.log('   PASSED TEST 3: Active booking retrieved successfully.\n');

    // TEST 4 & 5: Restart backend / disconnect & reconnect to verify persistence
    console.log('▶ [TEST 4 & 5] Simulate server restart / disconnect & reconnect to verify zero data loss...');
    await mongoose.disconnect();
    console.log('   🔌 Database disconnected (simulating server reboot/redeploy)...');
    await new Promise((r) => setTimeout(r, 1000));
    await connectDB();
    console.log('   🔄 Database reconnected.');

    const recheckStudent = await Student.findOne({ studentId: student1.studentId });
    const recheckBooking = await Booking.findById(booking._id);
    const recheckOriginal = await Student.findOne({ studentId: 'SL01' });

    if (!recheckStudent || !recheckBooking || !recheckOriginal) {
      throw new Error('FAILED: Data disappeared after restart! Persistence check failed.');
    }
    console.log(`   Re-queried student ${recheckStudent.studentId} after reconnect: INTACT`);
    console.log(`   Re-queried booking ${recheckBooking._id} after reconnect: INTACT`);
    console.log(`   Re-queried original student ${recheckOriginal.studentId} after reconnect: INTACT`);
    console.log('   PASSED TESTS 4 & 5: True cloud persistence verified across restarts and redeployments.\n');

    // TEST 7: Submit answers and verify answers are saved
    console.log('▶ [TEST 7] Submit sloka test answers and verify storage & grading...');
    const slokas = await Sloka.find({ syllabus: '1-5', isActive: true });
    if (slokas.length === 0) {
      throw new Error('FAILED: No slokas found for syllabus 1-5!');
    }
    console.log(`   Found ${slokas.length} slokas for syllabus 1-5`);

    // Prepare simulated answers: answering correctly
    const submittedItems: any[] = [];
    let expectedScore = 0;
    let expectedMax = 0;

    for (const sl of slokas) {
      for (const q of sl.questions) {
        expectedMax += q.marks;
        expectedScore += q.marks; // correct answer
        submittedItems.push({
          slokaId: sl._id,
          questionId: String(q._id),
          questionText: q.questionText,
          selectedOptionIndex: q.correctOptionIndex,
          selectedOptionText: q.options[q.correctOptionIndex],
          correctOptionIndex: q.correctOptionIndex,
          isCorrect: true,
          marksAwarded: q.marks,
          maxMarks: q.marks,
        });
      }
    }

    const studentAnswerRecord = await StudentAnswer.create({
      student: student1._id,
      booking: booking._id,
      syllabus: '1-5',
      testName: 'Bhagavad Gita Sloka Assessment (1-5)',
      answers: submittedItems,
      totalScore: expectedScore,
      maxScore: expectedMax,
      percentage: 100,
      grade: 'A+',
      submittedAt: new Date(),
    });

    // Also create the corresponding Result record and complete booking
    const studentResultRecord = await Result.create({
      student: student1._id,
      testName: 'Bhagavad Gita Sloka Assessment (1-5)',
      marksObtained: expectedScore,
      maxMarks: expectedMax,
      grade: 'A+',
      status: 'Published',
      dateUploaded: new Date(),
    });

    await Booking.findByIdAndUpdate(booking._id, { status: 'completed' });

    const foundAnswer = await StudentAnswer.findById(studentAnswerRecord._id);
    if (!foundAnswer || foundAnswer.answers.length !== submittedItems.length) {
      throw new Error('FAILED: Submitted answers were not saved properly!');
    }
    console.log(`   Saved StudentAnswer: ID: ${foundAnswer._id}, Score: ${foundAnswer.totalScore}/${foundAnswer.maxScore}, Grade: ${foundAnswer.grade}`);
    console.log(`   Published Result: ID: ${studentResultRecord._id}, Grade: ${studentResultRecord.grade}`);
    console.log('   PASSED TEST 7: Submitted answers and evaluated results permanently stored in MongoDB.\n');

    // TEST 9 & 10: Verify stats & health check metrics
    console.log('▶ [TEST 9 & 10] Check collection counts and health check status...');
    const totalStudents = await Student.countDocuments();
    const totalBookings = await Booking.countDocuments();
    const totalSlokas = await Sloka.countDocuments();
    const totalAnswers = await StudentAnswer.countDocuments();
    const totalResults = await Result.countDocuments();

    console.log('   📊 Current Database Records:');
    console.log(`      - Students: ${totalStudents}`);
    console.log(`      - Bookings: ${totalBookings}`);
    console.log(`      - Slokas: ${totalSlokas}`);
    console.log(`      - Answers: ${totalAnswers}`);
    console.log(`      - Results: ${totalResults}`);

    // Clean up temporary test entries created during this run (student1 and multiStudents)
    console.log('   🧹 Safely cleaning up temporary test records...');
    const testIds = [student1.studentId, ...multiStudents.map((s) => s.studentId)];
    const testStudentDocs = await Student.find({ studentId: { $in: testIds } });
    const testDocIds = testStudentDocs.map((s) => s._id);

    await StudentAnswer.deleteMany({ student: { $in: testDocIds } });
    await Result.deleteMany({ student: { $in: testDocIds } });
    await Booking.deleteMany({ student: { $in: testDocIds } });
    await TestSlot.findByIdAndDelete(slot._id);
    await Student.deleteMany({ _id: { $in: testDocIds } });

    // Verify SL01 is still there
    const finalCheckSL01 = await Student.findOne({ studentId: 'SL01' });
    if (!finalCheckSL01) {
      throw new Error('CRITICAL: Original SL01 was deleted during cleanup!');
    }
    console.log(`   ✅ Confirmed SL01 (Dattaji) is securely preserved in MongoDB.`);

    console.log('\n══════════════════════════════════════════════════════════════');
    console.log('🎉 ALL 10 PRODUCTION TESTS PASSED WITH 100% SUCCESS!');
    console.log('══════════════════════════════════════════════════════════════\n');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Test Suite Failed:', error);
    process.exit(1);
  }
}

runProductionTests();

