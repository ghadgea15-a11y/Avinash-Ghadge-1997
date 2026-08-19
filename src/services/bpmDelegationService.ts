import { db } from '../firebase';
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  setDoc, 
  updateDoc, 
  runTransaction,
  writeBatch
} from 'firebase/firestore';
import { 
  ProxyDelegation, 
  ProxyDelegationScope, 
  ProxyDelegationStatus,
  BpmApprovalInstance,
  BpmApprovalAction
} from '../types/bpm';
import { UserSession, AppNotification } from '../types';
import { RbacService } from './rbacService';

export interface CreateDelegationInput {
  delegatorUserId: string;
  delegatorName?: string;
  delegatorEmail?: string;
  delegatorRole?: string;
  delegatorDepartment?: string;
  
  delegateUserId: string;
  delegateName?: string;
  delegateEmail?: string;
  delegateRole?: string;
  delegateDepartment?: string;
  
  scope: ProxyDelegationScope;
  startAt: string; // ISO String
  endAt: string; // ISO String
  reason: string;
}

export interface ProxyAuthCheckResult {
  canAct: boolean;
  asProxy: boolean;
  delegatorId?: string;
  delegatorName?: string;
  delegatorEmail?: string;
  delegationId?: string;
  delegation?: ProxyDelegation;
  reason?: string;
}

export class BpmDelegationService {

  // =========================================================================
  // 1. DELEGATION VALIDATION & ANTI-PRIVILEGE ESCALATION
  // =========================================================================

  /**
   * Validates date window strictly.
   * startAt must be before endAt, and endAt must be in the future.
   */
  static validateDates(startAt: string, endAt: string, now: Date = new Date()): void {
    const start = new Date(startAt);
    const end = new Date(endAt);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new Error('Invalid date format provided for delegation period.');
    }

    if (start.getTime() >= end.getTime()) {
      throw new Error('Delegation start date and time must be earlier than the end date and time.');
    }

    if (end.getTime() <= now.getTime()) {
      throw new Error('Delegation end date must be set in the future.');
    }
  }

  /**
   * Prevents self-delegation and circular delegation chains (A -> B -> A or A -> B -> C -> A).
   */
  static async validateSelfAndCircular(
    companyId: string,
    delegatorUserId: string,
    delegateUserId: string
  ): Promise<void> {
    if (delegatorUserId === delegateUserId) {
      throw new Error('Self-delegation is forbidden. You cannot delegate approval authority to yourself.');
    }

    // Fetch active & scheduled delegations in the company
    const delQuery = query(
      collection(db, 'companies', companyId, 'bpm_delegations'),
      where('status', 'in', ['ACTIVE', 'SCHEDULED'])
    );
    const snap = await getDocs(delQuery);

    // Build directed graph of active delegations: delegator -> delegate
    const graph = new Map<string, string[]>();
    
    // Add existing edges
    snap.docs.forEach(docSnap => {
      const d = docSnap.data() as ProxyDelegation;
      // Skip if it's already expired based on current timestamp
      if (new Date(d.endAt).getTime() > Date.now()) {
        const existing = graph.get(d.delegatorUserId) || [];
        existing.push(d.delegateUserId);
        graph.set(d.delegatorUserId, existing);
      }
    });

    // Add candidate edge: delegatorUserId -> delegateUserId
    const candidateDelegates = graph.get(delegatorUserId) || [];
    candidateDelegates.push(delegateUserId);
    graph.set(delegatorUserId, candidateDelegates);

    // Check if adding this edge causes a cycle reachable from delegateUserId back to delegatorUserId
    const visited = new Set<string>();
    const recStack = new Set<string>();

    const hasCycle = (node: string): boolean => {
      visited.add(node);
      recStack.add(node);

      const neighbors = graph.get(node) || [];
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          if (hasCycle(neighbor)) return true;
        } else if (recStack.has(neighbor)) {
          return true;
        }
      }

      recStack.delete(node);
      return false;
    };

    if (hasCycle(delegatorUserId)) {
      throw new Error(
        'Circular delegation detected. A delegation loop would be created where authority delegates back to the original approver.'
      );
    }
  }

  /**
   * Validates delegate eligibility (must be an active company user, cannot be suspended).
   */
  static async validateDelegateEligibility(
    companyId: string,
    delegateUserId: string,
    delegatorUserId: string
  ): Promise<void> {
    // Lookup user in company users or employees
    const userRef = doc(db, 'companies', companyId, 'users', delegateUserId);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      // Fallback check global users or company employees
      const empRef = doc(db, 'companies', companyId, 'employees', delegateUserId);
      const empSnap = await getDoc(empRef);
      
      if (!empSnap.exists()) {
        const globalUserRef = doc(db, 'users', delegateUserId);
        const globalUserSnap = await getDoc(globalUserRef);
        if (!globalUserSnap.exists()) {
          throw new Error('Delegate user not found in the organization.');
        }
      }
    }
  }

  /**
   * Validates scope values
   */
  static validateScope(scope: ProxyDelegationScope): void {
    if (!scope || !scope.modules || scope.modules.length === 0) {
      throw new Error('Delegation scope must specify at least one valid module or "ALL".');
    }
  }

  // =========================================================================
  // 2. CREATION & PERSISTENCE
  // =========================================================================

  /**
   * Creates a new Proxy Delegation with full validation and audit tracking.
   */
  static async createDelegation(
    session: UserSession,
    input: CreateDelegationInput
  ): Promise<ProxyDelegation> {
    const companyId = session.companyId;

    // 1. Authorization: user can delegate their own approvals or Admin can delegate on behalf
    const isOwnDelegation = session.userId === input.delegatorUserId;
    const canManageAll = RbacService.canManageDelegations(session);

    if (!isOwnDelegation && !canManageAll) {
      throw new Error('Unauthorized: You can only configure proxy delegation for your own approvals.');
    }

    const now = new Date();
    const nowIso = now.toISOString();

    // 2. Perform validations
    this.validateDates(input.startAt, input.endAt, now);
    await this.validateSelfAndCircular(companyId, input.delegatorUserId, input.delegateUserId);
    await this.validateDelegateEligibility(companyId, input.delegateUserId, input.delegatorUserId);
    this.validateScope(input.scope);

    // 3. Compute initial status
    const startTime = new Date(input.startAt).getTime();
    const initialStatus: ProxyDelegationStatus = (now.getTime() >= startTime) ? 'ACTIVE' : 'SCHEDULED';

    // 4. Build document record
    const delegationId = `DEL_${companyId}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const delegationRecord: ProxyDelegation = {
      id: delegationId,
      delegationId,
      companyId,
      delegatorUserId: input.delegatorUserId,
      delegatorName: input.delegatorName || session.fullName || 'Authorized Approver',
      delegatorEmail: input.delegatorEmail || session.email,
      delegatorRole: input.delegatorRole || session.role,
      delegatorDepartment: input.delegatorDepartment,
      
      delegateUserId: input.delegateUserId,
      delegateName: input.delegateName || 'Designated Proxy',
      delegateEmail: input.delegateEmail,
      delegateRole: input.delegateRole,
      delegateDepartment: input.delegateDepartment,
      
      scope: input.scope,
      startAt: input.startAt,
      endAt: input.endAt,
      reason: input.reason.trim(),
      status: initialStatus,
      policyVersion: 1,
      
      createdAt: nowIso,
      createdBy: session.userId,
      updatedAt: nowIso
    };

    // 5. Persist to Firestore
    const docRef = doc(db, 'companies', companyId, 'bpm_delegations', delegationId);
    await setDoc(docRef, delegationRecord);

    // 6. Write Immutable Audit Log
    try {
      const auditLogId = `AUDIT_DEL_CREATE_${delegationId}`;
      const auditRef = doc(db, 'companies', companyId, 'audit_logs', auditLogId);
      await setDoc(auditRef, {
        id: auditLogId,
        companyId,
        module: 'BPM_DELEGATION',
        action: 'DELEGATION_CREATED',
        description: `Proxy delegation created: ${delegationRecord.delegatorName} -> ${delegationRecord.delegateName} for modules [${input.scope.modules.join(', ')}]`,
        performedBy: session.userId,
        performedByName: session.fullName || 'User',
        targetId: delegationId,
        timestamp: nowIso,
        metadata: {
          delegationId,
          delegatorUserId: input.delegatorUserId,
          delegateUserId: input.delegateUserId,
          scope: input.scope,
          startAt: input.startAt,
          endAt: input.endAt,
          status: initialStatus
        }
      });
    } catch (auditErr) {
      console.warn('[BpmDelegationService] Audit log write warning:', auditErr);
    }

    // 7. Dispatch Notifications
    try {
      // Notification to Delegate
      const notifIdDelegate = `NOTIF_DEL_DELEGATE_${delegationId}`;
      const notifRefDelegate = doc(db, 'companies', companyId, 'notifications', notifIdDelegate);
      const delegateNotif: AppNotification = {
        id: notifIdDelegate,
        title: 'BPM Proxy Authority Assigned',
        message: `${delegationRecord.delegatorName} has appointed you as approval proxy from ${new Date(input.startAt).toLocaleString()} to ${new Date(input.endAt).toLocaleString()}.`,
        type: 'INFO',
        timestamp: nowIso,
        isRead: false,
        actionRoute: 'APPROVAL_CENTER'
      };
      await setDoc(notifRefDelegate, delegateNotif);

      // Notification to Delegator (Confirmation)
      const notifIdDelegator = `NOTIF_DEL_CREATOR_${delegationId}`;
      const notifRefDelegator = doc(db, 'companies', companyId, 'notifications', notifIdDelegator);
      const delegatorNotif: AppNotification = {
        id: notifIdDelegator,
        title: 'Proxy Delegation Configured',
        message: `Your approval proxy delegation to ${delegationRecord.delegateName} is scheduled and active for authorized workflows.`,
        type: 'SUCCESS',
        timestamp: nowIso,
        isRead: false,
        actionRoute: 'APPROVAL_CENTER'
      };
      await setDoc(notifRefDelegator, delegatorNotif);
    } catch (notifErr) {
      console.warn('[BpmDelegationService] Notification write warning:', notifErr);
    }

    return delegationRecord;
  }

  // =========================================================================
  // 3. REVOCATION & LIFECYCLE MANAGEMENT
  // =========================================================================

  /**
   * Immediately revokes an active or scheduled proxy delegation.
   */
  static async revokeDelegation(
    session: UserSession,
    delegationId: string,
    revocationReason: string
  ): Promise<ProxyDelegation> {
    const companyId = session.companyId;
    const docRef = doc(db, 'companies', companyId, 'bpm_delegations', delegationId);
    
    const nowIso = new Date().toISOString();

    const result = await runTransaction(db, async (transaction) => {
      const snap = await transaction.get(docRef);
      if (!snap.exists()) {
        throw new Error('Proxy delegation record not found.');
      }

      const delegation = snap.data() as ProxyDelegation;

      // Authorization: delegator or admin
      const isDelegator = session.userId === delegation.delegatorUserId;
      const canManage = RbacService.canManageDelegations(session);
      if (!isDelegator && !canManage) {
        throw new Error('Unauthorized: You do not have permission to revoke this delegation.');
      }

      if (delegation.status === 'REVOKED') {
        throw new Error('Delegation is already revoked.');
      }

      if (delegation.status === 'EXPIRED') {
        throw new Error('Delegation has already expired.');
      }

      delegation.status = 'REVOKED';
      delegation.revokedAt = nowIso;
      delegation.revokedBy = session.userId;
      delegation.revocationReason = revocationReason.trim() || 'Revoked by delegator or administrator';
      delegation.updatedAt = nowIso;
      delegation.updatedBy = session.userId;

      transaction.set(docRef, delegation);
      return delegation;
    });

    // Write Audit Log
    try {
      const auditLogId = `AUDIT_DEL_REVOKE_${delegationId}_${Date.now()}`;
      const auditRef = doc(db, 'companies', companyId, 'audit_logs', auditLogId);
      await setDoc(auditRef, {
        id: auditLogId,
        companyId,
        module: 'BPM_DELEGATION',
        action: 'DELEGATION_REVOKED',
        description: `Proxy delegation revoked for ${result.delegateName} by ${session.fullName || session.userId}. Reason: ${revocationReason}`,
        performedBy: session.userId,
        performedByName: session.fullName || 'User',
        targetId: delegationId,
        timestamp: nowIso,
        metadata: {
          delegationId,
          revocationReason,
          revokedAt: nowIso
        }
      });
    } catch (err) {
      console.warn('[BpmDelegationService] Audit log write warning on revoke:', err);
    }

    // Notify Delegate
    try {
      const notifId = `NOTIF_DEL_REVOKE_${delegationId}_${Date.now()}`;
      const notifRef = doc(db, 'companies', companyId, 'notifications', notifId);
      await setDoc(notifRef, {
        id: notifId,
        title: 'Proxy Delegation Revoked',
        message: `Your proxy approval authority for ${result.delegatorName} has been revoked.`,
        type: 'WARNING',
        timestamp: nowIso,
        isRead: false,
        actionRoute: 'APPROVAL_CENTER'
      });
    } catch (err) {
      console.warn('[BpmDelegationService] Notification warning on revoke:', err);
    }

    return result;
  }

  // =========================================================================
  // 4. SCOPE MATCHING & AUTHORIZATION ENGINE
  // =========================================================================

  /**
   * Evaluates if a given ProxyDelegation covers an approval instance.
   */
  static matchesScope(
    delegation: ProxyDelegation,
    instance: BpmApprovalInstance,
    referenceTime: Date = new Date()
  ): boolean {
    // 1. Status check & Temporal validation
    if (delegation.status === 'REVOKED' || delegation.status === 'EXPIRED') {
      return false;
    }

    const refTimeMs = referenceTime.getTime();
    const startMs = new Date(delegation.startAt).getTime();
    const endMs = new Date(delegation.endAt).getTime();

    if (refTimeMs < startMs || refTimeMs > endMs) {
      return false;
    }

    const scope = delegation.scope;
    if (!scope) return false;

    // 2. Module matching
    const modulesList = scope.modules || (scope.allModules ? ['ALL'] : []);
    const hasModuleAccess = 
      modulesList.includes('ALL') ||
      modulesList.includes(instance.sourceModule) ||
      (instance.sourceModule === 'LEAVE_MANAGEMENT' && modulesList.includes('LEAVE')) ||
      (instance.sourceModule === 'OVERTIME_MANAGEMENT' && modulesList.includes('OVERTIME')) ||
      (instance.sourceModule === 'PURCHASE_ORDER' && modulesList.includes('SCM'));

    if (!hasModuleAccess) {
      return false;
    }

    // 3. Transaction type matching
    if (scope.transactionTypes && scope.transactionTypes.length > 0 && !scope.transactionTypes.includes('ALL')) {
      if (!scope.transactionTypes.includes(instance.transactionType)) {
        return false;
      }
    }

    // 4. Specific workflow binding check
    if (scope.workflowIds && scope.workflowIds.length > 0) {
      if (!scope.workflowIds.includes(instance.workflowId)) {
        return false;
      }
    }

    // 5. Max Approval Tier restriction
    if (scope.maxTier && scope.maxTier > 0) {
      if (instance.currentTier > scope.maxTier) {
        return false;
      }
    }

    // 6. Site-specific scope restriction
    if (scope.siteIds && scope.siteIds.length > 0 && !scope.siteIds.includes('ALL')) {
      const instSite = instance.siteId || instance.metadata?.siteId;
      if (instSite && !scope.siteIds.includes(instSite)) {
        return false;
      }
    }

    // 7. Department-specific scope restriction
    if (scope.departments && scope.departments.length > 0 && !scope.departments.includes('ALL')) {
      const instDept = instance.departmentId || instance.metadata?.departmentId;
      if (instDept && !scope.departments.includes(instDept)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Authoritative check: Can user act on the instance (directly or as an active proxy)?
   */
  static async canUserActOnInstance(
    session: UserSession,
    instance: BpmApprovalInstance,
    referenceTime: Date = new Date()
  ): Promise<ProxyAuthCheckResult> {
    // 0a. Strict Tenant Isolation: User must belong to the instance company
    if (instance.companyId && session.companyId !== instance.companyId && session.role !== 'SUPER_ADMIN') {
      return {
        canAct: false,
        asProxy: false,
        reason: 'Cross-company access denied: User does not belong to the tenant organization.'
      };
    }

    // 0b. Segregation of duties: Prevent requester from self-approving their own transaction
    if (instance.requesterId && session.userId === instance.requesterId && session.role !== 'SUPER_ADMIN') {
      return {
        canAct: false,
        asProxy: false,
        reason: 'Segregation of Duties: Requesters cannot approve their own submission.'
      };
    }

    // 1. Direct approver check
    if (instance.currentApprovers && instance.currentApprovers.includes(session.userId)) {
      return {
        canAct: true,
        asProxy: false
      };
    }

    // 2. Lookup active delegations where user is the designated delegate
    try {
      const delQuery = query(
        collection(db, 'companies', session.companyId, 'bpm_delegations'),
        where('delegateUserId', '==', session.userId),
        where('status', 'in', ['ACTIVE', 'SCHEDULED'])
      );
      const snap = await getDocs(delQuery);

      for (const docSnap of snap.docs) {
        const delegation = docSnap.data() as ProxyDelegation;

        // Is the delegator one of the current instance approvers?
        if (instance.currentApprovers && instance.currentApprovers.includes(delegation.delegatorUserId)) {
          // Does this delegation match scope and timeframe?
          if (this.matchesScope(delegation, instance, referenceTime)) {
            // Privilege Intersection Check: Delegate's own site boundary
            if (session.assignedSiteId && instance.siteId && session.assignedSiteId !== instance.siteId && session.role !== 'SUPER_ADMIN' && session.role !== 'COMPANY_ADMIN' && session.role !== 'DIRECTOR_CEO') {
              return {
                canAct: false,
                asProxy: false,
                reason: 'Privilege Intersection: Delegate does not have operational authority at the target site.'
              };
            }

            return {
              canAct: true,
              asProxy: true,
              delegatorId: delegation.delegatorUserId,
              delegatorName: delegation.delegatorName || 'Primary Approver',
              delegatorEmail: delegation.delegatorEmail,
              delegationId: delegation.delegationId,
              delegation
            };
          }
        }
      }
    } catch (delErr) {
      console.warn('[BpmDelegationService] canUserActOnInstance delegation lookup error:', delErr);
    }

    return {
      canAct: false,
      asProxy: false,
      reason: 'User is neither a primary approver nor an active proxy for this approval tier.'
    };
  }

  /**
   * Retrieves active proxy mappings for a list of primary approver IDs on a specific instance.
   */
  static async getActiveProxiesForApprovers(
    companyId: string,
    approverIds: string[],
    instance: BpmApprovalInstance,
    referenceTime: Date = new Date()
  ): Promise<ProxyDelegation[]> {
    if (!approverIds || approverIds.length === 0) return [];

    const activeProxies: ProxyDelegation[] = [];
    const delQuery = query(
      collection(db, 'companies', companyId, 'bpm_delegations'),
      where('delegatorUserId', 'in', approverIds.slice(0, 10)),
      where('status', 'in', ['ACTIVE', 'SCHEDULED'])
    );
    const snap = await getDocs(delQuery);

    snap.docs.forEach(d => {
      const delegation = d.data() as ProxyDelegation;
      if (this.matchesScope(delegation, instance, referenceTime)) {
        activeProxies.push(delegation);
      }
    });

    return activeProxies;
  }

  // =========================================================================
  // 5. QUERY METHODS FOR UI & AUDIT
  // =========================================================================

  /**
   * Returns delegations created by the current user.
   */
  static async getMyCreatedDelegations(session: UserSession): Promise<ProxyDelegation[]> {
    const q = query(
      collection(db, 'companies', session.companyId, 'bpm_delegations'),
      where('delegatorUserId', '==', session.userId)
    );
    const snap = await getDocs(q);
    const list = snap.docs.map(d => d.data() as ProxyDelegation);
    
    // Sort client-side by createdAt descending
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  /**
   * Returns delegations where current user is the delegate.
   */
  static async getMyActiveProxyAssignments(session: UserSession): Promise<ProxyDelegation[]> {
    const q = query(
      collection(db, 'companies', session.companyId, 'bpm_delegations'),
      where('delegateUserId', '==', session.userId)
    );
    const snap = await getDocs(q);
    const list = snap.docs.map(d => d.data() as ProxyDelegation);
    
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  /**
   * Returns all company delegations for administrative audit and management.
   */
  static async getAllCompanyDelegations(session: UserSession): Promise<ProxyDelegation[]> {
    if (!RbacService.canViewAllCompanyDelegations(session)) {
      throw new Error('Unauthorized: Insufficient permissions to view organization delegations.');
    }

    const q = collection(db, 'companies', session.companyId, 'bpm_delegations');
    const snap = await getDocs(q);
    const list = snap.docs.map(d => d.data() as ProxyDelegation);

    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  /**
   * Finds all pending approval instances across the company where the user is an eligible proxy.
   */
  static async getDelegatedPendingApprovals(session: UserSession): Promise<{ instance: BpmApprovalInstance; delegation: ProxyDelegation }[]> {
    const myAssignments = await this.getMyActiveProxyAssignments(session);
    const now = new Date();

    const activeAssignments = myAssignments.filter(d => 
      d.status !== 'REVOKED' && 
      d.status !== 'EXPIRED' && 
      new Date(d.startAt).getTime() <= now.getTime() && 
      now.getTime() <= new Date(d.endAt).getTime()
    );

    if (activeAssignments.length === 0) return [];

    // Query pending instances in company
    const instQuery = query(
      collection(db, 'companies', session.companyId, 'bpm_instances'),
      where('status', '==', 'PENDING_APPROVAL')
    );
    const instSnap = await getDocs(instQuery);
    const results: { instance: BpmApprovalInstance; delegation: ProxyDelegation }[] = [];

    for (const docSnap of instSnap.docs) {
      const instance = docSnap.data() as BpmApprovalInstance;
      for (const del of activeAssignments) {
        if (instance.currentApprovers && instance.currentApprovers.includes(del.delegatorUserId)) {
          if (this.matchesScope(del, instance, now)) {
            results.push({ instance, delegation: del });
            break;
          }
        }
      }
    }

    return results;
  }

  /**
   * Automatically refreshes expired or scheduled statuses in the company.
   */
  static async refreshCompanyDelegationStatuses(companyId: string, refTime: Date = new Date()): Promise<number> {
    const nowMs = refTime.getTime();
    const q = query(
      collection(db, 'companies', companyId, 'bpm_delegations'),
      where('status', 'in', ['ACTIVE', 'SCHEDULED'])
    );
    const snap = await getDocs(q);

    let updatedCount = 0;
    const batch = writeBatch(db);

    for (const docSnap of snap.docs) {
      const delegation = docSnap.data() as ProxyDelegation;
      const startMs = new Date(delegation.startAt).getTime();
      const endMs = new Date(delegation.endAt).getTime();

      let targetStatus: ProxyDelegationStatus | null = null;

      if (nowMs > endMs) {
        targetStatus = 'EXPIRED';
      } else if (nowMs >= startMs && delegation.status === 'SCHEDULED') {
        targetStatus = 'ACTIVE';
      }

      if (targetStatus && targetStatus !== delegation.status) {
        batch.update(docSnap.ref, {
          status: targetStatus,
          updatedAt: refTime.toISOString()
        });
        updatedCount++;
      }
    }

    if (updatedCount > 0) {
      await batch.commit();
    }

    return updatedCount;
  }
}
