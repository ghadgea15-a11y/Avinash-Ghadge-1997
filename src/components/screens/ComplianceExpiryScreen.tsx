import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Calendar, 
  FileText, 
  Search, 
  Filter, 
  Plus, 
  UserX, 
  Bell, 
  AlertCircle,
  Ban
} from 'lucide-react';
import { UserSession, CompanyTenant } from '../../types';
import { 
  GuardComplianceDocument, 
  ExpiryNotificationAlert, 
  ComplianceDocType 
} from '../../types/complianceExpiry';
import { ComplianceExpiryService } from '../../services/complianceExpiryService';

interface ComplianceExpiryScreenProps {
  userSession: UserSession;
  activeCompany: CompanyTenant;
}

export const ComplianceExpiryScreen: React.FC<ComplianceExpiryScreenProps> = ({
  userSession,
  activeCompany
}) => {
  const companyId = activeCompany.companyId;
  const [documents, setDocuments] = useState<GuardComplianceDocument[]>([]);
  const [alerts, setAlerts] = useState<ExpiryNotificationAlert[]>([]);
  const [filterType, setFilterType] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Shift Pre-Validation Simulator
  const [testGuardId, setTestGuardId] = useState('EMP-001');
  const [isArmedPost, setIsArmedPost] = useState(false);
  const [validationResult, setValidationResult] = useState<any>(null);

  const loadData = () => {
    const docs = ComplianceExpiryService.getGuardDocuments(companyId);
    setDocuments(docs);
    const alertList = ComplianceExpiryService.getExpiryAlerts(companyId);
    setAlerts(alertList);
  };

  useEffect(() => {
    loadData();
  }, [companyId]);

  const handleTestEligibility = () => {
    const res = ComplianceExpiryService.validateGuardShiftEligibility(
      companyId,
      testGuardId,
      isArmedPost
    );
    setValidationResult(res);
  };

  const filteredDocs = documents.filter(d => {
    const matchesFilter = filterType === 'ALL' || d.renewalStatus === filterType || d.documentType === filterType;
    const matchesSearch = d.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          d.documentNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          d.employeeId.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div id="compliance-expiry-screen" className="flex-1 flex flex-col h-full bg-slate-50 dark:bg-slate-900 overflow-y-auto">
      {/* Top Header */}
      <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 py-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 text-xs font-bold uppercase tracking-wider bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-400 rounded">
                Module 4 Parity
              </span>
              <span className="text-xs text-slate-500">
                Belfry & Novagems Parity
              </span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white mt-1 flex items-center gap-2">
              <Shield className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              <span>Licensing & Certification Expiry Tracking</span>
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Automated 30/15/7-day alerts for PSARA, Arms Licenses & Police Clearances with strict shift scheduling blocking.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="px-3 py-1.5 bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900 rounded-lg text-xs font-bold flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
              {alerts.length} Critical Expiry Alerts
            </span>
          </div>
        </div>

        {/* Real-time Expiry Notification Bar */}
        {alerts.length > 0 && (
          <div className="mt-4 p-3.5 bg-rose-50/60 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 rounded-xl space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-rose-900 dark:text-rose-200">
              <span className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-rose-600" />
                Active Certification Expiry Escalations (Supervisor & HR Notified)
              </span>
              <span>30 / 15 / 7-Day Window</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {alerts.map(al => (
                <div key={al.id} className="p-2.5 bg-white dark:bg-slate-800 rounded-lg border border-rose-200 dark:border-rose-900/60 text-xs">
                  <div className="flex items-center justify-between font-semibold">
                    <span className="text-slate-900 dark:text-white">{al.employeeName}</span>
                    <span className={`px-1.5 py-0.2 text-[10px] font-bold rounded ${
                      al.urgencyLevel === 'CRITICAL' ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300' :
                      al.urgencyLevel === 'WARNING' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {al.daysRemaining <= 0 ? 'EXPIRED' : `${al.daysRemaining} Days Left`}
                    </span>
                  </div>
                  <div className="text-slate-500 text-[11px] mt-0.5">
                    {al.documentType.replace('_', ' ')} • Expires {al.expiryDate}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column 2-Spans: Document Register */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
            <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Search className="w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by guard name, ID or license #..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="text-xs bg-transparent border-none focus:outline-none text-slate-900 dark:text-white placeholder:text-slate-400 w-64"
                />
              </div>

              <div className="flex items-center gap-2">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="text-xs bg-slate-100 dark:bg-slate-700 border-none rounded px-2.5 py-1 text-slate-900 dark:text-white"
                >
                  <option value="ALL">All Documents & Statuses</option>
                  <option value="EXPIRED">Expired Only (Blocked)</option>
                  <option value="EXPIRING_7">Expiring in 7 Days (Critical)</option>
                  <option value="EXPIRING_15">Expiring in 15 Days</option>
                  <option value="EXPIRING_30">Expiring in 30 Days</option>
                  <option value="PSARA_LICENSE">PSARA Licenses</option>
                  <option value="ARMS_LICENSE">Arms Licenses</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 uppercase text-xs">
                  <tr>
                    <th className="px-4 py-3">Guard / ID</th>
                    <th className="px-4 py-3">Document Type</th>
                    <th className="px-4 py-3">License / Cert #</th>
                    <th className="px-4 py-3">Issuing Authority</th>
                    <th className="px-4 py-3">Expiry Date</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Deployment</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                  {filteredDocs.map(doc => (
                    <tr key={doc.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-750">
                      <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">
                        {doc.employeeName}
                        <span className="block text-[11px] font-normal text-slate-400">{doc.employeeId}</span>
                      </td>
                      <td className="px-4 py-3 text-xs font-medium text-slate-700 dark:text-slate-300">
                        {doc.documentType.replace('_', ' ')}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-600 dark:text-slate-400">
                        {doc.documentNumber}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">
                        {doc.issuingAuthority}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">
                        {doc.expiryDate}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 text-xs font-bold rounded ${
                          doc.renewalStatus === 'EXPIRED' ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300' :
                          doc.renewalStatus === 'EXPIRING_7' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300' :
                          doc.renewalStatus === 'EXPIRING_15' ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400' :
                          'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                        }`}>
                          {doc.renewalStatus}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {doc.renewalStatus === 'EXPIRED' ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600 dark:text-rose-400">
                            <Ban className="w-3 h-3" />
                            BLOCKED
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 className="w-3 h-3" />
                            Eligible
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column: Shift Scheduling Blocker Engine Simulator */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm space-y-4">
          <div className="border-b border-slate-200 dark:border-slate-700 pb-3">
            <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
              <Ban className="w-5 h-5 text-rose-600" />
              <span>Shift Deployment Eligibility Engine</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Simulates automated pre-shift compliance checks. Disallows scheduling expired guards.
            </p>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase block mb-1">
                Select Guard to Schedule
              </label>
              <select
                value={testGuardId}
                onChange={(e) => {
                  setTestGuardId(e.target.value);
                  setValidationResult(null);
                }}
                className="w-full text-xs font-medium px-3 py-2 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white"
              >
                <option value="EMP-001">Ramesh Kumar (EMP-001) - Expired PSARA</option>
                <option value="EMP-002">Suresh Patil (EMP-002) - Active PSARA, Expiring Arms</option>
                <option value="EMP-003">Vikram Singh (EMP-003) - Fully Compliant</option>
              </select>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="armed-post-check"
                checked={isArmedPost}
                onChange={(e) => {
                  setIsArmedPost(e.target.checked);
                  setValidationResult(null);
                }}
                className="w-4 h-4 rounded text-purple-600"
              />
              <label htmlFor="armed-post-check" className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Deploying to Armed Post (Requires Firearms License)
              </label>
            </div>

            <button
              onClick={handleTestEligibility}
              className="w-full py-2.5 px-4 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-lg shadow-sm flex items-center justify-center gap-2 transition-colors"
            >
              <Shield className="w-4 h-4" />
              <span>Verify Scheduling Eligibility</span>
            </button>

            {validationResult && (
              <div className={`p-4 rounded-xl border text-xs ${
                validationResult.allowed
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                  : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200'
              }`}>
                <div className="font-bold text-sm mb-1 flex items-center gap-2">
                  {validationResult.allowed ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Deployment Approved</span>
                    </>
                  ) : (
                    <>
                      <Ban className="w-4 h-4 text-rose-600" />
                      <span>Deployment Strictly Blocked</span>
                    </>
                  )}
                </div>
                <p className="mt-1 font-medium">{validationResult.blockReason || 'All required statutory certifications are active and verified.'}</p>
                {validationResult.details && (
                  <p className="mt-2 text-[11px] opacity-80">{validationResult.details}</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
