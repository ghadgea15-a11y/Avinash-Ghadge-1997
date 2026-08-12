import { OfflineQueueItem } from '../types';
import { FirestoreService } from './firestoreService';

const OFFLINE_QUEUE_KEY = 'lsm_offline_mutation_queue_v1';

export class OfflineSyncService {
  private static listeners: Array<(isOnline: boolean) => void> = [];

  static initNetworkListener(): void {
    window.addEventListener('online', () => this.notifyListeners(true));
    window.addEventListener('offline', () => this.notifyListeners(false));
  }

  static isOnline(): boolean {
    return navigator.onLine;
  }

  static subscribe(callback: (isOnline: boolean) => void): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  private static notifyListeners(isOnline: boolean): void {
    this.listeners.forEach(cb => cb(isOnline));
  }

  static getQueue(): OfflineQueueItem[] {
    try {
      const data = localStorage.getItem(OFFLINE_QUEUE_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  static queueAction(actionType: OfflineQueueItem['actionType'], payload: Record<string, unknown>): OfflineQueueItem {
    const queue = this.getQueue();
    const item: OfflineQueueItem = {
      id: `OFFLINE-ACT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      actionType,
      payload,
      timestamp: Date.now(),
      status: 'PENDING'
    };
    queue.push(item);
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
    return item;
  }

  static clearQueue(): void {
    localStorage.removeItem(OFFLINE_QUEUE_KEY);
  }

  static async syncPendingQueue(): Promise<{ syncedCount: number; errors: string[] }> {
    const queue = this.getQueue();
    if (queue.length === 0) return { syncedCount: 0, errors: [] };

    let syncedCount = 0;
    const errors: string[] = [];
    const remainingQueue: OfflineQueueItem[] = [];

    for (const item of queue) {
      try {
        if (item.actionType === 'CREATE_EMPLOYEE') {
          const emp = item.payload as any;
          if (emp && emp.companyId && emp.id) {
            await FirestoreService.saveEmployee(emp.companyId, emp);
          }
        } else if (item.actionType === 'UPDATE_EMPLOYEE_STATUS') {
          const { empId, status, approverId, companyId } = item.payload as any;
          if (empId && status) {
            await FirestoreService.updateEmployeeStatus(companyId || 'APEX-SEC-101', empId, status, approverId || 'SYSTEM');
          }
        }
        syncedCount++;
      } catch (e: any) {
        errors.push(`Failed sync for ${item.id}: ${e?.message || 'Unknown error'}`);
        remainingQueue.push({
          ...item,
          status: 'FAILED'
        });
      }
    }

    if (remainingQueue.length > 0) {
      localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(remainingQueue));
    } else {
      this.clearQueue();
    }

    return { syncedCount, errors };
  }
}

OfflineSyncService.initNetworkListener();
