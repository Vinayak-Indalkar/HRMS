import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  Search,
  Filter,
  Calendar,
  CalendarCheck,
  CalendarPlus,
  Clock,
  Shield,
  CheckCircle2,
  XCircle,
  AlertCircle,
  FileText,
  User,
  X,
  ChevronDown
} from 'lucide-react';
import { api } from '../../services/api';
import { formatDate } from '../../utils/formatters';
import Badge from '../../components/common/Badge';
import Modal from '../../components/common/Modal';
import ConfirmDialog from '../../components/common/ConfirmDialog';

export const TeamLeavePage = ({ onNavigate }) => {
  const [leaves, setLeaves] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [selectedLeaveType, setSelectedLeaveType] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [requestToCancel, setRequestToCancel] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelError, setCancelError] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [notification, setNotification] = useState('');

  const todayStr = new Date().toISOString().split('T')[0];

  const loadData = async () => {
    setLoading(true);
    try {
      const [allTeamLeaves, members] = await Promise.all([
        api.getTeamLeaves(),
        api.getTeamMembers().catch(() => [])
      ]);
      setLeaves(allTeamLeaves || []);
      setTeamMembers(members || []);
    } catch (err) {
      console.error('Failed to load team leaves:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filtered leaves
  const filteredLeaves = useMemo(() => {
    return leaves.filter(l => {
      if (selectedMemberId && (l.employee_id || l.user_id) !== selectedMemberId) return false;
      if (selectedLeaveType && !l.leave_type.toLowerCase().includes(selectedLeaveType.toLowerCase())) return false;
      if (selectedStatus && l.status.toLowerCase() !== selectedStatus.toLowerCase()) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const empName = (l.employee_name || '').toLowerCase();
        const empCode = (l.employee_code || '').toLowerCase();
        const reason = (l.reason || '').toLowerCase();
        const appBy = (l.applied_by_manager_name || l.created_by_name || '').toLowerCase();
        if (!empName.includes(q) && !empCode.includes(q) && !reason.includes(q) && !appBy.includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [leaves, selectedMemberId, selectedLeaveType, selectedStatus, searchQuery]);

  // KPI Metrics
  const metrics = useMemo(() => {
    const total = leaves.length;
    const pending = leaves.filter(l => l.status === 'Pending' || l.status === 'L1 Approved').length;
    const approved = leaves.filter(l => l.status === 'Approved').length;

    // Check who is on leave today
    const today = new Date().toISOString().split('T')[0];
    const onLeaveToday = leaves.filter(l => {
      if (l.status !== 'Approved') return false;
      return l.start_date <= today && l.end_date >= today;
    }).length;

    return { total, pending, approved, onLeaveToday };
  }, [leaves]);

  const handleCancelRequest = async (e) => {
    if (e) e.preventDefault();
    if (!requestToCancel) return;
    if (!cancelReason || !cancelReason.trim()) {
      setCancelError('Please enter a cancellation reason.');
      return;
    }
    setCancelling(true);
    setCancelError('');
    try {
      await api.cancelLeave(requestToCancel.id, cancelReason.trim());
      setNotification(`Leave request for ${requestToCancel.employee_name} has been cancelled.`);
      setRequestToCancel(null);
      setCancelReason('');
      await loadData();
    } catch (err) {
      setCancelError(err.message || 'Failed to cancel leave request');
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-md bg-indigo-100 text-indigo-700 tracking-wider">
              Manager Portal
            </span>
            <span className="text-slate-400 text-xs">•</span>
            <span className="text-xs font-semibold text-slate-500">Leave Management</span>
          </div>
          <h2 className="text-2xl font-bold text-slate-900">Team Leave Overview</h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Monitor and track leave requests for all team members under your reporting line
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {onNavigate && (
            <button
              onClick={() => onNavigate('team-leave-calendar')}
              className="px-4 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-2"
            >
              <Calendar className="w-4 h-4 text-slate-500" />
              <span>Team Calendar</span>
            </button>
          )}

          {onNavigate && (
            <button
              onClick={() => onNavigate('apply-team-leave')}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-600/20 transition-all flex items-center gap-2"
            >
              <CalendarPlus className="w-4 h-4" />
              <span>+ Apply Leave for Team Member</span>
            </button>
          )}
        </div>
      </div>

      {/* Notification banner */}
      {notification && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-between text-emerald-900 text-xs font-semibold animate-fade-in shadow-xs">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{notification}</span>
          </div>
          <button onClick={() => setNotification('')} className="text-emerald-500 hover:text-emerald-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Requests</span>
            <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-slate-900 mt-2">{metrics.total}</p>
          <span className="text-[10px] text-slate-400">All recorded team absences</span>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600">Pending Review</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-amber-600 mt-2">{metrics.pending}</p>
          <span className="text-[10px] text-slate-400">Awaiting L1 or L2/HR action</span>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600">Approved</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-emerald-600 mt-2">{metrics.approved}</p>
          <span className="text-[10px] text-slate-400">Finalized and balance deducted</span>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600">On Leave Today</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-indigo-600 mt-2">{metrics.onLeaveToday}</p>
          <span className="text-[10px] text-slate-400">Active employee absences today</span>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row items-center gap-3">
          {/* Search bar */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by employee name, code, reason, or submitter..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Employee Filter */}
          <div className="w-full md:w-52">
            <select
              value={selectedMemberId}
              onChange={(e) => setSelectedMemberId(e.target.value)}
              className="w-full p-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
            >
              <option value="">All Team Members</option>
              {teamMembers.map(m => (
                <option key={m.id} value={m.id}>{m.name} ({m.employee_code})</option>
              ))}
            </select>
          </div>

          {/* Leave Type Filter */}
          <div className="w-full md:w-44">
            <select
              value={selectedLeaveType}
              onChange={(e) => setSelectedLeaveType(e.target.value)}
              className="w-full p-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
            >
              <option value="">All Leave Types</option>
              <option value="Casual">Casual Leave (CL)</option>
              <option value="Sick">Sick Leave (SL)</option>
              <option value="Earned">Earned Leave (EL)</option>
              <option value="Without Pay">Leave Without Pay (LWP)</option>
              <option value="Half Day">Half Day</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="w-full md:w-40">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full p-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
            >
              <option value="">All Statuses</option>
              <option value="Pending">Pending L1</option>
              <option value="L1 Approved">L1 Approved / Pending L2</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>

          {(selectedMemberId || selectedLeaveType || selectedStatus || searchQuery) && (
            <button
              onClick={() => {
                setSelectedMemberId('');
                setSelectedLeaveType('');
                setSelectedStatus('');
                setSearchQuery('');
              }}
              className="text-xs font-semibold text-rose-600 hover:text-rose-700 px-2 py-1"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Team Leave Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-xs text-slate-400">
            <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            Loading team leaves...
          </div>
        ) : filteredLeaves.length === 0 ? (
          <div className="py-16 text-center text-slate-400 space-y-3">
            <Users className="w-10 h-10 mx-auto text-slate-300" />
            <p className="text-sm font-bold text-slate-700">No leave requests found</p>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              No leave records match the selected filters. You can apply for a leave request on behalf of any team member.
            </p>
            {onNavigate && (
              <button
                onClick={() => onNavigate('apply-team-leave')}
                className="mt-2 inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all"
              >
                <CalendarPlus className="w-4 h-4" />
                <span>Apply Leave for Team Member</span>
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-5">Employee</th>
                  <th className="py-3.5 px-4">Leave Type</th>
                  <th className="py-3.5 px-4">Dates & Duration</th>
                  <th className="py-3.5 px-4">Applied By</th>
                  <th className="py-3.5 px-4">Reason</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLeaves.map((req) => {
                  const isManagerApplied = !!(req.applied_by_manager_name || (req.created_by && req.created_by !== req.user_id));
                  const isPending = req.status === 'Pending' || req.status === 'L1 Approved';

                  return (
                    <tr key={req.id} className="hover:bg-slate-50/60 transition-colors">
                      {/* Employee Info */}
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-3">
                          <img
                            src={req.employee_avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${req.employee_name || 'User'}`}
                            alt={req.employee_name}
                            className="w-9 h-9 rounded-xl object-cover ring-1 ring-slate-200 bg-slate-100 shrink-0"
                          />
                          <div>
                            <p className="font-bold text-slate-900 leading-tight">{req.employee_name}</p>
                            <span className="font-mono text-[10px] text-slate-400 block">{req.employee_code}</span>
                          </div>
                        </div>
                      </td>

                      {/* Leave Type */}
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-slate-800 block">{req.leave_type}</span>
                        {req.day_type && req.day_type !== 'full' && (
                          <span className="text-[10px] font-semibold text-indigo-600 capitalize">
                            {req.day_type.replace('_', ' ')}
                          </span>
                        )}
                      </td>

                      {/* Dates & Duration */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="font-medium text-slate-800 block">
                          {formatDate(req.start_date)}
                          {req.end_date !== req.start_date && req.day_type === 'full' ? ` to ${formatDate(req.end_date)}` : ''}
                        </span>
                        <span className="text-[10px] font-extrabold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full inline-block mt-0.5">
                          {req.total_days} Day{req.total_days === 1 ? '' : 's'}
                        </span>
                      </td>

                      {/* Applied By Badge */}
                      <td className="py-3.5 px-4">
                        {isManagerApplied ? (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-purple-50 text-purple-700 border border-purple-200 text-[11px] font-bold">
                            <Shield className="w-3 h-3 text-purple-600" />
                            <span>Applied by: {req.applied_by_manager_name || req.created_by_name || 'Manager'}</span>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-100 text-slate-700 text-[11px] font-medium">
                            <User className="w-3 h-3 text-slate-400" />
                            <span>Applied by: Self</span>
                          </div>
                        )}
                      </td>

                      {/* Reason */}
                      <td className="py-3.5 px-4 max-w-[200px]">
                        <p className="truncate text-slate-600" title={req.reason}>
                          {req.reason || '--'}
                        </p>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <Badge variant={req.status}>{req.status}</Badge>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setSelectedRequest(req)}
                            className="px-2.5 py-1 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg font-bold transition-all text-[11px]"
                          >
                            Details
                          </button>
                          {['Pending', 'L1 Approved', 'Approved'].includes(req.status) && req.start_date >= todayStr && (
                            <button
                              onClick={() => {
                                setRequestToCancel(req);
                                setCancelReason('');
                                setCancelError('');
                              }}
                              className="px-2.5 py-1 text-rose-600 hover:bg-rose-50 rounded-lg font-bold transition-all text-[11px]"
                              title="Cancel leave request with reason before leave date"
                            >
                              Cancel
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Details Modal */}
      {selectedRequest && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedRequest(null)}
          title={`Leave Details — ${selectedRequest.employee_name}`}
        >
          <div className="space-y-4 text-xs">
            {/* Header info */}
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-200">
              <img
                src={selectedRequest.employee_avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedRequest.employee_name}`}
                alt={selectedRequest.employee_name}
                className="w-12 h-12 rounded-xl object-cover ring-1 ring-slate-200 bg-white"
              />
              <div className="min-w-0 flex-1">
                <h4 className="font-bold text-slate-900 text-sm">{selectedRequest.employee_name}</h4>
                <p className="text-[11px] text-slate-400 font-mono">{selectedRequest.employee_code} • {selectedRequest.designation || 'Team Member'}</p>
              </div>
              <Badge variant={selectedRequest.status}>{selectedRequest.status}</Badge>
            </div>

            {/* Leave Metadata */}
            <div className="grid grid-cols-2 gap-3 p-3.5 bg-slate-50/60 rounded-2xl border border-slate-100">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Leave Type</span>
                <span className="font-bold text-indigo-700">{selectedRequest.leave_type}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Total Days</span>
                <span className="font-bold text-slate-900">{selectedRequest.total_days} Day(s)</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block">From Date</span>
                <span className="font-semibold text-slate-800">{formatDate(selectedRequest.start_date)}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block">To Date</span>
                <span className="font-semibold text-slate-800">{formatDate(selectedRequest.end_date)}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Session / Day Type</span>
                <span className="font-semibold text-slate-800 capitalize">{selectedRequest.day_type ? selectedRequest.day_type.replace('_', ' ') : 'Full Day'}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Applied By</span>
                <span className="font-semibold text-slate-800">
                  {selectedRequest.applied_by_manager_name ? `${selectedRequest.applied_by_manager_name} (Manager)` : selectedRequest.employee_name}
                </span>
              </div>
            </div>

            {/* Reason */}
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Reason for Leave</span>
              <p className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-700 leading-relaxed">
                {selectedRequest.reason || 'No specific reason provided.'}
              </p>
            </div>

            {/* Attachment preview if any */}
            {selectedRequest.attachment && (
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Supporting Document</span>
                <div className="flex items-center gap-2 p-2.5 bg-indigo-50/60 rounded-xl border border-indigo-100 text-indigo-900">
                  <FileText className="w-4 h-4 text-indigo-600" />
                  <span className="font-semibold truncate flex-1">{selectedRequest.attachment.name}</span>
                  <span className="text-[10px] text-slate-400">{selectedRequest.attachment.size}</span>
                </div>
              </div>
            )}

            {/* Approver Remarks */}
            {selectedRequest.approver_remarks && (
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Approver / Review Remarks</span>
                <p className="p-3 bg-indigo-50/40 rounded-xl border border-indigo-100 text-slate-700 text-xs italic">
                  {selectedRequest.approver_remarks}
                </p>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedRequest(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Cancel Modal with Mandatory Reason */}
      <Modal
        isOpen={!!requestToCancel}
        onClose={() => { setRequestToCancel(null); setCancelReason(''); setCancelError(''); }}
        title={`Cancel Team Leave — ${requestToCancel?.employee_name}`}
      >
        <form onSubmit={handleCancelRequest} className="space-y-4 text-xs">
          <div className="p-3.5 bg-rose-50 rounded-2xl border border-rose-100 text-rose-900 space-y-1">
            <p className="font-bold text-sm">
              {requestToCancel?.employee_name} ({requestToCancel?.employee_code})
            </p>
            <p className="text-rose-700 font-medium">
              {requestToCancel?.leave_type} • {formatDate(requestToCancel?.start_date)} to {formatDate(requestToCancel?.end_date)} ({requestToCancel?.total_days} Day(s))
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
              placeholder="State the reason why you are cancelling this leave request..."
              rows={3}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-rose-500"
              required
            />
          </div>

          <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => { setRequestToCancel(null); setCancelReason(''); setCancelError(''); }}
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

export default TeamLeavePage;
