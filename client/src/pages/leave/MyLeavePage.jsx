import { formatDate } from '../../utils/formatters';
import React, { useState, useEffect } from 'react';
import { Plus, Calendar, Clock, CheckCircle2, AlertCircle, CalendarCheck } from 'lucide-react';
import { api } from '../../services/api';
import Badge from '../../components/common/Badge';
import Modal from '../../components/common/Modal';
import ConfirmDialog from '../../components/common/ConfirmDialog';

export const MyLeavePage = () => {
  const [balances, setBalances] = useState([]);
  const [myRequests, setMyRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  // Apply Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const initialForm = {
    leave_type: 'Casual Leave',
    start_date: '',
    end_date: '',
    reason: ''
  };
  const [formData, setFormData] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Confirmation dialog states
  const [cancelConfirmTarget, setCancelConfirmTarget] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelError, setCancelError] = useState('');
  const [applyConfirmOpen, setApplyConfirmOpen] = useState(false);
  const [unsavedConfirmOpen, setUnsavedConfirmOpen] = useState(false);

  const isFormDirty = () => {
    return (
      formData.start_date !== '' ||
      formData.end_date !== '' ||
      formData.reason.trim() !== '' ||
      formData.leave_type !== 'Casual Leave'
    );
  };

  const loadLeaveData = async () => {
    try {
      const [b, reqs] = await Promise.all([
        api.getLeaveBalances(),
        api.getMyLeaves()
      ]);
      setBalances(b || []);
      setMyRequests(reqs || []);
    } catch (err) {
      console.error('Failed to load leave data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLeaveData();
  }, []);

  const calculateDays = () => {
    if (!formData.start_date || !formData.end_date) return 0;
    const start = new Date(formData.start_date);
    const end = new Date(formData.end_date);
    if (end < start) return 0;
    const diffTime = Math.abs(end - start);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  };

  const handlePromptApply = (e) => {
    e.preventDefault();
    setError('');
    const days = calculateDays();
    if (days <= 0) {
      setError('End Date must be on or after Start Date.');
      return;
    }
    setApplyConfirmOpen(true);
  };

  const handleConfirmApply = async () => {
    setSubmitting(true);
    setError('');
    setSuccess('');
    try {
      await api.applyLeave(formData);
      setSuccess('Leave application submitted successfully!');
      setApplyConfirmOpen(false);
      setIsModalOpen(false);
      setFormData(initialForm);
      await loadLeaveData();
    } catch (err) {
      setApplyConfirmOpen(false);
      setError(err.message || 'Failed to submit leave request');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmCancel = async (e) => {
    if (e) e.preventDefault();
    if (!cancelConfirmTarget) return;
    if (!cancelReason || !cancelReason.trim()) {
      setCancelError('Please enter a cancellation reason.');
      return;
    }
    setSubmitting(true);
    setCancelError('');
    try {
      await api.cancelLeave(cancelConfirmTarget.id, cancelReason.trim());
      setSuccess('Leave request has been cancelled and leave balance updated.');
      setCancelConfirmTarget(null);
      setCancelReason('');
      await loadLeaveData();
    } catch (err) {
      setCancelError(err.message || 'Failed to cancel leave');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCloseModal = () => {
    if (isFormDirty()) {
      setUnsavedConfirmOpen(true);
    } else {
      setIsModalOpen(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const requestedDays = calculateDays();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">My Leave & Time Off</h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Check your balance quotas, apply for leave, and monitor review statuses
          </p>
        </div>
        <button
          onClick={() => {
            setError('');
            setFormData(initialForm);
            setIsModalOpen(true);
          }}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-md transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Apply for Leave</span>
        </button>
      </div>

      {success && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-medium text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Balance Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {(balances && balances.length > 0 ? balances : [
          { id: 'cl', leave_type: 'Casual Leave', code: 'CL', remaining_leaves: 6, total_leaves: 6, used_leaves: 0 },
          { id: 'sl', leave_type: 'Sick Leave', code: 'SL', remaining_leaves: 6, total_leaves: 6, used_leaves: 0 },
          { id: 'el', leave_type: 'Earned Leave', code: 'EL', remaining_leaves: 8, total_leaves: 8, used_leaves: 0 },
          { id: 'lwp', leave_type: 'Leave Without Pay', code: 'LWP', remaining_leaves: 'Flexible', total_leaves: 'Flexible', used_leaves: 0 },
          { id: 'hd', leave_type: 'Half Day Leave', code: 'HD', remaining_leaves: '0.5 / session', total_leaves: 'Flexible', used_leaves: 0 },
        ]).map((b) => {
          const isUnpaid = b.leave_type?.includes('Without Pay') || b.leave_type?.includes('LWP') || b.remaining_leaves === 'Flexible';
          const isHalfDay = b.leave_type?.includes('Half Day') || b.code === 'HD';
          return (
            <div key={b.id || b.leave_type} className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-slate-800 truncate block">{b.leave_type}</span>
                  <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700">
                    {b.code || b.leave_type.split(' ').map(w => w[0]).join('')}
                  </span>
                </div>
                <div className="flex items-baseline gap-1 mt-2">
                  <span className="text-2xl font-black text-slate-900">{b.remaining_leaves}</span>
                  {!isUnpaid && !isHalfDay && (
                    <span className="text-xs font-medium text-slate-400">/ {b.total_leaves} left</span>
                  )}
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                <span>Used this year</span>
                <span className="font-semibold text-slate-700">{b.used_leaves || 0}d</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Leave Application History */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm">
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
          <h3 className="text-base font-bold text-slate-900">My Leave Applications & History</h3>
          <span className="text-xs text-slate-400">{myRequests.length} Total Requests</span>
        </div>

        {myRequests.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400">
            You haven't submitted any leave applications yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase tracking-wider">
                  <th className="pb-3">Leave Type</th>
                  <th className="pb-3">Duration</th>
                  <th className="pb-3">Days</th>
                  <th className="pb-3">Reason</th>
                  <th className="pb-3">Applied On</th>
                  <th className="pb-3">Review Remarks</th>
                  <th className="pb-3 text-right">Status</th>
                  <th className="pb-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {myRequests.map((req) => {
                  const todayStr = new Date().toISOString().split('T')[0];
                  const isPast = req.start_date < todayStr;
                  const isCancelable = ['Pending', 'L1 Approved', 'Approved'].includes(req.status) && !isPast;
                  return (
                    <tr key={req.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 font-bold text-slate-900">
                        {req.leave_type}
                      </td>
                      <td className="py-3.5 text-slate-700">
                        {formatDate(req.start_date)}
                        {req.start_date !== req.end_date && ` → ${formatDate(req.end_date)}`}
                      </td>
                      <td className="py-3.5 font-semibold text-slate-700">
                        {req.days_count || req.total_days || 1} d
                      </td>
                      <td className="py-3.5 text-slate-600 max-w-[200px] truncate" title={req.reason}>
                        {req.reason}
                      </td>
                      <td className="py-3.5 text-slate-400">
                        {formatDate(req.createdAt)}
                      </td>
                      <td className="py-3.5 text-slate-500 italic max-w-[160px] truncate">
                        {req.status === 'Cancelled' ? (
                          <span className="text-rose-600 font-medium" title={req.cancellation_reason}>
                            Cancelled: {req.cancellation_reason || 'By User'}
                          </span>
                        ) : (
                          req.approver_remarks || (req.approved_by ? `By ${req.approved_by}` : '--')
                        )}
                      </td>
                      <td className="py-3.5 text-right">
                        <Badge variant={req.status}>{req.status}</Badge>
                      </td>
                      <td className="py-3.5 text-right whitespace-nowrap">
                        {isCancelable ? (
                          <button
                            onClick={() => {
                              setCancelConfirmTarget(req);
                              setCancelReason('');
                              setCancelError('');
                            }}
                            className="text-[11px] font-bold text-rose-600 hover:text-rose-800 hover:underline"
                          >
                            Cancel Leave
                          </button>
                        ) : isPast && ['Pending', 'L1 Approved', 'Approved'].includes(req.status) ? (
                          <span className="text-[10px] text-slate-400 italic">Past Leave Date</span>
                        ) : (
                          <span className="text-slate-300">--</span>
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

      {/* Apply Leave Modal */}
      <Modal isOpen={isModalOpen} onClose={handleCloseModal} title="Apply for Time Off" maxWidth="max-w-xl">
        <form onSubmit={handlePromptApply} className="space-y-4 text-xs">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block font-semibold text-slate-700 mb-2">Select Leave Policy</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {[
                { type: 'Casual Leave', code: 'CL', quota: '6 Days/Yr', subtitle: 'Short personal time' },
                { type: 'Sick Leave', code: 'SL', quota: '6 Days/Yr', subtitle: 'Medical/health care' },
                { type: 'Earned Leave', code: 'EL', quota: '8 Days/Yr', subtitle: 'Planned vacations' },
                { type: 'Leave Without Pay', code: 'LWP', quota: 'Flexible', subtitle: 'Unpaid personal' },
                { type: 'Half Day Leave', code: 'HD', quota: '0.5 Day', subtitle: 'Morning / Evening' }
              ].map((cat) => {
                const isSelected = formData.leave_type === cat.type;
                return (
                  <button
                    key={cat.type}
                    type="button"
                    onClick={() => setFormData({ ...formData, leave_type: cat.type })}
                    className={`p-3 text-left rounded-xl border transition-all ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50/50 shadow-sm'
                        : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] font-bold text-slate-900 truncate block">{cat.type}</span>
                      <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-white text-indigo-700 border border-indigo-100">
                        {cat.code}
                      </span>
                    </div>
                    <span className="text-xs font-extrabold text-indigo-600 block">{cat.quota}</span>
                    <span className="text-[10px] text-slate-400 block">{cat.subtitle}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Start Date <span className="text-rose-500 font-bold">*</span>
              </label>
              <input
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                End Date <span className="text-rose-500 font-bold">*</span>
              </label>
              <input
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                required
              />
            </div>
          </div>

          {requestedDays > 0 && (
            <div className="p-3 bg-indigo-50/60 rounded-xl border border-indigo-100 flex items-center justify-between text-indigo-900 font-semibold">
              <span>Total Requested Duration:</span>
              <span>{requestedDays} Calendar Day(s)</span>
            </div>
          )}

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Reason for Leave <span className="text-rose-500 font-bold">*</span>
            </label>
            <textarea
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              placeholder="Briefly state the reason for your time off..."
              rows={3}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
              required
            />
          </div>

          <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={handleCloseModal}
              className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl font-medium hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium shadow-sm"
            >
              Review & Submit
            </button>
          </div>
        </form>
      </Modal>

      {/* Confirmation Dialog for Leave Application */}
      <ConfirmDialog
        isOpen={applyConfirmOpen}
        onClose={() => setApplyConfirmOpen(false)}
        onConfirm={handleConfirmApply}
        title="Confirm Leave Application"
        description="Please confirm the details of your leave request before submitting for manager approval."
        details={[
          { label: 'Leave Type', value: formData.leave_type },
          { label: 'Duration', value: `${formatDate(formData.start_date)} → ${formatDate(formData.end_date)}` },
          { label: 'Total Days', value: `${requestedDays} day(s)` },
          { label: 'Reason', value: formData.reason }
        ]}
        confirmText="Submit Leave Request"
        variant="primary"
        loading={submitting}
      />

      {/* Modal for Leave Cancellation with Mandatory Reason */}
      <Modal
        isOpen={!!cancelConfirmTarget}
        onClose={() => { setCancelConfirmTarget(null); setCancelReason(''); setCancelError(''); }}
        title="Cancel Leave Request"
      >
        <form onSubmit={handleConfirmCancel} className="space-y-4 text-xs">
          <div className="p-3.5 bg-rose-50 rounded-2xl border border-rose-100 text-rose-900 space-y-1">
            <p className="font-bold text-sm">
              {cancelConfirmTarget?.leave_type} — {cancelConfirmTarget?.total_days || cancelConfirmTarget?.days_count || 1} Day(s)
            </p>
            <p className="text-rose-700 font-medium">
              {formatDate(cancelConfirmTarget?.start_date)} {cancelConfirmTarget?.start_date !== cancelConfirmTarget?.end_date && `to ${formatDate(cancelConfirmTarget?.end_date)}`}
            </p>
            <p className="text-[11px] text-rose-600 pt-1">
              • Leaves can only be cancelled before the leave start date.<br />
              • If already approved, deducted leave days will be automatically restored to your balance.
            </p>
          </div>

          {cancelError && (
            <div className="p-2.5 rounded-xl bg-rose-100 text-rose-800 text-xs font-semibold">
              {cancelError}
            </div>
          )}

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Cancellation Reason <span className="text-rose-500 font-bold">*</span>
            </label>
            <textarea
              value={cancelReason}
              onChange={(e) => { setCancelReason(e.target.value); setCancelError(''); }}
              placeholder="State the reason why you need to cancel this leave..."
              rows={3}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-rose-500"
              required
            />
          </div>

          <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => { setCancelConfirmTarget(null); setCancelReason(''); setCancelError(''); }}
              className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl font-medium hover:bg-slate-50"
            >
              Keep Leave
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold shadow-sm"
            >
              {submitting ? 'Cancelling...' : 'Confirm Cancellation'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Confirmation Dialog for Unsaved Changes */}
      <ConfirmDialog
        isOpen={unsavedConfirmOpen}
        onClose={() => setUnsavedConfirmOpen(false)}
        onConfirm={() => {
          setUnsavedConfirmOpen(false);
          setIsModalOpen(false);
        }}
        title="Discard Unsaved Changes?"
        message="You have entered leave details in this form. Are you sure you want to discard them?"
        confirmText="Discard Changes"
        cancelText="Keep Editing"
        danger={true}
      />
    </div>
  );
};

export default MyLeavePage;
