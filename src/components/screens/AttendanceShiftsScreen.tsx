import React, { useState, useEffect } from 'react';
import { 
  Clock, 
  Calendar, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Search, 
  Filter, 
  Plus, 
  Download, 
  RefreshCw, 
  MapPin, 
  UserCheck, 
  Edit3, 
  Trash2, 
  FileSpreadsheet, 
  ShieldAlert, 
  Layers, 
  ChevronRight, 
  Building2,
  Users,
  Check,
  X,
  Navigation,
  Sparkles,
  Info,
  Inbox,
  UserX,
  ShieldCheck,
  RotateCcw
} from 'lucide-react';

const TableRowSkeleton: React.FC = () => (
  <tr className="animate-pulse border-b border-slate-100 dark:border-slate-800">
    <td className="py-3.5 px-4">
      <div className="h-3.5 w-28 bg-slate-200 dark:bg-slate-800 rounded mb-1.5" />
      <div className="h-2.5 w-16 bg-slate-200 dark:bg-slate-800 rounded" />
    </td>
    <td className="py-3.5 px-4">
      <div className="h-3.5 w-24 bg-slate-200 dark:bg-slate-800 rounded mb-1.5" />
      <div className="h-2.5 w-24 bg-slate-200 dark:bg-slate-800 rounded" />
    </td>
    <td className="py-3.5 px-4">
      <div className="h-3.5 w-28 bg-slate-200 dark:bg-slate-800 rounded mb-1.5" />
      <div className="h-2.5 w-16 bg-slate-200 dark:bg-slate-800 rounded" />
    </td>
    <td className="py-3.5 px-4">
      <div className="h-3.5 w-16 bg-slate-200 dark:bg-slate-800 rounded" />
    </td>
    <td className="py-3.5 px-4">
      <div className="h-3.5 w-16 bg-slate-200 dark:bg-slate-800 rounded" />
    </td>
    <td className="py-3.5 px-4">
      <div className="h-5 w-20 bg-slate-200 dark:bg-slate-800 rounded-full" />
    </td>
    <td className="py-3.5 px-4 text-right">
      <div className="h-7 w-7 bg-slate-200 dark:bg-slate-800 rounded-lg ml-auto" />
    </td>
  </tr>
);

const CardSkeleton: React.FC = () => (
  <div className="p-5 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 animate-pulse space-y-4 shadow-sm">
    <div className="flex items-center justify-between">
      <div className="space-y-2">
        <div className="h-2.5 w-16 bg-slate-200 dark:bg-slate-800 rounded" />
        <div className="h-4 w-36 bg-slate-200 dark:bg-slate-800 rounded" />
      </div>
      <div className="h-6 w-16 bg-slate-200 dark:bg-slate-800 rounded-full" />
    </div>
    <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
      <div className="h-3 w-full bg-slate-200 dark:bg-slate-800 rounded" />
      <div className="h-3 w-3/4 bg-slate-200 dark:bg-slate-800 rounded" />
    </div>
  </div>
);

const RequestSkeleton: React.FC = () => (
  <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 animate-pulse flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
    <div className="space-y-2 flex-1">
      <div className="flex items-center gap-2">
        <div className="h-3.5 w-28 bg-slate-200 dark:bg-slate-800 rounded" />
        <div className="h-3 w-16 bg-slate-200 dark:bg-slate-800 rounded" />
        <div className="h-3 w-12 bg-slate-200 dark:bg-slate-800 rounded" />
      </div>
      <div className="h-3 w-3/4 bg-slate-200 dark:bg-slate-800 rounded" />
    </div>
    <div className="flex items-center gap-2 shrink-0">
      <div className="h-8 w-20 bg-slate-200 dark:bg-slate-800 rounded-xl" />
      <div className="h-8 w-20 bg-slate-200 dark:bg-slate-800 rounded-xl" />
    </div>
  </div>
);

const EmptyState: React.FC<{
  icon: React.ElementType;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  isDark?: boolean;
}> = ({ icon: Icon, title, description, actionLabel, onAction, isDark }) => (
  <div className={`p-10 md:p-14 rounded-3xl border border-dashed text-center flex flex-col items-center justify-center space-y-3.5 ${
    isDark ? 'bg-slate-900/40 border-slate-800' : 'bg-slate-50/70 border-slate-200'
  }`}>
    <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center shrink-0">
      <Icon className="w-6 h-6" />
    </div>
    <div className="max-w-md space-y-1">
      <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">{title}</h4>
      <p className="text-xs text-slate-500 dark:text-slate-400">{description}</p>
    </div>
    {actionLabel && onAction && (
      <button
        onClick={onAction}
        className="mt-1 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow transition flex items-center gap-2"
      >
        <Plus className="w-3.5 h-3.5" />
        <span>{actionLabel}</span>
      </button>
    )}
  </div>
);
import { 
  UserSession, 
  CompanyTenant, 
  PhaseAScreen, 
  AttendanceLogRecord, 
  ShiftRecord, 
  SiteRecord, 
  EmployeeRecord,
  UserRole 
} from '../../types';
import { FirestoreService } from '../../services/firestoreService';
import { OfflineSyncService } from '../../services/offlineSyncService';
import { useTheme } from '../../context/ThemeContext';

interface AttendanceShiftsScreenProps {
  userSession: UserSession;
  activeCompany: CompanyTenant | null;
  isOnline: boolean;
  onNavigate: (screen: PhaseAScreen) => void;
}


// Helper: Calculate distance between two coords in meters using Haversine formula
function getDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // metres
  const p1 = lat1 * Math.PI/180;
  const p2 = lat2 * Math.PI/180;
  const dp = (lat2-lat1) * Math.PI/180;
  const dl = (lon2-lon1) * Math.PI/180;

  const a = Math.sin(dp/2) * Math.sin(dp/2) +
            Math.cos(p1) * Math.cos(p2) *
            Math.sin(dl/2) * Math.sin(dl/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c;
}

export const AttendanceShiftsScreen: React.FC<AttendanceShiftsScreenProps> = ({
  userSession,
  activeCompany,
  isOnline,
  onNavigate
}) => {
  const { isDark } = useTheme();
  const companyId = activeCompany?.companyId || userSession.companyId;

  // Active Tab: 'DASHBOARD' | 'MUSTER' | 'APPROVALS' | 'SHIFTS' | 'REPORTS'
  const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'MUSTER' | 'APPROVALS' | 'SHIFTS' | 'REPORTS'>('DASHBOARD');

  // Core Data States
  const [attendanceLogs, setAttendanceLogs] = useState<AttendanceLogRecord[]>([]);
  const [shifts, setShifts] = useState<ShiftRecord[]>([]);
  const [sites, setSites] = useState<SiteRecord[]>([]);
  const [employees, setEmployees] = useState<EmployeeRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [statusMsg, setStatusMsg] = useState<{ type: 'SUCCESS' | 'ERROR' | 'INFO'; text: string } | null>(null);

  // Filters State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedSiteId, setSelectedSiteId] = useState<string>('ALL');
  const [selectedShiftId, setSelectedShiftId] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  useEffect(() => { setCurrentPage(1); }, [searchQuery, selectedDate, selectedSiteId, selectedShiftId, selectedStatus]);

  // GPS State
  const [currentGps, setCurrentGps] = useState<{ latitude: number; longitude: number; accuracy?: number } | null>(null);
  const [isGettingGps, setIsGettingGps] = useState<boolean>(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

  // Shift Modal State
  const [isShiftModalOpen, setIsShiftModalOpen] = useState<boolean>(false);
  const [editingShift, setEditingShift] = useState<ShiftRecord | null>(null);
  const [shiftForm, setShiftForm] = useState<{
    id?: string;
    name: string;
    code: string;
    siteId?: string;
    startTime: string;
    endTime: string;
    gracePeriodMinutes: number;
    breakDurationMinutes: number;
    weeklyOffDays: number[];
    status: 'ACTIVE' | 'INACTIVE';
  }>({
    name: '',
    code: '',
    siteId: '',
    startTime: '08:00',
    endTime: '16:00',
    gracePeriodMinutes: 15,
    breakDurationMinutes: 30,
    weeklyOffDays: [0], // Sunday
    status: 'ACTIVE'
  });

  // Correction Modal State
  const [isCorrectionModalOpen, setIsCorrectionModalOpen] = useState<boolean>(false);
  const [selectedLogForCorrection, setSelectedLogForCorrection] = useState<AttendanceLogRecord | null>(null);
  const [correctionNote, setCorrectionNote] = useState<string>('');

  // Manual Punch / Muster Modal State
  const [isMusterModalOpen, setIsMusterModalOpen] = useState<boolean>(false);
  const [musterForm, setMusterForm] = useState<{
    employeeId: string;
    siteId: string;
    shiftId: string;
    checkInTime: string;
    checkOutTime: string;
    status: AttendanceLogRecord['status'];
  }>({
    employeeId: '',
    siteId: '',
    shiftId: '',
    checkInTime: '',
    checkOutTime: '',
    status: 'PRESENT'
  });

  // Assign Shift Modal State
  const [isAssignShiftModalOpen, setIsAssignShiftModalOpen] = useState<boolean>(false);
  const [selectedEmployeeForShift, setSelectedEmployeeForShift] = useState<EmployeeRecord | null>(null);
  const [targetShiftId, setTargetShiftId] = useState<string>('');

  // User Permissions Check
  const isSuperAdmin = userSession.role === 'SUPER_ADMIN';
  const isCompanyAdmin = userSession.role === 'COMPANY_ADMIN';
  const isOpsManager = userSession.role === 'OPS_MANAGER' || userSession.role === 'HR_ADMIN';
  const isSupervisor = userSession.role === 'FIELD_OFFICER';
  const isGuard = userSession.role === 'GUARD';
  const canManageShifts = isSuperAdmin || isCompanyAdmin || isOpsManager;
  const canApproveCorrections = isSuperAdmin || isCompanyAdmin || isOpsManager;

  // Real-time Subscriptions
  useEffect(() => {
    if (!companyId) return;
    setIsLoading(true);

    // 1. Subscribe to Attendance Logs
    const unsubLogs = FirestoreService.subscribeToAttendanceLogs(companyId, (logs) => {
      setAttendanceLogs(logs);
      setIsLoading(false);
    });

    // 2. Subscribe to Shifts
    const unsubShifts = FirestoreService.subscribeToShifts(companyId, (shiftList) => {
      setShifts(shiftList);
    });

    // 3. Fetch Sites & Employees
    FirestoreService.getSites(companyId).then(setSites);
    FirestoreService.subscribeToEmployees(companyId, setEmployees);

    return () => {
      unsubLogs();
      unsubShifts();
    };
  }, [companyId]);

  // Fetch real device location via browser Geolocation API
  const handleFetchLocation = () => {
    if (!navigator.geolocation) {
      setGpsError('Geolocation API not supported by browser.');
      return;
    }

    setIsGettingGps(true);
    setGpsError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCurrentGps({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy
        });
        setIsGettingGps(false);
      },
      (err) => {
        setIsGettingGps(false);
        setGpsError(`GPS Permission/Hardware Error: ${err.message}`);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  useEffect(() => {
    handleFetchLocation();
  }, []);

  // Today's record for logged-in user
  const todayStr = new Date().toISOString().split('T')[0];
  const myTodayRecord = attendanceLogs.find(
    l => l.employeeId === userSession.employeeId && l.date === todayStr
  );

  // ----------------------------------------------------
  // HANDLERS: PUNCH IN & PUNCH OUT
  // ----------------------------------------------------
  const handleSelfPunchIn = async () => {
    if (!companyId) return;
    setIsLoading(true);
    setStatusMsg(null);

    // Find assigned site & check geofence
    const myEmp = employees.find(e => e.employeeId === userSession.employeeId);
    const assignedSiteId = userSession.assignedSiteId || sites[0]?.id || 'SITE-DEFAULT';
    const assignedSite = sites.find(s => s.id === assignedSiteId);

    if (assignedSite?.latitude && assignedSite?.longitude) {
      if (!currentGps) {
        setStatusMsg({ type: 'ERROR', text: 'GPS location is required for this site. Please enable GPS and try again.' });
        setIsLoading(false);
        return;
      }
      const dist = getDistance(currentGps.latitude, currentGps.longitude, assignedSite.latitude, assignedSite.longitude);
      const allowedRadius = assignedSite.geofenceRadius || 100; // default 100m
      if (dist > allowedRadius) {
        setStatusMsg({ type: 'ERROR', text: `You are ${Math.round(dist)}m away from the site. Must be within ${allowedRadius}m to punch in.` });
        setIsLoading(false);
        return;
      }
    }

    // Find assigned shift
    const assignedShift = shifts.find(s => s.id === myEmp?.assignedShiftId) || shifts[0];


    const newLog: Omit<AttendanceLogRecord, 'id' | 'createdAt'> = {
      companyId,
      employeeId: userSession.employeeId,
      employeeName: userSession.fullName,
      siteId: userSession.assignedSiteId || sites[0]?.id || 'SITE-DEFAULT',
      siteName: sites.find(s => s.id === userSession.assignedSiteId)?.name || 'Main Site',
      shiftId: assignedShift?.id || 'SHIFT-DEFAULT',
      shiftName: assignedShift?.name || 'Standard Shift',
      date: todayStr,
      checkInTime: new Date().toISOString(),
      status: 'PRESENT',
      checkInGps: currentGps || undefined,
      checkInMethod: 'SELF_GPS',
      lateArrivalMinutes: 0,
      earlyDepartureMinutes: 0,
      overtimeMinutes: 0,
      createdBy: userSession.userId
    };

    if (!isOnline) {
      OfflineSyncService.queueAction('PUNCH_IN', {
        companyId,
        data: newLog
      });
      setStatusMsg({ type: 'INFO', text: 'Offline mode: Punch-in queued locally. Will auto-sync when online.' });
      setIsLoading(false);
      return;
    }

    const res = await FirestoreService.checkInEmployee(companyId, newLog, assignedShift);
    if (res.success) {
      setStatusMsg({ type: 'SUCCESS', text: res.message });
    } else {
      setStatusMsg({ type: 'ERROR', text: res.message });
    }
    setIsLoading(false);
  };

  const handleSelfPunchOut = async () => {
    if (!companyId || !myTodayRecord) return;
    setIsLoading(true);
    setStatusMsg(null);

    // Find assigned site & check geofence
    const assignedSiteId = userSession.assignedSiteId || sites[0]?.id || 'SITE-DEFAULT';
    const assignedSite = sites.find(s => s.id === assignedSiteId);

    if (assignedSite?.latitude && assignedSite?.longitude) {
      if (!currentGps) {
        setStatusMsg({ type: 'ERROR', text: 'GPS location is required to punch out. Please enable GPS and try again.' });
        setIsLoading(false);
        return;
      }
      const dist = getDistance(currentGps.latitude, currentGps.longitude, assignedSite.latitude, assignedSite.longitude);
      const allowedRadius = assignedSite.geofenceRadius || 100;
      if (dist > allowedRadius) {
        setStatusMsg({ type: 'ERROR', text: `You are ${Math.round(dist)}m away from the site. Must be within ${allowedRadius}m to punch out.` });
        setIsLoading(false);
        return;
      }
    }

    const assignedShift = shifts.find(s => s.id === myTodayRecord.shiftId) || shifts[0];
    const checkOutTimeISO = new Date().toISOString();

    if (!isOnline) {
      OfflineSyncService.queueAction('PUNCH_OUT', {
        companyId,
        data: { attendanceId: myTodayRecord.id, checkOutTime: checkOutTimeISO }
      });
      setStatusMsg({ type: 'INFO', text: 'Offline mode: Punch-out queued locally. Will auto-sync when online.' });
      setIsLoading(false);
      return;
    }

    const res = await FirestoreService.checkOutEmployee(
      companyId,
      myTodayRecord.id,
      checkOutTimeISO,
      currentGps || undefined,
      assignedShift
    );

    if (res.success) {
      setStatusMsg({ type: 'SUCCESS', text: res.message });
    } else {
      setStatusMsg({ type: 'ERROR', text: res.message });
    }
    setIsLoading(false);
  };

  // ----------------------------------------------------
  // HANDLERS: SHIFT MANAGEMENT
  // ----------------------------------------------------
  const handleOpenShiftModal = (shift?: ShiftRecord) => {
    if (shift) {
      setEditingShift(shift);
      setShiftForm({
        id: shift.id,
        name: shift.name || '',
        code: shift.code || '',
        siteId: shift.siteId || '',
        startTime: shift.startTime || '08:00',
        endTime: shift.endTime || '16:00',
        gracePeriodMinutes: shift.gracePeriodMinutes ?? 15,
        breakDurationMinutes: shift.breakDurationMinutes ?? 30,
        weeklyOffDays: shift.weeklyOffDays || [0],
        status: shift.status || 'ACTIVE'
      });
    } else {
      setEditingShift(null);
      setShiftForm({
        name: '',
        code: `SH-${Math.floor(100 + Math.random() * 900)}`,
        siteId: sites[0]?.id || '',
        startTime: '08:00',
        endTime: '16:00',
        gracePeriodMinutes: 15,
        breakDurationMinutes: 30,
        weeklyOffDays: [0],
        status: 'ACTIVE'
      });
    }
    setIsShiftModalOpen(true);
  };

  const handleSaveShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId) return;

    if (!shiftForm.name.trim() || !shiftForm.code.trim()) {
      setStatusMsg({ type: 'ERROR', text: 'Shift Name and Shift Code are required.' });
      return;
    }

    // Check duplicate shift code
    const isDup = await FirestoreService.checkDuplicateShiftCode(companyId, shiftForm.code, shiftForm.id);
    if (isDup) {
      setStatusMsg({ type: 'ERROR', text: `Shift code '${shiftForm.code}' already exists in company.` });
      return;
    }

    const shiftData: ShiftRecord = {
      id: shiftForm.id || `SHIFT-${Date.now()}`,
      companyId,
      siteId: shiftForm.siteId || undefined,
      name: shiftForm.name.trim(),
      code: shiftForm.code.trim().toUpperCase(),
      startTime: shiftForm.startTime,
      endTime: shiftForm.endTime,
      gracePeriodMinutes: Number(shiftForm.gracePeriodMinutes) || 0,
      breakDurationMinutes: Number(shiftForm.breakDurationMinutes) || 0,
      weeklyOffDays: shiftForm.weeklyOffDays,
      status: shiftForm.status,
      createdBy: userSession.userId,
      createdAt: editingShift?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setIsLoading(true);
    const ok = await FirestoreService.saveShift(companyId, shiftData);
    setIsLoading(false);

    if (ok) {
      setStatusMsg({ type: 'SUCCESS', text: `Shift '${shiftData.name}' saved successfully.` });
      setIsShiftModalOpen(false);
    } else {
      setStatusMsg({ type: 'ERROR', text: 'Failed to save shift in Firestore.' });
    }
  };

  const handleToggleShiftStatus = async (shift: ShiftRecord) => {
    if (!companyId) return;
    const newStatus = shift.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    setIsLoading(true);
    const ok = await FirestoreService.updateShiftStatus(companyId, shift.id, newStatus);
    setIsLoading(false);

    if (ok) {
      setStatusMsg({ type: 'SUCCESS', text: `Shift status updated to ${newStatus}.` });
    } else {
      setStatusMsg({ type: 'ERROR', text: 'Failed to update shift status.' });
    }
  };

  // ----------------------------------------------------
  // HANDLERS: CORRECTIONS & APPROVALS
  // ----------------------------------------------------
  const handleRequestCorrection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId || !selectedLogForCorrection || !correctionNote.trim()) return;

    setIsLoading(true);
    const ok = await FirestoreService.requestAttendanceCorrection(
      companyId,
      selectedLogForCorrection.id,
      correctionNote.trim()
    );
    setIsLoading(false);

    if (ok) {
      setStatusMsg({ type: 'SUCCESS', text: 'Attendance correction request submitted for approval.' });
      setIsCorrectionModalOpen(false);
      setCorrectionNote('');
    } else {
      setStatusMsg({ type: 'ERROR', text: 'Failed to submit correction request.' });
    }
  };

  const handleApproveCorrection = async (log: AttendanceLogRecord, approve: boolean) => {
    if (!companyId) return;
    setIsLoading(true);
    const ok = await FirestoreService.approveOrRejectAttendanceCorrection(
      companyId,
      log.id,
      approve,
      userSession.userId
    );
    setIsLoading(false);

    if (ok) {
      setStatusMsg({ 
        type: 'SUCCESS', 
        text: approve ? `Correction approved for ${log.employeeName}.` : `Correction rejected for ${log.employeeName}.`
      });
    } else {
      setStatusMsg({ type: 'ERROR', text: 'Failed to process correction decision.' });
    }
  };

  // ----------------------------------------------------
  // HANDLERS: MUSTER / MANUAL PUNCH BY SUPERVISOR
  // ----------------------------------------------------
  const handleSaveMusterPunch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId || !musterForm.employeeId || !musterForm.siteId) {
      setStatusMsg({ type: 'ERROR', text: 'Employee, Site, and Status are required for muster punch.' });
      return;
    }

    const emp = employees.find(e => e.id === musterForm.employeeId || e.employeeId === musterForm.employeeId);
    const siteObj = sites.find(s => s.id === musterForm.siteId);
    const shiftObj = shifts.find(s => s.id === musterForm.shiftId) || shifts[0];

    const dateStr = selectedDate || todayStr;
    const logId = `ATT-${dateStr}-${emp?.employeeId || 'EMP'}`;

    const newLog: AttendanceLogRecord = {
      id: logId,
      companyId,
      employeeId: emp?.employeeId || 'EMP-UNKNOWN',
      employeeName: `${emp?.firstName || ''} ${emp?.lastName || ''}`.trim() || 'Employee',
      siteId: musterForm.siteId,
      siteName: siteObj?.name || 'Site',
      shiftId: shiftObj?.id || 'SHIFT-001',
      shiftName: shiftObj?.name || 'Default Shift',
      date: dateStr,
      checkInTime: musterForm.checkInTime ? new Date(`${dateStr}T${musterForm.checkInTime}`).toISOString() : new Date().toISOString(),
      checkOutTime: musterForm.checkOutTime ? new Date(`${dateStr}T${musterForm.checkOutTime}`).toISOString() : undefined,
      status: musterForm.status,
      checkInMethod: 'SUPERVISOR_MUSTER',
      lateArrivalMinutes: 0,
      earlyDepartureMinutes: 0,
      overtimeMinutes: 0,
      approvedBy: userSession.userId,
      createdAt: new Date().toISOString(),
      createdBy: userSession.userId
    };

    setIsLoading(true);
    const ok = await FirestoreService.saveAttendanceLogDirect(companyId, newLog);
    setIsLoading(false);

    if (ok) {
      setStatusMsg({ type: 'SUCCESS', text: `Muster record logged for ${newLog.employeeName}.` });
      setIsMusterModalOpen(false);
    } else {
      setStatusMsg({ type: 'ERROR', text: 'Failed to save muster record.' });
    }
  };

  // ----------------------------------------------------
  // HANDLERS: ASSIGN SHIFT TO EMPLOYEE
  // ----------------------------------------------------
  const handleAssignShiftToEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId || !selectedEmployeeForShift || !targetShiftId) return;

    setIsLoading(true);
    const updatedEmp: EmployeeRecord = {
      ...selectedEmployeeForShift,
      assignedShiftId: targetShiftId
    };

    const ok = await FirestoreService.saveEmployee(companyId, updatedEmp);
    setIsLoading(false);

    if (ok) {
      setStatusMsg({ type: 'SUCCESS', text: `Shift assigned to ${selectedEmployeeForShift.firstName} ${selectedEmployeeForShift.lastName}.` });
      setIsAssignShiftModalOpen(false);
    } else {
      setStatusMsg({ type: 'ERROR', text: 'Failed to assign shift.' });
    }
  };

  // Reset Filters Helper
  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedDate(new Date().toISOString().split('T')[0]);
    setSelectedSiteId('ALL');
    setSelectedShiftId('ALL');
    setSelectedStatus('ALL');
  };

  // ----------------------------------------------------
  // EXPORT CSV REPORT
  // ----------------------------------------------------
  const handleExportCSV = () => {
    if (filteredLogs.length === 0) {
      setStatusMsg({ type: 'INFO', text: 'No attendance records available to export.' });
      return;
    }

    const headers = ['Date', 'Employee ID', 'Employee Name', 'Site', 'Shift', 'Check-In', 'Check-Out', 'Status', 'Late (Mins)', 'Early (Mins)', 'Overtime (Mins)', 'Method'];
    const rows = filteredLogs.map(l => [
      l.date,
      l.employeeId,
      `"${l.employeeName}"`,
      `"${l.siteName || l.siteId}"`,
      `"${l.shiftName || l.shiftId}"`,
      l.checkInTime ? new Date(l.checkInTime).toLocaleTimeString() : 'N/A',
      l.checkOutTime ? new Date(l.checkOutTime).toLocaleTimeString() : 'N/A',
      l.status,
      l.lateArrivalMinutes || 0,
      l.earlyDepartureMinutes || 0,
      l.overtimeMinutes || 0,
      l.checkInMethod
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `LSM_Attendance_Report_${selectedDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setStatusMsg({ type: 'SUCCESS', text: 'Attendance CSV report downloaded.' });
  };

  // Filtered attendance list calculation
  const filteredLogs = attendanceLogs.filter(log => {
    // Role-based visibility scoping
    if (isGuard) {
      if (log.employeeId !== userSession.employeeId) return false;
    } else if (isSupervisor) {
      if (userSession.assignedSiteId && log.siteId !== userSession.assignedSiteId) return false;
    }

    // Search query match
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = log.employeeName.toLowerCase().includes(q);
      const matchEmpId = log.employeeId.toLowerCase().includes(q);
      if (!matchName && !matchEmpId) return false;
    }

    // Date filter
    if (selectedDate && log.date !== selectedDate) return false;

    // Site filter
    if (selectedSiteId !== 'ALL' && log.siteId !== selectedSiteId) return false;

    // Shift filter
    if (selectedShiftId !== 'ALL' && log.shiftId !== selectedShiftId) return false;

    // Status filter
    if (selectedStatus !== 'ALL' && log.status !== selectedStatus) return false;

    return true;
  });

  const paginatedLogs = filteredLogs.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // KPI Calculations for Dashboard
  const todayLogs = attendanceLogs.filter(l => l.date === selectedDate);
  const totalPresentToday = todayLogs.filter(l => l.status === 'PRESENT' || l.status === 'LATE').length;
  const totalLateToday = todayLogs.filter(l => l.status === 'LATE' || (l.lateArrivalMinutes && l.lateArrivalMinutes > 0)).length;
  const totalEarlyToday = todayLogs.filter(l => l.earlyDepartureMinutes && l.earlyDepartureMinutes > 0).length;
  const totalAbsentToday = todayLogs.filter(l => l.status === 'ABSENT').length;
  const pendingCorrectionsCount = attendanceLogs.filter(l => l.correctionRequested && l.correctionStatus === 'PENDING').length;

  return (
    <div className="flex-1 flex flex-col w-full h-full overflow-y-auto p-4 md:p-6 space-y-6">
      {/* Top Header & Status Alert */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Clock className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Attendance & Shift Roster
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Real-time multi-site GPS attendance tracking, shift scheduling, and HR compliance rollups.
          </p>
        </div>

        {/* Action Buttons Header */}
        <div className="flex flex-wrap items-center gap-2">
          {canManageShifts && (
            <button
              onClick={() => handleOpenShiftModal()}
              className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-md flex items-center gap-2 transition"
            >
              <Plus className="w-4 h-4" />
              <span>Create Shift</span>
            </button>
          )}

          {(isSupervisor || canManageShifts) && (
            <button
              onClick={() => {
                setMusterForm({
                  employeeId: employees[0]?.employeeId || '',
                  siteId: sites[0]?.id || '',
                  shiftId: shifts[0]?.id || '',
                  checkInTime: '08:00',
                  checkOutTime: '16:00',
                  status: 'PRESENT'
                });
                setIsMusterModalOpen(true);
              }}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-md flex items-center gap-2 transition"
            >
              <UserCheck className="w-4 h-4" />
              <span>Muster Punch</span>
            </button>
          )}

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

      {/* Tabs Navigation */}
      <div className="flex items-center border-b border-slate-200 dark:border-slate-800 overflow-x-auto gap-2 scrollbar-none">
        <button
          onClick={() => setActiveTab('DASHBOARD')}
          className={`pb-3 px-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition whitespace-nowrap ${
            activeTab === 'DASHBOARD'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Attendance Dashboard</span>
        </button>

        <button
          onClick={() => setActiveTab('MUSTER')}
          className={`pb-3 px-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition whitespace-nowrap ${
            activeTab === 'MUSTER'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          <span>Site Muster Register</span>
        </button>

        {canApproveCorrections && (
          <button
            onClick={() => setActiveTab('APPROVALS')}
            className={`pb-3 px-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition relative whitespace-nowrap ${
              activeTab === 'APPROVALS'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <ShieldAlert className="w-4 h-4" />
            <span>Corrections Queue</span>
            {pendingCorrectionsCount > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-white">
                {pendingCorrectionsCount}
              </span>
            )}
          </button>
        )}

        <button
          onClick={() => setActiveTab('SHIFTS')}
          className={`pb-3 px-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition whitespace-nowrap ${
            activeTab === 'SHIFTS'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Shifts Management ({shifts.length})</span>
        </button>
      </div>

      {/* ============================================================ */}
      {/* TAB 1: ATTENDANCE DASHBOARD */}
      {/* ============================================================ */}
      {activeTab === 'DASHBOARD' && (
        <div className="space-y-6">
          {/* Quick Self-Punch Widget Card */}
          <div className={`p-5 rounded-3xl border shadow-sm flex flex-col md:flex-row items-center justify-between gap-6 ${
            isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <div className="flex items-center gap-4 w-full md:w-auto">
              <div className="w-14 h-14 rounded-2xl bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                <Clock className="w-7 h-7" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-indigo-500">
                  {myTodayRecord ? (myTodayRecord.checkOutTime ? 'Punch Completed' : 'Checked In') : 'Self Punch Portal'}
                </p>
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  {userSession.fullName} ({userSession.employeeId})
                </h3>
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-1">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-emerald-500" />
                    {currentGps ? `${currentGps.latitude.toFixed(4)}, ${currentGps.longitude.toFixed(4)}` : (gpsError ? 'GPS Unavailable' : 'Fetching GPS...')}
                  </span>
                  <span>•</span>
                  <span>Role: {userSession.role}</span>
                </div>
              </div>
            </div>

            {/* Punch Action Buttons */}
            <div className="flex items-center gap-3 w-full md:w-auto justify-end">
              {!myTodayRecord ? (
                <button
                  onClick={handleSelfPunchIn}
                  disabled={isLoading}
                  className="w-full md:w-auto px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2 transition disabled:opacity-50"
                >
                  <CheckCircle2 className="w-5 h-5" />
                  <span>CHECK IN NOW</span>
                </button>
              ) : !myTodayRecord.checkOutTime ? (
                <button
                  onClick={handleSelfPunchOut}
                  disabled={isLoading}
                  className="w-full md:w-auto px-6 py-3 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-lg shadow-rose-600/25 flex items-center justify-center gap-2 transition disabled:opacity-50"
                >
                  <XCircle className="w-5 h-5" />
                  <span>CHECK OUT NOW</span>
                </button>
              ) : (
                <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span>Completed today's shift ({new Date(myTodayRecord.checkInTime!).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - {new Date(myTodayRecord.checkOutTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})})</span>
                </div>
              )}
            </div>
          </div>

          {/* KPI Rollup Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className={`p-4 rounded-2xl border ${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'} shadow-sm`}>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Total Present Today</p>
              {isLoading ? (
                <div className="h-7 w-12 bg-slate-200 dark:bg-slate-800 animate-pulse rounded mt-1.5" />
              ) : (
                <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{totalPresentToday}</p>
              )}
            </div>

            <div className={`p-4 rounded-2xl border ${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'} shadow-sm`}>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Late Arrivals</p>
              {isLoading ? (
                <div className="h-7 w-12 bg-slate-200 dark:bg-slate-800 animate-pulse rounded mt-1.5" />
              ) : (
                <p className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">{totalLateToday}</p>
              )}
            </div>

            <div className={`p-4 rounded-2xl border ${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'} shadow-sm`}>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Early Departures</p>
              {isLoading ? (
                <div className="h-7 w-12 bg-slate-200 dark:bg-slate-800 animate-pulse rounded mt-1.5" />
              ) : (
                <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1">{totalEarlyToday}</p>
              )}
            </div>

            <div className={`p-4 rounded-2xl border ${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'} shadow-sm`}>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Absent / Off</p>
              {isLoading ? (
                <div className="h-7 w-12 bg-slate-200 dark:bg-slate-800 animate-pulse rounded mt-1.5" />
              ) : (
                <p className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">{totalAbsentToday}</p>
              )}
            </div>

            <div className={`p-4 rounded-2xl border ${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'} shadow-sm col-span-2 md:col-span-1`}>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Pending Corrections</p>
              {isLoading ? (
                <div className="h-7 w-12 bg-slate-200 dark:bg-slate-800 animate-pulse rounded mt-1.5" />
              ) : (
                <p className="text-2xl font-black text-purple-600 dark:text-purple-400 mt-1">{pendingCorrectionsCount}</p>
              )}
            </div>
          </div>

          {/* Filter Toolbar */}
          <div className={`p-4 rounded-2xl border ${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'} shadow-sm space-y-3`}>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
              {/* Search */}
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search Employee / ID..."
                  className={`w-full pl-9 pr-3 py-2 rounded-xl text-xs border ${
                    isDark ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                />
              </div>

              {/* Date Filter */}
              <div>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={e => setSelectedDate(e.target.value)}
                  className={`w-full px-3 py-2 rounded-xl text-xs border ${
                    isDark ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                />
              </div>

              {/* Site Filter */}
              <div>
                <select
                  value={selectedSiteId}
                  onChange={e => setSelectedSiteId(e.target.value)}
                  className={`w-full px-3 py-2 rounded-xl text-xs border ${
                    isDark ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                >
                  <option value="ALL">All Sites</option>
                  {sites.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              {/* Shift Filter */}
              <div>
                <select
                  value={selectedShiftId}
                  onChange={e => setSelectedShiftId(e.target.value)}
                  className={`w-full px-3 py-2 rounded-xl text-xs border ${
                    isDark ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                >
                  <option value="ALL">All Shifts</option>
                  {shifts.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.startTime}-{s.endTime})</option>
                  ))}
                </select>
              </div>

              {/* Status Filter */}
              <div>
                <select
                  value={selectedStatus}
                  onChange={e => setSelectedStatus(e.target.value)}
                  className={`w-full px-3 py-2 rounded-xl text-xs border ${
                    isDark ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                >
                  <option value="ALL">All Statuses</option>
                  <option value="PRESENT">PRESENT</option>
                  <option value="LATE">LATE</option>
                  <option value="ABSENT">ABSENT</option>
                  <option value="HALF_DAY">HALF_DAY</option>
                  <option value="ON_LEAVE">ON_LEAVE</option>
                </select>
              </div>
            </div>
          </div>

          {/* Attendance Records Table */}
          <div className={`rounded-2xl border ${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'} shadow-sm overflow-hidden`}>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className={`border-b text-[10px] font-bold uppercase tracking-wider ${
                    isDark ? 'border-slate-800 bg-slate-950/60 text-slate-400' : 'border-slate-200 bg-slate-50 text-slate-500'
                  }`}>
                    <th className="py-3 px-4">Employee</th>
                    <th className="py-3 px-4">Date & Site</th>
                    <th className="py-3 px-4">Shift Details</th>
                    <th className="py-3 px-4">Check-In</th>
                    <th className="py-3 px-4">Check-Out</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-xs">
                  {isLoading ? (
                    <>
                      <TableRowSkeleton />
                      <TableRowSkeleton />
                      <TableRowSkeleton />
                      <TableRowSkeleton />
                      <TableRowSkeleton />
                    </>
                  ) : filteredLogs.length > 0 ? (
                    paginatedLogs.map(log => (
                      <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                        <td className="py-3 px-4">
                          <p className="font-bold text-slate-900 dark:text-slate-100">{log.employeeName}</p>
                          <p className="text-[10px] text-indigo-500 font-mono font-semibold">{log.employeeId}</p>
                        </td>

                        <td className="py-3 px-4">
                          <p className="font-medium text-slate-700 dark:text-slate-300">{log.date}</p>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-emerald-500" />
                            {log.siteName || log.siteId}
                          </p>
                        </td>

                        <td className="py-3 px-4">
                          <p className="font-medium text-slate-700 dark:text-slate-300">{log.shiftName || log.shiftId}</p>
                          <p className="text-[10px] text-slate-400">Method: {log.checkInMethod}</p>
                        </td>

                        <td className="py-3 px-4 font-mono">
                          {log.checkInTime ? (
                            <div>
                              <p className="font-semibold text-slate-900 dark:text-slate-100">
                                {new Date(log.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </p>
                              {!!log.lateArrivalMinutes && log.lateArrivalMinutes > 0 && (
                                <span className="text-[10px] font-bold text-amber-500">Late: +{log.lateArrivalMinutes}m</span>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">--:--</span>
                          )}
                        </td>

                        <td className="py-3 px-4 font-mono">
                          {log.checkOutTime ? (
                            <div>
                              <p className="font-semibold text-slate-900 dark:text-slate-100">
                                {new Date(log.checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </p>
                              {!!log.earlyDepartureMinutes && log.earlyDepartureMinutes > 0 && (
                                <span className="text-[10px] font-bold text-rose-500">Early: -{log.earlyDepartureMinutes}m</span>
                              )}
                              {!!log.overtimeMinutes && log.overtimeMinutes > 0 && (
                                <span className="text-[10px] font-bold text-emerald-500">OT: +{log.overtimeMinutes}m</span>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">--:--</span>
                          )}
                        </td>

                        <td className="py-3 px-4">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase inline-block ${
                            log.status === 'PRESENT' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' :
                            log.status === 'LATE' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' :
                            log.status === 'ABSENT' ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300' :
                            'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300'
                          }`}>
                            {log.status}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => {
                              setSelectedLogForCorrection(log);
                              setIsCorrectionModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-indigo-600 dark:text-indigo-400 transition"
                            title="Request Correction"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="py-8 px-4">
                        <EmptyState
                          icon={Inbox}
                          title="No Attendance Logs Found"
                          description={
                            searchQuery || selectedSiteId !== 'ALL' || selectedShiftId !== 'ALL' || selectedStatus !== 'ALL'
                              ? "No attendance records match your active filters or search parameters."
                              : "No attendance punches recorded for this date yet."
                          }
                          actionLabel={
                            searchQuery || selectedSiteId !== 'ALL' || selectedShiftId !== 'ALL' || selectedStatus !== 'ALL'
                              ? "Reset Filters"
                              : undefined
                          }
                          onAction={
                            searchQuery || selectedSiteId !== 'ALL' || selectedShiftId !== 'ALL' || selectedStatus !== 'ALL'
                              ? handleResetFilters
                              : undefined
                          }
                          isDark={isDark}
                        />
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 2: SITE MUSTER REGISTER */}
      {/* ============================================================ */}
      {activeTab === 'MUSTER' && (
        <div className="space-y-4">
          <div className={`p-4 rounded-2xl border ${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'} shadow-sm flex flex-col md:flex-row items-center justify-between gap-4`}>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Site Daily Muster Register</h3>
              <p className="text-xs text-slate-500">Supervisors and site in-charges can mark roster attendance for on-site security guards.</p>
            </div>

            <button
              onClick={() => {
                setMusterForm({
                  employeeId: employees[0]?.employeeId || '',
                  siteId: sites[0]?.id || '',
                  shiftId: shifts[0]?.id || '',
                  checkInTime: '08:00',
                  checkOutTime: '16:00',
                  status: 'PRESENT'
                });
                setIsMusterModalOpen(true);
              }}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow flex items-center gap-2"
            >
              <UserCheck className="w-4 h-4" />
              <span>Record Supervisor Punch</span>
            </button>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <CardSkeleton />
              <CardSkeleton />
              <CardSkeleton />
              <CardSkeleton />
              <CardSkeleton />
              <CardSkeleton />
            </div>
          ) : employees.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {employees.map(emp => {
                const empLog = attendanceLogs.find(l => l.employeeId === emp.employeeId && l.date === selectedDate);
                const shift = shifts.find(s => s.id === emp.assignedShiftId);

                return (
                  <div key={emp.id} className={`p-4 rounded-2xl border ${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'} shadow-sm space-y-3`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">{emp.firstName} {emp.lastName}</h4>
                        <p className="text-[10px] text-indigo-500 font-mono font-semibold">{emp.employeeId}</p>
                      </div>

                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        empLog?.status === 'PRESENT' ? 'bg-emerald-100 text-emerald-800' :
                        empLog?.status === 'LATE' ? 'bg-amber-100 text-amber-800' :
                        'bg-slate-100 text-slate-600'
                      }`}>
                        {empLog?.status || 'NOT PUNCHED'}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-500 dark:text-slate-400 space-y-1 border-t border-slate-100 dark:border-slate-800 pt-2">
                      <p>Shift: <span className="font-semibold text-slate-700 dark:text-slate-200">{shift?.name || 'Default Shift'}</span></p>
                      <p>In: {empLog?.checkInTime ? new Date(empLog.checkInTime).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : '--:--'}</p>
                      <p>Out: {empLog?.checkOutTime ? new Date(empLog.checkOutTime).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : '--:--'}</p>
                    </div>

                    <button
                      onClick={() => {
                        setMusterForm({
                          employeeId: emp.employeeId || emp.id,
                          siteId: emp.assignedSiteId || sites[0]?.id || '',
                          shiftId: emp.assignedShiftId || shifts[0]?.id || '',
                          checkInTime: '08:00',
                          checkOutTime: '16:00',
                          status: 'PRESENT'
                        });
                        setIsMusterModalOpen(true);
                      }}
                      className="w-full py-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 text-indigo-600 dark:text-indigo-400 text-xs font-semibold transition"
                    >
                      Quick Muster Entry
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyState
              icon={UserX}
              title="No Employees Available for Muster"
              description="There are currently no security guards or staff enrolled in your company directory to mark muster attendance."
              isDark={isDark}
            />
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 3: CORRECTIONS QUEUE */}
      {/* ============================================================ */}
      {activeTab === 'APPROVALS' && canApproveCorrections && (
        <div className="space-y-4">
          <div className={`p-4 rounded-2xl border ${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'} shadow-sm`}>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Attendance Correction Requests</h3>
            <p className="text-xs text-slate-500">Review and approve employee miss-punch or attendance correction applications.</p>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              <RequestSkeleton />
              <RequestSkeleton />
              <RequestSkeleton />
            </div>
          ) : attendanceLogs.filter(l => l.correctionRequested && l.correctionStatus === 'PENDING').length > 0 ? (
            <div className="space-y-3">
              {attendanceLogs.filter(l => l.correctionRequested && l.correctionStatus === 'PENDING').map(req => (
                <div key={req.id} className={`p-4 rounded-2xl border ${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'} shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4`}>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 dark:text-slate-100 text-xs">{req.employeeName}</span>
                      <span className="text-[10px] font-mono text-indigo-500">{req.employeeId}</span>
                      <span className="text-[10px] text-slate-400">• {req.date}</span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 italic">
                      Note: "{req.correctionNote || 'No explanation provided'}"
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleApproveCorrection(req, true)}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow"
                    >
                      Approve
                    </button>

                    <button
                      onClick={() => handleApproveCorrection(req, false)}
                      className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={ShieldCheck}
              title="No Pending Correction Requests"
              description="All attendance correction requests and miss-punch applications have been processed and reviewed."
              isDark={isDark}
            />
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 4: SHIFTS MANAGEMENT */}
      {/* ============================================================ */}
      {activeTab === 'SHIFTS' && (
        <div className="space-y-4">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <CardSkeleton />
              <CardSkeleton />
              <CardSkeleton />
            </div>
          ) : shifts.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {shifts.map(shift => (
                <div key={shift.id} className={`p-5 rounded-3xl border shadow-sm ${isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'} space-y-4`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-500 font-mono">{shift.code}</span>
                      <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">{shift.name}</h3>
                    </div>

                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                      shift.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                    }`}>
                      {shift.status}
                    </span>
                  </div>

                  <div className="space-y-2 text-xs border-t border-slate-100 dark:border-slate-800 pt-3">
                    <div className="flex justify-between text-slate-600 dark:text-slate-300">
                      <span>Shift Timings:</span>
                      <span className="font-bold text-slate-900 dark:text-slate-100 font-mono">{shift.startTime} - {shift.endTime}</span>
                    </div>

                    <div className="flex justify-between text-slate-600 dark:text-slate-300">
                      <span>Grace Period:</span>
                      <span className="font-semibold text-amber-600 dark:text-amber-400">{shift.gracePeriodMinutes} Minutes</span>
                    </div>

                    <div className="flex justify-between text-slate-600 dark:text-slate-300">
                      <span>Break Duration:</span>
                      <span className="font-semibold">{shift.breakDurationMinutes} Minutes</span>
                    </div>
                  </div>

                  {canManageShifts && (
                    <div className="flex items-center gap-2 border-t border-slate-100 dark:border-slate-800 pt-3">
                      <button
                        onClick={() => handleOpenShiftModal(shift)}
                        className="flex-1 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold transition flex items-center justify-center gap-1"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </button>

                      <button
                        onClick={() => handleToggleShiftStatus(shift)}
                        className={`px-3 py-2 rounded-xl text-xs font-semibold transition ${
                          shift.status === 'ACTIVE'
                            ? 'bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300'
                            : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300'
                        }`}
                      >
                        {shift.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Layers}
              title="No Shift Roster Configured"
              description="No custom shift schedules have been created for your company yet. Create a shift to start managing rosters."
              actionLabel={canManageShifts ? "Create Shift Schedule" : undefined}
              onAction={canManageShifts ? () => handleOpenShiftModal() : undefined}
              isDark={isDark}
            />
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: CREATE / EDIT SHIFT */}
      {/* ============================================================ */}
      {isShiftModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className={`w-full max-w-md rounded-3xl p-6 shadow-2xl border ${isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'}`}>
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-base font-bold">{editingShift ? 'Edit Shift Configuration' : 'Create New Shift'}</h3>
              <button onClick={() => setIsShiftModalOpen(false)} className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveShift} className="space-y-4 mt-4">
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500">Shift Name *</label>
                <input
                  type="text"
                  required
                  value={shiftForm.name}
                  onChange={e => setShiftForm({ ...shiftForm, name: e.target.value })}
                  placeholder="e.g., Morning Shift A"
                  className={`w-full px-3 py-2 rounded-xl text-xs border mt-1 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500">Shift Code *</label>
                  <input
                    type="text"
                    required
                    value={shiftForm.code}
                    onChange={e => setShiftForm({ ...shiftForm, code: e.target.value })}
                    placeholder="MS-01"
                    className={`w-full px-3 py-2 rounded-xl text-xs border mt-1 font-mono uppercase ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500">Site Assignment</label>
                  <select
                    value={shiftForm.siteId}
                    onChange={e => setShiftForm({ ...shiftForm, siteId: e.target.value })}
                    className={`w-full px-3 py-2 rounded-xl text-xs border mt-1 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}
                  >
                    <option value="">All Company Sites</option>
                    {sites.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500">Start Time *</label>
                  <input
                    type="time"
                    required
                    value={shiftForm.startTime}
                    onChange={e => setShiftForm({ ...shiftForm, startTime: e.target.value })}
                    className={`w-full px-3 py-2 rounded-xl text-xs border mt-1 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500">End Time *</label>
                  <input
                    type="time"
                    required
                    value={shiftForm.endTime}
                    onChange={e => setShiftForm({ ...shiftForm, endTime: e.target.value })}
                    className={`w-full px-3 py-2 rounded-xl text-xs border mt-1 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500">Grace Period (Mins)</label>
                  <input
                    type="number"
                    min={0}
                    max={120}
                    value={shiftForm.gracePeriodMinutes}
                    onChange={e => setShiftForm({ ...shiftForm, gracePeriodMinutes: Number(e.target.value) })}
                    className={`w-full px-3 py-2 rounded-xl text-xs border mt-1 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500">Break Duration (Mins)</label>
                  <input
                    type="number"
                    min={0}
                    max={240}
                    value={shiftForm.breakDurationMinutes}
                    onChange={e => setShiftForm({ ...shiftForm, breakDurationMinutes: Number(e.target.value) })}
                    className={`w-full px-3 py-2 rounded-xl text-xs border mt-1 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}
                  />
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsShiftModalOpen(false)}
                  className="px-4 py-2 rounded-xl border text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow"
                >
                  Save Shift
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: CORRECTION REQUEST */}
      {/* ============================================================ */}
      {isCorrectionModalOpen && selectedLogForCorrection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className={`w-full max-w-md rounded-3xl p-6 shadow-2xl border ${isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'}`}>
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-base font-bold">Attendance Correction Application</h3>
              <button onClick={() => setIsCorrectionModalOpen(false)} className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRequestCorrection} className="space-y-4 mt-4">
              <div className="p-3 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border text-xs space-y-1">
                <p>Employee: <span className="font-bold">{selectedLogForCorrection.employeeName} ({selectedLogForCorrection.employeeId})</span></p>
                <p>Date: <span className="font-mono">{selectedLogForCorrection.date}</span></p>
                <p>Current Status: <span className="font-semibold text-indigo-600">{selectedLogForCorrection.status}</span></p>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500">Reason / Correction Details *</label>
                <textarea
                  required
                  rows={3}
                  value={correctionNote}
                  onChange={e => setCorrectionNote(e.target.value)}
                  placeholder="Explain why correction is requested (e.g., GPS network error, approved manual site check)..."
                  className={`w-full px-3 py-2 rounded-xl text-xs border mt-1 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCorrectionModalOpen(false)}
                  className="px-4 py-2 rounded-xl border text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow"
                >
                  Submit Application
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: MUSTER / MANUAL PUNCH */}
      {/* ============================================================ */}
      {isMusterModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className={`w-full max-w-md rounded-3xl p-6 shadow-2xl border ${isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'}`}>
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-base font-bold">Supervisor Muster Punch</h3>
              <button onClick={() => setIsMusterModalOpen(false)} className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveMusterPunch} className="space-y-4 mt-4">
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500">Employee *</label>
                <select
                  required
                  value={musterForm.employeeId}
                  onChange={e => setMusterForm({ ...musterForm, employeeId: e.target.value })}
                  className={`w-full px-3 py-2 rounded-xl text-xs border mt-1 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}
                >
                  {employees.map(e => (
                    <option key={e.id} value={e.employeeId}>{e.firstName} {e.lastName} ({e.employeeId})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500">Site *</label>
                  <select
                    required
                    value={musterForm.siteId}
                    onChange={e => setMusterForm({ ...musterForm, siteId: e.target.value })}
                    className={`w-full px-3 py-2 rounded-xl text-xs border mt-1 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}
                  >
                    {sites.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500">Shift *</label>
                  <select
                    required
                    value={musterForm.shiftId}
                    onChange={e => setMusterForm({ ...musterForm, shiftId: e.target.value })}
                    className={`w-full px-3 py-2 rounded-xl text-xs border mt-1 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}
                  >
                    {shifts.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500">Check In Time</label>
                  <input
                    type="time"
                    value={musterForm.checkInTime}
                    onChange={e => setMusterForm({ ...musterForm, checkInTime: e.target.value })}
                    className={`w-full px-3 py-2 rounded-xl text-xs border mt-1 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500">Check Out Time</label>
                  <input
                    type="time"
                    value={musterForm.checkOutTime}
                    onChange={e => setMusterForm({ ...musterForm, checkOutTime: e.target.value })}
                    className={`w-full px-3 py-2 rounded-xl text-xs border mt-1 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500">Status *</label>
                <select
                  value={musterForm.status}
                  onChange={e => setMusterForm({ ...musterForm, status: e.target.value as any })}
                  className={`w-full px-3 py-2 rounded-xl text-xs border mt-1 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}
                >
                  <option value="PRESENT">PRESENT</option>
                  <option value="LATE">LATE</option>
                  <option value="ABSENT">ABSENT</option>
                  <option value="HALF_DAY">HALF_DAY</option>
                  <option value="ON_LEAVE">ON_LEAVE</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsMusterModalOpen(false)}
                  className="px-4 py-2 rounded-xl border text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow"
                >
                  Save Muster Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
