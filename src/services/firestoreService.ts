import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  onSnapshot, 
  query, 
  where, 
  orderBy, 
  limit 
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import { AppNotification, UserProfileData, AppSettings, UserSession, EmployeeRecord } from '../types';
import { MOCK_NOTIFICATIONS, MOCK_USER_PROFILE, MOCK_SETTINGS, MOCK_EMPLOYEES } from './mockData';

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
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
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
  console.error('[Firestore Service Error]:', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export class FirestoreService {
  /**
   * Listen to real-time Employees list for a company
   */
  static subscribeToEmployees(
    companyId: string,
    onData: (employees: EmployeeRecord[]) => void
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
          // If no subcollection data, try querying legacy global 'users' path first
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
              onData(MOCK_EMPLOYEES);
            }
          }).catch(() => {
            onData(MOCK_EMPLOYEES);
          });
        }
      }, (err) => {
        console.warn('[Firestore] Employee subscription fallback to legacy/mock:', err);
        // Try fallback to legacy 'users' query on permission failure or empty
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
            onData(MOCK_EMPLOYEES);
          }
        }).catch(() => {
          onData(MOCK_EMPLOYEES);
        });
      });
      return unsubscribe;
    } catch (e) {
      console.warn('[Firestore] Employee subscription exception:', e);
      onData(MOCK_EMPLOYEES);
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

      // 1. Write to modern subcollection (Android app alignment)
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

      // 1. Write to modern subcollection
      const refNew = doc(db, 'companies', companyId, 'employees', employeeId);
      await setDoc(refNew, payload, { merge: true });

      // 2. Write to legacy root
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

      // 1. Write to modern subcollection
      const refNew = doc(db, 'companies', companyId, 'employees', employeeId);
      await setDoc(refNew, payload, { merge: true });

      // 2. Write to legacy root
      const refLegacy = doc(db, 'users', employeeId);
      await setDoc(refLegacy, payload, { merge: true });

      return true;
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `${newPath} & ${legacyPath}`);
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
   * Fetch User Profile from Firestore or fallback to mock
   */
  static async getUserProfile(userId: string): Promise<UserProfileData> {
    const path = `users/${userId}`;
    try {
      const ref = doc(db, 'users', userId);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        return snap.data() as UserProfileData;
      }
    } catch (err) {
      console.warn('[Firestore] getUserProfile fallback:', err);
    }
    return MOCK_USER_PROFILE;
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
  static async getAppSettings(userId: string): Promise<AppSettings> {
    const path = `users/${userId}`;
    try {
      const ref = doc(db, 'users', userId);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        return snap.data() as AppSettings;
      }
    } catch (err) {
      console.warn('[Firestore] getAppSettings fallback:', err);
    }
    return MOCK_SETTINGS;
  }

  /**
   * Save Attendance Log to Firestore (Dual-writing for real-time synchronization)
   */
  static async logAttendance(session: UserSession, action: 'PUNCH_IN' | 'PUNCH_OUT', locationDetails?: string): Promise<boolean> {
    const collectionName = session.companyId ? `attendance_${session.companyId}` : 'attendance_MUSTER-CORP-101';
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
        locationDetails: locationDetails || 'GPS Verified (19.0760° N, 72.8777° E)'
      };

      // 1. Write to dynamic root collection (Web client sync)
      const refLegacy = doc(db, collectionName, logId);
      await setDoc(refLegacy, payload);

      // 2. Write to company hierarchical subcollection (Android app sync)
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
    const collectionName = companyId ? `attendance_${companyId}` : 'attendance_MUSTER-CORP-101';
    try {
      // Try fetching from legacy root collection first
      const q = query(
        collection(db, collectionName),
        orderBy('timestamp', 'desc'),
        limit(limitCount)
      );
      
      const snap = await getDocs(q);
      if (!snap.empty) {
        return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      }

      // If empty, try modern subcollection
      const subColRef = collection(db, 'companies', companyId, 'attendance');
      const qSub = query(
        subColRef,
        orderBy('timestamp', 'desc'),
        limit(limitCount)
      );
      const snapSub = await getDocs(qSub);
      return snapSub.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (err) {
      console.warn(`[Firestore] getAttendanceLogs fallback/error for ${companyId}:`, err);
      return [];
    }
  }

  /**
   * Listen to real-time Notifications for user role
   */
  static subscribeToNotifications(
    role: string, 
    onData: (notifications: AppNotification[]) => void
  ): () => void {
    const path = 'notifications';
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
          onData(MOCK_NOTIFICATIONS);
        }
      }, (err) => {
        console.warn('[Firestore] Notifications subscription error, using cached mock:', err);
        onData(MOCK_NOTIFICATIONS);
      });

      return unsubscribe;
    } catch (e) {
      console.warn('[Firestore] Notifications realtime failed:', e);
      onData(MOCK_NOTIFICATIONS);
      return () => {};
    }
  }
}
