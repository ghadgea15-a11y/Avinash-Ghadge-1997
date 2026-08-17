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
                if (item.actionType === 'PUNCH_IN') {
          const { companyId, data } = item.payload as any;
          if (companyId && data) {
            await FirestoreService.saveAttendance(companyId, data);
          }
        } else if (item.actionType === 'PUNCH_OUT') {
          const { companyId, data } = item.payload as any;
          if (companyId && data) {
            await FirestoreService.saveAttendance(companyId, data);
          }
        } else if (item.actionType === 'PATROL_CHECK') {
          const { companyId, data } = item.payload as any;
          if (companyId && data) await FirestoreService.savePatrolCheckpoint(companyId, data);
        } else if (item.actionType === 'PATROL_PLAN') {
          const { companyId, data } = item.payload as any;
          if (companyId && data) await FirestoreService.savePatrolPlan(companyId, data);
        } else if (item.actionType === 'PATROL_TOUR_START' || item.actionType === 'PATROL_TOUR_COMPLETE' || item.actionType === 'PATROL_OVERRIDE') {
          const { companyId, data } = item.payload as any;
          if (companyId && data) await FirestoreService.savePatrolTour(companyId, data);
        } else if (item.actionType === 'PATROL_SCAN') {
          const { companyId, tourId, scan, currentTour } = item.payload as any;
          if (companyId && tourId && scan && currentTour) {
            await FirestoreService.recordTourCheckpointScan(companyId, tourId, scan, currentTour);
          }
        } else if (item.actionType === 'PATROL_TOUR_LOG') {
          const { companyId, data } = item.payload as any;
          if (companyId && data) await FirestoreService.savePatrolLog(companyId, data);
        } else if (item.actionType === 'INCIDENT_REPORT') {
          const { companyId, data } = item.payload as any;
          if (companyId && data) await FirestoreService.saveIncidentReport(companyId, data);
        } else if (item.actionType === 'VISITOR_LOG') {
          const { companyId, data } = item.payload as any;
          if (companyId && data) await FirestoreService.checkInVisitor(companyId, data);
        } else if (item.actionType === 'VISITOR_CHECK_OUT') {
          const { companyId, visitorId, checkOutTime } = item.payload as any;
          if (companyId && visitorId) await FirestoreService.checkOutVisitor(companyId, visitorId, checkOutTime);
        } else if (item.actionType === 'MATERIAL_PASS') {
          const { companyId, data } = item.payload as any;
          if (companyId && data) await FirestoreService.saveMaterialMovementLog(companyId, data);
        } else if (item.actionType === 'MATERIAL_APPROVE') {
          const { companyId, passId, approvedBy, approvedAt } = item.payload as any;
          if (companyId && passId) await FirestoreService.updateMaterialStatus(companyId, passId, 'APPROVED', approvedBy);
        } else if (item.actionType === 'CREATE_EMPLOYEE') {
          const emp = item.payload as any;
          if (emp && emp.companyId && emp.id) {
            const actor = { id: emp.updatedBy || 'SYSTEM', name: 'Offline Sync' };
            await FirestoreService.saveEmployee(emp.companyId, emp, actor);
          }
        } else if (item.actionType === 'UPDATE_EMPLOYEE_STATUS') {
          const { empId, status, approverId, companyId } = item.payload as any;
          if (empId && status) {
            if (!companyId) throw new Error('Missing companyId in queue payload');
            await FirestoreService.updateEmployeeStatus(companyId, empId, status, approverId || 'SYSTEM');
          }
        } else if (item.actionType === 'CREATE_ROSTER') {
          const { companyId, rosters, actor } = item.payload as any;
          if (companyId && rosters) {
            await FirestoreService.bulkSaveRosters(companyId, rosters, actor);
          }
        } else if (item.actionType === 'DELETE_ROSTER') {
          const { companyId, rosterId, actor } = item.payload as any;
          if (companyId && rosterId) {
            await FirestoreService.deleteRoster(companyId, rosterId, actor);
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
