import React, { useState, useEffect } from 'react';
import { Settings, Building2, Clock, Calendar, CheckCircle2 } from 'lucide-react';
import { api } from '../../services/api';

export const SettingsPage = () => {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const data = await api.getSettings();
      setSettings(data);
    } catch (err) {
      console.error('Failed to load system settings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSuccess('');
    setError('');
    try {
      const res = await api.updateSettings(settings);
      setSettings(res.settings);
      setSuccess('System configuration saved successfully!');
    } catch (err) {
      setError(err.message || 'Failed to save settings');
    } finally {
      setSaving(false);
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
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900">System Configuration & Policies</h2>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Configure corporate details, work hours policies, attendance thresholds, and annual leave quotas
        </p>
      </div>

      {success && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-medium text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs font-medium text-rose-800">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6 text-xs">
        {/* 1. Company Profile */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Building2 className="w-5 h-5 text-indigo-600" />
            <h3 className="text-base font-bold text-slate-900">Corporate Information</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Company Legal Name</label>
              <input
                type="text"
                value={settings?.company_name || ''}
                onChange={(e) => setSettings({ ...settings, company_name: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Official HR Email</label>
              <input
                type="email"
                value={settings?.company_email || ''}
                onChange={(e) => setSettings({ ...settings, company_email: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Company Phone</label>
              <input
                type="text"
                value={settings?.company_phone || ''}
                onChange={(e) => setSettings({ ...settings, company_phone: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">HQ Address</label>
              <input
                type="text"
                value={settings?.company_address || ''}
                onChange={(e) => setSettings({ ...settings, company_address: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* 2. Work Schedule & Shift Rules */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Clock className="w-5 h-5 text-indigo-600" />
            <h3 className="text-base font-bold text-slate-900">Work Hours & Attendance Thresholds</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Standard Work Hours / Day</label>
              <input
                type="number"
                step="0.5"
                min="4"
                max="12"
                value={settings?.standard_hours || 8}
                onChange={(e) => setSettings({ ...settings, standard_hours: Number(e.target.value) })}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Half Day Minimum Hours</label>
              <input
                type="number"
                step="0.5"
                min="2"
                max="6"
                value={settings?.half_day_hours || 4}
                onChange={(e) => setSettings({ ...settings, half_day_hours: Number(e.target.value) })}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Default Start Time</label>
              <input
                type="time"
                value={settings?.work_start_time || '09:00'}
                onChange={(e) => setSettings({ ...settings, work_start_time: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Default End Time</label>
              <input
                type="time"
                value={settings?.work_end_time || '18:00'}
                onChange={(e) => setSettings({ ...settings, work_end_time: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* 3. Leave Quota Allocations */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Calendar className="w-5 h-5 text-indigo-600" />
            <h3 className="text-base font-bold text-slate-900">Default Annual Leave Quotas (Days)</h3>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Casual Leave (CL)</label>
              <input
                type="number"
                min="0"
                value={settings?.casual_leave_quota ?? 6}
                onChange={(e) => setSettings({ ...settings, casual_leave_quota: Number(e.target.value) })}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">Default: 6 Days</span>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Sick Leave (SL)</label>
              <input
                type="number"
                min="0"
                value={settings?.sick_leave_quota ?? 6}
                onChange={(e) => setSettings({ ...settings, sick_leave_quota: Number(e.target.value) })}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">Default: 6 Days</span>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Earned Leave (EL)</label>
              <input
                type="number"
                min="0"
                value={settings?.earned_leave_quota ?? 8}
                onChange={(e) => setSettings({ ...settings, earned_leave_quota: Number(e.target.value) })}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">Default: 8 Days</span>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Leave Without Pay (LWP)</label>
              <input
                type="text"
                disabled
                value="Flexible / Unpaid"
                className="w-full p-2.5 bg-slate-100 border border-slate-200 rounded-xl text-slate-500 font-medium"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">Uncapped / Subject to approval</span>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Half Day Leave (HD)</label>
              <input
                type="text"
                disabled
                value="0.5 Day per session"
                className="w-full p-2.5 bg-slate-100 border border-slate-200 rounded-xl text-slate-500 font-medium"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">0.5 Day debit per request</span>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold shadow-md shadow-indigo-600/25 transition-all text-xs disabled:opacity-50"
          >
            {saving ? 'Saving System Changes...' : 'Save Configuration'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default SettingsPage;
