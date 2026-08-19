import React, { useState, useEffect } from 'react';
import { UserSession, CompanyTenant } from '../../types';
import { PredictionRecord, PredictionType, PredictionRiskLevel } from '../../types/bi';
import { PredictionService } from '../../services/predictionService';
import { RbacService } from '../../services/rbacService';
import { AlertTriangle, TrendingDown, Users, DollarSign, Clock, RefreshCw, CheckCircle, Info } from 'lucide-react';
import { format } from 'date-fns';
import { db } from '../../firebase';
import { collection, query, getDocs, where } from 'firebase/firestore';

interface PredictiveAnalyticsDashboardProps {
  session: UserSession;
  company: CompanyTenant;
}

export const PredictiveAnalyticsDashboard: React.FC<PredictiveAnalyticsDashboardProps> = ({ session, company }) => {
  const [predictions, setPredictions] = useState<PredictionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState<PredictionType>('ATTRITION');

  const authorityLevel = RbacService.getAuthorityLevel(session);
  const canView = ['A0_OWNER', 'A1_DIRECTOR_CEO', 'A2_GENERAL_MANAGER', 'A3_HR_HEAD'].includes(authorityLevel);

  useEffect(() => {
    if (canView) {
      loadPredictions();
    } else {
      setLoading(false);
    }
  }, [company.companyId, activeTab]);

  const loadPredictions = async () => {
    setLoading(true);
    try {
      const preds = await PredictionService.getLatestPredictionsByType(company.companyId, activeTab);
      setPredictions(preds);
    } catch (err) {
      console.error('Failed to load predictions:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      if (activeTab === 'ATTRITION') {
        // Fetch a few active employees to predict on
        const empsSnap = await getDocs(query(collection(db, 'companies', company.companyId, 'employees')));
        const emps = empsSnap.docs.map(d => d.data());
        for (const emp of emps.slice(0, 10)) {
          await PredictionService.calculateAttritionRisk(company.companyId, emp.id, 90);
        }
} else if (activeTab === 'SLA_BREACH') {
         // Generate predictions for active SLAs
         const slaSnap = await getDocs(query(collection(db, 'companies', company.companyId, 'sla_definitions'), where('status', '==', 'ACTIVE')));
         const slas = slaSnap.docs.map(d => d.data());
         
         const ticketsSnap = await getDocs(query(collection(db, 'companies', company.companyId, 'serviceTickets'), where('status', 'in', ['OPEN', 'IN_PROGRESS'])));
         const tickets = ticketsSnap.docs.map(d => d.data());
         
         for (const sla of slas) {
           // For simplicity in this dashboard, pick a random open ticket related to the client
           const relevantTickets = tickets.filter(t => t.clientId === sla.clientId);
           for (const t of relevantTickets.slice(0, 3)) { // Limit to avoid overloading
             await PredictionService.calculateSlaBreachRisk(company.companyId, sla.contractId || 'UNKNOWN', sla.id, t.id);
           }
         }
      } else if (activeTab === 'PROFITABILITY') {
        const conSnap = await getDocs(query(collection(db, 'companies', company.companyId, 'contracts')));
        for (const con of conSnap.docs) {
          await PredictionService.calculateProfitabilityRisk(company.companyId, con.data().id, 30);
        }
      }
      
      await loadPredictions();
    } catch (err) {
      console.error('Failed to generate predictions:', err);
    } finally {
      setGenerating(false);
    }
  };

  const renderRiskBadge = (level: PredictionRiskLevel) => {
    switch (level) {
      case 'CRITICAL': return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400">CRITICAL</span>;
      case 'HIGH': return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400">HIGH</span>;
      case 'MEDIUM': return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">MEDIUM</span>;
      case 'LOW': return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">LOW</span>;
      case 'INSUFFICIENT_DATA': return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-400">INSUFFICIENT DATA</span>;
    }
  };

  if (!canView) return null;

  return (
    <div className="space-y-6 mt-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            Predictive Analytics
            <span className="text-xs font-bold bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full uppercase tracking-wider ml-2">Beta</span>
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Machine-assisted risk forecasting for attrition, SLAs, and profitability based on historical data.
          </p>
        </div>
        <button 
          onClick={handleGenerate}
          disabled={generating}
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-medium rounded-xl transition-colors disabled:opacity-70 border border-indigo-200"
        >
          <RefreshCw className={`w-4 h-4 ${generating ? 'animate-spin' : ''}`} />
          {generating ? 'Analyzing...' : 'Run Analysis'}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setActiveTab('ATTRITION')}
          className={`px-6 py-3 font-medium text-sm flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'ATTRITION' ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'}`}
        >
          <Users className="w-4 h-4" /> Attrition Risk
        </button>
        <button
          onClick={() => setActiveTab('PROFITABILITY')}
          className={`px-6 py-3 font-medium text-sm flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'PROFITABILITY' ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'}`}
        >
          <DollarSign className="w-4 h-4" /> Profitability Risk
        </button>
        <button
          onClick={() => setActiveTab('SLA_BREACH')}
          className={`px-6 py-3 font-medium text-sm flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'SLA_BREACH' ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'}`}
        >
          <Clock className="w-4 h-4" /> SLA Breach Risk
        </button>
      </div>

      {/* Content */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex justify-center p-12">
            <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : predictions.length === 0 ? (
          <div className="text-center p-12">
            <Info className="w-12 h-12 text-slate-400 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">No Predictions Available</h3>
            <p className="text-slate-500 max-w-md mx-auto">
              Run an analysis to generate risk forecasts based on current system data.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-6 py-4 font-medium uppercase tracking-wider">Subject</th>
                  <th className="px-6 py-4 font-medium uppercase tracking-wider">Risk Level</th>
                  <th className="px-6 py-4 font-medium uppercase tracking-wider">Score</th>
                  <th className="px-6 py-4 font-medium uppercase tracking-wider">Contributing Factors</th>
                  <th className="px-6 py-4 font-medium uppercase tracking-wider">Data Quality</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {predictions.map(pred => (
                  <tr key={pred.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">
                      {pred.subjectName || pred.subjectId}
                      <div className="text-xs text-slate-500 font-normal mt-1 text-slate-400">
                        Analyzed {format(new Date(pred.generatedAt), 'PP')}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {renderRiskBadge(pred.riskLevel)}
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-700 dark:text-slate-300">
                      {pred.riskScore !== null ? `${pred.riskScore}/100` : '-'}
                    </td>
                    <td className="px-6 py-4">
                      <ul className="list-disc list-inside text-slate-600 dark:text-slate-400 space-y-1">
                        {pred.contributingFactors.map((f, i) => <li key={i}>{f}</li>)}
                      </ul>
                      {pred.recommendedActions && pred.recommendedActions.length > 0 && (
                        <div className="mt-3">
                          <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-1 block">Recommended Actions</span>
                          <ul className="list-disc list-inside text-indigo-700/80 dark:text-indigo-300 space-y-1 text-xs">
                            {pred.recommendedActions.map((a, i) => <li key={i}>{a}</li>)}
                          </ul>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-xs font-medium px-2 py-1 rounded-md ${
                        pred.dataQuality === 'SUFFICIENT' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400' :
                        pred.dataQuality === 'PARTIAL' ? 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400' :
                        'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                      }`}>
                        {pred.dataQuality}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
