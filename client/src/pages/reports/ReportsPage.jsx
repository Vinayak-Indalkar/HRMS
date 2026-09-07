import React, { useState, useEffect } from 'react';
import {
  FileText,
  User,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  Download,
  Printer,
  Search,
  Filter,
  BarChart3,
  TrendingUp,
  Shield,
  CalendarDays,
  Clock3,
  Layers,
  ChevronDown,
  RefreshCw,
  Award
} from 'lucide-react';
import { api } from '../../services/api';
import { formatDate, formatTime } from '../../utils/formatters';
import Badge from '../../components/common/Badge';
import KPIReportsPage from '../kpi/KPIReportsPage';

export const ReportsPage = () => {
  // Navigation Tabs: 'individual' (Default) or 'kpi_analytics'
  const [reportTab, setReportTab] = useState('individual');

  // Employee Selection & Period State
  const [employees, setEmployees] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [periodPreset, setPeriodPreset] = useState('current_month');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Report Data & Loading State
  const [reportData, setReportData] = useState(null);
  const [loadingEmployees, setLoadingEmployees] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  // Sub-tab inside Individual Report: 'all', 'attendance', 'leaves', 'kpi'
  const [detailTab, setDetailTab] = useState('all');

  // Calculate default dates based on preset
  const calculatePresetDates = (preset) => {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth() + 1; // 1-12

    if (preset === 'current_month') {
      const lastDay = new Date(y, m, 0).getDate();
      return {
        start: `${y}-${String(m).padStart(2, '0')}-01`,
        end: `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
      };
    } else if (preset === 'last_month') {
      const prevM = m === 1 ? 12 : m - 1;
      const prevY = m === 1 ? y - 1 : y;
      const lastDay = new Date(prevY, prevM, 0).getDate();
      return {
        start: `${prevY}-${String(prevM).padStart(2, '0')}-01`,
        end: `${prevY}-${String(prevM).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
      };
    } else if (preset === 'last_30_days') {
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000);
      return {
        start: thirtyDaysAgo.toISOString().split('T')[0],
        end: now.toISOString().split('T')[0]
      };
    } else if (preset === 'this_year') {
      return {
        start: `${y}-01-01`,
        end: `${y}-12-31`
      };
    }
    return { start: '', end: '' };
  };

  // Load employee list on mount
  useEffect(() => {
    const loadEmps = async () => {
      setLoadingEmployees(true);
      try {
        const list = await api.getReportEmployees();
        setEmployees(list || []);
        if (list && list.length > 0) {
          setSelectedUserId(list[0].id);
        }
      } catch (err) {
        console.error('Failed to load employees for report:', err);
      } finally {
        setLoadingEmployees(false);
      }
    };
    loadEmps();

    // Set initial date range
    const initial = calculatePresetDates('current_month');
    setStartDate(initial.start);
    setEndDate(initial.end);
  }, []);

  // Update dates when preset changes
  const handlePresetChange = (e) => {
    const preset = e.target.value;
    setPeriodPreset(preset);
    if (preset !== 'custom') {
      const dates = calculatePresetDates(preset);
      setStartDate(dates.start);
      setEndDate(dates.end);
    }
  };

  // Generate Report for selected employee and period
  const handleGenerateReport = async (overrideUserId = null) => {
    const targetId = overrideUserId || selectedUserId;
    if (!targetId) {
      setError('Please select an employee.');
      return;
    }

    setGenerating(true);
    setError('');
    try {
      const params = {
        user_id: targetId,
        start_date: startDate,
        end_date: endDate
      };
      const res = await api.getEmployeeReport(params);
      setReportData(res);
    } catch (err) {
      console.error('Failed to generate employee report:', err);
      setError(err.message || 'Failed to generate employee report');
    } finally {
      setGenerating(false);
    }
  };

  // Auto generate on employee load
  useEffect(() => {
    if (employees.length > 0 && selectedUserId && !reportData) {
      handleGenerateReport(selectedUserId);
    }
  }, [employees]);

  // Export Attendance CSV
  const handleExportAttendanceCSV = () => {
    if (!reportData?.attendance?.records) return;
    const headers = ['Date', 'Day', 'Punch In', 'Punch Out', 'Total Working Hours', 'Status', 'Regularization Reason'];
    const rows = reportData.attendance.records.map(r => {
      const dayName = new Date(r.date).toLocaleDateString('en-US', { weekday: 'short' });
      return [
        `"${r.date}"`,
        `"${dayName}"`,
        `"${r.punch_in ? new Date(r.punch_in).toLocaleTimeString() : '--'}"`,
        `"${r.punch_out ? new Date(r.punch_out).toLocaleTimeString() : '--'}"`,
        r.total_working_hours || 0,
        `"${r.status}"`,
        `"${r.regularization_reason || ''}"`
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Attendance_Report_${reportData.employee.employee_code}_${startDate}_to_${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export Leave CSV
  const handleExportLeaveCSV = () => {
    if (!reportData?.leaves?.records) return;
    const headers = ['Leave Type', 'Start Date', 'End Date', 'Days', 'Status', 'Reason', 'Cancellation Reason', 'Approved By'];
    const rows = reportData.leaves.records.map(r => [
      `"${r.leave_type}"`,
      `"${r.start_date}"`,
      `"${r.end_date}"`,
      r.total_days,
      `"${r.status}"`,
      `"${r.reason || ''}"`,
      `"${r.cancellation_reason || ''}"`,
      `"${r.approved_by || ''}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Leave_Report_${reportData.employee.employee_code}_${startDate}_to_${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Print Report
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-md bg-indigo-100 text-indigo-700 tracking-wider">
              Administration Portal
            </span>
            <span className="text-slate-400 text-xs">•</span>
            <span className="text-xs font-semibold text-slate-500">Reports & Analytics</span>
          </div>
          <h2 className="text-2xl font-bold text-slate-900">Workforce & Employee Reports</h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Generate comprehensive individual employee reports for attendance, leave statements, and performance audits
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200/80 shadow-xs self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setReportTab('individual')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              reportTab === 'individual'
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <User className="w-4 h-4" />
            <span>Individual Employee Report</span>
          </button>
          <button
            type="button"
            onClick={() => setReportTab('kpi_analytics')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              reportTab === 'kpi_analytics'
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>KPI Organization Analytics</span>
          </button>
        </div>
      </div>

      {reportTab === 'kpi_analytics' ? (
        <KPIReportsPage />
      ) : (
        <>
          {/* Configuration Card */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-bold text-slate-900">Select Employee & Reporting Period</h3>
              </div>
              <span className="text-xs text-slate-400">Generate statements on demand</span>
            </div>

            {error && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs font-medium text-rose-800 flex items-center gap-2 mb-4">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 items-end">
              {/* Employee Selector */}
              <div className="lg:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Select Employee <span className="text-rose-500">*</span>
                </label>
                {loadingEmployees ? (
                  <div className="h-10 bg-slate-50 border border-slate-200 rounded-xl animate-pulse"></div>
                ) : (
                  <select
                    value={selectedUserId}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name} ({emp.employee_code}) — {emp.department_name} • {emp.designation}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Period Preset */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Reporting Period
                </label>
                <select
                  value={periodPreset}
                  onChange={handlePresetChange}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="current_month">Current Month</option>
                  <option value="last_month">Last Month</option>
                  <option value="last_30_days">Last 30 Days</option>
                  <option value="this_year">Year to Date (2026)</option>
                  <option value="custom">Custom Date Range</option>
                </select>
              </div>

              {/* Generate Button */}
              <div>
                <button
                  type="button"
                  onClick={() => handleGenerateReport()}
                  disabled={generating || !selectedUserId}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20 transition-all cursor-pointer disabled:opacity-50"
                >
                  {generating ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Generating...</span>
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Generate Report</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Custom Date Inputs if 'custom' is selected */}
            {periodPreset === 'custom' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 pt-4 border-t border-slate-100">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">From Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">To Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Generated Report Content */}
          {generating ? (
            <div className="py-24 flex flex-col items-center justify-center bg-white rounded-3xl border border-slate-200 shadow-sm">
              <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-3"></div>
              <p className="text-xs font-semibold text-slate-600">Compiling employee statements & analytics...</p>
            </div>
          ) : reportData ? (
            <div className="space-y-6 print:space-y-4">
              {/* Employee Summary Card */}
              <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm relative overflow-hidden">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <img
                      src={reportData.employee.avatar_url}
                      alt={reportData.employee.name}
                      className="w-16 h-16 rounded-2xl ring-2 ring-indigo-100 object-cover bg-slate-50"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-xl font-extrabold text-slate-900">{reportData.employee.name}</h3>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {reportData.employee.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 font-mono mt-0.5">
                        {reportData.employee.employee_code} • {reportData.employee.designation} • {reportData.employee.department_name}
                      </p>
                      <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-400 mt-2">
                        <span>Email: <strong className="text-slate-600 font-medium">{reportData.employee.email}</strong></span>
                        <span>Manager: <strong className="text-slate-600 font-medium">{reportData.employee.manager_name}</strong></span>
                        <span>Joined: <strong className="text-slate-600 font-medium">{reportData.employee.joining_date}</strong></span>
                      </div>
                    </div>
                  </div>

                  {/* Actions & Period Pill */}
                  <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
                    <button
                      type="button"
                      onClick={handleExportAttendanceCSV}
                      className="px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                      title="Download detailed attendance spreadsheet"
                    >
                      <Download className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Attendance CSV</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleExportLeaveCSV}
                      className="px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                      title="Download detailed leaves spreadsheet"
                    >
                      <Download className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Leaves CSV</span>
                    </button>
                    <button
                      type="button"
                      onClick={handlePrint}
                      className="px-3 py-2 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                      title="Print or save as PDF"
                    >
                      <Printer className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Print / PDF</span>
                    </button>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>Report Period: <strong>{formatDate(reportData.period.start_date)}</strong> to <strong>{formatDate(reportData.period.end_date)}</strong></span>
                  </div>
                  <span className="text-[11px] text-slate-400">Generated on {new Date().toLocaleDateString()}</span>
                </div>
              </div>

              {/* 4 Metric Summary Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {/* 1. Attendance Logged Days */}
                <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Attendance Days</span>
                      <Clock3 className="w-4 h-4 text-indigo-600" />
                    </div>
                    <div className="flex items-baseline gap-2 mt-2">
                      <span className="text-2xl font-black text-slate-900">{reportData.attendance.summary.logged_days}</span>
                      <span className="text-xs font-semibold text-emerald-600">({reportData.attendance.summary.present_days} Present)</span>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                    <span>Half Days: {reportData.attendance.summary.half_days}</span>
                    <span>Late Days: {reportData.attendance.summary.late_days}</span>
                  </div>
                </div>

                {/* 2. Total Working Hours */}
                <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Working Hours</span>
                      <TrendingUp className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div className="flex items-baseline gap-2 mt-2">
                      <span className="text-2xl font-black text-slate-900">{reportData.attendance.summary.total_working_hours}h</span>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                    <span>Avg Hours/Day</span>
                    <span className="font-bold text-slate-700">{reportData.attendance.summary.avg_daily_hours} hrs</span>
                  </div>
                </div>

                {/* 3. Leave Utilization */}
                <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Leave Days Taken</span>
                      <CalendarDays className="w-4 h-4 text-amber-600" />
                    </div>
                    <div className="flex items-baseline gap-2 mt-2">
                      <span className="text-2xl font-black text-slate-900">{reportData.leaves.summary.total_days_taken}d</span>
                      <span className="text-xs text-slate-400">in period</span>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                    <span>Approved: {reportData.leaves.summary.approved_count}</span>
                    <span>Pending: {reportData.leaves.summary.pending_count}</span>
                  </div>
                </div>

                {/* 4. KPI Performance */}
                <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">KPI Achievement</span>
                      <Award className="w-4 h-4 text-purple-600" />
                    </div>
                    <div className="flex items-baseline gap-2 mt-2">
                      <span className="text-2xl font-black text-slate-900">{reportData.kpi.summary.avg_achievement_pct}%</span>
                      <span className="text-xs text-purple-600 font-bold">{reportData.kpi.summary.completed_kpis}/{reportData.kpi.summary.total_kpis} Goals</span>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                    <span>Review Score</span>
                    <span className="font-bold text-slate-700">{reportData.kpi.summary.avg_review_score > 0 ? `${reportData.kpi.summary.avg_review_score} / 5` : 'Pending'}</span>
                  </div>
                </div>
              </div>

              {/* Sub-Tabs: All / Attendance / Leaves / KPI */}
              <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                {[
                  { id: 'all', label: 'Full Statement' },
                  { id: 'attendance', label: `Attendance Log (${reportData.attendance.records.length})` },
                  { id: 'leaves', label: `Leave Statement (${reportData.leaves.records.length})` },
                  { id: 'kpi', label: `KPIs & Performance (${reportData.kpi.assignments.length})` }
                ].map(t => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setDetailTab(t.id)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      detailTab === t.id
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {/* SECTION: ATTENDANCE */}
              {(detailTab === 'all' || detailTab === 'attendance') && (
                <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-indigo-600" />
                      <h4 className="text-sm font-bold text-slate-900">Attendance Log & Timestamps</h4>
                    </div>
                    <span className="text-xs text-slate-400">{reportData.attendance.records.length} logged record(s)</span>
                  </div>

                  {reportData.attendance.records.length === 0 ? (
                    <p className="text-xs text-slate-400 py-6 text-center">No attendance logs found for this period.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase tracking-wider">
                            <th className="pb-3">Date</th>
                            <th className="pb-3">Day</th>
                            <th className="pb-3">Punch In</th>
                            <th className="pb-3">Punch Out</th>
                            <th className="pb-3">Hours Worked</th>
                            <th className="pb-3">Status</th>
                            <th className="pb-3">Regularization Notes</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {reportData.attendance.records.map((rec) => {
                            const dateObj = new Date(rec.date);
                            const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
                            return (
                              <tr key={rec.id} className="hover:bg-slate-50/80 transition-colors">
                                <td className="py-3 font-bold text-slate-900">{formatDate(rec.date)}</td>
                                <td className="py-3 text-slate-500 font-medium">{dayName}</td>
                                <td className="py-3 text-slate-700 font-mono">
                                  {rec.punch_in ? new Date(rec.punch_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--'}
                                </td>
                                <td className="py-3 text-slate-700 font-mono">
                                  {rec.punch_out ? new Date(rec.punch_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--'}
                                </td>
                                <td className="py-3 font-semibold text-slate-800">{rec.total_working_hours}h</td>
                                <td className="py-3">
                                  <Badge variant={rec.status}>{rec.status}</Badge>
                                </td>
                                <td className="py-3 text-slate-500 italic max-w-[200px] truncate">
                                  {rec.regularization_reason || '--'}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* SECTION: LEAVES & BALANCES */}
              {(detailTab === 'all' || detailTab === 'leaves') && (
                <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-6">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <CalendarDays className="w-4 h-4 text-indigo-600" />
                      <h4 className="text-sm font-bold text-slate-900">Leave Statement & Balance Quotas</h4>
                    </div>
                    <span className="text-xs text-slate-400">Current annual quotas & historical requests</span>
                  </div>

                  {/* Quotas Grid */}
                  <div>
                    <span className="text-xs font-bold text-slate-700 block mb-3">Active Leave Balance Quotas</span>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                      {reportData.leaves.balances.map((b) => (
                        <div key={b.leave_type} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col justify-between">
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[11px] font-bold text-slate-800 truncate block">{b.leave_type}</span>
                              <span className="text-[9px] font-extrabold uppercase px-1 py-0.5 rounded bg-indigo-100 text-indigo-700">
                                {b.code || 'LV'}
                              </span>
                            </div>
                            <div className="flex items-baseline gap-1 mt-1">
                              <span className="text-xl font-black text-slate-900">{b.remaining_leaves}</span>
                              <span className="text-[10px] text-slate-400">/ {b.total_leaves} left</span>
                            </div>
                          </div>
                          <span className="text-[10px] text-slate-400 pt-2 border-t border-slate-200/60 mt-2">
                            Used: {b.used_leaves || 0}d
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Leave History Table */}
                  <div>
                    <span className="text-xs font-bold text-slate-700 block mb-2">Leave Applications in Period</span>
                    {reportData.leaves.records.length === 0 ? (
                      <p className="text-xs text-slate-400 py-6 text-center">No leave applications recorded in this period.</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase tracking-wider">
                              <th className="pb-3">Leave Type</th>
                              <th className="pb-3">From Date</th>
                              <th className="pb-3">To Date</th>
                              <th className="pb-3">Days</th>
                              <th className="pb-3">Reason</th>
                              <th className="pb-3">Status</th>
                              <th className="pb-3">Reviewer / Cancellation Notes</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {reportData.leaves.records.map((l) => (
                              <tr key={l.id} className="hover:bg-slate-50/80 transition-colors">
                                <td className="py-3 font-bold text-slate-900">{l.leave_type}</td>
                                <td className="py-3 text-slate-700 font-medium">{formatDate(l.start_date)}</td>
                                <td className="py-3 text-slate-700 font-medium">{formatDate(l.end_date)}</td>
                                <td className="py-3 font-bold text-slate-800">{l.total_days}</td>
                                <td className="py-3 text-slate-600 max-w-[180px] truncate" title={l.reason}>
                                  {l.reason}
                                </td>
                                <td className="py-3">
                                  <Badge variant={l.status}>{l.status}</Badge>
                                </td>
                                <td className="py-3 text-slate-500 italic max-w-[200px] truncate">
                                  {l.status === 'Cancelled' ? (
                                    <span className="text-rose-600 font-medium">
                                      Cancelled: {l.cancellation_reason || 'By User'}
                                    </span>
                                  ) : (
                                    l.approver_remarks || (l.approved_by ? `Approved by ${l.approved_by}` : '--')
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* SECTION: KPIS */}
              {(detailTab === 'all' || detailTab === 'kpi') && (
                <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <Award className="w-4 h-4 text-purple-600" />
                      <h4 className="text-sm font-bold text-slate-900">Assigned Goals & KPI Performance</h4>
                    </div>
                    <span className="text-xs text-slate-400">{reportData.kpi.assignments.length} assigned target(s)</span>
                  </div>

                  {reportData.kpi.assignments.length === 0 ? (
                    <p className="text-xs text-slate-400 py-6 text-center">No KPI goals assigned to this employee.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase tracking-wider">
                            <th className="pb-3">KPI Title</th>
                            <th className="pb-3">Target</th>
                            <th className="pb-3">Current Progress</th>
                            <th className="pb-3">Achievement</th>
                            <th className="pb-3">Status</th>
                            <th className="pb-3 text-right">Review Score</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {reportData.kpi.assignments.map((k) => (
                            <tr key={k.id} className="hover:bg-slate-50/80 transition-colors">
                              <td className="py-3 font-bold text-slate-900">{k.title}</td>
                              <td className="py-3 text-slate-600 font-mono">{k.target_value} {k.unit}</td>
                              <td className="py-3 text-slate-800 font-mono font-semibold">{k.current_value} {k.unit}</td>
                              <td className="py-3 font-extrabold text-indigo-600">{k.achievement_pct}%</td>
                              <td className="py-3">
                                <Badge variant={k.status}>{k.status}</Badge>
                              </td>
                              <td className="py-3 text-right font-bold text-slate-800">
                                {k.score ? `${k.score} / 5` : '--'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="py-20 text-center bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6">
              <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h4 className="text-base font-bold text-slate-700">No Report Generated</h4>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                Select an employee and reporting period above, then click <strong>Generate Report</strong> to inspect statements and metrics.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ReportsPage;
