import React, { useState, useEffect, useMemo } from 'react';
import {
  BookOpen,
  Plus,
  Search,
  Filter,
  FileText,
  Download,
  Eye,
  Edit2,
  Trash2,
  Upload,
  Clock,
  CheckCircle2,
  AlertCircle,
  History,
  Tag,
  Shield,
  ExternalLink,
  ChevronDown,
  X,
  FileCheck,
  Archive,
  Send,
  ZoomIn,
  ZoomOut,
  Maximize2,
  RefreshCw,
  MoreVertical,
  Layers,
  FolderPlus
} from 'lucide-react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import Modal from '../../components/common/Modal';
import Badge from '../../components/common/Badge';
import ConfirmDialog from '../../components/common/ConfirmDialog';

export const CompanyPoliciesPage = () => {
  const { user } = useAuth();
  const role = user?.role || 'employee';
  const isManagement = ['super_admin', 'hr_admin', 'admin'].includes(role);

  const [policies, setPolicies] = useState([]);
  const [categories, setCategories] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isReplaceDocModalOpen, setIsReplaceDocModalOpen] = useState(false);
  const [isViewerModalOpen, setIsViewerModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);

  // Active items
  const [selectedPolicy, setSelectedPolicy] = useState(null);
  const [policyHistory, setPolicyHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Confirm dialogs
  const [confirmPublishPolicy, setConfirmPublishPolicy] = useState(null);
  const [confirmUnpublishPolicy, setConfirmUnpublishPolicy] = useState(null);
  const [confirmArchivePolicy, setConfirmArchivePolicy] = useState(null);
  const [confirmDeletePolicy, setConfirmDeletePolicy] = useState(null);

  // Alert Banner
  const [banner, setBanner] = useState({ message: '', type: 'success' });

  // Add Policy Form
  const [formData, setFormData] = useState({
    policy_name: '',
    category_id: '',
    version: '1.0',
    effective_date: new Date().toISOString().split('T')[0],
    expiry_date: '',
    description: '',
    status: 'published'
  });
  const [uploadedFile, setUploadedFile] = useState(null);
  const [fileError, setFileError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Replace Doc Form
  const [replaceData, setReplaceData] = useState({
    version: '',
    effective_date: new Date().toISOString().split('T')[0]
  });
  const [replaceFile, setReplaceFile] = useState(null);
  const [replacing, setReplacing] = useState(false);

  // Category Management Form
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryDesc, setNewCategoryDesc] = useState('');
  const [savingCategory, setSavingCategory] = useState(false);

  // PDF Viewer Zoom
  const [viewerZoom, setViewerZoom] = useState(100);

  const showNotification = (message, type = 'success') => {
    setBanner({ message, type });
    setTimeout(() => setBanner({ message: '', type: 'success' }), 4500);
  };

  // Load Policies & Categories
  const loadData = async () => {
    setLoading(true);
    try {
      const [polRes, catRes] = await Promise.all([
        api.getPolicies({
          category_id: selectedCategory,
          status: statusFilter,
          search: searchQuery
        }),
        api.getPolicyCategories()
      ]);

      setPolicies(polRes.policies || []);
      setStats(polRes.stats || null);
      setCategories(catRes.categories || []);
    } catch (err) {
      console.error('Failed to load policies:', err);
      showNotification(err.message || 'Failed to fetch company policies', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedCategory, statusFilter]);

  // Handle Search Debounce / Direct Filter
  const filteredPolicies = useMemo(() => {
    if (!searchQuery.trim()) return policies;
    const q = searchQuery.toLowerCase();
    return policies.filter(p =>
      p.policy_name?.toLowerCase().includes(q) ||
      p.description?.toLowerCase().includes(q) ||
      p.category_name?.toLowerCase().includes(q) ||
      p.version?.toLowerCase().includes(q)
    );
  }, [policies, searchQuery]);

  // File picker handler
  const handleFileSelect = (e, isReplace = false) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Allowed extensions
    const allowed = ['.pdf', '.doc', '.docx', '.xls', '.xlsx'];
    const ext = '.' + file.name.split('.').pop().toLowerCase();
    if (!allowed.includes(ext)) {
      const msg = `Invalid file format (${ext}). Supported formats: PDF, DOC, DOCX, XLS, XLSX.`;
      if (isReplace) setFileError(msg);
      else setFileError(msg);
      return;
    }

    // Size limit: 25MB
    if (file.size > 25 * 1024 * 1024) {
      const msg = 'File size exceeds maximum 25MB limit.';
      if (isReplace) setFileError(msg);
      else setFileError(msg);
      return;
    }

    setFileError('');
    if (isReplace) {
      setReplaceFile(file);
    } else {
      setUploadedFile(file);
    }
  };

  // Open Add Modal
  const handleOpenAddModal = () => {
    setFormData({
      policy_name: '',
      category_id: categories[0]?.id || '',
      version: '1.0',
      effective_date: new Date().toISOString().split('T')[0],
      expiry_date: '',
      description: '',
      status: 'published'
    });
    setUploadedFile(null);
    setFileError('');
    setIsAddModalOpen(true);
  };

  // Submit Add Policy
  const handleAddSubmit = async (statusToSet) => {
    if (!formData.policy_name.trim()) {
      setFileError('Policy Name is required.');
      return;
    }
    if (!formData.category_id) {
      setFileError('Category selection is required.');
      return;
    }
    if (!formData.version.trim()) {
      setFileError('Version is required.');
      return;
    }
    if (!formData.effective_date) {
      setFileError('Effective Date is required.');
      return;
    }

    setSubmitting(true);
    setFileError('');

    try {
      const data = new FormData();
      data.append('policy_name', formData.policy_name.trim());
      data.append('category_id', formData.category_id);
      data.append('version', formData.version.trim());
      data.append('effective_date', formData.effective_date);
      if (formData.expiry_date) data.append('expiry_date', formData.expiry_date);
      if (formData.description) data.append('description', formData.description.trim());
      data.append('status', statusToSet || 'published');

      if (uploadedFile) {
        data.append('document', uploadedFile);
      }

      await api.createPolicy(data);
      setIsAddModalOpen(false);
      await loadData();
      showNotification(
        statusToSet === 'published'
          ? `Policy "${formData.policy_name}" created and published successfully!`
          : `Policy "${formData.policy_name}" saved as Draft.`
      );
    } catch (err) {
      setFileError(err.message || 'Failed to create policy');
    } finally {
      setSubmitting(false);
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (policy) => {
    setSelectedPolicy(policy);
    setFormData({
      policy_name: policy.policy_name,
      category_id: policy.category_id,
      version: policy.version,
      effective_date: policy.effective_date,
      expiry_date: policy.expiry_date || '',
      description: policy.description || ''
    });
    setFileError('');
    setIsEditModalOpen(true);
  };

  // Submit Edit Policy
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!formData.policy_name.trim()) {
      setFileError('Policy Name is required.');
      return;
    }

    setSubmitting(true);
    try {
      await api.updatePolicy(selectedPolicy.id, formData);
      setIsEditModalOpen(false);
      await loadData();
      showNotification(`Policy "${formData.policy_name}" updated successfully.`);
    } catch (err) {
      setFileError(err.message || 'Failed to update policy');
    } finally {
      setSubmitting(false);
    }
  };

  // Open Replace Document / New Version Modal
  const handleOpenReplaceDoc = (policy) => {
    setSelectedPolicy(policy);
    const currVer = parseFloat(policy.version) || 1.0;
    const nextVer = (currVer + 0.1).toFixed(1);
    setReplaceData({
      version: nextVer,
      effective_date: new Date().toISOString().split('T')[0]
    });
    setReplaceFile(null);
    setFileError('');
    setIsReplaceDocModalOpen(true);
  };

  // Submit Replace Document
  const handleReplaceSubmit = async (e) => {
    e.preventDefault();
    if (!replaceFile) {
      setFileError('Please select a new replacement file.');
      return;
    }

    setReplacing(true);
    try {
      const data = new FormData();
      data.append('document', replaceFile);
      data.append('version', replaceData.version.trim());
      data.append('effective_date', replaceData.effective_date);

      await api.replacePolicyDocument(selectedPolicy.id, data);
      setIsReplaceDocModalOpen(false);
      await loadData();
      showNotification(`Document replaced and Version ${replaceData.version} published! Previous version archived in history.`);
    } catch (err) {
      setFileError(err.message || 'Failed to replace document');
    } finally {
      setReplacing(false);
    }
  };

  // Handle Publish
  const handlePublish = async (policy) => {
    try {
      await api.publishPolicy(policy.id);
      setConfirmPublishPolicy(null);
      await loadData();
      showNotification(`Policy "${policy.policy_name}" is now published and visible to all employees!`);
    } catch (err) {
      alert(err.message || 'Failed to publish policy');
    }
  };

  // Handle Unpublish
  const handleUnpublish = async (policy) => {
    try {
      await api.unpublishPolicy(policy.id);
      setConfirmUnpublishPolicy(null);
      await loadData();
      showNotification(`Policy "${policy.policy_name}" unpublished.`);
    } catch (err) {
      alert(err.message || 'Failed to unpublish policy');
    }
  };

  // Handle Archive
  const handleArchive = async (policy) => {
    try {
      await api.archivePolicy(policy.id);
      setConfirmArchivePolicy(null);
      await loadData();
      showNotification(`Policy "${policy.policy_name}" moved to archives.`);
    } catch (err) {
      alert(err.message || 'Failed to archive policy');
    }
  };

  // Handle Delete (Soft Delete)
  const handleDelete = async (policy) => {
    try {
      await api.deletePolicy(policy.id);
      setConfirmDeletePolicy(null);
      await loadData();
      showNotification(`Policy "${policy.policy_name}" removed from active library.`);
    } catch (err) {
      alert(err.message || 'Failed to delete policy');
    }
  };

  // Open Viewer Modal
  const handleOpenViewer = (policy) => {
    setSelectedPolicy(policy);
    setViewerZoom(100);
    setIsViewerModalOpen(true);
  };

  // Open Version History Modal
  const handleOpenHistory = async (policy) => {
    setSelectedPolicy(policy);
    setIsHistoryModalOpen(true);
    setLoadingHistory(true);
    try {
      const res = await api.getPolicyHistory(policy.id);
      setPolicyHistory(res.versions || []);
    } catch (err) {
      console.error('Failed to load version history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Add Category
  const handleAddCategory = async (e) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    setSavingCategory(true);
    try {
      await api.createPolicyCategory({
        name: newCategoryName.trim(),
        description: newCategoryDesc.trim()
      });
      setNewCategoryName('');
      setNewCategoryDesc('');
      const catRes = await api.getPolicyCategories();
      setCategories(catRes.categories || []);
      showNotification('New policy category added successfully!');
    } catch (err) {
      alert(err.message || 'Failed to create category');
    } finally {
      setSavingCategory(false);
    }
  };

  // Helper: Status badge renderer with distinct colors
  const renderStatusBadge = (status) => {
    switch (status) {
      case 'published':
        return <Badge variant="published">Published</Badge>;
      case 'draft':
        return <Badge variant="draft">Draft</Badge>;
      case 'unpublished':
        return <Badge variant="unpublished">Unpublished</Badge>;
      case 'archived':
        return <Badge variant="archived">Archived</Badge>;
      case 'expired':
        return <Badge variant="expired">Expired</Badge>;
      default:
        return <Badge variant={status}>{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Notification */}
      {banner.message && (
        <div
          className={`p-3.5 rounded-2xl border text-xs font-medium flex items-center gap-2 animate-fade-in ${
            banner.type === 'error'
              ? 'bg-rose-50 border-rose-200 text-rose-800'
              : 'bg-emerald-50 border-emerald-200 text-emerald-800'
          }`}
        >
          {banner.type === 'error' ? (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          )}
          <span>{banner.message}</span>
        </div>
      )}

      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Company Policies</h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Official organization-wide policy library, regulatory standards, and compliance documents
              </p>
            </div>
          </div>
        </div>

        {/* Management Controls */}
        {isManagement && (
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              type="button"
              onClick={handleOpenAddModal}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Policy</span>
            </button>
          </div>
        )}
      </div>

      {/* Metric Cards */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Active Policies
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-900">{stats.published_count}</span>
              <span className="text-xs text-slate-400">published live</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Policy Categories
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-indigo-600">{stats.total_categories}</span>
              <span className="text-xs text-slate-400">domains</span>
            </div>
          </div>

          {isManagement && (
            <>
              <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Drafts in Review
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-amber-600">{stats.draft_count}</span>
                  <span className="text-xs text-slate-400">pending release</span>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Archived Records
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-slate-500">{stats.archived_count}</span>
                  <span className="text-xs text-slate-400">historical</span>
                </div>
              </div>
            </>
          )}

          {!isManagement && (
            <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs col-span-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Compliance Note
              </span>
              <p className="text-xs text-slate-600 leading-snug">
                All listed policies are mandatory organizational standards. Please review new versions promptly.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="bg-white rounded-2xl p-3.5 border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search policies by name, description, version..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Category & Status dropdowns */}
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-slate-500">Category:</span>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="text-xs px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="all">All Categories</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {isManagement && (
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-slate-500">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="text-xs px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              >
                <option value="all">All Statuses</option>
                <option value="published">Published</option>
                <option value="draft">Draft</option>
                <option value="unpublished">Unpublished</option>
                <option value="archived">Archived</option>
                <option value="expired">Expired</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Policies Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-20 text-center">
            <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
            <p className="text-xs text-slate-400 font-medium">Loading company policies...</p>
          </div>
        ) : filteredPolicies.length === 0 ? (
          <div className="py-16 text-center px-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-500 flex items-center justify-center mx-auto mb-3">
              <FileText className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">
              {isManagement
                ? 'No company policies have been added yet.'
                : 'No company policies are currently available.'}
            </h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              {isManagement
                ? 'Click "Add Policy" to upload policy guidelines, handbook rules, and compliance documents.'
                : 'Official organization policies will appear here once published by HR.'}
            </p>
            {isManagement && (
              <button
                type="button"
                onClick={handleOpenAddModal}
                className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold shadow-xs hover:bg-indigo-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Add Policy</span>
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/75 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Policy Document</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-3 text-center">Version</th>
                  <th className="py-3 px-4">Effective Date</th>
                  {isManagement && <th className="py-3 px-4">Status</th>}
                  {isManagement && <th className="py-3 px-4">Last Updated</th>}
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {filteredPolicies.map((policy) => (
                  <tr key={policy.id} className="hover:bg-slate-50/60 transition-colors group">
                    {/* Policy Title & Description */}
                    <td className="py-3.5 px-4 max-w-md">
                      <div className="flex items-start gap-2.5">
                        <div className="p-2 bg-slate-100 group-hover:bg-indigo-50 text-slate-500 group-hover:text-indigo-600 rounded-xl transition-colors shrink-0 mt-0.5">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors flex items-center gap-2">
                            <span>{policy.policy_name}</span>
                          </div>
                          {policy.description && (
                            <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                              {policy.description}
                            </p>
                          )}
                          <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-2 font-mono">
                            <span>{policy.document_name || policy.file_name}</span>
                            {policy.document_size && (
                              <>
                                <span>•</span>
                                <span>{policy.document_size}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Category */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-[11px] font-medium">
                        <Tag className="w-3 h-3 text-slate-400" />
                        <span>{policy.category_name || 'General'}</span>
                      </span>
                    </td>

                    {/* Version */}
                    <td className="py-3.5 px-3 text-center whitespace-nowrap">
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200/60">
                        v{policy.version}
                      </span>
                    </td>

                    {/* Effective Date */}
                    <td className="py-3.5 px-4 whitespace-nowrap text-slate-600">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>{policy.effective_date}</span>
                      </div>
                      {policy.expiry_date && (
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                          Expires: {policy.expiry_date}
                        </span>
                      )}
                    </td>

                    {/* Status (Admin Only) */}
                    {isManagement && (
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {renderStatusBadge(policy.status)}
                      </td>
                    )}

                    {/* Last Updated (Admin Only) */}
                    {isManagement && (
                      <td className="py-3.5 px-4 whitespace-nowrap text-slate-500 text-[11px]">
                        <div>{new Date(policy.updated_at || policy.createdAt).toLocaleDateString()}</div>
                        <span className="text-slate-400 text-[10px]">by {policy.last_updated_by || policy.created_by}</span>
                      </td>
                    )}

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* View Button */}
                        <button
                          type="button"
                          onClick={() => handleOpenViewer(policy)}
                          title="View Document in Portal"
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View</span>
                        </button>

                        {/* Download Button */}
                        <a
                          href={api.getPolicyDownloadUrl(policy.id)}
                          download={policy.document_name || 'policy.pdf'}
                          title="Download Policy File"
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Download</span>
                        </a>

                        {/* Management Controls Menu */}
                        {isManagement && (
                          <div className="flex items-center gap-1 pl-1 border-l border-slate-200">
                            {/* Edit */}
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(policy)}
                              title="Edit Details"
                              className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            {/* Replace / New Version */}
                            <button
                              type="button"
                              onClick={() => handleOpenReplaceDoc(policy)}
                              title="Replace Document / Upload New Version"
                              className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                            >
                              <Upload className="w-3.5 h-3.5" />
                            </button>

                            {/* Version History */}
                            <button
                              type="button"
                              onClick={() => handleOpenHistory(policy)}
                              title="Policy Version History"
                              className="p-1.5 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors cursor-pointer"
                            >
                              <History className="w-3.5 h-3.5" />
                            </button>

                            {/* Publish / Unpublish Toggle */}
                            {policy.status === 'published' ? (
                              <button
                                type="button"
                                onClick={() => setConfirmUnpublishPolicy(policy)}
                                title="Unpublish Policy"
                                className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                              >
                                <Archive className="w-3.5 h-3.5" />
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setConfirmPublishPolicy(policy)}
                                title="Publish Policy"
                                className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                              >
                                <Send className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {/* Delete */}
                            <button
                              type="button"
                              onClick={() => setConfirmDeletePolicy(policy)}
                              title="Delete Policy"
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* ADD POLICY MODAL */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add & Publish Company Policy"
        maxWidth="max-w-xl"
      >
        <div className="space-y-4 text-xs">
          {fileError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{fileError}</span>
            </div>
          )}

          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Policy Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Remote Work Policy, Anti-Harassment Guidelines"
              value={formData.policy_name}
              onChange={(e) => setFormData({ ...formData, policy_name: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Category <span className="text-rose-500">*</span>
              </label>
              <select
                value={formData.category_id}
                onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs cursor-pointer"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Version <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                placeholder="1.0"
                value={formData.version}
                onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Effective Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={formData.effective_date}
                onChange={(e) => setFormData({ ...formData, effective_date: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Expiry Date <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <input
                type="date"
                value={formData.expiry_date}
                onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Description & Scope</label>
            <textarea
              rows={2}
              placeholder="Provide a concise summary of the policy purpose, applicability, and rules..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs resize-none"
            />
          </div>

          {/* File Upload Box */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Policy Document <span className="text-rose-500">*</span>
            </label>
            <div className="border-2 border-dashed border-slate-200 hover:border-indigo-400 bg-slate-50/60 rounded-2xl p-4 text-center transition-colors">
              <input
                type="file"
                id="policy-file-input"
                accept=".pdf,.doc,.docx,.xls,.xlsx"
                onChange={(e) => handleFileSelect(e, false)}
                className="hidden"
              />
              <label htmlFor="policy-file-input" className="cursor-pointer block">
                <Upload className="w-7 h-7 text-indigo-500 mx-auto mb-1.5" />
                <span className="font-bold text-indigo-600 hover:text-indigo-700 block text-xs">
                  Choose Policy File
                </span>
                <span className="text-[11px] text-slate-400 block mt-0.5">
                  Supported formats: PDF, DOC, DOCX, XLS, XLSX (Max: 25MB)
                </span>
              </label>

              {uploadedFile && (
                <div className="mt-3 p-2 bg-white rounded-xl border border-indigo-100 flex items-center justify-between text-left">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <FileText className="w-4 h-4 text-indigo-600 shrink-0" />
                    <span className="truncate font-semibold text-slate-800">{uploadedFile.name}</span>
                    <span className="text-[10px] text-slate-400 shrink-0">
                      ({(uploadedFile.size / 1024).toFixed(1)} KB)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setUploadedFile(null)}
                    className="p-1 text-slate-400 hover:text-rose-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="px-3.5 py-2 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={() => handleAddSubmit('draft')}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            >
              Save as Draft
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={() => handleAddSubmit('published')}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
            >
              {submitting ? 'Publishing...' : 'Save & Publish'}
            </button>
          </div>
        </div>
      </Modal>

      {/* ========================================================================= */}
      {/* EDIT POLICY METADATA MODAL */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Policy Details"
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleEditSubmit} className="space-y-4 text-xs">
          {fileError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-medium">
              {fileError}
            </div>
          )}

          <div>
            <label className="block font-bold text-slate-700 mb-1">Policy Name</label>
            <input
              type="text"
              value={formData.policy_name}
              onChange={(e) => setFormData({ ...formData, policy_name: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Category</label>
              <select
                value={formData.category_id}
                onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Version</label>
              <input
                type="text"
                value={formData.version}
                onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Effective Date</label>
              <input
                type="date"
                value={formData.effective_date}
                onChange={(e) => setFormData({ ...formData, effective_date: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs"
                required
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Expiry Date</label>
              <input
                type="date"
                value={formData.expiry_date}
                onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Description</label>
            <textarea
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs resize-none"
            />
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setIsEditModalOpen(false)}
              className="px-3.5 py-2 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
            >
              {submitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* REPLACE DOCUMENT / NEW VERSION MODAL */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isReplaceDocModalOpen}
        onClose={() => setIsReplaceDocModalOpen(false)}
        title="Replace Policy Document & Release New Version"
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleReplaceSubmit} className="space-y-4 text-xs">
          {fileError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-medium">
              {fileError}
            </div>
          )}

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Current Document:</span>
            <div className="font-bold text-slate-800 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
              <span>{selectedPolicy?.document_name || selectedPolicy?.file_name}</span>
            </div>
            <span className="text-[11px] text-slate-500 font-mono block">
              Current Version: {selectedPolicy?.version} • Effective: {selectedPolicy?.effective_date}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                New Version Number <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={replaceData.version}
                onChange={(e) => setReplaceData({ ...replaceData, version: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs"
                placeholder="2.0"
                required
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Effective Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={replaceData.effective_date}
                onChange={(e) => setReplaceData({ ...replaceData, effective_date: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs"
                required
              />
            </div>
          </div>

          {/* Replacement File picker */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Select Replacement File <span className="text-rose-500">*</span>
            </label>
            <div className="border-2 border-dashed border-slate-200 hover:border-indigo-400 bg-slate-50/60 rounded-2xl p-4 text-center transition-colors">
              <input
                type="file"
                id="replace-file-input"
                accept=".pdf,.doc,.docx,.xls,.xlsx"
                onChange={(e) => handleFileSelect(e, true)}
                className="hidden"
              />
              <label htmlFor="replace-file-input" className="cursor-pointer block">
                <Upload className="w-6 h-6 text-indigo-500 mx-auto mb-1" />
                <span className="font-bold text-indigo-600 text-xs block">Choose Replacement Document</span>
                <span className="text-[10px] text-slate-400 block mt-0.5">PDF, DOC, DOCX, XLS, XLSX (Max 25MB)</span>
              </label>

              {replaceFile && (
                <div className="mt-2.5 p-2 bg-white rounded-xl border border-indigo-100 flex items-center justify-between text-left">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <FileText className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="truncate font-semibold text-slate-800">{replaceFile.name}</span>
                    <span className="text-[10px] text-slate-400 shrink-0">
                      ({(replaceFile.size / 1024).toFixed(1)} KB)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setReplaceFile(null)}
                    className="p-1 text-slate-400 hover:text-rose-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-800 text-[11px] flex items-start gap-2">
            <History className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span>
              <strong>Version Preservation:</strong> The existing document will be archived in the Policy Version
              History. The new document will become the active version visible to employees.
            </span>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setIsReplaceDocModalOpen(false)}
              className="px-3.5 py-2 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={replacing}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
            >
              {replacing ? 'Archiving & Uploading...' : 'Release New Version'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* IN-PORTAL PDF & DOCUMENT VIEWER MODAL */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isViewerModalOpen}
        onClose={() => setIsViewerModalOpen(false)}
        title={selectedPolicy ? `${selectedPolicy.policy_name} (v${selectedPolicy.version})` : 'Policy Document Viewer'}
        maxWidth="max-w-4xl"
      >
        <div className="space-y-3">
          {/* Viewer Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-2 bg-slate-100 rounded-xl text-xs">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-700">{selectedPolicy?.category_name}</span>
              <span className="text-slate-300">•</span>
              <span className="font-mono text-slate-500">Effective: {selectedPolicy?.effective_date}</span>
            </div>

            <div className="flex items-center gap-1.5">
              {/* Zoom Controls */}
              <button
                type="button"
                onClick={() => setViewerZoom((z) => Math.max(z - 15, 60))}
                title="Zoom Out"
                className="p-1.5 bg-white hover:bg-slate-200 rounded-lg text-slate-700 shadow-xs cursor-pointer"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="text-xs font-mono font-bold text-slate-600 px-1">{viewerZoom}%</span>
              <button
                type="button"
                onClick={() => setViewerZoom((z) => Math.min(z + 15, 180))}
                title="Zoom In"
                className="p-1.5 bg-white hover:bg-slate-200 rounded-lg text-slate-700 shadow-xs cursor-pointer"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>

              <span className="text-slate-300 mx-1">|</span>

              {/* Download */}
              {selectedPolicy && (
                <a
                  href={api.getPolicyDownloadUrl(selectedPolicy.id)}
                  download={selectedPolicy.document_name || 'policy.pdf'}
                  className="flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold shadow-xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </a>
              )}

              {/* Open in external tab */}
              {selectedPolicy && (
                <a
                  href={api.getPolicyViewUrl(selectedPolicy.id)}
                  target="_blank"
                  rel="noreferrer"
                  title="Open in new window"
                  className="p-1.5 bg-white hover:bg-slate-200 rounded-lg text-slate-700 shadow-xs"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          </div>

          {/* Embedded Viewer Container */}
          <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-800 min-h-[420px] max-h-[460px] flex items-center justify-center relative">
            {selectedPolicy ? (
              <div
                style={{
                  transform: `scale(${viewerZoom / 100})`,
                  transformOrigin: 'top center',
                  width: `${100 * (100 / viewerZoom)}%`,
                  height: '450px',
                  transition: 'transform 0.15s ease'
                }}
              >
                <iframe
                  src={api.getPolicyViewUrl(selectedPolicy.id)}
                  title={selectedPolicy.policy_name}
                  className="w-full h-full border-none"
                />
              </div>
            ) : (
              <p className="text-xs text-slate-400">No document selected</p>
            )}
          </div>

          {/* Footer details */}
          {selectedPolicy?.description && (
            <div className="p-3 bg-slate-50 rounded-xl text-xs text-slate-600 border border-slate-100">
              <span className="font-bold text-slate-800 block mb-0.5">Summary / Scope:</span>
              <p>{selectedPolicy.description}</p>
            </div>
          )}
        </div>
      </Modal>

      {/* ========================================================================= */}
      {/* VERSION HISTORY MODAL */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        title={`Version History — ${selectedPolicy?.policy_name || ''}`}
        maxWidth="max-w-2xl"
      >
        <div className="space-y-3 text-xs">
          <p className="text-slate-500">
            Historical records of all published revisions and previous versions of this policy.
          </p>

          {loadingHistory ? (
            <div className="py-12 text-center">
              <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
              <p className="text-xs text-slate-400">Loading version audit log...</p>
            </div>
          ) : policyHistory.length === 0 ? (
            <div className="py-8 text-center text-slate-400 bg-slate-50 rounded-xl">
              No previous revisions logged for this policy.
            </div>
          ) : (
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50 text-[11px] font-bold text-slate-500 uppercase">
                    <th className="py-2.5 px-3">Version</th>
                    <th className="py-2.5 px-3">Effective Date</th>
                    <th className="py-2.5 px-3">Uploaded By</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-right">Document</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {policyHistory.map((ver) => (
                    <tr key={ver.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 font-mono font-bold text-indigo-700">v{ver.version}</td>
                      <td className="py-2.5 px-3 text-slate-600">{ver.effective_date}</td>
                      <td className="py-2.5 px-3 text-slate-600">{ver.uploaded_by}</td>
                      <td className="py-2.5 px-3">{renderStatusBadge(ver.status)}</td>
                      <td className="py-2.5 px-3 text-right">
                        <a
                          href={`/api/policies/versions/${ver.id}/download`}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                        >
                          <Download className="w-3 h-3" />
                          <span>Download</span>
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="pt-2 text-right">
            <button
              type="button"
              onClick={() => setIsHistoryModalOpen(false)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
            >
              Close
            </button>
          </div>
        </div>
      </Modal>

      {/* ========================================================================= */}
      {/* MANAGE CATEGORIES MODAL */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        title="Manage Policy Categories"
        maxWidth="max-w-lg"
      >
        <div className="space-y-4 text-xs">
          {/* Add Category Form */}
          <form onSubmit={handleAddCategory} className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
            <span className="font-bold text-slate-800 block">Add New Policy Category</span>
            <div>
              <input
                type="text"
                placeholder="Category Name (e.g. Health & Wellness, Travel)"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs"
                required
              />
            </div>
            <div>
              <input
                type="text"
                placeholder="Short description of this category's scope..."
                value={newCategoryDesc}
                onChange={(e) => setNewCategoryDesc(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs"
              />
            </div>
            <button
              type="submit"
              disabled={savingCategory}
              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            >
              {savingCategory ? 'Adding...' : '+ Add Category'}
            </button>
          </form>

          {/* Categories List */}
          <div className="border border-slate-200 rounded-xl overflow-hidden max-h-64 overflow-y-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-[11px] font-bold text-slate-500 uppercase">
                  <th className="py-2 px-3">Category</th>
                  <th className="py-2 px-3">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {categories.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="py-2 px-3 font-semibold text-slate-800 whitespace-nowrap">{c.name}</td>
                    <td className="py-2 px-3 text-slate-500 text-[11px]">{c.description || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="pt-2 text-right">
            <button
              type="button"
              onClick={() => setIsCategoryModalOpen(false)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
            >
              Close
            </button>
          </div>
        </div>
      </Modal>

      {/* ========================================================================= */}
      {/* CONFIRMATION DIALOGS */}
      {/* ========================================================================= */}
      {/* Publish Confirmation */}
      {confirmPublishPolicy && (
        <ConfirmDialog
          isOpen={Boolean(confirmPublishPolicy)}
          title="Publish Company Policy?"
          message={`Are you sure you want to publish "${confirmPublishPolicy.policy_name}" (v${confirmPublishPolicy.version})? This policy will become immediately visible to all employees and managers in this company.`}
          confirmLabel="Publish Policy"
          confirmVariant="primary"
          onConfirm={() => handlePublish(confirmPublishPolicy)}
          onCancel={() => setConfirmPublishPolicy(null)}
        />
      )}

      {/* Unpublish Confirmation */}
      {confirmUnpublishPolicy && (
        <ConfirmDialog
          isOpen={Boolean(confirmUnpublishPolicy)}
          title="Unpublish Company Policy?"
          message={`Unpublishing "${confirmUnpublishPolicy.policy_name}" will hide it from employees and managers. It will remain accessible only to HR and Super Admins.`}
          confirmLabel="Unpublish"
          confirmVariant="danger"
          onConfirm={() => handleUnpublish(confirmUnpublishPolicy)}
          onCancel={() => setConfirmUnpublishPolicy(null)}
        />
      )}

      {/* Archive Confirmation */}
      {confirmArchivePolicy && (
        <ConfirmDialog
          isOpen={Boolean(confirmArchivePolicy)}
          title="Archive Company Policy?"
          message={`Move "${confirmArchivePolicy.policy_name}" to the historical archives? It will no longer be listed under active policies.`}
          confirmLabel="Archive Policy"
          confirmVariant="neutral"
          onConfirm={() => handleArchive(confirmArchivePolicy)}
          onCancel={() => setConfirmArchivePolicy(null)}
        />
      )}

      {/* Delete Confirmation */}
      {confirmDeletePolicy && (
        <ConfirmDialog
          isOpen={Boolean(confirmDeletePolicy)}
          title="Delete Company Policy?"
          message={`This action will remove "${confirmDeletePolicy.policy_name}" from the active policy library. Historical version records are retained for regulatory audit purposes.`}
          confirmLabel="Delete Policy"
          confirmVariant="danger"
          onConfirm={() => handleDelete(confirmDeletePolicy)}
          onCancel={() => setConfirmDeletePolicy(null)}
        />
      )}
    </div>
  );
};

export default CompanyPoliciesPage;
