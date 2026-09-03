// ============================================================================
// CLIENT BILLING & CONTRACT PROFITABILITY LAYER (MODULE 1 & 2)
// Parity with TrackTik, Silvertrac, Belfry, Novagems
// ============================================================================

export type ContractBillingCycle = 'MONTHLY' | 'BI_WEEKLY' | 'WEEKLY' | 'FORTNIGHTLY' | 'MILESTONE';
export type ContractStatus = 'DRAFT' | 'ACTIVE' | 'EXPIRED' | 'TERMINATED';
export type InvoiceStatus = 'DRAFT' | 'SENT' | 'PAID' | 'OVERDUE' | 'CANCELLED';
export type SlaBreachStatus = 'AUTO_DETECTED' | 'DISPUTED' | 'WAIVED' | 'CONFIRMED' | 'BILLED';

export interface SlaPenaltyClause {
  minGuardsRequiredPerShift: number;
  minGuardsPerSite?: Record<string, number>;
  responseDeadlineMinutes?: number;
  penaltyPerShortfallShift: number; // Penalty amount per missing guard shift (e.g. ₹1500)
  maxPenaltyCapPercent?: number; // e.g. 15% max penalty on gross invoice
}

export interface ClientContract {
  id: string;
  contractId: string;
  companyId: string;
  clientId: string;
  clientName: string;
  contractNumber: string; // e.g. SLA-2026-TATA-01
  title: string;
  siteIds: string[];
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  billingCycle: ContractBillingCycle;
  autoRenewal: boolean;
  status: ContractStatus;
  slaTerms: SlaPenaltyClause;
  paymentTermsDays: number;
  createdAt: number | string;
  updatedAt: number | string;
  createdByUserId?: string;
}

export interface RateCard {
  id: string;
  rateCardId: string;
  companyId: string;
  clientId: string;
  contractId: string;
  siteId?: string; // Optional: empty/null applies to all contract sites
  role: string; // e.g. 'GUARD', 'SUPERVISOR', 'ARMED_GUARD', 'PATROL_OFFICER'
  shiftType: 'DAY' | 'NIGHT' | 'ALL';
  ratePerShift: number; // e.g. ₹850 or $120
  ratePerHour: number;
  overtimeRatePerHour: number;
  effectiveFrom: string; // YYYY-MM-DD (versioned so historical billing stays immutable)
  version: number;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: number | string;
}

export interface InvoiceLineItem {
  lineItemId: string;
  description: string;
  siteId: string;
  siteName?: string;
  role: string;
  shiftType: string;
  units: number; // Shift count or total billable hours
  unitPrice: number;
  amount: number;
}

export interface InvoiceSlaPenaltyItem {
  breachId: string;
  siteId: string;
  siteName?: string;
  date: string;
  shift: string;
  contractedStrength: number;
  actualStrength: number;
  shortfall: number;
  penaltyAmount: number;
  reason: string;
}

export interface ClientInvoice {
  id: string;
  invoiceId: string;
  companyId: string;
  clientId: string;
  clientName: string;
  contractId: string;
  contractNumber: string;
  billingPeriodStart: string; // YYYY-MM-DD
  billingPeriodEnd: string; // YYYY-MM-DD
  issueDate: string;
  dueDate: string;
  lineItems: InvoiceLineItem[];
  grossAmount: number;
  slaPenalties: InvoiceSlaPenaltyItem[];
  totalPenaltyDeduction: number;
  taxRatePercent: number; // e.g. 18% GST
  taxAmount: number;
  netAmount: number;
  status: InvoiceStatus;
  idempotencyKey: string; // companyId_contractId_start_end
  createdAt: number | string;
  updatedAt: number | string;
  createdByUser?: string;
}

export interface SlaBreachRecord {
  id: string;
  breachId: string;
  companyId: string;
  clientId: string;
  contractId: string;
  contractNumber?: string;
  siteId: string;
  siteName?: string;
  shiftId?: string;
  shiftType: 'DAY' | 'NIGHT' | 'GENERAL';
  date: string; // YYYY-MM-DD
  contractedStrength: number;
  actualStrength: number;
  shortfall: number;
  penaltyAmount: number;
  status: SlaBreachStatus;
  resolvedInInvoiceId?: string;
  createdAt: number | string;
}

export interface ContractProfitabilitySummary {
  contractId: string;
  contractNumber: string;
  clientId: string;
  clientName: string;
  siteIds: string[];
  periodStart: string;
  periodEnd: string;
  totalBilledRevenue: number; // Net invoice revenue
  directWorkerCost: number; // Total guard wages + overtime wages paid for those shifts
  grossProfit: number; // Billed - Direct Cost
  profitMarginPercent: number; // (grossProfit / totalBilledRevenue) * 100
  slaPenaltyImpact: number;
  totalDeployedShifts: number;
  healthStatus: 'HEALTHY' | 'AT_RISK' | 'CRITICAL';
}

// Client Portal Claims & Session Contract (External Role - outside A0-A9)
export interface ClientUserClaims {
  cId: string; // Tenant company ID
  clientId: string; // Client ID
  siteIds: string[]; // Only contracted sites
  role: 'clientUser';
  email: string;
}
