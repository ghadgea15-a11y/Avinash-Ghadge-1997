const fs = require('fs');
let code = fs.readFileSync('src/services/subscriptionService.ts', 'utf8');

// Replace top-level collection names and implementations with the correct subcollections
code = code.replace(/const PLANS_COLLECTION = 'subscription_plans';/g, "const PLANS_COLLECTION = 'plans';");
code = code.replace(/const SUBSCRIPTIONS_COLLECTION = 'company_subscriptions';/g, "const SUBSCRIPTIONS_COLLECTION = 'subscriptions';");
code = code.replace(/const PAYMENTS_COLLECTION = 'payments';/g, "const PAYMENTS_COLLECTION = 'payments';");
code = code.replace(/const INVOICES_COLLECTION = 'invoices';/g, "const INVOICES_COLLECTION = 'invoices';");
code = code.replace(/const ENTITLEMENTS_COLLECTION = 'module_entitlements';/g, "const ENTITLEMENTS_COLLECTION = 'entitlements';");

// Rewrite getCompanySubscription to use the subcollection
code = code.replace(
  /static async getCompanySubscription\(companyId: string\): Promise<CompanySubscription \| null> \{[\s\S]*?\}/,
  `static async getCompanySubscription(companyId: string): Promise<CompanySubscription | null> {
    const q = query(collection(db, 'companies', companyId, SUBSCRIPTIONS_COLLECTION));
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;
    
    // Sort to get the most recent or active one
    const subs = snapshot.docs.map(doc => doc.data() as CompanySubscription);
    const activeSub = subs.find(s => ['ACTIVE', 'TRIAL', 'GRACE_PERIOD'].includes(s.status));
    return activeSub || subs[0];
  }`
);

// Rewrite processPaymentAndActivateSubscription
// It's already throwing an error in Phase 1 per the strict requirement, so we leave it as is.

// Rewrite getCompanyEntitlements to use the subcollection
code = code.replace(
  /static async getCompanyEntitlements\(companyId: string\): Promise<ModuleEntitlement\[\]> \{[\s\S]*?\}/,
  `static async getCompanyEntitlements(companyId: string): Promise<ModuleEntitlement[]> {
    const q = collection(db, 'companies', companyId, ENTITLEMENTS_COLLECTION);
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as ModuleEntitlement);
  }`
);

// Rewrite checkModuleAccess to use the subcollection
code = code.replace(
  /static async checkModuleAccess\(companyId: string, moduleId: string\): Promise<boolean> \{[\s\S]*?\}/,
  `static async checkModuleAccess(companyId: string, moduleId: string): Promise<boolean> {
    const docRef = doc(db, 'companies', companyId, ENTITLEMENTS_COLLECTION, moduleId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return false;
    const data = snap.data() as ModuleEntitlement;
    return data.enabled;
  }`
);

fs.writeFileSync('src/services/subscriptionService.ts', code);
