/**
 * Log Sheet Muster - Complete Enterprise General Ledger & Financial Control Data Models
 * Covers:
 * 1. General Ledger & Chart of Accounts (Assets, Liabilities, Equity, Revenue, Expense)
 * 2. Multi-Level Cost Allocation & Cost Centers (Company -> Region -> Site -> Department)
 * 3. Budget Management & Variance Analytics (Commitments, Actuals, Encumbrances)
 * 4. Accounts Payable (AP - Bills, 3-Way Match, Vendor Aging) & Accounts Receivable (AR - Client Invoicing, Milestone Billing, DSO)
 * 5. Automated Payroll Journal Integration (Gross Salary, Employer PF/ESI, Net Pay, Statutory Liabilities)
 * 6. Bank & Payment Reconciliation (Rule Matching, Transaction Cleared Status)
 * 7. Revenue Recognition (ASC 606 / Ind AS 115) & Profitability Analysis (Client/Site Gross Margins, P&L Analytics, Cost-per-Employee)
 */

export type AccountCategory = 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';

export type AccountSubCategory = 
  // Assets
  | 'CASH_AND_BANK'
  | 'ACCOUNTS_RECEIVABLE'
  | 'PREPAID_EXPENSES'
  | 'FIXED_ASSETS'
  | 'INVENTORY_ASSET'
  // Liabilities
  | 'ACCOUNTS_PAYABLE'
  | 'STATUTORY_PAYABLE_PF'
  | 'STATUTORY_PAYABLE_ESI'
  | 'STATUTORY_PAYABLE_PT'
  | 'STATUTORY_PAYABLE_TDS'
  | 'SALARY_PAYABLE'
  | 'PROVISION_GRATUITY'
  | 'SHORT_TERM_BORROWINGS'
  // Equity
  | 'RETAINED_EARNINGS'
  | 'SHARE_CAPITAL'
  // Revenue
  | 'FACILITY_MANAGEMENT_REVENUE'
  | 'SECURITY_GUARDING_REVENUE'
  | 'MANPOWER_SUPPLY_REVENUE'
  | 'EXTRA_DUTY_OVERTIME_BILLING'
  | 'OTHER_INCOME'
  // Expense
  | 'DIRECT_WAGES_SALARY'
  | 'EMPLOYER_PF_EXPENSE'
  | 'EMPLOYER_ESI_EXPENSE'
  | 'GRATUITY_PROVISION_EXPENSE'
  | 'UNIFORM_KIT_EXPENSE'
  | 'SITE_OPERATING_EXPENSE'
  | 'ADMINISTRATIVE_EXPENSE'
  | 'TRAVEL_EXPENSE'
  | 'VENDOR_SERVICES_EXPENSE';

export interface ChartOfAccountRecord {
  id: string;
  companyId: string;
  accountCode: string; // e.g. "1010", "2050", "5010"
  accountName: string; // e.g. "Salary & Direct Wages", "Provident Fund Payable"
  category: AccountCategory;
  subCategory: AccountSubCategory;
  normalBalance: 'DEBIT' | 'CREDIT';
  isActive: boolean;
  isSystemAccount: boolean; // Cannot delete standard system accounts
  currentBalance: number;
  currency: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export type JournalSourceModule = 
  | 'PAYROLL'
  | 'CLIENT_BILLING'
  | 'VENDOR_INVOICE'
  | 'EXPENSE_REIMBURSEMENT'
  | 'MANUAL_JV'
  | 'BANK_RECONCILIATION'
  | 'DEPRECIATION';

export interface JournalEntryLineItem {
  id: string;
  accountId: string;
  accountCode: string;
  accountName: string;
  category: AccountCategory;
  type: 'DEBIT' | 'CREDIT';
  amount: number;
  costCenterId?: string; // Site ID / Department ID
  siteId?: string;
  regionId?: string;
  employeeId?: string; // for employee level traceability
  clientId?: string;   // for client profitability
  narration?: string;
}

export interface GeneralLedgerJournalVoucher {
  id: string;
  companyId: string;
  voucherNumber: string; // e.g. "JV-2026-09-PAY-001"
  voucherDate: string;   // ISO Date
  sourceModule: JournalSourceModule;
  referenceId: string;   // e.g. payrollCycleId, invoiceId, expenseClaimId
  referenceDocNumber?: string;
  narration: string;
  lineItems: JournalEntryLineItem[];
  totalDebit: number;
  totalCredit: number;
  isBalanced: boolean;
  status: 'DRAFT' | 'POSTED' | 'VOIDED';
  postedBy: string;
  postedByName: string;
  postedAt: string;
  approvedBy?: string;
  voidReason?: string;
  syncStatus?: 'PENDING_ERP_SYNC' | 'SYNCED_TALLY' | 'SYNCED_SAP' | 'NOT_SYNCED';
  erpReferenceNumber?: string;
  createdAt: string;
  updatedAt: string;
}

// -------------------------------------------------------------
// COST CENTERS & BUDGET MANAGEMENT
// -------------------------------------------------------------

export interface CostCenterRecord {
  id: string;
  companyId: string;
  code: string; // e.g. "CC-MUM-AIRPORT", "CC-HQ-HR"
  name: string;
  type: 'SITE' | 'DEPARTMENT' | 'REGION' | 'PROJECT';
  siteId?: string;
  departmentId?: string;
  regionId?: string;
  managerEmployeeId?: string;
  managerName?: string;
  allocatedBudget: number;
  committedSpend: number;
  actualSpend: number;
  variance: number; // allocated - (committed + actual)
  currency: string;
  isActive: boolean;
  fiscalYear: string;
}

export interface BudgetPlanRecord {
  id: string;
  companyId: string;
  fiscalYear: string; // "2026-2027"
  costCenterId: string;
  costCenterName: string;
  category: 'SALARY_WAGES' | 'OPERATIONS' | 'UNIFORM_EQUIPMENT' | 'TRAVEL' | 'OVERTIME' | 'MAINTENANCE';
  monthlyAllocations: Record<number, number>; // Month (1-12) -> Amount
  annualBudget: number;
  actualSpent: number;
  encumbranceCommitted: number;
  utilizationPercentage: number;
  status: 'DRAFT' | 'APPROVED' | 'ACTIVE' | 'CLOSED';
  approvedBy?: string;
  updatedAt: string;
}

// -------------------------------------------------------------
// CLIENT BILLING & REVENUE RECOGNITION (AR)
// -------------------------------------------------------------

export type InvoiceStatus = 'DRAFT' | 'SENT_TO_CLIENT' | 'PARTIALLY_PAID' | 'PAID' | 'DISPUTED' | 'CANCELLED';

export interface ClientInvoiceLineItem {
  id: string;
  serviceDescription: string;
  siteId: string;
  siteName: string;
  dutyType: 'REGULAR_GUARD' | 'HEAD_GUARD' | 'SUPERVISOR' | 'FACILITY_STAFF' | 'CONSUMABLES' | 'EXTRA_OT';
  mandaysBilled: number;
  ratePerMandayOrUnit: number;
  taxableAmount: number;
  gstRate: number; // 18% etc
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  totalAmount: number;
}

export interface ClientInvoiceRecord {
  id: string;
  companyId: string;
  invoiceNumber: string; // e.g. "INV-2026-09-0012"
  invoiceDate: string;
  dueDate: string;
  billingPeriodStart: string;
  billingPeriodEnd: string;
  clientId: string;
  clientName: string;
  clientGstin: string;
  clientBillingAddress: string;
  items: ClientInvoiceLineItem[];
  subTotalTaxable: number;
  totalGst: number;
  grandTotal: number;
  amountReceived: number;
  outstandingBalance: number;
  status: InvoiceStatus;
  paymentTermsDays: number;
  glVoucherId?: string; // Linked GL Journal Voucher
  revenueRecognizedDate?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// -------------------------------------------------------------
// BANK RECONCILIATION & PAYMENT RECON
// -------------------------------------------------------------

export interface BankTransactionFeed {
  id: string;
  companyId: string;
  bankAccountId: string;
  transactionDate: string;
  valueDate: string;
  description: string;
  referenceNo: string; // UTR, Cheque No, UPI Ref
  type: 'DEPOSIT' | 'WITHDRAWAL';
  amount: number;
  reconciliationStatus: 'UNMATCHED' | 'MATCHED' | 'AUTO_RECONCILED' | 'DISCREPANCY';
  matchedVoucherId?: string;
  matchedLineItemId?: string;
  reconciledAt?: string;
  reconciledBy?: string;
}

// -------------------------------------------------------------
// SITE & CLIENT PROFITABILITY ANALYTICS
// -------------------------------------------------------------

export interface SiteProfitabilityStatement {
  siteId: string;
  siteName: string;
  clientId: string;
  clientName: string;
  regionId: string;
  month: number;
  year: number;
  headcount: number;
  billedRevenue: number;
  directSalaryCost: number;
  statutoryPfEsiCost: number;
  uniformEquipmentCost: number;
  siteTravelOpsCost: number;
  totalDirectCost: number;
  grossMarginAmount: number;
  grossMarginPercentage: number;
  costPerEmployee: number;
  costPerManday: number;
}
