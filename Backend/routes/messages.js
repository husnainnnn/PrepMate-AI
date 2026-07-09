const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Message = require('../models/Message');
const Application = require('../models/Application');
const Job = require('../models/Job');
const Company = require('../models/Company');

const JWT_SECRET = process.env.JWT_SECRET || 'prepmate-ai-jwt-secret-2026';

function getUserFromToken(req) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return null;
  try {
    return jwt.verify(auth.split(' ')[1], JWT_SECRET);
  } catch {
    return null;
  }
}

// ─── POST /api/messages ─────────────────────────────────────
// Send a message from company to student OR student to company
router.post('/', async (req, res) => {
  try {
    const tokenData = getUserFromToken(req);
    if (!tokenData) return res.status(401).json({ error: 'Not authenticated.' });

    const { receiverId, receiverRole, applicationId, jobId, jobTitle, companyName, content } = req.body;

    if (!receiverId || !content?.trim()) {
      return res.status(400).json({ error: 'Receiver and content are required.' });
    }

    const message = new Message({
      senderId: tokenData.id,
      senderRole: tokenData.role,
      receiverId,
      receiverRole: receiverRole || (tokenData.role === 'company' ? 'student' : 'company'),
      applicationId: applicationId || null,
      jobId: jobId || null,
      jobTitle: jobTitle || '',
      companyName: companyName || '',
      content: content.trim(),
    });

    await message.save();
    res.status(201).json({ message: message.toObject() });
  } catch (err) {
    console.error('POST /api/messages error:', err);
    res.status(500).json({ error: 'Failed to send message.' });
  }
});

// ─── GET /api/messages/conversations ────────────────────────
// Get all conversations for the current user (last message + unread count)
router.get('/conversations', async (req, res) => {
  try {
    const tokenData = getUserFromToken(req);
    if (!tokenData) return res.status(401).json({ error: 'Not authenticated.' });

    const userId = tokenData.id;

    // Find all messages where user is sender or receiver
    const messages = await Message.find({
      $or: [{ senderId: userId }, { receiverId: userId }]
    }).sort({ createdAt: -1 }).lean();

    // Group by the other participant
    const conversationMap = new Map();
    for (const msg of messages) {
      const otherId = msg.senderId.toString() === userId ? msg.receiverId.toString() : msg.senderId.toString();
      const otherRole = msg.senderId.toString() === userId ? msg.receiverRole : msg.senderRole;

      if (!conversationMap.has(otherId)) {
        conversationMap.set(otherId, {
          otherId,
          otherRole,
          lastMessage: msg.content,
          lastMessageDate: msg.createdAt,
          unreadCount: 0,
          jobTitle: msg.jobTitle || '',
          companyName: msg.companyName || '',
          applicationId: msg.applicationId || null,
        });
      }

      // Count unread
      if (msg.receiverId.toString() === userId && !msg.readAt) {
        const conv = conversationMap.get(otherId);
        conv.unreadCount = (conv.unreadCount || 0) + 1;
      }
    }

    // If company, also check for shortlisted/hired applicants without messages yet
    if (tokenData.role === 'company') {
      const company = await Company.findById(tokenData.id);
      if (company) {
        const jobs = await Job.find({ companyId: company._id }).select('_id jobTitle').lean();
        const jobIds = jobs.map(j => j._id);
        const jobTitles = {};
        jobs.forEach(j => { jobTitles[j._id.toString()] = j.jobTitle; });

        const apps = await Application.find({
          jobId: { $in: jobIds },
          currentStage: { $in: ['shortlisted', 'hired'] },
          hiddenFromCompany: { $ne: true },
        }).sort({ updatedAt: -1 }).lean();

        for (const app of apps) {
          const sid = app.studentId?.toString();
          if (sid && !conversationMap.has(sid)) {
            conversationMap.set(sid, {
              otherId: sid,
              otherRole: 'student',
              lastMessage: `Shortlisted for ${app.jobTitle}`,
              lastMessageDate: app.updatedAt || app.createdAt,
              unreadCount: 0,
              jobTitle: app.jobTitle || '',
              companyName: app.companyName || '',
              applicationId: app._id.toString(),
            });
          }
        }
      }
    }

    // Convert to array and sort by latest message
    const conversations = Array.from(conversationMap.values())
      .sort((a, b) => new Date(b.lastMessageDate).getTime() - new Date(a.lastMessageDate).getTime());

    // Fetch student names for company, or company names for students
    if (tokenData.role === 'company') {
      const Student = require('../models/Student');
      const studentIds = conversations.map(c => c.otherId);
      const students = await Student.find({ _id: { $in: studentIds } }).select('fullName email').lean();
      const studentMap = {};
      students.forEach(s => { studentMap[s._id.toString()] = s; });
      conversations.forEach(c => {
        const s = studentMap[c.otherId];
        c.otherName = s?.fullName || 'Unknown';
        c.otherEmail = s?.email || '';
      });
    } else {
      const companyIds = conversations.map(c => c.otherId);
      const companies = await Company.find({ _id: { $in: companyIds } }).select('companyName email').lean();
      const companyMap = {};
      companies.forEach(c => { companyMap[c._id.toString()] = c; });
      conversations.forEach(c => {
        const comp = companyMap[c.otherId];
        c.otherName = comp?.companyName || c.companyName || 'Unknown';
        c.otherEmail = comp?.email || '';
      });
    }

    res.json({ conversations });
  } catch (err) {
    console.error('GET /api/messages/conversations error:', err);
    res.status(500).json({ error: 'Failed to fetch conversations.' });
  }
});

// ─── GET /api/messages/:otherUserId ─────────────────────────
// Get all messages between current user and another user
router.get('/:otherUserId', async (req, res) => {
  try {
    const tokenData = getUserFromToken(req);
    if (!tokenData) return res.status(401).json({ error: 'Not authenticated.' });

    const userId = tokenData.id;
    const { otherUserId } = req.params;

    const messages = await Message.find({
      $or: [
        { senderId: userId, receiverId: otherUserId },
        { senderId: otherUserId, receiverId: userId },
      ],
    }).sort({ createdAt: 1 }).lean();

    res.json({ messages });
  } catch (err) {
    console.error('GET /api/messages/:otherUserId error:', err);
    res.status(500).json({ error: 'Failed to fetch messages.' });
  }
});

// ─── DELETE /api/messages/:id ──────────────────────────────
// Delete own message — only the sender can delete their own message
router.delete('/:id', async (req, res) => {
  try {
    const tokenData = getUserFromToken(req);
    if (!tokenData) return res.status(401).json({ error: 'Not authenticated.' });

    const message = await Message.findById(req.params.id);
    if (!message) return res.status(404).json({ error: 'Message not found.' });

    // Only the sender can delete their own message
    if (message.senderId.toString() !== tokenData.id) {
      return res.status(403).json({ error: 'You can only delete your own messages.' });
    }

    await Message.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Message permanently deleted.' });
  } catch (err) {
    console.error('DELETE /api/messages/:id error:', err);
    res.status(500).json({ error: 'Failed to delete message.' });
  }
});

// ─── PATCH /api/messages/read/:otherUserId ──────────────────
// Mark all messages from a specific user as read
router.patch('/read/:otherUserId', async (req, res) => {
  try {
    const tokenData = getUserFromToken(req);
    if (!tokenData) return res.status(401).json({ error: 'Not authenticated.' });

    await Message.updateMany(
      { senderId: req.params.otherUserId, receiverId: tokenData.id, readAt: null },
      { readAt: new Date() }
    );

    res.json({ success: true });
  } catch (err) {
    console.error('PATCH /api/messages/read/:otherUserId error:', err);
    res.status(500).json({ error: 'Failed to mark messages as read.' });
  }
});

module.exports = router;
