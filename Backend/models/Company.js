const mongoose = require('mongoose');

const companySchema = new mongoose.Schema({
  // ── Basic Info ──────────────────────────────────────────
  companyName: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  role: { type: String, default: 'company' },

  // ── Branding ────────────────────────────────────────────
  logo: { type: String, default: '' },
  website: { type: String, default: '' },
  description: { type: String, default: '' },

  // ── Leadership ──────────────────────────────────────────
  ceoName: { type: String, default: '' },
  ceoMessage: { type: String, default: '' },

  // ── Contact ─────────────────────────────────────────────
  phone: { type: String, default: '' },
  address: { type: String, default: '' },
  city: { type: String, default: '' },
  country: { type: String, default: '' },

  // ── Company Details ─────────────────────────────────────
  industry: { type: String, default: '' },
  employeeCount: { type: String, default: '' }, // e.g. "1-10", "11-50", "51-200", "201-1000", "1000+"
  foundedYear: { type: String, default: '' },

  // ── Social Links ────────────────────────────────────────
  linkedin: { type: String, default: '' },
  twitter: { type: String, default: '' },
  facebook: { type: String, default: '' },

  // ── Benefits & Culture ──────────────────────────────────
  benefits: { type: [String], default: [] },
  culture: { type: String, default: '' },

  // ── Verification & Plan ─────────────────────────────────
  isVerified: { type: Boolean, default: false },
  plan: { type: String, default: 'free', enum: ['free', 'pro'] },
}, { timestamps: true });

module.exports = mongoose.model('Company', companySchema);
