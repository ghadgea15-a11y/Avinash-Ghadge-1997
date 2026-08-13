import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  QrCode, 
  Users, 
  Truck, 
  FileText, 
  MapPin, 
  Plus, 
  Search, 
  Filter, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Download, 
  RefreshCw, 
  Building2, 
  Clock, 
  Calendar, 
  UserCheck, 
  Edit3, 
  Trash2, 
  ChevronRight, 
  Check, 
  X, 
  Navigation, 
  Info, 
  Eye, 
  Flame, 
  ShieldCheck, 
  Lock, 
  Layers
} from 'lucide-react';
import { 
  UserSession, 
  CompanyTenant, 
  PhaseAScreen, 
  SiteRecord, 
  PatrolCheckpointRecord, 
  PatrolLogRecord, 
  IncidentReportRecord, 
  VisitorLogRecord, 
  MaterialMovementRecord, 
  DailySiteLogRecord,
  EmployeeRecord 
} from '../../types';
import { FirestoreService } from '../../services/firestoreService';
import { useTheme } from '../../context/ThemeContext';

interface SiteOperationsScreenProps {
  userSession: UserSession;
  activeCompany: CompanyTenant | null;
  isOnline: boolean;
  onNavigate: (screen: PhaseAScreen) => void;
}

export const SiteOperationsScreen: React.FC<SiteOperationsScreenProps> = ({
  userSession,
  activeCompany,
  isOnline,
  onNavigate
}) => {
  const { isDark } = useTheme();
  const companyId = activeCompany?.companyId || userSession.companyId;

  // Active Tab
  const [activeTab, setActiveTab] = useState<'PATROLS' | 'INCIDENTS' | 'VISITORS' | 'MATERIALS' | 'DAILY_LOGS'>('PATROLS');

  // Data States
  const [sites, setSites] = useState<SiteRecord[]>([]);
  const [employees, setEmployees] = useState<EmployeeRecord[]>([]);
  const [checkpoints, setCheckpoints] = useState<PatrolCheckpointRecord[]>([]);
  const [patrolLogs, setPatrolLogs] = useState<PatrolLogRecord[]>([]);
  const [incidents, setIncidents] = useState<IncidentReportRecord[]>([]);
  const [visitors, setVisitors] = useState<VisitorLogRecord[]>([]);
  const [materials, setMaterials] = useState<MaterialMovementRecord[]>([]);
  const [dailySiteLogs, setDailySiteLogs] = useState<DailySiteLogRecord[]>([]);
  
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [statusMsg, setStatusMsg] = useState<{ type: 'SUCCESS' | 'ERROR' | 'INFO'; text: string } | null>(null);

  // Filters
  const [selectedSiteId, setSelectedSiteId] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // Modals & Form States
  // 1. Checkpoint Modal
  const [isCheckpointModalOpen, setIsCheckpointModalOpen] = useState<boolean>(false);
  const [checkpointForm, setCheckpointForm] = useState<{
    siteId: string;
    checkpointName: string;
    code: string;
    locationDescription: string;
    sequenceOrder: number;
  }>({ siteId: '', checkpointName: '', code: '', locationDescription: '', sequenceOrder: 1 });

  // 2. Incident Modal
  const [isIncidentModalOpen, setIsIncidentModalOpen] = useState<boolean>(false);
  const [incidentForm, setIncidentForm] = useState<{
    siteId: string;
    title: string;
    category: IncidentReportRecord['category'];
    severity: IncidentReportRecord['severity'];
    description: string;
  }>({ siteId: '', title: '', category: 'SECURITY_BREACH', severity: 'MEDIUM', description: '' });

  // 3. Visitor Check-in Modal
  const [isVisitorModalOpen, setIsVisitorModalOpen] = useState<boolean>(false);
  const [visitorForm, setVisitorForm] = useState<{
    siteId: string;
    visitorName: string;
    visitorPhone: string;
    visitorCompany: string;
    hostEmployeeName: string;
    purpose: string;
    badgeNumber: string;
    vehicleNumber: string;
  }>({ siteId: '', visitorName: '', visitorPhone: '', visitorCompany: '', hostEmployeeName: '', purpose: 'Official Meeting', badgeNumber: '', vehicleNumber: '' });

  // 4. Material Pass Modal
  const [isMaterialModalOpen, setIsMaterialModalOpen] = useState<boolean>(false);
  const [materialForm, setMaterialForm] = useState<{
    siteId: string;
    movementType: 'INWARD' | 'OUTWARD';
    gatePassNumber: string;
    materialDescription: string;
    quantity: string;
    supplierVendorName: string;
    vehicleNumber: string;
    driverName: string;
    driverPhone: string;
  }>({ siteId: '', movementType: 'INWARD', gatePassNumber: '', materialDescription: '', quantity: '1 Unit', supplierVendorName: '', vehicleNumber: '', driverName: '', driverPhone: '' });

  // Active Patrol Simulation
  const [activePatrolCheckpointsVisited, setActivePatrolCheckpointsVisited] = useState<string[]>([]);
  const [isPatrolActive, setIsPatrolActive] = useState<boolean>(false);

  // User Role checks
  const isSuperAdmin = userSession.role === 'SUPER_ADMIN';
  const isCompanyAdmin = userSession.role === 'COMPANY_ADMIN';
  const isManager = userSession.role === 'OPS_MANAGER' || userSession.role === 'HR_ADMIN' || userSession.role === 'FIELD_OFFICER';

  // Subscriptions
  useEffect(() => {
    if (!companyId) return;
    setIsLoading(true);

    FirestoreService.getSites(companyId).then(siteList => {
      setSites(siteList);
      if (siteList.length > 0) {
        setSelectedSiteId(siteList[0].id);
      }
    });

    FirestoreService.subscribeToEmployees(companyId, setEmployees);

    const unsubPatrols = FirestoreService.subscribeToPatrolLogs(companyId, logs => setPatrolLogs(logs));
    const unsubIncidents = FirestoreService.subscribeToIncidentReports(companyId, reps => setIncidents(reps));
    const unsubVisitors = FirestoreService.subscribeToVisitorLogs(companyId, vList => setVisitors(vList));
    const unsubMaterials = FirestoreService.subscribeToMaterialLogs(companyId, mList => setMaterials(mList));
    const unsubDaily = FirestoreService.subscribeToDailySiteLogs(companyId, dList => setDailySiteLogs(dList));

    setIsLoading(false);

    return () => {
      unsubPatrols();
      unsubIncidents();
      unsubVisitors();
      unsubMaterials();
      unsubDaily();
    };
  }, [companyId]);

  // Load Checkpoints when site changes
  useEffect(() => {
    if (!companyId) return;
    FirestoreService.getPatrolCheckpoints(companyId, selectedSiteId).then(setCheckpoints);
  }, [companyId, selectedSiteId]);

  // ----------------------------------------------------
  // HANDLERS: CHECKPOINTS & PATROL TOUR
  // ----------------------------------------------------
  const handleSaveCheckpoint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId || !checkpointForm.checkpointName || !checkpointForm.siteId) {
      setStatusMsg({ type: 'ERROR', text: 'Checkpoint name and Site selection required.' });
      return;
    }

    const code = checkpointForm.code || `CP-${Math.floor(100 + Math.random() * 900)}`;
    const newCp: PatrolCheckpointRecord = {
      id: `CP-${Date.now()}`,
      companyId,
      siteId: checkpointForm.siteId,
      checkpointName: checkpointForm.checkpointName.trim(),
      code,
      qrCode: `LSM-QR-${code}`,
      locationDescription: checkpointForm.locationDescription,
      sequenceOrder: Number(checkpointForm.sequenceOrder) || 1,
      status: 'ACTIVE',
      createdAt: new Date().toISOString()
    };

    setIsLoading(true);
    const ok = await FirestoreService.savePatrolCheckpoint(companyId, newCp);
    setIsLoading(false);

    if (ok) {
      setStatusMsg({ type: 'SUCCESS', text: `Checkpoint '${newCp.checkpointName}' added successfully.` });
      setIsCheckpointModalOpen(false);
      setCheckpointForm({ siteId: selectedSiteId, checkpointName: '', code: '', locationDescription: '', sequenceOrder: checkpoints.length + 1 });
      FirestoreService.getPatrolCheckpoints(companyId, selectedSiteId).then(setCheckpoints);
    } else {
      setStatusMsg({ type: 'ERROR', text: 'Failed to save checkpoint.' });
    }
  };

  const handleStartPatrol = () => {
    if (checkpoints.length === 0) {
      setStatusMsg({ type: 'INFO', text: 'Please add at least one checkpoint before starting patrol tour.' });
      return;
    }
    setIsPatrolActive(true);
    setActivePatrolCheckpointsVisited([]);
    setStatusMsg({ type: 'INFO', text: 'Patrol Tour started. Scan QR code checkpoints in sequence.' });
  };

  const handleScanCheckpoint = (cpId: string) => {
    if (!activePatrolCheckpointsVisited.includes(cpId)) {
      setActivePatrolCheckpointsVisited(prev => [...prev, cpId]);
      setStatusMsg({ type: 'SUCCESS', text: 'Checkpoint verified & GPS logged.' });
    }
  };

  const handleCompletePatrol = async () => {
    if (!companyId) return;

    const siteObj = sites.find(s => s.id === selectedSiteId);
    const isFinished = activePatrolCheckpointsVisited.length === checkpoints.length;

    const patrolLog: PatrolLogRecord = {
      id: `PATROL-${Date.now()}`,
      companyId,
      siteId: selectedSiteId,
      siteName: siteObj?.name || 'Main Site',
      patrolName: `Routine Patrol #${patrolLogs.length + 1}`,
      guardId: userSession.employeeId,
      guardName: userSession.fullName,
      startTime: new Date().toISOString(),
      endTime: new Date().toISOString(),
      checkpointsVisited: activePatrolCheckpointsVisited,
      totalCheckpoints: checkpoints.length,
      status: isFinished ? 'COMPLETED' : 'INCOMPLETE',
      remarks: isFinished ? 'All checkpoints verified in order.' : 'Patrol ended early.',
      createdAt: new Date().toISOString()
    };

    setIsLoading(true);
    const ok = await FirestoreService.savePatrolLog(companyId, patrolLog);
    setIsLoading(false);

    if (ok) {
      setStatusMsg({ type: 'SUCCESS', text: `Patrol Tour logged as ${patrolLog.status}.` });
      setIsPatrolActive(false);
      setActivePatrolCheckpointsVisited([]);
    } else {
      setStatusMsg({ type: 'ERROR', text: 'Failed to save patrol log.' });
    }
  };

  // ----------------------------------------------------
  // HANDLERS: INCIDENTS
  // ----------------------------------------------------
  const handleSaveIncident = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId || !incidentForm.title || !incidentForm.description) {
      setStatusMsg({ type: 'ERROR', text: 'Incident Title and Description are required.' });
      return;
    }

    const siteObj = sites.find(s => s.id === incidentForm.siteId);
    const newInc: IncidentReportRecord = {
      id: `INC-${Date.now()}`,
      companyId,
      siteId: incidentForm.siteId || selectedSiteId,
      siteName: siteObj?.name || 'Main Site',
      reportedById: userSession.employeeId,
      reportedByName: userSession.fullName,
      title: incidentForm.title.trim(),
      category: incidentForm.category,
      severity: incidentForm.severity,
      description: incidentForm.description.trim(),
      status: 'OPEN',
      reportedAt: new Date().toISOString()
    };

    setIsLoading(true);
    const ok = await FirestoreService.saveIncidentReport(companyId, newInc);
    setIsLoading(false);

    if (ok) {
      setStatusMsg({ type: 'SUCCESS', text: `Incident '${newInc.title}' reported.` });
      setIsIncidentModalOpen(false);
      setIncidentForm({ siteId: selectedSiteId, title: '', category: 'SECURITY_BREACH', severity: 'MEDIUM', description: '' });
    } else {
      setStatusMsg({ type: 'ERROR', text: 'Failed to report incident.' });
    }
  };

  const handleUpdateIncidentStatus = async (reportId: string, status: IncidentReportRecord['status']) => {
    if (!companyId) return;
    setIsLoading(true);
    const ok = await FirestoreService.updateIncidentStatus(
      companyId,
      reportId,
      status,
      `Status updated to ${status} by ${userSession.fullName}`,
      userSession.userId,
      userSession.fullName
    );
    setIsLoading(false);

    if (ok) {
      setStatusMsg({ type: 'SUCCESS', text: `Incident status updated to ${status}.` });
    } else {
      setStatusMsg({ type: 'ERROR', text: 'Failed to update incident status.' });
    }
  };

  // ----------------------------------------------------
  // HANDLERS: VISITORS
  // ----------------------------------------------------
  const handleCheckInVisitor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId || !visitorForm.visitorName || !visitorForm.visitorPhone) {
      setStatusMsg({ type: 'ERROR', text: 'Visitor Name and Phone Number are required.' });
      return;
    }

    const siteObj = sites.find(s => s.id === visitorForm.siteId);
    const badgeNumber = visitorForm.badgeNumber || `VIS-${Math.floor(100 + Math.random() * 900)}`;

    const newVis: VisitorLogRecord = {
      id: `VISLOG-${Date.now()}`,
      companyId,
      siteId: visitorForm.siteId || selectedSiteId,
      siteName: siteObj?.name || 'Main Site',
      visitorName: visitorForm.visitorName.trim(),
      visitorPhone: visitorForm.visitorPhone.trim(),
      visitorCompany: visitorForm.visitorCompany.trim() || 'Guest',
      hostEmployeeName: visitorForm.hostEmployeeName.trim() || 'Duty Officer',
      purpose: visitorForm.purpose,
      badgeNumber,
      vehicleNumber: visitorForm.vehicleNumber.trim(),
      checkInTime: new Date().toISOString(),
      status: 'IN_SITE',
      entryGateGuardId: userSession.employeeId,
      createdAt: new Date().toISOString()
    };

    setIsLoading(true);
    const ok = await FirestoreService.checkInVisitor(companyId, newVis);
    setIsLoading(false);

    if (ok) {
      setStatusMsg({ type: 'SUCCESS', text: `Visitor ${newVis.visitorName} checked in with Badge #${badgeNumber}.` });
      setIsVisitorModalOpen(false);
      setVisitorForm({ siteId: selectedSiteId, visitorName: '', visitorPhone: '', visitorCompany: '', hostEmployeeName: '', purpose: 'Official Meeting', badgeNumber: '', vehicleNumber: '' });
    } else {
      setStatusMsg({ type: 'ERROR', text: 'Failed to check in visitor.' });
    }
  };

  const handleCheckOutVisitor = async (visitorId: string) => {
    if (!companyId) return;
    setIsLoading(true);
    const ok = await FirestoreService.checkOutVisitor(companyId, visitorId);
    setIsLoading(false);

    if (ok) {
      setStatusMsg({ type: 'SUCCESS', text: 'Visitor checked out from site.' });
    } else {
      setStatusMsg({ type: 'ERROR', text: 'Failed to check out visitor.' });
    }
  };

  // ----------------------------------------------------
  // HANDLERS: MATERIAL GATE PASS
  // ----------------------------------------------------
  const handleSaveMaterialPass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId || !materialForm.materialDescription || !materialForm.supplierVendorName) {
      setStatusMsg({ type: 'ERROR', text: 'Material Description and Vendor Name required.' });
      return;
    }

    const siteObj = sites.find(s => s.id === materialForm.siteId);
    const gatePassNumber = materialForm.gatePassNumber || `GP-${Math.floor(1000 + Math.random() * 9000)}`;

    const newMat: MaterialMovementRecord = {
      id: `MAT-${Date.now()}`,
      companyId,
      siteId: materialForm.siteId || selectedSiteId,
      siteName: siteObj?.name || 'Main Site',
      movementType: materialForm.movementType,
      gatePassNumber,
      materialDescription: materialForm.materialDescription.trim(),
      quantity: materialForm.quantity,
      supplierVendorName: materialForm.supplierVendorName.trim(),
      vehicleNumber: materialForm.vehicleNumber.trim(),
      driverName: materialForm.driverName.trim(),
      driverPhone: materialForm.driverPhone.trim(),
      status: 'PENDING_APPROVAL',
      createdAt: new Date().toISOString(),
      createdBy: userSession.employeeId
    };

    setIsLoading(true);
    const ok = await FirestoreService.saveMaterialMovementLog(companyId, newMat);
    setIsLoading(false);

    if (ok) {
      setStatusMsg({ type: 'SUCCESS', text: `Gate Pass ${gatePassNumber} created.` });
      setIsMaterialModalOpen(false);
      setMaterialForm({ siteId: selectedSiteId, movementType: 'INWARD', gatePassNumber: '', materialDescription: '', quantity: '1 Unit', supplierVendorName: '', vehicleNumber: '', driverName: '', driverPhone: '' });
    } else {
      setStatusMsg({ type: 'ERROR', text: 'Failed to create material pass.' });
    }
  };

  const handleUpdateMaterialStatus = async (matId: string, status: MaterialMovementRecord['status']) => {
    if (!companyId) return;
    setIsLoading(true);
    const ok = await FirestoreService.updateMaterialStatus(companyId, matId, status, userSession.userId, userSession.fullName);
    setIsLoading(false);

    if (ok) {
      setStatusMsg({ type: 'SUCCESS', text: `Material pass updated to ${status}.` });
    } else {
      setStatusMsg({ type: 'ERROR', text: 'Failed to update material pass.' });
    }
  };

  // CSV Export for Site Operations
  const handleExportCSV = () => {
    const headers = ['Date', 'Site', 'Visitors In Site', 'Incidents Reported', 'Patrols Done', 'Material Passes'];
    const rows = [
      [
        selectedDate,
        sites.find(s => s.id === selectedSiteId)?.name || 'All Sites',
        visitors.filter(v => v.status === 'IN_SITE').length,
        incidents.length,
        patrolLogs.length,
        materials.length
      ]
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `LSM_Site_Operations_Report_${selectedDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setStatusMsg({ type: 'SUCCESS', text: 'Site Operations CSV report downloaded.' });
  };

  return (
    <div className="flex-1 flex flex-col w-full h-full overflow-y-auto p-4 md:p-6 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Site Operations & Patrol Registers
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Guard patrol tour tracking, incident logs, visitor gate passes, and material movement control.
          </p>
        </div>

        {/* Global Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selectedSiteId}
            onChange={e => setSelectedSiteId(e.target.value)}
            className={`px-3 py-2 rounded-xl text-xs font-semibold border ${
              isDark ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-800'
            }`}
          >
            <option value="ALL">All Company Sites</option>
            {sites.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>

          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-2 transition"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Global Status Banner */}
      {statusMsg && (
        <div className={`p-3.5 rounded-2xl border text-xs font-medium flex items-center justify-between shadow-sm animate-in fade-in ${
          statusMsg.type === 'SUCCESS' ? 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300' :
          statusMsg.type === 'ERROR' ? 'bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-300' :
          'bg-indigo-50 border-indigo-200 text-indigo-800 dark:bg-indigo-950/40 dark:border-indigo-800 dark:text-indigo-300'
        }`}>
          <div className="flex items-center gap-2">
            {statusMsg.type === 'SUCCESS' && <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />}
            {statusMsg.type === 'ERROR' && <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400" />}
            {statusMsg.type === 'INFO' && <Info className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />}
            <span>{statusMsg.text}</span>
          </div>
          <button onClick={() => setStatusMsg(null)} className="opacity-60 hover:opacity-100 p-1">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex items-center border-b border-slate-200 dark:border-slate-800 overflow-x-auto gap-2 scrollbar-none">
        <button
          onClick={() => setActiveTab('PATROLS')}
          className={`pb-3 px-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition whitespace-nowrap ${
            activeTab === 'PATROLS'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <QrCode className="w-4 h-4" />
          <span>Guard Patrol Tour ({checkpoints.length} Checkpoints)</span>
        </button>

        <button
          onClick={() => setActiveTab('INCIDENTS')}
          className={`pb-3 px-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition whitespace-nowrap ${
            activeTab === 'INCIDENTS'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <ShieldAlert className="w-4 h-4 text-rose-500" />
          <span>Incident Register ({incidents.filter(i => i.status === 'OPEN').length} Open)</span>
        </button>

        <button
          onClick={() => setActiveTab('VISITORS')}
          className={`pb-3 px-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition whitespace-nowrap ${
            activeTab === 'VISITORS'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <Users className="w-4 h-4 text-emerald-500" />
          <span>Visitor Register ({visitors.filter(v => v.status === 'IN_SITE').length} In Site)</span>
        </button>

        <button
          onClick={() => setActiveTab('MATERIALS')}
          className={`pb-3 px-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition whitespace-nowrap ${
            activeTab === 'MATERIALS'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <Truck className="w-4 h-4 text-amber-500" />
          <span>Material Pass Register ({materials.length})</span>
        </button>
      </div>

      {/* ============================================================ */}
      {/* TAB 1: GUARD PATROL TOUR & CHECKPOINTS */}
      {/* ============================================================ */}
      {activeTab === 'PATROLS' && (
        <div className="space-y-6">
          {/* Active Patrol Runner Widget */}
          <div className={`p-5 rounded-3xl border ${isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'} shadow-sm space-y-4`}>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-500">Live Guard Patrol System</span>
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  Site Checkpoint Tour Simulator
                </h3>
                <p className="text-xs text-slate-500">
                  Scan assigned site QR checkpoints in sequence during guard shift rounds.
                </p>
              </div>

              <div className="flex items-center gap-2">
                {!isPatrolActive ? (
                  <button
                    onClick={handleStartPatrol}
                    className="px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow flex items-center gap-2"
                  >
                    <QrCode className="w-4 h-4" />
                    <span>Start Guard Patrol</span>
                  </button>
                ) : (
                  <button
                    onClick={handleCompletePatrol}
                    className="px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow flex items-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Complete Patrol Tour</span>
                  </button>
                )}

                <button
                  onClick={() => setIsCheckpointModalOpen(true)}
                  className="px-3.5 py-2.5 rounded-2xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Checkpoint</span>
                </button>
              </div>
            </div>

            {/* Checkpoints Sequence Tracker */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-2">
              {checkpoints.length > 0 ? (
                checkpoints.map((cp, idx) => {
                  const isScanned = activePatrolCheckpointsVisited.includes(cp.id);
                  return (
                    <div 
                      key={cp.id}
                      className={`p-3.5 rounded-2xl border transition ${
                        isScanned 
                          ? 'bg-emerald-50 border-emerald-300 dark:bg-emerald-950/40 dark:border-emerald-800' 
                          : isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold font-mono text-indigo-500">#{cp.sequenceOrder} • {cp.code}</span>
                        {isScanned ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        ) : (
                          <Clock className="w-4 h-4 text-slate-400" />
                        )}
                      </div>

                      <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 mt-1">{cp.checkpointName}</h4>
                      <p className="text-[10px] text-slate-500 truncate">{cp.locationDescription || 'No description'}</p>

                      {isPatrolActive && !isScanned && (
                        <button
                          onClick={() => handleScanCheckpoint(cp.id)}
                          className="mt-3 w-full py-1.5 rounded-xl bg-indigo-600 text-white text-[10px] font-bold shadow hover:bg-indigo-700 transition"
                        >
                          Simulate Scan QR
                        </button>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="col-span-full py-6 text-center text-xs text-slate-400 italic">
                  No patrol checkpoints configured for this site. Click "Add Checkpoint" to define site rounds.
                </div>
              )}
            </div>
          </div>

          {/* Patrol History Table */}
          <div className={`rounded-2xl border ${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'} shadow-sm overflow-hidden`}>
            <div className="p-4 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Guard Patrol Tour Logs</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className={`border-b text-[10px] font-bold uppercase tracking-wider ${
                    isDark ? 'border-slate-800 bg-slate-950/60 text-slate-400' : 'border-slate-200 bg-slate-50 text-slate-500'
                  }`}>
                    <th className="py-3 px-4">Patrol Name</th>
                    <th className="py-3 px-4">Guard</th>
                    <th className="py-3 px-4">Checkpoints Visited</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {patrolLogs.length > 0 ? (
                    patrolLogs.map(p => (
                      <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                        <td className="py-3 px-4 font-bold text-slate-900 dark:text-slate-100">{p.patrolName}</td>
                        <td className="py-3 px-4 text-slate-700 dark:text-slate-300">{p.guardName}</td>
                        <td className="py-3 px-4 font-mono">{p.checkpointsVisited.length} / {p.totalCheckpoints}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            p.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {p.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-500">{new Date(p.createdAt).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400">No patrol tour logs recorded today.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 2: INCIDENT REGISTER */}
      {/* ============================================================ */}
      {activeTab === 'INCIDENTS' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Site Incident & Security Reports</h3>
              <p className="text-xs text-slate-500">Log breaches, hazards, property damage, theft, or safety concerns.</p>
            </div>

            <button
              onClick={() => setIsIncidentModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Report Incident</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {incidents.length > 0 ? (
              incidents.map(inc => (
                <div key={inc.id} className={`p-4 rounded-2xl border ${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'} shadow-sm space-y-3`}>
                  <div className="flex items-center justify-between">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                      inc.severity === 'CRITICAL' ? 'bg-rose-600 text-white' :
                      inc.severity === 'HIGH' ? 'bg-amber-500 text-white' : 'bg-indigo-500 text-white'
                    }`}>
                      {inc.severity} SEVERITY
                    </span>

                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      inc.status === 'RESOLVED' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                    }`}>
                      {inc.status}
                    </span>
                  </div>

                  <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">{inc.title}</h4>
                  <p className="text-xs text-slate-600 dark:text-slate-300">{inc.description}</p>

                  <div className="text-[10px] text-slate-400 space-y-0.5 border-t border-slate-100 dark:border-slate-800 pt-2">
                    <p>Reported By: {inc.reportedByName} • Category: {inc.category}</p>
                    <p>Time: {new Date(inc.reportedAt).toLocaleString()}</p>
                  </div>

                  {inc.status === 'OPEN' && (
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={() => handleUpdateIncidentStatus(inc.id, 'RESOLVED')}
                        className="w-full py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-semibold shadow hover:bg-emerald-700 transition"
                      >
                        Mark Resolved
                      </button>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="col-span-full py-12 text-center text-slate-400">
                No incidents reported for this site.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 3: VISITORS REGISTER */}
      {/* ============================================================ */}
      {activeTab === 'VISITORS' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Gate Visitor Log Register</h3>
              <p className="text-xs text-slate-500">Log entry/exit of guests, contractors, and corporate visitors.</p>
            </div>

            <button
              onClick={() => setIsVisitorModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Visitor Gate Entry</span>
            </button>
          </div>

          <div className={`rounded-2xl border ${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'} shadow-sm overflow-hidden`}>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className={`border-b text-[10px] font-bold uppercase tracking-wider ${
                    isDark ? 'border-slate-800 bg-slate-950/60 text-slate-400' : 'border-slate-200 bg-slate-50 text-slate-500'
                  }`}>
                    <th className="py-3 px-4">Badge #</th>
                    <th className="py-3 px-4">Visitor</th>
                    <th className="py-3 px-4">Company / Host</th>
                    <th className="py-3 px-4">Check-In</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {visitors.length > 0 ? (
                    visitors.map(v => (
                      <tr key={v.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                        <td className="py-3 px-4 font-bold font-mono text-indigo-500">{v.badgeNumber}</td>
                        <td className="py-3 px-4">
                          <p className="font-bold text-slate-900 dark:text-slate-100">{v.visitorName}</p>
                          <p className="text-[10px] text-slate-400">{v.visitorPhone}</p>
                        </td>
                        <td className="py-3 px-4">
                          <p className="text-slate-700 dark:text-slate-300">{v.visitorCompany}</p>
                          <p className="text-[10px] text-slate-400">Host: {v.hostEmployeeName}</p>
                        </td>
                        <td className="py-3 px-4 font-mono">{new Date(v.checkInTime).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            v.status === 'IN_SITE' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                          }`}>
                            {v.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          {v.status === 'IN_SITE' && (
                            <button
                              onClick={() => handleCheckOutVisitor(v.id)}
                              className="px-2.5 py-1 rounded-lg bg-rose-600 text-white text-[10px] font-bold shadow hover:bg-rose-700"
                            >
                              Check Out
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">No visitors logged today.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 4: MATERIAL MOVEMENT REGISTER */}
      {/* ============================================================ */}
      {activeTab === 'MATERIALS' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Inward / Outward Material Gate Pass</h3>
              <p className="text-xs text-slate-500">Track raw materials, equipment dispatches, and supplier vehicles.</p>
            </div>

            <button
              onClick={() => setIsMaterialModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Create Gate Pass</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {materials.length > 0 ? (
              materials.map(m => (
                <div key={m.id} className={`p-4 rounded-2xl border ${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'} shadow-sm space-y-3`}>
                  <div className="flex items-center justify-between">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      m.movementType === 'INWARD' ? 'bg-emerald-100 text-emerald-800' : 'bg-indigo-100 text-indigo-800'
                    }`}>
                      {m.movementType} PASS #{m.gatePassNumber}
                    </span>

                    <span className="text-[10px] font-bold text-amber-600">{m.status}</span>
                  </div>

                  <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">{m.materialDescription} ({m.quantity})</h4>
                  <p className="text-xs text-slate-600 dark:text-slate-300">Supplier: {m.supplierVendorName}</p>

                  <div className="text-[10px] text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-2 space-y-0.5">
                    <p>Vehicle: {m.vehicleNumber || 'N/A'} • Driver: {m.driverName} ({m.driverPhone})</p>
                    <p>Created: {new Date(m.createdAt).toLocaleString()}</p>
                  </div>

                  {m.status === 'PENDING_APPROVAL' && isManager && (
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={() => handleUpdateMaterialStatus(m.id, 'APPROVED')}
                        className="w-full py-1 rounded-xl bg-emerald-600 text-white text-[10px] font-bold shadow hover:bg-emerald-700"
                      >
                        Approve
                      </button>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="col-span-full py-12 text-center text-slate-400">No material gate passes issued today.</div>
            )}
          </div>
        </div>
      )}

      {/* MODAL 1: ADD CHECKPOINT */}
      {isCheckpointModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`w-full max-w-md p-6 rounded-3xl border shadow-2xl ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} space-y-4`}>
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Add Patrol Checkpoint</h3>
              <button onClick={() => setIsCheckpointModalOpen(false)} className="opacity-60 hover:opacity-100">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCheckpoint} className="space-y-3">
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500">Site</label>
                <select
                  value={checkpointForm.siteId || ''}
                  onChange={e => setCheckpointForm({ ...checkpointForm, siteId: e.target.value })}
                  className={`w-full mt-1 p-2.5 rounded-xl text-xs border ${isDark ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                >
                  {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500">Checkpoint Name</label>
                <input
                  type="text"
                  value={checkpointForm.checkpointName || ''}
                  onChange={e => setCheckpointForm({ ...checkpointForm, checkpointName: e.target.value })}
                  placeholder="e.g. Main Gate South Boundary"
                  className={`w-full mt-1 p-2.5 rounded-xl text-xs border ${isDark ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                  required
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500">Sequence Number</label>
                <input
                  type="number"
                  value={checkpointForm.sequenceOrder ?? 1}
                  onChange={e => setCheckpointForm({ ...checkpointForm, sequenceOrder: Number(e.target.value) })}
                  className={`w-full mt-1 p-2.5 rounded-xl text-xs border ${isDark ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                  required
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button type="button" onClick={() => setIsCheckpointModalOpen(false)} className="px-4 py-2 text-xs font-semibold text-slate-500">Cancel</button>
                <button type="submit" className="px-5 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold shadow">Save Checkpoint</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: REPORT INCIDENT */}
      {isIncidentModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`w-full max-w-md p-6 rounded-3xl border shadow-2xl ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} space-y-4`}>
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Report Site Incident</h3>
              <button onClick={() => setIsIncidentModalOpen(false)} className="opacity-60 hover:opacity-100"><X className="w-4 h-4" /></button>
            </div>

            <form onSubmit={handleSaveIncident} className="space-y-3">
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500">Incident Title</label>
                <input
                  type="text"
                  value={incidentForm.title}
                  onChange={e => setIncidentForm({ ...incidentForm, title: e.target.value })}
                  placeholder="e.g. Unidentified Vehicle at Gate #2"
                  className={`w-full mt-1 p-2.5 rounded-xl text-xs border ${isDark ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500">Category</label>
                  <select
                    value={incidentForm.category}
                    onChange={e => setIncidentForm({ ...incidentForm, category: e.target.value as any })}
                    className={`w-full mt-1 p-2.5 rounded-xl text-xs border ${isDark ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                  >
                    <option value="SECURITY_BREACH">Security Breach</option>
                    <option value="FIRE_HAZARD">Fire Hazard</option>
                    <option value="THEFT">Theft / Loss</option>
                    <option value="PROPERTY_DAMAGE">Property Damage</option>
                    <option value="MEDICAL">Medical Emergency</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500">Severity</label>
                  <select
                    value={incidentForm.severity}
                    onChange={e => setIncidentForm({ ...incidentForm, severity: e.target.value as any })}
                    className={`w-full mt-1 p-2.5 rounded-xl text-xs border ${isDark ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="CRITICAL">Critical</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500">Description</label>
                <textarea
                  value={incidentForm.description}
                  onChange={e => setIncidentForm({ ...incidentForm, description: e.target.value })}
                  rows={3}
                  className={`w-full mt-1 p-2.5 rounded-xl text-xs border ${isDark ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                  required
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button type="button" onClick={() => setIsIncidentModalOpen(false)} className="px-4 py-2 text-xs font-semibold text-slate-500">Cancel</button>
                <button type="submit" className="px-5 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold shadow">Submit Incident</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: VISITOR CHECK-IN */}
      {isVisitorModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`w-full max-w-md p-6 rounded-3xl border shadow-2xl ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} space-y-4`}>
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Visitor Gate Entry</h3>
              <button onClick={() => setIsVisitorModalOpen(false)} className="opacity-60 hover:opacity-100"><X className="w-4 h-4" /></button>
            </div>

            <form onSubmit={handleCheckInVisitor} className="space-y-3">
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500">Visitor Full Name</label>
                <input
                  type="text"
                  value={visitorForm.visitorName}
                  onChange={e => setVisitorForm({ ...visitorForm, visitorName: e.target.value })}
                  placeholder="e.g. Ramesh Kumar"
                  className={`w-full mt-1 p-2.5 rounded-xl text-xs border ${isDark ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500">Phone</label>
                  <input
                    type="text"
                    value={visitorForm.visitorPhone}
                    onChange={e => setVisitorForm({ ...visitorForm, visitorPhone: e.target.value })}
                    className={`w-full mt-1 p-2.5 rounded-xl text-xs border ${isDark ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                    required
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500">Company</label>
                  <input
                    type="text"
                    value={visitorForm.visitorCompany}
                    onChange={e => setVisitorForm({ ...visitorForm, visitorCompany: e.target.value })}
                    className={`w-full mt-1 p-2.5 rounded-xl text-xs border ${isDark ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button type="button" onClick={() => setIsVisitorModalOpen(false)} className="px-4 py-2 text-xs font-semibold text-slate-500">Cancel</button>
                <button type="submit" className="px-5 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold shadow">Check In Visitor</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: MATERIAL GATE PASS */}
      {isMaterialModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`w-full max-w-md p-6 rounded-3xl border shadow-2xl ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} space-y-4`}>
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Create Material Gate Pass</h3>
              <button onClick={() => setIsMaterialModalOpen(false)} className="opacity-60 hover:opacity-100"><X className="w-4 h-4" /></button>
            </div>

            <form onSubmit={handleSaveMaterialPass} className="space-y-3">
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500">Movement Type</label>
                <select
                  value={materialForm.movementType}
                  onChange={e => setMaterialForm({ ...materialForm, movementType: e.target.value as any })}
                  className={`w-full mt-1 p-2.5 rounded-xl text-xs border ${isDark ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                >
                  <option value="INWARD">Inward Pass</option>
                  <option value="OUTWARD">Outward Pass</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500">Material Description</label>
                <input
                  type="text"
                  value={materialForm.materialDescription}
                  onChange={e => setMaterialForm({ ...materialForm, materialDescription: e.target.value })}
                  placeholder="e.g. 50 Bags Cement & Rebar"
                  className={`w-full mt-1 p-2.5 rounded-xl text-xs border ${isDark ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                  required
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500">Supplier / Vendor Name</label>
                <input
                  type="text"
                  value={materialForm.supplierVendorName}
                  onChange={e => setMaterialForm({ ...materialForm, supplierVendorName: e.target.value })}
                  className={`w-full mt-1 p-2.5 rounded-xl text-xs border ${isDark ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                  required
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button type="button" onClick={() => setIsMaterialModalOpen(false)} className="px-4 py-2 text-xs font-semibold text-slate-500">Cancel</button>
                <button type="submit" className="px-5 py-2 rounded-xl bg-amber-600 text-white text-xs font-bold shadow">Create Pass</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
