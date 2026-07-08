const mongoose = require('mongoose');

const applicationSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', index: true },
  companyName: { type: String, required: true },
  jobTitle: { type: String, required: true },
  location: { type: String, default: '' },
  appliedDate: { type: String, default: () => new Date().toISOString().split('T')[0] },
  isRejected: { type: Boolean, default: false },
  currentStage: {
    type: String,
    default: 'applied',
    enum: ['applied', 'under_review', 'shortlisted', 'interview', 'hired', 'rejected'],
  },
}, { timestamps: true });

module.exports = mongoose.model('Application', applicationSchema);
