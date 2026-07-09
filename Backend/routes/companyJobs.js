const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Company = require('../models/Company');
const Job = require('../models/Job');

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

// ─── GET /api/company/jobs ──────────────────────────────────
// List all jobs posted by the logged-in company (includes closed)
router.get('/jobs', async (req, res) => {
  try {
    const tokenData = getUserFromToken(req);
    if (!tokenData || tokenData.role !== 'company') {
      return res.status(401).json({ error: 'Not authenticated as company.' });
    }

    const company = await Company.findById(tokenData.id);
    if (!company) return res.status(404).json({ error: 'Company not found.' });

    const jobs = await Job.find({ companyId: company._id })
      .sort({ createdAt: -1 })
      .lean();

    res.json({ jobs });
  } catch (err) {
    console.error('GET /api/company/jobs error:', err);
    res.status(500).json({ error: 'Failed to fetch jobs.' });
  }
});

// ─── POST /api/company/jobs ─────────────────────────────────
// Create a new job posting
router.post('/jobs', async (req, res) => {
  try {
    const tokenData = getUserFromToken(req);
    if (!tokenData || tokenData.role !== 'company') {
      return res.status(401).json({ error: 'Not authenticated as company.' });
    }

    const company = await Company.findById(tokenData.id);
    if (!company) return res.status(404).json({ error: 'Company not found.' });

    const {
      jobTitle, jobCategory, employmentType, workplace,
      country, city, officeAddress,
      description, responsibilities, requirements,
      requiredSkills, preferredSkills,
      degree, minCgpa, experienceLevel,
      salaryType, salaryMin, salaryMax,
      applicationDeadline, openPositions, hiringProcess,
    } = req.body;

    if (!jobTitle || !jobTitle.trim()) {
      return res.status(400).json({ error: 'Job title is required.' });
    }

    const newJob = new Job({
      companyId: company._id,
      companyName: company.companyName,
      jobTitle: jobTitle.trim(),
      jobCategory: jobCategory || '',
      employmentType: employmentType || 'full-time',
      workplace: workplace || 'remote',
      country: country || '',
      city: city || '',
      officeAddress: officeAddress || '',
      description: description || '',
      responsibilities: responsibilities || '',
      requirements: requirements || '',
      requiredSkills: requiredSkills || [],
      preferredSkills: preferredSkills || [],
      degree: degree || 'any',
      minCgpa: typeof minCgpa === 'number' ? minCgpa : 0,
      experienceLevel: experienceLevel || 'fresh',
      salaryType: salaryType || 'fixed',
      salaryMin: typeof salaryMin === 'number' ? salaryMin : 0,
      salaryMax: typeof salaryMax === 'number' ? salaryMax : 0,
      applicationDeadline: applicationDeadline || null,
      openPositions: typeof openPositions === 'number' ? openPositions : 1,
      hiringProcess: hiringProcess || [],
      isClosed: false,
    });

    await newJob.save();
    res.status(201).json({ job: newJob.toObject() });
  } catch (err) {
    console.error('POST /api/company/jobs error:', err);
    res.status(500).json({ error: 'Failed to create job posting.' });
  }
});

// ─── PUT /api/company/jobs/:id ──────────────────────────────
// Update an existing job posting
router.put('/jobs/:id', async (req, res) => {
  try {
    const tokenData = getUserFromToken(req);
    if (!tokenData || tokenData.role !== 'company') {
      return res.status(401).json({ error: 'Not authenticated as company.' });
    }

    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ error: 'Job not found.' });
    if (job.companyId.toString() !== tokenData.id) {
      return res.status(403).json({ error: 'Not authorized to update this job.' });
    }

    const allowedFields = [
      'jobTitle', 'jobCategory', 'employmentType', 'workplace',
      'country', 'city', 'officeAddress',
      'description', 'responsibilities', 'requirements',
      'requiredSkills', 'preferredSkills',
      'degree', 'minCgpa', 'experienceLevel',
      'salaryType', 'salaryMin', 'salaryMax',
      'applicationDeadline', 'openPositions', 'hiringProcess',
    ];

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        job[field] = req.body[field];
      }
    }

    // If job was closed and is being updated, re-open it
    if (job.isClosed) {
      job.isClosed = false;
      job.closedAt = null;
    }

    await job.save();

    res.json({ job: job.toObject() });
  } catch (err) {
    console.error('PUT /api/company/jobs/:id error:', err);
    res.status(500).json({ error: 'Failed to update job.' });
  }
});

// ─── PATCH /api/company/jobs/:id/close ─────────────────────
// Close a job posting (hidden from students, but kept in DB)
router.patch('/jobs/:id/close', async (req, res) => {
  try {
    const tokenData = getUserFromToken(req);
    if (!tokenData || tokenData.role !== 'company') {
      return res.status(401).json({ error: 'Not authenticated as company.' });
    }

    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ error: 'Job not found.' });
    if (job.companyId.toString() !== tokenData.id) {
      return res.status(403).json({ error: 'Not authorized to close this job.' });
    }

    job.isClosed = true;
    job.closedAt = new Date();
    await job.save();

    res.json({ job: job.toObject() });
  } catch (err) {
    console.error('PATCH /api/company/jobs/:id/close error:', err);
    res.status(500).json({ error: 'Failed to close job.' });
  }
});

// ─── PATCH /api/company/jobs/:id/reopen ────────────────────
// Reopen a closed job
router.patch('/jobs/:id/reopen', async (req, res) => {
  try {
    const tokenData = getUserFromToken(req);
    if (!tokenData || tokenData.role !== 'company') {
      return res.status(401).json({ error: 'Not authenticated as company.' });
    }

    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ error: 'Job not found.' });
    if (job.companyId.toString() !== tokenData.id) {
      return res.status(403).json({ error: 'Not authorized to reopen this job.' });
    }

    job.isClosed = false;
    job.closedAt = null;
    await job.save();

    res.json({ job: job.toObject() });
  } catch (err) {
    console.error('PATCH /api/company/jobs/:id/reopen error:', err);
    res.status(500).json({ error: 'Failed to reopen job.' });
  }
});

// ─── DELETE /api/company/jobs/:id ───────────────────────────
// Permanently delete a job from the database
router.delete('/jobs/:id', async (req, res) => {
  try {
    const tokenData = getUserFromToken(req);
    if (!tokenData || tokenData.role !== 'company') {
      return res.status(401).json({ error: 'Not authenticated as company.' });
    }

    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ error: 'Job not found.' });
    if (job.companyId.toString() !== tokenData.id) {
      return res.status(403).json({ error: 'Not authorized to delete this job.' });
    }

    await Job.findByIdAndDelete(req.params.id);

    res.json({ success: true, message: 'Job deleted permanently.' });
  } catch (err) {
    console.error('DELETE /api/company/jobs/:id error:', err);
    res.status(500).json({ error: 'Failed to delete job.' });
  }
});

// ════════════════════════════════════════════════════════════
// ─── Applicant Management Routes ───────────────────────────
// ════════════════════════════════════════════════════════════

const Application = require('../models/Application');
const Student = require('../models/Student');

// ─── GET /api/company/applicants/overview ──────────────────
// Get all jobs with applicant counts, sorted by most applicants first
router.get('/applicants/overview', async (req, res) => {
  try {
    const tokenData = getUserFromToken(req);
    if (!tokenData || tokenData.role !== 'company') {
      return res.status(401).json({ error: 'Not authenticated as company.' });
    }

    const company = await Company.findById(tokenData.id);
    if (!company) return res.status(404).json({ error: 'Company not found.' });

    // Get all company jobs
    const jobs = await Job.find({ companyId: company._id }).sort({ createdAt: -1 }).lean();

    // For each job, count applicants (excluding hiddenFromCompany ones)
    const jobData = [];
    for (const job of jobs) {
      const applicants = await Application.find({
        jobId: job._id,
        hiddenFromCompany: { $ne: true }
      }).sort({ createdAt: -1 }).lean();

      jobData.push({
        job: {
          _id: job._id,
          jobTitle: job.jobTitle,
          companyName: job.companyName,
          employmentType: job.employmentType,
          country: job.country,
          city: job.city,
          isClosed: job.isClosed,
          createdAt: job.createdAt,
        },
        applicantCount: applicants.length,
        applicants: applicants,
      });
    }

    // Sort by applicant count descending
    jobData.sort((a, b) => b.applicantCount - a.applicantCount);

    res.json({ jobs: jobData });
  } catch (err) {
    console.error('GET /api/company/applicants/overview error:', err);
    res.status(500).json({ error: 'Failed to fetch applicants overview.' });
  }
});

// ─── PATCH /api/company/applicants/:id/review ──────────────
// Mark applicant as under review (auto on profile view)
router.patch('/applicants/:id/review', async (req, res) => {
  try {
    const tokenData = getUserFromToken(req);
    if (!tokenData || tokenData.role !== 'company') {
      return res.status(401).json({ error: 'Not authenticated as company.' });
    }

    const app = await Application.findById(req.params.id);
    if (!app) return res.status(404).json({ error: 'Application not found.' });

    // Verify this application belongs to this company
    const job = await Job.findById(app.jobId);
    if (!job || job.companyId.toString() !== tokenData.id) {
      return res.status(403).json({ error: 'Not authorized.' });
    }

    // Only update if currently 'applied'
    if (app.currentStage === 'applied') {
      app.currentStage = 'under_review';
      await app.save();
    }

    res.json({ application: app.toObject() });
  } catch (err) {
    console.error('PATCH /api/company/applicants/:id/review error:', err);
    res.status(500).json({ error: 'Failed to update application.' });
  }
});

// ─── PATCH /api/company/applicants/:id/shortlist ───────────
router.patch('/applicants/:id/shortlist', async (req, res) => {
  try {
    const tokenData = getUserFromToken(req);
    if (!tokenData || tokenData.role !== 'company') {
      return res.status(401).json({ error: 'Not authenticated as company.' });
    }

    const app = await Application.findById(req.params.id);
    if (!app) return res.status(404).json({ error: 'Application not found.' });

    const job = await Job.findById(app.jobId);
    if (!job || job.companyId.toString() !== tokenData.id) {
      return res.status(403).json({ error: 'Not authorized.' });
    }

    app.currentStage = 'shortlisted';
    app.isRejected = false;
    await app.save();

    res.json({ application: app.toObject() });
  } catch (err) {
    console.error('PATCH /api/company/applicants/:id/shortlist error:', err);
    res.status(500).json({ error: 'Failed to shortlist applicant.' });
  }
});

// ─── PATCH /api/company/applicants/:id/reject ──────────────
router.patch('/applicants/:id/reject', async (req, res) => {
  try {
    const tokenData = getUserFromToken(req);
    if (!tokenData || tokenData.role !== 'company') {
      return res.status(401).json({ error: 'Not authenticated as company.' });
    }

    const app = await Application.findById(req.params.id);
    if (!app) return res.status(404).json({ error: 'Application not found.' });

    const job = await Job.findById(app.jobId);
    if (!job || job.companyId.toString() !== tokenData.id) {
      return res.status(403).json({ error: 'Not authorized.' });
    }

    app.currentStage = 'rejected';
    app.isRejected = true;
    await app.save();

    res.json({ application: app.toObject() });
  } catch (err) {
    console.error('PATCH /api/company/applicants/:id/reject error:', err);
    res.status(500).json({ error: 'Failed to reject applicant.' });
  }
});

// ─── GET /api/company/screening ────────────────────────────
// Get all applicants with AI match scores, filtered (≥50), sorted by score desc
router.get('/screening', async (req, res) => {
  try {
    const tokenData = getUserFromToken(req);
    if (!tokenData || tokenData.role !== 'company') {
      return res.status(401).json({ error: 'Not authenticated as company.' });
    }

    const company = await Company.findById(tokenData.id);
    if (!company) return res.status(404).json({ error: 'Company not found.' });

    // Get all company jobs with their requiredSkills
    const jobs = await Job.find({ companyId: company._id }).select('_id jobTitle companyName requiredSkills').lean();
    const jobMap = {};
    jobs.forEach(j => { jobMap[j._id.toString()] = j; });
    const jobIds = jobs.map(j => j._id);

    // Get all applications (excluding hidden)
    const applications = await Application.find({
      jobId: { $in: jobIds },
      hiddenFromCompany: { $ne: true },
    }).sort({ createdAt: -1 }).lean();

    // ── Smart skill matching (handles spelling variants) ────
    function skillMatches(requiredSkill, applicantSkills) {
      const normalize = s => s.toLowerCase().trim().replace(/[.\-_\s#]/g, '');
      const ns = normalize(requiredSkill);
      return applicantSkills.some(as => {
        const na = normalize(as);
        return na === ns || na.includes(ns);
      });
    }

    // Compute match score for each application
    const scored = applications.map(app => {
      const job = jobMap[app.jobId?.toString()];
      const requiredSkills = job?.requiredSkills || [];
      const applicantSkills = app.skills || [];

      let matchScore = 0;
      let matchedSkills = [];

      if (requiredSkills.length > 0) {
        matchedSkills = requiredSkills.filter(rs => skillMatches(rs, applicantSkills));
        matchScore = Math.round((matchedSkills.length / requiredSkills.length) * 100);
      }

      return {
        ...app,
        matchScore,
        matchedSkills,
        requiredSkills: job?.requiredSkills || [],
        jobTitle: job?.jobTitle || app.jobTitle,
        companyName: job?.companyName || app.companyName,
      };
    });

    // Filter by score >= 50 and sort descending
    const filtered = scored.filter(a => a.matchScore >= 50).sort((a, b) => b.matchScore - a.matchScore);

    res.json({ applicants: filtered });
  } catch (err) {
    console.error('GET /api/company/screening error:', err);
    res.status(500).json({ error: 'Failed to fetch screening results.' });
  }
});

// ─── GET /api/company/shortlisted ──────────────────────────
// Get all shortlisted applicants across all company jobs
router.get('/shortlisted', async (req, res) => {
  try {
    const tokenData = getUserFromToken(req);
    if (!tokenData || tokenData.role !== 'company') {
      return res.status(401).json({ error: 'Not authenticated as company.' });
    }

    const company = await Company.findById(tokenData.id);
    if (!company) return res.status(404).json({ error: 'Company not found.' });

    // Find all company jobs
    const jobs = await Job.find({ companyId: company._id }).select('_id jobTitle').lean();
    const jobIds = jobs.map(j => j._id);

    // Get shortlisted applicants for those jobs
    const applicants = await Application.find({
      jobId: { $in: jobIds },
      currentStage: 'shortlisted',
      hiddenFromCompany: { $ne: true },
    }).sort({ updatedAt: -1 }).lean();

    // Attach job title to each applicant
    const jobMap = {};
    jobs.forEach(j => { jobMap[j._id.toString()] = j.jobTitle; });
    applicants.forEach(a => {
      a.jobTitle = jobMap[a.jobId?.toString()] || a.jobTitle || 'Unknown';
    });

    res.json({ applicants });
  } catch (err) {
    console.error('GET /api/company/shortlisted error:', err);
    res.status(500).json({ error: 'Failed to fetch shortlisted applicants.' });
  }
});

// ─── PATCH /api/company/applicants/:id/hire ────────────────
// Mark applicant as hired
router.patch('/applicants/:id/hire', async (req, res) => {
  try {
    const tokenData = getUserFromToken(req);
    if (!tokenData || tokenData.role !== 'company') {
      return res.status(401).json({ error: 'Not authenticated as company.' });
    }

    const app = await Application.findById(req.params.id);
    if (!app) return res.status(404).json({ error: 'Application not found.' });

    const job = await Job.findById(app.jobId);
    if (!job || job.companyId.toString() !== tokenData.id) {
      return res.status(403).json({ error: 'Not authorized.' });
    }

    app.currentStage = 'hired';
    app.isRejected = false;
    await app.save();

    res.json({ application: app.toObject() });
  } catch (err) {
    console.error('PATCH /api/company/applicants/:id/hire error:', err);
    res.status(500).json({ error: 'Failed to hire applicant.' });
  }
});

// ─── DELETE /api/company/applicants/:id ─────────────────────
// Soft delete — hides from company but student still sees it
router.delete('/applicants/:id', async (req, res) => {
  try {
    const tokenData = getUserFromToken(req);
    if (!tokenData || tokenData.role !== 'company') {
      return res.status(401).json({ error: 'Not authenticated as company.' });
    }

    const app = await Application.findById(req.params.id);
    if (!app) return res.status(404).json({ error: 'Application not found.' });

    const job = await Job.findById(app.jobId);
    if (!job || job.companyId.toString() !== tokenData.id) {
      return res.status(403).json({ error: 'Not authorized.' });
    }

    app.hiddenFromCompany = true;
    await app.save();

    res.json({ success: true, message: 'Application hidden from company view.' });
  } catch (err) {
    console.error('DELETE /api/company/applicants/:id error:', err);
    res.status(500).json({ error: 'Failed to hide application.' });
  }
});

// ─── DELETE /api/applications/:id ───────────────────────────
// Hard delete — student removes application from database entirely
router.delete('/application/:id', async (req, res) => {
  try {
    const tokenData = getUserFromToken(req);
    if (!tokenData || tokenData.role !== 'student') {
      return res.status(401).json({ error: 'Not authenticated as student.' });
    }

    const app = await Application.findById(req.params.id);
    if (!app) return res.status(404).json({ error: 'Application not found.' });
    if (app.studentId.toString() !== tokenData.id) {
      return res.status(403).json({ error: 'Not authorized to delete this application.' });
    }

    await Application.findByIdAndDelete(req.params.id);

    res.json({ success: true, message: 'Application permanently deleted.' });
  } catch (err) {
    console.error('DELETE /api/applications/:id error:', err);
    res.status(500).json({ error: 'Failed to delete application.' });
  }
});

module.exports = router;
