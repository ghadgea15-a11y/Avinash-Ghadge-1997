import { Pagination } from '../common/Pagination';
import React, { useState, useEffect, useMemo } from 'react';
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
import { StorageService } from '../../services/storageService';
import { OfflineSyncService } from '../../services/offlineSyncService';
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

  useEffect(() => {
    if (statusMsg) {
      const timer = setTimeout(() => setStatusMsg(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [statusMsg]);

  // Filters
  const [selectedSiteId, setSelectedSiteId] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  useEffect(() => { setCurrentPage(1); }, [activeTab, searchQuery, selectedSiteId, selectedDate]);

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
    id?: string;
    type: 'INCIDENT' | 'COMPLAINT' | 'BBS_OBSERVATION';
    description: string;
    behaviorCategory?: string;
    slaDeadline?: string;
    photoFile?: File | null;
  }>({ siteId: '', title: '', category: 'SECURITY_BREACH', severity: 'MEDIUM', description: '', type: 'INCIDENT' });

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

  // 5. Visitor Check-Out Modal (Gate Pass Return Validation)
  const [isVisitorCheckoutModalOpen, setIsVisitorCheckoutModalOpen] = useState<boolean>(false);
  const [selectedVisitorForCheckout, setSelectedVisitorForCheckout] = useState<VisitorLogRecord | null>(null);
  const [visitorCheckoutForm, setVisitorCheckoutForm] = useState<{
    badgeReturned: boolean;
    notes: string;
  }>({ badgeReturned: true, notes: '' });

  // 6. Site Inspection Modal
  const [isInspectionModalOpen, setIsInspectionModalOpen] = useState<boolean>(false);
  const [inspectionForm, setInspectionForm] = useState<{
    siteId: string;
    date: string;
    guardsCountOnDuty: number;
    score: number;
    accessControlOk: boolean;
    cctvLightingOk: boolean;
    fireSafetyOk: boolean;
    turnoutOk: boolean;
    notes: string;
  }>({
    siteId: '',
    date: new Date().toISOString().split('T')[0],
    guardsCountOnDuty: 4,
    score: 95,
    accessControlOk: true,
    cctvLightingOk: true,
    fireSafetyOk: true,
    turnoutOk: true,
    notes: 'Facility security perimeter and access logs inspected and compliant.'
  });

  // 7. Shift Handover Modal
  const [isHandoverModalOpen, setIsHandoverModalOpen] = useState<boolean>(false);
  const [handoverForm, setHandoverForm] = useState<{
    siteId: string;
    date: string;
    incomingSupervisorId: string;
    incomingSupervisorName: string;
    keysTransferred: boolean;
    radiosTransferred: boolean;
    logbooksTransferred: boolean;
    musterVerified: boolean;
    notes: string;
  }>({
    siteId: '',
    date: new Date().toISOString().split('T')[0],
    incomingSupervisorId: '',
    incomingSupervisorName: '',
    keysTransferred: true,
    radiosTransferred: true,
    logbooksTransferred: true,
    musterVerified: true,
    notes: 'Shift handover complete. All equipment, master keys, and muster logs verified.'
  });

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

    FirestoreService.subscribeToEmployees(userSession, companyId, setEmployees);

    const unsubPatrols = FirestoreService.subscribeToPatrolLogs(userSession, companyId, logs => setPatrolLogs(logs));
    const unsubIncidents = FirestoreService.subscribeToIncidentReports(userSession, companyId, reps => setIncidents(reps));
    const unsubVisitors = FirestoreService.subscribeToVisitorLogs(userSession, companyId, vList => setVisitors(vList));
    const unsubMaterials = FirestoreService.subscribeToMaterialLogs(userSession, companyId, mList => setMaterials(mList));
    const unsubDaily = FirestoreService.subscribeToDailySiteLogs(userSession, companyId, dList => setDailySiteLogs(dList));

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
    if (isLoading) return;
    const finalSiteId = checkpointForm.siteId || (selectedSiteId !== "ALL" ? selectedSiteId : (sites[0]?.id || ""));
    if (!companyId || !checkpointForm.checkpointName || !finalSiteId) {
      setStatusMsg({ type: 'ERROR', text: 'Checkpoint name and Site selection required.' });
      return;
    }

    const code = checkpointForm.code || `CP-${Math.floor(100 + Math.random() * 900)}`;
    const newCp: PatrolCheckpointRecord = {
      id: `CP-${Date.now()}`,
      companyId,
      assignedRegionId: userSession.assignedRegionId,
      assignedBranchId: userSession.assignedBranchId,
      siteId: finalSiteId,
      checkpointName: checkpointForm.checkpointName.trim(),
      code,
      qrCode: `LSM-QR-${code}`,
      locationDescription: checkpointForm.locationDescription,
      sequenceOrder: Number(checkpointForm.sequenceOrder) || 1,
      status: 'ACTIVE',
      createdAt: new Date().toISOString()
    };

    setIsLoading(true);
    if (!isOnline) {
      OfflineSyncService.queueAction('PATROL_CHECK', { companyId, data: newCp });
      setCheckpoints(prev => [...prev, newCp]);
      setIsCheckpointModalOpen(false);
      setStatusMsg({ type: 'INFO', text: 'Offline: Checkpoint creation queued.' });
      return;
    }
    const ok = await FirestoreService.savePatrolCheckpoint(companyId, newCp);
    setIsLoading(false);

    if (ok) {
      setStatusMsg({ type: 'SUCCESS', text: `Checkpoint '${newCp.checkpointName}' added successfully.` });
      setIsCheckpointModalOpen(false);
      setCheckpointForm({ siteId: selectedSiteId !== "ALL" ? selectedSiteId : (sites[0]?.id || ""), checkpointName: '', code: '', locationDescription: '', sequenceOrder: checkpoints.length + 1 });
      FirestoreService.getPatrolCheckpoints(companyId, selectedSiteId).then(setCheckpoints);
    } else {
      setStatusMsg({ type: 'ERROR', text: 'Failed to save checkpoint.' });
    }
  };

  const handleStartPatrol = () => {
    if (isLoading) return;
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
    if (isLoading) return;
    if (!companyId) return;

    const siteObj = sites.find(s => s.id === selectedSiteId);
    const isFinished = activePatrolCheckpointsVisited.length === checkpoints.length;

    const patrolLog: PatrolLogRecord = {
      id: `PATROL-${Date.now()}`,
      companyId,
      assignedRegionId: userSession.assignedRegionId,
      assignedBranchId: userSession.assignedBranchId,
      siteId: selectedSiteId !== "ALL" ? selectedSiteId : (sites[0]?.id || ""),
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
    if (isLoading) return;
    if (!companyId || !incidentForm.title || !incidentForm.description) {
      setStatusMsg({ type: 'ERROR', text: 'Incident Title and Description are required.' });
      return;
    }

    const siteObj = sites.find(s => s.id === incidentForm.siteId);
    const incId = incidentForm.id || `INC-${Date.now()}`;
    let uploadedPhotoUrls: string[] = [];
    
    setIsLoading(true);
    
    if (incidentForm.photoFile && isOnline) {
      try {
        const path = `companies/${companyId}/incidents/${incId}/${incidentForm.photoFile.name}`;
        const url = await StorageService.uploadFile(path, incidentForm.photoFile);
        uploadedPhotoUrls.push(url);
      } catch (err) {
        setStatusMsg({ type: 'ERROR', text: 'Failed to upload photo.' });
        setIsLoading(false);
        return;
      }
    }

    const newInc: IncidentReportRecord = {
      id: incId,
      companyId,
      assignedRegionId: userSession.assignedRegionId,
      assignedBranchId: userSession.assignedBranchId,
      siteId: incidentForm.siteId || (selectedSiteId !== "ALL" ? selectedSiteId : (sites[0]?.id || "")),
      siteName: siteObj?.name || 'Main Site',
      reportedById: userSession.employeeId,
      reportedByName: userSession.fullName,
      type: incidentForm.type,
      title: incidentForm.title.trim(),
      behaviorCategory: incidentForm.behaviorCategory,
      slaDeadline: incidentForm.slaDeadline,
      category: incidentForm.category,
      severity: incidentForm.severity,
      description: incidentForm.description.trim(),
      status: incidentForm.type === 'BBS_OBSERVATION' ? 'RECORDED' : 'OPEN',
      photoUrls: uploadedPhotoUrls,
      reportedAt: new Date().toISOString()
    };

    if (!isOnline) {
      OfflineSyncService.queueAction('INCIDENT_REPORT', { companyId, data: newInc });
      setIsIncidentModalOpen(false);
      setStatusMsg({ type: 'INFO', text: 'Offline: Incident Report queued for sync.' });
      setIsLoading(false);
      return;
    }
    
    const ok = await FirestoreService.saveIncidentReport(companyId, newInc);
    
    if (ok && newInc.severity === 'CRITICAL' && !incidentForm.id) {
       // Only notify on creation
       await FirestoreService.createNotification({
          id: `NOTIF-${Date.now()}`,
          title: 'CRITICAL INCIDENT REPORTED',
          message: `${newInc.title} at ${newInc.siteName}`,
          type: 'ALERT',
          timestamp: new Date().toISOString(),
          isRead: false,
          siteId: newInc.siteId
       });
    }
    
    setIsLoading(false);

    if (ok) {
      setStatusMsg({ type: 'SUCCESS', text: `Incident '${newInc.title}' reported.` });
      setIsIncidentModalOpen(false);
      setIncidentForm({ siteId: selectedSiteId, title: '', category: 'SECURITY_BREACH', severity: 'MEDIUM', description: '', type: 'INCIDENT' as const, photoFile: null });
    } else {
      setStatusMsg({ type: 'ERROR', text: 'Failed to report incident.' });
    }
  };

  const getComplaintSlaStatus = (inc: IncidentReportRecord) => {
    if (inc.status === 'RESOLVED' || inc.status === 'CLOSED') {
      return { status: 'RESOLVED', label: 'Resolved', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300' };
    }
    if (!inc.slaDeadline) {
      return { status: 'NO_SLA', label: 'No SLA Set', color: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' };
    }
    const deadlineTime = new Date(inc.slaDeadline).getTime();
    const now = Date.now();
    const diffMs = deadlineTime - now;
    if (diffMs < 0) {
      return { status: 'BREACHED', label: 'SLA BREACHED', color: 'bg-rose-600 text-white animate-pulse' };
    }
    if (diffMs < 4 * 3600 * 1000) {
      return { status: 'AT_RISK', label: 'SLA AT RISK (<4h)', color: 'bg-amber-500 text-white font-bold' };
    }
    return { status: 'ON_TRACK', label: 'SLA On Track', color: 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300' };
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

    // If escalated, route notification to A3/A4 Operations leadership
    if (ok && status === 'ESCALATED') {
      const inc = incidents.find(i => i.id === reportId);
      await FirestoreService.createNotification({
        id: `NOTIF-ESC-${Date.now()}`,
        title: 'ESCALATED INCIDENT/COMPLAINT - A3/A4 ACTION REQUIRED',
        message: `Incident/Complaint "${inc?.title || reportId}" has been escalated for site ${inc?.siteName || selectedSiteId}. Immediate review required by Operations Leadership.`,
        type: 'ALERT',
        timestamp: new Date().toISOString(),
        isRead: false,
        siteId: inc?.siteId || selectedSiteId
      });
    }

    setIsLoading(false);

    if (ok) {
      setStatusMsg({ type: 'SUCCESS', text: `Incident status updated to ${status}.` });
    } else {
      setStatusMsg({ type: 'ERROR', text: 'Failed to update incident status.' });
    }
  };

  // ----------------------------------------------------
  // HANDLERS: VISITORS & GATE PASS RETURN VALIDATION
  // ----------------------------------------------------
  const handleCheckInVisitor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    if (!companyId || !visitorForm.visitorName || !visitorForm.visitorPhone) {
      setStatusMsg({ type: 'ERROR', text: 'Visitor Name and Phone Number are required.' });
      return;
    }

    const siteObj = sites.find(s => s.id === visitorForm.siteId);
    const badgeNumber = visitorForm.badgeNumber || `VIS-${Math.floor(100 + Math.random() * 900)}`;

    const newVis: VisitorLogRecord = {
      id: `VISLOG-${Date.now()}`,
      companyId,
      assignedRegionId: userSession.assignedRegionId,
      assignedBranchId: userSession.assignedBranchId,
      siteId: visitorForm.siteId || (selectedSiteId !== "ALL" ? selectedSiteId : (sites[0]?.id || "")),
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
    let ok = false;
    if (!isOnline) {
      OfflineSyncService.queueAction('VISITOR_LOG', { companyId, data: newVis });
      ok = true;
      setStatusMsg({ type: 'INFO', text: 'Offline: Visitor check-in queued.' });
    } else {
      ok = await FirestoreService.checkInVisitor(companyId, newVis);
    }
    setIsLoading(false);

    if (ok) {
      setStatusMsg({ type: 'SUCCESS', text: `Visitor ${newVis.visitorName} checked in with Badge #${badgeNumber}.` });
      setIsVisitorModalOpen(false);
      setVisitorForm({ siteId: selectedSiteId, visitorName: '', visitorPhone: '', visitorCompany: '', hostEmployeeName: '', purpose: 'Official Meeting', badgeNumber: '', vehicleNumber: '' });
    } else {
      setStatusMsg({ type: 'ERROR', text: 'Failed to check in visitor.' });
    }
  };

  const handleOpenVisitorCheckout = (visitor: VisitorLogRecord) => {
    setSelectedVisitorForCheckout(visitor);
    setVisitorCheckoutForm({ badgeReturned: true, notes: '' });
    setIsVisitorCheckoutModalOpen(true);
  };

  const handleConfirmVisitorCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId || !selectedVisitorForCheckout) return;
    setIsLoading(true);
    let ok = false;
    if (!isOnline) {
      OfflineSyncService.queueAction('VISITOR_CHECK_OUT', {
        companyId,
        visitorId: selectedVisitorForCheckout.id,
        checkOutTime: new Date().toISOString(),
        badgeReturned: visitorCheckoutForm.badgeReturned,
        notes: visitorCheckoutForm.notes
      });
      ok = true;
      setStatusMsg({ type: 'INFO', text: 'Offline: Visitor check-out queued.' });
    } else {
      ok = await FirestoreService.checkOutVisitor(
        companyId,
        selectedVisitorForCheckout.id,
        new Date().toISOString(),
        visitorCheckoutForm.badgeReturned,
        visitorCheckoutForm.notes
      );
    }
    setIsLoading(false);

    if (ok) {
      setStatusMsg({
        type: 'SUCCESS',
        text: `Visitor ${selectedVisitorForCheckout.visitorName} checked out. Badge returned: ${visitorCheckoutForm.badgeReturned ? 'Yes' : 'No'}.`
      });
      setIsVisitorCheckoutModalOpen(false);
      setSelectedVisitorForCheckout(null);
    } else {
      setStatusMsg({ type: 'ERROR', text: 'Failed to check out visitor.' });
    }
  };

  // ----------------------------------------------------
  // HANDLERS: SITE INSPECTIONS & SHIFT HANDOVERS
  // ----------------------------------------------------
  const handleSaveInspection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    const finalSiteId = inspectionForm.siteId || (selectedSiteId !== "ALL" ? selectedSiteId : (sites[0]?.id || ""));
    if (!companyId || !finalSiteId) {
      setStatusMsg({ type: 'ERROR', text: 'Site selection required for inspection.' });
      return;
    }

    const siteObj = sites.find(s => s.id === finalSiteId);
    const checklist = [
      { item: 'Access Control & Gate Manning', passed: inspectionForm.accessControlOk },
      { item: 'CCTV & Perimeter Lighting', passed: inspectionForm.cctvLightingOk },
      { item: 'Fire & Emergency Systems', passed: inspectionForm.fireSafetyOk },
      { item: 'Guard Turnout & Grooming', passed: inspectionForm.turnoutOk }
    ];

    const newLog: DailySiteLogRecord = {
      id: `INSP-${Date.now()}`,
      companyId,
      assignedRegionId: userSession.assignedRegionId,
      assignedBranchId: userSession.assignedBranchId,
      siteId: finalSiteId,
      siteName: siteObj?.name || 'Main Site',
      date: inspectionForm.date,
      supervisorId: userSession.employeeId || userSession.userId,
      supervisorName: userSession.fullName,
      inspectorId: userSession.employeeId || userSession.userId,
      logType: 'INSPECTION',
      guardsCountOnDuty: inspectionForm.guardsCountOnDuty,
      totalPatrolsCompleted: patrolLogs.filter(p => p.siteId === finalSiteId).length,
      totalVisitorsLogged: visitors.filter(v => v.siteId === finalSiteId).length,
      totalIncidentsReported: incidents.filter(i => i.siteId === finalSiteId).length,
      checklistData: checklist,
      score: inspectionForm.score,
      status: 'SUBMITTED',
      notes: inspectionForm.notes,
      createdAt: new Date().toISOString()
    };

    setIsLoading(true);
    const ok = await FirestoreService.saveDailySiteLog(companyId, newLog);
    setIsLoading(false);

    if (ok) {
      setStatusMsg({ type: 'SUCCESS', text: `Site inspection log recorded (Score: ${inspectionForm.score}%).` });
      setIsInspectionModalOpen(false);
    } else {
      setStatusMsg({ type: 'ERROR', text: 'Failed to record site inspection.' });
    }
  };

  const handleSaveHandover = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    const finalSiteId = handoverForm.siteId || (selectedSiteId !== "ALL" ? selectedSiteId : (sites[0]?.id || ""));
    if (!companyId || !finalSiteId) {
      setStatusMsg({ type: 'ERROR', text: 'Site selection required for handover.' });
      return;
    }

    const siteObj = sites.find(s => s.id === finalSiteId);
    const incomingEmp = employees.find(e => e.id === handoverForm.incomingSupervisorId);

    const newLog: DailySiteLogRecord = {
      id: `HANDOVER-${Date.now()}`,
      companyId,
      assignedRegionId: userSession.assignedRegionId,
      assignedBranchId: userSession.assignedBranchId,
      siteId: finalSiteId,
      siteName: siteObj?.name || 'Main Site',
      date: handoverForm.date,
      supervisorId: userSession.employeeId || userSession.userId,
      supervisorName: userSession.fullName,
      outgoingSupervisorId: userSession.employeeId || userSession.userId,
      incomingSupervisorId: handoverForm.incomingSupervisorId || 'DUTY_SUPERVISOR',
      logType: 'HANDOVER',
      guardsCountOnDuty: 4,
      totalPatrolsCompleted: patrolLogs.filter(p => p.siteId === finalSiteId).length,
      totalVisitorsLogged: visitors.filter(v => v.siteId === finalSiteId).length,
      totalIncidentsReported: incidents.filter(i => i.siteId === finalSiteId).length,
      inventoryStatus: {
        keysTransferred: handoverForm.keysTransferred,
        radiosTransferred: handoverForm.radiosTransferred,
        logbooksTransferred: handoverForm.logbooksTransferred,
        musterVerified: handoverForm.musterVerified,
        incomingSupervisorName: incomingEmp ? `${incomingEmp.firstName} ${incomingEmp.lastName}` : (handoverForm.incomingSupervisorName || 'Duty Supervisor')
      },
      status: 'INITIATED',
      notes: handoverForm.notes,
      createdAt: new Date().toISOString()
    };

    setIsLoading(true);
    const ok = await FirestoreService.saveDailySiteLog(companyId, newLog);
    setIsLoading(false);

    if (ok) {
      setStatusMsg({ type: 'SUCCESS', text: 'Shift handover register created successfully.' });
      setIsHandoverModalOpen(false);
    } else {
      setStatusMsg({ type: 'ERROR', text: 'Failed to create shift handover.' });
    }
  };

  // ----------------------------------------------------
  // HANDLERS: MATERIAL GATE PASS
  // ----------------------------------------------------
  const handleSaveMaterialPass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    const finalSiteId = materialForm.siteId || (selectedSiteId !== "ALL" ? selectedSiteId : (sites[0]?.id || ""));
    if (!companyId || !materialForm.materialDescription || !materialForm.supplierVendorName || !finalSiteId) {
      setStatusMsg({ type: 'ERROR', text: 'Site, Material Description, and Vendor Name required.' });
      return;
    }

    const siteObj = sites.find(s => s.id === finalSiteId);
    const gatePassNumber = materialForm.gatePassNumber || `GP-${Math.floor(1000 + Math.random() * 9000)}`;

    const newMat: MaterialMovementRecord = {
      id: `MAT-${Date.now()}`,
      companyId,
      assignedRegionId: userSession.assignedRegionId,
      assignedBranchId: userSession.assignedBranchId,
      siteId: finalSiteId,
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

    let ok = false;
    if (!isOnline) {
      OfflineSyncService.queueAction('MATERIAL_PASS', { companyId, data: newMat });
      ok = true;
      setStatusMsg({ type: 'INFO', text: 'Offline: Material Gate Pass queued.' });
    } else {
      ok = await FirestoreService.saveMaterialMovementLog(companyId, newMat);
    }

    setIsLoading(false);

    if (ok) {
      setStatusMsg({ type: 'SUCCESS', text: `Gate Pass ${gatePassNumber} created.` });
      setIsMaterialModalOpen(false);
      setMaterialForm({ siteId: finalSiteId, movementType: 'INWARD', gatePassNumber: '', materialDescription: '', quantity: '1 Unit', supplierVendorName: '', vehicleNumber: '', driverName: '', driverPhone: '' });
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


  // --- PAGINATION & FILTER LOGIC ---
  const filteredCheckpoints = useMemo(() => {
    return checkpoints.filter(cp => {
      const matchSearch = cp.checkpointName.toLowerCase().includes(searchQuery.toLowerCase()) || cp.code.toLowerCase().includes(searchQuery.toLowerCase());
      return matchSearch;
    }).sort((a, b) => a.sequenceOrder - b.sequenceOrder);
  }, [checkpoints, searchQuery]);

  const paginatedCheckpoints = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredCheckpoints.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredCheckpoints, currentPage, itemsPerPage]);

  const filteredPatrolLogs = useMemo(() => {
    return patrolLogs.filter(p => {
      const matchSearch = p.patrolName.toLowerCase().includes(searchQuery.toLowerCase()) || p.guardName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchSite = selectedSiteId === 'ALL' || p.siteId === selectedSiteId;
      return matchSearch && matchSite;
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [patrolLogs, searchQuery, selectedSiteId]);

  const paginatedPatrolLogs = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredPatrolLogs.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredPatrolLogs, currentPage, itemsPerPage]);

  const filteredIncidents = useMemo(() => {
    return incidents.filter(inc => {
      const matchSearch = inc.title.toLowerCase().includes(searchQuery.toLowerCase());
      const matchSite = selectedSiteId === 'ALL' || inc.siteId === selectedSiteId;
      return matchSearch && matchSite;
    }).sort((a, b) => new Date(b.reportedAt).getTime() - new Date(a.reportedAt).getTime());
  }, [incidents, searchQuery, selectedSiteId]);

  const paginatedIncidents = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredIncidents.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredIncidents, currentPage, itemsPerPage]);

  const filteredVisitors = useMemo(() => {
    return visitors.filter(v => {
      const matchSearch = v.visitorName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchSite = selectedSiteId === 'ALL' || v.siteId === selectedSiteId;
      return matchSearch && matchSite;
    }).sort((a, b) => new Date(b.checkInTime || 0).getTime() - new Date(a.checkInTime || 0).getTime());
  }, [visitors, searchQuery, selectedSiteId]);

  const paginatedVisitors = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredVisitors.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredVisitors, currentPage, itemsPerPage]);

  const filteredMaterials = useMemo(() => {
    return materials.filter(m => {
      const matchSearch = m.materialDescription.toLowerCase().includes(searchQuery.toLowerCase());
      const matchSite = selectedSiteId === 'ALL' || m.siteId === selectedSiteId;
      return matchSearch && matchSite;
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [materials, searchQuery, selectedSiteId]);

  const paginatedMaterials = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredMaterials.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredMaterials, currentPage, itemsPerPage]);

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
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-[100] w-[90%] max-w-md p-4 rounded-2xl border text-xs font-bold flex items-center justify-between shadow-2xl animate-in slide-in-from-top-4 ${
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
        <button
          onClick={() => setActiveTab('DAILY_LOGS')}
          className={`pb-3 px-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition whitespace-nowrap ${
            activeTab === 'DAILY_LOGS'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <FileText className="w-4 h-4 text-emerald-500" />
          <span>Daily Logs & Handovers</span>
        </button>
      </div>

      {/* ============================================================ */}
      {/* TAB 1: GUARD PATROL TOUR & CHECKPOINTS */}
      {/* ============================================================ */}
      
      {/* Search Input for Tabs */}
      <div className="relative mb-6">
        <Search className="w-5 h-5 absolute left-3 top-3 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Search by name, ID, code or description..."
          className={`w-full pl-10 pr-4 py-2.5 rounded-xl text-sm font-medium border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
            isDark ? 'bg-slate-900 border-slate-800 text-white placeholder-slate-500' : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400'
          }`}
        />
      </div>

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
                  onClick={() => { setCheckpointForm(prev => ({ ...prev, siteId: selectedSiteId !== "ALL" ? selectedSiteId : (sites[0]?.id || "") })); setIsCheckpointModalOpen(true); }}
                  className="px-3.5 py-2.5 rounded-2xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Checkpoint</span>
                </button>
              </div>
            </div>

            {/* Checkpoints Sequence Tracker */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-2">
              {filteredCheckpoints.length > 0 ? (
                <>
                {paginatedCheckpoints.map((cp, idx) => {
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
                })}
                <div className="col-span-full">
                  <Pagination currentPage={currentPage} totalItems={filteredCheckpoints.length} itemsPerPage={itemsPerPage} onPageChange={setCurrentPage} onItemsPerPageChange={setItemsPerPage} />
                </div>
                </>
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
                  {filteredPatrolLogs.length > 0 ? (
                    <>
                    {paginatedPatrolLogs.map(p => (
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
                    ))}
                    <tr>
                      <td colSpan={5} className="p-0">
                    <Pagination
                      currentPage={currentPage}
                      totalItems={filteredPatrolLogs.length}
                      itemsPerPage={itemsPerPage}
                      onPageChange={setCurrentPage}
                      onItemsPerPageChange={setItemsPerPage}
                    />
                      </td>
                    </tr>
                    </>
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
              onClick={() => { setIncidentForm({ siteId: selectedSiteId !== "ALL" ? selectedSiteId : (sites[0]?.id || ""), title: '', category: 'SECURITY_BREACH', severity: 'MEDIUM', type: 'INCIDENT', description: '', behaviorCategory: '', slaDeadline: '', photoFile: null }); setIsIncidentModalOpen(true); }}
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Report Incident</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredIncidents.length > 0 ? (
              <>
              {paginatedIncidents.map(inc => (
                <div key={inc.id} className={`p-4 rounded-2xl border ${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'} shadow-sm space-y-3`}>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
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
                    <button onClick={() => { setIncidentForm({ id: inc.id, siteId: inc.siteId, title: inc.title, category: inc.category, severity: inc.severity, type: inc.type as any, description: inc.description, behaviorCategory: inc.behaviorCategory, slaDeadline: inc.slaDeadline, photoFile: null }); setIsIncidentModalOpen(true); }} className="text-slate-400 hover:text-indigo-600 transition p-1">
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    <span className="text-indigo-600 mr-2">[{inc.type || 'INCIDENT'}]</span>
                    {inc.title}
                  </h4>

                  {inc.photoUrls && inc.photoUrls.length > 0 && (
                    <div className="mt-2">
                      <img src={inc.photoUrls[0]} alt="Evidence" className="w-16 h-16 object-cover rounded-lg border border-slate-200" />
                    </div>
                  )}

                  {inc.type === 'BBS_OBSERVATION' && inc.behaviorCategory && (
                     <p className="text-xs font-semibold text-amber-600">Behavior: {inc.behaviorCategory}</p>
                  )}
                  {inc.type === 'COMPLAINT' && (
                    <div className="flex items-center gap-2 pt-1">
                      {(() => {
                        const sla = getComplaintSlaStatus(inc);
                        return (
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${sla.color}`}>
                            {sla.label}
                          </span>
                        );
                      })()}
                      {inc.slaDeadline && (
                        <span className="text-[10px] text-slate-500 font-mono">
                          Due: {new Date(inc.slaDeadline).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  )}

                  <p className="text-xs text-slate-600 dark:text-slate-300">{inc.description}</p>

                  <div className="text-[10px] text-slate-400 space-y-0.5 border-t border-slate-100 dark:border-slate-800 pt-2">
                    <p>Reported By: {inc.reportedByName} • Category: {inc.category}</p>
                    <p>Time: {new Date(inc.reportedAt).toLocaleString()}</p>
                  </div>

                  {/* Status updates based on TYPE & Escalation Routing */}
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    {inc.type === 'BBS_OBSERVATION' ? (
                      <>
                        {inc.status === 'RECORDED' && (
                          <button onClick={() => handleUpdateIncidentStatus(inc.id, 'ACTION_REQUIRED')} className="flex-1 py-1.5 rounded-xl bg-amber-500 text-white text-xs font-semibold shadow hover:bg-amber-600 transition">Action Required</button>
                        )}
                        {(inc.status === 'RECORDED' || inc.status === 'ACTION_REQUIRED') && (
                          <button onClick={() => handleUpdateIncidentStatus(inc.id, 'CLOSED')} className="flex-1 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-semibold shadow hover:bg-emerald-700 transition">Close Observation</button>
                        )}
                      </>
                    ) : inc.type === 'COMPLAINT' ? (
                      <>
                        {inc.status === 'OPEN' && (
                          <button onClick={() => handleUpdateIncidentStatus(inc.id, 'IN_PROGRESS')} className="flex-1 py-1.5 rounded-xl bg-blue-500 text-white text-xs font-semibold shadow hover:bg-blue-600 transition">In Progress</button>
                        )}
                        {(inc.status === 'OPEN' || inc.status === 'IN_PROGRESS') && (
                          <>
                            <button onClick={() => handleUpdateIncidentStatus(inc.id, 'ESCALATED')} className="flex-1 py-1.5 rounded-xl bg-rose-600 text-white text-xs font-semibold shadow hover:bg-rose-700 transition flex items-center justify-center gap-1">
                              <AlertTriangle className="w-3.5 h-3.5" />
                              <span>Escalate to A3/A4</span>
                            </button>
                            <button onClick={() => handleUpdateIncidentStatus(inc.id, 'RESOLVED')} className="flex-1 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-semibold shadow hover:bg-emerald-700 transition">Resolve</button>
                          </>
                        )}
                        {inc.status === 'ESCALATED' && (
                          <button onClick={() => handleUpdateIncidentStatus(inc.id, 'RESOLVED')} className="w-full py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-semibold shadow hover:bg-emerald-700 transition">Resolve Escalated Issue</button>
                        )}
                      </>
                    ) : (
                      /* Standard INCIDENT */
                      <>
                        {['OPEN', 'UNDER_INVESTIGATION', 'IN_PROGRESS'].includes(inc.status) && (
                          <div className="flex w-full items-center gap-2">
                            {inc.severity === 'CRITICAL' && (
                              <button onClick={() => handleUpdateIncidentStatus(inc.id, 'ESCALATED')} className="flex-1 py-1.5 rounded-xl bg-rose-600 text-white text-xs font-semibold shadow hover:bg-rose-700 transition flex items-center justify-center gap-1">
                                <AlertTriangle className="w-3.5 h-3.5" />
                                <span>Escalate to A3/A4</span>
                              </button>
                            )}
                            <button onClick={() => handleUpdateIncidentStatus(inc.id, 'RESOLVED')} className="flex-1 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-semibold shadow hover:bg-emerald-700 transition">Mark Resolved</button>
                          </div>
                        )}
                        {inc.status === 'ESCALATED' && (
                          <button onClick={() => handleUpdateIncidentStatus(inc.id, 'RESOLVED')} className="w-full py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-semibold shadow hover:bg-emerald-700 transition">Mark Escalation Resolved</button>
                        )}
                      </>
                    )}
                  </div>

                </div>
              ))}
                <div className="col-span-full">
                  <Pagination
                  currentPage={currentPage}
                  totalItems={filteredIncidents.length}
                  itemsPerPage={itemsPerPage}
                  onPageChange={setCurrentPage}
                  onItemsPerPageChange={setItemsPerPage}
                  />
                </div>
                </>
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
              <p className="text-xs text-slate-500">Log entry/exit of guests, contractors, and corporate visitors with pass return validation.</p>
            </div>

            <button
              onClick={() => { setVisitorForm(prev => ({ ...prev, siteId: selectedSiteId !== "ALL" ? selectedSiteId : (sites[0]?.id || "") })); setIsVisitorModalOpen(true); }}
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
                    <th className="py-3 px-4">Check-In / Out</th>
                    <th className="py-3 px-4">Status & Badge</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {filteredVisitors.length > 0 ? (
                    <>
                    {paginatedVisitors.map(v => (
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
                        <td className="py-3 px-4 font-mono text-[11px]">
                          <div>In: {new Date(v.checkInTime).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</div>
                          {v.checkOutTime && (
                            <div className="text-slate-400">Out: {new Date(v.checkOutTime).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</div>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex flex-col gap-1">
                            <span className={`w-fit px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              v.status === 'IN_SITE' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                            }`}>
                              {v.status}
                            </span>
                            {v.status === 'CHECKED_OUT' && (
                              <span className={`text-[10px] font-semibold ${v.badgeReturned ? 'text-emerald-600' : 'text-rose-600'}`}>
                                {v.badgeReturned ? '✓ Badge Returned' : '⚠ Badge Missing'}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right">
                          {v.status === 'IN_SITE' && (
                            <button
                              onClick={() => handleOpenVisitorCheckout(v)}
                              className="px-2.5 py-1 rounded-lg bg-rose-600 text-white text-[10px] font-bold shadow hover:bg-rose-700 transition"
                            >
                              Check Out & Verify
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                    <tr>
                      <td colSpan={6} className="p-0">
                    <Pagination
                      currentPage={currentPage}
                      totalItems={filteredVisitors.length}
                      itemsPerPage={itemsPerPage}
                      onPageChange={setCurrentPage}
                      onItemsPerPageChange={setItemsPerPage}
                    />
                      </td>
                    </tr>
                    </>
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
              <p className="text-xs text-slate-500">Track raw materials, equipment dispatches, and supplier vehicles with full lifecycle approval.</p>
            </div>

            <button
              onClick={() => { setMaterialForm(prev => ({ ...prev, siteId: selectedSiteId !== "ALL" ? selectedSiteId : (sites[0]?.id || "") })); setIsMaterialModalOpen(true); }}
              className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Create Gate Pass</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredMaterials.length > 0 ? (
              <>
              {paginatedMaterials.map(m => (
                <div key={m.id} className={`p-4 rounded-2xl border ${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'} shadow-sm space-y-3`}>
                  <div className="flex items-center justify-between">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      m.movementType === 'INWARD' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300' : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-300'
                    }`}>
                      {m.movementType} PASS #{m.gatePassNumber}
                    </span>

                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      m.status === 'APPROVED' || m.status === 'RECEIVED' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300' :
                      m.status === 'REJECTED' ? 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300' :
                      m.status === 'DISPATCHED' ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300' :
                      'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                    }`}>
                      {m.status}
                    </span>
                  </div>

                  <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">{m.materialDescription} ({m.quantity})</h4>
                  <p className="text-xs text-slate-600 dark:text-slate-300">Supplier / Vendor: {m.supplierVendorName}</p>

                  <div className="text-[10px] text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-2 space-y-0.5">
                    <p>Vehicle: {m.vehicleNumber || 'N/A'} • Driver: {m.driverName || 'N/A'} ({m.driverPhone || 'N/A'})</p>
                    <p>Created: {new Date(m.createdAt).toLocaleString()}</p>
                  </div>

                  {m.status === 'PENDING_APPROVAL' && isManager && (
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={() => handleUpdateMaterialStatus(m.id, 'APPROVED')}
                        className="flex-1 py-1.5 rounded-xl bg-emerald-600 text-white text-[10px] font-bold shadow hover:bg-emerald-700 transition"
                      >
                        Approve Pass
                      </button>
                      <button
                        onClick={() => handleUpdateMaterialStatus(m.id, 'REJECTED')}
                        className="flex-1 py-1.5 rounded-xl bg-rose-600 text-white text-[10px] font-bold shadow hover:bg-rose-700 transition"
                      >
                        Reject Pass
                      </button>
                    </div>
                  )}

                  {m.status === 'APPROVED' && (
                    <div className="flex items-center gap-2 pt-1">
                      {m.movementType === 'OUTWARD' ? (
                        <button
                          onClick={() => handleUpdateMaterialStatus(m.id, 'DISPATCHED')}
                          className="w-full py-1.5 rounded-xl bg-indigo-600 text-white text-[10px] font-bold shadow hover:bg-indigo-700 transition"
                        >
                          Mark Dispatched from Gate
                        </button>
                      ) : (
                        <button
                          onClick={() => handleUpdateMaterialStatus(m.id, 'RECEIVED')}
                          className="w-full py-1.5 rounded-xl bg-emerald-600 text-white text-[10px] font-bold shadow hover:bg-emerald-700 transition"
                        >
                          Mark Received at Gate
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
                <div className="col-span-full">
                  <Pagination
                  currentPage={currentPage}
                  totalItems={filteredMaterials.length}
                  itemsPerPage={itemsPerPage}
                  onPageChange={setCurrentPage}
                  onItemsPerPageChange={setItemsPerPage}
                  />
                </div>
                </>
            ) : (
              <div className="col-span-full py-12 text-center text-slate-400">No material gate passes issued today.</div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 5: DAILY SITE LOGS & SHIFT HANDOVERS */}
      {/* ============================================================ */}
      {activeTab === 'DAILY_LOGS' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Daily Site Inspection & Shift Handover Register</h3>
              <p className="text-xs text-slate-500">Facility audit checklists, muster verification, and duty supervisor handovers.</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setInspectionForm(prev => ({ ...prev, siteId: selectedSiteId !== "ALL" ? selectedSiteId : (sites[0]?.id || "") }));
                  setIsInspectionModalOpen(true);
                }}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>New Site Inspection</span>
              </button>
              <button
                onClick={() => {
                  setHandoverForm(prev => ({ ...prev, siteId: selectedSiteId !== "ALL" ? selectedSiteId : (sites[0]?.id || "") }));
                  setIsHandoverModalOpen(true);
                }}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow flex items-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Shift Handover</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {dailySiteLogs.filter(d => selectedSiteId === "ALL" || d.siteId === selectedSiteId).map(log => (
              <div key={log.id} className={`p-4 rounded-2xl border ${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'} shadow-sm space-y-3`}>
                <div className="flex items-center justify-between">
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                    log.logType === 'INSPECTION' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300' : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-300'
                  }`}>
                    {log.logType || 'INSPECTION'} • {log.siteName || 'Site'}
                  </span>
                  <span className="text-[10px] font-bold text-slate-400">{new Date(log.createdAt).toLocaleString()}</span>
                </div>

                {log.logType === 'INSPECTION' ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-slate-700 dark:text-slate-300">Compliance Score:</span>
                      <span className={`font-bold ${Number(log.score || 0) >= 80 ? 'text-emerald-600' : 'text-amber-600'}`}>
                        {log.score || 95}%
                      </span>
                    </div>
                    {log.checklistData && log.checklistData.length > 0 && (
                      <div className="grid grid-cols-2 gap-1.5 pt-1">
                        {log.checklistData.map((item, idx) => (
                          <div key={idx} className="flex items-center gap-1 text-[11px] text-slate-600 dark:text-slate-300">
                            <span className={item.passed ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'}>
                              {item.passed ? '✓' : '✗'}
                            </span>
                            <span className="truncate">{item.item}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    <p className="text-xs text-slate-600 dark:text-slate-300 pt-1">{log.notes}</p>
                    <p className="text-[10px] text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-2">
                      Inspector: {log.supervisorName || log.inspectorId} • On Duty: {log.guardsCountOnDuty || 0} Guards
                    </p>
                  </div>
                ) : (
                  /* HANDOVER LOG */
                  <div className="space-y-2">
                    <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Outgoing: <span className="font-bold text-slate-900 dark:text-slate-100">{log.supervisorName || 'Duty Supervisor'}</span> → Incoming: <span className="font-bold text-indigo-600">{log.inventoryStatus?.incomingSupervisorName || log.incomingSupervisorId || 'Next Supervisor'}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-1 text-[11px] text-slate-600 dark:text-slate-300 pt-1">
                      <div>Master Keys: <span className="font-bold text-emerald-600">{log.inventoryStatus?.keysTransferred ? 'Transferred' : 'Pending'}</span></div>
                      <div>Walkie-Talkies: <span className="font-bold text-emerald-600">{log.inventoryStatus?.radiosTransferred ? 'Transferred' : 'Pending'}</span></div>
                      <div>Logbooks: <span className="font-bold text-emerald-600">{log.inventoryStatus?.logbooksTransferred ? 'Verified' : 'Pending'}</span></div>
                      <div>Muster Count: <span className="font-bold text-emerald-600">{log.inventoryStatus?.musterVerified ? 'Verified' : 'Pending'}</span></div>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 pt-1">{log.notes}</p>
                    <p className="text-[10px] text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-2">
                      Handover Status: <span className="font-bold text-emerald-600">{log.status || 'COMPLETED'}</span>
                    </p>
                  </div>
                )}
              </div>
            ))}
            {dailySiteLogs.length === 0 && (
              <div className="col-span-full py-12 text-center text-slate-400">No daily inspection or handover logs recorded yet.</div>
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
                  <option value="">-- Select a Site --</option>{sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
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
                <button type="submit" disabled={isLoading} className="px-5 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold shadow disabled:opacity-50">{isLoading ? "Saving..." : "Save Checkpoint"}</button>
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

              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500">Record Type</label>
                <select
                  value={incidentForm.type}
                  onChange={e => setIncidentForm({ ...incidentForm, type: e.target.value as any })}
                  className={`w-full mt-1 p-2.5 rounded-xl text-xs border ${isDark ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                >
                  <option value="INCIDENT">Incident</option>
                  <option value="COMPLAINT">Complaint</option>
                  <option value="BBS_OBSERVATION">BBS Observation</option>
                </select>
              </div>

              {incidentForm.type === 'BBS_OBSERVATION' && (
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500">Behavior Category (BBS)</label>
                  <input
                    type="text"
                    value={incidentForm.behaviorCategory || ''}
                    onChange={e => setIncidentForm({ ...incidentForm, behaviorCategory: e.target.value })}
                    className={`w-full mt-1 p-2.5 rounded-xl text-xs border ${isDark ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                    placeholder="e.g. Unsafe lifting, Not wearing PPE"
                    required
                  />
                </div>
              )}
              {incidentForm.type === 'COMPLAINT' && (
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500">SLA Deadline</label>
                  <input
                    type="date"
                    value={incidentForm.slaDeadline || ''}
                    onChange={e => setIncidentForm({ ...incidentForm, slaDeadline: e.target.value })}
                    className={`w-full mt-1 p-2.5 rounded-xl text-xs border ${isDark ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                  />
                </div>
              )}

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

              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500">Attach Evidence Photo</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={e => {
                    const file = e.target.files?.[0] || null;
                    setIncidentForm({ ...incidentForm, photoFile: file });
                  }}
                  className={`w-full mt-1 p-2 text-xs border ${isDark ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button type="button" onClick={() => setIsIncidentModalOpen(false)} className="px-4 py-2 text-xs font-semibold text-slate-500">Cancel</button>
                <button type="submit" disabled={isLoading} className="px-5 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold shadow disabled:opacity-50">{isLoading ? "Submitting..." : "Submit Incident"}</button>
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
                <button type="submit" disabled={isLoading} className="px-5 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold shadow disabled:opacity-50">{isLoading ? "Checking In..." : "Check In Visitor"}</button>
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
                <label className="text-[10px] font-bold uppercase text-slate-500">Site</label>
                <select
                  value={materialForm.siteId || ''}
                  onChange={e => setMaterialForm({ ...materialForm, siteId: e.target.value })}
                  className={`w-full mt-1 p-2.5 rounded-xl text-xs border ${isDark ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                >
                  <option value="">-- Select a Site --</option>
                  {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
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
                <button type="submit" disabled={isLoading} className="px-5 py-2 rounded-xl bg-amber-600 text-white text-xs font-bold shadow disabled:opacity-50">{isLoading ? "Creating..." : "Create Pass"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 5: VISITOR CHECK-OUT & GATE PASS RETURN VALIDATION */}
      {isVisitorCheckoutModalOpen && selectedVisitorForCheckout && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`w-full max-w-md p-6 rounded-3xl border shadow-2xl ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} space-y-4`}>
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Visitor Check-Out & Pass Return</h3>
                <p className="text-[11px] text-slate-500">Validate physical badge surrender before departure.</p>
              </div>
              <button onClick={() => { setIsVisitorCheckoutModalOpen(false); setSelectedVisitorForCheckout(null); }} className="opacity-60 hover:opacity-100">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className={`p-3 rounded-2xl border ${isDark ? 'bg-slate-800/60 border-slate-700' : 'bg-slate-50 border-slate-200'} space-y-1 text-xs`}>
              <p><span className="font-semibold text-slate-500">Visitor:</span> <span className="font-bold text-slate-900 dark:text-slate-100">{selectedVisitorForCheckout.visitorName}</span></p>
              <p><span className="font-semibold text-slate-500">Assigned Badge:</span> <span className="font-mono font-bold text-indigo-500">{selectedVisitorForCheckout.badgeNumber}</span></p>
              <p><span className="font-semibold text-slate-500">Company:</span> {selectedVisitorForCheckout.visitorCompany}</p>
            </div>

            <form onSubmit={handleConfirmVisitorCheckout} className="space-y-4">
              <div className="flex items-center gap-3 p-3 rounded-2xl border border-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/30 dark:border-emerald-800">
                <input
                  type="checkbox"
                  id="badgeReturnCheckbox"
                  checked={visitorCheckoutForm.badgeReturned}
                  onChange={e => setVisitorCheckoutForm({ ...visitorCheckoutForm, badgeReturned: e.target.checked })}
                  className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                />
                <label htmlFor="badgeReturnCheckbox" className="text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer">
                  Physical Visitor Badge Returned & Inspected
                </label>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500">Check-Out Notes (Optional)</label>
                <input
                  type="text"
                  value={visitorCheckoutForm.notes}
                  onChange={e => setVisitorCheckoutForm({ ...visitorCheckoutForm, notes: e.target.value })}
                  placeholder="e.g. Badge in good condition, escorted out."
                  className={`w-full mt-1 p-2.5 rounded-xl text-xs border ${isDark ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button type="button" onClick={() => { setIsVisitorCheckoutModalOpen(false); setSelectedVisitorForCheckout(null); }} className="px-4 py-2 text-xs font-semibold text-slate-500">Cancel</button>
                <button type="submit" disabled={isLoading} className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow disabled:opacity-50">
                  {isLoading ? "Processing..." : "Complete Check-Out"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 6: SITE INSPECTION MODAL */}
      {isInspectionModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`w-full max-w-md p-6 rounded-3xl border shadow-2xl ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} space-y-4`}>
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Site Facility Inspection</h3>
                <p className="text-[11px] text-slate-500">Perform standard 4-point facility security audit.</p>
              </div>
              <button onClick={() => setIsInspectionModalOpen(false)} className="opacity-60 hover:opacity-100"><X className="w-4 h-4" /></button>
            </div>

            <form onSubmit={handleSaveInspection} className="space-y-3">
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500">Site</label>
                <select
                  value={inspectionForm.siteId || ''}
                  onChange={e => setInspectionForm({ ...inspectionForm, siteId: e.target.value })}
                  className={`w-full mt-1 p-2.5 rounded-xl text-xs border ${isDark ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                >
                  <option value="">-- Select a Site --</option>
                  {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500">Inspection Date</label>
                  <input
                    type="date"
                    value={inspectionForm.date}
                    onChange={e => setInspectionForm({ ...inspectionForm, date: e.target.value })}
                    className={`w-full mt-1 p-2.5 rounded-xl text-xs border ${isDark ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500">Compliance Score (%)</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={inspectionForm.score}
                    onChange={e => setInspectionForm({ ...inspectionForm, score: Number(e.target.value) })}
                    className={`w-full mt-1 p-2.5 rounded-xl text-xs border ${isDark ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                  />
                </div>
              </div>

              <div className="space-y-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                <label className="text-[10px] font-bold uppercase text-slate-500">Audit Checklist Items</label>
                <div className="space-y-1.5 text-xs">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={inspectionForm.accessControlOk} onChange={e => setInspectionForm({ ...inspectionForm, accessControlOk: e.target.checked })} />
                    <span>Access Control & Boom Barriers Operational</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={inspectionForm.cctvLightingOk} onChange={e => setInspectionForm({ ...inspectionForm, cctvLightingOk: e.target.checked })} />
                    <span>CCTV & Perimeter Lighting Functional</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={inspectionForm.fireSafetyOk} onChange={e => setInspectionForm({ ...inspectionForm, fireSafetyOk: e.target.checked })} />
                    <span>Fire Extinguishers & Emergency Exits Clear</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={inspectionForm.turnoutOk} onChange={e => setInspectionForm({ ...inspectionForm, turnoutOk: e.target.checked })} />
                    <span>Guard Uniforms, Turnout & ID Badges Compliant</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500">Audit Notes / Corrective Actions</label>
                <textarea
                  value={inspectionForm.notes}
                  onChange={e => setInspectionForm({ ...inspectionForm, notes: e.target.value })}
                  rows={2}
                  className={`w-full mt-1 p-2.5 rounded-xl text-xs border ${isDark ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                  required
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button type="button" onClick={() => setIsInspectionModalOpen(false)} className="px-4 py-2 text-xs font-semibold text-slate-500">Cancel</button>
                <button type="submit" disabled={isLoading} className="px-5 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold shadow disabled:opacity-50">
                  {isLoading ? "Saving..." : "Submit Inspection"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 7: SHIFT HANDOVER MODAL */}
      {isHandoverModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`w-full max-w-md p-6 rounded-3xl border shadow-2xl ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} space-y-4`}>
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Shift Handover Register</h3>
                <p className="text-[11px] text-slate-500">Transfer custody of keys, radios, and site logs.</p>
              </div>
              <button onClick={() => setIsHandoverModalOpen(false)} className="opacity-60 hover:opacity-100"><X className="w-4 h-4" /></button>
            </div>

            <form onSubmit={handleSaveHandover} className="space-y-3">
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500">Site</label>
                <select
                  value={handoverForm.siteId || ''}
                  onChange={e => setHandoverForm({ ...handoverForm, siteId: e.target.value })}
                  className={`w-full mt-1 p-2.5 rounded-xl text-xs border ${isDark ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                >
                  <option value="">-- Select a Site --</option>
                  {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500">Incoming Duty Supervisor</label>
                <select
                  value={handoverForm.incomingSupervisorId || ''}
                  onChange={e => setHandoverForm({ ...handoverForm, incomingSupervisorId: e.target.value })}
                  className={`w-full mt-1 p-2.5 rounded-xl text-xs border ${isDark ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                >
                  <option value="">-- Select Incoming Supervisor --</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName} ({emp.employeeId || emp.id})</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                <label className="text-[10px] font-bold uppercase text-slate-500">Custody Transfers & Checks</label>
                <div className="space-y-1.5 text-xs">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={handoverForm.keysTransferred} onChange={e => setHandoverForm({ ...handoverForm, keysTransferred: e.target.checked })} />
                    <span>Master Key Sets & Padlock Keys Handed Over</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={handoverForm.radiosTransferred} onChange={e => setHandoverForm({ ...handoverForm, radiosTransferred: e.target.checked })} />
                    <span>Walkie-Talkies & Charging Docks Handed Over</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={handoverForm.logbooksTransferred} onChange={e => setHandoverForm({ ...handoverForm, logbooksTransferred: e.target.checked })} />
                    <span>Physical Gate Logbooks Signed Off</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={handoverForm.musterVerified} onChange={e => setHandoverForm({ ...handoverForm, musterVerified: e.target.checked })} />
                    <span>Guard Muster Headcount Verified</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500">Handover Remarks & Outstanding Instructions</label>
                <textarea
                  value={handoverForm.notes}
                  onChange={e => setHandoverForm({ ...handoverForm, notes: e.target.value })}
                  rows={2}
                  className={`w-full mt-1 p-2.5 rounded-xl text-xs border ${isDark ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                  required
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button type="button" onClick={() => setIsHandoverModalOpen(false)} className="px-4 py-2 text-xs font-semibold text-slate-500">Cancel</button>
                <button type="submit" disabled={isLoading} className="px-5 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold shadow disabled:opacity-50">
                  {isLoading ? "Saving..." : "Confirm Handover"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
