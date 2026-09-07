import React, { useState, useEffect } from 'react';
import { 
  Settings, Calendar, Award, Sliders, Plus, Edit2, 
  CheckCircle2, Lock, ShieldCheck, Save, RefreshCw, X, AlertCircle
} from 'lucide-react';
import { 
  getKpiPeriods, 
  createKpiPeriod, 
  getKpiSettings, 
  updateKpiSettings 
} from '../../services/api';
import ConfirmDialog from '../../components/common/ConfirmDialog';

export default function KPISettingsPage() {
  const [periods, setPeriods] = useState([]);
  const [settings, setSettings] = useState({
    enforce_100_percent_weightage: true,
    rating_scale: [
      { score: 1, label: 'Unsatisfactory', min_pct: 0, max_pct: 49 },
      { score: 2, label: 'Needs Improvement', min_pct: 50, max_pct: 69 },
      { score: 3, label: 'Meets Expectations', min_pct: 70, max_pct: 89 },
      { score: 4, label: 'Exceeds Expectations', min_pct: 90, max_pct: 109 },
      { score: 5, label: 'Outstanding', min_pct: 110, max_pct: 999 }
    ]
  });
  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);

  // Period modal
  const [periodModalOpen, setPeriodModalOpen] = useState(false);
  const [periodForm, setPeriodForm] = useState({
    id: '',
    name: '',
    type: 'Quarterly',
    start_date: '',
    end_date: '',
    status: 'Draft'
  });
  const [periodSubmitting, setPeriodSubmitting] = useState(false);

  // Confirm dialog state
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [pRes, sRes] = await Promise.all([
        getKpiPeriods(),
        getKpiSettings()
      ]);
      setPeriods(Array.isArray(pRes) ? pRes : (pRes?.data || []));
      if (sRes) {
        setSettings(sRes?.rating_scale ? sRes : (sRes?.data || sRes));
      }
    } catch (err) {
      console.error('Failed to load KPI settings data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setConfirmDialog({
      isOpen: true,
      title: 'Update KPI System Settings',
      message: 'Are you sure you want to save the revised scoring thresholds and weightage rules?',
      onConfirm: async () => {
        setSavingSettings(true);
        try {
          await updateKpiSettings(settings);
          alert('Settings updated successfully!');
        } catch (err) {
          alert('Error updating settings: ' + (err.response?.data?.message || err.message));
        } finally {
          setSavingSettings(false);
        }
      }
    });
  };

  const handleOpenPeriodModal = (period = null) => {
    if (period) {
      setPeriodForm({
        id: period.id,
        name: period.name,
        type: period.type || 'Quarterly',
        start_date: period.start_date || '',
        end_date: period.end_date || '',
        status: period.status || 'Draft'
      });
    } else {
      setPeriodForm({
        id: '',
        name: '',
        type: 'Quarterly',
        start_date: '',
        end_date: '',
        status: 'Draft'
      });
    }
    setPeriodModalOpen(true);
  };

  const handleSavePeriod = async (e) => {
    e.preventDefault();
    setPeriodSubmitting(true);
    try {
      await createKpiPeriod(periodForm);
      setPeriodModalOpen(false);
      loadData();
    } catch (err) {
      alert('Error saving period: ' + (err.response?.data?.message || err.message));
    } finally {
      setPeriodSubmitting(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="flex items-center space-x-2 text-indigo-600 dark:text-indigo-400 font-semibold text-sm mb-1">
          <Settings className="w-4 h-4" />
          <span>Configuration</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">KPI & Appraisal Settings</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Configure performance evaluation cycles, 100% weightage validation, and 1-5 rating scale definitions.
        </p>
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-500">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-600" />
          Loading settings...
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Periods Management (Left 2 cols) */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Calendar className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Appraisal Periods</h3>
              </div>
              <button
                onClick={() => handleOpenPeriodModal()}
                className="inline-flex items-center px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-sm"
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Period
              </button>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
              {periods.map(p => (
                <div key={p.id} className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-750">
                  <div>
                    <div className="flex items-center space-x-2">
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white">{p.name}</h4>
                      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                        p.status === 'Active'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                          : p.status === 'Closed'
                          ? 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                      }`}>
                        {p.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      {p.start_date} to {p.end_date} &bull; {p.type}
                    </p>
                  </div>
                  <button
                    onClick={() => handleOpenPeriodModal(p)}
                    className="p-2 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* System Rules & Thresholds (Right col) */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-6">
            <div className="flex items-center space-x-2">
              <Sliders className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Validation Rules</h3>
            </div>

            <form onSubmit={handleSaveSettings} className="space-y-6">
              {/* Enforce 100% */}
              <div className="p-4 bg-slate-50 dark:bg-slate-700/40 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-900 dark:text-white">
                    Strict 100% Weightage Rule
                  </span>
                  <input
                    type="checkbox"
                    checked={settings.enforce_100_percent_weightage !== false}
                    onChange={(e) => setSettings({ ...settings, enforce_100_percent_weightage: e.target.checked })}
                    className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                  />
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Prevents employee's cumulative assigned KPI weightage in a single period from exceeding 100%.
                </p>
              </div>

              {/* Rating Scale Details */}
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
                  1 to 5 Rating Scale Labels
                </h4>
                <div className="space-y-2">
                  {(settings.rating_scale || []).map((scale, idx) => (
                    <div key={scale.score} className="flex items-center justify-between text-xs p-2 bg-slate-50 dark:bg-slate-700/30 rounded-lg">
                      <span className="font-bold text-slate-700 dark:text-slate-200 flex items-center">
                        <span className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 flex items-center justify-center mr-2 text-[10px]">
                          {scale.score}
                        </span>
                        {scale.label}
                      </span>
                      <span className="text-slate-400">
                        {scale.min_pct}% - {scale.max_pct}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={savingSettings}
                className="w-full flex items-center justify-center px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow-sm transition-all"
              >
                <Save className="w-4 h-4 mr-2" />
                {savingSettings ? 'Saving...' : 'Save Configuration'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Period Modal */}
      {periodModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-700">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {periodForm.id ? 'Edit Period' : 'New Appraisal Period'}
              </h3>
              <button
                onClick={() => setPeriodModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePeriod} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Period Name *
                </label>
                <input
                  type="text"
                  required
                  value={periodForm.name}
                  onChange={(e) => setPeriodForm({ ...periodForm, name: e.target.value })}
                  placeholder="e.g. Q4 2026 or Annual 2026"
                  className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-sm font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Cycle Type *
                </label>
                <select
                  value={periodForm.type}
                  onChange={(e) => setPeriodForm({ ...periodForm, type: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value="Quarterly">Quarterly</option>
                  <option value="Semi-Annual">Semi-Annual</option>
                  <option value="Annual">Annual</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={periodForm.start_date}
                    onChange={(e) => setPeriodForm({ ...periodForm, start_date: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    End Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={periodForm.end_date}
                    onChange={(e) => setPeriodForm({ ...periodForm, end_date: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Status *
                </label>
                <select
                  value={periodForm.status}
                  onChange={(e) => setPeriodForm({ ...periodForm, status: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value="Draft">Draft</option>
                  <option value="Active">Active</option>
                  <option value="Closed">Closed</option>
                </select>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setPeriodModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={periodSubmitting}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow-sm"
                >
                  {periodSubmitting ? 'Saving...' : 'Save Period'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
      />
    </div>
  );
}
