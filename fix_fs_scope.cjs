const fs = require('fs');
let code = fs.readFileSync('src/services/firestoreService.ts', 'utf8');

// For subscribeToDeployments
code = code.replace(
  `  static subscribeToDeployments(userSession: UserSession, companyId: string, onUpdate: (deps: DeploymentRecord[]) => void): () => void {
    const colRef = collection(db, 'companies', companyId, 'deployments');
    const q = query(colRef);
    return onSnapshot(q, (snap) => {
      onUpdate(snap.docs.map(d => d.data() as DeploymentRecord));
    });
  }`,
  `  static subscribeToDeployments(userSession: UserSession, companyId: string, onUpdate: (deps: DeploymentRecord[]) => void): () => void {
    const colRef = collection(db, 'companies', companyId, 'deployments');
    const q = query(colRef, ...QueryScopeEngine.buildScope(userSession, 'DEPLOYMENTS'));
    return onSnapshot(q, (snap) => {
      onUpdate(snap.docs.map(d => d.data() as DeploymentRecord));
    });
  }`
);

// For subscribeToShiftRosters
code = code.replace(
  `  static subscribeToShiftRosters(userSession: UserSession, companyId: string, onUpdate: (rosters: ShiftRosterRecord[]) => void): () => void {
    const colRef = collection(db, 'companies', companyId, 'shiftRosters');
    const q = query(colRef);
    return onSnapshot(q, (snap) => {
      onUpdate(snap.docs.map(d => d.data() as ShiftRosterRecord));
    });
  }`,
  `  static subscribeToShiftRosters(userSession: UserSession, companyId: string, onUpdate: (rosters: ShiftRosterRecord[]) => void): () => void {
    const colRef = collection(db, 'companies', companyId, 'shiftRosters');
    const q = query(colRef, ...QueryScopeEngine.buildScope(userSession, 'SHIFT_ROSTERS'));
    return onSnapshot(q, (snap) => {
      onUpdate(snap.docs.map(d => d.data() as ShiftRosterRecord));
    });
  }`
);

// For subscribeToClients
code = code.replace(
  `  static subscribeToClients(userSession: UserSession, companyId: string, onUpdate: (clients: ClientRecord[]) => void): () => void {
    const colRef = collection(db, 'companies', companyId, 'clients');
    const q = query(colRef);
    return onSnapshot(q, (snap) => {
      onUpdate(snap.docs.map(d => d.data() as ClientRecord));
    });
  }`,
  `  static subscribeToClients(userSession: UserSession, companyId: string, onUpdate: (clients: ClientRecord[]) => void): () => void {
    const colRef = collection(db, 'companies', companyId, 'clients');
    const q = query(colRef, ...QueryScopeEngine.buildScope(userSession, 'CLIENTS'));
    return onSnapshot(q, (snap) => {
      onUpdate(snap.docs.map(d => d.data() as ClientRecord));
    });
  }`
);

fs.writeFileSync('src/services/firestoreService.ts', code);
