import { formatTime, formatDate } from '../../utils/formatters';
import React, { useState, useEffect } from 'react';
import { Calendar, Users, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { api } from '../../services/api';
import Badge from '../../components/common/Badge';
import StatCard from '../../components/common/StatCard';

export const TeamAttendancePage = () => {
  const [date, setDate] = useState('2026-09-04');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchTeamAttendance = async (selectedDate) => {
    setLoading(true);
    try {
      const res = await api.getTeamAttendance(selectedDate);
      setData(res);
    } catch (err) {
      console.error('Failed to load team attendance:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeamAttendance(date);
  }, [date]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Team Attendance</h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Monitor daily attendance, active work hours, and punch records of team members
          </p>
        </div>

        {/* Date Picker */}
        <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm">
          <Calendar className="w-4 h-4 text-slate-400" />
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="text-xs font-semibold text-slate-700 bg-transparent focus:outline-none"
          />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Team Members"
          value={data?.teamSize || 0}
          subtitle="Assigned direct reports"
          icon={Users}
          color="indigo"
        />
        <StatCard
          title="Working Now"
          value={data?.workingCount || 0}
          subtitle="Active shift timers"
          icon={Clock}
          color="emerald"
        />
        <StatCard
          title="Present Today"
          value={data?.presentCount || 0}
          subtitle="Completed full shifts"
          icon={CheckCircle}
          color="blue"
        />
        <StatCard
          title="Not Punched In"
          value={data?.absentCount || 0}
          subtitle="No records yet"
          icon={AlertCircle}
          color="amber"
        />
      </div>

      {/* Team Roster Table */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm">
        <h3 className="text-base font-bold text-slate-900 mb-4">
          Team Roster for {formatDate(date)}
        </h3>

        {loading ? (
          <div className="py-12 flex justify-center">
            <div className="w-7 h-7 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : data?.members?.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400">
            No team members found for this manager.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase tracking-wider">
                  <th className="pb-3">Team Member</th>
                  <th className="pb-3">Designation</th>
                  <th className="pb-3">Punch In</th>
                  <th className="pb-3">Punch Out</th>
                  <th className="pb-3">Working Hours</th>
                  <th className="pb-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data?.members?.map((m) => (
                  <tr key={m.user_id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 flex items-center gap-3">
                      <img
                        src={m.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${m.name}`}
                        alt={m.name}
                        className="w-8 h-8 rounded-full bg-slate-100 object-cover"
                      />
                      <div>
                        <span className="font-bold text-slate-900 block">{m.name}</span>
                        <span className="text-[10px] text-slate-400">{m.employee_code}</span>
                      </div>
                    </td>
                    <td className="py-3.5 text-slate-600 font-medium">{m.designation}</td>
                    <td className="py-3.5 font-mono text-slate-600">
                      {formatTime(m.punch_in)}
                    </td>
                    <td className="py-3.5 font-mono text-slate-600">
                      {formatTime(m.punch_out)}
                    </td>
                    <td className="py-3.5 font-semibold text-slate-800">
                      {m.total_working_hours ? `${m.total_working_hours} hrs` : m.status === 'Working' ? 'In Progress' : '--'}
                    </td>
                    <td className="py-3.5 text-right">
                      <Badge variant={m.status}>{m.status}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default TeamAttendancePage;
