import React, { useState, useEffect, useMemo } from 'react';
import {
  FileText,
  Search,
  Filter,
  Shield,
  Clock,
  User,
  Activity,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  X
} from 'lucide-react';
import { api } from '../../services/api';
import { formatDate, formatTime } from '../../utils/formatters';
import { useAuth } from '../../context/AuthContext';
import Badge from '../../components/common/Badge';

export const AuditLogsPage = () => {
  const { user, isSuperAdmin } = useAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAction, setSelectedAction] = useState('');
  const [selectedLog, setSelectedLog] = useState(null);

  const fetchAuditLogs = async () => {
    setLoading(true);
    try {
      const data = await api.get('/settings/audit-logs');
      setLogs(data || []);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditLogs();
  }, []);

  const actionTypes = useMemo(() => {
    const set = new Set();
    logs.forEach(l => {
      if (l.action) set.add(l.action);
    });
    return Array.from(set);
  }, [logs]);

  const filteredLogs = useMemo(() => {
    return logs.filter(l => {
      if (selectedAction && l.action !== selectedAction) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const actor = (l.actor_name || '').toLowerCase();
        const target = (l.target_user_name || '').toLowerCase();
        const action = (l.action || '').toLowerCase();
        return actor.includes(q) || target.includes(q) || action.includes(q);
      }
      return true;
    });
  }, [logs, selectedAction, searchQuery]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-md tracking-wider ${
              isSuperAdmin ? 'bg-indigo-100 text-indigo-700' : 'bg-purple-100 text-purple-700'
            }`}>
              {isSuperAdmin ? 'Super Admin System Audit' : 'HR Operational Audit'}
            </span>
            <span className="text-slate-400 text-xs">•</span>
            <span className="text-xs font-semibold text-slate-500">Immutable Activity Records</span>
          </div>
          <h2 className="text-2xl font-bold text-slate-900">System & HR Audit Logs</h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Trace who performed which action, target employees, timestamp, and field changes
          </p>
        </div>

        <button
          onClick={fetchAuditLogs}
          disabled={loading}
          className="px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-2 self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Logs</span>
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by actor, target employee, or action name..."
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

        <div className="w-full md:w-56">
          <select
            value={selectedAction}
            onChange={(e) => setSelectedAction(e.target.value)}
            className="w-full p-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
          >
            <option value="">All Action Types</option>
            {actionTypes.map(act => (
              <option key={act} value={act}>{act}</option>
            ))}
          </select>
        </div>

        {(selectedAction || searchQuery) && (
          <button
            onClick={() => { setSelectedAction(''); setSearchQuery(''); }}
            className="text-xs font-semibold text-rose-600 hover:text-rose-700 px-2"
          >
            Reset
          </button>
        )}
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-xs text-slate-400">
            <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            Loading audit records...
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="py-16 text-center text-slate-400 space-y-2">
            <Activity className="w-10 h-10 mx-auto text-slate-300" />
            <p className="text-sm font-bold text-slate-700">No audit events recorded</p>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              System actions such as proxy leaves, attendance corrections, and employee modifications will be recorded here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-5">Timestamp</th>
                  <th className="py-3.5 px-4">Action</th>
                  <th className="py-3.5 px-4">Performed By (Actor)</th>
                  <th className="py-3.5 px-4">Target Employee</th>
                  <th className="py-3.5 px-4">Details Summary</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                {filteredLogs.map((log) => {
                  const isRoleAction = (log.action || '').includes('ROLE');
                  const isLeaveAction = (log.action || '').includes('LEAVE');
                  const isAttendanceAction = (log.action || '').includes('ATTENDANCE');

                  return (
                    <tr key={log.id || Math.random()} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-5 whitespace-nowrap text-slate-600">
                        <span className="font-bold text-slate-800 block">{formatDate(log.timestamp || log.createdAt)}</span>
                        <span className="text-[10px] text-slate-400 block">{formatTime(log.timestamp || log.createdAt)}</span>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className={`inline-block px-2 py-0.5 rounded-md font-bold uppercase text-[10px] tracking-wider border ${
                          isRoleAction
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : isLeaveAction
                            ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                            : isAttendanceAction
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-slate-100 text-slate-700 border-slate-200'
                        }`}>
                          {log.action}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="font-bold text-slate-900 block font-sans text-xs">{log.actor_name || 'System'}</span>
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-sans">
                          {log.actor_role?.replace('_', ' ') || 'Admin'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {log.target_user_name ? (
                          <>
                            <span className="font-bold text-slate-800 block font-sans text-xs">{log.target_user_name}</span>
                            <span className="text-[10px] text-slate-400 block font-mono">{log.target_user_id}</span>
                          </>
                        ) : (
                          <span className="text-slate-400 font-sans">--</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 max-w-md font-sans text-xs text-slate-600">
                        {log.leave_type && (
                          <span>
                            Leave: <strong>{log.leave_type}</strong> ({log.start_date} to {log.end_date}, {log.total_days} day(s))
                          </span>
                        )}
                        {log.date && log.total_working_hours !== undefined && (
                          <span>
                            Attendance date <strong>{log.date}</strong> adjusted to <strong>{log.total_working_hours} hrs</strong> ({log.status})
                          </span>
                        )}
                        {log.details && (
                          <span className="truncate block font-mono text-[10px] text-slate-500">
                            {JSON.stringify(log.details)}
                          </span>
                        )}
                        {log.previous_values && log.new_values && (
                          <span className="text-[10px] text-indigo-700 block">
                            Updated: {Object.keys(log.new_values).join(', ')}
                          </span>
                        )}
                        {!log.leave_type && !log.date && !log.details && !log.previous_values && (
                          <span className="text-slate-400">Action executed successfully</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuditLogsPage;
