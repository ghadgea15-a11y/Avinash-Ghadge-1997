import { db } from '../firebase';
import { collection, doc, getDoc, getDocs, query, where, setDoc, updateDoc, runTransaction, serverTimestamp, writeBatch } from 'firebase/firestore';
import { 
  BpmApprovalWorkflow, 
  BpmApprovalStep,
  BpmApprovalInstance, 
  BpmApprovalAction, 
  ProxyDelegation,
  BpmApprovalState, 
  BpmApprovalActionType,
  EscalationPolicy
} from '../types/bpm';
import { UserSession, AppNotification } from '../types';
import { RbacService } from './rbacService';
import { BpmIntegrationService } from './bpmIntegrationService';
import { BpmEscalationService } from './bpmEscalationService';
import { BpmDelegationService } from './bpmDelegationService';
import { SecurityAuditService } from './securityAuditService';
import { AuditTrailService } from './auditTrailService';
import { BpmThresholdRoutingService } from './bpmThresholdRoutingService';

export class BpmService {

  // -------------------------------------------------------------
  // Workflow Resolution & Engine Execution
  // -------------------------------------------------------------

  /**
   * Evaluates business transaction with Threshold Routing Engine to determine 
   * the exact workflow and initializes an Approval Instance. 
   */
  static async submitForApproval(
    companyId: string,
    requesterId: string,
    sourceModule: string,
    sourceRecordId: string,
    transactionType: string,
    transactionData: any
  ): Promise<BpmApprovalInstance | null> {
    
    // 1. Authoritative Threshold Routing evaluation
    let selectedWorkflowId: string | undefined;
    let routingDecision: any = undefined;

    try {
      const routingResult = await BpmThresholdRoutingService.resolveWorkflowForTransaction(
        companyId,
        sourceModule,
        transactionType,
        transactionData || {},
        undefined,
        requesterId
      );
      if (routingResult && routingResult.selectedWorkflowId) {
        selectedWorkflowId = routingResult.selectedWorkflowId;
        routingDecision = routingResult.routingDecision;
      }
    } catch (err) {
      console.warn('[BpmService] Threshold routing evaluation error, falling back to direct workflow lookup:', err);
    }

    let workflow: BpmApprovalWorkflow | null = null;

    // 2. Fetch the routed workflow if resolved
    if (selectedWorkflowId) {
      const directWfQuery = query(
        collection(db, 'companies', companyId, 'bpm_workflows'),
        where('workflowId', '==', selectedWorkflowId),
        where('active', '==', true)
      );
      const directSnap = await getDocs(directWfQuery);
      if (!directSnap.empty) {
        workflow = directSnap.docs[0].data() as BpmApprovalWorkflow;
      }
    }

    // 3. Fallback to standard module/transaction workflow if not found
    if (!workflow) {
      const wfQuery = query(
        collection(db, 'companies', companyId, 'bpm_workflows'),
        where('module', '==', sourceModule),
        where('transactionType', '==', transactionType),
        where('active', '==', true)
      );
      const wfSnap = await getDocs(wfQuery);
      if (wfSnap.empty) {
        return null;
      }
      workflow = wfSnap.docs[0].data() as BpmApprovalWorkflow;
    }

    // 4. Validate conditions
    const isMatch = this.evaluateConditions(workflow, transactionData);
    if (!isMatch) {
      return null;
    }

    // 5. Resolve Tier 1 Approvers
    const step1 = workflow.steps.find(s => s.sequence === 1);
    if (!step1) {
      throw new Error(`Workflow ${workflow.workflowName} has no steps configured.`);
    }

    const currentApprovers = await this.resolveApprovers(companyId, step1, requesterId);

    // 6. Resolve Escalation Policy
    const escalationPolicy = await BpmEscalationService.getActivePolicy(
      companyId,
      sourceModule,
      transactionType,
      workflow.workflowId,
      step1.stepId
    );

    // 7. Create the instance
    const instanceId = doc(collection(db, 'bpm_instances')).id;
    const now = new Date().toISOString();
    const dueAt = escalationPolicy 
      ? new Date(Date.now() + (escalationPolicy.dueAfterMinutes || 1440) * 60 * 1000).toISOString()
      : undefined;

    const newInstance: BpmApprovalInstance = {
      id: instanceId,
      companyId: companyId,
      workflowId: workflow.workflowId,
      sourceModule,
      transactionType,
      sourceRecordId,
      requesterId,
      requesterName: transactionData?.requesterName || transactionData?.employeeName,
      status: 'SUBMITTED',
      currentTier: 1,
      currentStepId: step1.stepId,
      currentApprovers,
      history: [],
      submittedAt: now,
      routingDecision,
      escalationPolicyId: escalationPolicy?.policyId,
      policyVersion: escalationPolicy?.version || 1,
      escalationLevel: 0,
      dueAt,
      isOverdue: false,
      siteId: transactionData?.siteId,
      departmentId: transactionData?.departmentId,
      metadata: transactionData,
      createdAt: now,
      updatedAt: now
    };

    if (currentApprovers.length === 0) {
      newInstance.status = 'CANCELLED';
      // Audit: Approver Unavailable
    } else {
      newInstance.status = 'PENDING_APPROVAL';
      newInstance.assignedAt = now;
    }

    // Save
    await setDoc(doc(db, 'companies', companyId, 'bpm_instances', instanceId), newInstance);

    return newInstance;
  }

  // -------------------------------------------------------------
  // Approval Actions (Multi-Tier & Proxy Delegation)
  // -------------------------------------------------------------

  static async performAction(
    session: UserSession,
    instanceId: string,
    actionType: BpmApprovalActionType,
    reason?: string,
    delegateId?: string
  ): Promise<BpmApprovalInstance> {
    const instanceRef = doc(db, 'companies', session.companyId, 'bpm_instances', instanceId);
    let proxyDetails: { asProxy: boolean; delegatorId?: string; delegatorName?: string; delegationId?: string } = { asProxy: false };
    
    const result = await runTransaction(db, async (transaction) => {
      const snap = await transaction.get(instanceRef);
      if (!snap.exists()) {
        throw new Error('Approval instance not found.');
      }
      
      const instance = snap.data() as BpmApprovalInstance;
      
      if (instance.status !== 'PENDING_APPROVAL') {
        throw new Error(`Cannot perform action. Status is ${instance.status}`);
      }

      // Authoritative check: Direct approver or Active Proxy
      const authCheck = await BpmDelegationService.canUserActOnInstance(session, instance);
      if (!authCheck.canAct) {
        throw new Error(authCheck.reason || 'You are not authorized to perform this approval action.');
      }

      proxyDetails = {
        asProxy: authCheck.asProxy,
        delegatorId: authCheck.delegatorId,
        delegatorName: authCheck.delegatorName,
        delegationId: authCheck.delegationId
      };

      const now = new Date().toISOString();
      const actionId = doc(collection(db, 'bpm_actions')).id;
      
      const actionRecord: BpmApprovalAction = {
        id: actionId,
        approvalInstanceId: instanceId,
        stepId: instance.currentStepId || instance.currentTier.toString(),
        actorId: session.userId,
        action: actionType,
        timestamp: now,
        reason: reason || (authCheck.asProxy ? `Action taken by proxy on behalf of ${authCheck.delegatorName}` : undefined),
        delegatedFrom: authCheck.delegatorId,
        delegationId: authCheck.delegationId,
        actingProxyName: authCheck.asProxy ? (session.fullName || session.email) : undefined,
        originalApproverName: authCheck.delegatorName
      };

      instance.history.push(actionRecord);
      instance.updatedAt = now;

      // Handle the action types
      switch (actionType) {
        case 'APPROVE':
          // Move to next tier or complete
          const nextTier = instance.currentTier + 1;
          const wfRef = doc(db, 'companies', session.companyId, 'bpm_workflows', instance.workflowId);
          const wfSnap = await transaction.get(wfRef);
          
          if (!wfSnap.exists()) {
             // Edge case: workflow deleted or direct approval
             instance.status = 'APPROVED';
             instance.completedAt = now;
          } else {
            const workflow = wfSnap.data() as BpmApprovalWorkflow;
            const nextStep = workflow.steps.find(s => s.sequence === nextTier);
            
            if (nextStep) {
              // Advance to next tier
              const nextApprovers = await this.resolveApprovers(session.companyId, nextStep, instance.history[0]?.actorId || session.userId);
              instance.currentTier = nextTier;
              instance.currentStepId = nextStep.stepId;
              instance.currentApprovers = nextApprovers;
              instance.assignedAt = now;
              // Reset timer and escalation state for new tier
              instance.escalationLevel = 0;
              instance.lastReminderAt = undefined;
              instance.lastEscalationAt = undefined;
              instance.isOverdue = false;
              instance.reassignedFrom = undefined;
              
              if (instance.dueAt) {
                // Reset due target for new tier (24h default)
                instance.dueAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
              }
              
              if (nextApprovers.length === 0) {
                 instance.status = 'CANCELLED'; // Approvers unavailable
                 instance.completedAt = now;
              }
            } else {
              // Final tier completed
              instance.status = 'APPROVED';
              instance.completedAt = now;
            }
          }
          break;
          
        case 'REJECT':
          instance.status = 'REJECTED';
          instance.completedAt = now;
          break;
          
        case 'RETURN':
          instance.status = 'RETURNED';
          instance.completedAt = now;
          break;

        case 'DELEGATE':
           if (!delegateId) throw new Error('Delegate ID required');
           // Add delegate to current approvers
           if (!instance.currentApprovers.includes(delegateId)) {
             instance.currentApprovers.push(delegateId);
           }
           break;
      }

      transaction.set(instanceRef, instance);
      return instance;
    });

    // Post-Action Integrations & Auditing
    if (result.status === 'APPROVED') {
      await BpmIntegrationService.onWorkflowApproved(result, session.userId, session.fullName);
    } else if (result.status === 'REJECTED') {
      await BpmIntegrationService.onWorkflowRejected(result, session.userId, session.fullName, reason || 'Rejected by approver');
    }

    // Proxy Audit & Delegator Notification
    if (proxyDetails.asProxy && proxyDetails.delegatorId) {
      SecurityAuditService.logEvent(
        session.companyId,
        session.userId,
        session.role,
        session.employeeId,
        'DELEGATION_ACTED',
        'bpm_instances',
        instanceId,
        true,
        'MEDIUM',
        `Acted as proxy for ${proxyDetails.delegatorId} (Action: ${actionType})`
      ).catch(() => {});
      
      // Module 10.2: Immutable Audit Trail for Workflow Proxy Action
      AuditTrailService.logUpdate(session, 'BPM', 'BpmApprovalInstance', instanceId, `Proxy action ${actionType} performed on behalf of ${proxyDetails.delegatorId}`, { proxyUserId: session.userId, delegatorId: proxyDetails.delegatorId }, instanceId).catch(() => {});


      try {
        const auditLogId = `AUDIT_PROXY_ACT_${instanceId}_${Date.now()}`;
        const auditRef = doc(db, 'companies', session.companyId, 'audit_logs', auditLogId);
        await setDoc(auditRef, {
          id: auditLogId,
          companyId: session.companyId,
          module: 'BPM_DELEGATION',
          action: 'PROXY_APPROVAL_ACTION',
          description: `${session.fullName || session.userId} acted as proxy for ${proxyDetails.delegatorName || proxyDetails.delegatorId} (Action: ${actionType}) on ${result.sourceModule} (${result.sourceRecordId})`,
          performedBy: session.userId,
          performedByName: session.fullName || 'User',
          targetId: instanceId,
          timestamp: new Date().toISOString(),
          metadata: {
            instanceId,
            actionType,
            delegationId: proxyDetails.delegationId,
            delegatorId: proxyDetails.delegatorId,
            proxyUserId: session.userId,
            sourceRecordId: result.sourceRecordId,
            sourceModule: result.sourceModule
          }
        });

        // Notify Delegator
        const notifId = `NOTIF_PROXY_ACT_${instanceId}_${Date.now()}`;
        const notifRef = doc(db, 'companies', session.companyId, 'notifications', notifId);
        const delegatorNotif: AppNotification = {
          id: notifId,
          title: `Proxy Action: ${actionType} on ${result.sourceModule}`,
          message: `Your designated proxy ${session.fullName || 'Authorized Proxy'} has executed ${actionType} on request ${result.sourceRecordId} on your behalf.`,
          type: actionType === 'APPROVE' ? 'SUCCESS' : 'INFO',
          timestamp: new Date().toISOString(),
          isRead: false,
          actionRoute: 'APPROVAL_CENTER'
        };
        await setDoc(notifRef, delegatorNotif);
      } catch (logErr) {
        console.warn('[BpmService] Proxy audit or notification warning:', logErr);
      }
    }

    return result;
  }

  // -------------------------------------------------------------
  // Approver Resolution & Delegation
  // -------------------------------------------------------------

  /**
   * Resolves who can approve this step.
   * Handles user IDs, role mappings, and delegates.
   */
  static async resolveApprovers(companyId: string, step: BpmApprovalStep, requesterId: string): Promise<string[]> {
    let approvers: string[] = [];

    if (step.approverType === 'USER' && step.approverUserId) {
      approvers.push(step.approverUserId);
    } else if (step.approverType === 'ROLE' && step.approverRole) {
      const usersQuery = query(
        collection(db, 'companies', companyId, 'users'),
        where('role', '==', step.approverRole)
      );
      const snap = await getDocs(usersQuery);
      approvers = snap.docs.map(d => d.id);
    }

    // Filter out self-approval for segregation of duties
    approvers = approvers.filter(id => id !== requesterId);

    // Expand with active delegates (so either original or delegate can be notified/acted upon)
    const activeDelegates = await this.getActiveDelegates(companyId, approvers);
    const finalApprovers = new Set([...approvers, ...activeDelegates]);
    return Array.from(finalApprovers);
  }

  static async getActiveDelegates(companyId: string, userIds: string[]): Promise<string[]> {
    if (userIds.length === 0) return [];
    
    const delegates: string[] = [];
    const delQuery = query(
      collection(db, 'companies', companyId, 'bpm_delegations'),
      where('delegatorUserId', 'in', userIds.slice(0, 10)),
      where('status', 'in', ['ACTIVE', 'SCHEDULED'])
    );
    const snap = await getDocs(delQuery);
    const now = Date.now();
    
    snap.docs.forEach(d => {
      const del = d.data() as ProxyDelegation;
      const startMs = new Date(del.startAt).getTime();
      const endMs = new Date(del.endAt).getTime();
      if (startMs <= now && now <= endMs) {
        delegates.push(del.delegateUserId);
      }
    });

    return delegates;
  }

  // -------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------

  private static evaluateConditions(workflow: BpmApprovalWorkflow, data: any): boolean {
    if (!workflow.steps || workflow.steps.length === 0) return false;
    
    const step1 = workflow.steps[0];
    if (!step1.conditions || step1.conditions.length === 0) return true;

    for (const cond of step1.conditions) {
      const dataVal = data[cond.field];
      switch(cond.operator) {
        case 'EQUALS':
          if (dataVal !== cond.value) return false; break;
        case 'GREATER_THAN':
          if (dataVal <= cond.value) return false; break;
        case 'LESS_THAN':
          if (dataVal >= cond.value) return false; break;
      }
    }
    return true;
  }

  // -------------------------------------------------------------
  // Queries for the UI
  // -------------------------------------------------------------

  /**
   * Retrieves pending approvals for the current user, merging:
   * 1. Approvals directly assigned to user
   * 2. Approvals delegated to user via active Proxy Delegation
   */
  static async getMyApprovals(session: UserSession): Promise<BpmApprovalInstance[]> {
    // 1. Direct assignments
    const directQuery = query(
      collection(db, 'companies', session.companyId, 'bpm_instances'),
      where('currentApprovers', 'array-contains', session.userId),
      where('status', '==', 'PENDING_APPROVAL')
    );
    const directSnap = await getDocs(directQuery);
    const directList = directSnap.docs.map(d => d.data() as BpmApprovalInstance);

    // 2. Delegated assignments
    let delegatedList: BpmApprovalInstance[] = [];
    try {
      const delegatedItems = await BpmDelegationService.getDelegatedPendingApprovals(session);
      delegatedList = delegatedItems.map(item => item.instance);
    } catch (delErr) {
      console.warn('[BpmService] Error loading delegated pending approvals:', delErr);
    }

    // 3. Deduplicate by instance id
    const instanceMap = new Map<string, BpmApprovalInstance>();
    [...directList, ...delegatedList].forEach(inst => {
      instanceMap.set(inst.id, inst);
    });

    return Array.from(instanceMap.values()).sort((a, b) => 
      new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
    );
  }

}
