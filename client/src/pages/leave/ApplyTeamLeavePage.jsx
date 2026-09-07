import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  Search,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  Clock,
  FileText,
  Upload,
  X,
  ArrowRight,
  Shield,
  Info,
  CalendarCheck,
  Building2,
  Briefcase
} from 'lucide-react';
import { api } from '../../services/api';
import { formatDate } from '../../utils/formatters';
import Badge from '../../components/common/Badge';
import ConfirmDialog from '../../components/common/ConfirmDialog';

const LEAVE_CATEGORIES = [
  { type: 'Casual Leave (CL)', code: 'CL', name: 'Casual Leave', totalQuota: 6, subtitle: 'Personal & short absence' },
  { type: 'Sick Leave (SL)', code: 'SL', name: 'Sick Leave', totalQuota: 6, subtitle: 'Medical & recovery' },
  { type: 'Earned Leave (EL)', code: 'EL', name: 'Earned Leave', totalQuota: 8, subtitle: 'Privilege / annual planned' },
  { type: 'Leave Without Pay (LWP)', code: 'LWP', name: 'Leave Without Pay', totalQuota: 0, subtitle: 'Unpaid duration' },
  { type: 'Half Day Leave', code: 'HD', name: 'Half Day Leave', totalQuota: 0, subtitle: '0.5 Day (First / Second Half)' }
];

export const ApplyTeamLeavePage = ({ onNavigate }) => {
  // Team members list
  const [teamMembers, setTeamMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Selected employee & balances
  const [selectedMember, setSelectedMember] = useState(null);
  const [balances, setBalances] = useState([]);
  const [loadingBalances, setLoadingBalances] = useState(false);
  const [existingLeaves, setExistingLeaves] = useState([]);

  // Holidays
  const [holidays, setHolidays] = useState([]);

  // Form fields
  const [leaveType, setLeaveType] = useState('Casual Leave (CL)');
  const [dayType, setDayType] = useState('full'); // 'full' | 'first_half' | 'second_half'
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [attachment, setAttachment] = useState(null);

  // States
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Load team members and holidays on mount
  useEffect(() => {
    const initData = async () => {
      try {
        setLoadingMembers(true);
        const [members, hols] = await Promise.all([
          api.getTeamMembers(),
          api.get('/holidays').catch(() => [])
        ]);
        setTeamMembers(members || []);
        setHolidays(hols || []);
      } catch (err) {
        console.error('Failed to load team data:', err);
        setError('Failed to load authorized team members');
      } finally {
        setLoadingMembers(false);
      }
    };
    initData();
  }, []);

  // When selectedMember changes, load their balances and active leaves
  useEffect(() => {
    if (!selectedMember) {
      setBalances([]);
      setExistingLeaves([]);
      return;
    }

    const loadMemberDetails = async () => {
      setLoadingBalances(true);
      try {
        const [bals, reqs] = await Promise.all([
          api.getLeaveBalances(selectedMember.id),
          api.getTeamLeaves({ employee_id: selectedMember.id }).catch(() => [])
        ]);
        setBalances(bals || []);
        setExistingLeaves(reqs || []);
      } catch (err) {
        console.error('Failed to load member balance:', err);
      } finally {
        setLoadingBalances(false);
      }
    };

    loadMemberDetails();
  }, [selectedMember]);

  // Filter team members based on search
  const filteredMembers = useMemo(() => {
    if (!searchQuery.trim()) return teamMembers;
    const q = searchQuery.toLowerCase().trim();
    return teamMembers.filter(m =>
      m.name?.toLowerCase().includes(q) ||
      m.employee_code?.toLowerCase().includes(q) ||
      m.designation?.toLowerCase().includes(q) ||
      m.department_id?.toLowerCase().includes(q)
    );
  }, [teamMembers, searchQuery]);

  // Calculate requested duration
  const requestedDays = useMemo(() => {
    if (dayType === 'first_half' || dayType === 'second_half') {
      return 0.5;
    }
    if (!startDate || !endDate) return 0;
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (end < start) return 0;
    const diff = Math.abs(end - start);
    return Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1;
  }, [startDate, endDate, dayType]);

  // Find balance for selected leave category
  const activeBalance = useMemo(() => {
    if (!balances || balances.length === 0) return null;
    const norm = (str) => (str || '').toLowerCase().replace(/[\(\)\s_-]/g, '');
    const reqNorm = norm(leaveType);
    return balances.find(b => {
      const bNorm = norm(b.leave_type);
      const codeNorm = norm(b.code);
      return bNorm.includes(reqNorm) || reqNorm.includes(bNorm) || codeNorm === reqNorm;
    });
  }, [balances, leaveType]);

  const availableDays = activeBalance ? (activeBalance.remaining_leaves || 0) : 0;
  const isLWP = leaveType.toLowerCase().includes('without pay') || leaveType.toLowerCase().includes('lwp');
  const remainingAfterApproval = isLWP ? 'N/A (Unpaid)' : Math.max(0, availableDays - requestedDays);
  const isOverBalance = !isLWP && requestedDays > availableDays && requestedDays > 0;

  // Conflict detection: overlapping active leaves
  const conflictWarning = useMemo(() => {
    if (!startDate || !endDate || !existingLeaves.length) return null;
    const start = new Date(startDate);
    const end = new Date(endDate);

    const activeLeaves = existingLeaves.filter(l => ['Pending', 'L1 Approved', 'Approved'].includes(l.status));
    const overlap = activeLeaves.find(l => {
      const lStart = new Date(l.start_date);
      const lEnd = new Date(l.end_date);
      return (start <= lEnd && end >= lStart);
    });

    if (overlap) {
      return `This employee already has an active ${overlap.status} leave (${overlap.leave_type}) from ${formatDate(overlap.start_date)} to ${formatDate(overlap.end_date)}.`;
    }
    return null;
  }, [startDate, endDate, existingLeaves]);

  // Holiday check
  const holidayNotice = useMemo(() => {
    if (!startDate || !endDate || !holidays.length) return null;
    const start = new Date(startDate);
    const end = new Date(endDate);

    const hit = holidays.find(h => {
      const hDate = new Date(h.date);
      return (hDate >= start && hDate <= end);
    });

    if (hit) {
      return `Selected dates include the company holiday: "${hit.name}" on ${formatDate(hit.date)}.`;
    }
    return null;
  }, [startDate, endDate, holidays]);

  // Handle file upload
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('File size exceeds the 5MB limit.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setAttachment({
        name: file.name,
        size: (file.size / 1024).toFixed(1) + ' KB',
        type: file.type,
        data_url: reader.result
      });
    };
    reader.readAsDataURL(file);
  };

  // Pre-submission validation
  const handlePreSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!selectedMember) {
      setError('Please select a team member.');
      return;
    }
    if (!startDate) {
      setError('Please select a start date.');
      return;
    }
    if (dayType === 'full' && !endDate) {
      setError('Please select an end date.');
      return;
    }
    if (dayType === 'full' && new Date(endDate) < new Date(startDate)) {
      setError('End date cannot be earlier than start date.');
      return;
    }
    if (!reason.trim()) {
      setError('Please provide a reason for the leave application.');
      return;
    }
    if (conflictWarning) {
      setError(conflictWarning);
      return;
    }
    if (isOverBalance) {
      setError(`Cannot submit: requested ${requestedDays} day(s) exceeds available balance of ${availableDays} day(s).`);
      return;
    }

    setShowConfirmModal(true);
  };

  // Final submission
  const handleConfirmSubmit = async () => {
    setSubmitting(true);
    setError('');
    try {
      const effectiveEndDate = (dayType === 'first_half' || dayType === 'second_half') ? startDate : endDate;

      await api.applyLeave({
        employee_id: selectedMember.id,
        leave_type: leaveType,
        day_type: dayType,
        start_date: startDate,
        end_date: effectiveEndDate,
        reason: reason.trim(),
        attachment: attachment || null
      });

      setSuccessMessage(`Leave request has been submitted successfully for ${selectedMember.name}. L1 Endorsement recorded and forwarded to L2 Manager & HR.`);
      setShowConfirmModal(false);

      // Reset form
      setStartDate('');
      setEndDate('');
      setReason('');
      setAttachment(null);
      setDayType('full');

      // Refresh balances
      const bals = await api.getLeaveBalances(selectedMember.id);
      setBalances(bals || []);
    } catch (err) {
      setError(err.message || 'Failed to submit leave request');
      setShowConfirmModal(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-md bg-indigo-100 text-indigo-700 tracking-wider">
              Manager Portal
            </span>
            <span className="text-slate-400 text-xs">•</span>
            <span className="text-xs font-semibold text-slate-500">Authorized Reporting Line Only</span>
          </div>
          <h2 className="text-2xl font-bold text-slate-900">Apply Leave for Team Member</h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Create proxy leave requests for employees directly or indirectly reporting to you
          </p>
        </div>

        {onNavigate && (
          <button
            type="button"
            onClick={() => onNavigate('team-leave')}
            className="self-start sm:self-auto px-4 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-all shadow-xs flex items-center gap-2"
          >
            <Users className="w-4 h-4 text-slate-500" />
            <span>View Team Leaves</span>
          </button>
        )}
      </div>

      {/* Success Notification */}
      {successMessage && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-start gap-3 text-emerald-900 animate-fade-in shadow-xs">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-xs sm:text-sm font-bold">{successMessage}</p>
            <p className="text-xs text-emerald-700 mt-0.5">
              The employee and L2 / HR management have been notified automatically.
            </p>
          </div>
          <button
            onClick={() => setSuccessMessage('')}
            className="text-emerald-500 hover:text-emerald-700 p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 flex items-start gap-3 text-rose-900 animate-fade-in shadow-xs">
          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1 text-xs sm:text-sm font-semibold">{error}</div>
          <button
            onClick={() => setError('')}
            className="text-rose-500 hover:text-rose-700 p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Team Member Selector (4 Cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Users className="w-4 h-4 text-indigo-600" />
                  Step 1 — Select Team Member
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Only reporting team members are listed
                </p>
              </div>
              <span className="text-[11px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
                {teamMembers.length}
              </span>
            </div>

            {/* Search Input */}
            <div className="relative mb-3">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
              <input
                type="text"
                placeholder="Search employee, ID, role..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Members List */}
            <div className="max-h-[380px] overflow-y-auto space-y-1.5 pr-1">
              {loadingMembers ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  Loading team members...
                </div>
              ) : filteredMembers.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  No matching team members found
                </div>
              ) : (
                filteredMembers.map((member) => {
                  const isSelected = selectedMember?.id === member.id;
                  return (
                    <button
                      key={member.id}
                      type="button"
                      onClick={() => {
                        setSelectedMember(member);
                        setError('');
                        setSuccessMessage('');
                      }}
                      className={`w-full text-left p-3 rounded-2xl border transition-all flex items-center gap-3 ${
                        isSelected
                          ? 'bg-indigo-50/90 border-indigo-500 ring-2 ring-indigo-500/20 shadow-xs'
                          : 'bg-white hover:bg-slate-50 border-slate-200/70 hover:border-slate-300'
                      }`}
                    >
                      <img
                        src={member.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${member.name}`}
                        alt={member.name}
                        className="w-10 h-10 rounded-xl object-cover ring-1 ring-slate-200 shrink-0 bg-slate-100"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <p className={`text-xs font-bold truncate ${isSelected ? 'text-indigo-950' : 'text-slate-900'}`}>
                            {member.name}
                          </p>
                          <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded">
                            {member.employee_code}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 truncate mt-0.5">
                          {member.designation || 'Team Member'}
                        </p>
                        <p className="text-[10px] text-slate-400 truncate">
                          {member.department_id || 'Engineering'}
                        </p>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Selected Employee Summary Card */}
          {selectedMember && (
            <div className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white rounded-3xl p-5 shadow-lg border border-indigo-800/40">
              <div className="flex items-center gap-3">
                <img
                  src={selectedMember.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedMember.name}`}
                  alt={selectedMember.name}
                  className="w-12 h-12 rounded-2xl object-cover ring-2 ring-white/30 bg-white/10 shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-300">
                    Applying On Behalf Of
                  </span>
                  <h4 className="text-sm font-bold text-white truncate">{selectedMember.name}</h4>
                  <p className="text-xs text-slate-300 font-mono">{selectedMember.employee_code}</p>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-white/10 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 block">Department</span>
                  <span className="font-semibold text-slate-200">{selectedMember.department_id}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Role / Designation</span>
                  <span className="font-semibold text-slate-200 truncate block">{selectedMember.designation}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Application Form & Live Balances (8 Cols) */}
        <div className="lg:col-span-8 space-y-6">
          {!selectedMember ? (
            <div className="bg-white rounded-3xl border border-slate-200/80 p-12 text-center shadow-sm">
              <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center mx-auto mb-4 text-indigo-600">
                <Users className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-slate-900">No Team Member Selected</h3>
              <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto mt-1">
                Please choose an employee from your reporting hierarchy on the left to review their live leave quotas and submit an application.
              </p>
            </div>
          ) : (
            <form onSubmit={handlePreSubmit} className="space-y-6">
              {/* Step 2: Select Leave Category */}
              <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <CalendarCheck className="w-4 h-4 text-indigo-600" />
                      Step 2 — Leave Category & Live Balance
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Select leave type to inspect real-time available quota
                    </p>
                  </div>
                  {loadingBalances && (
                    <span className="text-xs text-slate-400 flex items-center gap-1.5">
                      <span className="w-3 h-3 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                      Updating quota...
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {LEAVE_CATEGORIES.map(cat => {
                    const isSelected = leaveType === cat.type;
                    const norm = (str) => (str || '').toLowerCase().replace(/[\(\)\s_-]/g, '');
                    const cNorm = norm(cat.type);
                    const bObj = balances.find(b => {
                      const bNorm = norm(b.leave_type);
                      const codeNorm = norm(b.code);
                      return bNorm.includes(cNorm) || cNorm.includes(bNorm) || codeNorm === cNorm;
                    });
                    const rem = bObj ? bObj.remaining_leaves : cat.totalQuota;

                    return (
                      <button
                        key={cat.type}
                        type="button"
                        onClick={() => {
                          setLeaveType(cat.type);
                          if (cat.type.includes('Half Day')) {
                            setDayType('first_half');
                          } else if (dayType !== 'full') {
                            setDayType('full');
                          }
                        }}
                        className={`p-3.5 rounded-2xl text-left border transition-all ${
                          isSelected
                            ? 'bg-indigo-50/90 border-indigo-500 ring-2 ring-indigo-500/20 shadow-xs'
                            : 'bg-slate-50 border-slate-200/80 hover:bg-white hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-bold text-slate-900 truncate block">
                            {cat.name}
                          </span>
                          <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.2 rounded bg-white text-indigo-700 border border-indigo-100">
                            {cat.code}
                          </span>
                        </div>
                        <div className="flex items-baseline gap-1">
                          <span className="text-base font-extrabold text-indigo-600">
                            {cat.code === 'LWP' ? '∞' : rem}
                          </span>
                          <span className="text-[10px] text-slate-400 font-medium">
                            {cat.code === 'LWP' ? 'Unpaid' : 'Days Available'}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 mt-1 block truncate">
                          {cat.subtitle}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Live Balance Summary Calculation Pill */}
                <div className="mt-4 p-4 rounded-2xl bg-slate-50 border border-slate-200/80 grid grid-cols-3 gap-3 text-center">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Available</span>
                    <span className="text-sm font-bold text-slate-800">
                      {isLWP ? 'Flexible' : `${availableDays} Days`}
                    </span>
                  </div>
                  <div className="border-x border-slate-200">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 block">Requested</span>
                    <span className="text-sm font-bold text-indigo-600">
                      {requestedDays} Day{requestedDays === 1 ? '' : 's'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Remaining</span>
                    <span className={`text-sm font-bold ${isOverBalance ? 'text-rose-600' : 'text-emerald-600'}`}>
                      {isLWP ? 'Unpaid' : `${remainingAfterApproval} Days`}
                    </span>
                  </div>
                </div>
              </div>

              {/* Step 3: Duration & Day Type */}
              <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-indigo-600" />
                    Step 3 — Leave Duration & Session
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Specify dates and full-day vs half-day session options
                  </p>
                </div>

                {/* Day Type Selector */}
                <div className="flex items-center gap-2 p-1 bg-slate-100/80 rounded-2xl border border-slate-200 w-fit">
                  <button
                    type="button"
                    onClick={() => setDayType('full')}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      dayType === 'full'
                        ? 'bg-white text-indigo-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Full Day
                  </button>
                  <button
                    type="button"
                    onClick={() => setDayType('first_half')}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      dayType === 'first_half'
                        ? 'bg-white text-indigo-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    First Half (0.5 Day)
                  </button>
                  <button
                    type="button"
                    onClick={() => setDayType('second_half')}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      dayType === 'second_half'
                        ? 'bg-white text-indigo-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Second Half (0.5 Day)
                  </button>
                </div>

                {/* Date Inputs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      {dayType === 'full' ? 'Start Date' : 'Leave Date'}
                    </label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => {
                        setStartDate(e.target.value);
                        if (dayType !== 'full') {
                          setEndDate(e.target.value);
                        }
                      }}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all"
                      required
                    />
                  </div>

                  {dayType === 'full' && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        End Date
                      </label>
                      <input
                        type="date"
                        value={endDate}
                        min={startDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all"
                        required
                      />
                    </div>
                  )}
                </div>

                {/* Conflict Warnings Banner */}
                {conflictWarning && (
                  <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 flex items-start gap-2.5 text-amber-900 text-xs animate-fade-in">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">⚠ Conflict Detected:</span> {conflictWarning}
                    </div>
                  </div>
                )}

                {/* Holiday Notice Banner */}
                {holidayNotice && (
                  <div className="p-3 rounded-2xl bg-sky-50 border border-sky-200 flex items-start gap-2.5 text-sky-900 text-xs animate-fade-in">
                    <Info className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">Company Holiday:</span> {holidayNotice}
                    </div>
                  </div>
                )}
              </div>

              {/* Step 4: Reason & Optional Attachment */}
              <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-indigo-600" />
                    Step 4 — Reason & Supporting Documents
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Provide reason and optionally upload medical or supporting certificates
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Reason for Leave <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Enter detailed reason on behalf of employee (e.g., Medical treatment, personal family emergency, urgent personal work)..."
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all resize-none"
                    required
                  />
                </div>

                {/* File Attachment */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Optional Attachment (Medical Certificate / Supporting Proof)
                  </label>

                  {attachment ? (
                    <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-900 truncate">{attachment.name}</p>
                          <p className="text-[10px] text-slate-400">{attachment.size}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setAttachment(null)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                        title="Remove attachment"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <label className="border-2 border-dashed border-slate-200 hover:border-indigo-400 rounded-2xl p-4 flex flex-col items-center justify-center cursor-pointer transition-colors bg-slate-50/50 hover:bg-indigo-50/20">
                      <Upload className="w-5 h-5 text-slate-400 mb-1" />
                      <span className="text-xs font-bold text-indigo-600">Click to upload document</span>
                      <span className="text-[10px] text-slate-400 mt-0.5">PDF, PNG, JPG up to 5MB</span>
                      <input
                        type="file"
                        onChange={handleFileChange}
                        accept=".pdf,.png,.jpg,.jpeg"
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              </div>

              {/* Submit Actions */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedMember(null);
                    setStartDate('');
                    setEndDate('');
                    setReason('');
                    setAttachment(null);
                  }}
                  className="px-5 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
                >
                  Clear Form
                </button>
                <button
                  type="submit"
                  disabled={submitting || isOverBalance || !startDate || !reason.trim() || !!conflictWarning}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-600/20 active:scale-95 transition-all flex items-center gap-2"
                >
                  <Shield className="w-4 h-4" />
                  <span>Review & Submit Leave</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Confirmation Modal */}
      <ConfirmDialog
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={handleConfirmSubmit}
        title={`Apply Leave for ${selectedMember?.name}?`}
        message={
          <div className="space-y-2.5 text-left text-xs text-slate-600">
            <p className="font-medium text-slate-700">
              Please review the leave request details before submission:
            </p>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5 font-mono text-[11px]">
              <div className="flex justify-between">
                <span className="text-slate-400">Employee:</span>
                <span className="font-bold text-slate-900">{selectedMember?.name} ({selectedMember?.employee_code})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Leave Type:</span>
                <span className="font-bold text-indigo-600">{leaveType}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Session / Day Type:</span>
                <span className="font-semibold text-slate-800 capitalize">{dayType.replace('_', ' ')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Duration:</span>
                <span className="font-bold text-slate-900">{requestedDays} Day(s)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Dates:</span>
                <span className="font-semibold text-slate-800">
                  {formatDate(startDate)} {dayType === 'full' && endDate !== startDate ? `to ${formatDate(endDate)}` : ''}
                </span>
              </div>
              {attachment && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Attachment:</span>
                  <span className="font-semibold text-slate-800 truncate">{attachment.name}</span>
                </div>
              )}
            </div>
            <p className="text-[11px] text-slate-500 italic">
              Upon submission, L1 manager endorsement will be granted and the request will be forwarded to L2 Management & HR Administration for final approval.
            </p>
          </div>
        }
        confirmText="Submit Leave"
        cancelText="Cancel"
        danger={false}
        loading={submitting}
      />
    </div>
  );
};

export default ApplyTeamLeavePage;
