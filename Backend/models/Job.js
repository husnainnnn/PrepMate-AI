const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  companyName: { type: String, required: true },
  jobTitle: { type: String, required: true },
  location: { type: String, default: 'Remote' },
  requiredSkills: { type: [String], default: [] },
  applyUrl: { type: String, default: '#' },
  postedBy: { type: String, default: 'company', enum: ['admin', 'company'] },
}, { timestamps: true });

module.exports = mongoose.model('Job', jobSchema);
