import { db } from '../db/database.js';

export const attendanceService = {
  // Get formatted today string YYYY-MM-DD
  getTodayString() {
    return new Date().toISOString().split('T')[0];
  },

  // Get current active session for user
  getActiveSession(userId) {
    return db.findOne('attendance', att => att.user_id === userId && att.status === 'Working');
  },

  // Get today's attendance (either working or completed)
  getTodayAttendance(userId) {
    const today = this.getTodayString();
    // Return either currently working session or the latest session for today
    const records = db.find('attendance', att => att.user_id === userId && att.date === today);
    if (!records.length) return null;
    // Prefer active 'Working'
    const working = records.find(r => r.status === 'Working');
    if (working) return working;
    return records[records.length - 1];
  },

  // Punch In with server-side timestamp
  punchIn(user) {
    const active = this.getActiveSession(user.id);
    if (active) {
      throw new Error('You already have an active punch-in session.');
    }

    const today = this.getTodayString();
    const serverTimestamp = new Date().toISOString();

    const record = db.insert('attendance', {
      user_id: user.id,
      employee_code: user.employee_code,
      name: user.name,
      department_id: user.department_id,
      date: today,
      punch_in: serverTimestamp,
      punch_out: null,
      total_working_hours: 0,
      status: 'Working'
    });

    return record;
  },

  // Punch Out with server-side timestamp and calculation
  punchOut(user) {
    const active = this.getActiveSession(user.id);
    if (!active) {
      throw new Error('Cannot punch out: No active punch-in session found.');
    }

    const serverTimestamp = new Date().toISOString();
    const inTime = new Date(active.punch_in).getTime();
    const outTime = new Date(serverTimestamp).getTime();

    // Elapsed hours calculation
    const diffHours = (outTime - inTime) / (1000 * 60 * 60);
    const totalWorkingHours = parseFloat(diffHours.toFixed(2));

    const settings = db.getSettings();
    const stdHours = settings.standard_hours || 8;
    const halfDayHours = settings.half_day_hours || 4;

    // Determine final status
    let finalStatus = 'Completed';
    if (totalWorkingHours >= stdHours - 0.5) {
      finalStatus = 'Completed'; // Full day completed / present
    } else if (totalWorkingHours >= halfDayHours) {
      finalStatus = 'Half Day';
    } else {
      finalStatus = 'Completed';
    }

    const updated = db.updateById('attendance', active.id, {
      punch_out: serverTimestamp,
      total_working_hours: totalWorkingHours,
      status: finalStatus
    });

    return updated;
  },

  // Get monthly stats for employee
  getMonthlyStats(userId, year, month) {
    const records = db.find('attendance', att => {
      if (att.user_id !== userId) return false;
      if (!att.date) return false;
      const [y, m] = att.date.split('-');
      return parseInt(y) === year && parseInt(m) === month;
    });

    const presentDays = records.filter(r => r.status === 'Completed' || r.status === 'Present').length;
    const halfDays = records.filter(r => r.status === 'Half Day').length;
    const workingDays = records.length;
    const totalHours = records.reduce((sum, r) => sum + (r.total_working_hours || 0), 0);

    return {
      totalRecords: records.length,
      presentDays,
      halfDays,
      workingDays,
      totalHours: parseFloat(totalHours.toFixed(2)),
      records
    };
  }
};
