import React, { useState, useEffect, useMemo } from 'react';
import {
  Building2,
  Plus,
  Search,
  CheckCircle2,
  Users,
  Key,
  Copy,
  Check,
  Send,
  ExternalLink,
  Shield,
  Clock,
  Sparkles,
  Edit2,
  Trash2,
  Globe,
  Mail,
  Phone,
  Layers,
  Award,
  Calendar,
  Eye,
  EyeOff,
  RefreshCw,
  Sliders,
  CheckSquare
} from 'lucide-react';
import { api } from '../../services/api';
import Badge from '../../components/common/Badge';
import Modal from '../../components/common/Modal';
import ConfirmDialog from '../../components/common/ConfirmDialog';

export const ClientSetupPage = () => {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Create Client Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    legal_name: '',
    client_code: '',
    domain: '',
    contact_person: '',
    email: '',
    phone: '',
    plan: 'Standard Enterprise',
    headcount_limit: 100,
    address: '',
    city: '',
    state: '',
    country: 'United States',
    postal_code: '',
    timezone: 'America/Los_Angeles',
    currency: 'USD',
    modules_enabled: ['attendance', 'leaves', 'holidays', 'announcements', 'directory', 'reports'],
    notes: '',
    
    // Handover admin credentials
    create_admin: true,
    admin_name: '',
    admin_email: '',
    admin_password: '',
    admin_phone: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [createError, setCreateError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Handover Credentials Modal State (shown upon creation or re-issuance)
  const [handoverModalOpen, setHandoverModalOpen] = useState(false);
  const [handoverDetails, setHandoverDetails] = useState(null);
  const [copiedKey, setCopiedKey] = useState(null);

  // Edit Client Modal State
  const [editingClient, setEditingClient] = useState(null);
  const [editFormData, setEditFormData] = useState(null);
  const [savingEdit, setSavingEdit] = useState(false);

  // Delete Confirmation State
  const [deleteTargetClient, setDeleteTargetClient] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Success Notification
  const [successBanner, setSuccessBanner] = useState('');

  const loadClients = async () => {
    setLoading(true);
    try {
      const data = await api.getClients();
      setClients(data || []);
    } catch (err) {
      console.error('Failed to load clients:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClients();
  }, []);

  // Password Generator
  const generateSecurePassword = () => {
    const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%&*';
    let pwd = '';
    for (let i = 0; i < 12; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return pwd;
  };

  const openCreateModal = () => {
    const defaultPwd = generateSecurePassword();
    setFormData({
      name: '',
      legal_name: '',
      client_code: '',
      domain: '',
      contact_person: '',
      email: '',
      phone: '',
      plan: 'Standard Enterprise',
      headcount_limit: 100,
      address: '',
      city: '',
      state: '',
      country: 'United States',
      postal_code: '',
      timezone: 'America/Los_Angeles',
      currency: 'USD',
      modules_enabled: ['attendance', 'leaves', 'holidays', 'announcements', 'directory', 'reports'],
      notes: '',
      create_admin: true,
      admin_name: '',
      admin_email: '',
      admin_password: defaultPwd,
      admin_phone: ''
    });
    setCreateError('');
    setIsCreateModalOpen(true);
  };

  const handleNameChange = (nameVal) => {
    const cleanDomain = nameVal.toLowerCase().replace(/[^a-z0-9]/g, '');
    const cleanCode = nameVal.toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 4);
    setFormData(prev => ({
      ...prev,
      name: nameVal,
      domain: prev.domain ? prev.domain : (cleanDomain ? `${cleanDomain}.com` : ''),
      client_code: prev.client_code ? prev.client_code : (cleanCode ? `CLI-${cleanCode}` : '')
    }));
  };

  const handleToggleModule = (moduleKey) => {
    setFormData(prev => {
      const current = prev.modules_enabled || [];
      return {
        ...prev,
        modules_enabled: current.includes(moduleKey)
          ? current.filter(m => m !== moduleKey)
          : [...current, moduleKey]
      };
    });
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim()) {
      setCreateError('Client organization name and email are required');
      return;
    }

    setSubmitting(true);
    setCreateError('');
    try {
      const res = await api.createClient(formData);
      setIsCreateModalOpen(false);
      await loadClients();

      // Show Handover modal with generated credentials for copy/distribution
      setHandoverDetails({
        client_name: res.client?.name,
        domain: res.client?.domain,
        portal_url: window.location.origin,
        admin_name: res.adminUser?.name || formData.admin_name || formData.contact_person || `${formData.name} Admin`,
        login_email: res.adminUser?.email || formData.admin_email || formData.email,
        login_password: res.adminUser?.temp_password || formData.admin_password,
        role: 'HR & Company Administrator',
        handover_date: new Date().toISOString()
      });
      setHandoverModalOpen(true);

      setSuccessBanner(`Client organization "${formData.name}" setup completed successfully!`);
      setTimeout(() => setSuccessBanner(''), 5000);
    } catch (err) {
      setCreateError(err.message || 'Failed to setup client organization');
    } finally {
      setSubmitting(false);
    }
  };

  // Re-issue Handover
  const handleInitiateHandover = async (client) => {
    const tempPassword = generateSecurePassword();
    try {
      const res = await api.handoverClient(client.id, {
        admin_name: client.contact_person || `${client.name} Admin`,
        admin_email: client.handover_admin_email || client.email,
        admin_password: tempPassword
      });

      setHandoverDetails({
        client_name: res.client?.name || client.name,
        domain: res.client?.domain || client.domain,
        portal_url: window.location.origin,
        admin_name: res.credentials?.admin_name,
        login_email: res.credentials?.login_email,
        login_password: res.credentials?.login_password,
        role: res.credentials?.role,
        handover_date: res.credentials?.handover_date
      });
      setHandoverModalOpen(true);
      await loadClients();
    } catch (err) {
      alert(err.message || 'Failed to generate handover package');
    }
  };

  const handleOpenEdit = (client) => {
    setEditingClient(client);
    setEditFormData({
      name: client.name,
      legal_name: client.legal_name || '',
      contact_person: client.contact_person || '',
      email: client.email || '',
      phone: client.phone || '',
      plan: client.plan || 'Standard Enterprise',
      status: client.status || 'active',
      headcount_limit: client.headcount_limit || 100,
      address: client.address || '',
      city: client.city || '',
      state: client.state || '',
      country: client.country || 'United States',
      notes: client.notes || ''
    });
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingClient || !editFormData) return;
    setSavingEdit(true);
    try {
      await api.updateClient(editingClient.id, editFormData);
      setEditingClient(null);
      await loadClients();
      setSuccessBanner(`Client organization "${editFormData.name}" updated successfully.`);
      setTimeout(() => setSuccessBanner(''), 4000);
    } catch (err) {
      alert(err.message || 'Failed to update client organization');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeleteClient = async () => {
    if (!deleteTargetClient) return;
    setDeleting(true);
    try {
      await api.deleteClient(deleteTargetClient.id);
      setDeleteTargetClient(null);
      await loadClients();
      setSuccessBanner(`Client organization "${deleteTargetClient.name}" removed successfully.`);
      setTimeout(() => setSuccessBanner(''), 4000);
    } catch (err) {
      alert(err.message || 'Failed to delete client');
    } finally {
      setDeleting(false);
    }
  };

  const copyToClipboard = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const copyAllCredentials = () => {
    if (!handoverDetails) return;
    const text = `==============================
HRMS CLIENT HANDOVER PACKAGE
==============================
Organization: ${handoverDetails.client_name}
Portal URL: ${handoverDetails.portal_url}
Administrator: ${handoverDetails.admin_name}
Login Email: ${handoverDetails.login_email}
Temporary Password: ${handoverDetails.login_password}
Designated Role: ${handoverDetails.role}
Handover Date: ${new Date(handoverDetails.handover_date).toLocaleDateString()}
==============================
Instructions:
1. Log in at ${handoverDetails.portal_url} using the credentials above.
2. Complete your organization setup, employee invites, and custom policies.
3. We recommend changing your initial password upon first sign-in.
==============================`;
    copyToClipboard(text, 'all');
  };

  // Filtered clients list
  const filteredClients = useMemo(() => {
    return clients.filter(c => {
      const matchSearch = !searchQuery ||
        c.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.client_code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.contact_person?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.domain?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchStatus = statusFilter === 'all' || c.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [clients, searchQuery, statusFilter]);

  const totalHeadcount = useMemo(() => {
    return clients.reduce((acc, c) => acc + (c.current_headcount || 0), 0);
  }, [clients]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold text-slate-900">Client Setup & Handover Module</h2>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
              Super Admin Multi-Tenant
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Provision new client organizations, assign initial HR admin credentials, and handover the HRMS portal to client stakeholders
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Setup New Client Organization</span>
        </button>
      </div>

      {/* Success Alert */}
      {successBanner && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs font-medium text-emerald-800 flex items-center gap-2 animate-fade-in shadow-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successBanner}</span>
        </div>
      )}

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm">
          <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Total Client Organizations</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-slate-900">{clients.length}</span>
            <span className="text-xs text-slate-400 font-medium">onboarded tenants</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm">
          <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Active Portals</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-emerald-600">
              {clients.filter(c => c.status === 'active').length}
            </span>
            <span className="text-xs text-slate-400 font-medium">operating live</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm">
          <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Handed Over</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-indigo-600">
              {clients.filter(c => c.handover_status === 'Handed Over').length}
            </span>
            <span className="text-xs text-slate-400 font-medium">credentials issued</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm">
          <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Total Managed Employees</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-purple-600">{totalHeadcount}</span>
            <span className="text-xs text-slate-400 font-medium">workforce across clients</span>
          </div>
        </div>
      </div>

      {/* Filters & Search Toolbar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by client name, code, domain, or contact person..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-slate-500">Status:</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="pending">Pending Setup</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>
      </div>

      {/* Clients Cards Grid */}
      {loading ? (
        <div className="py-20 flex justify-center">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : filteredClients.length === 0 ? (
        <div className="py-16 text-center text-xs text-slate-400 bg-white rounded-3xl border border-slate-200">
          No client organizations match your filter criteria. Click "Setup New Client Organization" to onboard one.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredClients.map((client) => {
            const isParent = client.id === 'client_quantira_tech';

            return (
              <div
                key={client.id}
                className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm hover:border-indigo-300 hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Top Row: Client Avatar / Icon & Status */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-sm border border-indigo-100 shadow-xs">
                        <Building2 className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900 leading-tight flex items-center gap-1.5">
                          <span>{client.name}</span>
                          {isParent && (
                            <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-800">
                              HQ
                            </span>
                          )}
                        </h3>
                        <span className="text-[11px] font-mono text-slate-400 block mt-0.5">
                          {client.client_code} • {client.plan || 'Enterprise'}
                        </span>
                      </div>
                    </div>

                    <Badge variant={client.status} size="sm">
                      {client.status}
                    </Badge>
                  </div>

                  {/* Organization Contact Details */}
                  <div className="space-y-1.5 py-3 border-y border-slate-100 text-xs text-slate-600">
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate font-medium">{client.email}</span>
                    </div>
                    {client.domain && (
                      <div className="flex items-center gap-2">
                        <Globe className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate font-mono text-[11px] text-indigo-600">{client.domain}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Users className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>Contact: <strong className="text-slate-800">{client.contact_person || 'HR Lead'}</strong></span>
                    </div>
                  </div>

                  {/* Handover & Scope Summary */}
                  <div className="py-3 space-y-2">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">Headcount Capacity:</span>
                      <span className="font-bold text-slate-800">
                        {client.current_headcount || 0} / {client.headcount_limit || 100} staff
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">Application Handover:</span>
                      <Badge variant={client.handover_status || 'Pending Handover'} size="sm">
                        {client.handover_status || 'Pending Handover'}
                      </Badge>
                    </div>

                    {client.handover_admin_email && (
                      <div className="text-[10px] text-slate-400 bg-slate-50 p-2 rounded-xl">
                        Handover Admin: <strong className="text-slate-700">{client.handover_admin_email}</strong>
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Action Buttons */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(client)}
                      title="Edit Organization Details"
                      className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    {!isParent && (
                      <button
                        type="button"
                        onClick={() => setDeleteTargetClient(client)}
                        title="Delete Client"
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleInitiateHandover(client)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl font-bold text-xs transition-colors cursor-pointer"
                  >
                    <Key className="w-3.5 h-3.5" />
                    <span>Handover Credentials</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE NEW CLIENT ORGANISATION MODAL */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Setup New Client Organization & Handover Application"
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
          {createError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-semibold">
              {createError}
            </div>
          )}

          {/* Section 1: Corporate Information */}
          <div className="bg-slate-50/70 p-3.5 rounded-2xl border border-slate-200/80 space-y-3">
            <div className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-indigo-600" />
              <span>1. Organization & Commercial Profile</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Client Organization Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Acme Health Corp, Zenith Logistics"
                  value={formData.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Client Code / Identifier
                </label>
                <input
                  type="text"
                  placeholder="CLI-ACME"
                  value={formData.client_code}
                  onChange={(e) => setFormData({ ...formData, client_code: e.target.value })}
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Primary Domain
                </label>
                <input
                  type="text"
                  placeholder="acmehealth.com"
                  value={formData.domain}
                  onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Subscription Tier / Plan
                </label>
                <select
                  value={formData.plan}
                  onChange={(e) => setFormData({ ...formData, plan: e.target.value })}
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                >
                  <option value="Standard Business">Standard Business</option>
                  <option value="Standard Enterprise">Standard Enterprise</option>
                  <option value="Corporate Global Suite">Corporate Global Suite</option>
                  <option value="Custom Dedicated Tier">Custom Dedicated Tier</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Headcount Seat Limit
                </label>
                <input
                  type="number"
                  value={formData.headcount_limit}
                  onChange={(e) => setFormData({ ...formData, headcount_limit: e.target.value })}
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Official Client Email <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  placeholder="contact@acmehealth.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
            </div>
          </div>

          {/* Section 2: Handover Administrator Credentials */}
          <div className="bg-indigo-50/50 p-3.5 rounded-2xl border border-indigo-100 space-y-3">
            <div className="flex items-center justify-between">
              <div className="font-bold text-indigo-950 text-xs flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-indigo-600" />
                <span>2. Organization Handover & Initial HR Admin Login</span>
              </div>
              <span className="text-[10px] text-indigo-600 font-semibold">
                Will be provisioned automatically
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Handover Admin Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Sarah Jenkins"
                  value={formData.admin_name}
                  onChange={(e) => setFormData({ ...formData, admin_name: e.target.value })}
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Handover Admin Login Email <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  placeholder="sarah.jenkins@acmehealth.com"
                  value={formData.admin_email}
                  onChange={(e) => setFormData({ ...formData, admin_email: e.target.value })}
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                  required
                />
              </div>

              <div className="sm:col-span-2">
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-slate-700">
                    Initial Generated Password <span className="text-rose-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, admin_password: generateSecurePassword() })}
                    className="text-[11px] text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Generate New</span>
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.admin_password}
                    onChange={(e) => setFormData({ ...formData, admin_password: e.target.value })}
                    className="w-full p-2.5 pr-10 bg-white border border-slate-200 rounded-xl font-mono text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Enabled Modules */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1.5">
              Enabled Application Modules for this Client
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {[
                { key: 'attendance', label: 'Company Attendance' },
                { key: 'leaves', label: 'Leave Management' },
                { key: 'holidays', label: 'Holiday Calendar' },
                { key: 'announcements', label: 'Announcements' },
                { key: 'directory', label: 'Staff Directory' },
                { key: 'reports', label: 'Analytics & Reports' }
              ].map(mod => {
                const isChecked = formData.modules_enabled.includes(mod.key);
                return (
                  <label
                    key={mod.key}
                    onClick={() => handleToggleModule(mod.key)}
                    className={`p-2.5 rounded-xl border flex items-center gap-2 cursor-pointer transition-colors ${
                      isChecked ? 'border-indigo-400 bg-indigo-50/40 text-indigo-950 font-bold' : 'border-slate-200 bg-white text-slate-600'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => {}}
                      className="rounded border-slate-300 text-indigo-600 pointer-events-none"
                    />
                    <span className="text-xs">{mod.label}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Modal Actions */}
          <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(false)}
              className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl font-medium hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-sm transition-all cursor-pointer disabled:opacity-50"
            >
              {submitting ? 'Setting up Client...' : 'Setup Client & Handover'}
            </button>
          </div>
        </form>
      </Modal>

      {/* HANDOVER PACKAGE / CREDENTIALS MODAL */}
      <Modal
        isOpen={handoverModalOpen}
        onClose={() => setHandoverModalOpen(false)}
        title="Application Handover Credentials Package"
        maxWidth="max-w-lg"
      >
        {handoverDetails && (
          <div className="space-y-4 text-xs">
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start gap-3 text-emerald-900">
              <Sparkles className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <strong className="block font-bold">Ready for Client Handover</strong>
                <p className="text-[11px] text-emerald-800 mt-0.5">
                  Share the following credentials with the client stakeholder to allow them to access and manage their organization's portal.
                </p>
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3 font-mono">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <span className="text-slate-500 text-[10px] uppercase font-bold">Portal URL</span>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900">{handoverDetails.portal_url}</span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(handoverDetails.portal_url, 'url')}
                    className="text-indigo-600 hover:text-indigo-800"
                  >
                    {copiedKey === 'url' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <span className="text-slate-500 text-[10px] uppercase font-bold">Client Organization</span>
                <span className="font-bold text-slate-900">{handoverDetails.client_name}</span>
              </div>

              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <span className="text-slate-500 text-[10px] uppercase font-bold">Designated Admin</span>
                <span className="font-bold text-slate-900">{handoverDetails.admin_name}</span>
              </div>

              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <span className="text-slate-500 text-[10px] uppercase font-bold">Login Email</span>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900">{handoverDetails.login_email}</span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(handoverDetails.login_email, 'email')}
                    className="text-indigo-600 hover:text-indigo-800"
                  >
                    {copiedKey === 'email' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <span className="text-slate-500 text-[10px] uppercase font-bold">Temporary Password</span>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                    {handoverDetails.login_password}
                  </span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(handoverDetails.login_password, 'pwd')}
                    className="text-indigo-600 hover:text-indigo-800"
                  >
                    {copiedKey === 'pwd' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-500 text-[10px] uppercase font-bold">Assigned Role</span>
                <span className="font-bold text-slate-800">{handoverDetails.role}</span>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <button
                type="button"
                onClick={copyAllCredentials}
                className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold transition-all cursor-pointer text-xs"
              >
                {copiedKey === 'all' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                <span>{copiedKey === 'all' ? 'Copied Full Package!' : 'Copy Handover Package'}</span>
              </button>

              <button
                type="button"
                onClick={() => setHandoverModalOpen(false)}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-all shadow-sm cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* EDIT CLIENT DETAILS MODAL */}
      <Modal
        isOpen={Boolean(editingClient)}
        onClose={() => setEditingClient(null)}
        title={`Edit Client Organization — ${editingClient?.name}`}
        maxWidth="max-w-xl"
      >
        {editFormData && (
          <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Organization Name</label>
                <input
                  type="text"
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Status</label>
                <select
                  value={editFormData.status}
                  onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                >
                  <option value="active">Active</option>
                  <option value="pending">Pending Setup</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Official Email</label>
                <input
                  type="email"
                  value={editFormData.email}
                  onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Contact Person</label>
                <input
                  type="text"
                  value={editFormData.contact_person}
                  onChange={(e) => setEditFormData({ ...editFormData, contact_person: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Headcount Limit</label>
                <input
                  type="number"
                  value={editFormData.headcount_limit}
                  onChange={(e) => setEditFormData({ ...editFormData, headcount_limit: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Plan Tier</label>
                <input
                  type="text"
                  value={editFormData.plan}
                  onChange={(e) => setEditFormData({ ...editFormData, plan: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingClient(null)}
                className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl font-medium hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingEdit}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-sm transition-all cursor-pointer disabled:opacity-50"
              >
                {savingEdit ? 'Saving Changes...' : 'Update Client'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* CONFIRM DELETE CLIENT DIALOG */}
      <ConfirmDialog
        isOpen={Boolean(deleteTargetClient)}
        onClose={() => setDeleteTargetClient(null)}
        onConfirm={handleDeleteClient}
        title="Delete Client Organization"
        message={`Are you sure you want to permanently remove "${deleteTargetClient?.name}"?`}
        warningMessage="This will deactivate and remove the client tenant setup and application configuration."
        confirmText="Delete Client Organization"
        danger={true}
        loading={deleting}
      />
    </div>
  );
};

export default ClientSetupPage;
