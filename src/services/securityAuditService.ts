import { collection, doc, setDoc, getDocs, query, where, orderBy, limit, Timestamp, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { UserSession, SecurityEventRecord, SecurityAnomalyRecord, SecuritySeverity } from '../types';

import { CompliancePolicyEngine } from './compliancePolicyEngine';
import { ContinuousMonitoringService } from './continuousMonitoringService';

export let _getDocs = getDocs;
export function _setGetDocsMock(mock: any) {
  _getDocs = mock;
}
export let _setDoc = setDoc;
export function _setSetDocMock(mock: any) {
  _setDoc = mock;
}
export let _updateDoc = updateDoc;
export function _setUpdateDocMock(mock: any) {
  _updateDoc = mock;
}


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
      
      // Fire-and-forget or timeout protected write to avoid blocking UI during login
      const writePromise = _setDoc(eventRef, eventRecord as SecurityEventRecord);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('TIMEOUT')), 5000)
      );

      // We wait but with a timeout to ensure login proceeds even if logging is slow
      await Promise.race([writePromise, timeoutPromise]).catch(err => {
        console.warn('[SecurityAuditService] Security event write timed out or failed:', err);
      });

      // Asynchronously trigger anomaly detection so we don't block
      this.runAnomalyDetection(companyId, eventRecord).catch(e => console.error('Anomaly detection failed', e));

      // Evaluate Continuous Monitoring Rules
      ContinuousMonitoringService.evaluateEvent(companyId, eventRecord).catch(err => console.error('[SecurityAuditService] CM Eval Error:', err));

      return eventRecord;
    } catch (err) {
      console.error('[SecurityAuditService] Failed to log security event:', err);
      return null;
    }
  }

  static async logUnauthorizedAttempt(
    session: UserSession,
    reason: string,
    resource: string = 'system',
    resourceId: string = 'UNKNOWN'
  ): Promise<void> {
    await this.logEvent(
      session.companyId,
      session.userId,
      session.role,
      session.employeeId,
      'UNAUTHORIZED_ACCESS',
      resource,
      resourceId,
      false,
      'HIGH',
      reason
    ).catch(() => {});
  }

  static async logCrossCompanyAttempt(
    session: UserSession,
    targetCompanyId: string,
    resource: string = 'company_data',
    resourceId: string = 'UNKNOWN'
  ): Promise<void> {
    await this.logEvent(
      session.companyId,
      session.userId,
      session.role,
      session.employeeId,
      'CROSS_COMPANY_ACCESS_DENIED',
      resource,
      resourceId,
      false,
      'CRITICAL',
      `Attempted to access data for company ${targetCompanyId}`
    ).catch(() => {});
  }

  /**
   * Run rule-based anomaly detection based on recent events.
   */
  static async runAnomalyDetection(companyId: string, triggerEvent: SecurityEventRecord): Promise<void> {
    try {
      // 1. Rule: Repeated Failed Authentication / Action
      if (!triggerEvent.success && triggerEvent.action !== 'CROSS_COMPANY_ACCESS_DENIED' && triggerEvent.action !== 'CROSS_SITE_ACCESS_DENIED' && triggerEvent.action !== 'UNAUTHORIZED_ACCESS') {
        const recentTime = new Date();
        recentTime.setMinutes(recentTime.getMinutes() - 15); // last 15 mins
        const q = query(
          collection(db, 'companies', companyId, 'security_events'),
          where('userId', '==', triggerEvent.userId),
          where('success', '==', false),
          orderBy('timestamp', 'desc'),
          limit(10)
        );
        const snap = await _getDocs(q);
        const recentFailedEvents = snap.docs.map(d => d.data() as SecurityEventRecord).filter(e => new Date(e.timestamp) >= recentTime);

        if (recentFailedEvents.length >= 5) {
          await this.createAnomaly(
            companyId,
            'REPEATED_FAILED_ACTIONS',
            'CRITICAL',
            90,
            recentFailedEvents.map(e => e.eventId || e.id || 'unknown'),
            `User ${triggerEvent.userId} had ${recentFailedEvents.length} failed actions in 15 minutes.`
          );
        }
      }

      // 2. Rule: Repeated Unauthorized Access Attempts
      if (triggerEvent.action === 'UNAUTHORIZED_ACCESS') {
        const recentTime = new Date();
        recentTime.setHours(recentTime.getHours() - 1); // last 1 hour
        const q = query(
          collection(db, 'companies', companyId, 'security_events'),
          where('userId', '==', triggerEvent.userId),
          where('action', '==', 'UNAUTHORIZED_ACCESS'),
          orderBy('timestamp', 'desc'),
          limit(5)
        );
        const snap = await _getDocs(q);
        const recentUnauthorized = snap.docs.map(d => d.data() as SecurityEventRecord).filter(e => new Date(e.timestamp) >= recentTime);

        if (recentUnauthorized.length >= 3) {
          await this.createAnomaly(
            companyId,
            'UNAUTHORIZED_ACCESS_ATTEMPTS',
            'HIGH',
            85,
            recentUnauthorized.map(e => e.eventId || e.id || 'unknown'),
            `User ${triggerEvent.userId} had ${recentUnauthorized.length} unauthorized access attempts in 1 hour.`
          );
        } else if (recentUnauthorized.length === 1) {
          // Still create a medium one for a single attempt, or wait for repeated? Prompt says "repeated RBAC..."
          // But a single RBAC violation is still an anomaly. Let's just create an anomaly for the single event but lower severity, and a CRITICAL for repeated.
          await this.createAnomaly(
            companyId,
            'UNAUTHORIZED_ACCESS_ATTEMPTS',
            'MEDIUM',
            60,
            [triggerEvent.eventId || triggerEvent.id || 'unknown'],
            `User ${triggerEvent.userId} attempted unauthorized access: ${triggerEvent.reason || triggerEvent.details?.reason || ''}`
          );
        }
      }

      // 3. Rule: Cross-Company Access Attempt
      if (triggerEvent.action === 'CROSS_COMPANY_ACCESS_DENIED') {
        await this.createAnomaly(
          companyId,
          'CROSS_COMPANY_ACCESS',
          'CRITICAL',
          100,
          [triggerEvent.eventId || triggerEvent.id || 'unknown'],
          `User ${triggerEvent.userId} attempted cross-tenant access: ${triggerEvent.reason || triggerEvent.details?.reason || ''}`
        );
      }

      // 4. Rule: Cross-Site Access Attempt
      if (triggerEvent.action === 'CROSS_SITE_ACCESS_DENIED') {
        await this.createAnomaly(
          companyId,
          'CROSS_SITE_ACCESS',
          'HIGH',
          80,
          [triggerEvent.eventId || triggerEvent.id || 'unknown'],
          `User ${triggerEvent.userId} attempted cross-site access: ${triggerEvent.reason || triggerEvent.details?.reason || ''}`
        );
      }

      // 5. Rule: Suspicious Proxy Activity
      if (triggerEvent.action === 'DELEGATION_ACTED') {
        const recentTime = new Date();
        recentTime.setHours(recentTime.getHours() - 1);
        const q = query(
          collection(db, 'companies', companyId, 'security_events'),
          where('userId', '==', triggerEvent.userId),
          where('action', '==', 'DELEGATION_ACTED'),
          orderBy('timestamp', 'desc'),
          limit(15)
        );
        const snap = await _getDocs(q);
        const recentProxyEvents = snap.docs.map(d => d.data() as SecurityEventRecord).filter(e => new Date(e.timestamp) >= recentTime);

        if (recentProxyEvents.length >= 10) {
          await this.createAnomaly(
            companyId,
            'SUSPICIOUS_PROXY_ACTIVITY',
            'HIGH',
            75,
            recentProxyEvents.map(e => e.eventId || e.id || 'unknown'),
            `User ${triggerEvent.userId} performed ${recentProxyEvents.length} proxy actions in 1 hour.`
          );
        }
      }

      // 6. Rule: After-Hours Administrative Activity
      if ((triggerEvent.role === 'COMPANY_ADMIN' || triggerEvent.role === 'SUPER_ADMIN') && triggerEvent.success) {
        const hour = new Date(triggerEvent.timestamp).getHours();
        if (hour >= 23 || hour <= 4) {
          await this.createAnomaly(
            companyId,
            'AFTER_HOURS_ADMIN_ACTIVITY',
            'MEDIUM',
            65,
            [triggerEvent.eventId || triggerEvent.id || 'event-unknown'],
            `Admin ${triggerEvent.userId} performed action '${triggerEvent.action || triggerEvent.eventType}' outside normal business hours.`
          );
        }
      }

      // 7. Rule: Abnormal Approval Activity (e.g., > 10 approvals in 15 mins)
      if (triggerEvent.action === 'WORKFLOW_APPROVED' || triggerEvent.action === 'WORKFLOW_REJECTED') {
        const recentTime = new Date();
        recentTime.setMinutes(recentTime.getMinutes() - 15);
        const q = query(
          collection(db, 'companies', companyId, 'security_events'),
          where('userId', '==', triggerEvent.userId),
          where('action', 'in', ['WORKFLOW_APPROVED', 'WORKFLOW_REJECTED']),
          orderBy('timestamp', 'desc'),
          limit(15)
        );
        const snap = await _getDocs(q);
        const recentApprovals = snap.docs.map(d => d.data() as SecurityEventRecord).filter(e => new Date(e.timestamp) >= recentTime);

        if (recentApprovals.length >= 10) {
          await this.createAnomaly(
            companyId,
            'ABNORMAL_APPROVAL_ACTIVITY',
            'HIGH',
            80,
            recentApprovals.map(e => e.eventId || e.id || 'unknown'),
            `User ${triggerEvent.userId} processed ${recentApprovals.length} workflow approvals in under 15 minutes.`
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
        const existing = await _getDocs(q);
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
      await _setDoc(ref, anomaly);

      // Trigger notification if MEDIUM, HIGH or CRITICAL
      if (severity === 'MEDIUM' || severity === 'HIGH' || severity === 'CRITICAL') {
        await this.notifyAdmins(companyId, anomaly);
      }

      // 10.5 GRC GOVERNANCE & CLOSURE INTEGRATION
      // If the anomaly is HIGH or CRITICAL, automatically route it through the Compliance Policy Engine
      // so it becomes a formal GRC finding requiring remediation/investigation.
      if (severity === 'HIGH' || severity === 'CRITICAL') {
        await CompliancePolicyEngine.evaluateTransaction({
          companyId,
          module: 'SECURITY',
          transactionType: 'SECURITY_ANOMALY',
          transactionId: anomaly.anomalyId || anomaly.id || 'ANOMALY',
          subjectId: anomaly.anomalyId || anomaly.id || 'ANOMALY',
          data: { ...anomaly, isGovernanceRequired: true },
          correlationId: anomaly.anomalyId || anomaly.id || 'ANOMALY',
          source: 'SECURITY_AUDIT'
        }).catch(err => console.error('[SecurityAuditService] GRC escalation failed:', err));
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
      const anomId = anomaly.anomalyId || anomaly.id || 'ANOMALY';
      const anomType = anomaly.type || anomaly.anomalyType || 'SECURITY_ANOMALY';
      const anomReason = anomaly.reason || anomaly.details || '';
      // Deterministic notification ID for idempotency
      const notificationId = `NOTIF-${anomId}`;
      const notification = {
        id: notificationId,
        companyId,
        userId: 'SYSTEM',
        title: `Security Anomaly: ${anomType.replace(/_/g, ' ')}`,
        message: `A ${anomaly.severity} severity anomaly was detected: ${anomReason}`,
        type: anomaly.severity === 'CRITICAL' || anomaly.severity === 'HIGH' ? 'ALERT' : 'WARNING',
        isRead: false,
        timestamp: new Date().toISOString(),
        severity: anomaly.severity,
        referenceId: anomId,
        referenceType: 'SECURITY_ANOMALY',
        roleScope: ['SUPER_ADMIN', 'COMPANY_ADMIN']
      };
      const notifRef = doc(db, 'companies', companyId, 'notifications', notificationId);
      await _setDoc(notifRef, notification);

      // If CRITICAL, log automated response audit event
      if (anomaly.severity === 'CRITICAL') {
        await this.logEvent(
          companyId,
          'SYSTEM',
          'SYSTEM',
          undefined,
          'AUTOMATED_SECURITY_RESPONSE',
          'security_anomalies',
          anomId,
          true,
          'HIGH',
          `Dispatched critical security alert to tenant administrators for anomaly ${anomType}`,
          undefined
        );
      }
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
      const snap = await _getDocs(q);
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
      const snap = await _getDocs(q);
      return snap.docs.map(d => d.data() as SecurityAnomalyRecord);
    } catch (err) {
      console.error('[SecurityAuditService] Failed to fetch anomalies:', err);
      return [];
    }
  }

  static async updateAnomalyStatus(
    session: UserSession, 
    anomalyId: string, 
    status: SecurityAnomalyRecord['status'],
    resolutionNotes?: string
  ): Promise<boolean> {
    if (!session || !session.companyId) return false;
    // Basic RBAC
    if (session.role !== 'SUPER_ADMIN' && session.role !== 'COMPANY_ADMIN') {
      await this.logUnauthorizedAttempt(session, 'Unauthorized anomaly status update attempt', 'security_anomalies', anomalyId);
      throw new Error('Unauthorized anomaly status update attempt');
    }

    try {
      const ref = doc(db, 'companies', session.companyId, 'security_anomalies', anomalyId);
      
      const updateData: Partial<SecurityAnomalyRecord> = { status };
      
      if (status === 'RESOLVED' || status === 'FALSE_POSITIVE' || status === 'CONFIRMED') {
        updateData.resolvedByUserId = session.userId;
        updateData.resolvedAt = new Date().toISOString();
        if (resolutionNotes) {
          updateData.resolutionNotes = resolutionNotes;
        }
      }

      await _updateDoc(ref, updateData);
      
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
        `Updated anomaly status to ${status}${resolutionNotes ? ` - Notes: ${resolutionNotes}` : ''}`,
        undefined
      );

      return true;
    } catch (err) {
      console.error('[SecurityAuditService] Failed to update anomaly status:', err);
      return false;
    }
  }
}
