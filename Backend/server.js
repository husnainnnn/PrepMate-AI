const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const http = require('http');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { Server } = require('socket.io');

// Load .env file
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '.env') });

// ─── Security: Validate critical env vars on startup ─────
const REQUIRED_ENV = ['JWT_SECRET', 'MONGO_URI'];
const missing = REQUIRED_ENV.filter(k => !process.env[k]);
if (missing.length > 0) {
  console.error(`FATAL: Missing required environment variables: ${missing.join(', ')}`);
  console.error('Create a .env file from .env.example with these values.');
  process.exit(1);
}

// Warn if JWT_SECRET looks like default
if (process.env.JWT_SECRET === 'change-me-in-production' || process.env.JWT_SECRET === 'your-secret-key') {
  console.warn('⚠️  WARNING: JWT_SECRET is set to a default value! Change it in production.');
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
const aboutRoutes = require('./routes/about');

const app = express();
const PORT = process.env.PORT || 3001;

// ─── HTTP Server + Socket.io ────────────────────────────
const server = http.createServer(app);
const isDev = process.env.NODE_ENV !== 'production'
const allowedIoOrigins = isDev
  ? '*'  // Dev mode: allow any origin (safe on local network)
  : [process.env.FRONTEND_URL || 'http://localhost:5173'];
const io = new Server(server, {
  cors: { origin: allowedIoOrigins, methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] },
});
app.set('io', io);

// Socket.io — real-time messaging + WebRTC signaling
const jwt = require('jsonwebtoken');
io.on('connection', (socket) => {
  // ─── Authenticated room join ────────────────────────────
  // Client must send a valid JWT to join a user's room
  socket.on('join', (userId, token) => {
    if (!userId || !token) return;
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      // Only allow joining your own room (or admin can join any)
      if (decoded.id === userId || decoded.role === 'admin') {
        socket.join(userId.toString());
      }
    } catch {
      // Invalid token — don't join
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

// ─── Webhook route MUST come before express.json() ───────
// Stripe needs the raw body to verify webhook signatures
app.post('/api/payments/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  // Forward raw body to the payments router
  const paymentRoutes = require('./routes/payments');
  paymentRoutes.handleWebhook(req, res);
});

// ─── Security Middleware ────────────────────────────────────

// Security headers (helmet)
app.use(helmet());

// Rate limiting — 100 requests per minute per IP
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again later.' },
});
app.use('/api/', limiter);

// Stricter rate limit for file uploads (5 per minute)
const uploadLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many uploads. Please slow down.' },
});
app.use('/api/upload', uploadLimiter);

// Stricter rate limit for auth endpoints (10 requests per minute)
const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Please try again later.' },
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/company-login', authLimiter);
app.use('/api/admin/login', authLimiter);
app.use('/api/auth/signup', authLimiter);
app.use('/api/auth/company-signup', authLimiter);

// CORS — restrict to frontend origin in production
const allowedOrigins = isDev
  ? true  // Dev mode: echo back request origin (safe on local network)
  : [process.env.FRONTEND_URL || 'http://localhost:5173'];
app.use(cors({
  origin: allowedOrigins,
  credentials: true,
}));

app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ─── Import auth middleware ────────────────────────────────
const { requireAuth } = require('./middleware/auth');

// ─── Routes (public endpoints first, protected after) ────

// ─── Apply input validation & sanitization to all routes ──
const { sanitizeBody } = require('./middleware/validate');

// Public:
app.use('/api/auth', sanitizeBody, authRoutes); // login/signup/me with NoSQL injection protection
app.use('/api/about', aboutRoutes); // GET is public

// Protected (require valid JWT):
app.use('/api/resume', requireAuth, sanitizeBody, resumeRoutes);
app.use('/api/jobs', jobsRoutes); // public listing + match, individual handlers check auth
app.use('/api/applications', requireAuth, sanitizeBody, applicationsRoutes);
app.use('/api/upload', requireAuth, uploadRoutes);
app.use('/api/companies', sanitizeBody, companyDashboardRoutes);
app.use('/api/companies', sanitizeBody, companiesRoutes);
app.use('/api/interview', requireAuth, sanitizeBody, interviewRoutes);
app.use('/api/stats', requireAuth, statsRoutes);
app.use('/api/company', requireAuth, sanitizeBody, companyJobsRoutes);
app.use('/api/jobs', jobsExtendedRoutes); // partial auth, individual handlers check
app.use('/api/messages', requireAuth, sanitizeBody, messagesRoutes);
app.use('/api/live-interviews', requireAuth, sanitizeBody, liveInterviewsRoutes);
app.use('/api/feedback', requireAuth, sanitizeBody, feedbackRoutes);
app.use('/api/resources', requireAuth, resourcesRoutes);
app.use('/api/notifications', requireAuth, notificationRoutes);
app.use('/api/support', requireAuth, sanitizeBody, supportRoutes);
app.use('/api/admin', adminRoutes); // admin routes have own role check
app.use('/api/payments', require('./routes/payments'));

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
