const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Application = require('../models/Application');
const Job = require('../models/Job');

const JWT_SECRET = process.env.JWT_SECRET || '';

function getUserFromToken(req) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return null;
  try {
    return jwt.verify(auth.split(' ')[1], JWT_SECRET);
  } catch {
    return null;
  }
}

// GET /api/applications — list of the student's applications
router.get('/', async (req, res) => {
  try {
    const tokenData = getUserFromToken(req);
    if (!tokenData || tokenData.role !== 'student') {
      return res.status(401).json({ error: 'Not authenticated as student.' });
    }
    const applications = await Application.find({ studentId: tokenData.id }).sort({ createdAt: -1 }).lean();

    // Check which jobs still exist (single query instead of N queries)
    const jobIds = applications.map(a => a.jobId).filter(Boolean);
    const existingJobs = await Job.find({ _id: { $in: jobIds } }).select('_id').lean();
    const existingJobIds = new Set(existingJobs.map(j => j._id.toString()));
    for (const app of applications) {
      if (app.jobId && !existingJobIds.has(app.jobId.toString())) {
        app.jobDeleted = true;
      }
    }

    res.json({ applications });
  } catch (err) {
    console.error('GET /api/applications error:', err);
    res.status(500).json({ error: 'Failed to fetch applications' });
  }
});

// POST /api/applications — add a new application
router.post('/', async (req, res) => {
  try {
    const tokenData = getUserFromToken(req);
    if (!tokenData || tokenData.role !== 'student') {
      return res.status(401).json({ error: 'Not authenticated as student.' });
    }

    const { companyName, jobTitle, location } = req.body;
    if (!companyName || !jobTitle) {
      return res.status(400).json({ error: 'Company name and job title are required' });
    }

    const newApp = new Application({
      studentId: tokenData.id,
      companyName,
      jobTitle,
      location: location || '',
      appliedDate: new Date().toISOString().split('T')[0],
      isRejected: false,
      currentStage: 'applied',
    });
    await newApp.save();

    // Update student's applicationsCount
    const Student = require('../models/Student');
    await Student.findByIdAndUpdate(tokenData.id, { $inc: { 'stats.applicationsCount': 1 } });

    res.status(201).json(newApp.toObject());
  } catch (err) {
    console.error('POST /api/applications error:', err);
    res.status(500).json({ error: 'Failed to add application' });
  }
});

module.exports = router;
