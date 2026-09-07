import { formatDate } from '../../utils/formatters';
import React, { useState, useEffect } from 'react';
import {
  Users,
  Clock,
  CalendarCheck,
  UserX,
  ShieldCheck,
  CheckCircle,
  XCircle,
  ArrowRight,
  UserCheck
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import StatCard from '../../components/common/StatCard';
import Badge from '../../components/common/Badge';

export const ManagerDashboard = ({ onNavigate }) => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);

  const fetchStats = async () => {
    try {
      const data = await api.getDashboardStats();
      setStats(data);
    } catch (err) {
      console.error('Failed to load manager stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleReview = async (requestId, status) => {
    setActionLoading(requestId);
    try {
      await api.reviewLeave(requestId, status, `${status} by ${user.name}`);
      await fetchStats();
    } catch (err) {
      alert(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const team = stats?.teamOverview || {};

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Manager Command Center</h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Overview of team presence, approvals, and day-to-day operations
          </p>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          title="Direct Reports"
          value={team.teamSize || 0}
          subtitle="Assigned members"
          icon={Users}
          color="indigo"
          onClick={() => onNavigate('directory')}
        />
        <StatCard
          title="Working Now"
          value={team.workingNow || 0}
          subtitle="Active timers"
          icon={Clock}
          color="emerald"
          onClick={() => onNavigate('team-attendance')}
        />
        <StatCard
          title="Present Today"
          value={team.presentToday || 0}
          subtitle="Punched in"
          icon={UserCheck}
          color="blue"
          onClick={() => onNavigate('team-attendance')}
        />
        <StatCard
          title="On Leave"
          value={team.onLeaveToday || 0}
          subtitle="Approved leaves"
          icon={CalendarCheck}
          color="purple"
          onClick={() => onNavigate('leave-approvals')}
        />
        <StatCard
          title="Pending Approvals"
          value={team.pendingApprovalsCount || 0}
          subtitle="Requires review"
          icon={ShieldCheck}
          color="amber"
          onClick={() => onNavigate('leave-approvals')}
        />
      </div>

      {/* 5 Leave Types & Quota Cards */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/80 shadow-sm">
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700">Company Leave Types & Quotas</h3>
            <p className="text-xs text-slate-400">Team annual leave entitlement categories</p>
          </div>
          <button
            onClick={() => onNavigate('leave-approvals')}
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
          >
            <span>Review Requests</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-slate-800">Casual Leave (CL)</span>
                <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-800">CL</span>
              </div>
              <div className="text-xl font-extrabold text-slate-900 mt-1">6 Days</div>
              <span className="text-[11px] text-slate-400 block mt-0.5">Short planned absence</span>
            </div>
            <div className="w-full bg-slate-200 h-1.5 rounded-full mt-3 overflow-hidden">
              <div className="bg-indigo-600 h-full rounded-full w-full" />
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-slate-800">Sick Leave (SL)</span>
                <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-rose-100 text-rose-800">SL</span>
              </div>
              <div className="text-xl font-extrabold text-slate-900 mt-1">6 Days</div>
              <span className="text-[11px] text-slate-400 block mt-0.5">Medical & recovery</span>
            </div>
            <div className="w-full bg-slate-200 h-1.5 rounded-full mt-3 overflow-hidden">
              <div className="bg-rose-600 h-full rounded-full w-full" />
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-slate-800">Earned Leave (EL)</span>
                <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">EL</span>
              </div>
              <div className="text-xl font-extrabold text-slate-900 mt-1">8 Days</div>
              <span className="text-[11px] text-slate-400 block mt-0.5">Privilege / Annual paid</span>
            </div>
            <div className="w-full bg-slate-200 h-1.5 rounded-full mt-3 overflow-hidden">
              <div className="bg-emerald-600 h-full rounded-full w-full" />
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-slate-800">Leave Without Pay (LWP)</span>
                <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">LWP</span>
              </div>
              <div className="text-xl font-extrabold text-slate-900 mt-1">Flexible / Unpaid</div>
              <span className="text-[11px] text-slate-400 block mt-0.5">Unpaid personal leave</span>
            </div>
            <div className="w-full bg-slate-200 h-1.5 rounded-full mt-3 overflow-hidden">
              <div className="bg-amber-500 h-full rounded-full w-full" />
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-slate-800">Half Day Leave (HD)</span>
                <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-sky-100 text-sky-800">HD</span>
              </div>
              <div className="text-xl font-extrabold text-slate-900 mt-1">0.5 Day per session</div>
              <span className="text-[11px] text-slate-400 block mt-0.5">Morning / afternoon shift</span>
            </div>
            <div className="w-full bg-slate-200 h-1.5 rounded-full mt-3 overflow-hidden">
              <div className="bg-sky-500 h-full rounded-full w-full" />
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Pending Approvals Queue + Quick Team presence */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pending Approvals Table (2 Cols) */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-900">Pending Leave Approvals</h3>
              <p className="text-xs text-slate-500">Requests from your direct team members</p>
            </div>
            <button
              onClick={() => onNavigate('leave-approvals')}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {stats?.pendingApprovals?.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              <CheckCircle className="w-8 h-8 mx-auto text-emerald-500 mb-2 opacity-80" />
              All caught up! No pending leave approvals for your team.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase tracking-wider">
                    <th className="pb-3">Employee</th>
                    <th className="pb-3">Leave Type</th>
                    <th className="pb-3">Duration</th>
                    <th className="pb-3">Reason</th>
                    <th className="pb-3 text-right">Quick Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {stats?.pendingApprovals?.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 font-semibold text-slate-900">
                        {r.employee_name}
                        <span className="block text-[10px] font-normal text-slate-400">{r.employee_code}</span>
                      </td>
                      <td className="py-3.5 text-slate-700 font-medium">{r.leave_type}</td>
                      <td className="py-3.5 text-slate-600">
                        {formatDate(r.start_date)} <span className="text-slate-400">to</span> {formatDate(r.end_date)}
                        <span className="block text-[10px] text-slate-400 font-medium">({r.total_days} days)</span>
                      </td>
                      <td className="py-3.5 text-slate-600 max-w-[160px] truncate" title={r.reason}>
                        {r.reason}
                      </td>
                      <td className="py-3.5 text-right space-x-1.5 whitespace-nowrap">
                        <button
                          onClick={() => handleReview(r.id, 'Approved')}
                          disabled={actionLoading === r.id}
                          className="px-2.5 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-lg font-semibold transition-colors disabled:opacity-50"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleReview(r.id, 'Rejected')}
                          disabled={actionLoading === r.id}
                          className="px-2.5 py-1.5 bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 rounded-lg font-semibold transition-colors disabled:opacity-50"
                        >
                          Reject
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Upcoming Announcements & Holidays (1 Col) */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 mb-3">Company Notices</h3>
            <div className="space-y-3">
              {stats?.recentAnnouncements?.slice(0, 2).map((a) => (
                <div key={a.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <h4 className="text-xs font-bold text-slate-800">{a.title}</h4>
                  <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">{a.description}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 mb-3">Upcoming Holidays</h3>
            <div className="space-y-2">
              {stats?.upcomingHolidays?.slice(0, 3).map((h) => (
                <div key={h.id} className="flex items-center justify-between text-xs p-2.5 rounded-lg bg-slate-50">
                  <span className="font-semibold text-slate-800">{h.name}</span>
                  <span className="text-slate-500">{formatDate(h.date)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManagerDashboard;
