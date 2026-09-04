import { collection, doc, getDoc, getDocs, query, where, setDoc, updateDoc, writeBatch, serverTimestamp, runTransaction } from 'firebase/firestore';
import { db } from '../firebase';
import { FirestoreService } from './firestoreService';
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

  static async saveSubscriptionPlan(plan: Partial<SubscriptionPlan> & { planId?: string; id?: string }): Promise<void> {
    const planId = plan.planId || plan.id || `PLAN_${Date.now()}`;
    const docRef = doc(db, PLANS_COLLECTION, planId);
    const fullPlan: SubscriptionPlan = {
      planId,
      id: planId,
      planCode: plan.planCode || planId,
      planName: plan.planName || plan.name || 'Custom Plan',
      name: plan.name || plan.planName || 'Custom Plan',
      description: plan.description || '',
      status: plan.status || 'ACTIVE',
      billingCycle: plan.billingCycle || 'MONTHLY',
      monthlyPrice: Number(plan.monthlyPrice) || 0,
      yearlyPrice: Number(plan.yearlyPrice) || 0,
      currency: plan.currency || 'INR',
      employeeLimit: Number(plan.employeeLimit) || 100,
      userLimit: Number(plan.userLimit) || 5,
      storageLimitMB: Number(plan.storageLimitMB) || 2048,
      enabledModules: plan.enabledModules || ['EMPLOYEES', 'ATTENDANCE'],
      trialEligible: plan.trialEligible ?? true,
      trialDays: Number(plan.trialDays) || 14,
      createdAt: plan.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...plan
    };
    await setDoc(docRef, fullPlan, { merge: true });
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
    FirestoreService.logAuditEvent(companyId, updatedByUid, 'System', 'SUBSCRIPTION_ASSIGNED', `Plan ${planId} assigned to company`, subId);

    // 2. Update Company Tenant tier & employee/site quotas
    const companyRef = doc(db, 'companies', companyId);
    const tier = plan.planCode === 'STARTER' ? 'STARTER' : plan.planCode === 'PRO' ? 'PROFESSIONAL' : 'ENTERPRISE';
    await updateDoc(companyRef, {
      licenseTier: tier,
      maxEmployeesAllowed: plan.employeeLimit,
      maxSitesAllowed: tier === 'STARTER' ? 5 : tier === 'PROFESSIONAL' ? 25 : 100,
      enabledModules: plan.enabledModules || [],
      updatedAt: timestamp
    });

    // 3. Synchronize Entitlements
    await this.syncEntitlementsForPlan(companyId, plan.planId, subId, plan.enabledModules || []);

    return newSub;
  }

  /**
   * Calculates the unused value (credit) of the current subscription
   */
  static calculateProratedCredit(currentSub: CompanySubscription, currentPlan: SubscriptionPlan): number {
    const now = new Date();
    const start = new Date(currentSub.currentPeriodStart);
    const end = new Date(currentSub.currentPeriodEnd);
    
    // Safety check: if period not started or already ended
    if (now < start) return currentSub.lastPaymentAmount || 0;
    if (now >= end) return 0;

    const totalDuration = end.getTime() - start.getTime();
    const remainingDuration = end.getTime() - now.getTime();
    
    if (totalDuration <= 0) return 0;

    const lastAmount = currentSub.lastPaymentAmount || (currentSub.billingCycle === 'YEARLY' ? currentPlan.yearlyPrice : currentPlan.monthlyPrice) || 0;
    const proratedCredit = (lastAmount * remainingDuration) / totalDuration;

    return Math.floor(proratedCredit * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Upgrades or Downgrades a subscription with pro-rated credit application
   */
  static async upgradeDowngradeSubscription(
    companyId: string,
    newPlanId: string,
    newBillingCycle: 'MONTHLY' | 'YEARLY',
    actorUid: string
  ): Promise<CompanySubscription> {
    const timestamp = new Date().toISOString();
    
    return await runTransaction(db, async (transaction) => {
      // 1. Get current state
      const currentSub = await this.getCompanySubscription(companyId);
      const newPlan = await this.getPlan(newPlanId);

      if (!newPlan) throw new Error("Target plan not found.");

      let credit = 0;
      if (currentSub && currentSub.status === 'ACTIVE') {
        const currentPlan = await this.getPlan(currentSub.planId);
        if (currentPlan) {
          credit = this.calculateProratedCredit(currentSub, currentPlan);
        }
      }

      // 2. Prepare new subscription
      const subId = `SUB-${companyId}-${Date.now().toString().slice(-4)}`;
      const durationMs = newBillingCycle === 'YEARLY' ? 365 * 24 * 60 * 60 * 1000 : 30 * 24 * 60 * 60 * 1000;
      const endPeriod = new Date(Date.now() + durationMs).toISOString();
      const newPrice = newBillingCycle === 'YEARLY' ? newPlan.yearlyPrice : newPlan.monthlyPrice;

      const newSub: CompanySubscription = {
        subscriptionId: subId,
        companyId: companyId,
        planId: newPlan.planId,
        status: 'ACTIVE',
        billingCycle: newBillingCycle,
        startDate: currentSub?.startDate || timestamp,
        currentPeriodStart: timestamp,
        currentPeriodEnd: endPeriod,
        renewalDate: endPeriod,
        autoRenew: true,
        cancelAtPeriodEnd: false,
        employeeLimit: newPlan.employeeLimit,
        userLimit: newPlan.userLimit,
        storageLimitMB: newPlan.storageLimitMB,
        source: 'SYSTEM',
        proratedCredit: credit,
        nextBillingAmount: Math.max(0, (newPrice || 0) - credit),
        createdAt: timestamp,
        updatedAt: timestamp,
        createdBy: actorUid,
        updatedBy: actorUid
      };

      // 3. Persist new subscription
      const subRef = doc(db, 'companies', companyId, SUBSCRIPTIONS_COLLECTION, subId);
      transaction.set(subRef, newSub);

      // 4. Update Company Tenant
      const companyRef = doc(db, 'companies', companyId);
      const tier = newPlan.planCode === 'STARTER' ? 'STARTER' : newPlan.planCode === 'PRO' ? 'PROFESSIONAL' : 'ENTERPRISE';
      transaction.update(companyRef, {
        licenseTier: tier,
        maxEmployeesAllowed: newPlan.employeeLimit,
        maxSitesAllowed: tier === 'STARTER' ? 5 : tier === 'PROFESSIONAL' ? 25 : 100,
        enabledModules: newPlan.enabledModules,
        updatedAt: timestamp
      });

      // 5. Entitlements (Async, but outside transaction if needed - here we do it after)
      // Note: We cannot easily do collection writes in transactions if we don't know the IDs.
      // But we can use writeBatch for entitlements later or just use the subscription update as authoritative.
      
      return newSub;
    }).then(async (newSub) => {
      // Sync entitlements after transaction success
      await this.syncEntitlementsForPlan(companyId, newPlanId, newSub.subscriptionId, (await this.getPlan(newPlanId))?.enabledModules || []);
      
      FirestoreService.logAuditEvent(companyId, actorUid, 'System', 'SUBSCRIPTION_UPGRADED', 
        `Subscription changed to ${newPlanId}. Applied credit: ${newSub.proratedCredit}`, newSub.subscriptionId);
      
      return newSub;
    });
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
    enabledModules: string[] = []
  ): Promise<void> {
    const timestamp = new Date().toISOString();
    for (const modKey of (enabledModules || [])) {
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
