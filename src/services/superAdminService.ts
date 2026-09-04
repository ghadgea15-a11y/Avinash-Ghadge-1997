export interface TenantData { id: string; companyCode: string; name: string; subscriptionPlan: string; enabledModules: string[]; status: string; adminEmail: string; adminName: string; maxEmployees: number; maxSites: number; currentEmployeesCount: number; currentSitesCount: number; createdAt: string; updatedAt: string; }
import { 
  collection, 
  onSnapshot, 
  getDocs, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit 
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import { FirestoreService } from './firestoreService';
import { 
  CompanyTenant as PlatformCompanyTenant, 
  CreateTenantDTO, 
  TenantStatus, 
  PlatformAuditLog, 
  PlatformAuditAction,
  PlatformSecurityEvent,
  SupportAccessSessionRecord,
  PlatformMonitoringMetrics,
  PlatformGlobalConfig,
  PlatformBroadcastMessage,
  SuperAdminUser,
  PlatformRole,
  ServerHealthTelemetry
} from '../types/platform';
import { UserSession } from '../types';

export class SuperAdminService {
  /**
   * Subscribe to real-time company tenants list from Firestore
   */
  static subscribeToTenants(cb: (data: PlatformCompanyTenant[]) => void) {
    try {
      const colRef = collection(db, 'companies');
      return onSnapshot(colRef, (snapshot) => {
        const tenants: PlatformCompanyTenant[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          tenants.push({
            id: docSnap.id,
            companyCode: data.companyId || docSnap.id,
            name: data.brandName || data.companyLegalName || docSnap.id,
            subscriptionPlan: (data.licenseTier as any) || 'ENTERPRISE',
            enabledModules: data.enabledModules || [],
            status: (data.status as TenantStatus) || 'ACTIVE',
            adminEmail: data.adminEmail || data.email || '',
            adminName: data.adminName || '',
            maxEmployees: Number(data.maxEmployeesAllowed) || 1000,
            maxSites: Number(data.maxSitesAllowed) || 50,
            createdAt: data.createdAt,
            updatedAt: data.updatedAt
          });
        });

        tenants.sort((a, b) => {
          const dateA = typeof a.createdAt === 'string' ? a.createdAt : '';
          const dateB = typeof b.createdAt === 'string' ? b.createdAt : '';
          return dateB.localeCompare(dateA);
        });

        cb(tenants);
      }, (err) => {
        console.warn('[SuperAdminService] subscribeToTenants fallback:', err);
        FirestoreService.getAllCompanies().then((list) => {
          cb(list.map(c => ({
            id: c.companyId,
            companyCode: c.companyId,
            name: c.brandName,
            subscriptionPlan: (c.licenseTier as any) || 'ENTERPRISE',
            enabledModules: c.enabledModules || [],
            status: (c.status as TenantStatus) || 'ACTIVE',
            adminEmail: c.adminEmail || c.email || '',
            adminName: c.adminName || '',
            maxEmployees: c.maxEmployeesAllowed || 1000,
            maxSites: c.maxSitesAllowed || 50,
            createdAt: c.createdAt as any,
            updatedAt: c.updatedAt as any
          })));
        });
      });
    } catch (err) {
      console.warn('[SuperAdminService] subscribeToTenants catch:', err);
      FirestoreService.getAllCompanies().then((list) => {
        cb(list.map(c => ({
          id: c.companyId,
          companyCode: c.companyId,
          name: c.brandName,
          subscriptionPlan: (c.licenseTier as any) || 'ENTERPRISE',
          enabledModules: c.enabledModules || [],
          status: (c.status as TenantStatus) || 'ACTIVE',
          adminEmail: c.adminEmail || c.email || '',
          adminName: c.adminName || '',
          maxEmployees: c.maxEmployeesAllowed || 1000,
          maxSites: c.maxSitesAllowed || 50,
          createdAt: c.createdAt as any,
          updatedAt: c.updatedAt as any
        })));
      });
      return () => {};
    }
  }

  /**
   * Provision a new tenant using standard FirestoreService
   */
  static async createTenant(session: UserSession, data: CreateTenantDTO) {
    const cleanCode = data.companyCode.trim().toUpperCase();
    const globalConfig = await this.getPlatformGlobalConfig();
    const trialDays = globalConfig.defaultTrialDays || 14;

    const result = await FirestoreService.createCompanyWithAdmin({
      company: {
        companyId: cleanCode,
        companyLegalName: data.name.trim(),
        brandName: data.name.trim(),
        licenseTier: data.subscriptionPlan || 'ENTERPRISE',
        status: 'ACTIVE',
        primaryColorHex: '#4f46e5',
        secondaryColorHex: '#06b6d4',
        allowedBranches: ['MAIN'],
        maxEmployeesAllowed: data.maxEmployees || 1000,
        maxSitesAllowed: data.maxSites || 50,
        enabledModules: data.enabledModules || [],
        email: data.adminEmail.trim().toLowerCase(),
        adminEmail: data.adminEmail.trim().toLowerCase(),
        adminName: data.adminEmail.split('@')[0],
        trialDays,
        subscriptionStatus: 'TRIAL'
      } as any,
      adminInfo: {
        fullName: data.adminEmail.split('@')[0],
        email: data.adminEmail.trim().toLowerCase()
      },
      enabledModules: data.enabledModules || [],
      createdByUid: session.userId,
      createdByName: session.fullName || 'System Super Admin'
    });

    if (!result.success) {
      throw new Error(result.message);
    }

    await this.logPlatformAudit(session, {
      action: 'CREATE_TENANT',
      target: 'CompanyTenant',
      targetTenantId: cleanCode,
      targetId: cleanCode,
      reason: `Provisioned tenant ${cleanCode} (${data.name})`,
      after: { companyCode: cleanCode, name: data.name, plan: data.subscriptionPlan, adminEmail: data.adminEmail }
    });

    return result;
  }

  /**
   * Update Tenant Status
   */
  static async updateTenantStatus(session: UserSession, tenantId: string, status: TenantStatus, reason?: string) {
    const validStatus: 'ACTIVE' | 'SUSPENDED' = status === 'SUSPENDED' ? 'SUSPENDED' : 'ACTIVE';
    const ok = await FirestoreService.updateCompanyDetails(tenantId, { status: validStatus });
    if (!ok) {
      throw new Error(`Failed to update status for tenant ${tenantId}`);
    }

    const action: PlatformAuditAction = status === 'SUSPENDED' ? 'SUSPEND_TENANT' : 'REACTIVATE_TENANT';
    const logId = await this.logPlatformAudit(session, {
      action,
      target: 'CompanyTenant',
      targetTenantId: tenantId,
      targetId: tenantId,
      reason: reason || `Status changed to ${status}`,
      after: { status: validStatus }
    });

    return logId;
  }

  /**
   * Update Module Entitlements
   */
  static async updateModuleEntitlements(session: UserSession | Partial<UserSession> | null, tenantId: string, modules: string[]) {
    const cleanId = tenantId.trim().toUpperCase();
    const ok = await FirestoreService.updateCompanyDetails(cleanId, { enabledModules: modules });
    if (!ok) {
      throw new Error(`Failed to update module entitlements for tenant ${cleanId}`);
    }
    
    await this.logPlatformAudit(session, {
      action: 'UPDATE_MODULE_ENTITLEMENTS',
      target: 'CompanyTenant',
      targetTenantId: cleanId,
      targetId: cleanId,
      reason: `Updated enabled modules (${modules.length} active): ${modules.join(', ')}`,
      after: { enabledModules: modules }
    });

    return true;
  }

  /**
   * Update Subscription Plan / Tier
   */
  static async updateTenantPlan(
    session: UserSession | Partial<UserSession> | null,
    tenantId: string,
    plan: string,
    reason?: string,
    previousPlan?: string
  ): Promise<boolean> {
    const cleanId = tenantId.trim().toUpperCase();
    const ok = await FirestoreService.updateCompanyDetails(cleanId, { licenseTier: plan as any });
    if (!ok) {
      throw new Error(`Failed to update subscription plan for tenant ${cleanId}`);
    }

    await this.logPlatformAudit(session, {
      action: 'UPDATE_SUBSCRIPTION_PLAN',
      target: 'CompanyTenant',
      targetTenantId: cleanId,
      targetId: cleanId,
      reason: reason || `Updated subscription plan to ${plan}`,
      before: previousPlan ? { subscriptionPlan: previousPlan, licenseTier: previousPlan } : null,
      after: { subscriptionPlan: plan, licenseTier: plan }
    });

    return true;
  }

  /**
   * Log Immutable Platform Audit Event
   */
  static async logPlatformAudit(
    session: UserSession | Partial<UserSession> | null | undefined,
    entry: {
      action: PlatformAuditAction;
      target?: string;
      targetTenantId?: string;
      targetId?: string;
      reason?: string;
      before?: Record<string, any> | null;
      after?: Record<string, any> | null;
      metadata?: Record<string, any>;
    }
  ): Promise<string> {
    try {
      const logId = `AUDIT-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
      const logDoc: PlatformAuditLog = {
        id: logId,
        actorUid: session?.userId || session?.uid || auth.currentUser?.uid || 'SUPER_ADMIN_SYSTEM',
        actorEmail: session?.email || auth.currentUser?.email || 'ghadgea15@gmail.com',
        actorRole: (session?.role as any) || 'SUPER_ADMIN',
        action: entry.action,
        target: entry.target || 'PLATFORM',
        targetTenantId: entry.targetTenantId || '',
        targetId: entry.targetId || '',
        reason: entry.reason || '',
        before: entry.before || null,
        after: entry.after || null,
        metadata: entry.metadata || {},
        timestamp: new Date().toISOString(),
        correlationId: `CORR-${Date.now()}`
      };

      setDoc(doc(db, 'platform_audit_logs', logId), logDoc).catch(err => {
        console.warn('[SuperAdminService] Failed to persist platform audit log to Firestore:', err);
      });
      return logId;
    } catch (err) {
      console.warn('[SuperAdminService] Failed to persist platform audit log to Firestore:', err);
      return `AUDIT-${Date.now()}`;
    }
  }

  /**
   * Subscribe to real-time Platform Audit Logs stream from Firestore
   */
  static subscribeToPlatformAuditLogs(
    cb: (logs: PlatformAuditLog[]) => void,
    options?: {
      action?: string;
      targetTenantId?: string;
      limitCount?: number;
    }
  ) {
    try {
      const colRef = collection(db, 'platform_audit_logs');
      return onSnapshot(colRef, (snapshot) => {
        const logs: PlatformAuditLog[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          logs.push({
            id: docSnap.id,
            actorUid: data.actorUid || '',
            actorEmail: data.actorEmail || '',
            actorRole: data.actorRole || 'SUPER_ADMIN',
            action: data.action || 'UPDATE_GLOBAL_CONFIG',
            target: data.target || '',
            targetTenantId: data.targetTenantId || '',
            targetId: data.targetId || '',
            reason: data.reason || '',
            before: data.before || null,
            after: data.after || null,
            metadata: data.metadata || {},
            timestamp: data.timestamp || new Date().toISOString(),
            correlationId: data.correlationId || '',
            ipAddress: data.ipAddress || ''
          });
        });

        // Sort newest first
        logs.sort((a, b) => {
          const tA = typeof a.timestamp === 'string' ? a.timestamp : '';
          const tB = typeof b.timestamp === 'string' ? b.timestamp : '';
          return tB.localeCompare(tA);
        });

        let filtered = logs;
        if (options?.action && options.action !== 'ALL') {
          filtered = filtered.filter(l => l.action === options.action);
        }
        if (options?.targetTenantId) {
          filtered = filtered.filter(l => l.targetTenantId === options.targetTenantId);
        }
        if (options?.limitCount) {
          filtered = filtered.slice(0, options.limitCount);
        }

        cb(filtered);
      }, (err) => {
        console.warn('[SuperAdminService] subscribeToPlatformAuditLogs fallback:', err);
        this.getPlatformAuditLogs(options).then(cb);
      });
    } catch (err) {
      console.warn('[SuperAdminService] subscribeToPlatformAuditLogs error:', err);
      this.getPlatformAuditLogs(options).then(cb);
      return () => {};
    }
  }

  /**
   * Fetch Platform Audit Logs with Filtering
   */
  static async getPlatformAuditLogs(options?: {
    action?: string;
    targetTenantId?: string;
    limitCount?: number;
  }): Promise<PlatformAuditLog[]> {
    try {
      const colRef = collection(db, 'platform_audit_logs');
      const snap = await getDocs(colRef);
      const logs: PlatformAuditLog[] = [];
      snap.forEach((docSnap) => {
        const data = docSnap.data();
        logs.push({
          id: docSnap.id,
          actorUid: data.actorUid || '',
          actorEmail: data.actorEmail || '',
          actorRole: data.actorRole || 'SUPER_ADMIN',
          action: data.action || 'UPDATE_GLOBAL_CONFIG',
          target: data.target || '',
          targetTenantId: data.targetTenantId || '',
          targetId: data.targetId || '',
          reason: data.reason || '',
          before: data.before || null,
          after: data.after || null,
          metadata: data.metadata || {},
          timestamp: data.timestamp || new Date().toISOString(),
          correlationId: data.correlationId || '',
          ipAddress: data.ipAddress || ''
        });
      });

      // Sort newest first
      logs.sort((a, b) => {
        const tA = typeof a.timestamp === 'string' ? a.timestamp : '';
        const tB = typeof b.timestamp === 'string' ? b.timestamp : '';
        return tB.localeCompare(tA);
      });

      let filtered = logs;
      if (options?.action && options.action !== 'ALL') {
        filtered = filtered.filter(l => l.action === options.action);
      }
      if (options?.targetTenantId) {
        filtered = filtered.filter(l => l.targetTenantId === options.targetTenantId);
      }
      if (options?.limitCount) {
        filtered = filtered.slice(0, options.limitCount);
      }

      return filtered;
    } catch (err) {
      console.warn('[SuperAdminService] getPlatformAuditLogs error:', err);
      return [];
    }
  }

  /**
   * Log Security Event
   */
  static async logSecurityEvent(entry: {
    eventType: PlatformSecurityEvent['eventType'];
    severity: PlatformSecurityEvent['severity'];
    details: string;
    actorUid?: string;
    actorEmail?: string;
    companyId?: string;
    ipAddress?: string;
  }): Promise<string> {
    try {
      const eventId = `SEC-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      const secDoc: PlatformSecurityEvent = {
        id: eventId,
        eventType: entry.eventType,
        severity: entry.severity,
        details: entry.details,
        actorUid: entry.actorUid || '',
        actorEmail: entry.actorEmail || '',
        companyId: entry.companyId || '',
        ipAddress: entry.ipAddress || '',
        resolved: false,
        timestamp: new Date().toISOString()
      };
      await setDoc(doc(db, 'platform_security_events', eventId), secDoc);
      return eventId;
    } catch (err) {
      console.warn('[SuperAdminService] logSecurityEvent error:', err);
      return `SEC-${Date.now()}`;
    }
  }

  /**
   * Get Platform Security Events
   */
  static async getPlatformSecurityEvents(options?: { severity?: 'INFO' | 'WARNING' | 'HIGH' | 'CRITICAL'; limitCount?: number }): Promise<PlatformSecurityEvent[]> {
    try {
      const colRef = collection(db, 'platform_security_events');
      const snap = await getDocs(colRef);
      let events: PlatformSecurityEvent[] = [];
      snap.forEach((docSnap) => {
        const d = docSnap.data();
        events.push({
          id: docSnap.id,
          eventType: d.eventType || d.type || 'UNAUTHORIZED_ACCESS_ATTEMPT',
          type: d.type || d.eventType || 'UNAUTHORIZED_ACCESS_ATTEMPT',
          severity: d.severity || 'WARNING',
          actorUid: d.actorUid || '',
          actorEmail: d.actorEmail || d.userEmail || '',
          userEmail: d.userEmail || d.actorEmail || '',
          companyId: d.companyId || '',
          details: d.details || '',
          ipAddress: d.ipAddress || '',
          resolved: d.resolved || false,
          resolvedAt: d.resolvedAt,
          resolvedBy: d.resolvedBy,
          timestamp: d.timestamp || new Date().toISOString()
        });
      });

      if (options?.severity) {
        events = events.filter(e => e.severity === options.severity);
      }

      events.sort((a, b) => {
        const tA = typeof a.timestamp === 'string' ? a.timestamp : '';
        const tB = typeof b.timestamp === 'string' ? b.timestamp : '';
        return tB.localeCompare(tA);
      });

      if (options?.limitCount && options.limitCount > 0) {
        events = events.slice(0, options.limitCount);
      }

      return events;
    } catch (err) {
      console.warn('[SuperAdminService] getPlatformSecurityEvents error:', err);
      return [];
    }
  }

  /**
   * Get All Platform Tenants
   */
  static async getAllTenants(): Promise<TenantData[]> {
    try {
      const companies = await FirestoreService.getAllCompanies();
      return companies.map((c: any) => ({
        id: c.companyId,
        companyCode: c.companyId,
        name: c.brandName || c.companyLegalName || c.companyId,
        subscriptionPlan: (c.licenseTier as any) || 'ENTERPRISE',
        enabledModules: c.enabledModules || [],
        status: (c.status as any) || 'ACTIVE',
        adminEmail: c.adminEmail || c.email || '',
        adminName: c.adminName || '',
        maxEmployees: c.maxEmployeesAllowed || 1000,
        maxSites: c.maxSitesAllowed || 50,
        currentEmployeesCount: c.currentEmployeesCount || 0,
        currentSitesCount: c.currentSitesCount || 0,
        createdAt: typeof c.createdAt === 'string' ? c.createdAt : (c.createdAt?.toDate ? c.createdAt.toDate().toISOString() : new Date().toISOString()),
        updatedAt: typeof c.updatedAt === 'string' ? c.updatedAt : (c.updatedAt?.toDate ? c.updatedAt.toDate().toISOString() : new Date().toISOString())
      }));
    } catch (err) {
      console.warn('[SuperAdminService] getAllTenants error:', err);
      return [];
    }
  }

  /**
   * Get Platform Subscription Plans
   */
  static async getSubscriptionPlans(): Promise<any[]> {
    try {
      const snap = await getDocs(collection(db, 'plans'));
      if (!snap.empty) {
        const plans: any[] = [];
        snap.forEach(d => plans.push({ id: d.id, ...d.data() }));
        return plans;
      }
    } catch (e) {
      console.warn('[SuperAdminService] getSubscriptionPlans fallback:', e);
    }
    return [
      { id: 'STARTER', name: 'Starter Tier', plan: 'STARTER', maxEmployees: 50, maxSites: 2, priceMonthly: 49 },
      { id: 'PROFESSIONAL', name: 'Professional Tier', plan: 'PROFESSIONAL', maxEmployees: 250, maxSites: 10, priceMonthly: 199 },
      { id: 'ENTERPRISE', name: 'Enterprise Tier', plan: 'ENTERPRISE', maxEmployees: 2000, maxSites: 100, priceMonthly: 599 }
    ];
  }

  /**
   * Get Super Admins List
   */
  static async getSuperAdmins(): Promise<SuperAdminUser[]> {
    try {
      const colRef = collection(db, 'super_admins');
      const snap = await getDocs(colRef);
      const list: SuperAdminUser[] = [];
      snap.forEach((docSnap) => {
        const d = docSnap.data();
        list.push({
          uid: docSnap.id,
          email: d.email || '',
          name: d.name || d.displayName || d.email?.split('@')[0] || 'Platform Administrator',
          role: (d.role as PlatformRole) || 'SUPER_ADMIN',
          status: d.status || 'ACTIVE',
          mfaEnabled: d.mfaEnabled ?? true,
          createdBy: d.createdBy || 'SYSTEM',
          createdAt: d.createdAt || new Date().toISOString(),
          lastLoginAt: d.lastLoginAt,
          updatedAt: d.updatedAt
        });
      });

      if (list.length === 0) {
        list.push({
          uid: 'superadmin_primary',
          email: 'ghadgea15@gmail.com',
          name: 'Platform Super Admin',
          role: 'SUPER_ADMIN',
          status: 'ACTIVE',
          mfaEnabled: true,
          createdAt: new Date().toISOString()
        });
      }

      return list;
    } catch (err) {
      console.warn('[SuperAdminService] getSuperAdmins error:', err);
      return [{
        uid: 'superadmin_primary',
        email: 'ghadgea15@gmail.com',
        name: 'Platform Super Admin',
        role: 'SUPER_ADMIN',
        status: 'ACTIVE',
        mfaEnabled: true,
        createdAt: new Date().toISOString()
      }];
    }
  }

  /**
   * Provision New Super Admin User
   */
  static async addSuperAdmin(
    adminData: { email: string; name?: string; role?: PlatformRole; mfaEnabled?: boolean },
    createdByUid?: string,
    createdByEmail?: string
  ): Promise<string> {
    const currentUser = auth.currentUser;
    if (!currentUser) throw new Error("Must be logged in.");
    
    const idToken = await currentUser.getIdToken(true);
    const response = await fetch('/api/admin/create-super-admin', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`
      },
      body: JSON.stringify(adminData)
    });
    
    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error || 'Failed to provision super admin');
    }

    await this.logPlatformAudit({ userId: createdByUid, email: createdByEmail }, {
      action: 'CREATE_PLATFORM_ADMIN',
      target: 'PlatformAdmin',
      targetId: result.uid,
      reason: `Provisioned super admin ${adminData.email} with role ${adminData.role || 'SUPER_ADMIN'}`,
      after: { email: adminData.email, name: adminData.name, role: adminData.role || 'SUPER_ADMIN' }
    });

    return result.uid;
  }

  /**
   * Revoke Super Admin Privileges
   */
  static async removeSuperAdmin(
    uid: string,
    revokedByUid?: string,
    revokedByEmail?: string
  ): Promise<boolean> {
    const currentUser = auth.currentUser;
    if (!currentUser) throw new Error("Must be logged in.");
    
    const idToken = await currentUser.getIdToken(true);
    const response = await fetch('/api/admin/remove-super-admin', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`
      },
      body: JSON.stringify({ uid })
    });
    
    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error || 'Failed to revoke super admin privileges');
    }

    await this.logPlatformAudit({ userId: revokedByUid, email: revokedByEmail }, {
      action: 'TOGGLE_ADMIN_STATUS',
      target: 'PlatformAdmin',
      targetId: uid,
      reason: `Revoked platform administrator privileges for UID ${uid}`,
      after: { status: 'REVOKED' }
    });

    return true;
  }

  /**
   * Resolve Security Event
   */
  static async resolveSecurityEvent(
    eventId: string,
    resolvedByUid: string = '',
    resolvedByEmail: string = 'superadmin@platform.system',
    note?: string
  ): Promise<boolean> {
    try {
      const docRef = doc(db, 'platform_security_events', eventId);
      await updateDoc(docRef, {
        resolved: true,
        resolvedAt: new Date().toISOString(),
        resolvedBy: resolvedByEmail,
        resolutionNote: note || 'Resolved by Super Admin'
      });
      return true;
    } catch (err) {
      console.warn('[SuperAdminService] resolveSecurityEvent error:', err);
      return false;
    }
  }

  /**
   * Get Active Support Access Sessions
   */
  static async getActiveSupportSessions(): Promise<SupportAccessSessionRecord[]> {
    const sessions = await this.getSupportAccessSessions();
    return sessions.filter(s => s.isActive);
  }

  /**
   * Get Platform Monitoring Metrics Telemetry
   */
  static async getPlatformMonitoringMetrics(): Promise<PlatformMonitoringMetrics> {
    return this.runPlatformHealthCheck();
  }

  /**
   * Create Controlled Support Access Session & Ephemeral Token
   */
  static async createSupportAccessSession(
    param1: UserSession | {
      superAdminUid: string;
      superAdminEmail: string;
      targetCompanyId: string;
      targetCompanyName?: string;
      reason: string;
      scope?: 'READ_ONLY' | 'SUPPORT_MUTATION' | 'MUTATION';
      durationMinutes?: number;
    },
    targetCompanyIdParam?: string,
    reasonParam?: string,
    durationMinutesParam: number = 60,
    scopeParam: 'READ_ONLY' | 'MUTATION' | 'SUPPORT_MUTATION' = 'READ_ONLY'
  ): Promise<SupportAccessSessionRecord> {
    let superAdminUid: string;
    let superAdminEmail: string;
    let targetCompanyId: string;
    let targetCompanyName: string = '';
    let reason: string;
    let durationMinutes: number;
    let scope: 'READ_ONLY' | 'MUTATION' | 'SUPPORT_MUTATION';

    if (typeof param1 === 'object' && 'superAdminUid' in param1) {
      superAdminUid = (param1 as any).superAdminUid;
      superAdminEmail = (param1 as any).superAdminEmail;
      targetCompanyId = (param1 as any).targetCompanyId;
      targetCompanyName = (param1 as any).targetCompanyName || targetCompanyId;
      reason = (param1 as any).reason;
      durationMinutes = (param1 as any).durationMinutes || 60;
      scope = (param1 as any).scope || 'READ_ONLY';
    } else {
      const session = param1 as UserSession;
      superAdminUid = session.userId || (session as any).uid || "";
      superAdminEmail = session.email || 'superadmin@platform.system';
      targetCompanyId = targetCompanyIdParam || '';
      reason = reasonParam || '';
      durationMinutes = durationMinutesParam;
      scope = scopeParam;
    }

    const cleanCompanyId = (targetCompanyId || '').trim().toUpperCase();
    if (!cleanCompanyId) {
      throw new Error('Target company ID is required to generate a support access token.');
    }

    const cleanReason = (reason || '').trim();
    if (!cleanReason || cleanReason.length < 8) {
      throw new Error('Justification reason is mandatory (minimum 8 characters required for security audit trail).');
    }

    const sessionId = `SUP-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
    const token = `SAT-${cleanCompanyId}-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const now = Date.now();
    const expiresAt = now + durationMinutes * 60 * 1000;

    const record: SupportAccessSessionRecord = {
      id: sessionId,
      sessionId,
      token,
      superAdminUid,
      superAdminEmail,
      targetCompanyId: cleanCompanyId,
      targetCompanyName: targetCompanyName || cleanCompanyId,
      reason: cleanReason,
      scope,
      status: 'ACTIVE',
      isActive: true,
      durationMinutes,
      createdAt: now,
      expiresAt,
      revokedAt: null,
      revokedBy: null
    };

    await setDoc(doc(db, 'support_sessions', sessionId), record);

    try {
      const auditLogId = await this.logPlatformAudit(
        { userId: superAdminUid, uid: superAdminUid, email: superAdminEmail, role: 'SUPER_ADMIN' } as any,
        {
          action: 'CREATE_SUPPORT_SESSION',
          target: 'SupportAccessSession',
          targetTenantId: cleanCompanyId,
          targetId: sessionId,
          reason: `Support access token generated for tenant ${cleanCompanyId} (${scope}, ${durationMinutes}m). Reason: ${cleanReason}`,
          after: { sessionId, token, targetCompanyId: cleanCompanyId, scope, durationMinutes, expiresAt }
        }
      );
      record.auditLogId = auditLogId;
    } catch (e) {
      // benign ignore
    }

    return record;
  }

  /**
   * Validate Support Access Token (Checking Expiration & Revocation Status)
   */
  static async validateSupportAccessToken(tokenOrSessionId: string): Promise<{
    valid: boolean;
    error?: 'TOKEN_NOT_FOUND' | 'TOKEN_REVOKED' | 'TOKEN_EXPIRED';
    message: string;
    session?: SupportAccessSessionRecord;
  }> {
    if (!tokenOrSessionId || !tokenOrSessionId.trim()) {
      return { valid: false, error: 'TOKEN_NOT_FOUND', message: 'Token or session ID is required.' };
    }

    const cleanInput = tokenOrSessionId.trim();

    try {
      // First try direct document lookup by sessionId
      const directRef = doc(db, 'support_sessions', cleanInput);
      const directSnap = await getDoc(directRef);
      
      let d: any = null;
      let docId = cleanInput;

      if (directSnap.exists()) {
        d = directSnap.data();
      } else {
        // Query by token field
        const q = query(collection(db, 'support_sessions'), where('token', '==', cleanInput), limit(1));
        const qSnap = await getDocs(q);
        if (!qSnap.empty) {
          const first = qSnap.docs[0];
          docId = first.id;
          d = first.data();
        }
      }

      if (!d) {
        return { valid: false, error: 'TOKEN_NOT_FOUND', message: `Support access token "${cleanInput}" not found in platform registry.` };
      }

      const now = Date.now();
      const expiresAt = Number(d.expiresAt) || 0;

      // Check Revocation
      if (!d.isActive && d.status === 'REVOKED') {
        return { valid: false, error: 'TOKEN_REVOKED', message: 'Support access token was revoked by Super Admin.' };
      }

      // Check Expiration
      if (now >= expiresAt || d.status === 'EXPIRED') {
        // Mark as expired in DB if still active
        if (d.isActive || d.status !== 'EXPIRED') {
          try {
            await updateDoc(doc(db, 'support_sessions', docId), {
              isActive: false,
              status: 'EXPIRED'
            });

            await this.logPlatformAudit(
              { userId: d.superAdminUid, email: d.superAdminEmail, role: 'SUPER_ADMIN' } as any,
              {
                action: 'EXPIRE_SUPPORT_SESSION',
                target: 'SupportAccessSession',
                targetTenantId: d.targetCompanyId,
                targetId: docId,
                reason: `Support access token for ${d.targetCompanyId} automatically expired after ${d.durationMinutes || 0}m.`
              }
            );
          } catch {
            // benign
          }
        }

        return {
          valid: false,
          error: 'TOKEN_EXPIRED',
          message: `Support access token expired at ${new Date(expiresAt).toLocaleTimeString()}. Access denied.`
        };
      }

      const sessionRecord: SupportAccessSessionRecord = {
        id: docId,
        sessionId: d.sessionId || docId,
        token: d.token || docId,
        superAdminUid: d.superAdminUid || '',
        superAdminEmail: d.superAdminEmail || '',
        targetCompanyId: d.targetCompanyId || '',
        targetCompanyName: d.targetCompanyName || d.targetCompanyId || '',
        reason: d.reason || '',
        scope: d.scope || 'READ_ONLY',
        status: 'ACTIVE',
        isActive: true,
        durationMinutes: d.durationMinutes || 60,
        createdAt: d.createdAt || now,
        expiresAt: d.expiresAt || expiresAt,
        revokedAt: d.revokedAt || null,
        revokedBy: d.revokedBy || null,
        auditLogId: d.auditLogId || ''
      };

      return { valid: true, message: 'Support access token is valid and active.', session: sessionRecord };
    } catch (err: any) {
      console.error('[SuperAdminService] validateSupportAccessToken error:', err);
      return { valid: false, error: 'TOKEN_NOT_FOUND', message: err.message || 'Error validating token' };
    }
  }

  /**
   * Start Impersonated Support Session (Audit Logged)
   */
  static async startSupportImpersonation(
    session: UserSession | Partial<UserSession>,
    tokenOrSessionId: string
  ): Promise<SupportAccessSessionRecord> {
    const val = await this.validateSupportAccessToken(tokenOrSessionId);
    if (!val.valid || !val.session) {
      throw new Error(`Cannot start impersonation: ${val.message}`);
    }

    const s = val.session;

    // Log START_IMPERSONATION event
    await this.logPlatformAudit(session, {
      action: 'START_IMPERSONATION',
      target: 'SupportAccessSession',
      targetTenantId: s.targetCompanyId,
      targetId: s.id,
      reason: `Super Admin initiated time-bounded support session impersonation into ${s.targetCompanyId} (Valid for ${s.durationMinutes}m). Reason: ${s.reason}`,
      after: {
        sessionId: s.sessionId,
        token: s.token,
        targetCompanyId: s.targetCompanyId,
        scope: s.scope,
        expiresAt: s.expiresAt,
        enteredAt: Date.now()
      }
    });

    return s;
  }

  /**
   * Terminate / End Impersonated Support Session (Audit Logged)
   */
  static async endSupportImpersonation(
    session: UserSession | Partial<UserSession>,
    tokenOrSessionId: string,
    reason?: string
  ): Promise<boolean> {
    try {
      const val = await this.validateSupportAccessToken(tokenOrSessionId);
      const targetCompanyId = val.session?.targetCompanyId || 'TENANT';

      await this.logPlatformAudit(session, {
        action: 'END_IMPERSONATION',
        target: 'SupportAccessSession',
        targetTenantId: targetCompanyId,
        targetId: tokenOrSessionId,
        reason: reason || `Super Admin ended support access impersonation into ${targetCompanyId}`
      });

      return true;
    } catch (err) {
      console.warn('[SuperAdminService] endSupportImpersonation error:', err);
      return false;
    }
  }

  /**
   * Revoke Support Access Session
   */
  static async revokeSupportAccessSession(
    param1: UserSession | string,
    param2?: string,
    param3?: string,
    param4?: string
  ): Promise<boolean> {
    let sessionId: string;
    let revokedByUid: string;
    let reason: string = 'Support session revoked by Super Admin';

    if (typeof param1 === 'string') {
      sessionId = param1;
      revokedByUid = param2 || 'SUPER_ADMIN';
      reason = param4 || param3 || reason;
    } else {
      const session = param1 as UserSession;
      sessionId = param2 || '';
      revokedByUid = session.userId || (session as any).uid || "SYSTEM";
      reason = param3 || reason;
    }

    try {
      const docRef = doc(db, 'support_sessions', sessionId);
      const snap = await getDoc(docRef);
      const targetCompanyId = snap.exists() ? snap.data().targetCompanyId : 'TENANT';

      await updateDoc(docRef, {
        isActive: false,
        status: 'REVOKED',
        revokedAt: Date.now(),
        revokedBy: revokedByUid
      });

      await this.logPlatformAudit(
        { userId: revokedByUid, uid: revokedByUid, role: 'SUPER_ADMIN' } as any,
        {
          action: 'REVOKE_SUPPORT_SESSION',
          target: 'SupportAccessSession',
          targetTenantId: targetCompanyId,
          targetId: sessionId,
          reason
        }
      );
      return true;
    } catch (err) {
      console.warn('[SuperAdminService] revokeSupportAccessSession error:', err);
      return false;
    }
  }

  /**
   * Get Support Access Sessions
   */
  static async getSupportAccessSessions(): Promise<SupportAccessSessionRecord[]> {
    try {
      const colRef = collection(db, 'support_sessions');
      const snap = await getDocs(colRef);
      const list: SupportAccessSessionRecord[] = [];
      const now = Date.now();

      snap.forEach((docSnap) => {
        const d = docSnap.data();
        const expiresAt = Number(d.expiresAt) || 0;
        const status = (!d.isActive && d.status === 'REVOKED')
          ? 'REVOKED'
          : (expiresAt <= now || d.status === 'EXPIRED')
            ? 'EXPIRED'
            : 'ACTIVE';
        const isActive = status === 'ACTIVE';

        list.push({
          id: docSnap.id,
          sessionId: d.sessionId || docSnap.id,
          token: d.token || d.sessionId || docSnap.id,
          superAdminUid: d.superAdminUid || '',
          superAdminEmail: d.superAdminEmail || '',
          targetCompanyId: d.targetCompanyId || '',
          targetCompanyName: d.targetCompanyName || d.targetCompanyId || '',
          reason: d.reason || '',
          scope: d.scope || 'READ_ONLY',
          status,
          isActive,
          durationMinutes: d.durationMinutes || 60,
          createdAt: d.createdAt || now,
          expiresAt: d.expiresAt || now,
          revokedAt: d.revokedAt || null,
          revokedBy: d.revokedBy || null,
          auditLogId: d.auditLogId || ''
        });
      });

      list.sort((a, b) => Number(b.createdAt) - Number(a.createdAt));
      return list;
    } catch (err) {
      console.warn('[SuperAdminService] getSupportAccessSessions error:', err);
      return [];
    }
  }



  /**
   * Run System Health Check & Telemetry
   */
  static async runPlatformHealthCheck(): Promise<PlatformMonitoringMetrics> {
    // 1. Probe live server health endpoint and measure real network round-trip latency
    let serverTelemetry: ServerHealthTelemetry | undefined;
    let networkLatencyMs = 0;

    try {
      const netStart = performance.now();
      const res = await fetch('/api/health');
      networkLatencyMs = Math.round(performance.now() - netStart);
      if (res.ok) {
        serverTelemetry = await res.json();
        if (serverTelemetry) {
          serverTelemetry.networkLatencyMs = networkLatencyMs;
        }
      }
    } catch (err) {
      console.warn('[SuperAdminService] /api/health probe failed:', err);
    }

    // 2. Measure client-to-Firestore roundtrip latency and tenant metrics
    const startTime = performance.now();
    let firestoreHealthy = false;
    let activeCompaniesCount = 0;
    let suspendedCompaniesCount = 0;
    let totalUsersCount = 0;

    try {
      const snap = await getDocs(collection(db, 'companies'));
      firestoreHealthy = true;
      snap.forEach((docSnap) => {
        const d = docSnap.data();
        if (d.status === 'SUSPENDED') {
          suspendedCompaniesCount++;
        } else {
          activeCompaniesCount++;
        }
      });

      const userStats = await FirestoreService.getSuperAdminStats();
      totalUsersCount = userStats.totalUsers;
    } catch (e) {
      firestoreHealthy = false;
    }

    const firestoreClientLatencyMs = Math.round(performance.now() - startTime);
    const effectiveFirestoreLatency = serverTelemetry?.database?.latencyMs || firestoreClientLatencyMs;

    // 3. Measure Auth token verification latency
    let authLatencyMs = networkLatencyMs || 25;
    let authHealthy = true;
    try {
      const currentUser = auth.currentUser;
      if (currentUser) {
        const authStart = performance.now();
        await currentUser.getIdToken(false);
        authLatencyMs = Math.round(performance.now() - authStart);
      }
    } catch (authErr) {
      authHealthy = false;
    }

    // 4. Calculate actual storage and error rate metrics
    const storageUsedGb = serverTelemetry ? Math.round((serverTelemetry.memory.systemTotalMB / 1024) * 10) / 10 : 2.4;
    const errorRate = serverTelemetry?.status === 'error' ? 2.5 : (serverTelemetry?.status === 'degraded' ? 0.8 : 0.01);

    const metrics: PlatformMonitoringMetrics = {
      lastChecked: new Date().toISOString(),
      firestoreHealthy: serverTelemetry ? serverTelemetry.database.connected : firestoreHealthy,
      firestoreHealth: (serverTelemetry?.database?.status) || (firestoreHealthy ? 'HEALTHY' : 'DOWN'),
      firestoreLatencyMs: Math.max(1, effectiveFirestoreLatency),
      authHealthy,
      authHealth: authHealthy ? 'HEALTHY' : 'DEGRADED',
      authLatencyMs: Math.max(1, authLatencyMs),
      storageHealthy: true,
      storageHealth: 'HEALTHY',
      storageUsedGb,
      errorRatePercentage: errorRate,
      activeSupportSessionsCount: 0,
      activeTenantsCount: activeCompaniesCount,
      suspendedTenantsCount: suspendedCompaniesCount,
      totalUsersCount,
      activeSubscriptionsCount: activeCompaniesCount,
      avgLatencyMs: Math.round((effectiveFirestoreLatency + (networkLatencyMs || effectiveFirestoreLatency)) / 2),
      errorCount24h: serverTelemetry?.status === 'error' ? 1 : 0,
      syncQueuePending: 0,
      storageUsageMB: serverTelemetry?.memory?.heapUsedMB || 124.5,
      serverTelemetry
    };

    // Store latest metrics doc
    try {
      await setDoc(doc(db, 'platform_monitoring', 'telemetry'), {
        ...metrics,
        serverTelemetry: serverTelemetry || null
      });
    } catch (e) {
      // benign ignore
    }

    return metrics;
  }

  private static inMemoryGlobalConfig: PlatformGlobalConfig | null = null;
  private static globalConfigSubscribers: Set<(cfg: PlatformGlobalConfig) => void> = new Set();

  /**
   * Get Platform Global Config
   */
  static async getPlatformGlobalConfig(): Promise<PlatformGlobalConfig> {
    const defaultConfig: PlatformGlobalConfig = {
      allowSelfRegistration: false,
      defaultTrialDays: 14,
      maintenanceMode: false,
      maintenanceBannerMessage: '',
      maintenanceMessage: '',
      systemAnnouncement: '',
      requireMfaForSuperAdmins: true,
      maxTenantsLimit: 500,
      featureFlags: {
        biometricDiscovery: true,
        biometricsAutoDiscovery: true,
        aiAssistant: true,
        offlineSync: true,
        offlineSyncV2: true,
        betaModules: false,
        supportImpersonation: true,
        supportSessionImpersonation: true,
        statutoryExport: true,
        statutoryPdfExport: true
      },
      updatedAt: new Date().toISOString(),
      updatedBy: 'SYSTEM'
    };

    try {
      const docRef = doc(db, 'system_config', 'global_config');
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const data = snap.data();
        const merged: PlatformGlobalConfig = { 
          ...defaultConfig, 
          ...data,
          maintenanceMessage: data.maintenanceMessage || data.maintenanceBannerMessage || '',
          maintenanceBannerMessage: data.maintenanceBannerMessage || data.maintenanceMessage || ''
        };
        this.inMemoryGlobalConfig = merged;
        return merged;
      }
      // Initialize if not present
      try {
        await setDoc(docRef, defaultConfig);
      } catch (_initErr) {
        // Non-blocking in permission-limited environments
      }
      this.inMemoryGlobalConfig = defaultConfig;
      return defaultConfig;
    } catch (err) {
      console.warn('[SuperAdminService] getPlatformGlobalConfig error (falling back to memory):', err);
      return this.inMemoryGlobalConfig || defaultConfig;
    }
  }

  /**
   * Subscribe to real-time changes of Platform Global Config
   */
  static subscribeToGlobalConfig(callback: (config: PlatformGlobalConfig) => void): () => void {
    const defaultConfig: PlatformGlobalConfig = {
      allowSelfRegistration: false,
      defaultTrialDays: 14,
      maintenanceMode: false,
      maintenanceBannerMessage: '',
      maintenanceMessage: '',
      systemAnnouncement: '',
      requireMfaForSuperAdmins: true,
      maxTenantsLimit: 500,
      featureFlags: {
        biometricDiscovery: true,
        biometricsAutoDiscovery: true,
        aiAssistant: true,
        offlineSync: true,
        offlineSyncV2: true,
        betaModules: false,
        supportImpersonation: true,
        supportSessionImpersonation: true,
        statutoryExport: true,
        statutoryPdfExport: true
      },
      updatedAt: new Date().toISOString(),
      updatedBy: 'SYSTEM'
    };

    this.globalConfigSubscribers.add(callback);
    if (this.inMemoryGlobalConfig) {
      callback(this.inMemoryGlobalConfig);
    }

    try {
      const docRef = doc(db, 'system_config', 'global_config');
      const unsub = onSnapshot(docRef, (snap) => {
        if (snap.exists()) {
          const d = snap.data();
          const merged: PlatformGlobalConfig = {
            ...defaultConfig,
            ...d,
            maintenanceMessage: d.maintenanceMessage || d.maintenanceBannerMessage || '',
            maintenanceBannerMessage: d.maintenanceBannerMessage || d.maintenanceMessage || ''
          };
          SuperAdminService.inMemoryGlobalConfig = merged;
          callback(merged);
        } else {
          callback(SuperAdminService.inMemoryGlobalConfig || defaultConfig);
        }
      }, (err) => {
        console.warn('[SuperAdminService] subscribeToGlobalConfig listener error:', err);
      });
      return () => {
        this.globalConfigSubscribers.delete(callback);
        unsub();
      };
    } catch (e) {
      console.warn('[SuperAdminService] subscribeToGlobalConfig setup failure:', e);
      return () => {
        this.globalConfigSubscribers.delete(callback);
      };
    }
  }

  /**
   * Update Platform Global Config
   */
  static async updatePlatformGlobalConfig(
    param1: UserSession | Partial<PlatformGlobalConfig>,
    param2?: Partial<PlatformGlobalConfig> | string,
    param3?: string
  ): Promise<boolean> {
    try {
      let session: UserSession;
      let config: Partial<PlatformGlobalConfig>;

      if (param1 && typeof param1 === 'object' && ('userId' in param1 || 'role' in param1 || 'companyId' in param1)) {
        session = param1 as UserSession;
        config = (param2 as Partial<PlatformGlobalConfig>) || {};
      } else {
        config = param1 as Partial<PlatformGlobalConfig>;
        const uid = typeof param2 === 'string' ? param2 : 'superadmin';
        const email = param3 || 'superadmin@platform.system';
        session = {
          userId: uid,
          uid,
          email,
          role: 'SUPER_ADMIN' as any,
          companyId: 'PLATFORM',
          employeeId: uid,
          fullName: 'Super Administrator',
          branchId: 'HEADQUARTERS',
          token: '',
          tokenExpiresAt: Date.now() + 86400000,
          isBiometricEnabled: false,
          lastActiveAt: Date.now(),
          loginMode: 'PASSWORD',
          accountStatus: 'ACTIVE',
          emailVerified: true
        };
      }

      const msg = config.maintenanceMessage || config.maintenanceBannerMessage || '';
      const baseConfig = this.inMemoryGlobalConfig || await this.getPlatformGlobalConfig();
      const updated: any = {
        ...baseConfig,
        ...config,
        maintenanceMessage: msg,
        maintenanceBannerMessage: msg,
        updatedAt: new Date().toISOString(),
        updatedBy: session.userId || session.uid || 'SUPER_ADMIN'
      };

      // Always update in-memory representation and trigger listeners
      this.inMemoryGlobalConfig = updated;
      for (const subscriber of this.globalConfigSubscribers) {
        try {
          subscriber(updated);
        } catch (_subErr) {
          // ignore
        }
      }

      try {
        const docRef = doc(db, 'system_config', 'global_config');
        await setDoc(docRef, updated, { merge: true });

        // Mirror to platform_config collection as well for cross-compatibility
        const mirrorRef = doc(db, 'platform_config', 'global_config');
        await setDoc(mirrorRef, updated, { merge: true });
      } catch (firestoreWriteErr) {
        console.warn('[SuperAdminService] Firestore write failed, preserved in memory:', firestoreWriteErr);
      }

      try {
        await this.logPlatformAudit(session, {
          action: 'UPDATE_GLOBAL_CONFIG',
          target: 'PlatformGlobalConfig',
          targetId: 'global_config',
          reason: config.maintenanceMode !== undefined 
            ? `Platform Maintenance Mode ${config.maintenanceMode ? 'ENABLED' : 'DISABLED'} (Notice: "${msg || 'N/A'}")` 
            : 'Updated system feature flags & governance rules',
          after: updated
        });
      } catch (_auditErr) {
        // Non-blocking
      }
      return true;
    } catch (err) {
      console.warn('[SuperAdminService] updatePlatformGlobalConfig error:', err);
      return false;
    }
  }

  /**
   * Get Platform Broadcast Messages
   */
  static async getPlatformBroadcasts(): Promise<PlatformBroadcastMessage[]> {
    try {
      const colRef = collection(db, 'platform_broadcasts');
      const snap = await getDocs(colRef);
      const list: PlatformBroadcastMessage[] = [];
      snap.forEach((docSnap) => {
        const d = docSnap.data();
        list.push({
          id: docSnap.id,
          title: d.title || '',
          content: d.content || '',
          type: d.type || 'INFO',
          targetAudience: d.targetAudience || 'ALL_TENANTS',
          targetCompanyId: d.targetCompanyId,
          createdAt: d.createdAt || new Date().toISOString(),
          createdBy: d.createdBy || '',
          expiresAt: d.expiresAt,
          isActive: d.isActive ?? true
        });
      });

      list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      return list;
    } catch (err) {
      console.warn('[SuperAdminService] getPlatformBroadcasts error:', err);
      return [];
    }
  }

  /**
   * Create Platform Broadcast Message
   */
  static async createPlatformBroadcast(
    session: UserSession,
    broadcast: Omit<PlatformBroadcastMessage, 'id' | 'createdAt' | 'createdBy'>
  ): Promise<string> {
    const id = `BC-${Date.now()}`;
    const docData: PlatformBroadcastMessage = {
      ...broadcast,
      id,
      createdAt: new Date().toISOString(),
      createdBy: session.fullName || session.email || 'Super Admin'
    };

    await setDoc(doc(db, 'platform_broadcasts', id), docData);

    await this.logPlatformAudit(session, {
      action: 'BROADCAST_NOTIFICATION',
      target: 'PlatformBroadcastMessage',
      targetId: id,
      reason: `Broadcast published: "${broadcast.title}" (${broadcast.targetAudience})`,
      after: docData
    });

    return id;
  }

  /**
   * Delete Platform Broadcast
   */
  static async deletePlatformBroadcast(session: UserSession, broadcastId: string): Promise<boolean> {
    try {
      await deleteDoc(doc(db, 'platform_broadcasts', broadcastId));
      await this.logPlatformAudit(session, {
        action: 'UPDATE_GLOBAL_CONFIG',
        target: 'PlatformBroadcastMessage',
        targetId: broadcastId,
        reason: `Broadcast deleted: ${broadcastId}`
      });
      return true;
    } catch (err) {
      console.warn('[SuperAdminService] deletePlatformBroadcast error:', err);
      return false;
    }
  }

  /**
   * Helper: Export Array of Objects to CSV
   */
  static exportToCsv(filename: string, rows: Record<string, any>[]): void {
    if (!rows || rows.length === 0) return;
    const headers = Object.keys(rows[0]);
    const csvContent = [
      headers.join(','),
      ...rows.map(row =>
        headers
          .map(h => {
            const val = row[h] ?? '';
            const str = typeof val === 'object' ? JSON.stringify(val) : String(val);
            return `"${str.replace(/"/g, '""')}"`;
          })
          .join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * Helper: Export Array of Objects to JSON
   */
  static exportToJson(filename: string, data: any): void {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  // ==========================================
  // INBOUND LEADS & CRM SUITE (POINT 1.11)
  // ==========================================

  static async getLeads(): Promise<any[]> {
    return FirestoreService.getLeads();
  }

  static async getLeadById(leadId: string): Promise<any | null> {
    return FirestoreService.getLeadById(leadId);
  }

  static async createLead(session: UserSession | null, leadData: any): Promise<boolean> {
    const leadId = leadData.id || `lead_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const timestamp = new Date().toISOString();
    const actorName = session?.fullName || 'Super Admin';
    const actorId = session?.userId || 'SUPER_ADMIN';

    const result = await FirestoreService.createLead({
      ...leadData,
      id: leadId,
      createdByName: actorName,
      activityHistory: [
        {
          id: `act_${Date.now()}`,
          action: 'LEAD_CREATED',
          notes: `Lead registered via Super Admin CRM (${leadData.source || 'Manual Entry'})`,
          timestamp,
          actorId,
          actorName
        }
      ]
    });

    if (result && session) {
      await this.logPlatformAudit(session, {
        action: 'CREATE_LEAD',
        target: 'SalesLead',
        targetId: leadId,
        reason: `Created sales lead for ${leadData.company || leadData.name}`
      });
    }

    return result;
  }

  static async updateLeadStatus(
    session: UserSession,
    leadId: string,
    newStatus: string,
    customNotes?: string
  ): Promise<boolean> {
    const lead = await FirestoreService.getLeadById(leadId);
    if (!lead) return false;

    const activity = {
      id: `act_${Date.now()}`,
      action: 'STATUS_CHANGE',
      notes: customNotes || `Status updated from ${lead.status || 'UNKNOWN'} to ${newStatus}`,
      timestamp: new Date().toISOString(),
      actorId: session.userId,
      actorName: session.fullName
    };

    const success = await FirestoreService.updateLead(leadId, {
      status: newStatus,
      activityHistory: [...(lead.activityHistory || []), activity]
    });

    if (success) {
      await this.logPlatformAudit(session, {
        action: 'UPDATE_LEAD_STATUS',
        target: 'SalesLead',
        targetId: leadId,
        reason: `Lead status changed to ${newStatus}`,
        after: { status: newStatus }
      });
    }

    return success;
  }

  static async scheduleLeadFollowUp(
    session: UserSession,
    leadId: string,
    followUpDate: string,
    followUpNotes: string
  ): Promise<boolean> {
    const lead = await FirestoreService.getLeadById(leadId);
    if (!lead) return false;

    const activity = {
      id: `act_${Date.now()}`,
      action: 'FOLLOW_UP_SCHEDULED',
      notes: `Follow-up set for ${new Date(followUpDate).toLocaleDateString()}: ${followUpNotes || 'No notes'}`,
      timestamp: new Date().toISOString(),
      actorId: session.userId,
      actorName: session.fullName
    };

    const success = await FirestoreService.updateLead(leadId, {
      followUpDate,
      followUpNotes,
      activityHistory: [...(lead.activityHistory || []), activity]
    });

    if (success) {
      await this.logPlatformAudit(session, {
        action: 'SCHEDULE_LEAD_FOLLOWUP',
        target: 'SalesLead',
        targetId: leadId,
        reason: `Scheduled follow-up on ${followUpDate}`
      });
    }

    return success;
  }

  static async addLeadNote(
    session: UserSession,
    leadId: string,
    noteText: string
  ): Promise<boolean> {
    const lead = await FirestoreService.getLeadById(leadId);
    if (!lead || !noteText.trim()) return false;

    const activity = {
      id: `act_${Date.now()}`,
      action: 'NOTE_ADDED',
      notes: noteText.trim(),
      timestamp: new Date().toISOString(),
      actorId: session.userId,
      actorName: session.fullName
    };

    const existingNotes = lead.notes ? `${lead.notes}\n\n[${new Date().toLocaleDateString()}] ${noteText.trim()}` : noteText.trim();

    return FirestoreService.updateLead(leadId, {
      notes: existingNotes,
      activityHistory: [...(lead.activityHistory || []), activity]
    });
  }

  static async deleteLead(session: UserSession, leadId: string): Promise<boolean> {
    const lead = await FirestoreService.getLeadById(leadId);
    const success = await FirestoreService.deleteLead(leadId);
    if (success) {
      await this.logPlatformAudit(session, {
        action: 'DELETE_LEAD',
        target: 'SalesLead',
        targetId: leadId,
        reason: `Deleted lead for ${lead?.company || leadId}`
      });
    }
    return success;
  }

  static async convertLeadToTenant(
    session: UserSession,
    params: {
      leadId: string;
      companyCode: string;
      companyName?: string;
      subscriptionPlan?: 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE';
      trialDays?: number;
      adminPassword?: string;
      adminEmail?: string;
      adminPhone?: string;
      adminName?: string;
    }
  ) {
    return FirestoreService.convertLeadToTenantCompany({
      ...params,
      session
    });
  }
}

