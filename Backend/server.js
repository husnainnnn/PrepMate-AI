const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');

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
const companyDashboardRoutes = require('./routes/companyDashboard');
const companyJobsRoutes = require('./routes/companyJobs');
const jobsExtendedRoutes = require('./routes/jobsExtended');
const messagesRoutes = require('./routes/messages');
const liveInterviewsRoutes = require('./routes/liveInterviews');
const feedbackRoutes = require('./routes/feedback');
const resourcesRoutes = require('./routes/resources');
const notificationRoutes = require('./routes/notifications');
const supportRoutes = require('./routes/support');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 3001;

// ─── HTTP Server + Socket.io ────────────────────────────
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] },
});
app.set('io', io);

// Socket.io — real-time messaging + WebRTC signaling
io.on('connection', (socket) => {
  socket.on('join', (userId) => {
    if (userId) {
      socket.join(userId.toString());
    }
  });

  // ─── WebRTC Signaling for Live Interviews ────────────
  socket.on('join-room', ({ roomId, userId, userName }) => {
    socket.join(roomId);
    socket.to(roomId).emit('user-joined', { userId, userName });
    // Let the existing participant know to send offer
    const clients = io.sockets.adapter.rooms.get(roomId);
    if (clients && clients.size > 1) {
      socket.to(roomId).emit('ready-to-offer');
    }
  });

  socket.on('leave-room', ({ roomId }) => {
    socket.leave(roomId);
    socket.to(roomId).emit('peer-left');
  });

  socket.on('offer', ({ roomId, sdp }) => {
    socket.to(roomId).emit('offer', { sdp });
  });

  socket.on('answer', ({ roomId, sdp }) => {
    socket.to(roomId).emit('answer', { sdp });
  });

  socket.on('ice-candidate', ({ roomId, candidate }) => {
    socket.to(roomId).emit('ice-candidate', { candidate });
  });
});

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
app.use('/api/companies', companyDashboardRoutes); // MUST be before companiesRoutes (/:id would catch "dashboard")
app.use('/api/companies', companiesRoutes);
app.use('/api/interview', interviewRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/company', companyJobsRoutes);
app.use('/api/jobs', jobsExtendedRoutes);
app.use('/api/messages', messagesRoutes);
app.use('/api/live-interviews', liveInterviewsRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/resources', resourcesRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/support', supportRoutes);
app.use('/api/admin', adminRoutes);

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

  // Seed super admin
  const Admin = require('./models/Admin');
  await Admin.seedSuperAdmin();

  server.listen(PORT, () => {
    console.log(`Backend server running on http://localhost:${PORT}`);
  });
}
start();
