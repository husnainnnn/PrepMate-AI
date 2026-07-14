const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const Student = require('../models/Student');
const Company = require('../models/Company');
const SupportTicket = require('../models/SupportTicket');
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
