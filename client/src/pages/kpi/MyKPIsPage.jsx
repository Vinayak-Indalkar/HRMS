import React, { useState, useEffect } from 'react';
import { 
  Target, TrendingUp, CheckCircle2, AlertTriangle, Clock, 
  Calendar, RefreshCw, FileText, ChevronRight, MessageSquare, 
  Award, ShieldAlert, Check, X, ArrowUpRight
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { 
  getKpiPeriods, 
  getEmployeeKpiDashboard, 
  submitKpiProgress, 
  getKpiProgressHistory 
} from '../../services/api';
import ConfirmDialog from '../../components/common/ConfirmDialog';

export default function MyKPIsPage() {
  const { user } = useAuth();
  const [periods, setPeriods] = useState([]);
  const [selectedPeriodId, setSelectedPeriodId] = useState('');
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Update progress modal state
  const [progressModalOpen, setProgressModalOpen] = useState(false);
  const [activeKpi, setActiveKpi] = useState(null);
  const [progressForm, setProgressForm] = useState({
    current_value: '',
    comments: '',
    evidence_url: '',
    evidence_name: ''
  });
  const [historyList, setHistoryList] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    loadPeriods();
  }, []);

  useEffect(() => {
    if (selectedPeriodId) {
      loadEmployeeKPIs(selectedPeriodId);
    }
  }, [selectedPeriodId]);

  const loadPeriods = async () => {
    try {
      const res = await getKpiPeriods();
      const pList = Array.isArray(res) ? res : (res?.data || []);
      setPeriods(pList);
      const active = pList.find(p => p.status === 'Active') || pList[0];
      if (active) {
        setSelectedPeriodId(active.id);
      }
    } catch (err) {
      console.error('Error fetching periods:', err);
    }
  };

  const loadEmployeeKPIs = async (periodId) => {
    setLoading(true);
    try {
      const res = await getEmployeeKpiDashboard({ period_id: periodId });
      setDashboardData(res?.summary ? res : (res?.data || res));
    } catch (err) {
      console.error('Error fetching employee KPIs:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenProgress = async (kpi) => {
    setActiveKpi(kpi);
    setProgressForm({
      current_value: kpi.current_value !== undefined ? kpi.current_value : 0,
      comments: '',
      evidence_url: '',
      evidence_name: ''
    });
    setSaveSuccess(false);
    setProgressModalOpen(true);

    // Fetch history
    setHistoryLoading(true);
    try {
      const histRes = await getKpiProgressHistory(kpi.id);
      setHistoryList(Array.isArray(histRes) ? histRes : (histRes?.data || []));
    } catch (err) {
      console.error('Error loading history:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleSaveProgress = async (e) => {
    e.preventDefault();
    if (!activeKpi) return;
    setSubmitting(true);
    try {
      await submitKpiProgress(activeKpi.id, {
        current_value: parseFloat(progressForm.current_value) || 0,
        comments: progressForm.comments,
        evidence: progressForm.evidence_url ? [{ name: progressForm.evidence_name || 'Evidence Attachment', url: progressForm.evidence_url }] : []
      });
      setSaveSuccess(true);
      setTimeout(() => {
        setProgressModalOpen(false);
        loadEmployeeKPIs(selectedPeriodId);
      }, 700);
    } catch (err) {
      console.error('Failed to submit progress:', err);
      alert('Error updating progress: ' + (err.response?.data?.message || err.message));
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Completed':
        return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"><CheckCircle2 className="w-3.5 h-3.5 mr-1" />Completed</span>;
      case 'On Track':
        return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300"><TrendingUp className="w-3.5 h-3.5 mr-1" />On Track</span>;
      case 'At Risk':
        return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"><AlertTriangle className="w-3.5 h-3.5 mr-1" />At Risk</span>;
      case 'Behind':
        return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300"><AlertTriangle className="w-3.5 h-3.5 mr-1" />Behind</span>;
      default:
        return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"><Clock className="w-3.5 h-3.5 mr-1" />{status || 'Not Started'}</span>;
    }
  };

  const getAchievementColor = (pct) => {
    if (pct >= 100) return 'bg-emerald-500';
    if (pct >= 75) return 'bg-blue-500';
    if (pct >= 50) return 'bg-amber-500';
    return 'bg-rose-500';
  };

  const summary = dashboardData?.summary || { total_kpis: 0, avg_achievement: 0, weighted_score: 0 };
  const assignments = dashboardData?.assignments || [];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <div>
          <div className="flex items-center space-x-2 text-indigo-600 dark:text-indigo-400 font-semibold text-sm mb-1">
            <Target className="w-4 h-4" />
            <span>Performance & Key Results</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">My KPIs</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Track your quarterly goals, update milestone progress, and review performance feedback.
          </p>
        </div>

        {/* Period Selector */}
        <div className="flex items-center space-x-3">
          <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center">
            <Calendar className="w-4 h-4 mr-1 text-slate-400" /> Period:
          </label>
          <select
            value={selectedPeriodId}
            onChange={(e) => setSelectedPeriodId(e.target.value)}
            className="px-4 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-sm font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          >
            {periods.map(p => (
              <option key={p.id} value={p.id}>{p.name} ({p.status})</option>
            ))}
          </select>
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center space-x-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <Target className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total KPIs</p>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{summary.total_kpis}</h3>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center space-x-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Avg Achievement</p>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{summary.avg_achievement}%</h3>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center space-x-4">
          <div className="w-12 h-12 rounded-xl bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 flex items-center justify-center">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Weighted Score</p>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{summary.weighted_score}%</h3>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center space-x-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Completed</p>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
              {assignments.filter(k => k.status === 'Completed').length} / {summary.total_kpis}
            </h3>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      {loading ? (
        <div className="p-12 text-center text-slate-500">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-600" />
          Loading your key performance indicators...
        </div>
      ) : assignments.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 p-12 text-center rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <Target className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">No KPIs Assigned</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
            You do not have any KPIs assigned for this performance period yet. Contact your reporting manager.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {assignments.map(kpi => {
            const achPct = Math.min(Math.max(kpi.achievement_pct || 0, 0), 100);
            return (
              <div 
                key={kpi.id}
                className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                      {kpi.category_name || 'General'}
                    </span>
                    {getStatusBadge(kpi.status)}
                  </div>

                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
                    {kpi.title}
                  </h3>
                  {kpi.description && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mb-4">
                      {kpi.description}
                    </p>
                  )}

                  {/* Target & Weightage details */}
                  <div className="grid grid-cols-3 gap-2 py-3 border-y border-slate-100 dark:border-slate-700/60 my-4 text-center">
                    <div>
                      <p className="text-[11px] uppercase tracking-wider text-slate-400">Target</p>
                      <p className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                        {kpi.target_value} {kpi.unit}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-wider text-slate-400">Current</p>
                      <p className="text-sm font-bold text-indigo-600 dark:text-indigo-400 mt-0.5">
                        {kpi.current_value || 0} {kpi.unit}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-wider text-slate-400">Weightage</p>
                      <p className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                        {kpi.weightage}%
                      </p>
                    </div>
                  </div>

                  {/* Achievement Bar */}
                  <div className="space-y-1.5 mb-4">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-slate-600 dark:text-slate-300">Achievement</span>
                      <span className="text-slate-900 dark:text-white">{kpi.achievement_pct || 0}%</span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${getAchievementColor(kpi.achievement_pct || 0)}`}
                        style={{ width: `${achPct}%` }}
                      />
                    </div>
                  </div>

                  {/* Review rating if any */}
                  {kpi.review_score && (
                    <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-xl p-3 mb-4 text-xs">
                      <div className="flex items-center justify-between text-indigo-900 dark:text-indigo-200 font-semibold mb-1">
                        <span>Manager Rating</span>
                        <span className="flex items-center text-amber-500 font-bold">
                          ★ {kpi.review_score} / 5
                        </span>
                      </div>
                      {kpi.review_feedback && (
                        <p className="text-indigo-700 dark:text-indigo-300 italic">
                          "{kpi.review_feedback}"
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Bottom Action */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between">
                  <span className="text-xs text-slate-400">
                    Type: <strong className="text-slate-600 dark:text-slate-300">{kpi.measurement_type || 'Numeric'}</strong>
                  </span>
                  <button
                    onClick={() => handleOpenProgress(kpi)}
                    className="inline-flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-sm transition-all"
                  >
                    Update Progress
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Update Progress Modal */}
      {progressModalOpen && activeKpi && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-700">
              <div>
                <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                  Update Progress
                </span>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                  {activeKpi.title}
                </h3>
              </div>
              <button
                onClick={() => setProgressModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProgress} className="mt-4 space-y-4">
              {/* Target info reminder */}
              <div className="bg-slate-50 dark:bg-slate-700/50 p-3.5 rounded-xl flex items-center justify-between text-xs">
                <div>
                  <span className="text-slate-500">Target Value:</span>{' '}
                  <strong className="text-slate-800 dark:text-slate-200 font-semibold">
                    {activeKpi.target_value} {activeKpi.unit}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-500">Direction:</span>{' '}
                  <strong className="text-slate-800 dark:text-slate-200 font-semibold">
                    {activeKpi.target_direction || 'Higher is Better'}
                  </strong>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  New Current Value ({activeKpi.unit || 'Value'}) *
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  value={progressForm.current_value}
                  onChange={(e) => setProgressForm({ ...progressForm, current_value: e.target.value })}
                  placeholder={`e.g. ${activeKpi.target_value}`}
                  className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Progress Notes / Remarks
                </label>
                <textarea
                  rows="3"
                  value={progressForm.comments}
                  onChange={(e) => setProgressForm({ ...progressForm, comments: e.target.value })}
                  placeholder="Explain what was accomplished or milestones reached..."
                  className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    Evidence Title (Optional)
                  </label>
                  <input
                    type="text"
                    value={progressForm.evidence_name}
                    onChange={(e) => setProgressForm({ ...progressForm, evidence_name: e.target.value })}
                    placeholder="e.g. Sales Report Q1"
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    Evidence URL / Link
                  </label>
                  <input
                    type="url"
                    value={progressForm.evidence_url}
                    onChange={(e) => setProgressForm({ ...progressForm, evidence_url: e.target.value })}
                    placeholder="https://drive.google.com/..."
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* History accordion */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-700">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  Past Progress Log
                </p>
                {historyLoading ? (
                  <p className="text-xs text-slate-400">Loading history...</p>
                ) : historyList.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No progress logs recorded yet.</p>
                ) : (
                  <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                    {historyList.map(h => (
                      <div key={h.id} className="p-2.5 bg-slate-50 dark:bg-slate-700/40 rounded-lg text-xs space-y-0.5">
                        <div className="flex justify-between font-semibold text-slate-700 dark:text-slate-200">
                          <span>Value: {h.current_value} ({h.achievement_pct}%)</span>
                          <span className="text-slate-400 font-normal">{h.created_at ? new Date(h.created_at).toLocaleDateString() : ''}</span>
                        </div>
                        {h.comments && <p className="text-slate-500 dark:text-slate-400 italic">"{h.comments}"</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {saveSuccess && (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 text-xs rounded-xl flex items-center">
                  <Check className="w-4 h-4 mr-2" /> Progress updated successfully!
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-3 border-t border-slate-100 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setProgressModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow-sm"
                >
                  {submitting ? 'Saving...' : 'Save Progress'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
