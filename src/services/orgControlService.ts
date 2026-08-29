import { collection, query, where, getDocs, setDoc, doc, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { EmployeeRecord, UserSession } from '../types';
import { AuditTrailService } from './auditTrailService';

export interface OrgAssignment {
  id?: string;
  companyId: string;
  employeeId: string;
  type: 'TRANSFER' | 'TEMPORARY' | 'DELEGATION';
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'ACTIVE' | 'EXPIRED';
  roleType: 'MANAGER' | 'SUPERVISOR' | 'OPERATIONAL';
  targetType: 'REGION' | 'BRANCH' | 'SITE' | 'DEPARTMENT' | 'GROUP';
  targetId: string;
  effectiveFrom: string;
  effectiveTo?: string;
  notes?: string;
  createdBy: string;
  createdAt?: string;
  approvedBy?: string;
  approvedAt?: string;
}

export class OrgControlService {
  /**
   * Validates if a site has at least one active manager assigned.
   */
  static async validateSiteManagement(companyId: string, siteId: string): Promise<{valid: boolean; error?: string}> {
    try {
      const colRef = collection(db, 'companies', companyId, 'orgAssignments');
      const q = query(
        colRef, 
        where('targetType', '==', 'SITE'),
        where('targetId', '==', siteId),
        where('status', '==', 'ACTIVE'),
        where('roleType', '==', 'MANAGER'),
        limit(1)
      );
      
      const snap = await getDocs(q);
      if (snap.empty) {
        return { valid: false, error: 'No active Manager assigned to this site.' };
      }
      return { valid: true };
    } catch (err: any) {
      return { valid: false, error: err.message };
    }
  }

  /**
   * Validates if an employee has a valid primary assignment scope.
   */
  static async validateEmployeeAssignment(employee: EmployeeRecord): Promise<{valid: boolean; error?: string}> {
    if (!employee.assignedSiteId && !employee.assignedRegionId && !employee.departmentId) {
      return { valid: false, error: 'Employee has no assigned organizational scope (Site/Region/Dept).' };
    }
    return { valid: true };
  }

  /**
   * Submits a new organizational assignment for approval or immediate effect.
   */
  static async submitAssignment(
    session: UserSession, 
    assignment: Omit<OrgAssignment, 'createdBy' | 'companyId'>, 
    autoApprove = false
  ): Promise<void> {
    const companyId = session.companyId;
    const id = `ASG_${Date.now()}_${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const docRef = doc(db, 'companies', companyId, 'orgAssignments', id);
    
    const finalAssignment: OrgAssignment = {
      ...assignment,
      id,
      companyId,
      createdBy: session.userId,
      status: autoApprove ? 'ACTIVE' : 'PENDING',
      createdAt: new Date().toISOString()
    };

    await setDoc(docRef, finalAssignment);

    if (autoApprove) {
      await this.applyAssignmentEffect(companyId, finalAssignment);
    }

    // Log real audit event
    await AuditTrailService.logAction(
      session,
      'ORGANIZATION',
      'SUBMIT_ASSIGNMENT',
      'EMPLOYEE',
      assignment.employeeId,
      true,
      'INFO',
      `Submitted ${assignment.type} for employee ${assignment.employeeId} to ${assignment.targetType} ${assignment.targetId}`,
      { assignmentId: id, autoApprove }
    );
  }

  /**
   * Applies the functional changes of an assignment to the core employee record.
   */
  private static async applyAssignmentEffect(companyId: string, assignment: OrgAssignment): Promise<void> {
    const empRef = doc(db, 'companies', companyId, 'employees', assignment.employeeId);
    const updates: any = { 
      updatedAt: new Date().toISOString() 
    };

    switch (assignment.targetType) {
      case 'SITE':
        updates.assignedSiteId = assignment.targetId;
        break;
      case 'REGION':
        updates.assignedRegionId = assignment.targetId;
        break;
      case 'DEPARTMENT':
        updates.departmentId = assignment.targetId;
        break;
      case 'GROUP':
        updates.groupId = assignment.targetId;
        break;
    }

    // If it's a manager role, we might update other flags too
    if (assignment.roleType === 'MANAGER' || assignment.roleType === 'SUPERVISOR') {
      updates.isManager = true;
      updates.authorityLevel = assignment.roleType === 'MANAGER' ? 'A5_SITE_IN_CHARGE' : 'A6_SUPERVISOR';
    }

    await setDoc(empRef, updates, { merge: true });
  }

  /**
   * Evaluates organization health rules and returns a score or count of issues.
   * Real implementation checking for common enterprise structural gaps.
   */
  static async evaluateRules(companyId: string): Promise<{issues: number; details: string[]}> {
    const details: string[] = [];
    let issues = 0;

    try {
      // 1. Check for Employees without site/region
      const empRef = collection(db, 'companies', companyId, 'employees');
      const empSnap = await getDocs(query(empRef, where('status', '==', 'ACTIVE')));
      
      const orphanedEmps = empSnap.docs.filter(d => {
        const data = d.data();
        return !data.assignedSiteId && !data.assignedRegionId && !data.departmentId;
      });

      if (orphanedEmps.length > 0) {
        issues += orphanedEmps.length;
        details.push(`${orphanedEmps.length} active employees have no organizational assignment.`);
      }

      // 2. Check for Sites without Managers
      const sitesRef = collection(db, 'companies', companyId, 'sites');
      const sitesSnap = await getDocs(query(sitesRef, where('status', '==', 'ACTIVE')));
      
      for (const siteDoc of sitesSnap.docs) {
        const mgtRes = await this.validateSiteManagement(companyId, siteDoc.id);
        if (!mgtRes.valid) {
          issues++;
          details.push(`Site "${siteDoc.data().name || siteDoc.id}" has no active manager assigned.`);
        }
      }

    } catch (err) {
      console.error('[OrgControlService] Error evaluating rules:', err);
    }

    return { issues, details };
  }
}
