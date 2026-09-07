import React, { useState, useEffect, useMemo } from 'react';
import {
  ClipboardList,
  Plus,
  Search,
  Filter,
  Users,
  Building2,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Edit2,
  Award,
  ChevronDown,
  Sparkles,
  Layers
} from 'lucide-react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { formatDate } from '../../utils/formatters';
import Badge from '../../components/common/Badge';
import Modal from '../../components/common/Modal';
import ConfirmDialog from '../../components/common/ConfirmDialog';

export const KPIAssignmentsPage = () => {
  const { user } = useAuth();
  const role = user?.role || 'employee';
  const isAdmin = ['super_admin', 'hr_admin', 'admin'].includes(role);
  const isManager = role === 'manager';

  const [assignments, setAssignments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [periods, setPeriods] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState('');
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  // Modals
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [assignMode, setAssignMode] = useState('single'); // 'single' | 'bulk'
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Edit Assignment Modal
  const [editingAsgn, setEditingAsgn] = useState(null);
  const [editTargetValue, setEditTargetValue] = useState('');
  const [editWeightage, setEditWeightage] = useState('');

  // Single Assignment Form
  const [formData, setFormData] = useState({
    employee_id: '',
    kpi_template_id: '',
    kpi_period_id: '',
    target_value: '',
    weightage: 25,
    start_date: '',
    end_date: ''
  });

  // Bulk Assignment Form
  const [bulkData, setBulkData] = useState({
    kpi_template_id: '',
    kpi_period_id: '',
    department_id: '',
    designation: '',
    weightage: 25
  });

  // Employee search state inside assignment modal
  const [empSearch, setEmpSearch] = useState('');
  const [empDropdownOpen, setEmpDropdownOpen] = useState(false);

  const fetchRosterData = async () => {
    setLoading(true);
    try {
      const [asgns, emps, tmpls, prds, depts] = await Promise.all([
        api.getKpiAssignments(),
        api.getAllEmployees(),
        api.getKpiTemplates(),
        api.getKpiPeriods(),
        api.getDepartments()
      ]);
      setAssignments(asgns || []);
      setEmployees(emps || []);
      setTemplates((tmpls || []).filter((t) => t.status === 'active'));
      setPeriods(prds || []);
      setDepartments(depts || []);

      if (prds && prds.length > 0 && !selectedPeriod) {
        const activeP = prds.find((p) => p.status === 'active') || prds[0];
        setSelectedPeriod(activeP.id);
        setFormData((prev) => ({ ...prev, kpi_period_id: activeP.id }));
        setBulkData((prev) => ({ ...prev, kpi_period_id: activeP.id }));
      }
    } catch (err) {
      console.error('Failed to load assignments:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRosterData();
  }, []);

  // Filter employees available to manager (team only) or admin (all)
  const assignableEmployees = useMemo(() => {
    if (isAdmin) return employees;
    if (isManager) {
      return employees.filter(
        (e) =>
          e.id !== user.id &&
          (e.reporting_manager_line_1_id === user.id ||
            e.reporting_manager_line_2_id === user.id ||
            e.manager_id === user.id)
      );
    }
    return [];
  }, [employees, isAdmin, isManager, user]);

  const selectedEmployeeObj = useMemo(() => {
    return employees.find((e) => e.id === formData.employee_id);
  }, [employees, formData.employee_id]);

  const selectedTemplateObj = useMemo(() => {
    return templates.find((t) => t.id === formData.kpi_template_id);
  }, [templates, formData.kpi_template_id]);

  // Calculate current weightage for the selected employee in the selected period
  const employeeCurrentWeightage = useMemo(() => {
    if (!formData.employee_id || !formData.kpi_period_id) return 0;
    return assignments
      .filter((a) => a.employee_id === formData.employee_id && a.kpi_period_id === formData.kpi_period_id)
      .reduce((sum, a) => sum + (Number(a.weightage) || 0), 0);
  }, [assignments, formData.employee_id, formData.kpi_period_id]);

  const projectedTotalWeightage = employeeCurrentWeightage + Number(formData.weightage || 0);

  const handleOpenAssignModal = () => {
    setError('');
    const defaultEmp = assignableEmployees[0]?.id || '';
    const defaultTmpl = templates[0];
    const defaultPeriod = periods.find((p) => p.status === 'active') || periods[0];

    setFormData({
      employee_id: defaultEmp,
      kpi_template_id: defaultTmpl?.id || '',
      kpi_period_id: defaultPeriod?.id || '',
      target_value: defaultTmpl?.default_target || 100,
      weightage: defaultTmpl?.default_weightage || 25,
      start_date: defaultPeriod?.start_date || '',
      end_date: defaultPeriod?.end_date || ''
    });
    setAssignMode('single');
    setIsAssignModalOpen(true);
  };

  const handleTemplateSelect = (tmplId) => {
    const t = templates.find((item) => item.id === tmplId);
    if (t) {
      setFormData((prev) => ({
        ...prev,
        kpi_template_id: t.id,
        target_value: t.default_target,
        weightage: t.default_weightage
      }));
    }
  };

  const handlePromptAssign = (e) => {
    e.preventDefault();
    setError('');
    if (!formData.employee_id) {
      setError('Please select an employee');
      return;
    }
    if (!formData.kpi_template_id) {
      setError('Please select a KPI template');
      return;
    }
    if (projectedTotalWeightage > 100) {
      setError(`Total weightage cannot exceed 100% (Current: ${employeeCurrentWeightage}%, Added: ${formData.weightage}%)`);
      return;
    }
    setConfirmOpen(true);
  };

  const handleConfirmSingleAssign = async () => {
    setSubmitting(true);
    setError('');
    try {
      await api.createKpiAssignment(formData);
      setConfirmOpen(false);
      setIsAssignModalOpen(false);
      setSuccess(`KPI successfully assigned to ${selectedEmployeeObj?.name}.`);
      await fetchRosterData();
    } catch (err) {
      setError(err.message || 'Failed to assign KPI');
      setConfirmOpen(false);
    } finally {
      setSubmitting(false);
    }
  };

  const handlePromptBulk = (e) => {
    e.preventDefault();
    setError('');
    if (!bulkData.kpi_template_id || !bulkData.kpi_period_id) {
      setError('Template and Period are required for bulk assignment');
      return;
    }
    if (!bulkData.department_id && !bulkData.designation) {
      setError('Select either a Department or Designation for bulk targeting');
      return;
    }
    setBulkConfirmOpen(true);
  };

  const handleConfirmBulkAssign = async () => {
    setSubmitting(true);
    setError('');
    try {
      const res = await api.bulkAssignKpi(bulkData);
      setBulkConfirmOpen(false);
      setIsAssignModalOpen(false);
      setSuccess(res.message || 'Bulk assignment completed.');
      await fetchRosterData();
    } catch (err) {
      setError(err.message || 'Failed bulk assignment');
      setBulkConfirmOpen(false);
    } finally {
      setSubmitting(false);
    }
  };

  // Edit Assignment
  const handleOpenEditAsgn = (asgn) => {
    setEditingAsgn(asgn);
    setEditTargetValue(String(asgn.target_value));
    setEditWeightage(String(asgn.weightage));
  };

  const handleSaveEditAsgn = async (e) => {
    e.preventDefault();
    if (!editingAsgn) return;
    setSubmitting(true);
    try {
      await api.updateKpiAssignment(editingAsgn.id, {
        target_value: Number(editTargetValue),
        weightage: Number(editWeightage)
      });
      setEditingAsgn(null);
      setSuccess(`Updated target and weightage for ${editingAsgn.employee_name}.`);
      await fetchRosterData();
    } catch (err) {
      alert(err.message || 'Failed to update assignment');
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = assignments.filter((a) => {
    if (selectedPeriod && a.kpi_period_id !== selectedPeriod) return false;
    if (selectedDept && a.department_name !== selectedDept) return false;
    if (selectedStatus && a.status !== selectedStatus) return false;
    if (search) {
      const s = search.toLowerCase();
      return (
        a.kpi_name.toLowerCase().includes(s) ||
        a.employee_name.toLowerCase().includes(s) ||
        a.employee_code.toLowerCase().includes(s)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">KPI Assignments & Goals Roster</h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Allocate performance targets, maintain 100% cycle weightage, and monitor employee tracking
          </p>
        </div>
        {(isAdmin || isManager) && (
          <button
            onClick={handleOpenAssignModal}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-md transition-all self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Assign KPI</span>
          </button>
        )}
      </div>

      {success && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-medium text-emerald-800 flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Filter Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by employee, code, or KPI title..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div className="sm:w-56">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none"
          >
            <option value="">All Periods</option>
            {periods.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        <div className="sm:w-48">
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none"
          >
            <option value="">All Departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.name}>
                {d.name}
              </option>
            ))}
          </select>
        </div>

        <div className="sm:w-40">
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none"
          >
            <option value="">All Statuses</option>
            <option value="On Track">On Track</option>
            <option value="At Risk">At Risk</option>
            <option value="Behind">Behind</option>
            <option value="Completed">Completed</option>
            <option value="Not Started">Not Started</option>
          </select>
        </div>
      </div>

      {/* Assignments Table */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-indigo-600" />
            <span>Target Assignments ({filtered.length})</span>
          </h3>
        </div>

        {loading ? (
          <div className="py-16 flex justify-center">
            <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400">
            No KPI assignments found matching the filter criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase tracking-wider">
                  <th className="pb-3">KPI & Category</th>
                  <th className="pb-3">Employee</th>
                  <th className="pb-3">Department</th>
                  <th className="pb-3">Period</th>
                  <th className="pb-3">Target</th>
                  <th className="pb-3">Current</th>
                  <th className="pb-3 text-center">Weight</th>
                  <th className="pb-3">Achievement</th>
                  <th className="pb-3 text-center">Score</th>
                  <th className="pb-3">Status</th>
                  {(isAdmin || isManager) && <th className="pb-3 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((asgn) => (
                  <tr key={asgn.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5">
                      <div className="font-bold text-slate-900">{asgn.kpi_name}</div>
                      <span className="text-[10px] text-indigo-600 font-semibold">{asgn.category_name}</span>
                    </td>
                    <td className="py-3.5">
                      <div className="font-semibold text-slate-900">{asgn.employee_name}</div>
                      <span className="text-[10px] text-slate-400">{asgn.employee_code}</span>
                    </td>
                    <td className="py-3.5 text-slate-600 font-medium">{asgn.department_name}</td>
                    <td className="py-3.5 text-slate-500 font-mono text-[11px]">{asgn.period_name}</td>
                    <td className="py-3.5 font-semibold text-slate-900">
                      {asgn.target_value} {asgn.unit}
                    </td>
                    <td className="py-3.5 font-bold text-indigo-600">
                      {asgn.current_value} {asgn.unit}
                    </td>
                    <td className="py-3.5 text-center font-bold text-slate-800">{asgn.weightage}%</td>
                    <td className="py-3.5">
                      <div className="flex items-center gap-1.5">
                        <span className="font-extrabold text-slate-900">{asgn.achievement_percentage}%</span>
                      </div>
                    </td>
                    <td className="py-3.5 text-center">
                      {asgn.score ? (
                        <span className="font-bold text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded text-[11px]">
                          {asgn.score} / 5
                        </span>
                      ) : (
                        <span className="text-slate-300">--</span>
                      )}
                    </td>
                    <td className="py-3.5">
                      <Badge variant={asgn.status}>
                        {asgn.status}
                      </Badge>
                    </td>
                    {(isAdmin || isManager) && (
                      <td className="py-3.5 text-right whitespace-nowrap">
                        <button
                          onClick={() => handleOpenEditAsgn(asgn)}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors"
                          title="Edit Target / Weightage"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Assign KPI Modal */}
      <Modal
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        title="Assign Performance Indicator (KPI)"
        maxWidth="max-w-2xl"
      >
        <div className="space-y-4 text-xs">
          {/* Tabs for Single vs Bulk */}
          {isAdmin && (
            <div className="flex border-b border-slate-200">
              <button
                type="button"
                onClick={() => setAssignMode('single')}
                className={`px-4 py-2 font-semibold border-b-2 transition-colors ${
                  assignMode === 'single'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                Individual Employee
              </button>
              <button
                type="button"
                onClick={() => setAssignMode('bulk')}
                className={`px-4 py-2 font-semibold border-b-2 transition-colors ${
                  assignMode === 'bulk'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                Bulk Department / Role
              </button>
            </div>
          )}

          {error && (
            <div className="p-3 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* SINGLE ASSIGNMENT MODE */}
          {assignMode === 'single' && (
            <form onSubmit={handlePromptAssign} className="space-y-4">
              {/* Employee Selection */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Select Employee <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formData.employee_id}
                  onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold"
                >
                  <option value="">Choose employee...</option>
                  {assignableEmployees.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name} ({e.employee_code || 'ID'}) — {e.designation} ({e.department_name || 'Dept'})
                    </option>
                  ))}
                </select>
              </div>

              {/* Selected Employee Preview Card */}
              {selectedEmployeeObj && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-3">
                  <img
                    src={selectedEmployeeObj.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedEmployeeObj.name}`}
                    alt={selectedEmployeeObj.name}
                    className="w-9 h-9 rounded-full bg-white object-cover border border-slate-200 shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-slate-900 text-xs truncate">{selectedEmployeeObj.name}</div>
                    <div className="text-[10px] text-slate-500 truncate">
                      {selectedEmployeeObj.employee_code} • {selectedEmployeeObj.designation} • Manager: {selectedEmployeeObj.reporting_manager_line_1_name || 'None'}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[10px] text-slate-400 block font-medium">Cycle Weight:</span>
                    <span className={`text-xs font-black ${employeeCurrentWeightage >= 100 ? 'text-emerald-600' : 'text-slate-800'}`}>
                      {employeeCurrentWeightage}% / 100%
                    </span>
                  </div>
                </div>
              )}

              {/* KPI Template Select */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Select KPI Template <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.kpi_template_id}
                    onChange={(e) => handleTemplateSelect(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
                  >
                    <option value="">Choose template...</option>
                    {templates.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.category_name})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    KPI Period <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.kpi_period_id}
                    onChange={(e) => setFormData({ ...formData, kpi_period_id: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
                  >
                    {periods.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.status})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Target Value & Weightage */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Target Goal ({selectedTemplateObj?.unit || 'Units'}) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={formData.target_value}
                    onChange={(e) => setFormData({ ...formData, target_value: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none font-bold"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Assigned Weightage (%) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    required
                    value={formData.weightage}
                    onChange={(e) => setFormData({ ...formData, weightage: Number(e.target.value) })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none font-bold"
                  />
                </div>
              </div>

              {/* 100% Weightage Visual Validation Indicator */}
              <div className={`p-3 rounded-xl border flex items-center justify-between ${
                projectedTotalWeightage > 100
                  ? 'bg-rose-50 border-rose-200 text-rose-900'
                  : projectedTotalWeightage === 100
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-indigo-50/70 border-indigo-200 text-indigo-900'
              }`}>
                <div className="flex items-center gap-2">
                  {projectedTotalWeightage === 100 ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : projectedTotalWeightage > 100 ? (
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  ) : (
                    <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
                  )}
                  <span>
                    Total Cycle Weightage: <strong>{projectedTotalWeightage}%</strong>{' '}
                    {projectedTotalWeightage === 100 && '✓ Perfect 100% allocation'}
                    {projectedTotalWeightage > 100 && '⚠️ Exceeds 100% maximum!'}
                    {projectedTotalWeightage < 100 && `(${100 - projectedTotalWeightage}% remaining to allocate)`}
                  </span>
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAssignModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl font-medium hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={projectedTotalWeightage > 100}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold shadow-sm disabled:opacity-50"
                >
                  Review & Assign
                </button>
              </div>
            </form>
          )}

          {/* BULK ASSIGNMENT MODE (ADMIN) */}
          {assignMode === 'bulk' && (
            <form onSubmit={handlePromptBulk} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Select KPI Template <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={bulkData.kpi_template_id}
                    onChange={(e) => setBulkData({ ...bulkData, kpi_template_id: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                    required
                  >
                    <option value="">Choose template...</option>
                    {templates.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    KPI Period <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={bulkData.kpi_period_id}
                    onChange={(e) => setBulkData({ ...bulkData, kpi_period_id: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                    required
                  >
                    {periods.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Target Department</label>
                  <select
                    value={bulkData.department_id}
                    onChange={(e) => setBulkData({ ...bulkData, department_id: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                  >
                    <option value="">All Departments</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Target Designation</label>
                  <input
                    type="text"
                    value={bulkData.designation}
                    onChange={(e) => setBulkData({ ...bulkData, designation: e.target.value })}
                    placeholder="e.g. Software Engineer (Optional)"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Default Weightage (%)</label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={bulkData.weightage}
                  onChange={(e) => setBulkData({ ...bulkData, weightage: Number(e.target.value) })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none font-bold"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAssignModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl font-medium hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold shadow-sm"
                >
                  Review Bulk Assignment
                </button>
              </div>
            </form>
          )}
        </div>
      </Modal>

      {/* Edit Target/Weightage Modal */}
      <Modal
        isOpen={!!editingAsgn}
        onClose={() => setEditingAsgn(null)}
        title="Edit Target & Weightage"
        maxWidth="max-w-md"
      >
        {editingAsgn && (
          <form onSubmit={handleSaveEditAsgn} className="space-y-4 text-xs">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
              <div className="font-bold text-slate-900">{editingAsgn.kpi_name}</div>
              <div className="text-[11px] text-slate-500">
                Assigned to: <span className="font-semibold text-slate-800">{editingAsgn.employee_name}</span> ({editingAsgn.employee_code})
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Target Value ({editingAsgn.unit})
              </label>
              <input
                type="number"
                step="any"
                required
                value={editTargetValue}
                onChange={(e) => setEditTargetValue(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none font-bold"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Weightage (%)</label>
              <input
                type="number"
                min="1"
                max="100"
                required
                value={editWeightage}
                onChange={(e) => setEditWeightage(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none font-bold"
              />
            </div>

            <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditingAsgn(null)}
                className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl font-medium hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold shadow-sm"
              >
                {submitting ? 'Saving...' : 'Save Updates'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Confirmation Modal (Single) */}
      <ConfirmDialog
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleConfirmSingleAssign}
        title="Confirm KPI Assignment"
        description="Please verify the employee assignment details. The employee will receive a notification of their new target."
        details={[
          { label: 'Employee', value: `${selectedEmployeeObj?.name} (${selectedEmployeeObj?.employee_code})` },
          { label: 'KPI Title', value: selectedTemplateObj?.name },
          { label: 'Target Value', value: `${formData.target_value} ${selectedTemplateObj?.unit}` },
          { label: 'Weightage', value: `${formData.weightage}%` },
          { label: 'Cycle Total Weight', value: `${projectedTotalWeightage}%` }
        ]}
        confirmText="Confirm & Assign"
        loading={submitting}
      />

      {/* Confirmation Modal (Bulk) */}
      <ConfirmDialog
        isOpen={bulkConfirmOpen}
        onClose={() => setBulkConfirmOpen(false)}
        onConfirm={handleConfirmBulkAssign}
        title="Confirm Bulk KPI Assignment"
        description="Are you sure you want to assign this KPI across the selected group? Existing assignments in this period will not be duplicated."
        details={[
          { label: 'Template', value: templates.find((t) => t.id === bulkData.kpi_template_id)?.name },
          { label: 'Department', value: departments.find((d) => d.id === bulkData.department_id)?.name || 'All' },
          { label: 'Weightage', value: `${bulkData.weightage}%` }
        ]}
        confirmText="Execute Bulk Assignment"
        loading={submitting}
      />
    </div>
  );
};

export default KPIAssignmentsPage;
