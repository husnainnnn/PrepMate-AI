const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  // ── Participants ─────────────────────────────────────────
  senderId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  senderRole: { type: String, enum: ['student', 'company'], required: true },
  receiverId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  receiverRole: { type: String, enum: ['student', 'company'], required: true },

  // ── Context (optional, links to a specific application) ──
  applicationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Application', default: null },
  jobId: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', default: null },
  jobTitle: { type: String, default: '' },
  companyName: { type: String, default: '' },

  // ── Message Content ─────────────────────────────────────
  content: { type: String, required: true, trim: true },

  // ── Read Status ─────────────────────────────────────────
  readAt: { type: Date, default: null },
}, { timestamps: true });

// Index for fetching conversations efficiently
messageSchema.index({ senderId: 1, receiverId: 1 });
messageSchema.index({ receiverId: 1, readAt: 1 });

module.exports = mongoose.model('Message', messageSchema);
