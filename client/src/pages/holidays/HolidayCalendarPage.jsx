import React, { useState, useEffect } from 'react';
import { Calendar, Plus, Edit2, Trash2, CalendarCheck, Sparkles } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import Badge from '../../components/common/Badge';
import Modal from '../../components/common/Modal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { formatDate } from '../../utils/formatters';

export const HolidayCalendarPage = () => {
  const { user } = useAuth();
  const isAdmin = ['super_admin', 'hr_admin', 'admin'].includes(user?.role);

  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('All');

  // Add / Edit Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    date: '',
    type: 'Mandatory',
    description: ''
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchHolidays = async () => {
    setLoading(true);
    try {
      const data = await api.getHolidays();
      setHolidays(data || []);
    } catch (err) {
      console.error('Failed to load holidays:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHolidays();
  }, []);

  const handleOpenAdd = () => {
    setEditingHoliday(null);
    setFormData({ name: '', date: '', type: 'Mandatory', description: '' });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (h) => {
    setEditingHoliday(h);
    setFormData({
      name: h.name,
      date: h.date,
      type: h.type,
      description: h.description || ''
    });
    setIsModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.deleteHoliday(deleteTarget.id);
      setDeleteTarget(null);
      await fetchHolidays();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.date) return;
    setSubmitting(true);
    try {
      if (editingHoliday) {
        await api.updateHoliday(editingHoliday.id, formData);
      } else {
        await api.createHoliday(formData);
      }
      setIsModalOpen(false);
      await fetchHolidays();
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = holidays.filter(h => {
    if (filterType !== 'All' && h.type !== filterType) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Company Holiday Calendar</h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Official company holiday schedule, observed public holidays, and optional leaves
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-md transition-all self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Add Holiday</span>
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
        {['All', 'Mandatory', 'Restricted', 'Optional'].map(type => (
          <button
            key={type}
            onClick={() => setFilterType(type)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              filterType === type
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {type} Holidays
          </button>
        ))}
      </div>

      {/* Holiday Cards Grid */}
      {loading ? (
        <div className="py-16 flex justify-center">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-12 text-center text-xs text-slate-400 bg-white rounded-3xl border border-slate-200">
          No holidays listed under this category.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(h => {
            const [y, m, d] = (h.date || '').split('-').map(Number);
            const dateObj = new Date(y, (m || 1) - 1, d || 1);
            const month = dateObj.toLocaleString('default', { month: 'short' });
            const day = dateObj.getDate();
            const weekday = dateObj.toLocaleString('default', { weekday: 'long' });

            return (
              <div
                key={h.id}
                className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex items-start justify-between gap-4 hover:border-indigo-200 transition-colors"
              >
                <div className="flex items-start gap-3.5">
                  {/* Date badge */}
                  <div className="w-12 h-14 rounded-xl bg-indigo-50 border border-indigo-100 flex flex-col items-center justify-center shrink-0">
                    <span className="text-[10px] uppercase font-bold text-indigo-500">{month}</span>
                    <span className="text-lg font-extrabold text-indigo-900 leading-none mt-0.5">{day}</span>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-slate-900 leading-snug">{h.name}</h4>
                    <p className="text-xs font-semibold text-indigo-600 mt-0.5">{formatDate(h.date)} • <span className="text-slate-500 font-normal">{weekday}</span></p>
                    {h.description && (
                      <p className="text-[11px] text-slate-400 mt-1 line-clamp-1">{h.description}</p>
                    )}
                    <div className="mt-2">
                      <Badge variant={h.type} size="sm">{h.type}</Badge>
                    </div>
                  </div>
                </div>

                {isAdmin && (
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleOpenEdit(h)}
                      className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setDeleteTarget(h)}
                      className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Holiday Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingHoliday ? 'Edit Holiday' : 'Add Company Holiday'}
      >
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Holiday Name <span className="text-rose-500 font-bold">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Independence Day"
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Date <span className="text-rose-500 font-bold">*</span>
              </label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Holiday Type</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
              >
                <option value="Mandatory">Mandatory</option>
                <option value="Restricted">Restricted Holiday</option>
                <option value="Optional">Optional</option>
                <option value="Weekend">Weekend</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Description / Notes</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={2}
              placeholder="Optional notes or details..."
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
            />
          </div>

          <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium shadow-sm"
            >
              {submitting ? 'Saving...' : editingHoliday ? 'Update Holiday' : 'Create Holiday'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Confirmation Dialog for Delete Holiday */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Holiday"
        message={`Are you sure you want to remove "${deleteTarget?.name}" (${formatDate(deleteTarget?.date)}) from the company holiday calendar?`}
        warningMessage="This will update working day calculations for attendance across the company."
        confirmText="Delete Holiday"
        danger={true}
      />
    </div>
  );
};

export default HolidayCalendarPage;
