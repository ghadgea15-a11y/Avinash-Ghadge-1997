import { db } from '../firebase';
import { collection, doc, setDoc, getDocs, query, where, orderBy, getDoc, updateDoc } from 'firebase/firestore';
import { UserSession } from '../types';
import { AuditTrailService } from './auditTrailService';
import { SecurityAuditService } from './securityAuditService';
import { RbacService } from './rbacService';

export interface ChangeRequest {
  id: string;
  companyId: string;
  entityType: string;
  entityId: string;
  requesterId: string;
  requesterName: string;
  requestedAt: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXECUTED';
  beforeData: any;
  afterData: any;
  reason: string;
  approverId?: string;
  approverName?: string;
  approvedAt?: string;
  rejectionReason?: string;
}

export class ChangeControlService {
  /**
   * Request a critical change. If user is SUPER_ADMIN or OWNER, it might auto-approve (depending on strictness),
   * but let's strictly require approval or just execute directly if authorized, but always track it.
   */
    static async requestChange(
    session: UserSession,
    entityType: string,
    entityId: string,
    beforeData: any,
    afterData: any,
    reason: string
  ): Promise<ChangeRequest> {
    if (!session || !session.companyId) throw new Error('Unauthorized');

    // For E2E pattern: if requester is highly privileged AND no explicit approval required, auto-approve?
    // Let's ALWAYS require approval to satisfy "Change request -> Authorization"
    const changeId = `CHG-${Date.now()}-${Math.random().toString(36).substring(2,8).toUpperCase()}`;
    const now = new Date().toISOString();

    const record: ChangeRequest = {
      id: changeId,
      companyId: session.companyId,
      entityType,
      entityId,
      requesterId: session.userId,
      requesterName: session.fullName || session.email,
      requestedAt: now,
      status: 'PENDING',
      beforeData,
      afterData,
      reason
    };

    const docRef = doc(db, 'companies', session.companyId, 'change_requests', changeId);
    await setDoc(docRef, record);

    await SecurityAuditService.logEvent(
      session.companyId,
      session.userId,
      session.role,
      session.employeeId,
      'CHANGE_REQUESTED',
      entityType,
      entityId,
      true,
      'MEDIUM',
      `Requested change for ${entityType} ${entityId}`
    );

    return record;
  }

  static async authorizeAndExecuteChange(
    session: UserSession,
    changeId: string,
    action: 'APPROVE' | 'REJECT',
    comments?: string
  ): Promise<boolean> {
    if (!session || !session.companyId) throw new Error('Unauthorized');
    
    // Admin / Manager check
    if (!['SUPER_ADMIN', 'COMPANY_ADMIN', 'HR_ADMIN', 'A0_OWNER', 'A1_DIRECTOR_CEO'].includes(session.role) && !['A0_OWNER', 'A1_DIRECTOR_CEO'].includes((session as any).authority || '')) {
      await SecurityAuditService.logEvent(
        session.companyId,
        session.userId,
        session.role,
        session.employeeId,
        'UNAUTHORIZED_CHANGE_APPROVAL',
        'change_requests',
        changeId,
        false,
        'HIGH',
        'User attempted to approve a change request without sufficient permissions'
      );
      throw new Error('Unauthorized to approve changes.');
    }

    const docRef = doc(db, 'companies', session.companyId, 'change_requests', changeId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) throw new Error('Change request not found');

    const record = snap.data() as ChangeRequest;
    if (record.status !== 'PENDING') throw new Error(`Cannot authorize change, status is ${record.status}`);

    const now = new Date().toISOString();

    if (action === 'REJECT') {
      await updateDoc(docRef, {
        status: 'REJECTED',
        approverId: session.userId,
        approverName: session.fullName || session.email,
        approvedAt: now,
        rejectionReason: comments || 'No reason provided'
      });

      await SecurityAuditService.logEvent(
        session.companyId,
        session.userId,
        session.role,
        session.employeeId,
        'CHANGE_REJECTED',
        record.entityType,
        record.entityId,
        true,
        'LOW',
        `Rejected change for ${record.entityType} ${record.entityId}`
      );
      return false;
    }

    // APPROVE AND EXECUTE
    
    // APPROVE AND EXECUTE
    await updateDoc(docRef, {
      status: 'EXECUTED',
      approverId: session.userId,
      approverName: session.fullName || session.email,
      approvedAt: now
    });

    // Actually apply the data change
    if (record.entityType === 'EMPLOYEES') {
       const empRef = doc(db, 'companies', session.companyId, 'employees', record.entityId);
       await updateDoc(empRef, record.afterData);
    } else if (record.entityType === 'ROLES' || record.entityType === 'SETTINGS') {
       // generic collection update
       const ref = doc(db, 'companies', session.companyId, record.entityType.toLowerCase(), record.entityId);
       await setDoc(ref, record.afterData, { merge: true });
    } else {
       const ref = doc(db, 'companies', session.companyId, record.entityType, record.entityId);
       await setDoc(ref, record.afterData, { merge: true });
    }

    // We do NOT perform the actual firestore update to the target document here,
    // we assume the calling service will do it immediately after we return true,
    // OR we could do it here if we pass the target collection. To keep it generic,
    // we just mark as EXECUTED and let caller do the actual db update.
    // BUT we must record the Audit Trail here.

    await SecurityAuditService.logEvent(
      session.companyId,
      session.userId,
      session.role,
      session.employeeId,
      'CHANGE_APPROVED',
      record.entityType,
      record.entityId,
      true,
      'HIGH',
      `Approved and executed change for ${record.entityType} ${record.entityId}`
    );

    // Call audit trail
    const auditRecord = AuditTrailService.buildAuditRecord(
      session,
      session.companyId,
      'CHANGE_CONTROL',
      'UPDATE',
      'MODIFY_SENSITIVE',
      record.entityType,
      record.entityId,
      true,
      'HIGH',
      changeId,
      `Authorized change applied to ${record.entityType}`,
      undefined,
      { before: record.beforeData, after: record.afterData }
    );
    if (auditRecord) {
      await setDoc(doc(db, 'companies', session.companyId, 'audit_trails', auditRecord.id), auditRecord);
    }

    return true;
  }

  static async getPendingRequests(session: UserSession): Promise<ChangeRequest[]> {
    if (!session || !session.companyId) return [];
    const q = query(
      collection(db, 'companies', session.companyId, 'change_requests'),
      where('status', '==', 'PENDING'),
      orderBy('requestedAt', 'desc')
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as ChangeRequest);
  }
}
