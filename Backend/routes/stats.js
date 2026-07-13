const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Student = require('../models/Student');
const Interview = require('../models/Interview');

const JWT_SECRET = process.env.JWT_SECRET || '';

// ─── Helper: get user from token ────────────────────────
function getUserFromToken(req) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return null;
  try {
    const token = auth.split(' ')[1];
    return jwt.verify(token, JWT_SECRET); // { id, email, role }
  } catch {
    return null;
  }
}

// ─── GET /api/stats/dashboard ───────────────────────────
// Returns all real-time stats for the logged-in student
router.get('/dashboard', async (req, res) => {
  try {
    const tokenData = getUserFromToken(req);
    if (!tokenData || tokenData.role !== 'student') {
      return res.status(401).json({ error: 'Not authenticated as student.' });
    }

    const student = await Student.findById(tokenData.id);
    if (!student) {
      return res.status(404).json({ error: 'Student not found.' });
    }

    // Calculate profile completion %
    const profileFields = [
      student.fullName, student.email, student.phone, student.linkedin,
      student.github, student.portfolio, student.bio, student.field,
      student.introduction,
    ];
    const filledFields = profileFields.filter(f => f && f.trim().length > 0).length;
    const skillsFilled = student.skills && student.skills.length > 0 ? 1 : 0;
    const educationFilled = student.education && student.education.length > 0 ? 1 : 0;
    const totalProfileFields = profileFields.length + 2; // +2 for skills & education
    const filledTotal = filledFields + skillsFilled + educationFilled;
    const profileCompletion = Math.min(100, Math.round((filledTotal / totalProfileFields) * 100));

    // Get live interview count from LiveInterview model
    const LiveInterview = require('../models/LiveInterview');
    let liveInterviewCount = 0;
    try {
      liveInterviewCount = await LiveInterview.countDocuments({
        studentId: tokenData.id,
        status: { $in: ['completed', 'in-progress'] }
      });
    } catch { /* ignore */ }

    // Build response
    const stats = student.stats || {};
    const today = new Date().toISOString().split('T')[0];

    res.json({
      stats: {
        interviewCount: stats.interviewCount || 0,
        liveInterviewCount,
        avgScore: stats.avgScore || 0,
        totalScoreSum: stats.totalScoreSum || 0,
        practiceQuestionsCount: stats.practiceQuestionsCount || 0,
        practiceSessionsCount: stats.practiceSessionsCount || 0,
        loginStreak: stats.loginStreak || 0,
        lastLoginDate: stats.lastLoginDate || '',
        interviewsRemaining: stats.interviewsRemaining || 4,
        plan: stats.plan || 'free',
        applicationsCount: stats.applicationsCount || 0,
        lastInterviewDate: stats.lastInterviewDate || '',
      },
      profile: {
        completion: profileCompletion,
        fields: {
          fullName: !!student.fullName,
          email: !!student.email,
          phone: !!student.phone,
          linkedin: !!student.linkedin,
          github: !!student.github,
          portfolio: !!student.portfolio,
          bio: !!student.bio,
          field: !!student.field,
          skills: !!(student.skills && student.skills.length > 0),
          education: !!(student.education && student.education.length > 0),
          introduction: !!student.introduction,
        },
      },
      recentInterviews: await Interview.find({ studentId: tokenData.id })
        .sort({ completedAt: -1 })
        .limit(50)
        .select('field overallScore hireDecision cheated answeredCount completedAt durationMinutes')
        .lean(),
      recentScores: await Interview.find({ studentId: tokenData.id, cheated: false })
        .sort({ completedAt: -1 })
        .limit(50)
        .select('overallScore completedAt')
        .lean()
        .then(scores => scores.map(s => ({ score: s.overallScore, date: s.completedAt }))),
      today,
    });
  } catch (err) {
    console.error('GET /api/stats/dashboard error:', err);
    res.status(500).json({ error: 'Failed to fetch dashboard stats.' });
  }
});

// ─── POST /api/stats/interview-started ──────────────────
// Called when a student STARTS a mock interview — count increments HERE
router.post('/interview-started', async (req, res) => {
  try {
    const tokenData = getUserFromToken(req);
    if (!tokenData || tokenData.role !== 'student') {
      return res.status(401).json({ error: 'Not authenticated as student.' });
    }

    const student = await Student.findById(tokenData.id);
    if (!student) {
      return res.status(404).json({ error: 'Student not found.' });
    }

    const stats = student.stats || {};
    const newCount = (stats.interviewCount || 0) + 1;
    const newRemaining = Math.max(0, (stats.interviewsRemaining || 4) - 1);
    const today = new Date().toISOString().split('T')[0];

    await Student.findByIdAndUpdate(tokenData.id, {
      $set: {
        'stats.interviewCount': newCount,
        'stats.interviewsRemaining': newRemaining,
        'stats.lastInterviewDate': today,
      },
    });

    res.json({
      success: true,
      interviewCount: newCount,
      interviewsRemaining: newRemaining,
      planLocked: newRemaining <= 0 && (stats.plan || 'free') === 'free',
    });
  } catch (err) {
    console.error('POST /api/stats/interview-started error:', err);
    res.status(500).json({ error: 'Failed to save interview start stats.' });
  }
});

// ─── POST /api/stats/interview-completed ────────────────
// Called when a student finishes a mock interview — only updates score (count already incremented on start)
router.post('/interview-completed', async (req, res) => {
  try {
    const tokenData = getUserFromToken(req);
    if (!tokenData || tokenData.role !== 'student') {
      return res.status(401).json({ error: 'Not authenticated as student.' });
    }

    const { score, cheated } = req.body;
    if (typeof score !== 'number') {
      return res.status(400).json({ error: 'Score (number) is required.' });
    }

    const student = await Student.findById(tokenData.id);
    if (!student) {
      return res.status(404).json({ error: 'Student not found.' });
    }

    const stats = student.stats || {};
    const currentCount = stats.interviewCount || 0;

    let newSum, newAvg;

    if (cheated) {
      // Cheated interview: don't affect average score
      newSum = stats.totalScoreSum || 0;
      newAvg = stats.avgScore || 0;
    } else {
      newSum = (stats.totalScoreSum || 0) + score;
      newAvg = currentCount > 0 ? Math.round((newSum / currentCount) * 10) / 10 : score;
    }

    await Student.findByIdAndUpdate(tokenData.id, {
      $set: {
        'stats.totalScoreSum': newSum,
        'stats.avgScore': newAvg,
      },
    });

    res.json({
      success: true,
      interviewCount: currentCount,
      avgScore: newAvg,
      cheated: !!cheated,
    });
  } catch (err) {
    console.error('POST /api/stats/interview-completed error:', err);
    res.status(500).json({ error: 'Failed to save interview stats.' });
  }
});

// ─── POST /api/stats/practice-started ───────────────────
// Called when a student STARTS a practice session (tracks every session)
router.post('/practice-started', async (req, res) => {
  try {
    const tokenData = getUserFromToken(req);
    if (!tokenData || tokenData.role !== 'student') {
      return res.status(401).json({ error: 'Not authenticated as student.' });
    }

    const student = await Student.findById(tokenData.id);
    if (!student) {
      return res.status(404).json({ error: 'Student not found.' });
    }

    const current = student.stats?.practiceSessionsCount || 0;
    const newCount = current + 1;

    await Student.findByIdAndUpdate(tokenData.id, {
      $set: { 'stats.practiceSessionsCount': newCount },
    });

    res.json({
      success: true,
      practiceSessionsCount: newCount,
    });
  } catch (err) {
    console.error('POST /api/stats/practice-started error:', err);
    res.status(500).json({ error: 'Failed to save practice session stats.' });
  }
});

// ─── POST /api/stats/practice-completed ─────────────────
// Called when a student completes a practice session
router.post('/practice-completed', async (req, res) => {
  try {
    const tokenData = getUserFromToken(req);
    if (!tokenData || tokenData.role !== 'student') {
      return res.status(401).json({ error: 'Not authenticated as student.' });
    }

    const { questionCount } = req.body;
    const count = typeof questionCount === 'number' ? questionCount : 1;

    const student = await Student.findById(tokenData.id);
    if (!student) {
      return res.status(404).json({ error: 'Student not found.' });
    }

    const current = student.stats?.practiceQuestionsCount || 0;
    const newCount = current + count;

    await Student.findByIdAndUpdate(tokenData.id, {
      $set: { 'stats.practiceQuestionsCount': newCount },
    });

    res.json({
      success: true,
      practiceQuestionsCount: newCount,
    });
  } catch (err) {
    console.error('POST /api/stats/practice-completed error:', err);
    res.status(500).json({ error: 'Failed to save practice stats.' });
  }
});

// ─── POST /api/stats/checkin ────────────────────────────
// Handles daily login streak. Call this on dashboard load / any auth page.
router.post('/checkin', async (req, res) => {
  try {
    const tokenData = getUserFromToken(req);
    if (!tokenData || tokenData.role !== 'student') {
      return res.status(401).json({ error: 'Not authenticated as student.' });
    }

    const student = await Student.findById(tokenData.id);
    if (!student) {
      return res.status(404).json({ error: 'Student not found.' });
    }

    const today = new Date().toISOString().split('T')[0];
    const lastDate = student.stats?.lastLoginDate || '';
    let newStreak = student.stats?.loginStreak || 0;

    if (lastDate !== today) {
      // Calculate yesterday's date
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      if (lastDate === yesterdayStr) {
        // Consecutive day — increment streak
        newStreak += 1;
      } else if (lastDate === '') {
        // First ever login
        newStreak = 1;
      } else {
        // Streak broken — reset to 1
        newStreak = 1;
      }

      await Student.findByIdAndUpdate(tokenData.id, {
        $set: {
          'stats.loginStreak': newStreak,
          'stats.lastLoginDate': today,
        },
      });
    }

    res.json({
      success: true,
      loginStreak: newStreak,
      lastLoginDate: today,
    });
  } catch (err) {
    console.error('POST /api/stats/checkin error:', err);
    res.status(500).json({ error: 'Failed to update streak.' });
  }
});

module.exports = router;
