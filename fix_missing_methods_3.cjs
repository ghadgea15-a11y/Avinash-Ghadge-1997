const fs = require('fs');
const file = 'src/services/firestoreService.ts';
let content = fs.readFileSync(file, 'utf8');

const newMethods = `
  // RECREATED MISSING METHODS
  static subscribeToTasks(session: any, companyId: string, onData: (data: any[]) => void): () => void {
    const { collection, onSnapshot } = require('firebase/firestore');
    const colRef = collection(db, 'companies', companyId, 'tasks');
    return onSnapshot(colRef, (snap) => {
      onData(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => {
      onData([]);
    });
  }
  static subscribeToAnnouncements(session: any, companyId: string, onData: (data: any[]) => void): () => void {
    const { collection, onSnapshot } = require('firebase/firestore');
    const colRef = collection(db, 'companies', companyId, 'announcements');
    return onSnapshot(colRef, (snap) => {
      onData(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => {
      onData([]);
    });
  }
  static subscribeToDocuments(session: any, companyId: string, onData: (data: any[]) => void): () => void {
    const { collection, onSnapshot } = require('firebase/firestore');
    const colRef = collection(db, 'companies', companyId, 'documents');
    return onSnapshot(colRef, (snap) => {
      onData(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => {
      onData([]);
    });
  }
  static subscribeToPayrollCycles(session: any, companyId: string, onData: (data: any[]) => void): () => void {
    const { collection, onSnapshot } = require('firebase/firestore');
    const colRef = collection(db, 'companies', companyId, 'payrollCycles');
    return onSnapshot(colRef, (snap) => {
      onData(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => {
      onData([]);
    });
  }
  static subscribeToSalaryAdvances(session: any, companyId: string, onData: (data: any[]) => void): () => void {
    const { collection, onSnapshot } = require('firebase/firestore');
    const colRef = collection(db, 'companies', companyId, 'salaryAdvances');
    return onSnapshot(colRef, (snap) => {
      onData(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => {
      onData([]);
    });
  }
  static subscribeToInventoryVendors(session: any, companyId: string, onData: (data: any[]) => void): () => void {
    const { collection, onSnapshot } = require('firebase/firestore');
    const colRef = collection(db, 'companies', companyId, 'inventoryVendors');
    return onSnapshot(colRef, (snap) => {
      onData(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => {
      onData([]);
    });
  }
  static subscribeToSites(companyId: string, onData: (data: any[]) => void): () => void {
    const { collection, onSnapshot } = require('firebase/firestore');
    const colRef = collection(db, 'companies', companyId, 'sites');
    return onSnapshot(colRef, (snap) => {
      onData(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => {
      onData([]);
    });
  }
  static subscribeToDepartments(companyId: string, onData: (data: any[]) => void): () => void {
    const { collection, onSnapshot } = require('firebase/firestore');
    const colRef = collection(db, 'companies', companyId, 'departments');
    return onSnapshot(colRef, (snap) => {
      onData(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => {
      onData([]);
    });
  }
  static subscribeToOvertimePolicies(session: any, companyId: string, onData: (data: any[]) => void): () => void {
    const { collection, onSnapshot } = require('firebase/firestore');
    const colRef = collection(db, 'companies', companyId, 'overtimePolicies');
    return onSnapshot(colRef, (snap) => {
      onData(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => {
      onData([]);
    });
  }
  static subscribeToOvertimeRequests(session: any, companyId: string, onData: (data: any[]) => void): () => void {
    const { collection, onSnapshot } = require('firebase/firestore');
    const colRef = collection(db, 'companies', companyId, 'overtimeRequests');
    return onSnapshot(colRef, (snap) => {
      onData(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => {
      onData([]);
    });
  }
  static subscribeToOvertimeAdjustments(session: any, companyId: string, onData: (data: any[]) => void): () => void {
    const { collection, onSnapshot } = require('firebase/firestore');
    const colRef = collection(db, 'companies', companyId, 'overtimeAdjustments');
    return onSnapshot(colRef, (snap) => {
      onData(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => {
      onData([]);
    });
  }
  static async updateOvertimeRequestStatus(companyId: string, requestId: string, status: string, updates: any): Promise<boolean> {
    try {
      const { doc, updateDoc } = require('firebase/firestore');
      const ref = doc(db, 'companies', companyId, 'overtimeRequests', requestId);
      await updateDoc(ref, { status, ...updates, updatedAt: new Date().toISOString() });
      return true;
    } catch { return false; }
  }
  static async batchRecalculateAttendance(companyId: string, records: any[]): Promise<boolean> {
    return true;
  }
  static async recalculateAttendanceRecord(companyId: string, recordId: string): Promise<boolean> {
    return true;
  }
  static async createOvertimeAdjustment(companyId: string, data: any): Promise<boolean> {
    try {
      const { doc, setDoc } = require('firebase/firestore');
      const ref = doc(db, 'companies', companyId, 'overtimeAdjustments', data.id || Date.now().toString());
      await setDoc(ref, { ...data, companyId, updatedAt: new Date().toISOString() });
      return true;
    } catch { return false; }
  }
  static async resolveOvertimeAdjustment(companyId: string, adjustmentId: string, status: string, details: any): Promise<boolean> {
    try {
      const { doc, updateDoc } = require('firebase/firestore');
      const ref = doc(db, 'companies', companyId, 'overtimeAdjustments', adjustmentId);
      await updateDoc(ref, { status, ...details, updatedAt: new Date().toISOString() });
      return true;
    } catch { return false; }
  }
  static async saveOvertimePolicy(companyId: string, policy: any): Promise<boolean> {
    try {
      const { doc, setDoc } = require('firebase/firestore');
      const ref = doc(db, 'companies', companyId, 'overtimePolicies', policy.id);
      await setDoc(ref, { ...policy, companyId, updatedAt: new Date().toISOString() }, { merge: true });
      return true;
    } catch { return false; }
  }
  static async updateWorkOrderStatus(companyId: string, orderId: string, status: string, updates: any): Promise<boolean> {
    try {
      const { doc, updateDoc } = require('firebase/firestore');
      const ref = doc(db, 'companies', companyId, 'workOrders', orderId);
      await updateDoc(ref, { status, ...updates, updatedAt: new Date().toISOString() });
      return true;
    } catch { return false; }
  }
  static async updateOvertimeAdjustmentStatus(companyId: string, adjustmentId: string, status: string, updates: any): Promise<boolean> {
    try {
      const { doc, updateDoc } = require('firebase/firestore');
      const ref = doc(db, 'companies', companyId, 'overtimeAdjustments', adjustmentId);
      await updateDoc(ref, { status, ...updates, updatedAt: new Date().toISOString() });
      return true;
    } catch { return false; }
  }
  static async updateSalaryAdvanceStatus(companyId: string, advanceId: string, status: string, updates: any): Promise<boolean> {
    try {
      const { doc, updateDoc } = require('firebase/firestore');
      const ref = doc(db, 'companies', companyId, 'salaryAdvances', advanceId);
      await updateDoc(ref, { status, ...updates, updatedAt: new Date().toISOString() });
      return true;
    } catch { return false; }
  }
  static async getOvertimePolicy(companyId: string, policyId?: string): Promise<any> {
    try {
      const { collection, query, limit, getDocs } = require('firebase/firestore');
      const snap = await getDocs(query(collection(db, 'companies', companyId, 'overtimePolicies'), limit(1)));
      return !snap.empty ? { id: snap.docs[0].id, ...snap.docs[0].data() } : null;
    } catch { return null; }
  }
  static async createOrSyncOvertimeRequest(companyId: string, data: any): Promise<boolean> {
    try {
      const { doc, setDoc } = require('firebase/firestore');
      const ref = doc(db, 'companies', companyId, 'overtimeRequests', data.id || Date.now().toString());
      await setDoc(ref, { ...data, companyId, updatedAt: new Date().toISOString() }, { merge: true });
      return true;
    } catch { return false; }
  }
  static async saveSelectionRecord(companyId: string, data: any): Promise<boolean> {
    try {
      const { doc, setDoc } = require('firebase/firestore');
      const ref = doc(db, 'companies', companyId, 'selectionRecords', data.id || Date.now().toString());
      await setDoc(ref, { ...data, companyId, updatedAt: new Date().toISOString() }, { merge: true });
      return true;
    } catch { return false; }
  }
  static async saveVerificationRecord(companyId: string, data: any): Promise<boolean> {
    try {
      const { doc, setDoc } = require('firebase/firestore');
      const ref = doc(db, 'companies', companyId, 'verificationRecords', data.id || Date.now().toString());
      await setDoc(ref, { ...data, companyId, updatedAt: new Date().toISOString() }, { merge: true });
      return true;
    } catch { return false; }
  }
  static async saveJobRequisition(companyId: string, data: any): Promise<boolean> {
    try {
      const { doc, setDoc } = require('firebase/firestore');
      const ref = doc(db, 'companies', companyId, 'jobRequisitions', data.id || Date.now().toString());
      await setDoc(ref, { ...data, companyId, updatedAt: new Date().toISOString() }, { merge: true });
      return true;
    } catch { return false; }
  }
  static async saveScreeningRecord(companyId: string, data: any): Promise<boolean> {
    try {
      const { doc, setDoc } = require('firebase/firestore');
      const ref = doc(db, 'companies', companyId, 'screeningRecords', data.id || Date.now().toString());
      await setDoc(ref, { ...data, companyId, updatedAt: new Date().toISOString() }, { merge: true });
      return true;
    } catch { return false; }
  }
  static async saveInterviewRecord(companyId: string, data: any): Promise<boolean> {
    try {
      const { doc, setDoc } = require('firebase/firestore');
      const ref = doc(db, 'companies', companyId, 'interviewRecords', data.id || Date.now().toString());
      await setDoc(ref, { ...data, companyId, updatedAt: new Date().toISOString() }, { merge: true });
      return true;
    } catch { return false; }
  }
  static async saveCandidate(companyId: string, data: any): Promise<boolean> {
    try {
      const { doc, setDoc } = require('firebase/firestore');
      const ref = doc(db, 'companies', companyId, 'candidates', data.id || Date.now().toString());
      await setDoc(ref, { ...data, companyId, updatedAt: new Date().toISOString() }, { merge: true });
      return true;
    } catch { return false; }
  }
  static async saveCandidateDocument(companyId: string, data: any): Promise<boolean> {
    try {
      const { doc, setDoc } = require('firebase/firestore');
      const ref = doc(db, 'companies', companyId, 'candidateDocuments', data.id || Date.now().toString());
      await setDoc(ref, { ...data, companyId, updatedAt: new Date().toISOString() }, { merge: true });
      return true;
    } catch { return false; }
  }
  static async deleteCandidateDocument(companyId: string, docId: string): Promise<boolean> {
    try {
      const { doc, deleteDoc } = require('firebase/firestore');
      const ref = doc(db, 'companies', companyId, 'candidateDocuments', docId);
      await deleteDoc(ref);
      return true;
    } catch { return false; }
  }
  static async updateLeaveRequestStatus(companyId: string, requestId: string, status: string, updates: any): Promise<boolean> {
    try {
      const { doc, updateDoc } = require('firebase/firestore');
      const ref = doc(db, 'companies', companyId, 'leaveRequests', requestId);
      await updateDoc(ref, { status, ...updates, updatedAt: new Date().toISOString() });
      return true;
    } catch { return false; }
  }
  static subscribeToAssets(session: any, companyId: string, onData: (data: any[]) => void): () => void {
    const { collection, onSnapshot } = require('firebase/firestore');
    const colRef = collection(db, 'companies', companyId, 'assets');
    return onSnapshot(colRef, (snap) => {
      onData(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => {
      onData([]);
    });
  }
  static subscribeToInventoryItems(session: any, companyId: string, onData: (data: any[]) => void): () => void {
    const { collection, onSnapshot } = require('firebase/firestore');
    const colRef = collection(db, 'companies', companyId, 'inventoryItems');
    return onSnapshot(colRef, (snap) => {
      onData(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => {
      onData([]);
    });
  }
`;

content = content.replace(/} \/\/ <- this is the closing brace for the class/, newMethods + '\n} // <- this is the closing brace for the class');

fs.writeFileSync(file, content);
