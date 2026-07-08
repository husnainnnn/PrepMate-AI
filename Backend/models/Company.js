const mongoose = require('mongoose');

const companySchema = new mongoose.Schema({
  companyName: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  role: { type: String, default: 'company' },
  website: { type: String, default: '' },
  description: { type: String, default: '' },
  logo: { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('Company', companySchema);
