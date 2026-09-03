import { Request, Response } from 'express';
import { getAdminDb } from './firebaseAdmin';
import { ReimbursementPayloadBuilder } from '../services/reimbursementPayloadBuilder';

// --- Types ---
interface StatutoryConfigRecord {
  id?: string;
  companyId: string;
  state: string;
  pfEnabled?: boolean;
  pfEmployeeRate?: number;
  pfEmployerRate?: number;
  pfWageCeiling?: number;
  pfCapAmount?: number;
  pfCappedAtCeiling?: boolean;
  esiEnabled?: boolean;
  esiEmployeeRate?: number;
  esiEmployerRate?: number;
  esiWageCeiling?: number;
  ptEnabled?: boolean;
  ptSlabs?: any[];
  tdsEnabled?: boolean;
  tdsThreshold?: number;
  tdsDefaultRate?: number;
  [key: string]: any;
}

const DEFAULT_STATE_STATUTORY_CONFIGS: Record<string, StatutoryConfigRecord> = {
  MAHARASHTRA: {
    companyId: 'DEFAULT', state: 'MAHARASHTRA', pfEnabled: true, pfEmployeeRate: 12, pfEmployerRate: 12, pfWageCeiling: 15000, pfCapAmount: 1800, pfCappedAtCeiling: true, esiEnabled: true, esiEmployeeRate: 0.75, esiEmployerRate: 3.25, esiWageCeiling: 21000, ptEnabled: true, ptSlabs: [ { minSalary: 0, maxSalary: 7500, amount: 0, febAmount: 0 }, { minSalary: 7501, maxSalary: 10000, amount: 175, febAmount: 175 }, { minSalary: 10001, maxSalary: 99999999, amount: 200, febAmount: 300 } ], tdsEnabled: true, tdsThreshold: 50000, tdsDefaultRate: 5
  },
  KARNATAKA: {
    companyId: 'DEFAULT', state: 'KARNATAKA', pfEnabled: true, pfEmployeeRate: 12, pfEmployerRate: 12, pfWageCeiling: 15000, pfCapAmount: 1800, pfCappedAtCeiling: true, esiEnabled: true, esiEmployeeRate: 0.75, esiEmployerRate: 3.25, esiWageCeiling: 21000, ptEnabled: true, ptSlabs: [ { minSalary: 0, maxSalary: 14999, amount: 0 }, { minSalary: 15000, maxSalary: 99999999, amount: 200 } ], tdsEnabled: true, tdsThreshold: 50000, tdsDefaultRate: 5
  },
  DEFAULT: {
    companyId: 'DEFAULT', state: 'DEFAULT', pfEnabled: true, pfEmployeeRate: 12, pfEmployerRate: 12, pfWageCeiling: 15000, pfCapAmount: 1800, pfCappedAtCeiling: true, esiEnabled: true, esiEmployeeRate: 0.75, esiEmployerRate: 3.25, esiWageCeiling: 21000, ptEnabled: true, ptSlabs: [ { minSalary: 0, maxSalary: 14999, amount: 0 }, { minSalary: 15000, maxSalary: 99999999, amount: 200 } ], tdsEnabled: true, tdsThreshold: 50000, tdsDefaultRate: 5
  }
};

class StatutoryRulesService {
  static normalizeStateKey(stateStr?: string): string {
    if (!stateStr) return 'DEFAULT';
    const clean = stateStr.trim().toUpperCase().replace(/[^A-Z]/g, '_');
    if (clean.includes('MAHA') || clean === 'MH') return 'MAHARASHTRA';
    if (clean.includes('KARNAT') || clean === 'KA') return 'KARNATAKA';
    return clean || 'DEFAULT';
  }
  static checkEpsSeniorExemption(dateOfBirth?: string, asOfDate: Date = new Date()): { isExempt: boolean; age: number; note?: string } {
    if (!dateOfBirth) return { isExempt: false, age: 0 };
    const dob = new Date(dateOfBirth);
    if (isNaN(dob.getTime())) return { isExempt: false, age: 0 };
    let age = asOfDate.getFullYear() - dob.getFullYear();
    const m = asOfDate.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && asOfDate.getDate() < dob.getDate())) {
      age--;
    }
    if (age >= 58) {
      return { isExempt: true, age, note: `STAT-AGE-58: EPS Exemption Applied (Employee Age: ${age} yrs >= 58)` };
    }
    return { isExempt: false, age };
  }
  static calculatePf(basicSalary: number, config: StatutoryConfigRecord): number {
    if (!config.pfEnabled) return 0;
    const rate = (config.pfEmployeeRate || 12) / 100;
    const rawPf = basicSalary * rate;
    if (config.pfCappedAtCeiling) {
      const cap = config.pfCapAmount || 1800;
      return Math.min(cap, rawPf);
    }
    return rawPf;
  }
  static calculateEsi(grossSalary: number, config: StatutoryConfigRecord): number {
    if (!config.esiEnabled) return 0;
    const ceiling = config.esiWageCeiling || 21000;
    if (grossSalary > ceiling) return 0;
    const rate = (config.esiEmployeeRate || 0.75) / 100;
    return grossSalary * rate;
  }
  static calculatePt(grossSalary: number, config: StatutoryConfigRecord, month: number, gender: string = 'ALL'): number {
    if (!config.ptEnabled || !config.ptSlabs || config.ptSlabs.length === 0) return 0;
    const isFebruary = month === 2;
    const slab = config.ptSlabs.find(s => {
      const matchMin = grossSalary >= s.minSalary;
      const matchMax = grossSalary <= s.maxSalary;
      const matchGender = !s.gender || s.gender === 'ALL' || s.gender === gender;
      return matchMin && matchMax && matchGender;
    });
    if (!slab) return 0;
    if (isFebruary && slab.febAmount !== undefined) return slab.febAmount;
    return slab.amount;
  }
  static calculateTds(grossSalary: number, config: StatutoryConfigRecord): number {
    if (!config.tdsEnabled) return 0;
    const threshold = config.tdsThreshold || 50000;
    if (grossSalary <= threshold) return 0;
    const rate = (config.tdsDefaultRate || 5) / 100;
    return grossSalary * rate;
  }
}

class PayrollEngine {
  static calculate(month: number, year: number, emp: any, profile: any, struct: any, holidays: any[], leaves: any[], attendances: any[], advance: number = 0, statutoryConfig?: StatutoryConfigRecord): any {
    const daysInMonth = new Date(year, month, 0).getDate();
    let payableDays = daysInMonth;
    let lopDays = 0;
    let approvedOvertimeMinutes = 0;

    const empWeeklyOff = emp.weeklyOff || emp.weeklyOffDays || [0];

    for (let d = 1; d <= daysInMonth; d++) {
      const dateObj = new Date(year, month - 1, d);
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      
      const isDayOff = empWeeklyOff.includes(dateObj.getDay());
      
      const isHoliday = holidays.some(h => {
        if (h.date !== dateStr) return false;
        if (!h.applicableRegions || h.applicableRegions.length === 0) return true;
        return emp.assignedRegionId && h.applicableRegions.includes(emp.assignedRegionId);
      });
      
      const att = attendances.find(a => a.attendanceDate === dateStr || a.date === dateStr);
      const leave = leaves.find(l => l.startDate <= dateStr && l.endDate >= dateStr);
      
      if (att && att.approvedOvertimeMinutes) {
        approvedOvertimeMinutes += att.approvedOvertimeMinutes;
      }
      
      if (!att && !isDayOff && !isHoliday) {
        if (leave && (leave.status === 'APPROVED' || leave.status === 'ACCEPTED')) {
          if (leave.leaveType === 'UNPAID' || leave.leaveType === 'LWP') { lopDays += 1; }
        } else { 
          lopDays += 1; 
        }
      } else if (att && (att.status === 'ABSENT' || att.status === 'HALFDAY')) {
         if (isDayOff || isHoliday) continue; 
         if (att.status === 'ABSENT' && (!leave || leave.status !== 'APPROVED' || leave.leaveType === 'UNPAID' || leave.leaveType === 'LWP')) { lopDays += 1; }
         else if (att.status === 'HALFDAY' && (!leave || leave.status !== 'APPROVED' || leave.leaveType === 'UNPAID' || leave.leaveType === 'LWP')) { lopDays += 0.5; }
      } else if (isDayOff || isHoliday) {
        if (leave && (leave.status === 'APPROVED' || leave.status === 'ACCEPTED') && (leave.leaveType === 'UNPAID' || leave.leaveType === 'LWP')) {
          lopDays += 1;
        }
      }
    }
    payableDays = Math.max(0, daysInMonth - lopDays);
    const baseSalary = profile.baseMonthlySalary || 0;
    const proRatedSalary = (baseSalary / daysInMonth) * payableDays;
    const lopDeduction = baseSalary - proRatedSalary;
    const basicPercentage = struct.basicPercentage || 50;
    const hraPercentage = struct.hraPercentage || 40;
    const basic = proRatedSalary * (basicPercentage / 100);
    const hra = basic * (hraPercentage / 100);
    const otherAllowances = Math.max(0, proRatedSalary - basic - hra);
    const hourlyRate = baseSalary / (daysInMonth * 8); 
    const otMultiplier = 1.5; 
    const overtimePay = (approvedOvertimeMinutes / 60) * hourlyRate * otMultiplier;
    const totalGross = proRatedSalary + overtimePay;
    const stateKey = emp.state || emp.assignedRegionId || 'DEFAULT';
    const activeStatutory = statutoryConfig || DEFAULT_STATE_STATUTORY_CONFIGS[StatutoryRulesService.normalizeStateKey(stateKey)] || DEFAULT_STATE_STATUTORY_CONFIGS.DEFAULT;
    const epsCheck = StatutoryRulesService.checkEpsSeniorExemption(emp.dateOfBirth, new Date(year, month - 1, 1));
    const pf = StatutoryRulesService.calculatePf(basic, activeStatutory);
    const esic = StatutoryRulesService.calculateEsi(totalGross, activeStatutory);
    const pt = StatutoryRulesService.calculatePt(totalGross, activeStatutory, month, emp.gender || 'ALL');
    const tds = StatutoryRulesService.calculateTds(totalGross, activeStatutory);
    const totalDeductions = pf + esic + pt + tds + advance;
    const netPay = Math.max(0, totalGross - totalDeductions);
    return {
      payableDays, lopDays, totalGross: Math.round(totalGross), totalDeductions: Math.round(totalDeductions), netPay: Math.round(netPay), isEpsExempt: epsCheck.isExempt, epsExemptionFlag: epsCheck.isExempt ? epsCheck.note : undefined,
      earnings: { basic: Math.round(basic), hra: Math.round(hra), overtimePay: Math.round(overtimePay), otherAllowances: Math.round(otherAllowances), totalGross: Math.round(totalGross) },
      deductions: { pf: Math.round(pf), esic: Math.round(esic), pt: Math.round(pt), tds: Math.round(tds), lopDeduction: Math.round(lopDeduction), advanceDeduction: Math.round(advance), epsExemptionApplied: epsCheck.isExempt, epsExemptionNote: epsCheck.note }
    };
  }
}

export const calculatePayrollHandler = async (req: Request, res: Response) => {
  try {
    const { companyId, month, year, actorId, actorName } = req.body;
    
    if (!companyId || !month || !year) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    const db = getAdminDb();
    if (!db) {
      return res.status(500).json({ success: false, error: 'Firebase Admin not initialized on server' });
    }

    const cycleId = `CYC-${year}-${String(month).padStart(2, '0')}`;
    const cycleRef = db.collection('companies').doc(companyId).collection('payrollCycles').doc(cycleId);

    // 1. Transaction to check and lock cycle
    await db.runTransaction(async (t) => {
      const snap = await t.get(cycleRef);
      if (snap.exists) {
        const cycle = snap.data();
        if (cycle && ['PROCESSING', 'APPROVED', 'LOCKED', 'DISBURSED'].includes(cycle.status)) {
          throw new Error(`Cycle is currently ${cycle?.status}. Cannot recalculate.`);
        }
      }
      t.set(cycleRef, {
        id: cycleId, companyId, month, year, cycleLabel: `${String(month).padStart(2, '0')}/${year}`,
        status: 'PROCESSING', createdAt: new Date().toISOString()
      }, { merge: true });
    });

    // 2. Fetch all necessary data
    const empsSnap = await db.collection('companies').doc(companyId).collection('employees').where('status', '==', 'ACTIVE').get();
    const employees = empsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;

    const attsSnap = await db.collection('companies').doc(companyId).collection('attendance')
      .where('attendanceDate', '>=', startDate)
      .where('attendanceDate', '<=', endDate).get();
    const attendances = attsSnap.docs.map(d => d.data());

    const leavesSnap = await db.collection('companies').doc(companyId).collection('leaves')
      .where('startDate', '<=', endDate)
      .where('status', 'in', ['APPROVED', 'ACCEPTED']).get();
    const leaves = leavesSnap.docs.map(d => d.data()).filter(l => (l as any).endDate >= startDate);

    const salariesSnap = await db.collection('companies').doc(companyId).collection('salaryProfiles').get();
    const salaries = salariesSnap.docs.map(d => d.data());

    const structuresSnap = await db.collection('companies').doc(companyId).collection('salaryStructures').get();
    const structures = structuresSnap.docs.map(d => d.data());

    const statConfigsSnap = await db.collection('companies').doc(companyId).collection('statutory_configs').get();
    let statutoryConfigs = statConfigsSnap.docs.map(d => d.data() as StatutoryConfigRecord);
    if (statutoryConfigs.length === 0) {
      statutoryConfigs = Object.values(DEFAULT_STATE_STATUTORY_CONFIGS).map(cfg => ({ ...cfg, companyId }));
    }
    const defaultStatutory = statutoryConfigs.find(c => c.state === 'DEFAULT') || DEFAULT_STATE_STATUTORY_CONFIGS.DEFAULT;

    const holidaysSnap = await db.collection('companies').doc(companyId).collection('holidays')
      .where('date', '>=', startDate)
      .where('date', '<=', endDate).get();
    const holidays = holidaysSnap.docs.map(d => d.data());

    // --- FIX: Reimbursement-to-Payroll Handoff ---
    // Fetch all expense claims and build structured batch payload via ReimbursementPayloadBuilder
    const expensesSnap = await db.collection('companies').doc(companyId).collection('expenseClaims').get();
    const allExpenses = expensesSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));
    const reimbursementBatch = ReimbursementPayloadBuilder.buildBatchPayload(companyId, cycleId, month, year, allExpenses);
    // ---------------------------------------------

    let totalGross = 0; let totalDeductions = 0; let totalNetPay = 0;

    // 3. Process each employee
    const batchArray: FirebaseFirestore.WriteBatch[] = [];
    let currentBatch = db.batch();
    let operationCounter = 0;
    batchArray.push(currentBatch);

    for (const emp of employees) {
      const empAtts = attendances.filter(a => a.employeeId === emp.id);
      const empLeaves = leaves.filter(l => l.employeeId === emp.id);
      const profile = salaries.find(s => s.employeeId === emp.id) || { baseMonthlySalary: 18000 };
      const structure = structures.find(s => s.id === (profile as any).structureId) || { basicPercentage: 50 };
      
      const empStateKey = StatutoryRulesService.normalizeStateKey((emp as any).state || (emp as any).assignedRegionId || (emp as any).workLocation);
      const empStatutory = statutoryConfigs.find(c => c.state === empStateKey) || DEFAULT_STATE_STATUTORY_CONFIGS[empStateKey] || defaultStatutory;
      
      const calc = PayrollEngine.calculate(month, year, emp, profile, structure, holidays, empLeaves, empAtts, 0, empStatutory);

      // --- FIX: Reimbursement-to-Payroll Handoff ---
      const empReimbursement = reimbursementBatch.employeePayloads[emp.id];
      const totalReimbursements = empReimbursement ? empReimbursement.totalReimbursementAmount : 0;
      
      if (totalReimbursements > 0) {
        calc.earnings.reimbursements = Math.round(totalReimbursements);
        calc.netPay += Math.round(totalReimbursements);
        
        empReimbursement.claims.forEach(claimItem => {
          const expRef = db.collection('companies').doc(companyId).collection('expenseClaims').doc(claimItem.claimId);
          currentBatch.update(expRef, {
            status: 'PAID',
            payrollMonthYear: cycleId,
            paidDate: new Date().toISOString()
          });
          operationCounter++;
        });
      }
      // ---------------------------------------------

      const prId = `PR-${cycleId}-${emp.id}`;
      const prRef = db.collection('companies').doc(companyId).collection('payrollRecords').doc(prId);

      currentBatch.set(prRef, {
        id: prId, companyId, cycleId, employeeId: emp.id, employeeName: `${(emp as any).firstName} ${(emp as any).lastName}`,
        month, year, calculations: calc, status: 'CALCULATED', statutoryState: empStatutory.state, createdAt: new Date().toISOString()
      });
      
      operationCounter++;
      if (operationCounter >= 400) {
        currentBatch = db.batch();
        batchArray.push(currentBatch);
        operationCounter = 0;
      }

      totalGross += calc.totalGross;
      totalDeductions += calc.totalDeductions;
      totalNetPay += calc.netPay;
    }

    // 4. Commit all payroll records
    for (const b of batchArray) {
      await b.commit();
    }

    // 5. Update cycle and audit
    await cycleRef.update({
      status: 'CALCULATED', totalEmployees: employees.length, totalGrossPay: totalGross,
      totalDeductions, totalNetPay, processedAt: new Date().toISOString(), processedBy: actorId || 'SYSTEM', processedByName: actorName || 'System'
    });

    const auditRef = db.collection('companies').doc(companyId).collection('audit_logs').doc();
    await auditRef.set({
      id: auditRef.id, companyId, action: 'PAYROLL_CALCULATED', entityId: cycleId, entityType: 'PAYROLL_CYCLE',
      userId: actorId || 'SYSTEM', userName: actorName || 'System',
      details: `Calculated payroll for ${employees.length} employees for ${month}/${year} using dynamic statutory state rules (Express API Server)`,
      timestamp: new Date().toISOString()
    });

    return res.json({ success: true, cycleId });
  } catch (error: any) {
    console.error('Error in calculatePayrollHandler:', error);
    try {
      const { companyId, month, year } = req.body;
      const db = getAdminDb();
      if (db && companyId && month && year) {
         const cycleId = `CYC-${year}-${String(month).padStart(2, '0')}`;
         await db.collection('companies').doc(companyId).collection('payrollCycles').doc(cycleId).update({ status: 'DRAFT' });
      }
    } catch (e) {
      // ignore
    }
    return res.status(500).json({ success: false, error: error.message || 'Error calculating payroll' });
  }
};
