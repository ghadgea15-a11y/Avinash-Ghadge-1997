import React, { useState, useEffect } from 'react';
import { UserSession } from '../../types';
import { 
  ComplianceObligation, ObligationMetrics 
} from '../../types/complianceObligation';
import { ComplianceObligationService } from '../../services/complianceObligationService';
import { Activity, AlertTriangle, CheckCircle, Shield, FileText, AlertCircle, RefreshCw, Clock, ExternalLink } from 'lucide-react';
import { motion } from 'motion/react';

interface Props {
  session: UserSession;
}

export const ComplianceObligationViewer: React.FC<Props> = ({ session }) => {
  const [obligations, setObligations] = useState<ComplianceObligation[]>([]);
  const [metrics, setMetrics] = useState<ObligationMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const loadedObligations = await ComplianceObligationService.getObligations(session, session.companyId);
      const loadedMetrics = await ComplianceObligationService.getMetrics(session, session.companyId);
      
      setObligations(loadedObligations);
      setMetrics(loadedMetrics);
    } catch (err: any) {
      setError(err.message || 'Failed to load compliance obligations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [session.companyId]);

  const handleSimulateEvaluate = async () => {
    try {
      setLoading(true);
      // Let's create an overdue obligation first to ensure the engine catches it
      const tempId = `OBL-EXP-${Date.now()}`;
      const expiredDate = new Date();
      expiredDate.setDate(expiredDate.getDate() - 5);
      
      await ComplianceObligationService.saveObligation(session, {
        id: tempId,
        companyId: session.companyId,
        name: 'OSHA Annual Training Certification',
        description: 'Mandatory annual safety training compliance',
        category: 'HSE',
        regulatorySource: 'OSHA 1910.38',
        requirementReference: 'Sec 4.1',
        ownerId: session.userId,
        effectiveDate: new Date(Date.now() - 365*24*60*60*1000).toISOString(),
        dueDate: expiredDate.toISOString(),
        status: 'ACTIVE',
        riskLevel: 'HIGH',
        alertThresholdsDays: [90, 60, 30, 0],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      
      // Now run engine
      await ComplianceObligationService.evaluateExpiries(session.companyId);
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to evaluate expiries');
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <RefreshCw className="animate-spin text-blue-500 mr-3" size={24} />
        <span className="text-gray-600 font-medium">Loading Compliance Obligations...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center">
            <FileText className="mr-2 text-indigo-600" />
            Compliance Obligations & Expiry
          </h2>
          <p className="text-gray-500 mt-1">Regulatory Tracking, Renewals & Lifecycle Management</p>
        </div>
        <button 
          onClick={handleSimulateEvaluate}
          className="bg-indigo-600 text-white px-4 py-2 rounded shadow hover:bg-indigo-700 transition flex items-center"
        >
          <Clock className="w-4 h-4 mr-2" />
          Run Expiry Engine
        </button>
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
            <h3 className="text-gray-500 text-sm font-medium uppercase tracking-wider mb-2">Total Obligations</h3>
            <div className="flex items-center">
              <FileText className="text-blue-500 mr-3" size={24} />
              <span className="text-3xl font-bold text-gray-900">{metrics.totalObligations}</span>
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow border border-gray-100">
            <h3 className="text-gray-500 text-sm font-medium uppercase tracking-wider mb-2">Compliant</h3>
            <div className="flex items-center">
              <CheckCircle className="text-green-500 mr-3" size={24} />
              <span className="text-3xl font-bold text-gray-900">{metrics.compliant}</span>
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow border border-gray-100">
            <h3 className="text-gray-500 text-sm font-medium uppercase tracking-wider mb-2">Due Soon (30d)</h3>
            <div className="flex items-center">
              <Clock className="text-orange-500 mr-3" size={24} />
              <span className="text-3xl font-bold text-gray-900">{metrics.upcomingExpiries.length}</span>
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow border border-gray-100">
            <h3 className="text-gray-500 text-sm font-medium uppercase tracking-wider mb-2">Expired / Failed</h3>
            <div className="flex items-center">
              <AlertTriangle className="text-red-500 mr-3" size={24} />
              <span className="text-3xl font-bold text-gray-900">{metrics.expired + metrics.nonCompliant}</span>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
        <div className="p-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-800">Obligation Register</h3>
        </div>
        
        <div className="p-0">
            {obligations.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Obligation</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Source</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Due Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Risk Level</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {obligations.map((ob) => {
                      
                      const isOverdue = new Date(ob.dueDate).getTime() < Date.now();
                      
                      return (
                      <tr key={ob.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{ob.id}</td>
                        <td className="px-6 py-4 text-sm text-gray-900 font-medium">
                            {ob.name}
                            <div className="text-xs text-gray-500 mt-1">{ob.description.substring(0,40)}...</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{ob.category}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-indigo-600 font-medium">
                            {ob.regulatorySource}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <span className={isOverdue && !['CLOSED','RETIRED'].includes(ob.status) ? 'text-red-600 font-bold' : 'text-gray-700'}>
                                {new Date(ob.dueDate).toLocaleDateString()}
                            </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            ob.status === 'ACTIVE' || ob.status === 'VERIFIED' ? 'bg-green-100 text-green-800' :
                            ob.status === 'EXPIRED' || ob.status === 'NON_COMPLIANT' ? 'bg-red-100 text-red-800' :
                            ob.status === 'RENEWAL_DUE' || ob.status === 'REVIEW_DUE' ? 'bg-orange-100 text-orange-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {ob.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 text-xs font-bold rounded border ${
                                ob.riskLevel === 'CRITICAL' ? 'bg-red-50 text-red-700 border-red-200' :
                                ob.riskLevel === 'HIGH' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                                ob.riskLevel === 'MEDIUM' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                                'bg-green-50 text-green-700 border-green-200'
                            }`}>
                                {ob.riskLevel}
                            </span>
                        </td>
                      </tr>
                    )})}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-16">
                <FileText className="mx-auto h-12 w-12 text-gray-300" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No obligations defined</h3>
                <p className="mt-1 text-sm text-gray-500">Regulatory and compliance obligations will appear here.</p>
              </div>
            )}
        </div>
      </div>
    </div>
  );
};
