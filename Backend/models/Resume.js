const mongoose = require('mongoose');

const personalInfoSchema = new mongoose.Schema({
  fullName: String,
  email: String,
  phone: String,
  location: String,
  linkedin: String,
  github: String,
  portfolio: String,
  summary: String,
}, { _id: false });

const resumeSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', index: true },
  personalInfo: { type: personalInfoSchema, default: () => ({}) },
  skills: { type: [String], default: [] },
  projects: { type: [mongoose.Schema.Types.Mixed], default: [] },
  experience: { type: [mongoose.Schema.Types.Mixed], default: [] },
  education: { type: [mongoose.Schema.Types.Mixed], default: [] },
  templateId: { type: String, default: 'modern' },
}, { timestamps: true });

module.exports = mongoose.model('Resume', resumeSchema);
