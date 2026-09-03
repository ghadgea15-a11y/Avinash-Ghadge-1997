import { db } from '../firebase';
import { collection, doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { OfflineAttendanceConflictEngine } from './offlineAttendanceConflictEngine';
import { OfflineConflictResolutionEngine } from './offlineConflictResolutionEngine';

export interface OfflineOperation {
  id: string;
  action: string;
  collection: string;
  payload: any;
  timestamp: number;
  status: 'PENDING' | 'SYNCING' | 'FAILED' | 'COMPLETED';
  retryCount: number;
  error?: string;
  companyId?: string;
}

export class OfflineSyncService {
  private static online: boolean = navigator.onLine;
  private static subscribers: ((online: boolean) => void)[] = [];
  private static queue: OfflineOperation[] = [];
  
  static {
    // Load queue from localStorage
    try {
      const stored = localStorage.getItem('logsheet_offline_queue');
      if (stored) {
        this.queue = JSON.parse(stored);
      }
    } catch(e) {}

    window.addEventListener('online', () => this.setOnline(true));
    window.addEventListener('offline', () => this.setOnline(false));
  }

  private static saveQueue() {
    localStorage.setItem('logsheet_offline_queue', JSON.stringify(this.queue));
  }

  static isOnline(): boolean {
    return this.online;
  }

  static getQueue(): OfflineOperation[] {
    return this.queue;
  }

  static subscribe(callback: (online: boolean) => void): () => void {
    this.subscribers.push(callback);
    return () => {
      this.subscribers = this.subscribers.filter((cb) => cb !== callback);
    };
  }

  static async syncPendingQueue(): Promise<void> {
    if (!this.online || this.queue.length === 0) return;
    
    let updated = false;
    
    for (let i = 0; i < this.queue.length; i++) {
      const op = this.queue[i];
      if (op.status === 'COMPLETED') continue;
      
      op.status = 'SYNCING';
      this.saveQueue();
      
      try {
        if (op.companyId) {
          const docId = op.payload.id || op.id;
          const docRef = doc(collection(db, 'companies', op.companyId, op.collection), docId);

          // 1. Attendance Conflict Resolution
          if (op.collection === 'attendance' || op.action?.includes('PUNCH') || op.action?.includes('ATTENDANCE')) {
            const existingSnap = await getDoc(docRef);
            if (existingSnap.exists()) {
              const existingData = existingSnap.data() as any;
              
              const actionType = op.payload.checkOut && !op.payload.checkIn ? 'PUNCH_OUT' : 'PUNCH_IN';
              const conflictRes = OfflineAttendanceConflictEngine.resolveSupervisorAttendanceConflict(
                existingData,
                op.payload,
                actionType
              );

              if (conflictRes.conflictDetected) {
                await setDoc(docRef, {
                  ...conflictRes.winningRecord,
                  syncedAt: serverTimestamp(),
                  isOfflineCreated: true
                }, { merge: true });

                if (conflictRes.anomalyAuditPayload) {
                  const anomalyDocRef = doc(
                    collection(db, 'companies', op.companyId, 'suspicious_punches'),
                    `CONF-${Date.now()}-${op.payload.employeeId || 'EMP'}`
                  );
                  await setDoc(anomalyDocRef, {
                    ...conflictRes.anomalyAuditPayload,
                    createdAt: new Date().toISOString()
                  });
                }

                op.status = 'COMPLETED';
                updated = true;
                continue;
              }
            }
          }

          // 2. LMS Quizzes & Assessment Conflict Resolution
          if (
            op.collection === 'trainingEnrollments' ||
            op.action?.includes('LMS') ||
            op.action?.includes('QUIZ') ||
            op.action?.includes('ASSESSMENT')
          ) {
            const existingSnap = await getDoc(docRef);
            if (existingSnap.exists()) {
              const existingData = existingSnap.data() as any;
              const conflictRes = OfflineConflictResolutionEngine.resolveLmsQuizConflict(
                existingData,
                op.payload
              );

              if (conflictRes.conflictDetected) {
                await setDoc(docRef, {
                  ...conflictRes.winningRecord,
                  syncedAt: serverTimestamp(),
                  isOfflineCreated: true
                }, { merge: true });

                if (conflictRes.anomalyAuditPayload) {
                  const auditRef = doc(
                    collection(db, 'companies', op.companyId, 'audit_logs'),
                    `AUDIT-LMS-${Date.now()}-${op.payload.employeeId || 'EMP'}`
                  );
                  await setDoc(auditRef, {
                    ...conflictRes.anomalyAuditPayload,
                    companyId: op.companyId,
                    module: 'LEARNING_MANAGEMENT',
                    action: 'LMS_CONFLICT_RESOLVED',
                    createdAt: new Date().toISOString()
                  });
                }

                op.status = 'COMPLETED';
                updated = true;
                continue;
              }
            }
          }

          // 3. Expense Claims & Attachments Conflict Resolution
          if (
            op.collection === 'expenseClaims' ||
            op.action?.includes('EXPENSE') ||
            op.action?.includes('CLAIM') ||
            op.action?.includes('ATTACHMENT')
          ) {
            const existingSnap = await getDoc(docRef);
            if (existingSnap.exists()) {
              const existingData = existingSnap.data() as any;
              const conflictRes = OfflineConflictResolutionEngine.resolveExpenseAttachmentConflict(
                existingData,
                op.payload
              );

              if (conflictRes.conflictDetected) {
                await setDoc(docRef, {
                  ...conflictRes.winningRecord,
                  syncedAt: serverTimestamp(),
                  isOfflineCreated: true
                }, { merge: true });

                if (conflictRes.anomalyAuditPayload) {
                  const auditRef = doc(
                    collection(db, 'companies', op.companyId, 'audit_logs'),
                    `AUDIT-EXP-${Date.now()}-${op.payload.id || 'CLAIM'}`
                  );
                  await setDoc(auditRef, {
                    ...conflictRes.anomalyAuditPayload,
                    companyId: op.companyId,
                    module: 'FINANCE',
                    action: 'EXPENSE_CONFLICT_RESOLVED',
                    createdAt: new Date().toISOString()
                  });
                }

                op.status = 'COMPLETED';
                updated = true;
                continue;
              }
            }
          }
          
          await setDoc(docRef, {
            ...op.payload,
            syncedAt: serverTimestamp(),
            isOfflineCreated: true
          }, { merge: true });
          
          op.status = 'COMPLETED';
        } else {
          op.status = 'FAILED';
          op.error = 'No company ID provided';
        }
      } catch (err: any) {
        op.status = 'FAILED';
        op.error = err.message || 'Sync failed';
        op.retryCount += 1;
      }
      updated = true;
    }
    
    if (updated) {
      // Keep only failed operations that haven't maxed out retries
      this.queue = this.queue.filter(op => op.status !== 'COMPLETED' && op.retryCount < 5);
      this.saveQueue();
    }
  }

  static enqueue(operation: Omit<OfflineOperation, 'id' | 'timestamp' | 'status' | 'retryCount'>): void {
    const newOp: OfflineOperation = {
      ...operation,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
      timestamp: Date.now(),
      status: 'PENDING',
      retryCount: 0
    };
    
    this.queue.push(newOp);
    this.saveQueue();
    
    if (this.online) {
      this.syncPendingQueue();
    }
  }

  static queueAction(action: string, payload: any, metadata?: any): void {
    this.enqueue({ 
      action, 
      payload, 
      collection: metadata?.collection || 'offline_events',
      companyId: metadata?.companyId 
    });
  }

  static clearQueue(): void {
    this.queue = [];
    this.saveQueue();
  }

  private static setOnline(status: boolean) {
    this.online = status;
    this.subscribers.forEach((cb) => cb(status));
    if (status) {
      this.syncPendingQueue();
    }
  }
}

