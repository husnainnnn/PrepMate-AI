const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const Company = require('../models/Company');
const Job = require('../models/Job');

const JWT_SECRET = process.env.JWT_SECRET || '';

function getUserFromToken(req) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return null;
  try {
    return jwt.verify(auth.split(' ')[1], JWT_SECRET);
  } catch {
    return null;
  }
}

// GET /api/companies — list all registered companies
router.get('/', async (req, res) => {
  try {
    const companies = await Company.find({}).select('-password').lean();
    res.json({ companies });
  } catch (err) {
    console.error('GET /api/companies error:', err);
    res.status(500).json({ error: 'Failed to fetch companies' });
  }
});

// GET /api/companies/:id — get a single company by ID
router.get('/:id', async (req, res) => {
  try {
    const company = await Company.findById(req.params.id).select('-password').lean();
    if (!company) return res.status(404).json({ error: 'Company not found' });
    res.json(company);
  } catch (err) {
    console.error('GET /api/companies/:id error:', err);
    res.status(500).json({ error: 'Failed to fetch company' });
  }
});

// POST /api/companies/register — a new company joins the platform
router.post('/register', async (req, res) => {
  try {
    const { companyName, email, password, website, description, logo } = req.body;
    if (!companyName || !email || !password) {
      return res.status(400).json({ error: 'Company name, email, and password are required' });
    }

    const existing = await Company.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ error: 'A company with this email is already registered' });
    }

    const hashedPw = await bcrypt.hash(password, 10);

    const newCompany = new Company({
      companyName,
      email: email.toLowerCase(),
      password: hashedPw,
      website: website || '',
      description: description || '',
      logo: logo || '',
    });
    await newCompany.save();

    res.status(201).json({
      id: newCompany._id,
      companyName: newCompany.companyName,
      email: newCompany.email,
      website: newCompany.website,
      description: newCompany.description,
    });
  } catch (err) {
    console.error('POST /api/companies/register error:', err);
    res.status(500).json({ error: 'Failed to register company' });
  }
});

// POST /api/companies/jobs — a company posts a new job
router.post('/jobs', async (req, res) => {
  try {
    const { companyId, jobTitle, location, requiredSkills, applyUrl } = req.body;
    if (!companyId || !jobTitle) {
      return res.status(400).json({ error: 'Company ID and job title are required' });
    }

    // Verify company exists
    const company = await Company.findById(companyId);
    if (!company) {
      return res.status(404).json({ error: 'Company not found. Please register first.' });
    }

    const newJob = new Job({
      companyId,
      companyName: company.companyName,
      jobTitle,
      location: location || 'Remote',
      requiredSkills: requiredSkills || [],
      applyUrl: applyUrl || '#',
      postedBy: 'company',
    });
    await newJob.save();

    res.status(201).json(newJob.toObject());
  } catch (err) {
    console.error('POST /api/companies/jobs error:', err);
    res.status(500).json({ error: 'Failed to post job' });
  }
});

// GET /api/companies/:id/jobs — get all jobs posted by a specific company
router.get('/:id/jobs', async (req, res) => {
  try {
    const companyJobs = await Job.find({ companyId: req.params.id }).sort({ createdAt: -1 }).lean();
    res.json({ jobs: companyJobs });
  } catch (err) {
    console.error('GET /api/companies/:id/jobs error:', err);
    res.status(500).json({ error: 'Failed to fetch company jobs' });
  }
});

module.exports = router;
