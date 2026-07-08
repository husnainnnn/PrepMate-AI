const mongoose = require('mongoose');

const answerSchema = new mongoose.Schema({
  questionId: Number,
  questionText: String,
  questionType: String,
  questionTopic: String,
  transcript: String,
  durationSeconds: Number,
  fillerWordCount: Number,
  isFollowUp: Boolean,
  answeredByVoice: Boolean,
  originalQuestionId: Number,
  responseLatencyMs: Number,
  speakingDurationMs: Number,
  silentPauses: Number,
  skipped: Boolean,
  lowRelevance: Boolean,
}, { _id: false });

const questionSchema = new mongoose.Schema({
  id: Number,
  type: String,
  text: String,
  topic: String,
  difficulty: String,
}, { _id: false });

const perQuestionFeedbackSchema = new mongoose.Schema({
  questionText: String,
  score: Number,
  errors: [String],
  solutions: [String],
}, { _id: false, suppressReservedKeysWarning: true });

const interviewSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true,
    index: true,
  },
  // Setup data
  field: { type: String, required: true },
  experience: { type: String, required: true },
  skills: [String],

  // Questions & answers
  questions: [questionSchema],
  totalQuestions: Number,
  answers: [answerSchema],

  // Analysis result
  overallScore: { type: Number, default: 0 },
  categories: {
    confidence: { type: Number, default: 0 },
    knowledge: { type: Number, default: 0 },
    communication: { type: Number, default: 0 },
    voiceClarity: { type: Number, default: 0 },
  },
  perQuestionFeedback: [perQuestionFeedbackSchema],
  finalComments: String,
  hireDecision: String,

  // Cheating
  cheated: { type: Boolean, default: false },
  cheatReason: String,

  // Stats
  durationMinutes: { type: Number, default: 0 },
  answeredCount: { type: Number, default: 0 },
  skippedCount: { type: Number, default: 0 },

  // Date
  completedAt: { type: Date, default: Date.now },
}, { timestamps: true });

// Index for quick dashboard queries
interviewSchema.index({ studentId: 1, completedAt: -1 });

module.exports = mongoose.model('Interview', interviewSchema);
