import express from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../db/database.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

// Helper to seed initial client company defaults
const seedInitialClient = () => {
  const existing = db.getCollection('clients');
  if (!existing || existing.length === 0) {
    const quantiraClient = {
      id: 'client_quantira_tech',
      client_code: 'CLI001',
      name: 'Quantira Technologies Inc.',
      legal_name: 'Quantira Technologies Global Corp.',
      domain: 'quantiratechnologies.com',
      contact_person: 'Eleanor Vance',
      email: 'admin@quantiratechnologies.com',
      phone: '+1 (555) 019-2834',
      status: 'active', // active, pending, suspended
      plan: 'Enterprise Suite',
      subscription_status: 'Active',
      headcount_limit: 500,
      current_headcount: 8,
      address: '100 Innovation Blvd, Suite 400',
      city: 'Tech City',
      state: 'California',
      country: 'United States',
      postal_code: '94103',
      timezone: 'America/Los_Angeles',
      currency: 'USD',
      onboarded_at: '2026-01-15T00:00:00.000Z',
      handover_status: 'Handed Over',
      handover_date: '2026-01-16T00:00:00.000Z',
      handover_admin_name: 'Eleanor Vance',
      handover_admin_email: 'admin@company.com',
      modules_enabled: ['attendance', 'leaves', 'holidays', 'announcements', 'reports', 'directory'],
      notes: 'Primary parent organization account'
    };
    db.insert('clients', quantiraClient);
  }
};

// Seed on module load
seedInitialClient();

// GET /api/clients - List all client organizations
router.get('/', authenticateToken, requireRole(['super_admin']), (req, res) => {
  seedInitialClient();
  const clients = db.getCollection('clients') || [];
  
  // Attach user/headcount count
  const users = db.getCollection('users') || [];
  const enriched = clients.map(c => {
    // If client has specific company_id or client_id match
    const assignedUsers = users.filter(u => u.client_id === c.id || (c.id === 'client_quantira_tech' && !u.client_id));
    return {
      ...c,
      current_headcount: assignedUsers.length || c.current_headcount || 0
    };
  });

  res.json(enriched.sort((a, b) => new Date(b.createdAt || b.onboarded_at || 0) - new Date(a.createdAt || a.onboarded_at || 0)));
});

// GET /api/clients/:id - Get specific client setup details
router.get('/:id', authenticateToken, requireRole(['super_admin']), (req, res) => {
  const client = db.findById('clients', req.params.id);
  if (!client) {
    return res.status(404).json({ error: 'Client organization not found' });
  }
  res.json(client);
});

// POST /api/clients - Create & setup new client with instant admin onboarding & handover
router.post('/', authenticateToken, requireRole(['super_admin']), (req, res) => {
  const {
    name,
    legal_name,
    client_code,
    domain,
    contact_person,
    email,
    phone,
    plan = 'Standard Business',
    headcount_limit = 100,
    address,
    city,
    state,
    country = 'United States',
    postal_code,
    timezone = 'UTC',
    currency = 'USD',
    modules_enabled = ['attendance', 'leaves', 'holidays', 'announcements', 'directory'],
    notes,
    
    // Handover Admin Account fields
    create_admin = true,
    admin_name,
    admin_email,
    admin_password = 'password123',
    admin_phone
  } = req.body;

  if (!name || !email) {
    return res.status(400).json({ error: 'Organization name and official email are required' });
  }

  // Check unique domain or email
  const existingClients = db.getCollection('clients') || [];
  const duplicate = existingClients.find(c => 
    c.name.toLowerCase() === name.trim().toLowerCase() ||
    c.email.toLowerCase() === email.trim().toLowerCase() ||
    (domain && c.domain && c.domain.toLowerCase() === domain.trim().toLowerCase())
  );
  if (duplicate) {
    return res.status(400).json({ error: `A client organization with this name, email, or domain already exists (${duplicate.name})` });
  }

  const generatedCode = client_code || `CLI${String(existingClients.length + 1).padStart(3, '0')}`;
  const targetAdminEmail = (admin_email || email)?.trim().toLowerCase();

  // Validate admin account email if create_admin is requested
  if (create_admin && targetAdminEmail) {
    const existingUser = db.findOne('users', u => u.email.toLowerCase() === targetAdminEmail);
    if (existingUser) {
      return res.status(400).json({ error: `An account with email "${targetAdminEmail}" already exists. Please specify a unique admin email.` });
    }
  }

  const clientId = `client_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

  const newClient = db.insert('clients', {
    id: clientId,
    client_code: generatedCode,
    name: name.trim(),
    legal_name: legal_name?.trim() || name.trim(),
    domain: domain?.trim().toLowerCase() || '',
    contact_person: contact_person?.trim() || name.trim(),
    email: email.trim().toLowerCase(),
    phone: phone?.trim() || '',
    status: 'active',
    plan,
    subscription_status: 'Active',
    headcount_limit: Number(headcount_limit) || 100,
    current_headcount: create_admin ? 1 : 0,
    address: address || '',
    city: city || '',
    state: state || '',
    country: country || 'United States',
    postal_code: postal_code || '',
    timezone: timezone || 'America/Los_Angeles',
    currency: currency || 'USD',
    onboarded_at: new Date().toISOString(),
    handover_status: create_admin ? 'Handed Over' : 'Pending Handover',
    handover_date: create_admin ? new Date().toISOString() : null,
    handover_admin_name: admin_name || contact_person || name,
    handover_admin_email: admin_email || email,
    modules_enabled: Array.isArray(modules_enabled) ? modules_enabled : ['attendance', 'leaves', 'holidays', 'announcements'],
    notes: notes || 'New client organization provisioned by Super Admin'
  });

  let createdAdminUser = null;

  // If requested, provision the initial HR Admin account for handover
  if (create_admin && (admin_email || email)) {
    const targetAdminEmail = (admin_email || email).trim().toLowerCase();
    const existingUser = db.findOne('users', u => u.email.toLowerCase() === targetAdminEmail);
    
    if (!existingUser) {
      const salt = bcrypt.genSaltSync(10);
      const hash = bcrypt.hashSync(admin_password || 'password123', salt);
      const adminId = `usr_admin_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

      createdAdminUser = db.insert('users', {
        id: adminId,
        client_id: clientId,
        company_id: clientId,
        company_name: name.trim(),
        employee_code: `${generatedCode}-001`,
        name: admin_name || contact_person || `${name} Admin`,
        email: targetAdminEmail,
        password_hash: hash,
        role: 'hr_admin', // Handover admin receives HR Admin role for their organization
        status: 'active',
        phone: admin_phone || phone || '',
        designation: 'Managing Director & HR Admin',
        joining_date: new Date().toISOString().split('T')[0],
        work_location: city ? `${city}, ${country}` : country,
        avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(admin_name || name)}`
      });
    }
  }

  // Audit log
  db.insert('audit_logs', {
    action: 'CREATE_CLIENT_ORGANIZATION',
    actor_id: req.user.id,
    actor_name: req.user.name,
    actor_role: req.user.role,
    client_id: clientId,
    client_name: newClient.name,
    handover_admin_email: newClient.handover_admin_email,
    timestamp: new Date().toISOString()
  });

  res.status(201).json({
    message: 'Client organization provisioned and handed over successfully',
    client: newClient,
    adminUser: createdAdminUser ? {
      id: createdAdminUser.id,
      name: createdAdminUser.name,
      email: createdAdminUser.email,
      role: createdAdminUser.role,
      temp_password: admin_password || 'password123'
    } : null
  });
});

// PUT /api/clients/:id - Update client organization setup
router.put('/:id', authenticateToken, requireRole(['super_admin']), (req, res) => {
  const { id } = req.params;
  const client = db.findById('clients', id);
  if (!client) {
    return res.status(404).json({ error: 'Client organization not found' });
  }

  const {
    name,
    legal_name,
    contact_person,
    email,
    phone,
    plan,
    status,
    headcount_limit,
    address,
    city,
    state,
    country,
    postal_code,
    timezone,
    currency,
    modules_enabled,
    handover_status,
    notes
  } = req.body;

  const updated = db.updateById('clients', client.id, {
    name: name?.trim() || client.name,
    legal_name: legal_name?.trim() || client.legal_name,
    contact_person: contact_person?.trim() || client.contact_person,
    email: email?.trim().toLowerCase() || client.email,
    phone: phone !== undefined ? phone : client.phone,
    plan: plan || client.plan,
    status: status || client.status,
    headcount_limit: headcount_limit !== undefined ? Number(headcount_limit) : client.headcount_limit,
    address: address !== undefined ? address : client.address,
    city: city !== undefined ? city : client.city,
    state: state !== undefined ? state : client.state,
    country: country !== undefined ? country : client.country,
    postal_code: postal_code !== undefined ? postal_code : client.postal_code,
    timezone: timezone || client.timezone,
    currency: currency || client.currency,
    modules_enabled: Array.isArray(modules_enabled) ? modules_enabled : client.modules_enabled,
    handover_status: handover_status || client.handover_status,
    notes: notes !== undefined ? notes : client.notes
  });

  // Audit log
  db.insert('audit_logs', {
    action: 'UPDATE_CLIENT_ORGANIZATION',
    actor_id: req.user.id,
    actor_name: req.user.name,
    actor_role: req.user.role,
    client_id: client.id,
    client_name: updated.name,
    timestamp: new Date().toISOString()
  });

  res.json({
    message: 'Client organization profile updated successfully',
    client: updated
  });
});

// POST /api/clients/:id/handover - Trigger or re-issue application handover credentials
router.post('/:id/handover', authenticateToken, requireRole(['super_admin']), (req, res) => {
  const { id } = req.params;
  const { admin_name, admin_email, admin_password, notify_email } = req.body;

  const client = db.findById('clients', id);
  if (!client) {
    return res.status(404).json({ error: 'Client organization not found' });
  }

  const targetEmail = (admin_email || client.handover_admin_email || client.email).toLowerCase().trim();
  let user = db.findOne('users', u => u.email.toLowerCase() === targetEmail);

  const passwordToSet = admin_password || 'Welcome@2026';
  const salt = bcrypt.genSaltSync(10);
  const hash = bcrypt.hashSync(passwordToSet, salt);

  if (user) {
    user = db.updateById('users', user.id, {
      name: admin_name || user.name,
      password_hash: hash,
      status: 'active',
      role: 'hr_admin'
    });
  } else {
    user = db.insert('users', {
      id: `usr_admin_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      client_id: client.id,
      company_id: client.id,
      employee_code: `${client.client_code}-001`,
      name: admin_name || client.contact_person || `${client.name} Admin`,
      email: targetEmail,
      password_hash: hash,
      role: 'hr_admin',
      status: 'active',
      joining_date: new Date().toISOString().split('T')[0],
      designation: 'Managing Director & HR Admin'
    });
  }

  // Update client handover metadata
  const updatedClient = db.updateById('clients', client.id, {
    handover_status: 'Handed Over',
    handover_date: new Date().toISOString(),
    handover_admin_name: user.name,
    handover_admin_email: user.email
  });

  // Audit log
  db.insert('audit_logs', {
    action: 'HANDOVER_CLIENT_APPLICATION',
    actor_id: req.user.id,
    actor_name: req.user.name,
    actor_role: req.user.role,
    client_id: client.id,
    client_name: client.name,
    recipient_email: user.email,
    timestamp: new Date().toISOString()
  });

  res.json({
    message: `Application credentials for "${client.name}" generated and ready for handover`,
    client: updatedClient,
    credentials: {
      client_name: client.name,
      portal_url: `${req.protocol}://${req.get('host')}`,
      admin_name: user.name,
      login_email: user.email,
      login_password: passwordToSet,
      role: 'HR / Company Administrator',
      handover_date: new Date().toISOString()
    }
  });
});

// DELETE /api/clients/:id - Remove a client organization
router.delete('/:id', authenticateToken, requireRole(['super_admin']), (req, res) => {
  const { id } = req.params;
  const client = db.findById('clients', id);
  if (!client) {
    return res.status(404).json({ error: 'Client organization not found' });
  }

  if (client.id === 'client_quantira_tech') {
    return res.status(400).json({ error: 'Cannot delete the primary parent Quantira organization' });
  }

  db.deleteById('clients', client.id);

  // Remove associated users created under this client organization
  const users = db.getCollection('users') || [];
  const clientUsers = users.filter(u => u.client_id === client.id || u.company_id === client.id);
  clientUsers.forEach(u => db.deleteById('users', u.id));

  // Audit log
  db.insert('audit_logs', {
    action: 'DELETE_CLIENT_ORGANIZATION',
    actor_id: req.user.id,
    actor_name: req.user.name,
    actor_role: req.user.role,
    client_name: client.name,
    deleted_users_count: clientUsers.length,
    timestamp: new Date().toISOString()
  });

  res.json({ message: `Client organization "${client.name}" deleted successfully` });
});

export default router;
