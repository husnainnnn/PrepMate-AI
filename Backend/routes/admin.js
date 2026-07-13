const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');

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

    const Student = require('../models/Student');
    const Company = require('../models/Company');

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

module.exports = router;
