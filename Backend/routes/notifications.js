const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Notification = require('../models/Notification');
const { checkInterviewReminders } = require('../helpers/notifications');

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

// ─── GET /api/notifications ─────────────────────────────────
// Get all notifications for the current user, newest first
// Also checks for upcoming interview reminders (1 min before)
router.get('/', async (req, res) => {
  try {
    const tokenData = getUserFromToken(req);
    if (!tokenData) return res.status(401).json({ error: 'Not authenticated.' });

    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);
    const skip = (page - 1) * limit;

    // ── Check for upcoming interview reminders ──────────
    await checkInterviewReminders(req, tokenData.id, tokenData.role || 'student');

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find({ userId: tokenData.id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Notification.countDocuments({ userId: tokenData.id }),
      Notification.countDocuments({ userId: tokenData.id, isRead: false }),
    ]);

    res.json({
      notifications,
      total,
      unreadCount,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error('GET /api/notifications error:', err);
    console.error('Failed to fetch notifications');
  }
});

// ─── GET /api/notifications/unread-count ────────────────────
// Quick endpoint for bell badge count
router.get('/unread-count', async (req, res) => {
  try {
    const tokenData = getUserFromToken(req);
    if (!tokenData) return res.status(401).json({ error: 'Not authenticated.' });

    // ── Check for upcoming interview reminders too ─────
    await checkInterviewReminders(req, tokenData.id, tokenData.role || 'student');

    const count = await Notification.countDocuments({ userId: tokenData.id, isRead: false });
    res.json({ unreadCount: count });
  } catch (err) {
    console.error('GET /api/notifications/unread-count error:', err);
    res.status(500).json({ error: 'Failed to fetch unread count.' });
  }
});

// ─── PATCH /api/notifications/:id/read ──────────────────────
// Mark a single notification as read
router.patch('/:id/read', async (req, res) => {
  try {
    const tokenData = getUserFromToken(req);
    if (!tokenData) return res.status(401).json({ error: 'Not authenticated.' });

    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: tokenData.id },
      { isRead: true, readAt: new Date() },
      { new: true }
    );

    if (!notification) return res.status(404).json({ error: 'Notification not found.' });

    res.json({ notification });
  } catch (err) {
    console.error('PATCH /api/notifications/:id/read error:', err);
    res.status(500).json({ error: 'Failed to mark notification as read.' });
  }
});

// ─── PATCH /api/notifications/read-all ──────────────────────
// Mark all notifications as read for the current user
router.patch('/read-all', async (req, res) => {
  try {
    const tokenData = getUserFromToken(req);
    if (!tokenData) return res.status(401).json({ error: 'Not authenticated.' });

    await Notification.updateMany(
      { userId: tokenData.id, isRead: false },
      { isRead: true, readAt: new Date() }
    );

    res.json({ success: true });
  } catch (err) {
    console.error('PATCH /api/notifications/read-all error:', err);
    res.status(500).json({ error: 'Failed to mark all as read.' });
  }
});

// ─── DELETE /api/notifications/:id ─────────────────────────
// Delete a single notification
router.delete('/:id', async (req, res) => {
  try {
    const tokenData = getUserFromToken(req);
    if (!tokenData) return res.status(401).json({ error: 'Not authenticated.' });

    const notification = await Notification.findOneAndDelete({
      _id: req.params.id,
      userId: tokenData.id,
    });

    if (!notification) return res.status(404).json({ error: 'Notification not found.' });

    res.json({ success: true });
  } catch (err) {
    console.error('DELETE /api/notifications/:id error:', err);
    res.status(500).json({ error: 'Failed to delete notification.' });
  }
});

// ─── DELETE /api/notifications ─────────────────────────────
// Clear all notifications for the current user
router.delete('/', async (req, res) => {
  try {
    const tokenData = getUserFromToken(req);
    if (!tokenData) return res.status(401).json({ error: 'Not authenticated.' });

    await Notification.deleteMany({ userId: tokenData.id });

    res.json({ success: true });
  } catch (err) {
    console.error('DELETE /api/notifications error:', err);
    res.status(500).json({ error: 'Failed to clear notifications.' });
  }
});

module.exports = router;
