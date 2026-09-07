import { formatDate } from '../../utils/formatters';
import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  Clock,
  CalendarCheck,
  Building2,
  TrendingUp,
  CheckCircle,
  XCircle,
  ArrowRight,
  AlertCircle,
  Search
} from 'lucide-react';
import { api } from '../../services/api';
import StatCard from '../../components/common/StatCard';
import Badge from '../../components/common/Badge';
import Modal from '../../components/common/Modal';

export const AdminDashboard = ({ onNavigate }) => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [activeCategoryModal, setActiveCategoryModal] = useState(null);
  const [modalSearch, setModalSearch] = useState('');

  const fetchStats = async () => {
    try {
      const data = await api.getDashboardStats();
      setStats(data);
    } catch (err) {
      console.error('Failed to load admin stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleReview = async (id, status) => {
    setActionLoading(id);
    try {
      await api.reviewLeave(id, status, `${status} by HR Admin`);
      await fetchStats();
    } catch (err) {
      alert(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const getCategoryModalMeta = () => {
    switch (activeCategoryModal) {
      case 'headcount':
        return {
          title: `Headcount — Active Workforce (${stats?.overviewLists?.headcount?.length || 0})`,
          subtitle: 'All active employees across departments and branches',
          icon: Users,
          list: stats?.overviewLists?.headcount || [],
          viewAllPage: 'employee-management',
          viewAllText: 'Open Employee Directory'
        };
      case 'presentToday':
        return {
          title: `Present Today — Checked In (${stats?.overviewLists?.presentToday?.length || 0})`,
          subtitle: 'Employees who have logged attendance for today',
          icon: CheckCircle,
          list: stats?.overviewLists?.presentToday || [],
          viewAllPage: 'admin-attendance',
          viewAllText: 'View All Attendance'
        };
      case 'workingNow':
        return {
          title: `Working Now — Active Timers (${stats?.overviewLists?.workingNow?.length || 0})`,
          subtitle: 'Employees currently clocked in with open work sessions',
          icon: Clock,
          list: stats?.overviewLists?.workingNow || [],
          viewAllPage: 'admin-attendance',
          viewAllText: 'View Live Attendance'
        };
      case 'absent':
        return {
          title: `Absent Today (${stats?.overviewLists?.absent?.length || 0})`,
          subtitle: 'Active employees not punched in and not on approved leave',
          icon: AlertCircle,
          list: stats?.overviewLists?.absent || [],
          viewAllPage: 'admin-attendance',
          viewAllText: 'Attendance Overview'
        };
      case 'onLeave':
        return {
          title: `On Leave Today (${stats?.overviewLists?.onLeave?.length || 0})`,
          subtitle: 'Employees with approved leave covering today',
          icon: CalendarCheck,
          list: stats?.overviewLists?.onLeave || [],
          viewAllPage: 'admin-leaves',
          viewAllText: 'Leave Management'
        };
      case 'pendingLeaves':
        return {
          title: `Pending Leave Requests (${stats?.overviewLists?.pendingLeaves?.length || 0})`,
          subtitle: 'Leave applications requiring management and HR review',
          icon: TrendingUp,
          list: stats?.overviewLists?.pendingLeaves || [],
          viewAllPage: 'admin-leaves',
          viewAllText: 'Leave Approvals Queue'
        };
      default:
        return null;
    }
  };

  const currentModalMeta = getCategoryModalMeta();

  const filteredModalList = useMemo(() => {
    if (!currentModalMeta || !currentModalMeta.list) return [];
    if (!modalSearch.trim()) return currentModalMeta.list;
    const q = modalSearch.toLowerCase().trim();
    return currentModalMeta.list.filter((emp) =>
      (emp.name && emp.name.toLowerCase().includes(q)) ||
      (emp.employee_code && emp.employee_code.toLowerCase().includes(q)) ||
      (emp.department && emp.department.toLowerCase().includes(q)) ||
      (emp.designation && emp.designation.toLowerCase().includes(q)) ||
      (emp.email && emp.email.toLowerCase().includes(q)) ||
      (emp.leave_type && emp.leave_type.toLowerCase().includes(q))
    );
  }, [currentModalMeta, modalSearch]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const overview = stats?.overview || {};
  const charts = stats?.charts || {};

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Organization Overview</h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Real-time workforce intelligence, company attendance, and pending requests
          </p>
        </div>
      </div>

      {/* Primary KPI Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 sm:gap-4">
        <StatCard
          title="Headcount"
          value={overview.totalEmployees || 0}
          subtitle="Click to view list"
          icon={Users}
          color="indigo"
          onClick={() => { setActiveCategoryModal('headcount'); setModalSearch(''); }}
        />
        <StatCard
          title="Present Today"
          value={overview.presentToday || 0}
          subtitle="Click to view list"
          icon={CheckCircle}
          color="emerald"
          onClick={() => { setActiveCategoryModal('presentToday'); setModalSearch(''); }}
        />
        <StatCard
          title="Working Now"
          value={overview.workingNow || 0}
          subtitle="Click to view list"
          icon={Clock}
          color="blue"
          onClick={() => { setActiveCategoryModal('workingNow'); setModalSearch(''); }}
        />
        <StatCard
          title="Absent"
          value={overview.absentToday || 0}
          subtitle="Click to view list"
          icon={AlertCircle}
          color="rose"
          onClick={() => { setActiveCategoryModal('absent'); setModalSearch(''); }}
        />
        <StatCard
          title="On Leave"
          value={overview.onLeaveToday || 0}
          subtitle="Click to view list"
          icon={CalendarCheck}
          color="purple"
          onClick={() => { setActiveCategoryModal('onLeave'); setModalSearch(''); }}
        />
        <StatCard
          title="Pending Leaves"
          value={overview.pendingLeavesCount || 0}
          subtitle="Click to review list"
          icon={TrendingUp}
          color="amber"
          onClick={() => { setActiveCategoryModal('pendingLeaves'); setModalSearch(''); }}
        />
      </div>

      {/* Company Leave Quotas & Policy Summary */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/80 shadow-sm">
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700">Company Leave Types & Quotas</h3>
            <p className="text-xs text-slate-400">Standard employee annual allocations and category rules</p>
          </div>
          <button
            onClick={() => onNavigate('admin-leaves')}
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
          >
            <span>Manage Leave Queue</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-slate-800">Casual Leave</span>
              <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-800">CL</span>
            </div>
            <div className="text-xl font-extrabold text-slate-900 mt-1">6 Days</div>
            <span className="text-[11px] text-slate-400 block mt-0.5">Short planned absence</span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-slate-800">Sick Leave</span>
              <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-rose-100 text-rose-800">SL</span>
            </div>
            <div className="text-xl font-extrabold text-slate-900 mt-1">6 Days</div>
            <span className="text-[11px] text-slate-400 block mt-0.5">Medical & recovery</span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-slate-800">Earned Leave</span>
              <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">EL</span>
            </div>
            <div className="text-xl font-extrabold text-slate-900 mt-1">8 Days</div>
            <span className="text-[11px] text-slate-400 block mt-0.5">Privilege / Annual paid</span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-slate-800">Leave Without Pay</span>
              <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">LWP</span>
            </div>
            <div className="text-xl font-extrabold text-slate-900 mt-1">Flexible</div>
            <span className="text-[11px] text-slate-400 block mt-0.5">Unpaid personal leave</span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-slate-800">Half Day Leave</span>
              <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-sky-100 text-sky-800">HD</span>
            </div>
            <div className="text-xl font-extrabold text-slate-900 mt-1">0.5 Day / session</div>
            <span className="text-[11px] text-slate-400 block mt-0.5">Morning / afternoon shift</span>
          </div>
        </div>
      </div>

      {/* Visual Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Department Distribution (Horizontal bar chart) */}
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/80 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 mb-1">Department Headcount</h3>
          <p className="text-xs text-slate-400 mb-4">Distribution across organizational teams</p>
          <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
            {charts?.deptDistribution?.map((dept) => {
              const total = overview.totalEmployees || 1;
              const pct = Math.round((dept.count / total) * 100);
              return (
                <div key={dept.name}>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className="text-slate-700">{dept.name}</span>
                    <span className="text-slate-500">{dept.count} ({pct}%)</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-indigo-600 h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.max(8, pct)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Attendance Trend Chart */}
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/80 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 mb-1">Recent Daily Attendance</h3>
          <p className="text-xs text-slate-400 mb-4">Daily present employee trends</p>

          <div className="h-44 flex items-end justify-between gap-3 pt-4 border-b border-slate-100 pb-2">
            {charts?.attendanceTrend?.map((t) => {
              const maxVal = overview.totalEmployees || 15;
              const heightPct = Math.round((t.present / maxVal) * 100);
              return (
                <div key={t.date} className="flex-1 flex flex-col items-center gap-2 group">
                  <span className="text-[10px] font-bold text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity">
                    {t.present}
                  </span>
                  <div className="w-full bg-indigo-50 rounded-t-lg h-32 flex items-end justify-center p-1">
                    <div
                      className="w-full bg-gradient-to-t from-indigo-600 to-indigo-400 rounded-md transition-all duration-500 group-hover:brightness-110"
                      style={{ height: `${Math.max(15, heightPct)}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-semibold text-slate-500 truncate w-full text-center">
                    {formatDate(t.date)}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="flex justify-between items-center mt-3 text-xs text-slate-500">
            <span>Avg Attendance: 92%</span>
            <span className="text-emerald-600 font-semibold">Healthy Range</span>
          </div>
        </div>

        {/* Leave Requests by Type */}
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/80 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 mb-1">Leave Request Analytics</h3>
          <p className="text-xs text-slate-400 mb-4">Breakdown by leave category</p>
          <div className="space-y-3">
            {charts?.leaveDistribution?.map((lt) => {
              const maxReq = Math.max(1, ...charts.leaveDistribution.map(x => x.count));
              const pct = Math.round((lt.count / maxReq) * 100);
              return (
                <div key={lt.type}>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className="text-slate-700">{lt.type}</span>
                    <span className="text-slate-500">{lt.count} requests</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-purple-600 h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.max(10, pct)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Pending Leave Requests Table */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/80 shadow-sm">
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-900">Company-wide Leave Approval Queue</h3>
            <p className="text-xs text-slate-500">Review, approve, or override pending leave applications</p>
          </div>
          <button
            onClick={() => onNavigate('admin-leaves')}
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
          >
            <span>Full Leave Manager</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {stats?.pendingLeaves?.length === 0 ? (
          <div className="py-10 text-center text-xs text-slate-400">
            <CheckCircle className="w-8 h-8 mx-auto text-emerald-500 mb-2 opacity-80" />
            No pending leave requests in the queue.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase tracking-wider">
                  <th className="pb-3">Employee</th>
                  <th className="pb-3">Leave Type</th>
                  <th className="pb-3">Date Range</th>
                  <th className="pb-3">Reason</th>
                  <th className="pb-3 text-right">HR Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {stats?.pendingLeaves?.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 font-semibold text-slate-900">
                      {r.employee_name}
                      <span className="block text-[10px] font-normal text-slate-400">{r.employee_code}</span>
                    </td>
                    <td className="py-3 text-slate-700 font-medium">{r.leave_type}</td>
                    <td className="py-3 text-slate-600">
                      {formatDate(r.start_date)} <span className="text-slate-400">to</span> {formatDate(r.end_date)}
                      <span className="block text-[10px] text-slate-400 font-medium">({r.total_days} days)</span>
                    </td>
                    <td className="py-3 text-slate-600 max-w-[200px] truncate" title={r.reason}>
                      {r.reason}
                    </td>
                    <td className="py-3 text-right space-x-1.5 whitespace-nowrap">
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

      {/* Employee List Category Modal */}
      {activeCategoryModal && currentModalMeta && (
        <Modal
          isOpen={!!activeCategoryModal}
          onClose={() => setActiveCategoryModal(null)}
          title={currentModalMeta.title}
          size="xl"
        >
          <div className="space-y-4">
            {/* Search and Navigation Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pb-3 border-b border-slate-100">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={modalSearch}
                  onChange={(e) => setModalSearch(e.target.value)}
                  placeholder="Search by name, employee code, department, designation..."
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white"
                />
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => {
                    const target = currentModalMeta.viewAllPage;
                    setActiveCategoryModal(null);
                    onNavigate(target);
                  }}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 px-3 py-2 bg-indigo-50 hover:bg-indigo-100/70 rounded-xl transition-colors"
                >
                  <span>{currentModalMeta.viewAllText}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Employee List Table */}
            {filteredModalList.length === 0 ? (
              <div className="py-12 text-center">
                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
                  <Users className="w-6 h-6" />
                </div>
                <p className="text-sm font-semibold text-slate-700">No employees found</p>
                <p className="text-xs text-slate-400 mt-1">
                  {modalSearch ? 'No records matching your search query.' : 'There are currently no records in this category.'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-100">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200/80">
                      <th className="py-2.5 px-3">Employee</th>
                      <th className="py-2.5 px-3">Department & Role</th>

                      {activeCategoryModal === 'headcount' && <th className="py-2.5 px-3">Contact</th>}
                      {activeCategoryModal === 'headcount' && <th className="py-2.5 px-3 text-right">Status</th>}

                      {activeCategoryModal === 'presentToday' && <th className="py-2.5 px-3">In / Out</th>}
                      {activeCategoryModal === 'presentToday' && <th className="py-2.5 px-3">Hours</th>}
                      {activeCategoryModal === 'presentToday' && <th className="py-2.5 px-3 text-right">Status</th>}

                      {activeCategoryModal === 'workingNow' && <th className="py-2.5 px-3">Clocked In At</th>}
                      {activeCategoryModal === 'workingNow' && <th className="py-2.5 px-3 text-right">Timer Status</th>}

                      {activeCategoryModal === 'absent' && <th className="py-2.5 px-3">Contact</th>}
                      {activeCategoryModal === 'absent' && <th className="py-2.5 px-3 text-right">Attendance</th>}

                      {activeCategoryModal === 'onLeave' && <th className="py-2.5 px-3">Leave Type</th>}
                      {activeCategoryModal === 'onLeave' && <th className="py-2.5 px-3">Duration</th>}
                      {activeCategoryModal === 'onLeave' && <th className="py-2.5 px-3 text-right">Reason</th>}

                      {activeCategoryModal === 'pendingLeaves' && <th className="py-2.5 px-3">Leave Type</th>}
                      {activeCategoryModal === 'pendingLeaves' && <th className="py-2.5 px-3">Dates</th>}
                      {activeCategoryModal === 'pendingLeaves' && <th className="py-2.5 px-3">Reason</th>}
                      {activeCategoryModal === 'pendingLeaves' && <th className="py-2.5 px-3 text-right">Action</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredModalList.map((item, idx) => (
                      <tr key={item.id || item.leave_id || idx} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <img
                              src={item.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${item.name}`}
                              alt={item.name}
                              className="w-7 h-7 rounded-full bg-slate-100 object-cover border border-slate-200 shrink-0"
                            />
                            <div className="min-w-0">
                              <div className="font-bold text-slate-900 truncate text-xs">{item.name}</div>
                              <div className="text-[10px] text-slate-400 truncate">{item.employee_code}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="font-semibold text-slate-800 text-xs truncate">{item.department}</div>
                          <div className="text-[10px] text-slate-500 truncate">{item.designation}</div>
                        </td>

                        {/* Headcount */}
                        {activeCategoryModal === 'headcount' && (
                          <td className="py-2.5 px-3 text-[11px] text-slate-600">
                            <div className="truncate">{item.email}</div>
                            <div className="text-[10px] text-slate-400">{item.phone}</div>
                          </td>
                        )}
                        {activeCategoryModal === 'headcount' && (
                          <td className="py-2.5 px-3 text-right">
                            <Badge variant="success">Active</Badge>
                          </td>
                        )}

                        {/* Present Today */}
                        {activeCategoryModal === 'presentToday' && (
                          <td className="py-2.5 px-3 text-xs">
                            <div className="text-slate-800 font-semibold">
                              In: {item.punch_in ? new Date(item.punch_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--'}
                            </div>
                            <div className="text-[10px] text-slate-500">
                              Out: {item.punch_out ? new Date(item.punch_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : (item.status === 'Working' ? 'Active' : '--')}
                            </div>
                          </td>
                        )}
                        {activeCategoryModal === 'presentToday' && (
                          <td className="py-2.5 px-3 text-xs font-semibold text-slate-700">
                            {Number(item.total_hours || 0).toFixed(1)} hrs
                          </td>
                        )}
                        {activeCategoryModal === 'presentToday' && (
                          <td className="py-2.5 px-3 text-right">
                            <Badge variant={item.status === 'Working' ? 'primary' : 'success'}>
                              {item.status || 'Present'}
                            </Badge>
                          </td>
                        )}

                        {/* Working Now */}
                        {activeCategoryModal === 'workingNow' && (
                          <td className="py-2.5 px-3 text-xs font-semibold text-slate-800">
                            {item.punch_in ? new Date(item.punch_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--'}
                            <div className="text-[10px] text-slate-400 font-normal">
                              {Number(item.total_hours || 0).toFixed(1)} hrs logged
                            </div>
                          </td>
                        )}
                        {activeCategoryModal === 'workingNow' && (
                          <td className="py-2.5 px-3 text-right">
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              Clocked In
                            </span>
                          </td>
                        )}

                        {/* Absent */}
                        {activeCategoryModal === 'absent' && (
                          <td className="py-2.5 px-3 text-[11px] text-slate-600">
                            <div className="truncate">{item.email}</div>
                            <div className="text-[10px] text-slate-400">{item.phone}</div>
                          </td>
                        )}
                        {activeCategoryModal === 'absent' && (
                          <td className="py-2.5 px-3 text-right">
                            <Badge variant="danger">Absent Today</Badge>
                          </td>
                        )}

                        {/* On Leave */}
                        {activeCategoryModal === 'onLeave' && (
                          <td className="py-2.5 px-3">
                            <Badge variant="purple">{item.leave_type}</Badge>
                          </td>
                        )}
                        {activeCategoryModal === 'onLeave' && (
                          <td className="py-2.5 px-3 text-xs text-slate-700">
                            <div>{formatDate(item.start_date)} to {formatDate(item.end_date)}</div>
                            <span className="text-[10px] text-slate-400 font-medium">({item.days_count} days)</span>
                          </td>
                        )}
                        {activeCategoryModal === 'onLeave' && (
                          <td className="py-2.5 px-3 text-right text-xs text-slate-500 max-w-[160px] truncate" title={item.reason}>
                            {item.reason || 'Approved Leave'}
                          </td>
                        )}

                        {/* Pending Leaves */}
                        {activeCategoryModal === 'pendingLeaves' && (
                          <td className="py-2.5 px-3">
                            <Badge variant="warning">{item.leave_type}</Badge>
                          </td>
                        )}
                        {activeCategoryModal === 'pendingLeaves' && (
                          <td className="py-2.5 px-3 text-xs text-slate-700">
                            <div>{formatDate(item.start_date)} to {formatDate(item.end_date)}</div>
                            <span className="text-[10px] text-slate-400 font-medium">({item.days_count} days)</span>
                          </td>
                        )}
                        {activeCategoryModal === 'pendingLeaves' && (
                          <td className="py-2.5 px-3 text-xs text-slate-500 max-w-[160px] truncate" title={item.reason}>
                            {item.reason || 'N/A'}
                          </td>
                        )}
                        {activeCategoryModal === 'pendingLeaves' && (
                          <td className="py-2.5 px-3 text-right space-x-1 whitespace-nowrap">
                            <button
                              onClick={async () => {
                                await handleReview(item.leave_id, 'Approved');
                              }}
                              disabled={actionLoading === item.leave_id}
                              className="px-2 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-md font-semibold text-[11px] disabled:opacity-50"
                            >
                              Approve
                            </button>
                            <button
                              onClick={async () => {
                                await handleReview(item.leave_id, 'Rejected');
                              }}
                              disabled={actionLoading === item.leave_id}
                              className="px-2 py-1 bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 rounded-md font-semibold text-[11px] disabled:opacity-50"
                            >
                              Reject
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Footer Info */}
            <div className="pt-2 flex items-center justify-between text-xs text-slate-400 border-t border-slate-100">
              <span>Showing {filteredModalList.length} of {currentModalMeta.list.length} records</span>
              <button
                type="button"
                onClick={() => setActiveCategoryModal(null)}
                className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default AdminDashboard;
