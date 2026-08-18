import { db } from '../firebase';
import { collection, doc, getDoc, getDocs, query, where, setDoc, updateDoc, runTransaction, serverTimestamp, writeBatch } from 'firebase/firestore';
import { 
  BpmApprovalWorkflow, 
  BpmApprovalStep,
  BpmApprovalInstance, 
  BpmApprovalAction, 
  BpmApprovalDelegation, 
  BpmApprovalState, 
  BpmApprovalActionType,
  EscalationPolicy
} from '../types/bpm';
import { UserSession } from '../types';
import { RbacService } from './rbacService';
import { BpmIntegrationService } from './bpmIntegrationService';
import { BpmEscalationService } from './bpmEscalationService';

export class BpmService {

  // -------------------------------------------------------------
  // Workflow Resolution & Engine Execution
  // -------------------------------------------------------------

  /**
   * Evaluates business transaction to determine necessary workflow 
   * and initializes an Approval Instance. 
   */
  static async submitForApproval(
    companyId: string,
    requesterId: string,
    sourceModule: string,
    sourceRecordId: string,
    transactionType: string,
    transactionData: any
  ): Promise<BpmApprovalInstance | null> {
    
    // 1. Fetch active workflows for this module & transaction
    const wfQuery = query(
      collection(db, 'companies', companyId, 'bpm_workflows'),
      where('module', '==', sourceModule),
      where('transactionType', '==', transactionType),
      where('active', '==', true)
    );
    const wfSnap = await getDocs(wfQuery);

    if (wfSnap.empty) {
      // No active workflow found, meaning either it's auto-approved or manual
      return null;
    }

    const workflow = wfSnap.docs[0].data() as BpmApprovalWorkflow;

    // 2. Validate conditions to see if it actually matches
    const isMatch = this.evaluateConditions(workflow, transactionData);
    if (!isMatch) {
      return null; // Bypass approval if condition isn't met
    }

    // 3. Resolve Tier 1 Approvers
    const step1 = workflow.steps.find(s => s.sequence === 1);
    if (!step1) {
      throw new Error(`Workflow ${workflow.workflowName} has no steps configured.`);
    }

    const currentApprovers = await this.resolveApprovers(companyId, step1, requesterId);

    // 4. Resolve Escalation Policy
    const escalationPolicy = await BpmEscalationService.getActivePolicy(
      companyId,
      sourceModule,
      transactionType,
      workflow.workflowId,
      step1.stepId
    );

    // 5. Create the instance
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
      status: 'SUBMITTED',
      currentTier: 1,
      currentStepId: step1.stepId,
      currentApprovers,
      history: [],
      submittedAt: now,
      escalationPolicyId: escalationPolicy?.policyId,
      policyVersion: escalationPolicy?.version || 1,
      escalationLevel: 0,
      dueAt,
      isOverdue: false,
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
  // Approval Actions (Multi-Tier)
  // -------------------------------------------------------------

  static async performAction(
    session: UserSession,
    instanceId: string,
    actionType: BpmApprovalActionType,
    reason?: string,
    delegateId?: string
  ): Promise<BpmApprovalInstance> {
    const instanceRef = doc(db, 'companies', session.companyId, 'bpm_instances', instanceId);
    
    const result = await runTransaction(db, async (transaction) => {
      const snap = await transaction.get(instanceRef);
      if (!snap.exists()) {
        throw new Error('Approval instance not found.');
      }
      
      const instance = snap.data() as BpmApprovalInstance;
      
      if (instance.status !== 'PENDING_APPROVAL') {
        throw new Error(`Cannot perform action. Status is ${instance.status}`);
      }

      // Check if actor is authorized or a valid delegate
      const isAuthorized = await this.checkAuthorization(session, instance);
      if (!isAuthorized.valid) {
        throw new Error('You are not authorized to perform this action.');
      }

      const now = new Date().toISOString();
      const actionId = doc(collection(db, 'bpm_actions')).id;
      
      const actionRecord: BpmApprovalAction = {
        id: actionId,
        approvalInstanceId: instanceId,
        stepId: instance.currentStepId!,
        actorId: session.userId,
        action: actionType,
        timestamp: now,
        reason,
        delegatedFrom: isAuthorized.delegatedFrom
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
             // Edge case: workflow deleted
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
              
              // Load active policy or retain current policy to recalculate dueAt
              if (instance.dueAt) {
                // By default 24h or policy interval
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

    if (result.status === 'APPROVED') {
      await BpmIntegrationService.onWorkflowApproved(result, session.userId, session.fullName);
    } else if (result.status === 'REJECTED') {
      await BpmIntegrationService.onWorkflowRejected(result, session.userId, session.fullName, reason || 'Rejected by approver');
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
      // Find users with this role
      const usersQuery = query(
        collection(db, 'companies', companyId, 'users'),
        where('role', '==', step.approverRole)
      );
      const snap = await getDocs(usersQuery);
      approvers = snap.docs.map(d => d.id);
    } else if (step.approverType === 'MANAGER') {
      // In a real system, lookup requester's manager in employee record
      // Placeholder logic
    }

    // Filter out self-approval unless permitted
    // We enforce segregation of duties by default
    approvers = approvers.filter(id => id !== requesterId);

    // Expand with active delegates
    const activeDelegates = await this.getActiveDelegates(companyId, approvers);
    
    // Add valid delegates to the list (so either original or delegate can approve)
    const finalApprovers = new Set([...approvers, ...activeDelegates]);
    return Array.from(finalApprovers);
  }

  /**
   * Checks if current user is directly authorized or via delegation.
   */
  private static async checkAuthorization(session: UserSession, instance: BpmApprovalInstance): Promise<{ valid: boolean, delegatedFrom?: string }> {
    if (instance.currentApprovers.includes(session.userId)) {
      return { valid: true };
    }

    // Check if the user is a delegate for one of the actual approvers
    const delegatesQuery = query(
      collection(db, 'companies', session.companyId, 'bpm_delegations'),
      where('delegateId', '==', session.userId),
      where('status', '==', 'ACTIVE')
    );
    const snap = await getDocs(delegatesQuery);
    
    const now = new Date().toISOString();
    for (const d of snap.docs) {
      const del = d.data() as BpmApprovalDelegation;
      if (del.startDateTime <= now && del.endDateTime >= now) {
         // Is delegator one of the current approvers?
         if (instance.currentApprovers.includes(del.delegatorId)) {
           return { valid: true, delegatedFrom: del.delegatorId };
         }
      }
    }

    return { valid: false };
  }

  static async getActiveDelegates(companyId: string, userIds: string[]): Promise<string[]> {
    if (userIds.length === 0) return [];
    
    const delegates: string[] = [];
    // Firestore 'in' has max 10, batch if needed, but for simplicity assuming small tier size
    const delQuery = query(
      collection(db, 'companies', companyId, 'bpm_delegations'),
      where('delegatorId', 'in', userIds.slice(0, 10)),
      where('status', '==', 'ACTIVE')
    );
    const snap = await getDocs(delQuery);
    const now = new Date().toISOString();
    
    snap.docs.forEach(d => {
      const del = d.data() as BpmApprovalDelegation;
      if (del.startDateTime <= now && del.endDateTime >= now) {
        delegates.push(del.delegateId);
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
        // ... more
      }
    }
    return true;
  }

  // Queries for the UI

  static async getMyApprovals(session: UserSession): Promise<BpmApprovalInstance[]> {
    // Note: Due to limitations of Firestore array-contains on large dynamically expanded lists (like delegates),
    // we query where currentApprovers array-contains uid.
    // If the UI relies heavily on delegates, the delegate injection logic needs to push the delegate ID into currentApprovers
    // at the time of assignment, which we are doing!
    const q = query(
      collection(db, 'companies', session.companyId, 'bpm_instances'),
      where('currentApprovers', 'array-contains', session.userId),
      where('status', '==', 'PENDING_APPROVAL')
    );
    
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as BpmApprovalInstance);
  }

}
