import { UserSession } from '../types';
import { db } from '../firebase';
import { writeBatch, doc } from 'firebase/firestore';

export interface OfflineCacheStats {
  estimatedCacheSizeMb: number;
  totalCachedEntities: number;
  activeSiteScoped: boolean;
  assignedSiteId?: string;
  maxMemoryBudgetMb: number;
  offlineQueueLength: number;
  syncStatus: 'HEALTHY' | 'SYNCING' | 'OFFLINE_READY';
}

export class OfflineSyncGovernor {
  private static MAX_MOBILE_MEMORY_MB = 10; // Strict enterprise budget for Android field devices

  /**
   * Computes the scoped offline sync boundaries based on the user session and role.
   * Prevents full 500-site enterprise replication onto mobile supervisor devices.
   */
  static getCacheSyncStrategy(session: UserSession): {
    syncScope: 'GLOBAL' | 'REGIONAL' | 'SITE_RESTRICTED' | 'SELF_ONLY';
    maxCachedEmployees: number;
    maxCachedAttendanceDays: number;
    estimatedMemoryMb: number;
  } {
    const role = session.role;
    
    // Ground workforce (Skilled / Semi-Skilled / Guards) - only self data
    if (['EMPLOYEE', 'GUARD', 'TECHNICIAN', 'WORKER'].includes(role) || ['A7_SKILLED', 'A8_SEMI_SKILLED', 'A9_SUPPORT'].includes((session as any).authorityLevel)) {
      return {
        syncScope: 'SELF_ONLY',
        maxCachedEmployees: 1,
        maxCachedAttendanceDays: 30,
        estimatedMemoryMb: 0.25
      };
    }

    // Field Supervisors / Site In-Charge - only active site (<100 staff)
    if (['SUPERVISOR', 'SITE_IN_CHARGE', 'FIELD_OFFICER'].includes(role)) {
      return {
        syncScope: 'SITE_RESTRICTED',
        maxCachedEmployees: 150,
        maxCachedAttendanceDays: 7,
        estimatedMemoryMb: 4.8
      };
    }

    // Regional / Area Managers - only assigned branches (<500 staff)
    if (['REGIONAL_MANAGER', 'AREA_MANAGER'].includes(role)) {
      return {
        syncScope: 'REGIONAL',
        maxCachedEmployees: 500,
        maxCachedAttendanceDays: 3,
        estimatedMemoryMb: 8.5
      };
    }

    // Corporate Staff / Directors / Admins (Web platform - high spec)
    return {
      syncScope: 'GLOBAL',
      maxCachedEmployees: 1000, // On-demand virtualized paging
      maxCachedAttendanceDays: 3,
      estimatedMemoryMb: 9.5
    };
  }

  /**
   * Flushes an offline mutation queue in atomic batches of 50 operations to prevent HTTP 429 errors
   */
  static async flushOfflineMutationBatch(
    companyId: string,
    mutations: Array<{ collection: string; docId: string; data: any }>
  ): Promise<{ successCount: number; failedCount: number; batchesProcessed: number }> {
    const BATCH_SIZE = 50;
    let successCount = 0;
    let failedCount = 0;
    let batchesProcessed = 0;

    for (let i = 0; i < mutations.length; i += BATCH_SIZE) {
      const chunk = mutations.slice(i, i + BATCH_SIZE);
      const batch = writeBatch(db);

      chunk.forEach(m => {
        const ref = doc(db, 'companies', companyId, m.collection, m.docId);
        batch.set(ref, {
          ...m.data,
          companyId,
          _syncedAt: new Date().toISOString(),
          _isOfflineMutation: true
        }, { merge: true });
      });

      batchesProcessed++;
      try {
        await batch.commit();
        successCount += chunk.length;
      } catch (err) {
        // Non-fatal if offline / permission mock
        failedCount += chunk.length;
      }
    }

    return {
      successCount,
      failedCount,
      batchesProcessed
    };
  }

  /**
   * Gets current diagnostic telemetry for offline cache footprint
   */
  static getDiagnosticStats(session: UserSession, queueLength: number = 0): OfflineCacheStats {
    const strategy = this.getCacheSyncStrategy(session);
    return {
      estimatedCacheSizeMb: strategy.estimatedMemoryMb,
      totalCachedEntities: strategy.maxCachedEmployees,
      activeSiteScoped: strategy.syncScope === 'SITE_RESTRICTED',
      assignedSiteId: session.assignedSiteId,
      maxMemoryBudgetMb: this.MAX_MOBILE_MEMORY_MB,
      offlineQueueLength: queueLength,
      syncStatus: strategy.estimatedMemoryMb <= this.MAX_MOBILE_MEMORY_MB ? 'OFFLINE_READY' : 'HEALTHY'
    };
  }
}
