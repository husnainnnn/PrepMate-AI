/**
 * Seed script — populates MongoDB with initial data.
 * Run: node scripts/seed.js
 */
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Student = require('../models/Student');
const Company = require('../models/Company');
const Job = require('../models/Job');
const Application = require('../models/Application');
const Interview = require('../models/Interview');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/prepmate';

async function seed() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');

  // Clear existing data
  await Student.deleteMany({});
  await Company.deleteMany({});
  await Job.deleteMany({});
  await Application.deleteMany({});
  await Interview.deleteMany({});
  console.log('Cleared existing data');

  // ─── Create seed student ──────────────────────────────
  const hashedPw = await bcrypt.hash('12345', 10);
  const student = new Student({
    fullName: 'Test Student',
    email: 'student@test.com',
    password: hashedPw,
    phone: '+92 300 0000000',
    linkedin: 'linkedin.com/in/teststudent',
    github: 'github.com/teststudent',
    portfolio: 'teststudent.dev',
    bio: 'A passionate developer',
    field: 'Software Development',
    skills: ['React', 'Nest.js', 'Node.js', 'Express.js'],
    experience: 'fresher',
    education: [
      { institute: 'FAST University', degree: 'BSCS', startYear: '2023', endYear: '2027' }
    ],
    stats: {
      interviewCount: 0,
      totalScoreSum: 0,
      avgScore: 0,
      interviewsRemaining: 4,
      plan: 'free',
      applicationsCount: 0,
    },
  });
  await student.save();
  console.log('Seed student created');

  // ─── Create seed companies ────────────────────────────
  const companyData = [
    { companyName: 'Bytewave Systems', email: 'hr@bytewave.com', website: 'https://bytewave.com', description: 'Leading software development company specializing in web and mobile applications.' },
    { companyName: 'Nimbus Cloud Co.', email: 'careers@nimbuscloud.com', website: 'https://nimbuscloud.com', description: 'Cloud infrastructure and DevOps consulting firm.' },
    { companyName: 'DataForge Analytics', email: 'hiring@dataforge.io', website: 'https://dataforge.io', description: 'Data analytics and machine learning solutions provider.' },
    { companyName: 'PixelCraft Studio', email: 'hello@pixelcraft.design', website: 'https://pixelcraft.design', description: 'Award-winning UI/UX design agency.' },
    { companyName: 'Orbit Mobile', email: 'jobs@orbitmobile.dev', website: 'https://orbitmobile.dev', description: 'Mobile app development studio focused on React Native and Flutter.' },
    { companyName: 'ServerSide Labs', email: 'careers@serverside.io', website: 'https://serverside.io', description: 'Backend infrastructure and API development company.' },
    { companyName: 'TechFlow Solutions', email: 'hr@techflow.pk', website: 'https://techflow.pk', description: 'DevOps and cloud-native solutions for enterprises.' },
    { companyName: 'AI Vision Labs', email: 'team@aivisionlabs.ai', website: 'https://aivisionlabs.ai', description: 'Cutting-edge AI research lab focusing on computer vision and NLP.' },
  ];

  const createdCompanies = await Company.insertMany(
    companyData.map(c => ({
      ...c,
      password: hashedPw,
      role: 'company',
    }))
  );
  console.log(`${createdCompanies.length} seed companies created`);

  // ─── Create seed jobs ─────────────────────────────────
  const jobData = [
    { companyIdx: 0, jobTitle: 'Frontend Developer', location: 'Lahore, Pakistan (Remote)', skills: ['react', 'typescript', 'css', 'javascript', 'next.js'] },
    { companyIdx: 1, jobTitle: 'Full Stack Developer', location: 'Karachi, Pakistan', skills: ['node.js', 'react', 'mongodb', 'express', 'javascript'] },
    { companyIdx: 2, jobTitle: 'Data Analyst', location: 'Remote', skills: ['python', 'sql', 'excel', 'power bi', 'statistics'] },
    { companyIdx: 3, jobTitle: 'UI/UX Designer', location: 'Islamabad, Pakistan', skills: ['figma', 'ui design', 'prototyping', 'css'] },
    { companyIdx: 4, jobTitle: 'React Native Developer', location: 'Remote', skills: ['react native', 'javascript', 'typescript', 'react'] },
    { companyIdx: 5, jobTitle: 'Backend Engineer', location: 'Lahore, Pakistan', skills: ['node.js', 'express', 'sql', 'docker', 'aws'] },
    { companyIdx: 6, jobTitle: 'DevOps Engineer', location: 'Islamabad, Pakistan', skills: ['docker', 'kubernetes', 'aws', 'ci/cd', 'linux'] },
    { companyIdx: 7, jobTitle: 'Machine Learning Engineer', location: 'Remote', skills: ['python', 'tensorflow', 'pytorch', 'nlp', 'computer vision'] },
  ];

  const jobs = jobData.map(j => ({
    companyId: createdCompanies[j.companyIdx]._id,
    companyName: createdCompanies[j.companyIdx].companyName,
    jobTitle: j.jobTitle,
    location: j.location,
    requiredSkills: j.skills,
    applyUrl: '#',
    postedBy: 'admin',
  }));

  await Job.insertMany(jobs);
  console.log(`${jobs.length} seed jobs created`);

  // ─── Create seed applications ─────────────────────────
  const appData = [
    { companyIdx: 0, jobTitle: 'Frontend Developer', location: 'Lahore, Pakistan', stage: 'shortlisted' },
    { companyIdx: 1, jobTitle: 'Full Stack Developer', location: 'Karachi, Pakistan', stage: 'under_review', rejected: true },
    { companyIdx: 4, jobTitle: 'React Native Developer', location: 'Remote', stage: 'hired' },
    { companyIdx: 2, jobTitle: 'Data Analyst', location: 'Remote', stage: 'applied' },
    { companyIdx: 3, jobTitle: 'UI/UX Designer', location: 'Islamabad, Pakistan', stage: 'shortlisted', rejected: true },
  ];

  const apps = appData.map(a => ({
    studentId: student._id,
    companyName: createdCompanies[a.companyIdx].companyName,
    jobTitle: a.jobTitle,
    location: a.location,
    appliedDate: new Date(Date.now() - Math.random() * 90 * 86400000).toISOString().split('T')[0],
    isRejected: !!a.rejected,
    currentStage: a.stage,
  }));

  await Application.insertMany(apps);
  console.log(`${apps.length} seed applications created`);

  // Update student's applicationsCount
  await Student.findByIdAndUpdate(student._id, { $set: { 'stats.applicationsCount': apps.length } });

  console.log('\nSeed complete!');
  console.log('Seed student created — email: student@test.com / password: 12345\n');
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed error:', err.message);
  process.exit(1);
});
