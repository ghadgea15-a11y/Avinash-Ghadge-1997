import { db } from '../firebase';
import { collection, doc, setDoc, query, where, getDocs, orderBy, limit, startAfter } from 'firebase/firestore';
import { AuditTrailRecord, UserSession } from '../types';

export let _auditSetDoc = setDoc;
export function _setAuditSetDocMock(mock: any) { _auditSetDoc = mock; }

export class AuditTrailService {
  static async recordEvent(
    actor: { userId: string, employeeId?: string, role?: string, companyId: string } | null,
    companyId: string,
    module: string,
    action: string,
    operation: string,
    entityType: string,
    entityId: string,
    success: boolean,
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW',
    correlationId?: string,
    changeSummary?: string,
    failureReason?: string,
    metadata?: any
  ): Promise<void> {
    try {
      if (!actor) return; 
      
      const targetCompanyId = companyId || actor.companyId;
      if (!targetCompanyId) return;

      const id = `AUDIT-${Date.now()}-${Math.random().toString(36).substring(2,8).toUpperCase()}`;
      
      const record: any = {
        id,
        companyId: targetCompanyId,
        actorId: actor.userId,
        actorEmployeeId: actor.employeeId,
        actorRole: actor.role,
        module,
        action,
        operation,
        entityType,
        entityId,
        timestamp: new Date().toISOString(),
        severity,
        success,
        failureReason,
        correlationId,
        source: 'WEB_APP',
        changeSummary,
        metadata
      };

      Object.keys(record).forEach(key => {
        if (record[key] === undefined) {
          delete record[key];
        }
      });

      const auditRef = doc(db, 'companies', targetCompanyId, 'audit_logs', id);
      await _auditSetDoc(auditRef, record as AuditTrailRecord);
    } catch (error) {
      console.error('[AuditTrailService] Error recording audit event:', error);
    }
  }

  static async logCreate(actor: { userId: string, employeeId?: string, role?: string, companyId: string }, module: string, entityType: string, entityId: string, summary?: string, metadata?: any) {
    return this.recordEvent(actor, actor.companyId, module, 'CREATE', 'CREATE_RECORD', entityType, entityId, true, 'LOW', undefined, summary, undefined, metadata);
  }

  static async logUpdate(actor: { userId: string, employeeId?: string, role?: string, companyId: string }, module: string, entityType: string, entityId: string, changeSummary?: string, metadata?: any, correlationId?: string) {
    return this.recordEvent(actor, actor.companyId, module, 'UPDATE', 'UPDATE_RECORD', entityType, entityId, true, 'MEDIUM', correlationId, changeSummary, undefined, metadata);
  }

  static async logDeleteAttempt(actor: { userId: string, employeeId?: string, role?: string, companyId: string }, module: string, entityType: string, entityId: string, success: boolean, reason?: string, metadata?: any) {
    return this.recordEvent(actor, actor.companyId, module, 'DELETE', 'DELETE_RECORD', entityType, entityId, success, 'HIGH', undefined, undefined, reason, metadata);
  }

  static async logApproval(actor: { userId: string, employeeId?: string, role?: string, companyId: string }, module: string, entityType: string, entityId: string, correlationId?: string, summary?: string) {
    return this.recordEvent(actor, actor.companyId, module, 'APPROVE', 'WORKFLOW_APPROVE', entityType, entityId, true, 'MEDIUM', correlationId, summary);
  }
  
  static async logRejection(actor: { userId: string, employeeId?: string, role?: string, companyId: string }, module: string, entityType: string, entityId: string, correlationId?: string, reason?: string) {
    return this.recordEvent(actor, actor.companyId, module, 'REJECT', 'WORKFLOW_REJECT', entityType, entityId, true, 'MEDIUM', correlationId, undefined, reason);
  }

  static async logAction(
    actor: { userId: string; employeeId?: string; role?: string; companyId: string },
    module: string,
    action: string,
    entityType: string,
    entityId: string,
    success: boolean = true,
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW',
    changeSummary?: string,
    metadata?: any,
    failureReason?: string,
    correlationId?: string
  ) {
    return this.recordEvent(
      actor,
      actor.companyId,
      module,
      action,
      action,
      entityType,
      entityId,
      success,
      severity,
      correlationId,
      changeSummary,
      failureReason,
      metadata
    );
  }

  static async getAuditLogs(session: UserSession, filterOptions?: {
    module?: string;
    action?: string;
    actorId?: string;
    severity?: string;
    correlationId?: string;
    limitCount?: number;
  }): Promise<AuditTrailRecord[]> {
    try {
      let q = query(collection(db, 'companies', session.companyId, 'audit_logs'));
      
      // We do manual filtering in memory for simplicity to avoid compound index requirements dynamically, 
      // but in production, we should add composite indexes or just basic orderBy
      
      const snap = await getDocs(q);
      let logs = snap.docs.map(d => d.data() as AuditTrailRecord);
      
      logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      if (filterOptions) {
        if (filterOptions.module) logs = logs.filter(l => l.module === filterOptions.module);
        if (filterOptions.action) logs = logs.filter(l => l.action === filterOptions.action);
        if (filterOptions.actorId) logs = logs.filter(l => l.actorId === filterOptions.actorId);
        if (filterOptions.severity) logs = logs.filter(l => l.severity === filterOptions.severity);
        if (filterOptions.correlationId) logs = logs.filter(l => l.correlationId === filterOptions.correlationId);
      }

      const limitCount = filterOptions?.limitCount || 100;
      return logs.slice(0, limitCount);
    } catch (err) {
      console.error('[AuditTrailService] getAuditLogs error:', err);
      return [];
    }
  }
}
