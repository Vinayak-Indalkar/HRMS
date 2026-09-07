import React, { useState, useEffect } from 'react';
import {
  ClipboardCheck,
  Award,
  Clock,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  MessageSquare,
  Search,
  Filter,
  Star,
  ChevronRight,
  ShieldCheck,
  Check,
  Sparkles
} from 'lucide-react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { formatDate } from '../../utils/formatters';
import Badge from '../../components/common/Badge';
import Modal from '../../components/common/Modal';
import ConfirmDialog from '../../components/common/ConfirmDialog';

export const KPIReviewsPage = () => {
  const { user } = useAuth();
  const role = user?.role || 'employee';

  const [reviewsList, setReviewsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Review Modal State
  const [selectedAsgn, setSelectedAsgn] = useState(null);
  const [score, setScore] = useState(4);
  const [managerComment, setManagerComment] = useState('');
  const [reviewStatus, setReviewStatus] = useState('Reviewed'); // 'Reviewed' | 'Changes Requested' | 'Finalized'
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState('');

  const fetchPendingReviews = async () => {
    setLoading(true);
    try {
      const data = await api.getPendingKpiReviews();
      setReviewsList(data || []);
    } catch (err) {
      console.error('Failed to load pending reviews:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingReviews();
  }, []);

  const handleOpenReview = (asgn) => {
    setSelectedAsgn(asgn);
    setScore(asgn.score || 4);
    setManagerComment(asgn.last_review?.manager_comment || '');
    setReviewStatus(asgn.last_review?.status || 'Reviewed');
  };

  const handlePromptSubmitReview = (e) => {
    e.preventDefault();
    setConfirmOpen(true);
  };

  const handleConfirmSubmitReview = async () => {
    if (!selectedAsgn) return;
    setSubmitting(true);
    try {
      await api.submitKpiReview(selectedAsgn.id, {
        score: Number(score),
        manager_comment: managerComment,
        status: reviewStatus
      });
      setConfirmOpen(false);
      setSelectedAsgn(null);
      setSuccess(`Review submitted for ${selectedAsgn.employee_name} (${selectedAsgn.kpi_name}).`);
      await fetchPendingReviews();
    } catch (err) {
      alert(err.message || 'Failed to submit review');
      setConfirmOpen(false);
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = reviewsList.filter((a) => {
    if (statusFilter === 'pending' && a.score) return false;
    if (statusFilter === 'scored' && !a.score) return false;
    if (search) {
      const s = search.toLowerCase();
      return (
        a.employee_name.toLowerCase().includes(s) ||
        a.employee_code.toLowerCase().includes(s) ||
        a.kpi_name.toLowerCase().includes(s)
      );
    }
    return true;
  });

  const ratingDescriptions = {
    1: '1 — Poor (Significant shortfall, critical intervention needed)',
    2: '2 — Needs Improvement (Partial target met, progress lagged behind)',
    3: '3 — Meets Expectations (Solid performance achieving core baseline)',
    4: '4 — Exceeds Expectations (High quality delivery beyond standard target)',
    5: '5 — Outstanding (Exceptional milestone achievement with major organizational impact)'
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">KPI Performance Reviews & Sign-offs</h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Evaluate team submissions, rate execution on a 1–5 scale, provide constructive feedback, and finalize cycle scores
          </p>
        </div>
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
            placeholder="Search by team member, ID, or KPI title..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div className="sm:w-56">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none"
          >
            <option value="">All Review Items</option>
            <option value="pending">Pending Sign-off Only</option>
            <option value="scored">Already Scored</option>
          </select>
        </div>
      </div>

      {/* Review Queue Cards */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <ClipboardCheck className="w-4 h-4 text-indigo-600" />
            <span>Team Review Queue ({filtered.length})</span>
          </h3>
        </div>

        {loading ? (
          <div className="py-16 flex justify-center">
            <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400">
            No items in the review queue matching your criteria.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map((asgn) => {
              const ach = asgn.achievement_percentage || 0;
              const hasScore = asgn.score !== null && asgn.score !== undefined;
              return (
                <div
                  key={asgn.id}
                  className={`p-5 rounded-2xl border transition-all flex flex-col justify-between ${
                    hasScore
                      ? 'bg-slate-50/50 border-slate-200'
                      : 'bg-indigo-50/20 border-indigo-200 hover:border-indigo-400 shadow-sm'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700">
                          {asgn.department_name}
                        </span>
                        <h4 className="text-sm font-bold text-slate-900 mt-1 leading-snug">
                          {asgn.employee_name}
                        </h4>
                        <span className="text-[11px] text-slate-400">
                          {asgn.employee_code} • {asgn.designation}
                        </span>
                      </div>
                      <Badge variant={hasScore ? 'active' : 'pending'}>
                        {hasScore ? `Rated ${asgn.score}/5` : 'Needs Review'}
                      </Badge>
                    </div>

                    {/* KPI Box */}
                    <div className="mt-3 p-3 bg-white rounded-xl border border-slate-100 space-y-1.5 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900">{asgn.kpi_name}</span>
                        <span className="text-[11px] text-slate-500 font-medium">Weight: {asgn.weightage}%</span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-600">
                        <span>
                          Target: <strong>{asgn.target_value} {asgn.unit}</strong>
                        </span>
                        <span>
                          Current: <strong className="text-indigo-600">{asgn.current_value} {asgn.unit}</strong>
                        </span>
                      </div>
                      {/* Achievement Bar */}
                      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            ach >= 80 ? 'bg-indigo-600' : ach >= 50 ? 'bg-amber-500' : 'bg-rose-500'
                          }`}
                          style={{ width: `${Math.min(100, ach)}%` }}
                        />
                      </div>
                      <div className="text-right text-[10px] font-extrabold text-slate-800">
                        {ach}% Achieved
                      </div>
                    </div>

                    {/* Last Comment / Evidence */}
                    {asgn.last_progress && (
                      <div className="mt-2.5 p-2.5 bg-slate-100/70 rounded-xl text-xs space-y-1">
                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                          Latest Employee Comment:
                        </div>
                        <p className="text-slate-700 italic text-[11px]">
                          "{asgn.last_progress.employee_comment || 'No notes provided'}"
                        </p>
                        {asgn.last_progress.evidence_url && (
                          <a
                            href={asgn.last_progress.evidence_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold"
                          >
                            <ExternalLink className="w-3 h-3" />
                            <span>View Attached Evidence</span>
                          </a>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Actions Footer */}
                  <div className="mt-4 pt-3 border-t border-slate-200/60 flex items-center justify-between">
                    <span className="text-[11px] text-slate-400">{asgn.period_name}</span>
                    <button
                      onClick={() => handleOpenReview(asgn)}
                      className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5"
                    >
                      <Award className="w-3.5 h-3.5" />
                      <span>{hasScore ? 'Update Review' : 'Score & Review'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Review Modal */}
      <Modal
        isOpen={!!selectedAsgn}
        onClose={() => setSelectedAsgn(null)}
        title="Manager Performance Review"
        maxWidth="max-w-lg"
      >
        {selectedAsgn && (
          <form onSubmit={handlePromptSubmitReview} className="space-y-4 text-xs">
            {/* Header info */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
              <div className="font-bold text-slate-900 text-sm">{selectedAsgn.employee_name}</div>
              <div className="text-[11px] text-slate-500">
                KPI: <span className="font-semibold text-slate-800">{selectedAsgn.kpi_name}</span> ({selectedAsgn.weightage}%)
              </div>
              <div className="text-[11px] text-slate-700 font-medium">
                Target: {selectedAsgn.target_value} {selectedAsgn.unit} • Current: {selectedAsgn.current_value} {selectedAsgn.unit} ({selectedAsgn.achievement_percentage}% achievement)
              </div>
            </div>

            {/* Score Selector (1-5) */}
            <div>
              <label className="block font-semibold text-slate-700 mb-2">
                Performance Rating Score (1 to 5) <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-5 gap-2">
                {[1, 2, 3, 4, 5].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setScore(num)}
                    className={`py-3 rounded-xl border font-black text-sm flex flex-col items-center justify-center gap-1 transition-all ${
                      score === num
                        ? 'bg-indigo-600 border-indigo-600 text-white shadow-md'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span>{num}</span>
                    <Star className={`w-3.5 h-3.5 ${score === num ? 'fill-white text-white' : 'text-slate-400'}`} />
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-indigo-700 font-semibold mt-2 bg-indigo-50/70 p-2 rounded-lg border border-indigo-100">
                {ratingDescriptions[score]}
              </p>
            </div>

            {/* Review Decision Status */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Review Outcome Status</label>
              <select
                value={reviewStatus}
                onChange={(e) => setReviewStatus(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold"
              >
                <option value="Reviewed">Reviewed (Standard feedback provided)</option>
                <option value="Finalized">Finalized (Lock score & complete cycle)</option>
                <option value="Changes Requested">Changes Requested (Ask employee for more evidence)</option>
              </select>
            </div>

            {/* Manager Remarks */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Constructive Feedback & Coaching Remarks
              </label>
              <textarea
                rows={3}
                required
                value={managerComment}
                onChange={(e) => setManagerComment(e.target.value)}
                placeholder="Highlight key achievements, areas for improvement, and forward recommendations..."
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSelectedAsgn(null)}
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

      {/* Confirmation Modal */}
      <ConfirmDialog
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleConfirmSubmitReview}
        title={reviewStatus === 'Finalized' ? 'Finalize KPI Review?' : 'Submit Performance Review'}
        description={
          reviewStatus === 'Finalized'
            ? "Once finalized, the employee's KPI score and manager review cannot be changed without authorized HR/Admin action."
            : 'Please confirm your rating and feedback. The employee will receive a notification with your evaluation.'
        }
        details={[
          { label: 'Employee', value: selectedAsgn?.employee_name },
          { label: 'Assigned Score', value: `${score} / 5 (${ratingDescriptions[score]?.split('—')[1]?.trim()})` },
          { label: 'Outcome Status', value: reviewStatus },
          { label: 'Manager Comments', value: managerComment || 'None provided' }
        ]}
        confirmText={reviewStatus === 'Finalized' ? 'Finalize Review' : 'Submit Review'}
        variant={reviewStatus === 'Finalized' ? 'primary' : 'primary'}
        loading={submitting}
      />
    </div>
  );
};

export default KPIReviewsPage;
