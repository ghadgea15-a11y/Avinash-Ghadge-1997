import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  CheckCircle, AlertCircle, XCircle, RefreshCw, ChevronLeft, ShieldCheck, 
  Building, Users, UserCheck, Key, Shield, Layers, FileText
} from 'lucide-react';
import { CompanyTenant, UserSession } from '../../types';

interface SetupAuditScreenProps {
  userSession: UserSession;
  activeCompany: CompanyTenant;
  onClose?: () => void;
}

export const SetupAuditScreen: React.FC<SetupAuditScreenProps> = ({
  userSession,
  activeCompany,
  onClose
}) => {
  const [loading, setLoading] = useState(true);
  const [auditData, setAuditData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchAudit = async () => {
    setLoading(true);
    setError(null);
    try {
      // Assumes the token is available and passed automatically by fetch interceptor or similar
      const token = await userSession.token; // In this app, we usually use getAuth().currentUser?.getIdToken() if client, or pass token. 
      // Wait, let's see how api calls are made. Often using fetch with token.
      
      const response = await fetch(`/api/admin/audit/${activeCompany.companyId}`, {
        headers: {
          'Authorization': `Bearer ${userSession.token || ''}`,
          'Content-Type': 'application/json'
        }
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch audit data (Status ${response.status})`);
      }
      const data = await response.json();
      setAuditData(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAudit();
  }, [activeCompany.companyId]);

  if (userSession.role !== "SUPER_ADMIN" && userSession.role !== "COMPANY_ADMIN") {
    return (
      <div className="p-8 text-center text-red-500">
        Access Denied. Only A0/A1 can access the Audit Dashboard.
      </div>
    );
  }

  const renderStatusBadge = (status: string) => {
    if (status === 'PASS') return <span className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1"><CheckCircle className="w-3 h-3"/> PASS</span>;
    if (status === 'WARNING') return <span className="bg-amber-100 text-amber-700 px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1"><AlertCircle className="w-3 h-3"/> WARNING</span>;
    return <span className="bg-rose-100 text-rose-700 px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1"><XCircle className="w-3 h-3"/> FAIL</span>;
  };

  const renderCheckItem = (title: string, icon: any, checkData: any) => {
    if (!checkData) return null;
    const Icon = icon;
    const isFail = checkData.status === 'FAIL';
    
    return (
      <div className={`p-4 rounded-xl border ${isFail ? 'border-rose-200 bg-rose-50/50' : 'border-slate-200 bg-white'} mb-4 shadow-sm`}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${isFail ? 'bg-rose-100 text-rose-600' : 'bg-indigo-100 text-indigo-600'}`}>
              <Icon className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-slate-800">{title}</h3>
          </div>
          {renderStatusBadge(checkData.status)}
        </div>
        
        {checkData.fails && checkData.fails.length > 0 && (
          <div className="mt-3 pl-12">
            <h4 className="text-sm font-medium text-rose-700 mb-1">Failed Items ({checkData.fails.length}):</h4>
            <ul className="list-disc pl-4 space-y-1">
              {checkData.fails.map((msg: string, i: number) => (
                <li key={i} className="text-sm text-rose-600">{msg}</li>
              ))}
            </ul>
          </div>
        )}

        {checkData.warnings && checkData.warnings.length > 0 && (
          <div className="mt-3 pl-12">
            <h4 className="text-sm font-medium text-amber-700 mb-1">Warnings ({checkData.warnings.length}):</h4>
            <ul className="list-disc pl-4 space-y-1">
              {checkData.warnings.map((msg: string, i: number) => (
                <li key={i} className="text-sm text-amber-600">{msg}</li>
              ))}
            </ul>
          </div>
        )}
        
        {checkData.fails?.length === 0 && checkData.warnings?.length === 0 && (
          <div className="mt-2 pl-12 text-sm text-slate-500">
            All checks passed successfully.
          </div>
        )}
      </div>
    );
  };

  const allChecksPassed = auditData && 
    Object.keys(auditData)
      .filter(k => k !== 'coverageSummary')
      .every(k => auditData[k].status === 'PASS' || auditData[k].status === 'WARNING');

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-4">
          {onClose && (
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors">
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}
          <div>
            <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <ShieldCheck className="w-6 h-6 text-indigo-600" />
              Setup Cross-Check / Audit
            </h1>
            <p className="text-sm text-slate-500">
              Verifying organization hierarchy and account readiness for {activeCompany.name}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {auditData && (
            <div className={`px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 border ${allChecksPassed ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
              {allChecksPassed ? (
                <><CheckCircle className="w-4 h-4" /> Company Ready for Go-Live</>
              ) : (
                <><AlertCircle className="w-4 h-4" /> Go-Live Blocked (Resolve Fails)</>
              )}
            </div>
          )}
          <button 
            onClick={fetchAudit}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 shadow-sm"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Running Audit...' : 'Re-run Audit'}
          </button>
        </div>
      </div>

      <div className="p-6 max-w-5xl mx-auto">
        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-xl mb-6 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold">Error Running Audit</h3>
              <p className="text-sm">{error}</p>
            </div>
          </div>
        )}

        {loading && !auditData && (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500">
            <RefreshCw className="w-8 h-8 animate-spin text-indigo-500 mb-4" />
            <p>Running comprehensive setup checks...</p>
          </div>
        )}

        {auditData && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-2">
              <h2 className="text-lg font-bold text-slate-800 mb-4 px-2">Detailed Checks</h2>
              {renderCheckItem("1. Region Check", Building, auditData.regionCheck)}
              {renderCheckItem("2. Site Check", Building, auditData.siteCheck)}
              {renderCheckItem("3. Hierarchy Link Check", Layers, auditData.hierarchyLinkCheck)}
              {renderCheckItem("4. Department Check", FileText, auditData.departmentCheck)}
              {renderCheckItem("5. Claims Integrity Check", Shield, auditData.claimsIntegrityCheck)}
              {renderCheckItem("6. Duplicate / Orphan Check", Users, auditData.duplicateOrphanCheck)}
              {renderCheckItem("7. PIN / Credential Check", Key, auditData.pinCredentialCheck)}
            </div>
            
            <div>
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm sticky top-24">
                <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-indigo-600" />
                  Coverage Summary
                </h2>
                
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                      <div className="text-xs text-slate-500 mb-1">Total Regions</div>
                      <div className="text-xl font-bold text-slate-800">{auditData.coverageSummary.totalRegions}</div>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                      <div className="text-xs text-slate-500 mb-1">Total Sites</div>
                      <div className="text-xl font-bold text-slate-800">{auditData.coverageSummary.totalSites}</div>
                    </div>
                  </div>
                  
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <div className="text-xs text-slate-500 mb-1">Total Departments</div>
                    <div className="text-xl font-bold text-slate-800">{auditData.coverageSummary.totalDepartments}</div>
                  </div>

                  <div className="pt-4 border-t border-slate-100">
                    <h3 className="text-sm font-semibold text-slate-700 mb-3">Headcount by Level</h3>
                    <div className="space-y-2">
                      {[0,1,2,3,4,5,6,7,8,9].map(lvl => (
                        <div key={lvl} className="flex justify-between items-center text-sm">
                          <span className="text-slate-600 font-medium">A{lvl}</span>
                          <span className="text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md">
                            {auditData.coverageSummary[`totalA${lvl}`]}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
