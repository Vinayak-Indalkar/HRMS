import { formatTime, formatDate } from '../../utils/formatters';
import React, { useState, useEffect, useMemo } from 'react';
import {
  Clock,
  Play,
  Square,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  BarChart3,
  CalendarDays,
  List,
  Timer,
  LogIn,
  LogOut
} from 'lucide-react';
import { api } from '../../services/api';
import LiveTimer from '../../components/common/LiveTimer';
import Badge from '../../components/common/Badge';
import StatCard from '../../components/common/StatCard';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import Modal from '../../components/common/Modal';

export const MyAttendancePage = () => {
  const [todayData, setTodayData] = useState(null);
  const [monthlyData, setMonthlyData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [punchLoading, setPunchLoading] = useState(false);
  const [punchOutConfirmOpen, setPunchOutConfirmOpen] = useState(false);
  const [error, setError] = useState('');

  // View Mode: 'calendar' (default) or 'list'
  const [viewMode, setViewMode] = useState('calendar');

  // Selected date details for punch history popup modal
  const [selectedDayDetails, setSelectedDayDetails] = useState(null);

  // Current selected month & year
  const [year, setYear] = useState(2026);
  const [month, setMonth] = useState(9); // September

  const loadData = async () => {
    try {
      const [today, monthStats] = await Promise.all([
        api.getTodayAttendance(),
        api.getMyAttendance(year, month)
      ]);
      setTodayData(today);
      setMonthlyData(monthStats);
    } catch (err) {
      console.error('Failed to load attendance:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [year, month]);

  const handlePunchIn = async () => {
    setPunchLoading(true);
    setError('');
    try {
      await api.punchIn();
      await loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setPunchLoading(false);
    }
  };

  const handlePunchOut = () => {
    setPunchOutConfirmOpen(true);
  };

  const handleConfirmPunchOut = async () => {
    setPunchOutConfirmOpen(false);
    setPunchLoading(true);
    setError('');
    try {
      await api.punchOut();
      await loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setPunchLoading(false);
    }
  };

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

  // Group all monthly attendance records by date YYYY-MM-DD
  // Calculates: first in, last out, total working hours, status, and sorted list of punch sessions
  const attendanceByDate = useMemo(() => {
    const map = {};
    if (!monthlyData?.records) return map;

    monthlyData.records.forEach((rec) => {
      const d = rec.date;
      if (!map[d]) {
        map[d] = {
          date: d,
          sessions: [],
          firstIn: null,
          lastOut: null,
          totalHours: 0,
          status: rec.status,
          hasWorking: false
        };
      }
      map[d].sessions.push(rec);
    });

    // Compute aggregated details for each date
    Object.keys(map).forEach((dateStr) => {
      const item = map[dateStr];
      // Sort sessions chronologically by punch_in time
      item.sessions.sort((a, b) => new Date(a.punch_in) - new Date(b.punch_in));

      // First Punch In
      const firstSession = item.sessions[0];
      item.firstIn = firstSession?.punch_in || null;

      // Last Punch Out (if any session is still Working, mark hasWorking)
      const hasWorkingSession = item.sessions.some((s) => s.status === 'Working' || !s.punch_out);
      item.hasWorking = hasWorkingSession;

      if (hasWorkingSession) {
        item.lastOut = null; // Still working / currently clocked in
      } else {
        const lastSession = item.sessions[item.sessions.length - 1];
        item.lastOut = lastSession?.punch_out || null;
      }

      // Sum of working hours across all sessions on this date
      const totalHrs = item.sessions.reduce((sum, s) => sum + (s.total_working_hours || 0), 0);
      item.totalHours = parseFloat(totalHrs.toFixed(2));

      // Consolidated status priority: Working > Completed > Present > Half Day
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
  }, [monthlyData]);

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

    // Next month padding to fill a neat 5 or 6 week grid
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

  const todayStr = new Date().toISOString().split('T')[0];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const isWorking = todayData?.isWorking;
  const monthName = new Date(year, month - 1).toLocaleString('default', { month: 'long', year: 'numeric' });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">My Attendance</h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Track daily work hours, review calendar first in & last out calculations, and view all punch sessions
          </p>
        </div>

        {/* View Switcher: Calendar View / List Log View */}
        <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200/80 self-start sm:self-auto shadow-xs">
          <button
            type="button"
            onClick={() => setViewMode('calendar')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
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
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              viewMode === 'list'
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <List className="w-4 h-4" />
            <span>List Table</span>
          </button>
        </div>
      </div>

      {/* Punch Action Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          {/* Left: Status & Timer */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Shift Status</span>
              <Badge variant={todayData?.status}>{todayData?.status || 'Not Punched In'}</Badge>
            </div>
            <div className="text-4xl font-extrabold text-slate-900 font-mono tracking-tight flex items-center gap-2">
              <LiveTimer
                startTime={todayData?.punchInTime}
                isWorking={isWorking}
                fixedHours={todayData?.todayRecord?.total_working_hours}
              />
            </div>
            <p className="text-xs text-slate-500 mt-2">
              {isWorking
                ? 'Your shift is currently active. Timers update dynamically from server timestamp.'
                : todayData?.status === 'Completed'
                ? `Shift recorded today. Total logged: ${todayData?.totalWorkingHours || todayData?.todayRecord?.total_working_hours || 0} hrs. You can punch in again anytime.`
                : 'Click Punch In when you begin your workday.'}
            </p>
          </div>

          {/* Center: Punch Times */}
          <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100 min-w-[240px]">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">First In Time</span>
              <span className="text-sm font-bold text-slate-800">
                {todayData?.punchInTime
                  ? formatTime(todayData.punchInTime)
                  : '--:--'}
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Last Out Time</span>
              <span className="text-sm font-bold text-slate-800">
                {todayData?.punchOutTime
                  ? formatTime(todayData.punchOutTime)
                  : '--:--'}
              </span>
            </div>
          </div>

          {/* Right: Punch Button */}
          <div className="flex flex-col items-stretch sm:items-end">
            {error && (
              <p className="text-xs text-rose-600 bg-rose-50 p-2.5 rounded-xl border border-rose-200 mb-2 max-w-xs">
                {error}
              </p>
            )}

            {isWorking ? (
              <button
                onClick={handlePunchOut}
                disabled={punchLoading}
                className="flex items-center justify-center gap-2 px-8 py-3.5 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl font-bold shadow-lg shadow-rose-600/30 transition-all text-sm focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:outline-none"
              >
                <Square className="w-4 h-4 fill-current" />
                <span>{punchLoading ? 'Saving...' : 'Punch Out Now'}</span>
              </button>
            ) : (
              <button
                onClick={handlePunchIn}
                disabled={punchLoading}
                className="flex items-center justify-center gap-2 px-8 py-3.5 rounded-2xl font-bold shadow-lg text-sm transition-all bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/30 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>
                  {punchLoading
                    ? 'Recording...'
                    : todayData?.status === 'Completed'
                    ? 'Punch In Again'
                    : 'Punch In'}
                </span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Monthly Summary Statistics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Logged Shifts"
          value={monthlyData?.workingDays || 0}
          subtitle={`${monthName}`}
          icon={CalendarIcon}
          color="indigo"
        />
        <StatCard
          title="Present Days"
          value={monthlyData?.presentDays || 0}
          subtitle="Full day completed"
          icon={CheckCircle2}
          color="emerald"
        />
        <StatCard
          title="Half Days"
          value={monthlyData?.halfDays || 0}
          subtitle="4 - 7.5 hours"
          icon={AlertCircle}
          color="amber"
        />
        <StatCard
          title="Total Hours"
          value={`${monthlyData?.totalHours || 0}h`}
          subtitle="Logged this month"
          icon={Clock}
          color="blue"
        />
      </div>

      {/* Main Attendance View Card (Calendar or List) */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm">
        {/* Navigation & Toolbar Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 mb-5 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900">
                {viewMode === 'calendar' ? 'Attendance Calendar' : 'Attendance Log Table'}
              </h3>
              <span className="text-xs text-slate-400">•</span>
              <span className="text-xs font-semibold text-slate-500">{monthName}</span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {viewMode === 'calendar'
                ? 'Showing First In and Last Out calculation on each day. Click any date to view all in/out punches.'
                : 'Chronological list of all attendance punch records.'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={goToCurrentMonth}
              className="px-3 py-1.5 text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-colors"
            >
              Current Month
            </button>
            <div className="flex items-center bg-slate-50 rounded-xl border border-slate-200 p-0.5">
              <button
                onClick={prevMonth}
                title="Previous Month"
                aria-label="Previous Month"
                className="p-1.5 rounded-lg hover:bg-white text-slate-600 hover:text-slate-900 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs font-bold text-slate-700 px-3 min-w-[110px] text-center">
                {monthName}
              </span>
              <button
                onClick={nextMonth}
                title="Next Month"
                aria-label="Next Month"
                className="p-1.5 rounded-lg hover:bg-white text-slate-600 hover:text-slate-900 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* CALENDAR VIEW */}
        {viewMode === 'calendar' && (
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

            {/* Days Grid */}
            <div className="grid grid-cols-7 gap-2">
              {calendarDays.map((item, idx) => {
                if (!item.isCurrentMonth) {
                  return (
                    <div
                      key={idx}
                      className="min-h-[115px] p-2.5 rounded-2xl border border-dashed border-slate-150 bg-slate-50/40 text-slate-300 select-none flex flex-col justify-between"
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
                      }
                    }}
                    role={hasPunches ? 'button' : undefined}
                    tabIndex={hasPunches ? 0 : undefined}
                    onKeyDown={(e) => {
                      if (hasPunches && (e.key === 'Enter' || e.key === ' ')) {
                        e.preventDefault();
                        setSelectedDayDetails(dayAtt);
                      }
                    }}
                    className={`min-h-[115px] p-2.5 rounded-2xl border transition-all flex flex-col justify-between text-left group ${
                      isToday
                        ? 'border-indigo-400 ring-2 ring-indigo-500/20 bg-indigo-50/20'
                        : hasPunches
                        ? 'border-slate-200 hover:border-indigo-300 bg-white hover:bg-indigo-50/10 hover:shadow-md cursor-pointer'
                        : 'border-slate-100 bg-slate-50/30'
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

                      {hasPunches && (
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                            dayAtt.status === 'Working'
                              ? 'bg-blue-100 text-blue-700'
                              : dayAtt.status === 'Half Day'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-emerald-100 text-emerald-700'
                          }`}
                        >
                          {dayAtt.sessions.length > 1
                            ? `${dayAtt.sessions.length} sessions`
                            : dayAtt.status}
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
                        No punches
                      </div>
                    )}

                    {/* Bottom: Total Hours & Click Hint */}
                    {hasPunches ? (
                      <div className="flex items-center justify-between text-[10px] pt-1 border-t border-slate-100">
                        <span className="font-bold text-slate-600 flex items-center gap-0.5">
                          <Timer className="w-2.5 h-2.5 text-slate-400" />
                          {dayAtt.totalHours}h
                        </span>
                        <span className="text-[9px] font-bold text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity">
                          View details →
                        </span>
                      </div>
                    ) : (
                      <div className="h-3" />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 text-xs text-slate-500">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                  Completed / Full Day
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
                Tip: Click any calendar day box with attendance to inspect all individual in & out timestamps.
              </span>
            </div>
          </div>
        )}

        {/* LIST TABLE VIEW */}
        {viewMode === 'list' && (
          <div>
            {monthlyData?.records?.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400">
                No attendance records found for {monthName}.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase tracking-wider">
                      <th className="pb-3">Date</th>
                      <th className="pb-3">First Punch In</th>
                      <th className="pb-3">Last Punch Out</th>
                      <th className="pb-3">Total Working Hours</th>
                      <th className="pb-3 text-center">Sessions</th>
                      <th className="pb-3 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {Object.values(attendanceByDate).map((dayAtt) => (
                      <tr
                        key={dayAtt.date}
                        onClick={() => setSelectedDayDetails(dayAtt)}
                        className="hover:bg-indigo-50/40 transition-colors cursor-pointer group"
                      >
                        <td className="py-3.5 font-bold text-slate-900 group-hover:text-indigo-600">
                          {formatDate(dayAtt.date)}
                        </td>
                        <td className="py-3.5 font-mono text-slate-600">
                          {dayAtt.firstIn ? formatTime(dayAtt.firstIn) : '--:--'}
                        </td>
                        <td className="py-3.5 font-mono text-slate-600">
                          {dayAtt.lastOut ? (
                            formatTime(dayAtt.lastOut)
                          ) : dayAtt.hasWorking ? (
                            <span className="text-blue-600 font-bold">Currently Working</span>
                          ) : (
                            '--:--'
                          )}
                        </td>
                        <td className="py-3.5 font-semibold text-slate-800">
                          {dayAtt.totalHours ? `${dayAtt.totalHours} hrs` : '--'}
                        </td>
                        <td className="py-3.5 text-center">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                            {dayAtt.sessions.length} punch{dayAtt.sessions.length > 1 ? 'es' : ''}
                          </span>
                        </td>
                        <td className="py-3.5 text-right">
                          <Badge variant={dayAtt.status}>{dayAtt.status}</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* POPUP MODAL: SHOW ALL IN AND OUT TIMES ON SELECTED DAY */}
      <Modal
        isOpen={Boolean(selectedDayDetails)}
        onClose={() => setSelectedDayDetails(null)}
        title={`Punch Details — ${selectedDayDetails?.date ? formatDate(selectedDayDetails.date) : ''}`}
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

            {/* List of each punch in and punch out session on this day */}
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                  All Punches on This Day ({selectedDayDetails.sessions.length})
                </h4>
                <Badge variant={selectedDayDetails.status}>{selectedDayDetails.status}</Badge>
              </div>

              <div className="space-y-2.5 max-h-[280px] overflow-y-auto pr-1">
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

            {/* Modal Footer */}
            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedDayDetails(null)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Confirmation Dialog for Punch Out */}
      <ConfirmDialog
        isOpen={punchOutConfirmOpen}
        onClose={() => setPunchOutConfirmOpen(false)}
        onConfirm={handleConfirmPunchOut}
        title="Punch Out & Finalize Shift"
        message="Are you ready to clock out and conclude your work session for today?"
        warningMessage="Your active working timer will be stopped and total shift duration logged."
        confirmText="Confirm Punch Out"
        variant="warning"
        loading={punchLoading}
      />
    </div>
  );
};

export default MyAttendancePage;

