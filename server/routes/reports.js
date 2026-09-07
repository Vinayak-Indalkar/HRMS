import express from 'express';
import { db } from '../db/database.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

// GET /api/reports/employees - List active employees for report selector
router.get('/employees', authenticateToken, requireRole(['manager', 'admin']), (req, res) => {
  let employees = [];
  if (['admin', 'super_admin', 'hr_admin'].includes(req.user.role)) {
    employees = db.find('users', u => u.status === 'active');
  } else {
    // For manager: direct and indirect reports + self
    employees = db.find('users', u =>
      (u.manager_id === req.user.id || u.l2_manager_id === req.user.id || u.reporting_manager_line_2_id === req.user.id || u.id === req.user.id) &&
      u.status === 'active'
    );
    if (employees.length === 0) {
      employees = db.find('users', u => u.status === 'active');
    }
  }

  const departments = db.getCollection('departments') || [];
  const deptMap = new Map(departments.map(d => [d.id, d.name]));

  const list = employees.map(u => ({
    id: u.id,
    name: u.name,
    employee_code: u.employee_code,
    email: u.email,
    designation: u.designation || 'Team Member',
    department_id: u.department_id,
    department_name: deptMap.get(u.department_id) || 'General',
    avatar_url: u.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.name}`
  }));

  res.json(list);
});

// GET /api/reports/employee-report - Generate comprehensive individual employee report (Attendance, Leaves, KPIs)
router.get('/employee-report', authenticateToken, requireRole(['manager', 'admin']), (req, res) => {
  const { user_id, start_date, end_date, month, year } = req.query;

  if (!user_id) {
    return res.status(400).json({ error: 'user_id query parameter is required to generate an employee report.' });
  }

  const targetUser = db.findById('users', user_id);
  if (!targetUser) {
    return res.status(404).json({ error: 'Employee not found.' });
  }

  const departments = db.getCollection('departments') || [];
  const deptMap = new Map(departments.map(d => [d.id, d.name]));
  const manager = targetUser.manager_id ? db.findById('users', targetUser.manager_id) : null;

  const employeeProfile = {
    id: targetUser.id,
    name: targetUser.name,
    employee_code: targetUser.employee_code,
    email: targetUser.email,
    designation: targetUser.designation || 'Staff',
    department_id: targetUser.department_id,
    department_name: deptMap.get(targetUser.department_id) || 'General',
    manager_name: manager?.name || 'Executive / Management',
    joining_date: targetUser.joining_date || 'N/A',
    avatar_url: targetUser.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${targetUser.name}`,
    status: targetUser.status || 'active',
    phone: targetUser.phone || targetUser.personal_mobile || 'N/A'
  };

  // Determine effective date filter
  let effectiveStartDate = start_date;
  let effectiveEndDate = end_date;

  if (!effectiveStartDate || !effectiveEndDate) {
    if (year && month) {
      const y = parseInt(year);
      const m = parseInt(month);
      const lastDay = new Date(y, m, 0).getDate();
      effectiveStartDate = `${y}-${String(m).padStart(2, '0')}-01`;
      effectiveEndDate = `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    } else if (year) {
      const y = parseInt(year);
      effectiveStartDate = `${y}-01-01`;
      effectiveEndDate = `${y}-12-31`;
    } else {
      // Default to current month
      const now = new Date();
      const y = now.getFullYear();
      const m = now.getMonth() + 1;
      const lastDay = new Date(y, m, 0).getDate();
      effectiveStartDate = `${y}-${String(m).padStart(2, '0')}-01`;
      effectiveEndDate = `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    }
  }

  // 1. Fetch & Filter Attendance
  let attendanceRecords = db.find('attendance', a => a.user_id === user_id);
  if (effectiveStartDate) {
    attendanceRecords = attendanceRecords.filter(a => a.date >= effectiveStartDate);
  }
  if (effectiveEndDate) {
    attendanceRecords = attendanceRecords.filter(a => a.date <= effectiveEndDate);
  }

  // Sort attendance records chronologically
  attendanceRecords = [...attendanceRecords].sort((a, b) => new Date(a.date) - new Date(b.date));

  // Compute Attendance Summary
  const loggedDays = attendanceRecords.length;
  let totalHours = 0;
  let presentDays = 0;
  let halfDays = 0;
  let lateDays = 0;

  attendanceRecords.forEach(r => {
    const hours = Number(r.total_working_hours) || 0;
    totalHours += hours;

    if (r.status === 'Half Day' || (hours >= 3.5 && hours < 7)) {
      halfDays++;
    } else if (r.status === 'Present' || r.status === 'Completed' || hours >= 7) {
      presentDays++;
    }

    // Check late arrival (after 09:30 AM)
    if (r.punch_in) {
      try {
        const pTime = new Date(r.punch_in);
        const punchHour = pTime.getUTCHours();
        const punchMin = pTime.getUTCMinutes();
        if (punchHour > 9 || (punchHour === 9 && punchMin > 30)) {
          lateDays++;
        }
      } catch (e) {
        // ignore date parse error
      }
    }
  });

  const avgHoursPerDay = loggedDays > 0 ? parseFloat((totalHours / loggedDays).toFixed(1)) : 0;

  // 2. Fetch & Filter Leaves
  // Quota Balances
  const balances = db.find('leave_balances', b => b.user_id === user_id);
  const normalizedBalances = (balances && balances.length > 0 ? balances : [
    { leave_type: 'Casual Leave (CL)', code: 'CL', total_leaves: 6, used_leaves: 0, remaining_leaves: 6 },
    { leave_type: 'Sick Leave (SL)', code: 'SL', total_leaves: 6, used_leaves: 0, remaining_leaves: 6 },
    { leave_type: 'Earned Leave (EL)', code: 'EL', total_leaves: 8, used_leaves: 0, remaining_leaves: 8 },
    { leave_type: 'Leave Without Pay (LWP)', code: 'LWP', total_leaves: 30, used_leaves: 0, remaining_leaves: 30 },
    { leave_type: 'Half Day Leave', code: 'HD', total_leaves: 6, used_leaves: 0, remaining_leaves: 6 }
  ]);

  // Leave Requests for this user in period
  let leaveRecords = db.find('leave_requests', r => r.user_id === user_id || r.employee_id === user_id);
  if (effectiveStartDate && effectiveEndDate) {
    leaveRecords = leaveRecords.filter(r => {
      return (r.start_date <= effectiveEndDate && r.end_date >= effectiveStartDate);
    });
  }

  leaveRecords = [...leaveRecords].sort((a, b) => new Date(b.start_date) - new Date(a.start_date));

  const totalLeaveRequests = leaveRecords.length;
  const approvedLeaves = leaveRecords.filter(r => r.status === 'Approved');
  const pendingLeaves = leaveRecords.filter(r => r.status === 'Pending' || r.status === 'L1 Approved');
  const cancelledLeaves = leaveRecords.filter(r => r.status === 'Cancelled');
  const rejectedLeaves = leaveRecords.filter(r => r.status === 'Rejected');
  const totalDaysTaken = approvedLeaves.reduce((sum, r) => sum + (Number(r.total_days) || 1), 0);

  // 3. Fetch KPI Performance
  const kpiAssignments = db.find('kpi_assignments', a => a.employee_id === user_id);
  const totalKpis = kpiAssignments.length;
  const completedKpis = kpiAssignments.filter(a => a.status === 'Completed').length;
  const inProgressKpis = kpiAssignments.filter(a => a.status === 'In Progress' || a.status === 'On Track').length;
  const atRiskKpis = kpiAssignments.filter(a => a.status === 'At Risk' || a.status === 'Behind').length;

  const avgKpiAchievement = totalKpis > 0
    ? Math.round(kpiAssignments.reduce((acc, a) => acc + (Number(a.achievement_pct || a.achievement_percentage) || 0), 0) / totalKpis)
    : 0;

  const scoredKpis = kpiAssignments.filter(a => a.score || a.review_score);
  const avgKpiScore = scoredKpis.length > 0
    ? Math.round(scoredKpis.reduce((acc, a) => acc + (Number(a.review_score || a.score) || 0), 0) / scoredKpis.length * 10) / 10
    : 0;

  res.json({
    employee: employeeProfile,
    period: {
      start_date: effectiveStartDate,
      end_date: effectiveEndDate,
      month: month ? parseInt(month) : null,
      year: year ? parseInt(year) : null
    },
    attendance: {
      summary: {
        logged_days: loggedDays,
        present_days: presentDays,
        half_days: halfDays,
        late_days: lateDays,
        total_working_hours: parseFloat(totalHours.toFixed(1)),
        avg_daily_hours: avgHoursPerDay
      },
      records: attendanceRecords.map(r => ({
        id: r.id,
        date: r.date,
        punch_in: r.punch_in,
        punch_out: r.punch_out,
        total_working_hours: r.total_working_hours || 0,
        status: r.status || 'Present',
        regularization_reason: r.regularization_reason || null
      }))
    },
    leaves: {
      balances: normalizedBalances,
      summary: {
        total_requests: totalLeaveRequests,
        approved_count: approvedLeaves.length,
        pending_count: pendingLeaves.length,
        cancelled_count: cancelledLeaves.length,
        rejected_count: rejectedLeaves.length,
        total_days_taken: totalDaysTaken
      },
      records: leaveRecords.map(r => ({
        id: r.id,
        leave_type: r.leave_type,
        start_date: r.start_date,
        end_date: r.end_date,
        total_days: r.total_days || 1,
        status: r.status,
        reason: r.reason,
        cancellation_reason: r.cancellation_reason || null,
        approver_remarks: r.approver_remarks || null,
        approved_by: r.approved_by || null,
        cancelled_by: r.cancelled_by || null,
        createdAt: r.createdAt
      }))
    },
    kpi: {
      summary: {
        total_kpis: totalKpis,
        completed_kpis: completedKpis,
        in_progress_kpis: inProgressKpis,
        at_risk_kpis: atRiskKpis,
        avg_achievement_pct: avgKpiAchievement,
        avg_review_score: avgKpiScore
      },
      assignments: kpiAssignments.map(a => ({
        id: a.id,
        title: a.title || a.kpi_name,
        target_value: a.target_value,
        current_value: a.current_value,
        unit: a.unit || '',
        achievement_pct: a.achievement_pct || a.achievement_percentage || 0,
        status: a.status || 'In Progress',
        score: a.review_score || a.score || null
      }))
    }
  });
});

export default router;
