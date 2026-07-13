const Notification = require('../models/Notification');
const LiveInterview = require('../models/LiveInterview');

/**
 * Create a notification and emit it via Socket.io
 * @param {Object} req - Express request object (has app with io)
 * @param {Object} data - Notification data
 */
async function createNotification(req, data) {
  try {
    const notification = new Notification({
      userId: data.userId,
      userRole: data.userRole || 'student',
      type: data.type,
      title: data.title,
      message: data.message,
      link: data.link || '',
      relatedId: data.relatedId || '',
    });

    await notification.save();

    // Emit real-time via Socket.io
    const io = req.app.get('io');
    if (io) {
      const notifObj = notification.toObject();
      io.to(data.userId.toString()).emit('notification', notifObj);
    }

    return notification;
  } catch (err) {
    console.error('Failed to create notification:', err.message);
    return null;
  }
}

/**
 * Check for interviews starting within the next 1 minute
 * and create reminder notifications (if not already sent).
 * @param {Object} req - Express request object
 * @param {string} userId - Student user ID
 * @param {string} userRole - 'student' or 'company'
 */
async function checkInterviewReminders(req, userId, userRole = 'student') {
  try {
    const now = new Date();
    const oneMinLater = new Date(now.getTime() + 60000);

    const upcomingInterviews = await LiveInterview.find({
      studentId: userId,
      status: 'scheduled',
      scheduledTime: { $gte: now, $lte: oneMinLater },
    }).select('_id jobTitle companyName scheduledTime').lean();

    for (const iv of upcomingInterviews) {
      // Check if reminder already sent (dedup)
      const existingReminder = await Notification.findOne({
        userId,
        type: 'interview_reminder',
        relatedId: iv._id.toString(),
      }).lean();

      if (!existingReminder) {
        const timeStr = new Date(iv.scheduledTime).toLocaleTimeString('en-US', {
          hour: '2-digit', minute: '2-digit'
        });
        await createNotification(req, {
          userId,
          userRole,
          type: 'interview_reminder',
          title: 'Interview Starting Soon! ⏰',
          message: `Your interview for ${iv.jobTitle} at ${iv.companyName} starts in 1 minute (${timeStr}). Join now!`,
          link: '/student/live-interviews',
          relatedId: iv._id.toString(),
        });
      }
    }
  } catch (err) {
    // Non-critical — don't block the request
    console.error('checkInterviewReminders error:', err.message);
  }
}

module.exports = { createNotification, checkInterviewReminders };
