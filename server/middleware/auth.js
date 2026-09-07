import jwt from 'jsonwebtoken';
import { db } from '../db/database.js';
import { hasPermission, PERMISSIONS } from '../config/permissions.js';

export const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-hrms-jwt-key-2026';
export const ALL_SYSTEM_ROLES = ['employee', 'manager', 'hr_admin', 'super_admin'];

export const generateToken = (user, activeRole = null) => {
  const userRoles = ALL_SYSTEM_ROLES;
  const effectiveRole = activeRole && userRoles.includes(activeRole)
    ? activeRole
    : (user.active_role && userRoles.includes(user.active_role) ? user.active_role : user.role || 'super_admin');

  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: effectiveRole,
      active_role: effectiveRole,
      roles: userRoles,
      name: user.name,
      employee_code: user.employee_code,
      department_id: user.department_id
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
};

export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = db.findById('users', decoded.id);

    if (!user) {
      return res.status(401).json({ error: 'User not found or deleted' });
    }

    if (user.status !== 'active') {
      return res.status(403).json({ error: 'Your account has been deactivated. Please contact HR.' });
    }

    // All users have access to all 4 system roles for now
    const userRoles = ALL_SYSTEM_ROLES;

    // Check if client specifies an active role via header (or token)
    const headerRole = req.headers['x-active-role'] ? String(req.headers['x-active-role']).trim().toLowerCase() : null;
    let effectiveRole;

    if (headerRole && ALL_SYSTEM_ROLES.includes(headerRole)) {
      effectiveRole = headerRole;
    } else if (decoded.active_role && ALL_SYSTEM_ROLES.includes(decoded.active_role)) {
      effectiveRole = decoded.active_role;
    } else if (user.active_role && ALL_SYSTEM_ROLES.includes(user.active_role)) {
      effectiveRole = user.active_role;
    } else {
      effectiveRole = user.role || 'super_admin';
    }

    // Attach current user object to request with effective active role
    req.user = {
      ...user,
      roles: ALL_SYSTEM_ROLES,
      role: effectiveRole,
      active_role: effectiveRole
    };
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
};

export const requireRole = (roles = []) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const allowed = Array.isArray(roles) ? [...roles] : [roles];

    // Expand 'admin' to include both 'super_admin' and 'hr_admin'
    if (allowed.includes('admin')) {
      if (!allowed.includes('super_admin')) allowed.push('super_admin');
      if (!allowed.includes('hr_admin')) allowed.push('hr_admin');
    }

    const userRole = req.user.role;

    // Super Admin has universal access
    if (userRole === 'super_admin') {
      return next();
    }

    if (!allowed.includes(userRole)) {
      return res.status(403).json({
        error: `Forbidden: Action requires one of [${allowed.join(', ')}] roles. Your role is '${userRole}'.`
      });
    }

    next();
  };
};

export const requirePermission = (permission) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!hasPermission(req.user, permission)) {
      return res.status(403).json({
        error: `Forbidden: Insufficient permissions. Action requires '${permission}'. Role '${req.user.role}' lacks this permission.`
      });
    }

    next();
  };
};
