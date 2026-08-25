import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { UserSession } from '../types';


export interface IntelligenceFilters {
  companyId: string;
  startDate: string; // ISO
  endDate: string; // ISO
  regionId?: string;
  branchId?: string;
  siteId?: string;
  departmentId?: string;
}

export interface IntelligenceResult {
  filters: IntelligenceFilters;
  generatedAt: string;
  workforce: {
    totalActive: number;
    presentToday: number;
    onLeaveToday: number;
    absentToday: number;
    exceptions: any[]; // late, missing punch
  };
  operations: {
    openIncidents: number;
    criticalIncidents: number;
    incidentDetails: any[];
    openWorkOrders: number;
    overdueWorkOrders: number;
    workOrderDetails: any[];
  };
  compliance: {
    pendingApprovals: number;
    approvalDetails: any[];
    overdueAudits: number;
  };
  financial: {
    payrollExceptions: number;
    contractRenewals: number;
  };
}

export class EnterpriseIntelligenceService {
  static async getRealTimeIntelligence(session: UserSession, filters: IntelligenceFilters): Promise<IntelligenceResult> {
    const { companyId, startDate, endDate, regionId, branchId, siteId, departmentId } = filters;
    
    // RBAC check: only appropriate roles should query cross-department/site unless scoped
    // We assume the caller (UI) scopes the filters appropriately based on the session's assigned bounds.

    const result: IntelligenceResult = {
      filters,
      generatedAt: new Date().toISOString(),
      workforce: { totalActive: 0, presentToday: 0, onLeaveToday: 0, absentToday: 0, exceptions: [] },
      operations: { openIncidents: 0, criticalIncidents: 0, incidentDetails: [], openWorkOrders: 0, overdueWorkOrders: 0, workOrderDetails: [] },
      compliance: { pendingApprovals: 0, approvalDetails: [], overdueAudits: 0 },
      financial: { payrollExceptions: 0, contractRenewals: 0 }
    };

    // Build base queries
    // 1. Employees
    let empQuery = query(collection(db, 'companies', companyId, 'employees'), where('status', '==', 'ACTIVE'));
    if (regionId) empQuery = query(empQuery, where('regionId', '==', regionId));
    if (branchId) empQuery = query(empQuery, where('branchId', '==', branchId));
    if (siteId) empQuery = query(empQuery, where('siteId', '==', siteId));
    if (departmentId) empQuery = query(empQuery, where('departmentId', '==', departmentId));

    const empSnap = await getDocs(empQuery);
    result.workforce.totalActive = empSnap.size;
    const empIds = empSnap.docs.map(d => d.id);

    // 2. Attendance (for the start date, assuming we look at today or a specific day)
    // To avoid massive reads, we query attendance where date >= startDate and <= endDate
    // Note: Firestore 'in' query supports up to 30. We'll query by company and date, then filter by empIds in memory.
    const attQuery = query(
      collection(db, 'companies', companyId, 'attendance'),
      where('date', '>=', startDate.split('T')[0]),
      where('date', '<=', endDate.split('T')[0])
    );
    const attSnap = await getDocs(attQuery);
    const attendanceRecords = attSnap.docs.map(d => d.data() as any);
    
    // Filter attendance by valid employees
    const validAttendance = attendanceRecords.filter(a => empIds.includes(a.employeeId));
    
    // Calculate workforce metrics for the latest date in the range (or aggregate, but usually it's "today")
    const presentIds = new Set(validAttendance.map(a => a.employeeId));
    result.workforce.presentToday = presentIds.size;
    
    // Leaves
    const leaveQuery = query(
      collection(db, 'companies', companyId, 'leave_requests'),
      where('status', '==', 'APPROVED')
    );
    const leaveSnap = await getDocs(leaveQuery);
    const leaveRecords = leaveSnap.docs.map(d => d.data() as any);
    
    // Check who is on leave on startDate
    const targetDateStr = startDate.split('T')[0];
    const targetTime = new Date(startDate).getTime();
    const validLeaves = leaveRecords.filter(l => {
      if (!empIds.includes(l.employeeId)) return false;
      const ls = new Date(l.startDate).getTime();
      const le = new Date(l.endDate).getTime();
      return targetTime >= ls && targetTime <= le;
    });
    result.workforce.onLeaveToday = new Set(validLeaves.map(l => l.employeeId)).size;
    
    result.workforce.absentToday = Math.max(0, result.workforce.totalActive - result.workforce.presentToday - result.workforce.onLeaveToday);

    // Exceptions (missing punches, late)
    result.workforce.exceptions = validAttendance.filter(a => 
      (a.status === 'LATE' || a.status === 'MISSING_PUNCH' || !a.checkOutTime)
    );

    // 3. Incidents
    let incQuery = query(collection(db, 'companies', companyId, 'incident_reports'), where('status', 'in', ['OPEN', 'UNDER_INVESTIGATION', 'IN_PROGRESS', 'ESCALATED']));
    if (siteId) incQuery = query(incQuery, where('siteId', '==', siteId));
    else if (branchId) incQuery = query(incQuery, where('assignedBranchId', '==', branchId));
    else if (regionId) incQuery = query(incQuery, where('assignedRegionId', '==', regionId));

    const incSnap = await getDocs(incQuery);
    const incidents = incSnap.docs.map(d => d.data() as any);
    result.operations.openIncidents = incidents.length;
    result.operations.criticalIncidents = incidents.filter(i => i.severity === 'CRITICAL' || i.severity === 'HIGH').length;
    result.operations.incidentDetails = incidents;

    // 4. Work Orders (Maintenance)
    let woQuery = query(collection(db, 'companies', companyId, 'work_orders'), where('status', 'in', ['OPEN', 'IN_PROGRESS', 'PENDING_PARTS']));
    if (siteId) woQuery = query(woQuery, where('siteId', '==', siteId));
    
    const woSnap = await getDocs(woQuery);
    const workOrders = woSnap.docs.map(d => d.data() as any);
    result.operations.openWorkOrders = workOrders.length;
    
    const nowMs = Date.now();
    result.operations.workOrderDetails = workOrders;
    result.operations.overdueWorkOrders = workOrders.filter(w => {
      if (!w.dueDate) return false;
      return new Date(w.dueDate).getTime() < nowMs;
    }).length;

    // 5. Approvals
    let appQuery = query(collection(db, 'companies', companyId, 'approval_requests'), where('status', '==', 'PENDING'));
    // Optionally scope to current user if not a global admin
    // if (session.role !== 'SUPER_ADMIN' && session.role !== 'COMPANY_ADMIN' ...) 
    const appSnap = await getDocs(appQuery);
    const approvals = appSnap.docs.map(d => d.data() as any);
    result.compliance.pendingApprovals = approvals.length;
    result.compliance.approvalDetails = approvals;

    // 6. Contracts
    let contractQuery = query(collection(db, 'companies', companyId, 'contracts'), where('status', 'in', ['ACTIVE', 'EXPIRING_SOON']));
    const contractSnap = await getDocs(contractQuery);
    const contracts = contractSnap.docs.map(d => d.data() as any);
    result.financial.contractRenewals = contracts.filter(c => c.status === 'EXPIRING_SOON' || (c.endDate && new Date(c.endDate).getTime() < nowMs + 30 * 24 * 3600 * 1000)).length;

    // 7. Security Audits
    let auditQuery = query(collection(db, 'companies', companyId, 'security_audits'), where('status', 'in', ['SCHEDULED', 'OVERDUE']));
    const auditSnap = await getDocs(auditQuery);
    result.compliance.overdueAudits = auditSnap.docs.filter(d => d.data().status === 'OVERDUE' || (d.data().dueDate && new Date(d.data().dueDate).getTime() < nowMs)).length;

    // 8. Payroll
    let payrollQuery = query(collection(db, 'companies', companyId, 'payroll_cycles'), where('status', '==', 'PROCESSING_ERROR'));
    const payrollSnap = await getDocs(payrollQuery);
    result.financial.payrollExceptions = payrollSnap.size;

    return result;
  }
}
