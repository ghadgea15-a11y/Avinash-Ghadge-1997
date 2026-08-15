const fs = require('fs');
let code = fs.readFileSync('src/types/index.ts', 'utf8');

const newTypes = `
// --- SaaS Subscription Models ---

export interface SubscriptionPlan {
  planId: string;
  planCode: string; // e.g. 'STARTER', 'PRO', 'ENTERPRISE'
  planName: string;
  description: string;
  status: 'ACTIVE' | 'ARCHIVED';
  billingCycle: 'MONTHLY' | 'YEARLY' | 'CUSTOM';
  monthlyPrice: number;
  yearlyPrice: number;
  currency: string;
  employeeLimit: number;
  userLimit: number; // Admin users
  storageLimitMB: number;
  enabledModules: string[];
  trialEligible: boolean;
  trialDays: number;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
}

export type SubscriptionStatus = 
  | 'TRIAL' 
  | 'ACTIVE' 
  | 'PAST_DUE' 
  | 'EXPIRING_SOON' 
  | 'GRACE_PERIOD' 
  | 'EXPIRED' 
  | 'SUSPENDED' 
  | 'CANCELLED';

export interface CompanySubscription {
  subscriptionId: string;
  companyId: string;
  planId: string;
  status: SubscriptionStatus;
  billingCycle: 'MONTHLY' | 'YEARLY' | 'CUSTOM';
  startDate: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  renewalDate: string;
  trialStart?: string;
  trialEnd?: string;
  autoRenew: boolean;
  cancelAtPeriodEnd: boolean;
  cancelledAt?: string;
  cancellationReason?: string;
  gracePeriodEnd?: string;
  employeeLimit: number;
  userLimit: number;
  storageLimitMB: number;
  source: 'SYSTEM' | 'STRIPE' | 'RAZORPAY' | 'MANUAL';
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
}

export type PaymentStatus = 'PENDING' | 'SUCCESS' | 'FAILED' | 'REFUNDED' | 'PARTIALLY_REFUNDED' | 'CANCELLED';

export interface PaymentRecord {
  paymentId: string;
  companyId: string;
  subscriptionId: string;
  amount: number;
  currency: string;
  provider: 'STRIPE' | 'RAZORPAY' | 'MANUAL';
  providerPaymentId?: string;
  providerOrderId?: string;
  status: PaymentStatus;
  paymentMethod?: string;
  paidAt?: string;
  failureReason?: string;
  invoiceId?: string;
  createdAt: string;
  metadata?: Record<string, any>;
}

export interface InvoiceRecord {
  invoiceId: string;
  companyId: string;
  subscriptionId: string;
  paymentId: string;
  invoiceNumber: string;
  amount: number;
  tax: number;
  subtotal: number;
  total: number;
  currency: string;
  issueDate: string;
  dueDate: string;
  status: 'DRAFT' | 'OPEN' | 'PAID' | 'VOID' | 'UNCOLLECTIBLE';
  billingDetails: {
    legalName: string;
    billingAddress: string;
    gstin?: string;
    billingEmail: string;
    contactName: string;
  };
}

export interface ModuleEntitlement {
  id: string; // "companyId_moduleId"
  companyId: string;
  moduleId: string;
  enabled: boolean;
  source: 'PLAN' | 'CUSTOM' | 'PROMOTIONAL' | 'MANUAL' | 'SYSTEM';
  planId?: string;
  subscriptionId?: string;
  validFrom: string;
  validUntil?: string;
  limit?: number; // E.g., for specific modules if they have limits
  featureFlags?: Record<string, boolean>;
  overriddenBySuperAdmin: boolean;
  overrideReason?: string;
  updatedAt: string;
}

export interface CompanyBillingProfile {
  companyId: string;
  legalName: string;
  billingAddress: string;
  gstin?: string;
  billingEmail: string;
  contactName: string;
  updatedAt: string;
}

// ---------------------------------
`;

if (!code.includes('export interface SubscriptionPlan')) {
  // Insert before CompanyTenant
  code = code.replace('export interface CompanyTenant {', newTypes + '\nexport interface CompanyTenant {');
  fs.writeFileSync('src/types/index.ts', code);
}
