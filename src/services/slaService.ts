import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  setDoc, 
  deleteDoc,
  query, 
  where, 
  onSnapshot,
  orderBy 
} from 'firebase/firestore';
import { db } from '../firebase';
import { 
  SlaDefinitionRecord, 
  SlaBreachRecord, 
  SlaScorecardRecord,
  ServiceSlaPolicyRecord,
  UserSession,
  ServiceTicketRecord
} from '../types';
import { SecurityAuditService } from './securityAuditService';

export const slaService = {

  // ==========================================
  // 1. Service Desk SLA Policies (Module 11 / Point 5)
  // ==========================================
  
  async getServiceSlaPolicies(companyId: string, includeInactive: boolean = false): Promise<ServiceSlaPolicyRecord[]> {
    const colRef = collection(db, 'companies', companyId, 'service_sla_policies');
    const q = includeInactive 
      ? query(colRef, orderBy('createdAt', 'desc'))
      : query(colRef, where('status', '==', 'ACTIVE'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => d.data() as ServiceSlaPolicyRecord);
  },

  subscribeToServiceSlaPolicies(companyId: string, callback: (policies: ServiceSlaPolicyRecord[]) => void): () => void {
    const colRef = collection(db, 'companies', companyId, 'service_sla_policies');
    const q = query(colRef);
    return onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(d => d.data() as ServiceSlaPolicyRecord);
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      callback(list);
    }, (err) => {
      console.warn('[slaService] Fallback reading service_sla_policies:', err);
    });
  },

  async saveServiceSlaPolicy(session: UserSession, companyId: string, policy: Partial<ServiceSlaPolicyRecord>): Promise<{ success: boolean; error?: string; policy?: ServiceSlaPolicyRecord }> {
    if (session.companyId !== companyId && session.role !== 'SUPER_ADMIN') {
      return { success: false, error: 'Unauthorized company scope.' };
    }

    const authorizedRoles = ['SUPER_ADMIN', 'COMPANY_ADMIN', 'OPERATIONS_MANAGER', 'SERVICE_DESK'];
    if (!authorizedRoles.includes(session.role)) {
      return { success: false, error: 'Unauthorized. Only administrators and managers can configure SLA policies.' };
    }

    try {
      const isNew = !policy.id;
      const id = isNew ? `SLA-POL-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}` : policy.id!;
      const now = new Date().toISOString();

      const policyRecord: ServiceSlaPolicyRecord = {
        id,
        companyId,
        policyName: policy.policyName || 'Standard Service SLA',
        code: policy.code?.toUpperCase() || `SLA-${Date.now()}`,
        description: policy.description || '',
        clientId: policy.clientId || '*',
        contractId: policy.contractId || '*',
        siteId: policy.siteId || '*',
        category: policy.category || '*',
        priority: policy.priority || '*',
        responseTargetMinutes: Number(policy.responseTargetMinutes) || 60,
        resolutionTargetMinutes: Number(policy.resolutionTargetMinutes) || 480,
        warningThresholdPercentage: Number(policy.warningThresholdPercentage) || 75,
        coverageType: policy.coverageType || '24X7',
        businessHoursStart: policy.businessHoursStart || '09:00',
        businessHoursEnd: policy.businessHoursEnd || '18:00',
        businessDays: policy.businessDays || [1, 2, 3, 4, 5],
        timezone: policy.timezone || 'Asia/Kolkata',
        escalationPolicyId: policy.escalationPolicyId,
        escalateOnWarning: policy.escalateOnWarning ?? false,
        escalateOnBreach: policy.escalateOnBreach ?? true,
        escalationUserIds: policy.escalationUserIds || [],
        status: policy.status || 'ACTIVE',
        effectiveFrom: policy.effectiveFrom || now,
        effectiveTo: policy.effectiveTo,
        createdAt: policy.createdAt || now,
        updatedAt: now,
        createdBy: policy.createdBy || session.userId,
        updatedBy: session.userId
      };

      const docRef = doc(db, 'companies', companyId, 'service_sla_policies', id);
      await setDoc(docRef, policyRecord, { merge: true });

      // Audit Log
      await SecurityAuditService.logEvent(
        companyId,
        session.userId,
        session.role,
        session.employeeId,
        isNew ? 'CREATE_SLA_POLICY' : 'UPDATE_SLA_POLICY',
        'SERVICE_SLA_POLICY',
        id,
        true,
        'MEDIUM',
        `${isNew ? 'Created' : 'Updated'} SLA Policy '${policyRecord.policyName}' (${policyRecord.code})`
      );

      return { success: true, policy: policyRecord };
    } catch (err: any) {
      console.error('[slaService] Error saving SLA policy:', err);
      return { success: false, error: err.message || 'Failed to save SLA policy.' };
    }
  },

  async deleteServiceSlaPolicy(session: UserSession, companyId: string, policyId: string): Promise<{ success: boolean; error?: string }> {
    if (session.companyId !== companyId && session.role !== 'SUPER_ADMIN') {
      return { success: false, error: 'Unauthorized company scope.' };
    }

    if (!['SUPER_ADMIN', 'COMPANY_ADMIN'].includes(session.role)) {
      return { success: false, error: 'Unauthorized to delete SLA policies.' };
    }

    try {
      const docRef = doc(db, 'companies', companyId, 'service_sla_policies', policyId);
      await deleteDoc(docRef);

      await SecurityAuditService.logEvent(
        companyId,
        session.userId,
        session.role,
        session.employeeId,
        'DELETE_SLA_POLICY',
        'SERVICE_SLA_POLICY',
        policyId,
        true,
        'HIGH',
        `Deleted SLA Policy ${policyId}`
      );

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to delete SLA policy.' };
    }
  },

  async initializeDefaultServiceSlaPolicies(companyId: string, userId: string): Promise<void> {
    const now = new Date().toISOString();
    const defaults: Omit<ServiceSlaPolicyRecord, 'id'>[] = [
      {
        companyId,
        policyName: 'Critical Priority 24x7 SLA',
        code: 'SLA-CRITICAL-24X7',
        description: 'Urgent response for business-critical outages and life safety events.',
        clientId: '*',
        contractId: '*',
        siteId: '*',
        category: '*',
        priority: 'CRITICAL',
        responseTargetMinutes: 15,
        resolutionTargetMinutes: 120, // 2 hours
        warningThresholdPercentage: 75,
        coverageType: '24X7',
        status: 'ACTIVE',
        escalateOnBreach: true,
        escalateOnWarning: true,
        effectiveFrom: now,
        createdAt: now,
        updatedAt: now,
        createdBy: userId,
        updatedBy: userId
      },
      {
        companyId,
        policyName: 'High Priority Standard SLA',
        code: 'SLA-HIGH-STD',
        description: 'Accelerated resolution for high impact service tickets.',
        clientId: '*',
        contractId: '*',
        siteId: '*',
        category: '*',
        priority: 'HIGH',
        responseTargetMinutes: 60,
        resolutionTargetMinutes: 360, // 6 hours
        warningThresholdPercentage: 80,
        coverageType: '24X7',
        status: 'ACTIVE',
        escalateOnBreach: true,
        escalateOnWarning: false,
        effectiveFrom: now,
        createdAt: now,
        updatedAt: now,
        createdBy: userId,
        updatedBy: userId
      },
      {
        companyId,
        policyName: 'Medium Business Hours SLA',
        code: 'SLA-MEDIUM-BIZ',
        description: 'Standard business hours workflow for normal facility & workforce tickets.',
        clientId: '*',
        contractId: '*',
        siteId: '*',
        category: '*',
        priority: 'MEDIUM',
        responseTargetMinutes: 120, // 2 hours
        resolutionTargetMinutes: 1440, // 24 hours
        warningThresholdPercentage: 80,
        coverageType: 'BUSINESS_HOURS',
        businessHoursStart: '09:00',
        businessHoursEnd: '18:00',
        businessDays: [1, 2, 3, 4, 5],
        status: 'ACTIVE',
        escalateOnBreach: true,
        escalateOnWarning: false,
        effectiveFrom: now,
        createdAt: now,
        updatedAt: now,
        createdBy: userId,
        updatedBy: userId
      },
      {
        companyId,
        policyName: 'Low Priority Standard SLA',
        code: 'SLA-LOW-STD',
        description: 'Minor service tickets and routine maintenance requests.',
        clientId: '*',
        contractId: '*',
        siteId: '*',
        category: '*',
        priority: 'LOW',
        responseTargetMinutes: 240, // 4 hours
        resolutionTargetMinutes: 2880, // 48 hours
        warningThresholdPercentage: 85,
        coverageType: 'BUSINESS_HOURS',
        businessHoursStart: '09:00',
        businessHoursEnd: '18:00',
        businessDays: [1, 2, 3, 4, 5],
        status: 'ACTIVE',
        escalateOnBreach: false,
        escalateOnWarning: false,
        effectiveFrom: now,
        createdAt: now,
        updatedAt: now,
        createdBy: userId,
        updatedBy: userId
      }
    ];

    for (const def of defaults) {
      const docRef = doc(db, 'companies', companyId, 'service_sla_policies', def.code);
      await setDoc(docRef, { ...def, id: def.code });
    }
  },

  // ==========================================
  // 2. SLA Definitions (Module 7.2)
  // ==========================================
  async getSlaDefinitions(companyId: string, contractId?: string): Promise<SlaDefinitionRecord[]> {
    let q = query(collection(db, 'companies', companyId, 'sla_definitions'));
    if (contractId) {
      q = query(q, where('contractId', '==', contractId));
    }
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as SlaDefinitionRecord);
  },

  async saveSlaDefinition(companyId: string, sla: SlaDefinitionRecord): Promise<void> {
    const docRef = doc(db, 'companies', companyId, 'sla_definitions', sla.id);
    await setDoc(docRef, {
      ...sla,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  },

  // ==========================================
  // 3. SLA Breaches
  // ==========================================
  async getSlaBreaches(companyId: string, contractId?: string): Promise<SlaBreachRecord[]> {
    let q = query(collection(db, 'companies', companyId, 'sla_breaches'));
    if (contractId) {
      q = query(q, where('contractId', '==', contractId));
    }
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as SlaBreachRecord);
  },

  async saveSlaBreach(companyId: string, breach: SlaBreachRecord): Promise<void> {
    const docRef = doc(db, 'companies', companyId, 'sla_breaches', breach.id);
    await setDoc(docRef, {
      ...breach,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  },

  // ==========================================
  // 4. Scorecards
  // ==========================================
  async getScorecards(companyId: string, contractId?: string): Promise<SlaScorecardRecord[]> {
    let q = query(collection(db, 'companies', companyId, 'sla_scorecards'));
    if (contractId) {
      q = query(q, where('contractId', '==', contractId));
    }
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as SlaScorecardRecord);
  },

  async saveScorecard(companyId: string, scorecard: SlaScorecardRecord): Promise<void> {
    const docRef = doc(db, 'companies', companyId, 'sla_scorecards', scorecard.id);
    await setDoc(docRef, {
      ...scorecard,
      generatedAt: new Date().toISOString()
    }, { merge: true });
  }

};
