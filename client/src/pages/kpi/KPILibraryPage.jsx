import React, { useState, useEffect } from 'react';
import {
  Library,
  Plus,
  Search,
  Filter,
  Edit2,
  CheckCircle2,
  AlertCircle,
  ToggleLeft,
  ToggleRight,
  TrendingUp,
  Layers,
  ArrowDownRight,
  ArrowUpRight,
  Target
} from 'lucide-react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import Badge from '../../components/common/Badge';
import Modal from '../../components/common/Modal';
import ConfirmDialog from '../../components/common/ConfirmDialog';

export const KPILibraryPage = () => {
  const { user } = useAuth();
  const isAdmin = ['super_admin', 'hr_admin', 'admin'].includes(user?.role);

  const [templates, setTemplates] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedType, setSelectedType] = useState('');

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTmpl, setEditingTmpl] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [toggleStatusTarget, setToggleStatusTarget] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form State
  const initialForm = {
    name: '',
    description: '',
    category_id: '',
    measurement_type: 'Number',
    unit: '',
    direction: 'Higher is Better',
    default_target: 100,
    minimum_threshold: 70,
    expected_value: 100,
    stretch_target: 120,
    default_weightage: 25,
    frequency: 'Quarterly',
    evidence_required: false,
    status: 'active'
  };
  const [formData, setFormData] = useState(initialForm);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [tmpls, cats] = await Promise.all([
        api.getKpiTemplates(),
        api.getKpiCategories()
      ]);
      setTemplates(tmpls || []);
      setCategories(cats || []);
      if (cats && cats.length > 0 && !formData.category_id) {
        setFormData((prev) => ({ ...prev, category_id: cats[0].id }));
      }
    } catch (err) {
      console.error('Failed to load KPI library:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenAdd = () => {
    setEditingTmpl(null);
    setFormData({
      ...initialForm,
      category_id: categories[0]?.id || ''
    });
    setError('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (t) => {
    setEditingTmpl(t);
    setFormData({
      name: t.name,
      description: t.description || '',
      category_id: t.category_id,
      measurement_type: t.measurement_type,
      unit: t.unit || '',
      direction: t.direction,
      default_target: t.default_target,
      minimum_threshold: t.minimum_threshold,
      expected_value: t.expected_value,
      stretch_target: t.stretch_target,
      default_weightage: t.default_weightage,
      frequency: t.frequency,
      evidence_required: t.evidence_required,
      status: t.status
    });
    setError('');
    setIsModalOpen(true);
  };

  const handlePromptSubmit = (e) => {
    e.preventDefault();
    setError('');
    if (!formData.name.trim()) {
      setError('KPI Name is required');
      return;
    }
    if (!formData.category_id) {
      setError('Please select a Category');
      return;
    }
    setConfirmOpen(true);
  };

  const handleConfirmSave = async () => {
    setSubmitting(true);
    setError('');
    try {
      if (editingTmpl) {
        await api.updateKpiTemplate(editingTmpl.id, formData);
        setSuccess(`Template "${formData.name}" updated successfully.`);
      } else {
        await api.createKpiTemplate(formData);
        setSuccess(`KPI template "${formData.name}" added to library.`);
      }
      setConfirmOpen(false);
      setIsModalOpen(false);
      await fetchData();
    } catch (err) {
      setError(err.message || 'Failed to save template');
      setConfirmOpen(false);
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!toggleStatusTarget) return;
    const newStatus = toggleStatusTarget.status === 'active' ? 'inactive' : 'active';
    try {
      await api.updateKpiTemplate(toggleStatusTarget.id, { status: newStatus });
      setToggleStatusTarget(null);
      setSuccess(`Template status changed to ${newStatus}`);
      await fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  const filtered = templates.filter((t) => {
    if (selectedCategory && t.category_id !== selectedCategory) return false;
    if (selectedType && t.measurement_type !== selectedType) return false;
    if (search) {
      const s = search.toLowerCase();
      return (
        t.name.toLowerCase().includes(s) ||
        (t.category_name && t.category_name.toLowerCase().includes(s)) ||
        (t.unit && t.unit.toLowerCase().includes(s))
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">KPI Template Library</h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Standardized catalog of performance indicators, target formulas, and organizational quotas
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-md transition-all self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Create KPI Template</span>
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
            placeholder="Search templates by title or category..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div className="sm:w-56">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none"
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="sm:w-48">
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none"
          >
            <option value="">All Types</option>
            <option value="Number">Number</option>
            <option value="Percentage">Percentage</option>
            <option value="Currency">Currency</option>
            <option value="Rating">Rating</option>
            <option value="Exact Target">Exact Target</option>
            <option value="Completion Based">Completion Based</option>
          </select>
        </div>
      </div>

      {/* Templates Grid / Table */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Library className="w-4 h-4 text-indigo-600" />
            <span>Master Templates Catalog ({filtered.length})</span>
          </h3>
        </div>

        {loading ? (
          <div className="py-16 flex justify-center">
            <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400">
            No KPI templates found matching your search.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((tmpl) => (
              <div
                key={tmpl.id}
                className={`p-5 rounded-2xl border transition-all flex flex-col justify-between ${
                  tmpl.status === 'inactive'
                    ? 'bg-slate-50 border-slate-200 opacity-60'
                    : 'bg-white border-slate-200/80 hover:border-indigo-300 hover:shadow-sm'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md bg-indigo-50 border border-indigo-100 text-indigo-700">
                      {tmpl.category_name}
                    </span>
                    <Badge variant={tmpl.status}>{tmpl.status}</Badge>
                  </div>

                  <h4 className="text-sm font-bold text-slate-900 leading-snug">
                    {tmpl.name}
                  </h4>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                    {tmpl.description || 'No detailed description provided.'}
                  </p>

                  <div className="grid grid-cols-2 gap-2 mt-4 p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-medium">Standard Target</span>
                      <span className="font-bold text-slate-900">
                        {tmpl.default_target} {tmpl.unit}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-medium">Measurement</span>
                      <span className="font-bold text-indigo-600">{tmpl.measurement_type}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-medium">Direction</span>
                      <span className="font-semibold text-slate-700 flex items-center gap-1">
                        {tmpl.direction === 'Higher is Better' && <ArrowUpRight className="w-3 h-3 text-emerald-600" />}
                        {tmpl.direction === 'Lower is Better' && <ArrowDownRight className="w-3 h-3 text-sky-600" />}
                        {tmpl.direction}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-medium">Default Weight</span>
                      <span className="font-bold text-slate-900">{tmpl.default_weightage}%</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-[11px] text-slate-400">
                    {tmpl.frequency} • {tmpl.evidence_required ? 'Evidence Req' : 'No Evidence Req'}
                  </span>
                  {isAdmin && (
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleOpenEdit(tmpl)}
                        className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        title="Edit Template"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setToggleStatusTarget(tmpl)}
                        className={`p-1.5 rounded-lg transition-colors ${
                          tmpl.status === 'active'
                            ? 'text-rose-500 hover:bg-rose-50'
                            : 'text-emerald-600 hover:bg-emerald-50'
                        }`}
                        title={tmpl.status === 'active' ? 'Deactivate' : 'Activate'}
                      >
                        {tmpl.status === 'active' ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create / Edit Template Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingTmpl ? 'Edit KPI Template' : 'Create KPI Template'}
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handlePromptSubmit} className="space-y-4 text-xs">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              KPI Template Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Monthly Sales Revenue Target"
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Description & Objective</label>
            <textarea
              rows={2}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Clarify calculation rules, data sources, and success criteria..."
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Category <span className="text-rose-500">*</span>
              </label>
              <select
                value={formData.category_id}
                onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Measurement Type</label>
              <select
                value={formData.measurement_type}
                onChange={(e) => setFormData({ ...formData, measurement_type: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
              >
                <option value="Number">Number</option>
                <option value="Percentage">Percentage</option>
                <option value="Currency">Currency</option>
                <option value="Rating">Rating</option>
                <option value="Exact Target">Exact Target</option>
                <option value="Completion Based">Completion Based</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Unit Label</label>
              <input
                type="text"
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                placeholder="e.g. ₹, %, Hours, Story Points"
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Evaluation Direction</label>
              <select
                value={formData.direction}
                onChange={(e) => setFormData({ ...formData, direction: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
              >
                <option value="Higher is Better">Higher is Better (Standard Growth)</option>
                <option value="Lower is Better">Lower is Better (e.g. Resolution Time, Errors)</option>
                <option value="Exact Target">Exact Target (e.g. Compliance count)</option>
                <option value="Completion Based">Completion Based (Milestones)</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Review Frequency</label>
              <select
                value={formData.frequency}
                onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
              >
                <option value="Monthly">Monthly</option>
                <option value="Quarterly">Quarterly</option>
                <option value="Half-Yearly">Half-Yearly</option>
                <option value="Yearly">Yearly</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Standard Target</label>
              <input
                type="number"
                step="any"
                value={formData.default_target}
                onChange={(e) => setFormData({ ...formData, default_target: Number(e.target.value) })}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none font-bold"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Min Threshold</label>
              <input
                type="number"
                step="any"
                value={formData.minimum_threshold}
                onChange={(e) => setFormData({ ...formData, minimum_threshold: Number(e.target.value) })}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Stretch Goal</label>
              <input
                type="number"
                step="any"
                value={formData.stretch_target}
                onChange={(e) => setFormData({ ...formData, stretch_target: Number(e.target.value) })}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Default Weight %</label>
              <input
                type="number"
                min="1"
                max="100"
                value={formData.default_weightage}
                onChange={(e) => setFormData({ ...formData, default_weightage: Number(e.target.value) })}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none font-bold"
              />
            </div>
          </div>

          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
            <div>
              <span className="font-semibold text-slate-800 block">Supporting Evidence Mandatory?</span>
              <span className="text-[11px] text-slate-500">
                Requires employee to upload or link evidence documentation when updating progress.
              </span>
            </div>
            <input
              type="checkbox"
              checked={formData.evidence_required}
              onChange={(e) => setFormData({ ...formData, evidence_required: e.target.checked })}
              className="w-4 h-4 text-indigo-600 rounded"
            />
          </div>

          <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl font-medium hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold shadow-sm"
            >
              Review & Save Template
            </button>
          </div>
        </form>
      </Modal>

      {/* Confirmation Modal */}
      <ConfirmDialog
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleConfirmSave}
        title={editingTmpl ? 'Confirm Template Update' : 'Confirm New KPI Template'}
        description="Please verify the target definition and evaluation rules before publishing to the library."
        details={[
          { label: 'Template Name', value: formData.name },
          { label: 'Default Target', value: `${formData.default_target} ${formData.unit}` },
          { label: 'Evaluation Direction', value: formData.direction },
          { label: 'Default Weightage', value: `${formData.default_weightage}%` }
        ]}
        confirmText="Publish Template"
        loading={submitting}
      />

      {/* Status Toggle Modal */}
      <ConfirmDialog
        isOpen={!!toggleStatusTarget}
        onClose={() => setToggleStatusTarget(null)}
        onConfirm={handleToggleStatus}
        title={`${toggleStatusTarget?.status === 'active' ? 'Deactivate' : 'Activate'} KPI Template`}
        message={`Are you sure you want to ${toggleStatusTarget?.status === 'active' ? 'deactivate' : 'activate'} "${toggleStatusTarget?.name}"?`}
        warningMessage={
          toggleStatusTarget?.status === 'active'
            ? 'Deactivated templates cannot be assigned to new employees, but existing historical assignments remain preserved.'
            : ''
        }
        confirmText={`${toggleStatusTarget?.status === 'active' ? 'Deactivate' : 'Activate'}`}
        danger={toggleStatusTarget?.status === 'active'}
      />
    </div>
  );
};

export default KPILibraryPage;
