import { Router, Response } from 'express';
import { authenticateToken, requireAdmin, requireStudent, AuthRequest } from '../middleware/auth.js';
import { Result, VALID_GRADES, GradeType } from '../models/Result.js';
import { Student } from '../models/Student.js';
import { Booking } from '../models/Booking.js';
import { TestSlot } from '../models/TestSlot.js';
import { isDatabaseConnected } from '../db.js';

const router = Router();

// GET /api/results/booked-students
// Centralized list of ALL students who booked slots across ALL available slots
router.get('/booked-students', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    if (!isDatabaseConnected()) {
      return res.status(503).json({
        success: false,
        message: 'Persistent database is not connected. Cannot load booked students.',
      });
    }

    const search = ((req.query.search as string) || '').trim();
    const slotId = (req.query.slotId as string) || '';
    const resultStatusFilter = (req.query.resultStatus as string) || ''; // 'Published', 'Pending', or ''

    // Build booking query
    const bookingQuery: any = { status: { $ne: 'cancelled' } };
    if (slotId) {
      bookingQuery.slot = slotId;
    }

    if (search) {
      const matchingStudents = await Student.find({
        $or: [
          { studentId: { $regex: search, $options: 'i' } },
          { name: { $regex: search, $options: 'i' } },
        ],
      }).select('_id');
      bookingQuery.student = { $in: matchingStudents.map((s) => s._id) };
    }

    // Fetch all bookings with populated student and slot info
    const bookings = await Booking.find(bookingQuery)
      .populate('student', 'studentId name phone')
      .populate('slot', 'testTitle testDate startTime endTime location status')
      .sort({ createdAt: -1 });

    // Fetch all existing results to map them onto bookings
    const bookingIds = bookings.map((b) => b._id);
    const existingResults = await Result.find({
      $or: [
        { booking: { $in: bookingIds } },
        { student: { $in: bookings.map((b) => (b.student as any)?._id).filter(Boolean) } },
      ],
    }).lean();

    // Create lookup map by bookingId string and studentId string
    const resultMapByBooking = new Map<string, any>();
    const resultMapByStudent = new Map<string, any>();
    for (const r of existingResults) {
      if (r.booking) {
        resultMapByBooking.set(r.booking.toString(), r);
      }
      if (r.student) {
        resultMapByStudent.set(r.student.toString(), r);
      }
    }

    // Map into comprehensive student booking records
    const records = bookings
      .map((b: any) => {
        const student = b.student;
        const slot = b.slot;
        if (!student) return null;

        const matchedResult =
          resultMapByBooking.get(b._id.toString()) ||
          resultMapByStudent.get(student._id.toString());

        const hasResult = !!matchedResult;
        const status = hasResult ? (matchedResult.status || 'Published') : 'Pending';

        return {
          bookingId: b._id,
          studentDbId: student._id,
          studentId: student.studentId,
          studentName: student.name,
          studentPhone: student.phone,
          slotId: slot ? slot._id : null,
          slotTitle: slot ? (slot.testTitle || 'Test Session') : 'General Session',
          slotDate: slot ? slot.testDate : 'N/A',
          slotTime: slot ? `${slot.startTime}${slot.endTime ? ` - ${slot.endTime}` : ''}` : 'N/A',
          slotLocation: slot ? slot.location : 'Online / Hall',
          syllabus: b.syllabus || 'General Syllabus',
          bookingDate: b.bookedAt || b.createdAt,
          bookingStatus: b.status,
          resultId: matchedResult ? matchedResult._id : null,
          resultStatus: status,
          memoryGrade: matchedResult ? matchedResult.memoryGrade : null,
          mistakesGrade: matchedResult ? matchedResult.mistakesGrade : null,
          dateUploaded: matchedResult ? matchedResult.dateUploaded : null,
        };
      })
      .filter(Boolean) as any[];

    // Apply result status filter if specified
    const filteredRecords = resultStatusFilter
      ? records.filter((r) => r.resultStatus.toLowerCase() === resultStatusFilter.toLowerCase())
      : records;

    return res.json({
      success: true,
      records: filteredRecords,
      totalBookedStudents: filteredRecords.length,
      publishedCount: records.filter((r) => r.resultStatus === 'Published').length,
      pendingCount: records.filter((r) => r.resultStatus === 'Pending').length,
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
    if (bookingId && !resolvedSlotId) {
      const b = await Booking.findById(bookingId);
      if (b) resolvedSlotId = b.slot;
    }

    const resolvedTestName = (testName && testName.trim()) || 'Assessment Session';

    // Prevent duplicate result records for the same booking: Update if exists, else create
    let existingResult = null;
    if (bookingId) {
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
      if (bookingId) existingResult.booking = bookingId;
      if (resolvedSlotId) existingResult.slot = resolvedSlotId;
      await existingResult.save();
      savedResult = existingResult;
    } else {
      savedResult = await Result.create({
        student: targetStudentId,
        booking: bookingId || undefined,
        slot: resolvedSlotId || undefined,
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
      if (!targetStudentId && item.studentId) {
        const student = await Student.findOne({ studentId: item.studentId.toUpperCase().trim() });
        if (student) targetStudentId = student._id;
      }

      if (!targetStudentId) continue;

      let existing = null;
      if (item.bookingId) {
        existing = await Result.findOne({ booking: item.bookingId });
      }

      if (existing) {
        existing.memoryGrade = memoryGrade;
        existing.mistakesGrade = mistakesGrade;
        existing.grade = memoryGrade;
        existing.testName = testName;
        existing.status = 'Published';
        existing.dateUploaded = new Date();
        await existing.save();
        savedRecords.push(existing);
      } else {
        const created = await Result.create({
          student: targetStudentId,
          booking: item.bookingId || undefined,
          slot: item.slotId || undefined,
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
