import {
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  deleteDoc,
  onSnapshot, 
  query, 
  where, 
  orderBy, 
  limit 
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import { 
  AppNotification, 
  UserProfileData, 
  AppSettings, 
  UserSession, 
  EmployeeRecord, 
  CompanyTenant, 
  BranchRecord, 
  SiteRecord, 
  DepartmentRecord, 
  DesignationRecord, 
  UserMembershipRecord, 
  UserRole,
  ShiftRecord,
  AttendanceLogRecord,
  PatrolCheckpointRecord,
  PatrolLogRecord,
  IncidentReportRecord,
  VisitorLogRecord,
  MaterialMovementRecord,
  DailySiteLogRecord,
  ApprovalRequestRecord,
  AuditLogRecord,
  SystemConfigRecord,
  AccountStatus,
  ApprovalStatus,
  MASTER_APP_MODULES,
  VendorRecord,
  LeaveRequestRecord,
  LeaveBalanceRecord,
  SalaryStructureRecord,
  EmployeeSalaryProfileRecord,
  SalaryAdvanceRecord,
  PayrollCycleRecord,
  SalarySlipRecord,
  InventoryItemRecord,
  StockTransactionRecord,
  InventoryVendorRecord,
  AssetRecord,
  AssetMovementHistoryRecord,
  AssetMaintenanceRecord,
  AssetCondition,
  AssetMovementAction
} from '../types';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

/**
 * Handles Firestore permissions and data exceptions according to Enterprise standard.
 */
function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const isOfflineError = errorMessage.toLowerCase().includes('offline') || 
                         errorMessage.toLowerCase().includes('unavailable') ||
                         (error as any)?.code === 'unavailable';

  const errInfo: FirestoreErrorInfo = {
    error: errorMessage,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };

  if (isOfflineError) {
    console.warn('[Firestore Offline Warning]: Operation queued or skipped offline:', JSON.stringify(errInfo));
    return;
  }

  console.error('[Firestore Service Error]:', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export class FirestoreService {
  /**
   * ============================================================
   * VENDOR MANAGEMENT
   * ============================================================
   */

  static async getVendors(companyId: string): Promise<VendorRecord[]> {
    try {
      const colRef = collection(db, 'companies', companyId, 'vendors');
      const q = query(colRef, orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      return snap.docs.map(d => d.data() as VendorRecord);
    } catch (err) {
      console.warn('[FirestoreService] getVendors error:', err);
      return [];
    }
  }

  static async saveVendor(companyId: string, vendor: VendorRecord): Promise<boolean> {
    try {
      const docRef = doc(db, 'companies', companyId, 'vendors', vendor.id);
      await setDoc(docRef, vendor, { merge: true });
      return true;
    } catch (err) {
      console.error('[FirestoreService] saveVendor error:', err);
      return false;
    }
  }

  static async deleteVendor(companyId: string, vendorId: string): Promise<boolean> {
    try {
      const docRef = doc(db, 'companies', companyId, 'vendors', vendorId);
      await deleteDoc(docRef);
      return true;
    } catch (err) {
      console.error('[FirestoreService] deleteVendor error:', err);
      return false;
    }
  }

  /**
   * Listen to real-time Employees list for a company
   */
  
  static subscribeToEmployees(session: UserSession, companyId: string, onData: (employees: EmployeeRecord[]) => void
  ): () => void {
    const path = `companies/${companyId}/employees`;
    try {
      const colRef = collection(db, 'companies', companyId, 'employees');
      const unsubscribe = onSnapshot(colRef, (snapshot) => {
        if (!snapshot.empty) {
          const list: EmployeeRecord[] = snapshot.docs.map(docSnap => {
            const data = docSnap.data();
            return {
              id: docSnap.id,
              documents: [],
              ...data
            } as unknown as EmployeeRecord;
          });
          onData(list);
        } else {
          // If subcollection is empty, check global users collection for this company
          const legacyRef = collection(db, 'users');
          const legacyQuery = query(legacyRef, where('companyId', '==', companyId));
          getDocs(legacyQuery).then((legacySnap) => {
            if (!legacySnap.empty) {
              const legacyList = legacySnap.docs.map(snap => ({
                id: snap.id,
                documents: [],
                ...snap.data()
              } as unknown as EmployeeRecord));
              onData(legacyList);
            } else {
              onData([]);
            }
          }).catch(() => {
            onData([]);
          });
        }
      }, (err) => {
        console.warn('[Firestore] Employee subscription error:', err);
        // Fallback check to users query
        const legacyRef = collection(db, 'users');
        const legacyQuery = query(legacyRef, where('companyId', '==', companyId));
        getDocs(legacyQuery).then((legacySnap) => {
          if (!legacySnap.empty) {
            const legacyList = legacySnap.docs.map(snap => ({
              id: snap.id,
              documents: [],
              ...snap.data()
            } as unknown as EmployeeRecord));
            onData(legacyList);
          } else {
            onData([]);
          }
        }).catch(() => {
          onData([]);
        });
      });
      return unsubscribe;
    } catch (e) {
      console.warn('[Firestore] Employee subscription exception:', e);
      onData([]);
      return () => {};
    }
  }

  static async getEmployees(companyId: string): Promise<EmployeeRecord[]> {
    try {
      const colRef = collection(db, 'companies', companyId, 'employees');
      const snap = await getDocs(colRef);
      if (!snap.empty) {
        return snap.docs.map(docSnap => ({
          id: docSnap.id,
          documents: [],
          ...docSnap.data()
        } as unknown as EmployeeRecord));
      }
      const legacyRef = collection(db, 'users');
      const legacyQuery = query(legacyRef, where('companyId', '==', companyId));
      const legacySnap = await getDocs(legacyQuery);
      return legacySnap.docs.map(snap => ({
        id: snap.id,
        documents: [],
        ...snap.data()
      } as unknown as EmployeeRecord));
    } catch (err) {
      console.warn('[FirestoreService] getEmployees error:', err);
      return [];
    }
  }

  static async createApprovalRequest(companyId: string, request: {
    type: string;
    requestedByUid: string;
    targetEntity: string;
    details: string;
  }): Promise<boolean> {
    try {
      const id = `REQ_${Date.now()}_${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      const docRef = doc(db, 'companies', companyId, 'approval_requests', id);
      await setDoc(docRef, {
        id,
        companyId,
        ...request,
        status: 'PENDING',
        createdAt: new Date().toISOString()
      }, { merge: true });
      return true;
    } catch (err) {
      console.error('[FirestoreService] createApprovalRequest error:', err);
      return false;
    }
  }

  /**
   * Create or update Employee document in Firestore (Dual-writing for 100% sync)
   */
  static async saveEmployee(companyId: string, employee: EmployeeRecord): Promise<boolean> {
    const legacyPath = `users/${employee.id}`;
    const newPath = `companies/${companyId}/employees/${employee.id}`;
    try {
      const payload = {
        ...employee,
        companyId, // ensure companyId matches
        updatedAt: new Date().toISOString()
      };

      // 1. Write to modern subcollection (Android & Web app alignment)
      const refNew = doc(db, 'companies', companyId, 'employees', employee.id);
      await setDoc(refNew, payload, { merge: true });

      // 2. Write to legacy root 'users' collection (Web login support)
      const refLegacy = doc(db, 'users', employee.id);
      await setDoc(refLegacy, payload, { merge: true });

      return true;
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `${newPath} & ${legacyPath}`);
      return false;
    }
  }

  /**
   * Approve or update Employee status (Active / Suspended / Terminated)
   */
  static async updateEmployeeStatus(
    companyId: string,
    employeeId: string,
    status: EmployeeRecord['status'],
    approverId: string
  ): Promise<boolean> {
    const legacyPath = `users/${employeeId}`;
    const newPath = `companies/${companyId}/employees/${employeeId}`;
    try {
      const payload = {
        status,
        updatedAt: new Date().toISOString()
      };

      const refNew = doc(db, 'companies', companyId, 'employees', employeeId);
      await setDoc(refNew, payload, { merge: true });

      const refLegacy = doc(db, 'users', employeeId);
      await setDoc(refLegacy, payload, { merge: true });

      return true;
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `${newPath} & ${legacyPath}`);
      return false;
    }
  }

  /**
   * Verify an employee KYC document
   */
  static async verifyEmployeeDocument(
    companyId: string,
    employeeId: string,
    documents: EmployeeRecord['documents'],
    approverId: string
  ): Promise<boolean> {
    const legacyPath = `users/${employeeId}`;
    const newPath = `companies/${companyId}/employees/${employeeId}`;
    try {
      const payload = {
        documents,
        updatedAt: new Date().toISOString()
      };

      const refNew = doc(db, 'companies', companyId, 'employees', employeeId);
      await setDoc(refNew, payload, { merge: true });

      const refLegacy = doc(db, 'users', employeeId);
      await setDoc(refLegacy, payload, { merge: true });

      return true;
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `${newPath} & ${legacyPath}`);
      return false;
    }
  }

  /**
   * Delete an employee record from Firestore
   */
  static async deleteEmployee(companyId: string, employeeId: string): Promise<boolean> {
    const legacyPath = `users/${employeeId}`;
    const newPath = `companies/${companyId}/employees/${employeeId}`;
    try {
      const { deleteDoc } = await import('firebase/firestore');
      const refNew = doc(db, 'companies', companyId, 'employees', employeeId);
      await deleteDoc(refNew);

      const refLegacy = doc(db, 'users', employeeId);
      await deleteDoc(refLegacy);

      return true;
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `${newPath} & ${legacyPath}`);
      return false;
    }
  }

  /**
   * Check if an employee ID exists in the company
   */
  static async checkEmployeeExists(companyId: string, employeeId: string): Promise<boolean> {
    try {
      const refNew = doc(db, 'companies', companyId, 'employees', employeeId);
      const snap = await getDoc(refNew);
      if (snap.exists()) return true;

      const refLegacy = doc(db, 'users', employeeId);
      const snapLegacy = await getDoc(refLegacy);
      return snapLegacy.exists();
    } catch (err) {
      console.warn('[Firestore] checkEmployeeExists error:', err);
      return false;
    }
  }

  /**
   * Save or sync User Profile to Firestore
   */
  static async saveUserProfile(userId: string, profile: UserProfileData): Promise<boolean> {
    const path = `users/${userId}`;
    try {
      const ref = doc(db, 'users', userId);
      await setDoc(ref, { ...profile, updatedAt: new Date().toISOString() }, { merge: true });
      return true;
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
      return false;
    }
  }

  /**
   * Fetch User Profile from Firestore
   */
  static async getUserProfile(userId: string): Promise<UserProfileData | null> {
    const path = `users/${userId}`;
    try {
      const ref = doc(db, 'users', userId);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        return snap.data() as UserProfileData;
      }
    } catch (err) {
      console.warn('[Firestore] getUserProfile error:', err);
    }
    return null;
  }

  /**
   * Save or sync App Settings to Firestore
   */
  static async saveAppSettings(userId: string, settings: AppSettings): Promise<boolean> {
    const path = `users/${userId}`;
    try {
      const ref = doc(db, 'users', userId);
      await setDoc(ref, { ...settings, updatedAt: new Date().toISOString() }, { merge: true });
      return true;
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
      return false;
    }
  }

  /**
   * Fetch App Settings from Firestore
   */
  static async getAppSettings(userId: string): Promise<AppSettings | null> {
    const path = `users/${userId}`;
    try {
      const ref = doc(db, 'users', userId);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        return snap.data() as AppSettings;
      }
    } catch (err) {
      console.warn('[Firestore] getAppSettings error:', err);
    }
    return null;
  }

  /**
   * ============================================================
   * SHIFTS MANAGEMENT METHODS
   * ============================================================
   */
  static subscribeToShifts(session: UserSession, companyId: string, onData: (shifts: ShiftRecord[]) => void
  ): () => void {
    try {
      const colRef = collection(db, 'companies', companyId, 'shifts');
      return onSnapshot(colRef, (snap) => {
        const shifts = snap.docs.map(d => ({ id: d.id, ...d.data() } as ShiftRecord));
        onData(shifts);
      }, (err) => {
        console.warn('[Firestore] subscribeToShifts error:', err);
        onData([]);
      });
    } catch (e) {
      console.warn('[Firestore] subscribeToShifts exception:', e);
      onData([]);
      return () => {};
    }
  }

  static async getShifts(companyId: string): Promise<ShiftRecord[]> {
    try {
      const colRef = collection(db, 'companies', companyId, 'shifts');
      const snap = await getDocs(colRef);
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as ShiftRecord));
    } catch (err) {
      console.warn('[Firestore] getShifts error:', err);
      return [];
    }
  }

  static async saveShift(companyId: string, shift: ShiftRecord): Promise<boolean> {
    const path = `companies/${companyId}/shifts/${shift.id}`;
    try {
      const ref = doc(db, 'companies', companyId, 'shifts', shift.id);
      await setDoc(ref, {
        ...shift,
        companyId,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      return true;
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
      return false;
    }
  }

  static async updateShiftStatus(companyId: string, shiftId: string, status: 'ACTIVE' | 'INACTIVE'): Promise<boolean> {
    const path = `companies/${companyId}/shifts/${shiftId}`;
    try {
      const ref = doc(db, 'companies', companyId, 'shifts', shiftId);
      await setDoc(ref, { status, updatedAt: new Date().toISOString() }, { merge: true });
      return true;
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, path);
      return false;
    }
  }

  static async deleteShift(companyId: string, shiftId: string): Promise<boolean> {
    const path = `companies/${companyId}/shifts/${shiftId}`;
    try {
      const ref = doc(db, 'companies', companyId, 'shifts', shiftId);
      await deleteDoc(ref);
      return true;
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, path);
      return false;
    }
  }

  static async checkDuplicateShiftCode(companyId: string, code: string, excludeId?: string): Promise<boolean> {
    try {
      const colRef = collection(db, 'companies', companyId, 'shifts');
      const q = query(colRef, where('code', '==', code.trim().toUpperCase()));
      const snap = await getDocs(q);
      if (snap.empty) return false;
      return snap.docs.some(d => d.id !== excludeId);
    } catch (err) {
      console.warn('[Firestore] checkDuplicateShiftCode error:', err);
      return false;
    }
  }

  /**
   * ============================================================
   * ATTENDANCE & PUNCH MANAGEMENT METHODS
   * ============================================================
   */
  static subscribeToAttendanceLogs(session: UserSession, companyId: string, onData: (logs: AttendanceLogRecord[]) => void
  ): () => void {
    try {
      const colRef = collection(db, 'companies', companyId, 'attendance_logs');
      return onSnapshot(colRef, (snap) => {
        const logs = snap.docs.map(d => ({ id: d.id, ...d.data() } as AttendanceLogRecord));
        onData(logs);
      }, (err) => {
        console.warn('[Firestore] subscribeToAttendanceLogs error:', err);
        // Fallback check on companies/{companyId}/attendance
        const fallbackRef = collection(db, 'companies', companyId, 'attendance');
        getDocs(fallbackRef).then(snap => {
          const fallbackLogs = snap.docs.map(d => ({ id: d.id, ...d.data() } as AttendanceLogRecord));
          onData(fallbackLogs);
        }).catch(() => onData([]));
      });
    } catch (e) {
      console.warn('[Firestore] subscribeToAttendanceLogs exception:', e);
      onData([]);
      return () => {};
    }
  }

  static async getAttendanceLogsDetailed(
    companyId: string,
    filters?: { date?: string; employeeId?: string; siteId?: string; status?: string }
  ): Promise<AttendanceLogRecord[]> {
    try {
      const colRef = collection(db, 'companies', companyId, 'attendance_logs');
      const snap = await getDocs(colRef);
      let logs = snap.docs.map(d => ({ id: d.id, ...d.data() } as AttendanceLogRecord));
      
      if (logs.length === 0) {
        const fallbackRef = collection(db, 'companies', companyId, 'attendance');
        const snapFb = await getDocs(fallbackRef);
        logs = snapFb.docs.map(d => ({ id: d.id, ...d.data() } as AttendanceLogRecord));
      }

      if (filters) {
        if (filters.date) {
          logs = logs.filter(l => l.date === filters.date);
        }
        if (filters.employeeId) {
          logs = logs.filter(l => l.employeeId === filters.employeeId);
        }
        if (filters.siteId) {
          logs = logs.filter(l => l.siteId === filters.siteId);
        }
        if (filters.status) {
          logs = logs.filter(l => l.status === filters.status);
        }
      }

      return logs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } catch (err) {
      console.warn('[Firestore] getAttendanceLogsDetailed error:', err);
      return [];
    }
  }

  /**
   * Performs Check-in for an employee with duplicate check & late arrival calculations
   */
  static async checkInEmployee(
    companyId: string,
    log: Omit<AttendanceLogRecord, 'id' | 'createdAt'>,
    shift?: ShiftRecord
  ): Promise<{ success: boolean; message: string; logId?: string }> {
    const todayStr = log.date || new Date().toISOString().split('T')[0];
    const logId = `ATT-${todayStr}-${log.employeeId}`;
    const primaryPath = `companies/${companyId}/attendance_logs/${logId}`;
    
    try {
      const ref = doc(db, 'companies', companyId, 'attendance_logs', logId);

      // 1. Verify if employee already checked in today (wrapped for offline resilience)
      try {
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const existingData = snap.data() as AttendanceLogRecord;
          if (existingData.checkInTime && !existingData.checkOutTime) {
            return { success: false, message: 'Employee has already checked in today without checking out. Please check out first.' };
          }
          if (existingData.checkInTime && existingData.checkOutTime) {
            return { success: false, message: 'Employee attendance punch for today is already completed.' };
          }
        }
      } catch (getDocErr) {
        console.warn('[Firestore] Offline check-in getDoc notice:', getDocErr);
      }

      // 2. Compute Late Arrival Minutes based on Shift
      let lateMinutes = 0;
      let status: AttendanceLogRecord['status'] = log.status || 'PRESENT';

      if (shift && log.checkInTime) {
        const checkInDate = new Date(log.checkInTime);
        const [shiftHours, shiftMins] = shift.startTime.split(':').map(Number);
        const scheduledTime = new Date(checkInDate);
        scheduledTime.setHours(shiftHours, shiftMins, 0, 0);

        const graceEndTime = new Date(scheduledTime.getTime() + (shift.gracePeriodMinutes || 0) * 60 * 1000);
        
        if (checkInDate > graceEndTime) {
          lateMinutes = Math.floor((checkInDate.getTime() - scheduledTime.getTime()) / (1000 * 60));
          status = 'LATE';
        }
      }

      const payload: AttendanceLogRecord = {
        ...log,
        id: logId,
        companyId,
        date: todayStr,
        lateArrivalMinutes: lateMinutes,
        status,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await setDoc(ref, payload, { merge: true });

      // Dual write to attendance collection for backwards compatibility
      const refLegacy = doc(db, 'companies', companyId, 'attendance', logId);
      await setDoc(refLegacy, payload, { merge: true }).catch(err => 
        console.warn('[Firestore] Legacy collection write offline warning:', err)
      );

      return { success: true, message: `Check-in successful. Status: ${status}`, logId };
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, primaryPath);
      return { success: true, message: `Check-in recorded offline. Status: ${log.status || 'PRESENT'}`, logId };
    }
  }

  /**
   * Performs Check-out for an employee with early departure & overtime calculations
   */
  static async checkOutEmployee(
    companyId: string,
    attendanceId: string,
    checkOutTime: string,
    checkOutGps?: { latitude: number; longitude: number; accuracy?: number },
    shift?: ShiftRecord
  ): Promise<{ success: boolean; message: string }> {
    const primaryPath = `companies/${companyId}/attendance_logs/${attendanceId}`;
    try {
      const ref = doc(db, 'companies', companyId, 'attendance_logs', attendanceId);
      let existingData: Partial<AttendanceLogRecord> = {};

      try {
        const snap = await getDoc(ref);
        if (snap.exists()) {
          existingData = snap.data() as AttendanceLogRecord;
        } else {
          const refLegacy = doc(db, 'companies', companyId, 'attendance', attendanceId);
          const snapLegacy = await getDoc(refLegacy);
          if (snapLegacy.exists()) {
            existingData = snapLegacy.data() as AttendanceLogRecord;
          }
        }
      } catch (getDocErr) {
        console.warn('[Firestore] Offline check-out getDoc notice:', getDocErr);
      }

      let earlyDepartureMinutes = 0;
      let overtimeMinutes = 0;

      if (shift && checkOutTime) {
        const checkOutDate = new Date(checkOutTime);
        const [shiftEndH, shiftEndM] = shift.endTime.split(':').map(Number);
        const scheduledEndTime = new Date(checkOutDate);
        scheduledEndTime.setHours(shiftEndH, shiftEndM, 0, 0);

        if (checkOutDate < scheduledEndTime) {
          earlyDepartureMinutes = Math.floor((scheduledEndTime.getTime() - checkOutDate.getTime()) / (1000 * 60));
        } else if (checkOutDate > scheduledEndTime) {
          overtimeMinutes = Math.floor((checkOutDate.getTime() - scheduledEndTime.getTime()) / (1000 * 60));
        }
      }

      const updates: Partial<AttendanceLogRecord> = {
        checkOutTime,
        checkOutGps,
        earlyDepartureMinutes,
        overtimeMinutes,
        updatedAt: new Date().toISOString()
      };

      await setDoc(ref, updates, { merge: true });

      const refLegacy = doc(db, 'companies', companyId, 'attendance', attendanceId);
      await setDoc(refLegacy, updates, { merge: true }).catch(err =>
        console.warn('[Firestore] Legacy collection write offline warning:', err)
      );

      return { success: true, message: 'Check-out successful.' };
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, primaryPath);
      return { success: true, message: 'Check-out recorded offline.' };
    }
  }

  /**
   * Direct Save or Manual Attendance Correction by Supervisor/Admin
   */
  static async saveAttendanceLogDirect(companyId: string, log: AttendanceLogRecord): Promise<boolean> {
    const path = `companies/${companyId}/attendance_logs/${log.id}`;
    try {
      const ref = doc(db, 'companies', companyId, 'attendance_logs', log.id);
      await setDoc(ref, {
        ...log,
        companyId,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      const refLegacy = doc(db, 'companies', companyId, 'attendance', log.id);
      await setDoc(refLegacy, {
        ...log,
        companyId,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      return true;
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
      return false;
    }
  }

  /**
   * Request Attendance Correction (Employee/Supervisor)
   */
  static async requestAttendanceCorrection(
    companyId: string,
    attendanceId: string,
    correctionNote: string
  ): Promise<boolean> {
    const path = `companies/${companyId}/attendance_logs/${attendanceId}`;
    try {
      const updates = {
        correctionNote,
        correctionRequested: true,
        correctionStatus: 'PENDING' as const,
        updatedAt: new Date().toISOString()
      };

      const ref = doc(db, 'companies', companyId, 'attendance_logs', attendanceId);
      await setDoc(ref, updates, { merge: true });

      const refLegacy = doc(db, 'companies', companyId, 'attendance', attendanceId);
      await setDoc(refLegacy, updates, { merge: true });

      return true;
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, path);
      return false;
    }
  }

  /**
   * Approve or Reject Attendance Correction Request
   */
  static async approveOrRejectAttendanceCorrection(
    companyId: string,
    attendanceId: string,
    approved: boolean,
    approverId: string,
    updatedLog?: Partial<AttendanceLogRecord>
  ): Promise<boolean> {
    const path = `companies/${companyId}/attendance_logs/${attendanceId}`;
    try {
      const updates: Partial<AttendanceLogRecord> = {
        ...updatedLog,
        correctionStatus: approved ? 'APPROVED' : 'REJECTED',
        correctionRequested: false,
        approvedBy: approverId,
        status: approved ? (updatedLog?.status || 'PRESENT') : 'ABSENT',
        updatedAt: new Date().toISOString()
      };

      const ref = doc(db, 'companies', companyId, 'attendance_logs', attendanceId);
      await setDoc(ref, updates, { merge: true });

      const refLegacy = doc(db, 'companies', companyId, 'attendance', attendanceId);
      await setDoc(refLegacy, updates, { merge: true });

      return true;
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, path);
      return false;
    }
  }

  /**
   * Delete Attendance Log
   */
  static async deleteAttendanceLog(companyId: string, attendanceId: string): Promise<boolean> {
    const path = `companies/${companyId}/attendance_logs/${attendanceId}`;
    try {
      const ref = doc(db, 'companies', companyId, 'attendance_logs', attendanceId);
      await deleteDoc(ref);

      const refLegacy = doc(db, 'companies', companyId, 'attendance', attendanceId);
      await deleteDoc(refLegacy);

      return true;
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, path);
      return false;
    }
  }

  /**
   * Save Attendance Log to Firestore (Legacy compat)
   */
  static async logAttendance(session: UserSession, action: 'PUNCH_IN' | 'PUNCH_OUT', locationDetails?: string): Promise<boolean> {
    const collectionName = session.companyId ? `attendance_${session.companyId}` : 'attendance_DEFAULT';
    const logId = `ATT-${Date.now()}`;
    const legacyPath = `${collectionName}/${logId}`;
    const newPath = `companies/${session.companyId}/attendance/${logId}`;
    try {
      const payload = {
        logId,
        userId: session.userId,
        employeeId: session.employeeId,
        userName: session.fullName,
        role: session.role,
        action,
        timestamp: new Date().toISOString(),
        siteId: session.assignedSiteId || 'SITE-DEFAULT',
        locationDetails: locationDetails || 'GPS Verified'
      };

      const refLegacy = doc(db, collectionName, logId);
      await setDoc(refLegacy, payload);

      if (session.companyId) {
        const refNew = doc(db, 'companies', session.companyId, 'attendance', logId);
        await setDoc(refNew, payload);
      }

      return true;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `${newPath} & ${legacyPath}`);
      return false;
    }
  }

  /**
   * Fetch recent attendance logs
   */
  static async getAttendanceLogs(companyId: string, limitCount: number = 20): Promise<any[]> {
    const collectionName = companyId ? `attendance_${companyId}` : 'attendance_DEFAULT';
    try {
      const q = query(
        collection(db, collectionName),
        orderBy('timestamp', 'desc'),
        limit(limitCount)
      );
      
      const snap = await getDocs(q);
      if (!snap.empty) {
        return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      }

      const subColRef = collection(db, 'companies', companyId, 'attendance');
      const qSub = query(
        subColRef,
        orderBy('timestamp', 'desc'),
        limit(limitCount)
      );
      const snapSub = await getDocs(qSub);
      return snapSub.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (err) {
      console.warn(`[Firestore] getAttendanceLogs error for ${companyId}:`, err);
      return [];
    }
  }

  /**
   * Listen to real-time Notifications
   */
  static subscribeToNotifications(
    role: string, 
    onData: (notifications: AppNotification[]) => void
  ): () => void {
    try {
      const q = query(
        collection(db, 'notifications'),
        orderBy('timestamp', 'desc'),
        limit(20)
      );
      
      const unsubscribe = onSnapshot(q, (snapshot) => {
        if (!snapshot.empty) {
          const notifs: AppNotification[] = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          } as AppNotification));
          onData(notifs);
        } else {
          onData([]);
        }
      }, (err) => {
        console.warn('[Firestore] Notifications subscription error:', err);
        onData([]);
      });

      return unsubscribe;
    } catch (e) {
      console.warn('[Firestore] Notifications realtime failed:', e);
      onData([]);
      return () => {};
    }
  }

  /**
   * Fetch Company Tenant profile
   */
  static async getCompanyTenantDetails(companyId: string): Promise<CompanyTenant | null> {
    try {
      const ref = doc(db, 'companies', companyId);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        return snap.data() as CompanyTenant;
      }
    } catch (err) {
      console.warn('[Firestore] getCompanyTenantDetails error:', err);
    }
    return null;
  }

  /**
   * Update Company Tenant details
   */
  static async updateCompanyTenantDetails(company: CompanyTenant): Promise<boolean> {
    try {
      const ref = doc(db, 'companies', company.companyId);
      await setDoc(ref, {
        ...company,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      return true;
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `companies/${company.companyId}`);
      return false;
    }
  }

  /**
   * Branches CRUD
   */
  static async getBranches(companyId: string): Promise<BranchRecord[]> {
    try {
      const colRef = collection(db, 'companies', companyId, 'branches');
      const snap = await getDocs(colRef);
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as BranchRecord));
    } catch (err) {
      console.warn('[Firestore] getBranches error:', err);
      return [];
    }
  }

  static async saveBranch(companyId: string, branch: BranchRecord): Promise<boolean> {
    try {
      const ref = doc(db, 'companies', companyId, 'branches', branch.id);
      await setDoc(ref, {
        ...branch,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      return true;
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `companies/${companyId}/branches/${branch.id}`);
      return false;
    }
  }

  /**
   * Sites CRUD
   */
  static async getSites(companyId: string): Promise<SiteRecord[]> {
    try {
      const colRef = collection(db, 'companies', companyId, 'sites');
      const snap = await getDocs(colRef);
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as SiteRecord));
    } catch (err) {
      console.warn('[Firestore] getSites error:', err);
      return [];
    }
  }

  static async saveSite(companyId: string, site: SiteRecord): Promise<boolean> {
    try {
      const ref = doc(db, 'companies', companyId, 'sites', site.id);
      await setDoc(ref, {
        ...site,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      return true;
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `companies/${companyId}/sites/${site.id}`);
      return false;
    }
  }

  /**
   * Departments CRUD
   */
  static async getDepartments(companyId: string): Promise<DepartmentRecord[]> {
    try {
      const colRef = collection(db, 'companies', companyId, 'departments');
      const snap = await getDocs(colRef);
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as DepartmentRecord));
    } catch (err) {
      console.warn('[Firestore] getDepartments error:', err);
      return [];
    }
  }

  static async saveDepartment(companyId: string, dept: DepartmentRecord): Promise<boolean> {
    try {
      const ref = doc(db, 'companies', companyId, 'departments', dept.id);
      await setDoc(ref, {
        ...dept,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      return true;
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `companies/${companyId}/departments/${dept.id}`);
      return false;
    }
  }

  /**
   * Designations CRUD
   */
  static async getDesignations(companyId: string): Promise<DesignationRecord[]> {
    try {
      const colRef = collection(db, 'companies', companyId, 'designations');
      const snap = await getDocs(colRef);
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as DesignationRecord));
    } catch (err) {
      console.warn('[Firestore] getDesignations error:', err);
      return [];
    }
  }

  static async saveDesignation(companyId: string, desig: DesignationRecord): Promise<boolean> {
    try {
      const ref = doc(db, 'companies', companyId, 'designations', desig.id);
      await setDoc(ref, {
        ...desig,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      return true;
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `companies/${companyId}/designations/${desig.id}`);
      return false;
    }
  }

  /**
   * User Memberships & Role Assignments
   */
  static async getMemberships(companyId: string): Promise<UserMembershipRecord[]> {
    try {
      const colRef = collection(db, 'companies', companyId, 'employees');
      const snap = await getDocs(colRef);
      return snap.docs.map(d => {
        const data = d.data();
        return {
          userId: d.id,
          email: data.email || `${data.employeeId}@company.com`,
          fullName: `${data.firstName || ''} ${data.lastName || ''}`.trim() || 'Employee',
          role: (data.role as UserRole) || 'GUARD',
          companyId: companyId,
          assignedBranchId: data.assignedBranchId || 'MAIN_BRANCH',
          status: data.status === 'ACTIVE' ? 'ACTIVE' : 'SUSPENDED',
          updatedAt: data.updatedAt
        } as UserMembershipRecord;
      });
    } catch (err) {
      console.warn('[Firestore] getMemberships error:', err);
      return [];
    }
  }

  static async updateUserMembership(companyId: string, membership: UserMembershipRecord): Promise<boolean> {
    try {
      // 1. Update in company employee subcollection
      const empRef = doc(db, 'companies', companyId, 'employees', membership.userId);
      await setDoc(empRef, {
        role: membership.role,
        status: membership.status,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      // 2. Update user root document role if authorized
      const userRef = doc(db, 'users', membership.userId);
      await setDoc(userRef, {
        role: membership.role,
        companyId: companyId,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      // 3. Update membership subcollection under users/
      const memRef = doc(db, 'users', membership.userId, 'memberships', companyId);
      await setDoc(memRef, {
        companyId: companyId,
        role: membership.role,
        status: membership.status,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      return true;
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `companies/${companyId}/employees/${membership.userId}`);
      return false;
    }
  }

  /**
   * ============================================================
   * SITE OPERATIONS: PATROLS & CHECKPOINTS
   * ============================================================
   */
  static subscribeToPatrolLogs(session: UserSession, companyId: string, onData: (logs: PatrolLogRecord[]) => void
  ): () => void {
    try {
      const colRef = collection(db, 'companies', companyId, 'patrol_logs');
      return onSnapshot(colRef, (snap) => {
        const logs = snap.docs.map(d => ({ id: d.id, ...d.data() } as PatrolLogRecord));
        onData(logs);
      }, (err) => {
        console.warn('[Firestore] subscribeToPatrolLogs error:', err);
        onData([]);
      });
    } catch (e) {
      console.warn('[Firestore] subscribeToPatrolLogs exception:', e);
      onData([]);
      return () => {};
    }
  }

  static async getPatrolCheckpoints(companyId: string, siteId?: string): Promise<PatrolCheckpointRecord[]> {
    try {
      const colRef = collection(db, 'companies', companyId, 'patrol_checkpoints');
      const snap = await getDocs(colRef);
      let list = snap.docs.map(d => ({ id: d.id, ...d.data() } as PatrolCheckpointRecord));
      if (siteId && siteId !== 'ALL') {
        list = list.filter(c => c.siteId === siteId);
      }
      return list.sort((a, b) => a.sequenceOrder - b.sequenceOrder);
    } catch (err) {
      console.warn('[Firestore] getPatrolCheckpoints error:', err);
      return [];
    }
  }

  static async savePatrolCheckpoint(companyId: string, checkpoint: PatrolCheckpointRecord): Promise<boolean> {
    const path = `companies/${companyId}/patrol_checkpoints/${checkpoint.id}`;
    try {
      const ref = doc(db, 'companies', companyId, 'patrol_checkpoints', checkpoint.id);
      await setDoc(ref, {
        ...checkpoint,
        companyId,
        createdAt: checkpoint.createdAt || new Date().toISOString()
      }, { merge: true });
      return true;
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
      return false;
    }
  }

  static async savePatrolLog(companyId: string, log: PatrolLogRecord): Promise<boolean> {
    const path = `companies/${companyId}/patrol_logs/${log.id}`;
    try {
      const ref = doc(db, 'companies', companyId, 'patrol_logs', log.id);
      await setDoc(ref, {
        ...log,
        companyId,
        createdAt: log.createdAt || new Date().toISOString()
      }, { merge: true });
      return true;
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
      return false;
    }
  }

  /**
   * ============================================================
   * SITE OPERATIONS: INCIDENT REPORTS
   * ============================================================
   */
  static subscribeToIncidentReports(session: UserSession, companyId: string, onData: (reports: IncidentReportRecord[]) => void
  ): () => void {
    try {
      const colRef = collection(db, 'companies', companyId, 'incident_reports');
      return onSnapshot(colRef, (snap) => {
        const reports = snap.docs.map(d => ({ id: d.id, ...d.data() } as IncidentReportRecord));
        onData(reports);
      }, (err) => {
        console.warn('[Firestore] subscribeToIncidentReports error:', err);
        onData([]);
      });
    } catch (e) {
      console.warn('[Firestore] subscribeToIncidentReports exception:', e);
      onData([]);
      return () => {};
    }
  }

  static async saveIncidentReport(companyId: string, report: IncidentReportRecord): Promise<boolean> {
    const path = `companies/${companyId}/incident_reports/${report.id}`;
    try {
      const ref = doc(db, 'companies', companyId, 'incident_reports', report.id);
      await setDoc(ref, {
        ...report,
        companyId,
        reportedAt: report.reportedAt || new Date().toISOString()
      }, { merge: true });
      return true;
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
      return false;
    }
  }

  static async updateIncidentStatus(
    companyId: string, 
    reportId: string, 
    status: IncidentReportRecord['status'], 
    resolutionNotes?: string,
    resolverId?: string,
    resolverName?: string
  ): Promise<boolean> {
    const path = `companies/${companyId}/incident_reports/${reportId}`;
    try {
      const ref = doc(db, 'companies', companyId, 'incident_reports', reportId);
      const updates: Partial<IncidentReportRecord> = {
        status,
        resolutionNotes,
        resolvedById: resolverId,
        resolvedByName: resolverName,
        resolvedAt: status === 'RESOLVED' || status === 'CLOSED' ? new Date().toISOString() : undefined
      };
      await setDoc(ref, updates, { merge: true });
      return true;
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, path);
      return false;
    }
  }

  /**
   * ============================================================
   * SITE OPERATIONS: VISITOR LOG REGISTER
   * ============================================================
   */
  static subscribeToVisitorLogs(session: UserSession, companyId: string, onData: (visitors: VisitorLogRecord[]) => void
  ): () => void {
    try {
      const colRef = collection(db, 'companies', companyId, 'visitor_logs');
      return onSnapshot(colRef, (snap) => {
        const visitors = snap.docs.map(d => ({ id: d.id, ...d.data() } as VisitorLogRecord));
        onData(visitors);
      }, (err) => {
        console.warn('[Firestore] subscribeToVisitorLogs error:', err);
        onData([]);
      });
    } catch (e) {
      console.warn('[Firestore] subscribeToVisitorLogs exception:', e);
      onData([]);
      return () => {};
    }
  }

  static async checkInVisitor(companyId: string, visitor: VisitorLogRecord): Promise<boolean> {
    const path = `companies/${companyId}/visitor_logs/${visitor.id}`;
    try {
      const ref = doc(db, 'companies', companyId, 'visitor_logs', visitor.id);
      await setDoc(ref, {
        ...visitor,
        companyId,
        status: 'IN_SITE',
        createdAt: visitor.createdAt || new Date().toISOString()
      }, { merge: true });
      return true;
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
      return false;
    }
  }

  static async checkOutVisitor(companyId: string, visitorId: string, checkOutTimeISO?: string): Promise<boolean> {
    const path = `companies/${companyId}/visitor_logs/${visitorId}`;
    try {
      const ref = doc(db, 'companies', companyId, 'visitor_logs', visitorId);
      await setDoc(ref, {
        checkOutTime: checkOutTimeISO || new Date().toISOString(),
        status: 'CHECKED_OUT'
      }, { merge: true });
      return true;
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, path);
      return false;
    }
  }

  /**
   * ============================================================
   * SITE OPERATIONS: MATERIAL MOVEMENT LOG REGISTER
   * ============================================================
   */
  static subscribeToMaterialLogs(session: UserSession, companyId: string, onData: (materials: MaterialMovementRecord[]) => void
  ): () => void {
    try {
      const colRef = collection(db, 'companies', companyId, 'material_movement_logs');
      return onSnapshot(colRef, (snap) => {
        const materials = snap.docs.map(d => ({ id: d.id, ...d.data() } as MaterialMovementRecord));
        onData(materials);
      }, (err) => {
        console.warn('[Firestore] subscribeToMaterialLogs error:', err);
        onData([]);
      });
    } catch (e) {
      console.warn('[Firestore] subscribeToMaterialLogs exception:', e);
      onData([]);
      return () => {};
    }
  }

  static async saveMaterialMovementLog(companyId: string, material: MaterialMovementRecord): Promise<boolean> {
    const path = `companies/${companyId}/material_movement_logs/${material.id}`;
    try {
      const ref = doc(db, 'companies', companyId, 'material_movement_logs', material.id);
      await setDoc(ref, {
        ...material,
        companyId,
        createdAt: material.createdAt || new Date().toISOString()
      }, { merge: true });
      return true;
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
      return false;
    }
  }

  static async updateMaterialStatus(
    companyId: string, 
    materialId: string, 
    status: MaterialMovementRecord['status'],
    approverId?: string,
    approverName?: string
  ): Promise<boolean> {
    const path = `companies/${companyId}/material_movement_logs/${materialId}`;
    try {
      const ref = doc(db, 'companies', companyId, 'material_movement_logs', materialId);
      await setDoc(ref, {
        status,
        approvedById: approverId,
        approvedByName: approverName
      }, { merge: true });
      return true;
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, path);
      return false;
    }
  }

  /**
   * ============================================================
   * SITE OPERATIONS: DAILY SITE LOG SUMMARY
   * ============================================================
   */
  static subscribeToDailySiteLogs(session: UserSession, companyId: string, onData: (siteLogs: DailySiteLogRecord[]) => void
  ): () => void {
    try {
      const colRef = collection(db, 'companies', companyId, 'daily_site_logs');
      return onSnapshot(colRef, (snap) => {
        const logs = snap.docs.map(d => ({ id: d.id, ...d.data() } as DailySiteLogRecord));
        onData(logs);
      }, (err) => {
        console.warn('[Firestore] subscribeToDailySiteLogs error:', err);
        onData([]);
      });
    } catch (e) {
      console.warn('[Firestore] subscribeToDailySiteLogs exception:', e);
      onData([]);
      return () => {};
    }
  }

  static async saveDailySiteLog(companyId: string, siteLog: DailySiteLogRecord): Promise<boolean> {
    const path = `companies/${companyId}/daily_site_logs/${siteLog.id}`;
    try {
      const ref = doc(db, 'companies', companyId, 'daily_site_logs', siteLog.id);
      await setDoc(ref, {
        ...siteLog,
        companyId,
        createdAt: siteLog.createdAt || new Date().toISOString()
      }, { merge: true });
      return true;
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
      return false;
    }
  }

  /**
   * ============================================================
   * DEPARTMENTS: DYNAMIC COMPANY DEPARTMENTS
   * ============================================================
   */
  static async getCompanyDepartments(companyId: string): Promise<DepartmentRecord[]> {
    try {
      // 1. Check company subcollection 'departments'
      const colRef = collection(db, 'companies', companyId, 'departments');
      const snap = await getDocs(colRef);
      if (!snap.empty) {
        return snap.docs.map(d => ({ id: d.id, ...d.data() } as DepartmentRecord));
      }

      // 2. Check top-level 'departments'
      const topRef = collection(db, 'departments');
      const topSnap = await getDocs(topRef);
      if (!topSnap.empty) {
        return topSnap.docs.map(d => ({ id: d.id, ...d.data() } as DepartmentRecord));
      }
    } catch (err) {
      console.warn('[FirestoreService] getCompanyDepartments error:', err);
    }

    // Default fallback company departments
    return [
      { id: 'DEPT-HR', name: 'HR', code: 'HR', description: 'Human Resources' },
      { id: 'DEPT-ADMIN', name: 'Administration', code: 'ADMIN', description: 'General Administration' },
      { id: 'DEPT-SEC', name: 'Security', code: 'SEC', description: 'Physical & Field Security' },
      { id: 'DEPT-OPS', name: 'Operations', code: 'OPS', description: 'Site Operations' },
      { id: 'DEPT-FIN', name: 'Finance', code: 'FIN', description: 'Finance & Accounts' },
      { id: 'DEPT-ACCTS', name: 'Accounts', code: 'ACCTS', description: 'Accounting & Payroll' },
      { id: 'DEPT-IT', name: 'IT', code: 'IT', description: 'Information Technology' }
    ];
  }

  /**
   * ============================================================
   * USER & APPROVAL WORKFLOW MANAGEMENT
   * ============================================================
   */
  static subscribeToUserStatus(
    uid: string,
    onData: (userData: any) => void
  ): () => void {
    try {
      const userRef = doc(db, 'users', uid);
      return onSnapshot(userRef, (docSnap) => {
        if (docSnap.exists()) {
          onData(docSnap.data());
        } else {
          onData(null);
        }
      }, (err) => {
        console.warn('[Firestore] subscribeToUserStatus error:', err);
        onData(null);
      });
    } catch (e) {
      console.warn('[Firestore] subscribeToUserStatus exception:', e);
      onData(null);
      return () => {};
    }
  }

  static async saveApprovalRequest(request: ApprovalRequestRecord): Promise<boolean> {
    try {
      // Dual-write to root 'approval_requests' and 'companies/{companyId}/approval_requests'
      const rootRef = doc(db, 'approval_requests', request.id);
      await setDoc(rootRef, request, { merge: true });

      if (request.companyId) {
        const compRef = doc(db, 'companies', request.companyId, 'approval_requests', request.id);
        await setDoc(compRef, request, { merge: true });
      }
      return true;
    } catch (err) {
      console.error('[FirestoreService] saveApprovalRequest error:', err);
      return false;
    }
  }

  static subscribeToApprovalRequests(session: UserSession, companyId: string, onData: (requests: ApprovalRequestRecord[]) => void
  ): () => void {
    try {
      if (companyId === 'GLOBAL_ADMIN') {
        const rootRef = collection(db, 'approval_requests');
        return onSnapshot(rootRef, (snap) => {
          const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as ApprovalRequestRecord));
          onData(list);
        }, (err) => {
          console.warn('[Firestore] subscribeToApprovalRequests (GLOBAL) error:', err);
          onData([]);
        });
      }

      const colRef = collection(db, 'companies', companyId, 'approval_requests');
      return onSnapshot(colRef, (snap) => {
        if (!snap.empty) {
          const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as ApprovalRequestRecord));
          onData(list);
        } else {
          // Fallback query on root approval_requests collection
          const rootRef = collection(db, 'approval_requests');
          const q = query(rootRef, where('companyId', '==', companyId));
          getDocs(q).then((rootSnap) => {
            const list = rootSnap.docs.map(d => ({ id: d.id, ...d.data() } as ApprovalRequestRecord));
            onData(list);
          }).catch(() => onData([]));
        }
      }, (err) => {
        console.warn('[Firestore] subscribeToApprovalRequests error:', err);
        const rootRef = collection(db, 'approval_requests');
        const q = query(rootRef, where('companyId', '==', companyId));
        getDocs(q).then((rootSnap) => {
          const list = rootSnap.docs.map(d => ({ id: d.id, ...d.data() } as ApprovalRequestRecord));
          onData(list);
        }).catch(() => onData([]));
      });
    } catch (e) {
      console.warn('[Firestore] subscribeToApprovalRequests exception:', e);
      onData([]);
      return () => {};
    }
  }

  static async approveUserByCompanyAdmin(
    companyId: string,
    requestId: string,
    adminUid: string,
    adminName: string
  ): Promise<boolean> {
    try {
      const timestamp = new Date().toISOString();
      const reqRef = doc(db, 'companies', companyId, 'approval_requests', requestId);
      const rootReqRef = doc(db, 'approval_requests', requestId);
      
      const reqSnap = await getDoc(reqRef);
      const reqData = reqSnap.exists() ? reqSnap.data() as ApprovalRequestRecord : (await getDoc(rootReqRef)).data() as ApprovalRequestRecord;

      if (!reqData) throw new Error('Approval request record not found');

      const isHrApproved = reqData.hrApproval === 'APPROVED';
      const isEmailVerified = reqData.emailVerified || (auth.currentUser?.emailVerified ?? false);
      const newAccountStatus: AccountStatus = (isHrApproved && isEmailVerified) ? 'ACTIVE' : 'ADMIN_APPROVED';

      const updateData = {
        companyAdminApproval: 'APPROVED' as ApprovalStatus,
        companyAdminApprovedBy: adminName || adminUid,
        companyAdminApprovedAt: timestamp,
        accountStatus: newAccountStatus,
        updatedAt: timestamp
      };

      await setDoc(reqRef, updateData, { merge: true });
      await setDoc(rootReqRef, updateData, { merge: true });

      // Update user doc in root 'users' collection
      const userRef = doc(db, 'users', reqData.uid);
      await setDoc(userRef, {
        companyAdminApproval: 'APPROVED',
        accountStatus: newAccountStatus,
        ...(newAccountStatus === 'ACTIVE' ? { role: reqData.requestedRole || 'EMPLOYEE' } : {}),
        updatedAt: timestamp
      }, { merge: true });

      // Update employee record if active
      if (newAccountStatus === 'ACTIVE') {
        const empRef = doc(db, 'companies', companyId, 'employees', reqData.uid);
        await setDoc(empRef, {
          status: 'ACTIVE',
          role: reqData.requestedRole || 'EMPLOYEE',
          updatedAt: timestamp
        }, { merge: true });
      }

      await this.logAuditEvent(
        companyId,
        adminUid,
        adminName,
        'ADMIN_APPROVED',
        `Company Admin approved account for ${reqData.fullName} (${reqData.email})`,
        reqData.uid
      );

      return true;
    } catch (err) {
      console.error('[FirestoreService] approveUserByCompanyAdmin error:', err);
      return false;
    }
  }

  static async approveUserByHR(
    companyId: string,
    requestId: string,
    hrUid: string,
    hrName: string
  ): Promise<boolean> {
    try {
      const timestamp = new Date().toISOString();
      const reqRef = doc(db, 'companies', companyId, 'approval_requests', requestId);
      const rootReqRef = doc(db, 'approval_requests', requestId);

      const reqSnap = await getDoc(reqRef);
      const reqData = reqSnap.exists() ? reqSnap.data() as ApprovalRequestRecord : (await getDoc(rootReqRef)).data() as ApprovalRequestRecord;

      if (!reqData) throw new Error('Approval request record not found');

      const isAdminApproved = reqData.companyAdminApproval === 'APPROVED';
      const isEmailVerified = reqData.emailVerified || (auth.currentUser?.emailVerified ?? false);
      const newAccountStatus: AccountStatus = (isAdminApproved && isEmailVerified) ? 'ACTIVE' : 'HR_APPROVED';

      const updateData = {
        hrApproval: 'APPROVED' as ApprovalStatus,
        hrApprovedBy: hrName || hrUid,
        hrApprovedAt: timestamp,
        accountStatus: newAccountStatus,
        updatedAt: timestamp
      };

      await setDoc(reqRef, updateData, { merge: true });
      await setDoc(rootReqRef, updateData, { merge: true });

      // Update user doc
      const userRef = doc(db, 'users', reqData.uid);
      await setDoc(userRef, {
        hrApproval: 'APPROVED',
        accountStatus: newAccountStatus,
        ...(newAccountStatus === 'ACTIVE' ? { role: reqData.requestedRole || 'EMPLOYEE' } : {}),
        updatedAt: timestamp
      }, { merge: true });

      if (newAccountStatus === 'ACTIVE') {
        const empRef = doc(db, 'companies', companyId, 'employees', reqData.uid);
        await setDoc(empRef, {
          status: 'ACTIVE',
          role: reqData.requestedRole || 'EMPLOYEE',
          updatedAt: timestamp
        }, { merge: true });
      }

      await this.logAuditEvent(
        companyId,
        hrUid,
        hrName,
        'HR_APPROVED',
        `HR approved account for ${reqData.fullName} (${reqData.email})`,
        reqData.uid
      );

      return true;
    } catch (err) {
      console.error('[FirestoreService] approveUserByHR error:', err);
      return false;
    }
  }

  static async rejectUserApplication(
    companyId: string,
    requestId: string,
    rejectorUid: string,
    reason: string
  ): Promise<boolean> {
    try {
      const timestamp = new Date().toISOString();
      const reqRef = doc(db, 'companies', companyId, 'approval_requests', requestId);
      const rootReqRef = doc(db, 'approval_requests', requestId);

      const updateData = {
        accountStatus: 'REJECTED' as AccountStatus,
        rejectionReason: reason || 'Application rejected by company administrator.',
        rejectedBy: rejectorUid,
        rejectedAt: timestamp,
        updatedAt: timestamp
      };

      await setDoc(reqRef, updateData, { merge: true });
      await setDoc(rootReqRef, updateData, { merge: true });

      const reqSnap = await getDoc(reqRef);
      if (reqSnap.exists()) {
        const reqData = reqSnap.data() as ApprovalRequestRecord;
        const userRef = doc(db, 'users', reqData.uid);
        await setDoc(userRef, {
          accountStatus: 'REJECTED',
          rejectionReason: reason,
          rejectedBy: rejectorUid,
          updatedAt: timestamp
        }, { merge: true });
      }

      await this.logAuditEvent(
        companyId,
        rejectorUid,
        'System Approver',
        'ACCOUNT_REJECTED',
        `Application rejected. Reason: ${reason}`
      );

      return true;
    } catch (err) {
      console.error('[FirestoreService] rejectUserApplication error:', err);
      return false;
    }
  }

  /**
   * ============================================================
   * SYSTEM CONFIGURATION & SUPER ADMIN INITIALIZATION
   * ============================================================
   */
  static async getSystemConfig(): Promise<SystemConfigRecord | null> {
    try {
      const sysRef = doc(db, 'settings', 'system');
      const snap = await getDoc(sysRef);
      if (snap.exists()) {
        return snap.data() as SystemConfigRecord;
      }
    } catch (err) {
      console.warn('[FirestoreService] getSystemConfig error:', err);
    }
    return null;
  }

  static async initializeSuperAdminConfig(uid: string, email: string): Promise<boolean> {
    try {
      const sysRef = doc(db, 'settings', 'system');
      const current = await this.getSystemConfig();

      if (current && current.superAdminInitialized) {
        if (current.superAdminEmail?.toLowerCase() === email.toLowerCase()) {
          if (current.superAdminUid !== uid) {
            await setDoc(sysRef, { superAdminUid: uid, updatedAt: new Date().toISOString() }, { merge: true });
          }
          return true;
        }
        throw new Error('Super Admin account has already been initialized on this system.');
      }

      const config: SystemConfigRecord = {
        superAdminInitialized: true,
        superAdminUid: uid,
        superAdminEmail: email,
        initializedAt: new Date().toISOString()
      };

      await setDoc(sysRef, config, { merge: true });
      return true;
    } catch (err) {
      console.warn('[FirestoreService] initializeSuperAdminConfig warning:', err);
      return true;
    }
  }

  /**
   * ============================================================
   * AUDIT LOGGING
   * ============================================================
   */
  static async logAuditEvent(
    companyId: string,
    actorId: string,
    actorName: string,
    action: string,
    details: string,
    targetUser?: string
  ): Promise<boolean> {
    try {
      const logId = `AUDIT-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const logRecord: AuditLogRecord = {
        id: logId,
        companyId: companyId || 'GLOBAL',
        actorId,
        actorName,
        action,
        details,
        targetUser,
        timestamp: new Date().toISOString()
      };

      if (companyId && companyId !== 'GLOBAL') {
        const compLogRef = doc(db, 'companies', companyId, 'audit_logs', logId);
        await setDoc(compLogRef, logRecord);
      }

      const rootLogRef = doc(db, 'system_audit_logs', logId);
      await setDoc(rootLogRef, logRecord);

      return true;
    } catch (err) {
      console.warn('[FirestoreService] logAuditEvent error:', err);
      return false;
    }
  }

  /**
   * ============================================================
   * SUPER ADMIN & COMPANY MANAGEMENT METHODS
   * ============================================================
   */

  /**
   * Fetch all registered companies from Firestore
   */
  static async getAllCompanies(): Promise<CompanyTenant[]> {
    try {
      const colRef = collection(db, 'companies');
      const snap = await getDocs(colRef);
      if (snap.empty) return [];
      return snap.docs.map(docSnap => {
        const data = docSnap.data();
        return {
          companyId: docSnap.id,
          companyLegalName: data.companyLegalName || docSnap.id,
          brandName: data.brandName || docSnap.id,
          licenseTier: data.licenseTier || 'ENTERPRISE',
          status: data.status || 'ACTIVE',
          primaryColorHex: data.primaryColorHex || '#4f46e5',
          secondaryColorHex: data.secondaryColorHex || '#06b6d4',
          allowedBranches: data.allowedBranches || ['MAIN'],
          maxEmployeesAllowed: data.maxEmployeesAllowed || 1000,
          maxSitesAllowed: data.maxSitesAllowed || 50,
          enabledModules: data.enabledModules || MASTER_APP_MODULES.map(m => m.key),
          email: data.email || '',
          phone: data.phone || '',
          address: data.address || '',
          city: data.city || '',
          state: data.state || '',
          country: data.country || 'India',
          adminName: data.adminName || '',
          adminEmail: data.adminEmail || '',
          createdAt: data.createdAt || new Date().toISOString()
        } as CompanyTenant;
      });
    } catch (err) {
      console.warn('[FirestoreService] getAllCompanies error:', err);
      return [];
    }
  }

  /**
   * Fetch a specific company by code/ID
   */
  static async getCompanyByCode(companyCode: string): Promise<CompanyTenant | null> {
    const cleanCode = companyCode.trim().toUpperCase();
    try {
      const compRef = doc(db, 'companies', cleanCode);
      const snap = await getDoc(compRef);
      if (snap.exists()) {
        const data = snap.data();
        return {
          companyId: snap.id,
          companyLegalName: data.companyLegalName || snap.id,
          brandName: data.brandName || snap.id,
          licenseTier: data.licenseTier || 'ENTERPRISE',
          status: data.status || 'ACTIVE',
          primaryColorHex: data.primaryColorHex || '#4f46e5',
          secondaryColorHex: data.secondaryColorHex || '#06b6d4',
          allowedBranches: data.allowedBranches || ['MAIN'],
          maxEmployeesAllowed: data.maxEmployeesAllowed || 1000,
          maxSitesAllowed: data.maxSitesAllowed || 50,
          enabledModules: data.enabledModules || MASTER_APP_MODULES.map(m => m.key),
          email: data.email || '',
          phone: data.phone || '',
          address: data.address || '',
          city: data.city || '',
          state: data.state || '',
          country: data.country || 'India',
          adminName: data.adminName || '',
          adminEmail: data.adminEmail || '',
          createdAt: data.createdAt || new Date().toISOString()
        } as CompanyTenant;
      }
    } catch (err) {
      console.warn('[FirestoreService] getCompanyByCode error:', err);
    }
    return null;
  }

  /**
   * Update Company Enabled Modules
   */
  static async updateCompanyModules(companyId: string, enabledModules: string[]): Promise<boolean> {
    try {
      const compRef = doc(db, 'companies', companyId);
      await setDoc(compRef, { enabledModules, updatedAt: new Date().toISOString() }, { merge: true });
      return true;
    } catch (err) {
      console.error('[FirestoreService] updateCompanyModules error:', err);
      return false;
    }
  }

  /**
   * Update Company Details & Status
   */
  static async updateCompanyDetails(companyId: string, updates: Partial<CompanyTenant>): Promise<boolean> {
    try {
      const compRef = doc(db, 'companies', companyId);
      await setDoc(compRef, { ...updates, updatedAt: new Date().toISOString() }, { merge: true });
      return true;
    } catch (err) {
      console.error('[FirestoreService] updateCompanyDetails error:', err);
      return false;
    }
  }

  /**
   * Fetch all users globally (for Super Admin dashboard)
   */
  static async getAllUsers(): Promise<any[]> {
    try {
      const usersRef = collection(db, 'users');
      const snap = await getDocs(usersRef);
      if (snap.empty) return [];
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (err) {
      console.warn('[FirestoreService] getAllUsers error:', err);
      return [];
    }
  }

  /**
   * Fetch all pending registration requests globally
   */
  static async getAllApprovalRequests(): Promise<ApprovalRequestRecord[]> {
    try {
      const reqRef = collection(db, 'approval_requests');
      const snap = await getDocs(reqRef);
      if (snap.empty) return [];
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as ApprovalRequestRecord));
    } catch (err) {
      console.warn('[FirestoreService] getAllApprovalRequests error:', err);
      return [];
    }
  }

  /**
   * Calculate real Super Admin System Statistics from Firestore
   */
  static async getSuperAdminStats(): Promise<{
    totalCompanies: number;
    activeCompanies: number;
    pendingCompanies: number;
    totalUsers: number;
    pendingUserApprovals: number;
    activeSites: number;
    todayVisitors: number;
    todayIncidents: number;
  }> {
    try {
      const companies = await this.getAllCompanies();
      const users = await this.getAllUsers();
      const requests = await this.getAllApprovalRequests();

      const totalCompanies = companies.length;
      const activeCompanies = companies.filter(c => c.status === 'ACTIVE').length;
      const pendingCompanies = companies.filter(c => c.status === 'SUSPENDED' || c.status === 'TRIAL_EXPIRED').length;

      const totalUsers = users.length;
      const pendingUserApprovals = requests.filter(r => r.accountStatus === 'PENDING_APPROVAL').length;

      return {
        totalCompanies,
        activeCompanies,
        pendingCompanies,
        totalUsers,
        pendingUserApprovals,
        activeSites: 0,
        todayVisitors: 0,
        todayIncidents: 0
      };
    } catch (err) {
      console.warn('[FirestoreService] getSuperAdminStats error:', err);
      return {
        totalCompanies: 0,
        activeCompanies: 0,
        pendingCompanies: 0,
        totalUsers: 0,
        pendingUserApprovals: 0,
        activeSites: 0,
        todayVisitors: 0,
        todayIncidents: 0
      };
    }
  }

  /**
   * Create a brand new Company along with its Company Admin and Module Entitlements
   */
  static async createCompanyWithAdmin(params: {
    company: CompanyTenant;
    adminInfo: { fullName: string; email: string; mobileNumber?: string };
    enabledModules: string[];
    createdByUid: string;
    createdByName: string;
  }): Promise<{ success: boolean; message: string; companyId: string }> {
    const { company, adminInfo, enabledModules, createdByUid, createdByName } = params;
    const cleanCompanyId = company.companyId.trim().toUpperCase();

    if (!cleanCompanyId) {
      return { success: false, message: 'Company Code is required.', companyId: '' };
    }

    try {
      const timestamp = new Date().toISOString();

      // 1. Check if Company Code already exists
      const compRef = doc(db, 'companies', cleanCompanyId);
      let existingSnap: any;
      try {
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000));
        existingSnap = await Promise.race([getDoc(compRef), timeoutPromise]);
      } catch (err: any) {
        if (err.message === 'timeout' || err.code === 'unavailable' || err.message?.includes('offline')) {
          console.warn('[FirestoreService] Network timeout or offline, bypassing company code existence check.');
        } else {
          throw err;
        }
      }

      if (existingSnap && existingSnap.exists()) {
        return { success: false, message: `Company Code "${cleanCompanyId}" is already registered.`, companyId: cleanCompanyId };
      }

      // 2. Save Company document
      const companyPayload: CompanyTenant = {
        ...company,
        companyId: cleanCompanyId,
        status: company.status || 'ACTIVE',
        licenseTier: company.licenseTier || 'ENTERPRISE',
        enabledModules: enabledModules.length > 0 ? enabledModules : MASTER_APP_MODULES.map(m => m.key),
        adminName: adminInfo.fullName,
        adminEmail: adminInfo.email,
        createdAt: timestamp
      };

      await setDoc(compRef, companyPayload, { merge: true });

      // 3. Save Code mappings for public lookup
      await setDoc(doc(db, 'company_codes', cleanCompanyId), {
        code: cleanCompanyId,
        companyId: cleanCompanyId,
        brandName: company.brandName,
        createdAt: timestamp
      }, { merge: true });

      // 4. Create Default Departments for the company
      const defaultDepts = [
        { id: 'DEPT-OPS', name: 'Operations & Field', code: 'OPS' },
        { id: 'DEPT-SEC', name: 'Security & Guarding', code: 'SEC' },
        { id: 'DEPT-ADMIN', name: 'Administration', code: 'ADMIN' },
        { id: 'DEPT-HR', name: 'Human Resources', code: 'HR' }
      ];

      for (const dept of defaultDepts) {
        await setDoc(doc(db, 'companies', cleanCompanyId, 'departments', dept.id), {
          id: dept.id,
          name: dept.name,
          code: dept.code,
          companyId: cleanCompanyId,
          createdAt: timestamp
        }, { merge: true });
      }

      // 5. Create Default Branch & Primary Site
      await setDoc(doc(db, 'companies', cleanCompanyId, 'branches', 'MAIN'), {
        id: 'MAIN',
        branchId: 'MAIN',
        branchName: `${company.brandName} Head Branch`,
        code: 'MAIN',
        city: company.city || 'Mumbai',
        state: company.state || 'Maharashtra',
        companyId: cleanCompanyId,
        createdAt: timestamp
      }, { merge: true });

      await setDoc(doc(db, 'companies', cleanCompanyId, 'sites', 'SITE-HQ'), {
        id: 'SITE-HQ',
        siteId: 'SITE-HQ',
        siteName: `${company.brandName} Main Site / HQ`,
        branchId: 'MAIN',
        address: company.address || `${company.brandName} Operations Center`,
        city: company.city || 'Mumbai',
        state: company.state || 'Maharashtra',
        country: company.country || 'India',
        companyId: cleanCompanyId,
        status: 'ACTIVE',
        createdAt: timestamp
      }, { merge: true });

      // 6. Create Initial Subscription & Entitlements
      const planCode = company.licenseTier === 'STARTER' ? 'PLAN_STARTER' : company.licenseTier === 'PROFESSIONAL' ? 'PLAN_PRO' : 'PLAN_ENTERPRISE';
      const maxEmployees = company.maxEmployeesAllowed || 1000;
      const subId = `SUB-${cleanCompanyId}`;

      const initialSub = {
        subscriptionId: subId,
        companyId: cleanCompanyId,
        planId: planCode,
        status: 'ACTIVE',
        billingCycle: 'MONTHLY',
        currentPeriodStart: timestamp,
        currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        cancelAtPeriodEnd: false,
        employeeLimit: maxEmployees,
        userLimit: company.licenseTier === 'STARTER' ? 2 : company.licenseTier === 'PROFESSIONAL' ? 5 : 25,
        storageLimitMB: company.licenseTier === 'STARTER' ? 1024 : company.licenseTier === 'PROFESSIONAL' ? 5120 : 51200,
        source: 'SYSTEM',
        createdAt: timestamp,
        updatedAt: timestamp,
        createdBy: createdByUid,
        updatedBy: createdByUid
      };

      await setDoc(doc(db, 'companies', cleanCompanyId, 'subscriptions', subId), initialSub, { merge: true });

      // Save Module Entitlements
      const finalModules = enabledModules.length > 0 ? enabledModules : MASTER_APP_MODULES.map(m => m.key);
      for (const modKey of finalModules) {
        const entId = `${cleanCompanyId}_${modKey}`;
        await setDoc(doc(db, 'companies', cleanCompanyId, 'entitlements', entId), {
          id: entId,
          companyId: cleanCompanyId,
          moduleId: modKey,
          enabled: true,
          source: 'PLAN',
          planId: planCode,
          subscriptionId: subId,
          validFrom: timestamp,
          overriddenBySuperAdmin: false
        }, { merge: true });
      }

      // 7. Create Company Admin user account record
      const adminEmail = adminInfo.email.trim().toLowerCase();
      const adminUid = `ADMIN-${cleanCompanyId}-${Date.now().toString().slice(-4)}`;

      const adminUserDoc = {
        uid: adminUid,
        email: adminEmail,
        fullName: adminInfo.fullName,
        companyId: cleanCompanyId,
        companyName: company.brandName,
        departmentId: 'DEPT-ADMIN',
        departmentName: 'Administration',
        mobileNumber: adminInfo.mobileNumber || '',
        role: 'COMPANY_ADMIN' as UserRole,
        accountStatus: 'ACTIVE' as AccountStatus,
        emailVerified: true,
        companyAdminApproval: 'APPROVED' as ApprovalStatus,
        hrApproval: 'APPROVED' as ApprovalStatus,
        createdAt: timestamp,
        updatedAt: timestamp
      };

      // Store in root users collection
      await setDoc(doc(db, 'users', adminUid), adminUserDoc, { merge: true });

      // Store in employees subcollection
      await setDoc(doc(db, 'companies', cleanCompanyId, 'employees', adminUid), {
        id: adminUid,
        employeeId: `ADM-001`,
        companyId: cleanCompanyId,
        firstName: adminInfo.fullName.split(' ')[0] || 'Company',
        lastName: adminInfo.fullName.split(' ').slice(1).join(' ') || 'Admin',
        email: adminEmail,
        contactNumber: adminInfo.mobileNumber || '',
        role: 'COMPANY_ADMIN',
        status: 'ACTIVE',
        departmentId: 'DEPT-ADMIN',
        designation: 'Company Administrator',
        assignedBranchId: 'MAIN',
        assignedRegionId: 'HQ',
        assignedSiteId: 'SITE-HQ',
        createdBy: createdByUid,
        createdAt: timestamp,
        updatedAt: timestamp
      }, { merge: true });

      // 8. Log Audit Event
      await this.logAuditEvent(
        cleanCompanyId,
        createdByUid,
        createdByName,
        'CREATE_COMPANY',
        `Created company ${company.brandName} (${cleanCompanyId}) with Admin ${adminInfo.email} and ${finalModules.length} enabled modules.`
      );

      return {
        success: true,
        message: `Company "${company.brandName}" (${cleanCompanyId}) created successfully. Admin account assigned to ${adminEmail}.`,
        companyId: cleanCompanyId
      };
    } catch (err: any) {
      console.error('[FirestoreService] createCompanyWithAdmin error:', err);
      return { success: false, message: err.message || 'Failed to create company.', companyId: cleanCompanyId };
    }
  }

  // ==========================================
  // LEAVE MANAGEMENT (HRMS) METHODS
  // ==========================================

  /**
   * Subscribe to real-time leave requests for a company
   */
  static subscribeToLeaveRequests(session: UserSession, companyId: string, onData: (leaves: LeaveRequestRecord[]) => void
  ): () => void {
    if (!companyId) {
      onData([]);
      return () => {};
    }
    try {
      const q = query(
        collection(db, 'companies', companyId, 'leave_requests'),
        orderBy('createdAt', 'desc'),
        limit(200)
      );
      return onSnapshot(q, (snapshot) => {
        const list: LeaveRequestRecord[] = [];
        snapshot.forEach((docSnap) => {
          list.push({
            id: docSnap.id,
            ...docSnap.data()
          } as LeaveRequestRecord);
        });
        onData(list);
      }, (err) => {
        console.warn('[FirestoreService] subscribeToLeaveRequests error:', err);
        // Fallback to unordered if index is building
        const fallbackCol = collection(db, 'companies', companyId, 'leave_requests');
        onSnapshot(fallbackCol, (snapshot) => {
          const list: LeaveRequestRecord[] = [];
          snapshot.forEach((docSnap) => {
            list.push({
              id: docSnap.id,
              ...docSnap.data()
            } as LeaveRequestRecord);
          });
          list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
          onData(list);
        });
      });
    } catch (err) {
      console.warn('[FirestoreService] subscribeToLeaveRequests exception:', err);
      onData([]);
      return () => {};
    }
  }

  /**
   * Get all leave requests for a company
   */
  static async getLeaveRequests(companyId: string): Promise<LeaveRequestRecord[]> {
    try {
      const colRef = collection(db, 'companies', companyId, 'leave_requests');
      const snap = await getDocs(colRef);
      const list: LeaveRequestRecord[] = [];
      snap.forEach((docSnap) => {
        list.push({
          id: docSnap.id,
          ...docSnap.data()
        } as LeaveRequestRecord);
      });
      return list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    } catch (err) {
      console.error('[FirestoreService] getLeaveRequests error:', err);
      return [];
    }
  }

  /**
   * Submit a new leave application
   */
  static async createLeaveRequest(
    companyId: string,
    request: Omit<LeaveRequestRecord, 'id' | 'createdAt'>
  ): Promise<string | null> {
    try {
      const leaveId = `LEV_${Date.now()}_${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      const now = new Date().toISOString();
      const payload: LeaveRequestRecord = {
        ...request,
        id: leaveId,
        companyId,
        status: 'PENDING',
        appliedAt: now,
        createdAt: now,
        updatedAt: now
      };

      const docRef = doc(db, 'companies', companyId, 'leave_requests', leaveId);
      await setDoc(docRef, payload);

      // Also create an audit log
      await this.logAuditEvent(
        companyId,
        request.employeeId,
        request.employeeName,
        'APPLY_LEAVE',
        `Applied for ${request.daysCount} day(s) of ${request.leaveType} leave from ${request.startDate} to ${request.endDate}. Reason: ${request.reason}`
      );

      return leaveId;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `companies/${companyId}/leave_requests`);
      return null;
    }
  }

  /**
   * Update leave request status (Approve, Reject, or Cancel)
   */
  static async updateLeaveRequestStatus(
    companyId: string,
    leaveId: string,
    status: 'APPROVED' | 'REJECTED' | 'CANCELLED',
    reviewer: {
      uid: string;
      name: string;
      reason?: string;
    }
  ): Promise<boolean> {
    try {
      const docRef = doc(db, 'companies', companyId, 'leave_requests', leaveId);
      const now = new Date().toISOString();

      const updateData: Partial<LeaveRequestRecord> = {
        status,
        updatedAt: now
      };

      if (status === 'APPROVED') {
        updateData.approvedBy = reviewer.uid;
        updateData.approvedByName = reviewer.name;
        updateData.approvedAt = now;
      } else if (status === 'REJECTED') {
        updateData.rejectedBy = reviewer.uid;
        updateData.rejectedAt = now;
        updateData.rejectionReason = reviewer.reason || 'Not approved';
      }

      await setDoc(docRef, updateData, { merge: true });

      // Log audit
      await this.logAuditEvent(
        companyId,
        reviewer.uid,
        reviewer.name,
        `LEAVE_${status}`,
        `Leave request ${leaveId} was ${status.toLowerCase()} by ${reviewer.name}. ${reviewer.reason ? `Reason: ${reviewer.reason}` : ''}`
      );

      return true;
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `companies/${companyId}/leave_requests/${leaveId}`);
      return false;
    }
  }

  /**
   * Get or initialize leave balance for an employee for a given year
   */
  static async getLeaveBalance(
    companyId: string,
    employeeId: string,
    employeeName: string,
    year: number = new Date().getFullYear()
  ): Promise<LeaveBalanceRecord> {
    const balanceId = `${employeeId}_${year}`;
    const defaultBalance: LeaveBalanceRecord = {
      id: balanceId,
      companyId,
      employeeId,
      employeeName,
      year,
      casualLeave: { total: 12, used: 0, remaining: 12 },
      sickLeave: { total: 8, used: 0, remaining: 8 },
      earnedLeave: { total: 15, used: 0, remaining: 15 },
      unpaidLeave: { used: 0 },
      updatedAt: new Date().toISOString()
    };

    try {
      const docRef = doc(db, 'companies', companyId, 'leave_balances', balanceId);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        return snap.data() as LeaveBalanceRecord;
      } else {
        await setDoc(docRef, defaultBalance);
        return defaultBalance;
      }
    } catch (err) {
      console.warn('[FirestoreService] getLeaveBalance fallback:', err);
      return defaultBalance;
    }
  }

  /**
   * Save or update leave balance
   */
  static async saveLeaveBalance(
    companyId: string,
    balance: LeaveBalanceRecord
  ): Promise<boolean> {
    try {
      const docRef = doc(db, 'companies', companyId, 'leave_balances', balance.id);
      await setDoc(docRef, {
        ...balance,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      return true;
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `companies/${companyId}/leave_balances/${balance.id}`);
      return false;
    }
  }

  // ==========================================
  // PAYROLL & COMPENSATION (HRMS) METHODS
  // ==========================================

  /**
   * Subscribe to Salary Structures
   */
  static subscribeToSalaryStructures(session: UserSession, companyId: string, onData: (structures: SalaryStructureRecord[]) => void
  ): () => void {
    if (!companyId) {
      onData([]);
      return () => {};
    }
    try {
      const colRef = collection(db, 'companies', companyId, 'salary_structures');
      return onSnapshot(colRef, (snapshot) => {
        const list: SalaryStructureRecord[] = [];
        snapshot.forEach((docSnap) => {
          list.push({ id: docSnap.id, ...docSnap.data() } as SalaryStructureRecord);
        });
        onData(list);
      }, (err) => {
        console.warn('[FirestoreService] subscribeToSalaryStructures error:', err);
        onData([]);
      });
    } catch (err) {
      console.warn('[FirestoreService] subscribeToSalaryStructures exception:', err);
      onData([]);
      return () => {};
    }
  }

  /**
   * Get Salary Structures
   */
  static async getSalaryStructures(companyId: string): Promise<SalaryStructureRecord[]> {
    try {
      const colRef = collection(db, 'companies', companyId, 'salary_structures');
      const snap = await getDocs(colRef);
      const list: SalaryStructureRecord[] = [];
      snap.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() } as SalaryStructureRecord);
      });
      return list;
    } catch (err) {
      console.error('[FirestoreService] getSalaryStructures error:', err);
      return [];
    }
  }

  /**
   * Save or Create Salary Structure
   */
  static async saveSalaryStructure(
    companyId: string,
    structure: Omit<SalaryStructureRecord, 'id' | 'createdAt'> & { id?: string }
  ): Promise<boolean> {
    try {
      const structId = structure.id || `STR_${Date.now()}_${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      const now = new Date().toISOString();
      const payload: SalaryStructureRecord = {
        ...structure,
        id: structId,
        companyId,
        createdAt: structure.id ? (structure as any).createdAt || now : now
      };
      const docRef = doc(db, 'companies', companyId, 'salary_structures', structId);
      await setDoc(docRef, payload, { merge: true });
      return true;
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `companies/${companyId}/salary_structures`);
      return false;
    }
  }

  /**
   * Subscribe to Employee Salary Profiles
   */
  static subscribeToSalaryProfiles(session: UserSession, companyId: string, onData: (profiles: EmployeeSalaryProfileRecord[]) => void
  ): () => void {
    if (!companyId) {
      onData([]);
      return () => {};
    }
    try {
      const colRef = collection(db, 'companies', companyId, 'payroll_profiles');
      return onSnapshot(colRef, (snapshot) => {
        const list: EmployeeSalaryProfileRecord[] = [];
        snapshot.forEach((docSnap) => {
          list.push({ id: docSnap.id, ...docSnap.data() } as EmployeeSalaryProfileRecord);
        });
        onData(list);
      }, (err) => {
        console.warn('[FirestoreService] subscribeToSalaryProfiles error:', err);
        onData([]);
      });
    } catch (err) {
      console.warn('[FirestoreService] subscribeToSalaryProfiles exception:', err);
      onData([]);
      return () => {};
    }
  }

  /**
   * Get all employee salary profiles
   */
  static async getSalaryProfiles(companyId: string): Promise<EmployeeSalaryProfileRecord[]> {
    try {
      const colRef = collection(db, 'companies', companyId, 'payroll_profiles');
      const snap = await getDocs(colRef);
      const list: EmployeeSalaryProfileRecord[] = [];
      snap.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() } as EmployeeSalaryProfileRecord);
      });
      return list;
    } catch (err) {
      console.error('[FirestoreService] getSalaryProfiles error:', err);
      return [];
    }
  }

  /**
   * Save Employee Salary Profile
   */
  static async saveSalaryProfile(
    companyId: string,
    profile: EmployeeSalaryProfileRecord
  ): Promise<boolean> {
    try {
      const docRef = doc(db, 'companies', companyId, 'payroll_profiles', profile.id);
      await setDoc(docRef, {
        ...profile,
        companyId,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      return true;
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `companies/${companyId}/payroll_profiles/${profile.id}`);
      return false;
    }
  }

  /**
   * Subscribe to Salary Advances
   */
  static subscribeToSalaryAdvances(session: UserSession, companyId: string, onData: (advances: SalaryAdvanceRecord[]) => void
  ): () => void {
    if (!companyId) {
      onData([]);
      return () => {};
    }
    try {
      const colRef = collection(db, 'companies', companyId, 'advances_and_deductions');
      return onSnapshot(colRef, (snapshot) => {
        const list: SalaryAdvanceRecord[] = [];
        snapshot.forEach((docSnap) => {
          list.push({ id: docSnap.id, ...docSnap.data() } as SalaryAdvanceRecord);
        });
        list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
        onData(list);
      }, (err) => {
        console.warn('[FirestoreService] subscribeToSalaryAdvances error:', err);
        onData([]);
      });
    } catch (err) {
      console.warn('[FirestoreService] subscribeToSalaryAdvances exception:', err);
      onData([]);
      return () => {};
    }
  }

  /**
   * Create Salary Advance Request
   */
  static async createSalaryAdvance(
    companyId: string,
    advance: Omit<SalaryAdvanceRecord, 'id' | 'createdAt' | 'remainingAmount'>
  ): Promise<string | null> {
    try {
      const advanceId = `ADV_${Date.now()}_${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      const now = new Date().toISOString();
      const payload: SalaryAdvanceRecord = {
        ...advance,
        id: advanceId,
        companyId,
        remainingAmount: advance.amount,
        createdAt: now
      };
      const docRef = doc(db, 'companies', companyId, 'advances_and_deductions', advanceId);
      await setDoc(docRef, payload);

      await this.logAuditEvent(
        companyId,
        advance.employeeId,
        advance.employeeName,
        'SALARY_ADVANCE_REQUEST',
        `Requested salary advance of ₹${advance.amount}. Reason: ${advance.reason}`
      );

      return advanceId;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `companies/${companyId}/advances_and_deductions`);
      return null;
    }
  }

  /**
   * Update Salary Advance status
   */
  static async updateSalaryAdvanceStatus(
    companyId: string,
    advanceId: string,
    status: 'APPROVED' | 'REJECTED' | 'RECOVERED',
    reviewer: { uid: string; name: string }
  ): Promise<boolean> {
    try {
      const docRef = doc(db, 'companies', companyId, 'advances_and_deductions', advanceId);
      const updateData: Partial<SalaryAdvanceRecord> = {
        status,
        approvedBy: reviewer.uid,
        approvedByName: reviewer.name
      };
      await setDoc(docRef, updateData, { merge: true });

      await this.logAuditEvent(
        companyId,
        reviewer.uid,
        reviewer.name,
        `SALARY_ADVANCE_${status}`,
        `Advance ${advanceId} marked as ${status} by ${reviewer.name}`
      );
      return true;
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `companies/${companyId}/advances_and_deductions/${advanceId}`);
      return false;
    }
  }

  /**
   * Get all Payroll Cycles
   */
  static async getPayrollCycles(companyId: string): Promise<PayrollCycleRecord[]> {
    try {
      const colRef = collection(db, 'companies', companyId, 'payroll');
      const snap = await getDocs(colRef);
      const list: PayrollCycleRecord[] = [];
      snap.forEach((docSnap) => {
        const data = docSnap.data() as PayrollCycleRecord;
        list.push({ ...data, id: docSnap.id });
      });
      list.sort((a, b) => (b.id || '').localeCompare(a.id || ''));
      return list;
    } catch (err) {
      console.error('[FirestoreService] getPayrollCycles error:', err);
      return [];
    }
  }

  /**
   * Get Salary Advances
   */
  static async getSalaryAdvances(companyId: string): Promise<SalaryAdvanceRecord[]> {
    try {
      const colRef = collection(db, 'companies', companyId, 'advances_and_deductions');
      const snap = await getDocs(colRef);
      const list: SalaryAdvanceRecord[] = [];
      snap.forEach((docSnap) => {
        const data = docSnap.data() as SalaryAdvanceRecord;
        list.push({ ...data, id: docSnap.id });
      });
      list.sort((a, b) => (b.requestedDate || '').localeCompare(a.requestedDate || ''));
      return list;
    } catch (err) {
      console.error('[FirestoreService] getSalaryAdvances error:', err);
      return [];
    }
  }

  /**
   * Subscribe to Payroll Cycles
   */
  static subscribeToPayrollCycles(session: UserSession, companyId: string, onData: (cycles: PayrollCycleRecord[]) => void
  ): () => void {
    if (!companyId) {
      onData([]);
      return () => {};
    }
    try {
      const colRef = collection(db, 'companies', companyId, 'payroll');
      return onSnapshot(colRef, (snapshot) => {
        const list: PayrollCycleRecord[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as PayrollCycleRecord;
          list.push({ ...data, id: docSnap.id });
        });
        list.sort((a, b) => (b.id || '').localeCompare(a.id || ''));
        onData(list);
      }, (err) => {
        console.warn('[FirestoreService] subscribeToPayrollCycles error:', err);
        onData([]);
      });
    } catch (err) {
      console.warn('[FirestoreService] subscribeToPayrollCycles exception:', err);
      onData([]);
      return () => {};
    }
  }

  /**
   * Get salary slips for a specific payroll cycle
   */
  static async getSalarySlips(companyId: string, cycleId: string): Promise<SalarySlipRecord[]> {
    try {
      const colRef = collection(db, 'companies', companyId, 'salary_slips');
      const snap = await getDocs(colRef);
      const list: SalarySlipRecord[] = [];
      snap.forEach((docSnap) => {
        const data = docSnap.data() as SalarySlipRecord;
        if (data.payrollCycleId === cycleId) {
          list.push({ ...data, id: docSnap.id });
        }
      });
      return list;
    } catch (err) {
      console.error('[FirestoreService] getSalarySlips error:', err);
      return [];
    }
  }

  /**
   * Get salary slips for an employee
   */
  static async getEmployeeSalarySlips(companyId: string, employeeId: string): Promise<SalarySlipRecord[]> {
    try {
      const colRef = collection(db, 'companies', companyId, 'salary_slips');
      const snap = await getDocs(colRef);
      const list: SalarySlipRecord[] = [];
      snap.forEach((docSnap) => {
        const data = docSnap.data() as SalarySlipRecord;
        if (data.employeeId === employeeId) {
          list.push({ ...data, id: docSnap.id });
        }
      });
      list.sort((a, b) => `${b.year}-${String(b.month).padStart(2, '0')}`.localeCompare(`${a.year}-${String(a.month).padStart(2, '0')}`));
      return list;
    } catch (err) {
      console.error('[FirestoreService] getEmployeeSalarySlips error:', err);
      return [];
    }
  }

  /**
   * Execute Full Monthly Payroll Computation
   */
  static async executeMonthlyPayrollCalculation(
    companyId: string,
    month: number,
    year: number,
    actor: { uid: string; name: string }
  ): Promise<{ success: boolean; cycleId: string; totalSlips: number }> {
    try {
      const cycleId = `${year}-${String(month).padStart(2, '0')}`;
      const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
      ];
      const cycleLabel = `${monthNames[month - 1]} ${year}`;
      const daysInMonth = new Date(year, month, 0).getDate();

      // 1. Fetch Employees, Profiles, Structures, Advances, Leaves
      const employees = await this.getEmployees(companyId);
      const profiles = await this.getSalaryProfiles(companyId);
      const structures = await this.getSalaryStructures(companyId);
      const leaves = await this.getLeaveRequests(companyId);
      const colAdv = collection(db, 'companies', companyId, 'advances_and_deductions');
      const snapAdv = await getDocs(colAdv);
      const advances: SalaryAdvanceRecord[] = [];
      snapAdv.forEach(d => advances.push({ id: d.id, ...d.data() } as SalaryAdvanceRecord));

      // Default structure if none exists
      let defaultStruct = structures[0];
      if (!defaultStruct) {
        defaultStruct = {
          id: 'DEFAULT_STANDARD',
          companyId,
          name: 'Standard Security & Facility Structure',
          code: 'STD_SEC',
          basicPercentage: 50,
          hraPercentage: 20,
          daPercentage: 15,
          conveyanceAllowance: 1600,
          medicalAllowance: 1250,
          specialAllowance: 0,
          pfApplicable: true,
          esicApplicable: true,
          ptApplicable: true,
          status: 'ACTIVE',
          createdAt: new Date().toISOString()
        };
        await setDoc(doc(db, 'companies', companyId, 'salary_structures', defaultStruct.id), defaultStruct);
      }

      let totalGrossPay = 0;
      let totalDeductions = 0;
      let totalNetPay = 0;
      let slipCount = 0;

      // 2. Compute slips for active employees
      for (const emp of employees) {
        if (emp.status === 'TERMINATED') continue;

        // Profile or fallback
        const empProfile = profiles.find(p => p.employeeId === emp.id || p.id === emp.id) || {
          id: emp.id,
          companyId,
          employeeId: emp.id,
          employeeName: `${emp.firstName} ${emp.lastName}`,
          structureId: defaultStruct.id,
          monthlyCtc: 21500,
          baseMonthlySalary: 18000,
          bankName: 'State Bank of India',
          accountNumber: '••••••••' + (emp.id.slice(-4) || '1234'),
          ifscCode: 'SBIN0001234',
          panNumber: 'ABCDE1234F',
          paymentMode: 'BANK_TRANSFER' as const,
          updatedAt: new Date().toISOString()
        };

        const struct = structures.find(s => s.id === empProfile.structureId) || defaultStruct;

        // Calculate leave deductions (Loss of Pay / Unpaid)
        const empLeavesInMonth = leaves.filter(l => 
          (l.employeeId === emp.id || l.employeeName === `${emp.firstName} ${emp.lastName}`) &&
          l.status === 'APPROVED' &&
          l.leaveType === 'UNPAID' &&
          l.startDate.startsWith(`${year}-${String(month).padStart(2, '0')}`)
        );
        const lopDays = empLeavesInMonth.reduce((sum, l) => sum + (l.daysCount || 0), 0);
        const payableDays = Math.max(0, daysInMonth - lopDays);

        // Earnings
        const baseRate = empProfile.baseMonthlySalary || 18000;
        const proratedBase = Math.round((baseRate / daysInMonth) * payableDays);

        const basic = Math.round((proratedBase * (struct.basicPercentage || 50)) / 100);
        const hra = Math.round((basic * (struct.hraPercentage || 20)) / 100);
        const da = Math.round((basic * (struct.daPercentage || 15)) / 100);
        const conveyance = Math.round(((struct.conveyanceAllowance || 1600) / daysInMonth) * payableDays);
        const medical = Math.round(((struct.medicalAllowance || 1250) / daysInMonth) * payableDays);
        const specialAllowance = Math.max(0, proratedBase - (basic + hra + da + conveyance + medical));
        const totalGross = basic + hra + da + conveyance + medical + specialAllowance;

        // Deductions
        const pf = struct.pfApplicable ? Math.round(Math.min(basic, 15000) * 0.12) : 0;
        const esic = (struct.esicApplicable && totalGross <= 21000) ? Math.round(totalGross * 0.0075) : 0;
        const pt = struct.ptApplicable ? (totalGross > 10000 ? 200 : (totalGross > 7500 ? 175 : 0)) : 0;
        
        // Active advance recovery
        const empAdvance = advances.find(a => a.employeeId === emp.id && a.status === 'APPROVED' && a.remainingAmount > 0);
        const advanceDeduction = empAdvance ? Math.min(empAdvance.monthlyDeductionAmount || 2000, empAdvance.remainingAmount) : 0;
        const lopDeduction = Math.round((baseRate / daysInMonth) * lopDays);

        const slipTotalDeductions = pf + esic + pt + advanceDeduction;
        const netPay = Math.max(0, totalGross - slipTotalDeductions);

        const slipId = `SLIP_${cycleId}_${emp.id}`;
        const slipPayload: SalarySlipRecord = {
          id: slipId,
          companyId,
          payrollCycleId: cycleId,
          month,
          year,
          employeeId: emp.id,
          employeeName: `${emp.firstName} ${emp.lastName}`,
          departmentName: emp.departmentId || 'Operations',
          designation: emp.designation || 'Security Officer',
          bankName: empProfile.bankName,
          accountNumber: empProfile.accountNumber,
          ifscCode: empProfile.ifscCode,
          panNumber: empProfile.panNumber,
          uanNumber: empProfile.uanNumber,
          totalMonthDays: daysInMonth,
          workedDays: payableDays,
          paidLeaveDays: daysInMonth - payableDays,
          lopDays,
          payableDays,
          earnings: {
            basic,
            hra,
            da,
            conveyance,
            medical,
            specialAllowance,
            overtimePay: 0,
            bonus: 0,
            totalGross
          },
          deductions: {
            pf,
            esic,
            pt,
            tds: 0,
            advanceDeduction,
            lopDeduction,
            otherDeductions: 0,
            totalDeductions: slipTotalDeductions
          },
          netPay,
          netPayInWords: numberToIndianRupeesWords(netPay),
          status: 'GENERATED',
          generatedAt: new Date().toISOString(),
          createdAt: new Date().toISOString()
        };

        // Write slip to Firestore
        const slipDocRef = doc(db, 'companies', companyId, 'salary_slips', slipId);
        await setDoc(slipDocRef, slipPayload);

        // Update advance remaining if any
        if (empAdvance && advanceDeduction > 0) {
          const newRemaining = Math.max(0, empAdvance.remainingAmount - advanceDeduction);
          await setDoc(doc(db, 'companies', companyId, 'advances_and_deductions', empAdvance.id), {
            remainingAmount: newRemaining,
            status: newRemaining === 0 ? 'RECOVERED' : 'APPROVED'
          }, { merge: true });
        }

        totalGrossPay += totalGross;
        totalDeductions += slipTotalDeductions;
        totalNetPay += netPay;
        slipCount++;
      }

      // Save Cycle Record
      const cyclePayload: PayrollCycleRecord = {
        id: cycleId,
        companyId,
        month,
        year,
        cycleLabel,
        totalEmployees: slipCount,
        totalGrossPay,
        totalDeductions,
        totalNetPay,
        status: 'CALCULATED',
        processedAt: new Date().toISOString(),
        processedBy: actor.uid,
        processedByName: actor.name,
        createdAt: new Date().toISOString()
      };

      await setDoc(doc(db, 'companies', companyId, 'payroll', cycleId), cyclePayload);

      await this.logAuditEvent(
        companyId,
        actor.uid,
        actor.name,
        'PAYROLL_CALCULATED',
        `Processed monthly payroll for ${cycleLabel}. Total Net: ₹${totalNetPay.toLocaleString('en-IN')}, Employees: ${slipCount}`
      );

      return { success: true, cycleId, totalSlips: slipCount };
    } catch (err) {
      console.error('[FirestoreService] executeMonthlyPayrollCalculation error:', err);
      handleFirestoreError(err, OperationType.WRITE, `companies/${companyId}/payroll`);
      return { success: false, cycleId: '', totalSlips: 0 };
    }
  }

  /**
   * Update Payroll Cycle Status (e.g. APPROVED or DISBURSED)
   */
  static async updatePayrollCycleStatus(
    companyId: string,
    cycleId: string,
    status: 'APPROVED' | 'DISBURSED',
    actor: { uid: string; name: string }
  ): Promise<boolean> {
    try {
      const now = new Date().toISOString();
      const updateData: Partial<PayrollCycleRecord> = {
        status
      };
      if (status === 'APPROVED') {
        updateData.approvedAt = now;
      } else if (status === 'DISBURSED') {
        updateData.disbursedAt = now;
      }

      await setDoc(doc(db, 'companies', companyId, 'payroll', cycleId), updateData, { merge: true });

      // Also update all slips of this cycle
      const slips = await this.getSalarySlips(companyId, cycleId);
      for (const slip of slips) {
        await setDoc(doc(db, 'companies', companyId, 'salary_slips', slip.id), {
          status: status === 'DISBURSED' ? 'PAID' : 'APPROVED'
        }, { merge: true });
      }

      await this.logAuditEvent(
        companyId,
        actor.uid,
        actor.name,
        `PAYROLL_${status}`,
        `Payroll cycle ${cycleId} was marked as ${status} by ${actor.name}`
      );

      return true;
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `companies/${companyId}/payroll/${cycleId}`);
      return false;
    }
  }

  /**
   * ============================================================
   * INVENTORY & STOCK MANAGEMENT METHODS
   * ============================================================
   */

  /**
   * Real-time subscription to inventory items for a company
   */
  static subscribeToInventoryItems(session: UserSession, companyId: string, onData: (items: InventoryItemRecord[]) => void
  ): () => void {
    if (!companyId) {
      onData([]);
      return () => {};
    }
    try {
      const colRef = collection(db, 'companies', companyId, 'inventory_items');
      return onSnapshot(colRef, (snap) => {
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as InventoryItemRecord));
        list.sort((a, b) => (a.itemName || '').localeCompare(b.itemName || ''));
        onData(list);
      }, (err) => {
        console.warn('[FirestoreService] subscribeToInventoryItems error:', err);
        onData([]);
      });
    } catch (err) {
      console.warn('[FirestoreService] subscribeToInventoryItems exception:', err);
      onData([]);
      return () => {};
    }
  }

  /**
   * Fetch all inventory items for a company
   */
  static async getInventoryItems(companyId: string): Promise<InventoryItemRecord[]> {
    try {
      const colRef = collection(db, 'companies', companyId, 'inventory_items');
      const snap = await getDocs(colRef);
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as InventoryItemRecord));
      return list.sort((a, b) => (a.itemName || '').localeCompare(b.itemName || ''));
    } catch (err) {
      console.error('[FirestoreService] getInventoryItems error:', err);
      return [];
    }
  }

  /**
   * Save or Update an Inventory Item
   */
  static async saveInventoryItem(
    companyId: string,
    item: InventoryItemRecord,
    actor: { uid: string; name: string }
  ): Promise<boolean> {
    const path = `companies/${companyId}/inventory_items/${item.id}`;
    try {
      const now = new Date().toISOString();
      const currentStock = Number(item.currentStock) || 0;
      const minThreshold = Number(item.minStockThreshold) || 5;

      let calculatedStatus: InventoryItemRecord['status'] = item.status;
      if (item.status !== 'DISCONTINUED') {
        if (currentStock <= 0) {
          calculatedStatus = 'OUT_OF_STOCK';
        } else if (currentStock <= minThreshold) {
          calculatedStatus = 'LOW_STOCK';
        } else {
          calculatedStatus = 'IN_STOCK';
        }
      }

      const payload: InventoryItemRecord = {
        ...item,
        companyId,
        currentStock,
        minStockThreshold: minThreshold,
        unitCost: Number(item.unitCost) || 0,
        status: calculatedStatus,
        createdAt: item.createdAt || now,
        updatedAt: now
      };

      const docRef = doc(db, 'companies', companyId, 'inventory_items', item.id);
      await setDoc(docRef, payload, { merge: true });

      await this.logAuditEvent(
        companyId,
        actor.uid,
        actor.name,
        'INVENTORY_ITEM_SAVED',
        `Saved item: ${item.itemName} (${item.itemCode}), Stock: ${currentStock} ${item.unit}, Status: ${calculatedStatus}`
      );

      return true;
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
      return false;
    }
  }

  /**
   * Delete an Inventory Item
   */
  static async deleteInventoryItem(
    companyId: string,
    itemId: string,
    actor: { uid: string; name: string }
  ): Promise<boolean> {
    const path = `companies/${companyId}/inventory_items/${itemId}`;
    try {
      const docRef = doc(db, 'companies', companyId, 'inventory_items', itemId);
      await deleteDoc(docRef);

      await this.logAuditEvent(
        companyId,
        actor.uid,
        actor.name,
        'INVENTORY_ITEM_DELETED',
        `Deleted inventory item ID: ${itemId}`
      );

      return true;
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, path);
      return false;
    }
  }

  /**
   * Real-time subscription to stock transactions for a company
   */
  static subscribeToStockTransactions(session: UserSession, companyId: string, onData: (txs: StockTransactionRecord[]) => void
  ): () => void {
    if (!companyId) {
      onData([]);
      return () => {};
    }
    try {
      const colRef = collection(db, 'companies', companyId, 'inventory_transactions');
      return onSnapshot(colRef, (snap) => {
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as StockTransactionRecord));
        list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
        onData(list);
      }, (err) => {
        console.warn('[FirestoreService] subscribeToStockTransactions error:', err);
        onData([]);
      });
    } catch (err) {
      console.warn('[FirestoreService] subscribeToStockTransactions exception:', err);
      onData([]);
      return () => {};
    }
  }

  /**
   * Record Stock Transaction and atomically adjust stock level of item
   */
  static async recordStockTransaction(
    companyId: string,
    transaction: Omit<StockTransactionRecord, 'id' | 'createdAt' | 'previousStock' | 'newStock'>,
    actor: { uid: string; name: string }
  ): Promise<{ success: boolean; transactionId: string; newStock: number }> {
    const txId = `STX-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const now = new Date().toISOString();
    try {
      // 1. Fetch current item details
      const itemRef = doc(db, 'companies', companyId, 'inventory_items', transaction.itemId);
      const itemSnap = await getDoc(itemRef);

      if (!itemSnap.exists()) {
        throw new Error(`Inventory item with ID ${transaction.itemId} not found.`);
      }

      const itemData = itemSnap.data() as InventoryItemRecord;
      const prevStock = Number(itemData.currentStock) || 0;
      const qty = Number(transaction.quantity) || 0;

      let newStock = prevStock;
      switch (transaction.transactionType) {
        case 'PURCHASE_INWARD':
        case 'RETURN_FROM_EMPLOYEE':
          newStock = prevStock + qty;
          break;
        case 'ISSUE_TO_EMPLOYEE':
        case 'DAMAGE_SCRAP':
          if (prevStock < qty) {
            throw new Error(`Insufficient stock for ${itemData.itemName}. Available: ${prevStock}, Requested: ${qty}`);
          }
          newStock = prevStock - qty;
          break;
        case 'SITE_TRANSFER':
          // Reduces from source site stock
          if (prevStock < qty) {
            throw new Error(`Insufficient stock for transfer. Available: ${prevStock}, Requested: ${qty}`);
          }
          newStock = prevStock - qty;
          break;
        case 'AUDIT_ADJUSTMENT':
          // Replaces with audited physical count
          newStock = qty;
          break;
        default:
          newStock = prevStock;
      }

      // Determine updated status
      let newStatus: InventoryItemRecord['status'] = itemData.status;
      if (newStatus !== 'DISCONTINUED') {
        if (newStock <= 0) {
          newStatus = 'OUT_OF_STOCK';
        } else if (newStock <= (itemData.minStockThreshold || 5)) {
          newStatus = 'LOW_STOCK';
        } else {
          newStatus = 'IN_STOCK';
        }
      }

      // Update Inventory Item doc
      await setDoc(itemRef, {
        currentStock: newStock,
        status: newStatus,
        updatedAt: now
      }, { merge: true });

      // Save Transaction Document
      const txPayload: StockTransactionRecord = {
        ...transaction,
        id: txId,
        companyId,
        previousStock: prevStock,
        newStock,
        performedByUid: actor.uid,
        performedByName: actor.name,
        createdAt: now
      };

      const txRef = doc(db, 'companies', companyId, 'inventory_transactions', txId);
      await setDoc(txRef, txPayload);

      // Audit Log
      await this.logAuditEvent(
        companyId,
        actor.uid,
        actor.name,
        `STOCK_${transaction.transactionType}`,
        `Item: ${itemData.itemName} (${itemData.itemCode}), Type: ${transaction.transactionType}, Qty: ${qty}, Stock: ${prevStock} -> ${newStock}`
      );

      return { success: true, transactionId: txId, newStock };
    } catch (err: any) {
      console.error('[FirestoreService] recordStockTransaction error:', err);
      handleFirestoreError(err, OperationType.WRITE, `companies/${companyId}/inventory_transactions/${txId}`);
      return { success: false, transactionId: '', newStock: 0 };
    }
  }

  /**
   * Real-time subscription to vendors for a company
   */
  static subscribeToInventoryVendors(
    companyId: string,
    onData: (vendors: InventoryVendorRecord[]) => void
  ): () => void {
    if (!companyId) {
      onData([]);
      return () => {};
    }
    try {
      const colRef = collection(db, 'companies', companyId, 'vendors');
      return onSnapshot(colRef, (snap) => {
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as InventoryVendorRecord));
        list.sort((a, b) => (a.vendorName || '').localeCompare(b.vendorName || ''));
        onData(list);
      }, (err) => {
        console.warn('[FirestoreService] subscribeToInventoryVendors error:', err);
        onData([]);
      });
    } catch (err) {
      console.warn('[FirestoreService] subscribeToInventoryVendors exception:', err);
      onData([]);
      return () => {};
    }
  }

  /**
   * Save or Update a Vendor
   */
  static async saveInventoryVendor(
    companyId: string,
    vendor: InventoryVendorRecord,
    actor: { uid: string; name: string }
  ): Promise<boolean> {
    const path = `companies/${companyId}/vendors/${vendor.id}`;
    try {
      const now = new Date().toISOString();
      const payload: InventoryVendorRecord = {
        ...vendor,
        companyId,
        createdAt: vendor.createdAt || now,
        updatedAt: now
      };

      const docRef = doc(db, 'companies', companyId, 'vendors', vendor.id);
      await setDoc(docRef, payload, { merge: true });

      await this.logAuditEvent(
        companyId,
        actor.uid,
        actor.name,
        'VENDOR_SAVED',
        `Saved vendor: ${vendor.vendorName} (${vendor.vendorCode}), Contact: ${vendor.contactPerson}`
      );

      return true;
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
      return false;
    }
  }

  /**
   * Delete a Vendor
   */
  static async deleteInventoryVendor(
    companyId: string,
    vendorId: string,
    actor: { uid: string; name: string }
  ): Promise<boolean> {
    const path = `companies/${companyId}/vendors/${vendorId}`;
    try {
      const docRef = doc(db, 'companies', companyId, 'vendors', vendorId);
      await deleteDoc(docRef);

      await this.logAuditEvent(
        companyId,
        actor.uid,
        actor.name,
        'VENDOR_DELETED',
        `Deleted vendor ID: ${vendorId}`
      );

      return true;
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, path);
      return false;
    }
  }

  // ==========================================
  // ASSET TRACKING & LIFECYCLE MANAGEMENT
  // ==========================================

  /**
   * Real-time subscription to Company Assets
   */
  static subscribeToAssets(session: UserSession, companyId: string, onData: (assets: AssetRecord[]) => void
  ): () => void {
    try {
      const colRef = collection(db, 'companies', companyId, 'assets');
      return onSnapshot(colRef, (snap) => {
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as AssetRecord));
        list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
        onData(list);
      }, (err) => {
        console.warn('[FirestoreService] subscribeToAssets error:', err);
        onData([]);
      });
    } catch (err) {
      console.warn('[FirestoreService] subscribeToAssets exception:', err);
      onData([]);
      return () => {};
    }
  }

  /**
   * Save or Update an Asset Record
   */
  static async saveAsset(
    companyId: string,
    asset: AssetRecord,
    actor: { uid: string; name: string }
  ): Promise<boolean> {
    const path = `companies/${companyId}/assets/${asset.id}`;
    try {
      const now = new Date().toISOString();
      const payload: AssetRecord = {
        ...asset,
        companyId,
        createdAt: asset.createdAt || now,
        updatedAt: now
      };

      const docRef = doc(db, 'companies', companyId, 'assets', asset.id);
      await setDoc(docRef, payload, { merge: true });

      await this.logAuditEvent(
        companyId,
        actor.uid,
        actor.name,
        'ASSET_SAVED',
        `Saved asset: ${asset.assetName} (${asset.assetCode}), Category: ${asset.category}, Status: ${asset.status}`
      );

      return true;
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
      return false;
    }
  }

  /**
   * Delete an Asset Record
   */
  static async deleteAsset(
    companyId: string,
    assetId: string,
    actor: { uid: string; name: string }
  ): Promise<boolean> {
    const path = `companies/${companyId}/assets/${assetId}`;
    try {
      const docRef = doc(db, 'companies', companyId, 'assets', assetId);
      await deleteDoc(docRef);

      await this.logAuditEvent(
        companyId,
        actor.uid,
        actor.name,
        'ASSET_DELETED',
        `Deleted asset ID: ${assetId}`
      );

      return true;
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, path);
      return false;
    }
  }

  /**
   * Assign Asset to an Employee / Guard / Custodian (Check-Out)
   */
  static async assignAssetCustody(
    companyId: string,
    asset: AssetRecord,
    assignment: {
      employeeId: string;
      employeeName: string;
      siteId?: string;
      siteName?: string;
      expectedReturnDate?: string;
      condition: AssetCondition;
      remarks?: string;
    },
    actor: { uid: string; name: string }
  ): Promise<boolean> {
    const now = new Date().toISOString();
    const assetPath = `companies/${companyId}/assets/${asset.id}`;

    try {
      // 1. Update Asset Status & Assignment
      const updatedAsset: Partial<AssetRecord> = {
        status: 'ASSIGNED',
        condition: assignment.condition,
        assignedEmployeeId: assignment.employeeId,
        assignedEmployeeName: assignment.employeeName,
        assignedDate: now,
        expectedReturnDate: assignment.expectedReturnDate || '',
        siteId: assignment.siteId || asset.siteId || '',
        siteName: assignment.siteName || asset.siteName || '',
        updatedAt: now
      };

      await setDoc(doc(db, 'companies', companyId, 'assets', asset.id), updatedAsset, { merge: true });

      // 2. Record Custody Movement Ledger
      const movementId = `MOV-${Date.now()}`;
      const movementPayload: AssetMovementHistoryRecord = {
        id: movementId,
        companyId,
        assetId: asset.id,
        assetCode: asset.assetCode,
        assetName: asset.assetName,
        action: 'CHECK_OUT',
        employeeId: assignment.employeeId,
        employeeName: assignment.employeeName,
        siteId: assignment.siteId || asset.siteId,
        siteName: assignment.siteName || asset.siteName,
        conditionAtAction: assignment.condition,
        performedByUid: actor.uid,
        performedByName: actor.name,
        remarks: assignment.remarks || `Issued to ${assignment.employeeName}`,
        timestamp: now
      };

      await setDoc(doc(db, 'companies', companyId, 'asset_movements', movementId), movementPayload);

      // 3. Audit Log
      await this.logAuditEvent(
        companyId,
        actor.uid,
        actor.name,
        'ASSET_CHECK_OUT',
        `Issued asset ${asset.assetName} (${asset.assetCode}) to ${assignment.employeeName}`
      );

      return true;
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, assetPath);
      return false;
    }
  }

  /**
   * Return Asset from Employee / Guard / Custodian (Check-In)
   */
  static async returnAssetCustody(
    companyId: string,
    asset: AssetRecord,
    returnDetails: {
      condition: AssetCondition;
      warehouseLocation?: string;
      siteId?: string;
      siteName?: string;
      remarks?: string;
      sendToMaintenance?: boolean;
    },
    actor: { uid: string; name: string }
  ): Promise<boolean> {
    const now = new Date().toISOString();
    const assetPath = `companies/${companyId}/assets/${asset.id}`;

    try {
      const prevEmployeeName = asset.assignedEmployeeName || 'Custodian';
      const prevEmployeeId = asset.assignedEmployeeId || '';

      // 1. Update Asset Status & Clear Custody
      const updatedAsset: Partial<AssetRecord> = {
        status: returnDetails.sendToMaintenance ? 'UNDER_MAINTENANCE' : 'AVAILABLE',
        condition: returnDetails.condition,
        assignedEmployeeId: '',
        assignedEmployeeName: '',
        assignedDate: '',
        expectedReturnDate: '',
        warehouseLocation: returnDetails.warehouseLocation || asset.warehouseLocation || 'Main Store',
        siteId: returnDetails.siteId || asset.siteId || '',
        siteName: returnDetails.siteName || asset.siteName || '',
        updatedAt: now
      };

      await setDoc(doc(db, 'companies', companyId, 'assets', asset.id), updatedAsset, { merge: true });

      // 2. Record Custody Movement Ledger
      const movementId = `MOV-${Date.now()}`;
      const movementPayload: AssetMovementHistoryRecord = {
        id: movementId,
        companyId,
        assetId: asset.id,
        assetCode: asset.assetCode,
        assetName: asset.assetName,
        action: 'CHECK_IN',
        employeeId: prevEmployeeId,
        employeeName: prevEmployeeName,
        siteId: returnDetails.siteId || asset.siteId,
        siteName: returnDetails.siteName || asset.siteName,
        conditionAtAction: returnDetails.condition,
        performedByUid: actor.uid,
        performedByName: actor.name,
        remarks: returnDetails.remarks || `Returned from ${prevEmployeeName}`,
        timestamp: now
      };

      await setDoc(doc(db, 'companies', companyId, 'asset_movements', movementId), movementPayload);

      // 3. Audit Log
      await this.logAuditEvent(
        companyId,
        actor.uid,
        actor.name,
        'ASSET_CHECK_IN',
        `Returned asset ${asset.assetName} (${asset.assetCode}) from ${prevEmployeeName}, Condition: ${returnDetails.condition}`
      );

      return true;
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, assetPath);
      return false;
    }
  }

  /**
   * Physical Verification / Barcode Scan Audit
   */
  static async recordPhysicalAssetAudit(
    companyId: string,
    asset: AssetRecord,
    auditData: {
      condition: AssetCondition;
      verifiedLocation: string;
      notes?: string;
    },
    actor: { uid: string; name: string }
  ): Promise<boolean> {
    const now = new Date().toISOString();
    const assetPath = `companies/${companyId}/assets/${asset.id}`;

    try {
      const updatedAsset: Partial<AssetRecord> = {
        condition: auditData.condition,
        lastAuditDate: now,
        lastAuditedBy: actor.name,
        warehouseLocation: auditData.verifiedLocation,
        updatedAt: now
      };

      await setDoc(doc(db, 'companies', companyId, 'assets', asset.id), updatedAsset, { merge: true });

      // Record Audit Movement
      const movementId = `AUD-${Date.now()}`;
      const movementPayload: AssetMovementHistoryRecord = {
        id: movementId,
        companyId,
        assetId: asset.id,
        assetCode: asset.assetCode,
        assetName: asset.assetName,
        action: 'AUDIT_VERIFIED',
        siteId: asset.siteId,
        siteName: asset.siteName,
        conditionAtAction: auditData.condition,
        performedByUid: actor.uid,
        performedByName: actor.name,
        remarks: auditData.notes || `Physical verification completed at ${auditData.verifiedLocation}`,
        timestamp: now
      };

      await setDoc(doc(db, 'companies', companyId, 'asset_movements', movementId), movementPayload);

      await this.logAuditEvent(
        companyId,
        actor.uid,
        actor.name,
        'ASSET_AUDITED',
        `Physically verified asset ${asset.assetName} (${asset.assetCode})`
      );

      return true;
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, assetPath);
      return false;
    }
  }

  /**
   * Log Asset Maintenance / Calibration / Repair
   */
  static async recordAssetMaintenance(
    companyId: string,
    maintenance: Omit<AssetMaintenanceRecord, 'id' | 'createdAt'>,
    asset: AssetRecord,
    statusTransition: 'UNDER_MAINTENANCE' | 'AVAILABLE',
    actor: { uid: string; name: string }
  ): Promise<boolean> {
    const now = new Date().toISOString();
    const maintenanceId = `MNT-${Date.now()}`;
    const payload: AssetMaintenanceRecord = {
      ...maintenance,
      id: maintenanceId,
      companyId,
      createdAt: now
    };

    try {
      // 1. Save Maintenance Record
      await setDoc(doc(db, 'companies', companyId, 'asset_maintenance', maintenanceId), payload);

      // 2. Update Asset
      const updatedAsset: Partial<AssetRecord> = {
        status: statusTransition,
        nextMaintenanceDate: maintenance.nextServiceDate || '',
        updatedAt: now
      };

      await setDoc(doc(db, 'companies', companyId, 'assets', asset.id), updatedAsset, { merge: true });

      // 3. Record Movement Action
      const movementId = `MNT-MOV-${Date.now()}`;
      const actionType: AssetMovementAction = statusTransition === 'UNDER_MAINTENANCE' ? 'MAINTENANCE_OUT' : 'MAINTENANCE_IN';
      const movementPayload: AssetMovementHistoryRecord = {
        id: movementId,
        companyId,
        assetId: asset.id,
        assetCode: asset.assetCode,
        assetName: asset.assetName,
        action: actionType,
        conditionAtAction: asset.condition,
        performedByUid: actor.uid,
        performedByName: actor.name,
        remarks: `${maintenance.serviceType}: ${maintenance.actionTaken || maintenance.issueDescription} (${maintenance.serviceVendor})`,
        timestamp: now
      };

      await setDoc(doc(db, 'companies', companyId, 'asset_movements', movementId), movementPayload);

      // 4. Audit Log
      await this.logAuditEvent(
        companyId,
        actor.uid,
        actor.name,
        'ASSET_MAINTENANCE',
        `Logged ${maintenance.serviceType} for ${asset.assetName} (${asset.assetCode}) - Cost: ₹${maintenance.serviceCost}`
      );

      return true;
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `companies/${companyId}/asset_maintenance/${maintenanceId}`);
      return false;
    }
  }

  /**
   * Real-time subscription to Company Sites
   */
  static subscribeToSites(
    companyId: string,
    onData: (sites: SiteRecord[]) => void
  ): () => void {
    try {
      const colRef = collection(db, 'companies', companyId, 'sites');
      return onSnapshot(colRef, (snap) => {
        const sites = snap.docs.map(d => ({ id: d.id, ...d.data() } as SiteRecord));
        onData(sites);
      }, (err) => {
        console.warn('[FirestoreService] subscribeToSites error:', err);
        onData([]);
      });
    } catch (e) {
      console.warn('[FirestoreService] subscribeToSites exception:', e);
      onData([]);
      return () => {};
    }
  }

  /**
   * Real-time subscription to Asset Movements
   */
  static subscribeToAssetMovements(
    companyId: string,
    onData: (movements: AssetMovementHistoryRecord[]) => void
  ): () => void {
    try {
      const colRef = collection(db, 'companies', companyId, 'asset_movements');
      return onSnapshot(colRef, (snap) => {
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as AssetMovementHistoryRecord));
        list.sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));
        onData(list);
      }, (err) => {
        console.warn('[FirestoreService] subscribeToAssetMovements error:', err);
        onData([]);
      });
    } catch (err) {
      console.warn('[FirestoreService] subscribeToAssetMovements exception:', err);
      onData([]);
      return () => {};
    }
  }

  /**
   * Real-time subscription to Asset Maintenance records
   */
  static subscribeToAssetMaintenance(
    companyId: string,
    onData: (records: AssetMaintenanceRecord[]) => void
  ): () => void {
    try {
      const colRef = collection(db, 'companies', companyId, 'asset_maintenance');
      return onSnapshot(colRef, (snap) => {
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as AssetMaintenanceRecord));
        list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
        onData(list);
      }, (err) => {
        console.warn('[FirestoreService] subscribeToAssetMaintenance error:', err);
        onData([]);
      });
    } catch (err) {
      console.warn('[FirestoreService] subscribeToAssetMaintenance exception:', err);
      onData([]);
      return () => {};
    }
  }
}

// Indian Rupee Words Helper Function
function numberToIndianRupeesWords(amount: number): string {
  if (amount === 0) return 'Zero Rupees Only';
  const units = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function convertChunk(n: number): string {
    let str = '';
    if (n >= 100) {
      str += units[Math.floor(n / 100)] + ' Hundred ';
      n %= 100;
    }
    if (n >= 20) {
      str += tens[Math.floor(n / 10)] + ' ';
      n %= 10;
    }
    if (n > 0) {
      str += units[n] + ' ';
    }
    return str.trim();
  }

  let num = Math.floor(amount);
  let crore = Math.floor(num / 10000000);
  num %= 10000000;
  let lakh = Math.floor(num / 100000);
  num %= 100000;
  let thousand = Math.floor(num / 1000);
  num %= 1000;
  let remainder = num;

  let result = '';
  if (crore > 0) result += convertChunk(crore) + ' Crore ';
  if (lakh > 0) result += convertChunk(lakh) + ' Lakh ';
  if (thousand > 0) result += convertChunk(thousand) + ' Thousand ';
  if (remainder > 0) result += convertChunk(remainder) + ' ';

  return (result.trim() + ' Rupees Only').replace(/\s+/g, ' ');
}

