import { QueryConstraint, where } from 'firebase/firestore';
import { UserSession } from '../types';
import { RbacService } from './rbacService';

export class QueryScopeEngine {
  /**
   * Builds the query constraints based on the user's authority level and the data context.
   * Prevents unauthorized ground staff from downloading global data.
   */
  static buildScope(
    session: UserSession,
    collectionType: 'EMPLOYEES' | 'ATTENDANCE' | 'LEAVES' | 'ASSETS' | 'INCIDENTS' | 'VISITORS' | 'MATERIALS' | 'PAYROLL' | 'APPROVALS' | 'TASKS' | 'ANNOUNCEMENTS' | 'DOCUMENTS' | 'LOGS' | 'AUDIT_LOGS' | 'CLIENTS' | 'DEPLOYMENTS' | 'SHIFT_ROSTERS' | 'SITE_OPERATIONS' | 'RFQS' | 'RFQ_BIDS' | 'VENDORS' | 'REFRESHER_CONFIGS' | 'REFRESHER_STATUSES'
  ): QueryConstraint[] {
    const authority = RbacService.getAuthorityLevel(session);
    const constraints: QueryConstraint[] = [];

    // Global overrides for top management and HR/Admin (Official Staff mapped to global)
    const isGlobal = 
      session.role === 'SUPER_ADMIN' || 
      ['A0_OWNER', 'A1_DIRECTOR_CEO', 'A2_GENERAL_MANAGER'].includes(authority) ||
      (authority === 'A3_OFFICIAL_STAFF' && ['COMPANY_ADMIN', 'HR_ADMIN', 'FINANCE', 'OPERATIONS_OFFICE'].includes(session.role));

    if (isGlobal) {
      return constraints; // No additional where clauses, full company scope applies.
    }

    // Regional/Area Managers (A4)
    if (authority === 'A4_REGIONAL_AREA_MANAGER' && session.assignedRegionId) {
      if (['EMPLOYEES'].includes(collectionType)) {
        constraints.push(where('assignedRegionId', '==', session.assignedRegionId));
      } else if (['ATTENDANCE', 'INCIDENTS', 'VISITORS', 'MATERIALS', 'LEAVES', 'ASSETS', 'TASKS', 'ANNOUNCEMENTS', 'DOCUMENTS', 'LOGS', 'AUDIT_LOGS', 'DEPLOYMENTS', 'SHIFT_ROSTERS', 'CLIENTS', 'SITE_OPERATIONS'].includes(collectionType)) {
        constraints.push(where('assignedRegionId', '==', session.assignedRegionId));
      }
      return constraints;
    }

    // Site In-Charge (A5)
    if (authority === 'A5_SITE_IN_CHARGE' && session.assignedSiteId) {
      if (['EMPLOYEES'].includes(collectionType)) {
        constraints.push(where('assignedSiteId', '==', session.assignedSiteId));
      } else if (['ATTENDANCE', 'INCIDENTS', 'VISITORS', 'MATERIALS', 'LEAVES', 'ASSETS', 'TASKS', 'ANNOUNCEMENTS', 'DOCUMENTS', 'LOGS', 'AUDIT_LOGS', 'DEPLOYMENTS', 'SHIFT_ROSTERS', 'SITE_OPERATIONS'].includes(collectionType)) {
        constraints.push(where('siteId', '==', session.assignedSiteId));
      } else {
        return constraints;
      }
      return constraints;
    }

    // Supervisor (A6)
    if (authority === 'A6_SUPERVISOR' && session.assignedSiteId) {
      if (['EMPLOYEES'].includes(collectionType)) {
        constraints.push(where('assignedSiteId', '==', session.assignedSiteId));
      } else if (['ATTENDANCE', 'INCIDENTS', 'VISITORS', 'MATERIALS', 'LEAVES', 'ASSETS', 'TASKS', 'ANNOUNCEMENTS', 'DOCUMENTS', 'LOGS', 'AUDIT_LOGS', 'DEPLOYMENTS', 'SHIFT_ROSTERS', 'SITE_OPERATIONS'].includes(collectionType)) {
        constraints.push(where('siteId', '==', session.assignedSiteId));
      } else {
        return constraints;
      }
      return constraints;
    }

    // Ground Workforce (A7, A8, A9)
    if (['A7_SKILLED', 'A8_SEMI_SKILLED', 'A9_SUPPORT'].includes(authority) && session.employeeId) {
      if (['EMPLOYEES', 'ATTENDANCE', 'LEAVES', 'PAYROLL', 'REFRESHER_STATUSES'].includes(collectionType)) {
        constraints.push(where('employeeId', '==', session.employeeId));
      } else if (collectionType === 'ASSETS') {
        constraints.push(where('assignedEmployeeId', '==', session.employeeId));
      } else if (collectionType === 'INCIDENTS') {
        constraints.push(where('reportedById', '==', session.employeeId));
      } else if (collectionType === 'ANNOUNCEMENTS') {
        // Broadcasters filter on client side based on targetAudience
      } else if (collectionType === 'TASKS') {
        constraints.push(where('assignedTo', '==', session.employeeId));
      } else if (collectionType === 'VISITORS' || collectionType === 'MATERIALS' || collectionType === 'LOGS' || collectionType === 'SITE_OPERATIONS') {
        // Ground staff usually see logs for their assigned site if they have access
        if (session.assignedSiteId) {
          constraints.push(where('siteId', '==', session.assignedSiteId));
        } else {
          constraints.push(where('employeeId', '==', session.employeeId));
        }
      } else if (collectionType === 'APPROVALS') {
        // Approval doesn't have employeeId, it has 'uid'
        constraints.push(where('uid', '==', session.userId));
      } else if (collectionType === 'CLIENTS') {
        // Ground staff do not need full client records usually, but if needed, we can restrict to their assignedSiteId? 
        // For now, no access to CLIENTS collection directly for A7-A9
        constraints.push(where('employeeId', '==', session.employeeId || 'UNAUTHORIZED'));
      } else {
        // Fallback lock
        constraints.push(where('employeeId', '==', session.employeeId));
      }
      return constraints;
    }

    // Default safety lock
    return [where('employeeId', '==', session.employeeId || 'UNAUTHORIZED')];
  }
}
