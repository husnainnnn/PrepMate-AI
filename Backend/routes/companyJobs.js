const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Company = require('../models/Company');
const Job = require('../models/Job');

const JWT_SECRET = process.env.JWT_SECRET || '';
const { createNotification } = require('../helpers/notifications');

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

    // ── Job posting limit: 2/month for free, unlimited for pro ──
    const isPro = company.plan === 'pro';
    if (!isPro) {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      const monthlyJobsCount = await Job.countDocuments({
        companyId: company._id,
        createdAt: { $gte: startOfMonth },
      });
      if (monthlyJobsCount >= 2) {
        return res.status(403).json({
          error: 'Free plan allows only 2 job postings per month. Upgrade to Pro for unlimited postings.',
          code: 'LIMIT_REACHED',
        });
      }
    }

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

    // ── Notify matching students about new job ────────
    try {
      const Student = require('../models/Student');
      const jobSkills = (newJob.requiredSkills || []).map(s => s.toLowerCase());
      const jobField = (newJob.jobCategory || newJob.jobTitle || '').toLowerCase();

      // Find students whose field or skills match this job
      const fieldKeywords = jobField
        .split(/\s+/)
        .filter(w => w.length > 2)
        .map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
        .join('|');

      const matchingStudents = await Student.find({
        $or: [
          ...(fieldKeywords ? [{ field: { $regex: fieldKeywords, $options: 'i' } }] : []),
          { skills: { $in: jobSkills } },
        ],
      }).select('_id').lean();

      for (const student of matchingStudents) {
        await createNotification(req, {
          userId: student._id,
          userRole: 'student',
          type: 'new_job',
          title: 'New Job Posted',
          message: `${newJob.companyName} is hiring ${newJob.jobTitle}`,
          link: '/student/job-matches',
          relatedId: newJob._id.toString(),
        });
      }
    } catch { /* non-critical */ }

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

    const isPro = company.plan === 'pro';
    const MAX_VISIBLE = isPro ? Infinity : 5;

    // Get all company jobs
    const jobs = await Job.find({ companyId: company._id }).sort({ createdAt: -1 }).lean();

    // For each job, count applicants (excluding hiddenFromCompany ones)
    const jobData = [];
    for (const job of jobs) {
      const allApplicants = await Application.find({
        jobId: job._id,
        hiddenFromCompany: { $ne: true }
      }).sort({ createdAt: -1 }).lean();

      const totalCount = allApplicants.length;
      const visibleApplicants = isPro ? allApplicants : allApplicants.slice(0, MAX_VISIBLE);
      const hiddenCount = isPro ? 0 : Math.max(0, totalCount - MAX_VISIBLE);

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
        applicantCount: totalCount,
        applicants: visibleApplicants,
        hiddenCount,
        isPro,
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

      // ── Notify student ──────────────────────────────
      try {
        await createNotification(req, {
          userId: app.studentId,
          userRole: 'student',
          type: 'application_review',
          title: 'Application Under Review',
          message: `Your application for ${app.jobTitle} at ${app.companyName} is now being reviewed`,
          link: '/student/applications',
          relatedId: app._id.toString(),
        });
      } catch { /* non-critical */ }
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

    // ── Invalidate screening cache ───────────────────────
    screeningCache.delete(tokenData.id);

    // ── Notify student ──────────────────────────────────
    try {
      const io = req.app.get('io');
      if (io) {
        io.to(app.studentId.toString()).emit('application-shortlisted', {
          applicationId: app._id.toString(),
          jobTitle: app.jobTitle,
          companyName: app.companyName || job.companyName,
        });
      }
      await createNotification(req, {
        userId: app.studentId,
        userRole: 'student',
        type: 'application_shortlisted',
        title: 'Application Shortlisted 🎉',
        message: `You've been shortlisted for ${app.jobTitle} at ${app.companyName || job.companyName}`,
        link: '/student/applications',
        relatedId: app._id.toString(),
      });
    } catch { /* non-critical */ }

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

    // ── Invalidate screening cache ───────────────────────
    screeningCache.delete(tokenData.id);

    // ── Notify student ──────────────────────────────────
    try {
      await createNotification(req, {
        userId: app.studentId,
        userRole: 'student',
        type: 'application_rejected',
        title: 'Application Update',
        message: `Your application for ${app.jobTitle} at ${app.companyName} was not selected. Keep trying!`,
        link: '/student/applications',
        relatedId: app._id.toString(),
      });
    } catch { /* non-critical */ }

    res.json({ application: app.toObject() });
  } catch (err) {
    console.error('PATCH /api/company/applicants/:id/reject error:', err);
    res.status(500).json({ error: 'Failed to reject applicant.' });
  }
});

// ─── Gemini AI config (new key for AI Screening) ──────────
const GEMINI_AI_KEY = process.env.GEMINI_AI_KEY || '';
const GEMINI_MODEL_S = 'gemini-3.5-flash';
const GEMINI_URL_S = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL_S}:generateContent`;

async function askGeminiScreening(systemPrompt, userPrompt) {
  if (!GEMINI_AI_KEY || GEMINI_AI_KEY === 'your_gemini_api_key_here') {
    const err = new Error('GEMINI_AI_KEY not configured');
    err.isFallback = true;
    throw err;
  }
  const res = await fetch(GEMINI_URL_S, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': GEMINI_AI_KEY },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }],
      generationConfig: { temperature: 0.3, maxOutputTokens: 4096 },
    }),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    const err = new Error(`Gemini API error (${res.status}): ${errText.slice(0, 200)}`);
    err.isFallback = true;
    throw err;
  }
  const data = await res.json();
  return data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

function parseGeminiScreeningJson(raw) {
  let cleaned = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
  try { return JSON.parse(cleaned); }
  catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) try { return JSON.parse(match[0]); } catch {}
    return null;
  }
}

// ─── GET /api/company/screening ────────────────────────────
// Get all applicants with AI match scores, filtered (≥50), sorted by score desc
// Uses in-memory cache per company to avoid repeated slow Gemini API calls
router.get('/screening', async (req, res) => {
  try {
    const tokenData = getUserFromToken(req);
    if (!tokenData || tokenData.role !== 'company') {
      return res.status(401).json({ error: 'Not authenticated as company.' });
    }

    // ── Check cache first ─────────────────────────────────
    const cached = getScreeningCache(tokenData.id);
    if (cached) {
      return res.json({ applicants: cached.applicants, aiPowered: cached.aiPowered, cached: true });
    }

    const company = await Company.findById(tokenData.id);
    if (!company) return res.status(404).json({ error: 'Company not found.' });

    // Get all company jobs with their requiredSkills
    const jobs = await Job.find({ companyId: company._id }).select('_id jobTitle companyName requiredSkills description').lean();
    const jobMap = {};
    jobs.forEach(j => { jobMap[j._id.toString()] = j; });
    const jobIds = jobs.map(j => j._id);

    // Get all applications (excluding hidden)
    const applications = await Application.find({
      jobId: { $in: jobIds },
      hiddenFromCompany: { $ne: true },
    }).sort({ createdAt: -1 }).lean();

    // If no applications, return empty immediately
    if (applications.length === 0) {
      return res.json({ applicants: [], aiPowered: false });
    }

    // ── Smart skill matching (handles spelling variants) ────
    function skillMatches(requiredSkill, applicantSkills) {
      const normalize = s => s.toLowerCase().trim().replace(/[.\-_\s#]/g, '');
      const ns = normalize(requiredSkill);
      return applicantSkills.some(as => {
        const na = normalize(as);
        return na === ns || na.includes(ns);
      });
    }

    // ── Field matching (for screening fallback) ─────────────
    // Checks if applicant's target field relates to job title/description
    function computeFieldMatch(studentField, job) {
      if (!studentField || !job) return 0;
      const studentLower = studentField.toLowerCase().trim();
      const studentWords = studentLower.split(/[\s,\/-]+/).filter(w => w.length > 1);
      if (studentWords.length === 0) return 0;

      const title = (job.jobTitle || '').toLowerCase();
      const category = (job.jobCategory || '').toLowerCase();
      const desc = (job.description || '').toLowerCase().slice(0, 300);
      const targets = [title, category, desc].filter(Boolean).join(' ');
      if (!targets) return 0;

      let matchCount = 0;
      for (const word of studentWords) {
        if (targets.includes(word)) {
          matchCount++;
        }
      }
      return matchCount / studentWords.length;
    }

    // Fetch all students' fields for domain matching
    const studentIds = [...new Set(applications.map(a => a.studentId?.toString()).filter(Boolean))];
    const students = await Student.find({ _id: { $in: studentIds } }).select('_id field').lean();
    const studentFieldMap = {};
    students.forEach(s => { studentFieldMap[s._id.toString()] = s.field || ''; });

    // Try AI-based screening, fall back to skill matching
    let useAi = false;
    let aiScores = {};

    try {
      const appSummaries = applications.slice(0, 30).map((app, i) => {
        const job = jobMap[app.jobId?.toString()];
        return `Applicant ${i + 1} for "${job?.jobTitle || 'Job'}": Skills: ${(app.skills || []).join(', ')}. Education: ${app.education || 'N/A'}. Experience: ${app.experience || 'N/A'}. Cover Letter: ${(app.coverLetter || '').slice(0, 150)}.`;
      }).join('\n');

      const jobDescriptions = Object.values(jobMap).map((j, i) =>
        `Job ${i + 1}: "${j.jobTitle}". Required Skills: ${(j.requiredSkills || []).join(', ')}. Description: ${(j.description || '').slice(0, 200)}`
      ).join('\n');

      const systemPrompt = `You are a strict HR screening specialist. Score each applicant (0-100) using STRICT PRIORITY ORDER:

1️⃣ FIELD/DOMAIN MATCH (most important — 60% of score)
CRITICAL: Check if the applicant's education/background is ACTUALLY related to the job's domain.
✅ Related: "Computer Science" → Software Engineer, Web Developer, Programmer
✅ Related: "Data Science" → Data Analyst, ML Engineer
❌ NOT related: "Healthcare degree" → Software Developer
❌ NOT related: "Job title 'Test' or 'Demo' or generic names" → any field (vague titles get 0 field match)
STRICT: A job with a generic/vague title (like "Test", "Demo", "Sample", "New Job") should ALWAYS get field match score = 0.
The job title and description must CLEARLY relate to the applicant's field. Don't assume.

2️⃣ TECHNICAL SKILLS (important — 30% of score)
Check overlap between applicant's skills and job's required skills.
Related skills count (e.g., "React"↔"Next.js", "Python"↔"Django", "JavaScript"↔"TypeScript")

3️⃣ SOFT SKILLS + EXPERIENCE (minor — 10% of score, ONLY if field/skills match)
Communication, leadership, teamwork, cover letter — only boost score if FIELD already matches.
DO NOT let soft skills or a good cover letter push a score above 40 for unrelated fields.

SCORING:
- 80-100: Field clearly matches + technical skills align well + good experience
- 60-79: Field related + most technical skills present
- 40-59: Field somewhat related + some transferable skills
- 20-39: Field different but some relevant technical skills exist
- 0-19: Completely different field OR vague/generic job title — no relevant background

Return ONLY valid JSON: { "scores": [ { "index": 0, "score": 75, "reason": "BSCS degree + React/Node skills match job requirements" }, ... ] }`;

      const userPrompt = `Job Details:\n${jobDescriptions}\n\nApplicants:\n${appSummaries}\n\nScore each applicant using PRIORITY order: field/domain match FIRST, then technical skills, then soft skills (only as minor boost after field+skills match).`;

      const raw = await askGeminiScreening(systemPrompt, userPrompt);
      const parsed = parseGeminiScreeningJson(raw);
      if (parsed && parsed.scores) {
        useAi = true;
        for (const s of parsed.scores) {
          if (applications[s.index]) {
            aiScores[applications[s.index]._id.toString()] = Math.min(100, Math.max(0, s.score));
          }
        }
      }
    } catch (geminiErr) {
        /* Gemini unavailable (quota/key) — using local fallback scoring */
      }

    // Compute match score for each application
    const scored = applications.map(app => {
      const job = jobMap[app.jobId?.toString()];
      const requiredSkills = job?.requiredSkills || [];
      const applicantSkills = app.skills || [];

      let matchScore;
      let matchedSkills;

      if (useAi && aiScores[app._id.toString()] !== undefined) {
        matchScore = aiScores[app._id.toString()];
        matchedSkills = requiredSkills.filter(rs => skillMatches(rs, applicantSkills));        } else {
        // Fallback: field + skill matching (same priority as AI)
        if (requiredSkills.length > 0) {
          matchedSkills = requiredSkills.filter(rs => skillMatches(rs, applicantSkills));
          const skillMatchScore = Math.round((matchedSkills.length / requiredSkills.length) * 100);
          // Get actual student field from DB
          const studentField = studentFieldMap[app.studentId?.toString()] || '';
          const fieldMatchRatio = computeFieldMatch(studentField, job);
          const fieldScore = Math.round(fieldMatchRatio * 100);
          // Weighted: 60% field + 30% skills + 10% cover letter
          matchScore = Math.round(
            fieldScore * 0.6 +
            skillMatchScore * 0.3 +
            ((app.coverLetter || '').trim().length > 20 ? 10 : 0)
          );
        } else {
          matchedSkills = [];
          matchScore = 0;
        }
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

    const result = { applicants: filtered, aiPowered: useAi };

    // ── Cache the result ──────────────────────────────────
    setScreeningCache(tokenData.id, result);

    res.json(result);
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

    // ── Invalidate screening cache ───────────────────────
    screeningCache.delete(tokenData.id);

    // ── Notify student ──────────────────────────────────
    try {
      await createNotification(req, {
        userId: app.studentId,
        userRole: 'student',
        type: 'application_hired',
        title: 'Congratulations! 🎉',
        message: `You've been hired for ${app.jobTitle} at ${app.companyName}!`,
        link: '/student/applications',
        relatedId: app._id.toString(),
      });
    } catch { /* non-critical */ }

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

    // ── Invalidate screening cache ───────────────────────
    screeningCache.delete(tokenData.id);

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

// ════════════════════════════════════════════════════════════
// ─── AI Screening Cache (in-memory, per company, 5 min TTL) ─
// ════════════════════════════════════════════════════════════

const screeningCache = new Map();
const SCREENING_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getScreeningCache(companyId) {
  const entry = screeningCache.get(companyId);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > SCREENING_CACHE_TTL) {
    screeningCache.delete(companyId);
    return null;
  }
  return entry.data;
}

function setScreeningCache(companyId, data) {
  screeningCache.set(companyId, { data, timestamp: Date.now() });
  // Limit cache size — delete oldest entries if > 100
  if (screeningCache.size > 100) {
    const oldest = [...screeningCache.entries()]
      .sort((a, b) => a[1].timestamp - b[1].timestamp)[0];
    if (oldest) screeningCache.delete(oldest[0]);
  }
}

// Clean up stale entries every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of screeningCache) {
    if (now - entry.timestamp > SCREENING_CACHE_TTL) {
      screeningCache.delete(key);
    }
  }
}, 10 * 60 * 1000);

module.exports = router;
