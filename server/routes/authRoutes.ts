import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Admin } from '../models/Admin.js';
import { Student } from '../models/Student.js';
import { authenticateToken, AuthRequest, getJwtSecret } from '../middleware/auth.js';
import { isDatabaseConnected } from '../db.js';
import { getNextStudentId, formatStudentId } from '../utils/studentIdGenerator.js';

const router = Router();

// Check setup status
router.get('/setup-status', async (req: Request, res: Response) => {
  try {
    if (!isDatabaseConnected()) {
      return res.json({
        success: true,
        hasAdmin: false,
        engine: 'Disconnected',
        connected: false,
      });
    }

    const count = await Admin.countDocuments();
    return res.json({
      success: true,
      hasAdmin: count > 0,
      engine: process.env.MONGODB_URI?.includes('mongodb+srv') ? 'MongoDB Atlas' : 'MongoDB',
      connected: true,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// Admin Setup
router.post('/admin/setup', async (req: Request, res: Response) => {
  try {
    if (!isDatabaseConnected()) {
      return res.status(503).json({
        success: false,
        message: 'Persistent database is not connected. Admin setup cannot be performed.',
      });
    }

    const { username, password, name, email, setupSecret } = req.body;

    if (!username || !password || !name) {
      return res.status(400).json({ success: false, message: 'Username, password, and name are required.' });
    }

    const envSecret = process.env.ADMIN_SETUP_SECRET || 'admin-setup-secret-key-12345';
    const formattedUsername = username.toLowerCase().trim();

    const adminCount = await Admin.countDocuments();
    if (adminCount > 0 && (!setupSecret || setupSecret !== envSecret)) {
      return res.status(403).json({ success: false, message: 'Invalid setup secret key. Admin setup disabled.' });
    }

    const existing = await Admin.findOne({ username: formattedUsername });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Username is already taken.' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const newAdmin = await Admin.create({
      username: formattedUsername,
      email: email ? email.toLowerCase().trim() : '',
      name: name.trim(),
      passwordHash,
    });

    const token = jwt.sign(
      { id: newAdmin._id, role: 'admin', username: newAdmin.username, name: newAdmin.name },
      getJwtSecret(),
      { expiresIn: '7d' }
    );

    return res.status(201).json({
      success: true,
      message: 'Admin account created successfully.',
      token,
      user: { id: newAdmin._id, role: 'admin', username: newAdmin.username, name: newAdmin.name, email: newAdmin.email },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// Admin Login
router.post('/admin/login', async (req: Request, res: Response) => {
  try {
    if (!isDatabaseConnected()) {
      return res.status(503).json({
        success: false,
        message: 'Persistent database is not connected. Admin login unavailable.',
      });
    }

    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Username and password are required.' });
    }

    const formattedUsername = username.toLowerCase().trim();

    const admin = await Admin.findOne({ username: formattedUsername });
    if (!admin) return res.status(401).json({ success: false, message: 'Invalid admin credentials.' });

    const isMatch = await bcrypt.compare(password, admin.passwordHash);
    if (!isMatch) return res.status(401).json({ success: false, message: 'Invalid admin credentials.' });

    const token = jwt.sign(
      { id: admin._id, role: 'admin', username: admin.username, name: admin.name },
      getJwtSecret(),
      { expiresIn: '7d' }
    );

    return res.json({
      success: true,
      message: 'Admin login successful.',
      token,
      user: { id: admin._id, role: 'admin', username: admin.username, name: admin.name, email: admin.email },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// Student Self-Registration (Public)
router.post('/student/register', async (req: Request, res: Response) => {
  try {
    if (!isDatabaseConnected()) {
      return res.status(503).json({
        success: false,
        message: 'Persistent database is not connected. Student registration cannot be completed right now. Please try again shortly.',
      });
    }

    const { name, phone, studentId } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Full name is required.' });
    }

    if (!phone || !phone.trim()) {
      return res.status(400).json({ success: false, message: 'Mobile number is required.' });
    }

    const trimmedPhone = phone.trim();
    const trimmedName = name.trim();

    // Check if a student with the exact same phone already exists
    const existingWithPhone = await Student.findOne({ phone: trimmedPhone });
    if (existingWithPhone) {
      // Return student ID so they can log in directly
      return res.status(409).json({
        success: false,
        message: `A student is already registered with mobile number ${trimmedPhone}. Your Student ID is "${existingWithPhone.studentId}". Please log in.`,
        existingStudentId: existingWithPhone.studentId,
      });
    }

    // Determine student ID: generate automatically if not specified
    let assignedId = studentId ? formatStudentId(studentId) : await getNextStudentId();

    // In case of any concurrent collision, retry up to 5 times
    let createdStudent: any = null;
    let attempts = 0;
    while (!createdStudent && attempts < 5) {
      try {
        const collisionCheck = await Student.findOne({ studentId: assignedId });
        if (collisionCheck) {
          assignedId = await getNextStudentId();
        }

        createdStudent = await Student.create({
          studentId: assignedId,
          name: trimmedName,
          phone: trimmedPhone,
          registrationDate: new Date(),
        });
      } catch (err: any) {
        if (err.code === 11000) {
          attempts++;
          assignedId = await getNextStudentId();
        } else {
          throw err;
        }
      }
    }

    if (!createdStudent) {
      return res.status(500).json({
        success: false,
        message: 'Could not allocate a unique Student ID due to high concurrent traffic. Please try again.',
      });
    }

    console.log(`✅ Permanently registered new student in MongoDB: ${createdStudent.studentId} (${createdStudent.name})`);

    const token = jwt.sign(
      { id: createdStudent._id, role: 'student', studentId: createdStudent.studentId, name: createdStudent.name },
      getJwtSecret(),
      { expiresIn: '7d' }
    );

    return res.status(201).json({
      success: true,
      message: `Registration successful! Your assigned Student ID is ${createdStudent.studentId}.`,
      token,
      studentId: createdStudent.studentId,
      user: {
        id: createdStudent._id,
        role: 'student',
        studentId: createdStudent.studentId,
        name: createdStudent.name,
        phone: createdStudent.phone,
        registrationDate: createdStudent.registrationDate,
      },
    });
  } catch (error: any) {
    console.error('Error during student registration:', error);
    return res.status(500).json({ success: false, message: error.message || 'Internal server error during registration.' });
  }
});

// Student Login
router.post('/student/login', async (req: Request, res: Response) => {
  try {
    if (!isDatabaseConnected()) {
      return res.status(503).json({
        success: false,
        message: 'Persistent database is not connected. Student login unavailable.',
      });
    }

    const { studentId } = req.body;

    if (!studentId || !studentId.trim()) {
      return res.status(400).json({ success: false, message: 'Student ID is required.' });
    }

    const formattedId = formatStudentId(studentId);

    const student = await Student.findOne({ studentId: formattedId });
    if (!student) {
      return res.status(404).json({
        success: false,
        message: `Student ID "${formattedId}" not found in database. Please verify your ID or register as a new student.`,
      });
    }

    const token = jwt.sign(
      { id: student._id, role: 'student', studentId: student.studentId, name: student.name },
      getJwtSecret(),
      { expiresIn: '7d' }
    );

    return res.json({
      success: true,
      message: 'Student login successful.',
      token,
      user: {
        id: student._id,
        role: 'student',
        studentId: student.studentId,
        name: student.name,
        phone: student.phone,
        registrationDate: student.registrationDate,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// Verify token
router.get('/me', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ success: false, message: 'Not authenticated' });

    if (!isDatabaseConnected()) {
      return res.status(503).json({
        success: false,
        message: 'Persistent database is not connected.',
      });
    }

    if (req.user.role === 'admin') {
      const admin = await Admin.findById(req.user.id).select('-passwordHash');
      if (!admin) return res.status(404).json({ success: false, message: 'Admin not found in database' });
      return res.json({
        success: true,
        user: { id: admin._id, role: 'admin', username: admin.username, name: admin.name, email: admin.email },
      });
    } else {
      const student = await Student.findById(req.user.id);
      if (!student) return res.status(404).json({ success: false, message: 'Student not found in database' });
      return res.json({
        success: true,
        user: {
          id: student._id,
          role: 'student',
          studentId: student.studentId,
          name: student.name,
          phone: student.phone,
          registrationDate: student.registrationDate,
        },
      });
    }
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
