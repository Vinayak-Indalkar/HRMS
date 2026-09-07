import express from 'express';
import { db } from '../db/database.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

// Helper: Build dynamic reporting hierarchy up to CEO / Root (respecting Line 1 and Line 2)
function buildReportingHierarchy(userId) {
  const hierarchy = [];
  const visited = new Set();
  let currentId = userId;

  while (currentId && !visited.has(currentId)) {
    visited.add(currentId);
    const u = db.findById('users', currentId);
    if (!u) break;

    const dept = u.department_id ? db.findById('departments', u.department_id) : null;
    hierarchy.unshift({
      id: u.id,
      name: u.name,
      employee_code: u.employee_code,
      designation: u.designation,
      job_title: u.job_title || u.designation,
      department_name: dept?.name || 'General',
      email: u.email,
      avatar_url: u.avatar_url,
      role: u.role
    });

    currentId = u.reporting_manager_line_1_id || u.manager_id;
  }

  return hierarchy;
}

// Helper: Calculate profile completion percentage and missing items
function calculateProfileCompletion(user, emergencyContacts = [], documents = []) {
  const sections = [
    {
      id: 'photo',
      title: 'Profile Photo',
      completed: Boolean(user.avatar_url && !user.avatar_url.includes('api.dicebear.com')),
      weight: 10
    },
    {
      id: 'basic',
      title: 'Basic Information',
      completed: Boolean(user.first_name && user.last_name && user.dob && user.gender),
      weight: 20
    },
    {
      id: 'contact',
      title: 'Contact Information',
      completed: Boolean(user.personal_email && (user.personal_mobile || user.phone)),
      weight: 15
    },
    {
      id: 'address',
      title: 'Address (Current & Permanent)',
      completed: Boolean(
        user.current_address?.line1 &&
        user.current_address?.city &&
        (user.is_permanent_same || user.permanent_address?.line1)
      ),
      weight: 15
    },
    {
      id: 'emergency',
      title: 'Emergency Contact',
      completed: emergencyContacts.length > 0,
      weight: 15
    },
    {
      id: 'demographics',
      title: 'Demographic Information',
      completed: Boolean(user.marital_status && user.nationality),
      weight: 10
    },
    {
      id: 'documents',
      title: 'Documents Uploaded',
      completed: documents.length > 0,
      weight: 15
    }
  ];

  const totalScore = sections.reduce((acc, s) => acc + (s.completed ? s.weight : 0), 0);
  const incomplete = sections.filter(s => !s.completed);

  return {
    percentage: Math.min(100, Math.round(totalScore)),
    sections,
    incompleteSections: incomplete
  };
}

// GET /api/profile/me - Complete profile payload
router.get('/me', authenticateToken, (req, res) => {
  const user = db.findById('users', req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const { password_hash, ...safeUser } = user;

  // Split name if first_name / last_name not yet populated
  if (!safeUser.first_name || !safeUser.last_name) {
    const parts = (safeUser.name || '').trim().split(' ');
    safeUser.first_name = safeUser.first_name || parts[0] || '';
    safeUser.last_name = safeUser.last_name || (parts.length > 1 ? parts.slice(1).join(' ') : '');
  }

  // Ensure default structures
  safeUser.current_address = safeUser.current_address || {
    line1: safeUser.address || '',
    line2: '',
    city: '',
    state: '',
    country: 'United States',
    postal_code: ''
  };

  safeUser.permanent_address = safeUser.permanent_address || {
    line1: safeUser.address || '',
    line2: '',
    city: '',
    state: '',
    country: 'United States',
    postal_code: ''
  };

  // Line 1 Manager details
  let line1Manager = null;
  const l1Id = safeUser.reporting_manager_line_1_id || safeUser.manager_id;
  if (l1Id) {
    const mgr = db.findById('users', l1Id);
    if (mgr) {
      const mgrDept = mgr.department_id ? db.findById('departments', mgr.department_id) : null;
      line1Manager = {
        id: mgr.id,
        name: mgr.name,
        email: mgr.email,
        designation: mgr.designation,
        department_name: mgrDept?.name || 'General',
        avatar_url: mgr.avatar_url,
        phone: mgr.phone
      };
    }
  }

  // Line 2 Manager details
  let line2Manager = null;
  const l2Id = safeUser.reporting_manager_line_2_id;
  if (l2Id) {
    const mgr2 = db.findById('users', l2Id);
    if (mgr2) {
      const mgr2Dept = mgr2.department_id ? db.findById('departments', mgr2.department_id) : null;
      line2Manager = {
        id: mgr2.id,
        name: mgr2.name,
        email: mgr2.email,
        designation: mgr2.designation,
        department_name: mgr2Dept?.name || 'General',
        avatar_url: mgr2.avatar_url,
        phone: mgr2.phone
      };
    }
  }

  const manager = line1Manager;

  // Department
  const dept = safeUser.department_id ? db.findById('departments', safeUser.department_id) : null;

  // Emergency Contacts
  const emergencyContacts = db.find('emergency_contacts', c => c.user_id === req.user.id);

  // Employment History
  const employmentHistory = db.find('employment_history', h => h.user_id === req.user.id)
    .sort((a, b) => new Date(b.event_date || b.createdAt) - new Date(a.event_date || a.createdAt));

  // Documents
  const documents = db.find('employee_documents', d => d.user_id === req.user.id)
    .sort((a, b) => new Date(b.uploaded_at || b.createdAt) - new Date(a.uploaded_at || a.createdAt));

  // Reporting Hierarchy Tree
  const hierarchy = buildReportingHierarchy(req.user.id);

  // Profile Completion
  const completion = calculateProfileCompletion(safeUser, emergencyContacts, documents);

  // Demographic configs from settings
  const settings = db.getSettings();
  const demographicConfig = settings.demographic_fields || [];

  res.json({
    user: safeUser,
    department: dept,
    manager,
    line1Manager,
    line2Manager,
    hierarchy,
    emergencyContacts,
    employmentHistory,
    documents,
    completion,
    demographicConfig
  });
});

// PUT /api/profile/basic - Update permitted basic information
router.put('/basic', authenticateToken, (req, res) => {
  const {
    first_name,
    middle_name,
    last_name,
    preferred_name,
    personal_email,
    personal_mobile,
    dob,
    gender
  } = req.body;

  if (!first_name || !last_name) {
    return res.status(400).json({ error: 'First name and last name are required.' });
  }

  const fullName = [first_name, middle_name, last_name].filter(Boolean).join(' ').trim();

  const updates = {
    first_name: first_name.trim(),
    middle_name: (middle_name || '').trim(),
    last_name: last_name.trim(),
    preferred_name: (preferred_name || first_name).trim(),
    name: fullName,
    personal_email: (personal_email || '').trim().toLowerCase(),
    personal_mobile: (personal_mobile || '').trim(),
    dob: dob || '',
    gender: gender || ''
  };

  const updated = db.updateById('users', req.user.id, updates);
  const { password_hash, ...safeUser } = updated;

  res.json({
    message: 'Your basic information has been updated successfully.',
    user: safeUser
  });
});

// PUT /api/profile/demographics - Update permitted demographic information
router.put('/demographics', authenticateToken, (req, res) => {
  const {
    gender,
    marital_status,
    nationality,
    country_of_residence,
    custom_demographics = {}
  } = req.body;

  const updates = {
    gender: gender || '',
    marital_status: marital_status || '',
    nationality: (nationality || '').trim(),
    country_of_residence: (country_of_residence || '').trim(),
    custom_demographics
  };

  const updated = db.updateById('users', req.user.id, updates);
  const { password_hash, ...safeUser } = updated;

  res.json({
    message: 'Your demographic information has been updated successfully.',
    user: safeUser
  });
});

// PUT /api/profile/contact-address - Update contact & current/permanent addresses
router.put('/contact-address', authenticateToken, (req, res) => {
  const {
    personal_email,
    personal_mobile,
    alt_phone,
    current_address,
    permanent_address,
    is_permanent_same = false
  } = req.body;

  let permAddr = permanent_address;
  if (is_permanent_same && current_address) {
    permAddr = { ...current_address };
  }

  const updates = {
    personal_email: (personal_email || '').trim().toLowerCase(),
    personal_mobile: (personal_mobile || '').trim(),
    alt_phone: (alt_phone || '').trim(),
    phone: personal_mobile || req.user.phone || '',
    address: current_address?.line1 || '',
    current_address: current_address || {},
    permanent_address: permAddr || {},
    is_permanent_same: Boolean(is_permanent_same)
  };

  const updated = db.updateById('users', req.user.id, updates);
  const { password_hash, ...safeUser } = updated;

  res.json({
    message: 'Your contact and address details have been updated successfully.',
    user: safeUser
  });
});

// POST /api/profile/emergency-contacts - Add emergency contact
router.post('/emergency-contacts', authenticateToken, (req, res) => {
  const { name, relationship, primary_phone, alternate_phone, address, is_primary } = req.body;

  if (!name || !primary_phone) {
    return res.status(400).json({ error: 'Contact full name and primary phone number are required.' });
  }

  // If this is set as primary, unmark existing primary contacts
  if (is_primary) {
    const existing = db.find('emergency_contacts', c => c.user_id === req.user.id);
    existing.forEach(c => {
      if (c.is_primary) db.updateById('emergency_contacts', c.id, { is_primary: false });
    });
  }

  const newContact = db.insert('emergency_contacts', {
    user_id: req.user.id,
    name: name.trim(),
    relationship: (relationship || 'Family').trim(),
    primary_phone: primary_phone.trim(),
    alternate_phone: (alternate_phone || '').trim(),
    address: (address || '').trim(),
    is_primary: Boolean(is_primary)
  });

  // Also sync summary string to user.emergency_contact
  db.updateById('users', req.user.id, {
    emergency_contact: newContact.name + ' (' + newContact.relationship + '): ' + newContact.primary_phone
  });

  const contacts = db.find('emergency_contacts', c => c.user_id === req.user.id);
  res.status(201).json({
    message: 'Emergency contact added successfully.',
    contact: newContact,
    contacts
  });
});

// PUT /api/profile/emergency-contacts/:contactId - Update emergency contact
router.put('/emergency-contacts/:contactId', authenticateToken, (req, res) => {
  const contact = db.findById('emergency_contacts', req.params.contactId);
  if (!contact || contact.user_id !== req.user.id) {
    return res.status(404).json({ error: 'Emergency contact not found' });
  }

  const { name, relationship, primary_phone, alternate_phone, address, is_primary } = req.body;

  if (is_primary) {
    const existing = db.find('emergency_contacts', c => c.user_id === req.user.id);
    existing.forEach(c => {
      if (c.id !== contact.id && c.is_primary) {
        db.updateById('emergency_contacts', c.id, { is_primary: false });
      }
    });
  }

  const updated = db.updateById('emergency_contacts', contact.id, {
    name: name !== undefined ? name.trim() : contact.name,
    relationship: relationship !== undefined ? relationship.trim() : contact.relationship,
    primary_phone: primary_phone !== undefined ? primary_phone.trim() : contact.primary_phone,
    alternate_phone: alternate_phone !== undefined ? alternate_phone.trim() : contact.alternate_phone,
    address: address !== undefined ? address.trim() : contact.address,
    is_primary: is_primary !== undefined ? Boolean(is_primary) : contact.is_primary
  });

  const contacts = db.find('emergency_contacts', c => c.user_id === req.user.id);
  res.json({
    message: 'Emergency contact updated successfully.',
    contact: updated,
    contacts
  });
});

// DELETE /api/profile/emergency-contacts/:contactId - Remove emergency contact
router.delete('/emergency-contacts/:contactId', authenticateToken, (req, res) => {
  const contact = db.findById('emergency_contacts', req.params.contactId);
  if (!contact || contact.user_id !== req.user.id) {
    return res.status(404).json({ error: 'Emergency contact not found' });
  }

  db.deleteById('emergency_contacts', contact.id);
  const contacts = db.find('emergency_contacts', c => c.user_id === req.user.id);

  res.json({
    message: 'Emergency contact removed successfully.',
    contacts
  });
});

// POST /api/profile/photo - Upload / Change profile photo
router.post('/photo', authenticateToken, (req, res) => {
  const { avatar_url } = req.body;

  if (!avatar_url) {
    return res.status(400).json({ error: 'Photo URL or image data is required.' });
  }

  // Base64 file size check (~5MB limit)
  if (avatar_url.startsWith('data:image/')) {
    const base64Length = avatar_url.length - (avatar_url.indexOf(',') + 1);
    const sizeInBytes = (base64Length * 3) / 4;
    if (sizeInBytes > 5 * 1024 * 1024) {
      return res.status(400).json({ error: 'Image file size exceeds maximum limit of 5MB.' });
    }
  }

  const updated = db.updateById('users', req.user.id, { avatar_url });
  const { password_hash, ...safeUser } = updated;

  res.json({
    message: 'Profile photo updated successfully.',
    avatar_url: updated.avatar_url,
    user: safeUser
  });
});

// DELETE /api/profile/photo - Remove profile photo (revert to initials avatar)
router.delete('/photo', authenticateToken, (req, res) => {
  const defaultAvatar = 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + encodeURIComponent(req.user.name);
  const updated = db.updateById('users', req.user.id, { avatar_url: defaultAvatar });
  const { password_hash, ...safeUser } = updated;

  res.json({
    message: 'Profile photo reset to default avatar.',
    avatar_url: defaultAvatar,
    user: safeUser
  });
});

// POST /api/profile/documents - Upload document
router.post('/documents', authenticateToken, (req, res) => {
  const { category, document_name, file_size, file_data } = req.body;

  const validCategories = [
    'Resume / CV',
    'Educational Certificate',
    'Experience Certificate',
    'Identification Document',
    'Address Proof',
    'Other'
  ];

  if (!category || !validCategories.includes(category)) {
    return res.status(400).json({ error: 'Valid category required: ' + validCategories.join(', ') });
  }

  if (!document_name) {
    return res.status(400).json({ error: 'Document name is required.' });
  }

  const newDoc = db.insert('employee_documents', {
    user_id: req.user.id,
    employee_code: req.user.employee_code,
    category,
    document_name: document_name.trim(),
    file_size: file_size || '1.4 MB',
    file_data: file_data || null,
    status: 'Pending Verification',
    rejection_reason: null,
    uploaded_at: new Date().toISOString(),
    uploaded_by: req.user.name,
    verified_at: null,
    verified_by: null
  });

  const documents = db.find('employee_documents', d => d.user_id === req.user.id);
  res.status(201).json({
    message: 'Document uploaded successfully and submitted for HR verification.',
    document: newDoc,
    documents
  });
});

// DELETE /api/profile/documents/:docId - Remove document
router.delete('/documents/:docId', authenticateToken, (req, res) => {
  const doc = db.findById('employee_documents', req.params.docId);
  if (!doc) return res.status(404).json({ error: 'Document not found' });

  const isAdmin = ['admin', 'super_admin', 'hr_admin'].includes(req.user.role);
  const isOwner = doc.user_id === req.user.id;

  if (!isAdmin && !isOwner) {
    return res.status(403).json({ error: 'Unauthorized to delete this document' });
  }

  // If regular employee, only allow deleting if Pending or Rejected
  if (!isAdmin && doc.status === 'Verified') {
    return res.status(400).json({ error: 'Verified documents cannot be deleted. Please contact HR to request a replacement.' });
  }

  db.deleteById('employee_documents', doc.id);
  const documents = db.find('employee_documents', d => d.user_id === (isOwner ? req.user.id : doc.user_id));

  res.json({
    message: 'Document deleted successfully.',
    documents
  });
});

// POST /api/profile/admin/documents/:docId/verify - HR/Admin verify or reject document
router.post('/admin/documents/:docId/verify', authenticateToken, requireRole(['admin']), (req, res) => {
  const { status, rejection_reason } = req.body;

  if (!['Verified', 'Rejected'].includes(status)) {
    return res.status(400).json({ error: "Status must be 'Verified' or 'Rejected'" });
  }

  if (status === 'Rejected' && !rejection_reason) {
    return res.status(400).json({ error: 'Rejection reason is required when rejecting a document.' });
  }

  const doc = db.findById('employee_documents', req.params.docId);
  if (!doc) return res.status(404).json({ error: 'Document not found' });

  const updated = db.updateById('employee_documents', doc.id, {
    status,
    rejection_reason: status === 'Rejected' ? rejection_reason.trim() : null,
    verified_at: new Date().toISOString(),
    verified_by: req.user.name
  });

  // Notify employee
  db.insert('notifications', {
    user_id: doc.user_id,
    title: status === 'Verified' ? 'Document Verified' : 'Document Verification Required',
    message: status === 'Verified'
      ? 'Your document "' + doc.document_name + '" (' + doc.category + ') has been verified by HR.'
      : 'Your document "' + doc.document_name + '" was rejected. Reason: ' + rejection_reason,
    type: status === 'Verified' ? 'success' : 'alert',
    link: '/my-profile',
    is_read: false
  });

  res.json({
    message: 'Document status updated to ' + status + '.',
    document: updated
  });
});

// POST /api/profile/admin/:userId/history - HR/Admin add career timeline event
router.post('/admin/:userId/history', authenticateToken, requireRole(['admin']), (req, res) => {
  const { event_date, event_type, previous_value, new_value, department_id, designation, manager_id, notes } = req.body;

  const targetUser = db.findById('users', req.params.userId);
  if (!targetUser) return res.status(404).json({ error: 'Employee not found' });

  const record = db.insert('employment_history', {
    user_id: targetUser.id,
    event_date: event_date || new Date().toISOString().split('T')[0],
    event_type: event_type || 'Internal Transfer',
    previous_value: previous_value || '',
    new_value: new_value || '',
    department_id: department_id || targetUser.department_id,
    designation: designation || targetUser.designation,
    manager_id: manager_id || targetUser.manager_id,
    notes: notes || '',
    recorded_by: req.user.name
  });

  res.status(201).json({
    message: 'Employment history record added successfully.',
    record
  });
});

export default router;
