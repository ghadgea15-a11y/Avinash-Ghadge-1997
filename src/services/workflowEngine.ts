import { UserSession, AuthorityLevel, UserRole } from '../types';
import { RbacService } from './rbacService';

export type WorkflowContextType = 
  | 'ACCOUNT_APPROVAL'
  | 'LEAVE_REQUEST'
  | 'ATTENDANCE_CORRECTION'
  | 'ONBOARDING'
  | 'SALARY_ADVANCE'
  | 'PAYROLL_CYCLE'
  | 'MATERIAL_GATE_PASS'
  | 'INCIDENT_ESCALATION'
  | 'PROMOTION'
  | 'TRANSFER'
  | 'EXIT';

export interface WorkflowContext {
  companyId: string;
  targetSiteId?: string;
  targetRegionId?: string;
  targetDepartmentId?: string;
  daysCount?: number;
  amount?: number;
  requestorRole?: UserRole;
  requestorAuthority?: AuthorityLevel;
}

export interface WorkflowResolution {
  canApprove: boolean;
  reason?: string;
  requiredAuthorityLevel?: AuthorityLevel[];
}

export class WorkflowEngine {
  /**
   * Resolves whether the current session has authority to approve a specific request context.
   */
  static resolveApprovalAuthority(
    session: UserSession,
    type: WorkflowContextType,
    context: WorkflowContext
  ): WorkflowResolution {
    // 1. Super Admin Bypass
    if (session.role === 'SUPER_ADMIN') {
      return { canApprove: true };
    }

    // 2. Company Boundary Check
    if (session.companyId !== context.companyId) {
      return { canApprove: false, reason: 'Cross-company workflow approval is strictly prohibited.' };
    }

    const authority = RbacService.getAuthorityLevel(session);

    // 3. Geographic / Jurisdiction Boundary Check
    if (authority === 'A5_SITE_IN_CHARGE' || authority === 'A6_SUPERVISOR') {
      if (context.targetSiteId && session.assignedSiteId !== context.targetSiteId) {
        return { canApprove: false, reason: 'This request belongs to a different site outside your jurisdiction.' };
      }
    }
    // Region checks could be added here if session.assignedRegionId is mapped.

    // 4. Workflow Specific Logic
    switch (type) {
      case 'LEAVE_REQUEST':
        return WorkflowEngine.resolveLeaveRequest(authority, session, context);
      case 'ATTENDANCE_CORRECTION':
        return WorkflowEngine.resolveAttendanceCorrection(authority, session, context);
      case 'ACCOUNT_APPROVAL':
        return WorkflowEngine.resolveAccountApproval(authority, session, context);
      case 'ONBOARDING':
        return WorkflowEngine.resolveOnboarding(authority, session, context);
      case 'SALARY_ADVANCE':
      case 'PAYROLL_CYCLE':
        return WorkflowEngine.resolveFinancialApproval(authority, session, context);
      case 'MATERIAL_GATE_PASS':
        return WorkflowEngine.resolveMaterialPass(authority, session, context);
      case 'PROMOTION':
      case 'TRANSFER':
      case 'EXIT':
        return WorkflowEngine.resolveLifecycleApproval(authority, session, context);
      default:
        // By default, fallback to checking if they have at least Official Staff privileges
        const baseAllowed: AuthorityLevel[] = ['A0_OWNER', 'A1_DIRECTOR_CEO', 'A2_GENERAL_MANAGER', 'A3_OFFICIAL_STAFF'];
        if (baseAllowed.includes(authority)) {
          return { canApprove: true };
        }
        return { canApprove: false, reason: 'Insufficient authority level for this workflow.' };
    }
  }

  private static resolveLeaveRequest(auth: AuthorityLevel, session: UserSession, ctx: WorkflowContext): WorkflowResolution {
    const days = ctx.daysCount || 0;
    
    // Supervisors can approve <= 2 days
    if (auth === 'A6_SUPERVISOR') {
      if (days > 2) return { canApprove: false, reason: 'Leave duration exceeds Supervisor limits (Max 2 days). Escalation required.' };
      return { canApprove: true };
    }
    
    // Site In-Charge can approve <= 5 days
    if (auth === 'A5_SITE_IN_CHARGE') {
      if (days > 5) return { canApprove: false, reason: 'Leave duration exceeds Site Manager limits (Max 5 days). Escalation required.' };
      return { canApprove: true };
    }

    // HR and above can approve any
    const higherAuth: AuthorityLevel[] = ['A0_OWNER', 'A1_DIRECTOR_CEO', 'A2_GENERAL_MANAGER', 'A3_OFFICIAL_STAFF', 'A4_REGIONAL_AREA_MANAGER'];
    if (higherAuth.includes(auth)) {
      if (auth === 'A3_OFFICIAL_STAFF' && !['HR', 'HR_ADMIN', 'COMPANY_ADMIN'].includes(session.role)) {
        return { canApprove: false, reason: 'Only HR or Corporate Admin can approve global leaves.' };
      }
      return { canApprove: true };
    }

    return { canApprove: false, reason: 'Insufficient authority to approve leaves.' };
  }

  private static resolveAttendanceCorrection(auth: AuthorityLevel, session: UserSession, ctx: WorkflowContext): WorkflowResolution {
    // Site In-Charge and above can approve attendance corrections
    const allowed: AuthorityLevel[] = ['A0_OWNER', 'A1_DIRECTOR_CEO', 'A2_GENERAL_MANAGER', 'A3_OFFICIAL_STAFF', 'A4_REGIONAL_AREA_MANAGER', 'A5_SITE_IN_CHARGE'];
    if (allowed.includes(auth)) {
      if (auth === 'A3_OFFICIAL_STAFF' && !['HR', 'HR_ADMIN', 'COMPANY_ADMIN', 'OPERATIONS_OFFICE'].includes(session.role)) {
         return { canApprove: false, reason: 'Only HR or Operations can approve attendance corrections.' };
      }
      return { canApprove: true };
    }
    return { canApprove: false, reason: 'Supervisors cannot approve attendance corrections.' };
  }

  private static resolveAccountApproval(auth: AuthorityLevel, session: UserSession, ctx: WorkflowContext): WorkflowResolution {
    const allowed: AuthorityLevel[] = ['A0_OWNER', 'A1_DIRECTOR_CEO', 'A2_GENERAL_MANAGER', 'A3_OFFICIAL_STAFF'];
    if (allowed.includes(auth)) {
      if (auth === 'A3_OFFICIAL_STAFF' && !['HR', 'HR_ADMIN', 'COMPANY_ADMIN'].includes(session.role)) {
         return { canApprove: false, reason: 'Only HR or Company Admin can approve system accounts.' };
      }
      return { canApprove: true };
    }
    return { canApprove: false, reason: 'System account approvals require corporate authority.' };
  }

  private static resolveOnboarding(auth: AuthorityLevel, session: UserSession, ctx: WorkflowContext): WorkflowResolution {
    return this.resolveAccountApproval(auth, session, ctx); // Follows similar rules to account approval
  }

  private static resolveFinancialApproval(auth: AuthorityLevel, session: UserSession, ctx: WorkflowContext): WorkflowResolution {
    const allowed: AuthorityLevel[] = ['A0_OWNER', 'A1_DIRECTOR_CEO', 'A2_GENERAL_MANAGER', 'A3_OFFICIAL_STAFF'];
    if (allowed.includes(auth)) {
      if (auth === 'A3_OFFICIAL_STAFF' && !['FINANCE', 'FINANCE_MANAGER', 'COMPANY_ADMIN', 'HR_ADMIN'].includes(session.role)) {
         return { canApprove: false, reason: 'Only Finance or Top Management can approve financial requests.' };
      }
      return { canApprove: true };
    }
    return { canApprove: false, reason: 'Site and Area managers cannot approve direct financial requests in Phase A.' };
  }

  private static resolveMaterialPass(auth: AuthorityLevel, session: UserSession, ctx: WorkflowContext): WorkflowResolution {
    // Site In-Charge is typically the minimum required for an outward gate pass
    const allowed: AuthorityLevel[] = ['A0_OWNER', 'A1_DIRECTOR_CEO', 'A2_GENERAL_MANAGER', 'A3_OFFICIAL_STAFF', 'A4_REGIONAL_AREA_MANAGER', 'A5_SITE_IN_CHARGE'];
    if (allowed.includes(auth)) {
      if (auth === 'A3_OFFICIAL_STAFF' && !['ADMIN', 'PROCUREMENT', 'OPERATIONS_OFFICE', 'COMPANY_ADMIN'].includes(session.role)) {
         return { canApprove: false, reason: 'Your department does not have material approval authority.' };
      }
      return { canApprove: true };
    }
    return { canApprove: false, reason: 'Supervisors cannot authorize outward material passes.' };
  }

  private static resolveLifecycleApproval(auth: AuthorityLevel, session: UserSession, ctx: WorkflowContext): WorkflowResolution {
    // Lifecycle changes (Promotion, Transfer, Exit) require Corporate/Senior management authority
    const allowed: AuthorityLevel[] = ['A0_OWNER', 'A1_DIRECTOR_CEO', 'A2_GENERAL_MANAGER', 'A3_OFFICIAL_STAFF', 'A4_REGIONAL_AREA_MANAGER'];
    if (allowed.includes(auth)) {
      if (auth === 'A3_OFFICIAL_STAFF' && !['HR', 'HR_ADMIN', 'COMPANY_ADMIN', 'OPERATIONS_OFFICE'].includes(session.role)) {
         return { canApprove: false, reason: 'Only HR, Operations Office, or Company Admin can approve employee lifecycle changes.' };
      }
      return { canApprove: true };
    }
    return { canApprove: false, reason: 'Site managers and supervisors cannot approve corporate lifecycle transitions.' };
  }
}
