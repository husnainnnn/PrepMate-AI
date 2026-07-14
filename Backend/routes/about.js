const express = require('express');
const router = express.Router();
const About = require('../models/About');

const JWT_SECRET = process.env.JWT_SECRET || '';

function getUserFromToken(req) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return null;
  try {
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(auth.split(' ')[1], JWT_SECRET);
    return decoded;
  } catch {
    return null;
  }
}

// ─── GET /api/about — Public: anyone can read about content ────────
router.get('/', async (req, res) => {
  try {
    const about = await About.getSingleton();
    res.json({ about });
  } catch (err) {
    console.error('GET /api/about error:', err);
    res.status(500).json({ error: 'Failed to fetch about content.' });
  }
});

// ─── PUT /api/admin/about — Admin only: update about content ──────
router.put('/admin/about', async (req, res) => {
  try {
    const tokenData = getUserFromToken(req);
    if (!tokenData || tokenData.role !== 'admin') {
      return res.status(401).json({ error: 'Not authenticated as admin.' });
    }

    const { prepMateImage, prepMateText, developers } = req.body;

    let about = await About.getSingleton();
    if (prepMateImage !== undefined) about.prepMateImage = prepMateImage;
    if (prepMateText !== undefined) about.prepMateText = prepMateText;
    if (developers !== undefined) about.developers = developers;
    about.updatedAt = new Date();

    await about.save();

    // Notify connected clients about the content update
    try {
      const io = req.app.get('io');
      if (io) {
        io.emit('about_updated', { updatedAt: about.updatedAt });
      }
    } catch { /* non-critical */ }

    res.json({ success: true, about });
  } catch (err) {
    console.error('PUT /api/admin/about error:', err);
    res.status(500).json({ error: 'Failed to update about content.' });
  }
});

module.exports = router;
