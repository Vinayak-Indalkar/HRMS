export const PERMISSIONS = {
  // System & Settings
  SYSTEM_SETTINGS_MANAGE: 'system:settings:manage',
  ROLE_MANAGE: 'role:manage',
  USER_MANAGE_ALL: 'user:manage:all',
  USER_MANAGE_HR: 'user:manage:hr',

  // Employees & Organization
  EMPLOYEE_CREATE: 'employee:create',
  EMPLOYEE_EDIT_ALL: 'employee:edit:all',
  EMPLOYEE_DEACTIVATE: 'employee:deactivate',
  EMPLOYEE_PROFILE_HR_FIELDS: 'employee:profile:hr_fields',
  DEPARTMENT_MANAGE: 'department:manage',
  DESIGNATION_MANAGE: 'designation:manage',

  // Attendance
  ATTENDANCE_VIEW_ALL: 'attendance:view:all',
  ATTENDANCE_VIEW_TEAM: 'attendance:view:team',
  ATTENDANCE_VIEW_OWN: 'attendance:view:own',
  ATTENDANCE_EDIT_ALL: 'attendance:edit:all',
  ATTENDANCE_MANUAL_ADD: 'attendance:manual:add',
  ATTENDANCE_PUNCH: 'attendance:punch',

  // Leaves
  LEAVE_APPLY_OWN: 'leave:apply:own',
  LEAVE_APPLY_TEAM: 'leave:apply:team',
  LEAVE_APPLY_ALL: 'leave:apply:all',
  LEAVE_APPROVE_TEAM: 'leave:approve:team',
  LEAVE_APPROVE_ALL: 'leave:approve:all',
  LEAVE_BALANCE_MANAGE: 'leave:balance:manage',
  LEAVE_POLICY_MANAGE: 'leave:policy:manage',

  // Documents, Holidays, Announcements
  DOCUMENT_VERIFY: 'document:verify',
  DOCUMENT_VIEW_ALL: 'document:view:all',
  DOCUMENT_UPLOAD_OWN: 'document:upload:own',
  HOLIDAY_MANAGE: 'holiday:manage',
  HOLIDAY_VIEW: 'holiday:view',
  ANNOUNCEMENT_MANAGE: 'announcement:manage',
  ANNOUNCEMENT_VIEW: 'announcement:view',

  // Reports & Audit
  REPORTS_ALL: 'reports:all',
  REPORTS_HR: 'reports:hr',
  REPORTS_TEAM: 'reports:team',
  AUDIT_VIEW_ALL: 'audit:view:all',
  AUDIT_VIEW_HR: 'audit:view:hr'
};

export const ROLE_PERMISSIONS = {
  super_admin: Object.values(PERMISSIONS),

  hr_admin: [
    PERMISSIONS.USER_MANAGE_HR,
    PERMISSIONS.EMPLOYEE_CREATE,
    PERMISSIONS.EMPLOYEE_EDIT_ALL,
    PERMISSIONS.EMPLOYEE_DEACTIVATE,
    PERMISSIONS.EMPLOYEE_PROFILE_HR_FIELDS,
    PERMISSIONS.DEPARTMENT_MANAGE,
    PERMISSIONS.DESIGNATION_MANAGE,

    PERMISSIONS.ATTENDANCE_VIEW_ALL,
    PERMISSIONS.ATTENDANCE_VIEW_TEAM,
    PERMISSIONS.ATTENDANCE_VIEW_OWN,
    PERMISSIONS.ATTENDANCE_EDIT_ALL,
    PERMISSIONS.ATTENDANCE_MANUAL_ADD,
    PERMISSIONS.ATTENDANCE_PUNCH,

    PERMISSIONS.LEAVE_APPLY_OWN,
    PERMISSIONS.LEAVE_APPLY_TEAM,
    PERMISSIONS.LEAVE_APPLY_ALL,
    PERMISSIONS.LEAVE_APPROVE_TEAM,
    PERMISSIONS.LEAVE_APPROVE_ALL,
    PERMISSIONS.LEAVE_BALANCE_MANAGE,
    PERMISSIONS.LEAVE_POLICY_MANAGE,

    PERMISSIONS.DOCUMENT_VERIFY,
    PERMISSIONS.DOCUMENT_VIEW_ALL,
    PERMISSIONS.DOCUMENT_UPLOAD_OWN,
    PERMISSIONS.HOLIDAY_MANAGE,
    PERMISSIONS.HOLIDAY_VIEW,
    PERMISSIONS.ANNOUNCEMENT_MANAGE,
    PERMISSIONS.ANNOUNCEMENT_VIEW,

    PERMISSIONS.REPORTS_HR,
    PERMISSIONS.REPORTS_TEAM,
    PERMISSIONS.AUDIT_VIEW_HR
  ],

  manager: [
    PERMISSIONS.ATTENDANCE_VIEW_OWN,
    PERMISSIONS.ATTENDANCE_PUNCH,
    PERMISSIONS.LEAVE_APPLY_OWN,
    PERMISSIONS.DOCUMENT_UPLOAD_OWN,
    PERMISSIONS.HOLIDAY_VIEW,
    PERMISSIONS.ANNOUNCEMENT_VIEW,

    PERMISSIONS.ATTENDANCE_VIEW_TEAM,
    PERMISSIONS.LEAVE_APPLY_TEAM,
    PERMISSIONS.LEAVE_APPROVE_TEAM,
    PERMISSIONS.REPORTS_TEAM
  ],

  employee: [
    PERMISSIONS.ATTENDANCE_VIEW_OWN,
    PERMISSIONS.ATTENDANCE_PUNCH,
    PERMISSIONS.LEAVE_APPLY_OWN,
    PERMISSIONS.DOCUMENT_UPLOAD_OWN,
    PERMISSIONS.HOLIDAY_VIEW,
    PERMISSIONS.ANNOUNCEMENT_VIEW
  ]
};

export const hasPermission = (user, permission) => {
  if (!user || !user.role) return false;
  const role = user.role.toLowerCase();
  if (role === 'super_admin' || role === 'admin') return true;

  const perms = ROLE_PERMISSIONS[role] || [];
  return perms.includes(permission);
};
