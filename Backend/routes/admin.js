const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const Student = require('../models/Student');
const Company = require('../models/Company');
const SupportTicket = require('../models/SupportTicket');
const BlockedEmail = require('../models/BlockedEmail');
const { createNotification } = require('../helpers/notifications');

const JWT_SECRET = process.env.JWT_SECRET || '';
const SALT_ROUNDS = 10;

function getUserFromToken(req) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return null;
  try {
    const decoded = jwt.verify(auth.split(' ')[1], JWT_SECRET);
    return decoded;
  } catch {
    return null;
  }
}

// ─── POST /api/admin/login ────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const admin = await Admin.findOne({ email: email.toLowerCase() });
    if (!admin) {
      return res.status(401).json({ error: 'Invalid admin credentials.' });
    }

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid admin credentials.' });
    }

    const token = jwt.sign(
      { id: admin._id.toString(), email: admin.email, role: 'admin' },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: admin._id.toString(),
        email: admin.email,
        fullName: admin.fullName,
        role: 'admin',
      },
    });
  } catch (err) {
    console.error('POST /api/admin/login error:', err);
    res.status(500).json({ error: 'Failed to login.' });
  }
});

// ─── GET /api/admin/me ────────────────────────────────────
router.get('/me', async (req, res) => {
  try {
    const tokenData = getUserFromToken(req);
    if (!tokenData || tokenData.role !== 'admin') {
      return res.status(401).json({ error: 'Not authenticated as admin.' });
    }

    const admin = await Admin.findById(tokenData.id).select('-password');
    if (!admin) {
      return res.status(404).json({ error: 'Admin not found.' });
    }

    res.json({
      id: admin._id.toString(),
      email: admin.email,
      fullName: admin.fullName,
      role: 'admin',
    });
  } catch (err) {
    console.error('GET /api/admin/me error:', err);
    res.status(500).json({ error: 'Failed to fetch admin.' });
  }
});

// ─── GET /api/admin/stats — Dashboard statistics ─────────
router.get('/stats', async (req, res) => {
  try {
    const tokenData = getUserFromToken(req);
    if (!tokenData || tokenData.role !== 'admin') {
      return res.status(401).json({ error: 'Not authenticated as admin.' });
    }

    const totalStudents = await Student.countDocuments();
    const totalCompanies = await Company.countDocuments();

    // ── Monthly registration data (last 12 months) ───────
    const now = new Date();
    const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);

    const studentRegistrations = await Student.aggregate([
      { $match: { createdAt: { $gte: twelveMonthsAgo } } },
      {
        $group: {
          _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);

    const companyRegistrations = await Company.aggregate([
      { $match: { createdAt: { $gte: twelveMonthsAgo } } },
      {
        $group: {
          _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);

    // Build monthly arrays with 0 for missing months
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthlyLabels = [];
    const studentMonthly = [];
    const companyMonthly = [];

    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = d.getFullYear();
      const month = d.getMonth() + 1;
      monthlyLabels.push(monthNames[month - 1]);

      const sMatch = studentRegistrations.find(r => r._id.year === year && r._id.month === month);
      studentMonthly.push(sMatch ? sMatch.count : 0);

      const cMatch = companyRegistrations.find(r => r._id.year === year && r._id.month === month);
      companyMonthly.push(cMatch ? cMatch.count : 0);
    }

    res.json({
      totalStudents,
      totalCompanies,
      monthlyData: {
        labels: monthlyLabels,
        students: studentMonthly,
        companies: companyMonthly,
      },
    });
  } catch (err) {
    console.error('GET /api/admin/stats error:', err);
    res.status(500).json({ error: 'Failed to fetch stats.' });
  }
});

// ─── GET /api/admin/students ─────────────────────────────
router.get('/students', async (req, res) => {
  try {
    const tokenData = getUserFromToken(req);
    if (!tokenData || tokenData.role !== 'admin') return res.status(401).json({ error: 'Not authenticated as admin.' });

    const { search, field, page = '1', limit = '50' } = req.query;
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 50));
    const skip = (pageNum - 1) * limitNum;

    const filter = {};
    if (field) filter.field = field;
    if (search) {
      filter.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const [students, total] = await Promise.all([
      Student.find(filter).select('-password').sort({ createdAt: -1 }).skip(skip).limit(limitNum).lean(),
      Student.countDocuments(filter),
    ]);
    res.json({ students, total, page: pageNum, totalPages: Math.ceil(total / limitNum) });
  } catch (err) {
    console.error('GET /api/admin/students error:', err);
    res.status(500).json({ error: 'Failed to fetch students.' });
  }
});

// ─── GET /api/admin/student-fields — distinct field values ─
router.get('/student-fields', async (req, res) => {
  try {
    const tokenData = getUserFromToken(req);
    if (!tokenData || tokenData.role !== 'admin') return res.status(401).json({ error: 'Not authenticated as admin.' });

    const fields = await Student.distinct('field');
    res.json({ fields: fields.filter(Boolean).sort() });
  } catch (err) {
    console.error('GET /api/admin/student-fields error:', err);
    res.status(500).json({ error: 'Failed to fetch fields.' });
  }
});

// ─── GET /api/admin/companies ─────────────────────────────
router.get('/companies', async (req, res) => {
  try {
    const tokenData = getUserFromToken(req);
    if (!tokenData || tokenData.role !== 'admin') return res.status(401).json({ error: 'Not authenticated as admin.' });

    const { search, page = '1', limit = '50' } = req.query;
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 50));
    const skip = (pageNum - 1) * limitNum;

    const filter = {};
    if (search) {
      filter.$or = [
        { companyName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const [companies, total] = await Promise.all([
      Company.find(filter).select('-password').sort({ createdAt: -1 }).skip(skip).limit(limitNum).lean(),
      Company.countDocuments(filter),
    ]);
    res.json({ companies, total, page: pageNum, totalPages: Math.ceil(total / limitNum) });
  } catch (err) {
    console.error('GET /api/admin/companies error:', err);
    res.status(500).json({ error: 'Failed to fetch companies.' });
  }
});

// ─── GET /api/admin/students/:id — Single student detail ──
router.get('/students/:id', async (req, res) => {
  try {
    const tokenData = getUserFromToken(req);
    if (!tokenData || tokenData.role !== 'admin') return res.status(401).json({ error: 'Not authenticated as admin.' });

    const student = await Student.findById(req.params.id).select('-password').lean();
    if (!student) return res.status(404).json({ error: 'Student not found.' });

    res.json({ student });
  } catch (err) {
    console.error('GET /api/admin/students/:id error:', err);
    res.status(500).json({ error: 'Failed to fetch student.' });
  }
});

// ─── GET /api/admin/companies/:id — Single company detail ──
router.get('/companies/:id', async (req, res) => {
  try {
    const tokenData = getUserFromToken(req);
    if (!tokenData || tokenData.role !== 'admin') return res.status(401).json({ error: 'Not authenticated as admin.' });

    const company = await Company.findById(req.params.id).select('-password').lean();
    if (!company) return res.status(404).json({ error: 'Company not found.' });

    res.json({ company });
  } catch (err) {
    console.error('GET /api/admin/companies/:id error:', err);
    res.status(500).json({ error: 'Failed to fetch company.' });
  }
});

// ─── GET /api/admin/support-tickets ───────────────────────
router.get('/support-tickets', async (req, res) => {
  try {
    const tokenData = getUserFromToken(req);
    if (!tokenData || tokenData.role !== 'admin') return res.status(401).json({ error: 'Not authenticated as admin.' });

    const { role, page = '1', limit = '50' } = req.query;
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 50));
    const skip = (pageNum - 1) * limitNum;

    const filter = { status: { $ne: 'resolved' } };
    if (role) filter.userRole = role;

    const [tickets, total] = await Promise.all([
      SupportTicket.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limitNum).lean(),
      SupportTicket.countDocuments(filter),
    ]);
    res.json({ tickets, total, page: pageNum, totalPages: Math.ceil(total / limitNum) });
  } catch (err) {
    console.error('GET /api/admin/support-tickets error:', err);
    res.status(500).json({ error: 'Failed to fetch tickets.' });
  }
});

// ─── PATCH /api/admin/support-tickets/:id/resolve ─────────
router.patch('/support-tickets/:id/resolve', async (req, res) => {
  try {
    const tokenData = getUserFromToken(req);
    if (!tokenData || tokenData.role !== 'admin') return res.status(401).json({ error: 'Not authenticated as admin.' });

    const ticket = await SupportTicket.findByIdAndUpdate(
      req.params.id,
      { status: 'resolved' },
      { new: true }
    );

    if (!ticket) return res.status(404).json({ error: 'Ticket not found.' });

    // Notify the user who submitted the ticket
    try {
      await createNotification(req, {
        userId: ticket.userId,
        userRole: ticket.userRole,
        type: 'support_resolved',
        title: 'Issue Resolved ✅',
        message: 'Your support request has been resolved by the admin team.',
        link: ticket.userRole === 'student' ? '/student/support' : '/company/support',
        relatedId: ticket._id.toString(),
      });
    } catch { /* non-critical */ }

    res.json({ success: true, ticket });
  } catch (err) {
    console.error('PATCH /api/admin/support-tickets/:id/resolve error:', err);
    res.status(500).json({ error: 'Failed to resolve ticket.' });
  }
});

// ─── PATCH /api/admin/companies/:id/verify ────────────────
router.patch('/companies/:id/verify', async (req, res) => {
  try {
    const tokenData = getUserFromToken(req);
    if (!tokenData || tokenData.role !== 'admin') return res.status(401).json({ error: 'Not authenticated as admin.' });

    const company = await Company.findByIdAndUpdate(
      req.params.id,
      { isVerified: true },
      { new: true }
    ).select('-password');

    if (!company) return res.status(404).json({ error: 'Company not found.' });

    // Notify the company
    try {
      await createNotification(req, {
        userId: company._id.toString(),
        userRole: 'company',
        type: 'company_verified',
        title: 'Company Verified ✅',
        message: `Your company ${company.companyName} has been verified successfully!`,
        link: '/company/profile',
        relatedId: company._id.toString(),
      });
    } catch { /* non-critical */ }

    res.json({ success: true, company });
  } catch (err) {
    console.error('PATCH /api/admin/companies/:id/verify error:', err);
    res.status(500).json({ error: 'Failed to verify company.' });
  }
});

// ─── PATCH /api/admin/companies/:id/unverify ──────────────
router.patch('/companies/:id/unverify', async (req, res) => {
  try {
    const tokenData = getUserFromToken(req);
    if (!tokenData || tokenData.role !== 'admin') return res.status(401).json({ error: 'Not authenticated as admin.' });

    const company = await Company.findByIdAndUpdate(
      req.params.id,
      { isVerified: false },
      { new: true }
    ).select('-password');

    if (!company) return res.status(404).json({ error: 'Company not found.' });

    // Notify the company
    try {
      await createNotification(req, {
        userId: company._id.toString(),
        userRole: 'company',
        type: 'support_resolved',
        title: 'Verification Removed ⚠️',
        message: `Your company ${company.companyName} has been unverified. Please contact support if you believe this is a mistake.`,
        link: '/company/profile',
        relatedId: company._id.toString(),
      });
    } catch { /* non-critical */ }

    res.json({ success: true, company });
  } catch (err) {
    console.error('PATCH /api/admin/companies/:id/unverify error:', err);
    res.status(500).json({ error: 'Failed to unverify company.' });
  }
});

// ─── POST /api/admin/block ──────────────────────────────
// Block a user by email — deletes their account + permanently blocks the email
router.post('/block', async (req, res) => {
  try {
    const tokenData = getUserFromToken(req);
    if (!tokenData || tokenData.role !== 'admin') return res.status(401).json({ error: 'Not authenticated as admin.' });

    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required.' });

    const normalizedEmail = email.toLowerCase().trim();

    // Check if already blocked
    const alreadyBlocked = await BlockedEmail.findOne({ email: normalizedEmail });
    if (alreadyBlocked) {
      return res.status(409).json({ error: 'This email is already blocked.' });
    }

    // Find and delete student account if exists
    const student = await Student.findOne({ email: normalizedEmail });
    if (student) {
      const Application = require('../models/Application');
      const Interview = require('../models/Interview');
      await Application.deleteMany({ studentId: student._id });
      await Interview.deleteMany({ studentId: student._id });
      await Student.findByIdAndDelete(student._id);
    }

    // Find and delete company account if exists
    const company = await Company.findOne({ email: normalizedEmail });
    if (company) {
      const Job = require('../models/Job');
      const jobs = await Job.find({ companyId: company._id }).select('_id').lean();
      const jobIds = jobs.map(j => j._id);
      const Application = require('../models/Application');
      await Application.deleteMany({ jobId: { $in: jobIds } });
      await Job.deleteMany({ companyId: company._id });
      await Company.findByIdAndDelete(company._id);
    }

    // Block the email permanently
    await BlockedEmail.create({
      email: normalizedEmail,
      blockedBy: tokenData.id,
    });

    res.json({ success: true, message: `${normalizedEmail} has been blocked. Account deleted.` });
  } catch (err) {
    console.error('POST /api/admin/block error:', err);
    res.status(500).json({ error: 'Failed to block user.' });
  }
});

// ─── POST /api/admin/unblock ────────────────────────────
// Unblock an email (remove from blocked list)
router.post('/unblock', async (req, res) => {
  try {
    const tokenData = getUserFromToken(req);
    if (!tokenData || tokenData.role !== 'admin') return res.status(401).json({ error: 'Not authenticated as admin.' });

    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required.' });

    const normalizedEmail = email.toLowerCase().trim();

    const deleted = await BlockedEmail.findOneAndDelete({ email: normalizedEmail });
    if (!deleted) {
      return res.status(404).json({ error: 'Email not found in blocked list.' });
    }

    res.json({ success: true, message: `${normalizedEmail} has been unblocked.` });
  } catch (err) {
    console.error('POST /api/admin/unblock error:', err);
    res.status(500).json({ error: 'Failed to unblock.' });
  }
});

// ─── GET /api/admin/pro-plan ──────────────────────────────
router.get('/pro-plan', async (req, res) => {
  try {
    const tokenData = getUserFromToken(req);
    if (!tokenData || tokenData.role !== 'admin') return res.status(401).json({ error: 'Not authenticated as admin.' });

    const { page = '1', limit = '50' } = req.query;
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 50));
    const skip = (pageNum - 1) * limitNum;

    const [students, totalStudents, companies, totalCompanies] = await Promise.all([
      Student.find({ 'stats.plan': 'pro' }).select('fullName email field stats.plan createdAt').sort({ createdAt: -1 }).skip(skip).limit(limitNum).lean(),
      Student.countDocuments({ 'stats.plan': 'pro' }),
      Company.find({ plan: 'pro' }).select('companyName email plan createdAt').sort({ createdAt: -1 }).skip(skip).limit(limitNum).lean(),
      Company.countDocuments({ plan: 'pro' }),
    ]);

    res.json({ students, companies, totalStudents, totalCompanies, page: pageNum });
  } catch (err) {
    console.error('GET /api/admin/pro-plan error:', err);
    res.status(500).json({ error: 'Failed to fetch pro plan data.' });
  }
});

module.exports = router;
