const express = require('express');
const router = express.Router();
const Job = require('../models/Job');

// POST /api/jobs/match — send skills, get back ranked job matches
router.post('/match', async (req, res) => {
  try {
    const { skills } = req.body;

    if (!skills || !Array.isArray(skills) || skills.length === 0) {
      return res.status(400).json({ error: 'Please provide a non-empty skills array' });
    }

    const jobs = await Job.find({}).lean();
    const normalizedSkills = skills.map((s) => s.toLowerCase().trim());

    const matches = jobs
      .map((job) => {
        const requiredSkills = job.requiredSkills.map((s) => s.toLowerCase());
        const matched = requiredSkills.filter((reqSkill) => normalizedSkills.includes(reqSkill));
        const missing = requiredSkills.filter((reqSkill) => !normalizedSkills.includes(reqSkill));
        const matchPercentage = Math.round((matched.length / requiredSkills.length) * 100);
        return {
          id: job._id,
          companyName: job.companyName,
          jobTitle: job.jobTitle,
          location: job.location,
          matchPercentage,
          matchedSkills: matched,
          missingSkills: missing,
          applyUrl: job.applyUrl || '#',
        };
      })
      .filter((m) => m.matchPercentage > 0)
      .sort((a, b) => b.matchPercentage - a.matchPercentage);

    res.json({ matches });
  } catch (err) {
    console.error('POST /api/jobs/match error:', err);
    res.status(500).json({ error: 'Failed to compute job matches' });
  }
});

module.exports = router;
