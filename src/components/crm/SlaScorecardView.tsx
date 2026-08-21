import React from 'react';
import { SlaScorecardRecord } from '../../types';
import { FileBarChart, Calendar, AlertCircle, CheckCircle2 } from 'lucide-react';

export const SlaScorecardView: React.FC<{ scorecards: SlaScorecardRecord[] }> = ({ scorecards }) => {
  if (scorecards.length === 0) {
    return (
      <div className="py-12 flex flex-col items-center justify-center text-slate-500 bg-white rounded-lg border border-slate-200">
        <FileBarChart className="w-12 h-12 text-slate-300 mb-3" />
        <p>No SLA Scorecards generated yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {scorecards.map(sc => (
        <div key={sc.id} className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
            <div>
              <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                <FileBarChart className="w-4 h-4 text-indigo-600" />
                Scorecard: {sc.contractId}
              </h3>
              <div className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                <Calendar className="w-3 h-3" /> 
                {sc.periodType || 'Monthly'} • {sc.periodStartDate ? new Date(sc.periodStartDate).toLocaleDateString() : 'N/A'} to {sc.periodEndDate ? new Date(sc.periodEndDate).toLocaleDateString() : 'N/A'}
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-slate-900">{(sc.overallCompliance ?? 100).toFixed(1)}%</div>
              <div className="text-xs text-slate-500 font-medium">Overall Compliance</div>
            </div>
          </div>
          
          <div className="px-6 py-4 grid grid-cols-1 md:grid-cols-3 gap-4 border-b border-slate-100 bg-slate-50/50">
             <div className="bg-white p-3 rounded-md border border-slate-200">
               <div className="text-xs text-slate-500 font-medium mb-1">Total Measured Events</div>
               <div className="text-xl font-semibold">{sc.metrics.reduce((acc, m) => acc + (m.totalMeasuredEvents ?? 0), 0)}</div>
             </div>
             <div className="bg-white p-3 rounded-md border border-slate-200">
               <div className="text-xs text-slate-500 font-medium mb-1">Total Breaches</div>
               <div className="text-xl font-semibold text-amber-600">{sc.totalBreaches ?? 0}</div>
             </div>
             <div className="bg-white p-3 rounded-md border border-slate-200">
               <div className="text-xs text-slate-500 font-medium mb-1">Critical Breaches</div>
               <div className="text-xl font-semibold text-red-600">{sc.criticalBreaches ?? 0}</div>
             </div>
          </div>

          <div className="p-0 overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Metric</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Target</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Actual</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Events (Breached)</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Compliance</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {sc.metrics.map((m, i) => (
                  <tr key={i}>
                    <td className="px-6 py-4 text-sm font-medium text-slate-900">{m.slaName || m.metricName || 'Metric'}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{m.targetValue ?? 0} {m.targetUnit || ''}</td>
                    <td className="px-6 py-4 text-sm text-slate-900 font-medium">{(m.actualValue ?? 0).toFixed(1)} {m.targetUnit || ''}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{m.totalMeasuredEvents ?? 0} <span className={(m.breaches ?? 0) > 0 ? 'text-red-600 font-semibold' : 'text-green-600 font-semibold'}>({m.breaches ?? 0})</span></td>
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
