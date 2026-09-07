import { formatDate } from '../../utils/formatters';
import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  Calendar,
  Clock
} from 'lucide-react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import Badge from '../../components/common/Badge';
import Modal from '../../components/common/Modal';

export const LeaveApprovalsPage = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [teamCalendar, setTeamCalendar] = useState([]);
  const [loading, setLoading] = useState(true);

  // Review Modal State
  const [activeReq, setActiveReq] = useState(null);
  const [reviewAction, setReviewAction] = useState('Approved');
  const [remarks, setRemarks] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Cancel Modal State
  const [cancelReq, setCancelReq] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelError, setCancelError] = useState('');
  const [cancelling, setCancelling] = useState(false);

  const isHR = ['super_admin', 'hr_admin', 'admin'].includes(user?.role);
  const isManager = user?.role === 'manager';

  const loadData = async () => {
    try {
      const [reqs, calendar] = await Promise.all([
        api.getLeaveApprovals(),
        api.getTeamLeaveCalendar()
      ]);
      setRequests(reqs || []);
      setTeamCalendar(calendar || []);
    } catch (err) {
      console.error('Failed to load leave approvals:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openReviewModal = (req, action) => {
    setActiveReq(req);
    setReviewAction(action);
    if (action === 'Approved') {
      if (isHR) {
        setRemarks(req.status === 'Pending'
          ? `Direct approval granted by HR Admin (${user?.name}) — Manager absent / Direct HR sign-off.`
          : `Final approval granted by HR Admin (${user?.name}). Leave quota confirmed.`
        );
      } else if (isManager) {
        setRemarks(`L1 approval granted by manager (${user?.name}). Handover coordinated. Forwarded to HR Admin.`);
      } else {
        setRemarks(`Leave approved by ${user?.name}.`);
      }
    } else {
      setRemarks('Declined due to team operational requirements and deadlines.');
    }
  };

  const submitReview = async (e) => {
    e.preventDefault();
    if (!activeReq) return;
    setSubmitting(true);
    try {
      await api.reviewLeave(activeReq.id, reviewAction, remarks);
      setActiveReq(null);
      await loadData();
    } catch (err) {
      alert(err.message || 'Failed to review leave');
    } finally {
      setSubmitting(false);
    }
  };

  const openCancelModal = (req) => {
    setCancelReq(req);
    setCancelReason('');
    setCancelError('');
  };

  const submitCancel = async (e) => {
    e.preventDefault();
    if (!cancelReq) return;
    if (!cancelReason || !cancelReason.trim()) {
      setCancelError('Please enter a cancellation reason.');
      return;
    }
    setCancelling(true);
    setCancelError('');
    try {
      await api.cancelLeave(cancelReq.id, cancelReason.trim());
      setCancelReq(null);
      setCancelReason('');
      await loadData();
    } catch (err) {
      setCancelError(err.message || 'Failed to cancel leave request');
    } finally {
      setCancelling(false);
    }
  };

  // Filter queues
  const todayStr = new Date().toISOString().split('T')[0];
  const pendingRequests = requests.filter(r => r.status === 'Pending' || r.status === 'L1 Approved');
  const activeApprovedRequests = requests.filter(r => r.status === 'Approved');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Leave Approvals & Multi-Tier Review</h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Review team leave requests, provide L1 endorsement, and grant final L2 / HR sign-offs
          </p>
        </div>
      </div>

      {/* Review Queue Card */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm">
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-slate-900">Pending Review Queue</h3>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
              {pendingRequests.length} action item(s)
            </span>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-[11px] text-slate-400 font-medium">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-400"></span> Level 1 Pending
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-sky-500"></span> L2 / HR Stage
            </span>
          </div>
        </div>

        {loading ? (
          <div className="py-12 flex justify-center">
            <div className="w-7 h-7 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : pendingRequests.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
            No pending leave requests awaiting approval!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase tracking-wider">
                  <th className="pb-3">Employee</th>
                  <th className="pb-3">Leave Type</th>
                  <th className="pb-3">Date Range</th>
                  <th className="pb-3">Duration</th>
                  <th className="pb-3">Reason</th>
                  <th className="pb-3">Workflow State</th>
                  <th className="pb-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pendingRequests.map((r) => {
                  const isL1Waiting = r.status === 'Pending';
                  const isL2Waiting = r.status === 'L1 Approved';
                  const canL1Approve = r.manager_id === user?.id;
                  const canL2Approve = r.l2_manager_id === user?.id || ['super_admin', 'hr_admin', 'admin'].includes(user?.role);

                  return (
                    <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 font-bold text-slate-900">
                        <div className="flex items-center gap-1.5">
                          <span>{r.employee_name}</span>
                          {(r.user_id === user?.id || r.employee_id === user?.id) && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                              You
                            </span>
                          )}
                        </div>
                        <span className="block text-[10px] font-normal text-slate-400">
                          {r.employee_code}
                          {r.applied_by_manager_name && (
                            <span className="text-indigo-600 font-medium ml-1">
                              (Applied by {r.applied_by_manager_name})
                            </span>
                          )}
                        </span>
                      </td>
                      <td className="py-3.5 text-slate-700 font-medium">{r.leave_type}</td>
                      <td className="py-3.5 text-slate-600 font-medium">
                        {formatDate(r.start_date)} <span className="text-slate-400">to</span> {formatDate(r.end_date)}
                      </td>
                      <td className="py-3.5 font-bold text-slate-800">{r.total_days} Day(s)</td>
                      <td className="py-3.5 text-slate-600 max-w-[180px] truncate" title={r.reason}>
                        {r.reason}
                      </td>
                      <td className="py-3.5">
                        {isL1Waiting && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                            <Clock className="w-3 h-3" />
                            Awaiting L1 Review
                          </span>
                        )}
                        {isL2Waiting && (
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-sky-50 text-sky-700 border border-sky-200">
                              <ShieldCheck className="w-3 h-3 text-sky-600" />
                              L1 Approved • Pending L2 / HR
                            </span>
                            {r.l1_approved_by && (
                              <span className="text-[10px] text-slate-400 block truncate">
                                By {r.l1_approved_by}
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 text-right space-x-1.5 whitespace-nowrap">
                        {isHR ? (
                          isL2Waiting ? (
                            <button
                              onClick={() => openReviewModal(r, 'Approved')}
                              className="px-2.5 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-lg font-bold text-[11px] transition-colors"
                            >
                              Final Approve (HR)
                            </button>
                          ) : (
                            <button
                              onClick={() => openReviewModal(r, 'Approved')}
                              className="px-2.5 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 rounded-lg font-bold text-[11px] transition-colors"
                              title="Manager absent bypass: Directly approve this leave request"
                            >
                              Approve (Manager Absent)
                            </button>
                          )
                        ) : isManager ? (
                          isL1Waiting ? (
                            <button
                              onClick={() => openReviewModal(r, 'Approved')}
                              className="px-2.5 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-lg font-bold text-[11px] transition-colors"
                            >
                              Endorse (L1)
                            </button>
                          ) : (
                            <span className="text-[11px] font-semibold text-slate-400 italic px-2">
                              Awaiting HR Sign-off
                            </span>
                          )
                        ) : null}

                        <button
                          onClick={() => openReviewModal(r, 'Rejected')}
                          className="px-2.5 py-1.5 bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 rounded-lg font-bold text-[11px] transition-colors"
                        >
                          Reject
                        </button>

                        {r.start_date >= todayStr && (
                          <button
                            onClick={() => openCancelModal(r)}
                            className="px-2.5 py-1.5 bg-slate-100 text-slate-700 hover:bg-rose-50 hover:text-rose-700 border border-slate-200 hover:border-rose-200 rounded-lg font-bold text-[11px] transition-colors"
                            title="Cancel this leave request with mandatory reason"
                          >
                            Cancel
                          </button>
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

      {/* Active Approved Leaves Section (Allows Cancellation before leave date) */}
      {activeApprovedRequests.length > 0 && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              <h3 className="text-base font-bold text-slate-900">Active & Approved Leave Records</h3>
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                {activeApprovedRequests.length}
              </span>
            </div>
            <span className="text-xs text-slate-400">Can be cancelled before the leave start date</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase tracking-wider">
                  <th className="pb-3">Employee</th>
                  <th className="pb-3">Leave Type</th>
                  <th className="pb-3">Date Range</th>
                  <th className="pb-3">Days</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3">Approved By</th>
                  <th className="pb-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {activeApprovedRequests.map((r) => {
                  const isPast = r.start_date < todayStr;
                  return (
                    <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 font-bold text-slate-900">
                        {r.employee_name}
                        <span className="block text-[10px] font-normal text-slate-400">{r.employee_code}</span>
                      </td>
                      <td className="py-3 text-slate-700 font-medium">{r.leave_type}</td>
                      <td className="py-3 text-slate-600">
                        {formatDate(r.start_date)} <span className="text-slate-400">to</span> {formatDate(r.end_date)}
                      </td>
                      <td className="py-3 font-bold text-slate-800">{r.total_days} Day(s)</td>
                      <td className="py-3">
                        <Badge variant="Approved">Approved</Badge>
                      </td>
                      <td className="py-3 text-slate-500 italic">
                        {r.approved_by ? `By ${r.approved_by}` : (r.hr_approved_by || 'HR Admin')}
                      </td>
                      <td className="py-3 text-right whitespace-nowrap">
                        {!isPast ? (
                          <button
                            onClick={() => openCancelModal(r)}
                            className="px-2.5 py-1 text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-lg font-bold text-[11px] transition-colors"
                            title="Cancel approved leave and refund balance"
                          >
                            Cancel Leave
                          </button>
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">Date Passed</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Team Leave Calendar */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm">
        <div className="flex items-center gap-2 pb-4 mb-4 border-b border-slate-100">
          <Calendar className="w-5 h-5 text-indigo-600" />
          <h3 className="text-base font-bold text-slate-900">Upcoming Approved Team Time-Off</h3>
        </div>

        {teamCalendar.length === 0 ? (
          <p className="text-xs text-slate-400 py-6 text-center">No approved upcoming leaves for your team.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {teamCalendar.map((leave) => (
              <div key={leave.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-slate-900">{leave.employee_name}</span>
                  <Badge variant={leave.leave_type} size="sm">{leave.leave_type}</Badge>
                </div>
                <p className="text-xs font-medium text-slate-600">
                  {formatDate(leave.start_date)} to {formatDate(leave.end_date)}
                </p>
                <p className="text-[11px] text-slate-400 mt-1">({leave.total_days} days) • Approved</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Review Confirmation Modal */}
      <Modal
        isOpen={!!activeReq}
        onClose={() => setActiveReq(null)}
        title={`${reviewAction} Leave Application`}
      >
        <form onSubmit={submitReview} className="space-y-4 text-xs">
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
            <div className="flex items-center justify-between">
              <p className="font-bold text-slate-900 text-sm">{activeReq?.employee_name}</p>
              <Badge variant={activeReq?.status}>{activeReq?.status}</Badge>
            </div>
            <p className="text-slate-600 font-medium">
              {activeReq?.leave_type} • {formatDate(activeReq?.start_date)} to {formatDate(activeReq?.end_date)} ({activeReq?.total_days} days)
            </p>
            <p className="text-slate-500 italic pt-1">"{activeReq?.reason}"</p>
            {activeReq?.l1_approved_by && (
              <p className="text-[11px] text-indigo-700 pt-1 font-semibold">
                ✓ L1 Approved by {activeReq.l1_approved_by}
              </p>
            )}
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              {reviewAction === 'Approved' ? 'Approval Remarks & Handover Notes' : 'Rejection Reason'}
            </label>
            <textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              rows={3}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
              required
            />
          </div>

          <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setActiveReq(null)}
              className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className={`px-4 py-2 text-white rounded-xl font-bold shadow-sm ${
                reviewAction === 'Approved' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
              }`}
            >
              {submitting ? 'Submitting...' : `Confirm ${reviewAction}`}
            </button>
          </div>
        </form>
      </Modal>

      {/* Cancellation Modal with Mandatory Reason */}
      <Modal
        isOpen={!!cancelReq}
        onClose={() => { setCancelReq(null); setCancelReason(''); setCancelError(''); }}
        title={`Cancel Leave — ${cancelReq?.employee_name}`}
      >
        <form onSubmit={submitCancel} className="space-y-4 text-xs">
          <div className="p-3.5 bg-rose-50 rounded-2xl border border-rose-100 text-rose-900 space-y-1">
            <p className="font-bold text-sm">
              {cancelReq?.employee_name} ({cancelReq?.employee_code})
            </p>
            <p className="text-rose-700 font-medium">
              {cancelReq?.leave_type} • {formatDate(cancelReq?.start_date)} to {formatDate(cancelReq?.end_date)} ({cancelReq?.total_days} Day(s))
            </p>
            <p className="text-[11px] text-rose-600 pt-1">
              • Cancellation is permitted before the leave start date.<br />
              • If this leave was already approved, deducted leave days will be automatically refunded back to the employee's quota.
            </p>
          </div>

          {cancelError && (
            <div className="p-2.5 rounded-xl bg-rose-100 text-rose-800 text-xs font-semibold">
              {cancelError}
            </div>
          )}

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Mandatory Cancellation Reason <span className="text-rose-500 font-bold">*</span>
            </label>
            <textarea
              value={cancelReason}
              onChange={(e) => { setCancelReason(e.target.value); setCancelError(''); }}
              placeholder="State the detailed reason for cancelling this leave request..."
              rows={3}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-rose-500"
              required
            />
          </div>

          <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => { setCancelReq(null); setCancelReason(''); setCancelError(''); }}
              className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl font-medium hover:bg-slate-50"
            >
              Back
            </button>
            <button
              type="submit"
              disabled={cancelling}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold shadow-sm"
            >
              {cancelling ? 'Cancelling...' : 'Confirm Cancellation'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default LeaveApprovalsPage;
