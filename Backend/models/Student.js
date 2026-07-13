const mongoose = require('mongoose');

const educationSchema = new mongoose.Schema({
  institute: String,
  degree: String,
  startYear: String,
  endYear: String,
}, { _id: false });

const studentSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  role: { type: String, default: 'student' },
  phone: { type: String, default: '' },
  linkedin: { type: String, default: '' },
  github: { type: String, default: '' },
  portfolio: { type: String, default: '' },
  bio: { type: String, default: '' },
  field: { type: String, default: '' },
  skills: { type: [String], default: [] },
  experience: { type: String, default: 'fresher' },
  education: { type: [educationSchema], default: [] },
  introduction: { type: String, default: '' },
  // ─── Cached AI Feedback ───
  cachedFeedback: {
    text: { type: String, default: '' },
    profileHash: { type: String, default: '' },
    generatedAt: { type: Date, default: null },
  },

  // ─── Cached AI Resources ───
  cachedResources: {
    items: { type: [mongoose.Schema.Types.Mixed], default: [] },
    profileHash: { type: String, default: '' },
    generatedAt: { type: Date, default: null },
  },

  // ─── Stats & Analytics ───
  stats: {
    interviewCount: { type: Number, default: 0 },
    totalScoreSum: { type: Number, default: 0 },
    avgScore: { type: Number, default: 0 },
    practiceQuestionsCount: { type: Number, default: 0 },
    practiceSessionsCount: { type: Number, default: 0 },
    loginStreak: { type: Number, default: 0 },
    lastLoginDate: { type: String, default: '' },
    interviewsRemaining: { type: Number, default: 4 },
    plan: { type: String, default: 'free', enum: ['free', 'pro'] },
    applicationsCount: { type: Number, default: 0 },
    lastInterviewDate: { type: String, default: '' },
  },
}, { timestamps: true });

module.exports = mongoose.model('Student', studentSchema);
