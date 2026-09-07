import { formatTime, formatDate } from '../../utils/formatters';
import React, { useState, useEffect, useMemo } from 'react';
import {
  Building2,
  Calendar as CalendarIcon,
  CalendarDays,
  List,
  Filter,
  Plus,
  Edit2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  LogIn,
  LogOut,
  Timer,
  User,
  Users,
  Search,
  SlidersHorizontal,
  Check
} from 'lucide-react';
import { api } from '../../services/api';
import Badge from '../../components/common/Badge';
import Modal from '../../components/common/Modal';

export const AdminAttendancePage = () => {
  const [records, setRecords] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  // View Mode: 'calendar' (default) or 'list'
  const [viewMode, setViewMode] = useState('calendar');

  // Month & Year state for Calendar view
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);

  // Selected Employee filter for Calendar
  const [calendarEmployeeId, setCalendarEmployeeId] = useState('');

  // Filters for List view
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Day punch breakdown popup modal
  const [selectedDayDetails, setSelectedDayDetails] = useState(null);

  // Regularize Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    user_id: '',
    date: new Date().toISOString().split('T')[0],
    punch_in: '09:00',
    punch_out: '18:00',
    status: 'Present',
    reason: ''
  });
  const [submitting, setSubmitting] = useState(false);

  // Fetch initial lookups (departments and employees)
  useEffect(() => {
    const fetchLookups = async () => {
      try {
        const [depts, emps] = await Promise.all([
          api.getDepartments(),
          api.getDirectory()
        ]);
        setDepartments(depts || []);
        setEmployees(emps || []);
        if (emps && emps.length > 0 && !calendarEmployeeId) {
          setCalendarEmployeeId(emps[0].id);
        }
      } catch (err) {
        console.error('Failed to load lookups:', err);
      }
    };
    fetchLookups();
  }, []);

  // Fetch attendance records
  const fetchData = async () => {
    setLoading(true);
    try {
      if (viewMode === 'calendar') {
        const params = {
          year,
          month
        };
        if (calendarEmployeeId) {
          params.user_id = calendarEmployeeId;
        }
        if (selectedDept) {
          params.department_id = selectedDept;
        }
        const res = await api.getAllAttendance(params);
        setRecords(res.records || []);
      } else {
        const params = {};
        if (selectedDate) params.date = selectedDate;
        if (selectedDept) params.department_id = selectedDept;
        if (selectedStatus) params.status = selectedStatus;
        const res = await api.getAllAttendance(params);
        setRecords(res.records || []);
      }
    } catch (err) {
      console.error('Failed to load admin attendance:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [viewMode, year, month, calendarEmployeeId, selectedDate, selectedDept, selectedStatus]);

  // Month navigation helpers
  const prevMonth = () => {
    if (month === 1) {
      setMonth(12);
      setYear((y) => y - 1);
    } else {
      setMonth((m) => m - 1);
    }
  };

  const nextMonth = () => {
    if (month === 12) {
      setMonth(1);
      setYear((y) => y + 1);
    } else {
      setMonth((m) => m + 1);
    }
  };

  const goToCurrentMonth = () => {
    const now = new Date();
    setYear(now.getFullYear());
    setMonth(now.getMonth() + 1);
  };

  const monthName = new Date(year, month - 1).toLocaleString('default', { month: 'long', year: 'numeric' });
  const todayStr = new Date().toISOString().split('T')[0];

  // Calendar Grid builder (Monday start)
  const calendarDays = useMemo(() => {
    const firstDayIndex = new Date(year, month - 1, 1).getDay(); // 0 = Sun
    const startOffset = (firstDayIndex + 6) % 7; // Monday = 0
    const daysInMonth = new Date(year, month, 0).getDate();

    const days = [];
    const prevMonthDays = new Date(year, month - 1, 0).getDate();

    // Previous month padding
    for (let i = startOffset - 1; i >= 0; i--) {
      days.push({
        day: prevMonthDays - i,
        isCurrentMonth: false,
        dateStr: ''
      });
    }

    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      const mm = String(month).padStart(2, '0');
      const dd = String(d).padStart(2, '0');
      const dateStr = `${year}-${mm}-${dd}`;
      days.push({
        day: d,
        isCurrentMonth: true,
        dateStr
      });
    }

    // Next month padding
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

  // Aggregate records by date for calendar view
  const attendanceByDate = useMemo(() => {
    const map = {};
    if (!records) return map;

    records.forEach((rec) => {
      const d = rec.date;
      if (!map[d]) {
        map[d] = {
          date: d,
          sessions: [],
          firstIn: null,
          lastOut: null,
          totalHours: 0,
          status: rec.status,
          hasWorking: false,
          user_id: rec.user_id,
          employee_name: rec.name,
          employee_code: rec.employee_code
        };
      }
      map[d].sessions.push(rec);
    });

    Object.keys(map).forEach((dateStr) => {
      const item = map[dateStr];
      item.sessions.sort((a, b) => new Date(a.punch_in) - new Date(b.punch_in));

      const firstSession = item.sessions[0];
      item.firstIn = firstSession?.punch_in || null;

      const hasWorkingSession = item.sessions.some((s) => s.status === 'Working' || !s.punch_out);
      item.hasWorking = hasWorkingSession;

      if (hasWorkingSession) {
        item.lastOut = null;
      } else {
        const lastSession = item.sessions[item.sessions.length - 1];
        item.lastOut = lastSession?.punch_out || null;
      }

      const totalHrs = item.sessions.reduce((sum, s) => sum + (s.total_working_hours || 0), 0);
      item.totalHours = parseFloat(totalHrs.toFixed(2));

      if (hasWorkingSession) {
        item.status = 'Working';
      } else if (item.sessions.some((s) => s.status === 'Completed')) {
        item.status = 'Completed';
      } else if (item.sessions.some((s) => s.status === 'Present')) {
        item.status = 'Present';
      } else if (item.sessions.some((s) => s.status === 'Half Day')) {
        item.status = 'Half Day';
      } else {
        item.status = item.sessions[0]?.status || 'Completed';
      }
    });

    return map;
  }, [records]);

  // Monthly summary stats for calendar view
  const calendarStats = useMemo(() => {
    const uniqueDates = Object.values(attendanceByDate);
    const presentCount = uniqueDates.filter(d => d.status === 'Completed' || d.status === 'Present').length;
    const halfDayCount = uniqueDates.filter(d => d.status === 'Half Day').length;
    const workingCount = uniqueDates.filter(d => d.status === 'Working').length;
    const totalHours = uniqueDates.reduce((acc, d) => acc + (d.totalHours || 0), 0);

    return {
      loggedDays: uniqueDates.length,
      presentCount,
      halfDayCount,
      workingCount,
      totalHours: parseFloat(totalHours.toFixed(1))
    };
  }, [attendanceByDate]);

  // Filtered records for List view
  const filteredListRecords = useMemo(() => {
    if (!searchTerm) return records;
    const term = searchTerm.toLowerCase();
    return records.filter(r =>
      r.name?.toLowerCase().includes(term) ||
      r.employee_code?.toLowerCase().includes(term) ||
      r.date?.includes(term) ||
      r.status?.toLowerCase().includes(term)
    );
  }, [records, searchTerm]);

  // Open regularize modal with optional preset values
  const openRegularizeModal = (preset = {}) => {
    const targetUserId = preset.user_id || calendarEmployeeId || employees[0]?.id || '';
    setFormData({
      user_id: targetUserId,
      date: preset.date || new Date().toISOString().split('T')[0],
      punch_in: preset.punch_in ? new Date(preset.punch_in).toTimeString().substring(0, 5) : '09:00',
      punch_out: preset.punch_out ? new Date(preset.punch_out).toTimeString().substring(0, 5) : '18:00',
      status: preset.status || 'Present',
      reason: preset.regularization_reason || ''
    });
    setIsModalOpen(true);
  };

  const handleRegularizeSubmit = async (e) => {
    e.preventDefault();
    if (!formData.user_id || !formData.date) return;
    setSubmitting(true);
    try {
      const punchInISO = `${formData.date}T${formData.punch_in}:00.000Z`;
      const punchOutISO = `${formData.date}T${formData.punch_out}:00.000Z`;

      await api.regularizeAttendance({
        user_id: formData.user_id,
        date: formData.date,
        punch_in: punchInISO,
        punch_out: punchOutISO,
        status: formData.status,
        reason: formData.reason || 'Manual Admin Regularization'
      });

      setIsModalOpen(false);
      setSelectedDayDetails(null);
      await fetchData();
    } catch (err) {
      alert(err.message || 'Failed to regularize attendance');
    } finally {
      setSubmitting(false);
    }
  };

  const currentEmployee = employees.find(e => e.id === calendarEmployeeId) || employees[0];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Employee Attendance Management</h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Track daily attendance in Calendar & List view, inspect in/out punches, and regularize employee records
          </p>
        </div>

        {/* View Switcher & Regularize Attendance Button */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200/80 shadow-xs">
            <button
              type="button"
              onClick={() => setViewMode('calendar')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'calendar'
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CalendarDays className="w-4 h-4" />
              <span>Calendar View</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'list'
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <List className="w-4 h-4" />
              <span>List Table</span>
            </button>
          </div>

          <button
            onClick={() => openRegularizeModal()}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Regularize Attendance</span>
          </button>
        </div>
      </div>

      {/* CALENDAR VIEW */}
      {viewMode === 'calendar' && (
        <div className="space-y-6">
          {/* Employee & Dept Selector Bar */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3 flex-1">
              {/* Employee Selector */}
              <div className="min-w-[240px]">
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
                  Select Employee for Calendar View
                </label>
                <div className="relative">
                  <select
                    value={calendarEmployeeId}
                    onChange={(e) => setCalendarEmployeeId(e.target.value)}
                    className="w-full text-xs font-medium px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                  >
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name} ({emp.employee_code}) - {emp.department_name || 'Staff'}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Department Filter */}
              <div className="min-w-[180px]">
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
                  Department
                </label>
                <select
                  value={selectedDept}
                  onChange={(e) => setSelectedDept(e.target.value)}
                  className="w-full text-xs font-medium px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                >
                  <option value="">All Departments</option>
                  {departments.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Selected Employee Quick Card */}
            {currentEmployee && (
              <div className="flex items-center gap-3 bg-indigo-50/60 border border-indigo-100 px-3.5 py-2 rounded-xl">
                <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs uppercase shadow-xs">
                  {currentEmployee.name?.charAt(0) || 'E'}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 leading-tight">{currentEmployee.name}</h4>
                  <p className="text-[10px] text-slate-500 font-mono">
                    {currentEmployee.employee_code} • {currentEmployee.designation_name || currentEmployee.designation || 'Staff'}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Monthly Summary Statistics for Selected Employee */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Logged Shifts</span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-extrabold text-slate-900">{calendarStats.loggedDays}</span>
                <span className="text-xs text-slate-400 font-medium">days in {monthName}</span>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Present Days</span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-extrabold text-emerald-600">{calendarStats.presentCount}</span>
                <span className="text-xs text-slate-400 font-medium">completed shifts</span>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Half Days / Active</span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-extrabold text-amber-600">{calendarStats.halfDayCount + calendarStats.workingCount}</span>
                <span className="text-xs text-slate-400 font-medium">shifts</span>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Total Hours Logged</span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-extrabold text-indigo-600">{calendarStats.totalHours}</span>
                <span className="text-xs text-slate-400 font-medium">working hours</span>
              </div>
            </div>
          </div>

          {/* Calendar Card */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm">
            {/* Calendar Month Navigation Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 mb-5 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-slate-900">Attendance Calendar</h3>
                  <span className="text-xs text-slate-400">•</span>
                  <span className="text-xs font-semibold text-slate-600">{monthName}</span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Showing First In and Last Out calculation on each day. Click any date or Regularize button to manage.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={goToCurrentMonth}
                  className="px-3 py-1.5 text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-colors cursor-pointer"
                >
                  Current Month
                </button>
                <div className="flex items-center bg-slate-50 rounded-xl border border-slate-200 p-0.5">
                  <button
                    type="button"
                    onClick={prevMonth}
                    title="Previous Month"
                    aria-label="Previous Month"
                    className="p-1.5 rounded-lg hover:bg-white text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-xs font-bold text-slate-700 px-3 min-w-[110px] text-center">
                    {monthName}
                  </span>
                  <button
                    type="button"
                    onClick={nextMonth}
                    title="Next Month"
                    aria-label="Next Month"
                    className="p-1.5 rounded-lg hover:bg-white text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {loading ? (
              <div className="py-20 flex justify-center">
                <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Days of week header */}
                <div className="grid grid-cols-7 bg-slate-50 rounded-2xl border border-slate-200/70 text-center text-xs font-bold text-slate-500 py-2.5">
                  <span>Mon</span>
                  <span>Tue</span>
                  <span>Wed</span>
                  <span>Thu</span>
                  <span>Fri</span>
                  <span className="text-slate-400">Sat</span>
                  <span className="text-slate-400">Sun</span>
                </div>

                {/* Calendar Days Grid */}
                <div className="grid grid-cols-7 gap-2">
                  {calendarDays.map((item, idx) => {
                    if (!item.isCurrentMonth) {
                      return (
                        <div
                          key={idx}
                          className="min-h-[120px] p-2.5 rounded-2xl border border-dashed border-slate-150 bg-slate-50/40 text-slate-300 select-none flex flex-col justify-between"
                        >
                          <span className="text-xs font-medium">{item.day}</span>
                        </div>
                      );
                    }

                    const dayAtt = attendanceByDate[item.dateStr];
                    const hasPunches = Boolean(dayAtt && dayAtt.sessions.length > 0);
                    const isToday = item.dateStr === todayStr;

                    return (
                      <div
                        key={idx}
                        onClick={() => {
                          if (hasPunches) {
                            setSelectedDayDetails(dayAtt);
                          } else {
                            openRegularizeModal({ date: item.dateStr, user_id: calendarEmployeeId });
                          }
                        }}
                        className={`min-h-[120px] p-2.5 rounded-2xl border transition-all flex flex-col justify-between text-left group cursor-pointer ${
                          isToday
                            ? 'border-indigo-400 ring-2 ring-indigo-500/20 bg-indigo-50/20'
                            : hasPunches
                            ? 'border-slate-200 hover:border-indigo-300 bg-white hover:bg-indigo-50/10 hover:shadow-md'
                            : 'border-slate-100 bg-slate-50/30 hover:border-slate-300'
                        }`}
                      >
                        {/* Top row: Day number & Badge */}
                        <div className="flex items-center justify-between gap-1">
                          <span
                            className={`text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center transition-colors ${
                              isToday
                                ? 'bg-indigo-600 text-white shadow-xs'
                                : hasPunches
                                ? 'text-slate-900 group-hover:text-indigo-600 font-extrabold'
                                : 'text-slate-500'
                            }`}
                          >
                            {item.day}
                          </span>

                          {hasPunches ? (
                            <span
                              className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${
                                dayAtt.status === 'Working'
                                  ? 'bg-blue-100 text-blue-700'
                                  : dayAtt.status === 'Half Day'
                                  ? 'bg-amber-100 text-amber-700'
                                  : 'bg-emerald-100 text-emerald-700'
                              }`}
                            >
                              {dayAtt.status}
                            </span>
                          ) : (
                            <span className="text-[9px] text-slate-300 group-hover:text-indigo-600 font-medium">
                              + Regularize
                            </span>
                          )}
                        </div>

                        {/* Middle: First In & Last Out Calculation */}
                        {hasPunches ? (
                          <div className="my-1.5 space-y-1 bg-slate-50/80 group-hover:bg-indigo-50/40 p-1.5 rounded-xl border border-slate-100 transition-colors">
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="text-[10px] font-semibold text-slate-400 flex items-center gap-1">
                                <LogIn className="w-2.5 h-2.5 text-emerald-600" /> In:
                              </span>
                              <span className="font-mono font-bold text-slate-800">
                                {formatTime(dayAtt.firstIn)}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="text-[10px] font-semibold text-slate-400 flex items-center gap-1">
                                <LogOut className="w-2.5 h-2.5 text-rose-500" /> Out:
                              </span>
                              <span className="font-mono font-bold text-slate-800">
                                {dayAtt.lastOut ? (
                                  formatTime(dayAtt.lastOut)
                                ) : dayAtt.hasWorking ? (
                                  <span className="text-blue-600 text-[10px] font-bold">Active</span>
                                ) : (
                                  '--:--'
                                )}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="my-auto py-2 text-center text-[10px] text-slate-300 font-medium">
                            No record
                          </div>
                        )}

                        {/* Bottom: Total Hours & Action */}
                        <div className="flex items-center justify-between text-[10px] pt-1 border-t border-slate-100">
                          {hasPunches ? (
                            <>
                              <span className="font-bold text-slate-600 flex items-center gap-0.5">
                                <Timer className="w-2.5 h-2.5 text-slate-400" />
                                {dayAtt.totalHours}h
                              </span>
                              <span className="text-[9px] font-bold text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity">
                                Inspect / Edit →
                              </span>
                            </>
                          ) : (
                            <span className="text-[9px] text-slate-400 italic">Click to add</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Calendar Legend */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 text-xs text-slate-500">
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                      Present / Completed
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                      Active Shift (Working)
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                      Half Day
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400 italic">
                    Tip: Click any calendar date to inspect punch sessions or regularize attendance directly.
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* LIST TABLE VIEW */}
      {viewMode === 'list' && (
        <div className="space-y-6">
          {/* Filters Bar */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm flex flex-wrap items-center gap-3">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Search Employee</label>
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter by name, code, or date..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full text-xs pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Filter Date</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Department</label>
              <select
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
                className="text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              >
                <option value="">All Departments</option>
                {departments.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Status</label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              >
                <option value="">All Statuses</option>
                <option value="Working">Working</option>
                <option value="Completed">Completed</option>
                <option value="Present">Present</option>
                <option value="Half Day">Half Day</option>
              </select>
            </div>

            {(selectedDate || selectedDept || selectedStatus || searchTerm) && (
              <div className="self-end pb-0.5">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedDate('');
                    setSelectedDept('');
                    setSelectedStatus('');
                    setSearchTerm('');
                  }}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-800 px-2 py-2 cursor-pointer"
                >
                  Clear Filters
                </button>
              </div>
            )}
          </div>

          {/* Table Card */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">
                Attendance Log Records ({filteredListRecords.length})
              </h3>
              <span className="text-xs text-slate-400">
                Click any row or "Regularize" button to adjust attendance
              </span>
            </div>

            {loading ? (
              <div className="py-16 flex justify-center">
                <div className="w-7 h-7 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : filteredListRecords.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400">
                No attendance records match the selected filters.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase tracking-wider">
                      <th className="pb-3">Employee</th>
                      <th className="pb-3">Date</th>
                      <th className="pb-3">Punch In</th>
                      <th className="pb-3">Punch Out</th>
                      <th className="pb-3">Total Working Hours</th>
                      <th className="pb-3">Status</th>
                      <th className="pb-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredListRecords.map((r) => (
                      <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 font-bold text-slate-900">
                          {r.name}
                          <span className="block text-[10px] font-normal text-slate-400">{r.employee_code}</span>
                        </td>
                        <td className="py-3 font-medium text-slate-600">{formatDate(r.date)}</td>
                        <td className="py-3 font-mono text-slate-600">
                          {formatTime(r.punch_in)}
                        </td>
                        <td className="py-3 font-mono text-slate-600">
                          {r.punch_out ? formatTime(r.punch_out) : (
                            <span className="text-blue-600 font-semibold">Active</span>
                          )}
                        </td>
                        <td className="py-3 font-semibold text-slate-800">
                          {r.total_working_hours ? `${r.total_working_hours} hrs` : '--'}
                        </td>
                        <td className="py-3">
                          <Badge variant={r.status}>{r.status}</Badge>
                          {r.regularized && (
                            <span className="block text-[9px] text-amber-600 font-semibold mt-0.5">
                              Regularized
                            </span>
                          )}
                        </td>
                        <td className="py-3 text-right">
                          <button
                            type="button"
                            onClick={() => openRegularizeModal({
                              user_id: r.user_id,
                              date: r.date,
                              punch_in: r.punch_in,
                              punch_out: r.punch_out,
                              status: r.status,
                              regularization_reason: r.regularization_reason
                            })}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg font-bold text-[11px] transition-colors cursor-pointer"
                          >
                            <Edit2 className="w-3 h-3" />
                            <span>Regularize</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* POPUP MODAL: DAY IN/OUT BREAKDOWN */}
      <Modal
        isOpen={Boolean(selectedDayDetails)}
        onClose={() => setSelectedDayDetails(null)}
        title={`Attendance Details — ${selectedDayDetails?.date ? formatDate(selectedDayDetails.date) : ''}`}
        maxWidth="max-w-xl"
      >
        {selectedDayDetails && (
          <div className="space-y-5 text-xs">
            {/* Daily summary cards */}
            <div className="grid grid-cols-3 gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-100 text-center">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
                  Day's First In
                </span>
                <span className="text-sm font-extrabold text-slate-800 font-mono">
                  {formatTime(selectedDayDetails.firstIn)}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
                  Day's Last Out
                </span>
                <span className="text-sm font-extrabold text-slate-800 font-mono">
                  {selectedDayDetails.lastOut
                    ? formatTime(selectedDayDetails.lastOut)
                    : selectedDayDetails.hasWorking
                    ? 'In Progress'
                    : '--:--'}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
                  Calculated Hours
                </span>
                <span className="text-sm font-extrabold text-indigo-600 font-mono">
                  {selectedDayDetails.totalHours} hrs
                </span>
              </div>
            </div>

            {/* List of sessions */}
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                  All Punches on This Day ({selectedDayDetails.sessions.length})
                </h4>
                <Badge variant={selectedDayDetails.status}>{selectedDayDetails.status}</Badge>
              </div>

              <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
                {selectedDayDetails.sessions.map((sess, idx) => (
                  <div
                    key={sess.id || idx}
                    className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-white hover:border-indigo-300 transition-all shadow-2xs"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs shrink-0">
                        #{idx + 1}
                      </div>
                      <div>
                        <div className="flex items-center gap-3 font-mono text-xs text-slate-800">
                          <span className="flex items-center gap-1">
                            <LogIn className="w-3 h-3 text-emerald-600" />
                            <strong className="font-semibold text-slate-900">In:</strong>{' '}
                            {formatTime(sess.punch_in)}
                          </span>
                          <span className="text-slate-300">•</span>
                          <span className="flex items-center gap-1">
                            <LogOut className="w-3 h-3 text-rose-500" />
                            <strong className="font-semibold text-slate-900">Out:</strong>{' '}
                            {sess.punch_out ? (
                              formatTime(sess.punch_out)
                            ) : (
                              <span className="text-blue-600 font-bold">Active</span>
                            )}
                          </span>
                        </div>
                        {sess.regularized && (
                          <span className="text-[10px] text-amber-600 font-semibold block mt-0.5">
                            Regularized: {sess.regularization_reason || 'Manual adjustment'}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="font-bold text-slate-700 text-xs">
                        {sess.total_working_hours ? `${sess.total_working_hours} hrs` : '--'}
                      </span>
                      <span className="block text-[10px] text-slate-400 capitalize">
                        {sess.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  const targetDay = selectedDayDetails;
                  setSelectedDayDetails(null);
                  openRegularizeModal({
                    user_id: targetDay.user_id || calendarEmployeeId,
                    date: targetDay.date,
                    punch_in: targetDay.firstIn,
                    punch_out: targetDay.lastOut,
                    status: targetDay.status
                  });
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>Regularize This Day</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedDayDetails(null)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* REGULARIZE ATTENDANCE MODAL */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Regularize / Adjust Employee Attendance"
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleRegularizeSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Select Employee <span className="text-rose-500">*</span>
            </label>
            <select
              value={formData.user_id}
              onChange={(e) => setFormData({ ...formData, user_id: e.target.value })}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              required
            >
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>
                  {emp.name} ({emp.employee_code}) - {emp.department_name || 'Staff'}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Attendance Date <span className="text-rose-500">*</span>
            </label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Punch In Time <span className="text-rose-500">*</span>
              </label>
              <input
                type="time"
                value={formData.punch_in}
                onChange={(e) => setFormData({ ...formData, punch_in: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                required
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Punch Out Time <span className="text-rose-500">*</span>
              </label>
              <input
                type="time"
                value={formData.punch_out}
                onChange={(e) => setFormData({ ...formData, punch_out: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                required
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Status Classification <span className="text-rose-500">*</span>
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="Present">Present (Full Day)</option>
              <option value="Completed">Completed</option>
              <option value="Half Day">Half Day</option>
              <option value="Working">Working / Shift Active</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Regularization Reason / Remarks <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g., Biometric sync issue, Client site on duty, Missed swipe..."
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>

          <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl font-medium hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-sm transition-all cursor-pointer disabled:opacity-50"
            >
              {submitting ? 'Saving...' : 'Apply Regularization'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default AdminAttendancePage;
