import React, { useState, useEffect } from 'react';
import { 
  History, Calendar, Award, TrendingUp, CheckCircle2, 
  ChevronDown, ChevronUp, FileText, Target, Filter, Star 
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getKpiPeriods, getEmployeeKpiDashboard } from '../../services/api';

export default function KPIHistoryPage() {
  const { user } = useAuth();
  const [periods, setPeriods] = useState([]);
  const [historyData, setHistoryData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedPeriod, setExpandedPeriod] = useState(null);

  useEffect(() => {
    loadHistoricalData();
  }, []);

  const loadHistoricalData = async () => {
    setLoading(true);
    try {
      const pRes = await getKpiPeriods();
      const pList = Array.isArray(pRes) ? pRes : (pRes?.data || []);
      setPeriods(pList);

      // For each period, load employee dashboard info
      const periodSummaries = await Promise.all(
        pList.map(async (p) => {
          try {
            const dRes = await getEmployeeKpiDashboard({ period_id: p.id });
            const d = dRes?.summary ? dRes : (dRes?.data || {});
            return {
              period: p,
              summary: d.summary || { total_kpis: 0, avg_achievement: 0, weighted_score: 0 },
              assignments: d.assignments || []
            };
          } catch (e) {
            return {
              period: p,
              summary: { total_kpis: 0, avg_achievement: 0, weighted_score: 0 },
              assignments: []
            };
          }
        })
      );

      setHistoryData(periodSummaries);
      if (periodSummaries.length > 0) {
        setExpandedPeriod(periodSummaries[0].period.id);
      }
    } catch (err) {
      console.error('Failed to load historical KPI data:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (id) => {
    setExpandedPeriod(expandedPeriod === id ? null : id);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="flex items-center space-x-2 text-indigo-600 dark:text-indigo-400 font-semibold text-sm mb-1">
          <History className="w-4 h-4" />
          <span>Performance Archives</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">KPI & Performance History</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Review historical performance evaluations, weighted achievement scores, and past manager feedback.
        </p>
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-500">
          <History className="w-8 h-8 animate-spin mx-auto mb-2 text-indigo-600" />
          Loading historical performance records...
        </div>
      ) : historyData.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 p-12 text-center rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <History className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">No History Available</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            No historical appraisal or performance cycles found.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {historyData.map(({ period, summary, assignments }) => {
            const isExpanded = expandedPeriod === period.id;
            return (
              <div 
                key={period.id}
                className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden transition-all"
              >
                {/* Accordion Header */}
                <div 
                  onClick={() => toggleExpand(period.id)}
                  className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-11 h-11 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-sm">
                      <Calendar className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                          {period.name}
                        </h3>
                        <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                          period.status === 'Active' 
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300' 
                            : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                        }`}>
                          {period.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {period.start_date} to {period.end_date} &bull; {period.type || 'Quarterly'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between md:justify-end space-x-6">
                    <div className="text-right">
                      <p className="text-[11px] uppercase tracking-wider text-slate-400">Total KPIs</p>
                      <p className="text-sm font-bold text-slate-900 dark:text-white">{summary.total_kpis}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[11px] uppercase tracking-wider text-slate-400">Avg Achievement</p>
                      <p className="text-sm font-bold text-blue-600 dark:text-blue-400">{summary.avg_achievement}%</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[11px] uppercase tracking-wider text-slate-400">Weighted Score</p>
                      <p className="text-sm font-bold text-purple-600 dark:text-purple-400">{summary.weighted_score}%</p>
                    </div>
                    <div className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                      {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </div>
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="p-5 border-t border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/20 space-y-4">
                    {assignments.length === 0 ? (
                      <p className="text-xs text-slate-400 text-center py-4">No KPIs assigned for this period.</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                          <thead>
                            <tr className="border-b border-slate-200 dark:border-slate-700 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                              <th className="pb-3 pl-2">KPI Title</th>
                              <th className="pb-3">Category</th>
                              <th className="pb-3 text-right">Target</th>
                              <th className="pb-3 text-right">Achieved</th>
                              <th className="pb-3 text-right">Weight</th>
                              <th className="pb-3 text-right">Achievement %</th>
                              <th className="pb-3 text-center">Status</th>
                              <th className="pb-3 text-center">Score</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {assignments.map(kpi => (
                              <tr key={kpi.id} className="text-xs">
                                <td className="py-3.5 pl-2 font-medium text-slate-900 dark:text-white">
                                  {kpi.title}
                                  {kpi.review_feedback && (
                                    <p className="text-[11px] text-slate-400 italic mt-0.5">
                                      Note: "{kpi.review_feedback}"
                                    </p>
                                  )}
                                </td>
                                <td className="py-3.5 text-slate-500 dark:text-slate-400">
                                  {kpi.category_name || 'General'}
                                </td>
                                <td className="py-3.5 text-right font-medium text-slate-700 dark:text-slate-300">
                                  {kpi.target_value} {kpi.unit}
                                </td>
                                <td className="py-3.5 text-right font-semibold text-indigo-600 dark:text-indigo-400">
                                  {kpi.current_value || 0} {kpi.unit}
                                </td>
                                <td className="py-3.5 text-right font-medium text-slate-700 dark:text-slate-300">
                                  {kpi.weightage}%
                                </td>
                                <td className="py-3.5 text-right font-bold text-slate-900 dark:text-white">
                                  {kpi.achievement_pct || 0}%
                                </td>
                                <td className="py-3.5 text-center">
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                                    {kpi.status}
                                  </span>
                                </td>
                                <td className="py-3.5 text-center font-bold text-amber-500">
                                  {kpi.review_score ? `★ ${kpi.review_score}/5` : '-'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
