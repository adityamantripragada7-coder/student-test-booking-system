import { Router, Response } from 'express';
import { authenticateToken, requireAdmin, AuthRequest } from '../middleware/auth.js';
import { Student } from '../models/Student.js';
import { Booking } from '../models/Booking.js';
import { TestSlot } from '../models/TestSlot.js';
import { Result } from '../models/Result.js';
import { isMongoConnected } from '../db.js';
import { LocalStore } from '../localStore.js';

const router = Router();

// GET /api/students
router.get('/', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = (req.query.search as string) || '';

    if (isMongoConnected) {
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
        pagination: { total, page, limit, pages: Math.ceil(total / limit) },
      });
    } else {
      // Local Store
      const db = LocalStore.read();
      let filtered = db.students;
      if (search) {
        const sLower = search.toLowerCase();
        filtered = filtered.filter(
          (s) =>
            s.studentId.toLowerCase().includes(sLower) ||
            s.name.toLowerCase().includes(sLower) ||
            (s.phone && s.phone.toLowerCase().includes(sLower))
        );
      }

      const total = filtered.length;
      const skip = (page - 1) * limit;
      const students = filtered.slice(skip, skip + limit);

      return res.json({
        success: true,
        students,
        pagination: { total, page, limit, pages: Math.ceil(total / limit) || 1 },
      });
    }
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/students
router.post('/', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { studentId, name, phone } = req.body;

    if (!studentId || !name || !phone || !phone.trim()) {
      return res.status(400).json({ success: false, message: 'Student ID, Full Name, and Mobile Number are mandatory.' });
    }

    const formattedId = studentId.toUpperCase().trim();

    if (isMongoConnected) {
      const existing = await Student.findOne({ studentId: formattedId });
      if (existing) {
        return res.status(400).json({ success: false, message: `Student ID "${formattedId}" already exists.` });
      }

      const newStudent = await Student.create({
        studentId: formattedId,
        name: name.trim(),
        phone: phone.trim(),
        registrationDate: new Date(),
      });

      return res.status(201).json({ success: true, message: 'Student added successfully.', student: newStudent });
    } else {
      // Local Store
      const db = LocalStore.read();
      const existing = db.students.find((s) => s.studentId.toUpperCase() === formattedId);
      if (existing) {
        return res.status(400).json({ success: false, message: `Student ID "${formattedId}" already exists.` });
      }

      const newStudent = {
        _id: LocalStore.generateId(),
        studentId: formattedId,
        name: name.trim(),
        phone: phone.trim(),
        registrationDate: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      };

      db.students.unshift(newStudent);
      LocalStore.write(db);

      return res.status(201).json({ success: true, message: 'Student added successfully.', student: newStudent });
    }
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/students/:id
router.put('/:id', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { name, phone } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, message: 'Student Name is required.' });
    }

    if (phone !== undefined && !phone.trim()) {
      return res.status(400).json({ success: false, message: 'Mobile Number is mandatory.' });
    }

    if (isMongoConnected) {
      const student = await Student.findById(req.params.id);
      if (!student) return res.status(404).json({ success: false, message: 'Student not found.' });

      student.name = name.trim();
      if (phone !== undefined) student.phone = phone.trim();
      await student.save();

      return res.json({ success: true, message: 'Student updated successfully.', student });
    } else {
      // Local Store
      const db = LocalStore.read();
      const idx = db.students.findIndex((s) => s._id === req.params.id);
      if (idx === -1) return res.status(404).json({ success: false, message: 'Student not found.' });

      db.students[idx].name = name.trim();
      if (phone !== undefined) db.students[idx].phone = phone.trim();
      LocalStore.write(db);

      return res.json({ success: true, message: 'Student updated successfully.', student: db.students[idx] });
    }
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /api/students/:id
router.delete('/:id', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    if (isMongoConnected) {
      const student = await Student.findById(req.params.id);
      if (!student) return res.status(404).json({ success: false, message: 'Student not found.' });

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
        message: `Student ${student.studentId} (${student.name}) and associated records were safely deleted.`,
      });
    } else {
      // Local Store
      const db = LocalStore.read();
      const studentIdx = db.students.findIndex((s) => s._id === req.params.id);
      if (studentIdx === -1) return res.status(404).json({ success: false, message: 'Student not found.' });

      const student = db.students[studentIdx];

      // Release active slot capacity
      db.bookings.forEach((b) => {
        if (b.student === student._id && b.status === 'active') {
          const slot = db.slots.find((s) => s._id === b.slot);
          if (slot) {
            slot.bookedCount = Math.max(0, slot.bookedCount - 1);
            slot.status = 'Available';
          }
        }
      });

      // Filter out bookings & results
      db.bookings = db.bookings.filter((b) => b.student !== student._id);
      db.results = db.results.filter((r) => r.student !== student._id);
      db.students.splice(studentIdx, 1);

      LocalStore.write(db);

      return res.json({
        success: true,
        message: `Student ${student.studentId} (${student.name}) deleted.`,
      });
    }
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
