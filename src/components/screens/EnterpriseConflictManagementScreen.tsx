import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  RotateCcw, 
  Play, 
  FileText, 
  Layers, 
  Clock, 
  Users, 
  MapPin, 
  ArrowRight, 
  Info, 
  Key, 
  RefreshCw, 
  Check, 
  ChevronRight,
  ShieldCheck,
  Building,
  Calendar,
  Lock
} from 'lucide-react';
import { UserSession, CompanyTenant } from '../../types';
import { 
  DetectedConflict, 
  ConflictAuditMetrics, 
  ConflictOverrideAuditRecord, 
  OverrideReasonCode 
} from '../../types/enterpriseConflict';
import { EnterpriseConflictEngine } from '../../services/enterpriseConflictEngine';
import { 
  EnterpriseConflictTestRunner, 
  EnterpriseConflictScenario 
} from '../../services/enterpriseConflictTestRunner';
import { motion, AnimatePresence } from 'motion/react';

interface Props {
  userSession: UserSession;
  activeCompany: CompanyTenant;
  isOnline: boolean;
}

export const EnterpriseConflictManagementScreen: React.FC<Props> = ({
  userSession,
  activeCompany,
  isOnline
}) => {
  const [activeTab, setActiveTab] = useState<'INCIDENTS' | 'TEST_SUITE' | 'OVERRIDES' | 'RULES'>('INCIDENTS');
  const [metrics, setMetrics] = useState<ConflictAuditMetrics | null>(null);
  const [overrides, setOverrides] = useState<ConflictOverrideAuditRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuditing, setIsAuditing] = useState(false);

  // Test Suite state
  const [scenarios, setScenarios] = useState<EnterpriseConflictScenario[]>([]);
  const [runningScenarioId, setRunningScenarioId] = useState<string | null>(null);
  const [isBatchRunning, setIsBatchRunning] = useState(false);

  // Override Modal state
  const [selectedConflictForOverride, setSelectedConflictForOverride] = useState<DetectedConflict | null>(null);
  const [overrideReasonCategory, setOverrideReasonCategory] = useState<OverrideReasonCode>('BUSINESS_CRITICAL_RELIEF');
  const [overrideJustification, setOverrideJustification] = useState('');
  const [overrideSubmitting, setOverrideSubmitting] = useState(false);
  const [overrideError, setOverrideError] = useState<string | null>(null);
  const [overrideSuccess, setOverrideSuccess] = useState<string | null>(null);

  // Load audit data & standard scenarios
  const refreshAuditData = async () => {
    setIsAuditing(true);
    try {
      const data = await EnterpriseConflictEngine.performHolisticAudit(activeCompany.companyId);
      setMetrics(data);
      const activeOvr = await EnterpriseConflictEngine.getActiveOverrides(activeCompany.companyId);
      setOverrides(activeOvr);
    } catch (err) {
      console.error('Error fetching conflict audit data:', err);
    } finally {
      setIsAuditing(false);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setScenarios(EnterpriseConflictTestRunner.getStandardScenarios());
    refreshAuditData();
  }, [activeCompany.companyId]);

  // Execute single scenario
  const handleRunScenario = async (scenarioId: string) => {
    setRunningScenarioId(scenarioId);
    try {
      const updated = await EnterpriseConflictTestRunner.runScenario(scenarioId);
      setScenarios(prev => prev.map(s => s.id === scenarioId ? updated : s));
    } catch (e) {
      console.error('Scenario execution error:', e);
    } finally {
      setRunningScenarioId(null);
    }
  };

  // Execute all scenarios
  const handleRunAllScenarios = async () => {
    setIsBatchRunning(true);
    try {
      const updatedList = await EnterpriseConflictTestRunner.runAllScenarios();
      setScenarios(updatedList);
    } catch (e) {
      console.error('Batch scenario execution error:', e);
    } finally {
      setIsBatchRunning(false);
    }
  };

  // Submit authorized override
  const handleAuthorizeOverride = async () => {
    if (!selectedConflictForOverride) return;
    setOverrideError(null);
    setOverrideSubmitting(true);

    try {
      await EnterpriseConflictEngine.recordAuthorizedOverride(
        activeCompany.companyId,
        userSession,
        selectedConflictForOverride,
        {
          reasonCategory: overrideReasonCategory,
          justification: overrideJustification
        }
      );

      setOverrideSuccess(`Controlled Override authorized for ${selectedConflictForOverride.employeeName}. Transaction unlocked.`);
      setTimeout(() => {
        setSelectedConflictForOverride(null);
        setOverrideJustification('');
        setOverrideSuccess(null);
        refreshAuditData();
      }, 1500);
    } catch (err: any) {
      setOverrideError(err.message || 'Failed to authorize override.');
    } finally {
      setOverrideSubmitting(false);
    }
  };

  const isAuthorizedRole = ['SUPER_ADMIN', 'COMPANY_ADMIN', 'OPS_MANAGER', 'HR_ADMIN'].includes(userSession.role);

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/50 flex items-center justify-center text-rose-600 dark:text-rose-400">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              Enterprise Conflict Detection & Resolution
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Deterministic operational conflict prevention, transaction blocking, and controlled override governance.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={refreshAuditData}
            disabled={isAuditing}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${isAuditing ? 'animate-spin text-rose-500' : ''}`} />
            {isAuditing ? 'Auditing Enterprise...' : 'Run Organization Audit'}
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex justify-between items-center text-slate-500 text-xs font-medium uppercase tracking-wider">
            <span>Audited Transactions</span>
            <Layers className="w-4 h-4 text-indigo-500" />
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-2">
            {metrics?.totalAuditedTransactions ?? 0}
          </p>
          <span className="text-xs text-slate-400 mt-1 block">Active personnel & roster records</span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex justify-between items-center text-slate-500 text-xs font-medium uppercase tracking-wider">
            <span>Critical Blockers</span>
            <XCircle className="w-4 h-4 text-rose-500" />
          </div>
          <p className="text-2xl font-bold text-rose-600 dark:text-rose-400 mt-2">
            {metrics?.criticalBlockedCount ?? 0}
          </p>
          <span className="text-xs text-rose-500/80 mt-1 block">Transactions blocked from database</span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex justify-between items-center text-slate-500 text-xs font-medium uppercase tracking-wider">
            <span>Controlled Overrides</span>
            <ShieldCheck className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-2">
            {overrides.length}
          </p>
          <span className="text-xs text-amber-600/80 mt-1 block">Manager-authorized audited exceptions</span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex justify-between items-center text-slate-500 text-xs font-medium uppercase tracking-wider">
            <span>Enforcement Engine</span>
            <Lock className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-2">
            STRICT
          </p>
          <span className="text-xs text-emerald-600/80 mt-1 block">Backend + Logic Validation Active</span>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 space-x-4">
        <button
          onClick={() => setActiveTab('INCIDENTS')}
          className={`pb-3 px-2 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'INCIDENTS'
              ? 'border-rose-600 text-rose-600 dark:text-rose-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'
          }`}
        >
          <AlertTriangle className="w-4 h-4" />
          Live Incidents & Violations
          {metrics && metrics.criticalBlockedCount > 0 && (
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400">
              {metrics.criticalBlockedCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('TEST_SUITE')}
          className={`pb-3 px-2 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'TEST_SUITE'
              ? 'border-rose-600 text-rose-600 dark:text-rose-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'
          }`}
        >
          <Play className="w-4 h-4" />
          Scenario Test Suite (FAIL ➔ PASS)
        </button>

        <button
          onClick={() => setActiveTab('OVERRIDES')}
          className={`pb-3 px-2 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'OVERRIDES'
              ? 'border-rose-600 text-rose-600 dark:text-rose-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'
          }`}
        >
          <FileText className="w-4 h-4" />
          Authorized Override Vault ({overrides.length})
        </button>

        <button
          onClick={() => setActiveTab('RULES')}
          className={`pb-3 px-2 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'RULES'
              ? 'border-rose-600 text-rose-600 dark:text-rose-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'
          }`}
        >
          <Info className="w-4 h-4" />
          Conflict Policy Governance
        </button>
      </div>

      {/* TAB 1: LIVE CONFLICT INCIDENTS */}
      {activeTab === 'INCIDENTS' && (
        <div className="space-y-4">
          {metrics && metrics.recentIncidents.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 p-12 rounded-2xl border border-slate-200 dark:border-slate-800 text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mx-auto mb-4">
                <CheckCircle className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Zero Active Operational Conflicts</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1">
                All personnel assignments, shift rosters, transfer requests, and Segregation of Duties matrices are currently 100% compliant.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {metrics?.recentIncidents.map(conflict => (
                <div 
                  key={conflict.id}
                  className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4"
                >
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                    <div className="flex items-center gap-3">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 ${
                        conflict.severity === 'CRITICAL_BLOCKING'
                          ? 'bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900'
                          : 'bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-900'
                      }`}>
                        <XCircle className="w-3.5 h-3.5" />
                        {conflict.severity === 'CRITICAL_BLOCKING' ? 'CRITICAL BLOCKED' : 'HIGH EXCEPTION'}
                      </span>
                      <span className="text-xs font-mono text-slate-400">
                        {conflict.ruleCode}
                      </span>
                      <span className="text-xs font-medium text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                        {conflict.category.replace(/_/g, ' ')}
                      </span>
                    </div>

                    <div className="text-xs text-slate-400">
                      Detected: {new Date(conflict.detectedAt).toLocaleTimeString()}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      {conflict.title}
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
                      {conflict.reason}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-100 dark:border-slate-800 font-mono">
                      {conflict.detailedExplanation}
                    </p>
                  </div>

                  {/* Conflicting Context Details */}
                  {conflict.conflictingContext && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl text-xs">
                      {conflict.conflictingContext.siteA && (
                        <div>
                          <span className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Assignment A:</span>
                          <span className="text-slate-500">Site: {conflict.conflictingContext.siteA.name}</span>
                          {conflict.conflictingContext.shiftA && (
                            <span className="block text-slate-500">Shift: {conflict.conflictingContext.shiftA.name} ({conflict.conflictingContext.shiftA.timeWindow})</span>
                          )}
                        </div>
                      )}
                      {conflict.conflictingContext.siteB && (
                        <div>
                          <span className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Conflicting Counterpart:</span>
                          <span className="text-slate-500">Site: {conflict.conflictingContext.siteB.name}</span>
                          {conflict.conflictingContext.shiftB && (
                            <span className="block text-slate-500">Shift: {conflict.conflictingContext.shiftB.name} ({conflict.conflictingContext.shiftB.timeWindow})</span>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Resolution and Actions */}
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <div className="text-xs text-slate-500">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">Target Personnel: </span>
                      {conflict.employeeName} ({conflict.employeeId})
                    </div>

                    <div className="flex items-center gap-2">
                      {conflict.isOverrideAllowed && isAuthorizedRole && (
                        <button
                          onClick={() => setSelectedConflictForOverride(conflict)}
                          className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors shadow-sm"
                        >
                          <ShieldCheck className="w-3.5 h-3.5" />
                          Grant Controlled Override
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: SCENARIO TEST SUITE (FAIL ➔ FIX ➔ RETEST ➔ REGRESSION ➔ PASS) */}
      {activeTab === 'TEST_SUITE' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900 text-white p-6 rounded-2xl">
            <div>
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Play className="w-5 h-5 text-rose-400" />
                Enterprise Conflict Scenario Simulator
              </h2>
              <p className="text-xs text-slate-400 mt-1 max-w-xl">
                Rigorous test runner proving real employee assignment conflict detection through the mandatory 
                <strong className="text-rose-400"> FAIL ➔ FIX ➔ RETEST ➔ REGRESSION ➔ PASS </strong> lifecycle.
              </p>
            </div>

            <button
              onClick={handleRunAllScenarios}
              disabled={isBatchRunning}
              className="px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl flex items-center gap-2 transition-colors shadow-lg shadow-rose-900/30"
            >
              <RotateCcw className={`w-4 h-4 ${isBatchRunning ? 'animate-spin' : ''}`} />
              {isBatchRunning ? 'Executing Full Suite...' : 'Run All 6 Enterprise Scenarios'}
            </button>
          </div>

          <div className="grid grid-cols-1 gap-6">
            {scenarios.map(scenario => (
              <div 
                key={scenario.id}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden"
              >
                <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 px-2 py-0.5 rounded">
                        {scenario.category}
                      </span>
                      <h3 className="text-base font-bold text-slate-900 dark:text-white">
                        {scenario.title}
                      </h3>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      {scenario.description}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 ${
                      scenario.overallStatus === 'PASS'
                        ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900'
                        : scenario.overallStatus === 'RUNNING'
                          ? 'bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 animate-pulse'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                    }`}>
                      {scenario.overallStatus === 'PASS' && <CheckCircle className="w-3.5 h-3.5" />}
                      {scenario.overallStatus === 'RUNNING' && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                      {scenario.overallStatus === 'IDLE' && <Clock className="w-3.5 h-3.5" />}
                      {scenario.overallStatus}
                    </span>

                    <button
                      onClick={() => handleRunScenario(scenario.id)}
                      disabled={runningScenarioId === scenario.id || isBatchRunning}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors"
                    >
                      <Play className="w-3.5 h-3.5 text-rose-500" />
                      Run Scenario
                    </button>
                  </div>
                </div>

                {/* Steps Execution Stepper */}
                <div className="p-5 space-y-4 bg-slate-50/50 dark:bg-slate-900/50">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {scenario.steps.map(step => (
                      <div 
                        key={step.stepNumber}
                        className={`p-4 rounded-xl border transition-all ${
                          step.status === 'PASS'
                            ? 'bg-white dark:bg-slate-900 border-emerald-200 dark:border-emerald-900 shadow-sm'
                            : step.status === 'RUNNING'
                              ? 'bg-white dark:bg-slate-900 border-indigo-300 dark:border-indigo-800 shadow-sm'
                              : 'bg-slate-100/60 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800'
                        }`}
                      >
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-xs font-bold text-slate-500">
                            STEP {step.stepNumber}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            step.status === 'PASS' 
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400' 
                              : 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                          }`}>
                            {step.status}
                          </span>
                        </div>

                        <h4 className="text-xs font-bold text-slate-900 dark:text-white mb-1">
                          {step.name}
                        </h4>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-3">
                          {step.actionDescription}
                        </p>

                        <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800 text-[10px] font-mono text-slate-600 dark:text-slate-300">
                          {step.executionLog}
                        </div>
                      </div>
                    ))}
                  </div>

                  {scenario.summary && (
                    <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 rounded-xl text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 flex-shrink-0" />
                      <span>{scenario.summary}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: AUTHORIZED OVERRIDES VAULT */}
      {activeTab === 'OVERRIDES' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-amber-500" />
              Controlled Operational Overrides Audit Ledger
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Immutable register of high-level management exceptions granted for critical business operations with statutory justification.
            </p>
          </div>

          {overrides.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 p-10 rounded-2xl border border-slate-200 dark:border-slate-800 text-center">
              <Key className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">No Overrides Granted</h4>
              <p className="text-xs text-slate-400 mt-1">Zero bypass exceptions have been authorized.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {overrides.map(rec => (
                <div 
                  key={rec.id}
                  className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3"
                >
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400 font-mono text-xs font-bold rounded">
                        {rec.override.reasonCategory}
                      </span>
                      <span className="text-xs font-bold text-slate-900 dark:text-white">
                        {rec.conflict.title}
                      </span>
                    </div>

                    <span className="text-xs text-slate-400 font-mono">
                      {new Date(rec.createdAt).toLocaleString()}
                    </span>
                  </div>

                  <div className="text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                    <strong className="text-slate-700 dark:text-slate-200">Justification: </strong>
                    {rec.override.justification}
                  </div>

                  <div className="flex flex-wrap items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <div>
                      <span>Authorizer: </span>
                      <strong className="text-slate-700 dark:text-slate-300">{rec.override.approverName}</strong> ({rec.override.approverRole})
                    </div>
                    <div>
                      <span>Target Personnel: </span>
                      <strong className="text-slate-700 dark:text-slate-300">{rec.conflict.employeeName}</strong>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: CONFLICT POLICY GOVERNANCE RULES */}
      {activeTab === 'RULES' && (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-6">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Enterprise Conflict Governance Rules
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Authoritative validation matrix enforced across both Web and Android clients.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-rose-600 dark:text-rose-400">CONF-ROSTER-001</span>
                <span className="text-[10px] font-bold px-2 py-0.5 bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400 rounded">CRITICAL BLOCKING</span>
              </div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">Overlapping Shifts Time Collision</h4>
              <p className="text-xs text-slate-500">Calculates exact time window intersection [S1, E1] ∩ [S2, E2]. Blocks if overlap &gt; 0 mins.</p>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-rose-600 dark:text-rose-400">CONF-SITE-001</span>
                <span className="text-[10px] font-bold px-2 py-0.5 bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400 rounded">CRITICAL BLOCKING</span>
              </div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">Impossible Multi-Site Transit Window</h4>
              <p className="text-xs text-slate-500">Prevents assigning same employee to geographically distinct sites without mandatory 30-min transit buffer.</p>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-rose-600 dark:text-rose-400">CONF-SOD-001</span>
                <span className="text-[10px] font-bold px-2 py-0.5 bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400 rounded">CRITICAL BLOCKING</span>
              </div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">Segregation of Duties (SoD) Maker-Checker</h4>
              <p className="text-xs text-slate-500">Forbids granting both Muster Logging (Maker) and Payroll Certification (Checker) to same individual.</p>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-rose-600 dark:text-rose-400">CONF-SUP-002</span>
                <span className="text-[10px] font-bold px-2 py-0.5 bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400 rounded">CRITICAL BLOCKING</span>
              </div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">Circular Supervisor Hierarchy Loop</h4>
              <p className="text-xs text-slate-500">Detects cyclic reporting chains (A ➔ B ➔ A) preventing deadlock in approvals and appraisal routing.</p>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-rose-600 dark:text-rose-400">CONF-XFER-001</span>
                <span className="text-[10px] font-bold px-2 py-0.5 bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400 rounded">CRITICAL BLOCKING</span>
              </div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">Pre-Hire Transfer Date Violation</h4>
              <p className="text-xs text-slate-500">Blocks transfers with effective dates preceding the official statutory joining date.</p>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-rose-600 dark:text-rose-400">CONF-EMP-001</span>
                <span className="text-[10px] font-bold px-2 py-0.5 bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400 rounded">CRITICAL BLOCKING</span>
              </div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">Duplicate Active National ID Credentials</h4>
              <p className="text-xs text-slate-500">Prevents creating duplicate active personnel records sharing Aadhaar / PAN identity numbers.</p>
            </div>
          </div>
        </div>
      )}

      {/* Controlled Override Modal */}
      <AnimatePresence>
        {selectedConflictForOverride && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                <div className="flex items-center gap-2.5">
                  <ShieldCheck className="w-6 h-6 text-amber-500" />
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    Authorize Controlled Conflict Override
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedConflictForOverride(null)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  ✕
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-xs text-amber-800 dark:text-amber-300">
                  <strong>Warning:</strong> You are granting an executive exception for rule <strong>{selectedConflictForOverride.ruleCode}</strong> ({selectedConflictForOverride.title}) on personnel <strong>{selectedConflictForOverride.employeeName}</strong>. This event is recorded permanently in the compliance audit trail.
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Reason Category
                  </label>
                  <select
                    value={overrideReasonCategory}
                    onChange={(e) => setOverrideReasonCategory(e.target.value as OverrideReasonCode)}
                    className="w-full text-xs font-semibold px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none"
                  >
                    <option value="BUSINESS_CRITICAL_RELIEF">Business Critical Relief Deployment</option>
                    <option value="EMERGENCY_DISASTER_RECOVERY">Emergency Disaster Recovery Handover</option>
                    <option value="OFFICIAL_DUAL_POSTING">Official Multi-Site Dual Posting Authorization</option>
                    <option value="EXECUTIVE_AUTHORIZED_TEMPORARY">Executive Authorized Temporary Exception</option>
                    <option value="SYSTEM_RECONCILIATION">System Historical Reconciliation</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Operational Justification (Mandatory ≥ 20 chars)
                  </label>
                  <textarea
                    rows={3}
                    value={overrideJustification}
                    onChange={(e) => setOverrideJustification(e.target.value)}
                    placeholder="Provide specific operational reason and authorization reference..."
                    className="w-full text-xs px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none resize-none"
                  />
                  <span className="text-[10px] text-slate-400">
                    Characters: {overrideJustification.length} / 20 required
                  </span>
                </div>

                {overrideError && (
                  <p className="text-xs text-rose-500 bg-rose-50 dark:bg-rose-950 p-2 rounded-lg">
                    {overrideError}
                  </p>
                )}

                {overrideSuccess && (
                  <p className="text-xs text-emerald-600 bg-emerald-50 dark:bg-emerald-950 p-2 rounded-lg flex items-center gap-1.5">
                    <Check className="w-4 h-4" /> {overrideSuccess}
                  </p>
                )}
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
                <button
                  onClick={() => setSelectedConflictForOverride(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAuthorizeOverride}
                  disabled={overrideSubmitting || overrideJustification.trim().length < 20}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-colors shadow-sm flex items-center gap-1.5"
                >
                  {overrideSubmitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                  Confirm Authorized Override
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
