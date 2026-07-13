const mongoose = require('mongoose');

const supportTicketSchema = new mongoose.Schema({
  // Who submitted this ticket
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  userRole: { type: String, enum: ['student', 'company'], default: 'student' },

  // Type: 'bug', 'feature', 'report-company', 'report-student', 'need-help'
  type: { type: String, enum: ['bug', 'feature', 'report-company', 'report-student', 'need-help'], required: true },

  // Fields for bug reports
  bugName: { type: String, default: '' },
  bugDetails: { type: String, default: '' },

  // Fields for feature suggestions
  featureName: { type: String, default: '' },
  featureDescription: { type: String, default: '' },

  // Fields for report a company (student side)
  companyName: { type: String, default: '' },
  companyReason: { type: String, default: '' },

  // Fields for report a student (company side)
  studentEmail: { type: String, default: '' },
  studentName: { type: String, default: '' },
  studentReason: { type: String, default: '' },

  // Fields for need help
  helpMessage: { type: String, default: '' },

  // Status
  status: { type: String, enum: ['pending', 'reviewed', 'resolved'], default: 'pending' },

  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('SupportTicket', supportTicketSchema);
