import { Router, Response } from 'express';
import { authenticateToken, requireAdmin, requireStudent, AuthRequest } from '../middleware/auth.js';
import { Booking } from '../models/Booking.js';
import { TestSlot } from '../models/TestSlot.js';
import { Student } from '../models/Student.js';
import { isMongoConnected } from '../db.js';
import { LocalStore } from '../localStore.js';

const router = Router();

// GET /api/bookings
router.get('/', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = (req.query.search as string) || '';
    const statusFilter = (req.query.status as string) || '';
    const dateFilter = (req.query.date as string) || '';
    const slotFilter = (req.query.slotId as string) || '';

    if (isMongoConnected) {
      const query: any = {};
      if (statusFilter) query.status = statusFilter;
      if (slotFilter) query.slot = slotFilter;

      if (search) {
        const matchingStudents = await Student.find({
          $or: [
            { studentId: { $regex: search, $options: 'i' } },
            { name: { $regex: search, $options: 'i' } },
          ],
        }).select('_id');
        query.student = { $in: matchingStudents.map((s) => s._id) };
      }

      if (dateFilter) {
        const matchingSlots = await TestSlot.find({ testDate: dateFilter }).select('_id');
        query.slot = { $in: matchingSlots.map((s) => s._id) };
      }

      const skip = (page - 1) * limit;
      const total = await Booking.countDocuments(query);
      const bookings = await Booking.find(query)
        .populate('student', 'studentId name phone')
        .populate('slot', 'testTitle testDate startTime location capacity bookedCount')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      return res.json({
        success: true,
        bookings,
        pagination: { total, page, limit, pages: Math.ceil(total / limit) },
      });
    } else {
      // Local Store
      const db = LocalStore.read();
      let filtered = db.bookings.filter((b) => db.slots.some((s) => s._id === b.slot));

      if (statusFilter) {
        filtered = filtered.filter((b) => b.status === statusFilter);
      }

      if (search) {
        const sLower = search.toLowerCase();
        filtered = filtered.filter((b) => {
          const student = db.students.find((s) => s._id === b.student);
          return (
            student &&
            (student.studentId.toLowerCase().includes(sLower) || student.name.toLowerCase().includes(sLower))
          );
        });
      }

      if (dateFilter) {
        filtered = filtered.filter((b) => {
          const slot = db.slots.find((s) => s._id === b.slot);
          return slot && slot.testDate === dateFilter;
        });
      }

      if (slotFilter) {
        filtered = filtered.filter((b) => b.slot === slotFilter);
      }

      const total = filtered.length;
      const skip = (page - 1) * limit;
      const paginated = filtered.slice(skip, skip + limit);

      const populated = paginated.map((b) => {
        const student = db.students.find((s) => s._id === b.student);
        const slot = db.slots.find((s) => s._id === b.slot);
        return {
          ...b,
          student: student ? { _id: student._id, studentId: student.studentId, name: student.name, phone: student.phone } : b.student,
          slot: slot ? { _id: slot._id, testTitle: slot.testTitle, testDate: slot.testDate, startTime: slot.startTime, location: slot.location } : b.slot,
        };
      });

      return res.json({
        success: true,
        bookings: populated,
        pagination: { total, page, limit, pages: Math.ceil(total / limit) || 1 },
      });
    }
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/bookings/my
router.get('/my', authenticateToken, requireStudent, async (req: AuthRequest, res: Response) => {
  try {
    if (isMongoConnected) {
      const activeBooking = await Booking.findOne({
        student: req.user!.id,
        status: 'active',
      }).populate('slot');

      if (!activeBooking || !activeBooking.slot) {
        return res.json({ success: true, booking: null });
      }

      return res.json({ success: true, booking: activeBooking });
    } else {
      // Local Store
      const db = LocalStore.read();
      const active = db.bookings.find((b) => b.student === req.user!.id && b.status === 'active');
      if (!active) return res.json({ success: true, booking: null });

      const slot = db.slots.find((s) => s._id === active.slot);
      if (!slot) return res.json({ success: true, booking: null });

      return res.json({
        success: true,
        booking: {
          ...active,
          slot,
        },
      });
    }
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/bookings/book
router.post('/book', authenticateToken, requireStudent, async (req: AuthRequest, res: Response) => {
  try {
    const { slotId, syllabus } = req.body;
    const studentId = req.user!.id;

    if (!slotId) {
      return res.status(400).json({ success: false, message: 'Test slot ID is required.' });
    }

    if (!syllabus || !syllabus.trim()) {
      return res.status(400).json({ success: false, message: 'Test syllabus is required. Please select a syllabus.' });
    }

    if (isMongoConnected) {
      const existingActive = await Booking.findOne({ student: studentId, status: 'active' }).populate('slot');
      if (existingActive) {
        return res.status(400).json({
          success: false,
          message: 'You already have an active test booking. Please cancel it first.',
        });
      }

      const targetSlot = await TestSlot.findById(slotId);
      if (!targetSlot) return res.status(404).json({ success: false, message: 'Test slot not found.' });

      if (targetSlot.status === 'Cancelled') {
        return res.status(400).json({ success: false, message: 'This test slot has been cancelled.' });
      }

      const updatedSlot = await TestSlot.findOneAndUpdate(
        {
          _id: slotId,
          status: { $ne: 'Cancelled' },
          $expr: { $lt: ['$bookedCount', '$capacity'] },
        },
        { $inc: { bookedCount: 1 } },
        { new: true }
      );

      if (!updatedSlot) {
        await TestSlot.findByIdAndUpdate(slotId, { status: 'Full' });
        return res.status(400).json({ success: false, message: 'Sorry, this test slot is fully booked.' });
      }

      if (updatedSlot.bookedCount >= updatedSlot.capacity) {
        await TestSlot.findByIdAndUpdate(slotId, { status: 'Full' });
      }

      const newBooking = await Booking.create({
        student: studentId,
        slot: slotId,
        syllabus: syllabus.trim(),
        status: 'active',
        bookedAt: new Date(),
      });

      const populatedBooking = await Booking.findById(newBooking._id).populate('slot');
      return res.status(201).json({
        success: true,
        message: 'Test slot booked successfully!',
        booking: populatedBooking,
      });
    } else {
      // Local Store
      const db = LocalStore.read();
      const existingActive = db.bookings.find((b) => b.student === studentId && b.status === 'active');
      if (existingActive) {
        return res.status(400).json({
          success: false,
          message: 'You already have an active test booking. Please cancel it first.',
        });
      }

      const slotIdx = db.slots.findIndex((s) => s._id === slotId);
      if (slotIdx === -1) return res.status(404).json({ success: false, message: 'Test slot not found.' });

      const slot = db.slots[slotIdx];
      if (slot.status === 'Cancelled') {
        return res.status(400).json({ success: false, message: 'This test slot has been cancelled.' });
      }

      if (slot.bookedCount >= slot.capacity) {
        slot.status = 'Full';
        LocalStore.write(db);
        return res.status(400).json({ success: false, message: 'Sorry, this test slot is fully booked.' });
      }

      slot.bookedCount += 1;
      if (slot.bookedCount >= slot.capacity) {
        slot.status = 'Full';
      }

      const newBooking = {
        _id: LocalStore.generateId(),
        student: studentId,
        slot: slotId,
        syllabus: syllabus.trim(),
        status: 'active',
        bookedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      };

      db.bookings.unshift(newBooking);
      db.slots[slotIdx] = slot;
      LocalStore.write(db);

      return res.status(201).json({
        success: true,
        message: 'Test slot booked successfully!',
        booking: {
          ...newBooking,
          slot: slot,
        },
      });
    }
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/bookings/cancel/:id
router.post('/cancel/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (isMongoConnected) {
      const booking = await Booking.findById(req.params.id);
      if (!booking) return res.status(404).json({ success: false, message: 'Booking record not found.' });

      if (req.user!.role === 'student' && booking.student.toString() !== req.user!.id) {
        return res.status(403).json({ success: false, message: 'Not authorized to cancel this booking.' });
      }

      if (booking.status === 'cancelled') {
        return res.status(400).json({ success: false, message: 'Booking is already cancelled.' });
      }

      booking.status = 'cancelled';
      await booking.save();

      await TestSlot.findByIdAndUpdate(booking.slot, {
        $inc: { bookedCount: -1 },
        $set: { status: 'Available' },
      });

      return res.json({ success: true, message: 'Booking cancelled successfully. Seat released.' });
    } else {
      // Local Store
      const db = LocalStore.read();
      const bIdx = db.bookings.findIndex((b) => b._id === req.params.id);
      if (bIdx === -1) return res.status(404).json({ success: false, message: 'Booking record not found.' });

      const booking = db.bookings[bIdx];
      if (req.user!.role === 'student' && booking.student !== req.user!.id) {
        return res.status(403).json({ success: false, message: 'Not authorized to cancel this booking.' });
      }

      if (booking.status === 'cancelled') {
        return res.status(400).json({ success: false, message: 'Booking is already cancelled.' });
      }

      booking.status = 'cancelled';

      const slot = db.slots.find((s) => s._id === booking.slot);
      if (slot) {
        slot.bookedCount = Math.max(0, slot.bookedCount - 1);
        slot.status = 'Available';
      }

      db.bookings[bIdx] = booking;
      LocalStore.write(db);

      return res.json({ success: true, message: 'Booking cancelled successfully. Seat released.' });
    }
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
