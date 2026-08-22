import React, { useState, useEffect } from 'react';
import { UserSession } from '../../types';
import { 
  ComplianceControl, ControlException, ComplianceDashboardMetrics 
} from '../../types/complianceControl';
import { ComplianceControlService } from '../../services/complianceControlService';
import { Activity, AlertTriangle, CheckCircle, Shield, FileText, AlertCircle, RefreshCw } from 'lucide-react';
import { BpmEscalationService } from '../../services/bpmEscalationService';

interface Props {
  session: UserSession;
}

export const ComplianceControlViewer: React.FC<Props> = ({ session }) => {
  const [controls, setControls] = useState<ComplianceControl[]>([]);
  const [exceptions, setExceptions] = useState<ControlException[]>([]);
  const [metrics, setMetrics] = useState<ComplianceDashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'CONTROLS' | 'EXCEPTIONS'>('CONTROLS');
  
  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const loadedControls = await ComplianceControlService.getControls(session, session.companyId);
      const loadedExceptions = await ComplianceControlService.getExceptions(session, session.companyId);
      const loadedMetrics = await ComplianceControlService.getDashboardMetrics(session, session.companyId);
      
      setControls(loadedControls);
      setExceptions(loadedExceptions);
      setMetrics(loadedMetrics);
    } catch (err: any) {
      setError(err.message || 'Failed to load compliance controls');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [session.companyId]);


  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <RefreshCw className="animate-spin text-blue-500 mr-3" size={24} />
        <span className="text-gray-600 font-medium">Loading Compliance Controls...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center">
            <Shield className="mr-2 text-indigo-600" />
            Compliance Controls
          </h2>
          <p className="text-gray-500 mt-1">Enterprise Compliance Control & Control Testing</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4">
          <div className="flex">
            <AlertCircle className="text-red-500 mr-3" />
            <p className="text-red-700">{error}</p>
          </div>
        </div>
      )}

      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-6 rounded-lg shadow border border-gray-100">
            <h3 className="text-gray-500 text-sm font-medium uppercase tracking-wider mb-2">Total Controls</h3>
            <div className="flex items-center">
              <FileText className="text-blue-500 mr-3" size={24} />
              <span className="text-3xl font-bold text-gray-900">{metrics.totalControls}</span>
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow border border-gray-100">
            <h3 className="text-gray-500 text-sm font-medium uppercase tracking-wider mb-2">Effective</h3>
            <div className="flex items-center">
              <CheckCircle className="text-green-500 mr-3" size={24} />
              <span className="text-3xl font-bold text-gray-900">{metrics.effectiveControls}</span>
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow border border-gray-100">
            <h3 className="text-gray-500 text-sm font-medium uppercase tracking-wider mb-2">Remediation Req.</h3>
            <div className="flex items-center">
              <AlertTriangle className="text-orange-500 mr-3" size={24} />
              <span className="text-3xl font-bold text-gray-900">{metrics.remediationRequiredControls}</span>
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow border border-gray-100">
            <h3 className="text-gray-500 text-sm font-medium uppercase tracking-wider mb-2">Risk Coverage</h3>
            <div className="flex items-center">
              <Activity className="text-indigo-500 mr-3" size={24} />
              <span className="text-3xl font-bold text-gray-900">{metrics.riskMitigationCoverage}%</span>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px px-6" aria-label="Tabs">
          </nav>
        </div>
        
        <div className="p-6">
          {activeTab === 'CONTROLS' ? (
            controls.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Control ID</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Frequency</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {controls.map((control) => (
                      <tr key={control.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{control.id}</td>
                        <td className="px-6 py-4 text-sm text-gray-500">{control.name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{control.category}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{control.controlType}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            control.status === 'EFFECTIVE' ? 'bg-green-100 text-green-800' :
                            control.status === 'REMEDIATION_REQUIRED' || control.status === 'INEFFECTIVE' ? 'bg-red-100 text-red-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {control.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{control.testFrequency}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-10">
                <Shield className="mx-auto h-12 w-12 text-gray-300" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No controls defined</h3>
                <p className="mt-1 text-sm text-gray-500">Get started by creating a new compliance control.</p>
              </div>
            )
          ) : (
            exceptions.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Control ID</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Severity</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {exceptions.map((exc) => (
                      <tr key={exc.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{exc.id}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-indigo-600">{exc.controlId}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            exc.severity === 'CRITICAL' || exc.severity === 'HIGH' ? 'bg-red-100 text-red-800' :
                            exc.severity === 'MEDIUM' ? 'bg-orange-100 text-orange-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                            {exc.severity}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">{exc.description}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            exc.status === 'CLOSED' ? 'bg-green-100 text-green-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {exc.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(exc.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-10">
                <CheckCircle className="mx-auto h-12 w-12 text-gray-300" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No active exceptions</h3>
                <p className="mt-1 text-sm text-gray-500">All controls are operating effectively.</p>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
};
