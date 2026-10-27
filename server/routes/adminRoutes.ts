import { Router, Response } from 'express';
import { authenticateToken, requireAdmin, AuthRequest } from '../middleware/auth.js';
import { Student } from '../models/Student.js';
import { TestSlot } from '../models/TestSlot.js';
import { Booking } from '../models/Booking.js';
import { Result } from '../models/Result.js';
import { isMongoConnected } from '../db.js';
import { LocalStore } from '../localStore.js';

const router = Router();

router.get('/stats', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    if (isMongoConnected) {
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
    } else {
      // Local Store
      const db = LocalStore.read();
      const totalStudents = db.students.length;
      const totalTestSlots = db.slots.length;
      const activeBookings = db.bookings.filter((b) => b.status === 'active');
      const totalBookings = activeBookings.length;
      const totalResults = db.results.length;

      const upcomingTests = db.slots
        .filter((s) => s.status !== 'Cancelled')
        .slice(0, 5);

      const recentBookings = activeBookings
        .slice(0, 6)
        .map((b) => {
          const student = db.students.find((s) => s._id === b.student);
          const slot = db.slots.find((s) => s._id === b.slot);
          return {
            ...b,
            student: student ? { studentId: student.studentId, name: student.name } : null,
            slot: slot ? { testTitle: slot.testTitle, testDate: slot.testDate, startTime: slot.startTime, location: slot.location } : null,
          };
        });

      return res.json({
        success: true,
        stats: { totalStudents, totalTestSlots, totalBookings, totalResults },
        upcomingTests,
        recentBookings,
      });
    }
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
