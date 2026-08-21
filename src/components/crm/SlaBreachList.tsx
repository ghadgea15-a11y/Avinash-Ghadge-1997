import React from 'react';
import { SlaBreachRecord } from '../../types';
import { AlertTriangle, Clock, AlertCircle, CheckCircle2 } from 'lucide-react';

export const SlaBreachList: React.FC<{ breaches: SlaBreachRecord[], onRefresh: () => void }> = ({ breaches }) => {
  if (breaches.length === 0) {
    return (
      <div className="py-12 flex flex-col items-center justify-center text-slate-500 bg-white rounded-lg border border-slate-200">
        <CheckCircle2 className="w-12 h-12 text-slate-300 mb-3" />
        <p>No SLA Breaches found.</p>
        <p className="text-sm mt-1 text-green-600 font-medium">All performance metrics are meeting targets.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
      <table className="min-w-full divide-y divide-slate-200">
        <thead className="bg-slate-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Detection</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">SLA & Contract</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Variance</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Severity</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Status</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-slate-200">
          {breaches.map(b => (
            <tr key={b.id} className="hover:bg-slate-50">
              <td className="px-6 py-4">
                <div className="text-sm font-medium text-slate-900 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4 text-red-500" />
                  {b.detectedAt ? new Date(b.detectedAt).toLocaleDateString() : 'N/A'}
                </div>
                <div className="text-xs text-slate-500 mt-0.5">{b.detectedAt ? new Date(b.detectedAt).toLocaleTimeString() : ''}</div>
              </td>
              <td className="px-6 py-4">
                <div className="text-sm text-slate-900 font-medium">{b.slaId || 'SLA'}</div>
                <div className="text-xs text-slate-500">Contract: {b.contractId || 'N/A'}</div>
              </td>
              <td className="px-6 py-4">
                <div className="text-sm text-slate-900">Actual: {(b.actualValue ?? 0).toFixed(1)}</div>
                <div className="text-xs text-red-600 font-medium">Target: {b.targetValue ?? 0} (Var: +{(b.variance ?? 0).toFixed(1)})</div>
              </td>
              <td className="px-6 py-4">
                <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                  b.severity === 'CRITICAL' ? 'bg-red-100 text-red-800' :
                  b.severity === 'HIGH' ? 'bg-orange-100 text-orange-800' :
                  'bg-yellow-100 text-yellow-800'
                }`}>
                  {b.severity || 'MEDIUM'}
                </span>
              </td>
              <td className="px-6 py-4">
                <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                  b.status === 'OPEN' ? 'bg-red-50 text-red-700' :
                  b.status === 'ESCALATED' ? 'bg-purple-100 text-purple-800' :
                  'bg-green-100 text-green-800'
                }`}>
                  {b.status || 'OPEN'}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
