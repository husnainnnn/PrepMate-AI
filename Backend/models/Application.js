const mongoose = require('mongoose');

const applicationSchema = new mongoose.Schema({
  // ── Student Reference ────────────────────────────────────
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true, index: true },
  jobId: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true, index: true },

  // ── Job Info (snapshot at time of application) ──────────
  companyName: { type: String, required: true },
  jobTitle: { type: String, required: true },
  location: { type: String, default: '' },

  // ── Applicant Profile (snapshot) ─────────────────────────
  fullName: { type: String, default: '' },
  email: { type: String, default: '' },
  phone: { type: String, default: '' },
  skills: { type: [String], default: [] },
  education: { type: String, default: '' }, // short summary e.g. "BSCS, FAST University 2022-2026"
  experience: { type: String, default: '' },
  resumeUrl: { type: String, default: '' },
  coverLetter: { type: String, default: '' },
  linkedin: { type: String, default: '' },
  github: { type: String, default: '' },
  portfolio: { type: String, default: '' },

  // ── Visibility ──────────────────────────────────────────
  hiddenFromCompany: { type: Boolean, default: false }, // soft delete by company

  // ── Status ───────────────────────────────────────────────
  appliedDate: { type: String, default: () => new Date().toISOString().split('T')[0] },
  isRejected: { type: Boolean, default: false },
  currentStage: {
    type: String,
    default: 'applied',
    enum: ['applied', 'under_review', 'shortlisted', 'interview', 'hired', 'rejected'],
  },
}, { timestamps: true });

module.exports = mongoose.model('Application', applicationSchema);
