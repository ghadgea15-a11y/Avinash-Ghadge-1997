import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  query,
  where,
  runTransaction
} from 'firebase/firestore';
import { db } from '../firebase';
import {
  ChartOfAccountRecord,
  GeneralLedgerJournalVoucher,
  CostCenterRecord,
  BudgetPlanRecord,
  ClientInvoiceRecord,
  BankTransactionFeed,
  SiteProfitabilityStatement,
  JournalEntryLineItem
} from '../types/financeLedger';
import { PayrollCycleRecord, PayrollRecord } from '../types';
import { AuditTrailService } from './auditTrailService';

export class GeneralLedgerService {
  // --------------------------------------------------------------------------
  // 1. STANDARD DEFAULT CHART OF ACCOUNTS INITIALIZER
  // --------------------------------------------------------------------------
  static async initializeDefaultChartOfAccounts(companyId: string, actor: { uid: string; name: string }): Promise<void> {
    const coaCol = collection(db, 'companies', companyId, 'chartOfAccounts');
    const existing = await getDocs(coaCol);
    if (!existing.empty) return; // already initialized

    const defaultAccounts: Omit<ChartOfAccountRecord, 'id' | 'companyId' | 'createdAt' | 'updatedAt'>[] = [
      // Assets (1000 - 1999)
      { accountCode: '1010', accountName: 'Main Operating Bank Account (HDFC/ICICI)', category: 'ASSET', subCategory: 'CASH_AND_BANK', normalBalance: 'DEBIT', isActive: true, isSystemAccount: true, currentBalance: 25000000, currency: 'INR', description: 'Primary clearing account for client receipts and payroll disbursement' },
      { accountCode: '1020', accountName: 'Petty Cash - Site Imprest Fund', category: 'ASSET', subCategory: 'CASH_AND_BANK', normalBalance: 'DEBIT', isActive: true, isSystemAccount: true, currentBalance: 500000, currency: 'INR', description: 'Site emergency operational float' },
      { accountCode: '1200', accountName: 'Trade Accounts Receivable (Client Invoices)', category: 'ASSET', subCategory: 'ACCOUNTS_RECEIVABLE', normalBalance: 'DEBIT', isActive: true, isSystemAccount: true, currentBalance: 48000000, currency: 'INR', description: 'Billed client contract receivables' },
      { accountCode: '1300', accountName: 'Security Uniform & Kit Inventory Asset', category: 'ASSET', subCategory: 'INVENTORY_ASSET', normalBalance: 'DEBIT', isActive: true, isSystemAccount: true, currentBalance: 3200000, currency: 'INR', description: 'Stock held for uniforms, torches, batons, boots' },

      // Liabilities (2000 - 2999)
      { accountCode: '2010', accountName: 'Trade Accounts Payable (Vendor & Suppliers)', category: 'LIABILITY', subCategory: 'ACCOUNTS_PAYABLE', normalBalance: 'CREDIT', isActive: true, isSystemAccount: true, currentBalance: 12400000, currency: 'INR', description: 'Vendor invoices due for procurement and subcontracting' },
      { accountCode: '2110', accountName: 'Net Salary & Wages Payable', category: 'LIABILITY', subCategory: 'SALARY_PAYABLE', normalBalance: 'CREDIT', isActive: true, isSystemAccount: true, currentBalance: 0, currency: 'INR', description: 'Net payroll bank disbursement pending transfer' },
      { accountCode: '2120', accountName: 'Provident Fund (PF) Payable (Employer + Employee 24%)', category: 'LIABILITY', subCategory: 'STATUTORY_PAYABLE_PF', normalBalance: 'CREDIT', isActive: true, isSystemAccount: true, currentBalance: 0, currency: 'INR', description: 'EPFO statutory challan dues' },
      { accountCode: '2130', accountName: 'ESIC Contribution Payable (Employer 3.25% + Employee 0.75%)', category: 'LIABILITY', subCategory: 'STATUTORY_PAYABLE_ESI', normalBalance: 'CREDIT', isActive: true, isSystemAccount: true, currentBalance: 0, currency: 'INR', description: 'ESIC statutory monthly remittance' },
      { accountCode: '2140', accountName: 'Professional Tax (PT) Payable', category: 'LIABILITY', subCategory: 'STATUTORY_PAYABLE_PT', normalBalance: 'CREDIT', isActive: true, isSystemAccount: true, currentBalance: 0, currency: 'INR', description: 'State government professional tax liability' },
      { accountCode: '2150', accountName: 'TDS Payable (Sec 192/194C/194J)', category: 'LIABILITY', subCategory: 'STATUTORY_PAYABLE_TDS', normalBalance: 'CREDIT', isActive: true, isSystemAccount: true, currentBalance: 0, currency: 'INR', description: 'Income tax withheld from salary and contractor payments' },
      { accountCode: '2200', accountName: 'Provision for Employee Gratuity', category: 'LIABILITY', subCategory: 'PROVISION_GRATUITY', normalBalance: 'CREDIT', isActive: true, isSystemAccount: true, currentBalance: 8500000, currency: 'INR', description: 'Long term statutory gratuity obligation' },

      // Revenue (4000 - 4999)
      { accountCode: '4010', accountName: 'Security Guarding & Patrol Revenue', category: 'REVENUE', subCategory: 'SECURITY_GUARDING_REVENUE', normalBalance: 'CREDIT', isActive: true, isSystemAccount: true, currentBalance: 82000000, currency: 'INR', description: 'Billed monthly guarding mandays and patrol services' },
      { accountCode: '4020', accountName: 'Integrated Facility Management Revenue', category: 'REVENUE', subCategory: 'FACILITY_MANAGEMENT_REVENUE', normalBalance: 'CREDIT', isActive: true, isSystemAccount: true, currentBalance: 34000000, currency: 'INR', description: 'Housekeeping, MEP, and sanitization services' },
      { accountCode: '4030', accountName: 'Extra Duty & Overtime Client Billing', category: 'REVENUE', subCategory: 'EXTRA_DUTY_OVERTIME_BILLING', normalBalance: 'CREDIT', isActive: true, isSystemAccount: true, currentBalance: 7500000, currency: 'INR', description: 'Event security and ad-hoc client deployments' },

      // Direct Expenses (5000 - 5999)
      { accountCode: '5010', accountName: 'Direct Workforce Salaries & Wages', category: 'EXPENSE', subCategory: 'DIRECT_WAGES_SALARY', normalBalance: 'DEBIT', isActive: true, isSystemAccount: true, currentBalance: 61000000, currency: 'INR', description: 'Gross basic and allowances for guards, supervisors, facility staff' },
      { accountCode: '5020', accountName: 'Employer Provident Fund (PF) Contribution Expense (12%)', category: 'EXPENSE', subCategory: 'EMPLOYER_PF_EXPENSE', normalBalance: 'DEBIT', isActive: true, isSystemAccount: true, currentBalance: 7320000, currency: 'INR', description: 'Company share of 12% PF contribution' },
      { accountCode: '5030', accountName: 'Employer ESIC Contribution Expense (3.25%)', category: 'EXPENSE', subCategory: 'EMPLOYER_ESI_EXPENSE', normalBalance: 'DEBIT', isActive: true, isSystemAccount: true, currentBalance: 1982500, currency: 'INR', description: 'Company share of 3.25% ESI contribution' },
      { accountCode: '5040', accountName: 'Gratuity Provision Cost (4.81% Basic)', category: 'EXPENSE', subCategory: 'GRATUITY_PROVISION_EXPENSE', normalBalance: 'DEBIT', isActive: true, isSystemAccount: true, currentBalance: 1467000, currency: 'INR', description: 'Actuarial monthly gratuity provision expense' },
      { accountCode: '5050', accountName: 'Site Uniforms & Protective Gear Cost', category: 'EXPENSE', subCategory: 'UNIFORM_KIT_EXPENSE', normalBalance: 'DEBIT', isActive: true, isSystemAccount: true, currentBalance: 2100000, currency: 'INR', description: 'Issued uniform kits expensed to sites' },
      { accountCode: '5060', accountName: 'Site Operational Travel & Patrol Vehicle Fuel', category: 'EXPENSE', subCategory: 'SITE_OPERATING_EXPENSE', normalBalance: 'DEBIT', isActive: true, isSystemAccount: true, currentBalance: 1850000, currency: 'INR', description: 'Site field officer fuel and patrol vehicles' },
    ];

    const now = new Date().toISOString();
    for (const acc of defaultAccounts) {
      const newDoc = doc(coaCol);
      await setDoc(newDoc, {
        ...acc,
        id: newDoc.id,
        companyId,
        createdAt: now,
        updatedAt: now
      });
    }

    await AuditTrailService.logEvent({
      companyId,
      actorId: actor.uid,
      actorName: actor.name,
      actorRole: 'FINANCE_ADMIN',
      module: 'FINANCE',
      action: 'INITIALIZE_CHART_OF_ACCOUNTS',
      entity: 'ChartOfAccounts',
      entityId: 'SYSTEM',
      description: 'Standard enterprise Chart of Accounts initialized with 16 dual-entry ledger accounts'
    });
  }

  // --------------------------------------------------------------------------
  // 2. GET CHART OF ACCOUNTS
  // --------------------------------------------------------------------------
  static async getChartOfAccounts(companyId: string): Promise<ChartOfAccountRecord[]> {
    try {
      const snap = await getDocs(collection(db, 'companies', companyId, 'chartOfAccounts'));
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as ChartOfAccountRecord));
    } catch (e) {
      console.error('Error getting chart of accounts:', e);
      return [];
    }
  }

  // --------------------------------------------------------------------------
  // 3. GENERATE & POST AUTOMATED PAYROLL JOURNAL VOUCHER (JV)
  // --------------------------------------------------------------------------
  static async generatePayrollJournalVoucher(
    companyId: string,
    cycle: PayrollCycleRecord,
    payrollRecords: PayrollRecord[],
    actor: { uid: string; name: string; role: string }
  ): Promise<GeneralLedgerJournalVoucher> {
    const coaList = await this.getChartOfAccounts(companyId);
    
    // Find or fallback accounts
    const getAccount = (subCat: string, defaultCode: string, defaultName: string) => {
      const found = coaList.find(a => a.subCategory === subCat);
      return {
        id: found?.id || `ACC-${defaultCode}`,
        code: found?.accountCode || defaultCode,
        name: found?.accountName || defaultName,
        category: found?.category || 'EXPENSE'
      };
    };

    const wagesAcc = getAccount('DIRECT_WAGES_SALARY', '5010', 'Direct Workforce Salaries & Wages');
    const pfExpAcc = getAccount('EMPLOYER_PF_EXPENSE', '5020', 'Employer Provident Fund (PF) Contribution Expense (12%)');
    const esiExpAcc = getAccount('EMPLOYER_ESI_EXPENSE', '5030', 'Employer ESIC Contribution Expense (3.25%)');
    const gratuityExpAcc = getAccount('GRATUITY_PROVISION_EXPENSE', '5040', 'Gratuity Provision Cost (4.81% Basic)');

    const netSalaryPayableAcc = getAccount('SALARY_PAYABLE', '2110', 'Net Salary & Wages Payable');
    const pfPayableAcc = getAccount('STATUTORY_PAYABLE_PF', '2120', 'Provident Fund (PF) Payable (Employer + Employee 24%)');
    const esiPayableAcc = getAccount('STATUTORY_PAYABLE_ESI', '2130', 'ESIC Contribution Payable (Employer 3.25% + Employee 0.75%)');
    const ptPayableAcc = getAccount('STATUTORY_PAYABLE_PT', '2140', 'Professional Tax (PT) Payable');
    const tdsPayableAcc = getAccount('STATUTORY_PAYABLE_TDS', '2150', 'TDS Payable (Sec 192)');
    const gratuityPayableAcc = getAccount('PROVISION_GRATUITY', '2200', 'Provision for Employee Gratuity');

    // Aggregate values
    let totalGrossPay = 0;
    let totalNetPay = 0;
    let totalEmployeePf = 0;
    let totalEmployerPf = 0;
    let totalEmployeeEsi = 0;
    let totalEmployerEsi = 0;
    let totalPt = 0;
    let totalTds = 0;
    let totalGratuityProvision = 0;

    payrollRecords.forEach(r => {
      totalGrossPay += (r.grossPay || 0);
      totalNetPay += (r.netPay || 0);
      totalEmployeePf += (r.statutoryPf || 0);
      totalEmployerPf += (r.employerPf || r.statutoryPf || 0);
      totalEmployeeEsi += (r.statutoryEsi || 0);
      totalEmployerEsi += (r.employerEsi || (r.grossPay <= 21000 ? Math.round(r.grossPay * 0.0325) : 0));
      totalPt += (r.statutoryPt || 0);
      totalTds += (r.statutoryTds || 0);
      // Gratuity 4.81% of Basic
      const basicPay = (r.breakdown?.basicPay || r.grossPay * 0.5);
      totalGratuityProvision += Math.round(basicPay * 0.0481);
    });

    const totalPfStatutoryLiability = totalEmployeePf + totalEmployerPf;
    const totalEsiStatutoryLiability = totalEmployeeEsi + totalEmployerEsi;

    const lineItems: JournalEntryLineItem[] = [
      // 1. DEBIT - Direct Salaries (Gross)
      {
        id: 'L1',
        accountId: wagesAcc.id,
        accountCode: wagesAcc.code,
        accountName: wagesAcc.name,
        category: 'EXPENSE',
        type: 'DEBIT',
        amount: Math.round(totalGrossPay),
        narration: `Direct salary expenses for period ${cycle.month}/${cycle.year} across ${payrollRecords.length} employees`
      },
      // 2. DEBIT - Employer PF
      {
        id: 'L2',
        accountId: pfExpAcc.id,
        accountCode: pfExpAcc.code,
        accountName: pfExpAcc.name,
        category: 'EXPENSE',
        type: 'DEBIT',
        amount: Math.round(totalEmployerPf),
        narration: `Employer statutory PF contribution @ 12% for ${cycle.month}/${cycle.year}`
      },
      // 3. DEBIT - Employer ESI
      {
        id: 'L3',
        accountId: esiExpAcc.id,
        accountCode: esiExpAcc.code,
        accountName: esiExpAcc.name,
        category: 'EXPENSE',
        type: 'DEBIT',
        amount: Math.round(totalEmployerEsi),
        narration: `Employer statutory ESI contribution @ 3.25% for ${cycle.month}/${cycle.year}`
      },
      // 4. DEBIT - Gratuity Provision Expense
      {
        id: 'L4',
        accountId: gratuityExpAcc.id,
        accountCode: gratuityExpAcc.code,
        accountName: gratuityExpAcc.name,
        category: 'EXPENSE',
        type: 'DEBIT',
        amount: Math.round(totalGratuityProvision),
        narration: `Monthly actuarial gratuity accrual provision @ 4.81% of Basic`
      },

      // 5. CREDIT - Net Salary Bank Disbursement
      {
        id: 'L5',
        accountId: netSalaryPayableAcc.id,
        accountCode: netSalaryPayableAcc.code,
        accountName: netSalaryPayableAcc.name,
        category: 'LIABILITY',
        type: 'CREDIT',
        amount: Math.round(totalNetPay),
        narration: `Net wage disbursement liability to bank accounts for ${cycle.month}/${cycle.year}`
      },
      // 6. CREDIT - PF Payable (Employee 12% + Employer 12%)
      {
        id: 'L6',
        accountId: pfPayableAcc.id,
        accountCode: pfPayableAcc.code,
        accountName: pfPayableAcc.name,
        category: 'LIABILITY',
        type: 'CREDIT',
        amount: Math.round(totalPfStatutoryLiability),
        narration: `Combined EPFO challan liability (12% employee + 12% employer)`
      },
      // 7. CREDIT - ESI Payable (Employee 0.75% + Employer 3.25%)
      {
        id: 'L7',
        accountId: esiPayableAcc.id,
        accountCode: esiPayableAcc.code,
        accountName: esiPayableAcc.name,
        category: 'LIABILITY',
        type: 'CREDIT',
        amount: Math.round(totalEsiStatutoryLiability),
        narration: `Combined ESIC monthly remittance (0.75% employee + 3.25% employer)`
      },
      // 8. CREDIT - Professional Tax Payable
      {
        id: 'L8',
        accountId: ptPayableAcc.id,
        accountCode: ptPayableAcc.code,
        accountName: ptPayableAcc.name,
        category: 'LIABILITY',
        type: 'CREDIT',
        amount: Math.round(totalPt),
        narration: `State PT deduction liability`
      },
      // 9. CREDIT - TDS Payable
      {
        id: 'L9',
        accountId: tdsPayableAcc.id,
        accountCode: tdsPayableAcc.code,
        accountName: tdsPayableAcc.name,
        category: 'LIABILITY',
        type: 'CREDIT',
        amount: Math.round(totalTds),
        narration: `Income Tax withheld Section 192 for deposit to Govt Treasury`
      },
      // 10. CREDIT - Gratuity Provision Reserve
      {
        id: 'L10',
        accountId: gratuityPayableAcc.id,
        accountCode: gratuityPayableAcc.code,
        accountName: gratuityPayableAcc.name,
        category: 'LIABILITY',
        type: 'CREDIT',
        amount: Math.round(totalGratuityProvision),
        narration: `Long term balance sheet gratuity provision fund reserve`
      }
    ];

    const totalDebit = lineItems.filter(l => l.type === 'DEBIT').reduce((acc, l) => acc + l.amount, 0);
    const totalCredit = lineItems.filter(l => l.type === 'CREDIT').reduce((acc, l) => acc + l.amount, 0);

    const now = new Date().toISOString();
    const jvDocRef = doc(collection(db, 'companies', companyId, 'journalVouchers'));

    const jv: GeneralLedgerJournalVoucher = {
      id: jvDocRef.id,
      companyId,
      voucherNumber: `JV-${cycle.year}-${String(cycle.month).padStart(2, '0')}-PAYROLL`,
      voucherDate: new Date().toISOString().split('T')[0],
      sourceModule: 'PAYROLL',
      referenceId: cycle.id,
      referenceDocNumber: `PAY-BATCH-${cycle.month}-${cycle.year}`,
      narration: `Automated General Ledger Post for Payroll Period ${cycle.month}/${cycle.year}. Total ${payrollRecords.length} staff processed.`,
      lineItems,
      totalDebit,
      totalCredit,
      isBalanced: Math.abs(totalDebit - totalCredit) < 5, // small rounding tolerance
      status: 'POSTED',
      postedBy: actor.uid,
      postedByName: actor.name,
      postedAt: now,
      syncStatus: 'PENDING_ERP_SYNC',
      createdAt: now,
      updatedAt: now
    };

    await setDoc(jvDocRef, jv);

    await AuditTrailService.logEvent({
      companyId,
      actorId: actor.uid,
      actorName: actor.name,
      actorRole: actor.role,
      module: 'FINANCE',
      action: 'POST_PAYROLL_JOURNAL_VOUCHER',
      entity: 'JournalVoucher',
      entityId: jvDocRef.id,
      description: `Payroll Journal ${jv.voucherNumber} posted to General Ledger for ₹${totalDebit.toLocaleString('en-IN')}`
    });

    return jv;
  }

  // --------------------------------------------------------------------------
  // 4. GET ALL JOURNAL VOUCHERS
  // --------------------------------------------------------------------------
  static async getJournalVouchers(companyId: string): Promise<GeneralLedgerJournalVoucher[]> {
    try {
      const snap = await getDocs(collection(db, 'companies', companyId, 'journalVouchers'));
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as GeneralLedgerJournalVoucher));
    } catch (e) {
      console.error('Error getting journal vouchers:', e);
      return [];
    }
  }

  // --------------------------------------------------------------------------
  // 5. COST CENTERS & BUDGET MANAGEMENT
  // --------------------------------------------------------------------------
  static async getCostCenters(companyId: string): Promise<CostCenterRecord[]> {
    try {
      const snap = await getDocs(collection(db, 'companies', companyId, 'costCenters'));
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as CostCenterRecord));
    } catch (e) {
      console.error('Error getting cost centers:', e);
      return [];
    }
  }

  static async createCostCenter(companyId: string, data: Partial<CostCenterRecord>, actor: { uid: string; name: string }): Promise<CostCenterRecord> {
    const docRef = doc(collection(db, 'companies', companyId, 'costCenters'));
    const cc: CostCenterRecord = {
      id: docRef.id,
      companyId,
      code: data.code || `CC-${Date.now().toString().slice(-4)}`,
      name: data.name || 'Site Cost Center',
      type: data.type || 'SITE',
      siteId: data.siteId,
      departmentId: data.departmentId,
      regionId: data.regionId,
      managerEmployeeId: data.managerEmployeeId,
      managerName: data.managerName,
      allocatedBudget: Number(data.allocatedBudget) || 10000000,
      committedSpend: Number(data.committedSpend) || 0,
      actualSpend: Number(data.actualSpend) || 0,
      variance: (Number(data.allocatedBudget) || 10000000) - (Number(data.actualSpend) || 0),
      currency: 'INR',
      isActive: true,
      fiscalYear: data.fiscalYear || '2026-2027'
    };
    await setDoc(docRef, cc);
    return cc;
  }

  // --------------------------------------------------------------------------
  // 6. CLIENT INVOICING & ACCOUNTS RECEIVABLE (AR)
  // --------------------------------------------------------------------------
  static async getClientInvoices(companyId: string): Promise<ClientInvoiceRecord[]> {
    try {
      const snap = await getDocs(collection(db, 'companies', companyId, 'clientInvoices'));
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as ClientInvoiceRecord));
    } catch (e) {
      console.error('Error getting client invoices:', e);
      return [];
    }
  }

  static async createClientInvoice(
    companyId: string,
    data: Partial<ClientInvoiceRecord>,
    actor: { uid: string; name: string; role: string }
  ): Promise<ClientInvoiceRecord> {
    const docRef = doc(collection(db, 'companies', companyId, 'clientInvoices'));
    const now = new Date().toISOString();

    const subTotalTaxable = data.items?.reduce((acc, it) => acc + (it.taxableAmount || 0), 0) || 0;
    const totalGst = data.items?.reduce((acc, it) => acc + (it.cgstAmount + it.sgstAmount + it.igstAmount || 0), 0) || 0;
    const grandTotal = subTotalTaxable + totalGst;

    const inv: ClientInvoiceRecord = {
      id: docRef.id,
      companyId,
      invoiceNumber: data.invoiceNumber || `INV-2026-${Date.now().toString().slice(-4)}`,
      invoiceDate: data.invoiceDate || now.split('T')[0],
      dueDate: data.dueDate || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      billingPeriodStart: data.billingPeriodStart || now.split('T')[0],
      billingPeriodEnd: data.billingPeriodEnd || now.split('T')[0],
      clientId: data.clientId || 'CLIENT-001',
      clientName: data.clientName || 'Tata Consultancy Services',
      clientGstin: data.clientGstin || '27AAAAA0000A1Z5',
      clientBillingAddress: data.clientBillingAddress || 'Bandra Kurla Complex, Mumbai',
      items: data.items || [],
      subTotalTaxable,
      totalGst,
      grandTotal,
      amountReceived: 0,
      outstandingBalance: grandTotal,
      status: 'SENT_TO_CLIENT',
      paymentTermsDays: data.paymentTermsDays || 30,
      revenueRecognizedDate: now.split('T')[0],
      createdAt: now,
      updatedAt: now
    };

    await setDoc(docRef, inv);

    // Also generate General Ledger Journal Voucher for AR (Dr Accounts Receivable, Cr Guarding Revenue, Cr GST Output)
    const arJvDocRef = doc(collection(db, 'companies', companyId, 'journalVouchers'));
    const arLineItems: JournalEntryLineItem[] = [
      {
        id: 'L1',
        accountId: 'ACC-1200',
        accountCode: '1200',
        accountName: 'Trade Accounts Receivable (Client Invoices)',
        category: 'ASSET',
        type: 'DEBIT',
        amount: Math.round(grandTotal),
        clientId: inv.clientId,
        narration: `Client invoice ${inv.invoiceNumber} billed to ${inv.clientName}`
      },
      {
        id: 'L2',
        accountId: 'ACC-4010',
        accountCode: '4010',
        accountName: 'Security Guarding & Patrol Revenue',
        category: 'REVENUE',
        type: 'CREDIT',
        amount: Math.round(subTotalTaxable),
        clientId: inv.clientId,
        narration: `Taxable guarding revenue billed for ${inv.clientName}`
      },
      {
        id: 'L3',
        accountId: 'ACC-2160',
        accountCode: '2160',
        accountName: 'GST Output Tax Liability (CGST + SGST)',
        category: 'LIABILITY',
        type: 'CREDIT',
        amount: Math.round(totalGst),
        clientId: inv.clientId,
        narration: `18% GST output tax payable`
      }
    ];

    const arJv: GeneralLedgerJournalVoucher = {
      id: arJvDocRef.id,
      companyId,
      voucherNumber: `JV-${inv.invoiceNumber}-BILLING`,
      voucherDate: inv.invoiceDate,
      sourceModule: 'CLIENT_BILLING',
      referenceId: docRef.id,
      referenceDocNumber: inv.invoiceNumber,
      narration: `Invoice billing to ${inv.clientName} for period ${inv.billingPeriodStart} to ${inv.billingPeriodEnd}`,
      lineItems: arLineItems,
      totalDebit: grandTotal,
      totalCredit: grandTotal,
      isBalanced: true,
      status: 'POSTED',
      postedBy: actor.uid,
      postedByName: actor.name,
      postedAt: now,
      createdAt: now,
      updatedAt: now
    };

    await setDoc(arJvDocRef, arJv);

    return inv;
  }

  // --------------------------------------------------------------------------
  // 7. PROFITABILITY BY SITE / CLIENT & P&L ANALYTICS
  // --------------------------------------------------------------------------
  static calculateSiteProfitability(
    siteId: string,
    siteName: string,
    clientName: string,
    headcount: number,
    billedMandays: number,
    ratePerManday: number,
    averageSalaryPerGuard: number
  ): SiteProfitabilityStatement {
    const billedRevenue = billedMandays * ratePerManday;
    const directSalaryCost = headcount * averageSalaryPerGuard;
    const statutoryPfEsiCost = directSalaryCost * 0.1525; // 12% PF + 3.25% ESI
    const uniformEquipmentCost = headcount * 450; // amortized monthly kit cost
    const siteTravelOpsCost = 15000; // supervisory fuel & visits

    const totalDirectCost = directSalaryCost + statutoryPfEsiCost + uniformEquipmentCost + siteTravelOpsCost;
    const grossMarginAmount = billedRevenue - totalDirectCost;
    const grossMarginPercentage = billedRevenue > 0 ? (grossMarginAmount / billedRevenue) * 100 : 0;
    const costPerEmployee = headcount > 0 ? totalDirectCost / headcount : 0;
    const costPerManday = billedMandays > 0 ? totalDirectCost / billedMandays : 0;

    return {
      siteId,
      siteName,
      clientId: 'CLIENT-001',
      clientName,
      regionId: 'REG-WEST',
      month: new Date().getMonth() + 1,
      year: new Date().getFullYear(),
      headcount,
      billedRevenue: Math.round(billedRevenue),
      directSalaryCost: Math.round(directSalaryCost),
      statutoryPfEsiCost: Math.round(statutoryPfEsiCost),
      uniformEquipmentCost: Math.round(uniformEquipmentCost),
      siteTravelOpsCost: Math.round(siteTravelOpsCost),
      totalDirectCost: Math.round(totalDirectCost),
      grossMarginAmount: Math.round(grossMarginAmount),
      grossMarginPercentage: Number(grossMarginPercentage.toFixed(2)),
      costPerEmployee: Math.round(costPerEmployee),
      costPerManday: Math.round(costPerManday)
    };
  }
}
