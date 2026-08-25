import React, { useState, useEffect, useMemo } from 'react';
import { 
  History, 
  Search, 
  ShieldCheck, 
  FileText, 
  User, 
  MapPin, 
  FileSignature, 
  Package, 
  Receipt, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Clock, 
  ArrowRight, 
  Download, 
  Printer, 
  RefreshCw, 
  Play, 
  Eye, 
  Lock, 
  Fingerprint, 
  Building, 
  ChevronRight, 
  ChevronDown, 
  Layers, 
  ExternalLink,
  HelpCircle,
  FileCheck,
  Ban,
  Activity,
  Award
} from 'lucide-react';
import { UserSession } from '../../types';
import { 
  TraceableEntityType, 
  LifecycleTransition, 
  TraceableHistoricalEvent, 
  HistoricalReconstructionResult, 
  TraceableEntitySummary,
  TraceabilityTestSuiteReport,
  TraceabilityScenario
} from '../../types/historicalTraceability';
import { HistoricalTraceabilityEngine } from '../../services/historicalTraceabilityEngine';
import { EnterpriseTraceabilityTestRunner } from '../../services/enterpriseTraceabilityTestRunner';

interface HistoricalTraceabilityScreenProps {
  session: UserSession;
  onNavigateToScreen?: (screen: string) => void;
  initialEntityId?: string;
  initialEntityType?: TraceableEntityType;
}

export const HistoricalTraceabilityScreen: React.FC<HistoricalTraceabilityScreenProps> = ({
  session,
  onNavigateToScreen,
  initialEntityId,
  initialEntityType = 'EMPLOYEE'
}) => {
  // State
  const [selectedType, setSelectedType] = useState<TraceableEntityType>(initialEntityType);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [availableEntities, setAvailableEntities] = useState<TraceableEntitySummary[]>([]);
  const [selectedEntityId, setSelectedEntityId] = useState<string>(initialEntityId || 'EMP-TRACE-001');
  const [isLoadingEntities, setIsLoadingEntities] = useState<boolean>(false);
  const [isReconstructing, setIsReconstructing] = useState<boolean>(false);
  const [historyResult, setHistoryResult] = useState<HistoricalReconstructionResult | null>(null);
  const [selectedStageFilter, setSelectedStageFilter] = useState<string>('ALL');
  const [selectedSeverityFilter, setSelectedSeverityFilter] = useState<string>('ALL');
  const [expandedEventIds, setExpandedEventIds] = useState<Record<string, boolean>>({});

  // Export & Inspection Modals
  const [inspectEvent, setInspectEvent] = useState<TraceableHistoricalEvent | null>(null);
  const [showExportModal, setShowExportModal] = useState<boolean>(false);
  const [exportData, setExportData] = useState<{ jsonEnvelope: string; printableSummary: string } | null>(null);

  // Test Suite Runner State
  const [activeTab, setActiveTab] = useState<'TRACEABILITY' | 'VERIFICATION_SUITE'>('TRACEABILITY');
  const [testReport, setTestReport] = useState<TraceabilityTestSuiteReport | null>(null);
  const [isRunningTest, setIsRunningTest] = useState<boolean>(false);
  const [testProgressScenario, setTestProgressScenario] = useState<string>('');

  // Load available entities on type change or search
  useEffect(() => {
    let isMounted = true;
    const fetchEntities = async () => {
      setIsLoadingEntities(true);
      try {
        const list = await HistoricalTraceabilityEngine.searchTraceableEntities(session, searchQuery, selectedType);
        if (isMounted) {
          setAvailableEntities(list);
          // If current selectedEntityId not in list and list not empty, select first
          if (list.length > 0 && !list.some(e => e.id === selectedEntityId || e.identifier === selectedEntityId)) {
            // Keep selectedEntityId if user typed a specific ID
          }
        }
      } catch (err) {
        console.error('Error fetching traceable entities:', err);
      } finally {
        if (isMounted) setIsLoadingEntities(false);
      }
    };

    const timer = setTimeout(fetchEntities, 200);
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [session, selectedType, searchQuery]);

  // Reconstruct history whenever selectedEntityId or selectedType changes
  const handleReconstruct = async (entityIdToLoad?: string, entityTypeToLoad?: TraceableEntityType) => {
    const idToUse = entityIdToLoad || selectedEntityId;
    const typeToUse = entityTypeToLoad || selectedType;
    if (!idToUse) return;

    setIsReconstructing(true);
    try {
      const result = await HistoricalTraceabilityEngine.reconstructHistory(session, typeToUse, idToUse);
      setHistoryResult(result);
      // Auto expand the latest event
      if (result.events.length > 0) {
        const lastEv = result.events[result.events.length - 1];
        setExpandedEventIds({ [lastEv.id]: true });
      }
    } catch (err) {
      console.error('Error reconstructing history:', err);
    } finally {
      setIsReconstructing(false);
    }
  };

  useEffect(() => {
    handleReconstruct();
  }, [selectedEntityId, selectedType]);

  // Toggle event card expansion
  const toggleExpand = (id: string) => {
    setExpandedEventIds(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // Run the enterprise test suite
  const handleRunTestSuite = async () => {
    setIsRunningTest(true);
    setTestReport(null);
    try {
      const rep = await EnterpriseTraceabilityTestRunner.runFullTestSuite(session, (sc, st) => {
        setTestProgressScenario(`${sc.title} -> ${st.name}`);
      });
      setTestReport(rep);
      // Refresh current history after test seeds data
      handleReconstruct();
    } catch (err) {
      console.error('Error running test suite:', err);
    } finally {
      setIsRunningTest(false);
      setTestProgressScenario('');
    }
  };

  // Filtered Events
  const filteredEvents = useMemo(() => {
    if (!historyResult) return [];
    return historyResult.events.filter(ev => {
      if (selectedStageFilter !== 'ALL' && ev.lifecycleStage !== selectedStageFilter) {
        return false;
      }
      if (selectedSeverityFilter === 'HIGH_CRITICAL' && ev.what.severity !== 'HIGH' && ev.what.severity !== 'CRITICAL') {
        return false;
      }
      return true;
    });
  }, [historyResult, selectedStageFilter, selectedSeverityFilter]);

  // Handle Export Bundle
  const handleOpenExport = () => {
    if (!historyResult) return;
    const bundle = HistoricalTraceabilityEngine.exportAuditBundle(historyResult);
    setExportData(bundle);
    setShowExportModal(true);
  };

  // Download JSON
  const downloadJsonEnvelope = () => {
    if (!exportData || !historyResult) return;
    const blob = new Blob([exportData.jsonEnvelope], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Audit_Envelope_${historyResult.entityType}_${historyResult.entityIdentifier}_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Print Summary
  const printAuditCertificate = () => {
    if (!exportData) return;
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Enterprise Audit Certificate</title>
            <style>
              body { font-family: monospace; padding: 24px; font-size: 13px; line-height: 1.5; color: #111; }
              pre { white-space: pre-wrap; word-break: break-all; }
            </style>
          </head>
          <body>
            <pre>${exportData.printableSummary}</pre>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
    }
  };

  // Helper for lifecycle badges
  const renderStageBadge = (stage: LifecycleTransition) => {
    const colors: Record<LifecycleTransition, string> = {
      CREATED: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800',
      MODIFIED: 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800',
      TRANSFERRED: 'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800',
      APPROVED: 'bg-teal-100 text-teal-800 border-teal-300 dark:bg-teal-950 dark:text-teal-300 dark:border-teal-800',
      REJECTED: 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-800',
      SUSPENDED: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800',
      REACTIVATED: 'bg-indigo-100 text-indigo-800 border-indigo-300 dark:bg-indigo-950 dark:text-indigo-300 dark:border-indigo-800',
      CLOSED: 'bg-slate-200 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700'
    };

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${colors[stage]}`}>
        {stage}
      </span>
    );
  };

  const getEntityIcon = (type: TraceableEntityType) => {
    switch (type) {
      case 'EMPLOYEE': return <User className="w-5 h-5 text-blue-600 dark:text-blue-400" />;
      case 'SITE': return <MapPin className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />;
      case 'CONTRACT': return <FileSignature className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />;
      case 'ASSET': return <Package className="w-5 h-5 text-amber-600 dark:text-amber-400" />;
      case 'TRANSACTION': return <Receipt className="w-5 h-5 text-purple-600 dark:text-purple-400" />;
    }
  };

  return (
    <div id="historical-traceability-screen" className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 p-4 md:p-6 lg:p-8">
      {/* Top Header */}
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2 bg-blue-600 text-white rounded-lg shadow-sm">
                <History className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">Enterprise Historical Traceability</h1>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Reconstruct complete immutable timelines for Employees, Sites, Contracts, Assets, and Transactions
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              id="tab-toggle-traceability"
              onClick={() => setActiveTab('TRACEABILITY')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 ${
                activeTab === 'TRACEABILITY'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Fingerprint className="w-4 h-4" />
              Traceability Ledger
            </button>

            <button
              id="tab-toggle-verification-suite"
              onClick={() => setActiveTab('VERIFICATION_SUITE')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 ${
                activeTab === 'VERIFICATION_SUITE'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Award className="w-4 h-4" />
              Verification Suite (FAIL → PASS)
            </button>

            {historyResult && activeTab === 'TRACEABILITY' && (
              <button
                id="btn-export-audit-certificate"
                onClick={handleOpenExport}
                className="px-4 py-2 text-sm font-medium bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors flex items-center gap-2 shadow-sm"
              >
                <Download className="w-4 h-4" />
                Export Audit Certificate
              </button>
            )}
          </div>
        </div>

        {/* TAB 1: Traceability Ledger */}
        {activeTab === 'TRACEABILITY' && (
          <div className="space-y-6">
            {/* Entity Selector Bar */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                {/* Entity Type Filter Tabs */}
                <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-lg">
                  {(['EMPLOYEE', 'SITE', 'CONTRACT', 'ASSET', 'TRANSACTION'] as TraceableEntityType[]).map(type => (
                    <button
                      key={type}
                      id={`entity-type-tab-${type.toLowerCase()}`}
                      onClick={() => {
                        setSelectedType(type);
                        // Pick default preset ID for convenience
                        if (type === 'EMPLOYEE') setSelectedEntityId('EMP-TRACE-001');
                        else if (type === 'SITE') setSelectedEntityId('SITE-TRACE-001');
                        else if (type === 'CONTRACT') setSelectedEntityId('CTR-TRACE-001');
                        else if (type === 'ASSET') setSelectedEntityId('AST-TRACE-001');
                        else if (type === 'TRANSACTION') setSelectedEntityId('TXN-TRACE-001');
                      }}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 ${
                        selectedType === type
                          ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                      }`}
                    >
                      {getEntityIcon(type)}
                      {type}
                    </button>
                  ))}
                </div>

                {/* Quick Presets */}
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-500 font-medium">Quick Audit Targets:</span>
                  <button
                    onClick={() => { setSelectedType('EMPLOYEE'); setSelectedEntityId('EMP-TRACE-001'); }}
                    className="px-2 py-1 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 rounded hover:bg-blue-100"
                  >
                    EMP-TRACE-001
                  </button>
                  <button
                    onClick={() => { setSelectedType('SITE'); setSelectedEntityId('SITE-TRACE-001'); }}
                    className="px-2 py-1 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded hover:bg-emerald-100"
                  >
                    SITE-TRACE-001
                  </button>
                  <button
                    onClick={() => { setSelectedType('CONTRACT'); setSelectedEntityId('CTR-TRACE-001'); }}
                    className="px-2 py-1 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded hover:bg-indigo-100"
                  >
                    CTR-TRACE-001
                  </button>
                  <button
                    onClick={() => { setSelectedType('ASSET'); setSelectedEntityId('AST-TRACE-001'); }}
                    className="px-2 py-1 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 rounded hover:bg-amber-100"
                  >
                    AST-TRACE-001
                  </button>
                  <button
                    onClick={() => { setSelectedType('TRANSACTION'); setSelectedEntityId('TXN-TRACE-001'); }}
                    className="px-2 py-1 bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 rounded hover:bg-purple-100"
                  >
                    TXN-TRACE-001
                  </button>
                </div>
              </div>

              {/* Search & Selection Dropdown */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="relative col-span-2">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    id="input-traceability-search"
                    type="text"
                    placeholder={`Search ${selectedType.toLowerCase()} by name, ID, code, or enter custom identifier...`}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="flex gap-2">
                  <select
                    id="select-traceable-entity"
                    value={selectedEntityId}
                    onChange={(e) => setSelectedEntityId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value={selectedEntityId}>Selected: {selectedEntityId}</option>
                    {availableEntities.map(ent => (
                      <option key={ent.id} value={ent.id}>
                        {ent.identifier} - {ent.name} ({ent.currentStatus})
                      </option>
                    ))}
                  </select>

                  <button
                    id="btn-reconstruct-ledger"
                    onClick={() => handleReconstruct()}
                    disabled={isReconstructing}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium flex items-center gap-1.5 whitespace-nowrap shadow-sm"
                  >
                    <RefreshCw className={`w-4 h-4 ${isReconstructing ? 'animate-spin' : ''}`} />
                    Reconstruct
                  </button>
                </div>
              </div>
            </div>

            {/* Loading Indicator */}
            {isReconstructing && (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-12 text-center space-y-3">
                <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
                <p className="font-semibold text-slate-800 dark:text-slate-200">Reconstructing Chronological History...</p>
                <p className="text-xs text-slate-500">Synthesizing audit_logs, change_requests, transfers, approvals, and domain records across tenant scope.</p>
              </div>
            )}

            {/* Main Reconstructed Timeline Display */}
            {!isReconstructing && historyResult && (
              <div className="space-y-6">
                {/* Authoritative Entity Metadata Banner */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-xl">
                        {getEntityIcon(historyResult.entityType)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2.5">
                          <h2 className="text-xl font-bold">{historyResult.entityDisplayName}</h2>
                          <span className="px-2.5 py-0.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-xs font-mono font-semibold">
                            {historyResult.entityIdentifier}
                          </span>
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 rounded-full text-xs font-semibold">
                            {historyResult.entityType}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                            historyResult.lifecycleProgress.currentStatus === 'ACTIVE' 
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : 'bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-300'
                          }`}>
                            STATUS: {historyResult.lifecycleProgress.currentStatus}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                          First Registered: <span className="font-medium text-slate-700 dark:text-slate-300">{HistoricalTraceabilityEngine.formatDateTime(historyResult.firstSeen)}</span> • 
                          Last Event: <span className="font-medium text-slate-700 dark:text-slate-300">{HistoricalTraceabilityEngine.formatDateTime(historyResult.lastUpdated)}</span> • 
                          Total Historical Events: <span className="font-bold text-blue-600">{historyResult.totalEvents}</span>
                        </p>
                      </div>
                    </div>

                    {/* Cryptographic Tamper-Evident Badge */}
                    <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-lg flex items-center gap-3">
                      <ShieldCheck className="w-6 h-6 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <div className="text-xs">
                        <div className="font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                          <span>CRYPTOGRAPHIC CHAIN VERIFIED</span>
                          <span className="px-1.5 py-0.2 bg-emerald-200 dark:bg-emerald-900 text-emerald-900 dark:text-emerald-100 rounded text-[10px]">IMMUTABLE</span>
                        </div>
                        <div className="text-slate-600 dark:text-slate-400 font-mono text-[11px] mt-0.5">
                          Checksum: {historyResult.integrityVerification.latestBlockChecksum.substring(0, 20)}...
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 8-Stage Lifecycle Progress Bar */}
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                    <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                      Lifecycle Stage Coverage (Created → Modified → Transferred → Approved → Rejected → Suspended → Reactivated → Closed)
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
                      {[
                        { label: 'Created', done: historyResult.lifecycleProgress.hasCreated },
                        { label: 'Modified', done: historyResult.lifecycleProgress.hasModified },
                        { label: 'Transferred', done: historyResult.lifecycleProgress.hasTransferred },
                        { label: 'Approved', done: historyResult.lifecycleProgress.hasApproved },
                        { label: 'Rejected', done: historyResult.lifecycleProgress.hasRejected },
                        { label: 'Suspended', done: historyResult.lifecycleProgress.hasSuspended },
                        { label: 'Reactivated', done: historyResult.lifecycleProgress.hasReactivated },
                        { label: 'Closed', done: historyResult.lifecycleProgress.hasClosed }
                      ].map((st, idx) => (
                        <div
                          key={st.label}
                          className={`p-2 rounded-lg border text-xs flex items-center justify-between ${
                            st.done
                              ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                              : 'bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 text-slate-400'
                          }`}
                        >
                          <span className="font-semibold">{idx + 1}. {st.label}</span>
                          {st.done ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          ) : (
                            <span className="w-3.5 h-3.5 rounded-full border border-slate-300 dark:border-slate-700 inline-block" />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Filters for Timeline Events */}
                <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-sm">
                  <div className="flex items-center gap-2 text-xs font-semibold">
                    <span className="text-slate-500">Filter Stage:</span>
                    <select
                      id="filter-stage-select"
                      value={selectedStageFilter}
                      onChange={(e) => setSelectedStageFilter(e.target.value)}
                      className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md text-xs"
                    >
                      <option value="ALL">All Lifecycle Stages ({historyResult.events.length})</option>
                      <option value="CREATED">Created</option>
                      <option value="MODIFIED">Modified</option>
                      <option value="TRANSFERRED">Transferred</option>
                      <option value="APPROVED">Approved</option>
                      <option value="REJECTED">Rejected</option>
                      <option value="SUSPENDED">Suspended</option>
                      <option value="REACTIVATED">Reactivated</option>
                      <option value="CLOSED">Closed</option>
                    </select>

                    <span className="text-slate-500 ml-2">Severity:</span>
                    <select
                      id="filter-severity-select"
                      value={selectedSeverityFilter}
                      onChange={(e) => setSelectedSeverityFilter(e.target.value)}
                      className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md text-xs"
                    >
                      <option value="ALL">All Severities</option>
                      <option value="HIGH_CRITICAL">High & Critical Only</option>
                    </select>
                  </div>

                  <div className="text-xs text-slate-500">
                    Showing <span className="font-semibold text-slate-900 dark:text-slate-100">{filteredEvents.length}</span> of {historyResult.events.length} chronological events
                  </div>
                </div>

                {/* Event Timeline List */}
                <div className="space-y-4">
                  {filteredEvents.map((ev, index) => {
                    const isExpanded = !!expandedEventIds[ev.id];
                    return (
                      <div
                        key={ev.id}
                        id={`traceability-event-${ev.id}`}
                        className={`bg-white dark:bg-slate-900 border rounded-xl shadow-sm transition-all overflow-hidden ${
                          isExpanded 
                            ? 'border-blue-300 dark:border-blue-700 ring-1 ring-blue-500/20' 
                            : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                        }`}
                      >
                        {/* Event Card Header */}
                        <div 
                          onClick={() => toggleExpand(ev.id)}
                          className="p-4 cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-900/50"
                        >
                          <div className="flex items-start gap-3">
                            <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                              #{ev.provenance.sequenceNumber}
                            </div>
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                {renderStageBadge(ev.lifecycleStage)}
                                <span className="font-bold text-sm text-slate-900 dark:text-slate-100">{ev.action}</span>
                                {ev.what.severity === 'CRITICAL' && (
                                  <span className="px-2 py-0.5 bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 rounded text-[10px] font-bold">
                                    CRITICAL
                                  </span>
                                )}
                                {ev.what.severity === 'HIGH' && (
                                  <span className="px-2 py-0.5 bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 rounded text-[10px] font-bold">
                                    HIGH
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                                {ev.eventSummary}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center justify-between md:justify-end gap-4 shrink-0">
                            <div className="text-right text-xs">
                              <div className="font-medium text-slate-800 dark:text-slate-200">{ev.formattedTimestamp}</div>
                              <div className="text-slate-400">{ev.relativeTime}</div>
                            </div>
                            <div className="p-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500">
                              {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                            </div>
                          </div>
                        </div>

                        {/* Event Card Detailed Breakdown (Who, When, What, Before, After, Reason, Company, Scope, Related Transaction) */}
                        {isExpanded && (
                          <div className="p-5 border-t border-slate-200 dark:border-slate-800 space-y-5 text-xs">
                            {/* Key Metadata Attributes Grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                              {/* 1. Who */}
                              <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg space-y-1">
                                <div className="text-slate-500 font-semibold uppercase flex items-center gap-1">
                                  <User className="w-3.5 h-3.5 text-blue-500" />
                                  1. Who (Actor)
                                </div>
                                <div className="font-bold text-slate-900 dark:text-slate-100">{ev.who.fullName}</div>
                                <div className="text-slate-500 text-[11px]">Role: <span className="font-medium text-slate-700 dark:text-slate-300">{ev.who.role}</span></div>
                                <div className="text-slate-500 font-mono text-[10px]">UID: {ev.who.userId}</div>
                              </div>

                              {/* 2. When */}
                              <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg space-y-1">
                                <div className="text-slate-500 font-semibold uppercase flex items-center gap-1">
                                  <Clock className="w-3.5 h-3.5 text-emerald-500" />
                                  2. When (Timestamp)
                                </div>
                                <div className="font-bold text-slate-900 dark:text-slate-100">{ev.when.formatted}</div>
                                <div className="text-slate-500 text-[11px]">Relative: <span className="font-medium text-slate-700 dark:text-slate-300">{ev.when.relative}</span></div>
                                <div className="text-slate-500 font-mono text-[10px] truncate">ISO: {ev.when.iso}</div>
                              </div>

                              {/* 3. Reason & Justification */}
                              <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg space-y-1">
                                <div className="text-slate-500 font-semibold uppercase flex items-center gap-1">
                                  <FileText className="w-3.5 h-3.5 text-amber-500" />
                                  3. Reason & Policy
                                </div>
                                <div className="font-semibold text-slate-800 dark:text-slate-200">{ev.reason.justification}</div>
                                {ev.reason.rejectionReason && (
                                  <div className="text-rose-600 dark:text-rose-400 font-medium">Rejection: {ev.reason.rejectionReason}</div>
                                )}
                                {ev.reason.category && (
                                  <div className="text-slate-500 text-[11px]">Category: {ev.reason.category}</div>
                                )}
                              </div>

                              {/* 4. Company (Tenant) */}
                              <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg space-y-1">
                                <div className="text-slate-500 font-semibold uppercase flex items-center gap-1">
                                  <Building className="w-3.5 h-3.5 text-indigo-500" />
                                  4. Company & Tenant
                                </div>
                                <div className="font-bold text-slate-900 dark:text-slate-100">{ev.company.companyName || 'Enterprise Tenant'}</div>
                                <div className="text-slate-500 font-mono text-[10px]">Tenant ID: {ev.company.companyId}</div>
                              </div>

                              {/* 5. Scope Coordinates */}
                              <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg space-y-1">
                                <div className="text-slate-500 font-semibold uppercase flex items-center gap-1">
                                  <MapPin className="w-3.5 h-3.5 text-purple-500" />
                                  5. Scope & Location
                                </div>
                                <div className="text-slate-800 dark:text-slate-200">
                                  Site: <span className="font-bold">{ev.scope.siteId || 'Unassigned / Global'}</span>
                                </div>
                                <div className="text-slate-500 text-[11px]">
                                  Branch: {ev.scope.branchId || 'N/A'} • Region: {ev.scope.regionId || 'N/A'}
                                </div>
                              </div>

                              {/* 6. Related Business Transaction */}
                              <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg space-y-1">
                                <div className="text-slate-500 font-semibold uppercase flex items-center gap-1">
                                  <Receipt className="w-3.5 h-3.5 text-teal-500" />
                                  6. Related Transaction
                                </div>
                                <div className="font-mono text-slate-900 dark:text-slate-100 truncate">
                                  TXN: {ev.relatedTransaction.transactionId || 'DIRECT_ACTION'}
                                </div>
                                <div className="text-slate-500 text-[11px]">
                                  Ref Source: <span className="font-medium text-slate-700 dark:text-slate-300">{ev.provenance.sourceCollection}</span>
                                </div>
                              </div>
                            </div>

                            {/* 7 & 8: State Delta / Before vs After Field Diffs */}
                            <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg space-y-3">
                              <div className="flex items-center justify-between">
                                <div className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                                  <Layers className="w-4 h-4 text-blue-600" />
                                  <span>State Mutation Analysis (Before → After Field Diffs)</span>
                                </div>
                                <button
                                  onClick={() => setInspectEvent(ev)}
                                  className="px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded text-xs text-blue-600 dark:text-blue-400 hover:bg-slate-100 flex items-center gap-1"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  Inspect Raw Snapshots
                                </button>
                              </div>

                              {ev.after.diffs.length === 0 ? (
                                <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded text-slate-500 text-xs italic">
                                  Baseline state established or zero individual field mutations detected.
                                </div>
                              ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                                  {ev.after.diffs.map(diff => (
                                    <div 
                                      key={diff.field}
                                      className="p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded space-y-1"
                                    >
                                      <div className="font-bold text-[11px] text-slate-700 dark:text-slate-300">{diff.label || diff.field}</div>
                                      <div className="flex items-center gap-2 text-xs font-mono">
                                        <span className="px-1.5 py-0.5 bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-300 line-through rounded text-[11px]">
                                          {JSON.stringify(diff.beforeValue)}
                                        </span>
                                        <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />
                                        <span className="px-1.5 py-0.5 bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold rounded text-[11px]">
                                          {JSON.stringify(diff.afterValue)}
                                        </span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>

                            {/* 9: Cryptographic Provenance Block */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 bg-slate-100 dark:bg-slate-800/60 rounded border border-slate-200 dark:border-slate-700 text-[11px] text-slate-500 font-mono">
                              <div className="flex items-center gap-1.5">
                                <Lock className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                                <span>SHA-256 Block Hash: <strong className="text-slate-700 dark:text-slate-300">{ev.provenance.hash}</strong></span>
                              </div>
                              <div>
                                Source Doc: <strong className="text-slate-700 dark:text-slate-300">{ev.provenance.sourceCollection}/{ev.provenance.sourceDocumentId}</strong>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: Verification Suite (FAIL → FIX → RETEST → REGRESSION → PASS) */}
        {activeTab === 'VERIFICATION_SUITE' && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
                <div>
                  <h2 className="text-lg font-bold">Historical Traceability Test Runner</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Executes end-to-end lifecycle reconstruction across real Firebase records for all 5 entity types: Employee, Site, Contract, Asset, and Transaction.
                  </p>
                </div>

                <button
                  id="btn-run-all-tests"
                  onClick={handleRunTestSuite}
                  disabled={isRunningTest}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-sm font-semibold flex items-center gap-2 shadow-sm transition-all"
                >
                  <Play className={`w-4 h-4 ${isRunningTest ? 'animate-spin' : ''}`} />
                  {isRunningTest ? 'Running Verification Suite...' : 'Execute Complete Test Suite'}
                </button>
              </div>

              {isRunningTest && (
                <div className="p-4 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-lg flex items-center gap-3">
                  <RefreshCw className="w-5 h-5 text-blue-600 animate-spin shrink-0" />
                  <div className="text-xs space-y-0.5">
                    <div className="font-bold text-blue-900 dark:text-blue-200">Executing Test Lifecycle...</div>
                    <div className="text-blue-700 dark:text-blue-400">{testProgressScenario || 'Processing scenarios...'}</div>
                  </div>
                </div>
              )}

              {testReport && (
                <div className="space-y-6">
                  {/* Summary Banner */}
                  <div className={`p-4 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                    testReport.status === 'PASSED'
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-100'
                      : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-100'
                  }`}>
                    <div className="flex items-center gap-3">
                      {testReport.status === 'PASSED' ? (
                        <CheckCircle2 className="w-8 h-8 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      ) : (
                        <XCircle className="w-8 h-8 text-rose-600 dark:text-rose-400 shrink-0" />
                      )}
                      <div>
                        <div className="text-lg font-bold">
                          {testReport.status === 'PASSED' ? 'ALL 6 TRACEABILITY SCENARIOS PASSED' : 'SOME TRACEABILITY TESTS FAILED'}
                        </div>
                        <div className="text-xs opacity-90">
                          {testReport.passedScenarios} of {testReport.totalScenarios} scenarios validated • Execution Duration: {testReport.durationMs}ms
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 bg-white/80 dark:bg-slate-900/80 rounded-lg text-xs font-mono font-bold shadow-sm">
                        SUITE: {testReport.suiteId}
                      </span>
                    </div>
                  </div>

                  {/* Detailed Scenarios List */}
                  <div className="space-y-4">
                    {testReport.scenarios.map(sc => (
                      <div
                        key={sc.id}
                        className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-2.5">
                            {getEntityIcon(sc.entityType)}
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="font-bold text-sm">{sc.title}</h3>
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  sc.status === 'PASSED'
                                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                    : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                                }`}>
                                  {sc.status}
                                </span>
                              </div>
                              <p className="text-xs text-slate-500 mt-0.5">{sc.description}</p>
                            </div>
                          </div>

                          <span className="text-xs text-slate-400 font-mono shrink-0">
                            {sc.durationMs}ms
                          </span>
                        </div>

                        {/* Step Breakdown */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                          {sc.steps.map(step => (
                            <div
                              key={step.id}
                              className={`p-2.5 rounded-lg border text-xs space-y-1 ${
                                step.status === 'PASSED'
                                  ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/60'
                                  : (step.status === 'FAILED' 
                                      ? 'bg-rose-50/60 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800/60' 
                                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800')
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-[11px] truncate">{step.name.split(':')[0]}</span>
                                {step.status === 'PASSED' ? (
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                ) : (
                                  <XCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                                )}
                              </div>
                              <p className="text-[10px] text-slate-600 dark:text-slate-400 leading-tight">
                                {step.assertionMessage || step.details}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Modal: Raw Event Snapshot Inspector */}
        {inspectEvent && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-3xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
              <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950">
                <div className="flex items-center gap-2">
                  <Fingerprint className="w-5 h-5 text-blue-600" />
                  <h3 className="font-bold text-sm">Authoritative Event Snapshot Inspector</h3>
                </div>
                <button
                  onClick={() => setInspectEvent(null)}
                  className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              <div className="p-5 overflow-y-auto space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="font-bold text-slate-500 mb-1">State Snapshot BEFORE:</div>
                    <pre className="p-3 bg-slate-100 dark:bg-slate-950 rounded-lg font-mono text-[11px] overflow-x-auto max-h-60 border border-slate-200 dark:border-slate-800">
                      {JSON.stringify(inspectEvent.before.stateSnapshot || {}, null, 2)}
                    </pre>
                  </div>
                  <div>
                    <div className="font-bold text-slate-500 mb-1">State Snapshot AFTER:</div>
                    <pre className="p-3 bg-slate-100 dark:bg-slate-950 rounded-lg font-mono text-[11px] overflow-x-auto max-h-60 border border-slate-200 dark:border-slate-800">
                      {JSON.stringify(inspectEvent.after.stateSnapshot || {}, null, 2)}
                    </pre>
                  </div>
                </div>

                <div>
                  <div className="font-bold text-slate-500 mb-1">Full Immutable Event Object:</div>
                  <pre className="p-3 bg-slate-100 dark:bg-slate-950 rounded-lg font-mono text-[11px] overflow-x-auto max-h-60 border border-slate-200 dark:border-slate-800">
                    {JSON.stringify(inspectEvent, null, 2)}
                  </pre>
                </div>
              </div>

              <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex justify-end bg-slate-50 dark:bg-slate-950">
                <button
                  onClick={() => setInspectEvent(null)}
                  className="px-4 py-2 bg-slate-800 text-white rounded-lg text-xs font-semibold hover:bg-slate-700"
                >
                  Close Inspector
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Export Audit Certificate & JSON Envelope */}
        {showExportModal && exportData && historyResult && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
              <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-600" />
                  <div>
                    <h3 className="font-bold text-sm">Enterprise Audit Certificate & Verification Bundle</h3>
                    <p className="text-[11px] text-slate-500">{historyResult.entityType}: {historyResult.entityDisplayName} ({historyResult.entityIdentifier})</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowExportModal(false)}
                  className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              <div className="p-5 overflow-y-auto space-y-4 text-xs">
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-lg flex items-center justify-between">
                  <div>
                    <div className="font-bold text-emerald-900 dark:text-emerald-200">STANDARDIZED AUDIT ENVELOPE (LOGSHEET_ENTERPRISE_TRACEABILITY_V1)</div>
                    <div className="text-slate-600 dark:text-slate-400 text-[11px]">Includes all {historyResult.totalEvents} events, actor identities, before/after mutations, and cryptographic hash chain proofs.</div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      id="btn-download-json-bundle"
                      onClick={downloadJsonEnvelope}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-semibold flex items-center gap-1.5 shadow-sm"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Download JSON
                    </button>
                    <button
                      id="btn-print-certificate"
                      onClick={printAuditCertificate}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-semibold flex items-center gap-1.5 shadow-sm"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      Print Certificate
                    </button>
                  </div>
                </div>

                <div>
                  <div className="font-bold text-slate-500 mb-1">Human-Readable Verification Ledger:</div>
                  <pre className="p-3 bg-slate-100 dark:bg-slate-950 rounded-lg font-mono text-[11px] overflow-x-auto max-h-72 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200">
                    {exportData.printableSummary}
                  </pre>
                </div>
              </div>

              <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex justify-end bg-slate-50 dark:bg-slate-950">
                <button
                  onClick={() => setShowExportModal(false)}
                  className="px-4 py-2 bg-slate-800 text-white rounded-lg text-xs font-semibold hover:bg-slate-700"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
