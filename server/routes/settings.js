import express from 'express';
import { db } from '../db/database.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { hasPermission, PERMISSIONS, ROLE_PERMISSIONS } from '../config/permissions.js';

const router = express.Router();

// GET /api/settings - Company and policy settings
router.get('/', authenticateToken, (req, res) => {
  res.json(db.getSettings());
});

// PUT /api/settings - Update company settings (Super Admin only)
router.put('/', authenticateToken, (req, res) => {
  if (req.user.role !== 'super_admin') {
    return res.status(403).json({
      error: 'Forbidden: Only Super Admin can modify core system settings'
    });
  }

  const updated = db.updateSettings(req.body);

  // Record in audit log
  db.insert('audit_logs', {
    action: 'UPDATE_SYSTEM_SETTINGS',
    actor_id: req.user.id,
    actor_name: req.user.name,
    actor_role: req.user.role,
    details: req.body,
    timestamp: new Date().toISOString()
  });

  res.json({
    message: 'Settings updated successfully',
    settings: updated
  });
});

// GET /api/settings/audit-logs - System & HR Audit trail
router.get('/audit-logs', authenticateToken, (req, res) => {
  const role = req.user.role;
  if (!['super_admin', 'hr_admin', 'admin'].includes(role)) {
    return res.status(403).json({ error: 'Forbidden: You do not have permission to view audit logs' });
  }

  const allLogs = db.getCollection('audit_logs') || [];

  if (role === 'super_admin' || role === 'admin') {
    // Super Admin gets full system audit trail
    return res.json([...allLogs].reverse());
  }

  // HR Admin gets HR-relevant audit logs (leaves, employee edits, attendance)
  const hrLogs = allLogs.filter(log => {
    const act = (log.action || '').toUpperCase();
    return !act.includes('SYSTEM_SETTINGS') && !act.includes('ROLE_ASSIGN');
  });

  res.json([...hrLogs].reverse());
});

// GET /api/settings/permissions - List all available system permissions catalog
router.get('/permissions', authenticateToken, requireRole(['super_admin', 'admin']), (req, res) => {
  const permissionCategories = [
    {
      category: 'System & Organization',
      permissions: [
        { id: PERMISSIONS.SYSTEM_SETTINGS_MANAGE, label: 'Manage System Settings', description: 'Configure corporate information, working hours, and global company policies' },
        { id: PERMISSIONS.ROLE_MANAGE, label: 'Manage Roles & Permissions', description: 'Create custom roles and configure permission matrices' },
        { id: PERMISSIONS.DEPARTMENT_MANAGE, label: 'Manage Departments', description: 'Create, update, and manage company departments' },
        { id: PERMISSIONS.DESIGNATION_MANAGE, label: 'Manage Designations', description: 'Configure job titles and designations' }
      ]
    },
    {
      category: 'User & Employee Administration',
      permissions: [
        { id: PERMISSIONS.USER_MANAGE_ALL, label: 'Manage All Users', description: 'Create, update, and manage user accounts and access credentials' },
        { id: PERMISSIONS.EMPLOYEE_CREATE, label: 'Add Employees', description: 'Onboard new employees with personal and professional records' },
        { id: PERMISSIONS.EMPLOYEE_EDIT_ALL, label: 'Edit All Employees', description: 'Update profile and work records for any employee' },
        { id: PERMISSIONS.EMPLOYEE_DEACTIVATE, label: 'Deactivate Employees', description: 'Archive and deactivate employee portal access' },
        { id: PERMISSIONS.EMPLOYEE_PROFILE_HR_FIELDS, label: 'Manage HR Profile Fields', description: 'Manage compensation, compliance, and demographic fields' }
      ]
    },
    {
      category: 'Attendance & Timetracking',
      permissions: [
        { id: PERMISSIONS.ATTENDANCE_VIEW_ALL, label: 'View Company Attendance', description: 'Access global calendar and list view attendance logs' },
        { id: PERMISSIONS.ATTENDANCE_VIEW_TEAM, label: 'View Team Attendance', description: 'Inspect attendance and clock times for direct reports' },
        { id: PERMISSIONS.ATTENDANCE_EDIT_ALL, label: 'Regularize Attendance', description: 'Regularize, adjust, and override punch in/out timestamps' },
        { id: PERMISSIONS.ATTENDANCE_MANUAL_ADD, label: 'Manual Attendance Add', description: 'Create manual attendance records for past days' },
        { id: PERMISSIONS.ATTENDANCE_PUNCH, label: 'Punch In / Punch Out', description: 'Clock in and clock out for work shifts' }
      ]
    },
    {
      category: 'Leave Management',
      permissions: [
        { id: PERMISSIONS.LEAVE_APPROVE_ALL, label: 'Approve All Leaves', description: 'Company-wide final leave approvals and rejections' },
        { id: PERMISSIONS.LEAVE_APPROVE_TEAM, label: 'Approve Team Leaves', description: 'Review and approve leave applications from team members' },
        { id: PERMISSIONS.LEAVE_APPLY_TEAM, label: 'Apply Leave for Team', description: 'Submit leave applications on behalf of team members' },
        { id: PERMISSIONS.LEAVE_BALANCE_MANAGE, label: 'Manage Leave Balances', description: 'Adjust and grant annual leave balances and quotas' },
        { id: PERMISSIONS.LEAVE_POLICY_MANAGE, label: 'Manage Leave Policies', description: 'Configure leave types, limits, and approval rules' }
      ]
    },
    {
      category: 'Communications & Documents',
      permissions: [
        { id: PERMISSIONS.HOLIDAY_MANAGE, label: 'Manage Holidays', description: 'Publish and modify corporate holiday schedule' },
        { id: PERMISSIONS.ANNOUNCEMENT_MANAGE, label: 'Manage Announcements', description: 'Broadcast company announcements and urgent alerts' },
        { id: PERMISSIONS.DOCUMENT_VIEW_ALL, label: 'View All Documents', description: 'Access company documents and employee records' },
        { id: PERMISSIONS.DOCUMENT_VERIFY, label: 'Verify Documents', description: 'Review and approve uploaded employee identification documents' }
      ]
    },
    {
      category: 'Reports & Auditing',
      permissions: [
        { id: PERMISSIONS.REPORTS_ALL, label: 'Access All Analytics & Reports', description: 'View full executive analytics, headcount, and KPI reports' },
        { id: PERMISSIONS.REPORTS_HR, label: 'Access HR Reports', description: 'Generate attendance summaries and headcount reports' },
        { id: PERMISSIONS.AUDIT_VIEW_ALL, label: 'View System Audit Trail', description: 'Audit security logs, changes, and user activities' }
      ]
    }
  ];

  res.json({
    permissions: PERMISSIONS,
    categories: permissionCategories
  });
});

// GET /api/settings/roles - List all roles with assigned permissions
router.get('/roles', authenticateToken, requireRole(['super_admin', 'admin']), (req, res) => {
  let roles = db.getCollection('roles');

  // If roles collection doesn't exist or is empty, initialize with system standard roles
  if (!roles || roles.length === 0) {
    const defaultRoles = [
      {
        id: 'role_super_admin',
        key: 'super_admin',
        name: 'Super Administrator',
        description: 'Complete, unrestricted access to all HRMS platform modules and settings',
        is_system: true,
        permissions: Object.values(PERMISSIONS)
      },
      {
        id: 'role_hr_admin',
        key: 'hr_admin',
        name: 'HR Administrator',
        description: 'Comprehensive HR operations, employee management, attendance & leave governance',
        is_system: true,
        permissions: ROLE_PERMISSIONS.hr_admin || []
      },
      {
        id: 'role_manager',
        key: 'manager',
        name: 'Line Manager (L1 / L2)',
        description: 'Team oversight, attendance monitoring, and leave review for direct reports',
        is_system: true,
        permissions: ROLE_PERMISSIONS.manager || []
      },
      {
        id: 'role_employee',
        key: 'employee',
        name: 'Employee (Individual Contributor)',
        description: 'Employee self-service, punch clock, leave requests, and document viewing',
        is_system: true,
        permissions: ROLE_PERMISSIONS.employee || []
      }
    ];

    defaultRoles.forEach(r => db.insert('roles', r));
    roles = db.getCollection('roles');
  }

  // Count active users in each role
  const users = db.getCollection('users') || [];
  const rolesWithUserCount = roles.map(r => {
    const count = users.filter(u => u.role === r.key || u.role === r.id).length;
    return {
      ...r,
      user_count: count
    };
  });

  res.json(rolesWithUserCount);
});

// POST /api/settings/roles - Create a new custom role with permissions
router.post('/roles', authenticateToken, requireRole(['super_admin', 'admin']), (req, res) => {
  const { name, description, permissions = [] } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Role name is required' });
  }

  const roleKey = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_');
  const existing = db.findOne('roles', r => r.key === roleKey || r.name.toLowerCase() === name.trim().toLowerCase());
  if (existing) {
    return res.status(400).json({ error: `A role with name "${name}" or key "${roleKey}" already exists` });
  }

  const newRole = db.insert('roles', {
    id: `role_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    key: roleKey,
    name: name.trim(),
    description: description ? description.trim() : 'Custom organizational role',
    is_system: false,
    permissions: Array.isArray(permissions) ? permissions : []
  });

  // Audit log
  db.insert('audit_logs', {
    action: 'CREATE_ROLE',
    actor_id: req.user.id,
    actor_name: req.user.name,
    actor_role: req.user.role,
    role_name: newRole.name,
    role_key: newRole.key,
    permissions_count: newRole.permissions.length,
    timestamp: new Date().toISOString()
  });

  res.status(201).json({
    message: 'Role created successfully',
    role: newRole
  });
});

// PUT /api/settings/roles/:id - Update role details and assign permissions
router.put('/roles/:id', authenticateToken, requireRole(['super_admin', 'admin']), (req, res) => {
  const { id } = req.params;
  const { name, description, permissions } = req.body;

  const role = db.findById('roles', id) || db.findOne('roles', r => r.key === id);
  if (!role) {
    return res.status(404).json({ error: 'Role not found' });
  }

  const updatePayload = {};
  if (name && !role.is_system) {
    updatePayload.name = name.trim();
  }
  if (description !== undefined) {
    updatePayload.description = description.trim();
  }
  if (permissions !== undefined && Array.isArray(permissions)) {
    // Super admin role retains all permissions
    if (role.key === 'super_admin') {
      updatePayload.permissions = Object.values(PERMISSIONS);
    } else {
      updatePayload.permissions = permissions;
    }
  }

  const updatedRole = db.updateById('roles', role.id, updatePayload);

  // Audit log
  db.insert('audit_logs', {
    action: 'UPDATE_ROLE_PERMISSIONS',
    actor_id: req.user.id,
    actor_name: req.user.name,
    actor_role: req.user.role,
    role_name: updatedRole.name,
    role_key: updatedRole.key,
    permissions_count: updatedRole.permissions.length,
    timestamp: new Date().toISOString()
  });

  res.json({
    message: 'Role permissions updated successfully',
    role: updatedRole
  });
});

// DELETE /api/settings/roles/:id - Delete a custom role
router.delete('/roles/:id', authenticateToken, requireRole(['super_admin', 'admin']), (req, res) => {
  const { id } = req.params;
  const role = db.findById('roles', id) || db.findOne('roles', r => r.key === id);
  if (!role) {
    return res.status(404).json({ error: 'Role not found' });
  }

  if (role.is_system) {
    return res.status(400).json({ error: 'System core roles cannot be deleted' });
  }

  // Check if any user is currently assigned this role
  const users = db.getCollection('users') || [];
  const assignedUsers = users.filter(u => u.role === role.key || u.role === role.id);
  if (assignedUsers.length > 0) {
    return res.status(400).json({
      error: `Cannot delete role "${role.name}" because ${assignedUsers.length} active employee(s) are currently assigned to it.`
    });
  }

  db.deleteById('roles', role.id);

  // Audit log
  db.insert('audit_logs', {
    action: 'DELETE_ROLE',
    actor_id: req.user.id,
    actor_name: req.user.name,
    actor_role: req.user.role,
    role_name: role.name,
    timestamp: new Date().toISOString()
  });

  res.json({ message: 'Role deleted successfully' });
});

export default router;
