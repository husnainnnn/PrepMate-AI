const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Job = require('../models/Job');
const Student = require('../models/Student');

const JWT_SECRET = process.env.JWT_SECRET || '';

// ─── Gemini AI config (new key for Job Matches) ─────────
const GEMINI_AI_KEY = process.env.GEMINI_AI_KEY || '';
const GEMINI_MODEL = 'gemini-3.5-flash';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

async function askGemini(systemPrompt, userPrompt) {
  if (!GEMINI_AI_KEY || GEMINI_AI_KEY === 'your_gemini_api_key_here') {
    const err = new Error('GEMINI_AI_KEY not configured');
    err.isFallback = true;
    throw err;
  }
  const res = await fetch(GEMINI_URL, {
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

function parseGeminiJson(raw) {
  let cleaned = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
  try { return JSON.parse(cleaned); }
  catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) try { return JSON.parse(match[0]); } catch {}
    return null;
  }
}

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

// ── Field/domain matching (for fallback) ────────────────────
// Checks if the student's target field is related to the job title/description
function computeFieldMatch(studentField, job) {
  if (!studentField || !job) return 0;
  const studentLower = studentField.toLowerCase().trim();
  const studentWords = studentLower.split(/[\s,\/-]+/).filter(w => w.length > 1);
  if (studentWords.length === 0) return 0;

  // Build search text from job title + category + description (first 300 chars)
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

// ─── Helper: get user from token ──────────────────────────

function getUserFromToken(req) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return null;
  try {
    const token = auth.split(' ')[1];
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

// ─── Helper: generate profile hash for job matches ────────

function generateJobMatchHash(field, skills, experience) {
  const data = [(field || ''), (skills || []).sort().join(','), (experience || '')].join('|||');
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return 'jm_v1_' + Math.abs(hash).toString(36);
}

// ─── POST /api/jobs/match ──────────────────────────────────
// Send skills + optional filters, get back ranked job matches
// Results are cached — only regenerated when new jobs are posted
router.post('/match', async (req, res) => {
  try {
    const tokenData = getUserFromToken(req);
    const { skills, search, filters, profileData } = req.body;

    if (!skills || !Array.isArray(skills)) {
      return res.status(400).json({ error: 'Please provide a skills array' });
    }

    // ── Check cache (only for default view — no filters/search) ──
    const isDefaultView = !search && !filters && !(filters && Object.keys(filters).length > 0);
    
    if (isDefaultView && tokenData && tokenData.role === 'student') {
      const student = await Student.findById(tokenData.id).select('cachedJobMatches field skills experience').lean();
      if (student && student.cachedJobMatches) {
        const cached = student.cachedJobMatches;
        // Get current total job count
        const totalJobs = await Job.countDocuments({ isClosed: { $ne: true } });
        const profileHash = generateJobMatchHash(student.field, student.skills, student.experience);
        
        // If job count same + profile hash matches → return cached
        if (cached.jobCount === totalJobs && cached.profileHash === profileHash && cached.matches && cached.matches.length > 0) {
          return res.json({
            matches: cached.matches,
            aiPowered: cached.aiPowered || false,
            cached: true,
            generatedAt: cached.generatedAt,
          });
        }
      }
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

    // Get isVerified for each job's company
    const Company = require('../models/Company');
    const companyIds = [...new Set(jobs.filter(j => j.companyId).map(j => j.companyId.toString()))];
    const companiesMap = {};
    if (companyIds.length > 0) {
      const companies = await Company.find({ _id: { $in: companyIds } }).select('_id isVerified').lean();
      for (const c of companies) {
        companiesMap[c._id.toString()] = c.isVerified;
      }
    }

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

    // Try AI-based matching first, fall back to skill-based
    let useAi = false;
    let aiScores = {};

    if (jobs.length > 0) {
      try {
        const jobSummary = jobs.slice(0, 20).map((j, i) =>
          `Job ${i + 1}: "${j.jobTitle}" at "${j.companyName}". Skills: ${(j.requiredSkills || []).join(', ')}. Description: ${(j.description || '').slice(0, 200)}`
        ).join('\n');

        const systemPrompt = `You are an AI job matching expert. Score each job (0-100) using STRICT PRIORITY ORDER:

1️⃣ FIELD MATCH (most important — 60% of score)
CRITICAL: Check if the candidate's field/role is ACTUALLY related to the job's domain.
✅ Related: "Computer Science" → Software Engineer, Developer, Web Dev
✅ Related: "Frontend Developer" → Web Development, UI Engineering, React Dev
✅ Related: "Data Science" → Data Analysis, Machine Learning
❌ NOT related: "Marketing" → Software Engineering, "Healthcare" → Web Development
❌ NOT related: Job titled "Test" or "Demo" or vague names → no field matches at all
STRICT: A job with generic/vague title ("Test", "Demo", "Sample", etc.) gets field match = 0.
The job title and description must CLEARLY relate to the candidate's field. Don't assume or guess.

2️⃣ TECHNICAL SKILLS (important — 30% of score)
⚠️ CRITICAL: Score based on: what % of the JOB'S required skills does the candidate have?
If a job requires [React] and candidate knows React → that's 100% skills match, even if candidate has 20 other skills.
Do NOT compare candidate's total skills against the job's skills.
Only check if the job's required skills are fulfilled by the candidate.
Related skills count (e.g., "React"↔"Next.js", "Python"↔"Django", "JavaScript"↔"TypeScript", "Node.js"↔"Express")

3️⃣ SOFT SKILLS (minor — 10% of score, ONLY if field matches)
Communication, leadership, teamwork — only boost score if FIELD already matches.
DO NOT let soft skills alone push a score above 40 if field doesn't match.

SCORING:
- 80-100: Field clearly matches + job's required skills are mostly present
- 60-79: Field related + most of job's required skills are present
- 40-59: Field somewhat related + some of job's required skills present
- 20-39: Field different OR job title is vague/generic → max 39 even if skills match
- 0-19: Completely different field, none of job's required skills

Return ONLY valid JSON: { "scores": [ { "index": 0, "score": 85, "reason": "Web Developer field matches + has required skill (React)" }, ... ] }`;

        const userPrompt = `Candidate Profile:\nTarget Field/Role: ${profileData?.field || 'N/A'}\nTechnical Skills: ${skills.join(', ')}\nEducation: ${JSON.stringify(studentEducation)}\nExperience Level: ${profileData?.experience || 'N/A'}\n\nJobs:\n${jobSummary}\n\nScore each job using PRIORITY order: field match FIRST, then check if JOB'S REQUIRED skills are present in candidate's skills (not the other way around). Soft skills only minor boost after field matches.`;

        const raw = await askGemini(systemPrompt, userPrompt);
        const parsed = parseGeminiJson(raw);
        if (parsed && parsed.scores) {
          useAi = true;
          for (const s of parsed.scores) {
            if (jobs[s.index]) {
              aiScores[jobs[s.index]._id.toString()] = { score: Math.min(100, Math.max(0, s.score)), reason: s.reason || '' };
            }
          }
        }
      } catch (geminiErr) {
        /* Gemini unavailable (quota/key) — using local fallback scoring */
      }
    }

    const matches = jobs
      .map((job) => {
        const jobId = job._id.toString();
        let matchPercentage, isRecommended, matchedSkills, missingSkills;

        if (useAi && aiScores[jobId] !== undefined) {
          // AI-based scoring
          matchPercentage = aiScores[jobId].score;
          isRecommended = matchPercentage >= 50;
          // Still compute matched/missing for display
          matchedSkills = (job.requiredSkills || []).filter(rs => skillMatches(rs, normalizedSkills));
          missingSkills = (job.requiredSkills || []).filter(rs => !skillMatches(rs, normalizedSkills));
        } else {
          // Fallback: field + skill + degree matching (same priority as AI)
          const requiredSkills = job.requiredSkills || [];
          matchedSkills = requiredSkills.filter(rs => skillMatches(rs, normalizedSkills));
          missingSkills = requiredSkills.filter(rs => !skillMatches(rs, normalizedSkills));
          const skillMatchScore = requiredSkills.length > 0
            ? Math.round((matchedSkills.length / requiredSkills.length) * 100)
            : 0;
          const degreeMatch = degreeMatches(job.degree, studentEducation);
          // Field match: 0-100 based on keyword overlap with job title/description
          const fieldMatchRatio = computeFieldMatch(profileData?.field || '', job);
          const fieldScore = Math.round(fieldMatchRatio * 100);
          // Weighted scoring: 60% field + 30% skills + 10% degree
          matchPercentage = Math.round(
            fieldScore * 0.6 +
            skillMatchScore * 0.3 +
            (degreeMatch ? 10 : 0)
          );
          isRecommended = matchPercentage >= 50;
        }

        const location = [job.city, job.country].filter(Boolean).join(', ');

        const isCompanyVerified = companiesMap[job.companyId?.toString()] || false;

        return {
          id: job._id,
          companyName: job.companyName,
          isCompanyVerified,
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
          matchPercentage,
          matchedSkills,
          missingSkills,
          isRecommended,
        };
      })
      .sort((a, b) => b.matchPercentage - a.matchPercentage);

    // ── Save to cache (only for default view) ───────────
    if (isDefaultView && tokenData && tokenData.role === 'student') {
      const totalJobs = await Job.countDocuments({ isClosed: { $ne: true } });
      const student = await Student.findById(tokenData.id).select('field skills experience').lean();
      if (student) {
        const profileHash = generateJobMatchHash(student.field, student.skills, student.experience);
        await Student.findByIdAndUpdate(tokenData.id, {
          $set: {
            'cachedJobMatches.matches': matches,
            'cachedJobMatches.jobCount': totalJobs,
            'cachedJobMatches.profileHash': profileHash,
            'cachedJobMatches.generatedAt': new Date(),
            'cachedJobMatches.aiPowered': useAi,
          },
        });
      }
    }

    res.json({ matches, aiPowered: useAi });
  } catch (err) {
    console.error('POST /api/jobs/match error:', err);
    res.status(500).json({ error: 'Failed to compute job matches' });
  }
});

module.exports = router;
