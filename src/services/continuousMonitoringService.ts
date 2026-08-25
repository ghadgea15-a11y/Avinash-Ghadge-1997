import { collection, doc, setDoc, getDocs, getDoc, query, orderBy, limit, where, runTransaction, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { 
  UserSession, 
  SecurityEventRecord, 
  SecurityDetectionRule,
  DetectedRiskEvent,
  DetectedRiskStatus
} from '../types';
import { SecurityAuditService } from './securityAuditService';

// Support mocking for tests
let _getDocsCM = getDocs;
export function _setGetDocsMockCM(mock: any) { _getDocsCM = mock; }
let _setDocCM = setDoc;
export function _setSetDocMockCM(mock: any) { _setDocCM = mock; }
let _updateDocCM = updateDoc;
export function _setUpdateDocMockCM(mock: any) { _updateDocCM = mock; }
let _runTransactionCM = runTransaction;
export function _setRunTransactionMockCM(mock: any) { _runTransactionCM = mock; }

export class ContinuousMonitoringService {
  /**
   * Retrieves active detection rules for a company
   */
  static async getActiveRules(companyId: string): Promise<SecurityDetectionRule[]> {
    try {
      const q = query(
        collection(db, 'companies', companyId, 'security_detection_rules'),
        where('enabled', '==', true)
      );
      const snap = await _getDocsCM(q);
      return snap.docs.map(d => d.data() as SecurityDetectionRule);
    } catch (err) {
      console.error('[ContinuousMonitoringService] Failed to fetch active rules:', err);
      return [];
    }
  }

  /**
   * Evaluates an incoming security event against active rules
   */
  static async evaluateEvent(companyId: string, event: SecurityEventRecord): Promise<void> {
    try {
      const rules = await this.getActiveRules(companyId);
      if (!rules.length) return;

      const now = new Date(event.timestamp);

      // We only evaluate rules that are active and effective
      const applicableRules = rules.filter(r => 
        (!r.effectiveDate || new Date(r.effectiveDate) <= now) && 
        (r.eventType === 'ANY' || r.eventType === event.action)
      );

      for (const rule of applicableRules) {
        const windowMins = rule.timeWindowMinutes || rule.windowMinutes || 15;
        // Query recent events matching the rule's criteria
        const startTime = new Date(now.getTime() - windowMins * 60000);
        
        const q = query(
          collection(db, 'companies', companyId, 'security_events'),
          where('userId', '==', event.userId),
          where('action', '==', event.action),
          where('timestamp', '>=', startTime.toISOString()),
          orderBy('timestamp', 'desc'),
          limit(rule.threshold + 5) 
        );
        
        const snap = await _getDocsCM(q);
        let count = snap.docs.length;
        
        let triggered = false;
        if (rule.condition === 'COUNT_GREATER_THAN_EQUAL' && count >= rule.threshold) triggered = true;
        if (rule.condition === 'COUNT_GREATER_THAN' && count > rule.threshold) triggered = true;

        if (triggered) {
          // Check if we already created a risk event recently for this rule+user to avoid spam
          const duplicateCheckQuery = query(
            collection(db, 'companies', companyId, 'detected_risk_events'),
            where('ruleId', '==', rule.id),
            where('userId', '==', event.userId),
            where('timestamp', '>=', startTime.toISOString()),
            limit(1)
          );
          const dupSnap = await _getDocsCM(duplicateCheckQuery);
          
          if (dupSnap.empty) {
             await this.createDetectedRiskEvent(companyId, rule, event, count);
          }
        }
      }
    } catch (err) {
      console.error('[ContinuousMonitoringService] Error evaluating event:', err);
    }
  }

  private static async createDetectedRiskEvent(
    companyId: string, 
    rule: SecurityDetectionRule, 
    triggerEvent: SecurityEventRecord,
    count: number
  ) {
    const eventId = `RISK-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const now = new Date().toISOString();

    const riskEvent: DetectedRiskEvent = {
      id: eventId,
      companyId,
      ruleId: rule.id,
      ruleName: rule.name,
      eventType: rule.eventType,
      source: triggerEvent.source,
      userId: triggerEvent.userId,
      userRole: triggerEvent.role,
      timestamp: now,
      severity: rule.severity,
      evidence: JSON.stringify({ triggerEvent, count, timeWindow: rule.timeWindowMinutes }),
      description: `Rule "${rule.name}" triggered: ${count} events detected in ${rule.timeWindowMinutes} minutes.`,
      status: 'DETECTED',
      updatedAt: now
    };

    const ref = doc(db, 'companies', companyId, 'detected_risk_events', eventId);
    await _setDocCM(ref, riskEvent);

    // Send notifications for High/Critical
    if (rule.severity === 'HIGH' || rule.severity === 'CRITICAL') {
      const notifRef = doc(db, 'companies', companyId, 'notifications', `NOTIF-${eventId}`);
      await _setDocCM(notifRef, {
        id: `NOTIF-${eventId}`,
        companyId,
        userId: 'SYSTEM',
        title: `Risk Detected: ${rule.name}`,
        message: riskEvent.description,
        type: rule.severity === 'CRITICAL' ? 'ALERT' : 'WARNING',
        isRead: false,
        timestamp: new Date().toISOString(),
        severity: rule.severity,
        referenceId: eventId,
        referenceType: 'DETECTED_RISK_EVENT',
        roleScope: ['SUPER_ADMIN', 'COMPANY_ADMIN']
      });
    }
  }

  /**
   * Update the status of a detected risk event (Lifecycle)
   */
  static async updateRiskEventStatus(
    session: UserSession,
    eventId: string,
    newStatus: DetectedRiskStatus,
    notes?: string
  ): Promise<boolean> {
    if (session.role !== 'SUPER_ADMIN' && session.role !== 'COMPANY_ADMIN') {
      throw new Error('Unauthorized role for risk remediation.');
    }

    try {
      const ref = doc(db, 'companies', session.companyId, 'detected_risk_events', eventId);
      
      const updateData: Partial<DetectedRiskEvent> = {
        status: newStatus,
        updatedAt: new Date().toISOString()
      };

      if (newStatus === 'CLOSED' || newStatus === 'FALSE_POSITIVE' || newStatus === 'CONFIRMED') {
        if (notes) updateData.closureNotes = notes;
        if (newStatus === 'CLOSED') updateData.closedAt = new Date().toISOString();
      } else if (newStatus === 'INVESTIGATION') {
        if (notes) updateData.investigationNotes = notes;
      } else if (newStatus === 'REMEDIATION') {
        if (notes) updateData.remediation = notes;
      }

      await _updateDocCM(ref, updateData);

      await SecurityAuditService.logEvent(
        session.companyId,
        session.userId,
        session.role,
        session.employeeId,
        'RISK_EVENT_STATUS_UPDATED',
        'detected_risk_events',
        eventId,
        true,
        'MEDIUM',
        `Risk event status changed to ${newStatus}. Notes: ${notes || 'none'}`
      );

      return true;
    } catch (err) {
      console.error('[ContinuousMonitoringService] Failed to update risk event:', err);
      return false;
    }
  }

  /**
   * Creates a new detection rule (Configurability)
   */
  
  /**
   * Fetch detected risk events for dashboard
   */
  static async getRiskEvents(companyId: string): Promise<DetectedRiskEvent[]> {
    try {
      if (_getDocsCM) {
        const q = query(
          collection(db, 'companies', companyId, 'detected_risk_events'),
          orderBy('timestamp', 'desc'),
          limit(100)
        );
        const snap = await _getDocsCM(q);
        return snap.docs.map(d => d.data() as DetectedRiskEvent);
      }
      return [];
    } catch (err) {
      console.error('[ContinuousMonitoringService] Failed to fetch risk events:', err);
      return [];
    }
  }

  static async createDetectionRule(
    session: UserSession,
    ruleData: Omit<SecurityDetectionRule, 'id' | 'companyId' | 'createdAt' | 'updatedAt'>
  ): Promise<SecurityDetectionRule> {
    if (session.role !== 'SUPER_ADMIN') {
      throw new Error('Only SUPER_ADMIN can configure detection rules.');
    }

    const id = `RULE-${Date.now()}`;
    const now = new Date().toISOString();
    const rule: SecurityDetectionRule = {
      ...ruleData,
      id,
      companyId: session.companyId,
      createdAt: now,
      updatedAt: now
    };

    const ref = doc(db, 'companies', session.companyId, 'security_detection_rules', id);
    await _setDocCM(ref, rule);

    await SecurityAuditService.logEvent(
      session.companyId,
      session.userId,
      session.role,
      session.employeeId,
      'DETECTION_RULE_CREATED',
      'security_detection_rules',
      id,
      true,
      'HIGH',
      `Created security detection rule: ${rule.name}`
    );

    return rule;
  }

  static async seedDefaultRules(companyId: string) {
    const rules: SecurityDetectionRule[] = [
      {
        id: `RULE-MULTI-SENSITIVE`,
        name: 'Multiple Sensitive Changes',
        description: 'Detects if a user attempts multiple sensitive changes within a short window',
        eventType: 'CHANGE_REQUESTED',
        condition: 'COUNT_GREATER_THAN_EQUAL',
        threshold: 3,
        windowMinutes: 15,
        timeWindowMinutes: 15,
        severity: 'HIGH',
        enabled: true,
        
      },
      {
        id: `RULE-FAILED-ACCESS`,
        name: 'Repeated Failed Access',
        description: 'Detects repeated unauthorized or failed access attempts',
        eventType: 'UNAUTHORIZED_ACCESS',
        condition: 'COUNT_GREATER_THAN_EQUAL',
        threshold: 5,
        windowMinutes: 5,
        timeWindowMinutes: 5,
        severity: 'HIGH',
        enabled: true,
        
      },
      {
        id: `RULE-CROSS-SCOPE`,
        name: 'Cross-Scope Attempts',
        description: 'Detects attempts to access data outside of the assigned scope',
        eventType: 'CROSS_SCOPE_ACCESS_DENIED',
        condition: 'COUNT_GREATER_THAN_EQUAL',
        threshold: 2,
        windowMinutes: 10,
        timeWindowMinutes: 10,
        severity: 'CRITICAL',
        enabled: true,
        
      },
      {
        id: `RULE-RAPID-PERMISSIONS`,
        name: 'Rapid Permission Changes',
        description: 'Detects rapid changes to user permissions',
        eventType: 'PERMISSION_CHANGE',
        condition: 'COUNT_GREATER_THAN_EQUAL',
        threshold: 3,
        windowMinutes: 30,
        timeWindowMinutes: 30,
        severity: 'CRITICAL',
        enabled: true,
        
      }
    ];

    for (const rule of rules) {
      const ref = doc(db, 'companies', companyId, 'security_detection_rules', rule.id);
      await setDoc(ref, rule, { merge: true });
    }
  }

}
