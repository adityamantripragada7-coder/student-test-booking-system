import { Router, Response } from 'express';
import { authenticateToken, requireAdmin, requireStudent, AuthRequest } from '../middleware/auth.js';
import { Result } from '../models/Result.js';
import { Student } from '../models/Student.js';
import { isMongoConnected } from '../db.js';
import { LocalStore } from '../localStore.js';

const router = Router();

// GET /api/results
router.get('/', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = (req.query.search as string) || '';
    const statusFilter = (req.query.status as string) || '';
    const gradeFilter = (req.query.grade as string) || '';

    if (isMongoConnected) {
      const query: any = {};
      if (statusFilter) query.status = statusFilter;
      if (gradeFilter) query.grade = gradeFilter;

      if (search) {
        const matchingStudents = await Student.find({
          $or: [
            { studentId: { $regex: search, $options: 'i' } },
            { name: { $regex: search, $options: 'i' } },
          ],
        }).select('_id');

        query.$or = [
          { student: { $in: matchingStudents.map((s) => s._id) } },
          { testName: { $regex: search, $options: 'i' } },
        ];
      }

      const skip = (page - 1) * limit;
      const total = await Result.countDocuments(query);
      const results = await Result.find(query)
        .populate('student', 'studentId name phone')
        .sort({ dateUploaded: -1 })
        .skip(skip)
        .limit(limit);

      return res.json({
        success: true,
        results,
        pagination: { total, page, limit, pages: Math.ceil(total / limit) },
      });
    } else {
      // Local Store
      const db = LocalStore.read();
      let filtered = db.results;

      if (statusFilter) {
        filtered = filtered.filter((r) => r.status === statusFilter);
      }

      if (gradeFilter) {
        filtered = filtered.filter((r) => r.grade === gradeFilter);
      }

      if (search) {
        const sLower = search.toLowerCase();
        filtered = filtered.filter((r) => {
          const student = db.students.find((s) => s._id === r.student);
          return (
            r.testName.toLowerCase().includes(sLower) ||
            (student && (student.studentId.toLowerCase().includes(sLower) || student.name.toLowerCase().includes(sLower)))
          );
        });
      }

      const total = filtered.length;
      const skip = (page - 1) * limit;
      const paginated = filtered.slice(skip, skip + limit);

      const populated = paginated.map((r) => {
        const student = db.students.find((s) => s._id === r.student);
        return {
          ...r,
          student: student ? { _id: student._id, studentId: student.studentId, name: student.name, phone: student.phone } : r.student,
        };
      });

      return res.json({
        success: true,
        results: populated,
        pagination: { total, page, limit, pages: Math.ceil(total / limit) || 1 },
      });
    }
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/results/my
router.get('/my', authenticateToken, requireStudent, async (req: AuthRequest, res: Response) => {
  try {
    const studentUser = req.user!;

    if (isMongoConnected) {
      const studentDoc = await Student.findOne({
        $or: [{ _id: studentUser.id }, { studentId: studentUser.studentId }],
      });
      const studentIdMatch = studentDoc ? studentDoc._id : studentUser.id;

      const results = await Result.find({
        $or: [{ student: studentIdMatch }, { student: studentUser.id }],
      }).sort({ dateUploaded: -1 });

      const latestResult = results.length > 0 ? results[0] : null;
      return res.json({ success: true, latestResult, history: results });
    } else {
      // Local Store
      const db = LocalStore.read();
      const studentDoc = db.students.find(
        (s) => s._id === studentUser.id || (studentUser.studentId && s.studentId.toUpperCase() === studentUser.studentId.toUpperCase())
      );
      const studentIdMatch = studentDoc ? studentDoc._id : studentUser.id;

      const results = db.results.filter(
        (r) =>
          r.student === studentIdMatch ||
          r.student === studentUser.id ||
          (studentDoc && r.student === studentDoc.studentId)
      );

      results.sort((a, b) => new Date(b.dateUploaded).getTime() - new Date(a.dateUploaded).getTime());
      const latestResult = results.length > 0 ? results[0] : null;

      return res.json({ success: true, latestResult, history: results });
    }
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

const VALID_GRADES = ['A+', 'A', 'B+', 'B', 'C+', 'C', 'Retest'];

// POST /api/results
router.post('/', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { studentId, studentDbId, testName, marksObtained, maxMarks, grade, status } = req.body;

    if (!testName || !testName.trim()) {
      return res.status(400).json({ success: false, message: 'Test Name is required.' });
    }

    if (!grade || !VALID_GRADES.includes(grade.trim())) {
      return res.status(400).json({
        success: false,
        message: 'A valid Grade is required (A+, A, B+, B, C+, C, Retest).',
      });
    }

    const numMarks = marksObtained !== undefined && marksObtained !== '' && marksObtained !== null ? Number(marksObtained) : null;
    const numMaxMarks = maxMarks !== undefined && maxMarks !== '' && maxMarks !== null ? Number(maxMarks) : null;

    if (numMarks !== null && (isNaN(numMarks) || numMarks < 0)) {
      return res.status(400).json({ success: false, message: 'Marks obtained must be non-negative.' });
    }

    if (numMaxMarks !== null && (isNaN(numMaxMarks) || numMaxMarks <= 0)) {
      return res.status(400).json({ success: false, message: 'Max marks must be greater than 0.' });
    }

    if (numMarks !== null && numMaxMarks !== null && numMarks > numMaxMarks) {
      return res.status(400).json({ success: false, message: 'Marks obtained cannot exceed max marks.' });
    }

    const selectedGrade = grade.trim() as 'A+' | 'A' | 'B+' | 'B' | 'C+' | 'C' | 'Retest';

    if (isMongoConnected) {
      let targetStudentId = studentDbId;
      if (!targetStudentId && studentId) {
        const student = await Student.findOne({ studentId: studentId.toUpperCase().trim() });
        if (!student) return res.status(404).json({ success: false, message: `Student ID "${studentId}" not found.` });
        targetStudentId = student._id;
      }

      if (!targetStudentId) {
        return res.status(400).json({ success: false, message: 'Valid Student ID required.' });
      }

      const newResult = await Result.create({
        student: targetStudentId,
        testName: testName.trim(),
        marksObtained: numMarks,
        maxMarks: numMaxMarks,
        grade: selectedGrade,
        status: status || 'Published',
        dateUploaded: new Date(),
      });

      const populatedResult = await Result.findById(newResult._id).populate('student', 'studentId name');
      return res.status(201).json({ success: true, message: 'Result published successfully.', result: populatedResult });
    } else {
      // Local Store
      const db = LocalStore.read();
      let targetStudent = db.students.find((s) => s._id === studentDbId);
      if (!targetStudent && studentId) {
        targetStudent = db.students.find((s) => s.studentId.toUpperCase() === studentId.toUpperCase().trim());
      }

      if (!targetStudent) {
        return res.status(404).json({ success: false, message: `Student ID "${studentId}" not found.` });
      }

      const newResult = {
        _id: LocalStore.generateId(),
        student: targetStudent._id,
        testName: testName.trim(),
        marksObtained: numMarks,
        maxMarks: numMaxMarks,
        grade: selectedGrade,
        status: status || 'Published',
        dateUploaded: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      };

      db.results.unshift(newResult);
      LocalStore.write(db);

      return res.status(201).json({
        success: true,
        message: 'Result published successfully.',
        result: { ...newResult, student: { studentId: targetStudent.studentId, name: targetStudent.name } },
      });
    }
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/results/:id
router.put('/:id', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { testName, marksObtained, maxMarks, grade, status } = req.body;

    if (grade && !VALID_GRADES.includes(grade.trim())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid grade. Allowed grades: A+, A, B+, B, C+, C, Retest.',
      });
    }

    if (isMongoConnected) {
      const result = await Result.findById(req.params.id);
      if (!result) return res.status(404).json({ success: false, message: 'Result record not found.' });

      if (testName) result.testName = testName.trim();
      if (grade !== undefined && grade !== '') result.grade = grade.trim() as any;
      if (status) result.status = status;

      if (maxMarks !== undefined) {
        result.maxMarks = maxMarks !== '' && maxMarks !== null ? Number(maxMarks) : null;
      }
      if (marksObtained !== undefined) {
        result.marksObtained = marksObtained !== '' && marksObtained !== null ? Number(marksObtained) : null;
      }

      await result.save();
      const updatedResult = await Result.findById(result._id).populate('student', 'studentId name');
      return res.json({ success: true, message: 'Result updated successfully.', result: updatedResult });
    } else {
      // Local Store
      const db = LocalStore.read();
      const rIdx = db.results.findIndex((r) => r._id === req.params.id);
      if (rIdx === -1) return res.status(404).json({ success: false, message: 'Result record not found.' });

      const result = db.results[rIdx];
      if (testName) result.testName = testName.trim();
      if (grade !== undefined && grade !== '') result.grade = grade.trim();
      if (status) result.status = status;

      if (maxMarks !== undefined) {
        result.maxMarks = maxMarks !== '' && maxMarks !== null ? Number(maxMarks) : null;
      }
      if (marksObtained !== undefined) {
        result.marksObtained = marksObtained !== '' && marksObtained !== null ? Number(marksObtained) : null;
      }

      db.results[rIdx] = result;
      LocalStore.write(db);

      const student = db.students.find((s) => s._id === result.student);
      return res.json({
        success: true,
        message: 'Result updated successfully.',
        result: { ...result, student: student ? { studentId: student.studentId, name: student.name } : result.student },
      });
    }
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /api/results/:id
router.delete('/:id', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    if (isMongoConnected) {
      const result = await Result.findByIdAndDelete(req.params.id);
      if (!result) return res.status(404).json({ success: false, message: 'Result record not found.' });

      return res.json({ success: true, message: 'Result record deleted.' });
    } else {
      // Local Store
      const db = LocalStore.read();
      const rIdx = db.results.findIndex((r) => r._id === req.params.id);
      if (rIdx === -1) return res.status(404).json({ success: false, message: 'Result record not found.' });

      db.results.splice(rIdx, 1);
      LocalStore.write(db);

      return res.json({ success: true, message: 'Result record deleted.' });
    }
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
