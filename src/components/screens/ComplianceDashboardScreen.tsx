import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  FileText, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Search, 
  Filter, 
  Plus, 
  Eye, 
  Check, 
  X, 
  History, 
  Download, 
  AlertCircle, 
  RefreshCw, 
  Layers,
  Settings,
  Activity,
  ArrowUpRight,
  ChevronRight,
  ShieldCheck,
  Building2,
  Sliders
} from 'lucide-react';
import { 
  UserSession, 
  EmployeeDocumentRecord, 
  DocumentTypeConfig,
  DocumentStatus,
  CompliancePolicy,
  ComplianceViolationRecord,
  ComplianceEvaluationRecord,
  ComplianceMetricsSummary,
  PolicyModule,
  ComplianceSeverity,
  ViolationStatus
} from '../../types';
import { FirestoreService } from '../../services/firestoreService';
import { CompliancePolicyEngine } from '../../services/compliancePolicyEngine';
import { RiskManagementService } from '../../services/riskManagementService';
import { RiskMetricsSummary } from '../../types/risk';
import { DocumentTypeManager } from '../compliance/DocumentTypeManager';
import { PolicyManagerModal } from '../compliance/PolicyManagerModal';
import { ViolationDetailModal } from '../compliance/ViolationDetailModal';
import { motion, AnimatePresence } from 'motion/react';

interface ComplianceDashboardProps {
  userSession: UserSession;
}

type TabType = 'POSTURE' | 'VIOLATIONS' | 'POLICIES' | 'EVALUATIONS' | 'DOCUMENTS';

export function ComplianceDashboardScreen({ userSession }: ComplianceDashboardProps) {
  const [activeTab, setActiveTab] = useState<TabType>('POSTURE');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // GRC Data State
  const [metrics, setMetrics] = useState<ComplianceMetricsSummary | null>(null);
  const [riskMetrics, setRiskMetrics] = useState<RiskMetricsSummary | null>(null);
  const [policies, setPolicies] = useState<CompliancePolicy[]>([]);
  const [violations, setViolations] = useState<ComplianceViolationRecord[]>([]);
  const [evaluations, setEvaluations] = useState<ComplianceEvaluationRecord[]>([]);
  
  // Document Compliance State
  const [expiringDocs, setExpiringDocs] = useState<EmployeeDocumentRecord[]>([]);
  const [docTypes, setDocTypes] = useState<DocumentTypeConfig[]>([]);
  const [showTypeManager, setShowTypeManager] = useState(false);
  const [scanningDocs, setScanningDocs] = useState(false);

  // Filters & Search
  const [selectedModule, setSelectedModule] = useState<string>('ALL');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Modals
  const [policyModalOpen, setPolicyModalOpen] = useState(false);
  const [selectedPolicyForEdit, setSelectedPolicyForEdit] = useState<CompliancePolicy | null>(null);
  const [isSavingPolicy, setIsSavingPolicy] = useState(false);
  
  const [violationModalOpen, setViolationModalOpen] = useState(false);
  const [selectedViolation, setSelectedViolation] = useState<ComplianceViolationRecord | null>(null);

  const [versionDrawerPolicy, setVersionDrawerPolicy] = useState<CompliancePolicy | null>(null);
  const [policyVersions, setPolicyVersions] = useState<any[]>([]);

  useEffect(() => {
    loadAllData();
  }, [userSession.companyId]);

  const loadAllData = async () => {
    if (!userSession.companyId) return;
    setLoading(true);
    try {
      const [
        metricsData, 
        policiesData, 
        violationsData, 
        evalsData,
        typesData, 
        expiringData,
        riskData
      ] = await Promise.all([
        CompliancePolicyEngine.getComplianceMetrics(userSession.companyId),
        CompliancePolicyEngine.getPolicies(userSession.companyId),
        CompliancePolicyEngine.getViolations(userSession.companyId),
        CompliancePolicyEngine.getEvaluations(userSession.companyId, 100),
        FirestoreService.getDocumentTypes(userSession.companyId),
        FirestoreService.getExpiringDocuments(userSession.companyId, 90),
        RiskManagementService.getRiskMetrics(userSession, userSession.companyId)
      ]);

      setMetrics(metricsData);
      setPolicies(policiesData);
      setViolations(violationsData);
      setEvaluations(evalsData);
      setDocTypes(typesData);
      setExpiringDocs(expiringData);
      setRiskMetrics(riskData);
    } catch (err) {
      console.error('[ComplianceDashboardScreen] Error loading compliance data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadAllData();
  };

  const handleScanDocuments = async () => {
    setScanningDocs(true);
    try {
      const result = await FirestoreService.checkAndTriggerExpirations(userSession.companyId);
      alert(`Document Compliance Scan complete: ${result.alerted} alerts triggered across ${result.total} documents.`);
      await loadAllData();
    } catch (error) {
      console.error('Scan failed:', error);
    } finally {
      setScanningDocs(false);
    }
  };

  const handleSavePolicy = async (
    policyData: Partial<CompliancePolicy> & { name: string; module: PolicyModule; policyType: any },
    changeReason: string
  ) => {
    setIsSavingPolicy(true);
    try {
      await CompliancePolicyEngine.savePolicy(userSession, userSession.companyId, policyData, changeReason);
      await loadAllData();
      setPolicyModalOpen(false);
      setSelectedPolicyForEdit(null);
    } catch (err: any) {
      console.error('Save policy error:', err);
      alert(err.message || 'Failed to save policy');
    } finally {
      setIsSavingPolicy(false);
    }
  };

  const handleTogglePolicy = async (policy: CompliancePolicy) => {
    try {
      await CompliancePolicyEngine.togglePolicy(userSession, userSession.companyId, policy.id, !policy.enabled);
      await loadAllData();
    } catch (err: any) {
      alert(err.message || 'Failed to toggle policy');
    }
  };

  const handleViewVersions = async (policy: CompliancePolicy) => {
    setVersionDrawerPolicy(policy);
    const versions = await CompliancePolicyEngine.getPolicyVersions(userSession.companyId, policy.id);
    setPolicyVersions(versions);
  };

  const handleUpdateViolationStatus = async (
    violationId: string, 
    status: ViolationStatus, 
    notes: string, 
    remediationPlan?: string
  ) => {
    try {
      await CompliancePolicyEngine.updateViolationStatus(
        userSession, 
        userSession.companyId, 
        violationId, 
        status, 
        notes, 
        remediationPlan
      );
      await loadAllData();
    } catch (err: any) {
      alert(err.message || 'Failed to update violation status');
    }
  };

  const handleEscalateToBpm = async (violationId: string, remediationPlan: string) => {
    try {
      await CompliancePolicyEngine.escalateViolationToBpm(
        userSession, 
        userSession.companyId, 
        violationId, 
        remediationPlan
      );
      await loadAllData();
      alert('Violation escalated to BPM 9.1-9.4 remediation approval workflow.');
    } catch (err: any) {
      alert(err.message || 'Failed to escalate to BPM');
    }
  };

  // Filtered lists
  const filteredViolations = violations.filter(v => {
    if (selectedModule !== 'ALL' && v.module !== selectedModule) return false;
    if (selectedSeverity !== 'ALL' && v.severity !== selectedSeverity) return false;
    if (selectedStatus !== 'ALL' && v.status !== selectedStatus) return false;
    if (searchTerm) {
      const matchName = (v.policyName || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchEvidence = (v.evidence || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchEntity = (v.entityName || v.entityId || '').toLowerCase().includes(searchTerm.toLowerCase());
      if (!matchName && !matchEvidence && !matchEntity) return false;
    }
    return true;
  });

  const filteredPolicies = policies.filter(p => {
    if (selectedModule !== 'ALL' && p.module !== selectedModule) return false;
    if (selectedSeverity !== 'ALL' && p.severity !== selectedSeverity) return false;
    if (searchTerm) {
      const matchName = (p.name || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchDesc = (p.description || '').toLowerCase().includes(searchTerm.toLowerCase());
      if (!matchName && !matchDesc) return false;
    }
    return true;
  });

  const filteredEvaluations = evaluations.filter(e => {
    if (selectedModule !== 'ALL' && e.module !== selectedModule) return false;
    if (selectedSeverity !== 'ALL' && e.severity !== selectedSeverity) return false;
    if (searchTerm) {
      const matchName = (e.policyName || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchSub = (e.subjectName || e.subjectId || '').toLowerCase().includes(searchTerm.toLowerCase());
      if (!matchName && !matchSub) return false;
    }
    return true;
  });

  const getSeverityBadge = (sev: string) => {
    switch (sev) {
      case 'CRITICAL': return 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-800';
      case 'HIGH': return 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800';
      case 'MEDIUM': return 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800';
      default: return 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700';
    }
  };

  const getStatusBadge = (st: ViolationStatus) => {
    switch (st) {
      case 'RESOLVED': return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-200';
      case 'REMEDIATION': return 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 border-indigo-200';
      case 'UNDER_REVIEW': return 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border-amber-200';
      case 'FALSE_POSITIVE': return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-200';
      default: return 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border-rose-200';
    }
  };

  const getResultBadge = (res: string) => {
    switch (res) {
      case 'COMPLIANT': return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-200';
      case 'WARNING': return 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border-amber-200';
      case 'VIOLATION': return 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border-rose-200';
      default: return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200';
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900 overflow-hidden">
      {/* Top Header */}
      <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 py-4 flex-shrink-0">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 max-w-7xl mx-auto w-full">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-600 text-white shadow-md">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900 dark:text-white">
                  GRC — Compliance & Policy Enforcement
                </h1>
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                  Tenant Scoped
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Deterministic rule evaluation, statutory thresholds, violation lifecycle & BPM 9.1–9.4 remediation
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>

            {(userSession.role === 'SUPER_ADMIN' || userSession.role === 'COMPANY_ADMIN') && (
              <button
                onClick={() => {
                  setSelectedPolicyForEdit(null);
                  setPolicyModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors"
              >
                <Plus className="w-4 h-4" />
                New Policy
              </button>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-6 mt-4 border-t border-slate-200 dark:border-slate-700/60 pt-3 max-w-7xl mx-auto overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveTab('POSTURE')}
            className={`flex items-center gap-2 pb-2 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'POSTURE'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            <Activity className="w-4 h-4" />
            Compliance Posture
          </button>

          <button
            onClick={() => setActiveTab('VIOLATIONS')}
            className={`flex items-center gap-2 pb-2 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'VIOLATIONS'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            <ShieldAlert className="w-4 h-4" />
            Violations & Remediation
            {metrics && metrics.openViolationsCount > 0 && (
              <span className="ml-1 px-1.5 py-0.2 text-[10px] bg-rose-500 text-white rounded-full">
                {metrics.openViolationsCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('POLICIES')}
            className={`flex items-center gap-2 pb-2 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'POLICIES'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            <Layers className="w-4 h-4" />
            Policies & Rules ({policies.length})
          </button>

          <button
            onClick={() => setActiveTab('EVALUATIONS')}
            className={`flex items-center gap-2 pb-2 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'EVALUATIONS'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            <History className="w-4 h-4" />
            Evaluation Audit Stream
          </button>

          <button
            onClick={() => setActiveTab('DOCUMENTS')}
            className={`flex items-center gap-2 pb-2 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'DOCUMENTS'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            <FileText className="w-4 h-4" />
            Statutory Documents & Expiry
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="max-w-7xl mx-auto space-y-6">

          {/* TAB 1: COMPLIANCE POSTURE OVERVIEW */}
          {activeTab === 'POSTURE' && (
            <div className="space-y-6">
              {/* Top Key Metrics Banner */}
              <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
                {/* Score Dial */}
                <div className="col-span-2 p-5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between shadow-xs">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Overall Compliance Posture
                    </span>
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className="text-3xl font-black text-slate-900 dark:text-white">
                        {metrics ? `${metrics.overallComplianceScore}%` : '100%'}
                      </span>
                      <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                        {metrics && metrics.overallComplianceScore >= 90 ? 'Healthy' : 'Needs Action'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Deterministic calculation across all module rules
                    </p>
                  </div>
                  <div className="relative w-16 h-16 flex items-center justify-center">
                    <div className="w-14 h-14 rounded-full border-4 border-indigo-100 dark:border-indigo-950 flex items-center justify-center">
                      <ShieldCheck className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
                    </div>
                  </div>
                </div>

                {/* Active Policies */}
                <div className="p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                    Active Policies
                  </span>
                  <span className="text-2xl font-bold text-slate-900 dark:text-white block mt-1">
                    {metrics?.activePoliciesCount ?? 0}
                  </span>
                  <span className="text-[10px] text-slate-400 mt-1 block">Enforcing real transactions</span>
                </div>

                {/* Evaluations (30d) */}
                <div className="p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                    Total Evaluations
                  </span>
                  <span className="text-2xl font-bold text-slate-900 dark:text-white block mt-1">
                    {metrics?.totalEvaluationsCount ?? 0}
                  </span>
                  <span className="text-[10px] text-emerald-500 mt-1 block">Immutable audit logged</span>
                </div>

                {/* Open Violations */}
                <div className="p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                    Open Violations
                  </span>
                  <span className="text-2xl font-bold text-rose-600 dark:text-rose-400 block mt-1">
                    {metrics?.openViolationsCount ?? 0}
                  </span>
                  <span className="text-[10px] text-rose-500 mt-1 block">
                    {metrics?.criticalViolationsCount ?? 0} Critical / {metrics?.highViolationsCount ?? 0} High
                  </span>
                </div>

                {/* Overdue Remediation */}
                <div className="p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                    Overdue Remediation
                  </span>
                  <span className="text-2xl font-bold text-amber-600 dark:text-amber-400 block mt-1">
                    {metrics?.overdueRemediationCount ?? 0}
                  </span>
                  <span className="text-[10px] text-amber-500 mt-1 block">&gt; 7 Days Unresolved</span>
                </div>
              </div>

              {/* Module Health Grid */}
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 shadow-xs">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Layers className="w-4 h-4 text-indigo-500" />
                    Module Governance Breakdown
                  </h3>
                  <span className="text-xs text-slate-500">Real-Time Continuous Auditing</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {metrics && Object.entries(metrics.moduleBreakdown).map(([mod, data]) => (
                    <div key={mod} className="p-3.5 rounded-lg border border-slate-100 dark:border-slate-700/60 bg-slate-50/50 dark:bg-slate-800/40 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{mod}</span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          data.compliancePercentage >= 95 
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                            : data.compliancePercentage >= 80
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                              : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                        }`}>
                          {data.compliancePercentage}%
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${data.compliancePercentage >= 90 ? 'bg-emerald-500' : data.compliancePercentage >= 75 ? 'bg-amber-500' : 'bg-rose-500'}`}
                          style={{ width: `${data.compliancePercentage}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                        <span>{data.totalPolicies} Policies</span>
                        <span>{data.violations} Violations</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Site / Project Compliance Matrix */}
              {metrics && Object.keys(metrics.siteBreakdown).length > 0 && (
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 shadow-xs">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-3">
                    <Building2 className="w-4 h-4 text-indigo-500" />
                    Site & Project Unit Compliance
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {Object.entries(metrics.siteBreakdown).map(([siteKey, siteData]) => (
                      <div key={siteKey} className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                        <div>
                          <span className="text-xs font-semibold text-slate-900 dark:text-white block">
                            {siteData.siteName}
                          </span>
                          <span className="text-[10px] text-rose-500">{siteData.violations} open violations</span>
                        </div>
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                          {siteData.compliancePercentage}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: LIVE VIOLATIONS & REMEDIATION CENTER */}
          {activeTab === 'VIOLATIONS' && (
            <div className="space-y-4">
              {/* Filter Bar */}
              <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-2 flex-1 min-w-[240px]">
                  <Search className="w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    placeholder="Search violations by policy, employee, site, or evidence..."
                    className="w-full text-xs bg-transparent border-none focus:outline-none text-slate-900 dark:text-white"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={selectedModule}
                    onChange={e => setSelectedModule(e.target.value)}
                    className="text-xs bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg px-2.5 py-1.5 text-slate-800 dark:text-slate-200"
                  >
                    <option value="ALL">All Modules</option>
                    <option value="HCM">HCM</option>
                    <option value="WFM">WFM</option>
                    <option value="PAYROLL">PAYROLL</option>
                    <option value="OPERATIONS">OPERATIONS</option>
                    <option value="SCM">SCM</option>
                    <option value="SECURITY">SECURITY</option>
                  </select>

                  <select
                    value={selectedSeverity}
                    onChange={e => setSelectedSeverity(e.target.value)}
                    className="text-xs bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg px-2.5 py-1.5 text-slate-800 dark:text-slate-200"
                  >
                    <option value="ALL">All Severities</option>
                    <option value="CRITICAL">CRITICAL</option>
                    <option value="HIGH">HIGH</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="LOW">LOW</option>
                  </select>

                  <select
                    value={selectedStatus}
                    onChange={e => setSelectedStatus(e.target.value)}
                    className="text-xs bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg px-2.5 py-1.5 text-slate-800 dark:text-slate-200"
                  >
                    <option value="ALL">All Statuses</option>
                    <option value="DETECTED">DETECTED</option>
                    <option value="UNDER_REVIEW">UNDER REVIEW</option>
                    <option value="REMEDIATION">REMEDIATION</option>
                    <option value="RESOLVED">RESOLVED</option>
                    <option value="FALSE_POSITIVE">FALSE POSITIVE</option>
                  </select>
                </div>
              </div>

              {/* Violations Table / Cards */}
              {filteredViolations.length === 0 ? (
                <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                  <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2 opacity-80" />
                  <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">No Violations Found</h4>
                  <p className="text-xs text-slate-500 mt-1">All audited transactions are fully compliant with active policies.</p>
                </div>
              ) : (
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-slate-600 dark:text-slate-400">
                      <thead className="bg-slate-50 dark:bg-slate-800/80 text-[11px] font-bold uppercase text-slate-500 border-b border-slate-200 dark:border-slate-700">
                        <tr>
                          <th className="px-4 py-3">Severity & Policy</th>
                          <th className="px-4 py-3">Module / Entity</th>
                          <th className="px-4 py-3">Evidence & Conditions</th>
                          <th className="px-4 py-3">Detected</th>
                          <th className="px-4 py-3">Status</th>
                          <th className="px-4 py-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                        {filteredViolations.map(v => (
                          <tr key={v.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${getSeverityBadge(v.severity)}`}>
                                  {v.severity}
                                </span>
                                <span className="font-semibold text-slate-900 dark:text-white">
                                  {v.policyName}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span className="font-medium text-slate-800 dark:text-slate-200 block">
                                {v.entityName || v.entityId}
                              </span>
                              <span className="text-[10px] text-slate-400">
                                {v.module} • {v.entityType}
                              </span>
                            </td>
                            <td className="px-4 py-3 max-w-xs truncate">
                              <span className="text-slate-800 dark:text-slate-200 block truncate" title={v.evidence}>
                                {v.evidence}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-[11px] text-slate-500 whitespace-nowrap">
                              {new Date(v.detectedAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${getStatusBadge(v.status)}`}>
                                {v.status}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right whitespace-nowrap">
                              <button
                                onClick={() => {
                                  setSelectedViolation(v);
                                  setViolationModalOpen(true);
                                }}
                                className="px-2.5 py-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 rounded-lg transition-colors"
                              >
                                Review & Action
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: POLICIES & RULES ENGINE */}
          {activeTab === 'POLICIES' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Active Governance Policies ({filteredPolicies.length})
                  </h3>
                  <p className="text-xs text-slate-500">
                    Versioned policy configurations enforcing deterministic checks across all core business modules.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={selectedModule}
                    onChange={e => setSelectedModule(e.target.value)}
                    className="text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-800 dark:text-slate-200"
                  >
                    <option value="ALL">All Modules</option>
                    <option value="HCM">HCM</option>
                    <option value="WFM">WFM</option>
                    <option value="PAYROLL">PAYROLL</option>
                    <option value="OPERATIONS">OPERATIONS</option>
                    <option value="SCM">SCM</option>
                    <option value="SECURITY">SECURITY</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredPolicies.map(p => (
                  <div 
                    key={p.id} 
                    className={`p-5 rounded-xl border bg-white dark:bg-slate-800 shadow-xs space-y-3 ${
                      p.enabled ? 'border-slate-200 dark:border-slate-700' : 'border-slate-200 dark:border-slate-700 opacity-60'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${getSeverityBadge(p.severity)}`}>
                            {p.severity}
                          </span>
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                            {p.module}
                          </span>
                          <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-1.5 py-0.5 rounded">
                            v{p.version}
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                          {p.name}
                        </h4>
                      </div>

                      {/* Active Toggle Switch */}
                      <button
                        onClick={() => handleTogglePolicy(p)}
                        className={`text-xs font-bold px-2.5 py-1 rounded-full border transition-all ${
                          p.enabled 
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-300' 
                            : 'bg-slate-100 text-slate-500 border-slate-300 dark:bg-slate-800'
                        }`}
                      >
                        {p.enabled ? 'ACTIVE' : 'DISABLED'}
                      </button>
                    </div>

                    <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">
                      {p.description}
                    </p>

                    {/* Conditions preview */}
                    <div className="bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-lg border border-slate-100 dark:border-slate-700/60 text-xs space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Rule Conditions:</span>
                      {p.conditions.map((c, i) => (
                        <div key={i} className="text-slate-700 dark:text-slate-300 font-mono text-[11px]">
                          • {c.field} <span className="text-indigo-500 font-bold">{c.operator}</span> {String(c.value)}
                        </div>
                      ))}
                    </div>

                    {/* Actions & Version link */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-700/60 text-xs">
                      <button
                        onClick={() => handleViewVersions(p)}
                        className="text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-1 font-semibold"
                      >
                        <History className="w-3.5 h-3.5" />
                        Version History
                      </button>

                      <div className="flex items-center gap-2">
                        {(userSession.role === 'SUPER_ADMIN' || userSession.role === 'COMPANY_ADMIN') && (
                          <button
                            onClick={() => {
                              setSelectedPolicyForEdit(p);
                              setPolicyModalOpen(true);
                            }}
                            className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline"
                          >
                            Edit Policy
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: EVALUATION AUDIT STREAM */}
          {activeTab === 'EVALUATIONS' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Real-Time Evaluation Audit Stream
                  </h3>
                  <p className="text-xs text-slate-500">
                    Immutable chronological record of every transaction evaluated by the Compliance Policy Engine.
                  </p>
                </div>
              </div>

              {filteredEvaluations.length === 0 ? (
                <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                  <History className="w-10 h-10 text-slate-400 mx-auto mb-2 opacity-80" />
                  <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">No Evaluation Records Yet</h4>
                  <p className="text-xs text-slate-500 mt-1">Evaluations will automatically stream as attendance, payroll, SCM and security operations occur.</p>
                </div>
              ) : (
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-slate-600 dark:text-slate-400">
                      <thead className="bg-slate-50 dark:bg-slate-800/80 text-[11px] font-bold uppercase text-slate-500 border-b border-slate-200 dark:border-slate-700">
                        <tr>
                          <th className="px-4 py-3">Result</th>
                          <th className="px-4 py-3">Policy Evaluated</th>
                          <th className="px-4 py-3">Transaction / Subject</th>
                          <th className="px-4 py-3">Evidence</th>
                          <th className="px-4 py-3">Timestamp</th>
                          <th className="px-4 py-3">Correlation ID</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                        {filteredEvaluations.map(ev => (
                          <tr key={ev.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${getResultBadge(ev.result)}`}>
                                {ev.result}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className="font-semibold text-slate-900 dark:text-white block">
                                {ev.policyName}
                              </span>
                              <span className="text-[10px] text-slate-400">{ev.module}</span>
                            </td>
                            <td className="px-4 py-3">
                              <span className="font-medium text-slate-800 dark:text-slate-200 block">
                                {ev.subjectName || ev.subjectId}
                              </span>
                              <span className="text-[10px] text-slate-400">{ev.transactionType}</span>
                            </td>
                            <td className="px-4 py-3 max-w-xs truncate" title={ev.evidence}>
                              {ev.evidence}
                            </td>
                            <td className="px-4 py-3 text-[11px] text-slate-500 whitespace-nowrap">
                              {new Date(ev.timestamp).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </td>
                            <td className="px-4 py-3 font-mono text-[10px] text-slate-400 whitespace-nowrap">
                              {ev.correlationId}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 5: STATUTORY DOCUMENTS & EXPIRY SCANNER */}
          {activeTab === 'DOCUMENTS' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Employee Statutory Document Compliance
                  </h3>
                  <p className="text-xs text-slate-500">
                    Automated surveillance for Aadhaar, Police Verification, Medical Fitness, Driving Licenses and Contracts.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleScanDocuments}
                    disabled={scanningDocs}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-lg shadow-sm"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${scanningDocs ? 'animate-spin' : ''}`} />
                    Run Expiration Scan
                  </button>

                  <button
                    onClick={() => setShowTypeManager(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 rounded-lg"
                  >
                    <Settings className="w-3.5 h-3.5" />
                    Configure Doc Types
                  </button>
                </div>
              </div>

              {/* Expiring Documents List */}
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-xs">
                <div className="px-5 py-3 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Expiring Documents (Next 90 Days) ({expiringDocs.length})
                  </span>
                </div>

                {expiringDocs.length === 0 ? (
                  <div className="text-center py-10">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
                    <p className="text-xs text-slate-500">No documents expiring within the next 90 days.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-slate-600 dark:text-slate-400">
                      <thead className="bg-slate-50 dark:bg-slate-800/80 text-[11px] font-bold uppercase text-slate-500 border-b border-slate-200 dark:border-slate-700">
                        <tr>
                          <th className="px-4 py-3">Document Type</th>
                          <th className="px-4 py-3">Employee</th>
                          <th className="px-4 py-3">Document No</th>
                          <th className="px-4 py-3">Expiry Date</th>
                          <th className="px-4 py-3">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                        {expiringDocs.map(doc => {
                          const docAny = doc as any;
                          return (
                            <tr key={doc.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                              <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">
                                {docAny.documentTypeName || doc.documentTypeCode}
                              </td>
                              <td className="px-4 py-3">
                                {docAny.employeeName || doc.employeeId}
                              </td>
                              <td className="px-4 py-3 font-mono text-[11px]">
                                {doc.documentNumber || '—'}
                              </td>
                              <td className="px-4 py-3 text-slate-800 dark:text-slate-200 font-medium">
                                {doc.expiryDate || '—'}
                              </td>
                              <td className="px-4 py-3">
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                                  doc.status === 'EXPIRED' ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                                }`}>
                                  {doc.status}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Modals & Drawers */}
      <PolicyManagerModal
        isOpen={policyModalOpen}
        onClose={() => {
          setPolicyModalOpen(false);
          setSelectedPolicyForEdit(null);
        }}
        onSave={handleSavePolicy}
        initialPolicy={selectedPolicyForEdit}
        isSaving={isSavingPolicy}
      />

      <ViolationDetailModal
        isOpen={violationModalOpen}
        onClose={() => {
          setViolationModalOpen(false);
          setSelectedViolation(null);
        }}
        violation={selectedViolation}
        onUpdateStatus={handleUpdateViolationStatus}
        onEscalateToBpm={handleEscalateToBpm}
        userSession={userSession}
      />

      {/* Version History Drawer Modal */}
      {versionDrawerPolicy && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl w-full max-w-xl overflow-hidden max-h-[80vh] flex flex-col">
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-indigo-500" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Version History: {versionDrawerPolicy.name}
                </h3>
              </div>
              <button
                onClick={() => setVersionDrawerPolicy(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-3 flex-1 text-xs">
              {policyVersions.length === 0 ? (
                <p className="text-slate-500 text-center py-6">No historical versions recorded.</p>
              ) : (
                policyVersions.map(v => (
                  <div key={v.id} className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-indigo-600 dark:text-indigo-400">Version {v.version}</span>
                      <span className="text-[10px] text-slate-400">{new Date(v.changedAt).toLocaleString()}</span>
                    </div>
                    <p className="text-slate-800 dark:text-slate-200 font-medium">{v.changeReason}</p>
                    <span className="text-[10px] text-slate-500 block">Changed by: {v.changedByName || v.changedBy}</span>
                  </div>
                ))
              )}
            </div>

            <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-800 flex justify-end">
              <button
                onClick={() => setVersionDrawerPolicy(null)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 rounded"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Document Type Manager Modal */}
      {showTypeManager && (
        <DocumentTypeManager
          userSession={userSession}
          onClose={() => {
            setShowTypeManager(false);
            loadAllData();
          }}
          onUpdate={() => {
            loadAllData();
          }}
        />
      )}
    </div>
  );
}
