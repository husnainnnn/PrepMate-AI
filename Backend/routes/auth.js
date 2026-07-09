const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Student = require('../models/Student');
const Company = require('../models/Company');

const JWT_SECRET = process.env.JWT_SECRET || '';
const SALT_ROUNDS = 10;

// ─── Helper: extract user from JWT ────────────────────────
function getUserFromToken(req) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return null;
  try {
    const token = auth.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded; // { id, email, role }
  } catch {
    return null;
  }
}

// ─── Helper: get user model by role ───────────────────────
function getUserModel(role) {
  return role === 'company' ? Company : Student;
}

// ─── Student Signup ────────────────────────────────────────
router.post('/signup', async (req, res) => {
  try {
    const { fullName, email, password } = req.body;
    if (!fullName || !email || !password) {
      return res.status(400).json({ error: 'Full name, email, and password are required.' });
    }

    const existing = await Student.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    const newUser = new Student({
      fullName,
      email: email.toLowerCase(),
      password: hashedPassword,
    });

    await newUser.save();

    const token = jwt.sign(
      { id: newUser._id.toString(), email: newUser.email, role: 'student' },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    const userData = newUser.toObject();
    delete userData.password;

    res.status(201).json({ token, user: { ...userData, id: userData._id.toString() } });
  } catch (err) {
    console.error('POST /api/auth/signup error:', err);
    res.status(500).json({ error: 'Failed to create account.' });
  }
});

// ─── Company Signup ────────────────────────────────────────
router.post('/company-signup', async (req, res) => {
  try {
    const { companyName, email, password } = req.body;
    if (!companyName || !email || !password) {
      return res.status(400).json({ error: 'Company name, email, and password are required.' });
    }

    const existing = await Company.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ error: 'A company with this email already exists.' });
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    const newCompany = new Company({
      companyName,
      email: email.toLowerCase(),
      password: hashedPassword,
    });

    await newCompany.save();

    const token = jwt.sign(
      { id: newCompany._id.toString(), email: newCompany.email, role: 'company' },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    const companyData = newCompany.toObject();
    delete companyData.password;

    res.status(201).json({ token, user: { ...companyData, id: companyData._id.toString() } });
  } catch (err) {
    console.error('POST /api/auth/company-signup error:', err);
    res.status(500).json({ error: 'Failed to create company account.' });
  }
});

// ─── Student Login ─────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const student = await Student.findOne({ email: email.toLowerCase() });
    if (!student) {
      return res.status(401).json({ error: 'No account found with this email.' });
    }

    const isMatch = await bcrypt.compare(password, student.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Incorrect password. Please try again.' });
    }

    const token = jwt.sign(
      { id: student._id.toString(), email: student.email, role: 'student' },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    const userData = student.toObject();
    delete userData.password;

    res.json({ token, user: { ...userData, id: userData._id.toString() } });
  } catch (err) {
    console.error('POST /api/auth/login error:', err);
    res.status(500).json({ error: 'Failed to login.' });
  }
});

// ─── Company Login ─────────────────────────────────────────
router.post('/company-login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const company = await Company.findOne({ email: email.toLowerCase() });
    if (!company) {
      return res.status(401).json({ error: 'No company account found with this email.' });
    }

    const isMatch = await bcrypt.compare(password, company.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Incorrect password. Please try again.' });
    }

    const token = jwt.sign(
      { id: company._id.toString(), email: company.email, role: 'company' },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    const companyData = company.toObject();
    delete companyData.password;

    res.json({ token, user: { ...companyData, id: companyData._id.toString() } });
  } catch (err) {
    console.error('POST /api/auth/company-login error:', err);
    res.status(500).json({ error: 'Failed to login.' });
  }
});

// ─── GET /api/auth/me — JWT protected ─────────────────────
router.get('/me', async (req, res) => {
  try {
    const tokenData = getUserFromToken(req);
    if (!tokenData) {
      return res.status(401).json({ error: 'Not authenticated. Please login.' });
    }

    const Model = getUserModel(tokenData.role);
    const user = await Model.findById(tokenData.id);

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const userData = user.toObject();
    delete userData.password;

    res.json({ ...userData, id: userData._id.toString() });
  } catch (err) {
    console.error('GET /api/auth/me error:', err);
    res.status(500).json({ error: 'Failed to fetch user.' });
  }
});

// ─── PUT /api/auth/profile — JWT protected ─────────────────
router.put('/profile', async (req, res) => {
  try {
    const tokenData = getUserFromToken(req);
    if (!tokenData) {
      return res.status(401).json({ error: 'Not authenticated. Please login.' });
    }

    if (tokenData.role === 'company') {
      const companyAllowed = ['companyName', 'email', 'website', 'description', 'logo'];
      const companyUpdate = {};
      for (const key of companyAllowed) {
        if (req.body[key] !== undefined) companyUpdate[key] = req.body[key];
      }
      const updatedCompany = await Company.findByIdAndUpdate(tokenData.id, companyUpdate, { new: true });
      if (!updatedCompany) return res.status(404).json({ error: 'Company not found.' });
      const companyData = updatedCompany.toObject();
      delete companyData.password;
      return res.json({ ...companyData, id: companyData._id.toString() });
    }

    const allowed = [
      'fullName', 'email', 'phone', 'linkedin', 'github', 'portfolio',
      'bio', 'field', 'skills', 'experience', 'education', 'introduction',
    ];

    const update = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) update[key] = req.body[key];
    }

    const updated = await Student.findByIdAndUpdate(tokenData.id, update, { new: true });

    if (!updated) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const userData = updated.toObject();
    delete userData.password;

    res.json({ ...userData, id: userData._id.toString() });
  } catch (err) {
    console.error('PUT /api/auth/profile error:', err);
    res.status(500).json({ error: 'Failed to update profile.' });
  }
});

module.exports = router;
