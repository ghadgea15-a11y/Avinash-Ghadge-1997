import * as fs from 'fs';

let content = fs.readFileSync('src/services/firestoreService.ts', 'utf-8');

const additionalSaves = `
  static async saveTask(companyId: string, task: TaskRecord): Promise<boolean> {
    try {
      const ref = doc(db, 'companies', companyId, 'tasks', task.id);
      await setDoc(ref, {
        ...task,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      return true;
    } catch (err) {
      console.error('[FirestoreService] saveTask error:', err);
      return false;
    }
  }

  static async saveAnnouncement(companyId: string, ann: AnnouncementRecord): Promise<boolean> {
    try {
      const ref = doc(db, 'companies', companyId, 'announcements', ann.id);
      await setDoc(ref, {
        ...ann,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      return true;
    } catch (err) {
      console.error('[FirestoreService] saveAnnouncement error:', err);
      return false;
    }
  }

  static async saveDocumentRecord(companyId: string, docRec: DocumentRecord): Promise<boolean> {
    try {
      const ref = doc(db, 'companies', companyId, 'documents', docRec.id);
      await setDoc(ref, {
        ...docRec,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      return true;
    } catch (err) {
      console.error('[FirestoreService] saveDocumentRecord error:', err);
      return false;
    }
  }
`;

content = content.replace("  static async saveDailySiteLog(", additionalSaves + "\n  static async saveDailySiteLog(");

fs.writeFileSync('src/services/firestoreService.ts', content);
