import { formatTime } from '../../utils/formatters';
import { formatDate } from '../../utils/formatters';
import React, { useState, useEffect } from 'react';
import {
  Clock,
  Play,
  Square,
  CalendarCheck,
  Calendar,
  Bell,
  Cake,
  Award,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  TrendingUp
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import LiveTimer from '../../components/common/LiveTimer';
import StatCard from '../../components/common/StatCard';
import Badge from '../../components/common/Badge';
import ConfirmDialog from '../../components/common/ConfirmDialog';

export const EmployeeDashboard = ({ onNavigate }) => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [punchLoading, setPunchLoading] = useState(false);
  const [punchOutConfirmOpen, setPunchOutConfirmOpen] = useState(false);
  const [punchError, setPunchError] = useState('');

  const fetchStats = async () => {
    try {
      const data = await api.getDashboardStats();
      setStats(data);
    } catch (err) {
      console.error('Failed to load employee dashboard stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handlePunchIn = async () => {
    setPunchLoading(true);
    setPunchError('');
    try {
      await api.punchIn();
      await fetchStats();
    } catch (err) {
      setPunchError(err.message);
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
    setPunchError('');
    try {
      await api.punchOut();
      await fetchStats();
    } catch (err) {
      setPunchError(err.message);
    } finally {
      setPunchLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const att = stats?.attendance;
  const isWorking = att?.isWorking;

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-60 h-60 bg-white/5 rounded-full blur-2xl pointer-events-none"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-indigo-300">Employee Workspace</span>
            <h2 className="text-2xl sm:text-3xl font-bold mt-1">Hello, {user?.name?.split(' ')[0]}! 👋</h2>
            <p className="text-xs sm:text-sm text-indigo-100/80 mt-1.5 max-w-md">
              {user?.designation} • {user?.department_name || 'Engineering'} • Employee ID: {user?.employee_code}
            </p>
            <div className="mt-3.5">
              <button
                onClick={() => onNavigate('my-profile')}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-white/15 hover:bg-white/25 active:scale-95 text-white rounded-xl text-xs font-bold border border-white/20 backdrop-blur-sm transition-all"
              >
                <span>View Complete Profile</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Quick Attendance Widget */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 sm:p-5 border border-white/15 min-w-[280px]">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-indigo-200">Today's Attendance</span>
              <Badge variant={att?.status}>{att?.status || 'Not Punched In'}</Badge>
            </div>

            <div className="flex items-baseline justify-between mb-4">
              <div>
                <span className="text-[10px] text-indigo-200 uppercase font-semibold tracking-wider block">Live Hours</span>
                <div className="text-2xl font-bold font-mono text-white mt-0.5">
                  <LiveTimer
                    startTime={att?.punchIn}
                    isWorking={isWorking}
                    fixedHours={att?.todayWorkingHours}
                  />
                </div>
              </div>
              <div className="text-right text-xs text-indigo-200">
                <p>In: {att?.punchIn ? formatTime(att.punchIn) : '--:--'}</p>
                <p>Out: {att?.punchOut ? formatTime(att.punchOut) : '--:--'}</p>
              </div>
            </div>

            {punchError && (
              <p className="text-xs text-rose-300 bg-rose-950/40 p-2 rounded-lg mb-2">{punchError}</p>
            )}

            {isWorking ? (
              <button
                onClick={handlePunchOut}
                disabled={punchLoading}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-lg shadow-rose-600/30 transition-all"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>{punchLoading ? 'Saving...' : 'Punch Out Now'}</span>
              </button>
            ) : (
              <button
                onClick={handlePunchIn}
                disabled={punchLoading}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold shadow-lg transition-all bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-500/30"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>
                  {punchLoading
                    ? 'Recording...'
                    : att?.status === 'Completed'
                    ? 'Punch In Again'
                    : 'Punch In to Start Work'}
                </span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Leave Balances Grid */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">Leave Balances</h3>
          <button
            onClick={() => onNavigate('my-leave')}
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
          >
            <span>Apply Leave</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
          {[
            {
              id: 'cl',
              leave_type: 'Casual Leave (CL)',
              code: 'CL',
              quota: '6 Days',
              remaining: stats?.leaveBalances?.find(b => b.code === 'CL' || b.leave_type?.includes('Casual'))?.remaining_leaves ?? 6,
              total: 6,
              subtitle: 'Short planned absence',
              isUnpaid: false
            },
            {
              id: 'sl',
              leave_type: 'Sick Leave (SL)',
              code: 'SL',
              quota: '6 Days',
              remaining: stats?.leaveBalances?.find(b => b.code === 'SL' || b.leave_type?.includes('Sick'))?.remaining_leaves ?? 6,
              total: 6,
              subtitle: 'Medical & recovery',
              isUnpaid: false
            },
            {
              id: 'el',
              leave_type: 'Earned Leave (EL)',
              code: 'EL',
              quota: '8 Days',
              remaining: stats?.leaveBalances?.find(b => b.code === 'EL' || b.leave_type?.includes('Earned'))?.remaining_leaves ?? 8,
              total: 8,
              subtitle: 'Privilege / Annual paid',
              isUnpaid: false
            },
            {
              id: 'lwp',
              leave_type: 'Leave Without Pay (LWP)',
              code: 'LWP',
              quota: 'Flexible / Unpaid',
              remaining: 'Flexible',
              total: 'Unlimited',
              subtitle: 'Unpaid personal leave',
              isUnpaid: true
            },
            {
              id: 'hd',
              leave_type: 'Half Day Leave (HD)',
              code: 'HD',
              quota: '0.5 Day per session',
              remaining: '0.5 Day / session',
              total: '0.5 Day',
              subtitle: 'Morning / afternoon shift',
              isUnpaid: false
            }
          ].map((b) => (
            <div
              key={b.id}
              onClick={() => onNavigate('my-leave')}
              className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm hover:border-indigo-300 hover:shadow-md cursor-pointer transition-all flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-slate-800 truncate block group-hover:text-indigo-600 transition-colors">
                    {b.leave_type}
                  </span>
                  <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-100">
                    {b.code}
                  </span>
                </div>
                <div className="flex items-baseline gap-1.5 mt-2">
                  <span className="text-2xl font-extrabold text-slate-900 tracking-tight">
                    {b.quota}
                  </span>
                </div>
                <span className="text-[11px] text-slate-400 block mt-0.5">{b.subtitle}</span>
              </div>

              <div className="mt-3">
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-indigo-500 to-sky-500 h-full rounded-full transition-all duration-500"
                    style={{
                      width: b.isUnpaid ? '100%' : `${Math.min(100, (typeof b.remaining === 'number' ? (b.remaining / b.total) * 100 : 100))}%`
                    }}
                  />
                </div>
                <span className="text-[10px] text-indigo-600 font-semibold mt-1.5 block">
                  Click to Apply Leave →
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Middle Grid: Announcements + Upcoming Holidays */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Company Announcements (2 Cols) */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Bell className="w-4 h-4" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Company Announcements</h3>
            </div>
            <button
              onClick={() => onNavigate('announcements')}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
            >
              View All
            </button>
          </div>

          <div className="space-y-3">
            {stats?.recentAnnouncements?.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">No announcements yet</p>
            ) : (
              stats?.recentAnnouncements?.map((a) => (
                <div
                  key={a.id}
                  className="p-4 rounded-xl bg-slate-50 border border-slate-200/60 hover:border-slate-300 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h4 className="text-sm font-bold text-slate-900">{a.title}</h4>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                      {a.category}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">{a.description}</p>
                  <div className="mt-2 text-[11px] text-slate-400 flex items-center gap-2">
                    <span>By {a.author_name}</span>
                    <span>•</span>
                    <span>{formatDate(a.createdAt)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Upcoming Holidays (1 Col) */}
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Calendar className="w-4 h-4" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Upcoming Holidays</h3>
            </div>
            <button
              onClick={() => onNavigate('holidays')}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
            >
              Calendar
            </button>
          </div>

          <div className="space-y-3">
            {stats?.upcomingHolidays?.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">No upcoming holidays scheduled</p>
            ) : (
              stats?.upcomingHolidays?.map((h) => (
                <div key={h.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <div>
                    <p className="text-xs font-bold text-slate-900">{h.name}</p>
                    <p className="text-[11px] text-slate-500">{formatDate(h.date)}</p>
                  </div>
                  <Badge variant={h.type} size="sm">{h.type}</Badge>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Celebrations: Birthdays & Anniversaries */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/80 shadow-sm">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-4">
          Team Celebrations this Month 🎈
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats?.celebrations?.birthdays?.map((b, i) => (
            <div key={`b_${i}`} className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/60">
              <div className="w-9 h-9 rounded-full bg-amber-200 text-amber-800 flex items-center justify-center shrink-0">
                <Cake className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-900 truncate">{b.name}</p>
                <p className="text-[11px] text-amber-700 font-medium">Birthday on {formatDate(b.date)}</p>
              </div>
            </div>
          ))}

          {stats?.celebrations?.anniversaries?.map((a, i) => (
            <div key={`a_${i}`} className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200/60">
              <div className="w-9 h-9 rounded-full bg-indigo-200 text-indigo-800 flex items-center justify-center shrink-0">
                <Award className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-900 truncate">{a.name}</p>
                <p className="text-[11px] text-indigo-700 font-medium">{a.years} Year(s) on {formatDate(a.date)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Confirmation Dialog for Punch Out */}
      <ConfirmDialog
        isOpen={punchOutConfirmOpen}
        onClose={() => setPunchOutConfirmOpen(false)}
        onConfirm={handleConfirmPunchOut}
        title="Punch Out for Today"
        message="Are you sure you want to finish and punch out for today?"
        warningMessage="This will conclude your working shift and record your total active hours."
        confirmText="Confirm Punch Out"
        variant="warning"
        loading={punchLoading}
      />
    </div>
  );
};

export default EmployeeDashboard;
