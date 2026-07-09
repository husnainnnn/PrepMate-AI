const express = require('express');
const router = express.Router();
const path = require('path');
const jwt = require('jsonwebtoken');
const Resume = require('../models/Resume');

const JWT_SECRET = process.env.JWT_SECRET || 'prepmate-ai-jwt-secret-2026';

function getUserFromToken(req) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return null;
  try {
    return jwt.verify(auth.split(' ')[1], JWT_SECRET);
  } catch {
    return null;
  }
}

// GET /api/resume/latest — get the logged-in user's latest saved resume
router.get('/latest', async (req, res) => {
  try {
    const tokenData = getUserFromToken(req);
    if (!tokenData || tokenData.role !== 'student') {
      return res.status(401).json({ error: 'Not authenticated as student.' });
    }

    const resume = await Resume.findOne({ studentId: tokenData.id }).sort({ updatedAt: -1 }).lean();
    if (!resume) {
      return res.status(404).json({ error: 'No saved resume found' });
    }
    res.json(resume);
  } catch (err) {
    console.error('GET /api/resume/latest error:', err);
    res.status(500).json({ error: 'Failed to fetch resume' });
  }
});

// GET /api/resume/:id — load a specific saved resume
router.get('/:id', async (req, res) => {
  try {
    const tokenData = getUserFromToken(req);
    if (!tokenData || tokenData.role !== 'student') {
      return res.status(401).json({ error: 'Not authenticated as student.' });
    }

    const resume = await Resume.findOne({ _id: req.params.id, studentId: tokenData.id }).lean();
    if (!resume) {
      return res.status(404).json({ error: 'Resume not found' });
    }
    res.json(resume);
  } catch (err) {
    console.error('GET /api/resume/:id error:', err);
    res.status(500).json({ error: 'Failed to fetch resume' });
  }
});

// POST /api/resume — save or update a resume draft
router.post('/', async (req, res) => {
  try {
    const tokenData = getUserFromToken(req);
    if (!tokenData || tokenData.role !== 'student') {
      return res.status(401).json({ error: 'Not authenticated as student.' });
    }

    const { personalInfo, skills, projects, experience, education, templateId, resumeFileUrl } = req.body;

    // Upsert: update existing or create new
    const resume = await Resume.findOneAndUpdate(
      { studentId: tokenData.id },
      {
        $set: {
          personalInfo: personalInfo || {},
          skills: skills || [],
          projects: projects || [],
          experience: experience || [],
          education: education || [],
          templateId: templateId || 'modern',
          resumeFileUrl: resumeFileUrl || '',
        },
      },
      { upsert: true, new: true }
    );

    res.status(201).json(resume.toObject());
  } catch (err) {
    console.error('POST /api/resume error:', err);
    res.status(500).json({ error: 'Failed to save resume' });
  }
});

const multer = require('multer');
const upload = multer({ dest: path.join(__dirname, '..', 'uploads') });

// POST /api/resume/parse — upload a resume file, extract skills
router.post('/parse', upload.single('resume'), async (req, res) => {
  try {
    const ext = req.file ? path.extname(req.file.originalname).toLowerCase() : '';
    const mockExtractedSkills = [
      'javascript', 'react', 'typescript', 'node.js', 'css', 'html', 'git'
    ];
    res.json({ skills: mockExtractedSkills, fileName: req.file?.originalname });
  } catch (err) {
    console.error('POST /api/resume/parse error:', err);
    res.status(500).json({ error: 'Failed to parse resume' });
  }
});

module.exports = router;
