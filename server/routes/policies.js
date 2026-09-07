import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { db } from '../db/database.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const router = express.Router();

// Upload Directory Setup
const uploadsDir = path.join(__dirname, '../uploads/policies');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer Storage Configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const cleanName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    const uniqueSuffix = `${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    cb(null, `policy_${uniqueSuffix}_${cleanName}`);
  }
});

// File Type & Security Validation
const allowedExtensions = ['.pdf', '.doc', '.docx', '.xls', '.xlsx'];
const allowedMimeTypes = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/octet-stream'
];

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (!allowedExtensions.includes(ext)) {
    return cb(new Error(`Invalid file type. Allowed formats: PDF, DOC, DOCX, XLS, XLSX. Got ${ext}`), false);
  }
  if (!allowedMimeTypes.includes(file.mimetype) && file.mimetype !== '') {
    return cb(new Error(`Unsupported MIME type: ${file.mimetype}`), false);
  }
  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 25 * 1024 * 1024 // 25 MB limit
  }
});

// Helper: Format file size
function formatFileSize(bytes) {
  if (!bytes || bytes === 0) return '0 KB';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

// Helper: Determine Authenticated User's Company ID
function getUserCompanyId(user) {
  return user.company_id || user.client_id || 'client_quantira_tech';
}

// Helper: Validate Tenant Access
function validateTenantAccess(user, targetCompanyId) {
  if (user.role === 'super_admin') return true;
  return getUserCompanyId(user) === targetCompanyId;
}

// Helper: Dispatch Notification to company members
function notifyCompanyMembers(companyId, title, message, link = '/company-policies') {
  try {
    const users = db.getCollection('users') || [];
    const targetUsers = users.filter(u => {
      const uComp = getUserCompanyId(u);
      return uComp === companyId && u.status === 'active';
    });

    targetUsers.forEach(u => {
      db.insert('notifications', {
        user_id: u.id,
        title,
        message,
        type: 'info',
        link,
        is_read: false,
        createdAt: new Date().toISOString()
      });
    });
  } catch (err) {
    console.error('Failed to dispatch policy notifications:', err);
  }
}

// Helper: Log Policy Action to audit_logs
function logPolicyAudit(req, action, policy, details = {}) {
  try {
    db.insert('audit_logs', {
      action,
      actor_id: req.user.id,
      actor_name: req.user.name,
      actor_role: req.user.role,
      company_id: policy?.company_id || getUserCompanyId(req.user),
      policy_id: policy?.id,
      policy_name: policy?.policy_name,
      ...details,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('Failed to record policy audit log:', err);
  }
}

// ==========================================
// CATEGORIES ENDPOINTS
// ==========================================

// GET /api/policies/categories - List categories for company
router.get('/categories', authenticateToken, (req, res) => {
  const companyId = getUserCompanyId(req.user);
  const categories = db.getCollection('policy_categories') || [];
  
  const filtered = categories.filter(c => 
    !c.company_id || c.company_id === companyId || req.user.role === 'super_admin'
  );

  res.json({ categories: filtered });
});

// POST /api/policies/categories - Create category (HR/Super Admin only)
router.post('/categories', authenticateToken, requireRole(['super_admin', 'hr_admin']), (req, res) => {
  const { name, description } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Category name is required' });
  }

  const companyId = getUserCompanyId(req.user);
  const categories = db.getCollection('policy_categories') || [];
  
  const duplicate = categories.find(c => 
    (c.company_id === companyId || !c.company_id) && 
    c.name.toLowerCase() === name.trim().toLowerCase()
  );

  if (duplicate) {
    return res.status(400).json({ error: `Category "${name}" already exists` });
  }

  const newCat = db.insert('policy_categories', {
    id: `cat_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    company_id: companyId,
    name: name.trim(),
    description: description?.trim() || '',
    status: 'active',
    created_by: req.user.id,
    createdAt: new Date().toISOString()
  });

  res.status(201).json({ message: 'Category created successfully', category: newCat });
});

// PUT /api/policies/categories/:id - Update category
router.put('/categories/:id', authenticateToken, requireRole(['super_admin', 'hr_admin']), (req, res) => {
  const { id } = req.params;
  const { name, description, status } = req.body;
  const category = db.findById('policy_categories', id);
  if (!category) return res.status(404).json({ error: 'Category not found' });

  if (!validateTenantAccess(req.user, category.company_id)) {
    return res.status(403).json({ error: 'Unauthorized to modify this category' });
  }

  const updated = db.updateById('policy_categories', id, {
    name: name ? name.trim() : category.name,
    description: description !== undefined ? description.trim() : category.description,
    status: status || category.status,
    updated_at: new Date().toISOString()
  });

  res.json({ message: 'Category updated', category: updated });
});

// DELETE /api/policies/categories/:id - Deactivate/delete category
router.delete('/categories/:id', authenticateToken, requireRole(['super_admin', 'hr_admin']), (req, res) => {
  const { id } = req.params;
  const category = db.findById('policy_categories', id);
  if (!category) return res.status(404).json({ error: 'Category not found' });

  if (!validateTenantAccess(req.user, category.company_id)) {
    return res.status(403).json({ error: 'Unauthorized to delete this category' });
  }

  const policies = db.getCollection('company_policies') || [];
  const inUse = policies.find(p => p.category_id === id && p.status !== 'archived');
  if (inUse) {
    return res.status(400).json({ error: `Cannot delete category while active policy "${inUse.policy_name}" is assigned to it.` });
  }

  db.deleteById('policy_categories', id);
  res.json({ message: 'Category removed successfully' });
});

// ==========================================
// POLICIES CRUD & LIFECYCLE
// ==========================================

// GET /api/policies - List policies with tenant isolation & RBAC
router.get('/', authenticateToken, (req, res) => {
  const companyId = getUserCompanyId(req.user);
  const userRole = req.user.role;
  const { category_id, status, search } = req.query;

  let policies = db.getCollection('company_policies') || [];

  // 1. Strict Tenant Filtering
  if (userRole !== 'super_admin') {
    policies = policies.filter(p => p.company_id === companyId);
  } else if (req.query.company_id) {
    policies = policies.filter(p => p.company_id === req.query.company_id);
  }

  // Auto expiry check
  const nowStr = new Date().toISOString().split('T')[0];
  policies.forEach(p => {
    if (p.expiry_date && p.expiry_date < nowStr && p.status === 'published') {
      db.updateById('company_policies', p.id, { status: 'expired' });
      p.status = 'expired';
    }
  });

  // 2. Strict RBAC Status Filtering:
  // Managers and Employees ONLY see published policies
  const isManagement = ['super_admin', 'hr_admin'].includes(userRole);
  if (!isManagement) {
    policies = policies.filter(p => p.status === 'published');
  } else if (status && status !== 'all') {
    policies = policies.filter(p => p.status === status);
  }

  // 3. Category Filter
  if (category_id && category_id !== 'all') {
    policies = policies.filter(p => p.category_id === category_id);
  }

  // 4. Search Filter
  if (search && search.trim()) {
    const q = search.trim().toLowerCase();
    policies = policies.filter(p =>
      p.policy_name.toLowerCase().includes(q) ||
      (p.description && p.description.toLowerCase().includes(q)) ||
      (p.category_name && p.category_name.toLowerCase().includes(q)) ||
      (p.version && p.version.toLowerCase().includes(q))
    );
  }

  policies.sort((a, b) => new Date(b.updated_at || b.createdAt) - new Date(a.updated_at || a.createdAt));

  const allCompanyPolicies = (db.getCollection('company_policies') || []).filter(p => 
    userRole === 'super_admin' ? true : p.company_id === companyId
  );
  const categories = (db.getCollection('policy_categories') || []).filter(c => 
    !c.company_id || c.company_id === companyId || userRole === 'super_admin'
  );

  const stats = {
    total_policies: isManagement ? allCompanyPolicies.length : policies.length,
    published_count: allCompanyPolicies.filter(p => p.status === 'published').length,
    draft_count: allCompanyPolicies.filter(p => p.status === 'draft').length,
    archived_count: allCompanyPolicies.filter(p => p.status === 'archived').length,
    total_categories: categories.length
  };

  res.json({
    policies,
    stats,
    userRole
  });
});

// GET /api/policies/:id - Single policy details
router.get('/:id', authenticateToken, (req, res) => {
  const { id } = req.params;
  const policy = db.findById('company_policies', id);
  if (!policy) return res.status(404).json({ error: 'Policy not found' });

  if (!validateTenantAccess(req.user, policy.company_id)) {
    return res.status(403).json({ error: 'Access denied to this company policy' });
  }

  const isManagement = ['super_admin', 'hr_admin'].includes(req.user.role);
  if (!isManagement && policy.status !== 'published') {
    return res.status(404).json({ error: 'Policy is not currently published' });
  }

  res.json({ policy });
});

// POST /api/policies - Create & upload new policy (HR/Super Admin only)
router.post('/', authenticateToken, requireRole(['super_admin', 'hr_admin']), upload.single('document'), (req, res) => {
  try {
    const {
      policy_name,
      description,
      category_id,
      version = '1.0',
      effective_date,
      expiry_date,
      status = 'draft'
    } = req.body;

    if (!policy_name || !policy_name.trim()) {
      return res.status(400).json({ error: 'Policy name is required' });
    }
    if (!category_id) {
      return res.status(400).json({ error: 'Category is required' });
    }
    if (!version || !version.trim()) {
      return res.status(400).json({ error: 'Policy version is required' });
    }
    if (!effective_date) {
      return res.status(400).json({ error: 'Effective date is required' });
    }

    const companyId = getUserCompanyId(req.user);
    const category = db.findById('policy_categories', category_id);

    const policyId = `pol_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    let fileInfo = null;
    if (req.file) {
      fileInfo = {
        file_name: req.file.filename,
        document_name: req.file.originalname,
        document_type: req.file.mimetype,
        document_size: formatFileSize(req.file.size)
      };
    } else {
      const placeholderName = `policy_${policy_name.replace(/[^a-zA-Z0-9]/g, '_')}_v${version}.pdf`;
      const placeholderPath = path.join(uploadsDir, placeholderName);
      
      const samplePdfContent = `%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n4 0 obj\n<< /Length 200 >>\nstream\nBT /F1 18 Tf 50 740 Td (${policy_name}) Tj /F1 12 Tf 0 -30 Td (Version ${version} - Effective ${effective_date}) Tj /F1 10 Tf 0 -30 Td (${description || 'Official company policy document.'}) Tj ET\nendstream\nendobj\n5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\nxref\n0 6\n0000000000 65535 f\n0000000009 00000 n\n0000000058 00000 n\n0000000115 00000 n\n0000000244 00000 n\n0000000450 00000 n\ntrailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n550\n%%EOF`;
      fs.writeFileSync(placeholderPath, samplePdfContent);

      fileInfo = {
        file_name: placeholderName,
        document_name: placeholderName,
        document_type: 'application/pdf',
        document_size: '150 KB'
      };
    }

    const isPublished = status === 'published';

    const newPolicy = db.insert('company_policies', {
      id: policyId,
      company_id: companyId,
      policy_name: policy_name.trim(),
      description: description?.trim() || '',
      category_id,
      category_name: category?.name || 'General',
      version: version.trim(),
      file_name: fileInfo.file_name,
      document_name: fileInfo.document_name,
      document_type: fileInfo.document_type,
      document_size: fileInfo.document_size,
      effective_date,
      expiry_date: expiry_date || null,
      status: isPublished ? 'published' : 'draft',
      is_current_version: true,
      created_by: req.user.name,
      created_by_id: req.user.id,
      created_by_role: req.user.role,
      published_by: isPublished ? req.user.name : null,
      published_at: isPublished ? new Date().toISOString() : null,
      uploaded_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      document_url: `/api/policies/${policyId}/view`,
      download_url: `/api/policies/${policyId}/download`
    });

    // Save initial version to company_policy_versions
    db.insert('company_policy_versions', {
      id: `ver_${policyId}_v${version.replace(/[^a-zA-Z0-9]/g, '_')}`,
      company_id: companyId,
      policy_id: policyId,
      version: version.trim(),
      document_name: fileInfo.document_name,
      file_name: fileInfo.file_name,
      document_type: fileInfo.document_type,
      document_size: fileInfo.document_size,
      effective_date,
      status: isPublished ? 'published' : 'draft',
      uploaded_by: req.user.name,
      uploaded_at: new Date().toISOString()
    });

    logPolicyAudit(req, 'CREATE_POLICY', newPolicy, {
      initial_status: newPolicy.status,
      version: newPolicy.version
    });

    if (isPublished) {
      logPolicyAudit(req, 'PUBLISH_POLICY', newPolicy);
      notifyCompanyMembers(
        companyId,
        'New Company Policy Published',
        `New policy "${newPolicy.policy_name}" (v${newPolicy.version}) has been published. Effective: ${newPolicy.effective_date}.`
      );
    }

    res.status(201).json({
      message: isPublished ? 'Policy created and published successfully' : 'Policy draft saved successfully',
      policy: newPolicy
    });
  } catch (err) {
    console.error('Error creating policy:', err);
    res.status(500).json({ error: 'Failed to create policy', details: err.message });
  }
});

// PUT /api/policies/:id - Edit policy metadata
router.put('/:id', authenticateToken, requireRole(['super_admin', 'hr_admin']), (req, res) => {
  const { id } = req.params;
  const policy = db.findById('company_policies', id);
  if (!policy) return res.status(404).json({ error: 'Policy not found' });

  if (!validateTenantAccess(req.user, policy.company_id)) {
    return res.status(403).json({ error: 'Unauthorized to modify this policy' });
  }

  const {
    policy_name,
    description,
    category_id,
    version,
    effective_date,
    expiry_date
  } = req.body;

  const category = category_id ? db.findById('policy_categories', category_id) : null;

  const updates = {
    policy_name: policy_name ? policy_name.trim() : policy.policy_name,
    description: description !== undefined ? description.trim() : policy.description,
    category_id: category_id || policy.category_id,
    category_name: category ? category.name : policy.category_name,
    version: version ? version.trim() : policy.version,
    effective_date: effective_date || policy.effective_date,
    expiry_date: expiry_date !== undefined ? expiry_date : policy.expiry_date,
    last_updated_by: req.user.name,
    updated_at: new Date().toISOString()
  };

  const updatedPolicy = db.updateById('company_policies', id, updates);

  logPolicyAudit(req, 'EDIT_POLICY', updatedPolicy, {
    previous_values: {
      name: policy.policy_name,
      version: policy.version,
      effective_date: policy.effective_date
    }
  });

  res.json({ message: 'Policy details updated successfully', policy: updatedPolicy });
});

// POST /api/policies/:id/replace-document - Replace document & create new version
router.post('/:id/replace-document', authenticateToken, requireRole(['super_admin', 'hr_admin']), upload.single('document'), (req, res) => {
  try {
    const { id } = req.params;
    const policy = db.findById('company_policies', id);
    if (!policy) return res.status(404).json({ error: 'Policy not found' });

    if (!validateTenantAccess(req.user, policy.company_id)) {
      return res.status(403).json({ error: 'Unauthorized to replace document for this policy' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'A replacement document file is required' });
    }

    const { version, effective_date } = req.body;
    const newVersion = (version && version.trim()) ? version.trim() : `v${(parseFloat(policy.version) + 0.1).toFixed(1)}`;
    const newEffectiveDate = effective_date || new Date().toISOString().split('T')[0];

    // Archive previous current version in company_policy_versions
    const existingVersions = db.getCollection('company_policy_versions') || [];
    existingVersions.forEach(v => {
      if (v.policy_id === id && v.status === 'published') {
        db.updateById('company_policy_versions', v.id, { status: 'archived' });
      }
    });

    const fileInfo = {
      file_name: req.file.filename,
      document_name: req.file.originalname,
      document_type: req.file.mimetype,
      document_size: formatFileSize(req.file.size)
    };

    const newVersionRecord = db.insert('company_policy_versions', {
      id: `ver_${id}_v${newVersion.replace(/[^a-zA-Z0-9]/g, '_')}`,
      company_id: policy.company_id,
      policy_id: id,
      version: newVersion,
      document_name: fileInfo.document_name,
      file_name: fileInfo.file_name,
      document_type: fileInfo.document_type,
      document_size: fileInfo.document_size,
      effective_date: newEffectiveDate,
      status: policy.status === 'published' ? 'published' : 'draft',
      uploaded_by: req.user.name,
      uploaded_at: new Date().toISOString()
    });

    const updatedPolicy = db.updateById('company_policies', id, {
      version: newVersion,
      file_name: fileInfo.file_name,
      document_name: fileInfo.document_name,
      document_type: fileInfo.document_type,
      document_size: fileInfo.document_size,
      effective_date: newEffectiveDate,
      last_updated_by: req.user.name,
      updated_at: new Date().toISOString()
    });

    logPolicyAudit(req, 'REPLACE_POLICY_DOCUMENT', updatedPolicy, {
      previous_version: policy.version,
      new_version: newVersion,
      previous_document: policy.document_name,
      new_document: fileInfo.document_name
    });

    if (updatedPolicy.status === 'published') {
      notifyCompanyMembers(
        policy.company_id,
        'Company Policy Updated',
        `Policy "${updatedPolicy.policy_name}" has been updated to Version ${newVersion}. Effective: ${newEffectiveDate}.`
      );
    }

    res.json({
      message: `Document updated to Version ${newVersion} successfully. Previous version archived.`,
      policy: updatedPolicy,
      versionRecord: newVersionRecord
    });
  } catch (err) {
    console.error('Error replacing document:', err);
    res.status(500).json({ error: 'Failed to replace policy document', details: err.message });
  }
});

// POST /api/policies/:id/publish - Publish policy
router.post('/:id/publish', authenticateToken, requireRole(['super_admin', 'hr_admin']), (req, res) => {
  const { id } = req.params;
  const policy = db.findById('company_policies', id);
  if (!policy) return res.status(404).json({ error: 'Policy not found' });

  if (!validateTenantAccess(req.user, policy.company_id)) {
    return res.status(403).json({ error: 'Unauthorized to publish this policy' });
  }

  const updated = db.updateById('company_policies', id, {
    status: 'published',
    published_by: req.user.name,
    published_at: new Date().toISOString(),
    last_updated_by: req.user.name,
    updated_at: new Date().toISOString()
  });

  const versions = db.getCollection('company_policy_versions') || [];
  const currVer = versions.find(v => v.policy_id === id && v.version === updated.version);
  if (currVer) {
    db.updateById('company_policy_versions', currVer.id, { status: 'published' });
  }

  logPolicyAudit(req, 'PUBLISH_POLICY', updated);

  notifyCompanyMembers(
    policy.company_id,
    'New Company Policy Published',
    `Official policy "${updated.policy_name}" (v${updated.version}) is now published and visible.`
  );

  res.json({ message: `Policy "${updated.policy_name}" published successfully`, policy: updated });
});

// POST /api/policies/:id/unpublish - Unpublish policy
router.post('/:id/unpublish', authenticateToken, requireRole(['super_admin', 'hr_admin']), (req, res) => {
  const { id } = req.params;
  const policy = db.findById('company_policies', id);
  if (!policy) return res.status(404).json({ error: 'Policy not found' });

  if (!validateTenantAccess(req.user, policy.company_id)) {
    return res.status(403).json({ error: 'Unauthorized to unpublish this policy' });
  }

  const updated = db.updateById('company_policies', id, {
    status: 'unpublished',
    last_updated_by: req.user.name,
    updated_at: new Date().toISOString()
  });

  logPolicyAudit(req, 'UNPUBLISH_POLICY', updated);

  res.json({ message: `Policy "${updated.policy_name}" unpublished. Hidden from regular employees and managers.`, policy: updated });
});

// POST /api/policies/:id/archive - Archive policy
router.post('/:id/archive', authenticateToken, requireRole(['super_admin', 'hr_admin']), (req, res) => {
  const { id } = req.params;
  const policy = db.findById('company_policies', id);
  if (!policy) return res.status(404).json({ error: 'Policy not found' });

  if (!validateTenantAccess(req.user, policy.company_id)) {
    return res.status(403).json({ error: 'Unauthorized to archive this policy' });
  }

  const updated = db.updateById('company_policies', id, {
    status: 'archived',
    archived_at: new Date().toISOString(),
    last_updated_by: req.user.name,
    updated_at: new Date().toISOString()
  });

  logPolicyAudit(req, 'ARCHIVE_POLICY', updated);

  res.json({ message: `Policy "${updated.policy_name}" moved to archives`, policy: updated });
});

// DELETE /api/policies/:id - Soft delete policy
router.delete('/:id', authenticateToken, requireRole(['super_admin', 'hr_admin']), (req, res) => {
  const { id } = req.params;
  const policy = db.findById('company_policies', id);
  if (!policy) return res.status(404).json({ error: 'Policy not found' });

  if (!validateTenantAccess(req.user, policy.company_id)) {
    return res.status(403).json({ error: 'Unauthorized to delete this policy' });
  }

  db.updateById('company_policies', id, {
    status: 'archived',
    deleted_at: new Date().toISOString(),
    deleted_by: req.user.name,
    updated_at: new Date().toISOString()
  });

  logPolicyAudit(req, 'DELETE_POLICY', policy, { soft_deleted: true });

  res.json({ message: `Policy "${policy.policy_name}" deleted and archived from active library.` });
});

// GET /api/policies/:id/history - View policy version history (HR/Super Admin only)
router.get('/:id/history', authenticateToken, requireRole(['super_admin', 'hr_admin']), (req, res) => {
  const { id } = req.params;
  const policy = db.findById('company_policies', id);
  if (!policy) return res.status(404).json({ error: 'Policy not found' });

  if (!validateTenantAccess(req.user, policy.company_id)) {
    return res.status(403).json({ error: 'Access denied' });
  }

  const versions = (db.getCollection('company_policy_versions') || [])
    .filter(v => v.policy_id === id)
    .sort((a, b) => new Date(b.uploaded_at || b.createdAt) - new Date(a.uploaded_at || a.createdAt));

  res.json({ policy, versions });
});

// ==========================================
// DOCUMENT VIEW & DOWNLOAD (SECURE ACCESS)
// ==========================================

// GET /api/policies/:id/view - In-portal PDF/Document view
router.get('/:id/view', authenticateToken, (req, res) => {
  const { id } = req.params;
  const policy = db.findById('company_policies', id);
  if (!policy) return res.status(404).json({ error: 'Policy not found' });

  if (!validateTenantAccess(req.user, policy.company_id)) {
    return res.status(403).json({ error: 'Access denied' });
  }

  const isManagement = ['super_admin', 'hr_admin'].includes(req.user.role);
  if (!isManagement && policy.status !== 'published') {
    return res.status(403).json({ error: 'Policy document is not published' });
  }

  const filePath = path.join(uploadsDir, policy.file_name);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Policy document file not found on server' });
  }

  res.setHeader('Content-Type', policy.document_type || 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${policy.document_name}"`);
  
  const stream = fs.createReadStream(filePath);
  stream.pipe(res);
});

// GET /api/policies/:id/download - Download policy document
router.get('/:id/download', authenticateToken, (req, res) => {
  const { id } = req.params;
  const policy = db.findById('company_policies', id);
  if (!policy) return res.status(404).json({ error: 'Policy not found' });

  if (!validateTenantAccess(req.user, policy.company_id)) {
    return res.status(403).json({ error: 'Access denied' });
  }

  const isManagement = ['super_admin', 'hr_admin'].includes(req.user.role);
  if (!isManagement && policy.status !== 'published') {
    return res.status(403).json({ error: 'Policy document is not published' });
  }

  const filePath = path.join(uploadsDir, policy.file_name);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Policy document file not found on server' });
  }

  res.setHeader('Content-Disposition', `attachment; filename="${policy.document_name}"`);
  res.setHeader('Content-Type', policy.document_type || 'application/octet-stream');

  const stream = fs.createReadStream(filePath);
  stream.pipe(res);
});

// GET /api/policies/versions/:versionId/download - Download historical version
router.get('/versions/:versionId/download', authenticateToken, requireRole(['super_admin', 'hr_admin']), (req, res) => {
  const { versionId } = req.params;
  const version = db.findById('company_policy_versions', versionId);
  if (!version) return res.status(404).json({ error: 'Historical version record not found' });

  if (!validateTenantAccess(req.user, version.company_id)) {
    return res.status(403).json({ error: 'Access denied' });
  }

  const filePath = path.join(uploadsDir, version.file_name);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Historical document file not found on server' });
  }

  res.setHeader('Content-Disposition', `attachment; filename="${version.document_name}"`);
  res.setHeader('Content-Type', version.document_type || 'application/octet-stream');

  const stream = fs.createReadStream(filePath);
  stream.pipe(res);
});

export default router;
