import React from 'react';
import { SlaScorecardRecord } from '../../types';
import { FileBarChart, Calendar, AlertCircle, CheckCircle2 } from 'lucide-react';

export const SlaScorecardView: React.FC<{ scorecards: SlaScorecardRecord[] }> = ({ scorecards }) => {
  if (scorecards.length === 0) {
    return (
      <div className="py-12 flex flex-col items-center justify-center text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 rounded-lg border border-slate-200">
        <FileBarChart className="w-12 h-12 text-slate-300 mb-3" />
        <p>No SLA Scorecards generated yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {scorecards.map(sc => (
        <div key={sc.id} className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-white dark:bg-slate-950 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
            <div>
              <h3 className="font-semibold text-black dark:text-white flex items-center gap-2">
                <FileBarChart className="w-4 h-4 text-indigo-600" />
                Scorecard: {sc.contractId}
              </h3>
              <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-1">
                <Calendar className="w-3 h-3" /> 
                {sc.periodType || 'Monthly'} • {sc.periodStartDate ? new Date(sc.periodStartDate).toLocaleDateString() : 'N/A'} to {sc.periodEndDate ? new Date(sc.periodEndDate).toLocaleDateString() : 'N/A'}
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-black dark:text-white">{(sc.overallCompliance ?? 100).toFixed(1)}%</div>
              <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Overall Compliance</div>
            </div>
          </div>
          
          <div className="px-6 py-4 grid grid-cols-1 md:grid-cols-3 gap-4 border-b border-slate-100 bg-white dark:bg-slate-950/50">
             <div className="bg-white dark:bg-slate-900 p-3 rounded-md border border-slate-200">
               <div className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-1">Total Measured Events</div>
               <div className="text-xl font-semibold">{sc.metrics.reduce((acc: any, m: any) => acc + (m.totalMeasuredEvents ?? 0), 0)}</div>
             </div>
             <div className="bg-white dark:bg-slate-900 p-3 rounded-md border border-slate-200">
               <div className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-1">Total Breaches</div>
               <div className="text-xl font-semibold text-amber-600">{sc.totalBreaches ?? 0}</div>
             </div>
             <div className="bg-white dark:bg-slate-900 p-3 rounded-md border border-slate-200">
               <div className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-1">Critical Breaches</div>
               <div className="text-xl font-semibold text-red-600">{sc.criticalBreaches ?? 0}</div>
             </div>
          </div>

          <div className="p-0 overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-white dark:bg-slate-950">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Metric</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Target</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Actual</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Events (Breached)</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Compliance</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-slate-900 divide-y divide-slate-200">
                {sc.metrics.map((m: any, i: number) => (
                  <tr key={i}>
                    <td className="px-6 py-4 text-sm font-medium text-black dark:text-white">{m.slaName || m.metricName || 'Metric'}</td>
                    <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">{m.targetValue ?? 0} {m.targetUnit || ''}</td>
                    <td className="px-6 py-4 text-sm text-black dark:text-white font-medium">{(m.actualValue ?? 0).toFixed(1)} {m.targetUnit || ''}</td>
                    <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">{m.totalMeasuredEvents ?? 0} <span className={(m.breaches ?? 0) > 0 ? 'text-red-600 font-semibold' : 'text-green-600 font-semibold'}>({m.breaches ?? 0})</span></td>
                    <td className="px-6 py-4 flex items-center gap-2">
                       <span className={`text-sm font-semibold ${(m.compliancePercentage ?? 100) >= 95 ? 'text-green-600' : 'text-red-600'}`}>
                         {(m.compliancePercentage ?? 100).toFixed(1)}%
                       </span>
                       {m.isMet ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <AlertCircle className="w-4 h-4 text-red-500" />}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
};
