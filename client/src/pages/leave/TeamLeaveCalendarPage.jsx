import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  CalendarPlus,
  Users,
  Info,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  AlertTriangle,
  FileText,
  User,
  X
} from 'lucide-react';
import { api } from '../../services/api';
import { formatDate } from '../../utils/formatters';
import Badge from '../../components/common/Badge';
import Modal from '../../components/common/Modal';

export const TeamLeaveCalendarPage = ({ onNavigate }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDayEvents, setSelectedDayEvents] = useState(null); // { dateStr, events: [] }
  const [selectedEvent, setSelectedEvent] = useState(null);

  // Apply Leave for Team Member Modal State
  const [applyModalOpen, setApplyModalOpen] = useState(false);
  const [teamMembers, setTeamMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [memberBalances, setMemberBalances] = useState([]);
  const [loadingBalances, setLoadingBalances] = useState(false);
  const [leaveType, setLeaveType] = useState('Casual Leave (CL)');
  const [dayType, setDayType] = useState('full');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [applySubmitting, setApplySubmitting] = useState(false);
  const [applyError, setApplyError] = useState('');
  const [applySuccess, setApplySuccess] = useState('');

  const loadCalendarData = async () => {
    setLoading(true);
    try {
      const data = await api.getTeamLeaveCalendar();
      setLeaves(data || []);
    } catch (err) {
      console.error('Failed to load calendar leaves:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadBalancesForMember = async (memberId) => {
    if (!memberId) return;
    setLoadingBalances(true);
    try {
      const bals = await api.getLeaveBalances(memberId);
      setMemberBalances(bals || []);
    } catch (err) {
      console.error('Failed to load member balances:', err);
    } finally {
      setLoadingBalances(false);
    }
  };

  const handleOpenApplyModal = async () => {
    setApplyError('');
    setApplySuccess('');
    setApplyModalOpen(true);
    setLoadingMembers(true);
    try {
      const members = await api.getTeamMembers();
      setTeamMembers(members || []);
      if (members && members.length > 0) {
        const firstId = members[0].id;
        setSelectedMemberId(firstId);
        loadBalancesForMember(firstId);
      }
    } catch (err) {
      console.error('Failed to load team members for leave:', err);
      setApplyError('Failed to load your team members.');
    } finally {
      setLoadingMembers(false);
    }
  };

  const handleMemberChange = (e) => {
    const memberId = e.target.value;
    setSelectedMemberId(memberId);
    loadBalancesForMember(memberId);
  };

  // Duration calculation for leave request
  const requestedDays = useMemo(() => {
    if (dayType === 'first_half' || dayType === 'second_half') return 0.5;
    if (!startDate || !endDate) return 0;
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (end < start) return 0;
    const diff = Math.abs(end - start);
    return Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1;
  }, [startDate, endDate, dayType]);

  const activeBalance = useMemo(() => {
    if (!memberBalances || memberBalances.length === 0) return null;
    const norm = (str) => (str || '').toLowerCase().replace(/[\(\)\s_-]/g, '');
    const reqNorm = norm(leaveType);
    return memberBalances.find(b => {
      const bNorm = norm(b.leave_type);
      const codeNorm = norm(b.code);
      return bNorm.includes(reqNorm) || reqNorm.includes(bNorm) || codeNorm === reqNorm;
    });
  }, [memberBalances, leaveType]);

  const availableDays = activeBalance ? (activeBalance.remaining_leaves || 0) : 0;
  const isLWP = leaveType.toLowerCase().includes('without pay') || leaveType.toLowerCase().includes('lwp');
  const isOverBalance = !isLWP && requestedDays > availableDays && requestedDays > 0;

  const handleApplySubmit = async (e) => {
    e?.preventDefault();
    if (!selectedMemberId) {
      setApplyError('Please select a team member.');
      return;
    }
    if (!startDate || !endDate) {
      setApplyError('Please select start and end dates.');
      return;
    }
    if (new Date(endDate) < new Date(startDate)) {
      setApplyError('End date cannot be earlier than start date.');
      return;
    }
    if (!reason.trim()) {
      setApplyError('Please provide a reason for the leave application.');
      return;
    }

    setApplySubmitting(true);
    setApplyError('');
    try {
      await api.applyLeave({
        employee_id: selectedMemberId,
        leave_type: leaveType,
        start_date: startDate,
        end_date: endDate,
        reason: reason.trim(),
        day_type: dayType
      });
      setApplySuccess('Leave successfully applied on behalf of team member!');
      await loadCalendarData();
      setTimeout(() => {
        setApplyModalOpen(false);
        setApplySuccess('');
        setReason('');
        setStartDate('');
        setEndDate('');
      }, 1200);
    } catch (err) {
      console.error('Failed to apply leave:', err);
      setApplyError(err.message || 'Failed to submit leave application.');
    } finally {
      setApplySubmitting(false);
    }
  };

  useEffect(() => {
    loadCalendarData();
  }, []);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Calendar grid calculations
  const calendarDays = useMemo(() => {
    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 = Sun
    // Adjust so Monday is 0
    const startOffset = (firstDayIndex + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const days = [];
    // Previous month padding
    const prevMonthDays = new Date(year, month, 0).getDate();
    for (let i = startOffset - 1; i >= 0; i--) {
      days.push({
        day: prevMonthDays - i,
        isCurrentMonth: false,
        dateStr: ''
      });
    }

    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      const mm = String(month + 1).padStart(2, '0');
      const dd = String(d).padStart(2, '0');
      const dateStr = `${year}-${mm}-${dd}`;
      days.push({
        day: d,
        isCurrentMonth: true,
        dateStr
      });
    }

    // Next month padding to complete 35 or 42 grid cells
    const remaining = (7 - (days.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      days.push({
        day: i,
        isCurrentMonth: false,
        dateStr: ''
      });
    }

    return days;
  }, [year, month]);

  // Index leaves by date string
  const leavesByDate = useMemo(() => {
    const map = {};
    leaves.forEach(l => {
      const s = new Date(l.start_date);
      const e = new Date(l.end_date);
      // Iterate through each date in the range
      const cur = new Date(s);
      while (cur <= e) {
        const yyyy = cur.getFullYear();
        const mm = String(cur.getMonth() + 1).padStart(2, '0');
        const dd = String(cur.getDate()).padStart(2, '0');
        const dStr = `${yyyy}-${mm}-${dd}`;

        if (!map[dStr]) map[dStr] = [];
        // Avoid duplicate push for same leave on same date
        if (!map[dStr].some(item => item.id === l.id)) {
          map[dStr].push(l);
        }
        cur.setDate(cur.getDate() + 1);
      }
    });
    return map;
  }, [leaves]);

  const todayStr = new Date().toISOString().split('T')[0];

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
          <h2 className="text-2xl font-bold text-slate-900">Team Leave Calendar</h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Visual month-by-month view to track team availability and overlapping leaves
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleOpenApplyModal}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-600/20 transition-all flex items-center gap-2"
          >
            <CalendarPlus className="w-4 h-4" />
            <span>+ Apply Leave for Team Member</span>
          </button>
        </div>
      </div>

      {/* Calendar Controls & Month Navigation */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
            <CalendarIcon className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">
            {monthNames[month]} {year}
          </h3>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleToday}
            className="px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 rounded-xl transition-all border border-slate-200"
          >
            Today
          </button>
          <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden">
            <button
              onClick={handlePrevMonth}
              className="p-2 hover:bg-slate-100 text-slate-600 transition-colors border-r border-slate-200"
              title="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleNextMonth}
              className="p-2 hover:bg-slate-100 text-slate-600 transition-colors"
              title="Next Month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        {/* Day Header Row */}
        <div className="grid grid-cols-7 bg-slate-50/80 border-b border-slate-200/80 text-center text-xs font-bold text-slate-500 py-3">
          <span>Mon</span>
          <span>Tue</span>
          <span>Wed</span>
          <span>Thu</span>
          <span>Fri</span>
          <span className="text-slate-400">Sat</span>
          <span className="text-slate-400">Sun</span>
        </div>

        {/* Days Grid */}
        {loading ? (
          <div className="py-24 text-center text-xs text-slate-400">
            <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            Loading team calendar...
          </div>
        ) : (
          <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-slate-100">
            {calendarDays.map((item, idx) => {
              if (!item.isCurrentMonth) {
                return (
                  <div key={idx} className="min-h-[110px] p-2 bg-slate-50/40 text-slate-300 select-none">
                    <span className="text-xs font-semibold">{item.day}</span>
                  </div>
                );
              }

              const dayLeaves = leavesByDate[item.dateStr] || [];
              const isToday = item.dateStr === todayStr;

              return (
                <div
                  key={idx}
                  onClick={() => {
                    if (dayLeaves.length > 0) {
                      setSelectedDayEvents({ dateStr: item.dateStr, events: dayLeaves });
                    }
                  }}
                  className={`min-h-[110px] p-2 transition-colors flex flex-col justify-between ${
                    isToday ? 'bg-indigo-50/30' : 'hover:bg-slate-50/80'
                  } ${dayLeaves.length > 0 ? 'cursor-pointer' : ''}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={`text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center ${
                        isToday
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'text-slate-700'
                      }`}
                    >
                      {item.day}
                    </span>
                    {dayLeaves.length > 0 && (
                      <span className="text-[10px] font-extrabold text-indigo-600 bg-indigo-50 px-1.5 py-0.2 rounded-full">
                        {dayLeaves.length} away
                      </span>
                    )}
                  </div>

                  {/* Leave Badges for this day */}
                  <div className="space-y-1 overflow-y-auto max-h-[80px]">
                    {dayLeaves.slice(0, 2).map(l => (
                      <div
                        key={l.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedEvent(l);
                        }}
                        className={`text-[10px] font-semibold p-1 rounded-lg border truncate flex items-center gap-1.5 shadow-2xs hover:brightness-95 transition-all ${
                          l.status === 'Approved'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : 'bg-amber-50 text-amber-800 border-amber-200'
                        }`}
                        title={`${l.employee_name} - ${l.leave_type} (${l.status})`}
                      >
                        <img
                          src={l.employee_avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${l.employee_name}`}
                          alt={l.employee_name}
                          className="w-3.5 h-3.5 rounded-full object-cover shrink-0"
                        />
                        <span className="truncate font-bold">{l.employee_name}</span>
                      </div>
                    ))}

                    {dayLeaves.length > 2 && (
                      <span className="text-[10px] text-slate-500 font-bold block text-center">
                        +{dayLeaves.length - 2} more
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Day Events Modal */}
      {selectedDayEvents && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedDayEvents(null)}
          title={`Team Absences on ${formatDate(selectedDayEvents.dateStr)}`}
        >
          <div className="space-y-3 text-xs">
            <p className="text-slate-500 text-xs">
              {selectedDayEvents.events.length} team member(s) taking leave on this date:
            </p>

            <div className="space-y-2 max-h-[350px] overflow-y-auto">
              {selectedDayEvents.events.map(ev => (
                <div
                  key={ev.id}
                  onClick={() => setSelectedEvent(ev)}
                  className="p-3.5 rounded-2xl border border-slate-200 hover:border-indigo-400 bg-slate-50/70 hover:bg-indigo-50/30 transition-all cursor-pointer flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={ev.employee_avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${ev.employee_name}`}
                      alt={ev.employee_name}
                      className="w-10 h-10 rounded-xl object-cover ring-1 ring-slate-200 bg-white shrink-0"
                    />
                    <div className="min-w-0">
                      <p className="font-bold text-slate-900 truncate">{ev.employee_name}</p>
                      <p className="text-[11px] text-indigo-700 font-semibold">{ev.leave_type}</p>
                      <p className="text-[10px] text-slate-400">
                        {formatDate(ev.start_date)} to {formatDate(ev.end_date)} ({ev.total_days} Day(s))
                      </p>
                    </div>
                  </div>
                  <Badge variant={ev.status}>{ev.status}</Badge>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedDayEvents(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Individual Event Details Modal */}
      {selectedEvent && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedEvent(null)}
          title={`Leave Request: ${selectedEvent.employee_name}`}
        >
          <div className="space-y-4 text-xs">
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-200">
              <img
                src={selectedEvent.employee_avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedEvent.employee_name}`}
                alt={selectedEvent.employee_name}
                className="w-12 h-12 rounded-xl object-cover ring-1 ring-slate-200 bg-white shrink-0"
              />
              <div className="min-w-0 flex-1">
                <h4 className="font-bold text-slate-900 text-sm">{selectedEvent.employee_name}</h4>
                <p className="text-[11px] text-slate-400 font-mono">{selectedEvent.employee_code || 'EMP'}</p>
              </div>
              <Badge variant={selectedEvent.status}>{selectedEvent.status}</Badge>
            </div>

            <div className="grid grid-cols-2 gap-3 p-3.5 bg-slate-50/60 rounded-2xl border border-slate-100">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Leave Category</span>
                <span className="font-bold text-indigo-700">{selectedEvent.leave_type}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Duration</span>
                <span className="font-bold text-slate-900">{selectedEvent.total_days} Day(s)</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Dates</span>
                <span className="font-semibold text-slate-800">
                  {formatDate(selectedEvent.start_date)} {selectedEvent.end_date !== selectedEvent.start_date ? `to ${formatDate(selectedEvent.end_date)}` : ''}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Applied By</span>
                <span className="font-semibold text-slate-800">
                  {selectedEvent.applied_by_manager_name ? `${selectedEvent.applied_by_manager_name} (Manager)` : selectedEvent.employee_name}
                </span>
              </div>
            </div>

            <div>
              <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Reason</span>
              <p className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-700 leading-relaxed">
                {selectedEvent.reason || 'No specific reason provided.'}
              </p>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedEvent(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Apply Leave for Team Member Popup Modal */}
      <Modal
        isOpen={applyModalOpen}
        onClose={() => !applySubmitting && setApplyModalOpen(false)}
        title="Apply Leave for Team Member"
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleApplySubmit} className="space-y-4 text-xs">
          {applyError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{applyError}</span>
            </div>
          )}

          {applySuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{applySuccess}</span>
            </div>
          )}

          {/* 1. Select Team Member (L2 Direct Reports) */}
          <div>
            <label className="block text-slate-700 font-bold mb-1.5 uppercase tracking-wider text-[11px]">
              Select Team Member (Your L2 Reports) <span className="text-rose-500 font-bold">*</span>
            </label>
            {loadingMembers ? (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-400 flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                <span>Loading authorized team members...</span>
              </div>
            ) : teamMembers.length === 0 ? (
              <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-xs">
                No team members found who are assigned with you as their L2 Manager.
              </div>
            ) : (
              <select
                value={selectedMemberId}
                onChange={handleMemberChange}
                required
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {teamMembers.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.designation || 'Employee'}) — {m.employee_code}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* 2. Real-Time Leave Balances Display */}
          {selectedMemberId && (
            <div className="bg-slate-50/80 rounded-2xl p-3.5 border border-slate-200/80 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                  Available Leave Quotas & Balances
                </span>
                {loadingBalances && (
                  <span className="text-[10px] text-slate-400 animate-pulse">Refreshing balances...</span>
                )}
              </div>

              {loadingBalances ? (
                <div className="py-4 text-center text-slate-400">Loading quota balances...</div>
              ) : memberBalances.length === 0 ? (
                <div className="text-[11px] text-slate-400 py-1">No custom balances recorded. Standard company quotas apply.</div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                  {memberBalances.map((b) => {
                    const rem = typeof b.remaining_leaves === 'number' ? b.remaining_leaves : (b.total_leaves - b.used_leaves);
                    const isSelected = activeBalance?.id === b.id;
                    return (
                      <div
                        key={b.id}
                        className={`p-2 rounded-xl border transition-all ${
                          isSelected
                            ? 'bg-indigo-50 border-indigo-300 ring-1 ring-indigo-400'
                            : 'bg-white border-slate-200'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-slate-500 uppercase truncate">
                            {b.leave_type || b.code}
                          </span>
                          <span className="text-[10px] font-extrabold text-indigo-700 px-1 py-0.5 rounded bg-indigo-100/60">
                            {b.code || 'LV'}
                          </span>
                        </div>
                        <div className="text-base font-extrabold text-slate-900 mt-1">
                          {rem} <span className="text-[10px] font-normal text-slate-400">/ {b.total_leaves}</span>
                        </div>
                        <span className="text-[9px] text-slate-400 block mt-0.5">days remaining</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* 3. Leave Type & Shift Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-bold mb-1 text-[11px]">
                Leave Category <span className="text-rose-500 font-bold">*</span>
              </label>
              <select
                value={leaveType}
                onChange={(e) => setLeaveType(e.target.value)}
                required
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="Casual Leave (CL)">Casual Leave (CL)</option>
                <option value="Sick Leave (SL)">Sick Leave (SL)</option>
                <option value="Earned Leave (EL)">Earned Leave (EL)</option>
                <option value="Leave Without Pay (LWP)">Leave Without Pay (LWP)</option>
                <option value="Half Day Leave">Half Day Leave</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1 text-[11px]">Shift / Session</label>
              <select
                value={dayType}
                onChange={(e) => setDayType(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="full">Full Day</option>
                <option value="first_half">First Half (Morning Shift)</option>
                <option value="second_half">Second Half (Afternoon Shift)</option>
              </select>
            </div>
          </div>

          {/* 4. Date Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-bold mb-1 text-[11px]">
                Start Date <span className="text-rose-500 font-bold">*</span>
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  if (!endDate || dayType !== 'full') setEndDate(e.target.value);
                }}
                required
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1 text-[11px]">
                End Date <span className="text-rose-500 font-bold">*</span>
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
                disabled={dayType !== 'full'}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60"
              />
            </div>
          </div>

          {/* Duration Calculation */}
          {requestedDays > 0 && (
            <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-xl flex items-center justify-between">
              <span className="font-semibold text-slate-700">Calculated Duration:</span>
              <span className="font-bold text-indigo-700">{requestedDays} Day(s)</span>
            </div>
          )}

          {isOverBalance && (
            <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>
                Requested {requestedDays} days exceeds current available balance ({availableDays} days). It will be marked as Leave Without Pay if submitted.
              </span>
            </div>
          )}

          {/* 5. Reason Field */}
          <div>
            <label className="block text-slate-700 font-bold mb-1 text-[11px]">
              Reason for Leave <span className="text-rose-500 font-bold">*</span>
            </label>
            <textarea
              rows="3"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
              placeholder="State the reason for applying on behalf of this employee..."
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setApplyModalOpen(false)}
              disabled={applySubmitting}
              className="px-4 py-2.5 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={applySubmitting || teamMembers.length === 0}
              className="px-5 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-600/20 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {applySubmitting && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              <span>{applySubmitting ? 'Submitting Leave...' : 'Submit Leave for Member'}</span>
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default TeamLeaveCalendarPage;
