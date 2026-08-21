import { collection, query, where, getDocs, doc, setDoc, Timestamp, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { 
  PredictionRecord, 
  PredictionType, 
  PredictionSubjectType, 
  PredictionRiskLevel, 
  PredictionDataQuality 
} from '../types/bi';
import { format, subDays, isAfter } from 'date-fns';
import { EmployeeRecord, AttendanceRecord, SlaBreachRecord, SlaDefinitionRecord, ContractRecord, BillingRateMatrixRecord, EmployeeSalaryProfileRecord } from '../types';

export class PredictionService {
  /**
   * ATTRITION RISK PREDICTION
   */
  static async calculateAttritionRisk(
    companyId: string, 
    employeeId: string, 
    lookbackDays: number = 90
  ): Promise<PredictionRecord> {
    const today = new Date();
    const periodStart = subDays(today, lookbackDays);
    const predictionId = `PRED_${companyId}_ATTRITION_${employeeId}_${format(today, 'yyyy-MM-dd')}`;
    const predictionDate = format(today, 'yyyy-MM-dd');

    const result: Partial<PredictionRecord> = {
      id: predictionId,
      companyId,
      predictionType: 'ATTRITION',
      subjectType: 'EMPLOYEE',
      subjectId: employeeId,
      predictionDate,
      analysisPeriodDays: lookbackDays,
      modelVersion: 'RULE_BASED_ATTRITION_V1',
      generatedAt: new Date().toISOString(),
      contributingFactors: [],
      recommendedActions: []
    };

    try {
      // 1. Fetch Employee
      const empSnap = await getDocs(query(collection(db, 'companies', companyId, 'employees'), where('id', '==', employeeId)));
      if (empSnap.empty) {
        throw new Error('Employee not found');
      }
      const employee = empSnap.docs[0].data() as EmployeeRecord;
      result.subjectName = `${employee.firstName} ${employee.lastName}`;

      // If already exited, no need to predict
      if (employee.status !== 'ACTIVE') {
        result.dataQuality = 'INSUFFICIENT';
        result.riskScore = null;
        result.riskLevel = 'INSUFFICIENT_DATA';
        result.contributingFactors?.push('Employee is not active.');
        return await this.savePrediction(result as PredictionRecord);
      }

      // 2. Fetch Attendance for lookback period
      const attQ = query(
        collection(db, 'companies', companyId, 'attendance'),
        where('employeeId', '==', employeeId),
        where('date', '>=', format(periodStart, 'yyyy-MM-dd'))
      );
      const attSnap = await getDocs(attQ);
      const attendanceRecords = attSnap.docs.map(d => d.data() as AttendanceRecord);

      // Verify minimum data quality
      // If we don't have at least 15 attendance records in 90 days, we might not have enough data.
      if (attendanceRecords.length < 10) {
        result.dataQuality = 'INSUFFICIENT';
        result.riskScore = null;
        result.riskLevel = 'INSUFFICIENT_DATA';
        result.contributingFactors?.push(`Insufficient attendance data (${attendanceRecords.length} records in ${lookbackDays} days).`);
        return await this.savePrediction(result as PredictionRecord);
      }

      result.dataQuality = attendanceRecords.length >= 30 ? 'SUFFICIENT' : 'PARTIAL';

      // 3. Feature Engineering
      let lateCount = 0;
      let absentCount = 0;
      let shortShiftCount = 0;
      
      attendanceRecords.forEach(att => {
        if (att.status === 'ABSENT') absentCount++;
        if (att.status === 'LATE') lateCount++;
        // If they worked less than 6 hours but status is present, might be a short shift
        if ((att.status === 'PRESENT' || att.status === 'LATE') && (att as any).totalHours && (att as any).totalHours < 6) {
           shortShiftCount++;
        }
      });

      const absenceRate = absentCount / attendanceRecords.length;
      const lateRate = lateCount / attendanceRecords.length;

      let score = 20; // Baseline score
      const factors: string[] = [];
      const actions: string[] = [];

      // Absenteeism logic
      if (absenceRate > 0.15) {
        score += 30;
        factors.push(`High absenteeism (${Math.round(absenceRate * 100)}% over last ${lookbackDays} days)`);
      } else if (absenceRate > 0.08) {
        score += 15;
        factors.push(`Elevated absenteeism (${Math.round(absenceRate * 100)}%)`);
      }

      // Late frequency
      if (lateRate > 0.20) {
        score += 15;
        factors.push(`Frequent late attendance (${Math.round(lateRate * 100)}%)`);
      }

      // Tenure logic
      if (employee.joinedDate) {
        const doj = new Date(employee.joinedDate);
        const diffTime = Math.abs(today.getTime() - doj.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays < 90) {
          score += 10;
          factors.push('New hire in critical 90-day window');
        } else if (diffDays > 365 * 3) {
          // Sometimes very long tenure without change implies risk, but we won't penalize much without ML.
        }
      }

      // Cap score
      score = Math.min(100, Math.max(0, score));
      result.riskScore = score;
      result.confidence = result.dataQuality === 'SUFFICIENT' ? 85 : 50;

      // Map to Risk Level
      if (score >= 70) {
        result.riskLevel = 'CRITICAL';
        actions.push('Schedule immediate check-in meeting', 'Review recent workload and assignments');
      } else if (score >= 50) {
        result.riskLevel = 'HIGH';
        actions.push('Monitor attendance closely', 'Discuss any potential issues in 1-on-1');
      } else if (score >= 30) {
        result.riskLevel = 'MEDIUM';
        actions.push('Standard engagement check-in');
      } else {
        result.riskLevel = 'LOW';
      }

      if (factors.length === 0) {
        factors.push('Stable attendance and typical performance patterns detected.');
      }

      result.contributingFactors = factors;
      result.recommendedActions = actions;

      return await this.savePrediction(result as PredictionRecord);

    } catch (error: any) {
      console.error('Error calculating attrition risk:', error);
      throw error;
    }
  }

  /**
   * SLA BREACH RISK
   */
  static async calculateSlaBreachRisk(companyId: string, contractId: string, slaId: string, ticketId: string): Promise<PredictionRecord> {
    const today = new Date();
    const predictionId = `PRED_${companyId}_SLA_${ticketId}_${today.getTime()}`;
    const predictionDate = format(today, 'yyyy-MM-dd');

    const result: Partial<PredictionRecord> = {
      id: predictionId,
      companyId,
      predictionType: 'SLA_BREACH',
      subjectType: 'TICKET',
      subjectId: ticketId,
      predictionDate,
      analysisPeriodDays: 0,
      modelVersion: 'RULE_BASED_SLA_V1',
      generatedAt: new Date().toISOString(),
      contributingFactors: [],
      recommendedActions: []
    };

    try {
      // 1. Fetch SLA Def
      const slaDefSnap = await getDocs(query(collection(db, 'companies', companyId, 'sla_definitions'), where('id', '==', slaId)));
      if (slaDefSnap.empty) throw new Error('SLA definition not found');
      const slaDef = slaDefSnap.docs[0].data() as SlaDefinitionRecord;

      // 2. Fetch Ticket (Incidents or WorkOrders, let's assume WorkOrders as the generic container for tasks)
      const ticketSnap = await getDocs(query(collection(db, 'companies', companyId, 'serviceTickets'), where('id', '==', ticketId)));
      if (ticketSnap.empty) throw new Error('Ticket not found');
      const ticket = ticketSnap.docs[0].data() as any; // Using any as WorkOrder might not map perfectly to ticket

      result.subjectName = `Ticket ${ticket.ticketNumber || ticket.workOrderNumber || ticketId}`;

      // This is a simplified SLA check, a real one would have 'dueDate' set by the authoritative SLA engine
      if (!ticket.createdAt || ticket.status === 'COMPLETED' || ticket.status === 'RESOLVED' || ticket.status === 'CLOSED') {
        result.dataQuality = 'INSUFFICIENT';
        result.riskScore = null;
        result.riskLevel = 'INSUFFICIENT_DATA';
        result.contributingFactors?.push('Ticket is already resolved or missing creation date.');
        return await this.savePrediction(result as PredictionRecord);
      }

      result.dataQuality = 'SUFFICIENT';
      
      const createdAt = new Date(ticket.createdAt);
      const targetValue = slaDef.targetValue ?? (slaDef.targetResponseMinutes || 60);
      let targetMs = 0;
      if (slaDef.targetUnit === 'MINUTES') targetMs = targetValue * 60000;
      else if (slaDef.targetUnit === 'HOURS') targetMs = targetValue * 3600000;
      else if (slaDef.targetUnit === 'DAYS') targetMs = targetValue * 86400000;
      else targetMs = targetValue * 60000;

      const deadline = new Date(createdAt.getTime() + targetMs);
      const remainingMs = deadline.getTime() - today.getTime();
      
      let score = 0;
      const factors: string[] = [];
      const actions: string[] = [];

      if (remainingMs < 0) {
        // Already breached theoretically
        score = 100;
        factors.push(`SLA Deadline (${format(deadline, 'yyyy-MM-dd HH:mm')}) has already passed.`);
      } else {
        const remainingHours = remainingMs / 3600000;
        const totalDurationHours = targetMs / 3600000;
        const consumedRatio = 1 - (remainingHours / totalDurationHours);

        factors.push(`${remainingHours.toFixed(1)} hours remaining out of ${totalDurationHours.toFixed(1)} hours.`);
        
        if (consumedRatio > 0.9) {
          score = 90;
          factors.push('Over 90% of SLA time consumed without resolution.');
        } else if (consumedRatio > 0.75) {
          score = 75;
          factors.push('Over 75% of SLA time consumed.');
        } else if (consumedRatio > 0.5) {
          score = 40;
        } else {
          score = 10;
        }
      }

      if (ticket.priority === 'CRITICAL' || ticket.priority === 'HIGH') {
        score += 15;
        factors.push(`High/Critical ticket priority escalates risk.`);
      }

      score = Math.min(100, Math.max(0, score));
      result.riskScore = score;
      result.confidence = 90;

      if (score >= 80) {
        result.riskLevel = 'CRITICAL';
        actions.push('Escalate immediately to senior agent', 'Notify client manager');
      } else if (score >= 60) {
        result.riskLevel = 'HIGH';
        actions.push('Prioritize execution above normal tickets');
      } else if (score >= 30) {
        result.riskLevel = 'MEDIUM';
        actions.push('Monitor progress');
      } else {
        result.riskLevel = 'LOW';
      }

      result.contributingFactors = factors;
      result.recommendedActions = actions;

      return await this.savePrediction(result as PredictionRecord);
    } catch (error: any) {
      console.error('Error calculating SLA risk:', error);
      throw error;
    }
  }

  /**
   * PROFITABILITY RISK
   */
  static async calculateProfitabilityRisk(companyId: string, contractId: string, lookbackDays: number = 30): Promise<PredictionRecord> {
    const today = new Date();
    const periodStart = subDays(today, lookbackDays);
    const predictionId = `PRED_${companyId}_PROFITABILITY_${contractId}_${format(today, 'yyyy-MM-dd')}`;
    const predictionDate = format(today, 'yyyy-MM-dd');

    const result: Partial<PredictionRecord> = {
      id: predictionId,
      companyId,
      predictionType: 'PROFITABILITY',
      subjectType: 'CONTRACT',
      subjectId: contractId,
      predictionDate,
      analysisPeriodDays: lookbackDays,
      modelVersion: 'RULE_BASED_PROFITABILITY_V1',
      generatedAt: new Date().toISOString(),
      contributingFactors: [],
      recommendedActions: []
    };

    try {
      // 1. Fetch Contract
      const contractSnap = await getDocs(query(collection(db, 'companies', companyId, 'contracts'), where('id', '==', contractId)));
      if (contractSnap.empty) throw new Error('Contract not found');
      const contract = contractSnap.docs[0].data() as ContractRecord;
      result.subjectName = contract.contractNumber || contractId;

      // 2. We need Revenue (Billing Rates) vs Costs (Payroll/Attendance)
      // This requires billing matrices and employee salary profiles for the site/contract.
      // We will perform a simplified estimation based on active billing matrices vs active deployments.
      
      const ratesSnap = await getDocs(query(collection(db, 'companies', companyId, 'billing_rate_matrices'), where('contractId', '==', contractId), where('status', '==', 'ACTIVE')));
      if (ratesSnap.empty) {
        result.dataQuality = 'INSUFFICIENT';
        result.riskScore = null;
        result.riskLevel = 'INSUFFICIENT_DATA';
        result.contributingFactors?.push('No active billing rate matrices found for this contract.');
        return await this.savePrediction(result as PredictionRecord);
      }
      
      const billingRates = ratesSnap.docs.map(d => d.data() as BillingRateMatrixRecord);
      
      // Calculate estimated monthly revenue based on fixed or per_employee rates assuming full deployment
      let estMonthlyRevenue = 0;
      let employeeCountRequired = 0;
      
      for (const br of billingRates) {
        const rateVal = br.rate ?? br.ratePerHour ?? 0;
        if (br.rateType === 'FIXED_MONTHLY') {
          estMonthlyRevenue += rateVal;
        } else if (br.rateType === 'PER_EMPLOYEE' || !br.rateType) {
           // We need to know how many deployed
           const depSnap = await getDocs(query(collection(db, 'companies', companyId, 'deployments'), where('contractId', '==', contractId)));
           const deployedCount = depSnap.docs.length;
           estMonthlyRevenue += (rateVal * (deployedCount || 1));
           employeeCountRequired += deployedCount;
        }
      }

      // If we cannot estimate revenue, return INSUFFICIENT
      if (estMonthlyRevenue === 0) {
        result.dataQuality = 'INSUFFICIENT';
        result.riskScore = null;
        result.riskLevel = 'INSUFFICIENT_DATA';
        result.contributingFactors?.push('Unable to calculate baseline revenue from billing matrices.');
        return await this.savePrediction(result as PredictionRecord);
      }

      // Now estimate costs (Payroll)
      const depSnap = await getDocs(query(collection(db, 'companies', companyId, 'deployments'), where('contractId', '==', contractId), where('status', '==', 'ACTIVE')));
      const activeDeployments = depSnap.docs.map(d => d.data() as any);
      
      let estMonthlyPayrollCost = 0;
      let missingSalaryData = false;

      for (const dep of activeDeployments) {
        const salSnap = await getDocs(query(collection(db, 'companies', companyId, 'employee_salary_profiles'), where('employeeId', '==', dep.employeeId)));
        if (!salSnap.empty) {
          const profile = salSnap.docs[0].data() as EmployeeSalaryProfileRecord;
          estMonthlyPayrollCost += (profile.monthlyCtc || profile.baseMonthlySalary || 0);
        } else {
          missingSalaryData = true;
        }
      }

      result.dataQuality = missingSalaryData ? 'PARTIAL' : 'SUFFICIENT';

      // Profitability Math
      const estGrossProfit = estMonthlyRevenue - estMonthlyPayrollCost;
      const marginPercentage = (estGrossProfit / estMonthlyRevenue) * 100;

      let score = 0;
      const factors: string[] = [];
      const actions: string[] = [];

      factors.push(`Est. Monthly Revenue: ${contract.currency || 'USD'} ${estMonthlyRevenue.toLocaleString()}`);
      factors.push(`Est. Monthly Payroll Cost: ${contract.currency || 'USD'} ${estMonthlyPayrollCost.toLocaleString()}`);
      factors.push(`Est. Gross Margin: ${marginPercentage.toFixed(1)}%`);

      if (marginPercentage < 0) {
        score = 90;
        factors.push('Contract is operating at a loss based on direct payroll costs.');
      } else if (marginPercentage < 10) {
        score = 70;
        factors.push('Critically low profit margin (< 10%).');
      } else if (marginPercentage < 20) {
        score = 40;
        factors.push('Below target profit margin (< 20%).');
      } else {
        score = 10;
      }

      if (missingSalaryData) {
        factors.push('Note: Missing salary data for some deployed employees, cost is likely underestimated.');
        score += 10; // Increase risk due to unknown costs
      }

      score = Math.min(100, Math.max(0, score));
      result.riskScore = score;
      result.confidence = missingSalaryData ? 40 : 80;

      if (score >= 70) {
        result.riskLevel = 'CRITICAL';
        actions.push('Initiate immediate contract renegotiation or cost-reduction review.');
      } else if (score >= 40) {
        result.riskLevel = 'HIGH';
        actions.push('Review staffing optimization opportunities.');
      } else if (score >= 20) {
        result.riskLevel = 'MEDIUM';
        actions.push('Monitor overtime and direct costs.');
      } else {
        result.riskLevel = 'LOW';
      }

      result.contributingFactors = factors;
      result.recommendedActions = actions;

      return await this.savePrediction(result as PredictionRecord);
    } catch (error: any) {
      console.error('Error calculating Profitability risk:', error);
      throw error;
    }
  }

  private static async savePrediction(prediction: PredictionRecord): Promise<PredictionRecord> {
    const docRef = doc(db, 'companies', prediction.companyId, 'predictions', prediction.id);
    await setDoc(docRef, prediction);
    return prediction;
  }

  static async getLatestPredictionsByType(companyId: string, type: PredictionType, limitCount: number = 20): Promise<PredictionRecord[]> {
    const q = query(
      collection(db, 'companies', companyId, 'predictions'),
      where('predictionType', '==', type),
      orderBy('predictionDate', 'desc'),
      limit(limitCount)
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as PredictionRecord);
  }
}
