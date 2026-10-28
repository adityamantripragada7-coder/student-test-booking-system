import { Router, Response } from 'express';
import { authenticateToken, requireAdmin, requireStudent, AuthRequest } from '../middleware/auth.js';
import { Booking } from '../models/Booking.js';
import { TestSlot } from '../models/TestSlot.js';
import { Student } from '../models/Student.js';
import { isDatabaseConnected } from '../db.js';

const router = Router();

// GET /api/bookings
router.get('/', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    if (!isDatabaseConnected()) {
      return res.status(503).json({
        success: false,
        message: 'Persistent database is not connected. Cannot load bookings.',
      });
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = (req.query.search as string) || '';
    const statusFilter = (req.query.status as string) || '';
    const dateFilter = (req.query.date as string) || '';
    const slotFilter = (req.query.slotId as string) || '';

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
      pagination: { total, page, limit, pages: Math.ceil(total / limit) || 1 },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/bookings/my
router.get('/my', authenticateToken, requireStudent, async (req: AuthRequest, res: Response) => {
  try {
    if (!isDatabaseConnected()) {
      return res.status(503).json({
        success: false,
        message: 'Persistent database is not connected.',
      });
    }

    const activeBooking = await Booking.findOne({
      student: req.user!.id,
      status: 'active',
    }).populate('slot');

    if (!activeBooking || !activeBooking.slot) {
      return res.json({ success: true, booking: null });
    }

    return res.json({ success: true, booking: activeBooking });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/bookings/book
router.post('/book', authenticateToken, requireStudent, async (req: AuthRequest, res: Response) => {
  try {
    if (!isDatabaseConnected()) {
      return res.status(503).json({
        success: false,
        message: 'Persistent database is not connected. Booking cannot be processed.',
      });
    }

    const { slotId, syllabus } = req.body;
    const studentId = req.user!.id;

    if (!slotId) {
      return res.status(400).json({ success: false, message: 'Test slot ID is required.' });
    }

    if (!syllabus || !syllabus.trim()) {
      return res.status(400).json({ success: false, message: 'Test syllabus is required. Please select a syllabus.' });
    }

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

    // Atomic increment to prevent race conditions
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
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/bookings/cancel/:id
router.post('/cancel/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (!isDatabaseConnected()) {
      return res.status(503).json({
        success: false,
        message: 'Persistent database is not connected. Booking cannot be cancelled.',
      });
    }

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
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
