const fs = require('fs');
const file = 'src/services/firestoreService.ts';
let content = fs.readFileSync(file, 'utf8');

const newMethods = `
  /**
   * ============================================================
   * LEAVE MANAGEMENT METHODS
   * ============================================================
   */

  static subscribeToLeavePolicies(
    session: UserSession,
    companyId: string,
    onData: (data: import('../types').LeavePolicyRecord[]) => void
  ): () => void {
    const colRef = collection(db, 'companies', companyId, 'leavePolicies');
    return onSnapshot(colRef, (snap) => {
      onData(snap.docs.map(d => ({ id: d.id, ...d.data() } as import('../types').LeavePolicyRecord)));
    }, (err) => {
      console.warn('[Firestore] subscribeToLeavePolicies error:', err);
      onData([]);
    });
  }

  static async saveLeavePolicy(companyId: string, policy: import('../types').LeavePolicyRecord): Promise<boolean> {
    try {
      const ref = doc(db, 'companies', companyId, 'leavePolicies', policy.id);
      await setDoc(ref, { ...policy, companyId, updatedAt: new Date().toISOString() }, { merge: true });
      return true;
    } catch (err) {
      console.error('[Firestore] saveLeavePolicy error:', err);
      return false;
    }
  }

  static async getHolidays(companyId: string): Promise<import('../types').HolidayRecord[]> {
    try {
      const colRef = collection(db, 'companies', companyId, 'holidays');
      const snap = await getDocs(colRef);
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as import('../types').HolidayRecord));
    } catch (err) {
      console.warn('[Firestore] getHolidays error:', err);
      return [];
    }
  }

  static async getAttendanceRecords(companyId: string): Promise<import('../types').AttendanceRecord[]> {
    try {
      const colRef = collection(db, 'companies', companyId, 'attendance');
      const snap = await getDocs(colRef);
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as import('../types').AttendanceRecord));
    } catch (err) {
      console.warn('[Firestore] getAttendanceRecords error:', err);
      return [];
    }
  }

  static async createAbsenceRegularization(companyId: string, data: import('../types').AbsenceRegularizationRecord): Promise<boolean> {
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
    onData: (data: import('../types').LeaveRequestRecord[]) => void
  ): () => void {
    const colRef = collection(db, 'companies', companyId, 'leaveRequests');
    // Using simple query without full RBAC engine for compilation sake for now
    // Actually we should apply QueryScopeEngine, let's do it:
    try {
      const q = query(colRef, ...QueryScopeEngine.buildScope(session, 'LEAVE'));
      return onSnapshot(q, (snap) => {
        onData(snap.docs.map(d => ({ id: d.id, ...d.data() } as import('../types').LeaveRequestRecord)));
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
    onData: (data: import('../types').LeaveBalanceRecord[]) => void
  ): () => void {
    const colRef = collection(db, 'companies', companyId, 'leaveBalances');
    const q = query(colRef, where('employeeId', '==', employeeId));
    return onSnapshot(q, (snap) => {
      onData(snap.docs.map(d => ({ id: d.id, ...d.data() } as import('../types').LeaveBalanceRecord)));
    }, (err) => {
      console.warn('[Firestore] subscribeToLeaveBalances error:', err);
      onData([]);
    });
  }

  static async submitLeaveRequest(companyId: string, request: import('../types').LeaveRequestRecord): Promise<boolean> {
    try {
      const ref = doc(db, 'companies', companyId, 'leaveRequests', request.id);
      await setDoc(ref, { ...request, companyId, updatedAt: new Date().toISOString() });
      return true;
    } catch (err) {
      console.error('[Firestore] submitLeaveRequest error:', err);
      return false;
    }
  }

  static async updateLeaveRequestStatus(companyId: string, requestId: string, status: string, updates: Partial<import('../types').LeaveRequestRecord>): Promise<boolean> {
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

// Insert before the last closing brace
content = content.replace(/}\s*$/, newMethods + '\n}');
fs.writeFileSync(file, content);
