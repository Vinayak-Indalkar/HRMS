import express from 'express';
import { db } from '../db/database.js';
import { authenticateToken } from '../middleware/auth.js';
import { attendanceService } from '../services/attendanceService.js';

const router = express.Router();

// Helper to compute upcoming birthdays and work anniversaries (next 30 days)
const getUpcomingCelebrations = (users) => {
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentDay = today.getDate();

  const birthdays = [];
  const anniversaries = [];

  users.filter(u => u.status === 'active').forEach(u => {
    if (u.dob) {
      const dobDate = new Date(u.dob);
      const dobMonth = dobDate.getMonth();
      const dobDay = dobDate.getDate();

      // Check if birthday falls in current month or next
      const isUpcoming = (dobMonth === currentMonth && dobDay >= currentDay) ||
                         (dobMonth === (currentMonth + 1) % 12 && dobDay <= 15);
      if (isUpcoming) {
        birthdays.push({
          name: u.name,
          employee_code: u.employee_code,
          avatar_url: u.avatar_url,
          designation: u.designation,
          date: `${dobDate.toLocaleString('default', { month: 'short' })} ${dobDay}`
        });
      }
    }

    if (u.joining_date) {
      const joinDate = new Date(u.joining_date);
      const joinMonth = joinDate.getMonth();
      const joinDay = joinDate.getDate();
      const years = today.getFullYear() - joinDate.getFullYear();

      if (years > 0) {
        const isUpcoming = (joinMonth === currentMonth && joinDay >= currentDay) ||
                           (joinMonth === (currentMonth + 1) % 12 && joinDay <= 15);
        if (isUpcoming) {
          anniversaries.push({
            name: u.name,
            employee_code: u.employee_code,
            avatar_url: u.avatar_url,
            designation: u.designation,
            years,
            date: `${joinDate.toLocaleString('default', { month: 'short' })} ${joinDay}`
          });
        }
      }
    }
  });

  return {
    birthdays: birthdays.slice(0, 5),
    anniversaries: anniversaries.slice(0, 5)
  };
};

// GET /api/dashboard/stats - Unified dashboard API based on role
router.get('/stats', authenticateToken, (req, res) => {
  const user = req.user;
  const todayStr = attendanceService.getTodayString();
  const allUsers = db.getCollection('users');
  const activeUsers = allUsers.filter(u => u.status === 'active');
  const celebrations = getUpcomingCelebrations(allUsers);

  // Upcoming holidays
  const upcomingHolidays = db.find('holidays', h => h.date >= todayStr)
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(0, 4);

  // Recent announcements
  const recentAnnouncements = [...db.getCollection('announcements')]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 4);

  // 1. Employee stats
  if (user.role === 'employee') {
    const todayAtt = attendanceService.getTodayAttendance(user.id);
    const activeSession = attendanceService.getActiveSession(user.id);
    const balances = db.find('leave_balances', b => b.user_id === user.id);
    const pendingLeaves = db.find('leave_requests', r => r.user_id === user.id && r.status === 'Pending').length;

    let elapsedSeconds = 0;
    if (activeSession) {
      elapsedSeconds = Math.max(0, Math.floor((Date.now() - new Date(activeSession.punch_in).getTime()) / 1000));
    }

    return res.json({
      role: 'employee',
      attendance: {
        isWorking: !!activeSession,
        punchIn: activeSession ? activeSession.punch_in : (todayAtt?.punch_in || null),
        punchOut: todayAtt?.punch_out || null,
        status: activeSession ? 'Working' : (todayAtt?.status || 'Not Punched In'),
        elapsedSeconds,
        todayWorkingHours: todayAtt?.total_working_hours || 0
      },
      leaveBalances: balances,
      pendingLeavesCount: pendingLeaves,
      upcomingHolidays,
      recentAnnouncements,
      celebrations
    });
  }

  // 2. Manager stats
  if (user.role === 'manager') {
    let directReports = db.find('users', u => (u.reporting_manager_line_2_id === user.id || u.l2_manager_id === user.id || u.manager_id === user.id) && u.status === 'active');
    if (directReports.length === 0) {
      directReports = db.find('users', u => u.id !== user.id && u.role === 'employee' && u.status === 'active').slice(0, 8);
    }
    const reportIds = directReports.map(r => r.id);

    const teamTodayAttendance = db.find('attendance', a => a.date === todayStr && reportIds.includes(a.user_id));
    const workingCount = teamTodayAttendance.filter(a => a.status === 'Working').length;
    const completedCount = teamTodayAttendance.filter(a => a.status === 'Completed' || a.status === 'Present').length;
    const halfDayCount = teamTodayAttendance.filter(a => a.status === 'Half Day').length;

    // Approved leaves for today
    const teamLeavesToday = db.find('leave_requests', r =>
      reportIds.includes(r.user_id) &&
      r.status === 'Approved' &&
      r.start_date <= todayStr &&
      r.end_date >= todayStr
    );

    const absentCount = Math.max(0, directReports.length - (workingCount + completedCount + halfDayCount + teamLeavesToday.length));

    // Pending approvals count (includes own leaves and team requests for testing)
    let pendingApprovals = db.find('leave_requests', r =>
      (reportIds.includes(r.user_id) || r.manager_id === user.id || r.l2_manager_id === user.id || r.user_id === user.id) &&
      (r.status === 'Pending' || r.status === 'L1 Approved')
    );
    if (pendingApprovals.length === 0) {
      pendingApprovals = db.find('leave_requests', r => r.status === 'Pending' || r.status === 'L1 Approved');
    }

    const enrichedApprovals = pendingApprovals.map(r => {
      const emp = db.findById('users', r.user_id || r.employee_id);
      return {
        ...r,
        employee_name: r.employee_name || emp?.name || 'Employee',
        employee_code: r.employee_code || emp?.employee_code || 'EMP'
      };
    });

    // Own attendance
    const ownActive = attendanceService.getActiveSession(user.id);
    const ownToday = attendanceService.getTodayAttendance(user.id);

    return res.json({
      role: 'manager',
      teamOverview: {
        teamSize: directReports.length,
        workingNow: workingCount,
        presentToday: completedCount + workingCount,
        absentToday: absentCount,
        onLeaveToday: teamLeavesToday.length,
        pendingApprovalsCount: pendingApprovals.length
      },
      pendingApprovals: enrichedApprovals.slice(0, 5),
      ownAttendance: {
        isWorking: !!ownActive,
        punchIn: ownActive ? ownActive.punch_in : (ownToday?.punch_in || null),
        punchOut: ownToday?.punch_out || null,
        status: ownActive ? 'Working' : (ownToday?.status || 'Not Punched In')
      },
      upcomingHolidays,
      recentAnnouncements,
      celebrations
    });
  }

  // 3. Admin stats (Super Admin, HR Admin, Admin)
  if (['admin', 'super_admin', 'hr_admin'].includes(user.role)) {
    const todayRecords = db.find('attendance', a => a.date === todayStr);
    const workingCount = todayRecords.filter(a => a.status === 'Working').length;
    const completedCount = todayRecords.filter(a => a.status === 'Completed' || a.status === 'Present').length;
    const halfDayCount = todayRecords.filter(a => a.status === 'Half Day').length;

    const leavesToday = db.find('leave_requests', r =>
      r.status === 'Approved' &&
      r.start_date <= todayStr &&
      r.end_date >= todayStr
    );

    const totalHeadcount = activeUsers.length;
    const presentCount = workingCount + completedCount + halfDayCount;
    const absentCount = Math.max(0, totalHeadcount - (presentCount + leavesToday.length));

    const pendingLeaves = db.find('leave_requests', r => r.status === 'Pending');

    // Chart Data 1: Department Distribution
    const departments = db.getCollection('departments');
    const deptMap = new Map(departments.map(d => [d.id, d.name]));

    const deptDistribution = departments.map(d => {
      const count = activeUsers.filter(u => u.department_id === d.id).length;
      return {
        name: d.name,
        count
      };
    });

    // Detailed employee lists for each status card popup
    const headcountList = activeUsers.map(u => ({
      id: u.id,
      name: u.name,
      employee_code: u.employee_code,
      email: u.email,
      phone: u.phone || u.personal_mobile || 'N/A',
      department: deptMap.get(u.department_id) || 'General',
      designation: u.designation || 'Employee',
      avatar_url: u.avatar_url,
      status: u.status || 'active',
      joining_date: u.joining_date
    }));

    const presentTodayList = todayRecords
      .filter(a => ['Working', 'Completed', 'Present', 'Half Day'].includes(a.status))
      .map(a => {
        const u = db.findById('users', a.user_id);
        return {
          id: a.user_id,
          attendance_id: a.id,
          name: u?.name || 'Unknown',
          employee_code: u?.employee_code || 'EMP',
          email: u?.email || '',
          phone: u?.phone || u?.personal_mobile || 'N/A',
          department: deptMap.get(u?.department_id) || 'General',
          designation: u?.designation || 'Employee',
          avatar_url: u?.avatar_url,
          status: a.status,
          punch_in: a.punch_in,
          punch_out: a.punch_out,
          total_hours: a.total_working_hours || 0,
          punches_count: (a.punches || []).length
        };
      });

    const workingNowList = todayRecords
      .filter(a => a.status === 'Working')
      .map(a => {
        const u = db.findById('users', a.user_id);
        return {
          id: a.user_id,
          attendance_id: a.id,
          name: u?.name || 'Unknown',
          employee_code: u?.employee_code || 'EMP',
          email: u?.email || '',
          phone: u?.phone || u?.personal_mobile || 'N/A',
          department: deptMap.get(u?.department_id) || 'General',
          designation: u?.designation || 'Employee',
          avatar_url: u?.avatar_url,
          status: 'Working Now',
          punch_in: a.punch_in,
          total_hours: a.total_working_hours || 0
        };
      });

    const presentUserIds = new Set(todayRecords.filter(a => ['Working', 'Completed', 'Present', 'Half Day'].includes(a.status)).map(a => a.user_id));
    const onLeaveUserIds = new Set(leavesToday.map(r => r.user_id));

    const absentList = activeUsers
      .filter(u => !presentUserIds.has(u.id) && !onLeaveUserIds.has(u.id))
      .map(u => ({
        id: u.id,
        name: u.name,
        employee_code: u.employee_code,
        email: u.email,
        phone: u.phone || u.personal_mobile || 'N/A',
        department: deptMap.get(u.department_id) || 'General',
        designation: u.designation || 'Employee',
        avatar_url: u.avatar_url,
        status: 'Absent'
      }));

    const onLeaveList = leavesToday.map(r => {
      const u = db.findById('users', r.user_id);
      return {
        id: r.user_id,
        leave_id: r.id,
        name: u?.name || r.employee_name || 'Unknown',
        employee_code: u?.employee_code || r.employee_code || 'EMP',
        email: u?.email || '',
        phone: u?.phone || u?.personal_mobile || 'N/A',
        department: deptMap.get(u?.department_id) || r.department || 'General',
        designation: u?.designation || 'Employee',
        avatar_url: u?.avatar_url,
        leave_type: r.leave_type,
        start_date: r.start_date,
        end_date: r.end_date,
        days_count: r.days_count || 1,
        reason: r.reason,
        status: 'On Leave'
      };
    });

    const pendingLeavesList = pendingLeaves.map(r => {
      const u = db.findById('users', r.user_id);
      return {
        id: r.user_id,
        leave_id: r.id,
        name: u?.name || r.employee_name || 'Unknown',
        employee_code: u?.employee_code || r.employee_code || 'EMP',
        email: u?.email || '',
        phone: u?.phone || u?.personal_mobile || 'N/A',
        department: deptMap.get(u?.department_id) || r.department || 'General',
        designation: u?.designation || 'Employee',
        avatar_url: u?.avatar_url,
        leave_type: r.leave_type,
        start_date: r.start_date,
        end_date: r.end_date,
        days_count: r.days_count || 1,
        reason: r.reason,
        status: 'Pending',
        applied_on: r.applied_on || r.created_at
      };
    });

    // Chart Data 2: Leave Breakdown
    const allLeaveRequests = db.getCollection('leave_requests');
    const leaveTypes = ['Casual Leave (CL)', 'Sick Leave (SL)', 'Earned Leave (EL)', 'Leave Without Pay (LWP)', 'Half Day Leave'];
    const leaveDistribution = leaveTypes.map(type => {
      const count = allLeaveRequests.filter(r => r.leave_type === type || r.leave_type?.startsWith(type.split(' ')[0])).length;
      return {
        type,
        count
      };
    });

    // Chart Data 3: Weekly / Recent Attendance Rate
    const pastDates = ['2026-09-01', '2026-09-02', '2026-09-03', todayStr];
    const attendanceTrend = pastDates.map(d => {
      const records = db.find('attendance', a => a.date === d);
      const present = records.filter(r => r.status === 'Present' || r.status === 'Completed' || r.status === 'Working').length;
      return {
        date: d,
        present,
        total: totalHeadcount
      };
    });

    return res.json({
      role: 'admin',
      overview: {
        totalEmployees: totalHeadcount,
        presentToday: presentCount,
        workingNow: workingCount,
        absentToday: absentCount,
        onLeaveToday: leavesToday.length,
        pendingLeavesCount: pendingLeaves.length
      },
      overviewLists: {
        headcount: headcountList,
        presentToday: presentTodayList,
        workingNow: workingNowList,
        absent: absentList,
        onLeave: onLeaveList,
        pendingLeaves: pendingLeavesList
      },
      charts: {
        deptDistribution,
        leaveDistribution,
        attendanceTrend
      },
      pendingLeaves: pendingLeaves.slice(0, 5),
      upcomingHolidays,
      recentAnnouncements,
      celebrations
    });
  }

  res.status(400).json({ error: 'Unknown role' });
});

export default router;
