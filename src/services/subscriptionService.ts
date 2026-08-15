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

  static async getCompanySubscription(companyId: string): Promise<CompanySubscription | null> {
    const q = query(collection(db, 'companies', companyId, SUBSCRIPTIONS_COLLECTION));
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;
    
    // Sort to get the most recent or active one
    const subs = snapshot.docs.map(doc => doc.data() as CompanySubscription);
    const activeSub = subs.find(s => ['ACTIVE', 'TRIAL', 'GRACE_PERIOD'].includes(s.status));
    return activeSub || subs[0];
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
