import { Router, Response } from 'express';
import mongoose from 'mongoose';
import { authenticateToken, requireAdmin, requireStudent, AuthRequest } from '../middleware/auth.js';
import { Result, VALID_GRADES, GradeType } from '../models/Result.js';
import { Student } from '../models/Student.js';
import { Booking } from '../models/Booking.js';
import { TestSlot } from '../models/TestSlot.js';
import { isDatabaseConnected } from '../db.js';

const router = Router();

// GET /api/results/booked-students
// Centralized list of ALL published student results and active bookings across ALL slots
router.get('/booked-students', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    if (!isDatabaseConnected()) {
      return res.status(503).json({
        success: false,
        message: 'Persistent database is not connected. Cannot load booked students.',
      });
    }

    const search = ((req.query.search as string) || '').trim().toLowerCase();
    const slotId = (req.query.slotId as string) || '';
    const resultStatusFilter = (req.query.resultStatus as string) || ''; // 'Published', 'Pending', or ''

    // 1. Fetch ALL permanent Result documents stored in MongoDB Atlas (NEVER deleted even if slot or booking is deleted)
    const allResults = await Result.find()
      .populate('student', 'studentId name phone')
      .populate('slot', 'testTitle testDate startTime endTime location status')
      .populate('booking', 'syllabus bookedAt createdAt status')
      .sort({ dateUploaded: -1 })
      .lean();

    const coveredBookingIds = new Set<string>();
    const coveredStudentSlotKeys = new Set<string>();

    const publishedRecords: any[] = [];
    for (const r of allResults) {
      const student = (r.student as any) || {};
      const slot = (r.slot as any);
      const booking = (r.booking as any);

      if (r.booking) {
        coveredBookingIds.add(r.booking.toString());
      }
      if (student._id && (r.slot || r.slotDate)) {
        coveredStudentSlotKeys.add(`${student._id.toString()}_${r.slot ? r.slot.toString() : r.slotDate}`);
      }

      const candidateId = student.studentId || r.studentId || 'N/A';
      const candidateName = student.name || r.studentName || 'Student';
      const candidatePhone = student.phone || r.studentPhone || '';
      const sessionTitle = (slot && slot.testTitle) || r.slotTitle || r.testName || 'Examination Session';
      const sessionDate = (slot && slot.testDate) || r.slotDate || (r.dateUploaded ? new Date(r.dateUploaded).toISOString().split('T')[0] : 'N/A');
      const sessionTime = (slot && slot.startTime) ? `${slot.startTime}${slot.endTime ? ` - ${slot.endTime}` : ''}` : (r.slotTime || 'N/A');
      const sessionLocation = (slot && slot.location) || 'Online / Hall';
      const syllabusTag = (booking && booking.syllabus) || r.syllabus || r.testName || 'General Syllabus';

      publishedRecords.push({
        bookingId: booking ? booking._id.toString() : (r.booking ? r.booking.toString() : `res-${r._id}`),
        studentDbId: student._id ? student._id.toString() : (r.student ? r.student.toString() : ''),
        studentId: candidateId,
        studentName: candidateName,
        studentPhone: candidatePhone,
        slotId: slot ? slot._id.toString() : (r.slot ? r.slot.toString() : ''),
        slotTitle: sessionTitle,
        slotDate: sessionDate,
        slotTime: sessionTime,
        slotLocation: sessionLocation,
        syllabus: syllabusTag,
        bookingDate: (booking && (booking.bookedAt || booking.createdAt)) || r.dateUploaded || (r as any).createdAt,
        bookingStatus: booking ? booking.status : 'completed',
        resultId: r._id.toString(),
        resultStatus: 'Published',
        memoryGrade: r.memoryGrade || r.grade,
        mistakesGrade: r.mistakesGrade || r.grade,
        dateUploaded: r.dateUploaded,
      });
    }

    // 2. Fetch Active Bookings that are still Pending teacher evaluation
    const bookingQuery: any = { status: { $ne: 'cancelled' } };
    if (slotId) {
      bookingQuery.slot = slotId;
    }

    const bookings = await Booking.find(bookingQuery)
      .populate('student', 'studentId name phone')
      .populate('slot', 'testTitle testDate startTime endTime location status')
      .sort({ createdAt: -1 })
      .lean();

    const pendingRecords: any[] = [];
    for (const b of bookings) {
      const student = (b.student as any);
      const slot = (b.slot as any);
      if (!student) continue;

      const bookingIdStr = b._id.toString();
      const studentSlotKey = `${student._id.toString()}_${slot ? slot._id.toString() : ''}`;

      // If this booking or student-slot already has a published result, skip adding a duplicate pending row
      if (coveredBookingIds.has(bookingIdStr) || coveredStudentSlotKeys.has(studentSlotKey)) {
        continue;
      }

      pendingRecords.push({
        bookingId: bookingIdStr,
        studentDbId: student._id.toString(),
        studentId: student.studentId || 'N/A',
        studentName: student.name || 'Student',
        studentPhone: student.phone || '',
        slotId: slot ? slot._id.toString() : '',
        slotTitle: slot ? (slot.testTitle || 'Test Session') : 'General Session',
        slotDate: slot ? slot.testDate : 'N/A',
        slotTime: slot ? `${slot.startTime}${slot.endTime ? ` - ${slot.endTime}` : ''}` : 'N/A',
        slotLocation: slot ? slot.location : 'Online / Hall',
        syllabus: b.syllabus || 'General Syllabus',
        bookingDate: b.bookedAt || (b as any).createdAt,
        bookingStatus: b.status,
        resultId: null,
        resultStatus: 'Pending',
        memoryGrade: null,
        mistakesGrade: null,
        dateUploaded: null,
      });
    }

    // 3. Combine both collections: All permanent Results + Any Pending bookings
    let allCombined = [...publishedRecords, ...pendingRecords];

    // Filter by slotId if passed
    if (slotId) {
      allCombined = allCombined.filter((rec) => rec.slotId === slotId);
    }

    // Filter by search query (Candidate Name or Student ID)
    if (search) {
      allCombined = allCombined.filter(
        (rec) =>
          rec.studentName.toLowerCase().includes(search) ||
          rec.studentId.toLowerCase().includes(search) ||
          (rec.syllabus && rec.syllabus.toLowerCase().includes(search))
      );
    }

    // Filter by Result Status (Published or Pending)
    const filteredRecords = resultStatusFilter
      ? allCombined.filter((r) => r.resultStatus.toLowerCase() === resultStatusFilter.toLowerCase())
      : allCombined;

    return res.json({
      success: true,
      records: filteredRecords,
      totalBookedStudents: filteredRecords.length,
      publishedCount: allCombined.filter((r) => r.resultStatus === 'Published').length,
      pendingCount: allCombined.filter((r) => r.resultStatus === 'Pending').length,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/results (Published results with pagination)
router.get('/', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    if (!isDatabaseConnected()) {
      return res.status(503).json({
        success: false,
        message: 'Persistent database is not connected. Cannot load results.',
      });
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = (req.query.search as string) || '';
    const gradeFilter = (req.query.grade as string) || '';

    const query: any = {};
    if (gradeFilter) {
      query.$or = [{ memoryGrade: gradeFilter }, { mistakesGrade: gradeFilter }, { grade: gradeFilter }];
    }

    if (search) {
      const matchingStudents = await Student.find({
        $or: [
          { studentId: { $regex: search, $options: 'i' } },
          { name: { $regex: search, $options: 'i' } },
        ],
      }).select('_id');

      query.student = { $in: matchingStudents.map((s) => s._id) };
    }

    const skip = (page - 1) * limit;
    const total = await Result.countDocuments(query);
    const results = await Result.find(query)
      .populate('student', 'studentId name phone')
      .populate('booking')
      .populate('slot')
      .sort({ dateUploaded: -1 })
      .skip(skip)
      .limit(limit);

    return res.json({
      success: true,
      results,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) || 1 },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/results/my (Student isolated result view)
router.get('/my', authenticateToken, requireStudent, async (req: AuthRequest, res: Response) => {
  try {
    if (!isDatabaseConnected()) {
      return res.status(503).json({
        success: false,
        message: 'Persistent database is not connected.',
      });
    }

    const studentUser = req.user!;
    const studentDoc = await Student.findOne({
      $or: [{ _id: studentUser.id }, { studentId: studentUser.studentId }],
    });
    const studentIdMatch = studentDoc ? studentDoc._id : studentUser.id;

    const results = await Result.find({
      $or: [{ student: studentIdMatch }, { student: studentUser.id }],
      status: 'Published',
    })
      .populate('slot', 'testTitle testDate startTime endTime location')
      .populate('booking', 'syllabus bookedAt status')
      .sort({ dateUploaded: -1 });

    const latestResult = results.length > 0 ? results[0] : null;
    return res.json({ success: true, latestResult, history: results });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/results (Publish / Update single result with compulsory Memory & Mistakes)
router.post('/', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    if (!isDatabaseConnected()) {
      return res.status(503).json({
        success: false,
        message: 'Persistent database is not connected. Result cannot be saved.',
      });
    }

    const { studentId, studentDbId, bookingId, slotId, testName, memoryGrade, mistakesGrade, status } = req.body;

    // MANDATORY VALIDATION: Both Memory and Mistakes are compulsory
    if (
      !memoryGrade ||
      !mistakesGrade ||
      !VALID_GRADES.includes(memoryGrade.toString().trim() as GradeType) ||
      !VALID_GRADES.includes(mistakesGrade.toString().trim() as GradeType)
    ) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both mandatory results: Memory and Mistakes.',
      });
    }

    const validMemoryGrade = memoryGrade.toString().trim() as GradeType;
    const validMistakesGrade = mistakesGrade.toString().trim() as GradeType;

    // Resolve student target ID
    let targetStudentId = studentDbId;
    if (!targetStudentId && studentId) {
      const student = await Student.findOne({ studentId: studentId.toUpperCase().trim() });
      if (!student) {
        return res.status(404).json({ success: false, message: `Student ID "${studentId}" not found in database.` });
      }
      targetStudentId = student._id;
    }

    if (!targetStudentId) {
      return res.status(400).json({ success: false, message: 'Valid Student ID required.' });
    }

    // Resolve booking and slot if provided
    let resolvedSlotId = slotId;
    let foundBooking: any = null;
    if (bookingId && mongoose.Types.ObjectId.isValid(bookingId)) {
      foundBooking = await Booking.findById(bookingId).populate('slot');
      if (foundBooking && foundBooking.slot && !resolvedSlotId) {
        resolvedSlotId = (foundBooking.slot as any)._id;
      }
    }

    let foundSlot: any = null;
    if (resolvedSlotId && mongoose.Types.ObjectId.isValid(resolvedSlotId)) {
      foundSlot = await TestSlot.findById(resolvedSlotId);
    } else if (foundBooking && foundBooking.slot) {
      foundSlot = foundBooking.slot;
    }

    let foundStudent: any = null;
    if (targetStudentId && mongoose.Types.ObjectId.isValid(targetStudentId)) {
      foundStudent = await Student.findById(targetStudentId);
    }

    const snapStudentId = (foundStudent?.studentId || studentId || '').trim();
    const snapStudentName = (foundStudent?.name || req.body.studentName || '').trim();
    const snapStudentPhone = (foundStudent?.phone || req.body.studentPhone || '').trim();
    const resolvedTestName = (testName && testName.trim()) || foundSlot?.testTitle || 'Assessment Session';
    const snapSlotTitle = (foundSlot?.testTitle || req.body.slotTitle || resolvedTestName).trim();
    const snapSlotDate = (foundSlot?.testDate || req.body.slotDate || '').trim();
    const snapSlotTime = (foundSlot?.startTime ? `${foundSlot.startTime}${foundSlot.endTime ? ` - ${foundSlot.endTime}` : ''}` : (req.body.slotTime || '')).trim();
    const snapSyllabus = (foundBooking?.syllabus || req.body.syllabus || '').trim();

    // Prevent duplicate result records for the same booking: Update if exists, else create
    let existingResult = null;
    if (bookingId && mongoose.Types.ObjectId.isValid(bookingId)) {
      existingResult = await Result.findOne({ booking: bookingId });
    }
    if (!existingResult && targetStudentId) {
      // Find if an identical result exists for this student and test session
      existingResult = await Result.findOne({ student: targetStudentId, testName: resolvedTestName });
    }

    let savedResult;
    if (existingResult) {
      existingResult.memoryGrade = validMemoryGrade;
      existingResult.mistakesGrade = validMistakesGrade;
      existingResult.grade = validMemoryGrade;
      existingResult.testName = resolvedTestName;
      existingResult.status = status || 'Published';
      existingResult.dateUploaded = new Date();
      if (snapStudentId) existingResult.studentId = snapStudentId;
      if (snapStudentName) existingResult.studentName = snapStudentName;
      if (snapStudentPhone) existingResult.studentPhone = snapStudentPhone;
      if (snapSlotTitle) existingResult.slotTitle = snapSlotTitle;
      if (snapSlotDate) existingResult.slotDate = snapSlotDate;
      if (snapSlotTime) existingResult.slotTime = snapSlotTime;
      if (snapSyllabus) existingResult.syllabus = snapSyllabus;
      if (bookingId && mongoose.Types.ObjectId.isValid(bookingId)) existingResult.booking = bookingId;
      if (resolvedSlotId && mongoose.Types.ObjectId.isValid(resolvedSlotId)) existingResult.slot = resolvedSlotId;
      await existingResult.save();
      savedResult = existingResult;
    } else {
      savedResult = await Result.create({
        student: targetStudentId,
        studentId: snapStudentId,
        studentName: snapStudentName,
        studentPhone: snapStudentPhone,
        booking: (bookingId && mongoose.Types.ObjectId.isValid(bookingId)) ? bookingId : undefined,
        slot: (resolvedSlotId && mongoose.Types.ObjectId.isValid(resolvedSlotId)) ? resolvedSlotId : undefined,
        slotTitle: snapSlotTitle,
        slotDate: snapSlotDate,
        slotTime: snapSlotTime,
        syllabus: snapSyllabus,
        testName: resolvedTestName,
        memoryGrade: validMemoryGrade,
        mistakesGrade: validMistakesGrade,
        grade: validMemoryGrade,
        status: status || 'Published',
        dateUploaded: new Date(),
      });
    }

    const populatedResult = await Result.findById(savedResult._id)
      .populate('student', 'studentId name')
      .populate('slot', 'testTitle testDate startTime');

    return res.status(201).json({
      success: true,
      message: 'Result published successfully with Memory and Mistakes grades.',
      result: populatedResult,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/results/bulk (Publish results for multiple students across ALL slots)
router.post('/bulk', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    if (!isDatabaseConnected()) {
      return res.status(503).json({
        success: false,
        message: 'Persistent database is not connected. Bulk results cannot be saved.',
      });
    }

    const { results } = req.body;
    if (!Array.isArray(results) || results.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid list of student results to publish.',
      });
    }

    // MANDATORY VALIDATION: Check that every item in bulk list has both Memory and Mistakes
    for (const item of results) {
      if (
        !item.memoryGrade ||
        !item.mistakesGrade ||
        !VALID_GRADES.includes(item.memoryGrade.toString().trim() as GradeType) ||
        !VALID_GRADES.includes(item.mistakesGrade.toString().trim() as GradeType)
      ) {
        return res.status(400).json({
          success: false,
          message: `Please provide both mandatory results: Memory and Mistakes for student ${item.studentName || item.studentId || 'record'}.`,
        });
      }
    }

    const savedRecords: any[] = [];
    for (const item of results) {
      const memoryGrade = item.memoryGrade.toString().trim() as GradeType;
      const mistakesGrade = item.mistakesGrade.toString().trim() as GradeType;
      const testName = item.testName || item.slotTitle || 'Assessment Session';

      let targetStudentId = item.studentDbId;
      let foundStudent: any = null;
      if (targetStudentId && mongoose.Types.ObjectId.isValid(targetStudentId)) {
        foundStudent = await Student.findById(targetStudentId);
      }
      if (!targetStudentId && item.studentId) {
        foundStudent = await Student.findOne({ studentId: item.studentId.toUpperCase().trim() });
        if (foundStudent) targetStudentId = foundStudent._id;
      }

      if (!targetStudentId) continue;

      let foundBooking: any = null;
      if (item.bookingId && mongoose.Types.ObjectId.isValid(item.bookingId)) {
        foundBooking = await Booking.findById(item.bookingId).populate('slot');
      }
      let foundSlot: any = null;
      if (item.slotId && mongoose.Types.ObjectId.isValid(item.slotId)) {
        foundSlot = await TestSlot.findById(item.slotId);
      } else if (foundBooking && foundBooking.slot) {
        foundSlot = foundBooking.slot;
      }

      const snapStudentId = (foundStudent?.studentId || item.studentId || '').trim();
      const snapStudentName = (foundStudent?.name || item.studentName || '').trim();
      const snapStudentPhone = (foundStudent?.phone || item.studentPhone || '').trim();
      const snapSlotTitle = (foundSlot?.testTitle || item.slotTitle || testName).trim();
      const snapSlotDate = (foundSlot?.testDate || item.slotDate || '').trim();
      const snapSlotTime = (foundSlot?.startTime ? `${foundSlot.startTime}${foundSlot.endTime ? ` - ${foundSlot.endTime}` : ''}` : (item.slotTime || '')).trim();
      const snapSyllabus = (foundBooking?.syllabus || item.syllabus || '').trim();

      let existing = null;
      if (item.bookingId && mongoose.Types.ObjectId.isValid(item.bookingId)) {
        existing = await Result.findOne({ booking: item.bookingId });
      }
      if (!existing && targetStudentId) {
        existing = await Result.findOne({ student: targetStudentId, testName });
      }

      if (existing) {
        existing.memoryGrade = memoryGrade;
        existing.mistakesGrade = mistakesGrade;
        existing.grade = memoryGrade;
        existing.testName = testName;
        existing.status = 'Published';
        existing.dateUploaded = new Date();
        if (snapStudentId) existing.studentId = snapStudentId;
        if (snapStudentName) existing.studentName = snapStudentName;
        if (snapStudentPhone) existing.studentPhone = snapStudentPhone;
        if (snapSlotTitle) existing.slotTitle = snapSlotTitle;
        if (snapSlotDate) existing.slotDate = snapSlotDate;
        if (snapSlotTime) existing.slotTime = snapSlotTime;
        if (snapSyllabus) existing.syllabus = snapSyllabus;
        await existing.save();
        savedRecords.push(existing);
      } else {
        const created = await Result.create({
          student: targetStudentId,
          studentId: snapStudentId,
          studentName: snapStudentName,
          studentPhone: snapStudentPhone,
          booking: (item.bookingId && mongoose.Types.ObjectId.isValid(item.bookingId)) ? item.bookingId : undefined,
          slot: (item.slotId && mongoose.Types.ObjectId.isValid(item.slotId)) ? item.slotId : (foundSlot ? foundSlot._id : undefined),
          slotTitle: snapSlotTitle,
          slotDate: snapSlotDate,
          slotTime: snapSlotTime,
          syllabus: snapSyllabus,
          testName,
          memoryGrade,
          mistakesGrade,
          grade: memoryGrade,
          status: 'Published',
          dateUploaded: new Date(),
        });
        savedRecords.push(created);
      }
    }

    return res.json({
      success: true,
      message: `Successfully published results for ${savedRecords.length} student(s) across slots.`,
      count: savedRecords.length,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/results/:id (Update single result)
router.put('/:id', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    if (!isDatabaseConnected()) {
      return res.status(503).json({
        success: false,
        message: 'Persistent database is not connected. Result updates cannot be saved.',
      });
    }

    const { testName, memoryGrade, mistakesGrade, status } = req.body;

    const result = await Result.findById(req.params.id);
    if (!result) {
      return res.status(404).json({ success: false, message: 'Result record not found in database.' });
    }

    if (memoryGrade) {
      if (!VALID_GRADES.includes(memoryGrade.toString().trim() as GradeType)) {
        return res.status(400).json({ success: false, message: 'Invalid Memory grade option.' });
      }
      result.memoryGrade = memoryGrade.toString().trim() as GradeType;
      result.grade = result.memoryGrade;
    }

    if (mistakesGrade) {
      if (!VALID_GRADES.includes(mistakesGrade.toString().trim() as GradeType)) {
        return res.status(400).json({ success: false, message: 'Invalid Mistakes grade option.' });
      }
      result.mistakesGrade = mistakesGrade.toString().trim() as GradeType;
    }

    if (testName) result.testName = testName.trim();
    if (status) result.status = status;
    result.dateUploaded = new Date();

    await result.save();
    const updated = await Result.findById(result._id).populate('student', 'studentId name');
    return res.json({ success: true, message: 'Result updated successfully.', result: updated });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /api/results/:id
router.delete('/:id', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    if (!isDatabaseConnected()) {
      return res.status(503).json({
        success: false,
        message: 'Persistent database is not connected. Result cannot be deleted.',
      });
    }

    const result = await Result.findByIdAndDelete(req.params.id);
    if (!result) {
      return res.status(404).json({ success: false, message: 'Result record not found in database.' });
    }

    return res.json({ success: true, message: 'Result record deleted from persistent database.' });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
