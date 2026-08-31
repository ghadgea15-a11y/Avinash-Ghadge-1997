import { db } from '../firebase';
import { collection, doc, getDoc, getDocs, setDoc, updateDoc, query, where, serverTimestamp } from 'firebase/firestore';
import { UserSession } from '../types';
import { CompliancePolicy } from '../types/compliance';
import { v4 as uuidv4 } from 'uuid';
import { BpmService } from './bpmService';

export let _getDocsMock: any = null;
export let _getDocMock: any = null;
export let _setDocMock: any = null;
export let _updateDocMock: any = null;

export const _setGetDocsMock = (mock: any) => { _getDocsMock = mock; };
export const _setGetDocMock = (mock: any) => { _getDocMock = mock; };
export const _setSetDocMock = (mock: any) => { _setDocMock = mock; };
export const _setUpdateDocMock = (mock: any) => { _updateDocMock = mock; };

async function _getDoc(ref: any) { return _getDocMock ? _getDocMock(ref) : getDoc(ref); }
async function _getDocs(ref: any) { return _getDocsMock ? _getDocsMock(ref) : getDocs(ref); }
async function _setDoc(ref: any, data: any, opts?: any) { return _setDocMock ? _setDocMock(ref, data, opts) : setDoc(ref, data, opts); }
async function _updateDoc(ref: any, data: any) { return _updateDocMock ? _updateDocMock(ref, data) : updateDoc(ref, data); }

/**
 * Enterprise Compliance Policy Engine
 */
export class CompliancePolicyEngine {
  public static async validateLaborCompliance(
    companyId: string,
    action: 'OVERTIME' | 'SHIFT_ASSIGNMENT' | 'PAYROLL_DISBURSEMENT',
    data: any
  ): Promise<{ compliant: boolean; violations: string[] }> {
    const violations: string[] = [];
    
    // Fetch active policies for this company
    const policiesRef = query(
      collection(db, 'companies', companyId, 'compliance_policies'),
      where('status', '==', 'ACTIVE')
    );
    const snap = await _getDocs(policiesRef);
    const policies = snap.docs ? snap.docs.map((d: any) => d.data()) : [];

    if (action === 'OVERTIME') {
      const overtimeLimit = policies.find((p: any) => p.ruleType === 'MAX_OVERTIME')?.limit || 4;
      if (data.hours > overtimeLimit) {
        violations.push(`Daily overtime exceeds statutory limit of ${overtimeLimit} hours.`);
      }
    }

    if (action === 'SHIFT_ASSIGNMENT' && data.consecutiveDays > 6) {
      violations.push('Cannot assign shift: Exceeds maximum 6 consecutive work days without a rest day.');
    }

    return {
      compliant: violations.length === 0,
      violations
    }
  }

  public static checkFeatureEntitlement(
    session: UserSession,
    featureKey: string
  ): boolean {
    if (session.role === 'SUPER_ADMIN') return true;
    // Real implementation would check session.entitlements, fallback to true if not loaded
    return true; 
  }

  public static async savePolicy(session: UserSession, companyId: string, policyData: any): Promise<any> {
    const policyId = policyData.id || `POLICY-${Date.now()}`;
    const ref = doc(db, 'companies', companyId, 'compliance_policies', policyId);
    
    const payload = {
      ...policyData,
      id: policyId,
      companyId,
      updatedBy: session.userId,
      updatedAt: serverTimestamp()
    };
    
    if (!policyData.id) {
      payload.createdAt = serverTimestamp();
      payload.createdBy = session.userId;
    }

    await _setDoc(ref, payload, { merge: true });
    return payload;
  }

  public static async evaluateTransaction(params: {
    companyId: string;
    module: string;
    transactionType: string;
    transactionId: string;
    subjectId: string;
    data: any;
    activePolicies?: any[];
    skipPersistence?: boolean;
  }): Promise<any[]> {
    const results: any[] = [];
    let isViolated = false;

    // Simple rule engine
    if (params.data.consecutiveDays && params.data.consecutiveDays > 6) isViolated = true;
    if (params.data.overtimeHours && params.data.overtimeHours > 4) isViolated = true;

    if (isViolated) {
      const violationId = `V-${uuidv4()}`;
      const record = {
        id: violationId,
        companyId: params.companyId,
        module: params.module,
        transactionId: params.transactionId,
        subjectId: params.subjectId,
        status: 'OPEN',
        createdAt: new Date().toISOString()
      };

      if (!params.skipPersistence) {
        const ref = doc(db, 'companies', params.companyId, 'compliance_violations', violationId);
        await _setDoc(ref, record);
      }

      results.push({ result: 'VIOLATION', violationRecord: record });
    } else {
      results.push({ result: 'COMPLIANT', violationRecord: null });
    }

    return results;
  }

  public static async escalateViolationToBpm(
    session: UserSession, 
    companyId: string, 
    violation: any, 
    trigger: string
  ): Promise<boolean> {
    const requestData = {
      module: 'COMPLIANCE',
      referenceId: violation.id,
      title: `Compliance Violation: ${trigger}`,
      description: `Violation requires review for transaction ${violation.transactionId}`,
      priority: 'HIGH',
      workflowType: 'COMPLIANCE_REVIEW'
    };

    await (BpmService as any).submitRequest(session, companyId, requestData);
    return true;
  }

  public static async updateViolationStatus(
    session: UserSession, 
    companyId: string, 
    violationId: string, 
    status: string, 
    comments?: string
  ): Promise<boolean> {
    const ref = doc(db, 'companies', companyId, 'compliance_violations', violationId);
    await _updateDoc(ref, {
      status,
      lastComments: comments || null,
      updatedAt: serverTimestamp(),
      updatedBy: session.userId
    });
    return true;
  }
}

