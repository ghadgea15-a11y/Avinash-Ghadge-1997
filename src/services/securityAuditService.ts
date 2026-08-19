import { collection, doc, setDoc, getDocs, query, where, orderBy, limit, Timestamp, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { UserSession, SecurityEventRecord, SecurityAnomalyRecord, SecuritySeverity } from '../types';


export class SecurityAuditService {
  /**
   * Log an immutable security event.
   */
  static async logEvent(
    companyId: string,
    userId: string,
    role: string,
    employeeId: string | undefined,
    action: string,
    resource: string,
    resourceId: string,
    success: boolean,
    severity: SecuritySeverity = 'LOW',
    reason?: string,
    ipAddress?: string
  ): Promise<SecurityEventRecord | null> {
    if (!companyId) return null;

    try {
      const eventId = (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `ID-${Date.now()}-${Math.random().toString(36).substring(2,6)}`);
      const timestamp = new Date().toISOString();

      const eventRecord: any = {
        eventId,
        companyId,
        userId,
        employeeId,
        role,
        action,
        resource,
        resourceId,
        timestamp,
        severity,
        source: 'WEB_APP',
        ipAddress,
        success,
        reason
      };

      // Strip undefined fields for Firestore
      Object.keys(eventRecord).forEach(key => {
        if (eventRecord[key] === undefined) {
          delete eventRecord[key];
        }
      });

      const eventRef = doc(db, 'companies', companyId, 'security_events', eventId);
      await setDoc(eventRef, eventRecord as SecurityEventRecord);

      // Asynchronously trigger anomaly detection so we don't block
      this.runAnomalyDetection(companyId, eventRecord).catch(e => console.error('Anomaly detection failed', e));

      return eventRecord;
    } catch (err) {
      console.error('[SecurityAuditService] Failed to log security event:', err);
      return null;
    }
  }

  /**
   * Run rule-based anomaly detection based on recent events.
   */
  static async runAnomalyDetection(companyId: string, triggerEvent: SecurityEventRecord): Promise<void> {
    try {
      // Rule 1: Repeated Failed Authentication / Action
      if (!triggerEvent.success) {
        // Query recent failed events by this user
        const recentTime = new Date();
        recentTime.setMinutes(recentTime.getMinutes() - 15); // last 15 mins

        const q = query(
          collection(db, 'companies', companyId, 'security_events'),
          where('userId', '==', triggerEvent.userId),
          where('success', '==', false),
          orderBy('timestamp', 'desc'),
          limit(10)
        );
        
        const snap = await getDocs(q);
        const recentFailedEvents = snap.docs.map(d => d.data() as SecurityEventRecord).filter(e => new Date(e.timestamp) >= recentTime);

        if (recentFailedEvents.length >= 5) {
          // CRITICAL Anomaly: Repeated failed actions
          await this.createAnomaly(
            companyId,
            'REPEATED_FAILED_ACTIONS',
            'CRITICAL',
            90,
            recentFailedEvents.map(e => e.eventId),
            `User ${triggerEvent.userId} had ${recentFailedEvents.length} failed actions in 15 minutes.`
          );
        }
      }

      // Rule 2: Cross-Site Access Attempts (Role manipulation or access attempt)
      if (triggerEvent.action === 'CROSS_SITE_ACCESS_DENIED' || triggerEvent.action === 'UNAUTHORIZED_ACCESS') {
        await this.createAnomaly(
          companyId,
          'UNAUTHORIZED_ACCESS_ATTEMPT',
          'HIGH',
          80,
          [triggerEvent.eventId],
          `User ${triggerEvent.userId} attempted unauthorized access: ${triggerEvent.reason}`
        );
      }

      // Rule 3: Proxy Anomaly (Unusual proxy actions)
      if (triggerEvent.action === 'DELEGATION_ACTED') {
        // Check if there are more than 10 delegation actions in 1 hour
        const recentTime = new Date();
        recentTime.setHours(recentTime.getHours() - 1);

        const q = query(
          collection(db, 'companies', companyId, 'security_events'),
          where('userId', '==', triggerEvent.userId),
          where('action', '==', 'DELEGATION_ACTED'),
          orderBy('timestamp', 'desc'),
          limit(15)
        );

        const snap = await getDocs(q);
        const recentProxyEvents = snap.docs.map(d => d.data() as SecurityEventRecord).filter(e => new Date(e.timestamp) >= recentTime);

        if (recentProxyEvents.length >= 10) {
          await this.createAnomaly(
            companyId,
            'SUSPICIOUS_PROXY_ACTIVITY',
            'MEDIUM',
            60,
            recentProxyEvents.map(e => e.eventId),
            `User ${triggerEvent.userId} performed ${recentProxyEvents.length} proxy actions in 1 hour.`
          );
        }
      }

      // Rule 4: Suspicious After-Hours Administrative Activity
      if (triggerEvent.role === 'COMPANY_ADMIN' || triggerEvent.role === 'SUPER_ADMIN') {
        const hour = new Date(triggerEvent.timestamp).getHours();
        // Assume after hours is 11 PM to 4 AM
        if (hour >= 23 || hour <= 4) {
          await this.createAnomaly(
            companyId,
            'AFTER_HOURS_ADMIN_ACTIVITY',
            'MEDIUM',
            65,
            [triggerEvent.eventId],
            `Admin ${triggerEvent.userId} performed action '${triggerEvent.action}' outside normal business hours.`
          );
        }
      }

    } catch (err) {
      console.error('[SecurityAuditService] Anomaly detection error:', err);
    }
  }

  static async createAnomaly(
    companyId: string,
    type: string,
    severity: SecuritySeverity,
    score: number,
    triggeringEvents: string[],
    reason: string
  ): Promise<void> {
    try {
      // Prevent duplicate anomalies for the same triggers
      // A simplistic duplicate protection: check if an anomaly exists for the first triggering event
      if (triggeringEvents.length > 0) {
        const q = query(
          collection(db, 'companies', companyId, 'security_anomalies'),
          where('type', '==', type),
          where('triggeringEvents', 'array-contains', triggeringEvents[0])
        );
        const existing = await getDocs(q);
        if (!existing.empty) {
          return; // Already recorded this anomaly
        }
      }

      const anomalyId = (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `ID-${Date.now()}-${Math.random().toString(36).substring(2,6)}`);
      const anomaly: SecurityAnomalyRecord = {
        anomalyId,
        companyId,
        severity,
        type,
        score,
        triggeringEvents,
        reason,
        detectedAt: new Date().toISOString(),
        status: 'DETECTED',
        recommendedAction: this.getRecommendedAction(type)
      };

      const ref = doc(db, 'companies', companyId, 'security_anomalies', anomalyId);
      await setDoc(ref, anomaly);

      // Trigger notification if HIGH or CRITICAL
      if (severity === 'HIGH' || severity === 'CRITICAL') {
        await this.notifyAdmins(companyId, anomaly);
      }

    } catch (err) {
      console.error('[SecurityAuditService] Failed to create anomaly:', err);
    }
  }

  private static getRecommendedAction(type: string): string {
    switch (type) {
      case 'REPEATED_FAILED_ACTIONS': return 'Review user login attempts and optionally enforce password reset or temporary lockout.';
      case 'UNAUTHORIZED_ACCESS_ATTEMPT': return 'Verify user role and intent. Ensure site boundaries are configured correctly.';
      case 'SUSPICIOUS_PROXY_ACTIVITY': return 'Review active delegations for the user to ensure legitimate proxy assignment.';
      case 'AFTER_HOURS_ADMIN_ACTIVITY': return 'Confirm if the administrative action was scheduled or authorized.';
      default: return 'Review the triggering events for security context.';
    }
  }

  private static async notifyAdmins(companyId: string, anomaly: SecurityAnomalyRecord) {
    try {
      // Using the generic notification collection directly or we can reuse existing logic if accessible here.
      // We will write to the canonical isolated notifications collection.
      const notificationId = (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `ID-${Date.now()}-${Math.random().toString(36).substring(2,6)}`);
      const notification = {
        notificationId,
        companyId,
        userId: 'SYSTEM',
        title: `Security Anomaly: ${anomaly.type}`,
        message: `A ${anomaly.severity} severity anomaly was detected: ${anomaly.reason}`,
        type: 'SECURITY_ALERT',
        read: false,
        timestamp: new Date().toISOString(),
        targetRoles: ['SUPER_ADMIN', 'COMPANY_ADMIN']
      };
      const notifRef = doc(db, 'companies', companyId, 'notifications', notificationId);
      await setDoc(notifRef, notification);
    } catch (err) {
      console.error('[SecurityAuditService] Failed to notify admins:', err);
    }
  }

  static async getEvents(session: UserSession): Promise<SecurityEventRecord[]> {
    if (!session || !session.companyId) return [];
    try {
      const q = query(
        collection(db, 'companies', session.companyId, 'security_events'),
        orderBy('timestamp', 'desc'),
        limit(100)
      );
      const snap = await getDocs(q);
      return snap.docs.map(d => d.data() as SecurityEventRecord);
    } catch (err) {
      console.error('[SecurityAuditService] Failed to fetch events:', err);
      return [];
    }
  }

  static async getAnomalies(session: UserSession): Promise<SecurityAnomalyRecord[]> {
    if (!session || !session.companyId) return [];
    try {
      const q = query(
        collection(db, 'companies', session.companyId, 'security_anomalies'),
        orderBy('detectedAt', 'desc'),
        limit(50)
      );
      const snap = await getDocs(q);
      return snap.docs.map(d => d.data() as SecurityAnomalyRecord);
    } catch (err) {
      console.error('[SecurityAuditService] Failed to fetch anomalies:', err);
      return [];
    }
  }

  static async updateAnomalyStatus(session: UserSession, anomalyId: string, status: SecurityAnomalyRecord['status']): Promise<boolean> {
    if (!session || !session.companyId) return false;
    // Basic RBAC
    if (session.role !== 'SUPER_ADMIN' && session.role !== 'COMPANY_ADMIN') return false;

    try {
      const ref = doc(db, 'companies', session.companyId, 'security_anomalies', anomalyId);
      await updateDoc(ref, { status });
      
      // Log this status change as an event!
      await this.logEvent(
        session.companyId,
        session.userId,
        session.role,
        session.employeeId,
        'ANOMALY_STATUS_UPDATED',
        'security_anomalies',
        anomalyId,
        true,
        'LOW',
        `Updated anomaly status to ${status}`,
        undefined
      );

      return true;
    } catch (err) {
      console.error('[SecurityAuditService] Failed to update anomaly status:', err);
      return false;
    }
  }
}
