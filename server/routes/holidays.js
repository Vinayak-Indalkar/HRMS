import express from 'express';
import { db } from '../db/database.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

// GET /api/holidays - List all holidays
router.get('/', authenticateToken, (req, res) => {
  const holidays = db.getCollection('holidays');
  const sorted = [...holidays].sort((a, b) => new Date(a.date) - new Date(b.date));
  res.json(sorted);
});

// GET /api/holidays/upcoming - Upcoming holidays
router.get('/upcoming', authenticateToken, (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  const holidays = db.find('holidays', h => h.date >= today);
  const sorted = [...holidays].sort((a, b) => new Date(a.date) - new Date(b.date)).slice(0, 5);
  res.json(sorted);
});

// POST /api/holidays - Add holiday
router.post('/', authenticateToken, requireRole(['super_admin', 'hr_admin', 'admin']), (req, res) => {
  const { name, date, type = 'Mandatory', description } = req.body;
  if (!name || !date) {
    return res.status(400).json({ error: 'Holiday name and date are required' });
  }

  const holiday = db.insert('holidays', {
    name,
    date,
    type,
    description: description || ''
  });

  res.status(201).json({ message: 'Holiday added successfully', holiday });
});

// PUT /api/holidays/:id - Edit holiday
router.put('/:id', authenticateToken, requireRole(['super_admin', 'hr_admin', 'admin']), (req, res) => {
  const { name, date, type, description } = req.body;
  const existing = db.findById('holidays', req.params.id);
  if (!existing) return res.status(404).json({ error: 'Holiday not found' });

  const updated = db.updateById('holidays', req.params.id, {
    name: name || existing.name,
    date: date || existing.date,
    type: type || existing.type,
    description: description !== undefined ? description : existing.description
  });

  res.json({ message: 'Holiday updated successfully', holiday: updated });
});

// DELETE /api/holidays/:id - Delete holiday
router.delete('/:id', authenticateToken, requireRole(['super_admin', 'hr_admin', 'admin']), (req, res) => {
  const deleted = db.deleteById('holidays', req.params.id);
  if (!deleted) return res.status(404).json({ error: 'Holiday not found' });
  res.json({ message: 'Holiday deleted successfully' });
});

export default router;
