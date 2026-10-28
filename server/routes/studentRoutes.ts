import { Router, Response } from 'express';
import { authenticateToken, requireAdmin, AuthRequest } from '../middleware/auth.js';
import { Student } from '../models/Student.js';
import { Booking } from '../models/Booking.js';
import { TestSlot } from '../models/TestSlot.js';
import { Result } from '../models/Result.js';
import { isDatabaseConnected } from '../db.js';

const router = Router();

// GET /api/students - List students with pagination and search
router.get('/', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    if (!isDatabaseConnected()) {
      return res.status(503).json({
        success: false,
        message: 'Persistent database is currently not connected. Please check MONGODB_URI.',
      });
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = (req.query.search as string) || '';

    const query: any = {};
    if (search) {
      query.$or = [
        { studentId: { $regex: search, $options: 'i' } },
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (page - 1) * limit;
    const total = await Student.countDocuments(query);
    const students = await Student.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    return res.json({
      success: true,
      students,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) || 1 },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/students - Create new student in persistent MongoDB
router.post('/', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    if (!isDatabaseConnected()) {
      return res.status(503).json({
        success: false,
        message: 'Persistent database is not connected. Student record was not saved to prevent data loss. Please check MONGODB_URI.',
      });
    }

    const { studentId, name, phone } = req.body;

    if (!studentId || !name || !phone || !phone.trim()) {
      return res.status(400).json({ success: false, message: 'Student ID, Full Name, and Mobile Number are mandatory.' });
    }

    const formattedId = studentId.toUpperCase().trim();

    const existing = await Student.findOne({ studentId: formattedId });
    if (existing) {
      return res.status(400).json({ success: false, message: `Student ID "${formattedId}" already exists.` });
    }

    // Persist to MongoDB
    const newStudent = await Student.create({
      studentId: formattedId,
      name: name.trim(),
      phone: phone.trim(),
      registrationDate: new Date(),
    });

    return res.status(201).json({
      success: true,
      message: 'Student added successfully to persistent database.',
      student: newStudent,
    });
  } catch (error: any) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'Student ID already exists in database.' });
    }
    return res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/students/:id - Update student in persistent MongoDB
router.put('/:id', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    if (!isDatabaseConnected()) {
      return res.status(503).json({
        success: false,
        message: 'Persistent database is not connected. Student updates cannot be saved.',
      });
    }

    const { name, phone } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, message: 'Student Name is required.' });
    }

    if (phone !== undefined && !phone.trim()) {
      return res.status(400).json({ success: false, message: 'Mobile Number is mandatory.' });
    }

    const student = await Student.findById(req.params.id);
    if (!student) return res.status(404).json({ success: false, message: 'Student not found in database.' });

    student.name = name.trim();
    if (phone !== undefined) student.phone = phone.trim();
    await student.save();

    return res.json({ success: true, message: 'Student updated successfully.', student });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /api/students/:id - Remove student from persistent MongoDB and clean up relations
router.delete('/:id', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    if (!isDatabaseConnected()) {
      return res.status(503).json({
        success: false,
        message: 'Persistent database is not connected. Student cannot be deleted.',
      });
    }

    const student = await Student.findById(req.params.id);
    if (!student) return res.status(404).json({ success: false, message: 'Student not found in database.' });

    const activeBookings = await Booking.find({ student: student._id, status: 'active' });
    for (const booking of activeBookings) {
      await TestSlot.findByIdAndUpdate(booking.slot, {
        $inc: { bookedCount: -1 },
        $set: { status: 'Available' },
      });
    }

    await Booking.deleteMany({ student: student._id });
    await Result.deleteMany({ student: student._id });
    await Student.findByIdAndDelete(student._id);

    return res.json({
      success: true,
      message: `Student ${student.studentId} (${student.name}) and associated records were safely deleted from persistent database.`,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
