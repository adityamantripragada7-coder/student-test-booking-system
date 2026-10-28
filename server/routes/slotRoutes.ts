import { Router, Response } from 'express';
import { authenticateToken, requireAdmin, AuthRequest } from '../middleware/auth.js';
import { TestSlot } from '../models/TestSlot.js';
import { Booking } from '../models/Booking.js';
import { isDatabaseConnected } from '../db.js';

const router = Router();

// GET /api/slots
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (!isDatabaseConnected()) {
      return res.status(503).json({
        success: false,
        message: 'Persistent database is not connected. Cannot load test slots.',
      });
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const status = req.query.status as string;
    const search = req.query.search as string;

    const query: any = {};
    if (status) query.status = status;
    if (search) {
      query.$or = [
        { testTitle: { $regex: search, $options: 'i' } },
        { location: { $regex: search, $options: 'i' } },
        { testDate: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (page - 1) * limit;
    const total = await TestSlot.countDocuments(query);
    const slots = await TestSlot.find(query)
      .sort({ testDate: 1, startTime: 1 })
      .skip(skip)
      .limit(limit);

    const formattedSlots = slots.map((slot) => {
      const availableSeats = Math.max(0, slot.capacity - slot.bookedCount);
      let calculatedStatus = slot.status;
      if (calculatedStatus !== 'Cancelled') {
        calculatedStatus = availableSeats === 0 ? 'Full' : 'Available';
      }
      return {
        ...slot.toObject(),
        availableSeats,
        status: calculatedStatus,
      };
    });

    return res.json({
      success: true,
      slots: formattedSlots,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) || 1 },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/slots
router.post('/', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    if (!isDatabaseConnected()) {
      return res.status(503).json({
        success: false,
        message: 'Persistent database is not connected. Slot cannot be saved.',
      });
    }

    const { testTitle, testDate, startTime, endTime, capacity, location } = req.body;

    if (!testDate || !startTime || !capacity) {
      return res.status(400).json({ success: false, message: 'Date, Start Time, and Capacity are required.' });
    }

    const numCapacity = parseInt(capacity);
    if (isNaN(numCapacity) || numCapacity < 1) {
      return res.status(400).json({ success: false, message: 'Capacity must be at least 1.' });
    }

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    if (testDate < todayStr) {
      return res.status(400).json({ success: false, message: 'Cannot create a test slot for a past date.' });
    }

    const slotTitle = testTitle && testTitle.trim() ? testTitle.trim() : 'Assessment Slot';
    const slotLocation = location ? location.trim() : '';
    const slotEndTime = endTime ? endTime.trim() : '';

    const newSlot = await TestSlot.create({
      testTitle: slotTitle,
      testDate: testDate.trim(),
      startTime: startTime.trim(),
      endTime: slotEndTime,
      capacity: numCapacity,
      bookedCount: 0,
      status: 'Available',
      location: slotLocation,
    });

    return res.status(201).json({
      success: true,
      message: 'Test slot created successfully.',
      slot: { ...newSlot.toObject(), availableSeats: newSlot.capacity },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/slots/:id
router.put('/:id', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    if (!isDatabaseConnected()) {
      return res.status(503).json({
        success: false,
        message: 'Persistent database is not connected. Slot update cannot be saved.',
      });
    }

    const { testTitle, testDate, startTime, endTime, capacity, location, status } = req.body;

    const slot = await TestSlot.findById(req.params.id);
    if (!slot) return res.status(404).json({ success: false, message: 'Test slot not found.' });

    if (capacity !== undefined) {
      const numCapacity = parseInt(capacity);
      if (isNaN(numCapacity) || numCapacity < slot.bookedCount) {
        return res.status(400).json({
          success: false,
          message: `Capacity cannot be less than active bookings (${slot.bookedCount}).`,
        });
      }
      slot.capacity = numCapacity;
    }

    if (testTitle) slot.testTitle = testTitle.trim();
    if (testDate) slot.testDate = testDate.trim();
    if (startTime) slot.startTime = startTime.trim();
    if (endTime !== undefined) slot.endTime = endTime.trim();
    if (location !== undefined) slot.location = location.trim();

    if (status && ['Available', 'Full', 'Cancelled'].includes(status)) {
      slot.status = status;
    } else {
      slot.status = slot.bookedCount >= slot.capacity ? 'Full' : 'Available';
    }

    await slot.save();

    return res.json({
      success: true,
      message: 'Test slot updated successfully.',
      slot: { ...slot.toObject(), availableSeats: Math.max(0, slot.capacity - slot.bookedCount) },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /api/slots/:id
router.delete('/:id', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    if (!isDatabaseConnected()) {
      return res.status(503).json({
        success: false,
        message: 'Persistent database is not connected. Slot cannot be deleted.',
      });
    }

    const slot = await TestSlot.findById(req.params.id);
    if (!slot) return res.status(404).json({ success: false, message: 'Test slot not found.' });

    // Permanently delete all bookings regarding this test slot
    const deleteResult = await Booking.deleteMany({ slot: slot._id });
    await TestSlot.findByIdAndDelete(slot._id);

    return res.json({
      success: true,
      message: `Test slot and all regarding bookings (${deleteResult.deletedCount || 0}) deleted successfully.`,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
