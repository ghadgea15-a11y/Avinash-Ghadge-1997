import { Request, Response } from 'express';
import { getAdminDb } from './firebaseAdmin';

export interface LeavePolicyConfig {
  id?: string;
  leaveCode: string;
  leaveName: string;
  annualEntitlement: number;
  annualAllocation?: number;
  accrualType: 'ANNUAL' | 'MONTHLY';
  accrualFrequency?: 'YEARLY' | 'MONTHLY';
  proRataMethod?: 'MONTHLY_EXACT' | 'DAY_EXACT';
  roundingRule?: 'NEAREST_HALF_DAY' | 'ROUND_UP' | 'ROUND_DOWN';
  carryForwardLimit?: number;
  encashmentAllowed?: boolean;
}

export class ServerLeaveAccrualEngine {
  /**
   * Calculates monthly accrual based on annual entitlement with optional mid-month joining pro-rata
   */
  static calculateMonthlyAccrual(
    annualEntitlement: number,
    month: number,
    joiningDateStr?: string,
    year: number = new Date().getFullYear()
  ): number {
    if (!annualEntitlement || annualEntitlement <= 0) return 0;
    const baseMonthly = annualEntitlement / 12;

    if (!joiningDateStr) {
      return Number(baseMonthly.toFixed(2));
    }

    const joiningDate = new Date(joiningDateStr);
    if (isNaN(joiningDate.getTime())) return Number(baseMonthly.toFixed(2));

    const jYear = joiningDate.getFullYear();
    const jMonth = joiningDate.getMonth() + 1; // 1-indexed

    // If joined in future month
    if (jYear > year || (jYear === year && jMonth > month)) {
      return 0;
    }

    // If joined in the current month: calculate fraction of month worked
    if (jYear === year && jMonth === month) {
      const daysInMonth = new Date(year, month, 0).getDate();
      const remainingDays = daysInMonth - joiningDate.getDate() + 1;
      const fraction = remainingDays / daysInMonth;
      return Number((baseMonthly * fraction).toFixed(2));
    }

    return Number(baseMonthly.toFixed(2));
  }

  /**
   * Calculates pro-rata leave entitlement for mid-year joiners
   */
  static calculateProRataEntitlement(
    annualEntitlement: number,
    joiningDateStr: string,
    year: number = new Date().getFullYear(),
    roundingRule: string = 'NEAREST_HALF_DAY'
  ): number {
    if (!annualEntitlement || annualEntitlement <= 0) return 0;
    const joiningDate = new Date(joiningDateStr);
    if (isNaN(joiningDate.getTime())) return annualEntitlement;

    const jYear = joiningDate.getFullYear();
    if (jYear > year) return 0;
    if (jYear < year) return annualEntitlement;

    const daysInYear = ((year % 4 === 0 && year % 100 !== 0) || year % 400 === 0) ? 366 : 365;
    const startOfYear = new Date(year, 0, 1);
    const endOfYear = new Date(year, 11, 31, 23, 59, 59);

    const effectiveStart = joiningDate > startOfYear ? joiningDate : startOfYear;
    const msRemaining = endOfYear.getTime() - effectiveStart.getTime();
    const daysRemaining = Math.max(0, Math.ceil(msRemaining / (1000 * 60 * 60 * 24)));

    const rawCredit = (daysRemaining / daysInYear) * annualEntitlement;

    if (roundingRule === 'ROUND_UP') return Math.ceil(rawCredit);
    if (roundingRule === 'ROUND_DOWN') return Math.floor(rawCredit);
    return Math.round(rawCredit * 2) / 2; // Nearest half day
  }

  /**
   * Authoritative server execution of monthly accruals for a company
   */
  static async processCompanyMonthlyAccruals(
    companyId: string,
    month: number = new Date().getMonth() + 1,
    year: number = new Date().getFullYear(),
    actor: { id: string; name: string } = { id: 'SYSTEM_CRON', name: 'Server Accrual Cron' }
  ) {
    const db = getAdminDb();
    if (!db) throw new Error('Database connection unavailable');

    // 1. Fetch policies
    const policiesSnap = await db.collection('companies').doc(companyId).collection('leave_policies').get();
    const policies: LeavePolicyConfig[] = policiesSnap.docs.map(d => ({
      id: d.id,
      leaveCode: d.data().leaveCode || d.data().policyCode || d.id,
      leaveName: d.data().leaveName || d.data().policyName || 'Leave',
      annualEntitlement: d.data().annualEntitlement || d.data().annualAllocation || 0,
      accrualType: d.data().accrualType || 'MONTHLY',
      accrualFrequency: d.data().accrualFrequency || 'MONTHLY',
      proRataMethod: d.data().proRataMethod || 'MONTHLY_EXACT',
      roundingRule: d.data().roundingRule || 'NEAREST_HALF_DAY'
    }));

    if (policies.length === 0) {
      return { success: true, message: 'No leave policies configured for this company', processedCount: 0 };
    }

    // 2. Fetch active employees
    const empsSnap = await db.collection('companies').doc(companyId).collection('employees')
      .where('status', '==', 'ACTIVE').get();
    const employees = empsSnap.docs.map(d => ({ id: d.id, ...d.data() as any }));

    const batchArray: FirebaseFirestore.WriteBatch[] = [];
    let currentBatch = db.batch();
    let opCount = 0;
    batchArray.push(currentBatch);

    let processedCount = 0;
    const now = new Date().toISOString();

    for (const emp of employees) {
      const balanceDocRef = db.collection('companies').doc(companyId).collection('leaveBalances').doc(emp.id);
      const balanceSnap = await balanceDocRef.get();
      const existingData = balanceSnap.exists ? balanceSnap.data() : null;

      const currentBalances: any[] = existingData?.balances || [];
      const updatedBalances = policies.map(policy => {
        const existing = currentBalances.find(b => b.leaveCode === policy.leaveCode);
        const joiningDateStr = emp.joiningDate || emp.dateOfJoining || existing?.joiningDate;
        
        let allocated = existing?.allocated ?? (policy.accrualType === 'ANNUAL' ? policy.annualEntitlement : 0);
        let accrued = existing?.accrued ?? 0;
        const used = existing?.used ?? 0;
        const pending = existing?.pending ?? 0;
        const carriedOver = existing?.carriedOver ?? 0;

        if (policy.accrualType === 'MONTHLY') {
          const monthlyCredit = ServerLeaveAccrualEngine.calculateMonthlyAccrual(
            policy.annualEntitlement,
            month,
            joiningDateStr,
            year
          );
          accrued = Number((accrued + monthlyCredit).toFixed(2));

          // Record Ledger entry for auditable accrual
          const ledgerDocRef = db.collection('companies').doc(companyId).collection('leaveLedger').doc(`LEDGER-${emp.id}-${policy.leaveCode}-${year}-${month}-ACCRUAL`);
          currentBatch.set(ledgerDocRef, {
            id: ledgerDocRef.id,
            companyId,
            employeeId: emp.id,
            employeeName: `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || emp.name || emp.id,
            leaveCode: policy.leaveCode,
            leaveName: policy.leaveName,
            year,
            month,
            transactionType: 'MONTHLY_ACCRUAL',
            transactionDate: `${year}-${String(month).padStart(2, '0')}-01`,
            creditDays: monthlyCredit,
            debitDays: 0,
            balanceBefore: (allocated + accrued - monthlyCredit + carriedOver) - used,
            balanceAfter: (allocated + accrued + carriedOver) - used,
            reason: `Automated Server-Side Monthly Accrual (${month}/${year})`,
            referenceId: `CRON-${year}-${month}`,
            createdBy: actor.id,
            createdAt: now
          }, { merge: true });

          opCount++;
          if (opCount >= 400) {
            currentBatch = db.batch();
            batchArray.push(currentBatch);
            opCount = 0;
          }
        }

        const availableBalance = Number(((allocated + accrued + carriedOver) - used - pending).toFixed(2));

        return {
          leaveCode: policy.leaveCode,
          leaveName: policy.leaveName,
          allocated,
          accrued,
          used,
          pending,
          carriedOver,
          availableBalance,
          joiningDate: joiningDateStr
        };
      });

      currentBatch.set(balanceDocRef, {
        id: emp.id,
        employeeId: emp.id,
        employeeName: `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || emp.name || emp.id,
        companyId,
        year,
        balances: updatedBalances,
        updatedAt: now,
        lastAccrualMonth: month,
        lastAccrualYear: year
      }, { merge: true });

      opCount++;
      if (opCount >= 400) {
        currentBatch = db.batch();
        batchArray.push(currentBatch);
        opCount = 0;
      }
      processedCount++;
    }

    for (const b of batchArray) {
      await b.commit();
    }

    // Record Audit Log
    const auditRef = db.collection('companies').doc(companyId).collection('audit_logs').doc();
    await auditRef.set({
      id: auditRef.id,
      companyId,
      action: 'LEAVE_ACCRUAL_PROCESSED',
      entityId: `ACCRUAL-${year}-${month}`,
      entityType: 'LEAVE_ACCRUAL',
      userId: actor.id,
      userName: actor.name,
      details: `Processed server-side monthly leave accruals for ${processedCount} employees for ${month}/${year}`,
      timestamp: now
    });

    return {
      success: true,
      processedCount,
      month,
      year,
      timestamp: now
    };
  }
}

export const processLeaveAccrualsHandler = async (req: Request, res: Response) => {
  try {
    const { companyId, month, year, actorId, actorName } = req.body;
    if (!companyId) {
      return res.status(400).json({ success: false, error: 'companyId is required' });
    }

    const currentMonth = month || (new Date().getMonth() + 1);
    const currentYear = year || new Date().getFullYear();

    const result = await ServerLeaveAccrualEngine.processCompanyMonthlyAccruals(
      companyId,
      Number(currentMonth),
      Number(currentYear),
      { id: actorId || 'SYSTEM_API', name: actorName || 'System API' }
    );

    return res.json(result);
  } catch (error: any) {
    console.error('[ServerLeaveAccrualEngine] Error processing leave accruals:', error);
    return res.status(500).json({ success: false, error: error.message || 'Failed to process leave accruals' });
  }
};
