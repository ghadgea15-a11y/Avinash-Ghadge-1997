import React, { useState, useEffect, useCallback } from 'react';
import { 
  Building2, 
  MapPin, 
  GitBranch, 
  Layers, 
  Briefcase, 
  Users, 
  ShieldAlert, 
  CheckCircle2, 
  AlertCircle,
  RefreshCw,
  Award,
  GitPullRequest
} from 'lucide-react';
import { 
  UserSession, 
  CompanyTenant, 
  BranchRecord, 
  SiteRecord, 
  DepartmentRecord, 
  DesignationRecord, 
  UserMembershipRecord, 
  VendorRecord,
  CostCentreRecord
} from '../../types';
import { useTheme } from '../../context/ThemeContext';
import { FirestoreService } from '../../services/firestoreService';
import { ThresholdRuleManager } from '../bpm/ThresholdRuleManager';
import { CompanyProfileTab } from '../company/CompanyProfileTab';
import { CompanyBranchesTab } from '../company/CompanyBranchesTab';
import { CompanySitesTab } from '../company/CompanySitesTab';
import { CompanyDepartmentsTab } from '../company/CompanyDepartmentsTab';
import { CompanyDesignationsTab } from '../company/CompanyDesignationsTab';
import { CompanyMembershipsTab } from '../company/CompanyMembershipsTab';
import { CompanyVendorsTab } from '../company/CompanyVendorsTab';
import { CompanyCostCentresTab } from '../company/CompanyCostCentresTab';

interface CompanyManagementScreenProps {
  userSession: UserSession;
  activeCompany: CompanyTenant | null;
  onCompanyUpdated?: (updated: CompanyTenant) => void;
}

export const CompanyManagementScreen: React.FC<CompanyManagementScreenProps> = ({
  userSession,
  activeCompany,
  onCompanyUpdated
}) => {
  const { isDark } = useTheme();

  // Tab State
  const [activeTab, setActiveTab] = useState<
    'PROFILE' | 'BRANCHES' | 'SITES' | 'DEPARTMENTS' | 'DESIGNATIONS' | 'MEMBERSHIPS' | 'VENDORS' | 'COST_CENTRES' | 'BPM_RULES'
  >('PROFILE');

  // State Data
  const [tenantInfo, setTenantInfo] = useState<CompanyTenant | null>(activeCompany);
  const [branches, setBranches] = useState<BranchRecord[]>([]);
  const [sites, setSites] = useState<SiteRecord[]>([]);
  const [departments, setDepartments] = useState<DepartmentRecord[]>([]);
  const [designations, setDesignations] = useState<DesignationRecord[]>([]);
  const [memberships, setMemberships] = useState<UserMembershipRecord[]>([]);
  const [vendors, setVendors] = useState<VendorRecord[]>([]);
  const [costCentres, setCostCentres] = useState<CostCentreRecord[]>([]);

  // Interaction States
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const companyId = activeCompany?.companyId || userSession.companyId;

  const showSuccess = useCallback((msg: string) => {
    setSaveSuccess(msg);
    setErrorMessage(null);
    setTimeout(() => setSaveSuccess(null), 4000);
  }, []);

  const showError = useCallback((msg: string) => {
    setErrorMessage(msg);
    setSaveSuccess(null);
    setTimeout(() => setErrorMessage(null), 6000);
  }, []);

  // Load Data
  const loadData = useCallback(async (isSilent = false) => {
    if (!companyId) return;

    if (!isSilent) setLoading(true);
    else setRefreshing(true);

    try {
      const [comp, bList, sList, dList, desList, mList, vList, ccList] = await Promise.all([
        FirestoreService.getCompanyTenantDetails(companyId),
        FirestoreService.getBranches(companyId),
        FirestoreService.getSites(companyId),
        FirestoreService.getDepartments(companyId),
        FirestoreService.getDesignations(companyId),
        FirestoreService.getMemberships(companyId),
        FirestoreService.getVendors(companyId),
        FirestoreService.getCostCentres(companyId)
      ]);

      if (comp) setTenantInfo(comp);
      setBranches(bList || []);
      setSites(sList || []);
      setDepartments(dList || []);
      setDesignations(desList || []);
      setMemberships(mList || []);
      setVendors(vList || []);
      setCostCentres(ccList || []);
    } catch (err) {
      console.error('[CompanyManagementScreen] Error loading data:', err);
      showError('Failed to load company records from Firestore.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [companyId, showError]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Unauthorized Screen Guard
  const isAuthorized = 
    userSession.role === 'SUPER_ADMIN' || 
    userSession.role === 'COMPANY_ADMIN' ||
    userSession.role === 'HR_ADMIN' ||
    userSession.role === 'OPS_MANAGER';

  if (!isAuthorized) {
    return (
      <div className={`flex-1 p-6 flex flex-col items-center justify-center text-center ${isDark ? 'bg-slate-950 text-slate-100' : 'bg-white text-black'}`}>
        <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center mb-4">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold mb-2">Access Restricted (RBAC Protection)</h2>
        <p className="text-sm text-slate-400 max-w-md mb-6">
          You do not have administrative privilege to modify multi-tenant company settings. Only assigned <span className="font-semibold text-indigo-400">Company Admins</span> or <span className="font-semibold text-indigo-400">Super Admins</span> can access this module.
        </p>
        <div className={`px-4 py-2 rounded-xl text-xs font-mono ${isDark ? 'bg-slate-900 border-slate-800 text-slate-400' : 'bg-white border-slate-200 text-slate-600'} border`}>
          Your Current Role: <span className="font-bold text-amber-500">{userSession.role}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex-1 flex flex-col transition-colors duration-300 ${isDark ? 'bg-slate-950 text-slate-100' : 'bg-white text-black'} overflow-y-auto p-4 md:p-6 space-y-6`}>
      
      {/* Top Header Banner */}
      <div className={`p-5 rounded-2xl border ${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'} flex flex-col md:flex-row md:items-center justify-between gap-4`}>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-600/20 shrink-0">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold">{tenantInfo?.brandName || 'Company Administration'}</h1>
              <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                {tenantInfo?.licenseTier || 'ENTERPRISE'} TIER
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Tenant ID: <span className="font-mono text-indigo-400">{companyId}</span> • Legal: {tenantInfo?.companyLegalName || tenantInfo?.brandName || 'Registered Entity'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => loadData(true)}
            disabled={refreshing || loading}
            title="Reload all company records from Firestore"
            className={`p-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition ${isDark ? 'bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-300' : 'bg-slate-100 border-slate-200 hover:bg-slate-200 text-slate-700'}`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Active Tenant</span>
          </div>
        </div>
      </div>

      {/* Save Success / Error Toasts */}
      {saveSuccess && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{saveSuccess}</span>
        </div>
      )}
      {errorMessage && (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-medium flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Navigation Sub-Tabs */}
      <div className={`p-1 rounded-xl border flex flex-wrap gap-1 text-xs font-semibold ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-200/60 border-slate-200'}`}>
        <button
          onClick={() => setActiveTab('PROFILE')}
          className={`flex-1 min-w-[120px] py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition ${
            activeTab === 'PROFILE'
              ? 'bg-indigo-600 text-white shadow-md'
              : isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-600 hover:text-black hover:bg-white'
          }`}
        >
          <Building2 className="w-3.5 h-3.5" />
          <span className="whitespace-nowrap">Profile & Branding</span>
        </button>

        <button
          onClick={() => setActiveTab('BRANCHES')}
          className={`flex-1 min-w-[120px] py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition ${
            activeTab === 'BRANCHES'
              ? 'bg-indigo-600 text-white shadow-md'
              : isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-600 hover:text-black hover:bg-white'
          }`}
        >
          <GitBranch className="w-3.5 h-3.5" />
          <span className="whitespace-nowrap">Branches ({branches.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('SITES')}
          className={`flex-1 min-w-[120px] py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition ${
            activeTab === 'SITES'
              ? 'bg-indigo-600 text-white shadow-md'
              : isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-600 hover:text-black hover:bg-white'
          }`}
        >
          <MapPin className="w-3.5 h-3.5" />
          <span className="whitespace-nowrap">Sites ({sites.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('DEPARTMENTS')}
          className={`flex-1 min-w-[120px] py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition ${
            activeTab === 'DEPARTMENTS'
              ? 'bg-indigo-600 text-white shadow-md'
              : isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-600 hover:text-black hover:bg-white'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span className="whitespace-nowrap">Depts ({departments.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('DESIGNATIONS')}
          className={`flex-1 min-w-[120px] py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition ${
            activeTab === 'DESIGNATIONS'
              ? 'bg-indigo-600 text-white shadow-md'
              : isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-600 hover:text-black hover:bg-white'
          }`}
        >
          <Briefcase className="w-3.5 h-3.5" />
          <span className="whitespace-nowrap">Designations ({designations.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('MEMBERSHIPS')}
          className={`flex-1 min-w-[120px] py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition ${
            activeTab === 'MEMBERSHIPS'
              ? 'bg-indigo-600 text-white shadow-md'
              : isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-600 hover:text-black hover:bg-white'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span className="whitespace-nowrap">Members ({memberships.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('VENDORS')}
          className={`flex-1 min-w-[120px] py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition ${
            activeTab === 'VENDORS'
              ? 'bg-indigo-600 text-white shadow-md'
              : isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-600 hover:text-black hover:bg-white'
          }`}
        >
          <Building2 className="w-3.5 h-3.5" />
          <span className="whitespace-nowrap">Vendors ({vendors.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('COST_CENTRES')}
          className={`flex-1 min-w-[120px] py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition ${
            activeTab === 'COST_CENTRES'
              ? 'bg-indigo-600 text-white shadow-md'
              : isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-600 hover:text-black hover:bg-white'
          }`}
        >
          <Award className="w-3.5 h-3.5" />
          <span className="whitespace-nowrap">Cost Centres ({costCentres.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('BPM_RULES')}
          className={`flex-1 min-w-[120px] py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition ${
            activeTab === 'BPM_RULES'
              ? 'bg-indigo-600 text-white shadow-md'
              : isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-600 hover:text-black hover:bg-white'
          }`}
        >
          <GitPullRequest className="w-3.5 h-3.5" />
          <span className="whitespace-nowrap">Workflow Rules</span>
        </button>
      </div>

      {/* Tab Contents */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-400">
          <RefreshCw className="w-6 h-6 animate-spin text-indigo-500" />
          <p className="text-xs">Loading company organization records...</p>
        </div>
      ) : (
        <>
          {activeTab === 'PROFILE' && (
            <CompanyProfileTab
              tenantInfo={tenantInfo}
              setTenantInfo={setTenantInfo}
              onCompanyUpdated={onCompanyUpdated}
              onSuccess={showSuccess}
              onError={showError}
              isDark={isDark}
            />
          )}

          {activeTab === 'BRANCHES' && (
            <CompanyBranchesTab
              companyId={companyId}
              branches={branches}
              setBranches={setBranches}
              sites={sites}
              onSuccess={showSuccess}
              onError={showError}
              isDark={isDark}
            />
          )}

          {activeTab === 'SITES' && (
            <CompanySitesTab
              companyId={companyId}
              sites={sites}
              setSites={setSites}
              branches={branches}
              onSuccess={showSuccess}
              onError={showError}
              isDark={isDark}
            />
          )}

          {activeTab === 'DEPARTMENTS' && (
            <CompanyDepartmentsTab
              companyId={companyId}
              departments={departments}
              setDepartments={setDepartments}
              onSuccess={showSuccess}
              onError={showError}
              isDark={isDark}
            />
          )}

          {activeTab === 'DESIGNATIONS' && (
            <CompanyDesignationsTab
              companyId={companyId}
              designations={designations}
              setDesignations={setDesignations}
              onSuccess={showSuccess}
              onError={showError}
              isDark={isDark}
            />
          )}

          {activeTab === 'MEMBERSHIPS' && (
            <CompanyMembershipsTab
              companyId={companyId}
              userSession={userSession}
              memberships={memberships}
              setMemberships={setMemberships}
              branches={branches}
              onSuccess={showSuccess}
              onError={showError}
              isDark={isDark}
            />
          )}

          {activeTab === 'VENDORS' && (
            <CompanyVendorsTab
              companyId={companyId}
              vendors={vendors}
              setVendors={setVendors}
              onSuccess={showSuccess}
              onError={showError}
              isDark={isDark}
            />
          )}

          {activeTab === 'COST_CENTRES' && (
            <CompanyCostCentresTab
              companyId={companyId}
              costCentres={costCentres}
              setCostCentres={setCostCentres}
              onSuccess={showSuccess}
              onError={showError}
              isDark={isDark}
            />
          )}

          {activeTab === 'BPM_RULES' && (
            <ThresholdRuleManager 
              companyId={companyId} 
              session={userSession} 
            />
          )}
        </>
      )}
    </div>
  );
};
