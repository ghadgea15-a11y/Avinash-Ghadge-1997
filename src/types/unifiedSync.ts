// ============================================================================
// UNIFIED OFFLINE SYNC FRAMEWORK (7.2)
// Generic Queue Table + Conflict Resolution + Retry/Exponential Backoff
// ============================================================================

export type SyncEntityType = 
  | 'ATTENDANCE_PUNCH' 
  | 'PATROL_SCAN' 
  | 'INCIDENT_REPORT' 
  | 'EXPENSE_RECEIPT' 
  | 'LEAVE_APPLICATION' 
  | 'WORK_ORDER_UPDATE';

export type ConflictResolutionStrategy = 
  | 'SERVER_WINS' 
  | 'CLIENT_TIMESTAMP_WINS' 
  | 'MERGE_NON_CONFLICTING';

export type SyncItemStatus = 
  | 'PENDING' 
  | 'IN_FLIGHT' 
  | 'SYNCED' 
  | 'FAILED' 
  | 'CONFLICT_RESOLVED';

export interface UnifiedSyncQueueItem<T = any> {
  queueId: string;
  entityType: SyncEntityType;
  collectionPath: string; // e.g. companies/COMP-1/attendance
  documentId: string;
  operation: 'CREATE' | 'UPDATE' | 'DELETE';
  payload: T;
  clientTimestamp: number;
  serverTimestamp?: number;
  retryCount: number;
  maxRetries: number;
  status: SyncItemStatus;
  errorMessage?: string;
  conflictStrategy: ConflictResolutionStrategy;
  idempotencyKey: string;
}

export interface SyncEngineStatus {
  isOnline: boolean;
  pendingCount: number;
  inFlightCount: number;
  failedCount: number;
  lastSuccessfulSyncTimestamp?: number;
  isSyncing: boolean;
}
