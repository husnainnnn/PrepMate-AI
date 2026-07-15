const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Student = require('../models/Student');
const Company = require('../models/Company');
const VerificationCode = require('../models/VerificationCode');
const BlockedEmail = require('../models/BlockedEmail');
const { generateCode, sendVerificationCode, sendPasswordResetCode } = require('../services/email');

const JWT_SECRET = process.env.JWT_SECRET || '';
const SALT_ROUNDS = 10;
const CODE_EXPIRY_MINUTES = 10;

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

// ─── Helper: check if email exists ─────────────────────────
async function emailExists(email) {
  const [student, company] = await Promise.all([
    Student.findOne({ email: email.toLowerCase() }),
    Company.findOne({ email: email.toLowerCase() }),
  ])
  return !!student || !!company
}

// ─── Send Verification Code (for signup) ───────────────────
router.post('/send-verification', async (req, res) => {
  try {
    const { email, type } = req.body
    if (!email) {
      return res.status(400).json({ error: 'Email is required.' })
    }

    const normalizedEmail = email.toLowerCase().trim()

    if (type === 'signup') {
      // Check if account already exists
      if (await emailExists(normalizedEmail)) {
        return res.status(409).json({ error: 'An account with this email already exists.' })
      }
    }

    // Check if email is blocked
    if (type === 'signup') {
      const blocked = await BlockedEmail.findOne({ email: normalizedEmail });
      if (blocked) {
        return res.status(403).json({ error: 'This email is blocked. You cannot create an account with this email.' });
      }
    }

    // Generate code
    const code = generateCode()
    const expiresAt = new Date(Date.now() + CODE_EXPIRY_MINUTES * 60 * 1000)

    // Delete any existing codes for this email + type
    const verificationType = type === 'password_reset' ? 'password_reset' : 'email_verification'
    await VerificationCode.deleteMany({ email: normalizedEmail, type: verificationType })

    // Save new code
    await VerificationCode.create({
      email: normalizedEmail,
      code,
      type: verificationType,
      expiresAt,
    })

    // Send email
    if (verificationType === 'password_reset') {
      await sendPasswordResetCode(normalizedEmail, code)
    } else {
      await sendVerificationCode(normalizedEmail, code)
    }

    res.json({ success: true, message: 'Verification code sent to your email.' })
  } catch (err) {
    console.error('POST /api/auth/send-verification error:', err)
    res.status(500).json({ error: 'Failed to send verification code.' })
  }
})

// ─── Verify Code ────────────────────────────────────────────
router.post('/verify-code', async (req, res) => {
  try {
    const { email, code, type } = req.body
    if (!email || !code) {
      return res.status(400).json({ error: 'Email and code are required.' })
    }

    const normalizedEmail = email.toLowerCase().trim()
    const verificationType = type === 'password_reset' ? 'password_reset' : 'email_verification'

    const record = await VerificationCode.findOne({
      email: normalizedEmail,
      type: verificationType,
      used: false,
      expiresAt: { $gt: new Date() },
    })

    if (!record) {
      return res.status(400).json({ error: 'No valid verification code found. Request a new one.' })
    }

    if (record.code !== code) {
      return res.status(400).json({ error: 'Incorrect verification code. Please try again.' })
    }

    // Mark as used — only for email_verification, not password_reset
    // (reset-password endpoint handles marking password reset codes as used)
    if (verificationType !== 'password_reset') {
      record.used = true
      await record.save()
    }

    res.json({ success: true, message: 'Email verified successfully.' })
  } catch (err) {
    console.error('POST /api/auth/verify-code error:', err)
    res.status(500).json({ error: 'Failed to verify code.' })
  }
})

// ─── Student Signup (requires prior verification) ───────────
router.post('/signup', async (req, res) => {
  try {
    const { fullName, email, password, verificationCode } = req.body;
    if (!fullName || !email || !password) {
      return res.status(400).json({ error: 'Full name, email, and password are required.' });
    }
    if (password.length < 8 || !/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
      return res.status(400).json({ error: 'Password must be at least 8 characters with at least one letter and one number.' });
    }

    const normalizedEmail = email.toLowerCase().trim()

    // Verify the code was used
    if (verificationCode) {
      const verified = await VerificationCode.findOne({
        email: normalizedEmail,
        code: verificationCode,
        type: 'email_verification',
        used: true,
      })
      if (!verified) {
        return res.status(400).json({ error: 'Please verify your email first.' })
      }
    }

    const existing = await Student.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    const newUser = new Student({
      fullName,
      email: normalizedEmail,
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

// ─── Company Signup (requires prior verification) ───────────
router.post('/company-signup', async (req, res) => {
  try {
    const { companyName, email, password, verificationCode } = req.body;
    if (!companyName || !email || !password) {
      return res.status(400).json({ error: 'Company name, email, and password are required.' });
    }
    if (password.length < 8 || !/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
      return res.status(400).json({ error: 'Password must be at least 8 characters with at least one letter and one number.' });
    }

    const normalizedEmail = email.toLowerCase().trim()

    // Verify the code was used
    if (verificationCode) {
      const verified = await VerificationCode.findOne({
        email: normalizedEmail,
        code: verificationCode,
        type: 'email_verification',
        used: true,
      })
      if (!verified) {
        return res.status(400).json({ error: 'Please verify your email first.' })
      }
    }

    const existing = await Company.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(409).json({ error: 'A company with this email already exists.' });
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    const newCompany = new Company({
      companyName,
      email: normalizedEmail,
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
      const companyAllowed = [
        'companyName', 'email', 'website', 'description', 'logo',
        'ceoName', 'ceoMessage', 'phone', 'address', 'city', 'country',
        'industry', 'employeeCount', 'foundedYear',
        'linkedin', 'twitter', 'facebook',
        'benefits', 'culture',
      ];
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
      'profilePicture',
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

// ─── DELETE /api/auth/profile ─────────────────────────────
// Permanently delete student account + all linked data
router.delete('/profile', async (req, res) => {
  try {
    const tokenData = getUserFromToken(req);
    if (!tokenData) {
      return res.status(401).json({ error: 'Not authenticated.' });
    }

    const userId = tokenData.id;
    const userRole = tokenData.role;

    if (userRole === 'company') {
      // Delete company
      await Company.findByIdAndDelete(userId);
      // Delete all jobs posted by this company
      const Job = require('../models/Job');
      const jobs = await Job.find({ companyId: userId }).select('_id').lean();
      const jobIds = jobs.map(j => j._id);
      // Delete related applications
      const Application = require('../models/Application');
      await Application.deleteMany({ jobId: { $in: jobIds } });
      // Delete jobs
      await Job.deleteMany({ companyId: userId });
      // Delete live interviews
      const LiveInterview = require('../models/LiveInterview');
      await LiveInterview.deleteMany({ companyId: userId });
      // Delete messages
      const Message = require('../models/Message');
      await Message.deleteMany({ $or: [{ senderId: userId }, { receiverId: userId }] });
      // Delete notifications
      const Notification = require('../models/Notification');
      await Notification.deleteMany({ userId });

      return res.json({ success: true, message: 'Account and all associated data deleted.' });
    }

    // ── Student deletion ─────────────────────────────────
    // Delete student record
    await Student.findByIdAndDelete(userId);

    // Delete all applications by this student
    const Application = require('../models/Application');
    await Application.deleteMany({ studentId: userId });

    // Delete all interviews by this student
    const Interview = require('../models/Interview');
    await Interview.deleteMany({ studentId: userId });

    // Delete live interviews (as student)
    const LiveInterview = require('../models/LiveInterview');
    await LiveInterview.deleteMany({ studentId: userId });

    // Delete messages (sent or received)
    const Message = require('../models/Message');
    await Message.deleteMany({ $or: [{ senderId: userId }, { receiverId: userId }] });

    // Delete notifications
    const Notification = require('../models/Notification');
    await Notification.deleteMany({ userId });

    // Delete resumes
    const Resume = require('../models/Resume');
    await Resume.deleteMany({ studentId: userId });

    res.json({ success: true, message: 'Account and all associated data permanently deleted.' });
  } catch (err) {
    console.error('DELETE /api/auth/profile error:', err);
    res.status(500).json({ error: 'Failed to delete account.' });
  }
});

// ─── Forgot Password — Send Reset Code ──────────────────
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body
    if (!email) {
      return res.status(400).json({ error: 'Email is required.' })
    }

    const normalizedEmail = email.toLowerCase().trim()

    // Check if account exists (either student or company)
    const exists = await emailExists(normalizedEmail)
    if (!exists) {
      return res.status(404).json({ error: 'No account found with this email.' })
    }

    // Generate and send code (handled by send-verification route logic above)
    // We re-use the same mechanism
    const code = generateCode()
    const expiresAt = new Date(Date.now() + CODE_EXPIRY_MINUTES * 60 * 1000)

    await VerificationCode.deleteMany({ email: normalizedEmail, type: 'password_reset' })

    await VerificationCode.create({
      email: normalizedEmail,
      code,
      type: 'password_reset',
      expiresAt,
    })

    await sendPasswordResetCode(normalizedEmail, code)

    res.json({ success: true, message: 'Password reset code sent to your email.' })
  } catch (err) {
    console.error('POST /api/auth/forgot-password error:', err)
    res.status(500).json({ error: 'Failed to send reset code.' })
  }
})

// ─── Reset Password ────────────────────────────────────────
router.post('/reset-password', async (req, res) => {
  try {
    const { email, code, newPassword } = req.body
    if (!email || !code || !newPassword) {
      return res.status(400).json({ error: 'Email, code, and new password are required.' })
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long.' })
    }
    if (!/[A-Za-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      return res.status(400).json({ error: 'Password must contain at least one letter and one number.' })
    }

    const normalizedEmail = email.toLowerCase().trim()

    // Verify the reset code
    const record = await VerificationCode.findOne({
      email: normalizedEmail,
      code,
      type: 'password_reset',
      used: false,
      expiresAt: { $gt: new Date() },
    })

    if (!record) {
      return res.status(400).json({ error: 'Invalid or expired reset code.' })
    }

    // Find the user (student or company)
    let user = await Student.findOne({ email: normalizedEmail })
    let role = 'student'
    if (!user) {
      user = await Company.findOne({ email: normalizedEmail })
      role = 'company'
    }

    if (!user) {
      return res.status(404).json({ error: 'User not found.' })
    }

    // Update password
    const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS)
    user.password = hashedPassword
    await user.save()

    // Mark code as used
    record.used = true
    await record.save()

    res.json({ success: true, message: 'Password reset successfully. You can now log in with your new password.' })
  } catch (err) {
    console.error('POST /api/auth/reset-password error:', err)
    res.status(500).json({ error: 'Failed to reset password.' })
  }
})

// ─── PUT /api/auth/change-password — JWT protected ───────
router.put('/change-password', async (req, res) => {
  try {
    const tokenData = getUserFromToken(req);
    if (!tokenData) {
      return res.status(401).json({ error: 'Not authenticated. Please login.' });
    }

    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required.' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters long.' });
    }
    if (!/[A-Za-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      return res.status(400).json({ error: 'New password must contain at least one letter and one number.' });
    }

    if (currentPassword === newPassword) {
      return res.status(400).json({ error: 'New password must be different from current password.' });
    }

    const Model = getUserModel(tokenData.role);
    const user = await Model.findById(tokenData.id);

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Current password is incorrect.' });
    }

    // Hash and save new password
    const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);
    user.password = hashedPassword;
    await user.save();

    res.json({ success: true, message: 'Password changed successfully.' });
  } catch (err) {
    console.error('PUT /api/auth/change-password error:', err);
    res.status(500).json({ error: 'Failed to change password.' });
  }
});

module.exports = router;
