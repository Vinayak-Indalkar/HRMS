import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  Search,
  Mail,
  Phone,
  Shield,
  CalendarCheck,
  CalendarPlus,
  Briefcase,
  UserCheck,
  Eye,
  AlertCircle
} from 'lucide-react';
import { api } from '../../services/api';
import Badge from '../../components/common/Badge';
import EmployeeProfileModal from './EmployeeProfileModal';

export const MyTeamPage = ({ onNavigate }) => {
  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState(null);

  const fetchTeam = async () => {
    setLoading(true);
    try {
      const members = await api.getTeamMembers();
      setTeamMembers(members || []);
    } catch (err) {
      console.error('Failed to load team members:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeam();
  }, []);

  const filteredMembers = useMemo(() => {
    if (!search.trim()) return teamMembers;
    const q = search.toLowerCase().trim();
    return teamMembers.filter(m =>
      (m.name || '').toLowerCase().includes(q) ||
      (m.employee_code || '').toLowerCase().includes(q) ||
      (m.designation || '').toLowerCase().includes(q) ||
      (m.email || '').toLowerCase().includes(q)
    );
  }, [teamMembers, search]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-md bg-indigo-100 text-indigo-700 tracking-wider">
              L2 Manager View
            </span>
            <span className="text-slate-400 text-xs">•</span>
            <span className="text-xs font-semibold text-slate-500">Workforce & Approvals</span>
          </div>
          <h2 className="text-2xl font-bold text-slate-900">My Team Roster</h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Direct team members reporting to you as their assigned L2 Manager
          </p>
        </div>
      </div>

      {/* Search & Stats Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search team members by name, code, designation, or email..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 shrink-0">
          <Users className="w-4 h-4 text-indigo-600" />
          <span>{filteredMembers.length} {filteredMembers.length === 1 ? 'Member' : 'Members'} Assigned (L2)</span>
        </div>
      </div>

      {/* Team Grid */}
      {loading ? (
        <div className="py-24 text-center text-xs text-slate-400">
          <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          Loading your team members...
        </div>
      ) : filteredMembers.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-3xl border border-slate-200 p-8">
          <Shield className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">No Team Members Found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            {search.trim()
              ? 'No team members match your current search query.'
              : 'You do not currently have any employees assigned to you as their L2 Manager. Line 2 managers can be configured in the Employee Management module.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMembers.map((member) => (
            <div
              key={member.id}
              className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md hover:border-slate-300 transition-all flex flex-col justify-between"
            >
              <div>
                {/* Member Header */}
                <div className="flex items-start gap-3.5 mb-3.5">
                  <img
                    src={member.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${member.name}`}
                    alt={member.name}
                    className="w-12 h-12 rounded-xl object-cover ring-1 ring-slate-200 bg-slate-100 shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1.5">
                      <h4 className="text-sm font-bold text-slate-900 truncate">{member.name}</h4>
                      <span className="px-1.5 py-0.5 text-[9px] font-extrabold uppercase rounded bg-indigo-50 text-indigo-700 border border-indigo-200 shrink-0">
                        L2 Report
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 truncate mt-0.5">{member.designation || 'Employee'}</p>
                    <span className="text-[10px] text-slate-400 font-mono block mt-0.5">{member.employee_code}</span>
                  </div>
                </div>

                {/* Info Rows */}
                <div className="space-y-2 py-3 border-y border-slate-100 text-xs">
                  <div className="flex items-center gap-2 text-slate-600 truncate">
                    <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{member.email}</span>
                  </div>
                  {member.phone && (
                    <div className="flex items-center gap-2 text-slate-600 truncate">
                      <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{member.phone}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                    <span className="text-slate-400">Reporting Assignment:</span>
                    <span className="font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                      You are L2 Manager
                    </span>
                  </div>
                </div>
              </div>

              {/* Card Actions */}
              <div className="pt-4 mt-1 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedEmployee(member)}
                  className="flex-1 py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-1.5"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Profile</span>
                </button>
                {onNavigate && (
                  <button
                    type="button"
                    onClick={() => onNavigate('team-leave-calendar')}
                    className="flex-1 py-2 px-3 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-semibold rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5"
                  >
                    <CalendarPlus className="w-3.5 h-3.5" />
                    <span>Apply Leave</span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Employee Profile Details Modal */}
      {selectedEmployee && (
        <EmployeeProfileModal
          employee={selectedEmployee}
          isOpen={!!selectedEmployee}
          onClose={() => setSelectedEmployee(null)}
        />
      )}
    </div>
  );
};

export default MyTeamPage;
