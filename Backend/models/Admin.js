const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const adminSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  fullName: { type: String, default: 'Super Admin' },
  role: { type: String, default: 'admin' },
  createdAt: { type: Date, default: Date.now },
});

// ─── Auto-seed superadmin from .env on first run ─────────
// Credentials MUST be set in .env (ADMIN_EMAIL, ADMIN_PASSWORD).
// Once seeded into MongoDB, .env can be removed/ignored.
adminSchema.statics.seedSuperAdmin = async function () {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    console.warn('⚠️  ADMIN_EMAIL / ADMIN_PASSWORD not set in .env — skipping super admin seed.');
    console.warn('   To seed: Add them to .env, restart, then remove from .env.');
    return;
  }

  const existing = await this.findOne({ email: email.toLowerCase() });
  if (!existing) {
    const hashed = await bcrypt.hash(password, 10);
    await this.create({ email: email.toLowerCase(), password: hashed, fullName: 'Super Admin' });
    console.log('✅ Super admin seeded into DB:', email);
    console.log('   You can now remove ADMIN_EMAIL / ADMIN_PASSWORD from .env safely.');
  } else {
    console.log('ℹ️  Super admin already exists in DB — skipping seed.');
  }
};

module.exports = mongoose.model('Admin', adminSchema);
