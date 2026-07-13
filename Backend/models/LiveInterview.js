const mongoose = require('mongoose');

const liveInterviewSchema = new mongoose.Schema({
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
    index: true,
  },
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true,
    index: true,
  },
  applicationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Application',
    default: null,
  },
  jobId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job',
    default: null,
  },

  // Interview details
  jobTitle: { type: String, default: '' },
  companyName: { type: String, default: '' },
  studentName: { type: String, default: '' },
  studentEmail: { type: String, default: '' },

  // Scheduling
  scheduledTime: { type: Date, required: true },
  durationMinutes: { type: Number, default: 30 },
  notes: { type: String, default: '' },
  roomId: { type: String, required: true, unique: true },

  // Status
  status: {
    type: String,
    enum: ['scheduled', 'in-progress', 'completed', 'cancelled'],
    default: 'scheduled',
  },
  cancelledBy: { type: String, enum: ['company', 'student', ''], default: '' },
  cancelReason: { type: String, default: '' },

  // Feedback
  feedback: { type: String, default: '' },
  rating: { type: Number, default: 0, min: 0, max: 5 },

  // Timestamps
  startedAt: { type: Date, default: null },
  completedAt: { type: Date, default: null },
}, { timestamps: true });

// Indexes for quick queries
liveInterviewSchema.index({ companyId: 1, status: 1, scheduledTime: -1 });
liveInterviewSchema.index({ studentId: 1, status: 1, scheduledTime: -1 });

module.exports = mongoose.model('LiveInterview', liveInterviewSchema);
