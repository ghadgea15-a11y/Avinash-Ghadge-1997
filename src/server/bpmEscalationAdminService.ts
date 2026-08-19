import { getAdminDb, hasAdminCredentials } from './firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';
import { BpmApprovalInstance, EscalationPolicy, BpmEscalationEvent, EscalationTargetType } from '../types/bpm';
import { AppNotification } from '../types';

export interface AdminEscalationProcessResult {
  instanceId: string;
  evaluated: boolean;
  actionsTaken: {
    reminderSent: boolean;
    dueTriggered: boolean;
    escalatedLevel?: number;
    reassigned: boolean;
    finalEscalation: boolean;
  };
  details: string[];
}

export class BpmEscalationAdminService {
  private static loggedCredentialNotice = false;
  
  static async processInstanceTimers(
    companyId: string,
    instanceId: string,
    authoritativeTime?: Date
  ): Promise<AdminEscalationProcessResult> {
    const result: AdminEscalationProcessResult = {
      instanceId,
      evaluated: false,
      actionsTaken: {
        reminderSent: false,
        dueTriggered: false,
        reassigned: false,
        finalEscalation: false
      },
      details: []
    };

    if (!hasAdminCredentials()) {
      result.details.push('Skipped: Server Admin credentials not configured.');
      return result;
    }

    const db = getAdminDb();
    const now = authoritativeTime || new Date();
    const nowIso = now.toISOString();

    const instanceRef = db.collection('companies').doc(companyId).collection('bpm_instances').doc(instanceId);
    
    await db.runTransaction(async (transaction: any) => {
      const instanceSnap = await transaction.get(instanceRef);
      if (!instanceSnap.exists) {
        result.details.push('Instance does not exist.');
        return;
      }

      const instance = instanceSnap.data() as BpmApprovalInstance;
      
      // 1. Terminal State Check
      if (['APPROVED', 'REJECTED', 'RETURNED', 'CANCELLED', 'EXPIRED'].includes(instance.status)) {
        result.details.push(`No action required. Instance is in terminal state: ${instance.status}`);
        return;
      }

      result.evaluated = true;
      const stepId = instance.currentTier.toString();
      
      // 2. Fetch Active Policy
      const policyId = instance.escalationPolicyId;
      if (!policyId) {
        result.details.push('No escalation policy bound to this instance.');
        return;
      }

      const policyRef = db.collection('companies').doc(companyId).collection('bpm_escalation_policies').doc(policyId);
      const policySnap = await transaction.get(policyRef);
      if (!policySnap.exists) {
        result.details.push(`Bound policy ${policyId} not found.`);
        return;
      }

      const policy = policySnap.data() as EscalationPolicy;
      const policyVersion = instance.policyVersion || policy.version;
      const assignedTime = new Date(instance.updatedAt || instance.submittedAt).getTime();

      // =============================================================
      // A. REMINDER EVALUATION
      // =============================================================
      if (policy.reminderAfterMinutes && policy.reminderAfterMinutes > 0) {
        const reminderTargetTime = assignedTime + (policy.reminderAfterMinutes * 60 * 1000);
        
        if (now.getTime() >= reminderTargetTime && !instance.lastReminderAt) {
          const reminderEventId = `ESC_${companyId}_${instanceId}_${stepId}_V${policyVersion}_REMINDER`;
          const reminderEventRef = db.collection('companies').doc(companyId).collection('bpm_escalation_events').doc(reminderEventId);
          const existingReminderSnap = await transaction.get(reminderEventRef);

          if (!existingReminderSnap.exists) {
            const notifId = `NOTIF_${reminderEventId}`;
            const notifRef = db.collection('companies').doc(companyId).collection('notifications').doc(notifId);

            const reminderNotification: AppNotification = {
              id: notifId,
              title: `Action Required: Pending Approval (${instance.sourceModule})`,
              message: `Approval request ${instance.sourceRecordId} requires your review.`,
              type: 'INFO',
              timestamp: nowIso,
              isRead: false,
              actionRoute: 'APPROVAL_CENTER'
            };

            transaction.set(notifRef, reminderNotification);

            const reminderEvent: BpmEscalationEvent = {
              id: reminderEventId,
              companyId,
              approvalInstanceId: instanceId,
              workflowId: instance.workflowId,
              stepId,
              policyId: policy.policyId,
              policyVersion,
              eventType: 'REMINDER',
              escalationLevel: 0,
              previousApprovers: [...instance.currentApprovers],
              escalatedTo: [...instance.currentApprovers],
              reassigned: false,
              reason: `Scheduled reminder triggered after ${policy.reminderAfterMinutes} minutes.`,
              triggeredAt: nowIso,
              notificationId: notifId,
              status: 'PROCESSED'
            };

            transaction.set(reminderEventRef, reminderEvent);

            instance.lastReminderAt = nowIso;
            instance.updatedAt = nowIso;
            result.actionsTaken.reminderSent = true;
            result.details.push('Sent reminder notification.');
          }
        }
      }

      // =============================================================
      // B. DUE / OVERDUE EVALUATION
      // =============================================================
      const dueThresholdMs = (policy.dueAfterMinutes || 1440) * 60 * 1000;
      const dueTargetTime = assignedTime + dueThresholdMs;

      if (now.getTime() >= dueTargetTime && !instance.isOverdue) {
        const dueEventId = `ESC_${companyId}_${instanceId}_${stepId}_V${policyVersion}_L0_DUE`;
        const dueEventRef = db.collection('companies').doc(companyId).collection('bpm_escalation_events').doc(dueEventId);
        const existingDueSnap = await transaction.get(dueEventRef);

        if (!existingDueSnap.exists) {
          const notifId = `NOTIF_${dueEventId}`;
          const notifRef = db.collection('companies').doc(companyId).collection('notifications').doc(notifId);

          const dueNotification: AppNotification = {
            id: notifId,
            title: `Urgent: Approval Overdue (${instance.sourceModule})`,
            message: `Approval request ${instance.sourceRecordId} is now OVERDUE. Please take immediate action.`,
            type: 'WARNING',
            timestamp: nowIso,
            isRead: false,
            actionRoute: 'APPROVAL_CENTER'
          };

          transaction.set(notifRef, dueNotification);

          const dueEvent: BpmEscalationEvent = {
            id: dueEventId,
            companyId,
            approvalInstanceId: instanceId,
            workflowId: instance.workflowId,
            stepId,
            policyId: policy.policyId,
            policyVersion,
            eventType: 'DUE',
            escalationLevel: 0,
            previousApprovers: [...instance.currentApprovers],
            escalatedTo: [...instance.currentApprovers],
            reassigned: false,
            reason: `Approval due time reached (${policy.dueAfterMinutes} minutes elapsed).`,
            triggeredAt: nowIso,
            notificationId: notifId,
            status: 'PROCESSED'
          };

          transaction.set(dueEventRef, dueEvent);

          instance.isOverdue = true;
          instance.updatedAt = nowIso;
          result.actionsTaken.dueTriggered = true;
          result.details.push('Marked instance as overdue.');
        }
      }

      // =============================================================
      // C. ESCALATION LADDER EVALUATION
      // =============================================================
      if (policy.levels && policy.levels.length > 0) {
        for (let i = 0; i < policy.levels.length; i++) {
          const levelConfig = policy.levels[i];
          
          if (instance.escalationLevel && instance.escalationLevel >= levelConfig.level) {
            continue;
          }

          const escTargetTime = assignedTime + (levelConfig.escalationAfterMinutes * 60 * 1000);
          
          if (now.getTime() >= escTargetTime) {
            const isFinal = i === policy.levels.length - 1;
            const eventType = isFinal ? 'FINAL_ESCALATION' : 'ESCALATION_LEVEL_1'; // Simplified naming for intermediate levels
            
            const escalationEventId = `ESC_${companyId}_${instanceId}_${stepId}_V${policyVersion}_L${levelConfig.level}_ESC`;
            const escalationEventRef = db.collection('companies').doc(companyId).collection('bpm_escalation_events').doc(escalationEventId);
            const existingEscSnap = await transaction.get(escalationEventRef);

            if (!existingEscSnap.exists) {
              const previousApprovers = [...instance.currentApprovers];
              
              const allowReassignment = levelConfig.reassignmentAllowed || policy.reassignmentAllowed;
              let resolvedTargets = ['admin@' + companyId];
              
              if (levelConfig.targetUserId) {
                resolvedTargets = [levelConfig.targetUserId];
              } else if (levelConfig.targetRole) {
                resolvedTargets = [levelConfig.targetRole];
              }

              if (allowReassignment) {
                instance.currentApprovers = resolvedTargets;
                instance.reassignedFrom = previousApprovers;
                result.actionsTaken.reassigned = true;
              }

              const notifId = `NOTIF_${escalationEventId}`;
              const notifRef = db.collection('companies').doc(companyId).collection('notifications').doc(notifId);

              const escalationNotif: AppNotification = {
                id: notifId,
                title: isFinal ? `Final Escalation: ${instance.sourceModule} Approval` : `Escalation Notice: ${instance.sourceModule} Approval`,
                message: levelConfig.customNotificationMessage || `Approval request ${instance.sourceRecordId} has been escalated to Level ${levelConfig.level}.`,
                type: 'ALERT',
                timestamp: nowIso,
                isRead: false,
                actionRoute: 'APPROVAL_CENTER'
              };

              transaction.set(notifRef, escalationNotif);

              const escEvent: BpmEscalationEvent = {
                id: escalationEventId,
                companyId,
                approvalInstanceId: instanceId,
                workflowId: instance.workflowId,
                stepId,
                policyId: policy.policyId,
                policyVersion,
                eventType: isFinal ? 'FINAL_ESCALATION' : 'ESCALATION_LEVEL_1',
                escalationLevel: levelConfig.level,
                previousApprovers,
                escalatedTo: resolvedTargets,
                reassigned: !!allowReassignment,
                reason: `Escalated after ${levelConfig.escalationAfterMinutes} minutes elapsed. Target type: ${levelConfig.escalationTargetType}.`,
                triggeredAt: nowIso,
                notificationId: notifId,
                status: 'PROCESSED'
              };

              transaction.set(escalationEventRef, escEvent);

              instance.escalationLevel = levelConfig.level;
              instance.lastEscalationAt = nowIso;
              instance.updatedAt = nowIso;

              result.actionsTaken.escalatedLevel = levelConfig.level;
              if (isFinal) result.actionsTaken.finalEscalation = true;
              result.details.push(`Escalated to Level ${levelConfig.level} (Reassigned: ${allowReassignment}).`);

              break;
            }
          }
        }
      }

      transaction.set(instanceRef, instance);
    });

    // Write audit events securely outside the transaction using Admin SDK
    try {
      const auditRef = db.collection('companies').doc(companyId).collection('audit_logs').doc();
      if (result.actionsTaken.reminderSent) {
        await auditRef.set({
          id: auditRef.id,
          module: 'SYSTEM_BPM_TIMER',
          action: 'APPROVAL_REMINDER_SENT',
          description: `Sent scheduled reminder for approval ${instanceId}.`,
          userId: 'SYSTEM',
          userName: 'BPM Escalation Engine',
          timestamp: nowIso,
          targetId: instanceId
        });
      }

      if (result.actionsTaken.dueTriggered) {
        await db.collection('companies').doc(companyId).collection('audit_logs').doc().set({
          module: 'SYSTEM_BPM_TIMER',
          action: 'APPROVAL_DUE_TRIGGERED',
          description: `Approval ${instanceId} reached due threshold and was marked overdue.`,
          userId: 'SYSTEM',
          userName: 'BPM Escalation Engine',
          timestamp: nowIso,
          targetId: instanceId
        });
      }

      if (result.actionsTaken.escalatedLevel !== undefined) {
        await db.collection('companies').doc(companyId).collection('audit_logs').doc().set({
          module: 'SYSTEM_BPM_TIMER',
          action: result.actionsTaken.finalEscalation ? 'APPROVAL_FINAL_ESCALATION' : `APPROVAL_ESCALATED_LEVEL_${result.actionsTaken.escalatedLevel}`,
          description: `Approval ${instanceId} escalated to Level ${result.actionsTaken.escalatedLevel} (Reassigned: ${result.actionsTaken.reassigned}).`,
          userId: 'SYSTEM',
          userName: 'BPM Escalation Engine',
          timestamp: nowIso,
          targetId: instanceId
        });
      }
    } catch (e) {
      console.warn('Audit log write failure:', e);
    }

    return result;
  }

  static async processAllCompanyPendingApprovals(
    companyId: string,
    authoritativeTime?: Date
  ) {
    if (!hasAdminCredentials()) {
      if (!this.loggedCredentialNotice) {
        console.info('[BpmEscalationAdminService] Server-side Firebase Admin service account not configured. Background escalation cron is idle (client-side triggers handle active sessions).');
        this.loggedCredentialNotice = true;
      }
      return { totalChecked: 0, totalEscalated: 0, totalReminders: 0, results: [], skipped: true };
    }

    const db = getAdminDb();
    try {
      const snapshot = await db.collection('companies').doc(companyId).collection('bpm_instances')
        .where('status', '==', 'PENDING_APPROVAL')
        .get();
      
      let totalReminders = 0;
      let totalEscalated = 0;
      const results: AdminEscalationProcessResult[] = [];

      for (const doc of snapshot.docs) {
        const instanceId = doc.id;
        try {
          const res = await this.processInstanceTimers(companyId, instanceId, authoritativeTime);
          results.push(res);
          if (res.actionsTaken.reminderSent) totalReminders++;
          if (res.actionsTaken.escalatedLevel !== undefined) totalEscalated++;
        } catch (itemErr) {
          console.warn(`[BpmEscalationAdminService] Warning processing instance ${instanceId}:`, itemErr);
        }
      }

      return {
        totalChecked: snapshot.size,
        totalEscalated,
        totalReminders,
        results
      };
    } catch (err: any) {
      console.warn(`[BpmEscalationAdminService] processAllCompanyPendingApprovals skipped for ${companyId}:`, err?.message || err);
      return { totalChecked: 0, totalEscalated: 0, totalReminders: 0, results: [] };
    }
  }

  static async processAllPendingApprovalsGlobally(
    authoritativeTime?: Date
  ) {
    if (!hasAdminCredentials()) {
      if (!this.loggedCredentialNotice) {
        console.info('[BpmEscalationAdminService] Server-side Firebase Admin service account not configured. Background escalation cron is idle (client-side triggers handle active sessions).');
        this.loggedCredentialNotice = true;
      }
      return { companiesProcessed: 0, totalEvaluated: 0, totalEscalated: 0, skipped: true };
    }

    const db = getAdminDb();
    try {
      const compSnap = await db.collection('companies').get();
      let companiesProcessed = 0;
      let totalEvaluated = 0;
      let totalEscalated = 0;

      for (const compDoc of compSnap.docs) {
        const companyId = compDoc.id;
        // Auto-refresh delegation lifecycle states
        await this.refreshCompanyDelegations(companyId, authoritativeTime);

        const res = await this.processAllCompanyPendingApprovals(companyId, authoritativeTime);
        companiesProcessed++;
        totalEvaluated += res.totalChecked;
        totalEscalated += res.totalEscalated;
      }

      return {
        companiesProcessed,
        totalEvaluated,
        totalEscalated
      };
    } catch (err: any) {
      console.warn('[BpmEscalationAdminService] processAllPendingApprovalsGlobally skipped:', err?.message || err);
      return { companiesProcessed: 0, totalEvaluated: 0, totalEscalated: 0 };
    }
  }

  /**
   * Auto-expires past delegations and activates scheduled ones server-authoritatively.
   */
  static async refreshCompanyDelegations(companyId: string, authoritativeTime?: Date): Promise<number> {
    const db = getAdminDb();
    const now = authoritativeTime || new Date();
    const nowMs = now.getTime();
    const nowIso = now.toISOString();

    try {
      const snap = await db.collection('companies').doc(companyId).collection('bpm_delegations')
        .where('status', 'in', ['ACTIVE', 'SCHEDULED'])
        .get();

      let updated = 0;
      const batch = db.batch();

      for (const doc of snap.docs) {
        const data = doc.data();
        const startMs = new Date(data.startAt).getTime();
        const endMs = new Date(data.endAt).getTime();

        if (nowMs > endMs && data.status !== 'EXPIRED') {
          batch.update(doc.ref, { status: 'EXPIRED', updatedAt: nowIso });
          updated++;
        } else if (nowMs >= startMs && nowMs <= endMs && data.status === 'SCHEDULED') {
          batch.update(doc.ref, { status: 'ACTIVE', updatedAt: nowIso });
          updated++;
        }
      }

      if (updated > 0) {
        await batch.commit();
      }
      return updated;
    } catch (err) {
      console.warn(`[BpmEscalationAdminService] refreshCompanyDelegations error for ${companyId}:`, err);
      return 0;
    }
  }
}
