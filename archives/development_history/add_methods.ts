import * as fs from 'fs';

let content = fs.readFileSync('src/services/firestoreService.ts', 'utf-8');

const newMethods = `
  static subscribeToTasks(userSession: UserSession, companyId: string, onData: (data: TaskRecord[]) => void): () => void {
    const q = QueryScopeEngine.getScopedQuery<TaskRecord>(userSession, companyId, 'tasks');
    return onSnapshot(q, (snapshot) => {
      const records = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TaskRecord));
      onData(records);
    }, (error) => {
      console.error('Error in subscribeToTasks:', error);
      onData([]);
    });
  }

  static subscribeToAnnouncements(userSession: UserSession, companyId: string, onData: (data: AnnouncementRecord[]) => void): () => void {
    const q = QueryScopeEngine.getScopedQuery<AnnouncementRecord>(userSession, companyId, 'announcements');
    return onSnapshot(q, (snapshot) => {
      const records = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AnnouncementRecord));
      onData(records);
    }, (error) => {
      console.error('Error in subscribeToAnnouncements:', error);
      onData([]);
    });
  }

  static subscribeToDocuments(userSession: UserSession, companyId: string, onData: (data: DocumentRecord[]) => void): () => void {
    const q = QueryScopeEngine.getScopedQuery<DocumentRecord>(userSession, companyId, 'documents');
    return onSnapshot(q, (snapshot) => {
      const records = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DocumentRecord));
      onData(records);
    }, (error) => {
      console.error('Error in subscribeToDocuments:', error);
      onData([]);
    });
  }

  static async updateTaskStatus(taskId: string, companyId: string, status: TaskRecord['status'], updates?: Partial<TaskRecord>): Promise<void> {
    const docRef = doc(db, 'companies', companyId, 'tasks', taskId);
    await updateDoc(docRef, { status, updatedAt: Date.now(), ...updates });
  }

  static async updateDailySiteLog(logId: string, companyId: string, updates: Partial<DailySiteLogRecord>): Promise<void> {
    const docRef = doc(db, 'companies', companyId, 'daily_site_logs', logId);
    await updateDoc(docRef, { ...updates });
  }

  static async updateIncidentReport(incidentId: string, companyId: string, updates: Partial<IncidentReportRecord>): Promise<void> {
    const docRef = doc(db, 'companies', companyId, 'incident_reports', incidentId);
    await updateDoc(docRef, { ...updates });
  }

  static async updateDocumentStatus(documentId: string, companyId: string, status: DocumentRecord['status'], updates?: Partial<DocumentRecord>): Promise<void> {
    const docRef = doc(db, 'companies', companyId, 'documents', documentId);
    await updateDoc(docRef, { status, updatedAt: Date.now(), ...updates });
  }
`;

content = content.replace("import {", "import { TaskRecord, AnnouncementRecord, DocumentRecord, ");
content = content.replace("  }\n}\n\n// Indian Rupee", newMethods + "\n  }\n}\n\n// Indian Rupee");

fs.writeFileSync('src/services/firestoreService.ts', content);
