import express from 'express';
import { db } from '../db/database.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

/**
 * Helper: Check if targetEmployeeId reports directly or indirectly to managerId
 */
const isManagerOf = (managerId, targetEmployeeId) => {
  if (managerId === targetEmployeeId) return true; // Allowed for multi-role testing
  const target = db.findById('users', targetEmployeeId);
  if (!target) return true;

  const l1Id = target.reporting_manager_line_1_id || target.manager_id;
  const l2Id = target.reporting_manager_line_2_id;

  if (l1Id === managerId || l2Id === managerId) return true;

  // Check recursively up the chain
  let visited = new Set([targetEmployeeId]);
  let queue = [];
  if (l1Id) queue.push(l1Id);
  if (l2Id) queue.push(l2Id);

  while (queue.length > 0) {
    const curr = queue.shift();
    if (curr === managerId) return true;
    if (visited.has(curr)) continue;
    visited.add(curr);

    const u = db.findById('users', curr);
    if (u) {
      const p1 = u.reporting_manager_line_1_id || u.manager_id;
      const p2 = u.reporting_manager_line_2_id;
      if (p1 && !visited.has(p1)) queue.push(p1);
      if (p2 && !visited.has(p2)) queue.push(p2);
    }
  }

  return false;
};

/**
 * Helper: Calculate Achievement % based on direction & measurement type
 */
const calculateAchievement = (target, current, direction) => {
  const t = Number(target) || 0;
  const c = Number(current) || 0;

  if (t === 0) return c > 0 ? 100 : 0;

  let pct = 0;
  switch (direction) {
    case 'Lower is Better':
      pct = c <= 0 ? 150 : Math.min(200, (t / c) * 100);
      break;
    case 'Exact Target':
      pct = c === t ? 100 : Math.max(0, (1 - Math.abs(t - c) / t) * 100);
      break;
    case 'Completion Based':
      pct = c >= t ? 100 : Math.min(99, (c / t) * 100);
      break;
    case 'Higher is Better':
    default:
      pct = (c / t) * 100;
      break;
  }

  return Math.round(pct * 10) / 10;
};

/**
 * Helper: Determine status from achievement, due date, and thresholds
 */
const determineStatus = (achievement, endDate, onTrackThresh = 80, atRiskThresh = 50) => {
  const isPastDue = endDate && new Date(endDate) < new Date();

  if (achievement >= 100) return 'Completed';
  if (isPastDue && achievement < 100) return 'Overdue';
  if (achievement >= onTrackThresh) return 'On Track';
  if (achievement >= atRiskThresh) return 'At Risk';
  if (achievement > 0) return 'Behind';
  return 'Not Started';
};

/**
 * Helper: Log KPI Audit Trail
 */
const logKpiAudit = (userId, action, entityType, entityId, oldValue, newValue) => {
  db.insert('kpi_audit_logs', {
    id: `kpi_audit_${Date.now()}_${Math.random().toString(36).substring(7)}`,
    user_id: userId,
    action,
    entity_type: entityType,
    entity_id: entityId,
    old_value: typeof oldValue === 'object' ? JSON.stringify(oldValue) : oldValue,
    new_value: typeof newValue === 'object' ? JSON.stringify(newValue) : newValue,
    created_at: new Date().toISOString()
  });
};

/**
 * Helper: Send Notification
 */
const notifyUser = (userId, title, message, link = '/kpi-dashboard') => {
  db.insert('notifications', {
    id: `notif_${Date.now()}_${Math.random().toString(36).substring(7)}`,
    user_id: userId,
    title,
    message,
    link,
    read: false,
    createdAt: new Date().toISOString()
  });
};

// ==========================================
// 1. KPI SETTINGS & PERIODS
// ==========================================

// GET /api/kpi/settings
router.get('/settings', authenticateToken, (req, res) => {
  const settings = db.getSettings();
  res.json(settings.kpi_settings || {
    on_track_threshold: 80,
    at_risk_threshold: 50,
    allow_employee_self_assign: false,
    require_evidence_above_threshold: true
  });
});

// PUT /api/kpi/settings (HR Admin / Super Admin)
router.put('/settings', authenticateToken, requireRole(['super_admin', 'hr_admin', 'admin']), (req, res) => {
  const settings = db.getSettings();
  const updated = {
    ...settings.kpi_settings,
    ...req.body
  };
  settings.kpi_settings = updated;
  db.saveSync();
  logKpiAudit(req.user.id, 'SETTINGS_UPDATED', 'kpi_settings', 'global', {}, updated);
  res.json({ message: 'KPI settings updated successfully', settings: updated });
});

// GET /api/kpi/periods
router.get('/periods', authenticateToken, (req, res) => {
  const periods = db.getCollection('kpi_periods').sort((a, b) => new Date(b.start_date) - new Date(a.start_date));
  res.json(periods);
});

// POST /api/kpi/periods (HR Admin / Super Admin)
router.post('/periods', authenticateToken, requireRole(['super_admin', 'hr_admin', 'admin']), (req, res) => {
  const { name, start_date, end_date, frequency = 'Quarterly', status = 'active' } = req.body;
  if (!name || !start_date || !end_date) {
    return res.status(400).json({ error: 'Name, Start Date, and End Date are required' });
  }

  const newPeriod = {
    id: `period_${Date.now()}`,
    name,
    start_date,
    end_date,
    frequency,
    status,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  db.insert('kpi_periods', newPeriod);
  logKpiAudit(req.user.id, 'PERIOD_CREATED', 'kpi_periods', newPeriod.id, null, newPeriod);
  res.status(201).json({ message: 'KPI Period created successfully', period: newPeriod });
});

// ==========================================
// 2. KPI CATEGORIES
// ==========================================

// GET /api/kpi/categories
router.get('/categories', authenticateToken, (req, res) => {
  const categories = db.getCollection('kpi_categories');
  res.json(categories);
});

// POST /api/kpi/categories
router.post('/categories', authenticateToken, requireRole(['super_admin', 'hr_admin', 'admin']), (req, res) => {
  const { name, description = '', status = 'active' } = req.body;
  if (!name) return res.status(400).json({ error: 'Category name is required' });

  const newCategory = {
    id: `cat_${Date.now()}`,
    name,
    description,
    status,
    created_by: req.user.id,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  db.insert('kpi_categories', newCategory);
  logKpiAudit(req.user.id, 'CATEGORY_CREATED', 'kpi_categories', newCategory.id, null, newCategory);
  res.status(201).json({ message: 'Category created successfully', category: newCategory });
});

// PUT /api/kpi/categories/:id
router.put('/categories/:id', authenticateToken, requireRole(['super_admin', 'hr_admin', 'admin']), (req, res) => {
  const category = db.findById('kpi_categories', req.params.id);
  if (!category) return res.status(404).json({ error: 'Category not found' });

  const old = { ...category };
  const updated = {
    ...category,
    ...req.body,
    updated_at: new Date().toISOString()
  };

  db.update('kpi_categories', req.params.id, updated);
  logKpiAudit(req.user.id, 'CATEGORY_UPDATED', 'kpi_categories', req.params.id, old, updated);
  res.json({ message: 'Category updated successfully', category: updated });
});

// ==========================================
// 3. KPI TEMPLATES (LIBRARY)
// ==========================================

// GET /api/kpi/templates
router.get('/templates', authenticateToken, (req, res) => {
  const templates = db.getCollection('kpi_templates');
  res.json(templates);
});

// POST /api/kpi/templates
router.post('/templates', authenticateToken, requireRole(['super_admin', 'hr_admin', 'admin']), (req, res) => {
  const {
    name,
    description,
    category_id,
    measurement_type = 'Number',
    unit = '',
    direction = 'Higher is Better',
    default_target = 100,
    minimum_threshold = 70,
    expected_value = 100,
    stretch_target = 120,
    default_weightage = 25,
    frequency = 'Quarterly',
    evidence_required = false,
    status = 'active'
  } = req.body;

  if (!name || !category_id) {
    return res.status(400).json({ error: 'KPI Name and Category are required' });
  }

  const category = db.findById('kpi_categories', category_id);

  const newTemplate = {
    id: `tmpl_${Date.now()}`,
    name,
    description: description || '',
    category_id,
    category_name: category ? category.name : 'General',
    measurement_type,
    unit,
    direction,
    default_target: Number(default_target) || 100,
    minimum_threshold: Number(minimum_threshold) || 70,
    expected_value: Number(expected_value) || 100,
    stretch_target: Number(stretch_target) || 120,
    default_weightage: Number(default_weightage) || 25,
    frequency,
    evidence_required: Boolean(evidence_required),
    status,
    created_by: req.user.id,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  db.insert('kpi_templates', newTemplate);
  logKpiAudit(req.user.id, 'TEMPLATE_CREATED', 'kpi_templates', newTemplate.id, null, newTemplate);
  res.status(201).json({ message: 'KPI template created successfully', template: newTemplate });
});

// PUT /api/kpi/templates/:id
router.put('/templates/:id', authenticateToken, requireRole(['super_admin', 'hr_admin', 'admin']), (req, res) => {
  const template = db.findById('kpi_templates', req.params.id);
  if (!template) return res.status(404).json({ error: 'KPI Template not found' });

  const old = { ...template };
  let categoryName = template.category_name;
  if (req.body.category_id && req.body.category_id !== template.category_id) {
    const cat = db.findById('kpi_categories', req.body.category_id);
    if (cat) categoryName = cat.name;
  }

  const updated = {
    ...template,
    ...req.body,
    category_name: categoryName,
    updated_at: new Date().toISOString()
  };

  db.update('kpi_templates', req.params.id, updated);
  logKpiAudit(req.user.id, 'TEMPLATE_UPDATED', 'kpi_templates', req.params.id, old, updated);
  res.json({ message: 'KPI template updated successfully', template: updated });
});

// ==========================================
// 4. KPI ASSIGNMENTS
// ==========================================

// GET /api/kpi/assignments
router.get('/assignments', authenticateToken, (req, res) => {
  const { employee_id, period_id, status } = req.query;
  const user = req.user;
  const isAdmin = ['super_admin', 'hr_admin', 'admin'].includes(user.role);
  const isManager = user.role === 'manager';

  let list = db.getCollection('kpi_assignments');

  // Role scoping
  if (!isAdmin) {
    if (isManager) {
      // Manager sees assignments for team members + own
      list = list.filter(a => a.employee_id === user.id || isManagerOf(user.id, a.employee_id));
    } else {
      // Employee sees only own
      list = list.filter(a => a.employee_id === user.id);
    }
  }

  if (employee_id) list = list.filter(a => a.employee_id === employee_id);
  if (period_id) list = list.filter(a => a.kpi_period_id === period_id);
  if (status) list = list.filter(a => a.status === status);

  res.json(list);
});

// POST /api/kpi/assignments - Assign KPI to employee
router.post('/assignments', authenticateToken, (req, res) => {
  const kpi_template_id = req.body.kpi_template_id || req.body.template_id;
  const kpi_period_id = req.body.kpi_period_id || req.body.period_id;
  const employee_id = req.body.employee_id;
  const {
    target_value,
    weightage,
    start_date,
    end_date
  } = req.body;

  const user = req.user;
  const isAdmin = ['super_admin', 'hr_admin', 'admin'].includes(user.role);
  const isManager = user.role === 'manager';

  if (!isAdmin && !isManager) {
    return res.status(403).json({ error: 'Employees cannot self-assign KPIs.' });
  }

  if (isManager && !isManagerOf(user.id, employee_id)) {
    return res.status(403).json({ error: 'Forbidden: You can only assign KPIs to your direct or indirect reporting team.' });
  }

  const template = kpi_template_id ? db.findById('kpi_templates', kpi_template_id) : null;
  if (kpi_template_id && !template) return res.status(404).json({ error: 'KPI Template not found' });
  if (template && template.status === 'inactive') {
    return res.status(400).json({ error: 'This KPI template is inactive and cannot be assigned to employees.' });
  }

  const employee = db.findById('users', employee_id);
  if (!employee) return res.status(404).json({ error: 'Employee not found' });

  const period = db.findById('kpi_periods', kpi_period_id);
  if (!period) return res.status(404).json({ error: 'KPI Period not found' });

  // Prevent duplicate assignment in the same period
  const title = template ? template.name : (req.body.title || req.body.name || 'KPI Goal');
  const existing = db.findOne('kpi_assignments', a =>
    ((kpi_template_id && a.kpi_template_id === kpi_template_id) || (a.title === title || a.kpi_name === title)) &&
    a.employee_id === employee_id &&
    (a.kpi_period_id === kpi_period_id || a.period_id === kpi_period_id)
  );
  if (existing) {
    return res.status(400).json({ error: 'This KPI is already assigned to this employee for the selected period.' });
  }

  // Check total weightage for the employee in this period
  const currentAssignments = db.find('kpi_assignments', a =>
    a.employee_id === employee_id && (a.kpi_period_id === kpi_period_id || a.period_id === kpi_period_id)
  );
  const currentTotalWeightage = currentAssignments.reduce((sum, a) => sum + (Number(a.weightage) || 0), 0);
  const newWeightage = Number(weightage) || (template ? template.default_weightage : 25);

  if (currentTotalWeightage + newWeightage > 100) {
    return res.status(400).json({
      error: `Total KPI weightage for ${employee.name} in ${period.name} would exceed 100% (Current: ${currentTotalWeightage}%, Added: ${newWeightage}%). Please adjust weightages.`
    });
  }

  const dept = employee.department_id ? db.findById('departments', employee.department_id) : null;
  const target = target_value !== undefined ? Number(target_value) : (template ? template.default_target : 100);
  const categoryName = template ? template.category_name : (req.body.category_name || 'General');
  const unit = template ? template.unit : (req.body.unit || '');
  const measurementType = template ? template.measurement_type : (req.body.measurement_type || 'Number');
  const direction = template ? template.direction : (req.body.target_direction || req.body.direction || 'Higher is Better');

  const newAssignment = {
    id: `asgn_${Date.now()}_${Math.random().toString(36).substring(7)}`,
    kpi_template_id: kpi_template_id || null,
    kpi_name: title,
    title: title,
    category_id: template ? template.category_id : null,
    category_name: categoryName,
    employee_id,
    employee_name: employee.name,
    employee_code: employee.employee_code || 'EMP',
    department_name: dept?.name || employee.department_name || 'General',
    designation: employee.designation || 'Staff',
    manager_id: employee.reporting_manager_line_1_id || employee.manager_id || user.id,
    kpi_period_id,
    period_id: kpi_period_id,
    period_name: period.name,
    target_value: target,
    current_value: 0,
    achievement_percentage: 0,
    achievement_pct: 0,
    weightage: newWeightage,
    measurement_type: measurementType,
    unit: unit,
    direction: direction,
    target_direction: direction,
    start_date: start_date || period.start_date,
    end_date: end_date || period.end_date,
    status: 'Not Started',
    score: null,
    assigned_by: user.id,
    assigned_by_name: user.name,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  db.insert('kpi_assignments', newAssignment);
  logKpiAudit(user.id, 'KPI_ASSIGNED', 'kpi_assignments', newAssignment.id, null, newAssignment);
  notifyUser(employee_id, 'New KPI Assigned', `You have been assigned KPI: "${title}" with target ${target} ${unit} for ${period.name}.`);

  res.status(201).json({ message: 'KPI assigned successfully', assignment: newAssignment });
});

// POST /api/kpi/assignments/bulk - Bulk assign KPI to Department or Designation
router.post('/assignments/bulk', authenticateToken, requireRole(['super_admin', 'hr_admin', 'admin']), (req, res) => {
  const { kpi_template_id, kpi_period_id, department_id, designation, weightage } = req.body;
  if (!kpi_template_id || !kpi_period_id) {
    return res.status(400).json({ error: 'Template and Period are required for bulk assignment' });
  }

  const template = db.findById('kpi_templates', kpi_template_id);
  const period = db.findById('kpi_periods', kpi_period_id);
  if (!template || !period) return res.status(404).json({ error: 'Template or Period not found' });

  let employees = db.find('users', u => u.status === 'active');
  if (department_id) employees = employees.filter(u => u.department_id === department_id);
  if (designation) employees = employees.filter(u => u.designation === designation);

  let createdCount = 0;
  let skippedCount = 0;

  employees.forEach(emp => {
    const existing = db.findOne('kpi_assignments', a =>
      a.kpi_template_id === kpi_template_id &&
      a.employee_id === emp.id &&
      a.kpi_period_id === kpi_period_id
    );
    if (!existing) {
      const dept = emp.department_id ? db.findById('departments', emp.department_id) : null;
      const asgn = {
        id: `asgn_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        kpi_template_id,
        kpi_name: template.name,
        category_name: template.category_name,
        employee_id: emp.id,
        employee_name: emp.name,
        employee_code: emp.employee_code || 'EMP',
        department_name: dept?.name || 'General',
        designation: emp.designation || 'Staff',
        manager_id: emp.reporting_manager_line_1_id || emp.manager_id || req.user.id,
        kpi_period_id,
        period_name: period.name,
        target_value: template.default_target,
        current_value: 0,
        achievement_percentage: 0,
        weightage: Number(weightage) || template.default_weightage || 25,
        measurement_type: template.measurement_type,
        unit: template.unit,
        direction: template.direction,
        start_date: period.start_date,
        end_date: period.end_date,
        status: 'Not Started',
        score: null,
        assigned_by: req.user.id,
        assigned_by_name: req.user.name,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      db.insert('kpi_assignments', asgn);
      notifyUser(emp.id, 'New KPI Assigned', `Assigned KPI: "${template.name}" for ${period.name}.`);
      createdCount++;
    } else {
      skippedCount++;
    }
  });

  logKpiAudit(req.user.id, 'BULK_KPI_ASSIGNED', 'kpi_assignments', `bulk_${kpi_template_id}`, null, { createdCount, skippedCount });
  res.json({ message: `Bulk assignment complete. Created ${createdCount} assignments (${skippedCount} skipped as already assigned).` });
});

// PUT /api/kpi/assignments/:id - Update target or weightage
router.put('/assignments/:id', authenticateToken, (req, res) => {
  const assignment = db.findById('kpi_assignments', req.params.id);
  if (!assignment) return res.status(404).json({ error: 'Assignment not found' });

  const user = req.user;
  const isAdmin = ['super_admin', 'hr_admin', 'admin'].includes(user.role);
  const isManager = user.role === 'manager' && isManagerOf(user.id, assignment.employee_id);

  if (!isAdmin && !isManager) {
    return res.status(403).json({ error: 'Employees cannot modify assigned KPI targets or weightages.' });
  }

  const old = { ...assignment };
  const target = req.body.target_value !== undefined ? Number(req.body.target_value) : assignment.target_value;
  const current = assignment.current_value;
  const achievement = calculateAchievement(target, current, assignment.direction);
  const settings = db.getSettings()?.kpi_settings || {};
  const status = determineStatus(achievement, assignment.end_date, settings.on_track_threshold || 80, settings.at_risk_threshold || 50);

  const updated = {
    ...assignment,
    target_value: target,
    weightage: req.body.weightage !== undefined ? Number(req.body.weightage) : assignment.weightage,
    achievement_percentage: achievement,
    status: status,
    updated_at: new Date().toISOString()
  };

  db.update('kpi_assignments', req.params.id, updated);
  logKpiAudit(user.id, 'ASSIGNMENT_UPDATED', 'kpi_assignments', req.params.id, old, updated);
  res.json({ message: 'KPI assignment updated successfully', assignment: updated });
});

// ==========================================
// 5. PROGRESS UPDATES (EMPLOYEE WORKFLOW)
// ==========================================

// POST /api/kpi/assignments/:id/progress
router.post('/assignments/:id/progress', authenticateToken, (req, res) => {
  const assignment = db.findById('kpi_assignments', req.params.id);
  if (!assignment) return res.status(404).json({ error: 'KPI assignment not found' });

  // Only the assigned employee (or Admin in override cases) can submit progress
  const user = req.user;
  const isOwner = user.id === assignment.employee_id;
  const isAdmin = ['super_admin', 'admin'].includes(user.role);

  if (!isOwner && !isAdmin) {
    return res.status(403).json({ error: 'You can only update progress on your own assigned KPIs.' });
  }

  const { current_value, employee_comment = '', evidence_url = '' } = req.body;
  if (current_value === undefined || current_value === null) {
    return res.status(400).json({ error: 'Current value is required' });
  }

  const val = Number(current_value);
  const achievement = calculateAchievement(assignment.target_value, val, assignment.direction);
  const settings = db.getSettings()?.kpi_settings || {};
  const status = determineStatus(achievement, assignment.end_date, settings.on_track_threshold || 80, settings.at_risk_threshold || 50);

  // Record progress log
  const progressRecord = {
    id: `prg_${Date.now()}_${Math.random().toString(36).substring(7)}`,
    kpi_assignment_id: assignment.id,
    employee_id: assignment.employee_id,
    current_value: val,
    achievement_percentage: achievement,
    status,
    employee_comment,
    evidence_url,
    submitted_at: new Date().toISOString()
  };
  db.insert('kpi_progress', progressRecord);

  // Update assignment
  const oldAssignment = { ...assignment };
  assignment.current_value = val;
  assignment.achievement_percentage = achievement;
  assignment.achievement_pct = achievement;
  assignment.status = status;
  assignment.updated_at = new Date().toISOString();
  db.update('kpi_assignments', assignment.id, assignment);

  logKpiAudit(user.id, 'PROGRESS_SUBMITTED', 'kpi_assignments', assignment.id, oldAssignment, progressRecord);

  // Notify reporting manager
  const managerId = assignment.manager_id;
  if (managerId && managerId !== user.id) {
    notifyUser(managerId, 'KPI Progress Submitted', `${user.name} submitted progress for "${assignment.title || assignment.kpi_name}": ${val} ${assignment.unit} (${achievement}%).`, '/kpi-reviews');
  }

  res.status(201).json({
    message: 'Progress submitted successfully',
    progress: progressRecord,
    assignment
  });
});

// GET /api/kpi/assignments/:id/progress - View history
router.get('/assignments/:id/progress', authenticateToken, (req, res) => {
  const list = db.find('kpi_progress', p => p.kpi_assignment_id === req.params.id)
    .sort((a, b) => new Date(b.submitted_at) - new Date(a.submitted_at));
  res.json(list);
});

// ==========================================
// 6. MANAGER REVIEWS & SCORING
// ==========================================

// GET /api/kpi/reviews/pending
router.get('/reviews/pending', authenticateToken, (req, res) => {
  const user = req.user;
  const isAdmin = ['super_admin', 'hr_admin', 'admin'].includes(user.role);
  const isManager = user.role === 'manager';

  let assignments = db.getCollection('kpi_assignments');

  if (!isAdmin) {
    if (isManager) {
      assignments = assignments.filter(a => isManagerOf(user.id, a.employee_id));
    } else {
      return res.status(403).json({ error: 'Employees do not have review permissions.' });
    }
  }

  // Attach last progress update and review info
  const result = assignments.map(a => {
    const lastProgress = db.find('kpi_progress', p => p.kpi_assignment_id === a.id)
      .sort((p1, p2) => new Date(p2.submitted_at) - new Date(p1.submitted_at))[0] || null;
    const lastReview = db.find('kpi_reviews', r => r.kpi_assignment_id === a.id)
      .sort((r1, r2) => new Date(r2.reviewed_at) - new Date(r1.reviewed_at))[0] || null;
    return {
      ...a,
      last_progress: lastProgress,
      last_review: lastReview
    };
  });

  res.json(result);
});

// POST /api/kpi/assignments/:id/review - Review and score KPI
router.post('/assignments/:id/review', authenticateToken, (req, res) => {
  const assignment = db.findById('kpi_assignments', req.params.id);
  if (!assignment) return res.status(404).json({ error: 'KPI assignment not found' });

  const user = req.user;
  const isAdmin = ['super_admin', 'hr_admin', 'admin'].includes(user.role);
  const isManager = user.role === 'manager' && isManagerOf(user.id, assignment.employee_id);

  if (!isAdmin && !isManager) {
    return res.status(403).json({ error: 'You are not authorized to review this employee\'s KPI.' });
  }

  // Manager cannot review own KPI
  if (assignment.employee_id === user.id) {
    return res.status(403).json({ error: 'Managers cannot review their own KPIs. Your Line 2 manager or HR will review yours.' });
  }

  const scoreVal = req.body.score !== undefined ? req.body.score : req.body.rating;
  const manager_comment = req.body.manager_comment !== undefined ? req.body.manager_comment : (req.body.feedback || '');
  const status = req.body.status || 'Reviewed';
  const score = Number(scoreVal);
  if (!score || score < 1 || score > 5) {
    return res.status(400).json({ error: 'Valid score rating between 1 and 5 is required.' });
  }

  const reviewRecord = {
    id: `rev_${Date.now()}_${Math.random().toString(36).substring(7)}`,
    kpi_assignment_id: assignment.id,
    employee_id: assignment.employee_id,
    reviewer_id: user.id,
    reviewer_name: user.name,
    score: Number(score),
    manager_comment,
    status, // 'Reviewed' | 'Changes Requested' | 'Finalized'
    reviewed_at: new Date().toISOString(),
    finalized_at: status === 'Finalized' ? new Date().toISOString() : null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  db.insert('kpi_reviews', reviewRecord);

  // Update assignment score & status
  assignment.score = Number(score);
  assignment.review_score = Number(score);
  assignment.review_feedback = manager_comment;
  if (status === 'Finalized') {
    assignment.status = 'Completed';
  }
  assignment.updated_at = new Date().toISOString();
  db.update('kpi_assignments', assignment.id, assignment);

  logKpiAudit(user.id, 'KPI_REVIEWED', 'kpi_assignments', assignment.id, null, reviewRecord);

  // Notify employee
  notifyUser(
    assignment.employee_id,
    `KPI Review: ${status}`,
    `${user.name} reviewed your KPI "${assignment.kpi_name}" with score ${score}/5. Comment: "${manager_comment}"`
  );

  res.status(201).json({
    message: 'KPI review submitted successfully',
    review: reviewRecord,
    assignment
  });
});

// ==========================================
// 7. ROLE-TAILORED KPI DASHBOARDS
// ==========================================

// GET /api/kpi/dashboard/employee
router.get('/dashboard/employee', authenticateToken, (req, res) => {
  const userId = req.user.id;
  const periodId = req.query.period_id;
  const currentPeriod = periodId
    ? db.findById('kpi_periods', periodId)
    : (db.findOne('kpi_periods', p => p.status === 'active' || p.status === 'Active') || db.getCollection('kpi_periods')[0]);

  const assignments = db.find('kpi_assignments', a =>
    a.employee_id === userId && (!currentPeriod || a.kpi_period_id === currentPeriod.id || a.period_id === currentPeriod.id)
  ).map(a => ({
    ...a,
    title: a.title || a.kpi_name,
    kpi_name: a.kpi_name || a.title,
    period_id: a.period_id || a.kpi_period_id,
    kpi_period_id: a.kpi_period_id || a.period_id,
    achievement_pct: a.achievement_pct !== undefined ? a.achievement_pct : (a.achievement_percentage || 0),
    achievement_percentage: a.achievement_percentage !== undefined ? a.achievement_percentage : (a.achievement_pct || 0)
  }));

  const totalAssigned = assignments.length;
  const completed = assignments.filter(a => a.status === 'Completed').length;
  const inProgress = assignments.filter(a => ['On Track', 'Behind', 'At Risk'].includes(a.status)).length;
  const atRisk = assignments.filter(a => a.status === 'At Risk').length;

  const avgAchievement = totalAssigned > 0
    ? Math.round(assignments.reduce((sum, a) => sum + (Number(a.achievement_pct) || 0), 0) / totalAssigned * 10) / 10
    : 0;

  // Weighted score
  let weightedScoreSum = 0;
  let weightSum = 0;
  assignments.forEach(a => {
    if (a.review_score || a.score) {
      const s = a.review_score || a.score;
      weightedScoreSum += s * (a.weightage / 100);
      weightSum += (a.weightage / 100);
    }
  });
  const overallScore = weightSum > 0 ? Math.round((weightedScoreSum / weightSum) * 10) / 10 : null;

  const summary = {
    total_kpis: totalAssigned,
    total_assigned: totalAssigned,
    completed,
    in_progress: inProgress,
    at_risk: atRisk,
    avg_achievement: avgAchievement,
    average_achievement: avgAchievement,
    overall_score: overallScore,
    weighted_score: overallScore ? Math.round(overallScore * 20) : avgAchievement
  };

  res.json({
    period: currentPeriod,
    current_period: currentPeriod,
    summary,
    total_assigned: totalAssigned,
    completed,
    in_progress: inProgress,
    at_risk: atRisk,
    average_achievement: avgAchievement,
    overall_score: overallScore,
    assignments
  });
});

// GET /api/kpi/dashboard/manager
router.get('/dashboard/manager', authenticateToken, (req, res) => {
  const user = req.user;
  const periodId = req.query.period_id;
  const currentPeriod = periodId
    ? db.findById('kpi_periods', periodId)
    : (db.findOne('kpi_periods', p => p.status === 'active' || p.status === 'Active') || db.getCollection('kpi_periods')[0]);

  // Team members
  const teamUsers = db.find('users', u => isManagerOf(user.id, u.id));
  const teamIds = teamUsers.map(u => u.id);

  const teamAssignments = db.find('kpi_assignments', a =>
    teamIds.includes(a.employee_id) && (!currentPeriod || a.kpi_period_id === currentPeriod.id || a.period_id === currentPeriod.id)
  ).map(a => ({
    ...a,
    title: a.title || a.kpi_name,
    kpi_name: a.kpi_name || a.title,
    achievement_pct: a.achievement_pct !== undefined ? a.achievement_pct : (a.achievement_percentage || 0),
    achievement_percentage: a.achievement_percentage !== undefined ? a.achievement_percentage : (a.achievement_pct || 0)
  }));

  const totalTeamKPIs = teamAssignments.length;
  const onTrack = teamAssignments.filter(a => a.status === 'On Track').length;
  const atRisk = teamAssignments.filter(a => a.status === 'At Risk').length;
  const completed = teamAssignments.filter(a => a.status === 'Completed').length;
  const pendingReviews = teamAssignments.filter(a => !a.score && !a.review_score && (a.achievement_pct > 0 || a.achievement_percentage > 0)).length;

  const avgTeamAchievement = totalTeamKPIs > 0
    ? Math.round(teamAssignments.reduce((sum, a) => sum + (Number(a.achievement_pct) || 0), 0) / totalTeamKPIs * 10) / 10
    : 0;

  const scoredAssignments = teamAssignments.filter(a => a.score || a.review_score);
  const avgTeamScore = scoredAssignments.length > 0
    ? Math.round(scoredAssignments.reduce((sum, a) => sum + (a.review_score || a.score), 0) / scoredAssignments.length * 10) / 10
    : 0;

  // Group by employee for table preview
  const employeeSummary = teamUsers.map(emp => {
    const empAsgns = teamAssignments.filter(a => a.employee_id === emp.id);
    const empAvgAch = empAsgns.length > 0
      ? Math.round(empAsgns.reduce((sum, a) => sum + (Number(a.achievement_pct) || 0), 0) / empAsgns.length * 10) / 10
      : 0;
    const empScored = empAsgns.filter(a => a.score || a.review_score);
    const empAvgScore = empScored.length > 0
      ? Math.round(empScored.reduce((sum, a) => sum + (a.review_score || a.score), 0) / empScored.length * 10) / 10
      : null;
    const dept = emp.department_id ? db.findById('departments', emp.department_id) : null;

    return {
      employee_id: emp.id,
      employee_name: emp.name,
      employee_code: emp.employee_code,
      department: dept?.name || emp.department_name || 'General',
      designation: emp.designation,
      kpi_count: empAsgns.length,
      achievement: empAvgAch,
      score: empAvgScore,
      status: empAvgAch >= 80 ? 'On Track' : empAvgAch >= 50 ? 'At Risk' : 'Behind'
    };
  });

  const summary = {
    total_team_kpis: totalTeamKPIs,
    total_kpis: totalTeamKPIs,
    on_track: onTrack,
    at_risk: atRisk,
    completed,
    pending_reviews: pendingReviews,
    avg_achievement: avgTeamAchievement,
    average_team_achievement: avgTeamAchievement,
    average_team_score: avgTeamScore
  };

  res.json({
    period: currentPeriod,
    current_period: currentPeriod,
    team_members_count: teamUsers.length,
    total_team_kpis: totalTeamKPIs,
    on_track: onTrack,
    at_risk: atRisk,
    completed,
    pending_reviews: pendingReviews,
    average_team_achievement: avgTeamAchievement,
    average_team_score: avgTeamScore,
    employee_summary: employeeSummary,
    team_members: employeeSummary,
    summary
  });
});

// GET /api/kpi/dashboard/admin
router.get('/dashboard/admin', authenticateToken, requireRole(['super_admin', 'hr_admin', 'admin']), (req, res) => {
  const periodId = req.query.period_id;
  const currentPeriod = periodId
    ? db.findById('kpi_periods', periodId)
    : (db.findOne('kpi_periods', p => p.status === 'active' || p.status === 'Active') || db.getCollection('kpi_periods')[0]);
  const allEmployees = db.find('users', u => u.status === 'active');
  const allAssignments = db.find('kpi_assignments', a => !currentPeriod || a.kpi_period_id === currentPeriod.id || a.period_id === currentPeriod.id)
    .map(a => ({
      ...a,
      title: a.title || a.kpi_name,
      kpi_name: a.kpi_name || a.title,
      achievement_pct: a.achievement_pct !== undefined ? a.achievement_pct : (a.achievement_percentage || 0),
      achievement_percentage: a.achievement_percentage !== undefined ? a.achievement_percentage : (a.achievement_pct || 0)
    }));

  const empWithKpiIds = new Set(allAssignments.map(a => a.employee_id));
  const employeesWithKpi = empWithKpiIds.size;
  const employeesWithoutKpi = allEmployees.length - employeesWithKpi;

  const totalActiveKpis = allAssignments.length;
  const avgAchievement = totalActiveKpis > 0
    ? Math.round(allAssignments.reduce((sum, a) => sum + (Number(a.achievement_pct) || 0), 0) / totalActiveKpis * 10) / 10
    : 0;

  const scored = allAssignments.filter(a => a.score || a.review_score);
  const avgScore = scored.length > 0
    ? Math.round(scored.reduce((sum, a) => sum + (a.review_score || a.score), 0) / scored.length * 10) / 10
    : 0;

  const completed = allAssignments.filter(a => a.status === 'Completed').length;
  const atRisk = allAssignments.filter(a => a.status === 'At Risk').length;
  const behind = allAssignments.filter(a => a.status === 'Behind').length;
  const pendingReviews = allAssignments.filter(a => !a.score && !a.review_score && (a.achievement_pct > 0 || a.achievement_percentage > 0)).length;

  // Department distribution
  const departments = db.getCollection('departments');
  const deptBreakdown = departments.map(d => {
    const deptAsgns = allAssignments.filter(a => a.department_name === d.name);
    const avgAch = deptAsgns.length > 0
      ? Math.round(deptAsgns.reduce((sum, a) => sum + (Number(a.achievement_pct) || 0), 0) / deptAsgns.length * 10) / 10
      : 0;
    return {
      department: d.name,
      kpi_count: deptAsgns.length,
      average_achievement: avgAch
    };
  });

  const summary = {
    total_assigned_kpis: totalActiveKpis,
    total_active_kpis: totalActiveKpis,
    completed_kpis: completed,
    avg_achievement: avgAchievement,
    average_achievement: avgAchievement,
    avg_score: avgScore,
    employees_with_kpi: employeesWithKpi,
    employees_without_kpi: employeesWithoutKpi,
    pending_reviews: pendingReviews
  };

  res.json({
    period: currentPeriod,
    current_period: currentPeriod,
    total_employees: allEmployees.length,
    employees_with_kpi: employeesWithKpi,
    employees_without_kpi: employeesWithoutKpi,
    total_active_kpis: totalActiveKpis,
    average_achievement: avgAchievement,
    average_score: avgScore,
    completed,
    at_risk: atRisk,
    behind,
    pending_reviews: pendingReviews,
    department_breakdown: deptBreakdown,
    summary
  });
});

// ==========================================
// 8. KPI REPORTS & AUDIT LOGS
// ==========================================

// GET /api/kpi/reports/summary
router.get('/reports/summary', authenticateToken, requireRole(['super_admin', 'hr_admin', 'admin', 'manager']), (req, res) => {
  const { period_id, department } = req.query;
  const user = req.user;
  const isAdmin = ['super_admin', 'hr_admin', 'admin'].includes(user.role);

  let assignments = db.getCollection('kpi_assignments');
  if (!isAdmin) {
    // Manager only reports on team
    assignments = assignments.filter(a => isManagerOf(user.id, a.employee_id));
  }

  if (period_id) assignments = assignments.filter(a => a.kpi_period_id === period_id || a.period_id === period_id);
  if (department && department !== 'All') assignments = assignments.filter(a => a.department_name === department || a.department === department);

  // Group by Employee
  const empMap = new Map();
  assignments.forEach(a => {
    if (!empMap.has(a.employee_id)) {
      const u = db.findById('users', a.employee_id);
      empMap.set(a.employee_id, {
        employee_id: a.employee_id,
        employee_name: a.employee_name || u?.name || 'Unknown',
        employee_code: a.employee_code || u?.employee_code || a.employee_id,
        department: a.department_name || a.department || u?.department_name || 'General',
        designation: a.designation || u?.designation || 'Staff',
        total_kpis: 0,
        completed_kpis: 0,
        total_ach: 0,
        weighted_score_sum: 0,
        weight_sum: 0
      });
    }
    const e = empMap.get(a.employee_id);
    e.total_kpis++;
    if (a.status === 'Completed') e.completed_kpis++;
    const ach = Number(a.achievement_pct !== undefined ? a.achievement_pct : (a.achievement_percentage || 0));
    e.total_ach += ach;
    const score = a.review_score || a.score;
    if (score) {
      e.weighted_score_sum += score * (a.weightage / 100);
      e.weight_sum += (a.weightage / 100);
    }
  });

  const employee_summary = Array.from(empMap.values()).map(e => ({
    employee_id: e.employee_id,
    employee_name: e.employee_name,
    employee_code: e.employee_code,
    department: e.department,
    designation: e.designation,
    total_kpis: e.total_kpis,
    completed_kpis: e.completed_kpis,
    avg_achievement: e.total_kpis > 0 ? Math.round((e.total_ach / e.total_kpis) * 10) / 10 : 0,
    weighted_score: e.weight_sum > 0 ? Math.round((e.weighted_score_sum / e.weight_sum) * 20) : Math.round(e.total_ach / (e.total_kpis || 1))
  }));

  // Group by Department
  const deptMap = new Map();
  employee_summary.forEach(e => {
    if (!deptMap.has(e.department)) {
      deptMap.set(e.department, {
        department: e.department,
        employee_count: 0,
        total_kpis: 0,
        total_ach: 0
      });
    }
    const d = deptMap.get(e.department);
    d.employee_count++;
    d.total_kpis += e.total_kpis;
    d.total_ach += e.avg_achievement;
  });

  const department_summary = Array.from(deptMap.values()).map(d => ({
    department: d.department,
    employee_count: d.employee_count,
    total_kpis: d.total_kpis,
    avg_achievement: d.employee_count > 0 ? Math.round((d.total_ach / d.employee_count) * 10) / 10 : 0
  }));

  // Group by KPI Objective
  const kpiMap = new Map();
  assignments.forEach(a => {
    const title = a.title || a.kpi_name || 'KPI';
    if (!kpiMap.has(title)) {
      kpiMap.set(title, {
        title,
        category: a.category_name || 'General',
        total_assigned: 0,
        completed: 0,
        total_ach: 0
      });
    }
    const k = kpiMap.get(title);
    k.total_assigned++;
    if (a.status === 'Completed') k.completed++;
    k.total_ach += Number(a.achievement_pct !== undefined ? a.achievement_pct : (a.achievement_percentage || 0));
  });

  const kpi_summary = Array.from(kpiMap.values()).map(k => ({
    title: k.title,
    category: k.category,
    total_assigned: k.total_assigned,
    completed: k.completed,
    avg_achievement: k.total_assigned > 0 ? Math.round((k.total_ach / k.total_assigned) * 10) / 10 : 0
  }));

  res.json({
    report_generated_at: new Date().toISOString(),
    total_records: assignments.length,
    employee_summary,
    department_summary,
    kpi_summary,
    data: {
      employee_summary,
      department_summary,
      kpi_summary
    },
    records: assignments
  });
});

// GET /api/kpi/audit-logs
router.get('/audit-logs', authenticateToken, requireRole(['super_admin', 'admin']), (req, res) => {
  const logs = db.getCollection('kpi_audit_logs').sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  res.json(logs);
});

export default router;
