import { formatDate } from '../../utils/formatters';
import React, { useState, useEffect } from 'react';
import { Shield, Filter, CheckCircle, XCircle, Search, Edit3 } from 'lucide-react';
import { api } from '../../services/api';
import Badge from '../../components/common/Badge';
import Modal from '../../components/common/Modal';

export const AdminLeavesPage = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');

  // Override / Review Modal
  const [activeReq, setActiveReq] = useState(null);
  const [actionType, setActionType] = useState('Approved');
  const [remarks, setRemarks] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Cancel Modal
  const [cancelReq, setCancelReq] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelError, setCancelError] = useState('');
  const [cancelling, setCancelling] = useState(false);

  const fetchAllLeaves = async () => {
    setLoading(true);
    try {
      const data = await api.getAllLeaves();
      setRequests(data || []);
    } catch (err) {
      console.error('Failed to fetch all leaves:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllLeaves();
  }, []);

  const handleReview = async (e) => {
    e.preventDefault();
    if (!activeReq) return;
    setSubmitting(true);
    try {
      await api.reviewLeave(activeReq.id, actionType, remarks);
      setActiveReq(null);
      await fetchAllLeaves();
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async (e) => {
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
      await fetchAllLeaves();
    } catch (err) {
      setCancelError(err.message || 'Failed to cancel leave');
    } finally {
      setCancelling(false);
    }
  };

  const todayStr = new Date().toISOString().split('T')[0];

  const filtered = requests.filter(r => {
    if (statusFilter && r.status !== statusFilter) return false;
    if (search) {
      const s = search.toLowerCase();
      return r.employee_name?.toLowerCase().includes(s) || r.employee_code?.toLowerCase().includes(s);
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Company Leave Administration</h2>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Master registry of all leave requests, HR policy overrides, and audit trails
        </p>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by employee name or ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="">All Request Statuses</option>
            <option value="Pending">Pending</option>
            <option value="L1 Approved">L1 Approved</option>
            <option value="Approved">Approved</option>
            <option value="Rejected">Rejected</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Leaves Table */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm">
        <h3 className="text-base font-bold text-slate-900 mb-4">
          All Leave Applications ({filtered.length})
        </h3>

        {loading ? (
          <div className="py-12 flex justify-center">
            <div className="w-7 h-7 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400">
            No leave requests found matching filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase tracking-wider">
                  <th className="pb-3">Employee</th>
                  <th className="pb-3">Leave Type</th>
                  <th className="pb-3">Duration</th>
                  <th className="pb-3">Days</th>
                  <th className="pb-3">Reason</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3">Reviewer Details</th>
                  <th className="pb-3 text-right">HR Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((r) => {
                  const isPendingOrL1 = r.status === 'Pending' || r.status === 'L1 Approved';
                  const isCancelable = ['Pending', 'L1 Approved', 'Approved'].includes(r.status) && r.start_date >= todayStr;
                  const isPastDate = r.start_date < todayStr;

                  return (
                    <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 font-bold text-slate-900">
                        {r.employee_name}
                        <span className="block text-[10px] font-normal text-slate-400">{r.employee_code}</span>
                      </td>
                      <td className="py-3 font-medium text-slate-700">{r.leave_type}</td>
                      <td className="py-3 text-slate-600">
                        {formatDate(r.start_date)} <span className="text-slate-400">to</span> {formatDate(r.end_date)}
                      </td>
                      <td className="py-3 font-semibold text-slate-800">{r.total_days}</td>
                      <td className="py-3 text-slate-600 max-w-[180px] truncate" title={r.reason}>
                        {r.reason}
                      </td>
                      <td className="py-3">
                        <Badge variant={r.status}>{r.status}</Badge>
                      </td>
                      <td className="py-3 text-slate-500 italic max-w-[150px] truncate">
                        {r.status === 'Cancelled' ? (
                          <span className="text-rose-600 font-medium" title={r.cancellation_reason}>
                            Cancelled: {r.cancellation_reason || 'By Admin'}
                          </span>
                        ) : (
                          r.approver_remarks || (r.approved_by ? `By ${r.approved_by}` : '--')
                        )}
                      </td>
                      <td className="py-3 text-right space-x-1.5 whitespace-nowrap">
                        {isPendingOrL1 && (
                          <>
                            <button
                              onClick={() => {
                                setActiveReq(r);
                                setActionType('Approved');
                                setRemarks(r.status === 'Pending'
                                  ? 'Approved directly via HR Administration (Manager absent bypass)'
                                  : 'Final sign-off approved via HR Administration (L1 endorsed by manager)'
                                );
                              }}
                              className="px-2 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded font-semibold text-[11px]"
                              title={r.status === 'Pending' ? 'Direct HR approval when manager is absent' : 'Grant final HR approval'}
                            >
                              {r.status === 'Pending' ? 'Approve (Direct)' : 'Approve'}
                            </button>
                            <button
                              onClick={() => {
                                setActiveReq(r);
                                setActionType('Rejected');
                                setRemarks(`Declined via HR Administration override`);
                              }}
                              className="px-2 py-1 bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 rounded font-semibold text-[11px]"
                            >
                              Reject
                            </button>
                          </>
                        )}

                        {isCancelable && (
                          <button
                            onClick={() => {
                              setCancelReq(r);
                              setCancelReason('');
                              setCancelError('');
                            }}
                            className="px-2 py-1 bg-slate-100 text-slate-700 hover:bg-rose-50 hover:text-rose-700 border border-slate-200 rounded font-semibold text-[11px]"
                            title="Cancel leave request with reason"
                          >
                            Cancel
                          </button>
                        )}

                        {isPastDate && ['Pending', 'L1 Approved', 'Approved'].includes(r.status) && (
                          <span className="text-[10px] text-slate-400 italic">Past date</span>
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

      {/* Override / Review Modal */}
      <Modal
        isOpen={!!activeReq}
        onClose={() => setActiveReq(null)}
        title={`HR Action: Mark as ${actionType}`}
      >
        <form onSubmit={handleReview} className="space-y-4 text-xs">
          <p className="text-slate-600">
            Applying HR administrative action for <strong>{activeReq?.employee_name}</strong> ({activeReq?.leave_type}, {activeReq?.total_days} days).
          </p>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Administrative Note / Remarks</label>
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
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium shadow-sm"
            >
              {submitting ? 'Applying...' : `Confirm ${actionType}`}
            </button>
          </div>
        </form>
      </Modal>

      {/* Cancel Modal with Mandatory Reason */}
      <Modal
        isOpen={!!cancelReq}
        onClose={() => { setCancelReq(null); setCancelReason(''); setCancelError(''); }}
        title={`Cancel Leave — ${cancelReq?.employee_name}`}
      >
        <form onSubmit={handleCancel} className="space-y-4 text-xs">
          <div className="p-3.5 bg-rose-50 rounded-2xl border border-rose-100 text-rose-900 space-y-1">
            <p className="font-bold text-sm">
              {cancelReq?.employee_name} ({cancelReq?.employee_code})
            </p>
            <p className="text-rose-700 font-medium">
              {cancelReq?.leave_type} • {formatDate(cancelReq?.start_date)} to {formatDate(cancelReq?.end_date)} ({cancelReq?.total_days} Day(s))
            </p>
            <p className="text-[11px] text-rose-600 pt-1">
              • Cancellation is allowed before the leave start date.<br />
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
              placeholder="State the reason why this leave request is being cancelled..."
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

export default AdminLeavesPage;
