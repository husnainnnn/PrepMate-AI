const mongoose = require('mongoose');

const blockedEmailSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
    unique: true,
  },
  blockedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: true,
  },
  blockedAt: {
    type: Date,
    default: Date.now,
  },
  reason: {
    type: String,
    default: 'Violation of platform policies',
  },
});

blockedEmailSchema.index({ email: 1 }, { unique: true });

module.exports = mongoose.model('BlockedEmail', blockedEmailSchema);
