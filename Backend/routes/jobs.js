const express = require('express');
const router = express.Router();
const Job = require('../models/Job');

// ── Smart skill matching (handles spelling variants) ──────
function skillMatches(requiredSkill, applicantSkills) {
  const normalize = s => s.toLowerCase().trim().replace(/[.\-\_\s#]/g, '');
  const ns = normalize(requiredSkill);
  return applicantSkills.some(as => {
    const na = normalize(as);
    return na === ns || na.includes(ns);
  });
}

// ── Degree matching ────────────────────────────────────────
function degreeMatches(jobDegree, studentEducation) {
  if (!jobDegree || jobDegree === 'any') return true;
  if (!studentEducation || studentEducation.length === 0) return false;
  const degrees = studentEducation.map(e => (e.degree || '').toLowerCase().trim());
  const jd = jobDegree.toLowerCase().trim();
  return degrees.some(d => d.includes(jd) || jd.includes(d));
}

// ─── POST /api/jobs/match ──────────────────────────────────
// Send skills + optional filters, get back ranked job matches
router.post('/match', async (req, res) => {
  try {
    const { skills, search, filters, profileData } = req.body;

    if (!skills || !Array.isArray(skills)) {
      return res.status(400).json({ error: 'Please provide a skills array' });
    }

    // Build MongoDB query
    const query = { isClosed: { $ne: true } };

    if (filters) {
      if (filters.employmentType && filters.employmentType.length > 0) {
        query.employmentType = { $in: filters.employmentType };
      }
      if (filters.experienceLevel && filters.experienceLevel.length > 0) {
        query.experienceLevel = { $in: filters.experienceLevel };
      }
      if (filters.country && filters.country.trim()) {
        query.country = { $regex: filters.country.trim(), $options: 'i' };
      }
      if (filters.salaryMin || filters.salaryMax) {
        const salaryQuery = [];
        if (filters.salaryMin) {
          salaryQuery.push({ salaryMax: { $gte: Number(filters.salaryMin) } });
        }
        if (filters.salaryMax) {
          salaryQuery.push({ salaryMin: { $lte: Number(filters.salaryMax) } });
        }
        if (salaryQuery.length > 0) {
          query.$and = salaryQuery;
        }
      }
      if (filters.postedDays) {
        const since = new Date();
        since.setDate(since.getDate() - Number(filters.postedDays));
        query.createdAt = { $gte: since };
      }
    }

    let jobs = await Job.find(query).sort({ createdAt: -1 }).lean();

    // Client-side search filter
    if (search && search.trim()) {
      const s = search.toLowerCase().trim();
      jobs = jobs.filter(job =>
        job.jobTitle?.toLowerCase().includes(s) ||
        job.companyName?.toLowerCase().includes(s) ||
        (job.requiredSkills || []).some(skill => skill.toLowerCase().includes(s))
      );
    }

    const normalizedSkills = skills.map((s) => s.toLowerCase().trim());
    const studentEducation = profileData?.education || [];

    const matches = jobs
      .map((job) => {
        const requiredSkills = job.requiredSkills || [];
        const matched = requiredSkills.filter(rs => skillMatches(rs, normalizedSkills));
        const missing = requiredSkills.filter(rs => !skillMatches(rs, normalizedSkills));
        const skillMatchScore = requiredSkills.length > 0
          ? Math.round((matched.length / requiredSkills.length) * 100)
          : 0;

        // Degree boost: +10 if degree matches
        const degreeMatch = degreeMatches(job.degree, studentEducation);
        const finalScore = degreeMatch ? Math.min(100, skillMatchScore + 10) : skillMatchScore;

        const location = [job.city, job.country].filter(Boolean).join(', ');

        return {
          id: job._id,
          companyName: job.companyName,
          jobTitle: job.jobTitle,
          location,
          employmentType: job.employmentType,
          workplace: job.workplace,
          experienceLevel: job.experienceLevel,
          salaryType: job.salaryType,
          salaryMin: job.salaryMin,
          salaryMax: job.salaryMax,
          country: job.country,
          city: job.city,
          createdAt: job.createdAt,
          matchPercentage: finalScore,
          matchedSkills: matched,
          missingSkills: missing,
          isRecommended: skillMatchScore > 0 || degreeMatch,
        };
      })
      .sort((a, b) => b.matchPercentage - a.matchPercentage);

    res.json({ matches });
  } catch (err) {
    console.error('POST /api/jobs/match error:', err);
    res.status(500).json({ error: 'Failed to compute job matches' });
  }
});

module.exports = router;
