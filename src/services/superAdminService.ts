import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  setDoc, 
  updateDoc, 
  serverTimestamp, 
  Timestamp, 
  addDoc,
  onSnapshot,
  orderBy
} from 'firebase/firestore';
import { db } from '../firebase';
import { 
  CompanyTenant, 
  CreateTenantDTO, 
  TenantStatus, 
  PlatformAuditLog 
} from '../types/platform';
import { UserSession } from '../types';

export class SuperAdminService {
  private static TENANTS_COLLECTION = 'companies';
  private static AUDIT_COLLECTION = 'platform_audit';

  /**
   * Create a new tenant (Company) with unique code validation
   */
  static async createTenant(session: UserSession, data: CreateTenantDTO): Promise<string> {
    const companyCode = data.companyCode.toUpperCase();

    // 1. Unique code validation
    const q = query(
      collection(db, this.TENANTS_COLLECTION), 
      where('companyCode', '==', companyCode)
    );
    const existing = await getDocs(q);
    
    if (!existing.empty) {
      throw new Error(`Company code ${companyCode} is already in use.`);
    }

    // 2. Prepare tenant data
        const tenantId = companyCode; // Use company code as the Document ID for legacy compatibility
    
    // Merge new Platform schema with legacy index.ts schema requirements
    const tenant = {
      id: tenantId,
      companyId: tenantId,
      companyCode,
      name: data.name,
      companyLegalName: data.name,
      brandName: data.name,
      subscriptionPlan: data.subscriptionPlan,
      licenseTier: data.subscriptionPlan,
      enabledModules: data.enabledModules,
      status: 'ACTIVE', // Automatically active to simplify provisioning for tests
      adminEmail: data.adminEmail,
      maxEmployees: data.maxEmployees,
      maxEmployeesAllowed: data.maxEmployees,
      maxSites: data.maxSites,
      maxSitesAllowed: data.maxSites,
      primaryColorHex: '#4f46e5',
      secondaryColorHex: '#06b6d4',
      allowedBranches: ['MAIN'],
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    };

    // 3. Persist tenant
    await setDoc(doc(db, this.TENANTS_COLLECTION, tenantId), {
      ...tenant,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    // 4. Record Audit Log
    await this.logAction(session, {
      action: 'CREATE_TENANT',
      targetTenantId: tenantId,
      metadata: { 
        companyCode, 
        name: data.name, 
        plan: data.subscriptionPlan,
        modules: data.enabledModules
      }
    });

    return tenantId;
  }

  /**
   * Update tenant status with validation
   */
  static async updateTenantStatus(
    session: UserSession, 
    companyId: string, 
    status: TenantStatus, 
    reason: string
  ): Promise<void> {
    const tenantRef = doc(db, this.TENANTS_COLLECTION, companyId);
    const tenantSnap = await getDoc(tenantRef);

    if (!tenantSnap.exists()) {
      throw new Error('Tenant not found');
    }

    const currentStatus = tenantSnap.data().status as TenantStatus;

    // Transition Validation (Basic Example)
    if (currentStatus === 'TERMINATED') {
      throw new Error('Cannot update status of a terminated tenant');
    }

    await updateDoc(tenantRef, {
      status,
      updatedAt: serverTimestamp()
    });

    await this.logAction(session, {
      action: 'UPDATE_STATUS',
      targetTenantId: companyId,
      metadata: { 
        previousStatus: currentStatus, 
        newStatus: status, 
        reason 
      }
    });
  }

  /**
   * Update module entitlements for a tenant
   */
  static async updateModuleEntitlements(
    session: UserSession, 
    companyId: string, 
    modules: string[]
  ): Promise<void> {
    const tenantRef = doc(db, this.TENANTS_COLLECTION, companyId);
    
    await updateDoc(tenantRef, {
      enabledModules: modules,
      updatedAt: serverTimestamp()
    });

    await this.logAction(session, {
      action: 'UPDATE_ENTITLEMENTS',
      targetTenantId: companyId,
      metadata: { modules }
    });
  }

  /**
   * List tenants with optional filtering
   */
  static async listTenants(filter?: { status?: TenantStatus; plan?: string }): Promise<CompanyTenant[]> {
    let q = query(collection(db, this.TENANTS_COLLECTION), orderBy('createdAt', 'desc'));

    if (filter?.status) {
      q = query(q, where('status', '==', filter.status));
    }

    if (filter?.plan) {
      q = query(q, where('subscriptionPlan', '==', filter.plan));
    }

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CompanyTenant));
  }

  /**
   * Realtime listener for tenants
   */
  static subscribeToTenants(callback: (tenants: CompanyTenant[]) => void) {
    const q = query(collection(db, this.TENANTS_COLLECTION), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
      const tenants = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CompanyTenant));
      callback(tenants);
    });
  }

  /**
   * Internal Audit Logger
   */
  private static async logAction(
    session: UserSession, 
    log: Omit<PlatformAuditLog, 'id' | 'actorUid' | 'actorEmail' | 'timestamp'>
  ): Promise<void> {
    const auditData: Omit<PlatformAuditLog, 'id'> = {
      actorUid: session.userId,
      actorEmail: session.email,
      action: log.action,
      targetTenantId: log.targetTenantId,
      metadata: log.metadata,
      timestamp: Timestamp.now()
    };

    await addDoc(collection(db, this.AUDIT_COLLECTION), {
      ...auditData,
      timestamp: serverTimestamp()
    });
  }
}
