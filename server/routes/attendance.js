import express from 'express';
import { db } from '../db/database.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { attendanceService } from '../services/attendanceService.js';

const router = express.Router();

// GET /api/attendance/today - Get today's attendance status and live server time
router.get('/today', authenticateToken, (req, res) => {
  const activeSession = attendanceService.getActiveSession(req.user.id);
  const todayRecord = attendanceService.getTodayAttendance(req.user.id);
  const todayRecords = db.find('attendance', att => att.user_id === req.user.id && att.date === attendanceService.getTodayString());

  let isWorking = false;
  let elapsedSeconds = 0;
  let punchInTime = null;

  if (activeSession) {
    isWorking = true;
    punchInTime = activeSession.punch_in;
    elapsedSeconds = Math.max(0, Math.floor((Date.now() - new Date(activeSession.punch_in).getTime()) / 1000));
  } else if (todayRecord) {
    punchInTime = todayRecord.punch_in;
  }

  const totalWorkingHours = todayRecords.reduce((sum, r) => sum + (r.total_working_hours || 0), 0);

  res.json({
    serverTime: new Date().toISOString(),
    isWorking,
    activeSession,
    todayRecord,
    todayRecords,
    totalWorkingHours: parseFloat(totalWorkingHours.toFixed(2)),
    punchInTime,
    punchOutTime: todayRecord?.punch_out || null,
    elapsedSeconds,
    status: activeSession ? 'Working' : (todayRecord?.status || 'Not Punched In')
  });
});

// POST /api/attendance/punch-in - Server authoritative punch in
router.post('/punch-in', authenticateToken, (req, res) => {
  try {
    const record = attendanceService.punchIn(req.user);
    res.json({
      message: 'Punched in successfully',
      record,
      serverTime: new Date().toISOString()
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/attendance/punch-out - Server authoritative punch out
router.post('/punch-out', authenticateToken, (req, res) => {
  try {
    const record = attendanceService.punchOut(req.user);
    res.json({
      message: 'Punched out successfully',
      record,
      serverTime: new Date().toISOString()
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/attendance/reset-today - Reset today's attendance for demo and testing
router.post('/reset-today', authenticateToken, (req, res) => {
  const today = attendanceService.getTodayString();
  const deleted = db.delete('attendance', att => att.user_id === req.user.id && att.date === today);
  res.json({
    message: "Today's attendance reset successfully. You can test Punch In again.",
    deleted
  });
});

// GET /api/attendance/my - Monthly personal attendance records
router.get('/my', authenticateToken, (req, res) => {
  const year = parseInt(req.query.year) || new Date().getFullYear();
  const month = parseInt(req.query.month) || (new Date().getMonth() + 1);

  const stats = attendanceService.getMonthlyStats(req.user.id, year, month);
  res.json(stats);
});

// GET /api/attendance/team - Manager view for direct reports
router.get('/team', authenticateToken, requireRole(['manager', 'admin']), (req, res) => {
  const date = req.query.date || attendanceService.getTodayString();

  // Find direct reports (Line 1 & Line 2) if manager, or all if admin/super_admin/hr_admin
  let teamMembers = [];
  if (req.user.role === 'admin' || req.user.role === 'super_admin' || req.user.role === 'hr_admin') {
    teamMembers = db.find('users', u => u.status === 'active');
  } else {
    teamMembers = db.find('users', u =>
      (u.reporting_manager_line_2_id === req.user.id || u.l2_manager_id === req.user.id || u.manager_id === req.user.id) &&
      u.status === 'active'
    );
    if (teamMembers.length === 0) {
      teamMembers = db.find('users', u => u.id !== req.user.id && u.role === 'employee' && u.status === 'active').slice(0, 8);
    }
  }

  const teamIds = teamMembers.map(m => m.id);
  const attendanceRecords = db.find('attendance', att => att.date === date && teamIds.includes(att.user_id));

  // Combine team member with their attendance status for the date
  const result = teamMembers.map(member => {
    const att = attendanceRecords.find(a => a.user_id === member.id);
    return {
      user_id: member.id,
      name: member.name,
      employee_code: member.employee_code,
      avatar_url: member.avatar_url,
      designation: member.designation,
      punch_in: att?.punch_in || null,
      punch_out: att?.punch_out || null,
      total_working_hours: att?.total_working_hours || 0,
      status: att?.status || 'Not Punched In'
    };
  });

  res.json({
    date,
    teamSize: teamMembers.length,
    workingCount: result.filter(r => r.status === 'Working').length,
    presentCount: result.filter(r => r.status === 'Completed' || r.status === 'Present').length,
    absentCount: result.filter(r => r.status === 'Not Punched In').length,
    members: result
  });
});

// GET /api/attendance/all - Admin company-wide attendance
router.get('/all', authenticateToken, requireRole(['admin']), (req, res) => {
  const { date, department_id, status, user_id, month, year, start_date, end_date } = req.query;

  let records = db.getCollection('attendance');

  if (user_id) {
    records = records.filter(r => r.user_id === user_id);
  }
  if (date) {
    records = records.filter(r => r.date === date);
  }
  if (start_date) {
    records = records.filter(r => r.date >= start_date);
  }
  if (end_date) {
    records = records.filter(r => r.date <= end_date);
  }
  if (year && month) {
    const yNum = parseInt(year);
    const mNum = parseInt(month);
    records = records.filter(r => {
      if (!r.date) return false;
      const [y, m] = r.date.split('-');
      return parseInt(y) === yNum && parseInt(m) === mNum;
    });
  } else if (year) {
    const yNum = parseInt(year);
    records = records.filter(r => {
      if (!r.date) return false;
      const [y] = r.date.split('-');
      return parseInt(y) === yNum;
    });
  }
  if (department_id) {
    records = records.filter(r => r.department_id === department_id);
  }
  if (status) {
    records = records.filter(r => r.status === status);
  }

  // Sort by date descending, then punch_in descending
  records = [...records].sort((a, b) => {
    const dDiff = new Date(b.date) - new Date(a.date);
    if (dDiff !== 0) return dDiff;
    return new Date(b.punch_in || 0) - new Date(a.punch_in || 0);
  });

  res.json({
    total: records.length,
    records
  });
});

// POST /api/attendance/regularize - Admin/Manager manual attendance entry/override
router.post('/regularize', authenticateToken, requireRole(['admin', 'manager']), (req, res) => {
  const { user_id, date, punch_in, punch_out, status, reason } = req.body;

  if (!user_id || !date) {
    return res.status(400).json({ error: 'User and date are required' });
  }

  const user = db.findById('users', user_id);
  if (!user) {
    return res.status(404).json({ error: 'Employee not found' });
  }

  let total_working_hours = 8.0;
  if (punch_in && punch_out) {
    const diff = (new Date(punch_out) - new Date(punch_in)) / (1000 * 60 * 60);
    total_working_hours = parseFloat(Math.max(0, diff).toFixed(2));
  }

  const existing = db.findOne('attendance', a => a.user_id === user_id && a.date === date);
  let record;

  if (existing) {
    record = db.updateById('attendance', existing.id, {
      punch_in: punch_in || existing.punch_in,
      punch_out: punch_out || existing.punch_out,
      total_working_hours,
      status: status || existing.status,
      regularized: true,
      regularization_reason: reason || 'Manual adjustment'
    });
  } else {
    record = db.insert('attendance', {
      user_id,
      employee_code: user.employee_code,
      name: user.name,
      department_id: user.department_id,
      date,
      punch_in: punch_in || `${date}T09:00:00.000Z`,
      punch_out: punch_out || `${date}T17:30:00.000Z`,
      total_working_hours,
      status: status || 'Present',
      regularized: true,
      regularization_reason: reason || 'Manual adjustment'
    });
  }

  // Audit log
  db.insert('audit_logs', {
    action: 'CORRECT_ATTENDANCE',
    actor_id: req.user.id,
    actor_name: req.user.name,
    actor_role: req.user.role,
    target_user_id: user.id,
    target_user_name: user.name,
    date,
    total_working_hours,
    status: record.status,
    reason: reason || 'Manual regularization',
    timestamp: new Date().toISOString()
  });

  res.json({ message: 'Attendance record regularized successfully', record });
});

export default router;
