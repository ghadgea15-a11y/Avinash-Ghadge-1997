import { db } from '../firebase';
import { collection, doc, getDoc, getDocs, setDoc, query, where, writeBatch, Timestamp, updateDoc } from 'firebase/firestore';
import { EmployeeRecord, SiteRecord, DepartmentRecord, RegionRecord, BranchRecord } from '../types';

export interface OrgAssignment {
  id: string;
  companyId: string;
  employeeId: string;
  type: 'TRANSFER' | 'TEMPORARY' | 'DELEGATION';
  roleType: 'MANAGER' | 'SUPERVISOR' | 'OPERATIONAL';
  targetType: 'REGION' | 'BRANCH' | 'SITE' | 'DEPARTMENT';
  targetId: string;
  shiftId?: string;
  effectiveFrom: string;
  effectiveTo?: string; // For temporary
  status: 'PENDING_APPROVAL' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  createdBy: string;
  createdAt: string;
  approvedBy?: string;
  approvedAt?: string;
  notes?: string;
  replacedEmployeeId?: string;
}

export class OrgControlService {
  // Check if a site has an active manager
  static async validateSiteManagement(companyId: string, siteId: string): Promise<{ valid: boolean; managerId?: string; error?: string }> {
    const q = query(collection(db, 'companies', companyId, 'employees'), 
      where('assignedSiteId', '==', siteId),
      where('status', '==', 'ACTIVE')
    );
    const snap = await getDocs(q);
    const employees = snap.docs.map(d => d.data() as EmployeeRecord);
    
    // In our system, role or authorityLevel defines manager
    const managers = employees.filter(e => ((e as any).authorityLevel === 'HIGH') || e.role === 'COMPANY_ADMIN' || e.role === 'HR_ADMIN' || ((e as any).role === 'MANAGER') || e.role === 'SUPERVISOR');
    
    if (managers.length === 0) {
      return { valid: false, error: 'Site has no responsible management.' };
    }
    return { valid: true, managerId: managers[0].id };
  }

  // Check if an employee has valid assignment
  static async validateEmployeeAssignment(employee: Partial<EmployeeRecord>): Promise<{ valid: boolean; error?: string }> {
    if (!employee.assignedRegionId || !employee.assignedBranchId || !employee.assignedSiteId || !employee.departmentId) {
      return { valid: false, error: 'Employee is missing organizational ownership (Region, Branch, Site, or Department).' };
    }
    if (employee.workforceCategory === 'OPERATIONS' && !employee.shiftId) {
      return { valid: false, error: 'Operational employee must have a valid shift assignment.' };
    }
    return { valid: true };
  }

  // Submit transfer or temporary assignment
  static async submitAssignment(
    companyId: string, 
    assignment: Omit<OrgAssignment, 'id' | 'createdAt' | 'status'>,
    autoApprove = false
  ): Promise<string> {
    const id = `ORG-${Date.now()}`;
    const ref = doc(db, 'companies', companyId, 'orgAssignments', id);
    const payload: OrgAssignment = {
      ...assignment,
      id,
      companyId,
      status: autoApprove ? 'ACTIVE' : 'PENDING_APPROVAL',
      createdAt: new Date().toISOString(),
      ...(autoApprove && { approvedBy: assignment.createdBy, approvedAt: new Date().toISOString() })
    };

    if (autoApprove) {
      await this.applyAssignmentAtomic(companyId, payload);
    } else {
      await setDoc(ref, payload);
    }
    return id;
  }

  static async applyAssignmentAtomic(companyId: string, assignment: OrgAssignment): Promise<void> {
    const batch = writeBatch(db);
    const empRef = doc(db, 'companies', companyId, 'employees', assignment.employeeId);
    
    // Save assignment record
    const assignmentRef = doc(db, 'companies', companyId, 'orgAssignments', assignment.id);
    batch.set(assignmentRef, assignment, { merge: true });

    // Update employee record
    const updates: Partial<EmployeeRecord> = { updatedAt: new Date().toISOString() };
    if (assignment.targetType === 'SITE') {
      updates.assignedSiteId = assignment.targetId;
    } else if (assignment.targetType === 'BRANCH') {
      updates.assignedBranchId = assignment.targetId;
    } else if (assignment.targetType === 'REGION') {
      updates.assignedRegionId = assignment.targetId;
    } else if (assignment.targetType === 'DEPARTMENT') {
      updates.departmentId = assignment.targetId;
    }

    if (assignment.shiftId) {
      updates.shiftId = assignment.shiftId;
    }

    // We can fetch the employee to validate scope, but doing it outside for simplicity
    batch.update(empRef, updates);

    // Audit log
    const auditRef = doc(collection(db, 'companies', companyId, 'audit_logs'));
    batch.set(auditRef, {
      id: auditRef.id,
      companyId,
      action: 'ORG_ASSIGNMENT_APPLIED',
      userId: assignment.createdBy,
      details: `Assignment ${assignment.type} applied for ${assignment.employeeId} to ${assignment.targetType} ${assignment.targetId}`,
      timestamp: new Date().toISOString()
    });

    await batch.commit();
  }

  static async approveAssignment(companyId: string, assignmentId: string, approverId: string): Promise<void> {
    const ref = doc(db, 'companies', companyId, 'orgAssignments', assignmentId);
    const snap = await getDoc(ref);
    if (!snap.exists()) throw new Error('Assignment not found');
    const assignment = snap.data() as OrgAssignment;

    if (assignment.status !== 'PENDING_APPROVAL') {
      throw new Error('Assignment is not pending approval');
    }

    assignment.status = 'ACTIVE';
    assignment.approvedBy = approverId;
    assignment.approvedAt = new Date().toISOString();

    await this.applyAssignmentAtomic(companyId, assignment);
  }
}
