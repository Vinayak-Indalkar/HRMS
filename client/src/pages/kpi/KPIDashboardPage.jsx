import React, { useState, useEffect } from 'react';
import {
  Target,
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Award,
  Users,
  Building2,
  ArrowUpRight,
  Filter,
  Plus,
  ChevronRight,
  Sparkles,
  Search,
  Calendar,
  Layers,
  BarChart3,
  Check,
  FileText,
  HelpCircle
} from 'lucide-react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { formatDate } from '../../utils/formatters';
import Badge from '../../components/common/Badge';
import StatCard from '../../components/common/StatCard';
import Modal from '../../components/common/Modal';
import ConfirmDialog from '../../components/common/ConfirmDialog';

export const KPIDashboardPage = ({ onNavigate }) => {
  const { user } = useAuth();
  const role = user?.role || 'employee';
  const isAdmin = ['super_admin', 'hr_admin', 'admin'].includes(role);
  const isManager = role === 'manager';

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  // Progress Submission Modal (Employee)
  const [activeProgressAsgn, setActiveProgressAsgn] = useState(null);
  const [currentValue, setCurrentValue] = useState('');
  const [employeeComment, setEmployeeComment] = useState('');
  const [evidenceUrl, setEvidenceUrl] = useState('');
  const [submittingProgress, setSubmittingProgress] = useState(false);
  const [progressConfirmOpen, setProgressConfirmOpen] = useState(false);
  const [successBanner, setSuccessBanner] = useState('');

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      let res;
      if (isAdmin) {
        res = await api.getAdminKpiDashboard();
      } else if (isManager) {
        res = await api.getManagerKpiDashboard();
      } else {
        res = await api.getEmployeeKpiDashboard();
      }
      setData(res);
    } catch (err) {
      console.error('Failed to load KPI dashboard:', err);
      setError(err.message || 'Failed to load KPI dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [role]);

  // Handle Progress Modal Open
  const handleOpenProgress = (asgn) => {
    setActiveProgressAsgn(asgn);
    setCurrentValue(asgn.current_value !== undefined ? String(asgn.current_value) : '');
    setEmployeeComment('');
    setEvidenceUrl('');
  };

  const calculatedAch = activeProgressAsgn && currentValue !== ''
    ? Math.round(
        (activeProgressAsgn.direction === 'Lower is Better'
          ? (Number(currentValue) <= 0 ? 150 : Math.min(200, (activeProgressAsgn.target_value / Number(currentValue)) * 100))
          : (Number(currentValue) / activeProgressAsgn.target_value) * 100) * 10
      ) / 10
    : 0;

  const handlePromptSubmitProgress = (e) => {
    e.preventDefault();
    if (currentValue === '') return;
    setProgressConfirmOpen(true);
  };

  const handleConfirmSubmitProgress = async () => {
    if (!activeProgressAsgn) return;
    setSubmittingProgress(true);
    try {
      await api.submitKpiProgress(activeProgressAsgn.id, {
        current_value: Number(currentValue),
        employee_comment: employeeComment,
        evidence_url: evidenceUrl
      });
      setProgressConfirmOpen(false);
      setActiveProgressAsgn(null);
      setSuccessBanner(`Progress for "${activeProgressAsgn.kpi_name}" submitted successfully.`);
      await fetchDashboardData();
    } catch (err) {
      alert(err.message || 'Failed to submit progress');
    } finally {
      setSubmittingProgress(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Success Notification Banner */}
      {successBanner && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center justify-between text-xs text-emerald-800 shadow-sm animate-in fade-in">
          <div className="flex items-center gap-2.5 font-medium">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{successBanner}</span>
          </div>
          <button
            onClick={() => setSuccessBanner('')}
            className="text-xs font-semibold text-emerald-700 hover:text-emerald-900"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold text-slate-900">KPI Management Dashboard</h2>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-indigo-100 text-indigo-800 border border-indigo-200">
              {data?.current_period?.name || 'Active Cycle'}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            {isAdmin
              ? 'Organization-wide KPI performance, department distributions, and critical review tracking'
              : isManager
              ? 'Team goal tracking, pending review sign-offs, and department contribution metrics'
              : 'Monitor your active performance indicators, target progression, and submit evidence updates'}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {isAdmin && (
            <button
              onClick={() => onNavigate && onNavigate('kpi-assignments')}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-md transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Assign New KPI</span>
            </button>
          )}
          {isManager && (
            <button
              onClick={() => onNavigate && onNavigate('kpi-reviews')}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-md transition-all"
            >
              <Award className="w-4 h-4" />
              <span>Review Team Queue</span>
            </button>
          )}
        </div>
      </div>

      {/* ======================================================== */}
      {/* 1. EMPLOYEE VIEW                                         */}
      {/* ======================================================== */}
      {!isAdmin && !isManager && (
        <>
          {/* Employee KPI Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
            <StatCard
              title="Assigned KPIs"
              value={data?.total_assigned || 0}
              icon={Target}
              subtitle="Active Cycle"
            />
            <StatCard
              title="Completed"
              value={data?.completed || 0}
              icon={CheckCircle2}
              trend="100% Target Met"
              trendType="up"
            />
            <StatCard
              title="In Progress"
              value={data?.in_progress || 0}
              icon={TrendingUp}
              subtitle="Actively Tracked"
            />
            <StatCard
              title="At Risk"
              value={data?.at_risk || 0}
              icon={AlertTriangle}
              trendType={data?.at_risk > 0 ? 'down' : 'neutral'}
              subtitle={data?.at_risk > 0 ? 'Needs Attention' : 'Healthy'}
            />
            <StatCard
              title="Avg Achievement"
              value={`${data?.average_achievement || 0}%`}
              icon={BarChart3}
              trend="Weighted %"
              trendType={data?.average_achievement >= 80 ? 'up' : 'neutral'}
            />
            <StatCard
              title="Overall Score"
              value={data?.overall_score ? `${data?.overall_score} / 5` : 'Pending'}
              icon={Award}
              subtitle="Manager Rating"
            />
          </div>

          {/* Employee KPI Cards List */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-600" />
                <span>My Performance Indicators ({data?.assignments?.length || 0})</span>
              </h3>
              <span className="text-xs text-slate-400">
                Total Weightage: {data?.assignments?.reduce((sum, a) => sum + (Number(a.weightage) || 0), 0)}%
              </span>
            </div>

            {data?.assignments?.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400">
                No active KPIs assigned for this cycle.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {data?.assignments?.map((asgn) => {
                  const ach = asgn.achievement_percentage || 0;
                  const isComplete = asgn.status === 'Completed';
                  const isAtRisk = asgn.status === 'At Risk';
                  return (
                    <div
                      key={asgn.id}
                      className={`p-5 rounded-2xl border transition-all flex flex-col justify-between ${
                        isComplete
                          ? 'bg-emerald-50/40 border-emerald-200'
                          : isAtRisk
                          ? 'bg-amber-50/40 border-amber-200'
                          : 'bg-slate-50/50 border-slate-200 hover:border-indigo-200'
                      }`}
                    >
                      <div>
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div>
                            <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-600">
                              {asgn.category_name}
                            </span>
                            <h4 className="text-sm font-bold text-slate-900 mt-1.5 leading-snug">
                              {asgn.kpi_name}
                            </h4>
                          </div>
                          <Badge variant={asgn.status === 'Completed' ? 'active' : asgn.status === 'At Risk' ? 'pending' : 'default'}>
                            {asgn.status}
                          </Badge>
                        </div>

                        {/* Targets & Current */}
                        <div className="grid grid-cols-3 gap-2 my-3 p-3 bg-white rounded-xl border border-slate-100 text-xs">
                          <div>
                            <span className="text-[10px] text-slate-400 block font-medium">Target</span>
                            <span className="font-bold text-slate-800">
                              {asgn.target_value} {asgn.unit}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 block font-medium">Current</span>
                            <span className="font-bold text-indigo-600">
                              {asgn.current_value} {asgn.unit}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 block font-medium">Weightage</span>
                            <span className="font-bold text-slate-800">{asgn.weightage}%</span>
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="space-y-1 mt-2">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-slate-500 font-medium">Achievement Rate:</span>
                            <span className="font-extrabold text-slate-900">{ach}%</span>
                          </div>
                          <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                ach >= 100
                                  ? 'bg-emerald-500'
                                  : ach >= 80
                                  ? 'bg-indigo-600'
                                  : ach >= 50
                                  ? 'bg-amber-500'
                                  : 'bg-rose-500'
                              }`}
                              style={{ width: `${Math.min(100, Math.max(0, ach))}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Footer CTA & Rating */}
                      <div className="mt-4 pt-3 border-t border-slate-200/60 flex items-center justify-between">
                        <div className="text-[11px] text-slate-400">
                          Due: {formatDate(asgn.end_date)}
                        </div>
                        <div className="flex items-center gap-2">
                          {asgn.score && (
                            <span className="text-[11px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-lg flex items-center gap-1">
                              <Award className="w-3 h-3" /> {asgn.score} / 5
                            </span>
                          )}
                          <button
                            onClick={() => handleOpenProgress(asgn)}
                            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all"
                          >
                            Update Progress
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {/* ======================================================== */}
      {/* 2. MANAGER VIEW                                          */}
      {/* ======================================================== */}
      {isManager && (
        <>
          {/* Manager Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3.5">
            <StatCard
              title="Team Members"
              value={data?.team_members_count || 0}
              icon={Users}
              subtitle="Direct Reports"
            />
            <StatCard
              title="Total Team KPIs"
              value={data?.total_team_kpis || 0}
              icon={Target}
              subtitle="Active Targets"
            />
            <StatCard
              title="On Track"
              value={data?.on_track || 0}
              icon={CheckCircle2}
              trend="80%+ Achieved"
              trendType="up"
            />
            <StatCard
              title="At Risk"
              value={data?.at_risk || 0}
              icon={AlertTriangle}
              subtitle={data?.at_risk > 0 ? 'Needs Support' : 'All Healthy'}
              trendType={data?.at_risk > 0 ? 'down' : 'neutral'}
            />
            <StatCard
              title="Completed"
              value={data?.completed || 0}
              icon={Award}
              subtitle="100% Met"
            />
            <StatCard
              title="Pending Review"
              value={data?.pending_reviews || 0}
              icon={Clock}
              subtitle="Awaiting Sign-off"
              trendType={data?.pending_reviews > 0 ? 'neutral' : 'up'}
            />
            <StatCard
              title="Team Avg %"
              value={`${data?.average_team_achievement || 0}%`}
              icon={BarChart3}
              subtitle="Completion Rate"
            />
            <StatCard
              title="Team Score"
              value={data?.average_team_score ? `${data?.average_team_score} / 5` : '--'}
              icon={Award}
              subtitle="Overall Avg"
            />
          </div>

          {/* Team Members Summary Table */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">
                Reporting Team Performance Breakdown ({data?.employee_summary?.length || 0})
              </h3>
              <button
                onClick={() => onNavigate && onNavigate('kpi-assignments')}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
              >
                <span>View Full Team Matrix</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {data?.employee_summary?.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400">
                No reporting employees currently found.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase tracking-wider">
                      <th className="pb-3">Employee</th>
                      <th className="pb-3">Department</th>
                      <th className="pb-3">Designation</th>
                      <th className="pb-3 text-center">Assigned KPIs</th>
                      <th className="pb-3">Avg Achievement</th>
                      <th className="pb-3 text-center">Score</th>
                      <th className="pb-3">Status</th>
                      <th className="pb-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data?.employee_summary?.map((emp) => (
                      <tr key={emp.employee_id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 font-bold text-slate-900">
                          {emp.employee_name}
                          <span className="block text-[11px] font-normal text-slate-400">
                            {emp.employee_code}
                          </span>
                        </td>
                        <td className="py-3.5 text-slate-600 font-medium">{emp.department}</td>
                        <td className="py-3.5 text-slate-600">{emp.designation}</td>
                        <td className="py-3.5 text-center font-bold text-slate-800">{emp.kpi_count}</td>
                        <td className="py-3.5">
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-slate-900">{emp.achievement}%</span>
                            <div className="w-16 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  emp.achievement >= 80 ? 'bg-indigo-600' : emp.achievement >= 50 ? 'bg-amber-500' : 'bg-rose-500'
                                }`}
                                style={{ width: `${Math.min(100, emp.achievement)}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 text-center">
                          {emp.score ? (
                            <span className="font-extrabold text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-lg text-[11px]">
                              {emp.score} / 5
                            </span>
                          ) : (
                            <span className="text-slate-300">--</span>
                          )}
                        </td>
                        <td className="py-3.5">
                          <Badge variant={emp.status === 'On Track' ? 'active' : emp.status === 'At Risk' ? 'pending' : 'rejected'}>
                            {emp.status}
                          </Badge>
                        </td>
                        <td className="py-3.5 text-right">
                          <button
                            onClick={() => onNavigate && onNavigate('kpi-reviews')}
                            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                          >
                            Review
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* ======================================================== */}
      {/* 3. HR ADMIN & SUPER ADMIN VIEW                           */}
      {/* ======================================================== */}
      {isAdmin && (
        <>
          {/* Admin Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3.5">
            <StatCard
              title="Active Staff"
              value={data?.total_employees || 0}
              icon={Users}
              subtitle="Company Roster"
            />
            <StatCard
              title="With KPIs"
              value={data?.employees_with_kpi || 0}
              icon={CheckCircle2}
              trend={`${Math.round(((data?.employees_with_kpi || 0) / (data?.total_employees || 1)) * 100)}% Coverage`}
              trendType="up"
            />
            <StatCard
              title="Without KPIs"
              value={data?.employees_without_kpi || 0}
              icon={HelpCircle}
              trendType={data?.employees_without_kpi > 0 ? 'down' : 'neutral'}
              subtitle="Unassigned"
            />
            <StatCard
              title="Active KPIs"
              value={data?.total_active_kpis || 0}
              icon={Target}
              subtitle="All Periods"
            />
            <StatCard
              title="Org Avg %"
              value={`${data?.average_achievement || 0}%`}
              icon={BarChart3}
              trendType={data?.average_achievement >= 80 ? 'up' : 'neutral'}
              subtitle="Company Pace"
            />
            <StatCard
              title="Average Score"
              value={data?.average_score ? `${data?.average_score} / 5` : '--'}
              icon={Award}
              subtitle="Rated Targets"
            />
            <StatCard
              title="At Risk"
              value={data?.at_risk || 0}
              icon={AlertTriangle}
              trendType={data?.at_risk > 0 ? 'down' : 'neutral'}
              subtitle="< 80% Pace"
            />
            <StatCard
              title="Pending Sign-off"
              value={data?.pending_reviews || 0}
              icon={Clock}
              subtitle="Manager Queues"
            />
          </div>

          {/* Department Breakdown Cards */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-indigo-600" />
                <span>Departmental KPI Distribution & Performance</span>
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {data?.department_breakdown?.map((dept) => (
                <div key={dept.department} className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-slate-900 text-xs truncate">{dept.department}</span>
                    <span className="text-[10px] font-bold bg-white border border-slate-200 px-2 py-0.5 rounded-md text-slate-600">
                      {dept.kpi_count} Targets
                    </span>
                  </div>

                  <div className="space-y-1.5 mt-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500 font-medium">Avg Achievement:</span>
                      <span className="font-extrabold text-indigo-700">{dept.average_achievement}%</span>
                    </div>
                    <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          dept.average_achievement >= 80
                            ? 'bg-indigo-600'
                            : dept.average_achievement >= 50
                            ? 'bg-amber-500'
                            : 'bg-rose-500'
                        }`}
                        style={{ width: `${Math.min(100, dept.average_achievement)}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Progress Submission Modal (Employee) */}
      <Modal
        isOpen={!!activeProgressAsgn}
        onClose={() => setActiveProgressAsgn(null)}
        title="Submit KPI Progress Update"
        maxWidth="max-w-lg"
      >
        {activeProgressAsgn && (
          <form onSubmit={handlePromptSubmitProgress} className="space-y-4 text-xs">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
              <div className="font-bold text-slate-900 text-sm">{activeProgressAsgn.kpi_name}</div>
              <div className="text-[11px] text-slate-500">
                Target: <span className="font-semibold text-slate-800">{activeProgressAsgn.target_value} {activeProgressAsgn.unit}</span> ({activeProgressAsgn.direction}) • Weightage: <span className="font-semibold text-slate-800">{activeProgressAsgn.weightage}%</span>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Current Value ({activeProgressAsgn.unit}) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                step="any"
                required
                value={currentValue}
                onChange={(e) => setCurrentValue(e.target.value)}
                placeholder={`e.g. ${activeProgressAsgn.target_value}`}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold text-sm"
              />
            </div>

            {currentValue !== '' && (
              <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-xl flex items-center justify-between text-indigo-900">
                <span className="font-medium">Calculated Achievement:</span>
                <span className="font-black text-sm">{calculatedAch}%</span>
              </div>
            )}

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Progress Comments & Accomplishments
              </label>
              <textarea
                rows={3}
                value={employeeComment}
                onChange={(e) => setEmployeeComment(e.target.value)}
                placeholder="Describe specific milestones achieved, client wins, or impediments..."
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Supporting Evidence URL / Document Link
              </label>
              <input
                type="url"
                value={evidenceUrl}
                onChange={(e) => setEvidenceUrl(e.target.value)}
                placeholder="https://github.com/... or https://docs.google.com/..."
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setActiveProgressAsgn(null)}
                className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl font-medium hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold shadow-sm"
              >
                Continue to Review
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Confirmation Modal for Progress Update */}
      <ConfirmDialog
        isOpen={progressConfirmOpen}
        onClose={() => setProgressConfirmOpen(false)}
        onConfirm={handleConfirmSubmitProgress}
        title="Confirm Progress Submission"
        description="Please confirm your performance update. Your reporting manager will be notified to review and score this milestone."
        details={[
          { label: 'KPI Target', value: `${activeProgressAsgn?.target_value} ${activeProgressAsgn?.unit}` },
          { label: 'Reported Current Value', value: `${currentValue} ${activeProgressAsgn?.unit}` },
          { label: 'Calculated Achievement', value: `${calculatedAch}%` },
          { label: 'Comments', value: employeeComment || 'None provided' }
        ]}
        confirmText="Confirm & Submit"
        variant="primary"
        loading={submittingProgress}
      />
    </div>
  );
};

export default KPIDashboardPage;
