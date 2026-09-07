import express from 'express';
import { db } from '../db/database.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { notificationService } from '../services/notificationService.js';

const router = express.Router();

// GET /api/announcements - List announcements
router.get('/', authenticateToken, (req, res) => {
  const { category } = req.query;
  let list = db.getCollection('announcements');

  if (category && category !== 'All') {
    list = list.filter(a => a.category === category);
  }

  const sorted = [...list].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(sorted);
});

// POST /api/announcements - Create announcement
router.post('/', authenticateToken, requireRole(['super_admin', 'hr_admin', 'admin']), (req, res) => {
  const { title, description, category = 'Company', visibility = 'All' } = req.body;

  if (!title || !description) {
    return res.status(400).json({ error: 'Title and description are required' });
  }

  const announcement = db.insert('announcements', {
    title,
    description,
    category,
    visibility,
    created_by: req.user.id,
    author_name: req.user.name,
    author_role: req.user.designation || 'HR Administration'
  });

  // Notify all employees
  notificationService.notifyAnnouncement(announcement);

  res.status(201).json({ message: 'Announcement created and published', announcement });
});

// PUT /api/announcements/:id - Edit announcement
router.put('/:id', authenticateToken, requireRole(['super_admin', 'hr_admin', 'admin']), (req, res) => {
  const { title, description, category, visibility } = req.body;
  const existing = db.findById('announcements', req.params.id);
  if (!existing) return res.status(404).json({ error: 'Announcement not found' });

  const updated = db.updateById('announcements', req.params.id, {
    title: title || existing.title,
    description: description || existing.description,
    category: category || existing.category,
    visibility: visibility || existing.visibility
  });

  res.json({ message: 'Announcement updated successfully', announcement: updated });
});

// DELETE /api/announcements/:id - Delete announcement
router.delete('/:id', authenticateToken, requireRole(['super_admin', 'hr_admin', 'admin']), (req, res) => {
  const deleted = db.deleteById('announcements', req.params.id);
  if (!deleted) return res.status(404).json({ error: 'Announcement not found' });
  res.json({ message: 'Announcement deleted successfully' });
});

export default router;
