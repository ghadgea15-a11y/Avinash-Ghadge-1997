import React, { useState, useEffect, useMemo } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  ShieldAlert, 
  ShieldCheck, 
  DollarSign, 
  Clock, 
  Users, 
  Building2, 
  MapPin, 
  Layers, 
  Search, 
  Filter, 
  Download, 
  RefreshCw, 
  ChevronRight, 
  ArrowRight, 
  X, 
  FileText, 
  CheckCircle2, 
  Wrench, 
  ShoppingBag, 
  HelpCircle,
  ExternalLink,
  ChevronDown,
  Eye
} from 'lucide-react';
import { 
  CompanyTenant, 
  UserSession, 
  PhaseAScreen 
} from '../../types';
import { 
  OperationalHierarchyNode, 
  OperationalAnomaly, 
  OperationalSourceTransaction, 
  OperationalIntelligencePayload,
  OperationalAnomalyType,
  OperationalAnomalySeverity,
  OperationalModuleSource
} from '../../types/operationalIntelligence';
import { OperationalIntelligenceEngine } from '../../services/operationalIntelligenceEngine';
import { useTheme } from '../../context/ThemeContext';

interface ExecutiveOperationalIntelligenceScreenProps {
  userSession: UserSession;
  activeCompany: CompanyTenant;
  isOnline?: boolean;
  onNavigate: (screen: PhaseAScreen) => void;
}

export const ExecutiveOperationalIntelligenceScreen: React.FC<ExecutiveOperationalIntelligenceScreenProps> = ({
  userSession,
  activeCompany,
  onNavigate
}) => {
  const { isDark } = useTheme();

  // Core Data State
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [payload, setPayload] = useState<OperationalIntelligencePayload | null>(null);

  // Navigation / Hierarchy Path State
  // Path stack: [CompanyNode, RegionNode, BranchNode, SiteNode, DeptNode]
  const [navigationPath, setNavigationPath] = useState<OperationalHierarchyNode[]>([]);
  
  // Current active node in view
  const currentNode: OperationalHierarchyNode | null = useMemo(() => {
    if (navigationPath.length === 0) return payload?.rootNode || null;
    return navigationPath[navigationPath.length - 1];
  }, [navigationPath, payload]);

  // Filters State
  const [selectedPeriod, setSelectedPeriod] = useState<'CURRENT_MONTH' | 'LAST_30_DAYS' | 'LAST_90_DAYS' | 'YTD'>('CURRENT_MONTH');
  const [selectedAnomalyType, setSelectedAnomalyType] = useState<OperationalAnomalyType | 'ALL'>('ALL');
  const [selectedSeverity, setSelectedSeverity] = useState<OperationalAnomalySeverity | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Source Transaction Drawer State
  const [selectedTransactionModal, setSelectedTransactionModal] = useState<{
    isOpen: boolean;
    title: string;
    transactions: OperationalSourceTransaction[];
    selectedTx?: OperationalSourceTransaction | null;
  }>({
    isOpen: false,
    title: '',
    transactions: []
  });

  const [activeModuleFilter, setActiveModuleFilter] = useState<OperationalModuleSource | 'ALL'>('ALL');

  // Load Intelligence Data
  const loadIntelligence = async () => {
    setLoading(true);
    setError(null);
    try {
      const now = new Date();
      let startDate: string | undefined;
      const endDate = now.toISOString();

      if (selectedPeriod === 'CURRENT_MONTH') {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      } else if (selectedPeriod === 'LAST_30_DAYS') {
        const d = new Date();
        d.setDate(d.getDate() - 30);
        startDate = d.toISOString();
      } else if (selectedPeriod === 'LAST_90_DAYS') {
        const d = new Date();
        d.setDate(d.getDate() - 90);
        startDate = d.toISOString();
      } else if (selectedPeriod === 'YTD') {
        startDate = new Date(now.getFullYear(), 0, 1).toISOString();
      }

      const result = await OperationalIntelligenceEngine.getOperationalIntelligence(
        userSession,
        activeCompany,
        { startDate, endDate }
      );

      setPayload(result);
      
      // If navigation path was set, update the active node pointer from new payload tree
      if (navigationPath.length > 0) {
        const updatedPath: OperationalHierarchyNode[] = [result.rootNode];
        let searchCursor = result.rootNode;
        for (let i = 1; i < navigationPath.length; i++) {
          const targetId = navigationPath[i].id;
          const found = searchCursor.children?.find(c => c.id === targetId);
          if (found) {
            updatedPath.push(found);
            searchCursor = found;
          } else {
            break;
          }
        }
        setNavigationPath(updatedPath);
      } else {
        setNavigationPath([result.rootNode]);
      }
    } catch (err: any) {
      console.error('Failed to load operational intelligence:', err);
      setError(err.message || 'Failed to aggregate authoritative operational intelligence');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadIntelligence();
  }, [activeCompany.companyId, selectedPeriod]);

  // Handle Breadcrumb Jump
  const handleJumpToPathIndex = (index: number) => {
    if (index >= 0 && index < navigationPath.length) {
      setNavigationPath(navigationPath.slice(0, index + 1));
    }
  };

  // Handle Drill Down into a child node
  const handleDrillDownNode = (child: OperationalHierarchyNode) => {
    setNavigationPath(prev => [...prev, child]);
  };

  // Filtered Anomalies for Current View
  const nodeAnomalies = useMemo(() => {
    if (!currentNode) return [];
    
    // If viewing root company, show all anomalies across company or node's own
    let list = currentNode.level === 'COMPANY' 
      ? (payload?.allAnomalies || []) 
      : (currentNode.metrics.anomalies || []);

    // Also include child anomalies if viewing a region/branch/site
    if (currentNode.level !== 'COMPANY' && currentNode.children) {
      const childAnoms = currentNode.children.flatMap(c => c.metrics.anomalies || []);
      // Deduplicate by ID
      const map = new Map<string, OperationalAnomaly>();
      list.forEach(a => map.set(a.id, a));
      childAnoms.forEach(a => map.set(a.id, a));
      list = Array.from(map.values());
    }

    if (selectedAnomalyType !== 'ALL') {
      list = list.filter(a => a.type === selectedAnomalyType);
    }
    if (selectedSeverity !== 'ALL') {
      list = list.filter(a => a.severity === selectedSeverity);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(a => 
        a.title.toLowerCase().includes(q) || 
        a.entityName.toLowerCase().includes(q) ||
        a.description.toLowerCase().includes(q) ||
        a.rootCause.toLowerCase().includes(q)
      );
    }

    return list;
  }, [currentNode, payload, selectedAnomalyType, selectedSeverity, searchQuery]);

  // Filtered Children for Sibling Comparison Grid
  const filteredChildren = useMemo(() => {
    if (!currentNode || !currentNode.children) return [];
    let list = currentNode.children;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(c => 
        c.name.toLowerCase().includes(q) || 
        c.code.toLowerCase().includes(q)
      );
    }
    return list;
  }, [currentNode, searchQuery]);

  // Open Transaction Inspector Modal
  const openTransactionLedger = (title: string, txs: OperationalSourceTransaction[]) => {
    setSelectedTransactionModal({
      isOpen: true,
      title,
      transactions: txs,
      selectedTx: txs.length > 0 ? txs[0] : null
    });
    setActiveModuleFilter('ALL');
  };

  // Filtered Modal Transactions
  const modalTransactions = useMemo(() => {
    let list = selectedTransactionModal.transactions;
    if (activeModuleFilter !== 'ALL') {
      list = list.filter(t => t.module === activeModuleFilter);
    }
    return list;
  }, [selectedTransactionModal.transactions, activeModuleFilter]);

  // Export Executive Intelligence as CSV
  const handleExportCSV = () => {
    if (!currentNode) return;
    const rows = [
      ['Log Sheet Muster - Enterprise Operational Intelligence'],
      [`Entity: ${currentNode.name} (${currentNode.level})`],
      [`Generated: ${new Date().toLocaleString()}`],
      [''],
      ['KEY METRICS SUMMARY'],
      ['Headcount', currentNode.metrics.headcount],
      ['Attendance Rate %', `${currentNode.metrics.attendanceRate.toFixed(1)}%`],
      ['Total Operational Cost (INR)', currentNode.metrics.costBreakdown.totalOperationalCost],
      ['Payroll Gross (INR)', currentNode.metrics.costBreakdown.payrollGross],
      ['Overtime Cost (INR)', currentNode.metrics.costBreakdown.overtimeCost],
      ['Overtime Rate %', `${currentNode.metrics.overtimeRatePercent.toFixed(1)}%`],
      ['Maintenance Cost (INR)', currentNode.metrics.costBreakdown.maintenanceCost],
      ['Procurement Spend (INR)', currentNode.metrics.costBreakdown.procurementSpend],
      ['Incident Loss Impact (INR)', currentNode.metrics.costBreakdown.incidentLossImpact],
      ['Risk Score', `${currentNode.metrics.riskScorecard.overallRiskScore} (${currentNode.metrics.riskScorecard.riskGrade})`],
      [''],
      ['ANOMALIES IDENTIFIED'],
      ['Severity', 'Type', 'Entity', 'Metric', 'Current Value', 'Deviation %', 'Financial Impact (INR)', 'Root Cause', 'Recommended Action']
    ];

    nodeAnomalies.forEach(a => {
      rows.push([
        a.severity,
        a.type,
        a.entityName,
        a.metricName,
        a.currentValue.toString(),
        `+${a.deviationPercent}%`,
        a.financialImpact.toString(),
        `"${a.rootCause.replace(/"/g, '""')}"`,
        `"${a.recommendedAction.replace(/"/g, '""')}"`
      ]);
    });

    const csvContent = "data:text/csv;charset=utf-8," + rows.map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Operational_Intelligence_${currentNode.name.replace(/\s+/g, '_')}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getSeverityBadge = (severity: OperationalAnomalySeverity) => {
    switch (severity) {
      case 'CRITICAL':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800"><ShieldAlert className="w-3.5 h-3.5" /> CRITICAL</span>;
      case 'HIGH':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800"><AlertTriangle className="w-3.5 h-3.5" /> HIGH</span>;
      case 'MEDIUM':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800">MEDIUM</span>;
      default:
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">LOW</span>;
    }
  };

  const getRiskGradeBadge = (grade: 'LOW' | 'MODERATE' | 'ELEVATED' | 'SEVERE', score: number) => {
    switch (grade) {
      case 'SEVERE':
        return <span className="px-3 py-1 rounded-xl text-xs font-black bg-rose-500 text-white shadow-sm flex items-center gap-1.5"><ShieldAlert className="w-4 h-4" /> SEVERE ({score}/100)</span>;
      case 'ELEVATED':
        return <span className="px-3 py-1 rounded-xl text-xs font-black bg-amber-500 text-white shadow-sm flex items-center gap-1.5"><AlertTriangle className="w-4 h-4" /> ELEVATED ({score}/100)</span>;
      case 'MODERATE':
        return <span className="px-3 py-1 rounded-xl text-xs font-bold bg-blue-500 text-white shadow-sm flex items-center gap-1.5"><TrendingUp className="w-4 h-4" /> MODERATE ({score}/100)</span>;
      default:
        return <span className="px-3 py-1 rounded-xl text-xs font-bold bg-emerald-500 text-white shadow-sm flex items-center gap-1.5"><ShieldCheck className="w-4 h-4" /> LOW RISK ({score}/100)</span>;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 animate-fade-in" id="cfo-operational-intelligence-view">
      
      {/* 1. Header & Controls Strip */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                Operational Cost & Risk Intelligence
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Authoritative transaction roll-ups and anomaly detection across all enterprise tiers.
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* Period Select */}
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value as any)}
            className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
          >
            <option value="CURRENT_MONTH">Current Month</option>
            <option value="LAST_30_DAYS">Last 30 Days</option>
            <option value="LAST_90_DAYS">Last 90 Days</option>
            <option value="YTD">Year-to-Date (YTD)</option>
          </select>

          {/* Refresh Button */}
          <button
            onClick={loadIntelligence}
            disabled={loading}
            className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition flex items-center justify-center"
            title="Refresh Live Intelligence"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-600' : ''}`} />
          </button>

          {/* Export Report */}
          <button
            onClick={handleExportCSV}
            disabled={loading || !currentNode}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm transition flex items-center gap-1.5"
          >
            <Download className="w-4 h-4" />
            Export Briefing
          </button>
        </div>
      </div>

      {/* 2. Interactive Hierarchy Breadcrumb Navigation */}
      <div className="bg-slate-100/80 dark:bg-slate-800/80 backdrop-blur px-5 py-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 flex flex-wrap items-center gap-2 text-xs font-medium">
        <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px] mr-1 flex items-center gap-1">
          <Layers className="w-3.5 h-3.5" /> Scope:
        </span>
        {navigationPath.map((node, index) => {
          const isLast = index === navigationPath.length - 1;
          return (
            <React.Fragment key={node.id}>
              {index > 0 && <ChevronRight className="w-3.5 h-3.5 text-slate-400" />}
              <button
                onClick={() => handleJumpToPathIndex(index)}
                className={`px-3 py-1 rounded-lg transition font-semibold flex items-center gap-1.5 ${
                  isLast
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm border border-slate-200 dark:border-slate-700'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-slate-700/50'
                }`}
              >
                <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold">
                  {node.level}
                </span>
                {node.name}
              </button>
            </React.Fragment>
          );
        })}
      </div>

      {loading ? (
        <div className="py-24 text-center space-y-4">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-slate-600 dark:text-slate-300 text-sm font-medium">
            Aggregating authoritative records from Payroll, Overtime, Assets, Maintenance, Procurement, Incidents & Operations...
          </p>
        </div>
      ) : error ? (
        <div className="bg-rose-50 dark:bg-rose-950/40 p-6 rounded-3xl border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 space-y-2">
          <div className="flex items-center gap-2 font-bold text-base">
            <AlertTriangle className="w-5 h-5" /> Intelligence Engine Error
          </div>
          <p className="text-xs">{error}</p>
        </div>
      ) : currentNode ? (
        <>
          {/* 3. Executive KPI Headline Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Total Operational Spend */}
            <div 
              className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3 cursor-pointer hover:border-indigo-400 transition"
              onClick={() => openTransactionLedger(`Operational Spend Ledger: ${currentNode.name}`, currentNode.metrics.transactions)}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Operational Cost</span>
                <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <DollarSign className="w-4 h-4" />
                </div>
              </div>
              <div>
                <p className="text-2xl font-black text-slate-900 dark:text-white">
                  ₹{currentNode.metrics.costBreakdown.totalOperationalCost.toLocaleString()}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  ₹{currentNode.metrics.costPerHeadcount.toLocaleString()} per active headcount
                </p>
              </div>
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-between text-[11px] text-slate-500 font-medium">
                <span>Payroll: ₹{currentNode.metrics.costBreakdown.payrollGross.toLocaleString()}</span>
                <span className="text-indigo-600 dark:text-indigo-400 flex items-center gap-0.5 hover:underline">
                  Inspect <ArrowRight className="w-3 h-3" />
                </span>
              </div>
            </div>

            {/* Overtime Volume & Cost */}
            <div 
              className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3 cursor-pointer hover:border-indigo-400 transition"
              onClick={() => openTransactionLedger(`Overtime Records: ${currentNode.name}`, currentNode.metrics.transactions.filter(t => t.module === 'OVERTIME' || t.module === 'ATTENDANCE'))}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Overtime Volume</span>
                <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                  <Clock className="w-4 h-4" />
                </div>
              </div>
              <div>
                <div className="flex items-baseline gap-2">
                  <p className="text-2xl font-black text-slate-900 dark:text-white">
                    {currentNode.metrics.overtimeHoursTotal.toFixed(1)} <span className="text-sm font-semibold text-slate-500">hrs</span>
                  </p>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${
                    currentNode.metrics.overtimeRatePercent > 18
                      ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300'
                      : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                  }`}>
                    {currentNode.metrics.overtimeRatePercent.toFixed(1)}% of total
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Est. Payout: ₹{currentNode.metrics.overtimeCostTotal.toLocaleString()}
                </p>
              </div>
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-between text-[11px] text-slate-500 font-medium">
                <span>{currentNode.metrics.activeEmployees} active staff</span>
                <span className="text-indigo-600 dark:text-indigo-400 flex items-center gap-0.5 hover:underline">
                  Audit OT <ArrowRight className="w-3 h-3" />
                </span>
              </div>
            </div>

            {/* Maintenance & Procurement */}
            <div 
              className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3 cursor-pointer hover:border-indigo-400 transition"
              onClick={() => openTransactionLedger(`Maintenance & Procurement: ${currentNode.name}`, currentNode.metrics.transactions.filter(t => t.module === 'MAINTENANCE' || t.module === 'PROCUREMENT'))}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Maintenance & Purchases</span>
                <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <Wrench className="w-4 h-4" />
                </div>
              </div>
              <div>
                <p className="text-2xl font-black text-slate-900 dark:text-white">
                  ₹{(currentNode.metrics.costBreakdown.maintenanceCost + currentNode.metrics.costBreakdown.procurementSpend).toLocaleString()}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  {currentNode.metrics.openWorkOrdersCount} open work orders • {currentNode.metrics.purchaseOrdersCount} POs
                </p>
              </div>
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-between text-[11px] text-slate-500 font-medium">
                <span>Assets: {currentNode.metrics.activeAssetsCount}</span>
                <span className="text-indigo-600 dark:text-indigo-400 flex items-center gap-0.5 hover:underline">
                  View WO <ArrowRight className="w-3 h-3" />
                </span>
              </div>
            </div>

            {/* Risk & Safety Scorecard */}
            <div 
              className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3 cursor-pointer hover:border-indigo-400 transition"
              onClick={() => openTransactionLedger(`Incidents & Risks: ${currentNode.name}`, currentNode.metrics.transactions.filter(t => t.module === 'INCIDENTS'))}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Operational Risk Index</span>
                {getRiskGradeBadge(currentNode.metrics.riskScorecard.riskGrade, currentNode.metrics.riskScorecard.overallRiskScore)}
              </div>
              <div>
                <div className="flex items-baseline gap-2">
                  <p className="text-2xl font-black text-slate-900 dark:text-white">
                    {currentNode.metrics.openIncidentsCount} <span className="text-sm font-semibold text-slate-500">open incidents</span>
                  </p>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  {currentNode.metrics.criticalIncidentsCount} critical • ₹{currentNode.metrics.incidentLossTotal.toLocaleString()} loss impact
                </p>
              </div>
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-between text-[11px] text-slate-500 font-medium">
                <span>Muster: {currentNode.metrics.attendanceRate.toFixed(1)}%</span>
                <span className="text-indigo-600 dark:text-indigo-400 flex items-center gap-0.5 hover:underline">
                  Incidents <ArrowRight className="w-3 h-3" />
                </span>
              </div>
            </div>

          </div>

          {/* 4. Anomaly Radar & Detection Engine Section */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <ShieldAlert className="w-5 h-5 text-rose-500" />
                    Detected Operational Anomalies & Spikes ({nodeAnomalies.length})
                  </h2>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Algorithmically detected cost spikes, overtime leaps, maintenance surges, and incident risks.
                </p>
              </div>

              {/* Anomaly Filters */}
              <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                <select
                  value={selectedAnomalyType}
                  onChange={(e) => setSelectedAnomalyType(e.target.value as any)}
                  className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200"
                >
                  <option value="ALL">All Anomaly Types</option>
                  <option value="COST_SPIKE">Cost Spikes</option>
                  <option value="OVERTIME_SPIKE">Overtime Spikes</option>
                  <option value="MAINTENANCE_SPIKE">Maintenance Spikes</option>
                  <option value="INCIDENT_SPIKE">Incident Spikes</option>
                  <option value="PROCUREMENT_ANOMALY">Procurement Anomalies</option>
                  <option value="ATTENDANCE_ANOMALY">Attendance Deficits</option>
                </select>

                <select
                  value={selectedSeverity}
                  onChange={(e) => setSelectedSeverity(e.target.value as any)}
                  className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200"
                >
                  <option value="ALL">All Severities</option>
                  <option value="CRITICAL">Critical Only</option>
                  <option value="HIGH">High & Above</option>
                  <option value="MEDIUM">Medium</option>
                </select>

                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search anomalies..."
                    className="pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-700 dark:text-slate-200 outline-none w-44"
                  />
                </div>
              </div>
            </div>

            {/* Anomaly Cards Grid */}
            {nodeAnomalies.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200/60 dark:border-slate-700/60">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">Clean Operational Status</h4>
                <p className="text-xs text-slate-500 mt-1">No cost or risk anomalies detected within current selection criteria.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {nodeAnomalies.map((anomaly) => (
                  <div 
                    key={anomaly.id}
                    className="bg-slate-50/70 dark:bg-slate-800/50 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3.5 flex flex-col justify-between hover:shadow-md transition"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200">
                          {anomaly.entityLevel}: {anomaly.entityName}
                        </span>
                        {getSeverityBadge(anomaly.severity)}
                      </div>

                      <h3 className="text-sm font-black text-slate-900 dark:text-white leading-snug">
                        {anomaly.title}
                      </h3>

                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                        {anomaly.description}
                      </p>
                    </div>

                    <div className="space-y-2.5 pt-3 border-t border-slate-200/80 dark:border-slate-700/80 text-xs">
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Root Cause:</span>
                        <p className="text-slate-700 dark:text-slate-300 italic text-[11px]">"{anomaly.rootCause}"</p>
                      </div>

                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider">Action Plan:</span>
                        <p className="text-slate-700 dark:text-slate-300 text-[11px] font-medium">{anomaly.recommendedAction}</p>
                      </div>

                      {anomaly.financialImpact > 0 && (
                        <div className="flex justify-between items-center bg-rose-50 dark:bg-rose-950/30 px-3 py-1.5 rounded-xl text-rose-800 dark:text-rose-300 font-semibold text-[11px]">
                          <span>Financial Exposure:</span>
                          <span className="font-black">₹{anomaly.financialImpact.toLocaleString()}</span>
                        </div>
                      )}

                      <button
                        onClick={() => openTransactionLedger(`Evidence for: ${anomaly.title}`, anomaly.sourceTransactions)}
                        className="w-full py-2 bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 text-indigo-600 dark:text-indigo-300 rounded-xl text-xs font-bold shadow-sm transition flex items-center justify-center gap-1.5 border border-slate-200 dark:border-slate-600"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        Inspect Source Transactions ({anomaly.sourceTransactions.length})
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 5. Sibling Hierarchy Comparison & Drill-down Table */}
          {currentNode.children && currentNode.children.length > 0 && (
            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    Operational Hierarchy Breakdown ({currentNode.children[0]?.level} Tier)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Compare operational spend, overtime density, maintenance, and risk across all sub-units in {currentNode.name}.
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                      <th className="py-3 px-4">Entity Unit</th>
                      <th className="py-3 px-4">Headcount</th>
                      <th className="py-3 px-4">Muster %</th>
                      <th className="py-3 px-4">Total Cost</th>
                      <th className="py-3 px-4">Cost / Head</th>
                      <th className="py-3 px-4">Overtime %</th>
                      <th className="py-3 px-4">Incidents</th>
                      <th className="py-3 px-4">Risk Grade</th>
                      <th className="py-3 px-4">Anomalies</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                    {filteredChildren.map((child) => {
                      const anomCount = child.metrics.anomalies?.length || 0;
                      const hasCrit = child.metrics.anomalies?.some(a => a.severity === 'CRITICAL');
                      return (
                        <tr 
                          key={child.id}
                          className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition cursor-pointer"
                          onClick={() => handleDrillDownNode(child)}
                        >
                          <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold">
                                {child.code}
                              </span>
                              <span>{child.name}</span>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300">
                            {child.metrics.headcount}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className={`font-bold ${child.metrics.attendanceRate < 80 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-700 dark:text-slate-300'}`}>
                              {child.metrics.attendanceRate.toFixed(1)}%
                            </span>
                          </td>
                          <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                            ₹{child.metrics.costBreakdown.totalOperationalCost.toLocaleString()}
                          </td>
                          <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300">
                            ₹{child.metrics.costPerHeadcount.toLocaleString()}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                              child.metrics.overtimeRatePercent > 18
                                ? 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300'
                                : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                            }`}>
                              {child.metrics.overtimeRatePercent.toFixed(1)}%
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300">
                            {child.metrics.openIncidentsCount} {child.metrics.criticalIncidentsCount > 0 && <span className="text-rose-500 font-bold">({child.metrics.criticalIncidentsCount} crit)</span>}
                          </td>
                          <td className="py-3.5 px-4">
                            {getRiskGradeBadge(child.metrics.riskScorecard.riskGrade, child.metrics.riskScorecard.overallRiskScore)}
                          </td>
                          <td className="py-3.5 px-4">
                            {anomCount > 0 ? (
                              <span className={`px-2 py-0.5 rounded text-xs font-black ${
                                hasCrit ? 'bg-rose-600 text-white' : 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                              }`}>
                                {anomCount} Anomaly
                              </span>
                            ) : (
                              <span className="text-slate-400 font-normal">Clean</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDrillDownNode(child);
                              }}
                              className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rounded-xl text-xs font-bold hover:bg-indigo-100 dark:hover:bg-indigo-900 transition flex items-center gap-1 ml-auto"
                            >
                              Drill In <ArrowRight className="w-3 h-3" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      ) : null}

      {/* 6. Authoritative Source Transaction Drawer / Inspector Modal */}
      {selectedTransactionModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-5xl max-h-[90vh] rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden animate-scale-up">
            
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
              <div>
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">
                    {selectedTransactionModal.title}
                  </h3>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Traceable to authoritative Firestore records. Zero mock data.
                </p>
              </div>

              <button
                onClick={() => setSelectedTransactionModal({ isOpen: false, title: '', transactions: [] })}
                className="w-9 h-9 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white flex items-center justify-center transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Module Filter Tabs */}
            <div className="px-6 py-3 border-b border-slate-100 dark:border-slate-800 flex flex-wrap gap-2 text-xs">
              {(['ALL', 'PAYROLL', 'ATTENDANCE', 'OVERTIME', 'MAINTENANCE', 'PROCUREMENT', 'INCIDENTS', 'CONTRACTS'] as const).map((mod) => (
                <button
                  key={mod}
                  onClick={() => setActiveModuleFilter(mod)}
                  className={`px-3 py-1 rounded-xl font-bold transition ${
                    activeModuleFilter === mod
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  {mod}
                </button>
              ))}
            </div>

            {/* Modal Content / Transaction List */}
            <div className="p-6 overflow-y-auto flex-1 space-y-3">
              {modalTransactions.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  No source transactions match the active module filter.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {modalTransactions.map((tx) => (
                    <div 
                      key={tx.id}
                      className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 flex flex-col md:flex-row justify-between items-start md:items-center gap-3 text-xs"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold text-[10px]">
                            {tx.module}
                          </span>
                          <span className="font-mono text-slate-500 font-medium">#{tx.referenceNumber}</span>
                          <span className="text-slate-400">•</span>
                          <span className="text-slate-500">{new Date(tx.date).toLocaleDateString()}</span>
                        </div>
                        <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                          {tx.title}
                        </h4>
                        <p className="text-slate-600 dark:text-slate-300 text-[11px]">
                          {tx.description}
                        </p>
                      </div>

                      <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
                        {tx.amount !== undefined && tx.amount > 0 && (
                          <div className="text-right">
                            <span className="text-[10px] text-slate-400 block uppercase font-bold">Amount</span>
                            <span className="font-black text-slate-900 dark:text-white text-sm">
                              ₹{tx.amount.toLocaleString()}
                            </span>
                          </div>
                        )}
                        <span className="px-2.5 py-1 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-[10px] uppercase">
                          {tx.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex justify-between items-center text-xs text-slate-500">
              <span>Showing {modalTransactions.length} authoritative transaction records</span>
              <button
                onClick={() => setSelectedTransactionModal({ isOpen: false, title: '', transactions: [] })}
                className="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl hover:bg-slate-300 transition"
              >
                Close Ledger
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
