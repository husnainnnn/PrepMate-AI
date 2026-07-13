const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const LiveInterview = require('../models/LiveInterview');
const Company = require('../models/Company');
const Student = require('../models/Student');
const Application = require('../models/Application');

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

function generateRoomId() {
  return crypto.randomBytes(12).toString('hex'); // 24-char unique room ID
}

// ─── GET /api/live-interviews ──────────────────────────────
// Get all interviews for the current user (company OR student)
router.get('/', async (req, res) => {
  try {
    const tokenData = getUserFromToken(req);
    if (!tokenData) return res.status(401).json({ error: 'Not authenticated.' });

    const now = new Date();
    let interviews;

    if (tokenData.role === 'company') {
      interviews = await LiveInterview.find({ companyId: tokenData.id })
        .sort({ scheduledTime: -1 })
        .lean();
    } else {
      interviews = await LiveInterview.find({ studentId: tokenData.id })
        .sort({ scheduledTime: -1 })
        .lean();
    }

    // Categorize
    const upcoming = interviews.filter(iv =>
      iv.status === 'scheduled' && new Date(iv.scheduledTime) > now
    ).sort((a, b) => new Date(a.scheduledTime) - new Date(b.scheduledTime));

    const inProgress = interviews.filter(iv => iv.status === 'in-progress');
    const past = interviews.filter(iv =>
      iv.status === 'completed' || iv.status === 'cancelled' ||
      (iv.status === 'scheduled' && new Date(iv.scheduledTime) <= now)
    );

    // Fetch student details + application stage for company
    if (tokenData.role === 'company') {
      const studentIds = [...new Set(interviews.map(iv => iv.studentId?.toString()).filter(Boolean))];
      const students = await Student.find({ _id: { $in: studentIds } }).select('fullName email field skills').lean();
      const studentMap = {};
      students.forEach(s => { studentMap[s._id.toString()] = s; });

      // Fetch application stages for past interviews
      const appIds = [...new Set(past.map(iv => iv.applicationId?.toString()).filter(Boolean))];
      const applications = await Application.find({ _id: { $in: appIds } }).select('_id currentStage isRejected').lean();
      const appStageMap = {};
      applications.forEach(a => { appStageMap[a._id.toString()] = { currentStage: a.currentStage, isRejected: a.isRejected }; });

      const attachStudent = (iv) => ({
        ...iv,
        studentDetails: studentMap[iv.studentId?.toString()] || null,
        applicationStage: iv.applicationId ? (appStageMap[iv.applicationId.toString()] || null) : null,
      });

      return res.json({
        upcoming: upcoming.map(attachStudent),
        inProgress: inProgress.map(attachStudent),
        past: past.map(attachStudent),
      });
    }

    // For student, attach company info
    const companyIds = [...new Set(interviews.map(iv => iv.companyId?.toString()).filter(Boolean))];
    const companies = await Company.find({ _id: { $in: companyIds } }).select('companyName email website').lean();
    const companyMap = {};
    companies.forEach(c => { companyMap[c._id.toString()] = c; });

    const attachCompany = (iv) => ({
      ...iv,
      companyDetails: companyMap[iv.companyId?.toString()] || null,
    });

    res.json({
      upcoming: upcoming.map(attachCompany),
      inProgress: inProgress.map(attachCompany),
      past: past.map(attachCompany),
    });
  } catch (err) {
    console.error('GET /api/live-interviews error:', err);
    res.status(500).json({ error: 'Failed to fetch interviews.' });
  }
});

// ─── GET /api/live-interviews/shortlisted-candidates ──────
// Get shortlisted candidates eligible for scheduling (company only)
router.get('/shortlisted-candidates', async (req, res) => {
  try {
    const tokenData = getUserFromToken(req);
    if (!tokenData || tokenData.role !== 'company') {
      return res.status(401).json({ error: 'Only companies can view candidates.' });
    }

    const company = await Company.findById(tokenData.id);
    if (!company) return res.status(404).json({ error: 'Company not found.' });

    const Job = require('../models/Job');
    const jobs = await Job.find({ companyId: company._id }).select('_id jobTitle').lean();
    const jobIds = jobs.map(j => j._id);

    const applications = await Application.find({
      jobId: { $in: jobIds },
      currentStage: { $in: ['shortlisted', 'interview'] },
      hiddenFromCompany: { $ne: true },
    }).sort({ updatedAt: -1 }).lean();

    // Attach student names
    const studentIds = [...new Set(applications.map(a => a.studentId?.toString()).filter(Boolean))];
    const students = await Student.find({ _id: { $in: studentIds } }).select('fullName email field skills').lean();
    const studentMap = {};
    students.forEach(s => { studentMap[s._id.toString()] = s; });

    const candidates = applications.map(app => {
      const student = studentMap[app.studentId?.toString()] || null;
      return {
        applicationId: app._id,
        studentId: app.studentId,
        jobId: app.jobId,
        jobTitle: app.jobTitle,
        fullName: student?.fullName || app.fullName || 'Unknown',
        email: student?.email || app.email || '',
        field: student?.field || '',
        skills: student?.skills || app.skills || [],
        currentStage: app.currentStage,
      };
    });

    res.json({ candidates });
  } catch (err) {
    console.error('GET /api/live-interviews/shortlisted-candidates error:', err);
    res.status(500).json({ error: 'Failed to fetch candidates.' });
  }
});

// ─── POST /api/live-interviews/schedule ────────────────────
// Schedule a new live interview (company only)
router.post('/schedule', async (req, res) => {
  try {
    const tokenData = getUserFromToken(req);
    if (!tokenData || tokenData.role !== 'company') {
      return res.status(401).json({ error: 'Only companies can schedule interviews.' });
    }

    const { studentId, applicationId, jobId, jobTitle, scheduledTime, durationMinutes, notes } = req.body;

    if (!studentId || !scheduledTime) {
      return res.status(400).json({ error: 'Student and scheduled time are required.' });
    }

    const company = await Company.findById(tokenData.id);
    if (!company) return res.status(404).json({ error: 'Company not found.' });

    const student = await Student.findById(studentId).select('fullName email').lean();
    if (!student) return res.status(404).json({ error: 'Student not found.' });

    const roomId = generateRoomId();

    const interview = new LiveInterview({
      companyId: tokenData.id,
      studentId,
      applicationId: applicationId || null,
      jobId: jobId || null,
      jobTitle: jobTitle || 'Interview',
      companyName: company.companyName,
      studentName: student.fullName,
      studentEmail: student.email,
      scheduledTime: new Date(scheduledTime),
      durationMinutes: durationMinutes || 30,
      notes: notes || '',
      roomId,
      status: 'scheduled',
    });

    await interview.save();

    // ── Update Application stage to 'interview' ──────────
    if (applicationId) {
      try {
        const updatedApp = await Application.findByIdAndUpdate(applicationId, {
          $set: { currentStage: 'interview' },
        }, { new: true });
        if (!updatedApp) {
          console.warn(`Application ${applicationId} not found for stage update`);
        }
      } catch (err) {
        console.error('Failed to update application stage:', err.message);
      }
    }

    // ── Notify student via socket.io + notification ────
    try {
      const io = req.app.get('io');
      if (io) {
        io.to(studentId.toString()).emit('interview-scheduled', {
          interview: interview.toObject(),
          companyName: company.companyName,
        });
      }

      const scheduledDate = new Date(scheduledTime);
      const timeStr = scheduledDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      const dateStr = scheduledDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

      // Student notification
      await createNotification(req, {
        userId: studentId,
        userRole: 'student',
        type: 'interview_scheduled',
        title: 'Interview Scheduled 📅',
        message: `${company.companyName} scheduled a live interview for ${jobTitle || 'your application'} on ${dateStr} at ${timeStr}`,
        link: '/student/live-interviews',
        relatedId: interview._id.toString(),
      });
    } catch { /* non-critical */ }

    res.status(201).json({ interview: interview.toObject() });
  } catch (err) {
    console.error('POST /api/live-interviews/schedule error:', err);
    res.status(500).json({ error: 'Failed to schedule interview.' });
  }
});

// ─── PATCH /api/live-interviews/:id/start ─────────────────
// Mark interview as in-progress (either side)
router.patch('/:id/start', async (req, res) => {
  try {
    const tokenData = getUserFromToken(req);
    if (!tokenData) return res.status(401).json({ error: 'Not authenticated.' });

    const interview = await LiveInterview.findById(req.params.id);
    if (!interview) return res.status(404).json({ error: 'Interview not found.' });

    // ── Increment student interview count (first time only) ──
    if (interview.status === 'scheduled') {
      try {
        const student = await Student.findById(interview.studentId);
        if (student) {
          const stats = student.stats || {};
          const newCount = (stats.interviewCount || 0) + 1;
          const newRemaining = Math.max(0, (stats.interviewsRemaining || 4) - 1);
          const today = new Date().toISOString().split('T')[0];
          await Student.findByIdAndUpdate(interview.studentId, {
            $set: {
              'stats.interviewCount': newCount,
              'stats.interviewsRemaining': newRemaining,
              'stats.lastInterviewDate': today,
            },
          });
        }
      } catch (err) {
        console.error('Failed to increment interview count:', err.message);
      }
    }

    interview.status = 'in-progress';
    interview.startedAt = new Date();
    await interview.save();

    // Notify via socket
    try {
      const io = req.app.get('io');
      if (io) {
        const otherId = tokenData.role === 'company'
          ? interview.studentId.toString()
          : interview.companyId.toString();
        io.to(otherId).emit('interview-started', { interviewId: interview._id.toString(), roomId: interview.roomId });
      }
    } catch { /* non-critical */ }

    res.json({ interview: interview.toObject() });
  } catch (err) {
    console.error('PATCH /api/live-interviews/:id/start error:', err);
    res.status(500).json({ error: 'Failed to start interview.' });
  }
});

// ─── PATCH /api/live-interviews/:id/complete ──────────────
// Mark interview as completed
router.patch('/:id/complete', async (req, res) => {
  try {
    const tokenData = getUserFromToken(req);
    if (!tokenData) return res.status(401).json({ error: 'Not authenticated.' });

    const interview = await LiveInterview.findById(req.params.id);
    if (!interview) return res.status(404).json({ error: 'Interview not found.' });

    interview.status = 'completed';
    interview.completedAt = new Date();
    if (req.body.feedback) interview.feedback = req.body.feedback;
    if (req.body.rating) interview.rating = req.body.rating;
    await interview.save();

    res.json({ interview: interview.toObject() });
  } catch (err) {
    console.error('PATCH /api/live-interviews/:id/complete error:', err);
    res.status(500).json({ error: 'Failed to complete interview.' });
  }
});

// ─── PATCH /api/live-interviews/:id/cancel ────────────────
// Cancel an interview
router.patch('/:id/cancel', async (req, res) => {
  try {
    const tokenData = getUserFromToken(req);
    if (!tokenData) return res.status(401).json({ error: 'Not authenticated.' });

    const interview = await LiveInterview.findById(req.params.id);
    if (!interview) return res.status(404).json({ error: 'Interview not found.' });

    interview.status = 'cancelled';
    interview.cancelledBy = tokenData.role;
    interview.cancelReason = req.body.reason || 'Cancelled by ' + tokenData.role;
    await interview.save();

    // Notify the other party
    try {
      const io = req.app.get('io');
      if (io) {
        const otherId = tokenData.role === 'company'
          ? interview.studentId.toString()
          : interview.companyId.toString();
        io.to(otherId).emit('interview-cancelled', {
          interviewId: interview._id.toString(),
          reason: interview.cancelReason,
        });
      }

      // Create notification for the other party
      const cancelledByLabel = tokenData.role === 'company' ? 'Company' : 'Student';
      const recipientId = tokenData.role === 'company' ? interview.studentId : interview.companyId;
      const recipientRole = tokenData.role === 'company' ? 'student' : 'company';

      await createNotification(req, {
        userId: recipientId,
        userRole: recipientRole,
        type: 'interview_cancelled',
        title: 'Interview Cancelled',
        message: `Your interview for ${interview.jobTitle} was cancelled by ${cancelledByLabel}: ${interview.cancelReason}`,
        link: '/student/live-interviews',
        relatedId: interview._id.toString(),
      });
    } catch { /* non-critical */ }

    res.json({ interview: interview.toObject() });
  } catch (err) {
    console.error('PATCH /api/live-interviews/:id/cancel error:', err);
    res.status(500).json({ error: 'Failed to cancel interview.' });
  }
});

// ─── DELETE /api/live-interviews/:id ─────────────────────
// Delete an interview record
router.delete('/:id', async (req, res) => {
  try {
    const tokenData = getUserFromToken(req);
    if (!tokenData) return res.status(401).json({ error: 'Not authenticated.' });

    const interview = await LiveInterview.findById(req.params.id);
    if (!interview) return res.status(404).json({ error: 'Interview not found.' });

    // Only company can delete
    if (tokenData.role !== 'company') {
      return res.status(403).json({ error: 'Only companies can delete interviews.' });
    }

    await LiveInterview.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    console.error('DELETE /api/live-interviews/:id error:', err);
    res.status(500).json({ error: 'Failed to delete interview.' });
  }
});

module.exports = router;
