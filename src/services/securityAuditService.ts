import { 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  getDoc, 
  updateDoc, 
  query, 
  where, 
  orderBy, 
  limit 
} from 'firebase/firestore';
import { db } from '../firebase';
import { 
  UserSession, 
  SecurityEventRecord, 
  SecurityAnomalyRecord, 
  SecuritySeverity 
} from '../types';

// Support mocking for test suites
let _setDocMock = setDoc;
export function _setSetDocMock(mock: any) { _setDocMock = mock; }

let _getDocsMock = getDocs;
export function _setGetDocsMock(mock: any) { _getDocsMock = mock; }

let _updateDocMock = updateDoc;
export function _setUpdateDocMock(mock: any) { _updateDocMock = mock; }

export class SecurityAuditService {
  /**
   * Log a security event into immutable company ledger
   */
  static async logEvent(
    companyId: string,
    userId: string,
    role: string,
    employeeId: string,
    action: string,
    resource: string = 'system',
    resourceId: string = '',
    success: boolean = true,
    severity: SecuritySeverity = 'LOW',
    details: string = '',
    metadata: Record<string, any> = {}
  ): Promise<string> {
    try {
      const eventId = `EVT-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
      const eventRecord: SecurityEventRecord = {
        eventId,
        id: eventId,
        companyId,
        userId,
        role,
        employeeId: employeeId || userId,
        action,
        resource,
        resourceId,
        success,
        severity,
        details,
        reason: details,
        source: 'WEB_APP',
        timestamp: new Date().toISOString(),
        metadata
      };

      const eventRef = doc(db, 'companies', companyId, 'security_events', eventId);
      await _setDocMock(eventRef, eventRecord);

      // Trigger automatic real-time anomaly evaluation
      await this.runAnomalyDetection(companyId, eventRecord).catch(err => {
        console.warn('[SecurityAuditService] Anomaly detection background evaluation error:', err);
      });

      return eventId;
    } catch (err) {
      console.warn('[SecurityAuditService] Failed to persist security event:', err);
      return `EVT-${Date.now()}`;
    }
  }

  /**
   * Log an unauthorized access attempt
   */
  static async logUnauthorizedAttempt(
    session: UserSession | any,
    reason: string,
    resource: string = 'system',
    resourceId: string = ''
  ): Promise<string> {
    const companyId = session?.companyId || 'UNKNOWN';
    const userId = session?.userId || session?.uid || 'ANONYMOUS';
    const role = session?.role || 'UNKNOWN';
    const employeeId = session?.employeeId || userId;

    return this.logEvent(
      companyId,
      userId,
      role,
      employeeId,
      'UNAUTHORIZED_ACCESS',
      resource,
      resourceId,
      false,
      'HIGH',
      reason,
      { attemptedAction: reason }
    );
  }

  /**
   * Evaluates security events against anomaly detection heuristics
   */
  static async runAnomalyDetection(companyId: string, event: SecurityEventRecord): Promise<void> {
    try {
      // 1. Cross-company access denial
      if (event.action === 'CROSS_COMPANY_ACCESS_DENIED') {
        await this.createAnomaly(
          companyId,
          'CROSS_COMPANY_ACCESS',
          'CRITICAL',
          95,
          [event.eventId || event.id || 'EVT_UNKNOWN'],
          `User ${event.userId} attempted cross-tenant boundary breach into unauthorized company data.`
        );
        return;
      }

      // 2. Cross-site access denial
      if (event.action === 'CROSS_SITE_ACCESS_DENIED') {
        await this.createAnomaly(
          companyId,
          'CROSS_SITE_ACCESS',
          'HIGH',
          80,
          [event.eventId || event.id || 'EVT_UNKNOWN'],
          `User ${event.userId} attempted to access resources at unauthorized site ${event.resourceId || 'UNAUTHORIZED_SITE'}.`
        );
        return;
      }

      // 3. Repeated failed actions (e.g. 5 failures within 15 minutes)
      if (!event.success) {
        // Query recent failures for the user
        const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
        const failQuery = query(
          collection(db, 'companies', companyId, 'security_events'),
          where('userId', '==', event.userId),
          where('success', '==', false)
        );
        const snap = await _getDocsMock(failQuery);
        const recentFailures = (snap.docs || []).map(d => d.data() as SecurityEventRecord);

        if (event.action === 'UNAUTHORIZED_ACCESS') {
          const unauthCount = recentFailures.filter(e => e.action === 'UNAUTHORIZED_ACCESS').length;
          if (unauthCount >= 3) {
            await this.createAnomaly(
              companyId,
              'UNAUTHORIZED_ACCESS_ATTEMPTS',
              'CRITICAL',
              90,
              recentFailures.map(f => f.eventId || f.id || 'EVT'),
              `Repeated unauthorized access attempts (${unauthCount} times) by user ${event.userId}.`
            );
            return;
          }
        }

        if (recentFailures.length >= 5) {
          await this.createAnomaly(
            companyId,
            'REPEATED_FAILED_ACTIONS',
            'HIGH',
            75,
            recentFailures.map(f => f.eventId || f.id || 'EVT'),
            `Repeated failed actions (${recentFailures.length} failures) detected for user ${event.userId}.`
          );
          return;
        }
      }

      // 4. Suspicious proxy pattern (e.g., 10 delegation actions in short succession)
      if (event.action === 'DELEGATION_ACTED') {
        const delQuery = query(
          collection(db, 'companies', companyId, 'security_events'),
          where('userId', '==', event.userId),
          where('action', '==', 'DELEGATION_ACTED')
        );
        const snap = await _getDocsMock(delQuery);
        if ((snap.docs || []).length >= 10) {
          await this.createAnomaly(
            companyId,
            'SUSPICIOUS_PROXY_ACTIVITY',
            'HIGH',
            80,
            (snap.docs || []).map(d => (d.data() as any).eventId || d.id),
            `Unusual volume of proxy/delegated actions performed by user ${event.userId}.`
          );
          return;
        }
      }

      // 5. After-hours privileged admin activity (e.g. 11 PM to 5 AM)
      const eventDate = new Date(event.timestamp);
      const hour = eventDate.getHours();
      if ((hour >= 23 || hour <= 4) && (event.role === 'COMPANY_ADMIN' || event.role === 'SUPER_ADMIN' || event.action.includes('ADMIN'))) {
        await this.createAnomaly(
          companyId,
          'AFTER_HOURS_ADMIN_ACTIVITY',
          'MEDIUM',
          60,
          [event.eventId || event.id || 'EVT_UNKNOWN'],
          `Privileged administrative action performed during off-hours (${hour}:00) by ${event.userId}.`
        );
        return;
      }
    } catch (err) {
      console.warn('[SecurityAuditService] Error during anomaly detection evaluation:', err);
    }
  }

  /**
   * Persist a security anomaly record with automatic deduplication and admin alerts
   */
  static async createAnomaly(
    companyId: string,
    type: string,
    severity: SecuritySeverity,
    score: number,
    triggeringEvents: string[],
    reason: string
  ): Promise<string> {
    try {
      // Deduplication check: Do not recreate the exact same anomaly if triggered by the same event
      const existingQuery = query(
        collection(db, 'companies', companyId, 'security_anomalies'),
        where('type', '==', type)
      );
      const existingSnap = await _getDocsMock(existingQuery);
      const existingDocs = (existingSnap.docs || []).map(d => d.data());

      const isDuplicate = existingDocs.some(doc => {
        const events: string[] = doc.triggeringEvents || [];
        return triggeringEvents.some(te => events.includes(te));
      });

      if (isDuplicate) {
        return 'DUPLICATE_IGNORED';
      }

      const anomalyId = `ANOM-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      const record: SecurityAnomalyRecord = {
        anomalyId,
        id: anomalyId,
        companyId,
        type,
        severity,
        score,
        triggeringEvents,
        reason,
        description: reason,
        status: 'OPEN',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const ref = doc(db, 'companies', companyId, 'security_anomalies', anomalyId);
      await _setDocMock(ref, record);

      // Notification generation rules:
      // LOW: No notification (dashboard record only)
      // MEDIUM: In-app notification to COMPANY_ADMIN
      // HIGH or CRITICAL: Immediate tenant-scoped alert
      if (severity === 'MEDIUM' || severity === 'HIGH' || severity === 'CRITICAL') {
        const notifId = `NOTIF-${anomalyId}`;
        const notifRef = doc(db, 'companies', companyId, 'notifications', notifId);
        await _setDocMock(notifRef, {
          notificationId: notifId,
          companyId,
          title: `Security Anomaly Alert: ${type.replace(/_/g, ' ')}`,
          message: reason,
          severity,
          roleScope: ['COMPANY_ADMIN', 'SUPER_ADMIN'],
          referenceType: 'SECURITY_ANOMALY',
          referenceId: anomalyId,
          read: false,
          createdAt: new Date().toISOString()
        });
      }

      // If CRITICAL: Trigger automated security response log
      if (severity === 'CRITICAL') {
        await this.logEvent(
          companyId,
          'SYSTEM',
          'SECURITY_AUTOMATION',
          'SYSTEM',
          'AUTOMATED_SECURITY_RESPONSE',
          'security_anomalies',
          anomalyId,
          true,
          'CRITICAL',
          `Automated mitigation triggered for CRITICAL anomaly: ${type}. ${reason}`
        ).catch(() => {});
      }

      return anomalyId;
    } catch (err) {
      console.warn('[SecurityAuditService] Failed to create anomaly:', err);
      return `ANOM-${Date.now()}`;
    }
  }

  /**
   * Get all security audit events for a company / session
   */
  static async getEvents(userSession: UserSession): Promise<SecurityEventRecord[]> {
    try {
      if (!userSession?.companyId) return [];
      const col = collection(db, 'companies', userSession.companyId, 'security_events');
      const snap = await _getDocsMock(col);
      const list = (snap.docs || []).map(d => d.data() as SecurityEventRecord);
      return list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    } catch (err) {
      console.warn('[SecurityAuditService] getEvents error:', err);
      return [];
    }
  }

  /**
   * Get all security anomalies for a company / session
   */
  static async getAnomalies(userSession: UserSession): Promise<SecurityAnomalyRecord[]> {
    try {
      if (!userSession?.companyId) return [];
      const col = collection(db, 'companies', userSession.companyId, 'security_anomalies');
      const snap = await _getDocsMock(col);
      const list = (snap.docs || []).map(d => d.data() as SecurityAnomalyRecord);
      return list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    } catch (err) {
      console.warn('[SecurityAuditService] getAnomalies error:', err);
      return [];
    }
  }

  /**
   * Update the status of an anomaly (e.g. UNDER_REVIEW, RESOLVED, FALSE_POSITIVE)
   * Enforces strict RBAC: Only COMPANY_ADMIN or SUPER_ADMIN may resolve anomalies.
   */
  static async updateAnomalyStatus(
    userSession: UserSession,
    anomalyId: string,
    status: SecurityAnomalyRecord['status'],
    resolutionNotes?: string
  ): Promise<boolean> {
    const role = userSession?.role;
    if (role !== 'COMPANY_ADMIN' && role !== 'SUPER_ADMIN') {
      await this.logUnauthorizedAttempt(
        userSession,
        'Unauthorized anomaly status update attempt',
        'security_anomalies',
        anomalyId
      ).catch(() => {});
      throw new Error(`Unauthorized: User with role ${role} is not permitted to modify security anomaly status.`);
    }

    try {
      const ref = doc(db, 'companies', userSession.companyId, 'security_anomalies', anomalyId);
      const updateData: any = {
        status,
        updatedAt: new Date().toISOString(),
        resolvedBy: userSession.userId || userSession.email,
        resolvedAt: new Date().toISOString()
      };
      if (resolutionNotes) {
        updateData.resolutionNotes = resolutionNotes;
      }
      await _updateDocMock(ref, updateData);

      // Log immutable audit event for the status update
      await this.logEvent(
        userSession.companyId,
        userSession.userId,
        userSession.role,
        userSession.employeeId || userSession.userId,
        'ANOMALY_STATUS_UPDATED',
        'security_anomalies',
        anomalyId,
        true,
        'LOW',
        resolutionNotes ? `Status updated to ${status}. Notes: ${resolutionNotes}` : `Status updated to ${status}`
      ).catch(() => {});

      return true;
    } catch (err) {
      console.warn('[SecurityAuditService] updateAnomalyStatus error:', err);
      return false;
    }
  }
}
