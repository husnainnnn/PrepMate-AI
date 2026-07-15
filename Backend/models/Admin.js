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
  // Read credentials from env or use defaults (must be changed in production)
  const email = process.env.ADMIN_EMAIL || 'superadmin@gmail.com';
  const password = process.env.ADMIN_PASSWORD || 'superAdmin@2026';
  
  if (!process.env.ADMIN_EMAIL && !process.env.ADMIN_PASSWORD) {
    console.warn('⚠️  Using default admin credentials! Set ADMIN_EMAIL and ADMIN_PASSWORD in .env for production.');
  }
  
  const existing = await this.findOne({ email });
  if (!existing) {
    const hashed = await bcrypt.hash(password, 10);
    await this.create({ email, password: hashed, fullName: 'Super Admin' });
    console.log('✅ Super admin seeded:', email);
  }
};

module.exports = mongoose.model('Admin', adminSchema);
