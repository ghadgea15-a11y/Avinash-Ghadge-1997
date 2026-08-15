import { collection, doc, getDoc, getDocs, query, where, setDoc, updateDoc, writeBatch, serverTimestamp, runTransaction } from 'firebase/firestore';
import { db } from '../firebase';
import { 
  SubscriptionPlan, 
  CompanySubscription, 
  PaymentRecord, 
  InvoiceRecord,
  ModuleEntitlement,
  AuditLogRecord
} from '../types';

const PLANS_COLLECTION = 'plans';
const SUBSCRIPTIONS_COLLECTION = 'subscriptions';
const PAYMENTS_COLLECTION = 'payments';
const INVOICES_COLLECTION = 'invoices';
const ENTITLEMENTS_COLLECTION = 'entitlements';
const AUDIT_COLLECTION = 'audit_logs';

export class SubscriptionService {

  // ================= USAGE LIMITS ================= //

  static async getEmployeeLimit(companyId: string): Promise<number> {
    try {
      const sub = await this.getCompanySubscription(companyId);
      if (!sub) return 0;
      
      const plan = await this.getPlan(sub.planId);
      if (!plan) return 0;

      return plan.employeeLimit || 0;
    } catch (error) {
      console.error("Error fetching employee limit:", error);
      return 0;
    }
  }

  static async checkEmployeeLimitReached(companyId: string, currentEmployeeCount: number): Promise<boolean> {
    const limit = await this.getEmployeeLimit(companyId);
    return currentEmployeeCount >= limit;
  }

  
  // ================= PLANS ================= //

  static async getPlans(): Promise<SubscriptionPlan[]> {
    const q = query(collection(db, PLANS_COLLECTION), where('status', '==', 'ACTIVE'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as SubscriptionPlan);
  }

  static async getAllPlans(): Promise<SubscriptionPlan[]> {
    const snapshot = await getDocs(collection(db, PLANS_COLLECTION));
    return snapshot.docs.map(doc => doc.data() as SubscriptionPlan);
  }

  static async getPlan(planId: string): Promise<SubscriptionPlan | null> {
    const docRef = doc(db, PLANS_COLLECTION, planId);
    const snap = await getDoc(docRef);
    return snap.exists() ? (snap.data() as SubscriptionPlan) : null;
  }

  static async createPlan(plan: SubscriptionPlan): Promise<void> {
    const docRef = doc(db, PLANS_COLLECTION, plan.planId);
    await setDoc(docRef, plan);
  }

  static async updatePlan(planId: string, updates: Partial<SubscriptionPlan>): Promise<void> {
    const docRef = doc(db, PLANS_COLLECTION, planId);
    await updateDoc(docRef, updates);
  }

  // ================= COMPANY SUBSCRIPTION ================= //

  static async getAllCompanySubscriptions(companies: { companyId: string; brandName: string }[]): Promise<{ companyId: string; companyName: string; subscription: CompanySubscription | null }[]> {
    try {
      const results = await Promise.all(
        companies.map(async (comp) => {
          const sub = await this.getCompanySubscription(comp.companyId);
          return {
            companyId: comp.companyId,
            companyName: comp.brandName,
            subscription: sub
          };
        })
      );
      return results;
    } catch (err) {
      console.warn('[SubscriptionService] getAllCompanySubscriptions error:', err);
      return [];
    }
  }

  static async getCompanySubscription(companyId: string): Promise<CompanySubscription | null> {
    const q = query(collection(db, 'companies', companyId, SUBSCRIPTIONS_COLLECTION));
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;
    
    // Sort to get the most recent or active one
    const subs = snapshot.docs.map(doc => doc.data() as CompanySubscription);
    const activeSub = subs.find(s => ['ACTIVE', 'TRIAL', 'GRACE_PERIOD'].includes(s.status));
    return activeSub || subs[0];
  }

  static async saveCompanySubscription(companyId: string, subscription: CompanySubscription): Promise<void> {
    const docRef = doc(db, 'companies', companyId, SUBSCRIPTIONS_COLLECTION, subscription.subscriptionId);
    await setDoc(docRef, subscription, { merge: true });
  }

  static async assignPlanToCompany(
    companyId: string, 
    planId: string, 
    billingCycle: 'MONTHLY' | 'YEARLY' = 'MONTHLY',
    durationMonths: number = 12,
    updatedByUid: string
  ): Promise<CompanySubscription> {
    const plan = await this.getPlan(planId);
    if (!plan) {
      throw new Error(`Plan with ID ${planId} not found.`);
    }

    const timestamp = new Date().toISOString();
    const subId = `SUB-${companyId}-${Date.now().toString().slice(-4)}`;
    const endPeriod = new Date(Date.now() + durationMonths * 30 * 24 * 60 * 60 * 1000).toISOString();

    const newSub: CompanySubscription = {
      subscriptionId: subId,
      companyId: companyId,
      planId: plan.planId,
      status: 'ACTIVE',
      billingCycle: billingCycle,
      startDate: timestamp,
      currentPeriodStart: timestamp,
      currentPeriodEnd: endPeriod,
      renewalDate: endPeriod,
      autoRenew: true,
      cancelAtPeriodEnd: false,
      employeeLimit: plan.employeeLimit,
      userLimit: plan.userLimit,
      storageLimitMB: plan.storageLimitMB,
      source: 'MANUAL',
      createdAt: timestamp,
      updatedAt: timestamp,
      createdBy: updatedByUid,
      updatedBy: updatedByUid
    };

    // 1. Save Subscription Record
    await this.saveCompanySubscription(companyId, newSub);

    // 2. Update Company Tenant tier & employee/site quotas
    const companyRef = doc(db, 'companies', companyId);
    const tier = plan.planCode === 'STARTER' ? 'STARTER' : plan.planCode === 'PRO' ? 'PROFESSIONAL' : 'ENTERPRISE';
    await updateDoc(companyRef, {
      licenseTier: tier,
      maxEmployeesAllowed: plan.employeeLimit,
      maxSitesAllowed: tier === 'STARTER' ? 5 : tier === 'PROFESSIONAL' ? 25 : 100,
      enabledModules: plan.enabledModules,
      updatedAt: timestamp
    });

    // 3. Synchronize Entitlements
    await this.syncEntitlementsForPlan(companyId, plan.planId, subId, plan.enabledModules);

    return newSub;
  }

  static async updateCompanySubscriptionStatus(
    companyId: string,
    subscriptionId: string,
    status: 'ACTIVE' | 'TRIAL' | 'PAST_DUE' | 'CANCELED' | 'EXPIRED' | 'GRACE_PERIOD',
    endIsoDate?: string
  ): Promise<void> {
    const subRef = doc(db, 'companies', companyId, SUBSCRIPTIONS_COLLECTION, subscriptionId);
    const updates: Record<string, any> = {
      status,
      updatedAt: new Date().toISOString()
    };
    if (endIsoDate) {
      updates.currentPeriodEnd = endIsoDate;
    }
    await updateDoc(subRef, updates);
  }

  static async syncEntitlementsForPlan(
    companyId: string, 
    planId: string, 
    subscriptionId: string, 
    enabledModules: string[]
  ): Promise<void> {
    const timestamp = new Date().toISOString();
    for (const modKey of enabledModules) {
      const entId = `${companyId}_${modKey}`;
      const entRef = doc(db, 'companies', companyId, ENTITLEMENTS_COLLECTION, entId);
      const entitlement: ModuleEntitlement = {
        id: entId,
        companyId: companyId,
        moduleId: modKey,
        enabled: true,
        source: 'PLAN',
        planId: planId,
        subscriptionId: subscriptionId,
        validFrom: timestamp,
        overriddenBySuperAdmin: false,
        updatedAt: timestamp
      };
      await setDoc(entRef, entitlement, { merge: true });
    }
  }

  // Uses a transaction to ensure no partial updates for payment -> subscription -> entitlement
  static async processPaymentAndActivateSubscription(
    companyId: string,
    planId: string,
    paymentAmount: number,
    paymentMethod: string,
    actorUid: string
  ): Promise<void> {
    // STRICT PRODUCTION RULE ENFORCED:
    // No client-side fake payment verification allowed.
    // This action MUST be performed by a secure backend Webhook (e.g. Firebase Cloud Functions)
    // after verifying the payment gateway signature.
    throw new Error("SECURITY EXCEPTION: Payment processing and subscription activation must be handled by secure server-side webhooks. Client-side execution is blocked.");
  }

  // ================= ENTITLEMENTS ================= //

  static async getCompanyEntitlements(companyId: string): Promise<ModuleEntitlement[]> {
    const q = collection(db, 'companies', companyId, ENTITLEMENTS_COLLECTION);
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as ModuleEntitlement);
  }

  static async checkModuleAccess(companyId: string, moduleId: string): Promise<boolean> {
    const docRef = doc(db, 'companies', companyId, ENTITLEMENTS_COLLECTION, moduleId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return false;
    const data = snap.data() as ModuleEntitlement;
    return data.enabled;
  }
}
