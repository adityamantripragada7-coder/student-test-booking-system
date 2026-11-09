import { Router, Response } from 'express';
import { authenticateToken, requireStudent, requireAdmin, AuthRequest } from '../middleware/auth.js';
import { StudentAnswer, ISubmittedAnswerItem } from '../models/StudentAnswer.js';
import { Sloka } from '../models/Sloka.js';
import { Result } from '../models/Result.js';
import { Booking } from '../models/Booking.js';
import { Student } from '../models/Student.js';
import { isDatabaseConnected } from '../db.js';

const router = Router();

// Helper to determine letter grade from percentage
function calculateGrade(percentage: number): 'A+' | 'A' | 'B+' | 'B' | 'C+' | 'C' | 'Retest' {
  if (percentage >= 90) return 'A+';
  if (percentage >= 80) return 'A';
  if (percentage >= 70) return 'B+';
  if (percentage >= 60) return 'B';
  if (percentage >= 50) return 'C+';
  if (percentage >= 40) return 'C';
  return 'Retest';
}

// POST /api/answers/submit - Student submits answers to a test
router.post('/submit', authenticateToken, requireStudent, async (req: AuthRequest, res: Response) => {
  try {
    if (!isDatabaseConnected()) {
      return res.status(503).json({
        success: false,
        message: 'Persistent database is not connected. Answers cannot be saved.',
      });
    }

    const { bookingId, syllabus, testName, submissions } = req.body;
    const studentId = req.user!.id;

    if (!syllabus || !syllabus.trim()) {
      return res.status(400).json({ success: false, message: 'Test syllabus is required.' });
    }

    if (!Array.isArray(submissions) || submissions.length === 0) {
      return res.status(400).json({ success: false, message: 'Answer submissions cannot be empty.' });
    }

    // Verify student exists
    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student record not found.' });
    }

    // Load slokas for this syllabus to evaluate answers on the server side
    const slokas = await Sloka.find({ syllabus: syllabus.trim(), isActive: true });
    if (slokas.length === 0) {
      return res.status(404).json({
        success: false,
        message: `No active slokas found for syllabus "${syllabus}". Please contact your administrator.`,
      });
    }

    // Map questions for quick lookup
    const questionMap = new Map<string, { q: any; slokaId: any }>();
    for (const sloka of slokas) {
      for (const q of sloka.questions) {
        questionMap.set(String(q._id), { q, slokaId: sloka._id });
      }
    }

    const processedAnswers: ISubmittedAnswerItem[] = [];
    let totalScore = 0;
    let maxScore = 0;

    for (const sub of submissions) {
      const qLookup = questionMap.get(String(sub.questionId));
      if (!qLookup) continue;

      const { q, slokaId } = qLookup;
      const qMaxMarks = q.marks || 10;
      maxScore += qMaxMarks;

      const selectedIdx = Number(sub.selectedOptionIndex);
      const isCorrect = selectedIdx === q.correctOptionIndex;
      const marksAwarded = isCorrect ? qMaxMarks : 0;
      totalScore += marksAwarded;

      processedAnswers.push({
        slokaId,
        questionId: String(q._id),
        questionText: q.questionText,
        selectedOptionIndex: selectedIdx,
        selectedOptionText: q.options[selectedIdx] || 'No answer selected',
        correctOptionIndex: q.correctOptionIndex,
        isCorrect,
        marksAwarded,
        maxMarks: qMaxMarks,
      });
    }

    if (maxScore === 0) {
      maxScore = 100;
    }

    const percentage = Math.round((totalScore / maxScore) * 100);
    const grade = calculateGrade(percentage);
    const finalTestName = testName && testName.trim() ? testName.trim() : `Syllabus Assessment: ${syllabus.trim()}`;

    // 1. Permanently record the Student Answers in MongoDB Atlas
    const newStudentAnswer = await StudentAnswer.create({
      student: student._id,
      booking: bookingId || undefined,
      syllabus: syllabus.trim(),
      testName: finalTestName,
      answers: processedAnswers,
      totalScore,
      maxScore,
      percentage,
      grade,
      submittedAt: new Date(),
    });

    console.log(`✅ Saved StudentAnswer permanently in MongoDB: ${student.studentId} - Score: ${totalScore}/${maxScore} (${grade})`);

    // 2. Automatically record/update the official Test Result in MongoDB Atlas
    const resultDoc = await Result.create({
      student: student._id,
      testName: finalTestName,
      marksObtained: totalScore,
      maxMarks: maxScore,
      grade,
      status: 'Published',
      dateUploaded: new Date(),
    });

    console.log(`✅ Published Result permanently in MongoDB: ${resultDoc._id} for Student ${student.studentId}`);

    // 3. If there was an active booking for this student, mark it as completed
    if (bookingId) {
      await Booking.findByIdAndUpdate(bookingId, { status: 'completed' });
    } else {
      await Booking.findOneAndUpdate(
        { student: student._id, syllabus: syllabus.trim(), status: 'active' },
        { status: 'completed' }
      );
    }

    return res.status(201).json({
      success: true,
      message: 'Test answers submitted successfully!',
      submission: {
        id: newStudentAnswer._id,
        totalScore,
        maxScore,
        percentage,
        grade,
        submittedAt: newStudentAnswer.submittedAt,
        answers: processedAnswers,
      },
      result: resultDoc,
    });
  } catch (error: any) {
    console.error('Error submitting test answers:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/answers/my - Get current student's answer submissions
router.get('/my', authenticateToken, requireStudent, async (req: AuthRequest, res: Response) => {
  try {
    if (!isDatabaseConnected()) {
      return res.status(503).json({ success: false, message: 'Persistent database is not connected.' });
    }

    const studentId = req.user!.id;
    const submissions = await StudentAnswer.find({ student: studentId })
      .populate('booking')
      .sort({ submittedAt: -1 });

    return res.json({ success: true, count: submissions.length, submissions });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/answers/:id - Get specific submission by ID
router.get('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (!isDatabaseConnected()) {
      return res.status(503).json({ success: false, message: 'Persistent database is not connected.' });
    }

    const submission = await StudentAnswer.findById(req.params.id)
      .populate('student', 'studentId name phone')
      .populate('booking');

    if (!submission) {
      return res.status(404).json({ success: false, message: 'Answer submission not found.' });
    }

    // Only allow student to view their own submission unless user is admin
    if (req.user!.role === 'student' && String(submission.student._id || submission.student) !== req.user!.id) {
      return res.status(403).json({ success: false, message: 'Not authorized to view this submission.' });
    }

    return res.json({ success: true, submission });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/answers/admin/all - Admin view of all student answer submissions
router.get('/admin/all', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    if (!isDatabaseConnected()) {
      return res.status(503).json({ success: false, message: 'Persistent database is not connected.' });
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = (req.query.search as string) || '';

    const query: any = {};
    if (search) {
      const matchingStudents = await Student.find({
        $or: [
          { studentId: { $regex: search, $options: 'i' } },
          { name: { $regex: search, $options: 'i' } },
        ],
      }).select('_id');

      query.$or = [
        { student: { $in: matchingStudents.map((s) => s._id) } },
        { syllabus: { $regex: search, $options: 'i' } },
        { testName: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (page - 1) * limit;
    const total = await StudentAnswer.countDocuments(query);
    const submissions = await StudentAnswer.find(query)
      .populate('student', 'studentId name phone')
      .sort({ submittedAt: -1 })
      .skip(skip)
      .limit(limit);

    return res.json({
      success: true,
      submissions,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) || 1 },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

export default router;

