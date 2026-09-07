import React, { useState, useEffect } from 'react';
import { Search, Filter, Mail, Phone, User, Users, Building2 } from 'lucide-react';
import { api } from '../../services/api';
import EmployeeProfileModal from './EmployeeProfileModal';
import Badge from '../../components/common/Badge';

export const DirectoryPage = () => {
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState(null);

  const fetchDirectory = async () => {
    setLoading(true);
    try {
      const [list, depts] = await Promise.all([
        api.getDirectory({ search, department_id: selectedDept }),
        api.getDepartments()
      ]);
      setEmployees(list || []);
      setDepartments(depts || []);
    } catch (err) {
      console.error('Failed to load directory:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDirectory();
  }, [search, selectedDept]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Company Employee Directory</h2>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Browse teammates, organizational reporting structures, and contact information
        </p>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, designation, email, or employee ID..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div className="sm:w-60">
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="">All Departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Directory Grid */}
      {loading ? (
        <div className="py-16 flex justify-center">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : employees.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200/80">
          <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-700">No employees match your criteria</p>
          <p className="text-xs text-slate-400 mt-1">Try clearing your search query or department filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {employees.map((emp) => (
            <div
              key={emp.id}
              className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3">
                    <img
                      src={emp.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${emp.name}`}
                      alt={emp.name}
                      className="w-12 h-12 rounded-2xl object-cover bg-slate-100 ring-2 ring-slate-100 group-hover:ring-indigo-100 transition-all"
                    />
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 leading-tight">{emp.name}</h4>
                      <p className="text-xs text-slate-500 mt-0.5">{emp.designation}</p>
                    </div>
                  </div>
                  <Badge variant={emp.role} size="sm">{emp.role}</Badge>
                </div>

                <div className="space-y-2 text-xs py-2 border-t border-slate-100">
                  <div className="flex items-center justify-between text-slate-600">
                    <span className="text-[11px] text-slate-400 font-medium">Department</span>
                    <span className="font-semibold text-slate-800">{emp.department_name}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-600">
                    <span className="text-[11px] text-slate-400 font-medium">Reports To</span>
                    <span className="font-semibold text-slate-800">{emp.manager_name}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-600">
                    <span className="text-[11px] text-slate-400 font-medium">Employee ID</span>
                    <span className="font-mono text-slate-700">{emp.employee_code}</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2">
                <a
                  href={`mailto:${emp.email}`}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-medium border border-slate-200/80 transition-colors"
                  title="Send Email"
                >
                  <Mail className="w-3.5 h-3.5 text-slate-500" />
                  <span>Email</span>
                </a>
                <button
                  onClick={() => setSelectedEmployee(emp)}
                  className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-semibold border border-indigo-200/60 transition-colors"
                >
                  Profile
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Employee Details Modal */}
      <EmployeeProfileModal
        employee={selectedEmployee}
        isOpen={!!selectedEmployee}
        onClose={() => setSelectedEmployee(null)}
      />
    </div>
  );
};

export default DirectoryPage;
