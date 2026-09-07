import { formatDate, formatTime } from '../../utils/formatters';
import React, { useState, useEffect } from 'react';
import {
  Clock,
  CalendarDays,
  CalendarCheck,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  UserCheck,
  Sparkles,
  ArrowRight,
  Shield,
  Building2,
  Plus
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import PunchCard from '../../components/common/PunchCard';
import Badge from '../../components/common/Badge';
import MyAttendancePage from '../attendance/MyAttendancePage';
import MyLeavePage from '../leave/MyLeavePage';

export const MyCornerPage = ({ onNavigate }) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'attendance' | 'leaves'
  const [todayAtt, setTodayAtt] = useState(null);
  const [leaveBalances, setLeaveBalances] = useState([]);
  const [myLeaves, setMyLeaves] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadPersonalData = async () => {
    try {
      const [today, balances, leaves] = await Promise.all([
        api.getTodayAttendance().catch(() => null),
        api.getLeaveBalances().catch(() => []),
        api.getMyLeaves().catch(() => [])
      ]);
      setTodayAtt(today);
      setLeaveBalances(balances || []);
      setMyLeaves(leaves || []);
    } catch (err) {
      console.error('Failed to load My Corner data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPersonalData();
  }, []);

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 text-white shadow-xl border border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="relative">
              <img
                src={user?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.name || 'HR'}`}
                alt={user?.name}
                className="w-16 h-16 rounded-2xl object-cover ring-4 ring-indigo-500/30 shadow-lg bg-slate-800"
              />
              <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-slate-900 rounded-full" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 tracking-wider">
                  Employee Self-Service
                </span>
                <span className="text-xs text-slate-400">
                  {user?.employee_code}
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-white mt-1">
                My Corner — {user?.name}
              </h1>
              <p className="text-xs text-slate-300 mt-0.5">
                Maintain personal attendance, live punch in/out, and personal leave requests as an employee of Quantira.
              </p>
            </div>
          </div>

          {/* Quick Tab Switcher */}
          <div className="flex items-center p-1.5 bg-slate-800/80 rounded-2xl border border-slate-700/60 self-start md:self-auto">
            <button
              onClick={() => setActiveTab('overview')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'overview'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Overview & Punch</span>
            </button>
            <button
              onClick={() => setActiveTab('attendance')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'attendance'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <CalendarDays className="w-3.5 h-3.5" />
              <span>My Attendance</span>
            </button>
            <button
              onClick={() => setActiveTab('leaves')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'leaves'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <CalendarCheck className="w-3.5 h-3.5" />
              <span>My Leaves</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tab 1: Overview & Punch In/Out */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Live Punch Card Widget */}
          <PunchCard onStatusChange={loadPersonalData} />

          {/* Quick Leave Quota Cards */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-800">My Leave Quotas & Balances</h3>
                <p className="text-xs text-slate-400">Available annual leave allocations for personal requests</p>
              </div>
              <button
                onClick={() => setActiveTab('leaves')}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
              >
                <span>Apply or View All</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {leaveBalances.map((b) => (
                <div key={b.id || b.leave_type} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-slate-700 truncate">{b.leave_type.split(' ')[0]}</span>
                    <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-800">
                      {b.code || b.leave_type.match(/\((.*?)\)/)?.[1] || 'LV'}
                    </span>
                  </div>
                  <div className="text-xl font-bold text-slate-900 mt-1">
                    {b.remaining_leaves ?? b.total_leaves ?? 0}
                    <span className="text-[10px] text-slate-400 font-normal ml-1">/ {b.total_leaves} days</span>
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    Used: {b.used_leaves || 0} days
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Personal Leave Requests */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-800">My Recent Leave Applications</h3>
                <p className="text-xs text-slate-400">Status of your personal leave submissions</p>
              </div>
              <button
                onClick={() => setActiveTab('leaves')}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
              >
                <span>Full Leave Portal</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {myLeaves.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                No leave requests submitted yet. Click "My Leaves" to submit an application.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase tracking-wider">
                      <th className="pb-2.5">Leave Type</th>
                      <th className="pb-2.5">Date Range</th>
                      <th className="pb-2.5">Duration</th>
                      <th className="pb-2.5">Reason</th>
                      <th className="pb-2.5 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {myLeaves.slice(0, 4).map((r) => (
                      <tr key={r.id} className="hover:bg-slate-50/70">
                        <td className="py-2.5 font-semibold text-slate-800">{r.leave_type}</td>
                        <td className="py-2.5 text-slate-600">
                          {formatDate(r.start_date)} to {formatDate(r.end_date)}
                        </td>
                        <td className="py-2.5 font-medium text-slate-700">{r.total_days || 1} days</td>
                        <td className="py-2.5 text-slate-500 max-w-[200px] truncate" title={r.reason}>
                          {r.reason}
                        </td>
                        <td className="py-2.5 text-right">
                          <Badge
                            variant={
                              r.status === 'Approved'
                                ? 'success'
                                : r.status === 'Rejected'
                                ? 'danger'
                                : 'warning'
                            }
                          >
                            {r.status}
                          </Badge>
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

      {/* Tab 2: My Attendance Calendar */}
      {activeTab === 'attendance' && (
        <div className="animate-in fade-in">
          <MyAttendancePage />
        </div>
      )}

      {/* Tab 3: My Leaves Portal */}
      {activeTab === 'leaves' && (
        <div className="animate-in fade-in">
          <MyLeavePage />
        </div>
      )}
    </div>
  );
};

export default MyCornerPage;
