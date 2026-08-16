import * as fs from 'fs';
let content = fs.readFileSync('src/services/firestoreService.ts', 'utf-8');

const newMethod = `
  static subscribeToDailySiteLogs(userSession: UserSession, companyId: string, onData: (data: DailySiteLogRecord[]) => void): () => void {
    const colRef = collection(db, 'companies', companyId, 'daily_site_logs');
    const q = query(colRef, ...QueryScopeEngine.buildScope(userSession, 'LOGS'));
    return onSnapshot(q, (snapshot) => {
      const records = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DailySiteLogRecord));
      onData(records);
    }, (error) => {
      console.error('Error in subscribeToDailySiteLogs:', error);
      onData([]);
    });
  }
`;

content = content.replace("static subscribeToTasks(", newMethod + "\n  static subscribeToTasks(");
fs.writeFileSync('src/services/firestoreService.ts', content);
