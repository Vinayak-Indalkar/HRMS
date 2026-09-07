import { formatDate } from '../../utils/formatters';
import React, { useState, useEffect, useRef } from 'react';
import {
  User,
  Shield,
  MapPin,
  Phone,
  Mail,
  Calendar,
  Lock,
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  Upload,
  Camera,
  Trash2,
  Plus,
  ChevronRight,
  Eye,
  EyeOff,
  Building2,
  Users,
  Briefcase,
  Layers,
  Sparkles,
  ExternalLink,
  Download,
  AlertTriangle,
  X,
  Edit2,
  LayoutDashboard,
  IdCard,
  Target
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import Badge from '../../components/common/Badge';
import Modal from '../../components/common/Modal';
import ConfirmDialog from '../../components/common/ConfirmDialog';

export const MyProfilePage = () => {
  const { user: authUser, updateUser } = useAuth();
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('overview');

  // Success banners per section
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  // Photo upload state
  const [photoModalOpen, setPhotoModalOpen] = useState(false);
  const [photoLoading, setPhotoLoading] = useState(false);
  const fileInputRef = useRef(null);

  // Modals for Emergency Contact
  const [emgModalOpen, setEmgModalOpen] = useState(false);
  const [editingEmgContact, setEditingEmgContact] = useState(null);
  const [emgForm, setEmgForm] = useState({
    name: '',
    relationship: 'Spouse',
    primary_phone: '',
    alternate_phone: '',
    address: '',
    is_primary: false
  });
  const [emgLoading, setEmgLoading] = useState(false);

  // Delete Emergency Contact Confirmation
  const [deleteEmgId, setDeleteEmgId] = useState(null);

  // Document Upload Modal
  const [docModalOpen, setDocModalOpen] = useState(false);
  const [docForm, setDocForm] = useState({
    category: 'Resume / CV',
    document_name: '',
    file_size: '1.2 MB',
    file_data: null
  });
  const [docLoading, setDocLoading] = useState(false);
  const [deleteDocId, setDeleteDocId] = useState(null);

  // Admin Document Verify Modal
  const [verifyDocModal, setVerifyDocModal] = useState(null);
  const [verifyStatus, setVerifyStatus] = useState('Verified');
  const [rejectionReason, setRejectionReason] = useState('');
  const [verifyLoading, setVerifyLoading] = useState(false);

  // Forms Edit States
  const [isEditingBasic, setIsEditingBasic] = useState(false);
  const [basicForm, setBasicForm] = useState({});
  const [savingBasic, setSavingBasic] = useState(false);

  const [isEditingDemo, setIsEditingDemo] = useState(false);
  const [demoForm, setDemoForm] = useState({});
  const [savingDemo, setSavingDemo] = useState(false);

  const [isEditingContact, setIsEditingContact] = useState(false);
  const [contactForm, setContactForm] = useState({});
  const [savingContact, setSavingContact] = useState(false);

  // Security / Password Form
  const [passForm, setPassForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  });
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [savingPass, setSavingPass] = useState(false);
  const [passError, setPassError] = useState('');

  // KPI Performance state
  const [kpis, setKpis] = useState([]);
  const [loadingKpis, setLoadingKpis] = useState(false);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const data = await api.getProfile();
      setProfileData(data);

      try {
        const kpiRes = await api.getKpiAssignments({ employee_id: data.user?.id });
        setKpis(kpiRes.data || []);
      } catch (kErr) {
        console.error('Failed to load KPIs in profile:', kErr);
      }

      const u = data.user;
      setBasicForm({
        first_name: u.first_name || '',
        middle_name: u.middle_name || '',
        last_name: u.last_name || '',
        preferred_name: u.preferred_name || u.first_name || '',
        personal_email: u.personal_email || '',
        personal_mobile: u.personal_mobile || u.phone || '',
        dob: u.dob || '',
        gender: u.gender || 'Male'
      });

      setDemoForm({
        gender: u.gender || '',
        marital_status: u.marital_status || 'Single',
        nationality: u.nationality || 'American',
        country_of_residence: u.country_of_residence || 'United States'
      });

      setContactForm({
        personal_email: u.personal_email || '',
        personal_mobile: u.personal_mobile || u.phone || '',
        alt_phone: u.alt_phone || '',
        current_address: u.current_address || {
          line1: '',
          line2: '',
          city: '',
          state: '',
          country: 'United States',
          postal_code: ''
        },
        permanent_address: u.permanent_address || {
          line1: '',
          line2: '',
          city: '',
          state: '',
          country: 'United States',
          postal_code: ''
        },
        is_permanent_same: u.is_permanent_same !== undefined ? u.is_permanent_same : true
      });
    } catch (err) {
      setError(err.message || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const triggerFeedback = (type, message) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback({ type: '', message: '' }), 5000);
  };

  // --- 1. Basic Info Submit ---
  const handleBasicSubmit = async (e) => {
    e.preventDefault();
    setSavingBasic(true);
    try {
      const res = await api.updateProfileBasic(basicForm);
      updateUser(res.user);
      triggerFeedback('success', res.message || 'Your basic information has been updated successfully.');
      setIsEditingBasic(false);
      await fetchProfile();
    } catch (err) {
      triggerFeedback('error', err.message || 'Failed to update basic information.');
    } finally {
      setSavingBasic(false);
    }
  };

  // --- 2. Demographic Info Submit ---
  const handleDemoSubmit = async (e) => {
    e.preventDefault();
    setSavingDemo(true);
    try {
      const res = await api.updateProfileDemographics(demoForm);
      updateUser(res.user);
      triggerFeedback('success', res.message || 'Your demographic information has been updated successfully.');
      setIsEditingDemo(false);
      await fetchProfile();
    } catch (err) {
      triggerFeedback('error', err.message || 'Failed to update demographic information.');
    } finally {
      setSavingDemo(false);
    }
  };

  // --- 3. Contact & Address Submit ---
  const handleContactSubmit = async (e) => {
    e.preventDefault();
    setSavingContact(true);
    try {
      const payload = {
        ...contactForm,
        permanent_address: contactForm.is_permanent_same
          ? { ...contactForm.current_address }
          : contactForm.permanent_address
      };
      const res = await api.updateProfileContactAddress(payload);
      updateUser(res.user);
      triggerFeedback('success', res.message || 'Your contact and address details have been updated successfully.');
      setIsEditingContact(false);
      await fetchProfile();
    } catch (err) {
      triggerFeedback('error', err.message || 'Failed to update contact and address details.');
    } finally {
      setSavingContact(false);
    }
  };

  // --- 4. Emergency Contacts CRUD ---
  const openAddEmgModal = () => {
    setEditingEmgContact(null);
    setEmgForm({
      name: '',
      relationship: 'Spouse',
      primary_phone: '',
      alternate_phone: '',
      address: '',
      is_primary: profileData?.emergencyContacts?.length === 0
    });
    setEmgModalOpen(true);
  };

  const openEditEmgModal = (c) => {
    setEditingEmgContact(c);
    setEmgForm({
      name: c.name,
      relationship: c.relationship || 'Spouse',
      primary_phone: c.primary_phone,
      alternate_phone: c.alternate_phone || '',
      address: c.address || '',
      is_primary: Boolean(c.is_primary)
    });
    setEmgModalOpen(true);
  };

  const handleSaveEmgContact = async (e) => {
    e.preventDefault();
    setEmgLoading(true);
    try {
      if (editingEmgContact) {
        await api.updateEmergencyContact(editingEmgContact.id, emgForm);
        triggerFeedback('success', 'Emergency contact updated successfully.');
      } else {
        await api.addEmergencyContact(emgForm);
        triggerFeedback('success', 'Emergency contact added successfully.');
      }
      setEmgModalOpen(false);
      await fetchProfile();
    } catch (err) {
      triggerFeedback('error', err.message || 'Failed to save emergency contact');
    } finally {
      setEmgLoading(false);
    }
  };

  const handleDeleteEmgContact = async () => {
    if (!deleteEmgId) return;
    try {
      await api.deleteEmergencyContact(deleteEmgId);
      triggerFeedback('success', 'Emergency contact removed successfully.');
      setDeleteEmgId(null);
      await fetchProfile();
    } catch (err) {
      triggerFeedback('error', err.message || 'Failed to remove emergency contact');
    }
  };

  // --- 5. Photo Upload / Remove ---
  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      triggerFeedback('error', 'Please upload a valid image file (JPEG, PNG, or WebP).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      triggerFeedback('error', 'Image size must be less than 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      setPhotoLoading(true);
      try {
        const res = await api.uploadProfilePhoto(reader.result);
        updateUser(res.user);
        triggerFeedback('success', 'Profile photo updated successfully!');
        setPhotoModalOpen(false);
        await fetchProfile();
      } catch (err) {
        triggerFeedback('error', err.message || 'Failed to upload photo');
      } finally {
        setPhotoLoading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = async () => {
    setPhotoLoading(true);
    try {
      const res = await api.removeProfilePhoto();
      updateUser(res.user);
      triggerFeedback('success', 'Profile photo reset to default avatar.');
      setPhotoModalOpen(false);
      await fetchProfile();
    } catch (err) {
      triggerFeedback('error', err.message || 'Failed to reset photo');
    } finally {
      setPhotoLoading(false);
    }
  };

  // --- 6. Documents Upload / Delete ---
  const handleUploadDocument = async (e) => {
    e.preventDefault();
    if (!docForm.document_name) {
      triggerFeedback('error', 'Document name is required');
      return;
    }

    setDocLoading(true);
    try {
      await api.uploadDocument(docForm);
      triggerFeedback('success', 'Document uploaded successfully and submitted for HR review.');
      setDocModalOpen(false);
      setDocForm({ category: 'Resume / CV', document_name: '', file_size: '1.2 MB', file_data: null });
      await fetchProfile();
    } catch (err) {
      triggerFeedback('error', err.message || 'Failed to upload document');
    } finally {
      setDocLoading(false);
    }
  };

  const handleDeleteDocument = async () => {
    if (!deleteDocId) return;
    try {
      await api.deleteDocument(deleteDocId);
      triggerFeedback('success', 'Document deleted successfully.');
      setDeleteDocId(null);
      await fetchProfile();
    } catch (err) {
      triggerFeedback('error', err.message || 'Failed to delete document');
    }
  };

  // --- 7. Admin Verify / Reject Document ---
  const handleAdminVerifyDocument = async (e) => {
    e.preventDefault();
    if (!verifyDocModal) return;

    setVerifyLoading(true);
    try {
      await api.verifyDocument(verifyDocModal.id, {
        status: verifyStatus,
        rejection_reason: verifyStatus === 'Rejected' ? rejectionReason : null
      });
      triggerFeedback('success', `Document has been marked as ${verifyStatus}.`);
      setVerifyDocModal(null);
      setRejectionReason('');
      await fetchProfile();
    } catch (err) {
      triggerFeedback('error', err.message || 'Failed to update document status');
    } finally {
      setVerifyLoading(false);
    }
  };

  // --- 8. Password Change ---
  const calculatePassStrength = (pass) => {
    if (!pass) return 0;
    let score = 0;
    if (pass.length >= 8) score += 25;
    if (/[A-Z]/.test(pass)) score += 25;
    if (/[0-9]/.test(pass)) score += 25;
    if (/[^A-Za-z0-9]/.test(pass)) score += 25;
    return score;
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPassError('');

    if (passForm.new_password !== passForm.confirm_password) {
      setPassError('New passwords do not match');
      return;
    }

    if (passForm.new_password.length < 8) {
      setPassError('Password must be at least 8 characters long');
      return;
    }

    setSavingPass(true);
    try {
      const res = await api.changePassword(passForm.current_password, passForm.new_password);
      triggerFeedback('success', res.message || 'Your password has been changed successfully.');
      setPassForm({ current_password: '', new_password: '', confirm_password: '' });
    } catch (err) {
      setPassError(err.message || 'Failed to change password');
    } finally {
      setSavingPass(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[450px] flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs font-semibold text-slate-500">Loading Employee Profile...</p>
      </div>
    );
  }

  const u = profileData?.user || authUser;
  const completion = profileData?.completion || { percentage: 85, incompleteSections: [] };
  const hierarchy = profileData?.hierarchy || [];
  const manager = profileData?.manager;
  const department = profileData?.department;
  const emergencyContacts = profileData?.emergencyContacts || [];
  const employmentHistory = profileData?.employmentHistory || [];
  const documents = profileData?.documents || [];
  const isAdmin = ['super_admin', 'hr_admin', 'admin'].includes(authUser?.role);

  const navTabs = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'basic', label: 'Basic Information', icon: IdCard },
    { id: 'demographics', label: 'Demographic Information', icon: Layers },
    { id: 'contact', label: 'Contact & Address', icon: MapPin },
    { id: 'emergency', label: 'Emergency Contact', icon: Phone },
    { id: 'employment', label: 'Employment Information', icon: Briefcase },
    { id: 'reporting', label: 'Manager & Reporting', icon: Users },
    { id: 'history', label: 'Employment History', icon: Clock },
    { id: 'documents', label: 'Documents', icon: FileText },
    { id: 'security', label: 'Security & Password', icon: Lock }
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Global Feedback Banner */}
      {feedback.message && (
        <div
          role="status"
          aria-live="polite"
          className={`p-4 rounded-2xl text-xs font-semibold flex items-center justify-between shadow-sm animate-fade-in ${
            feedback.type === 'error'
              ? 'bg-rose-50 border border-rose-200 text-rose-800'
              : 'bg-emerald-50 border border-emerald-200 text-emerald-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'error' ? (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" aria-hidden="true" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" aria-hidden="true" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback({ type: '', message: '' })}
            aria-label="Dismiss message"
            className="text-slate-400 hover:text-slate-600 focus-visible:ring-2 focus-visible:ring-indigo-500 rounded p-1"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      )}

      {/* 1. Profile Overview Hero Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50/50 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" aria-hidden="true"></div>

        <div className="flex flex-col md:flex-row items-center md:items-start gap-6 relative z-10">
          {/* Avatar with Overlay Camera Button */}
          <div className="relative group shrink-0">
            <img
              src={u?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u?.name}`}
              alt={`${u?.name || 'Employee'}'s profile photo`}
              className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl object-cover ring-4 ring-indigo-50 bg-slate-100 shadow-md"
            />
            <button
              type="button"
              onClick={() => setPhotoModalOpen(true)}
              className="absolute inset-0 bg-slate-900/60 rounded-3xl opacity-0 group-hover:opacity-100 focus:opacity-100 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 flex flex-col items-center justify-center text-white transition-opacity text-[11px] font-semibold gap-1"
              aria-label="Change profile photo"
              title="Change Profile Photo"
            >
              <Camera className="w-5 h-5" aria-hidden="true" />
              <span>Change</span>
            </button>
          </div>

          {/* Profile Meta Details */}
          <div className="text-center md:text-left min-w-0 flex-1">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-2.5">
                  <h2 className="text-2xl font-bold text-slate-900 tracking-tight">{u?.name}</h2>
                  <Badge variant={u?.role} size="sm">
                    {u?.role === 'super_admin' ? 'Super Admin' : u?.role === 'hr_admin' ? 'HR Admin' : u?.role === 'admin' ? 'HR / Admin' : u?.role === 'manager' ? 'Manager' : 'Employee'}
                  </Badge>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" aria-hidden="true"></span>
                    Active
                  </span>
                </div>
                <p className="text-sm font-semibold text-indigo-600 mt-1">
                  {u?.designation || u?.job_title}
                  <span className="text-slate-400 font-normal"> • {department?.name || 'Engineering'}</span>
                </p>
              </div>

              {/* Quick Jump Edit Button */}
              <button
                type="button"
                onClick={() => {
                  setActiveTab('basic');
                  setIsEditingBasic(true);
                }}
                className="flex items-center justify-center gap-1.5 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs rounded-xl border border-indigo-200 shadow-sm transition-all focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none"
              >
                <Edit2 className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Edit Profile</span>
              </button>
            </div>

            {/* Quick Meta Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t border-slate-100 text-xs">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Employee ID</span>
                <span className="font-mono font-bold text-slate-800">{u?.employee_code || 'EMP001'}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Official Email</span>
                <span className="font-semibold text-slate-800 truncate block" title={u?.email}>
                  {u?.email}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Date of Joining</span>
                <span className="font-semibold text-slate-800">{formatDate(u?.joining_date || "2021-04-12")}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Reporting Manager</span>
                <span className="font-semibold text-slate-800 truncate block">
                  {manager?.name || 'Executive Board / None'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Profile Completion Indicator */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-600" aria-hidden="true" />
            <h4 className="text-sm font-bold text-slate-900">Profile Completion</h4>
            <span className="px-2 py-0.5 rounded-full text-xs font-extrabold bg-indigo-100 text-indigo-800">
              {completion.percentage}%
            </span>
          </div>
          <span className="text-xs text-slate-500">
            {completion.percentage === 100
              ? '🎉 All essential profile information completed!'
              : 'Complete all sections for full employee directory verification.'}
          </span>
        </div>

        {/* Progress Bar */}
        <div
          role="progressbar"
          aria-valuenow={completion.percentage}
          aria-valuemin="0"
          aria-valuemax="100"
          aria-label={`Profile completion: ${completion.percentage}%`}
          className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden"
        >
          <div
            className="h-full bg-gradient-to-r from-indigo-500 via-sky-500 to-emerald-500 rounded-full transition-all duration-700 ease-out"
            style={{ width: `${completion.percentage}%` }}
          ></div>
        </div>

        {/* Incomplete Checklist Links */}
        {completion.incompleteSections?.length > 0 && (
          <div className="mt-3.5 pt-3 border-t border-slate-100 flex flex-wrap items-center gap-2 text-xs">
            <span className="text-slate-500 font-medium">Complete your profile:</span>
            {completion.incompleteSections.map((sec) => (
              <button
                key={sec.id}
                type="button"
                onClick={() => setActiveTab(sec.id === 'photo' ? 'overview' : sec.id)}
                className="px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-lg font-semibold hover:bg-amber-100 transition-colors flex items-center gap-1 focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:outline-none"
              >
                <span>+ {sec.title}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 3. Main Body: Left Sub-Navigation + Right Content Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Sub-Navigation (Tabs) */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-3xl p-3 border border-slate-200/80 shadow-sm sticky top-20">
            <p className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Profile Sections
            </p>
            <nav role="tablist" aria-label="Profile Sections Navigation" className="space-y-1">
              {navTabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    role="tab"
                    id={`profile-tab-${tab.id}`}
                    aria-selected={isActive}
                    aria-controls={`profile-tabpanel-${tab.id}`}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition-all focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none ${
                      isActive
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} aria-hidden="true" />
                      <span className="truncate">{tab.label}</span>
                    </div>
                    {isActive && <ChevronRight className="w-3.5 h-3.5 text-indigo-200" aria-hidden="true" />}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Right Section Content */}
        <div className="lg:col-span-9 space-y-6">
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Snapshot Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3">
                    <Briefcase className="w-5 h-5" />
                  </div>
                  <p className="text-xs text-slate-400 font-semibold uppercase">Department & Role</p>
                  <p className="text-sm font-bold text-slate-900 mt-0.5">{u?.designation}</p>
                  <span className="text-xs text-slate-500 mt-1 block">{department?.name}</span>
                </div>

                <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm">
                  <div className="w-10 h-10 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center mb-3">
                    <Users className="w-5 h-5" />
                  </div>
                  <p className="text-xs text-slate-400 font-semibold uppercase">Reporting Manager</p>
                  <p className="text-sm font-bold text-slate-900 mt-0.5">{manager?.name || 'Executive Level'}</p>
                  <span className="text-xs text-slate-500 mt-1 block">{manager?.designation || 'None'}</span>
                </div>

                <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
                    <FileText className="w-5 h-5" />
                  </div>
                  <p className="text-xs text-slate-400 font-semibold uppercase">Verified Documents</p>
                  <p className="text-sm font-bold text-slate-900 mt-0.5">
                    {documents.filter((d) => d.status === 'Verified').length} / {documents.length} Verified
                  </p>
                  <span className="text-xs text-slate-500 mt-1 block">
                    {documents.filter((d) => d.status === 'Pending Verification').length} pending review
                  </span>
                </div>
              </div>

              {/* Quick Personal Summary Card */}
              <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-sm">
                <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Personal & Contact Summary</h3>
                    <p className="text-xs text-slate-500 mt-0.5">Quick glance of your personal directory info</p>
                  </div>
                  <button
                    onClick={() => setActiveTab('basic')}
                    className="text-xs text-indigo-600 font-bold hover:underline"
                  >
                    View All & Edit →
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">Personal Email</span>
                    <span className="font-semibold text-slate-800 mt-0.5 block">{u?.personal_email || 'Not set'}</span>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">Personal Mobile</span>
                    <span className="font-semibold text-slate-800 mt-0.5 block">{u?.personal_mobile || u?.phone || 'Not set'}</span>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">Date of Birth</span>
                    <span className="font-semibold text-slate-800 mt-0.5 block">{u?.dob ? formatDate(u?.dob) : 'Not set'}</span>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">Primary Emergency Contact</span>
                    <span className="font-semibold text-slate-800 mt-0.5 block">
                      {emergencyContacts.find((c) => c.is_primary)?.name
                        ? `${emergencyContacts.find((c) => c.is_primary).name} (${emergencyContacts.find((c) => c.is_primary).primary_phone})`
                        : u?.emergency_contact || 'None registered'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: BASIC INFORMATION */}
          {activeTab === 'basic' && (
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                    <IdCard className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Basic Information</h3>
                    <p className="text-xs text-slate-500 mt-0.5">Manage your personal identity information</p>
                  </div>
                </div>
                {!isEditingBasic ? (
                  <button
                    onClick={() => setIsEditingBasic(true)}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-600/20 transition-all flex items-center gap-1.5"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsEditingBasic(false)}
                      className="px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      form="basic-form"
                      type="submit"
                      disabled={savingBasic}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-600/20 transition-all disabled:opacity-50"
                    >
                      {savingBasic ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                )}
              </div>

              <form id="basic-form" onSubmit={handleBasicSubmit} className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      First Name <span className="text-rose-500 font-bold">*</span>
                    </label>
                    <input
                      type="text"
                      disabled={!isEditingBasic}
                      value={basicForm.first_name}
                      onChange={(e) => setBasicForm({ ...basicForm, first_name: e.target.value })}
                      required
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl disabled:bg-slate-100/60 disabled:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Middle Name</label>
                    <input
                      type="text"
                      disabled={!isEditingBasic}
                      value={basicForm.middle_name}
                      onChange={(e) => setBasicForm({ ...basicForm, middle_name: e.target.value })}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl disabled:bg-slate-100/60 disabled:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Last Name <span className="text-rose-500 font-bold">*</span>
                    </label>
                    <input
                      type="text"
                      disabled={!isEditingBasic}
                      value={basicForm.last_name}
                      onChange={(e) => setBasicForm({ ...basicForm, last_name: e.target.value })}
                      required
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl disabled:bg-slate-100/60 disabled:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Preferred Name</label>
                    <input
                      type="text"
                      disabled={!isEditingBasic}
                      value={basicForm.preferred_name}
                      onChange={(e) => setBasicForm({ ...basicForm, preferred_name: e.target.value })}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl disabled:bg-slate-100/60 disabled:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Gender</label>
                    <select
                      disabled={!isEditingBasic}
                      value={basicForm.gender}
                      onChange={(e) => setBasicForm({ ...basicForm, gender: e.target.value })}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl disabled:bg-slate-100/60 disabled:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Non-Binary">Non-Binary</option>
                      <option value="Prefer not to say">Prefer not to say</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Personal Email</label>
                    <input
                      type="email"
                      disabled={!isEditingBasic}
                      value={basicForm.personal_email}
                      onChange={(e) => setBasicForm({ ...basicForm, personal_email: e.target.value })}
                      placeholder="e.g. yourname@personalmail.com"
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl disabled:bg-slate-100/60 disabled:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Personal Mobile Number</label>
                    <input
                      type="tel"
                      disabled={!isEditingBasic}
                      value={basicForm.personal_mobile}
                      onChange={(e) => setBasicForm({ ...basicForm, personal_mobile: e.target.value })}
                      placeholder="+1 (555) 000-0000"
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl disabled:bg-slate-100/60 disabled:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Date of Birth</label>
                    <input
                      type="date"
                      disabled={!isEditingBasic}
                      value={basicForm.dob}
                      onChange={(e) => setBasicForm({ ...basicForm, dob: e.target.value })}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl disabled:bg-slate-100/60 disabled:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              </form>
            </div>
          )}

          {/* TAB 3: DEMOGRAPHIC INFORMATION */}
          {activeTab === 'demographics' && (
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Demographic Information</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Configurable organizational demographic details</p>
                </div>
                {!isEditingDemo ? (
                  <button
                    onClick={() => setIsEditingDemo(true)}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-600/20 transition-all flex items-center gap-1.5"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsEditingDemo(false)}
                      className="px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      form="demo-form"
                      type="submit"
                      disabled={savingDemo}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-600/20 transition-all disabled:opacity-50"
                    >
                      {savingDemo ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                )}
              </div>

              <form id="demo-form" onSubmit={handleDemoSubmit} className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Gender</label>
                    <select
                      disabled={!isEditingDemo}
                      value={demoForm.gender}
                      onChange={(e) => setDemoForm({ ...demoForm, gender: e.target.value })}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl disabled:bg-slate-100/60 disabled:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Non-Binary">Non-Binary</option>
                      <option value="Prefer not to say">Prefer not to say</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Marital Status</label>
                    <select
                      disabled={!isEditingDemo}
                      value={demoForm.marital_status}
                      onChange={(e) => setDemoForm({ ...demoForm, marital_status: e.target.value })}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl disabled:bg-slate-100/60 disabled:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="Single">Single</option>
                      <option value="Married">Married</option>
                      <option value="Divorced">Divorced</option>
                      <option value="Widowed">Widowed</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Nationality</label>
                    <input
                      type="text"
                      disabled={!isEditingDemo}
                      value={demoForm.nationality}
                      onChange={(e) => setDemoForm({ ...demoForm, nationality: e.target.value })}
                      placeholder="e.g. American, Indian, Canadian"
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl disabled:bg-slate-100/60 disabled:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Country of Residence</label>
                    <input
                      type="text"
                      disabled={!isEditingDemo}
                      value={demoForm.country_of_residence}
                      onChange={(e) => setDemoForm({ ...demoForm, country_of_residence: e.target.value })}
                      placeholder="e.g. United States"
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl disabled:bg-slate-100/60 disabled:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              </form>
            </div>
          )}

          {/* TAB 4: CONTACT & ADDRESS */}
          {activeTab === 'contact' && (
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Contact & Address</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Manage communication channels and residential addresses</p>
                </div>
                {!isEditingContact ? (
                  <button
                    onClick={() => setIsEditingContact(true)}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-600/20 transition-all flex items-center gap-1.5"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsEditingContact(false)}
                      className="px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      form="contact-form"
                      type="submit"
                      disabled={savingContact}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-600/20 transition-all disabled:opacity-50"
                    >
                      {savingContact ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                )}
              </div>

              <form id="contact-form" onSubmit={handleContactSubmit} className="space-y-6 text-xs">
                {/* Contact numbers & email */}
                <div>
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
                    Contact Information
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Personal Email</label>
                      <input
                        type="email"
                        disabled={!isEditingContact}
                        value={contactForm.personal_email}
                        onChange={(e) => setContactForm({ ...contactForm, personal_email: e.target.value })}
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl disabled:bg-slate-100/60 disabled:text-slate-600 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Personal Mobile Number</label>
                      <input
                        type="tel"
                        disabled={!isEditingContact}
                        value={contactForm.personal_mobile}
                        onChange={(e) => setContactForm({ ...contactForm, personal_mobile: e.target.value })}
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl disabled:bg-slate-100/60 disabled:text-slate-600 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Alternate Phone Number</label>
                      <input
                        type="tel"
                        disabled={!isEditingContact}
                        value={contactForm.alt_phone}
                        onChange={(e) => setContactForm({ ...contactForm, alt_phone: e.target.value })}
                        placeholder="Optional"
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl disabled:bg-slate-100/60 disabled:text-slate-600 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Current Address */}
                <div className="pt-4 border-t border-slate-100">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
                    Current Address
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2">
                      <label className="block font-semibold text-slate-700 mb-1">Address Line 1</label>
                      <input
                        type="text"
                        disabled={!isEditingContact}
                        value={contactForm.current_address?.line1 || ''}
                        onChange={(e) =>
                          setContactForm({
                            ...contactForm,
                            current_address: { ...contactForm.current_address, line1: e.target.value }
                          })
                        }
                        placeholder="Street Address, P.O. Box"
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl disabled:bg-slate-100/60 disabled:text-slate-600 focus:outline-none"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block font-semibold text-slate-700 mb-1">Address Line 2</label>
                      <input
                        type="text"
                        disabled={!isEditingContact}
                        value={contactForm.current_address?.line2 || ''}
                        onChange={(e) =>
                          setContactForm({
                            ...contactForm,
                            current_address: { ...contactForm.current_address, line2: e.target.value }
                          })
                        }
                        placeholder="Apartment, suite, unit, building, floor, etc."
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl disabled:bg-slate-100/60 disabled:text-slate-600 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">City</label>
                      <input
                        type="text"
                        disabled={!isEditingContact}
                        value={contactForm.current_address?.city || ''}
                        onChange={(e) =>
                          setContactForm({
                            ...contactForm,
                            current_address: { ...contactForm.current_address, city: e.target.value }
                          })
                        }
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl disabled:bg-slate-100/60 disabled:text-slate-600 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">State / Province</label>
                      <input
                        type="text"
                        disabled={!isEditingContact}
                        value={contactForm.current_address?.state || ''}
                        onChange={(e) =>
                          setContactForm({
                            ...contactForm,
                            current_address: { ...contactForm.current_address, state: e.target.value }
                          })
                        }
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl disabled:bg-slate-100/60 disabled:text-slate-600 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Country</label>
                      <input
                        type="text"
                        disabled={!isEditingContact}
                        value={contactForm.current_address?.country || ''}
                        onChange={(e) =>
                          setContactForm({
                            ...contactForm,
                            current_address: { ...contactForm.current_address, country: e.target.value }
                          })
                        }
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl disabled:bg-slate-100/60 disabled:text-slate-600 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Postal / ZIP Code</label>
                      <input
                        type="text"
                        disabled={!isEditingContact}
                        value={contactForm.current_address?.postal_code || ''}
                        onChange={(e) =>
                          setContactForm({
                            ...contactForm,
                            current_address: { ...contactForm.current_address, postal_code: e.target.value }
                          })
                        }
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl disabled:bg-slate-100/60 disabled:text-slate-600 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Permanent Address */}
                <div className="pt-4 border-t border-slate-100">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      Permanent Address
                    </h4>
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        disabled={!isEditingContact}
                        checked={contactForm.is_permanent_same}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setContactForm({
                            ...contactForm,
                            is_permanent_same: checked,
                            permanent_address: checked
                              ? { ...contactForm.current_address }
                              : contactForm.permanent_address
                          });
                        }}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                      />
                      <span className="text-xs font-semibold text-slate-700">
                        Permanent address is same as current address
                      </span>
                    </label>
                  </div>

                  {!contactForm.is_permanent_same && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-fade-in">
                      <div className="sm:col-span-2">
                        <label className="block font-semibold text-slate-700 mb-1">Address Line 1</label>
                        <input
                          type="text"
                          disabled={!isEditingContact}
                          value={contactForm.permanent_address?.line1 || ''}
                          onChange={(e) =>
                            setContactForm({
                              ...contactForm,
                              permanent_address: { ...contactForm.permanent_address, line1: e.target.value }
                            })
                          }
                          className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl disabled:bg-slate-100/60 disabled:text-slate-600 focus:outline-none"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block font-semibold text-slate-700 mb-1">Address Line 2</label>
                        <input
                          type="text"
                          disabled={!isEditingContact}
                          value={contactForm.permanent_address?.line2 || ''}
                          onChange={(e) =>
                            setContactForm({
                              ...contactForm,
                              permanent_address: { ...contactForm.permanent_address, line2: e.target.value }
                            })
                          }
                          className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl disabled:bg-slate-100/60 disabled:text-slate-600 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">City</label>
                        <input
                          type="text"
                          disabled={!isEditingContact}
                          value={contactForm.permanent_address?.city || ''}
                          onChange={(e) =>
                            setContactForm({
                              ...contactForm,
                              permanent_address: { ...contactForm.permanent_address, city: e.target.value }
                            })
                          }
                          className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl disabled:bg-slate-100/60 disabled:text-slate-600 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">State / Province</label>
                        <input
                          type="text"
                          disabled={!isEditingContact}
                          value={contactForm.permanent_address?.state || ''}
                          onChange={(e) =>
                            setContactForm({
                              ...contactForm,
                              permanent_address: { ...contactForm.permanent_address, state: e.target.value }
                            })
                          }
                          className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl disabled:bg-slate-100/60 disabled:text-slate-600 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Country</label>
                        <input
                          type="text"
                          disabled={!isEditingContact}
                          value={contactForm.permanent_address?.country || ''}
                          onChange={(e) =>
                            setContactForm({
                              ...contactForm,
                              permanent_address: { ...contactForm.permanent_address, country: e.target.value }
                            })
                          }
                          className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl disabled:bg-slate-100/60 disabled:text-slate-600 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Postal / ZIP Code</label>
                        <input
                          type="text"
                          disabled={!isEditingContact}
                          value={contactForm.permanent_address?.postal_code || ''}
                          onChange={(e) =>
                            setContactForm({
                              ...contactForm,
                              permanent_address: { ...contactForm.permanent_address, postal_code: e.target.value }
                            })
                          }
                          className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl disabled:bg-slate-100/60 disabled:text-slate-600 focus:outline-none"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </form>
            </div>
          )}

          {/* TAB 5: EMERGENCY CONTACTS */}
          {activeTab === 'emergency' && (
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Emergency Contacts</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Contacts to be reached in urgent situations</p>
                </div>
                <button
                  onClick={openAddEmgModal}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-600/20 transition-all flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Emergency Contact</span>
                </button>
              </div>

              {emergencyContacts.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-500 text-xs">
                  No emergency contacts registered yet. Please add at least one primary contact.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {emergencyContacts.map((c) => (
                    <div
                      key={c.id}
                      className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div>
                            <h4 className="text-sm font-bold text-slate-900">{c.name}</h4>
                            <span className="text-xs font-semibold text-indigo-600">{c.relationship}</span>
                          </div>
                          {c.is_primary ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                              ★ Primary Contact
                            </span>
                          ) : (
                            <button
                              onClick={() => {
                                api.updateEmergencyContact(c.id, { is_primary: true }).then(() => {
                                  triggerFeedback('success', `${c.name} set as primary contact.`);
                                  fetchProfile();
                                });
                              }}
                              className="text-[10px] text-slate-500 hover:text-indigo-600 underline font-medium"
                            >
                              Set as Primary
                            </button>
                          )}
                        </div>

                        <div className="space-y-1 mt-3 text-xs text-slate-600">
                          <p className="flex items-center gap-2">
                            <Phone className="w-3.5 h-3.5 text-slate-400" />
                            <span className="font-semibold text-slate-800">{c.primary_phone}</span>
                            {c.alternate_phone && (
                              <span className="text-slate-400 text-[11px]">(Alt: {c.alternate_phone})</span>
                            )}
                          </p>
                          {c.address && (
                            <p className="flex items-start gap-2 pt-1">
                              <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                              <span className="text-slate-500">{c.address}</span>
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-4 mt-4 border-t border-slate-200/80">
                        <button
                          onClick={() => openEditEmgModal(c)}
                          className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => setDeleteEmgId(c.id)}
                          className="px-3 py-1.5 bg-white border border-rose-200 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 6: EMPLOYMENT INFORMATION (VIEW-ONLY FOR EMPLOYEE, MANAGED BY HR) */}
          {activeTab === 'employment' && (
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 mb-6 gap-3">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Employment Information</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Official organizational record & corporate placement</p>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 border border-indigo-200 text-indigo-800 rounded-xl text-xs font-bold shrink-0">
                  <Shield className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Managed by HR • View Only</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Employee ID</span>
                  <span className="font-mono font-bold text-slate-900 text-sm mt-0.5 block">{u?.employee_code}</span>
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Employment Status</span>
                  <span className="font-bold text-emerald-700 mt-0.5 block capitalize">{u?.status || 'Active'}</span>
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Employee Type</span>
                  <span className="font-semibold text-slate-800 mt-0.5 block">{u?.employee_type || 'Full-time Regular'}</span>
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Department</span>
                  <span className="font-bold text-slate-900 mt-0.5 block">{department?.name || 'General'}</span>
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Designation</span>
                  <span className="font-bold text-slate-900 mt-0.5 block">{u?.designation}</span>
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Job Title</span>
                  <span className="font-semibold text-slate-800 mt-0.5 block">{u?.job_title || u?.designation}</span>
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Date of Joining</span>
                  <span className="font-semibold text-slate-800 mt-0.5 block">{formatDate(u?.joining_date)}</span>
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Work Location</span>
                  <span className="font-semibold text-slate-800 mt-0.5 block">{u?.work_location || 'San Francisco Headquarters'}</span>
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Cost Center</span>
                  <span className="font-mono font-semibold text-slate-800 mt-0.5 block">{u?.cost_center || 'CC-ENG-01'}</span>
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 sm:col-span-2">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Official Corporate Email</span>
                  <span className="font-semibold text-slate-800 mt-0.5 block">{u?.email}</span>
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Reporting Manager</span>
                  <span className="font-semibold text-slate-800 mt-0.5 block">{manager?.name || 'None'}</span>
                </div>

                <div className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100 sm:col-span-3">
                  <span className="text-[10px] font-bold uppercase text-indigo-500 block mb-1">Assigned Security Roles & Active View</span>
                  <div className="flex flex-wrap items-center gap-2">
                    {(Array.isArray(u?.roles) && u.roles.length > 0 ? u.roles : [u?.role || 'employee']).map((rk) => (
                      <span
                        key={rk}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold capitalize border ${
                          rk.toLowerCase() === (u?.role || '').toLowerCase()
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                            : 'bg-white text-slate-700 border-slate-200'
                        }`}
                      >
                        {rk.toLowerCase() === (u?.role || '').toLowerCase() && (
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse" />
                        )}
                        {rk === 'super_admin' ? 'Super Admin' : rk === 'hr_admin' ? 'HR Admin' : rk === 'manager' ? 'Manager' : 'Employee'}
                        {rk.toLowerCase() === (u?.role || '').toLowerCase() && ' (Active)'}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-6 p-4 rounded-2xl bg-amber-50/60 border border-amber-200/80 flex items-start gap-3">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-800 leading-relaxed">
                  <strong>Notice:</strong> To request changes to your designation, department, cost center, or reporting manager, please submit a formal request via your HR department representative.
                </p>
              </div>
            </div>
          )}

          {/* TAB 7: MANAGER & REPORTING STRUCTURE */}
          {activeTab === 'reporting' && (
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm space-y-6">
              <div className="pb-4 border-b border-slate-100">
                <h3 className="text-base font-bold text-slate-900">Manager & Reporting Structure</h3>
                <p className="text-xs text-slate-500 mt-0.5">Direct manager and dynamic reporting chain</p>
              </div>

              {/* Reporting Managers Cards (Line 1 & Line 2) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Line 1 Manager Card */}
                {profileData?.line1Manager || manager ? (
                  <div className="p-5 rounded-2xl border border-indigo-100 bg-indigo-50/40 flex items-start gap-4">
                    <img
                      src={(profileData?.line1Manager || manager).avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${(profileData?.line1Manager || manager).name}`}
                      alt={(profileData?.line1Manager || manager).name}
                      className="w-14 h-14 rounded-2xl object-cover bg-white ring-2 ring-indigo-200 shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] uppercase font-extrabold text-indigo-600 tracking-wider">
                        Reporting Manager — Line 1 (Direct)
                      </span>
                      <h4 className="text-sm font-bold text-slate-900 truncate">{(profileData?.line1Manager || manager).name}</h4>
                      <p className="text-xs font-semibold text-indigo-700 truncate">
                        {(profileData?.line1Manager || manager).designation} • {(profileData?.line1Manager || manager).department_name}
                      </p>
                      <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-slate-600">
                        <span className="flex items-center gap-1">
                          <Mail className="w-3 h-3 text-slate-400" />
                          {(profileData?.line1Manager || manager).email}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-5 bg-slate-50 rounded-2xl text-center text-xs text-slate-500 border border-slate-200 flex items-center justify-center">
                    No Line 1 Manager assigned (Direct to Head/Board).
                  </div>
                )}

                {/* Line 2 Manager Card */}
                {profileData?.line2Manager ? (
                  <div className="p-5 rounded-2xl border border-sky-100 bg-sky-50/40 flex items-start gap-4">
                    <img
                      src={profileData.line2Manager.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profileData.line2Manager.name}`}
                      alt={profileData.line2Manager.name}
                      className="w-14 h-14 rounded-2xl object-cover bg-white ring-2 ring-sky-200 shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] uppercase font-extrabold text-sky-600 tracking-wider">
                        Reporting Manager — Line 2 (Department Head)
                      </span>
                      <h4 className="text-sm font-bold text-slate-900 truncate">{profileData.line2Manager.name}</h4>
                      <p className="text-xs font-semibold text-sky-700 truncate">
                        {profileData.line2Manager.designation} • {profileData.line2Manager.department_name}
                      </p>
                      <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-slate-600">
                        <span className="flex items-center gap-1">
                          <Mail className="w-3 h-3 text-slate-400" />
                          {profileData.line2Manager.email}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-5 bg-slate-50 rounded-2xl text-center text-xs text-slate-500 border border-slate-200 flex items-center justify-center">
                    No Line 2 Manager specified.
                  </div>
                )}
              </div>

              {/* Policy Notice: Employees can view but cannot edit reporting structure */}
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-center gap-2 text-slate-600 text-xs">
                <Shield className="w-4 h-4 text-indigo-600 shrink-0" />
                <span>
                  <strong>Reporting Policy:</strong> Employees can view their assigned reporting structure. Only authorized HR/Admin users can modify reporting managers.
                </span>
              </div>

              {/* Dynamic Reporting Hierarchy Flow */}
              <div>
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-4">
                  Organizational Reporting Hierarchy
                </h4>
                <div className="relative pl-6 sm:pl-8 space-y-4 before:absolute before:left-3 sm:before:left-4 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200">
                  {hierarchy.map((node, index) => {
                    const isSelf = node.id === u?.id;
                    return (
                      <div key={node.id} className="relative flex items-center gap-3">
                        <div
                          className={`absolute -left-6 sm:-left-8 w-6 h-6 rounded-full border-2 flex items-center justify-center text-[10px] font-bold z-10 ${
                            isSelf
                              ? 'bg-indigo-600 border-indigo-600 text-white'
                              : 'bg-white border-slate-300 text-slate-600'
                          }`}
                        >
                          {index + 1}
                        </div>

                        <div
                          className={`p-4 rounded-2xl border flex-1 flex items-center justify-between gap-3 ${
                            isSelf
                              ? 'bg-indigo-50/70 border-indigo-200 ring-2 ring-indigo-500/20'
                              : 'bg-white border-slate-200/80 shadow-sm'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <img
                              src={node.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${node.name}`}
                              alt={node.name}
                              className="w-10 h-10 rounded-xl object-cover ring-1 ring-slate-200 shrink-0"
                            />
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-slate-900 truncate flex items-center gap-1.5">
                                <span>{node.name}</span>
                                {isSelf && (
                                  <span className="px-1.5 py-0.2 text-[9px] bg-indigo-600 text-white rounded font-extrabold uppercase">
                                    You
                                  </span>
                                )}
                              </p>
                              <p className="text-[11px] text-slate-500 truncate">
                                {node.designation} • {node.department_name}
                              </p>
                            </div>
                          </div>
                          <span className="text-[11px] font-mono text-slate-400 hidden sm:inline">
                            {node.employee_code}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 8: EMPLOYMENT HISTORY TIMELINE */}
          {activeTab === 'history' && (
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Employment History Timeline</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Chronological record of internal promotions, transitions, and milestones</p>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 rounded-xl text-xs font-semibold text-slate-600">
                  <Shield className="w-3.5 h-3.5 text-slate-500" />
                  <span>Verified HR Record</span>
                </div>
              </div>

              {employmentHistory.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-500 text-xs">
                  No previous career events recorded. Initial joining record is active.
                </div>
              ) : (
                <div className="relative pl-6 sm:pl-8 space-y-6 before:absolute before:left-3 sm:before:left-4 before:top-2 before:bottom-2 before:w-0.5 before:bg-indigo-200">
                  {employmentHistory.map((item) => (
                    <div key={item.id} className="relative">
                      <div className="absolute -left-6 sm:-left-8 top-1.5 w-4 h-4 rounded-full border-4 border-white bg-indigo-600 shadow-sm"></div>
                      <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200/80 shadow-sm text-xs">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-2">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-indigo-100 text-indigo-800 w-fit">
                            {item.event_type}
                          </span>
                          <span className="text-slate-400 font-medium text-[11px]">
                            Effective: {formatDate(item.event_date)}
                          </span>
                        </div>

                        <div className="mt-2 space-y-1">
                          {item.previous_value && item.previous_value !== 'N/A' && (
                            <p className="text-slate-500">
                              <span className="font-semibold text-slate-700">Previous:</span> {item.previous_value}
                            </p>
                          )}
                          <p className="text-slate-900 font-bold">
                            <span className="text-slate-500 font-normal">New:</span> {item.new_value}
                          </p>
                          {item.notes && (
                            <p className="text-slate-600 bg-white p-2.5 rounded-xl border border-slate-200/60 mt-2 italic">
                              "{item.notes}"
                            </p>
                          )}
                        </div>

                        {item.recorded_by && (
                          <span className="text-[10px] text-slate-400 mt-3 block">
                            Logged by: {item.recorded_by}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 9: DOCUMENTS */}
          {activeTab === 'documents' && (
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Documents Management</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Upload, download, and review verified employment documents</p>
                </div>
                <button
                  onClick={() => setDocModalOpen(true)}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-600/20 transition-all flex items-center gap-1.5 shrink-0"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload Document</span>
                </button>
              </div>

              {documents.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-500 text-xs">
                  No documents uploaded yet. Click "Upload Document" to submit files for HR verification.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="p-4 rounded-2xl border border-slate-200/80 bg-slate-50/60 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-bold text-slate-900 truncate">{doc.document_name}</h4>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-200 text-slate-700">
                              {doc.category}
                            </span>
                            {/* Status Badge */}
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                                doc.status === 'Verified'
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                  : doc.status === 'Rejected'
                                  ? 'bg-rose-100 text-rose-800 border border-rose-300'
                                  : 'bg-amber-100 text-amber-800 border border-amber-300'
                              }`}
                            >
                              {doc.status}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 mt-1">
                            Uploaded on {formatDate(doc.uploaded_at)} • {doc.file_size}
                          </p>

                          {/* Rejection Note if applicable */}
                          {doc.status === 'Rejected' && doc.rejection_reason && (
                            <div className="mt-2 p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-start gap-2">
                              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                              <div>
                                <span className="font-bold">Rejection Reason: </span>
                                <span>"{doc.rejection_reason}"</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                        <button
                          onClick={() => alert(`Opening document preview for: ${doc.document_name}`)}
                          className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 rounded-xl font-semibold text-slate-700 transition-colors flex items-center gap-1"
                        >
                          <Download className="w-3 h-3" />
                          <span>Download</span>
                        </button>

                        {/* If Admin, allow verifying/rejecting */}
                        {isAdmin && (
                          <button
                            onClick={() => {
                              setVerifyDocModal(doc);
                              setVerifyStatus(doc.status === 'Rejected' ? 'Rejected' : 'Verified');
                              setRejectionReason(doc.rejection_reason || '');
                            }}
                            className="px-3 py-1.5 bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 rounded-xl font-semibold transition-colors"
                          >
                            Review
                          </button>
                        )}

                        {/* Allow delete if pending or rejected or if admin */}
                        {(doc.status !== 'Verified' || isAdmin) && (
                          <button
                            onClick={() => setDeleteDocId(doc.id)}
                            className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-colors"
                            title="Delete Document"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 10: SECURITY & CHANGE PASSWORD */}
          {activeTab === 'security' && (
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm space-y-6">
              <div className="pb-4 border-b border-slate-100">
                <h3 className="text-base font-bold text-slate-900">Security & Account Authentication</h3>
                <p className="text-xs text-slate-500 mt-0.5">Manage your login password and access credentials</p>
              </div>

              {passError && (
                <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{passError}</span>
                </div>
              )}

              <form onSubmit={handlePasswordChange} className="space-y-4 max-w-lg text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Current Password <span className="text-rose-500 font-bold">*</span>
                  </label>
                  <div className="relative">
                    <input
                      id="current-password-input"
                      type={showCurrentPass ? 'text' : 'password'}
                      value={passForm.current_password}
                      onChange={(e) => setPassForm({ ...passForm, current_password: e.target.value })}
                      required
                      autoComplete="current-password"
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl pr-10 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPass(!showCurrentPass)}
                      aria-label={showCurrentPass ? 'Hide current password' : 'Show current password'}
                      className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 focus-visible:ring-2 focus-visible:ring-indigo-500 rounded p-1"
                    >
                      {showCurrentPass ? <EyeOff className="w-4 h-4" aria-hidden="true" /> : <Eye className="w-4 h-4" aria-hidden="true" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label htmlFor="new-password-input" className="block font-semibold text-slate-700 mb-1">
                    New Password <span className="text-rose-500 font-bold">*</span>
                  </label>
                  <div className="relative">
                    <input
                      id="new-password-input"
                      type={showNewPass ? 'text' : 'password'}
                      value={passForm.new_password}
                      onChange={(e) => setPassForm({ ...passForm, new_password: e.target.value })}
                      required
                      autoComplete="new-password"
                      placeholder="Minimum 8 characters"
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl pr-10 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPass(!showNewPass)}
                      aria-label={showNewPass ? 'Hide new password' : 'Show new password'}
                      className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 focus-visible:ring-2 focus-visible:ring-indigo-500 rounded p-1"
                    >
                      {showNewPass ? <EyeOff className="w-4 h-4" aria-hidden="true" /> : <Eye className="w-4 h-4" aria-hidden="true" />}
                    </button>
                  </div>

                  {/* Password Strength Meter */}
                  {passForm.new_password && (
                    <div className="mt-2 space-y-1">
                      <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            calculatePassStrength(passForm.new_password) <= 25
                              ? 'bg-rose-500 w-1/4'
                              : calculatePassStrength(passForm.new_password) <= 50
                              ? 'bg-amber-500 w-2/4'
                              : calculatePassStrength(passForm.new_password) <= 75
                              ? 'bg-sky-500 w-3/4'
                              : 'bg-emerald-500 w-full'
                          }`}
                        ></div>
                      </div>
                      <span className="text-[10px] font-semibold text-slate-500">
                        Strength:{' '}
                        {calculatePassStrength(passForm.new_password) <= 25
                          ? 'Weak'
                          : calculatePassStrength(passForm.new_password) <= 50
                          ? 'Fair'
                          : calculatePassStrength(passForm.new_password) <= 75
                          ? 'Good'
                          : 'Strong (Recommended)'}
                      </span>
                    </div>
                  )}
                </div>

                <div>
                  <label htmlFor="confirm-password-input" className="block font-semibold text-slate-700 mb-1">
                    Confirm New Password <span className="text-rose-500 font-bold">*</span>
                  </label>
                  <input
                    id="confirm-password-input"
                    type="password"
                    autoComplete="new-password"
                    value={passForm.confirm_password}
                    onChange={(e) => setPassForm({ ...passForm, confirm_password: e.target.value })}
                    required
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={savingPass}
                    className="px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-600/20 transition-all focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none disabled:opacity-50"
                  >
                    {savingPass ? 'Updating Password...' : 'Change Password'}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>

      {/* --- MODAL 1: CHANGE PROFILE PHOTO --- */}
      <Modal isOpen={photoModalOpen} onClose={() => setPhotoModalOpen(false)} title="Update Profile Photo">
        <div className="space-y-4 text-xs">
          <p className="text-slate-500">Upload a professional headshot (JPEG, PNG, or WebP up to 5MB).</p>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handlePhotoUpload}
            accept="image/png, image/jpeg, image/webp"
            aria-label="Select profile photo file"
            className="hidden"
          />

          <div className="flex flex-col gap-2.5">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={photoLoading}
              className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none"
            >
              <Upload className="w-4 h-4" aria-hidden="true" />
              <span>{photoLoading ? 'Uploading...' : 'Upload Image from Computer'}</span>
            </button>

            <button
              type="button"
              onClick={handleRemovePhoto}
              disabled={photoLoading}
              className="w-full py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition-all"
            >
              Remove Photo (Revert to Initials Avatar)
            </button>
          </div>
        </div>
      </Modal>

      {/* --- MODAL 2: ADD / EDIT EMERGENCY CONTACT --- */}
      <Modal
        isOpen={emgModalOpen}
        onClose={() => setEmgModalOpen(false)}
        title={editingEmgContact ? 'Edit Emergency Contact' : 'Add Emergency Contact'}
      >
        <form onSubmit={handleSaveEmgContact} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Full Name <span className="text-rose-500 font-bold">*</span>
            </label>
            <input
              type="text"
              required
              value={emgForm.name}
              onChange={(e) => setEmgForm({ ...emgForm, name: e.target.value })}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Relationship</label>
              <select
                value={emgForm.relationship}
                onChange={(e) => setEmgForm({ ...emgForm, relationship: e.target.value })}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
              >
                <option value="Spouse">Spouse</option>
                <option value="Parent">Parent</option>
                <option value="Sibling">Sibling</option>
                <option value="Child">Child</option>
                <option value="Friend">Friend</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Primary Phone <span className="text-rose-500 font-bold">*</span>
              </label>
              <input
                type="tel"
                required
                value={emgForm.primary_phone}
                onChange={(e) => setEmgForm({ ...emgForm, primary_phone: e.target.value })}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Alternate Phone Number</label>
            <input
              type="tel"
              value={emgForm.alternate_phone}
              onChange={(e) => setEmgForm({ ...emgForm, alternate_phone: e.target.value })}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Residential Address</label>
            <input
              type="text"
              value={emgForm.address}
              onChange={(e) => setEmgForm({ ...emgForm, address: e.target.value })}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer select-none pt-1">
            <input
              type="checkbox"
              checked={emgForm.is_primary}
              onChange={(e) => setEmgForm({ ...emgForm, is_primary: e.target.checked })}
              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
            />
            <span className="font-semibold text-slate-700">Set as Primary Emergency Contact</span>
          </label>

          <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setEmgModalOpen(false)}
              className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={emgLoading}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-sm"
            >
              {emgLoading ? 'Saving...' : 'Save Contact'}
            </button>
          </div>
        </form>
      </Modal>

      {/* --- MODAL 3: UPLOAD DOCUMENT --- */}
      <Modal isOpen={docModalOpen} onClose={() => setDocModalOpen(false)} title="Upload Employee Document">
        <form onSubmit={handleUploadDocument} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Document Category <span className="text-rose-500 font-bold">*</span>
            </label>
            <select
              value={docForm.category}
              onChange={(e) => setDocForm({ ...docForm, category: e.target.value })}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
            >
              <option value="Resume / CV">Resume / CV</option>
              <option value="Educational Certificate">Educational Certificate</option>
              <option value="Experience Certificate">Experience Certificate</option>
              <option value="Identification Document">Identification Document</option>
              <option value="Address Proof">Address Proof</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Document Title / File Name <span className="text-rose-500 font-bold">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Degree_Certificate_Official.pdf"
              value={docForm.document_name}
              onChange={(e) => setDocForm({ ...docForm, document_name: e.target.value })}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Estimated File Size</label>
            <input
              type="text"
              value={docForm.file_size}
              onChange={(e) => setDocForm({ ...docForm, file_size: e.target.value })}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
            />
          </div>

          <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setDocModalOpen(false)}
              className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={docLoading}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-sm"
            >
              {docLoading ? 'Submitting...' : 'Upload for Verification'}
            </button>
          </div>
        </form>
      </Modal>

      {/* --- MODAL 4: ADMIN DOCUMENT REVIEW --- */}
      {verifyDocModal && (
        <Modal
          isOpen={Boolean(verifyDocModal)}
          onClose={() => setVerifyDocModal(null)}
          title="HR Document Verification"
        >
          <form onSubmit={handleAdminVerifyDocument} className="space-y-4 text-xs">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <p className="font-bold text-slate-900">{verifyDocModal.document_name}</p>
              <p className="text-slate-500">{verifyDocModal.category} • {verifyDocModal.file_size}</p>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Verification Status <span className="text-rose-500 font-bold">*</span>
              </label>
              <select
                value={verifyStatus}
                onChange={(e) => setVerifyStatus(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
              >
                <option value="Verified">Verified (Approved)</option>
                <option value="Rejected">Rejected</option>
              </select>
            </div>

            {verifyStatus === 'Rejected' && (
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Rejection Reason <span className="text-rose-500 font-bold">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="e.g. Document is not readable. Please upload a clearer copy."
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                />
              </div>
            )}

            <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setVerifyDocModal(null)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={verifyLoading}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-sm"
              >
                {verifyLoading ? 'Saving...' : 'Confirm Status'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete Emergency Contact Confirm Dialog */}
      <ConfirmDialog
        isOpen={Boolean(deleteEmgId)}
        onClose={() => setDeleteEmgId(null)}
        onConfirm={handleDeleteEmgContact}
        title="Delete Emergency Contact"
        message="Are you sure you want to remove this emergency contact?"
        confirmText="Yes, Delete"
        danger={true}
      />

      {/* Delete Document Confirm Dialog */}
      <ConfirmDialog
        isOpen={Boolean(deleteDocId)}
        onClose={() => setDeleteDocId(null)}
        onConfirm={handleDeleteDocument}
        title="Delete Document"
        message="Are you sure you want to delete this document from your profile?"
        confirmText="Yes, Delete"
        danger={true}
      />
    </div>
  );
};

export default MyProfilePage;
