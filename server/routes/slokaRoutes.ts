import { Router, Request, Response } from 'express';
import { authenticateToken, requireAdmin, AuthRequest } from '../middleware/auth.js';
import { Sloka } from '../models/Sloka.js';
import { isDatabaseConnected } from '../db.js';

const router = Router();

// GET /api/slokas - List slokas, optional syllabus filter (public/authenticated)
router.get('/', async (req: Request, res: Response) => {
  try {
    if (!isDatabaseConnected()) {
      return res.status(503).json({
        success: false,
        message: 'Persistent database is not connected.',
      });
    }

    const { syllabus, chapter } = req.query;
    const query: any = { isActive: true };

    if (syllabus) {
      query.syllabus = String(syllabus).trim();
    }
    if (chapter) {
      query.chapter = Number(chapter);
    }

    const slokas = await Sloka.find(query).sort({ syllabus: 1, chapter: 1, slokaNumber: 1 });
    return res.json({
      success: true,
      count: slokas.length,
      slokas,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/slokas/:id - Get single sloka by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    if (!isDatabaseConnected()) {
      return res.status(503).json({ success: false, message: 'Persistent database is not connected.' });
    }

    const sloka = await Sloka.findById(req.params.id);
    if (!sloka) {
      return res.status(404).json({ success: false, message: 'Sloka not found in database.' });
    }

    return res.json({ success: true, sloka });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/slokas - Admin creates new sloka with questions
router.post('/', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    if (!isDatabaseConnected()) {
      return res.status(503).json({ success: false, message: 'Persistent database is not connected.' });
    }

    const { syllabus, chapter, slokaNumber, title, sanskritText, transliteration, englishMeaning, questions } = req.body;

    if (!syllabus || !chapter || !slokaNumber || !title || !sanskritText || !englishMeaning) {
      return res.status(400).json({
        success: false,
        message: 'Syllabus, chapter, slokaNumber, title, sanskritText, and englishMeaning are required.',
      });
    }

    const newSloka = await Sloka.create({
      syllabus: syllabus.trim(),
      chapter: Number(chapter),
      slokaNumber: Number(slokaNumber),
      title: title.trim(),
      sanskritText: sanskritText.trim(),
      transliteration: transliteration ? transliteration.trim() : '',
      englishMeaning: englishMeaning.trim(),
      questions: Array.isArray(questions) ? questions : [],
      isActive: true,
    });

    console.log(`✅ Admin created new Sloka in MongoDB: ${newSloka.title} (Syllabus: ${newSloka.syllabus})`);
    return res.status(201).json({ success: true, message: 'Sloka added successfully.', sloka: newSloka });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/slokas/:id - Admin updates a sloka
router.put('/:id', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    if (!isDatabaseConnected()) {
      return res.status(503).json({ success: false, message: 'Persistent database is not connected.' });
    }

    const sloka = await Sloka.findById(req.params.id);
    if (!sloka) {
      return res.status(404).json({ success: false, message: 'Sloka not found in database.' });
    }

    const { syllabus, chapter, slokaNumber, title, sanskritText, transliteration, englishMeaning, questions, isActive } = req.body;

    if (syllabus) sloka.syllabus = syllabus.trim();
    if (chapter !== undefined) sloka.chapter = Number(chapter);
    if (slokaNumber !== undefined) sloka.slokaNumber = Number(slokaNumber);
    if (title) sloka.title = title.trim();
    if (sanskritText) sloka.sanskritText = sanskritText.trim();
    if (transliteration !== undefined) sloka.transliteration = transliteration.trim();
    if (englishMeaning) sloka.englishMeaning = englishMeaning.trim();
    if (Array.isArray(questions)) sloka.questions = questions;
    if (isActive !== undefined) sloka.isActive = Boolean(isActive);

    await sloka.save();
    return res.json({ success: true, message: 'Sloka updated successfully.', sloka });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /api/slokas/:id - Admin deletes a sloka
router.delete('/:id', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    if (!isDatabaseConnected()) {
      return res.status(503).json({ success: false, message: 'Persistent database is not connected.' });
    }

    const sloka = await Sloka.findByIdAndDelete(req.params.id);
    if (!sloka) {
      return res.status(404).json({ success: false, message: 'Sloka not found in database.' });
    }

    return res.json({ success: true, message: 'Sloka deleted successfully from database.' });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

export default router;

