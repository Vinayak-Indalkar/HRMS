import express from 'express';
import { db } from '../db/database.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { notificationService } from '../services/notificationService.js';

const router = express.Router();

// Helper: Get all active team members who have this manager assigned as L2 manager
const getReportingHierarchy = (managerId) => {
  const allUsers = db.getCollection('users') || [];
  let reports = allUsers.filter(u =>
    (u.reporting_manager_line_2_id === managerId || u.l2_manager_id === managerId || u.manager_id === managerId) &&
    u.status === 'active'
  );
  if (reports.length === 0) {
    reports = allUsers.filter(u => u.id !== managerId && u.role === 'employee' && u.status === 'active').slice(0, 8);
  }
  return reports;
};

// GET /api/leaves/team-members - List authorized team members for manager or admin
router.get('/team-members', authenticateToken, requireRole(['manager', 'admin', 'super_admin', 'hr_admin']), (req, res) => {
  let authorizedMembers = [];
  if (['admin', 'super_admin', 'hr_admin'].includes(req.user.role)) {
    authorizedMembers = db.find('users', u => u.status === 'active');
  } else {
    authorizedMembers = getReportingHierarchy(req.user.id);
  }

  const safeList = authorizedMembers.map(u => ({
    id: u.id,
    name: u.name,
    employee_code: u.employee_code,
    email: u.email,
    department_id: u.department_id,
    designation: u.designation,
    avatar_url: u.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.name}`,
    manager_id: u.manager_id,
    reporting_manager_line_1_id: u.reporting_manager_line_1_id,
    reporting_manager_line_2_id: u.reporting_manager_line_2_id,
    reporting_manager_line_2_name: u.reporting_manager_line_2_name
  }));

  res.json(safeList);
});

// GET /api/leaves/balances - Current user leave balances (or employee balance for manager/admin)
router.get('/balances', authenticateToken, (req, res) => {
  let userId = req.user.id;
  if (req.query.user_id && ['manager', 'admin'].includes(req.user.role)) {
    userId = req.query.user_id;
  }
  const balances = db.find('leave_balances', b => b.user_id === userId);
  res.json(balances);
});

// GET /api/leaves/my - Current user leave requests
router.get('/my', authenticateToken, (req, res) => {
  const requests = db.find('leave_requests', r => r.user_id === req.user.id || r.employee_id === req.user.id);
  const sorted = [...requests].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(sorted);
});

// POST /api/leaves/apply - Apply for leave (or Manager applying on behalf of team member)
router.post('/apply', authenticateToken, (req, res) => {
  const { employee_id, leave_type, start_date, end_date, reason, day_type, attachment } = req.body;

  if (!leave_type || !start_date || !end_date || !reason) {
    return res.status(400).json({ error: 'All fields are required: leave_type, start_date, end_date, reason' });
  }

  // Determine target employee
  let targetUser = req.user;
  let isManagerProxy = false;

  if (employee_id && employee_id !== req.user.id) {
    if (!['manager', 'admin', 'super_admin', 'hr_admin'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Only managers or admins can apply for leave on behalf of employees' });
    }
    const emp = db.findById('users', employee_id);
    if (!emp) {
      return res.status(404).json({ error: 'Selected employee not found' });
    }

    targetUser = emp;
    isManagerProxy = true;
  }

  const start = new Date(start_date);
  const end = new Date(end_date);

  if (end < start) {
    return res.status(400).json({ error: 'End date cannot be earlier than start date' });
  }

  // Check for conflicts: existing pending, L1 approved, or approved leaves on overlapping dates
  const existingActiveLeaves = db.find('leave_requests', r =>
    (r.user_id === targetUser.id || r.employee_id === targetUser.id) &&
    ['Pending', 'L1 Approved', 'Approved'].includes(r.status)
  );

  const conflict = existingActiveLeaves.find(r => {
    const rStart = new Date(r.start_date);
    const rEnd = new Date(r.end_date);
    return (start <= rEnd && end >= rStart);
  });

  if (conflict) {
    return res.status(409).json({
      error: `Conflict detected: ${targetUser.name} already has an active ${conflict.status.toLowerCase()} leave request (${conflict.leave_type}) from ${conflict.start_date} to ${conflict.end_date}.`
    });
  }

  // Calculate business / calendar days (support Full Day, First Half, Second Half)
  const normalizedDayType = day_type || (leave_type.toLowerCase().includes('half day') ? 'first_half' : 'full');
  const isHalfDay = normalizedDayType === 'first_half' || normalizedDayType === 'second_half';
  const isLWP = leave_type.toLowerCase().includes('without pay') || leave_type.toLowerCase().includes('lwp') || leave_type === 'Unpaid Leave';

  const diffTime = Math.abs(end - start);
  const calendarDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  const total_days = isHalfDay ? 0.5 : calendarDays;

  // Check leave balance if not LWP
  if (!isLWP) {
    const norm = (str) => (str || '').toLowerCase().replace(/[\(\)\s_-]/g, '');
    const reqNorm = norm(leave_type);
    const balance = db.findOne('leave_balances', b => {
      if (b.user_id !== targetUser.id) return false;
      const bNorm = norm(b.leave_type);
      const codeNorm = norm(b.code);
      return bNorm.includes(reqNorm) || reqNorm.includes(bNorm) || codeNorm === reqNorm || reqNorm.includes(codeNorm);
    });
    if (!balance || balance.remaining_leaves < total_days) {
      return res.status(400).json({
        error: `Insufficient leave balance for ${targetUser.name}. They have ${balance?.remaining_leaves || 0} days remaining for ${leave_type}, but requested ${total_days} day(s).`
      });
    }
  }

  // Determine hierarchical L1 and L2 managers
  let l1ManagerId = targetUser.manager_id;
  let l2ManagerId = null;

  if (isManagerProxy) {
    l1ManagerId = req.user.id;
    l2ManagerId = req.user.manager_id || null;
  } else if (l1ManagerId) {
    const l1Mgr = db.findById('users', l1ManagerId);
    l2ManagerId = l1Mgr?.manager_id || null;
  }

  // When manager applies on behalf of employee, L1 endorsement is automatically granted!
  const initialStatus = isManagerProxy ? 'L1 Approved' : 'Pending';

  const leaveRequest = db.insert('leave_requests', {
    user_id: targetUser.id,
    employee_id: targetUser.id,
    employee_code: targetUser.employee_code,
    employee_name: targetUser.name,
    department_id: targetUser.department_id,
    manager_id: l1ManagerId,
    l2_manager_id: l2ManagerId,
    created_by: req.user.id,
    created_by_name: req.user.name,
    created_by_role: req.user.role,
    applied_by_manager_id: isManagerProxy ? req.user.id : null,
    applied_by_manager_name: isManagerProxy ? req.user.name : null,
    leave_type,
    start_date,
    end_date,
    total_days,
    duration: total_days,
    day_type: normalizedDayType,
    reason,
    attachment: attachment || null,
    status: initialStatus,
    l1_approved_by: isManagerProxy ? req.user.name : null,
    l1_approved_at: isManagerProxy ? new Date().toISOString() : null,
    approved_by: null,
    approved_at: null,
    rejected_by: null,
    rejected_at: null,
    rejection_reason: null,
    approver_remarks: isManagerProxy ? `Applied & L1-Approved by manager (${req.user.name}). Forwarded to L2 & HR.` : null
  });

  // Audit trail logging
  if (isManagerProxy) {
    db.insert('audit_logs', {
      action: 'MANAGER_APPLY_LEAVE',
      actor_id: req.user.id,
      actor_name: req.user.name,
      actor_role: req.user.role,
      target_user_id: targetUser.id,
      target_user_name: targetUser.name,
      leave_id: leaveRequest.id,
      leave_type,
      start_date,
      end_date,
      total_days,
      day_type: normalizedDayType,
      status: initialStatus,
      timestamp: new Date().toISOString()
    });
  }

  // Trigger notifications to Employee, L2 Manager, and HR
  notificationService.notifyLeaveSubmitted(leaveRequest, targetUser, isManagerProxy ? req.user : null);

  res.json({
    message: isManagerProxy
      ? `Leave applied and L1-approved for ${targetUser.name}. Forwarded to L2 Manager & HR.`
      : 'Leave application submitted successfully',
    leaveRequest
  });
});

// GET /api/leaves/approvals - Manager / Admin review list
router.get('/approvals', authenticateToken, requireRole(['manager', 'admin']), (req, res) => {
  let requests = [];

  if (['admin', 'super_admin', 'hr_admin'].includes(req.user.role)) {
    requests = db.getCollection('leave_requests');
  } else {
    // For manager: direct reports, L2 reports, own leave requests, and pending requests
    const directReports = db.find('users', u => u.manager_id === req.user.id || u.reporting_manager_line_2_id === req.user.id || u.l2_manager_id === req.user.id);
    const reportIds = directReports.map(r => r.id);

    requests = db.find('leave_requests', r =>
      reportIds.includes(r.user_id) ||
      r.manager_id === req.user.id ||
      r.l2_manager_id === req.user.id ||
      r.user_id === req.user.id ||
      r.employee_id === req.user.id ||
      r.status === 'Pending' ||
      r.status === 'L1 Approved'
    );

    if (requests.length === 0) {
      requests = db.getCollection('leave_requests');
    }
  }

  // Ensure employee metadata is attached
  const enriched = requests.map(r => {
    const emp = db.findById('users', r.user_id || r.employee_id);
    return {
      ...r,
      employee_name: r.employee_name || emp?.name || 'Employee',
      employee_code: r.employee_code || emp?.employee_code || 'EMP',
      employee_avatar: emp?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${emp?.name || 'User'}`,
      designation: emp?.designation || 'Staff'
    };
  });

  const sorted = [...enriched].sort((a, b) => {
    // Actionable requests first: Pending & L1 Approved, then by date descending
    const isActionable = s => s === 'Pending' || s === 'L1 Approved';
    if (isActionable(a.status) && !isActionable(b.status)) return -1;
    if (!isActionable(a.status) && isActionable(b.status)) return 1;
    return new Date(b.createdAt) - new Date(a.createdAt);
  });

  res.json(sorted);
});

// POST /api/leaves/:id/review - Approve or Reject leave (supports self-approval for testing and multi-role review)
router.post('/:id/review', authenticateToken, requireRole(['manager', 'admin']), (req, res) => {
  const { id } = req.params;
  const { status, remarks } = req.body;

  if (!['Approved', 'Rejected'].includes(status)) {
    return res.status(400).json({ error: "Status must be 'Approved' or 'Rejected'" });
  }

  const request = db.findById('leave_requests', id);
  if (!request) {
    return res.status(404).json({ error: 'Leave request not found' });
  }

  const isHRAdmin = ['admin', 'super_admin', 'hr_admin'].includes(req.user.role);
  const isL1Manager = request.manager_id === req.user.id;
  const isL2Manager = request.l2_manager_id === req.user.id;
  const isOwnLeave = (request.user_id === req.user.id || request.employee_id === req.user.id);

  // Handle Rejection
  if (status === 'Rejected') {
    // If previously approved (deducted), refund balance
    if (request.status === 'Approved') {
      const norm = (str) => (str || '').toLowerCase().replace(/[\(\)\s_-]/g, '');
      const reqNorm = norm(request.leave_type);
      const balance = db.findOne('leave_balances', b => {
        if (b.user_id !== request.user_id) return false;
        const bNorm = norm(b.leave_type);
        const codeNorm = norm(b.code);
        return bNorm.includes(reqNorm) || reqNorm.includes(bNorm) || codeNorm === reqNorm || reqNorm.includes(codeNorm);
      });
      if (balance && typeof balance.remaining_leaves === 'number') {
        db.updateById('leave_balances', balance.id, {
          used_leaves: Math.max(0, (balance.used_leaves || 0) - request.total_days),
          remaining_leaves: balance.remaining_leaves + request.total_days
        });
      }
    }

    const updated = db.updateById('leave_requests', id, {
      status: 'Rejected',
      approved_by: req.user.name,
      approver_remarks: remarks || `Rejected by ${req.user.name}`
    });

    notificationService.notifyLeaveDecision(updated, req.user.name);
    return res.json({
      message: 'Leave request rejected',
      request: updated
    });
  }

  // Handle Approval:
  // If Manager approves a 'Pending' leave (not HR Admin and not own leave):
  // It transitions to 'L1 Approved' and moves to HR Admin for final sign-off.
  // If HR Admin approves (whether 'L1 Approved' or 'Pending' when manager is absent),
  // it grants final approval ('Approved') and deducts leave quota.
  let nextStatus = 'Approved';
  let isFinalApproval = true;

  if (isHRAdmin) {
    // HR Admin has full authority: can approve L1 Approved leaves or bypass absent managers for Pending leaves
    nextStatus = 'Approved';
    isFinalApproval = true;
  } else if (isOwnLeave) {
    // Self-approval for testing purposes
    nextStatus = 'Approved';
    isFinalApproval = true;
  } else if (req.user.role === 'manager') {
    if (request.status === 'Pending') {
      nextStatus = 'L1 Approved';
      isFinalApproval = false;
    } else if (request.status === 'L1 Approved') {
      return res.status(400).json({
        error: 'This leave application has already been approved by manager and is awaiting HR Admin approval.'
      });
    } else if (request.status === 'Approved') {
      return res.status(400).json({
        error: 'This leave application has already been granted final approval.'
      });
    }
  }

  // Deduct quota if final approval
  if (isFinalApproval && request.status !== 'Approved') {
    const norm = (str) => (str || '').toLowerCase().replace(/[\(\)\s_-]/g, '');
    const reqNorm = norm(request.leave_type);
    const balance = db.findOne('leave_balances', b => {
      if (b.user_id !== request.user_id) return false;
      const bNorm = norm(b.leave_type);
      const codeNorm = norm(b.code);
      return bNorm.includes(reqNorm) || reqNorm.includes(bNorm) || codeNorm === reqNorm || reqNorm.includes(codeNorm);
    });
    if (balance && typeof balance.remaining_leaves === 'number') {
      db.updateById('leave_balances', balance.id, {
        used_leaves: (balance.used_leaves || 0) + request.total_days,
        remaining_leaves: Math.max(0, balance.remaining_leaves - request.total_days)
      });
    }
  }

  const isDirectHRApproval = isHRAdmin && request.status === 'Pending' && !isOwnLeave;
  const defaultRemark = nextStatus === 'L1 Approved'
    ? `L1 approved by manager (${req.user.name}). Forwarded to HR Admin for final approval.`
    : (isDirectHRApproval
      ? `Approved by HR Admin (${req.user.name}) — Manager absent / Direct HR sign-off.`
      : `Final approval granted by ${req.user.name}.`);

  const updatedRequest = db.updateById('leave_requests', id, {
    status: nextStatus,
    l1_approved_by: (nextStatus === 'L1 Approved' || request.l1_approved_by) ? (request.l1_approved_by || req.user.name) : null,
    l1_approved_at: (nextStatus === 'L1 Approved' || request.l1_approved_at) ? (request.l1_approved_at || new Date().toISOString()) : null,
    l2_approved_by: isL2Manager ? req.user.name : request.l2_approved_by || null,
    hr_approved_by: isHRAdmin ? req.user.name : request.hr_approved_by || null,
    approved_by: isFinalApproval ? req.user.name : (request.approved_by || req.user.name),
    approved_at: isFinalApproval ? new Date().toISOString() : request.approved_at,
    approver_remarks: remarks || defaultRemark
  });

  if (nextStatus === 'L1 Approved') {
    notificationService.notifyLeaveForwardedToL2AndHR(updatedRequest, req.user.name);
  } else {
    notificationService.notifyLeaveDecision(updatedRequest, req.user.name);
  }

  res.json({
    message: nextStatus === 'L1 Approved'
      ? 'Leave application approved by manager and forwarded to HR Admin for final sign-off'
      : (isDirectHRApproval
        ? 'Leave application approved directly by HR Admin (Manager absent bypass)'
        : 'Leave application granted final approval successfully'),
    request: updatedRequest
  });
});

// GET /api/leaves/team-leaves - Team leave overview for manager / admin with filters
router.get('/team-leaves', authenticateToken, requireRole(['manager', 'admin']), (req, res) => {
  let authorizedUserIds = [];
  if (['admin', 'super_admin', 'hr_admin'].includes(req.user.role)) {
    authorizedUserIds = (db.getCollection('users') || []).map(u => u.id);
  } else {
    const hierarchy = getReportingHierarchy(req.user.id);
    authorizedUserIds = hierarchy.map(u => u.id);
    authorizedUserIds.push(req.user.id);
  }

  let requests = db.find('leave_requests', r =>
    authorizedUserIds.includes(r.user_id) || authorizedUserIds.includes(r.employee_id)
  );

  // Apply filters
  const { employee_id, leave_type, status, start_date, end_date } = req.query;

  if (employee_id) {
    requests = requests.filter(r => (r.employee_id || r.user_id) === employee_id);
  }
  if (leave_type) {
    requests = requests.filter(r => r.leave_type.toLowerCase().includes(leave_type.toLowerCase()));
  }
  if (status) {
    requests = requests.filter(r => r.status.toLowerCase() === status.toLowerCase());
  }
  if (start_date) {
    requests = requests.filter(r => r.start_date >= start_date);
  }
  if (end_date) {
    requests = requests.filter(r => r.end_date <= end_date);
  }

  // Attach employee details (avatar, designation, dept) if not already present
  const enriched = requests.map(r => {
    const emp = db.findById('users', r.employee_id || r.user_id);
    return {
      ...r,
      employee_name: r.employee_name || emp?.name,
      employee_code: r.employee_code || emp?.employee_code,
      employee_avatar: emp?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${emp?.name || 'User'}`,
      designation: emp?.designation,
      department_id: r.department_id || emp?.department_id
    };
  });

  const sorted = enriched.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(sorted);
});

// POST /api/leaves/:id/cancel - Cancel leave request (Employee, Manager, HR Admin with mandatory reason before leave date)
router.post('/:id/cancel', authenticateToken, (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;

  const request = db.findById('leave_requests', id);
  if (!request) {
    return res.status(404).json({ error: 'Leave request not found' });
  }

  // Mandatory Reason check
  if (!reason || typeof reason !== 'string' || !reason.trim()) {
    return res.status(400).json({ error: 'A cancellation reason is mandatory to cancel a leave request.' });
  }

  // Authorization check: Employee (owner/creator), Manager, or HR Admin / Super Admin
  const isOwner = (request.user_id === req.user.id || request.employee_id === req.user.id);
  const isCreator = (request.created_by === req.user.id);
  const isAdmin = ['admin', 'super_admin', 'hr_admin'].includes(req.user.role);
  const isManager = req.user.role === 'manager';

  if (!isOwner && !isCreator && !isAdmin && !isManager) {
    return res.status(403).json({ error: 'You are not authorized to cancel this leave request.' });
  }

  // Check if already cancelled or rejected
  if (['Cancelled', 'Rejected'].includes(request.status)) {
    return res.status(400).json({ error: `Cannot cancel a leave request that is already ${request.status.toLowerCase()}.` });
  }

  // Date Check: Cancellation is allowed before or on the leave date, but NOT after the leave start date has passed
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  if (request.start_date < todayStr) {
    return res.status(400).json({
      error: `Cannot cancel leave: The leave start date (${request.start_date}) has already passed. Today is ${todayStr}.`
    });
  }

  // If the leave was already 'Approved', refund the balance back to the employee
  if (request.status === 'Approved') {
    const norm = (str) => (str || '').toLowerCase().replace(/[\(\)\s_-]/g, '');
    const reqNorm = norm(request.leave_type);
    const balance = db.findOne('leave_balances', b => {
      if (b.user_id !== request.user_id) return false;
      const bNorm = norm(b.leave_type);
      const codeNorm = norm(b.code);
      return bNorm.includes(reqNorm) || reqNorm.includes(bNorm) || codeNorm === reqNorm || reqNorm.includes(codeNorm);
    });
    if (balance && typeof balance.remaining_leaves === 'number') {
      db.updateById('leave_balances', balance.id, {
        used_leaves: Math.max(0, (balance.used_leaves || 0) - request.total_days),
        remaining_leaves: balance.remaining_leaves + request.total_days
      });
    }
  }

  const updated = db.updateById('leave_requests', id, {
    status: 'Cancelled',
    cancellation_reason: reason.trim(),
    cancelled_by: req.user.name,
    cancelled_by_role: req.user.role,
    cancelled_at: new Date().toISOString()
  });

  // Audit trail
  db.insert('audit_logs', {
    action: 'CANCEL_LEAVE',
    actor_id: req.user.id,
    actor_name: req.user.name,
    actor_role: req.user.role,
    leave_id: id,
    target_user_id: request.user_id,
    cancellation_reason: reason.trim(),
    previous_status: request.status,
    timestamp: new Date().toISOString()
  });

  res.json({
    message: 'Leave request cancelled successfully and leave balances refunded where applicable.',
    request: updated
  });
});

// GET /api/leaves/team-calendar - Leaves for calendar view (with employee avatars & statuses)
router.get('/team-calendar', authenticateToken, (req, res) => {
  let leaves = db.find('leave_requests', r => ['Approved', 'L1 Approved', 'Pending'].includes(r.status));

  if (req.user.role === 'employee') {
    leaves = leaves.filter(l => l.department_id === req.user.department_id || l.user_id === req.user.id);
  } else if (req.user.role === 'manager') {
    const hierarchy = getReportingHierarchy(req.user.id);
    const teamIds = hierarchy.map(m => m.id);
    teamIds.push(req.user.id);
    leaves = leaves.filter(l => teamIds.includes(l.user_id) || teamIds.includes(l.employee_id));
  }

  // Enrich with user metadata
  const enriched = leaves.map(l => {
    const emp = db.findById('users', l.employee_id || l.user_id);
    return {
      ...l,
      employee_name: l.employee_name || emp?.name,
      employee_code: l.employee_code || emp?.employee_code,
      employee_avatar: emp?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${emp?.name || 'User'}`,
      designation: emp?.designation
    };
  });

  res.json(enriched);
});

// GET /api/leaves/all - Admin all leave requests
router.get('/all', authenticateToken, requireRole(['admin']), (req, res) => {
  const all = db.getCollection('leave_requests');
  res.json([...all].reverse());
});

// PUT /api/leaves/balances/:id - Admin update leave balance
router.put('/balances/:id', authenticateToken, requireRole(['admin']), (req, res) => {
  const { total_leaves, used_leaves } = req.body;
  const balance = db.findById('leave_balances', req.params.id);
  if (!balance) return res.status(404).json({ error: 'Leave balance not found' });

  const total = total_leaves !== undefined ? Number(total_leaves) : balance.total_leaves;
  const used = used_leaves !== undefined ? Number(used_leaves) : balance.used_leaves;

  const updated = db.updateById('leave_balances', req.params.id, {
    total_leaves: total,
    used_leaves: used,
    remaining_leaves: Math.max(0, total - used)
  });

  res.json({ message: 'Balance updated', balance: updated });
});

export default router;
