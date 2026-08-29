const fs = require('fs');
const file = 'src/services/firestoreService.ts';
let content = fs.readFileSync(file, 'utf8');

const marker = '  /**\n   * ============================================================\n   * LEAVE MANAGEMENT METHODS';

const parts = content.split(marker);
if (parts.length === 2) {
  let goodContent = parts[0];
  content = goodContent.trimEnd() + '\n}\n';
  
  const newMethods = `
  /**
   * ============================================================
   * LEAVE MANAGEMENT METHODS
   * ============================================================
   */

  static subscribeToLeavePolicies(
    session: UserSession,
    companyId: string,
    onData: (data: LeavePolicyRecord[]) => void
  ): () => void {
    const colRef = collection(db, 'companies', companyId, 'leavePolicies');
    return onSnapshot(colRef, (snap) => {
      onData(snap.docs.map(d => ({ id: d.id, ...d.data() } as LeavePolicyRecord)));
    }, (err) => {
      console.warn('[Firestore] subscribeToLeavePolicies error:', err);
      onData([]);
    });
  }

  static async saveLeavePolicy(companyId: string, policy: LeavePolicyRecord): Promise<boolean> {
    try {
      const ref = doc(db, 'companies', companyId, 'leavePolicies', policy.id);
      await setDoc(ref, { ...policy, companyId, updatedAt: new Date().toISOString() }, { merge: true });
      return true;
    } catch (err) {
      console.error('[Firestore] saveLeavePolicy error:', err);
      return false;
    }
  }

  static async getHolidays(companyId: string): Promise<HolidayRecord[]> {
    try {
      const colRef = collection(db, 'companies', companyId, 'holidays');
      const snap = await getDocs(colRef);
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as HolidayRecord));
    } catch (err) {
      console.warn('[Firestore] getHolidays error:', err);
      return [];
    }
  }

  static async getAttendanceRecords(companyId: string): Promise<AttendanceRecord[]> {
    try {
      const colRef = collection(db, 'companies', companyId, 'attendance');
      const snap = await getDocs(colRef);
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as AttendanceRecord));
    } catch (err) {
      console.warn('[Firestore] getAttendanceRecords error:', err);
      return [];
    }
  }

  static async createAbsenceRegularization(companyId: string, data: AbsenceRegularizationRecord): Promise<boolean> {
    try {
      const ref = doc(db, 'companies', companyId, 'absenceRegularizations', data.id);
      await setDoc(ref, { ...data, companyId, updatedAt: new Date().toISOString() });
      return true;
    } catch (err) {
      console.error('[Firestore] createAbsenceRegularization error:', err);
      return false;
    }
  }

  static subscribeToLeaveRequests(
    session: UserSession,
    companyId: string,
    onData: (data: LeaveRequestRecord[]) => void
  ): () => void {
    const colRef = collection(db, 'companies', companyId, 'leaveRequests');
    try {
      const q = query(colRef, ...QueryScopeEngine.buildScope(session, 'LEAVE'));
      return onSnapshot(q, (snap) => {
        onData(snap.docs.map(d => ({ id: d.id, ...d.data() } as LeaveRequestRecord)));
      }, (err) => {
        console.warn('[Firestore] subscribeToLeaveRequests error:', err);
        onData([]);
      });
    } catch (e) {
      console.warn('[Firestore] subscribeToLeaveRequests exception:', e);
      onData([]);
      return () => {};
    }
  }

  static subscribeToLeaveBalances(
    session: UserSession,
    companyId: string,
    employeeId: string,
    onData: (data: LeaveBalanceRecord[]) => void
  ): () => void {
    const colRef = collection(db, 'companies', companyId, 'leaveBalances');
    const q = query(colRef, where('employeeId', '==', employeeId));
    return onSnapshot(q, (snap) => {
      onData(snap.docs.map(d => ({ id: d.id, ...d.data() } as LeaveBalanceRecord)));
    }, (err) => {
      console.warn('[Firestore] subscribeToLeaveBalances error:', err);
      onData([]);
    });
  }

  static async submitLeaveRequest(companyId: string, request: LeaveRequestRecord): Promise<boolean> {
    try {
      const ref = doc(db, 'companies', companyId, 'leaveRequests', request.id);
      await setDoc(ref, { ...request, companyId, updatedAt: new Date().toISOString() });
      return true;
    } catch (err) {
      console.error('[Firestore] submitLeaveRequest error:', err);
      return false;
    }
  }

  static async updateLeaveRequestStatus(companyId: string, requestId: string, status: string, updates: Partial<LeaveRequestRecord>): Promise<boolean> {
    try {
      const ref = doc(db, 'companies', companyId, 'leaveRequests', requestId);
      await updateDoc(ref, { status, ...updates, updatedAt: new Date().toISOString() });
      return true;
    } catch (err) {
      console.error('[Firestore] updateLeaveRequestStatus error:', err);
      return false;
    }
  }
`;
  
  const insertMarker = '} // <- this is the closing brace for the class';
  if (content.includes(insertMarker)) {
    content = content.replace(insertMarker, newMethods + '\n' + insertMarker);
    fs.writeFileSync(file, content);
    console.log('Successfully moved LEAVE MANAGEMENT METHODS');
  } else {
    console.log('Failed to find insertion point');
  }
} else {
  console.log('Marker not found, maybe already fixed?');
}
