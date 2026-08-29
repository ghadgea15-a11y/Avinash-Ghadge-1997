import React, { useState, useEffect } from 'react';
import { RiskManagementService } from '../../services/riskManagementService';
import { RiskRecord, RiskMitigationAction } from '../../types/risk';
import { AlertTriangle, FileText, CheckCircle, Clock, Search, Shield, User, ChevronDown, Plus, Eye } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export function RiskRegisterViewer({ userSession }: { userSession: any }) {
  const session = userSession;
  const [risks, setRisks] = useState<RiskRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRisk, setSelectedRisk] = useState<RiskRecord | null>(null);

  useEffect(() => {
    if (session?.companyId) {
      loadData();
    }
  }, [session]);

  const loadData = async () => {
    if (!session) return;
    setLoading(true);
    try {
      const data = await RiskManagementService.getRiskRegister(session, session.companyId);
      // Sort by score desc
      data.sort((a, b) => b.riskScore - a.riskScore);
      setRisks(data);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const getSeverityColor = (sev: string) => {
    switch (sev) {
      case 'CRITICAL': return 'bg-red-100 text-red-800';
      case 'HIGH': return 'bg-orange-100 text-orange-800';
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-blue-100 text-blue-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'CLOSED':
      case 'ACCEPTED':
      case 'RESOLVED':
        return 'bg-green-100 text-green-800';
      case 'MITIGATION_IN_PROGRESS':
      case 'TREATMENT_PLANNED':
        return 'bg-blue-100 text-blue-800';
      case 'IDENTIFIED':
      case 'ASSESSED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredRisks = risks.filter(r => 
    r.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    r.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Loading Risk Register...</div>;
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FileText className="w-6 h-6 text-indigo-600" />
            Enterprise Risk Register
          </h1>
          <p className="text-gray-500 mt-1">Centralized risk repository and treatment management.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 rounded-lg shadow p-4 border border-gray-100">
          <div className="text-sm font-medium text-gray-500">Total Risks</div>
          <div className="mt-2 text-3xl font-bold text-gray-900">{risks.length}</div>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-lg shadow p-4 border border-red-100">
          <div className="text-sm font-medium text-red-600">Critical / High</div>
          <div className="mt-2 text-3xl font-bold text-red-700">
            {risks.filter(r => !['CLOSED', 'ACCEPTED'].includes(r.status) && (r.severity === 'CRITICAL' || r.severity === 'HIGH')).length}
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-lg shadow p-4 border border-blue-100">
          <div className="text-sm font-medium text-blue-600">Treatment In Progress</div>
          <div className="mt-2 text-3xl font-bold text-blue-700">
            {risks.filter(r => r.status === 'MITIGATION_IN_PROGRESS' || r.status === 'TREATMENT_PLANNED').length}
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-lg shadow p-4 border border-green-100">
          <div className="text-sm font-medium text-green-600">Accepted / Closed</div>
          <div className="mt-2 text-3xl font-bold text-green-700">
            {risks.filter(r => ['CLOSED', 'ACCEPTED'].includes(r.status)).length}
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 shadow rounded-lg overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
          <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
            <Shield className="w-5 h-5 text-gray-500" />
            Risk Inventory
          </h3>
          <div className="w-64">
            <div className="relative">
              <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input 
                type="text" 
                placeholder="Search risks..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 text-sm border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>
        </div>
        
        {filteredRisks.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No risks found matching your criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID & Title</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Severity</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Score</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Strategy</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Owner</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-slate-900 divide-y divide-gray-200">
                {filteredRisks.map(risk => (
                  <tr key={risk.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{risk.id}</div>
                      <div className="text-xs text-gray-500 truncate max-w-xs">{risk.title}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getSeverityColor(risk.severity)}`}>
                        {risk.severity}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 font-bold">{risk.riskScore}</div>
                      <div className="text-xs text-gray-500">L:{risk.likelihood} × I:{risk.impact}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(risk.status)}`}>
                        {risk.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                      {risk.treatmentStrategy || 'UNASSIGNED'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-900">{risk.ownerId || 'Unassigned'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button 
                        onClick={() => setSelectedRisk(risk)}
                        className="text-indigo-600 hover:text-indigo-900 flex items-center justify-end gap-1 w-full"
                      >
                        <Eye className="w-4 h-4" /> View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AnimatePresence>
        {selectedRisk && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.95 }} 
              animate={{ scale: 1 }} 
              exit={{ scale: 0.95 }} 
              className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-3xl overflow-hidden"
            >
              <div className="p-6 border-b border-gray-100 flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-xl font-bold text-gray-900">{selectedRisk.id}: {selectedRisk.title}</h2>
                    <span className={`px-2 py-1 text-xs font-bold rounded-md ${getSeverityColor(selectedRisk.severity)}`}>
                      {selectedRisk.severity}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">{selectedRisk.description}</p>
                </div>
                <button onClick={() => setSelectedRisk(null)} className="text-gray-400 hover:text-gray-600">×</button>
              </div>
              
              <div className="p-6 grid grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-bold text-gray-700 border-b pb-2 mb-3">Inherent Risk</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-gray-500">Likelihood:</span> <span className="font-medium text-gray-900">{selectedRisk.likelihood}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Impact:</span> <span className="font-medium text-gray-900">{selectedRisk.impact}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Score:</span> <span className="font-bold text-gray-900">{selectedRisk.riskScore}</span></div>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-gray-700 border-b pb-2 mb-3">Residual Risk</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-gray-500">Likelihood:</span> <span className="font-medium text-gray-900">{selectedRisk.residualLikelihood || '-'}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Impact:</span> <span className="font-medium text-gray-900">{selectedRisk.residualImpact || '-'}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Score:</span> <span className="font-bold text-gray-900">{selectedRisk.residualRiskScore || '-'}</span></div>
                  </div>
                </div>

                <div className="col-span-2 border-t pt-4">
                  <h3 className="text-sm font-bold text-gray-700 mb-3">Treatment & Controls</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500 block mb-1">Treatment Strategy:</span>
                      <span className="font-medium text-indigo-700 bg-indigo-50 px-2 py-1 rounded">{selectedRisk.treatmentStrategy || 'UNASSIGNED'}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 block mb-1">Status:</span>
                      <span className="font-medium text-gray-900">{selectedRisk.status.replace(/_/g, ' ')}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-gray-500 block mb-1">Existing Controls:</span>
                      <div className="bg-gray-50 p-3 rounded border border-gray-200 text-gray-700">
                        {selectedRisk.existingControls || 'No existing controls documented.'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3 border-t">
                <button 
                  onClick={() => setSelectedRisk(null)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white dark:bg-slate-900 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
