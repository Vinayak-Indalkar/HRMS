import { formatDate } from '../../utils/formatters';
import React, { useState, useEffect } from 'react';
import { Mail, Phone, MapPin, Calendar, UserCheck, Shield, HeartHandshake, Droplet, Building2, Target } from 'lucide-react';
import Modal from '../../components/common/Modal';
import Badge from '../../components/common/Badge';
import { api } from '../../services/api';

export const EmployeeProfileModal = ({ employee, isOpen, onClose }) => {
  const [kpis, setKpis] = useState([]);
  const [loadingKpis, setLoadingKpis] = useState(false);

  useEffect(() => {
    if (employee?.id && isOpen) {
      setLoadingKpis(true);
      api.getKpiAssignments({ employee_id: employee.id })
        .then(res => setKpis(res.data || []))
        .catch(err => console.error('Failed to load employee KPIs in modal:', err))
        .finally(() => setLoadingKpis(false));
    }
  }, [employee?.id, isOpen]);

  if (!employee) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Employee Profile" maxWidth="max-w-2xl">
      <div className="space-y-6 text-xs">
        {/* Top Header Card */}
        <div className="flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-r from-slate-900 to-indigo-950 text-white">
          <img
            src={employee.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${employee.name}`}
            alt={employee.name}
            className="w-16 h-16 rounded-2xl bg-white/10 object-cover ring-2 ring-indigo-400/40"
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-white truncate">{employee.name}</h3>
              <Badge variant={employee.status} size="sm">{employee.status}</Badge>
            </div>
            <p className="text-indigo-200 text-xs mt-0.5">{employee.designation} • {employee.department_name}</p>
            <p className="text-slate-400 text-[11px] mt-1 font-mono">Employee ID: {employee.employee_code}</p>
          </div>
        </div>

        {/* Organizational & Reporting Information */}
        <div>
          <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] mb-3 border-b border-slate-100 pb-1">
            Employment & Reporting Structure
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Department</span>
              <span className="font-semibold text-slate-800 mt-0.5 block">{employee.department_name || 'General'}</span>
            </div>
            <div className="p-3 rounded-xl bg-indigo-50/60 border border-indigo-100">
              <span className="text-[10px] uppercase font-bold text-indigo-600 block">Reporting Manager — Line 1</span>
              <span className="font-semibold text-slate-900 mt-0.5 block truncate">
                {employee.reporting_manager_line_1_name || employee.manager_name || 'None'}
              </span>
              {employee.reporting_manager_line_1_designation && (
                <span className="text-[10px] text-indigo-500 block truncate">
                  {employee.reporting_manager_line_1_designation}
                </span>
              )}
            </div>
            <div className="p-3 rounded-xl bg-sky-50/60 border border-sky-100">
              <span className="text-[10px] uppercase font-bold text-sky-600 block">Reporting Manager — Line 2</span>
              <span className="font-semibold text-slate-900 mt-0.5 block truncate">
                {employee.reporting_manager_line_2_name || 'None'}
              </span>
              {employee.reporting_manager_line_2_designation && (
                <span className="text-[10px] text-sky-500 block truncate">
                  {employee.reporting_manager_line_2_designation}
                </span>
              )}
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Date of Joining</span>
              <span className="font-semibold text-slate-800 mt-0.5 block">{employee.joining_date ? formatDate(employee.joining_date) : "N/A"}</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Employment Type</span>
              <span className="font-semibold text-slate-800 mt-0.5 block">{employee.employment_type || employee.employee_type || 'Full-time Regular'}</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">System Role</span>
              <span className="font-semibold text-slate-800 capitalize mt-0.5 block">{employee.role}</span>
            </div>
          </div>
        </div>

        {/* Contact & Personal Information */}
        <div>
          <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] mb-3 border-b border-slate-100 pb-1">
            Contact & Personal Details
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-100">
              <Mail className="w-4 h-4 text-slate-400 shrink-0" />
              <div className="min-w-0">
                <span className="text-[10px] text-slate-400 block">Work Email</span>
                <span className="font-medium text-slate-800 truncate block">{employee.email}</span>
              </div>
            </div>

            <div className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-100">
              <Phone className="w-4 h-4 text-slate-400 shrink-0" />
              <div className="min-w-0">
                <span className="text-[10px] text-slate-400 block">Phone Number</span>
                <span className="font-medium text-slate-800 truncate block">{employee.phone || 'Not listed'}</span>
              </div>
            </div>

            <div className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-100">
              <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
              <div className="min-w-0">
                <span className="text-[10px] text-slate-400 block">Residential Address</span>
                <span className="font-medium text-slate-800 truncate block">{employee.address || 'Not listed'}</span>
              </div>
            </div>

            <div className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-100">
              <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
              <div className="min-w-0">
                <span className="text-[10px] text-slate-400 block">Date of Birth</span>
                <span className="font-medium text-slate-800 truncate block">{employee.dob ? formatDate(employee.dob) : "Not listed"}</span>
              </div>
            </div>

            <div className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-100">
              <HeartHandshake className="w-4 h-4 text-slate-400 shrink-0" />
              <div className="min-w-0">
                <span className="text-[10px] text-slate-400 block">Emergency Contact</span>
                <span className="font-medium text-slate-800 truncate block">{employee.emergency_contact || 'Not listed'}</span>
              </div>
            </div>

            <div className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-100">
              <Droplet className="w-4 h-4 text-rose-400 shrink-0" />
              <div className="min-w-0">
                <span className="text-[10px] text-slate-400 block">Blood Group</span>
                <span className="font-medium text-slate-800 truncate block">{employee.blood_group || 'O+'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Leave Balances (if available) */}
        {employee.leave_balances?.length > 0 && (
          <div>
            <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] mb-3 border-b border-slate-100 pb-1">
              Leave Balances
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {employee.leave_balances.map(b => (
                <div key={b.id} className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-center">
                  <span className="text-[10px] text-slate-500 font-semibold block truncate">{b.leave_type}</span>
                  <span className="text-base font-bold text-slate-900">{b.remaining_leaves}</span>
                  <span className="text-[10px] text-slate-400 block">/ {b.total_leaves} days</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* KPI & Performance */}
        <div>
          <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] mb-3 border-b border-slate-100 pb-1 flex items-center gap-1.5">
            <Target className="w-3.5 h-3.5 text-indigo-600" />
            <span>KPI & Performance Goals</span>
          </h4>
          {loadingKpis ? (
            <p className="text-slate-400 italic">Loading performance goals...</p>
          ) : kpis.length === 0 ? (
            <p className="text-slate-400 italic">No KPIs assigned for this employee.</p>
          ) : (
            <div className="space-y-2">
              {kpis.map(k => (
                <div key={k.id} className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">{k.title}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">{k.category_name || 'General'}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Target: {k.target_value} {k.unit} &bull; Current: {k.current_value || 0} {k.unit} &bull; Weight: {k.weightage}%
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-indigo-600 text-xs">{k.achievement_pct || 0}%</span>
                    <span className="block text-[10px] text-slate-400">{k.status}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="pt-2 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-xl"
          >
            Close Profile
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default EmployeeProfileModal;
