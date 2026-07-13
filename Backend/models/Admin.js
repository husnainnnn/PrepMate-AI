const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const adminSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  fullName: { type: String, default: 'Super Admin' },
  role: { type: String, default: 'admin' },
  createdAt: { type: Date, default: Date.now },
});

// ─── Auto-seed superadmin on first use ────────────────────
adminSchema.statics.seedSuperAdmin = async function () {
  const email = 'superadmin@gmail.com';
  const password = 'superAdmin@2026';
  const existing = await this.findOne({ email });
  if (!existing) {
    const hashed = await bcrypt.hash(password, 10);
    await this.create({ email, password: hashed, fullName: 'Super Admin' });
    console.log('✅ Super admin seeded: superadmin@gmail.com');
  }
};

module.exports = mongoose.model('Admin', adminSchema);
