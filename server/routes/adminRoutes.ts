import { Router, Response } from 'express';
import { authenticateToken, requireAdmin, AuthRequest } from '../middleware/auth.js';
import { Student } from '../models/Student.js';
import { TestSlot } from '../models/TestSlot.js';
import { Booking } from '../models/Booking.js';
import { Result } from '../models/Result.js';
import { isDatabaseConnected } from '../db.js';

const router = Router();

router.get('/stats', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    if (!isDatabaseConnected()) {
      return res.status(503).json({
        success: false,
        message: 'Persistent database is not connected. Cannot load stats.',
      });
    }

    const totalStudents = await Student.countDocuments();
    const totalTestSlots = await TestSlot.countDocuments();
    const totalBookings = await Booking.countDocuments({ status: 'active' });
    const totalResults = await Result.countDocuments();

    const upcomingTests = await TestSlot.find({ status: { $ne: 'Cancelled' } })
      .sort({ testDate: 1, startTime: 1 })
      .limit(5);

    const recentBookings = await Booking.find({ status: 'active' })
      .populate('student', 'studentId name')
      .populate('slot', 'testTitle testDate startTime location')
      .sort({ createdAt: -1 })
      .limit(6);

    return res.json({
      success: true,
      stats: { totalStudents, totalTestSlots, totalBookings, totalResults },
      upcomingTests,
      recentBookings,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
