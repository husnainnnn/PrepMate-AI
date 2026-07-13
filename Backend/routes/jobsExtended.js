const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Job = require('../models/Job');
const Application = require('../models/Application');
const Student = require('../models/Student');
const { createNotification } = require('../helpers/notifications');

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

// ─── GET /api/jobs/:id — get full job details ──────────────
router.get('/:id', async (req, res) => {
  try {
    const job = await Job.findById(req.params.id).lean();
    if (!job) return res.status(404).json({ error: 'Job not found' });
    if (job.isClosed) return res.status(404).json({ error: 'Job is no longer available' });
    res.json({ job });
  } catch (err) {
    console.error('GET /api/jobs/:id error:', err);
    res.status(500).json({ error: 'Failed to fetch job details' });
  }
});

// ─── GET /api/jobs — list all active jobs (for students) ───
router.get('/', async (req, res) => {
  try {
    const jobs = await Job.find({ isClosed: { $ne: true } })
      .sort({ createdAt: -1 })
      .select('-__v')
      .lean();
    res.json({ jobs });
  } catch (err) {
    console.error('GET /api/jobs error:', err);
    res.status(500).json({ error: 'Failed to fetch jobs' });
  }
});

// ─── POST /api/applications — apply to a job ──────────────
router.post('/apply', async (req, res) => {
  try {
    const tokenData = getUserFromToken(req);
    if (!tokenData || tokenData.role !== 'student') {
      return res.status(401).json({ error: 'Not authenticated as student.' });
    }

    const { jobId, companyName, jobTitle, location, fullName, email, phone,
            skills, education, experience, resumeUrl, coverLetter, linkedin, github, portfolio } = req.body;

    if (!jobId || !companyName || !jobTitle) {
      return res.status(400).json({ error: 'Job ID, company name, and job title are required.' });
    }

    // Verify job exists and is open
    const job = await Job.findById(jobId);
    if (!job) return res.status(404).json({ error: 'Job not found.' });
    if (job.isClosed) return res.status(400).json({ error: 'This job is no longer accepting applications.' });

    // Check for duplicate application
    const existing = await Application.findOne({ studentId: tokenData.id, jobId });
    if (existing) {
      return res.status(409).json({ error: 'You have already applied to this job.' });
    }

    const newApp = new Application({
      studentId: tokenData.id,
      jobId,
      companyName,
      jobTitle,
      location: location || '',
      fullName: fullName || '',
      email: email || '',
      phone: phone || '',
      skills: skills || [],
      education: education || '',
      experience: experience || '',
      resumeUrl: resumeUrl || '',
      coverLetter: coverLetter || '',
      linkedin: linkedin || '',
      github: github || '',
      portfolio: portfolio || '',
      appliedDate: new Date().toISOString().split('T')[0],
      isRejected: false,
      currentStage: 'applied',
    });

    await newApp.save();

    // Update student's applicationsCount
    await Student.findByIdAndUpdate(tokenData.id, { $inc: { 'stats.applicationsCount': 1 } });

    // ── Notify company about new applicant ──────────────
    try {
      const companyId = job.companyId?.toString();
      if (companyId) {
        const studentName = fullName || tokenData.fullName || 'A student';
        await createNotification(req, {
          userId: companyId,
          userRole: 'company',
          type: 'new_applicant',
          title: 'New Applicant',
          message: `${studentName} applied for ${jobTitle} at ${companyName}`,
          link: '/company/applicants',
          relatedId: newApp._id.toString(),
        });
      }
    } catch { /* non-critical */ }

    res.status(201).json({ application: newApp.toObject() });
  } catch (err) {
    console.error('POST /api/jobs/apply error:', err);
    res.status(500).json({ error: 'Failed to submit application.' });
  }
});

// ─── GET /api/applications — student's own applications ────
router.get('/my-applications', async (req, res) => {
  try {
    const tokenData = getUserFromToken(req);
    if (!tokenData || tokenData.role !== 'student') {
      return res.status(401).json({ error: 'Not authenticated as student.' });
    }
    const applications = await Application.find({ studentId: tokenData.id })
      .sort({ createdAt: -1 })
      .lean();
    res.json({ applications });
  } catch (err) {
    console.error('GET /api/jobs/my-applications error:', err);
    res.status(500).json({ error: 'Failed to fetch applications.' });
  }
});

// ─── GET /api/applicants/:jobId — company views applicants ─
router.get('/applicants/:jobId', async (req, res) => {
  try {
    const tokenData = getUserFromToken(req);
    if (!tokenData || tokenData.role !== 'company') {
      return res.status(401).json({ error: 'Not authenticated as company.' });
    }

    const job = await Job.findById(req.params.jobId);
    if (!job) return res.status(404).json({ error: 'Job not found.' });
    if (job.companyId.toString() !== tokenData.id) {
      return res.status(403).json({ error: 'Not authorized to view applicants for this job.' });
    }

    const applicants = await Application.find({ jobId: req.params.jobId })
      .sort({ createdAt: -1 })
      .lean();

    res.json({ applicants });
  } catch (err) {
    console.error('GET /api/jobs/applicants/:jobId error:', err);
    res.status(500).json({ error: 'Failed to fetch applicants.' });
  }
});

module.exports = router;
