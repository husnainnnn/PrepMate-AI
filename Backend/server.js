const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

// Load .env file if present (for GEMINI_API_KEY)
try {
  const envPath = path.join(__dirname, '.env');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx > 0) {
          const key = trimmed.slice(0, eqIdx).trim();
          const val = trimmed.slice(eqIdx + 1).trim();
          if (!process.env[key]) process.env[key] = val;
        }
      }
    }
  }
} catch (e) {
  console.warn('Could not load .env file:', e.message);
}

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const authRoutes = require('./routes/auth');
const resumeRoutes = require('./routes/resume');
const jobsRoutes = require('./routes/jobs');
const applicationsRoutes = require('./routes/applications');
const uploadRoutes = require('./routes/upload');
const companiesRoutes = require('./routes/companies');
const interviewRoutes = require('./routes/interview');
const statsRoutes = require('./routes/stats');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/resume', resumeRoutes);
app.use('/api/jobs', jobsRoutes);
app.use('/api/applications', applicationsRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/companies', companiesRoutes);
app.use('/api/interview', interviewRoutes);
app.use('/api/stats', statsRoutes);

// Health check — includes DB status
app.get('/api/health', async (_req, res) => {
  const mongoose = require('mongoose');
  const dbState = mongoose.connection.readyState; // 0=disconnected, 1=connected, 2=connecting, 3=disconnecting
  res.json({ 
    status: dbState === 1 ? 'ok' : 'degraded', 
    db: ['disconnected', 'connected', 'connecting', 'disconnecting'][dbState] || 'unknown',
    timestamp: new Date().toISOString() 
  });
});

// Debug endpoint — check if students exist in MongoDB
app.get('/api/debug/students', async (_req, res) => {
  try {
    const mongoose = require('mongoose');
    const Student = require('./models/Student');
    const count = await Student.countDocuments();
    const sample = await Student.find().limit(3).select('-password');
    res.json({ count, students: sample, db: mongoose.connection.db?.databaseName || 'unknown' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use((err, _req, res, _next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Wait for MongoDB, then start listening
async function start() {
  const connectDB = require('./config/db');
  await connectDB();
  app.listen(PORT, () => {
    console.log(`Backend server running on http://localhost:${PORT}`);
  });
}
start();
