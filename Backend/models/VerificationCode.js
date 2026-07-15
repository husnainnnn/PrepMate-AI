const mongoose = require('mongoose')

const verificationCodeSchema = new mongoose.Schema({
  email: { type: String, required: true, lowercase: true },
  code: { type: String, required: true },
  type: {
    type: String,
    enum: ['email_verification', 'password_reset'],
    required: true,
  },
  expiresAt: { type: Date, required: true },
  used: { type: Boolean, default: false },
}, { timestamps: true })

// Indexes for fast lookups + auto-expiry
verificationCodeSchema.index({ email: 1, type: 1 })
verificationCodeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }) // TTL — MongoDB auto-deletes expired docs

module.exports = mongoose.model('VerificationCode', verificationCodeSchema)
