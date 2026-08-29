import React, { useState, useEffect, useMemo } from 'react';
import { 
  Network, 
  Users, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  UserCheck, 
  UserX, 
  Calendar, 
  Filter, 
  Search, 
  ShieldAlert, 
  Send, 
  Check, 
  X, 
  ChevronRight, 
  ChevronDown, 
  RefreshCw, 
  Plus, 
  Settings, 
  Award, 
  MapPin, 
  Phone, 
  Sparkles, 
  ArrowRight, 
  TrendingDown, 
  TrendingUp, 
  History, 
  FileSpreadsheet, 
  Code2, 
  Flame, 
  HeartHandshake, 
  Shield, 
  Zap, 
  SlidersHorizontal,
  Info
} from 'lucide-react';
import { 
  UserSession, 
  CompanyTenant, 
  SiteRecord, 
  ShiftRecord, 
  EmployeeRecord, 
  RosterRecord, 
  AttendanceRecord, 
  LeaveRequestRecord 
} from '../../types';
import { 
  SiteShiftRequirement, 
  WorkforceShortageIncident, 
  CapacityPlanningSummary, 
  SiteCapacityAssessment, 
  ReplacementCandidate, 
  WorkforceAnomalyType, 
  ShortageSeverity, 
  CriticalSkillType,
  RequiredSkillFloor
} from '../../types/workforceCapacity';
import { WorkforceCapacityEngine } from '../../services/workforceCapacityEngine';
import { FirestoreService } from '../../services/firestoreService';
import { motion, AnimatePresence } from 'motion/react';

interface Props {
  userSession: UserSession;
  activeCompany: CompanyTenant;
  isOnline: boolean;
}

export const WorkforceCapacityPlanningScreen: React.FC<Props> = ({
  userSession,
  activeCompany,
  isOnline
}) => {
  // --- Active State ---
  const [targetDate, setTargetDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [selectedSiteFilter, setSelectedSiteFilter] = useState<string>('ALL');
  const [selectedAnomalyFilter, setSelectedAnomalyFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'INCIDENTS' | 'REQUIREMENTS' | 'KOTLIN_SPEC'>('DASHBOARD');

  // --- Data State ---
  const [sites, setSites] = useState<SiteRecord[]>([]);
  const [shifts, setShifts] = useState<ShiftRecord[]>([]);
  const [employees, setEmployees] = useState<EmployeeRecord[]>([]);
  const [rosters, setRosters] = useState<RosterRecord[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [leaves, setLeaves] = useState<LeaveRequestRecord[]>([]);
  const [requirements, setRequirements] = useState<SiteShiftRequirement[]>([]);
  const [incidents, setIncidents] = useState<WorkforceShortageIncident[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // --- Modals State ---
  const [alertModalIncident, setAlertModalIncident] = useState<WorkforceShortageIncident | null>(null);
  const [customAlertMsg, setCustomAlertMsg] = useState<string>('');
  const [isDispatchingAlert, setIsDispatchingAlert] = useState<boolean>(false);

  const [replacementModalIncident, setReplacementModalIncident] = useState<WorkforceShortageIncident | null>(null);
  const [replacementCandidates, setReplacementCandidates] = useState<ReplacementCandidate[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState<ReplacementCandidate | null>(null);
  const [candidateSourceType, setCandidateSourceType] = useState<'STANDBY_POOL' | 'OVERTIME_EXTENSION' | 'CROSS_SITE_TRANSFER' | 'AGENCY_RELIEF'>('STANDBY_POOL');
  const [isLoadingCandidates, setIsLoadingCandidates] = useState<boolean>(false);
  const [isDeployingReplacement, setIsDeployingReplacement] = useState<boolean>(false);
  const [approvalNotes, setApprovalNotes] = useState<string>('');

  const [configModalRequirement, setConfigModalRequirement] = useState<SiteShiftRequirement | null>(null);
  const [isSavingRequirement, setIsSavingRequirement] = useState<boolean>(false);

  const [timelineIncident, setTimelineIncident] = useState<WorkforceShortageIncident | null>(null);

  // --- Initial Real-time Subscriptions ---
  useEffect(() => {
    let unsubs: (() => void)[] = [];

    const loadBaseData = async () => {
      setIsLoading(true);
      try {
        unsubs.push(FirestoreService.subscribeToSites(activeCompany.companyId, setSites));
        unsubs.push(FirestoreService.subscribeToShifts(userSession, activeCompany.companyId, setShifts));
        unsubs.push(FirestoreService.subscribeToEmployees(userSession, activeCompany.companyId, setEmployees));
        unsubs.push(FirestoreService.subscribeToRosters(userSession, activeCompany.companyId, setRosters));
        unsubs.push(FirestoreService.subscribeToAttendance(userSession, activeCompany.companyId, setAttendance));
        unsubs.push(FirestoreService.subscribeToLeaveRequests(userSession, activeCompany.companyId, setLeaves));
        unsubs.push(WorkforceCapacityEngine.subscribeToSiteRequirements(activeCompany.companyId, setRequirements));
        unsubs.push(WorkforceCapacityEngine.subscribeToIncidents(activeCompany.companyId, targetDate, setIncidents));
      } catch (err) {
        console.error('[WorkforceCapacityPlanningScreen] data loading error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadBaseData();
    return () => unsubs.forEach(u => u());
  }, [activeCompany.companyId, targetDate, userSession]);

  // --- Compute Capacity Assessment Live ---
  const capacityData = useMemo(() => {
    // Run synchronous calculation using current loaded data
    return WorkforceCapacityEngine.evaluateAllSitesCapacity(
      userSession,
      activeCompany.companyId,
      targetDate,
      {
        sites,
        shifts,
        employees,
        rosters,
        attendance,
        leaves,
        requirements,
        incidents
      }
    );
  }, [userSession, activeCompany.companyId, targetDate, sites, shifts, employees, rosters, attendance, leaves, requirements, incidents]);

  const [resolvedAssessments, setResolvedAssessments] = useState<{
    summary: CapacityPlanningSummary;
    siteAssessments: SiteCapacityAssessment[];
    incidents: WorkforceShortageIncident[];
  }>({
    summary: {
      date: targetDate,
      totalSitesEvaluated: 0,
      totalShiftsEvaluated: 0,
      totalRequiredWorkforce: 0,
      totalScheduledWorkforce: 0,
      totalAvailableWorkforce: 0,
      totalLeavesCount: 0,
      totalAbsencesCount: 0,
      totalOvertimeCount: 0,
      netShortageCount: 0,
      netSurplusCount: 0,
      understaffedShiftsCount: 0,
      overstaffedShiftsCount: 0,
      unfilledShiftsCount: 0,
      skillShortageShiftsCount: 0,
      unexpectedAbsencesCount: 0,
      criticalIncidentsCount: 0,
      openAlertsCount: 0,
      resolvedTodayCount: 0,
      siteCoverageRate: 100
    },
    siteAssessments: [],
    incidents: []
  });

  useEffect(() => {
    let isMounted = true;
    capacityData.then(data => {
      if (isMounted) setResolvedAssessments(data);
    });
    return () => { isMounted = false; };
  }, [capacityData]);

  // --- Filtered Site Assessments ---
  const filteredAssessments = useMemo(() => {
    return resolvedAssessments.siteAssessments.filter(assessment => {
      if (selectedSiteFilter !== 'ALL' && assessment.site.id !== selectedSiteFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const siteMatch = assessment.site.name?.toLowerCase().includes(q) || (assessment.site as any).siteCode?.toLowerCase().includes(q);
        const shiftMatch = assessment.shiftsAssessment.some(s => s.shift.shiftName.toLowerCase().includes(q));
        if (!siteMatch && !shiftMatch) return false;
      }
      if (selectedAnomalyFilter !== 'ALL') {
        const hasAnomaly = assessment.shiftsAssessment.some(s => s.anomalies.includes(selectedAnomalyFilter as WorkforceAnomalyType));
        if (!hasAnomaly) return false;
      }
      return true;
    });
  }, [resolvedAssessments.siteAssessments, selectedSiteFilter, searchQuery, selectedAnomalyFilter]);

  // --- Manual Scan Trigger ---
  const handleTriggerScan = async () => {
    setIsRefreshing(true);
    try {
      const result = await WorkforceCapacityEngine.evaluateAllSitesCapacity(
        userSession,
        activeCompany.companyId,
        targetDate,
        { sites, shifts, employees, rosters, attendance, leaves, requirements, incidents }
      );
      setResolvedAssessments(result);
    } catch (err) {
      console.error('Scan error:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  // --- Handler: Open Alert Modal ---
  const handleOpenAlertModal = (incident: WorkforceShortageIncident) => {
    setAlertModalIncident(incident);
    setCustomAlertMsg(`URGENT: ${incident.siteName} (${incident.shiftName}) has an active staffing shortage on ${incident.date}. Required: ${incident.breakdown.requiredCount}, Available: ${incident.breakdown.availableCount}. Missing: ${incident.breakdown.shortageCount} personnel. Please dispatch relief immediately.`);
  };

  const handleSendSupervisorAlert = async () => {
    if (!alertModalIncident) return;
    setIsDispatchingAlert(true);
    try {
      const ok = await WorkforceCapacityEngine.triggerSupervisorAlert(
        userSession,
        activeCompany.companyId,
        alertModalIncident,
        customAlertMsg
      );
      if (ok) {
        setAlertModalIncident(null);
        await handleTriggerScan();
      }
    } finally {
      setIsDispatchingAlert(false);
    }
  };

  // --- Handler: Open Replacement Modal ---
  const handleOpenReplacementModal = async (incident: WorkforceShortageIncident) => {
    setReplacementModalIncident(incident);
    setSelectedCandidate(null);
    setIsLoadingCandidates(true);
    setApprovalNotes(`Authorized emergency replacement dispatch to resolve ${incident.primaryAnomaly} at ${incident.siteName}.`);

    try {
      const requiredSkillNames = incident.breakdown.missingSkills.map(s => s.skill);
      const list = await WorkforceCapacityEngine.findEligibleReplacements(
        userSession,
        activeCompany.companyId,
        incident.siteId,
        incident.shiftId,
        incident.date,
        requiredSkillNames
      );
      setReplacementCandidates(list);
      if (list.length > 0) {
        setSelectedCandidate(list[0]);
        setCandidateSourceType(list[0].sourceType);
      }
    } finally {
      setIsLoadingCandidates(false);
    }
  };

  // --- Handler: Authorize & Deploy Replacement ---
  const handleDeployReplacement = async () => {
    if (!replacementModalIncident || !selectedCandidate) return;
    setIsDeployingReplacement(true);

    try {
      // 1. Attach proposal
      const proposal = {
        candidateId: selectedCandidate.employeeId,
        candidateName: selectedCandidate.fullName,
        candidatePhone: selectedCandidate.phone,
        candidateSkills: selectedCandidate.skills,
        candidateDesignation: selectedCandidate.designation,
        sourceType: candidateSourceType,
        originSiteId: selectedCandidate.assignedSiteId,
        originSiteName: selectedCandidate.assignedSiteName,
        skillMatchScore: selectedCandidate.skillMatchScore,
        weeklyOtHours: selectedCandidate.weeklyOvertimeHours,
        restHours: selectedCandidate.restHoursSinceLastShift,
        estimatedCost: selectedCandidate.estimatedCostPerShift,
        proposedAt: new Date().toISOString(),
        proposedBy: userSession.userId,
        proposedByName: userSession.fullName,
        notes: approvalNotes
      };

      await WorkforceCapacityEngine.proposeReplacement(
        userSession,
        activeCompany.companyId,
        replacementModalIncident,
        proposal
      );

      // 2. Approve and auto-sync to Roster
      const ok = await WorkforceCapacityEngine.approveReplacement(
        userSession,
        activeCompany.companyId,
        replacementModalIncident,
        approvalNotes
      );

      if (ok) {
        setReplacementModalIncident(null);
        await handleTriggerScan();
      }
    } catch (err) {
      console.error('Deploy error:', err);
    } finally {
      setIsDeployingReplacement(false);
    }
  };

  // --- Handler: Save Requirement Configuration ---
  const handleSaveRequirement = async (req: SiteShiftRequirement) => {
    setIsSavingRequirement(true);
    try {
      await WorkforceCapacityEngine.saveSiteRequirement(
        userSession,
        activeCompany.companyId,
        req
      );
      setConfigModalRequirement(null);
      await handleTriggerScan();
    } finally {
      setIsSavingRequirement(false);
    }
  };

  const summary = resolvedAssessments.summary;

  return (
    <div className="flex-1 flex flex-col w-full h-full overflow-hidden bg-slate-900 text-slate-100">
      {/* Top Header & Context Bar */}
      <header className="bg-slate-950 border-b border-slate-800 px-6 py-4 shrink-0">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-sm">
              <Network className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-100 tracking-tight">Workforce Capacity Planning</h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  Live SLA Guard
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Proactive shortage detection, skill floor compliance, supervisor escalation & one-click replacement dispatch
              </p>
            </div>
          </div>

          <div className="flex items-center flex-wrap gap-3">
            {/* Target Date Selector */}
            <div className="flex items-center bg-slate-900 border border-slate-700 rounded-lg p-1">
              <button
                onClick={() => setTargetDate(new Date().toISOString().split('T')[0])}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                  targetDate === new Date().toISOString().split('T')[0]
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Today
              </button>
              <button
                onClick={() => {
                  const d = new Date();
                  d.setDate(d.getDate() + 1);
                  setTargetDate(d.toISOString().split('T')[0]);
                }}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                  targetDate === new Date(Date.now() + 86400000).toISOString().split('T')[0]
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Tomorrow
              </button>
              <div className="flex items-center gap-1.5 px-2 border-l border-slate-700">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <input
                  type="date"
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                  className="bg-transparent text-xs text-slate-200 focus:outline-none cursor-pointer"
                />
              </div>
            </div>

            {/* Scan Button */}
            <button
              onClick={handleTriggerScan}
              disabled={isRefreshing}
              className="flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-medium transition-all shadow-sm disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-indigo-400' : ''}`} />
              <span>{isRefreshing ? 'Scanning...' : 'Scan Capacity'}</span>
            </button>
          </div>
        </div>

        {/* View Tabs */}
        <div className="max-w-7xl mx-auto flex items-center gap-6 mt-4 border-t border-slate-800/80 pt-3">
          <button
            onClick={() => setActiveTab('DASHBOARD')}
            className={`flex items-center gap-2 pb-2 text-xs font-semibold border-b-2 transition-all ${
              activeTab === 'DASHBOARD'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Shift Capacity Matrix ({filteredAssessments.length} Sites)</span>
          </button>
          <button
            onClick={() => setActiveTab('INCIDENTS')}
            className={`flex items-center gap-2 pb-2 text-xs font-semibold border-b-2 transition-all ${
              activeTab === 'INCIDENTS'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Active Incidents & Alerts</span>
            {summary.criticalIncidentsCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                {summary.criticalIncidentsCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('REQUIREMENTS')}
            className={`flex items-center gap-2 pb-2 text-xs font-semibold border-b-2 transition-all ${
              activeTab === 'REQUIREMENTS'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Site Staffing Baselines ({requirements.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('KOTLIN_SPEC')}
            className={`flex items-center gap-2 pb-2 text-xs font-semibold border-b-2 transition-all ${
              activeTab === 'KOTLIN_SPEC'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>Android Kotlin Architecture</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Executive KPI Summary Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 shadow-sm">
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-[11px] font-medium uppercase tracking-wider">Required Staff</span>
                <Users className="w-4 h-4 text-blue-400" />
              </div>
              <div className="text-2xl font-bold text-slate-100">{summary.totalRequiredWorkforce}</div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Configured site floor</div>
            </div>

            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 shadow-sm">
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-[11px] font-medium uppercase tracking-wider">Scheduled Roster</span>
                <Calendar className="w-4 h-4 text-indigo-400" />
              </div>
              <div className="text-2xl font-bold text-indigo-300">{summary.totalScheduledWorkforce}</div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Rostered personnel</div>
            </div>

            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 shadow-sm">
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-[11px] font-medium uppercase tracking-wider">Leaves / Absences</span>
                <UserX className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-2xl font-bold text-amber-400">
                {summary.totalLeavesCount + summary.totalAbsencesCount}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                {summary.totalLeavesCount} Leaves · {summary.totalAbsencesCount} No-Shows
              </div>
            </div>

            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 shadow-sm">
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-[11px] font-medium uppercase tracking-wider">Available Staff</span>
                <UserCheck className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-2xl font-bold text-emerald-400">{summary.totalAvailableWorkforce}</div>
              <div className="text-[11px] text-emerald-500/80 mt-0.5">{summary.siteCoverageRate}% SLA Coverage</div>
            </div>

            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 shadow-sm">
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-[11px] font-medium uppercase tracking-wider">Net Shortages</span>
                <TrendingDown className="w-4 h-4 text-rose-400" />
              </div>
              <div className={`text-2xl font-bold ${summary.netShortageCount > 0 ? 'text-rose-400' : 'text-slate-400'}`}>
                {summary.netShortageCount}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                {summary.understaffedShiftsCount} understaffed shifts
              </div>
            </div>

            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 shadow-sm">
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-[11px] font-medium uppercase tracking-wider">Critical Skill Gaps</span>
                <Award className="w-4 h-4 text-purple-400" />
              </div>
              <div className={`text-2xl font-bold ${summary.skillShortageShiftsCount > 0 ? 'text-purple-400' : 'text-slate-400'}`}>
                {summary.skillShortageShiftsCount}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">First Aid / Armed / Fire</div>
            </div>
          </div>

          {/* Interactive 11-Stage Workflow Pipeline Visualizer */}
          <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-400" />
                  Workforce Capacity Planning Pipeline
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  End-to-end mathematical reconciliation from site requirements to supervisor resolution
                </p>
              </div>
              <span className="text-xs text-slate-400 font-mono bg-slate-900 px-2.5 py-1 rounded-md border border-slate-800">
                Evaluation Date: {targetDate}
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-11 gap-2 text-center text-xs">
              {/* Step 1 */}
              <div className="p-2.5 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <div className="text-[10px] font-bold text-blue-400 uppercase">1. Required</div>
                <div className="text-sm font-bold text-slate-100 mt-0.5">{summary.totalRequiredWorkforce}</div>
                <div className="text-[9px] text-slate-400">Baseline</div>
              </div>

              {/* Step 2 */}
              <div className="p-2.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
                <div className="text-[10px] font-bold text-indigo-400 uppercase">2. Scheduled</div>
                <div className="text-sm font-bold text-slate-100 mt-0.5">{summary.totalScheduledWorkforce}</div>
                <div className="text-[9px] text-slate-400">Rostered</div>
              </div>

              {/* Step 3 */}
              <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <div className="text-[10px] font-bold text-amber-400 uppercase">3. Leave</div>
                <div className="text-sm font-bold text-amber-400 mt-0.5">-{summary.totalLeavesCount}</div>
                <div className="text-[9px] text-slate-400">Approved</div>
              </div>

              {/* Step 4 */}
              <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20">
                <div className="text-[10px] font-bold text-rose-400 uppercase">4. Absence</div>
                <div className="text-sm font-bold text-rose-400 mt-0.5">-{summary.totalAbsencesCount}</div>
                <div className="text-[9px] text-slate-400">No-Shows</div>
              </div>

              {/* Step 5 */}
              <div className="p-2.5 rounded-lg bg-teal-500/10 border border-teal-500/20">
                <div className="text-[10px] font-bold text-teal-400 uppercase">5. Overtime</div>
                <div className="text-sm font-bold text-teal-400 mt-0.5">+{summary.totalOvertimeCount}</div>
                <div className="text-[9px] text-slate-400">Relief / OT</div>
              </div>

              {/* Step 6 */}
              <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <div className="text-[10px] font-bold text-emerald-400 uppercase">6. Available</div>
                <div className="text-sm font-bold text-emerald-400 mt-0.5">{summary.totalAvailableWorkforce}</div>
                <div className="text-[9px] text-slate-400">Ready Staff</div>
              </div>

              {/* Step 7 */}
              <div className={`p-2.5 rounded-lg border ${summary.netShortageCount > 0 ? 'bg-rose-500/20 border-rose-500/40 text-rose-300' : 'bg-slate-900 border-slate-800 text-slate-400'}`}>
                <div className="text-[10px] font-bold uppercase">7. Shortage</div>
                <div className="text-sm font-bold mt-0.5">{summary.netShortageCount}</div>
                <div className="text-[9px]">SLA Delta</div>
              </div>

              {/* Step 8 */}
              <div className="p-2.5 rounded-lg bg-purple-500/10 border border-purple-500/20">
                <div className="text-[10px] font-bold text-purple-400 uppercase">8. Alert</div>
                <div className="text-sm font-bold text-purple-400 mt-0.5">{summary.openAlertsCount}</div>
                <div className="text-[9px] text-slate-400">Supervisor</div>
              </div>

              {/* Step 9 */}
              <div className="p-2.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
                <div className="text-[10px] font-bold text-cyan-400 uppercase">9. Match</div>
                <div className="text-sm font-bold text-cyan-400 mt-0.5">Auto</div>
                <div className="text-[9px] text-slate-400">Skill Engine</div>
              </div>

              {/* Step 10 */}
              <div className="p-2.5 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <div className="text-[10px] font-bold text-blue-400 uppercase">10. Approve</div>
                <div className="text-sm font-bold text-blue-400 mt-0.5">RBAC</div>
                <div className="text-[9px] text-slate-400">Ops Manager</div>
              </div>

              {/* Step 11 */}
              <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <div className="text-[10px] font-bold text-emerald-400 uppercase">11. Resolved</div>
                <div className="text-sm font-bold text-emerald-400 mt-0.5">{summary.resolvedTodayCount}</div>
                <div className="text-[9px] text-slate-400">Synced to Roster</div>
              </div>
            </div>
          </div>

          {/* TAB 1: DASHBOARD / SHIFT CAPACITY MATRIX */}
          {activeTab === 'DASHBOARD' && (
            <div className="space-y-4">
              {/* Filter Controls */}
              <div className="flex flex-col md:flex-row items-center justify-between gap-3 bg-slate-950/80 p-3 rounded-xl border border-slate-800">
                <div className="flex items-center gap-3 w-full md:w-auto">
                  <div className="relative flex-1 md:w-64">
                    <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search site, client or shift..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <select
                    value={selectedSiteFilter}
                    onChange={(e) => setSelectedSiteFilter(e.target.value)}
                    className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="ALL">All Sites ({sites.length})</option>
                    {sites.map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({(s as any).siteCode || s.clientName || 'Site'})</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
                  <button
                    onClick={() => setSelectedAnomalyFilter('ALL')}
                    className={`px-2.5 py-1 text-xs font-medium rounded-md whitespace-nowrap transition-all ${
                      selectedAnomalyFilter === 'ALL'
                        ? 'bg-slate-800 text-slate-100 border border-slate-700'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    All Statuses
                  </button>
                  <button
                    onClick={() => setSelectedAnomalyFilter('UNDERSTAFFING')}
                    className={`px-2.5 py-1 text-xs font-medium rounded-md whitespace-nowrap transition-all ${
                      selectedAnomalyFilter === 'UNDERSTAFFING'
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold'
                        : 'text-slate-400 hover:text-rose-300'
                    }`}
                  >
                    Understaffed
                  </button>
                  <button
                    onClick={() => setSelectedAnomalyFilter('CRITICAL_SKILL_SHORTAGE')}
                    className={`px-2.5 py-1 text-xs font-medium rounded-md whitespace-nowrap transition-all ${
                      selectedAnomalyFilter === 'CRITICAL_SKILL_SHORTAGE'
                        ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30 font-bold'
                        : 'text-slate-400 hover:text-purple-300'
                    }`}
                  >
                    Skill Gaps
                  </button>
                  <button
                    onClick={() => setSelectedAnomalyFilter('UNEXPECTED_ABSENCE')}
                    className={`px-2.5 py-1 text-xs font-medium rounded-md whitespace-nowrap transition-all ${
                      selectedAnomalyFilter === 'UNEXPECTED_ABSENCE'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold'
                        : 'text-slate-400 hover:text-amber-300'
                    }`}
                  >
                    Absences
                  </button>
                  <button
                    onClick={() => setSelectedAnomalyFilter('UNFILLED_SHIFTS')}
                    className={`px-2.5 py-1 text-xs font-medium rounded-md whitespace-nowrap transition-all ${
                      selectedAnomalyFilter === 'UNFILLED_SHIFTS'
                        ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30 font-bold'
                        : 'text-slate-400 hover:text-orange-300'
                    }`}
                  >
                    Unfilled
                  </button>
                  <button
                    onClick={() => setSelectedAnomalyFilter('OVERSTAFFING')}
                    className={`px-2.5 py-1 text-xs font-medium rounded-md whitespace-nowrap transition-all ${
                      selectedAnomalyFilter === 'OVERSTAFFING'
                        ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30 font-bold'
                        : 'text-slate-400 hover:text-blue-300'
                    }`}
                  >
                    Overstaffed
                  </button>
                </div>
              </div>

              {/* Site Capacity Cards Matrix */}
              {filteredAssessments.length === 0 ? (
                <div className="text-center py-16 bg-slate-950 border border-slate-800 rounded-xl">
                  <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3 opacity-80" />
                  <h3 className="text-base font-semibold text-slate-200">All Site Shifts Fully Compliant</h3>
                  <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                    No workforce shortages or critical skill gaps detected for {targetDate}. All shifts meet configured staffing baselines.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredAssessments.map(assessment => {
                    const site = assessment.site;
                    const hasCritical = assessment.overallStatus === 'CRITICAL';
                    const hasWarning = assessment.overallStatus === 'WARNING';

                    return (
                      <div
                        key={site.id}
                        className={`bg-slate-950/90 rounded-xl border transition-all ${
                          hasCritical 
                            ? 'border-rose-500/40 shadow-rose-950/20 shadow-lg'
                            : hasWarning
                            ? 'border-amber-500/40'
                            : 'border-slate-800'
                        }`}
                      >
                        {/* Site Header */}
                        <div className="px-5 py-3.5 border-b border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-900/50 rounded-t-xl">
                          <div className="flex items-center gap-3">
                            <div className={`w-3 h-3 rounded-full ${
                              hasCritical ? 'bg-rose-500 animate-pulse' : hasWarning ? 'bg-amber-400' : 'bg-emerald-400'
                            }`} />
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="text-sm font-bold text-slate-100">{site.name}</h3>
                                {(site as any).siteCode && <span className="text-[11px] font-mono text-slate-400">({(site as any).siteCode})</span>}
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                  hasCritical ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' :
                                  hasWarning ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                                  'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                }`}>
                                  {assessment.overallStatus}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                                <MapPin className="w-3 h-3 text-slate-500 dark:text-slate-400" />
                                <span>{site.address || 'Deployment Zone'}</span>
                                {(site as any).zone && <span>· Zone: {(site as any).zone}</span>}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-4 text-xs">
                            <div className="text-right">
                              <div className="text-slate-400 text-[10px] uppercase font-medium">Headcount Required / Available</div>
                              <div className="font-mono font-bold text-slate-200">
                                <span className="text-blue-400">{assessment.totalRequired} Req</span> · <span className="text-emerald-400">{assessment.totalAvailable} Avail</span>
                                {assessment.totalShortage > 0 && (
                                  <span className="text-rose-400 font-bold ml-1.5">(-{assessment.totalShortage} Short)</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Shifts Grid for Site */}
                        <div className="p-4 space-y-3">
                          {assessment.shiftsAssessment.map(({ shift, requirement, breakdown, anomalies, severity, incident }) => {
                            const isUnderstaffed = anomalies.includes('UNDERSTAFFING');
                            const isSkillMissing = anomalies.includes('CRITICAL_SKILL_SHORTAGE');
                            const isUnfilled = anomalies.includes('UNFILLED_SHIFTS');
                            const isAbsent = anomalies.includes('UNEXPECTED_ABSENCE');
                            const isOverstaffed = anomalies.includes('OVERSTAFFING');

                            const fillPercent = breakdown.requiredCount > 0 
                              ? Math.min(100, Math.round((breakdown.availableCount / breakdown.requiredCount) * 100))
                              : 100;

                            return (
                              <div
                                key={shift.id}
                                className={`p-3.5 rounded-lg border transition-all ${
                                  severity === 'CRITICAL'
                                    ? 'bg-rose-950/20 border-rose-500/40'
                                    : severity === 'HIGH'
                                    ? 'bg-amber-950/20 border-amber-500/40'
                                    : 'bg-slate-900/60 border-slate-800'
                                }`}
                              >
                                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                                  {/* Shift Details & Timing */}
                                  <div className="flex items-start gap-3 min-w-[240px]">
                                    <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 shrink-0">
                                      <Clock className="w-4 h-4" />
                                    </div>
                                    <div>
                                      <div className="flex items-center gap-2">
                                        <h4 className="text-xs font-bold text-slate-200">{shift.shiftName}</h4>
                                        <span className="text-[10px] font-mono text-slate-400">
                                          {shift.startTime} - {shift.endTime}
                                        </span>
                                      </div>

                                      {/* Anomaly Tags */}
                                      <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                                        {isUnfilled && (
                                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-orange-500/20 text-orange-400 border border-orange-500/30">
                                            Unfilled Shift (0 Rostered)
                                          </span>
                                        )}
                                        {isUnderstaffed && (
                                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                                            Understaffed (-{breakdown.shortageCount})
                                          </span>
                                        )}
                                        {isSkillMissing && (
                                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center gap-1">
                                            <Flame className="w-2.5 h-2.5" />
                                            Skill Floor Breach ({breakdown.missingSkills.map(m => m.skill).join(', ')})
                                          </span>
                                        )}
                                        {isAbsent && (
                                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                            Unexpected Absence ({breakdown.unexpectedAbsences.length})
                                          </span>
                                        )}
                                        {isOverstaffed && (
                                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                                            Overstaffed (+{breakdown.surplusCount})
                                          </span>
                                        )}
                                        {anomalies.length === 0 && (
                                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                            Compliant
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </div>

                                  {/* Visual Capacity Bar & Mathematical Breakdown */}
                                  <div className="flex-1 max-w-md">
                                    <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 mb-1">
                                      <span>
                                        Req: <strong className="text-blue-400">{breakdown.requiredCount}</strong> | Sched: {breakdown.scheduledCount} | Leave: -{breakdown.leaveCount} | Abs: -{breakdown.absenceCount}
                                      </span>
                                      <span className="font-bold text-slate-200">
                                        Avail: <span className={breakdown.availableCount < breakdown.requiredCount ? 'text-rose-400' : 'text-emerald-400'}>{breakdown.availableCount}</span> ({fillPercent}%)
                                      </span>
                                    </div>
                                    <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden flex">
                                      <div
                                        style={{ width: `${Math.min(100, (breakdown.availableCount / breakdown.requiredCount) * 100)}%` }}
                                        className={`h-full transition-all ${
                                          breakdown.availableCount < (requirement?.minHeadcount || 1)
                                            ? 'bg-rose-500'
                                            : breakdown.availableCount < breakdown.requiredCount
                                            ? 'bg-amber-400'
                                            : 'bg-emerald-400'
                                        }`}
                                      />
                                    </div>
                                  </div>

                                  {/* Action Buttons */}
                                  <div className="flex items-center gap-2 shrink-0">
                                    {incident && incident.stage !== 'RESOLVED' ? (
                                      <div className="flex items-center gap-2">
                                        {incident.stage === 'SHORTAGE_IDENTIFIED' && (
                                          <button
                                            onClick={() => handleOpenAlertModal(incident)}
                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-semibold shadow-sm transition-all"
                                          >
                                            <Send className="w-3.5 h-3.5" />
                                            <span>Alert Supervisor</span>
                                          </button>
                                        )}

                                        <button
                                          onClick={() => handleOpenReplacementModal(incident)}
                                          className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow-sm transition-all"
                                        >
                                          <Zap className="w-3.5 h-3.5" />
                                          <span>Match Replacement</span>
                                        </button>

                                        <button
                                          onClick={() => setTimelineIncident(incident)}
                                          className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-all"
                                          title="View Audit Trail"
                                        >
                                          <History className="w-4 h-4" />
                                        </button>
                                      </div>
                                    ) : (
                                      <button
                                        onClick={() => {
                                          if (requirement) setConfigModalRequirement(requirement);
                                        }}
                                        className="flex items-center gap-1 px-2.5 py-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg text-xs font-medium transition-all"
                                      >
                                        <Settings className="w-3.5 h-3.5" />
                                        <span>Baseline</span>
                                      </button>
                                    )}
                                  </div>
                                </div>

                                {/* Rostered Staff Pill Row */}
                                {breakdown.scheduledStaff.length > 0 && (
                                  <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex flex-wrap items-center gap-2">
                                    <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400">Rostered:</span>
                                    {breakdown.scheduledStaff.map(staff => (
                                      <div
                                        key={staff.employeeId}
                                        className={`px-2 py-0.5 rounded text-[11px] font-medium flex items-center gap-1.5 border ${
                                          staff.status === 'PRESENT'
                                            ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                                            : staff.status === 'ON_LEAVE'
                                            ? 'bg-amber-500/10 text-amber-300 border-amber-500/30 line-through opacity-70'
                                            : staff.status === 'ABSENT'
                                            ? 'bg-rose-500/10 text-rose-300 border-rose-500/30'
                                            : 'bg-slate-800 text-slate-300 border-slate-700'
                                        }`}
                                      >
                                        <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                                        <span>{staff.name}</span>
                                        {staff.status === 'PRESENT' && <span className="text-[9px] text-emerald-400 font-mono">({staff.punchTime?.slice(11, 16) || 'Punched'})</span>}
                                        {staff.status === 'ON_LEAVE' && <span className="text-[9px] text-amber-400">({staff.leaveType})</span>}
                                        {staff.status === 'ABSENT' && <span className="text-[9px] text-rose-400 font-bold">(No-Show)</span>}
                                        {staff.isOvertime && <span className="text-[9px] text-teal-400 font-bold">[OT]</span>}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: ACTIVE INCIDENTS & ALERTS */}
          {activeTab === 'INCIDENTS' && (
            <div className="space-y-4">
              <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800">
                <h3 className="text-sm font-bold text-slate-200">Active Workforce Shortage Incidents ({resolvedAssessments.incidents.length})</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Track alerts dispatched to supervisors, candidate replacements under review, and automated resolution workflows
                </p>
              </div>

              {resolvedAssessments.incidents.length === 0 ? (
                <div className="text-center py-16 bg-slate-950 border border-slate-800 rounded-xl">
                  <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3 opacity-80" />
                  <h3 className="text-base font-semibold text-slate-200">No Open Shortage Incidents</h3>
                  <p className="text-xs text-slate-400 mt-1">All shifts have sufficient staffing and skill coverage.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {resolvedAssessments.incidents.map(incident => (
                    <div
                      key={incident.id}
                      className={`p-4 rounded-xl border transition-all ${
                        incident.stage === 'RESOLVED'
                          ? 'bg-slate-950/60 border-slate-800 opacity-80'
                          : incident.severity === 'CRITICAL'
                          ? 'bg-rose-950/20 border-rose-500/40'
                          : 'bg-slate-950 border-slate-800'
                      }`}
                    >
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              incident.severity === 'CRITICAL' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' :
                              incident.severity === 'HIGH' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                              'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                            }`}>
                              {incident.severity}
                            </span>
                            <h4 className="text-sm font-bold text-slate-200">
                              {incident.siteName} — {incident.shiftName}
                            </h4>
                            <span className="text-xs text-slate-400 font-mono">({incident.date})</span>
                          </div>

                          <p className="text-xs text-slate-400 mt-1">
                            Anomalies: <strong className="text-slate-200">{incident.anomalyTypes.join(', ')}</strong> · Required: {incident.breakdown.requiredCount} · Available: {incident.breakdown.availableCount} · Deficit: <span className="text-rose-400 font-bold">{incident.breakdown.shortageCount}</span>
                          </p>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="text-right text-xs">
                            <div className="text-[10px] text-slate-400 uppercase font-medium">Workflow Stage</div>
                            <div className="font-bold text-indigo-400">{incident.stage}</div>
                          </div>

                          {incident.stage !== 'RESOLVED' && (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleOpenAlertModal(incident)}
                                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold border border-slate-700 transition-all"
                              >
                                Alert
                              </button>
                              <button
                                onClick={() => handleOpenReplacementModal(incident)}
                                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow-sm transition-all"
                              >
                                Replace
                              </button>
                            </div>
                          )}

                          <button
                            onClick={() => setTimelineIncident(incident)}
                            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-all"
                          >
                            <History className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Replacement Proposal Banner */}
                      {incident.replacementProposal && (
                        <div className="mt-3 p-2.5 rounded-lg bg-indigo-950/30 border border-indigo-500/20 text-xs flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Zap className="w-4 h-4 text-indigo-400" />
                            <span>
                              Proposed Relief: <strong className="text-slate-200">{incident.replacementProposal.candidateName}</strong> ({incident.replacementProposal.sourceType}) · Match Score: {incident.replacementProposal.skillMatchScore}%
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono">
                            Proposed at: {incident.replacementProposal.proposedAt.slice(11, 16)}
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: SITE STAFFING BASELINES (REQUIREMENTS CONFIG) */}
          {activeTab === 'REQUIREMENTS' && (
            <div className="space-y-4">
              <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-200">Site & Shift Staffing Requirements</h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Define baseline headcounts, critical SLA floors, and mandatory skill certifications per site
                  </p>
                </div>

                <button
                  onClick={() => {
                    if (sites.length > 0 && shifts.length > 0) {
                      setConfigModalRequirement({
                        id: `REQ-${Date.now()}`,
                        companyId: activeCompany.companyId,
                        siteId: sites[0].id,
                        siteName: sites[0].name,
                        shiftId: shifts[0].id,
                        shiftName: shifts[0].shiftName,
                        requiredHeadcount: 2,
                        minHeadcount: 1,
                        maxHeadcount: 4,
                        requiredSkills: [{ skill: 'UNARMED_SECURITY', minCount: 1 }],
                        applicableDays: [0, 1, 2, 3, 4, 5, 6],
                        isActive: true,
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString()
                      });
                    }
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow-sm transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>New Requirement</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {requirements.map(req => (
                  <div key={req.id} className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-slate-200">{req.siteName}</h4>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                        {req.shiftName}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center text-xs py-2 bg-slate-900/50 rounded-lg border border-slate-800/80">
                      <div>
                        <div className="text-[10px] text-slate-400">Target</div>
                        <div className="font-bold text-blue-400 text-sm mt-0.5">{req.requiredHeadcount}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-400">Min Floor</div>
                        <div className="font-bold text-rose-400 text-sm mt-0.5">{req.minHeadcount}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-400">Max Cap</div>
                        <div className="font-bold text-emerald-400 text-sm mt-0.5">{req.maxHeadcount}</div>
                      </div>
                    </div>

                    {req.requiredSkills && req.requiredSkills.length > 0 && (
                      <div className="space-y-1">
                        <div className="text-[10px] font-bold text-slate-400 uppercase">Mandatory Skills:</div>
                        <div className="flex flex-wrap gap-1">
                          {req.requiredSkills.map((sk, idx) => (
                            <span key={idx} className="px-2 py-0.5 bg-purple-500/10 text-purple-300 border border-purple-500/20 rounded text-[10px] font-medium">
                              {sk.skill} (min {sk.minCount})
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">Days: {req.applicableDays.length === 7 ? 'All Week' : `${req.applicableDays.length} Days`}</span>
                      <button
                        onClick={() => setConfigModalRequirement(req)}
                        className="text-indigo-400 hover:text-indigo-300 font-semibold"
                      >
                        Edit Rule
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: ANDROID KOTLIN ARCHITECTURE SPEC */}
          {activeTab === 'KOTLIN_SPEC' && (
            <div className="space-y-4">
              <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800">
                <div className="flex items-center gap-2">
                  <Code2 className="w-5 h-5 text-indigo-400" />
                  <h3 className="text-sm font-bold text-slate-200">Android Kotlin Architecture & Models</h3>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Synchronized Kotlin data classes, Room entity models, and Repository logic matching the Web App and Firestore backend.
                </p>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 font-mono text-xs text-slate-300 overflow-x-auto space-y-4">
                <div className="text-indigo-400 font-bold">// 1. Android Kotlin Data Model: WorkforceShortageIncident.kt</div>
                <pre className="text-[11px] text-slate-300 leading-relaxed bg-slate-900 p-4 rounded-lg border border-slate-800">
{`package com.logsheetmuster.android.domain.model.capacity

import androidx.room.Entity
import androidx.room.PrimaryKey
import com.google.firebase.firestore.PropertyName

enum class WorkforceAnomalyType {
    UNDERSTAFFING, OVERSTAFFING, UNFILLED_SHIFTS, CRITICAL_SKILL_SHORTAGE, UNEXPECTED_ABSENCE
}

enum class ShortageSeverity { CRITICAL, HIGH, MEDIUM, LOW }

enum class ShortageWorkflowStage {
    REQUIRED_EVALUATED, SCHEDULED_EVALUATED, AVAILABLE_EVALUATED, LEAVE_DEDUCTED,
    ABSENCE_DETECTED, OVERTIME_FACTORED, SHORTAGE_IDENTIFIED, SUPERVISOR_ALERTED,
    REPLACEMENT_PROPOSED, APPROVAL_PENDING, APPROVED, RESOLVED, DISMISSED
}

@Entity(tableName = "workforce_shortage_incidents")
data class WorkforceShortageIncident(
    @PrimaryKey val id: String = "",
    val companyId: String = "",
    val siteId: String = "",
    val siteName: String = "",
    val shiftId: String = "",
    val shiftName: String = "",
    val date: String = "",
    val stage: ShortageWorkflowStage = ShortageWorkflowStage.SHORTAGE_IDENTIFIED,
    val primaryAnomaly: WorkforceAnomalyType = WorkforceAnomalyType.UNDERSTAFFING,
    val severity: ShortageSeverity = ShortageSeverity.HIGH,
    val requiredCount: Int = 0,
    val availableCount: Int = 0,
    val shortageCount: Int = 0,
    val supervisorId: String? = null,
    val supervisorPhone: String? = null,
    val alertDispatchedAt: String? = null,
    val replacementCandidateId: String? = null,
    val replacementCandidateName: String? = null,
    val resolvedAt: String? = null
)`}
                </pre>

                <div className="text-indigo-400 font-bold">// 2. Android Kotlin Capacity Assessment Engine: WorkforceCapacityEngine.kt</div>
                <pre className="text-[11px] text-slate-300 leading-relaxed bg-slate-900 p-4 rounded-lg border border-slate-800">
{`package com.logsheetmuster.android.domain.engine

class WorkforceCapacityEngine {
    fun calculateShiftAvailableStaff(
        scheduledCount: Int,
        approvedLeavesCount: Int,
        unexpectedAbsencesCount: Int,
        overtimeReliefCount: Int
    ): Int {
        val effective = scheduledCount - approvedLeavesCount - unexpectedAbsencesCount + overtimeReliefCount
        return maxOf(0, effective)
    }

    fun detectAnomalies(
        required: Int,
        minFloor: Int,
        available: Int,
        scheduled: Int,
        missingSkillsCount: Int
    ): List<WorkforceAnomalyType> {
        val anomalies = mutableListOf<WorkforceAnomalyType>()
        if (scheduled == 0 && required > 0) anomalies.add(WorkforceAnomalyType.UNFILLED_SHIFTS)
        if (available < required) anomalies.add(WorkforceAnomalyType.UNDERSTAFFING)
        if (missingSkillsCount > 0) anomalies.add(WorkforceAnomalyType.CRITICAL_SKILL_SHORTAGE)
        return anomalies
    }
}`}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* --- MODAL 1: SUPERVISOR ALERT DISPATCH --- */}
      <AnimatePresence>
        {alertModalIncident && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-slate-800 rounded-xl max-w-lg w-full p-6 space-y-4 shadow-xl text-slate-100"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-rose-400" />
                  <h3 className="text-sm font-bold text-slate-100">Dispatch Supervisor Alert</h3>
                </div>
                <button onClick={() => setAlertModalIncident(null)} className="text-slate-400 hover:text-slate-200">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-1">
                  <div><strong>Target Site:</strong> {alertModalIncident.siteName}</div>
                  <div><strong>Shift:</strong> {alertModalIncident.shiftName} ({alertModalIncident.shiftStartTime} - {alertModalIncident.shiftEndTime})</div>
                  <div><strong>Date:</strong> {alertModalIncident.date}</div>
                  <div><strong>Assigned Supervisor:</strong> {alertModalIncident.supervisorName || 'Site Supervisor'} ({alertModalIncident.supervisorPhone || 'Auto Phone Dispatch'})</div>
                  <div><strong>Shortage Deficit:</strong> <span className="text-rose-400 font-bold">{alertModalIncident.breakdown.shortageCount} personnel required</span></div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    SMS / In-App Notification Message:
                  </label>
                  <textarea
                    rows={4}
                    value={customAlertMsg}
                    onChange={(e) => setCustomAlertMsg(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  onClick={() => setAlertModalIncident(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSendSupervisorAlert}
                  disabled={isDispatchingAlert}
                  className="flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-semibold shadow-sm transition-all disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isDispatchingAlert ? 'Dispatching...' : 'Dispatch Alert'}</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- MODAL 2: SMART REPLACEMENT & ONE-CLICK DISPATCH --- */}
      <AnimatePresence>
        {replacementModalIncident && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-slate-800 rounded-xl max-w-2xl w-full p-6 space-y-4 shadow-xl text-slate-100 max-h-[90vh] flex flex-col"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-3 shrink-0">
                <div className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-indigo-400" />
                  <h3 className="text-sm font-bold text-slate-100">
                    Smart Replacement Matcher: {replacementModalIncident.siteName}
                  </h3>
                </div>
                <button onClick={() => setReplacementModalIncident(null)} className="text-slate-400 hover:text-slate-200">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                {/* Shortage Diagnosis Box */}
                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span><strong>Shift:</strong> {replacementModalIncident.shiftName} ({replacementModalIncident.date})</span>
                    <span className="text-rose-400 font-bold">Deficit: -{replacementModalIncident.breakdown.shortageCount} Staff</span>
                  </div>
                  {replacementModalIncident.breakdown.missingSkills.length > 0 && (
                    <div className="text-purple-300">
                      <strong>Missing Skills:</strong> {replacementModalIncident.breakdown.missingSkills.map(m => `${m.skill} (need ${m.deficit})`).join(', ')}
                    </div>
                  )}
                </div>

                {/* Candidate Selection List */}
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-slate-300">
                    Ranked Available Candidates ({replacementCandidates.length} eligible)
                  </label>

                  {isLoadingCandidates ? (
                    <div className="text-center py-8 text-xs text-slate-400 flex items-center justify-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-indigo-400" />
                      <span>Scanning reserve pools & computing rest compliance...</span>
                    </div>
                  ) : replacementCandidates.length === 0 ? (
                    <div className="text-center py-8 bg-slate-950 rounded-lg border border-slate-800 text-xs text-slate-400">
                      No matching stand-by candidates available. Consider cross-site emergency transfer.
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {replacementCandidates.map(cand => {
                        const isSelected = selectedCandidate?.employeeId === cand.employeeId;
                        return (
                          <div
                            key={cand.employeeId}
                            onClick={() => {
                              setSelectedCandidate(cand);
                              setCandidateSourceType(cand.sourceType);
                            }}
                            className={`p-3 rounded-lg border cursor-pointer transition-all ${
                              isSelected
                                ? 'bg-indigo-950/40 border-indigo-500 shadow-md'
                                : 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
                            }`}
                          >
                            <div className="flex items-center justify-between text-xs">
                              <div className="flex items-center gap-2.5">
                                <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                                  isSelected ? 'border-indigo-400 bg-indigo-600 text-white' : 'border-slate-600'
                                }`}>
                                  {isSelected && <Check className="w-2.5 h-2.5" />}
                                </div>
                                <div>
                                  <div className="font-bold text-slate-200">{cand.fullName}</div>
                                  <div className="text-[11px] text-slate-400">
                                    {cand.designation} · Base Site: {cand.assignedSiteName}
                                  </div>
                                </div>
                              </div>

                              <div className="text-right">
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                                  {cand.skillMatchScore}% Match
                                </span>
                                <div className="text-[10px] text-slate-400 mt-0.5">
                                  {cand.restHoursSinceLastShift}h Rest · {cand.weeklyOvertimeHours}h OT
                                </div>
                              </div>
                            </div>

                            <div className="flex flex-wrap gap-1 mt-2">
                              {cand.skills.map((s, idx) => (
                                <span key={idx} className="px-1.5 py-0.2 rounded text-[9px] bg-slate-800 text-slate-300">
                                  {s}
                                </span>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Source Selection & Approval Notes */}
                {selectedCandidate && (
                  <div className="space-y-3 pt-2 border-t border-slate-800 text-xs">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Deployment Type:
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {(['STANDBY_POOL', 'OVERTIME_EXTENSION', 'CROSS_SITE_TRANSFER'] as const).map(type => (
                          <button
                            key={type}
                            type="button"
                            onClick={() => setCandidateSourceType(type)}
                            className={`p-2 rounded-lg text-center text-xs font-medium border transition-all ${
                              candidateSourceType === type
                                ? 'bg-indigo-600 text-white border-indigo-500'
                                : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
                            }`}
                          >
                            {type.replace(/_/g, ' ')}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Approval & Authorization Notes:
                      </label>
                      <input
                        type="text"
                        value={approvalNotes}
                        onChange={(e) => setApprovalNotes(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-800 shrink-0">
                <span className="text-[11px] text-slate-400">
                  {selectedCandidate ? `Est. Shift Cost: ₹${selectedCandidate.estimatedCostPerShift}` : ''}
                </span>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setReplacementModalIncident(null)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeployReplacement}
                    disabled={!selectedCandidate || isDeployingReplacement}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow-sm transition-all disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{isDeployingReplacement ? 'Authorizing...' : 'Authorize & Deploy to Roster'}</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- MODAL 3: CONFIGURE SITE STAFFING REQUIREMENT --- */}
      <AnimatePresence>
        {configModalRequirement && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-6 space-y-4 shadow-xl text-slate-100"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="w-5 h-5 text-indigo-400" />
                  <h3 className="text-sm font-bold text-slate-100">Configure Staffing Baseline</h3>
                </div>
                <button onClick={() => setConfigModalRequirement(null)} className="text-slate-400 hover:text-slate-200">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Site</label>
                  <select
                    value={configModalRequirement.siteId}
                    onChange={(e) => {
                      const s = sites.find(item => item.id === e.target.value);
                      setConfigModalRequirement({
                        ...configModalRequirement,
                        siteId: e.target.value,
                        siteName: s?.name || 'Site'
                      });
                    }}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-slate-200 focus:outline-none"
                  >
                    {sites.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Shift</label>
                  <select
                    value={configModalRequirement.shiftId}
                    onChange={(e) => {
                      const sh = shifts.find(item => item.id === e.target.value);
                      setConfigModalRequirement({
                        ...configModalRequirement,
                        shiftId: e.target.value,
                        shiftName: sh?.shiftName || 'Shift'
                      });
                    }}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-slate-200 focus:outline-none"
                  >
                    {shifts.map(sh => (
                      <option key={sh.id} value={sh.id}>{sh.shiftName} ({sh.startTime}-{sh.endTime})</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Target Headcount</label>
                    <input
                      type="number"
                      min={1}
                      value={configModalRequirement.requiredHeadcount}
                      onChange={(e) => setConfigModalRequirement({
                        ...configModalRequirement,
                        requiredHeadcount: Number(e.target.value)
                      })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-slate-200 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Min SLA Floor</label>
                    <input
                      type="number"
                      min={1}
                      value={configModalRequirement.minHeadcount}
                      onChange={(e) => setConfigModalRequirement({
                        ...configModalRequirement,
                        minHeadcount: Number(e.target.value)
                      })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-slate-200 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Max Ceiling</label>
                    <input
                      type="number"
                      min={1}
                      value={configModalRequirement.maxHeadcount}
                      onChange={(e) => setConfigModalRequirement({
                        ...configModalRequirement,
                        maxHeadcount: Number(e.target.value)
                      })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-slate-200 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  onClick={() => setConfigModalRequirement(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleSaveRequirement(configModalRequirement)}
                  disabled={isSavingRequirement}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow-sm transition-all disabled:opacity-50"
                >
                  {isSavingRequirement ? 'Saving...' : 'Save Baseline'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- DRAWER: AUDIT TRAIL TIMELINE --- */}
      <AnimatePresence>
        {timelineIncident && (
          <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/60 backdrop-blur-sm">
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 250 }}
              className="w-full max-w-md bg-slate-900 border-l border-slate-800 h-full p-6 flex flex-col space-y-4 shadow-2xl text-slate-100"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <History className="w-5 h-5 text-indigo-400" />
                  <h3 className="text-sm font-bold text-slate-100">Audit & Resolution History</h3>
                </div>
                <button onClick={() => setTimelineIncident(null)} className="text-slate-400 hover:text-slate-200">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-4 pr-1 text-xs">
                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-1">
                  <div><strong>Site:</strong> {timelineIncident.siteName}</div>
                  <div><strong>Shift:</strong> {timelineIncident.shiftName}</div>
                  <div><strong>Date:</strong> {timelineIncident.date}</div>
                  <div><strong>Stage:</strong> <span className="text-indigo-400 font-bold">{timelineIncident.stage}</span></div>
                </div>

                <div className="space-y-3 relative before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
                  {timelineIncident.timeline.map((entry, idx) => (
                    <div key={idx} className="relative pl-6 space-y-1">
                      <div className="absolute left-0 top-1 w-4 h-4 rounded-full bg-slate-800 border-2 border-indigo-500 flex items-center justify-center">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-bold text-slate-200">{entry.stage}</span>
                        <span className="text-slate-500 dark:text-slate-400 font-mono">{entry.timestamp.slice(11, 19)}</span>
                      </div>
                      <p className="text-slate-400">{entry.note}</p>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400">Actor: {entry.actor} ({entry.actorRole || 'USER'})</div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
