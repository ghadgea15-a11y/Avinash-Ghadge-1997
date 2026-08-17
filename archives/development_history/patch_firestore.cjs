const fs = require('fs');

const path = 'src/services/firestoreService.ts';
let code = fs.readFileSync(path, 'utf8');

const importsToAdd = `
import { 
  ClientRecord, 
  DeploymentRecord, 
  ShiftRosterRecord, 
  DeploymentHistoryRecord 
} from '../types';
`;
// find imports
code = code.replace("import { \n  CompanyTenant,", importsToAdd + "\nimport { \n  CompanyTenant,");

const methodsToAdd = `
  // ==========================================
  // CLIENT MANAGEMENT (Phase 2F P0)
  // ==========================================
  static async getClients(companyId: string): Promise<ClientRecord[]> {
    const colRef = collection(db, 'companies', companyId, 'clients');
    const q = query(colRef);
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as ClientRecord);
  }

  static subscribeToClients(userSession: UserSession, companyId: string, onUpdate: (clients: ClientRecord[]) => void): () => void {
    const colRef = collection(db, 'companies', companyId, 'clients');
    const q = query(colRef);
    return onSnapshot(q, (snap) => {
      onUpdate(snap.docs.map(d => d.data() as ClientRecord));
    });
  }

  static async saveClient(companyId: string, client: ClientRecord): Promise<boolean> {
    try {
      const docRef = doc(db, 'companies', companyId, 'clients', client.id);
      await setDoc(docRef, {
        ...client,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      return true;
    } catch (err) {
      console.error('Error saving client:', err);
      return false;
    }
  }

  // ==========================================
  // DEPLOYMENT MANAGEMENT (Phase 2F P0)
  // ==========================================
  static async getDeployments(companyId: string): Promise<DeploymentRecord[]> {
    const colRef = collection(db, 'companies', companyId, 'deployments');
    const q = query(colRef);
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as DeploymentRecord);
  }

  static subscribeToDeployments(userSession: UserSession, companyId: string, onUpdate: (deps: DeploymentRecord[]) => void): () => void {
    const colRef = collection(db, 'companies', companyId, 'deployments');
    const q = query(colRef);
    return onSnapshot(q, (snap) => {
      onUpdate(snap.docs.map(d => d.data() as DeploymentRecord));
    });
  }

  static async saveDeployment(companyId: string, deployment: DeploymentRecord, oldDeployment?: DeploymentRecord): Promise<boolean> {
    try {
      const docRef = doc(db, 'companies', companyId, 'deployments', deployment.id);
      
      // If transferring site or changing rate, create history record
      if (oldDeployment && (oldDeployment.siteId !== deployment.siteId || oldDeployment.billingRate !== deployment.billingRate || oldDeployment.status !== deployment.status)) {
         const historyRef = doc(collection(db, 'companies', companyId, 'deployments', deployment.id, 'history'));
         const historyRecord: DeploymentHistoryRecord = {
           id: historyRef.id,
           companyId,
           deploymentId: deployment.id,
           employeeId: deployment.employeeId,
           action: oldDeployment.siteId !== deployment.siteId ? 'SITE_TRANSFER' : (oldDeployment.billingRate !== deployment.billingRate ? 'RATE_CHANGE' : 'STATUS_CHANGE'),
           previousValue: oldDeployment,
           newValue: deployment,
           changedByUserId: 'SYSTEM', // Should ideally pass userSession.uid
           changedAt: new Date().toISOString()
         };
         await setDoc(historyRef, historyRecord);
      }

      await setDoc(docRef, {
        ...deployment,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      // BACKWARD COMPATIBILITY (Dual-write siteId to EmployeeRecord)
      if (deployment.status === 'ACTIVE') {
         const empRef = doc(db, 'companies', companyId, 'employees', deployment.employeeId);
         await setDoc(empRef, { siteId: deployment.siteId, updatedAt: new Date().toISOString() }, { merge: true });
      }

      return true;
    } catch (err) {
      console.error('Error saving deployment:', err);
      return false;
    }
  }

  // ==========================================
  // SHIFT ROSTER (Phase 2F P1)
  // ==========================================
  static subscribeToShiftRosters(userSession: UserSession, companyId: string, siteId: string, onUpdate: (rosters: ShiftRosterRecord[]) => void): () => void {
    const colRef = collection(db, 'companies', companyId, 'sites', siteId, 'shiftRoster');
    const q = query(colRef);
    return onSnapshot(q, (snap) => {
      onUpdate(snap.docs.map(d => d.data() as ShiftRosterRecord));
    });
  }

  static async saveShiftRoster(companyId: string, siteId: string, roster: ShiftRosterRecord): Promise<boolean> {
    try {
      const docRef = doc(db, 'companies', companyId, 'sites', siteId, 'shiftRoster', roster.id);
      await setDoc(docRef, {
        ...roster,
        createdAt: roster.createdAt || new Date().toISOString()
      }, { merge: true });
      return true;
    } catch (err) {
      console.error('Error saving shift roster:', err);
      return false;
    }
  }
`;

// Insert before the last closing brace
code = code.replace(/}\n*$/, methodsToAdd + "\n}");

fs.writeFileSync(path, code);
