import { db } from '../firebase';
import { collection, doc, query, where, getDocs, setDoc, updateDoc, writeBatch } from 'firebase/firestore';
import { ProxyDelegation } from '../types/bpm';
import { UserSession } from '../types';

export class BpmDelegationService {
  static matchesScope(scope: any, instance: any): boolean {
    if (!scope) return true;
    if (scope.allModules || (scope.modules && scope.modules.includes('ALL'))) return true;
    if (scope.modules && Array.isArray(scope.modules)) {
      if (instance.sourceModule && scope.modules.includes(instance.sourceModule)) return true;
    }
    if (scope.workflowIds && Array.isArray(scope.workflowIds) && scope.workflowIds.length > 0) {
      if (!scope.workflowIds.includes(instance.workflowId)) return false;
    }
    if (scope.siteIds && Array.isArray(scope.siteIds) && scope.siteIds.length > 0) {
      if (instance.siteId && !scope.siteIds.includes(instance.siteId)) return false;
    }
    return true;
  }

  static async canUserActOnInstance(
    session: UserSession, 
    instance: any
  ): Promise<{ canAct: boolean; reason?: string; asProxy?: boolean; delegatorId?: string; delegatorName?: string; delegationId?: string }> {
    if (session.companyId !== instance.companyId) {
      return { canAct: false, reason: 'Cross-company workflow approval is strictly prohibited.' };
    }
    if (session.userId === instance.requesterId) {
      return { canAct: false, reason: 'Segregation of duties: You cannot approve your own request.' };
    }

    // Direct approver
    const approvers: string[] = instance.currentApprovers || [];
    if (approvers.includes(session.userId) || (session.role && approvers.includes(session.role))) {
      return { canAct: true, asProxy: false };
    }

    // Proxy / Delegation approver check (e.g. manager on leave)
    try {
      const q = query(
        collection(db, 'companies', session.companyId, 'bpm_delegations'),
        where('delegateUserId', '==', session.userId),
        where('status', '==', 'ACTIVE')
      );
      const snap = await getDocs(q);
      const now = new Date();

      for (const docSnap of snap.docs) {
        const del = docSnap.data() as any;
        const start = new Date(del.startAt || del.startAt);
        const end = new Date(del.endAt || del.endAt);

        if (now >= start && now <= end) {
          if (approvers.includes(del.delegatorUserId) || (del.delegatorRole && approvers.includes(del.delegatorRole))) {
            if (this.matchesScope(del.scope, instance)) {
              return {
                canAct: true,
                asProxy: true,
                delegatorId: del.delegatorUserId,
                delegatorName: del.delegatorName || 'Delegator Approver',
                delegationId: docSnap.id
              };
            }
          }
        }
      }
    } catch (err) {
      console.warn('[BpmDelegationService] Delegation check error:', err);
    }

    return { canAct: false, reason: 'You are not assigned as an approver or active delegate for this step.' };
  }
  
  static async getActiveProxiesForApprovers(companyId: string, approverUserIds: string[], instance: any, nowTime?: Date): Promise<any[]> {
    if (!approverUserIds || approverUserIds.length === 0) return [];
    try {
      const q = query(
        collection(db, 'companies', companyId, 'bpm_delegations'),
        where('status', '==', 'ACTIVE')
      );
      const snap = await getDocs(q);
      const now = nowTime || new Date();
      const activeProxies: any[] = [];

      for (const docSnap of snap.docs) {
        const del = docSnap.data() as any;
        if (approverUserIds.includes(del.delegatorUserId)) {
          const start = new Date(del.startAt || del.startAt);
          const end = new Date(del.endAt || del.endAt);
          if (now >= start && now <= end) {
            if (this.matchesScope(del.scope, instance)) {
              activeProxies.push({ id: docSnap.id, ...del });
            }
          }
        }
      }
      return activeProxies;
    } catch (e) {
      console.warn('[BpmDelegationService] getActiveProxiesForApprovers error:', e);
      return [];
    }
  }

  static async getDelegatedPendingApprovals(session: UserSession): Promise<any[]> {
    try {
      const activeDelegations = await this.getMyActiveProxyAssignments(session);
      if (activeDelegations.length === 0) return [];
      const delegatorIds = activeDelegations.map(d => d.delegatorUserId);

      const q = query(
        collection(db, 'companies', session.companyId, 'bpm_instances'),
        where('status', '==', 'PENDING_APPROVAL')
      );
      const snap = await getDocs(q);
      const matched: any[] = [];

      snap.forEach(docSnap => {
        const inst = docSnap.data() as any;
        const curApprovers = inst.currentApprovers || [];
        const hasDelegator = delegatorIds.some(id => curApprovers.includes(id));
        if (hasDelegator) {
          matched.push({ id: docSnap.id, ...inst });
        }
      });
      return matched;
    } catch (e) {
      console.warn('[BpmDelegationService] getDelegatedPendingApprovals error:', e);
      return [];
    }
  }

  static validateDates(start: string, end: string): { valid: boolean; error?: string } {
    if (!start || !end) return { valid: false, error: 'Start date and end date are required.' };
    const s = new Date(start);
    const e = new Date(end);
    if (isNaN(s.getTime()) || isNaN(e.getTime())) return { valid: false, error: 'Invalid date format.' };
    if (e < s) return { valid: false, error: 'End date must be after start date.' };
    return { valid: true };
  }

  static validateScope(scope: any): { valid: boolean; error?: string } {
    if (!scope) return { valid: true };
    return { valid: true };
  }
  
  static async refreshCompanyDelegationStatuses(companyId: string): Promise<void> {
    const q = query(collection(db, 'companies', companyId, 'bpm_delegations'), where('status', '==', 'ACTIVE'));
    const snapshot = await getDocs(q);
    const now = new Date();
    const batch = writeBatch(db);
    
    snapshot.forEach(docSnap => {
      const data = docSnap.data() as ProxyDelegation;
      if (data.endAt && new Date(data.endAt) < now) {
        batch.update(docSnap.ref, { status: 'EXPIRED' });
      }
    });
    
    await batch.commit();
  }
  
  static async getMyCreatedDelegations(session: UserSession): Promise<any[]> {
    const q = query(collection(db, 'companies', session.companyId, 'bpm_delegations'), where('delegatorUserId', '==', session.userId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }
  
  static async getMyActiveProxyAssignments(session: UserSession): Promise<any[]> {
    const q = query(collection(db, 'companies', session.companyId, 'bpm_delegations'), where('delegateUserId', '==', session.userId), where('status', '==', 'ACTIVE'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }
  
  static async getAllCompanyDelegations(session: UserSession): Promise<any[]> {
    const q = query(collection(db, 'companies', session.companyId, 'bpm_delegations'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }
  
  static async createDelegation(session: UserSession, delegationData: any): Promise<any> {
    const ref = doc(collection(db, 'companies', session.companyId, 'bpm_delegations'));
    const delegation: ProxyDelegation = {
      id: ref.id,
      companyId: session.companyId,
      delegatorUserId: delegationData.delegatorId,
      delegatorName: delegationData.delegatorName,
      delegateUserId: delegationData.delegateId,
      delegateName: delegationData.delegateName,
      startAt: delegationData.startAt,
      endAt: delegationData.endAt,
      scope: delegationData.scope,
      status: 'ACTIVE', policyVersion: 1,
      reason: delegationData.reason,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: session.userId,
    };
    await setDoc(ref, delegation);
    return delegation;
  }
  
  static async revokeDelegation(session: UserSession, delegationId: string, revokeReason?: string): Promise<any> {
    const ref = doc(db, 'companies', session.companyId, 'bpm_delegations', delegationId);
    await updateDoc(ref, {
      status: 'REVOKED',
      revokeReason: revokeReason || 'Revoked by user',
      updatedAt: new Date().toISOString()
    });
  }
}
