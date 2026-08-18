import React from 'react';
import { SlaDefinitionRecord } from '../../types';
import { Target, Activity } from 'lucide-react';

export const SlaDefinitionList: React.FC<{ definitions: SlaDefinitionRecord[], onRefresh: () => void }> = ({ definitions }) => {
  if (definitions.length === 0) {
    return (
      <div className="py-12 flex flex-col items-center justify-center text-slate-500 bg-white rounded-lg border border-slate-200">
        <Target className="w-12 h-12 text-slate-300 mb-3" />
        <p>No SLA Definitions found.</p>
        <p className="text-sm mt-1">Create an SLA to start tracking performance metrics.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
      <table className="min-w-full divide-y divide-slate-200">
        <thead className="bg-slate-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">SLA Name / Code</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Contract / Client</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Target</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-slate-200">
          {definitions.map(def => (
            <tr key={def.id} className="hover:bg-slate-50">
              <td className="px-6 py-4">
                <div className="font-medium text-slate-900">{def.slaName}</div>
                <div className="text-xs text-slate-500">{def.slaCode} • {def.measurementType.replace('_', ' ')}</div>
              </td>
              <td className="px-6 py-4">
                <div className="text-sm text-slate-900 line-clamp-1">{def.contractId}</div>
                <div className="text-xs text-slate-500">{def.clientId}</div>
              </td>
              <td className="px-6 py-4 text-sm font-medium text-slate-900">
                {def.targetValue} {def.targetUnit}
              </td>
              <td className="px-6 py-4">
                <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                  def.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-800'
                }`}>
                  {def.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
