import React, { useState, useEffect } from 'react';
import { UserSession, CompanyTenant } from '../../types';
import { EnterpriseIntelligenceService, IntelligenceFilters, IntelligenceResult } from '../../services/enterpriseIntelligenceService';
import { FirestoreService } from '../../services/firestoreService';
import { 
  Users, AlertTriangle, XCircle, ShieldCheck, CheckCircle, FileText, 
  Clock, MapPin, Building2, Search, ArrowRight,
  TrendingUp, TrendingDown, DollarSign, Filter
} from 'lucide-react';
import { format, subDays } from 'date-fns';
import { formatTimestamp } from '../../utils/dateUtils';

interface DashboardProps {
  session: UserSession;
  company: CompanyTenant;
  onDrillDown: (module: string, data: any) => void;
}

export const EnterpriseIntelligenceDashboard: React.FC<DashboardProps> = ({ session, company, onDrillDown }) => {
  const [filters, setFilters] = useState<IntelligenceFilters>({
    companyId: company.companyId,
    startDate: new Date().toISOString(),
    endDate: new Date().toISOString(),
  });
  
  const [data, setData] = useState<IntelligenceResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Metadata for dropdowns
  const [regions, setRegions] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [sites, setSites] = useState<any[]>([]);

  useEffect(() => {
    // Load dropdown metadata
    Promise.all([
      FirestoreService.getRegions(company.companyId),
      FirestoreService.getBranches(company.companyId),
      FirestoreService.getSites(company.companyId)
    ]).then(([r, b, s]) => {
      setRegions(r);
      setBranches(b);
      setSites(s);
    }).catch(console.error);
  }, [company.companyId]);

  useEffect(() => {
    let active = true;
    const loadData = async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await EnterpriseIntelligenceService.getRealTimeIntelligence(session, filters);
        if (active) setData(result);
      } catch (err: any) {
        if (active) setError(err.message || 'Failed to load intelligence data');
      } finally {
        if (active) setLoading(false);
      }
    };
    loadData();
    return () => { active = false; };
  }, [filters, session]);

  
  const [drillDownModal, setDrillDownModal] = useState<{ isOpen: boolean; title: string; data: any[] }>({ isOpen: false, title: '', data: [] });
  
  const handleInternalDrillDown = (key: string, data: any[]) => {
    let title = 'Details';
    if (key === 'WORKFORCE_EXCEPTIONS') title = 'Workforce Exceptions (Late / Missing Punch)';
    if (key === 'OPERATIONS_INCIDENTS') title = 'Open Incidents';
    if (key === 'OPERATIONS_CRITICAL_INCIDENTS') title = 'Critical Incidents';
    if (key === 'OPERATIONS_WORK_ORDERS') title = 'Open Work Orders';
    if (key === 'OPERATIONS_OVERDUE_WO') title = 'Overdue Work Orders';
    if (key === 'COMPLIANCE_APPROVALS') title = 'Pending Approvals';
    
    setDrillDownModal({ isOpen: true, title, data });
    onDrillDown(key, data);
  };

  const handleFilterChange = (key: keyof IntelligenceFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value === 'ALL' ? undefined : value }));
  };

  const renderMetricCard = (title: string, value: number | string, icon: React.ReactNode, colorClass: string, drillDownKey?: string, drillDownData?: any) => (
    <div 
      className={`bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm transition-all ${drillDownKey ? 'cursor-pointer hover:shadow-md hover:border-indigo-300' : ''}`}
      onClick={() => drillDownKey && handleInternalDrillDown(drillDownKey, drillDownData)}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400">{title}</h3>
        <div className={`p-2 rounded-lg ${colorClass}`}>{icon}</div>
      </div>
      <p className="text-3xl font-black text-black dark:text-white">{value}</p>
      {drillDownKey && (
        <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-3 font-medium flex items-center gap-1 group-hover:underline">
          View Details <ArrowRight className="w-3 h-3" />
        </p>
      )}
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col lg:flex-row gap-4 items-end bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex-1">
          <h2 className="text-xl font-bold text-black dark:text-white flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-indigo-500" />
            Live Operations Intelligence
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Authoritative, real-time data directly from core modules.</p>
        </div>
        
        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Date</label>
            <input 
              type="date" 
              value={filters.startDate.split('T')[0]} 
              onChange={e => handleFilterChange('startDate', new Date(e.target.value).toISOString())}
              className="bg-white dark:bg-slate-950 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Region</label>
            <select 
              value={filters.regionId || 'ALL'} 
              onChange={e => handleFilterChange('regionId', e.target.value)}
              className="bg-white dark:bg-slate-950 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 min-w-[120px]"
            >
              <option value="ALL">All Regions</option>
              {regions.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Branch</label>
            <select 
              value={filters.branchId || 'ALL'} 
              onChange={e => handleFilterChange('branchId', e.target.value)}
              className="bg-white dark:bg-slate-950 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 min-w-[120px]"
            >
              <option value="ALL">All Branches</option>
              {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Site</label>
            <select 
              value={filters.siteId || 'ALL'} 
              onChange={e => handleFilterChange('siteId', e.target.value)}
              className="bg-white dark:bg-slate-950 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 min-w-[120px]"
            >
              <option value="ALL">All Sites</option>
              {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div className="flex items-end">
            <button 
              onClick={() => {
                setFilters({
                  companyId: company.companyId,
                  startDate: new Date().toISOString(),
                  endDate: new Date().toISOString(),
                });
              }}
              className="p-2 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors"
              title="Reset Filters"
            >
              <Filter className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="p-12 flex flex-col items-center justify-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-slate-500 dark:text-slate-400 font-medium">Aggregating Authoritative Records...</p>
        </div>
      ) : error ? (
        <div className="p-6 bg-red-50 dark:bg-red-900/20 text-red-600 rounded-2xl border border-red-200 dark:border-red-800/30">
          <div className="flex items-center gap-3 mb-2">
            <AlertTriangle className="w-6 h-6" />
            <h3 className="font-bold text-lg">Error Querying Live Data</h3>
          </div>
          <p>{error}</p>
        </div>
      ) : data ? (
        <div className="space-y-8">
          
          {/* Section: Workforce & People */}
          <div>
            <h3 className="text-lg font-bold text-black dark:text-white mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-500" />
              Workforce Overview
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {renderMetricCard(
                'Total Active Employees', 
                data.workforce.totalActive, 
                <Users className="w-5 h-5 text-blue-600" />, 
                'bg-blue-100 dark:bg-blue-900/30'
              )}
              {renderMetricCard(
                'Present Today', 
                data.workforce.presentToday, 
                <CheckCircle className="w-5 h-5 text-emerald-600" />, 
                'bg-emerald-100 dark:bg-emerald-900/30'
              )}
              {renderMetricCard(
                'On Leave', 
                data.workforce.onLeaveToday, 
                <FileText className="w-5 h-5 text-amber-600" />, 
                'bg-amber-100 dark:bg-amber-900/30'
              )}
              {renderMetricCard(
                'Absent / Exceptions', 
                data.workforce.absentToday + data.workforce.exceptions.length, 
                <AlertTriangle className="w-5 h-5 text-rose-600" />, 
                'bg-rose-100 dark:bg-rose-900/30',
                'WORKFORCE_EXCEPTIONS',
                data.workforce.exceptions
              )}
            </div>
          </div>

          {/* Section: Operations & Maintenance */}
          <div>
            <h3 className="text-lg font-bold text-black dark:text-white mb-4 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-indigo-500" />
              Operations & Incidents
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {renderMetricCard(
                'Open Incidents', 
                data.operations.openIncidents, 
                <AlertTriangle className="w-5 h-5 text-amber-600" />, 
                'bg-amber-100 dark:bg-amber-900/30',
                'OPERATIONS_INCIDENTS',
                data.operations.incidentDetails
              )}
              {renderMetricCard(
                'Critical Incidents', 
                data.operations.criticalIncidents, 
                <AlertTriangle className="w-5 h-5 text-rose-600" />, 
                'bg-rose-100 dark:bg-rose-900/30',
                'OPERATIONS_CRITICAL_INCIDENTS',
                data.operations.incidentDetails.filter(i => i.severity === 'CRITICAL')
              )}
              {renderMetricCard(
                'Open Work Orders', 
                data.operations.openWorkOrders, 
                <FileText className="w-5 h-5 text-blue-600" />, 
                'bg-blue-100 dark:bg-blue-900/30',
                'OPERATIONS_WORK_ORDERS',
                data.operations.workOrderDetails
              )}
              {renderMetricCard(
                'Overdue Work Orders', 
                data.operations.overdueWorkOrders, 
                <Clock className="w-5 h-5 text-rose-600" />, 
                'bg-rose-100 dark:bg-rose-900/30',
                'OPERATIONS_OVERDUE_WO',
                data.operations.workOrderDetails.filter(w => w.dueDate && new Date(w.dueDate).getTime() < Date.now())
              )}
            </div>
          </div>

          {/* Section: Compliance & Financial */}
          <div>
            <h3 className="text-lg font-bold text-black dark:text-white mb-4 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-500" />
              Compliance & Financial Exceptions
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {renderMetricCard(
                'Pending Approvals', 
                data.compliance.pendingApprovals, 
                <Clock className="w-5 h-5 text-amber-600" />, 
                'bg-amber-100 dark:bg-amber-900/30',
                'COMPLIANCE_APPROVALS',
                data.compliance.approvalDetails
              )}
              {renderMetricCard(
                'Overdue Audits', 
                data.compliance.overdueAudits, 
                <ShieldCheck className="w-5 h-5 text-rose-600" />, 
                'bg-rose-100 dark:bg-rose-900/30'
              )}
              {renderMetricCard(
                'Payroll Exceptions', 
                data.financial.payrollExceptions, 
                <DollarSign className="w-5 h-5 text-rose-600" />, 
                'bg-rose-100 dark:bg-rose-900/30'
              )}
              {renderMetricCard(
                'Contract Renewals (<30d)', 
                data.financial.contractRenewals, 
                <FileText className="w-5 h-5 text-amber-600" />, 
                'bg-amber-100 dark:bg-amber-900/30'
              )}
            </div>
          </div>

        </div>
      ) : null}
    
      {/* Drill-down Modal */}
      {drillDownModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 w-full max-w-4xl rounded-2xl shadow-xl flex flex-col max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-xl font-bold text-black dark:text-white">{drillDownModal.title}</h3>
              <button 
                onClick={() => setDrillDownModal({ isOpen: false, title: '', data: [] })}
                className="text-slate-400 hover:text-slate-600 dark:text-slate-400 dark:hover:text-slate-200"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto bg-white dark:bg-slate-950 dark:bg-slate-900/50 flex-1">
              {drillDownModal.data.length === 0 ? (
                <div className="text-center py-12 text-slate-500 dark:text-slate-400">No records found.</div>
              ) : (
                <div className="bg-white dark:bg-slate-900 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="bg-white dark:bg-slate-950 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                        <th className="p-3 font-semibold text-slate-600 dark:text-slate-400 dark:text-slate-300">ID / Ref</th>
                        <th className="p-3 font-semibold text-slate-600 dark:text-slate-400 dark:text-slate-300">Description</th>
                        <th className="p-3 font-semibold text-slate-600 dark:text-slate-400 dark:text-slate-300">Status</th>
                        <th className="p-3 font-semibold text-slate-600 dark:text-slate-400 dark:text-slate-300">Date / Timestamp</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {drillDownModal.data.map((row, i) => (
                        <tr key={i} className="hover:bg-white dark:bg-slate-950 dark:hover:bg-slate-800/30">
                          <td className="p-3 font-mono text-xs text-slate-500 dark:text-slate-400">{row.id || row.employeeId || 'N/A'}</td>
                          <td className="p-3 font-medium text-black dark:text-white truncate max-w-[200px]">
                            {row.title || row.taskName || row.name || row.type || 'N/A'}
                          </td>
                          <td className="p-3">
                            <span className="px-2 py-1 text-[11px] font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-full">
                              {row.status || row.severity || 'N/A'}
                            </span>
                          </td>
                          <td className="p-3 text-slate-500 dark:text-slate-400 text-xs">
                            {formatTimestamp(row.timestamp || row.reportedAt || row.createdAt || row.date || row.dueDate)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex justify-between items-center text-xs text-slate-500 dark:text-slate-400">
              <span>Showing {drillDownModal.data.length} records. Traceable to authoritative source.</span>
              <button 
                onClick={() => setDrillDownModal({ isOpen: false, title: '', data: [] })}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-900 dark:text-slate-300 rounded-lg font-medium transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
