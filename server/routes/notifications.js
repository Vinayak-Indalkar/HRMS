import express from 'express';
import { db } from '../db/database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// GET /api/notifications - User's notifications
router.get('/', authenticateToken, (req, res) => {
  const notifs = db.find('notifications', n => n.user_id === req.user.id);
  const sorted = [...notifs].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const unreadCount = sorted.filter(n => !n.is_read).length;

  res.json({
    unreadCount,
    notifications: sorted
  });
});

// PATCH /api/notifications/:id/read - Mark one as read
router.patch('/:id/read', authenticateToken, (req, res) => {
  const notif = db.findById('notifications', req.params.id);
  if (!notif || notif.user_id !== req.user.id) {
    return res.status(404).json({ error: 'Notification not found' });
  }

  const updated = db.updateById('notifications', req.params.id, { is_read: true });
  res.json({ notification: updated });
});

// POST /api/notifications/mark-all-read - Mark all as read
router.post('/mark-all-read', authenticateToken, (req, res) => {
  const userNotifs = db.find('notifications', n => n.user_id === req.user.id && !n.is_read);
  userNotifs.forEach(n => {
    db.updateById('notifications', n.id, { is_read: true });
  });

  res.json({ message: 'All notifications marked as read' });
});

export default router;
