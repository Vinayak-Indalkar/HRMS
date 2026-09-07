import { formatDate } from '../../utils/formatters';
import React, { useState, useEffect, useMemo } from 'react';
import {
  UserPlus,
  Search,
  Edit2,
  UserX,
  UserCheck,
  Shield,
  Mail,
  Phone,
  CheckCircle2,
  X,
  ChevronDown,
  User,
  Briefcase,
  Users,
  Building2,
  MapPin,
  Calendar,
  AlertCircle,
  Sparkles,
  Info,
  Key,
  Copy,
  Check,
  Eye,
  EyeOff,
  RefreshCw
} from 'lucide-react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import Badge from '../../components/common/Badge';
import Modal from '../../components/common/Modal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import EmployeeProfileModal from './EmployeeProfileModal';

/**
 * Searchable Manager Selector Dropdown Component
 */
const ManagerSelect = ({
  label,
  required = false,
  value,
  onChange,
  managers = [],
  excludeId = null,
  search,
  setSearch,
  placeholder = 'Search & select manager...'
}) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const selectedManager = useMemo(() => {
    return managers.find((m) => m.id === value);
  }, [managers, value]);

  const filteredManagers = useMemo(() => {
    return managers.filter((m) => {
      if (excludeId && m.id === excludeId) return false;
      if (!search.trim()) return true;
      const s = search.toLowerCase();
      return (
        (m.name && m.name.toLowerCase().includes(s)) ||
        (m.designation && m.designation.toLowerCase().includes(s)) ||
        (m.department_name && m.department_name.toLowerCase().includes(s)) ||
        (m.employee_code && m.employee_code.toLowerCase().includes(s)) ||
        (m.email && m.email.toLowerCase().includes(s))
      );
    });
  }, [managers, excludeId, search]);

  return (
    <div className="space-y-1.5 relative">
      <div className="flex items-center justify-between">
        <label className="block font-semibold text-slate-700 text-xs">
          {label} {required && <span className="text-rose-500 font-bold">*</span>}
        </label>
        {value && !required && (
          <button
            type="button"
            onClick={() => onChange('')}
            className="text-[10px] text-slate-400 hover:text-rose-600 font-medium"
          >
            Clear selection
          </button>
        )}
      </div>

      {selectedManager ? (
        <div className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100/70 transition-colors">
          <div className="flex items-center gap-2.5 min-w-0">
            <img
              src={selectedManager.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedManager.name}`}
              alt={selectedManager.name}
              className="w-8 h-8 rounded-full bg-white object-cover border border-slate-200 shrink-0"
            />
            <div className="min-w-0">
              <div className="font-bold text-slate-900 truncate text-xs">{selectedManager.name}</div>
              <div className="text-[10px] text-slate-500 truncate">
                {selectedManager.employee_code || 'ID'} • {selectedManager.designation || selectedManager.role} ({selectedManager.department_name || 'Dept'})
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="px-2.5 py-1 text-[11px] font-semibold text-indigo-600 bg-indigo-50/60 hover:bg-indigo-100 rounded-lg shrink-0 ml-2"
          >
            Change
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="w-full text-left p-2.5 bg-slate-50 hover:bg-slate-100/70 border border-slate-200 rounded-xl text-slate-400 text-xs flex items-center justify-between transition-colors"
        >
          <span>{placeholder}</span>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
        </button>
      )}

      {dropdownOpen && (
        <div className="absolute z-50 left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden text-xs animate-in fade-in">
          <div className="p-2.5 border-b border-slate-100 bg-slate-50/80">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                autoFocus
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name, code, or designation..."
                className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>
          <div className="max-h-52 overflow-y-auto divide-y divide-slate-50 p-1.5">
            {!required && (
              <div
                onClick={() => {
                  onChange('');
                  setDropdownOpen(false);
                }}
                className="p-2 hover:bg-slate-50 cursor-pointer rounded-xl text-slate-500 font-medium text-center text-xs"
              >
                None / Direct to Head
              </div>
            )}
            {filteredManagers.length === 0 ? (
              <div className="p-3 text-center text-slate-400 text-xs">No active managers found</div>
            ) : (
              filteredManagers.map((m) => (
                <div
                  key={m.id}
                  onClick={() => {
                    onChange(m.id);
                    setDropdownOpen(false);
                  }}
                  className={`flex items-center gap-2.5 p-2 rounded-xl cursor-pointer hover:bg-indigo-50/70 transition-colors ${
                    value === m.id ? 'bg-indigo-50 text-indigo-900 font-bold' : 'text-slate-800'
                  }`}
                >
                  <img
                    src={m.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${m.name}`}
                    alt={m.name}
                    className="w-7 h-7 rounded-full bg-slate-100 object-cover border border-slate-200 shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold truncate text-xs">{m.name}</div>
                    <div className="text-[10px] text-slate-400 truncate">
                      {m.employee_code} • {m.designation || m.role} • {m.department_name}
                    </div>
                  </div>
                  {value === m.id && <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export const EmployeeManagementPage = () => {
  const { isSuperAdmin, user: currentUser } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [managers, setManagers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  // Modals & Dialogs
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [statusConfirmTarget, setStatusConfirmTarget] = useState(null);

  // Confirmation dialog states
  const [addConfirmOpen, setAddConfirmOpen] = useState(false);
  const [editConfirmOpen, setEditConfirmOpen] = useState(false);
  const [unsavedConfirmOpen, setUnsavedConfirmOpen] = useState(false);
  const [pendingCloseModal, setPendingCloseModal] = useState(null); // 'add' | 'edit'

  // Success Notification & Newly created employee tracking
  const [successNotification, setSuccessNotification] = useState('');
  const [newlyCreatedId, setNewlyCreatedId] = useState(null);

  // Form active section tab ('all' | 'personal' | 'employment' | 'reporting')
  const [modalTab, setModalTab] = useState('all');

  // Password & Credentials State
  const [showPassword, setShowPassword] = useState(false);
  const [copiedField, setCopiedField] = useState(null);
  const [createdCredentials, setCreatedCredentials] = useState(null);

  const generateRandomPassword = () => {
    const chars = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%&*';
    let pwd = 'HR@';
    for (let i = 0; i < 6; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return pwd;
  };

  const generateOfficialEmail = (firstName, lastName) => {
    const f = (firstName || '').toLowerCase().trim().replace(/[^a-z0-9]/g, '');
    const l = (lastName || '').toLowerCase().trim().replace(/[^a-z0-9]/g, '');
    if (!f && !l) return '';
    if (f && l) return `${f}.${l}@quantiratech.com`;
    return `${f || l}@quantiratech.com`;
  };

  const handleCopyText = (text, fieldKey) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedField(fieldKey);
      setTimeout(() => setCopiedField(null), 3000);
    }
  };

  // Form State
  const initialForm = {
    first_name: '',
    middle_name: '',
    last_name: '',
    preferred_name: '',
    personal_email: '',
    official_email: '',
    password: '',
    mobile_number: '',
    dob: '',
    gender: 'Male',
    avatar_url: '',
    employee_code: '',
    department_id: '',
    designation: '',
    job_title: '',
    employment_type: 'Full-time Regular',
    employment_status: 'active',
    joining_date: new Date().toISOString().split('T')[0],
    work_location: 'Headquarters (Hybrid)',
    reporting_manager_line_1_id: '',
    reporting_manager_line_2_id: '',
    role: 'employee',
    roles: ['employee'],
    blood_group: 'O+',
    address: '',
    emergency_contact: ''
  };

  const [formData, setFormData] = useState(initialForm);
  const [initialSnapshot, setInitialSnapshot] = useState(JSON.stringify(initialForm));
  const [editingId, setEditingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Manager Search Dropdowns State
  const [line1Search, setLine1Search] = useState('');
  const [line2Search, setLine2Search] = useState('');

  const isFormDirty = () => {
    return JSON.stringify(formData) !== initialSnapshot;
  };

  const fetchEmployees = async (newId = null) => {
    setLoading(true);
    try {
      const [list, depts, mgrs] = await Promise.all([
        api.getAllEmployees({ search, department_id: selectedDept, status: selectedStatus }),
        api.getDepartments(),
        api.getManagers()
      ]);
      setEmployees(list || []);
      setDepartments(depts || []);
      setManagers(mgrs || []);
      if (!formData.department_id && depts.length > 0) {
        setFormData((prev) => ({ ...prev, department_id: depts[0].id }));
      }
      if (newId) {
        setNewlyCreatedId(newId);
        setTimeout(() => setNewlyCreatedId(null), 15000);
      }
    } catch (err) {
      console.error('Failed to load employee list:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, [search, selectedDept, selectedStatus]);

  const generateEmployeeCode = () => {
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    return `EMP-${randomNum}`;
  };

  const handleOpenAdd = () => {
    const defaultPwd = generateRandomPassword();
    const fresh = {
      ...initialForm,
      department_id: departments[0]?.id || 'dept_eng',
      employee_code: generateEmployeeCode(),
      password: defaultPwd,
      avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${Math.random().toString(36).substring(7)}`
    };
    setFormData(fresh);
    setInitialSnapshot(JSON.stringify(fresh));
    setFormError('');
    setLine1Search('');
    setLine2Search('');
    setModalTab('all');
    setShowPassword(false);
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (emp) => {
    setEditingId(emp.id);
    const populated = {
      first_name: emp.first_name || emp.name?.split(' ')[0] || '',
      middle_name: emp.middle_name || '',
      last_name: emp.last_name || emp.name?.split(' ').slice(1).join(' ') || '',
      preferred_name: emp.preferred_name || emp.first_name || '',
      personal_email: emp.personal_email || '',
      official_email: emp.email || '',
      mobile_number: emp.phone || emp.personal_mobile || '',
      dob: emp.dob || '',
      gender: emp.gender || 'Male',
      avatar_url: emp.avatar_url || '',
      employee_code: emp.employee_code || '',
      department_id: emp.department_id || departments[0]?.id || '',
      designation: emp.designation || '',
      job_title: emp.job_title || emp.designation || '',
      employment_type: emp.employment_type || 'Full-time Regular',
      employment_status: emp.status || 'active',
      joining_date: emp.joining_date || '',
      work_location: emp.work_location || 'Headquarters (Hybrid)',
      reporting_manager_line_1_id: emp.reporting_manager_line_1_id || emp.manager_id || '',
      reporting_manager_line_2_id: emp.reporting_manager_line_2_id || '',
      role: emp.role || 'employee',
      roles: Array.isArray(emp.roles) && emp.roles.length > 0 ? emp.roles : [emp.role || 'employee'],
      blood_group: emp.blood_group || 'O+',
      address: emp.address || '',
      emergency_contact: emp.emergency_contact || ''
    };
    setFormData(populated);
    setInitialSnapshot(JSON.stringify(populated));
    setFormError('');
    setLine1Search('');
    setLine2Search('');
    setModalTab('all');
    setIsEditModalOpen(true);
  };

  // Close with unsaved changes verification
  const handleRequestClose = (modalType) => {
    if (isFormDirty()) {
      setPendingCloseModal(modalType);
      setUnsavedConfirmOpen(true);
    } else {
      if (modalType === 'add') setIsAddModalOpen(false);
      if (modalType === 'edit') setIsEditModalOpen(false);
    }
  };

  const handleConfirmDiscardChanges = () => {
    setUnsavedConfirmOpen(false);
    if (pendingCloseModal === 'add') setIsAddModalOpen(false);
    if (pendingCloseModal === 'edit') setIsEditModalOpen(false);
    setPendingCloseModal(null);
  };

  // Validate form before opening Confirmation Dialog
  const validateForm = (isEdit = false) => {
    if (!formData.first_name.trim()) return 'First Name is required.';
    if (!formData.last_name.trim()) return 'Last Name is required.';
    if (!formData.official_email.trim()) return 'Official Work Email is required.';
    if (!formData.department_id) return 'Please select a Department.';
    if (!formData.designation.trim()) return 'Designation is required.';
    if (!formData.joining_date) return 'Date of Joining is required.';
    if (!formData.reporting_manager_line_1_id) return 'Reporting Manager — Line 1 is required.';

    // Email format check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.official_email.trim())) {
      return 'Please enter a valid Official Email format (e.g. name@company.com).';
    }

    // Line 1 & Line 2 manager conflict
    if (formData.reporting_manager_line_1_id && formData.reporting_manager_line_2_id) {
      if (formData.reporting_manager_line_1_id === formData.reporting_manager_line_2_id) {
        return 'Reporting Manager Line 1 and Line 2 cannot be the same person.';
      }
    }

    // Edit specific: cannot be own manager
    if (isEdit) {
      if (formData.reporting_manager_line_1_id === editingId || formData.reporting_manager_line_2_id === editingId) {
        return 'An employee cannot be selected as their own reporting manager.';
      }
    } else {
      if (!formData.password || !formData.password.trim()) {
        return 'Portal Login Password is required. Click "Regenerate" or enter a secure password.';
      }
    }

    return null;
  };

  const handlePromptAddConfirm = (e) => {
    e.preventDefault();
    setFormError('');
    const err = validateForm(false);
    if (err) {
      setFormError(err);
      if (err.includes('Designation') || err.includes('Department') || err.includes('Joining')) {
        if (modalTab !== 'all' && modalTab !== 'employment') setModalTab('employment');
      } else if (err.includes('Manager')) {
        if (modalTab !== 'all' && modalTab !== 'reporting') setModalTab('reporting');
      }
      return;
    }
    setAddConfirmOpen(true);
  };

  const handlePromptEditConfirm = (e) => {
    e.preventDefault();
    setFormError('');
    const err = validateForm(true);
    if (err) {
      setFormError(err);
      if (err.includes('Designation') || err.includes('Department') || err.includes('Joining')) {
        if (modalTab !== 'all' && modalTab !== 'employment') setModalTab('employment');
      } else if (err.includes('Manager')) {
        if (modalTab !== 'all' && modalTab !== 'reporting') setModalTab('reporting');
      }
      return;
    }
    setEditConfirmOpen(true);
  };

  const handleConfirmAddEmployee = async () => {
    setSubmitting(true);
    setFormError('');
    try {
      const payload = {
        ...formData,
        name: `${formData.first_name.trim()} ${formData.last_name.trim()}`,
        email: formData.official_email.trim(),
        password: formData.password || 'password123',
        phone: formData.mobile_number.trim(),
        manager_id: formData.reporting_manager_line_1_id
      };
      const res = await api.createEmployee(payload);
      setAddConfirmOpen(false);
      setIsAddModalOpen(false);

      // Save created credentials to show modal popup
      setCreatedCredentials({
        name: `${formData.first_name.trim()} ${formData.last_name.trim()}`,
        employee_code: res.employee?.employee_code || formData.employee_code,
        email: formData.official_email.trim(),
        password: formData.password || res.temporary_password || 'password123',
        role: formData.role
      });

      setSuccessNotification(res.message || `Employee ${formData.first_name} ${formData.last_name} has been added successfully.`);
      await fetchEmployees(res.employee?.id);
    } catch (err) {
      setAddConfirmOpen(false);
      setFormError(err.message || 'Failed to create employee');
    } finally {
      setSubmitting(false);
    }
  };


  const handleConfirmEditEmployee = async () => {
    setSubmitting(true);
    setFormError('');
    try {
      const res = await api.updateEmployee(editingId, {
        ...formData,
        name: `${formData.first_name.trim()} ${formData.last_name.trim()}`,
        email: formData.official_email.trim(),
        phone: formData.mobile_number.trim(),
        manager_id: formData.reporting_manager_line_1_id,
        status: formData.employment_status
      });
      setEditConfirmOpen(false);
      setIsEditModalOpen(false);
      setSuccessNotification(res.message || 'Employee updated successfully.');
      await fetchEmployees();
    } catch (err) {
      setEditConfirmOpen(false);
      setFormError(err.message || 'Failed to update employee');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!statusConfirmTarget) return;
    const newStatus = statusConfirmTarget.status === 'active' ? 'inactive' : 'active';
    try {
      await api.toggleEmployeeStatus(statusConfirmTarget.id, newStatus);
      setStatusConfirmTarget(null);
      setSuccessNotification(`Employee status changed to ${newStatus}`);
      await fetchEmployees();
    } catch (err) {
      alert(err.message);
    }
  };

  const l1MgrObj = managers.find((m) => m.id === formData.reporting_manager_line_1_id);
  const l2MgrObj = managers.find((m) => m.id === formData.reporting_manager_line_2_id);
  const deptObj = departments.find((d) => d.id === formData.department_id);

  // Shared Form Fields renderer for both Add and Edit modals
  const renderFormContent = (isEdit = false) => {
    const isAll = modalTab === 'all';

    return (
      <div className="space-y-4">
        {/* Datalist for Designation Autocomplete Suggestions */}
        <datalist id="designation-suggestions">
          <option value="Software Engineer" />
          <option value="Senior Software Engineer" />
          <option value="Lead Software Engineer" />
          <option value="Staff Backend Architect" />
          <option value="Frontend Developer" />
          <option value="Fullstack Developer" />
          <option value="DevOps Engineer" />
          <option value="Cloud Architect" />
          <option value="QA Specialist" />
          <option value="QA Engineer" />
          <option value="UI/UX Designer" />
          <option value="Product Designer" />
          <option value="Product Manager" />
          <option value="Associate Product Manager" />
          <option value="Engineering Manager" />
          <option value="HR Generalist" />
          <option value="HR Executive" />
          <option value="HR Operations Director" />
          <option value="Talent Acquisition Specialist" />
          <option value="Operations Lead" />
          <option value="Business Analyst" />
          <option value="Finance Lead" />
          <option value="Senior Account Executive" />
          <option value="Sales Director" />
          <option value="Marketing Lead" />
        </datalist>

        {/* Tab Navigation inside Modal */}
        <div className="flex items-center gap-1 border-b border-slate-200 pb-2 overflow-x-auto">
          <button
            type="button"
            onClick={() => setModalTab('all')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
              modalTab === 'all'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>All Sections</span>
          </button>
          <button
            type="button"
            onClick={() => setModalTab('personal')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
              modalTab === 'personal'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Personal Information</span>
          </button>
          <button
            type="button"
            onClick={() => setModalTab('employment')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
              modalTab === 'employment'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Briefcase className="w-3.5 h-3.5" />
            <span>Employment & Designation</span>
          </button>
          <button
            type="button"
            onClick={() => setModalTab('reporting')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
              modalTab === 'reporting'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Reporting & System Access</span>
          </button>
        </div>

        {formError && (
          <div className="p-3 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 flex items-start gap-2 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
            <span>{formError}</span>
          </div>
        )}

        {/* Section 1: Personal Information */}
        {(isAll || modalTab === 'personal') && (
          <div className={`space-y-3.5 ${isAll ? 'p-3.5 bg-slate-50/70 border border-slate-200/80 rounded-2xl' : 'animate-in fade-in'}`}>
            {isAll && (
              <div className="flex items-center gap-2 pb-1.5 border-b border-slate-200/60">
                <User className="w-4 h-4 text-indigo-600" />
                <h3 className="font-bold text-slate-800 text-xs tracking-tight">1. Personal Information</h3>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  First Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.first_name}
                  onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                  placeholder="e.g. John"
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  required
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Middle Name</label>
                <input
                  type="text"
                  value={formData.middle_name}
                  onChange={(e) => setFormData({ ...formData, middle_name: e.target.value })}
                  placeholder="e.g. William"
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Last Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.last_name}
                  onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                  placeholder="e.g. Doe"
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Preferred Name</label>
                <input
                  type="text"
                  value={formData.preferred_name}
                  onChange={(e) => setFormData({ ...formData, preferred_name: e.target.value })}
                  placeholder="e.g. Johnny"
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-semibold text-slate-700">
                    Official Work Email <span className="text-rose-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const gen = generateOfficialEmail(formData.first_name, formData.last_name);
                      if (!gen) {
                        setFormError('Please enter First Name and Last Name first to generate official email.');
                      } else {
                        setFormData((prev) => ({ ...prev, official_email: gen }));
                        setFormError('');
                      }
                    }}
                    className="text-[11px] text-indigo-600 hover:text-indigo-800 flex items-center gap-1 font-semibold hover:underline"
                    title="Generate official work email based on First and Last name"
                  >
                    <Sparkles className="w-3 h-3 text-indigo-500" />
                    <span>Generate Email</span>
                  </button>
                </div>
                <input
                  type="email"
                  value={formData.official_email}
                  onChange={(e) => setFormData({ ...formData, official_email: e.target.value })}
                  placeholder="e.g. john.doe@quantiratech.com"
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Personal Email</label>
                <input
                  type="email"
                  value={formData.personal_email}
                  onChange={(e) => setFormData({ ...formData, personal_email: e.target.value })}
                  placeholder="john.personal@gmail.com"
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Mobile Number</label>
                <input
                  type="text"
                  value={formData.mobile_number}
                  onChange={(e) => setFormData({ ...formData, mobile_number: e.target.value })}
                  placeholder="+1 (555) 019-2834"
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Date of Birth</label>
                <input
                  type="date"
                  value={formData.dob}
                  onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Gender</label>
                <select
                  value={formData.gender}
                  onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Non-Binary">Non-Binary</option>
                  <option value="Prefer not to say">Prefer not to say</option>
                </select>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-semibold text-slate-700">Profile Photo URL</label>
                  <button
                    type="button"
                    onClick={() =>
                      setFormData({
                        ...formData,
                        avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${Math.random().toString(36).substring(7)}`
                      })
                    }
                    className="text-[11px] text-indigo-600 hover:text-indigo-800 flex items-center gap-1 font-semibold"
                  >
                    <Sparkles className="w-3 h-3" />
                    Random Avatar
                  </button>
                </div>
                <input
                  type="text"
                  value={formData.avatar_url}
                  onChange={(e) => setFormData({ ...formData, avatar_url: e.target.value })}
                  placeholder="https://..."
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* If focused on personal tab only, also provide immediate Designation entry */}
            {!isAll && (
              <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-xl space-y-2 mt-2">
                <div className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
                  <Briefcase className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Job Role & Designation</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Department <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={formData.department_id}
                      onChange={(e) => setFormData({ ...formData, department_id: e.target.value })}
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                      {departments.map((d) => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Designation <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      list="designation-suggestions"
                      value={formData.designation}
                      onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                      placeholder="e.g. Senior Software Engineer"
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      required
                    />
                  </div>
                </div>
                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setModalTab('employment')}
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                  >
                    Next: Employment Details &rarr;
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Section 2: Employment Details & Designation */}
        {(isAll || modalTab === 'employment') && (
          <div className={`space-y-3.5 ${isAll ? 'p-3.5 bg-slate-50/70 border border-slate-200/80 rounded-2xl' : 'animate-in fade-in'}`}>
            {isAll && (
              <div className="flex items-center justify-between pb-1.5 border-b border-slate-200/60">
                <div className="flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-indigo-600" />
                  <h3 className="font-bold text-slate-800 text-xs tracking-tight">2. Employment & Designation Details</h3>
                </div>
                <span className="text-[11px] font-semibold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-md">
                  Designation Required
                </span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Employee ID / Code</label>
                <input
                  type="text"
                  value={formData.employee_code}
                  onChange={(e) => setFormData({ ...formData, employee_code: e.target.value })}
                  placeholder="e.g. EMP-1042"
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Department <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formData.department_id}
                  onChange={(e) => setFormData({ ...formData, department_id: e.target.value })}
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-semibold text-slate-700">
                    Designation <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[10px] text-slate-400 font-normal">Pick or type</span>
                </div>
                <input
                  type="text"
                  list="designation-suggestions"
                  value={formData.designation}
                  onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                  placeholder="e.g. Senior Software Engineer"
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium text-slate-900"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Job Title</label>
                <input
                  type="text"
                  value={formData.job_title}
                  onChange={(e) => setFormData({ ...formData, job_title: e.target.value })}
                  placeholder="e.g. Fullstack Engineer"
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Employment Type</label>
                <select
                  value={formData.employment_type}
                  onChange={(e) => setFormData({ ...formData, employment_type: e.target.value })}
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="Full-time Regular">Full-time Regular</option>
                  <option value="Full-time Contract">Full-time Contract</option>
                  <option value="Part-time">Part-time</option>
                  <option value="Intern">Intern</option>
                  <option value="Consultant">Consultant</option>
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Employment Status</label>
                <select
                  value={formData.employment_status}
                  onChange={(e) => setFormData({ ...formData, employment_status: e.target.value })}
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="active">Active</option>
                  <option value="probation">Probation</option>
                  <option value="notice_period">Notice Period</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Date of Joining <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.joining_date}
                  onChange={(e) => setFormData({ ...formData, joining_date: e.target.value })}
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  required
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Work Location</label>
                <select
                  value={formData.work_location}
                  onChange={(e) => setFormData({ ...formData, work_location: e.target.value })}
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="Headquarters (Hybrid)">Headquarters (Hybrid)</option>
                  <option value="Remote - Domestic">Remote - Domestic</option>
                  <option value="Remote - International">Remote - International</option>
                  <option value="Branch Office">Branch Office</option>
                </select>
              </div>
            </div>

            {!isAll && (
              <div className="pt-2 flex items-center justify-between border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalTab('personal')}
                  className="text-xs font-semibold text-slate-600 hover:text-slate-800"
                >
                  &larr; Back: Personal Information
                </button>
                <button
                  type="button"
                  onClick={() => setModalTab('reporting')}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                >
                  Next: Reporting Structure &rarr;
                </button>
              </div>
            )}
          </div>
        )}

        {/* Section 3: Reporting & System Access */}
        {(isAll || modalTab === 'reporting') && (
          <div className={`space-y-4 ${isAll ? 'p-3.5 bg-slate-50/70 border border-slate-200/80 rounded-2xl' : 'animate-in fade-in'}`}>
            {isAll && (
              <div className="flex items-center gap-2 pb-1.5 border-b border-slate-200/60">
                <Users className="w-4 h-4 text-indigo-600" />
                <h3 className="font-bold text-slate-800 text-xs tracking-tight">3. Reporting Hierarchy & System Role</h3>
              </div>
            )}

            <div className="bg-indigo-50/60 border border-indigo-100 rounded-2xl p-3 text-xs text-indigo-900 flex items-start gap-2.5">
              <Info className="w-4 h-4 shrink-0 text-indigo-600 mt-0.5" />
              <div>
                <span className="font-bold">Reporting Hierarchy Rules:</span> Line 1 is the direct day-to-day supervisor for attendance and initial leave approvals. Line 2 is the department head / skip-level manager.
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <ManagerSelect
                label="Reporting Manager — Line 1 (Direct)"
                required={true}
                value={formData.reporting_manager_line_1_id}
                onChange={(val) => setFormData({ ...formData, reporting_manager_line_1_id: val })}
                managers={managers}
                excludeId={isEdit ? editingId : null}
                search={line1Search}
                setSearch={setLine1Search}
                placeholder="Select Direct Line 1 Manager..."
              />

              <ManagerSelect
                label="Reporting Manager — Line 2 (Department Head / Skip-Level)"
                required={false}
                value={formData.reporting_manager_line_2_id}
                onChange={(val) => setFormData({ ...formData, reporting_manager_line_2_id: val })}
                managers={managers}
                excludeId={isEdit ? editingId : null}
                search={line2Search}
                setSearch={setLine2Search}
                placeholder="Select Line 2 Manager (Optional)..."
              />
            </div>

            <div className="space-y-3 pt-2 border-t border-slate-100">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Assigned Security Roles (Multi-Role Support)
                </label>
                <p className="text-[11px] text-slate-400 mb-2">
                  Select all roles this user can assume. The user can switch between their assigned roles via the top-right profile dropdown.
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'employee', label: 'Employee', desc: 'Self-service access' },
                    { id: 'manager', label: 'Manager', desc: 'Team & approvals' },
                    ...(isSuperAdmin ? [
                      { id: 'hr_admin', label: 'HR Admin', desc: 'HR management' },
                      { id: 'super_admin', label: 'Super Admin', desc: 'Universal control' }
                    ] : [])
                  ].map((r) => {
                    const currentRoles = Array.isArray(formData.roles) ? formData.roles : [formData.role || 'employee'];
                    const isChecked = currentRoles.includes(r.id);

                    return (
                      <label
                        key={r.id}
                        className={`p-2.5 rounded-xl border flex items-start gap-2 cursor-pointer transition-all select-none ${
                          isChecked
                            ? 'bg-indigo-50/80 border-indigo-300 text-indigo-950 font-bold'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            let nextRoles = [...currentRoles];
                            if (e.target.checked) {
                              if (!nextRoles.includes(r.id)) nextRoles.push(r.id);
                            } else {
                              if (nextRoles.length > 1) {
                                nextRoles = nextRoles.filter(x => x !== r.id);
                              }
                            }
                            const nextPrimary = nextRoles.includes(formData.role) ? formData.role : nextRoles[0];
                            setFormData(prev => ({
                              ...prev,
                              roles: nextRoles,
                              role: nextPrimary
                            }));
                          }}
                          className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        />
                        <div className="min-w-0">
                          <span className="text-xs block leading-tight">{r.label}</span>
                          <span className="text-[10px] text-slate-400 font-normal leading-tight block">{r.desc}</span>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Default / Primary Active Role</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium capitalize"
                  >
                    {(Array.isArray(formData.roles) && formData.roles.length > 0 ? formData.roles : [formData.role || 'employee']).map((rk) => (
                      <option key={rk} value={rk}>
                        {rk === 'super_admin' ? 'Super Admin' : rk === 'hr_admin' ? 'HR Admin' : rk === 'manager' ? 'Manager' : 'Employee'}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Blood Group</label>
                  <select
                    value={formData.blood_group}
                    onChange={(e) => setFormData({ ...formData, blood_group: e.target.value })}
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Emergency Contact</label>
                <input
                  type="text"
                  value={formData.emergency_contact}
                  onChange={(e) => setFormData({ ...formData, emergency_contact: e.target.value })}
                  placeholder="Name & Relationship: +1 (555) 000-0000"
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Residential Address</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Street address, City, Country"
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Portal Login Credentials for New Employee */}
            {!isEdit && (
              <div className="p-4 bg-gradient-to-br from-indigo-50/80 via-indigo-50/40 to-slate-50 border border-indigo-200/80 rounded-2xl space-y-3 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Key className="w-4 h-4 text-indigo-600" />
                    <h4 className="font-bold text-slate-900 text-xs tracking-tight">Portal Login Credentials</h4>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 border border-indigo-200/60">
                    Login Access
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  The employee will use this official email and password to log in to the portal. You can regenerate or copy credentials anytime.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Login Email
                    </label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        value={formData.official_email || 'Enter official email above'}
                        readOnly
                        className="flex-1 p-2 bg-white/90 border border-slate-200 rounded-xl text-xs font-mono text-slate-800 select-all"
                      />
                      {formData.official_email && (
                        <button
                          type="button"
                          onClick={() => handleCopyText(formData.official_email, 'email')}
                          className="p-2 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-600 hover:text-indigo-600 transition-colors shrink-0"
                          title="Copy Email"
                        >
                          {copiedField === 'email' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                        </button>
                      )}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-[11px] font-bold text-slate-700">
                        Portal Login Password <span className="text-rose-500">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          const newPwd = generateRandomPassword();
                          setFormData((prev) => ({ ...prev, password: newPwd }));
                        }}
                        className="text-[10px] text-indigo-600 hover:text-indigo-800 flex items-center gap-1 font-semibold"
                        title="Regenerate random secure password"
                      >
                        <RefreshCw className="w-3 h-3" />
                        <span>Regenerate</span>
                      </button>
                    </div>
                    <div className="flex items-center gap-1.5 relative">
                      <div className="relative flex-1">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={formData.password}
                          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                          placeholder="Generated secure password..."
                          className="w-full p-2 pr-8 bg-white border border-slate-200 rounded-xl text-xs font-mono text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-bold"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                          title={showPassword ? 'Hide password' : 'Show password'}
                        >
                          {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                      {formData.password && (
                        <button
                          type="button"
                          onClick={() => handleCopyText(formData.password, 'password')}
                          className="p-2 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-600 hover:text-indigo-600 transition-colors shrink-0"
                          title="Copy Password"
                        >
                          {copiedField === 'password' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Quick copy full login details */}
                {formData.official_email && formData.password && (
                  <div className="pt-2 flex items-center justify-between border-t border-indigo-100/80">
                    <span className="text-[10px] text-slate-500">
                      Auto-generated for employee onboarding
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const text = `HRMS Portal Login Credentials:\nEmail: ${formData.official_email}\nPassword: ${formData.password}\nPortal URL: ${window.location.origin}`;
                        handleCopyText(text, 'all-creds');
                      }}
                      className="text-[11px] font-semibold text-indigo-700 hover:text-indigo-900 flex items-center gap-1.5 px-2.5 py-1 bg-white hover:bg-indigo-50 border border-indigo-200 rounded-lg transition-colors"
                    >
                      {copiedField === 'all-creds' ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-emerald-700">Credentials Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy Full Login Details</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            )}

            {!isAll && (
              <div className="pt-2 flex items-center justify-start border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalTab('employment')}
                  className="text-xs font-semibold text-slate-600 hover:text-slate-800"
                >
                  &larr; Back: Employment Details
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Success Notification Banner */}
      {successNotification && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center justify-between text-xs text-emerald-800 shadow-sm animate-in fade-in">
          <div className="flex items-center gap-2.5 font-medium">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{successNotification}</span>
          </div>
          <button
            onClick={() => setSuccessNotification('')}
            className="p-1 text-emerald-600 hover:bg-emerald-100 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Employee Management</h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Maintain employee roster, profiles, department roles, and user access
          </p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-md transition-all self-start sm:self-auto"
        >
          <UserPlus className="w-4 h-4" />
          <span>Add New Employee</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, or employee code..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div className="sm:w-56">
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none"
          >
            <option value="">All Departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>

        <div className="sm:w-44">
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none"
          >
            <option value="">All Statuses</option>
            <option value="active">Active Accounts</option>
            <option value="inactive">Inactive Accounts</option>
          </select>
        </div>
      </div>

      {/* Employees Table */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm">
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
          <h3 className="text-base font-bold text-slate-900">
            Workforce Directory ({employees.length})
          </h3>
        </div>

        {loading ? (
          <div className="py-16 flex justify-center">
            <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : employees.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400">
            No employees found matching the filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase tracking-wider">
                  <th className="pb-3">Employee</th>
                  <th className="pb-3">Role</th>
                  <th className="pb-3">Department</th>
                  <th className="pb-3">Reporting Hierarchy</th>
                  <th className="pb-3">Joining Date</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {employees.map((emp) => {
                  const isNewlyCreated = emp.id === newlyCreatedId;
                  return (
                    <tr
                      key={emp.id}
                      className={`transition-colors ${
                        isNewlyCreated ? 'bg-emerald-50/50 hover:bg-emerald-50/80' : 'hover:bg-slate-50/80'
                      }`}
                    >
                      <td className="py-3.5">
                        <div className="flex items-center gap-3">
                          <img
                            src={emp.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${emp.name}`}
                            alt={emp.name}
                            className="w-9 h-9 rounded-full bg-slate-100 object-cover border border-slate-200"
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <span
                                onClick={() => setSelectedProfile(emp)}
                                className="font-bold text-slate-900 hover:text-indigo-600 cursor-pointer block text-xs"
                              >
                                {emp.name}
                              </span>
                              {isNewlyCreated && (
                                <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300 animate-pulse">
                                  NEW
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-slate-400">
                              {emp.employee_code} • {emp.designation}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${
                            emp.role === 'super_admin'
                              ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                              : emp.role === 'hr_admin'
                              ? 'bg-purple-50 text-purple-700 border-purple-200'
                              : emp.role === 'manager'
                              ? 'bg-sky-50 text-sky-700 border-sky-200'
                              : 'bg-slate-100 text-slate-700 border-slate-200'
                          }`}
                        >
                          {emp.role === 'super_admin'
                            ? 'Super Admin'
                            : emp.role === 'hr_admin'
                            ? 'HR Admin'
                            : emp.role === 'manager'
                            ? 'Manager'
                            : 'Employee'}
                        </span>
                      </td>
                      <td className="py-3.5 text-slate-700 font-medium">{emp.department_name}</td>
                      <td className="py-3.5 text-slate-600">
                        <div className="font-semibold text-slate-800">
                          {emp.reporting_manager_line_1_name || emp.manager_name || 'None'}
                        </div>
                        {emp.reporting_manager_line_2_name && emp.reporting_manager_line_2_name !== 'None' && (
                          <div className="text-[10px] text-slate-400 font-normal">
                            L2: {emp.reporting_manager_line_2_name}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 text-slate-500">{formatDate(emp.joining_date)}</td>
                      <td className="py-3.5">
                        <Badge variant={emp.status}>{emp.status}</Badge>
                      </td>
                      <td className="py-3.5 text-right space-x-1.5 whitespace-nowrap">
                        {/* Only Super Admin can edit Super Admin */}
                        {emp.role === 'super_admin' && !isSuperAdmin ? (
                          <span className="text-[10px] text-slate-400 italic px-2">Protected</span>
                        ) : (
                          <>
                            <button
                              onClick={() => handleOpenEdit(emp)}
                              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors"
                              title="Edit Details"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            {emp.role !== 'super_admin' && (
                              <button
                                onClick={() => setStatusConfirmTarget(emp)}
                                className={`p-1.5 rounded-lg border transition-colors ${
                                  emp.status === 'active'
                                    ? 'border-rose-200 text-rose-600 hover:bg-rose-50'
                                    : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'
                                }`}
                                title={emp.status === 'active' ? 'Deactivate Account' : 'Activate Account'}
                              >
                                {emp.status === 'active' ? (
                                  <UserX className="w-3.5 h-3.5" />
                                ) : (
                                  <UserCheck className="w-3.5 h-3.5" />
                                )}
                              </button>
                            )}
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Employee Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => handleRequestClose('add')}
        title="Add New Employee"
        maxWidth="max-w-3xl"
      >
        <form onSubmit={handlePromptAddConfirm} className="space-y-4 text-xs">
          {renderFormContent(false)}

          <div className="pt-3 flex items-center justify-between border-t border-slate-100">
            <div className="text-[11px] text-slate-400">
              * A pre-submission confirmation will review the details before saving.
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleRequestClose('add')}
                className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl font-medium hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold shadow-sm transition-all"
              >
                Continue to Review
              </button>
            </div>
          </div>
        </form>
      </Modal>

      {/* Edit Employee Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => handleRequestClose('edit')}
        title="Edit Employee Profile"
        maxWidth="max-w-3xl"
      >
        <form onSubmit={handlePromptEditConfirm} className="space-y-4 text-xs">
          {renderFormContent(true)}

          <div className="pt-3 flex items-center justify-between border-t border-slate-100">
            <div className="text-[11px] text-slate-400">
              Changes to department, designation, or managers will be recorded in employment history.
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleRequestClose('edit')}
                className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl font-medium hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold shadow-sm transition-all"
              >
                Review & Save Changes
              </button>
            </div>
          </div>
        </form>
      </Modal>

      {/* Profile Details Modal */}
      <EmployeeProfileModal
        employee={selectedProfile}
        isOpen={!!selectedProfile}
        onClose={() => setSelectedProfile(null)}
      />

      {/* Confirmation Dialog for Status Toggle */}
      <ConfirmDialog
        isOpen={!!statusConfirmTarget}
        onClose={() => setStatusConfirmTarget(null)}
        onConfirm={handleToggleStatus}
        title={`${statusConfirmTarget?.status === 'active' ? 'Deactivate' : 'Activate'} Employee Account`}
        message={
          statusConfirmTarget?.status === 'active'
            ? `Are you sure you want to deactivate ${statusConfirmTarget?.name}? They will immediately lose access to log into the HRMS portal.`
            : `Are you sure you want to reactivate ${statusConfirmTarget?.name}'s account? They will be able to log in again.`
        }
        danger={statusConfirmTarget?.status === 'active'}
        confirmText={statusConfirmTarget?.status === 'active' ? 'Deactivate Account' : 'Activate Account'}
      />

      {/* Confirmation Dialog for Add Employee */}
      <ConfirmDialog
        isOpen={addConfirmOpen}
        onClose={() => setAddConfirmOpen(false)}
        onConfirm={handleConfirmAddEmployee}
        title="Confirm New Employee Creation"
        description="Please review the employee summary below. Upon confirmation, their profile will be created and access credentials generated."
        details={[
          { label: 'Full Name', value: `${formData.first_name} ${formData.last_name}` },
          { label: 'Official Email', value: formData.official_email },
          { label: 'Employee ID', value: formData.employee_code || 'Auto-generated' },
          { label: 'Department', value: deptObj?.name || 'General' },
          { label: 'Designation', value: formData.designation },
          {
            label: 'Reporting Manager — Line 1',
            value: l1MgrObj ? `${l1MgrObj.name} (${l1MgrObj.designation || l1MgrObj.role})` : 'None'
          },
          {
            label: 'Reporting Manager — Line 2',
            value: l2MgrObj ? `${l2MgrObj.name} (${l2MgrObj.designation || l2MgrObj.role})` : 'None'
          },
          { label: 'Joining Date', value: formatDate(formData.joining_date) },
          { label: 'Work Location', value: formData.work_location }
        ]}
        confirmText="Confirm & Create Employee"
        variant="primary"
        loading={submitting}
      />

      {/* Confirmation Dialog for Edit Employee */}
      <ConfirmDialog
        isOpen={editConfirmOpen}
        onClose={() => setEditConfirmOpen(false)}
        onConfirm={handleConfirmEditEmployee}
        title="Confirm Employee Updates"
        description="Are you sure you want to save these profile changes? Any modifications to Department, Designation, or Reporting Hierarchy will be automatically recorded in the official Employment History and Audit Log."
        details={[
          { label: 'Employee', value: `${formData.first_name} ${formData.last_name}` },
          { label: 'Department', value: deptObj?.name || 'General' },
          { label: 'Designation', value: formData.designation },
          {
            label: 'Reporting Manager — Line 1',
            value: l1MgrObj ? `${l1MgrObj.name} (${l1MgrObj.designation || l1MgrObj.role})` : 'None'
          },
          {
            label: 'Reporting Manager — Line 2',
            value: l2MgrObj ? `${l2MgrObj.name} (${l2MgrObj.designation || l2MgrObj.role})` : 'None'
          },
          { label: 'Employment Status', value: formData.employment_status }
        ]}
        confirmText="Save Updates"
        variant="primary"
        loading={submitting}
      />

      {/* Confirmation Dialog for Unsaved Changes */}
      <ConfirmDialog
        isOpen={unsavedConfirmOpen}
        onClose={() => setUnsavedConfirmOpen(false)}
        onConfirm={handleConfirmDiscardChanges}
        title="Discard Unsaved Changes?"
        message="You have unsaved changes in this form. Are you sure you want to close and discard your edits?"
        warningMessage="All unsaved input will be permanently lost."
        confirmText="Discard Changes"
        cancelText="Stay on Page"
        danger={true}
      />

      {/* Newly Created Employee Portal Credentials Modal */}
      {createdCredentials && (
        <Modal
          isOpen={!!createdCredentials}
          onClose={() => setCreatedCredentials(null)}
          title="Employee Portal Credentials Generated"
          size="md"
        >
          <div className="space-y-4">
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start gap-3">
              <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-emerald-950 text-sm">Employee Account Created Successfully!</h4>
                <p className="text-xs text-emerald-800 mt-0.5">
                  <strong>{createdCredentials.name}</strong> ({createdCredentials.employee_code}) has been added. Provide the login credentials below to the employee.
                </p>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3 font-mono text-xs">
              <div>
                <span className="text-[10px] font-sans font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                  HRMS Portal URL
                </span>
                <div className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-800 break-all select-all font-medium">
                  {window.location.origin}
                </div>
              </div>
              <div>
                <span className="text-[10px] font-sans font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                  Login Email
                </span>
                <div className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-900 font-bold select-all flex items-center justify-between">
                  <span>{createdCredentials.email}</span>
                  <button
                    type="button"
                    onClick={() => handleCopyText(createdCredentials.email, 'modal-email')}
                    className="text-slate-400 hover:text-indigo-600 ml-2"
                    title="Copy email"
                  >
                    {copiedField === 'modal-email' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <span className="text-[10px] font-sans font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                  Portal Login Password
                </span>
                <div className="p-2.5 bg-white border border-slate-200 rounded-xl text-indigo-700 font-bold select-all flex items-center justify-between">
                  <span>{createdCredentials.password}</span>
                  <button
                    type="button"
                    onClick={() => handleCopyText(createdCredentials.password, 'modal-password')}
                    className="text-slate-400 hover:text-indigo-600 ml-2"
                    title="Copy password"
                  >
                    {copiedField === 'modal-password' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  const text = `Quantira HRMS Login Credentials:\nName: ${createdCredentials.name} (${createdCredentials.employee_code})\nEmail: ${createdCredentials.email}\nPassword: ${createdCredentials.password}\nPortal URL: ${window.location.origin}`;
                  handleCopyText(text, 'modal-copy-all');
                }}
                className="w-full sm:w-auto px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-sm transition-colors"
              >
                {copiedField === 'modal-copy-all' ? (
                  <>
                    <Check className="w-4 h-4 text-white" />
                    <span>Copied Credentials!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Copy Full Login Details</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => setCreatedCredentials(null)}
                className="w-full sm:w-auto px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default EmployeeManagementPage;
