import { db } from '../firebase';
import { 
  collection, 
  addDoc, 
  serverTimestamp, 
  query, 
  where, 
  orderBy, 
  getDocs,
  limit,
  Timestamp
} from 'firebase/firestore';
import { UserSession } from '../types';

export interface AuditLogEntry {
  id?: string;
  companyId: string;
  userId: string;
  userName?: string;
  role: string;
  action: string;
  module: string;
  resourceId?: string;
  previousValue?: any;
  newValue?: any;
  metadata?: Record<string, any>;
  ipAddress?: string;
  timestamp: Timestamp | any;
  status: 'SUCCESS' | 'FAILURE' | 'WARNING';
}

/**
 * Enterprise Audit Trail Service
 * 
 * Provides immutable logs of all sensitive operations within the platform.
 */
export class AuditTrailService {
  /**
   * Records a security or business event in the audit trail.
   */
  public static async log(
    session: UserSession,
    action: string,
    module: string,
    details: {
      resourceId?: string;
      previousValue?: any;
      newValue?: any;
      metadata?: Record<string, any>;
      status?: 'SUCCESS' | 'FAILURE' | 'WARNING';
    }
  ): Promise<void> {
    await this.logAction(
      session,
      module,
      action,
      'UNKNOWN',
      details.resourceId || 'N/A',
      details.status !== 'FAILURE',
      details.status === 'WARNING' ? 'MEDIUM' : (details.status === 'FAILURE' ? 'HIGH' : 'INFO'),
      `Action ${action} performed on module ${module}`,
      details
    );
  }

  /**
   * Alias for log to match legacy usage
   */
  public static async logAction(
    session: UserSession,
    module: string,
    action: string,
    resourceType: string,
    resourceId: string,
    success: boolean,
    severity: string,
    message: string,
    metadata?: any
  ): Promise<void> {
    try {
      const logEntry: Omit<AuditLogEntry, 'id'> = {
        companyId: session.companyId,
        userId: session.userId,
        userName: session.fullName || 'Unknown',
        role: session.role,
        action: `${action}:${resourceType}:${resourceId}`,
        module,
        resourceId,
        metadata: { ...metadata, success, severity, message },
        status: success ? 'SUCCESS' : 'FAILURE',
        timestamp: serverTimestamp()
      };

      await addDoc(collection(db, 'audit_trails'), logEntry);
    } catch (error) {
      console.error('[AuditTrailService] Failed to log event:', error);
    }
  }

  /**
   * Flexible log create to handle different legacy call signatures
   */
  public static async logCreate(session: UserSession, ...args: any[]): Promise<void> {
    if (args.length >= 7) {
      // (module, action, resourceType, resourceId, success, severity, message, metadata?)
      await this.logAction(session, args[0], args[1], args[2], args[3], args[4], args[5], args[6], args[7]);
    } else if (args.length >= 4) {
      // (module, resourceType, resourceId, message, metadata?)
      await this.logAction(session, args[0], 'CREATE', args[1], args[2], true, 'INFO', args[3], args[4]);
    }
  }

  /**
   * Flexible log update to handle different legacy call signatures
   */
  public static async logUpdate(session: UserSession, ...args: any[]): Promise<void> {
    if (args.length >= 7) {
      await this.logAction(session, args[0], args[1], args[2], args[3], args[4], args[5], args[6], args[7]);
    } else if (args.length >= 4) {
      await this.logAction(session, args[0], 'UPDATE', args[1], args[2], true, 'INFO', args[3], args[4]);
    }
  }

  /**
   * Retrieves audit logs for a specific company.
   */
  public static async getCompanyLogs(
    companyId: string, 
    options: { module?: string; limitCount?: number } = {}
  ): Promise<AuditLogEntry[]> {
    let q = query(
      collection(db, 'audit_trails'),
      where('companyId', '==', companyId),
      orderBy('timestamp', 'desc'),
      limit(options.limitCount || 100)
    );

    if (options.module) {
      q = query(q, where('module', '==', options.module));
    }

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AuditLogEntry));
  }

  /**
   * Helper to build a standard audit record object for cross-module consistency.
   */
  public static buildAuditRecord(
    session: UserSession,
    module: string,
    action: string,
    resourceType: string,
    resourceId: string,
    success: boolean,
    severity: string,
    message: string,
    metadata?: any
  ): any {
    return {
      companyId: session.companyId,
      userId: session.userId,
      userName: session.fullName || 'Unknown',
      role: session.role,
      action: `${action}:${resourceType}:${resourceId}`,
      module,
      resourceId,
      metadata: { ...metadata, success, severity, message },
      status: success ? 'SUCCESS' : 'FAILURE',
      timestamp: new Date().toISOString(),
      clientSource: 'WEB_APP'
    };
  }

  /**
   * Directly records an audit record.
   */
  public static async recordEvent(record: any): Promise<void> {
    try {
      const logEntry = {
        ...record,
        timestamp: record.timestamp ? Timestamp.fromDate(new Date(record.timestamp)) : serverTimestamp()
      };
      await addDoc(collection(db, 'audit_trails'), logEntry);
    } catch (error) {
      console.error('[AuditTrailService] recordEvent failed:', error);
    }
  }
}
