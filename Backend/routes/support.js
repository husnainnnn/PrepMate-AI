const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const SupportTicket = require('../models/SupportTicket');

const JWT_SECRET = process.env.JWT_SECRET || '';

function getUserFromToken(req) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return null;
  try {
    return jwt.verify(auth.split(' ')[1], JWT_SECRET);
  } catch {
    return null;
  }
}

// ─── POST /api/support — Submit a support ticket ──────────
router.post('/', async (req, res) => {
  try {
    const tokenData = getUserFromToken(req);
    if (!tokenData) {
      return res.status(401).json({ error: 'Not authenticated.' });
    }

    const { type, bugName, bugDetails, featureName, featureDescription, companyName, companyReason, studentEmail, studentName, studentReason, helpMessage } = req.body;

    if (!type || !['bug', 'feature', 'report-company', 'report-student', 'need-help'].includes(type)) {
      return res.status(400).json({ error: 'Invalid support type.' });
    }

    if (type === 'bug') {
      if (!bugName || !bugName.trim()) {
        return res.status(400).json({ error: 'Bug name is required.' });
      }
      if (!bugDetails || !bugDetails.trim()) {
        return res.status(400).json({ error: 'Bug details are required.' });
      }
    }

    if (type === 'feature') {
      if (!featureName || !featureName.trim()) {
        return res.status(400).json({ error: 'Feature name is required.' });
      }
      if (!featureDescription || !featureDescription.trim()) {
        return res.status(400).json({ error: 'Feature description is required.' });
      }
    }

    if (type === 'report-company') {
      if (!companyName || !companyName.trim()) {
        return res.status(400).json({ error: 'Company name is required.' });
      }
      if (!companyReason || !companyReason.trim()) {
        return res.status(400).json({ error: 'Reason is required.' });
      }
    }

    if (type === 'report-student') {
      const hasEmail = studentEmail && studentEmail.trim();
      const hasName = studentName && studentName.trim();
      if (!hasEmail && !hasName) {
        return res.status(400).json({ error: 'Student email or name is required.' });
      }
      if (!studentReason || !studentReason.trim()) {
        return res.status(400).json({ error: 'Reason is required.' });
      }
    }

    if (type === 'need-help') {
      if (!helpMessage || !helpMessage.trim()) {
        return res.status(400).json({ error: 'Please describe how we can help you.' });
      }
    }

    const ticket = new SupportTicket({
      userId: tokenData.id,
      userRole: tokenData.role || 'student',
      type,
      bugName: bugName || '',
      bugDetails: bugDetails || '',
      featureName: featureName || '',
      featureDescription: featureDescription || '',
      companyName: companyName || '',
      companyReason: companyReason || '',
      studentEmail: studentEmail || '',
      studentName: studentName || '',
      studentReason: studentReason || '',
      helpMessage: helpMessage || '',
    });

    await ticket.save();

    const messages = {
      bug: 'Bug report submitted successfully. Our team will review it shortly.',
      feature: 'Feature suggestion submitted successfully. Thank you for your input!',
      'report-company': 'Company report submitted. Our team will investigate and take appropriate action.',
      'report-student': 'Student report submitted. Our team will investigate and take appropriate action.',
      'need-help': 'Your request has been submitted. Our support team will get back to you soon.',
    };

    res.status(201).json({
      success: true,
      message: messages[type] || 'Support request submitted successfully.',
    });
  } catch (err) {
    console.error('POST /api/support error:', err);
    res.status(500).json({ error: 'Failed to submit support request.' });
  }
});

module.exports = router;
