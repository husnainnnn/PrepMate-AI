const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Company = require('../models/Company');
const Job = require('../models/Job');
const Application = require('../models/Application');
const Interview = require('../models/Interview');
const Student = require('../models/Student');

const JWT_SECRET = process.env.JWT_SECRET || '';

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

// ─── GET /api/companies/dashboard ─────────────────────────
// Returns all real-time stats for the logged-in company
router.get('/dashboard', async (req, res) => {
  try {
    const tokenData = getUserFromToken(req);
    if (!tokenData || tokenData.role !== 'company') {
      return res.status(401).json({ error: 'Not authenticated as company.' });
    }

    const company = await Company.findById(tokenData.id);
    if (!company) {
      return res.status(404).json({ error: 'Company not found.' });
    }

    const companyName = company.companyName;
    const companyId = company._id.toString();

    // ── 1. Active Jobs ──────────────────────────────────────
    const activeJobs = await Job.find({ companyId, isClosed: { $ne: true } }).sort({ createdAt: -1 }).lean();

    // ── 2. Applications for this company ────────────────────
    const allApplications = await Application.find({ companyName }).sort({ createdAt: -1 }).lean();
    const totalApplicants = allApplications.length;
    const interviewsScheduled = allApplications.filter(a => a.currentStage === 'interview').length;
    const hiredCount = allApplications.filter(a => a.currentStage === 'hired').length;
    const rejectedCount = allApplications.filter(a => a.currentStage === 'rejected').length;
    const shortlistedCount = allApplications.filter(a => a.currentStage === 'shortlisted').length;
    const underReviewCount = allApplications.filter(a => a.currentStage === 'under_review').length;

    const hiringRate = totalApplicants > 0 ? Math.round((hiredCount / totalApplicants) * 100) : 0;

    // ── 3. Recent Applicants (with student name & score) ────
    const recentApplicants = [];
    for (const app of allApplications.slice(0, 10)) {
      let studentName = 'Unknown';
      let studentScore = 0;

      // Get student name
      if (app.studentId) {
        const student = await Student.findById(app.studentId).select('fullName').lean();
        if (student) studentName = student.fullName;
      }

      // Get latest mock interview score for this student (only for shortlisted/hired/rejected stages)
      if (app.studentId && ['shortlisted', 'hired', 'rejected'].includes(app.currentStage)) {
        const latestInterview = await Interview.findOne({ studentId: app.studentId })
          .sort({ completedAt: -1 })
          .select('overallScore')
          .lean();
        if (latestInterview) studentScore = latestInterview.overallScore || 0;
      }

      recentApplicants.push({
        id: app._id,
        studentId: app.studentId,
        studentName,
        jobTitle: app.jobTitle,
        score: studentScore,
        status: app.currentStage,
        appliedDate: app.appliedDate,
        location: app.location,
      });
    }

    // ── 4. Applicant Trend (monthly) ────────────────────────
    const monthlyMap = {};
    for (const app of allApplications) {
      const date = app.appliedDate || app.createdAt?.toISOString().split('T')[0] || '';
      if (!date) continue;
      const parts = date.split('-');
      if (parts.length < 2) continue;
      const monthKey = `${parts[0]}-${parts[1]}`; // "2026-01"
      if (!monthlyMap[monthKey]) {
        monthlyMap[monthKey] = { count: 0, label: '' };
      }
      monthlyMap[monthKey].count += 1;
    }

    // Generate month labels
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const now = new Date();
    const applicantTrend = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const monthLabel = monthNames[d.getMonth()];
      applicantTrend.push({
        month: monthLabel,
        applicants: monthlyMap[key]?.count || 0,
      });
    }

    // ── 5. Active Jobs with applicant counts ────────────────
    const activeJobsWithCount = activeJobs.map(job => {
      const applicantCount = allApplications.filter(
        a => a.jobTitle === job.jobTitle
      ).length;

      // Calculate days left (30 days from creation)
      const created = new Date(job.createdAt);
      const expiry = new Date(created);
      expiry.setDate(expiry.getDate() + 30);
      const now = new Date();
      const daysLeft = Math.max(0, Math.ceil((expiry - now) / (1000 * 60 * 60 * 24)));
      const status = daysLeft > 0 ? 'Active' : 'Expired';

      return {
        id: job._id,
        title: job.jobTitle,
        location: job.location,
        applicantCount,
        daysLeft,
        status,
        createdAt: job.createdAt,
      };
    }).filter(j => j.status === 'Active').sort((a, b) => a.daysLeft - b.daysLeft);

    // ── 6. Trend percentage (compare last month to previous month) ──
    const lastMonthIdx = applicantTrend.length - 1;
    const prevMonthIdx = applicantTrend.length - 2;
    const lastMonthCount = applicantTrend[lastMonthIdx]?.applicants || 0;
    const prevMonthCount = applicantTrend[prevMonthIdx]?.applicants || 0;
    const trendPercent = prevMonthCount > 0
      ? Math.round(((lastMonthCount - prevMonthCount) / prevMonthCount) * 100)
      : lastMonthCount > 0 ? 100 : 0;

    // ── 7. Stage breakdown ──────────────────────────────────
    const stageDistribution = {
      applied: allApplications.filter(a => a.currentStage === 'applied').length,
      under_review: underReviewCount,
      shortlisted: shortlistedCount,
      interview: interviewsScheduled,
      hired: hiredCount,
      rejected: rejectedCount,
    };

    // ── Build response ──────────────────────────────────────
    res.json({
      company: {
        id: companyId,
        name: companyName,
        website: company.website,
        description: company.description,
        logo: company.logo,
        isVerified: company.isVerified,
      },
      stats: {
        activeJobs: activeJobsWithCount.length,
        totalApplicants,
        newApplicants: allApplications.filter(a => a.currentStage === 'applied').length,
        interviewsScheduled,
        hiringRate,
        shortlistedCount,
        trendPercent,
      },
      recentApplicants,
      applicantTrend,
      activeJobs: activeJobsWithCount,
      stageDistribution,
    });
  } catch (err) {
    console.error('GET /api/companies/dashboard error:', err);
    res.status(500).json({ error: 'Failed to fetch company dashboard data.' });
  }
});

module.exports = router;
