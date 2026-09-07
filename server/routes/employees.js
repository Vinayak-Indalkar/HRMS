import express from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../db/database.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

// Helper to check for circular reporting dependencies
export const hasCircularReporting = (employeeId, line1Id, line2Id) => {
  if (!employeeId) return false;
  // Direct cycle: an employee cannot be their own manager
  if (line1Id && line1Id === employeeId) return true;
  if (line2Id && line2Id === employeeId) return true;

  const users = db.getCollection('users') || [];
  const userMap = new Map(users.map(u => [u.id, u]));

  // Check upwards from line1Id
  const visited = new Set([employeeId]);
  let curr = line1Id;
  while (curr) {
    if (visited.has(curr)) return true;
    visited.add(curr);
    const m = userMap.get(curr);
    curr = m?.reporting_manager_line_1_id || m?.manager_id || null;
  }

  // Check upwards from line2Id
  curr = line2Id;
  const visited2 = new Set([employeeId]);
  while (curr) {
    if (visited2.has(curr)) return true;
    visited2.add(curr);
    const m = userMap.get(curr);
    curr = m?.reporting_manager_line_1_id || m?.manager_id || null;
  }

  return false;
};

// GET /api/employees/directory - Accessible to all active users
router.get('/directory', authenticateToken, (req, res) => {
  const { search, department_id, designation } = req.query;

  let employees = db.find('users', u => u.status === 'active');

  if (search) {
    const s = search.toLowerCase().trim();
    employees = employees.filter(e =>
      e.name.toLowerCase().includes(s) ||
      e.email.toLowerCase().includes(s) ||
      e.employee_code.toLowerCase().includes(s) ||
      (e.designation && e.designation.toLowerCase().includes(s))
    );
  }

  if (department_id) {
    employees = employees.filter(e => e.department_id === department_id);
  }

  if (designation) {
    employees = employees.filter(e => e.designation === designation);
  }

  // Strip password hash and map reporting managers
  const safeList = employees.map(e => {
    const { password_hash, ...safe } = e;
    const l1MgrId = e.reporting_manager_line_1_id || e.manager_id;
    const l2MgrId = e.reporting_manager_line_2_id;
    const l1Mgr = l1MgrId ? db.findById('users', l1MgrId) : null;
    const l2Mgr = l2MgrId ? db.findById('users', l2MgrId) : null;
    const dept = e.department_id ? db.findById('departments', e.department_id) : null;
    return {
      ...safe,
      manager_id: l1MgrId || null,
      reporting_manager_line_1_id: l1MgrId || null,
      reporting_manager_line_2_id: l2MgrId || null,
      manager_name: l1Mgr?.name || 'None',
      reporting_manager_line_1_name: l1Mgr?.name || 'None',
      reporting_manager_line_1_designation: l1Mgr?.designation || '',
      reporting_manager_line_2_name: l2Mgr?.name || 'None',
      reporting_manager_line_2_designation: l2Mgr?.designation || '',
      department_name: dept?.name || 'General'
    };
  });

  res.json(safeList);
});

// GET /api/employees/departments - Departments list
router.get('/departments', authenticateToken, (req, res) => {
  res.json(db.getCollection('departments'));
});

// GET /api/employees/managers - List of users who can be managers (active managers and admins)
router.get('/managers', authenticateToken, (req, res) => {
  const managers = db.find('users', u =>
    ['manager', 'admin', 'super_admin', 'hr_admin'].includes(u.role) && u.status === 'active'
  );
  const safeList = managers.map(({ password_hash, ...m }) => {
    const dept = m.department_id ? db.findById('departments', m.department_id) : null;
    return {
      ...m,
      department_name: dept?.name || 'General'
    };
  });
  res.json(safeList);
});

// GET /api/employees - Admin complete list (active + inactive), sorted newest first by default
router.get('/', authenticateToken, requireRole(['admin']), (req, res) => {
  const { search, department_id, status } = req.query;
  let list = db.getCollection('users');

  if (search) {
    const s = search.toLowerCase().trim();
    list = list.filter(e =>
      e.name.toLowerCase().includes(s) ||
      e.email.toLowerCase().includes(s) ||
      e.employee_code.toLowerCase().includes(s) ||
      (e.designation && e.designation.toLowerCase().includes(s))
    );
  }

  if (department_id) {
    list = list.filter(e => e.department_id === department_id);
  }

  if (status) {
    list = list.filter(e => e.status === status);
  }

  // Sort newest first by created_at / createdAt / id
  list = [...list].sort((a, b) => {
    const timeA = new Date(a.created_at || a.createdAt || 0).getTime();
    const timeB = new Date(b.created_at || b.createdAt || 0).getTime();
    if (timeB !== timeA) return timeB - timeA;
    return (b.id || '').localeCompare(a.id || '');
  });

  const safeList = list.map(e => {
    const { password_hash, ...safe } = e;
    const l1MgrId = e.reporting_manager_line_1_id || e.manager_id;
    const l2MgrId = e.reporting_manager_line_2_id;
    const l1Mgr = l1MgrId ? db.findById('users', l1MgrId) : null;
    const l2Mgr = l2MgrId ? db.findById('users', l2MgrId) : null;
    const dept = e.department_id ? db.findById('departments', e.department_id) : null;
    return {
      ...safe,
      manager_id: l1MgrId || null,
      reporting_manager_line_1_id: l1MgrId || null,
      reporting_manager_line_2_id: l2MgrId || null,
      manager_name: l1Mgr?.name || 'None',
      reporting_manager_line_1_name: l1Mgr?.name || 'None',
      reporting_manager_line_1_designation: l1Mgr?.designation || '',
      reporting_manager_line_2_name: l2Mgr?.name || 'None',
      reporting_manager_line_2_designation: l2Mgr?.designation || '',
      department_name: dept?.name || 'General'
    };
  });

  res.json(safeList);
});

// GET /api/employees/:id - Employee profile
router.get('/:id', authenticateToken, (req, res) => {
  const user = db.findById('users', req.params.id);
  if (!user) return res.status(404).json({ error: 'Employee not found' });

  // Access check: User can view self, manager can view team, admin can view all
  if (req.user.role === 'employee' && req.user.id !== user.id) {
    const { password_hash, salary, ...publicProfile } = user;
    return res.json(publicProfile);
  }

  const { password_hash, ...safeUser } = user;
  const l1MgrId = user.reporting_manager_line_1_id || user.manager_id;
  const l2MgrId = user.reporting_manager_line_2_id;
  const l1Mgr = l1MgrId ? db.findById('users', l1MgrId) : null;
  const l2Mgr = l2MgrId ? db.findById('users', l2MgrId) : null;
  const dept = user.department_id ? db.findById('departments', user.department_id) : null;
  const balances = db.find('leave_balances', b => b.user_id === user.id);
  const history = db.find('employment_history', h => h.user_id === user.id)
    .sort((a, b) => new Date(b.event_date || b.createdAt) - new Date(a.event_date || a.createdAt));

  res.json({
    ...safeUser,
    manager_id: l1MgrId || null,
    reporting_manager_line_1_id: l1MgrId || null,
    reporting_manager_line_2_id: l2MgrId || null,
    manager_name: l1Mgr?.name || 'None',
    reporting_manager_line_1_name: l1Mgr?.name || 'None',
    reporting_manager_line_1_designation: l1Mgr?.designation || '',
    reporting_manager_line_2_name: l2Mgr?.name || 'None',
    reporting_manager_line_2_designation: l2Mgr?.designation || '',
    department_name: dept?.name || 'General',
    leave_balances: balances,
    employment_history: history
  });
});

// POST /api/employees - HR/Admin add new employee
router.post('/', authenticateToken, requireRole(['super_admin', 'hr_admin', 'admin']), (req, res) => {
  const {
    first_name,
    middle_name,
    last_name,
    preferred_name,
    name,
    personal_email,
    official_email,
    email,
    password,
    role = 'employee',
    roles,
    department_id,
    designation,
    job_title,
    employment_type = 'Full-time Regular',
    employment_status = 'active',
    status = 'active',
    work_location = 'Headquarters (Hybrid)',
    reporting_manager_line_1_id,
    reporting_manager_line_2_id,
    manager_id,
    joining_date,
    phone,
    mobile_number,
    address,
    dob,
    gender = 'Male',
    emergency_contact,
    blood_group,
    avatar_url,
    employee_code: customEmployeeCode
  } = req.body;

  // Resolve roles array
  let assignedRoles = Array.isArray(roles) && roles.length > 0 ? [...roles] : [role];
  if (role && !assignedRoles.includes(role)) assignedRoles.unshift(role);

  // Resolve composite and fallback fields
  const finalFirstName = (first_name || '').trim();
  const finalLastName = (last_name || '').trim();
  const finalName = (name || `${finalFirstName} ${finalLastName}`).trim();
  const finalOfficialEmail = (official_email || email || '').toLowerCase().trim();
  const finalPersonalEmail = (personal_email || '').toLowerCase().trim();
  const finalPhone = (phone || mobile_number || '').trim();
  const finalL1ManagerId = reporting_manager_line_1_id || manager_id || null;
  const finalL2ManagerId = reporting_manager_line_2_id || null;
  const finalStatus = employment_status || status || 'active';

  // Validations
  if (!finalName) {
    return res.status(400).json({ error: 'First Name and Last Name are required' });
  }
  if (!finalOfficialEmail) {
    return res.status(400).json({ error: 'Official Work Email is required' });
  }

  // RBAC rule: Only Super Admin can create Super Admin or HR Admin accounts
  const hasAdminRole = assignedRoles.includes('super_admin') || assignedRoles.includes('hr_admin');
  if (hasAdminRole && req.user.role !== 'super_admin') {
    return res.status(403).json({ error: 'Forbidden: Only Super Admin can assign administrative roles' });
  }

  // Validate official email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(finalOfficialEmail)) {
    return res.status(400).json({ error: 'Invalid Official Email address format' });
  }

  // Check official email uniqueness
  const existingEmail = db.findOne('users', u => u.email.toLowerCase() === finalOfficialEmail);
  if (existingEmail) {
    return res.status(400).json({ error: `Official email ${finalOfficialEmail} already exists. Please use a different email.` });
  }

  // Generate or validate employee code
  const allUsers = db.getCollection('users');
  let employee_code = (customEmployeeCode || '').trim().toUpperCase();
  if (employee_code) {
    const existingCode = db.findOne('users', u => (u.employee_code || '').toUpperCase() === employee_code);
    if (existingCode) {
      return res.status(400).json({ error: `Employee ID ${employee_code} already exists. Please use a different Employee ID.` });
    }
  } else {
    const maxCodeNum = allUsers.reduce((max, u) => {
      if (u.employee_code && u.employee_code.startsWith('EMP')) {
        const num = parseInt(u.employee_code.replace('EMP', ''));
        return !isNaN(num) && num > max ? num : max;
      }
      return max;
    }, 0);
    employee_code = `EMP${String(maxCodeNum + 1).padStart(3, '0')}`;
  }

  // Validate reporting structure and circular relationships
  if (finalL1ManagerId && finalL2ManagerId && finalL1ManagerId === finalL2ManagerId) {
    return res.status(400).json({ error: 'Reporting Manager Line 1 and Line 2 cannot be the same person.' });
  }

  const salt = bcrypt.genSaltSync(10);
  const defaultPassword = password || 'password123';
  const password_hash = bcrypt.hashSync(defaultPassword, salt);

  const newUser = db.insert('users', {
    employee_code,
    name: finalName,
    first_name: finalFirstName || finalName.split(' ')[0] || '',
    middle_name: (middle_name || '').trim(),
    last_name: finalLastName || (finalName.split(' ').slice(1).join(' ')) || '',
    preferred_name: (preferred_name || finalFirstName || finalName.split(' ')[0] || '').trim(),
    email: finalOfficialEmail,
    personal_email: finalPersonalEmail,
    password_hash,
    role: assignedRoles[0] || 'employee',
    active_role: assignedRoles[0] || 'employee',
    roles: assignedRoles,
    status: finalStatus,
    department_id: department_id || 'dept_eng',
    designation: designation || 'Software Engineer',
    job_title: job_title || designation || 'Software Engineer',
    employment_type: employment_type || 'Full-time Regular',
    work_location: work_location || 'Headquarters (Hybrid)',
    manager_id: finalL1ManagerId,
    reporting_manager_line_1_id: finalL1ManagerId,
    reporting_manager_line_2_id: finalL2ManagerId,
    joining_date: joining_date || new Date().toISOString().split('T')[0],
    phone: finalPhone,
    personal_mobile: finalPhone,
    address: address || '',
    dob: dob || '',
    gender: gender || 'Male',
    emergency_contact: emergency_contact || '',
    blood_group: blood_group || 'O+',
    avatar_url: avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(finalName)}`,
    created_at: new Date().toISOString()
  });

  // Check circular reporting if managers are set
  if (hasCircularReporting(newUser.id, finalL1ManagerId, finalL2ManagerId)) {
    // Delete newly created record to prevent corruption
    db.deleteById('users', newUser.id);
    return res.status(400).json({
      error: 'Circular reporting relationship detected! An employee cannot report to someone who reports to them.'
    });
  }

  // Initialize leave balances for new employee
  const settings = db.getSettings();
  const leaveConfigs = [
    { type: 'Casual Leave (CL)', code: 'CL', total: settings.casual_leave_quota || 6 },
    { type: 'Sick Leave (SL)', code: 'SL', total: settings.sick_leave_quota || 6 },
    { type: 'Earned Leave (EL)', code: 'EL', total: settings.earned_leave_quota || 8 },
    { type: 'Leave Without Pay (LWP)', code: 'LWP', total: 30 },
    { type: 'Half Day Leave', code: 'HD', total: 6 }
  ];

  leaveConfigs.forEach(c => {
    db.insert('leave_balances', {
      id: `bal_${newUser.id}_${c.type.toLowerCase().replace(/\s+/g, '_')}`,
      user_id: newUser.id,
      leave_type: c.type,
      total_leaves: c.total,
      used_leaves: 0,
      remaining_leaves: c.total,
      year: new Date().getFullYear()
    });
  });

  // Record initial employment history
  db.insert('employment_history', {
    user_id: newUser.id,
    event_type: 'JOINING',
    field_name: 'Employment Commenced',
    previous_value: 'N/A',
    new_value: `${newUser.designation} in ${department_id || 'General'}`,
    changed_by: req.user.name,
    changed_by_role: req.user.role,
    event_date: newUser.joining_date || new Date().toISOString().split('T')[0],
    notes: 'Initial employee onboarding and profile creation'
  });

  // Audit log
  db.insert('audit_logs', {
    action: 'CREATE_EMPLOYEE',
    actor_id: req.user.id,
    actor_name: req.user.name,
    actor_role: req.user.role,
    target_user_id: newUser.id,
    target_user_name: newUser.name,
    target_role: newUser.role,
    details: {
      employee_code: newUser.employee_code,
      department_id: newUser.department_id,
      designation: newUser.designation,
      reporting_manager_line_1_id: newUser.reporting_manager_line_1_id,
      reporting_manager_line_2_id: newUser.reporting_manager_line_2_id
    },
    timestamp: new Date().toISOString()
  });

  const { password_hash: _, ...safeUser } = newUser;
  res.status(201).json({
    message: `Employee ${newUser.name} has been added successfully.`,
    employee: safeUser,
    temporary_password: defaultPassword
  });
});

// PUT /api/employees/:id - Update employee & track employment history
router.put('/:id', authenticateToken, (req, res) => {
  const targetUser = db.findById('users', req.params.id);
  if (!targetUser) return res.status(404).json({ error: 'Employee not found' });

  const isSuperAdmin = req.user.role === 'super_admin';
  const isHrAdmin = req.user.role === 'hr_admin' || req.user.role === 'admin';
  const isAdmin = isSuperAdmin || isHrAdmin;
  const isSelf = req.user.id === targetUser.id;

  if (!isAdmin && !isSelf) {
    return res.status(403).json({ error: 'You are not authorized to modify this profile' });
  }

  // RBAC rule: HR Admin cannot modify Super Admin profile
  if (targetUser.role === 'super_admin' && !isSuperAdmin && !isSelf) {
    return res.status(403).json({ error: 'Forbidden: HR Admin cannot modify Super Admin accounts' });
  }

  // RBAC rule: Only Super Admin can change someone to/from super_admin or hr_admin
  const targetRoles = Array.isArray(targetUser.roles) && targetUser.roles.length > 0 ? targetUser.roles : [targetUser.role];
  const requestedRoles = req.body.roles !== undefined ? req.body.roles : (req.body.role ? [req.body.role] : null);

  if (requestedRoles) {
    const touchesAdmin = requestedRoles.includes('super_admin') || requestedRoles.includes('hr_admin') ||
                         targetRoles.includes('super_admin') || targetRoles.includes('hr_admin');
    if (touchesAdmin && !isSuperAdmin) {
      return res.status(403).json({ error: 'Forbidden: Only Super Admin can modify administrative roles' });
    }
  } else if (req.body.role !== undefined && req.body.role !== targetUser.role) {
    if (!isSuperAdmin) {
      return res.status(403).json({ error: 'Forbidden: Only Super Admin can modify user roles' });
    }
  }

  // Validate reporting structure & circular dependencies if manager IDs changed
  const proposedL1 = req.body.reporting_manager_line_1_id !== undefined
    ? req.body.reporting_manager_line_1_id
    : (req.body.manager_id !== undefined ? req.body.manager_id : targetUser.reporting_manager_line_1_id || targetUser.manager_id);
  const proposedL2 = req.body.reporting_manager_line_2_id !== undefined
    ? req.body.reporting_manager_line_2_id
    : targetUser.reporting_manager_line_2_id;

  if (proposedL1 && proposedL2 && proposedL1 === proposedL2) {
    return res.status(400).json({ error: 'Reporting Manager Line 1 and Line 2 cannot be the same person.' });
  }

  if (hasCircularReporting(targetUser.id, proposedL1, proposedL2)) {
    return res.status(400).json({
      error: 'Circular reporting relationship detected! An employee cannot report to someone who reports to them.'
    });
  }

  const updates = {};
  const historyEntries = [];

  // Self can update personal info
  if (req.body.phone !== undefined) updates.phone = req.body.phone;
  if (req.body.personal_mobile !== undefined) updates.personal_mobile = req.body.personal_mobile;
  if (req.body.address !== undefined) updates.address = req.body.address;
  if (req.body.dob !== undefined) updates.dob = req.body.dob;
  if (req.body.emergency_contact !== undefined) updates.emergency_contact = req.body.emergency_contact;
  if (req.body.blood_group !== undefined) updates.blood_group = req.body.blood_group;
  if (req.body.avatar_url !== undefined) updates.avatar_url = req.body.avatar_url;
  if (req.body.first_name !== undefined) updates.first_name = req.body.first_name;
  if (req.body.middle_name !== undefined) updates.middle_name = req.body.middle_name;
  if (req.body.last_name !== undefined) updates.last_name = req.body.last_name;
  if (req.body.preferred_name !== undefined) updates.preferred_name = req.body.preferred_name;
  if (req.body.personal_email !== undefined) updates.personal_email = req.body.personal_email;
  if (req.body.gender !== undefined) updates.gender = req.body.gender;

  // Admin can update organizational / sensitive fields
  if (isAdmin) {
    if (req.body.name !== undefined) updates.name = req.body.name;
    if (req.body.email !== undefined) updates.email = req.body.email.toLowerCase().trim();
    if (req.body.roles !== undefined && Array.isArray(req.body.roles) && req.body.roles.length > 0) {
      updates.roles = req.body.roles;
      if (!updates.roles.includes(targetUser.active_role)) {
        updates.active_role = updates.roles[0];
        updates.role = updates.roles[0];
      }
    }
    if (req.body.role !== undefined) {
      updates.role = req.body.role;
      updates.active_role = req.body.role;
      if (!updates.roles) {
        const existingRoles = Array.isArray(targetUser.roles) ? [...targetUser.roles] : [];
        if (!existingRoles.includes(req.body.role)) existingRoles.unshift(req.body.role);
        updates.roles = existingRoles;
      }
    }

    // Track Department Change
    if (req.body.department_id !== undefined && req.body.department_id !== targetUser.department_id) {
      const oldDept = db.findById('departments', targetUser.department_id);
      const newDept = db.findById('departments', req.body.department_id);
      updates.department_id = req.body.department_id;
      historyEntries.push({
        event_type: 'DEPARTMENT_CHANGED',
        field_name: 'Department',
        previous_value: oldDept?.name || targetUser.department_id,
        new_value: newDept?.name || req.body.department_id
      });
    }

    // Track Designation Change
    if (req.body.designation !== undefined && req.body.designation !== targetUser.designation) {
      historyEntries.push({
        event_type: 'DESIGNATION_CHANGED',
        field_name: 'Designation',
        previous_value: targetUser.designation || 'None',
        new_value: req.body.designation
      });
      updates.designation = req.body.designation;
    }

    // Track Job Title Change
    if (req.body.job_title !== undefined && req.body.job_title !== targetUser.job_title) {
      historyEntries.push({
        event_type: 'JOB_TITLE_CHANGED',
        field_name: 'Job Title',
        previous_value: targetUser.job_title || targetUser.designation || 'None',
        new_value: req.body.job_title
      });
      updates.job_title = req.body.job_title;
    }

    // Track Work Location Change
    if (req.body.work_location !== undefined && req.body.work_location !== targetUser.work_location) {
      historyEntries.push({
        event_type: 'WORK_LOCATION_CHANGED',
        field_name: 'Work Location',
        previous_value: targetUser.work_location || 'Headquarters',
        new_value: req.body.work_location
      });
      updates.work_location = req.body.work_location;
    }

    // Track Employment Type Change
    if (req.body.employment_type !== undefined && req.body.employment_type !== targetUser.employment_type) {
      historyEntries.push({
        event_type: 'EMPLOYMENT_TYPE_CHANGED',
        field_name: 'Employment Type',
        previous_value: targetUser.employment_type || 'Full-time Regular',
        new_value: req.body.employment_type
      });
      updates.employment_type = req.body.employment_type;
    }

    // Track Line 1 Manager Change
    if (proposedL1 !== (targetUser.reporting_manager_line_1_id || targetUser.manager_id)) {
      const oldMgr = (targetUser.reporting_manager_line_1_id || targetUser.manager_id) ? db.findById('users', targetUser.reporting_manager_line_1_id || targetUser.manager_id) : null;
      const newMgr = proposedL1 ? db.findById('users', proposedL1) : null;
      updates.manager_id = proposedL1;
      updates.reporting_manager_line_1_id = proposedL1;
      historyEntries.push({
        event_type: 'REPORTING_MANAGER_CHANGED',
        field_name: 'Reporting Manager — Line 1',
        previous_value: oldMgr?.name || 'None',
        new_value: newMgr?.name || 'None'
      });
    }

    // Track Line 2 Manager Change
    if (proposedL2 !== targetUser.reporting_manager_line_2_id) {
      const oldMgr2 = targetUser.reporting_manager_line_2_id ? db.findById('users', targetUser.reporting_manager_line_2_id) : null;
      const newMgr2 = proposedL2 ? db.findById('users', proposedL2) : null;
      updates.reporting_manager_line_2_id = proposedL2;
      historyEntries.push({
        event_type: 'LINE_2_MANAGER_CHANGED',
        field_name: 'Reporting Manager — Line 2',
        previous_value: oldMgr2?.name || 'None',
        new_value: newMgr2?.name || 'None'
      });
    }

    // Track Status Change
    if (req.body.status !== undefined && req.body.status !== targetUser.status) {
      historyEntries.push({
        event_type: 'STATUS_CHANGED',
        field_name: 'Employment Status',
        previous_value: targetUser.status,
        new_value: req.body.status
      });
      updates.status = req.body.status;
    }

    if (req.body.joining_date !== undefined) updates.joining_date = req.body.joining_date;
  }

  const updated = db.updateById('users', targetUser.id, updates);

  // Automatically record employment history entries
  const todayIso = new Date().toISOString();
  historyEntries.forEach(entry => {
    db.insert('employment_history', {
      user_id: targetUser.id,
      event_type: entry.event_type,
      field_name: entry.field_name,
      previous_value: entry.previous_value,
      new_value: entry.new_value,
      changed_by: req.user.name,
      changed_by_role: req.user.role,
      event_date: todayIso.split('T')[0],
      createdAt: todayIso
    });
  });

  // Audit log
  if (isAdmin) {
    db.insert('audit_logs', {
      action: 'UPDATE_EMPLOYEE',
      actor_id: req.user.id,
      actor_name: req.user.name,
      actor_role: req.user.role,
      target_user_id: targetUser.id,
      target_user_name: targetUser.name,
      history_events: historyEntries.map(h => `${h.field_name}: ${h.previous_value} → ${h.new_value}`),
      new_values: updates,
      timestamp: todayIso
    });
  }

  const { password_hash, ...safeUser } = updated;
  res.json({
    message: 'Profile updated successfully',
    employee: safeUser,
    history_entries_added: historyEntries.length
  });
});

// PATCH /api/employees/:id/status - Admin activate / deactivate
router.patch('/:id/status', authenticateToken, requireRole(['super_admin', 'hr_admin', 'admin']), (req, res) => {
  const { status } = req.body;
  if (!['active', 'inactive'].includes(status)) {
    return res.status(400).json({ error: "Status must be 'active' or 'inactive'" });
  }

  const target = db.findById('users', req.params.id);
  if (!target) return res.status(404).json({ error: 'Employee not found' });

  if (target.id === req.user.id) {
    return res.status(400).json({ error: 'You cannot deactivate your own account' });
  }

  // Super Admin cannot be deactivated by anyone
  if (target.role === 'super_admin') {
    return res.status(403).json({ error: 'Forbidden: Super Admin cannot be deactivated' });
  }

  // HR Admin cannot deactivate HR Admin or Super Admin
  if (req.user.role === 'hr_admin' && target.role === 'hr_admin') {
    return res.status(403).json({ error: 'Forbidden: Only Super Admin can deactivate an HR Admin account' });
  }

  const updated = db.updateById('users', target.id, { status });

  // Audit log
  db.insert('audit_logs', {
    action: status === 'active' ? 'ACTIVATE_EMPLOYEE' : 'DEACTIVATE_EMPLOYEE',
    actor_id: req.user.id,
    actor_name: req.user.name,
    actor_role: req.user.role,
    target_user_id: target.id,
    target_user_name: target.name,
    target_role: target.role,
    timestamp: new Date().toISOString()
  });

  const { password_hash, ...safe } = updated;
  res.json({ message: `Employee status changed to ${status}`, employee: safe });
});

export default router;
