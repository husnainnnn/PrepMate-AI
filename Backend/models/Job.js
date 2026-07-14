const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema({
  // ── Company Info ─────────────────────────────────────────
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  companyName: { type: String, required: true },
  postedBy: { type: String, default: 'company', enum: ['admin', 'company'] },

  // ── 1. Basic Information ────────────────────────────────
  jobTitle: { type: String, required: true },
  jobCategory: { type: String, default: '' },
  employmentType: {
    type: String,
    default: 'full-time',
    enum: ['full-time', 'part-time', 'internship', 'contract', 'remote-internship'],
  },
  workplace: {
    type: String,
    default: 'remote',
    enum: ['on-site', 'remote', 'hybrid'],
  },

  // ── 2. Location ─────────────────────────────────────────
  country: { type: String, default: '' },
  city: { type: String, default: '' },
  officeAddress: { type: String, default: '' },

  // ── 3. Job Description ──────────────────────────────────
  description: { type: String, default: '' },
  responsibilities: { type: String, default: '' },
  requirements: { type: String, default: '' },

  // ── 4. Skills ───────────────────────────────────────────
  requiredSkills: { type: [String], default: [] },
  preferredSkills: { type: [String], default: [] },

  // ── 5. Eligibility ──────────────────────────────────────
  degree: { type: String, default: 'any', enum: ['bscs', 'bsse', 'bsit', 'bba', 'any'] },
  minCgpa: { type: Number, default: 0 },
  experienceLevel: {
    type: String,
    default: 'fresh',
    enum: ['fresh', '0-1-year', '1-3-years', '3-plus-years'],
  },

  // ── 6. Salary ───────────────────────────────────────────
  salaryType: {
    type: String,
    default: 'fixed',
    enum: ['fixed', 'range', 'unpaid', 'stipend'],
  },
  salaryMin: { type: Number, default: 0 },
  salaryMax: { type: Number, default: 0 },

  // ── 7. Application Details ──────────────────────────────
  applicationDeadline: { type: Date, default: null },
  openPositions: { type: Number, default: 1 },
  hiringProcess: { type: [String], default: [] }, // ['resume-screening', 'technical-test', 'interview', 'hr-interview']

  // ── Status ──────────────────────────────────────────────
  isClosed: { type: Boolean, default: false },
  closedAt: { type: Date, default: null },

}, { timestamps: true });

// ─── Indexes for performance ─────────────────────────────
jobSchema.index({ companyId: 1, createdAt: -1 });
jobSchema.index({ isClosed: 1, createdAt: -1 });
jobSchema.index({ companyId: 1, isClosed: 1 });
jobSchema.index({ requiredSkills: 1 });
jobSchema.index({ jobTitle: 1 });

module.exports = mongoose.model('Job', jobSchema);
