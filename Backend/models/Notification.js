const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true,
  },
  userRole: {
    type: String,
    enum: ['student', 'company', 'admin'],
    default: 'student',
  },    type: {
    type: String,
    enum: [
      'new_job',           // New job posted matching student's field
      'message',           // New message received
      'application_shortlisted', // Application shortlisted
      'application_rejected',    // Application rejected
      'application_hired',       // Application hired
      'application_review',      // Application under review
      'interview_scheduled',     // Live interview scheduled
      'interview_cancelled',     // Live interview cancelled
      'interview_reminder',      // 1-min reminder before interview start
      'new_applicant',          // New applicant applied to company's job
      'support_resolved',       // Admin resolved a support ticket
      'company_verified',       // Admin verified a company
    ],
    required: true,
  },
  title: { type: String, required: true },
  message: { type: String, required: true },
  link: { type: String, default: '' },
  relatedId: { type: String, default: '' },
  isRead: { type: Boolean, default: false },
  readAt: { type: Date, default: null },
}, { timestamps: true });

// Index for quick user notifications query
notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, isRead: 1 });

module.exports = mongoose.model('Notification', notificationSchema);
