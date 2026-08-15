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
  VendorRecord
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
  
  static subscribeToEmployees(
    companyId: string,
    onData: (employees: EmployeeRecord[]) => void
  ): () => void {
    if (companyId === 'TEST-COMP') {
      import('./mockDataGenerators').then(module => {
        onData(module.generateMockEmployees());
      });
      return () => {};
    }

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
  static subscribeToShifts(
    companyId: string,
    onData: (shifts: ShiftRecord[]) => void
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
  static subscribeToAttendanceLogs(
    companyId: string,
    onData: (logs: AttendanceLogRecord[]) => void
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
  static subscribeToPatrolLogs(
    companyId: string,
    onData: (logs: PatrolLogRecord[]) => void
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
  static subscribeToIncidentReports(
    companyId: string,
    onData: (reports: IncidentReportRecord[]) => void
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
  static subscribeToVisitorLogs(
    companyId: string,
    onData: (visitors: VisitorLogRecord[]) => void
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
  static subscribeToMaterialLogs(
    companyId: string,
    onData: (materials: MaterialMovementRecord[]) => void
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
  static subscribeToDailySiteLogs(
    companyId: string,
    onData: (siteLogs: DailySiteLogRecord[]) => void
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

  static subscribeToApprovalRequests(
    companyId: string,
    onData: (requests: ApprovalRequestRecord[]) => void
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

      // 5. Create Company Admin user account record
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
        assignedSiteId: 'HQ',
        createdBy: createdByUid,
        createdAt: timestamp,
        updatedAt: timestamp
      }, { merge: true });

      // 6. Log Audit Event
      await this.logAuditEvent(
        cleanCompanyId,
        createdByUid,
        createdByName,
        'CREATE_COMPANY',
        `Created company ${company.brandName} (${cleanCompanyId}) with Admin ${adminInfo.email} and ${enabledModules.length} enabled modules.`
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
}

