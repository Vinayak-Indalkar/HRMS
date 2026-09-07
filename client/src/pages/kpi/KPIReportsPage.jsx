import React, { useState, useEffect } from 'react';
import { 
  ChartNoAxesCombined, Download, Search, Building2, 
  Users, Target, Award, CheckCircle2, Filter, RefreshCw,
  TrendingUp, AlertTriangle, ArrowUpDown
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getKpiPeriods, getKpiReportsSummary } from '../../services/api';

export default function KPIReportsPage() {
  const { user } = useAuth();
  const [periods, setPeriods] = useState([]);
  const [selectedPeriodId, setSelectedPeriodId] = useState('');
  const [activeTab, setActiveTab] = useState('employee'); // 'employee', 'department', 'kpi'
  const [reportData, setReportData] = useState({
    employee_summary: [],
    department_summary: [],
    kpi_summary: []
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDept, setSelectedDept] = useState('All');

  useEffect(() => {
    loadPeriods();
  }, []);

  useEffect(() => {
    if (selectedPeriodId) {
      loadReport(selectedPeriodId);
    }
  }, [selectedPeriodId]);

  const loadPeriods = async () => {
    try {
      const res = await getKpiPeriods();
      const pList = Array.isArray(res) ? res : (res?.data || []);
      setPeriods(pList);
      const active = pList.find(p => p.status === 'Active') || pList[0];
      if (active) setSelectedPeriodId(active.id);
    } catch (err) {
      console.error('Failed to load periods:', err);
    }
  };

  const loadReport = async (periodId) => {
    setLoading(true);
    try {
      const res = await getKpiReportsSummary({ period_id: periodId });
      setReportData(res?.employee_summary ? res : (res?.data || { employee_summary: [], department_summary: [], kpi_summary: [] }));
    } catch (err) {
      console.error('Failed to load report:', err);
    } finally {
      setLoading(false);
    }
  };

  // CSV Export handler
  const handleExportCSV = () => {
    let headers = [];
    let rows = [];
    let filename = `kpi_report_${activeTab}_${selectedPeriodId}.csv`;

    if (activeTab === 'employee') {
      headers = ['Employee ID', 'Employee Name', 'Department', 'Designation', 'Total KPIs', 'Completed KPIs', 'Avg Achievement %', 'Weighted Score %'];
      rows = (reportData.employee_summary || []).map(e => [
        `"${e.employee_code || e.employee_id || ''}"`,
        `"${e.employee_name || ''}"`,
        `"${e.department || ''}"`,
        `"${e.designation || ''}"`,
        e.total_kpis || 0,
        e.completed_kpis || 0,
        e.avg_achievement || 0,
        e.weighted_score || 0
      ]);
    } else if (activeTab === 'department') {
      headers = ['Department', 'Employee Count', 'Total KPIs Assigned', 'Avg Achievement %'];
      rows = (reportData.department_summary || []).map(d => [
        `"${d.department || ''}"`,
        d.employee_count || 0,
        d.total_kpis || 0,
        d.avg_achievement || 0
      ]);
    } else {
      headers = ['KPI Title', 'Category', 'Total Assigned', 'Completed', 'Avg Achievement %'];
      rows = (reportData.kpi_summary || []).map(k => [
        `"${k.title || ''}"`,
        `"${k.category || ''}"`,
        k.total_assigned || 0,
        k.completed || 0,
        k.avg_achievement || 0
      ]);
    }

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtered lists
  const filteredEmployees = (reportData.employee_summary || []).filter(e => {
    const matchesSearch = !searchTerm || 
      (e.employee_name && e.employee_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (e.employee_code && e.employee_code.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesDept = selectedDept === 'All' || e.department === selectedDept;
    return matchesSearch && matchesDept;
  });

  const allDepts = Array.from(new Set((reportData.employee_summary || []).map(e => e.department).filter(Boolean)));

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <div>
          <div className="flex items-center space-x-2 text-indigo-600 dark:text-indigo-400 font-semibold text-sm mb-1">
            <ChartNoAxesCombined className="w-4 h-4" />
            <span>Reports & Analytics</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Organization Reports & Analytics</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Detailed performance roll-ups, employee summaries, and departmental metrics.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={selectedPeriodId}
            onChange={(e) => setSelectedPeriodId(e.target.value)}
            className="px-4 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-sm font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          >
            {periods.map(p => (
              <option key={p.id} value={p.id}>{p.name} ({p.status})</option>
            ))}
          </select>

          <button
            onClick={handleExportCSV}
            className="inline-flex items-center px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-sm transition-all"
          >
            <Download className="w-4 h-4 mr-1.5" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Report Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-700 space-x-2">
        <button
          onClick={() => setActiveTab('employee')}
          className={`pb-3 px-4 text-sm font-semibold flex items-center space-x-2 border-b-2 transition-all ${
            activeTab === 'employee'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>By Employee</span>
        </button>
        <button
          onClick={() => setActiveTab('department')}
          className={`pb-3 px-4 text-sm font-semibold flex items-center space-x-2 border-b-2 transition-all ${
            activeTab === 'department'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>By Department</span>
        </button>
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-500">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-600" />
          Aggregating performance analytics...
        </div>
      ) : activeTab === 'employee' ? (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          {/* Filters */}
          <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search employee name or code..."
                className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex items-center space-x-2 w-full sm:w-auto">
              <span className="text-xs font-semibold text-slate-400 uppercase">Department:</span>
              <select
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-xs text-slate-900 dark:text-white"
              >
                <option value="All">All Departments</option>
                {allDepts.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-750 text-[11px] font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4 text-center">Total KPIs</th>
                  <th className="py-3 px-4 text-center">Completed</th>
                  <th className="py-3 px-4 text-right">Avg Achievement</th>
                  <th className="py-3 px-4 text-right">Weighted Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700 text-xs">
                {filteredEmployees.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="py-8 text-center text-slate-400 italic">
                      No employee performance records match criteria.
                    </td>
                  </tr>
                ) : (
                  filteredEmployees.map(e => (
                    <tr key={e.employee_id} className="hover:bg-slate-50/50 dark:hover:bg-slate-750/50">
                      <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-white">
                        {e.employee_name}
                        <span className="block text-[11px] text-slate-400 font-normal">
                          {e.employee_code || e.employee_id} &bull; {e.designation}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                        {e.department}
                      </td>
                      <td className="py-3.5 px-4 text-center font-medium text-slate-800 dark:text-slate-200">
                        {e.total_kpis}
                      </td>
                      <td className="py-3.5 px-4 text-center font-medium text-emerald-600 dark:text-emerald-400">
                        {e.completed_kpis}
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-slate-900 dark:text-white">
                        {e.avg_achievement}%
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300">
                          {e.weighted_score}%
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : activeTab === 'department' ? (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-750 text-[11px] font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4 text-center">Employees Tracked</th>
                  <th className="py-3 px-4 text-center">Total KPIs</th>
                  <th className="py-3 px-4 text-right">Avg Achievement %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700 text-xs">
                {(reportData.department_summary || []).length === 0 ? (
                  <tr>
                    <td colSpan="4" className="py-8 text-center text-slate-400 italic">
                      No department data available.
                    </td>
                  </tr>
                ) : (
                  (reportData.department_summary || []).map(d => (
                    <tr key={d.department} className="hover:bg-slate-50/50 dark:hover:bg-slate-750/50">
                      <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-white flex items-center space-x-2">
                        <Building2 className="w-4 h-4 text-indigo-500" />
                        <span>{d.department}</span>
                      </td>
                      <td className="py-3.5 px-4 text-center font-medium text-slate-800 dark:text-slate-200">
                        {d.employee_count}
                      </td>
                      <td className="py-3.5 px-4 text-center font-medium text-slate-800 dark:text-slate-200">
                        {d.total_kpis}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <span className="font-bold text-sm text-slate-900 dark:text-white">
                          {d.avg_achievement}%
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}
