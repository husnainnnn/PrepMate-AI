const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Student = require('../models/Student');
const Application = require('../models/Application');

const JWT_SECRET = process.env.JWT_SECRET || '';
const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
const GROQ_MODEL = 'llama-3.3-70b-versatile';
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

// ─── Helper: call Groq ─────────────────────────────────────

async function askGroq(systemPrompt, userPrompt) {
  if (!GROQ_API_KEY || GROQ_API_KEY === 'your-groq-api-key') {
    return {
      feedback: '⚠️ GROQ_API_KEY not configured. Please add your Groq API key in Backend/.env file.\n\nGet your key at: https://console.groq.com/keys',
      error: 'Missing API key',
    };
  }

  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 4096,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Groq API error (${res.status}): ${errText}`);
  }

  const data = await res.json();
  return data?.choices?.[0]?.message?.content || '';
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

// ─── Helper: generate profile hash (for cache invalidation) ──

function generateProfileHash(student) {
  const data = [
    student.field || '',
    (student.skills || []).join(','),
    student.experience || '',
    (student.education || []).map(e => `${e.degree}|${e.institute}|${e.startYear}|${e.endYear}`).join(','),
    student.bio || '',
    student.linkedin || '',
    student.github || '',
    student.portfolio || '',
    student.introduction || '',
  ].join('|||');
  // Simple hash
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return 'v2_' + Math.abs(hash).toString(36);
}

// ─── GET /api/feedback/profile ───────────────────────────
// Get cached feedback (fast — no API call if profile unchanged)

router.get('/profile', async (req, res) => {
  try {
    const tokenData = getUserFromToken(req);
    if (!tokenData || tokenData.role !== 'student') {
      return res.status(401).json({ error: 'Not authenticated as student.' });
    }

    const student = await Student.findById(tokenData.id).select('-password').lean();
    if (!student) return res.status(404).json({ error: 'Student not found.' });

    const profileHash = generateProfileHash(student);
    const cached = student.cachedFeedback;

    // Profile + apps for response
    const profileSummary = buildProfileSummary(student);
    const appSummary = await buildAppSummary(tokenData.id);

    // If cached feedback exists and profile hasn't changed, return it
    if (cached && cached.text && cached.profileHash === profileHash) {
      return res.json({
        profile: profileSummary,
        applications: appSummary,
        feedback: cached.text,
        cached: true,
        generatedAt: cached.generatedAt,
      });
    }

    // Otherwise return profile only (no feedback yet)
    res.json({
      profile: profileSummary,
      applications: appSummary,
      feedback: '',
      cached: false,
    });

  } catch (err) {
    console.error('GET /api/feedback/profile error:', err);
    res.status(500).json({ error: 'Failed to fetch feedback.' });
  }
});

// ─── POST /api/feedback/profile ──────────────────────────
// Generate NEW feedback (always calls Groq) or force-regenerate

router.post('/profile', async (req, res) => {
  try {
    const tokenData = getUserFromToken(req);
    if (!tokenData || tokenData.role !== 'student') {
      return res.status(401).json({ error: 'Not authenticated as student.' });
    }

    const student = await Student.findById(tokenData.id).select('-password').lean();
    if (!student) return res.status(404).json({ error: 'Student not found.' });

    const applications = await Application.find({ studentId: tokenData.id })
      .select('jobTitle companyName currentStage isRejected appliedDate')
      .sort({ appliedDate: -1 })
      .lean();

    const profileSummary = buildProfileSummary(student);
    const appSummary = applications.length > 0
      ? applications.map(a => ({
          job: a.jobTitle,
          company: a.companyName,
          stage: a.currentStage,
          rejected: a.isRejected,
          applied: a.appliedDate,
        }))
      : ['No applications yet'];

    const systemPrompt = `You are a strict, honest career coach and hiring expert. Your job is to give brutally honest, actionable feedback to students on their interview preparation profile.

Analyze the student's profile AND their application history, then give feedback in the following structure:

## Profile Strength Assessment
- Overall rating out of 10
- What's working well (2-3 points)
- What needs improvement (3-5 specific, actionable points)

## Skills Analysis
- Are their skills relevant to their target field?
- Are there critical missing skills?
- Suggestions for skill development

## Experience & Education Review
- Is their experience level clearly communicated?
- Education formatting and completeness check
- Suggestions

## Application Success Analysis
- How many jobs applied vs shortlisted/interviewed?
- What does their application-to-interview ratio suggest?
- Which types of jobs are they getting shortlisted for?

## Actionable Recommendations
- Top 3-5 specific actions they should take right now
- Profile improvements (bio, intro, LinkedIn, portfolio)
- Skill gaps to fill
- Application strategy tips

Be STRICT but constructive. Do NOT inflate praise. If their profile is weak, tell them directly. Give specific examples of what to add or change.`;

    const userPrompt = `STUDENT PROFILE:
${JSON.stringify(profileSummary, null, 2)}

APPLICATION HISTORY:
${JSON.stringify(appSummary, null, 2)}

Give strict, honest feedback. Focus on what they can improve. Be specific and actionable.`;

    const raw = await askGroq(systemPrompt, userPrompt);
    const feedbackText = typeof raw === 'object' && raw.feedback ? raw.feedback : raw;

    // Cache the feedback with profile hash
    const profileHash = generateProfileHash(student);
    await Student.findByIdAndUpdate(tokenData.id, {
      $set: {
        'cachedFeedback.text': feedbackText,
        'cachedFeedback.profileHash': profileHash,
        'cachedFeedback.generatedAt': new Date(),
      },
    });

    res.json({
      profile: profileSummary,
      applications: appSummary,
      feedback: feedbackText,
      cached: false,
      generatedAt: new Date().toISOString(),
    });

  } catch (err) {
    console.error('POST /api/feedback/profile error:', err);
    res.status(500).json({
      error: 'Failed to generate feedback.',
      details: err.message,
    });
  }
});

// ─── Shared helpers ───────────────────────────────────────

function buildProfileSummary(student) {
  return {
    fullName: student.fullName,
    email: student.email,
    phone: student.phone || 'Not provided',
    field: student.field || 'Not specified',
    bio: student.bio || 'Not provided',
    introduction: student.introduction || 'Not provided',
    skills: student.skills && student.skills.length > 0 ? student.skills : ['Not specified'],
    experience: student.experience || 'Not specified',
    education: student.education && student.education.length > 0
      ? student.education.map(e => `${e.degree} from ${e.institute} (${e.startYear} - ${e.endYear || 'Present'})`)
      : ['Not specified'],
    linkedin: student.linkedin || 'Not provided',
    github: student.github || 'Not provided',
    portfolio: student.portfolio || 'Not provided',
  };
}

async function buildAppSummary(studentId) {
  const applications = await Application.find({ studentId })
    .select('jobTitle companyName currentStage isRejected appliedDate')
    .sort({ appliedDate: -1 })
    .lean();
  return applications.length > 0
    ? applications.map(a => ({
        job: a.jobTitle,
        company: a.companyName,
        stage: a.currentStage,
        rejected: a.isRejected,
        applied: a.appliedDate,
      }))
    : ['No applications yet'];
}

module.exports = router;
