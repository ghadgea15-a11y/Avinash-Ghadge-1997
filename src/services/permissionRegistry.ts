import { 
  StandardPermission, 
  PermissionDefinition, 
  EnterpriseModule, 
  PermissionSubmodule, 
  PermissionAction, 
  AccessContext, 
  PrivilegeCheckResult 
} from '../types/permissions';
import { UserRole, AuthorityLevel, DataScope, UserSession, AppModuleKey } from '../types';

export class PermissionRegistry {
  private static readonly AUTHORITY_RANK: Record<AuthorityLevel, number> = {
    'A0_OWNER': 100,
    'A1_DIRECTOR_CEO': 90,
    'A2_GENERAL_MANAGER': 80,
    'A3_OFFICIAL_STAFF': 70,
    'A4_REGIONAL_AREA_MANAGER': 60,
    'A5_SITE_IN_CHARGE': 50,
    'A6_SUPERVISOR': 40,
    'A7_SKILLED': 30,
    'A8_SEMI_SKILLED': 20,
    'A9_SUPPORT': 10
  };

  private static readonly SCOPE_RANK: Record<DataScope, number> = {
    'GLOBAL': 100,
    'COMPANY': 80,
    'REGION': 60,
    'AREA': 50,
    'BRANCH': 40,
    'SITE': 30,
    'SELF': 10
  };

  /**
   * Complete catalog of standard enterprise permissions across Modules 1 to 10
   */
  public static readonly PERMISSIONS: Record<string, PermissionDefinition> = {
    // -------------------------------------------------------------
    // MODULE 1: HCM
    // -------------------------------------------------------------
    'HCM:EMPLOYEE:READ': {
      code: 'HCM:EMPLOYEE:READ',
      module: 'HCM',
      submodule: 'EMPLOYEE',
      action: 'READ',
      name: 'View Employees',
      description: 'View employee records within authorized scope',
      minimumAuthority: 'A9_SUPPORT'
    },
    'HCM:EMPLOYEE:CREATE': {
      code: 'HCM:EMPLOYEE:CREATE',
      module: 'HCM',
      submodule: 'EMPLOYEE',
      action: 'CREATE',
      name: 'Create Employee',
      description: 'Onboard and register new employees',
      minimumAuthority: 'A3_OFFICIAL_STAFF',
      allowedRoles: ['HR_ADMIN', 'HR', 'COMPANY_ADMIN', 'OWNER_PROMOTER', 'DIRECTOR_CEO', 'GENERAL_MANAGER', 'SUPER_ADMIN']
    },
    'HCM:EMPLOYEE:UPDATE': {
      code: 'HCM:EMPLOYEE:UPDATE',
      module: 'HCM',
      submodule: 'EMPLOYEE',
      action: 'UPDATE',
      name: 'Update Employee',
      description: 'Modify employee master data, designation, or department',
      minimumAuthority: 'A3_OFFICIAL_STAFF',
      allowedRoles: ['HR_ADMIN', 'HR', 'COMPANY_ADMIN', 'OWNER_PROMOTER', 'DIRECTOR_CEO', 'GENERAL_MANAGER', 'SUPER_ADMIN']
    },
    'HCM:EMPLOYEE:DELETE': {
      code: 'HCM:EMPLOYEE:DELETE',
      module: 'HCM',
      submodule: 'EMPLOYEE',
      action: 'DELETE',
      name: 'Delete Employee',
      description: 'Archive or remove employee records',
      minimumAuthority: 'A2_GENERAL_MANAGER',
      allowedRoles: ['COMPANY_ADMIN', 'OWNER_PROMOTER', 'DIRECTOR_CEO', 'GENERAL_MANAGER', 'SUPER_ADMIN']
    },
    'HCM:EMPLOYEE:EXPORT': {
      code: 'HCM:EMPLOYEE:EXPORT',
      module: 'HCM',
      submodule: 'EMPLOYEE',
      action: 'EXPORT',
      name: 'Export Employee Roster',
      description: 'Export employee database to Excel or CSV',
      minimumAuthority: 'A3_OFFICIAL_STAFF',
      allowedRoles: ['HR_ADMIN', 'HR', 'COMPANY_ADMIN', 'OWNER_PROMOTER', 'DIRECTOR_CEO', 'GENERAL_MANAGER', 'SUPER_ADMIN']
    },
    'HCM:EMPLOYEE:APPROVE': {
      code: 'HCM:EMPLOYEE:APPROVE',
      module: 'HCM',
      submodule: 'EMPLOYEE',
      action: 'APPROVE',
      name: 'Approve Employee Onboarding',
      description: 'Approve new hire requests and statutory verification',
      minimumAuthority: 'A3_OFFICIAL_STAFF',
      allowedRoles: ['HR_ADMIN', 'HR', 'COMPANY_ADMIN', 'OWNER_PROMOTER', 'DIRECTOR_CEO', 'GENERAL_MANAGER', 'SUPER_ADMIN']
    },
    'HCM:EMPLOYEE:REPORT': {
      code: 'HCM:EMPLOYEE:REPORT',
      module: 'HCM',
      submodule: 'EMPLOYEE',
      action: 'REPORT',
      name: 'View HCM Reports',
      description: 'View headcount and attrition reports',
      minimumAuthority: 'A4_REGIONAL_AREA_MANAGER'
    },
    'HCM:EMPLOYEE:ADMIN': {
      code: 'HCM:EMPLOYEE:ADMIN',
      module: 'HCM',
      submodule: 'EMPLOYEE',
      action: 'ADMIN',
      name: 'HCM System Admin',
      description: 'Configure HCM master tables, fields, and workflow rules',
      minimumAuthority: 'A2_GENERAL_MANAGER',
      allowedRoles: ['COMPANY_ADMIN', 'OWNER_PROMOTER', 'DIRECTOR_CEO', 'SUPER_ADMIN']
    },

    'HCM:ID_BADGE:READ': {
      code: 'HCM:ID_BADGE:READ',
      module: 'HCM',
      submodule: 'ID_BADGE',
      action: 'READ',
      name: 'View ID Badge',
      description: 'View digital ID badge with QR security code',
      minimumAuthority: 'A9_SUPPORT'
    },
    'HCM:ID_BADGE:CREATE': {
      code: 'HCM:ID_BADGE:CREATE',
      module: 'HCM',
      submodule: 'ID_BADGE',
      action: 'CREATE',
      name: 'Generate ID Badge',
      description: 'Issue new employee identity badges',
      minimumAuthority: 'A5_SITE_IN_CHARGE'
    },
    'HCM:ID_BADGE:UPDATE': {
      code: 'HCM:ID_BADGE:UPDATE',
      module: 'HCM',
      submodule: 'ID_BADGE',
      action: 'UPDATE',
      name: 'Update ID Badge',
      description: 'Re-issue or update security parameters on badge',
      minimumAuthority: 'A5_SITE_IN_CHARGE'
    },
    'HCM:ID_BADGE:DELETE': {
      code: 'HCM:ID_BADGE:DELETE',
      module: 'HCM',
      submodule: 'ID_BADGE',
      action: 'DELETE',
      name: 'Revoke ID Badge',
      description: 'Revoke or blacklist identity badge',
      minimumAuthority: 'A3_OFFICIAL_STAFF'
    },
    'HCM:ID_BADGE:EXPORT': {
      code: 'HCM:ID_BADGE:EXPORT',
      module: 'HCM',
      submodule: 'ID_BADGE',
      action: 'EXPORT',
      name: 'Export ID Badges',
      description: 'Bulk print or export ID cards',
      minimumAuthority: 'A3_OFFICIAL_STAFF'
    },
    'HCM:ID_BADGE:APPROVE': {
      code: 'HCM:ID_BADGE:APPROVE',
      module: 'HCM',
      submodule: 'ID_BADGE',
      action: 'APPROVE',
      name: 'Approve Badge Issuance',
      description: 'Authorize identity badge printing and activation',
      minimumAuthority: 'A3_OFFICIAL_STAFF'
    },
    'HCM:ID_BADGE:REPORT': {
      code: 'HCM:ID_BADGE:REPORT',
      module: 'HCM',
      submodule: 'ID_BADGE',
      action: 'REPORT',
      name: 'Badge Audit Report',
      description: 'Review issued and revoked badge metrics',
      minimumAuthority: 'A4_REGIONAL_AREA_MANAGER'
    },
    'HCM:ID_BADGE:ADMIN': {
      code: 'HCM:ID_BADGE:ADMIN',
      module: 'HCM',
      submodule: 'ID_BADGE',
      action: 'ADMIN',
      name: 'Badge Template Configuration',
      description: 'Configure corporate badge templates and QR keys',
      minimumAuthority: 'A2_GENERAL_MANAGER'
    },

    'HCM:DEPARTMENT:READ': {
      code: 'HCM:DEPARTMENT:READ',
      module: 'HCM',
      submodule: 'DEPARTMENT',
      action: 'READ',
      name: 'View Departments',
      description: 'View organization departments and hierarchy',
      minimumAuthority: 'A9_SUPPORT'
    },
    'HCM:DEPARTMENT:CREATE': {
      code: 'HCM:DEPARTMENT:CREATE',
      module: 'HCM',
      submodule: 'DEPARTMENT',
      action: 'CREATE',
      name: 'Create Department',
      description: 'Define new departments and cost centers',
      minimumAuthority: 'A2_GENERAL_MANAGER'
    },
    'HCM:DEPARTMENT:UPDATE': {
      code: 'HCM:DEPARTMENT:UPDATE',
      module: 'HCM',
      submodule: 'DEPARTMENT',
      action: 'UPDATE',
      name: 'Update Department',
      description: 'Modify department structure or HOD assignment',
      minimumAuthority: 'A2_GENERAL_MANAGER'
    },
    'HCM:DEPARTMENT:DELETE': {
      code: 'HCM:DEPARTMENT:DELETE',
      module: 'HCM',
      submodule: 'DEPARTMENT',
      action: 'DELETE',
      name: 'Delete Department',
      description: 'Remove department definition',
      minimumAuthority: 'A1_DIRECTOR_CEO'
    },
    'HCM:DEPARTMENT:EXPORT': {
      code: 'HCM:DEPARTMENT:EXPORT',
      module: 'HCM',
      submodule: 'DEPARTMENT',
      action: 'EXPORT',
      name: 'Export Departments',
      description: 'Export department directory',
      minimumAuthority: 'A3_OFFICIAL_STAFF'
    },
    'HCM:DEPARTMENT:APPROVE': {
      code: 'HCM:DEPARTMENT:APPROVE',
      module: 'HCM',
      submodule: 'DEPARTMENT',
      action: 'APPROVE',
      name: 'Approve Department Change',
      description: 'Approve structural department reassignments',
      minimumAuthority: 'A1_DIRECTOR_CEO'
    },
    'HCM:DEPARTMENT:REPORT': {
      code: 'HCM:DEPARTMENT:REPORT',
      module: 'HCM',
      submodule: 'DEPARTMENT',
      action: 'REPORT',
      name: 'Department Utilization Report',
      description: 'View department metrics',
      minimumAuthority: 'A3_OFFICIAL_STAFF'
    },
    'HCM:DEPARTMENT:ADMIN': {
      code: 'HCM:DEPARTMENT:ADMIN',
      module: 'HCM',
      submodule: 'DEPARTMENT',
      action: 'ADMIN',
      name: 'Department Governance',
      description: 'Configure department rules and cost-center allocations',
      minimumAuthority: 'A1_DIRECTOR_CEO'
    },

    'HCM:ORG_CHART:READ': {
      code: 'HCM:ORG_CHART:READ',
      module: 'HCM',
      submodule: 'ORG_CHART',
      action: 'READ',
      name: 'View Org Chart',
      description: 'View organizational reporting tree',
      minimumAuthority: 'A9_SUPPORT'
    },
    'HCM:ORG_CHART:CREATE': {
      code: 'HCM:ORG_CHART:CREATE',
      module: 'HCM',
      submodule: 'ORG_CHART',
      action: 'CREATE',
      name: 'Create Hierarchy Link',
      description: 'Define reporting linkages',
      minimumAuthority: 'A2_GENERAL_MANAGER'
    },
    'HCM:ORG_CHART:UPDATE': {
      code: 'HCM:ORG_CHART:UPDATE',
      module: 'HCM',
      submodule: 'ORG_CHART',
      action: 'UPDATE',
      name: 'Update Reporting Structure',
      description: 'Change manager-subordinate relationships',
      minimumAuthority: 'A2_GENERAL_MANAGER'
    },
    'HCM:ORG_CHART:DELETE': {
      code: 'HCM:ORG_CHART:DELETE',
      module: 'HCM',
      submodule: 'ORG_CHART',
      action: 'DELETE',
      name: 'Remove Reporting Link',
      description: 'Sever organizational link',
      minimumAuthority: 'A1_DIRECTOR_CEO'
    },
    'HCM:ORG_CHART:EXPORT': {
      code: 'HCM:ORG_CHART:EXPORT',
      module: 'HCM',
      submodule: 'ORG_CHART',
      action: 'EXPORT',
      name: 'Export Org Chart',
      description: 'Export org hierarchy',
      minimumAuthority: 'A3_OFFICIAL_STAFF'
    },
    'HCM:ORG_CHART:APPROVE': {
      code: 'HCM:ORG_CHART:APPROVE',
      module: 'HCM',
      submodule: 'ORG_CHART',
      action: 'APPROVE',
      name: 'Approve Reorganization',
      description: 'Authorize company structural reorganization',
      minimumAuthority: 'A1_DIRECTOR_CEO'
    },
    'HCM:ORG_CHART:REPORT': {
      code: 'HCM:ORG_CHART:REPORT',
      module: 'HCM',
      submodule: 'ORG_CHART',
      action: 'REPORT',
      name: 'Hierarchy Gap Analysis',
      description: 'Report orphaned positions',
      minimumAuthority: 'A2_GENERAL_MANAGER'
    },
    'HCM:ORG_CHART:ADMIN': {
      code: 'HCM:ORG_CHART:ADMIN',
      module: 'HCM',
      submodule: 'ORG_CHART',
      action: 'ADMIN',
      name: 'Org Chart Administration',
      description: 'Configure corporate governance hierarchy parameters',
      minimumAuthority: 'A0_OWNER'
    },

    // -------------------------------------------------------------
    // MODULE 2: WFM (Workforce Management)
    // -------------------------------------------------------------
    'WFM:ATTENDANCE:READ': {
      code: 'WFM:ATTENDANCE:READ',
      module: 'WFM',
      submodule: 'ATTENDANCE',
      action: 'READ',
      name: 'View Attendance',
      description: 'View daily attendance logs and punches',
      minimumAuthority: 'A9_SUPPORT'
    },
    'WFM:ATTENDANCE:CREATE': {
      code: 'WFM:ATTENDANCE:CREATE',
      module: 'WFM',
      submodule: 'ATTENDANCE',
      action: 'CREATE',
      name: 'Mark Attendance',
      description: 'Record punch-in or punch-out (geofenced / biometric)',
      minimumAuthority: 'A9_SUPPORT'
    },
    'WFM:ATTENDANCE:UPDATE': {
      code: 'WFM:ATTENDANCE:UPDATE',
      module: 'WFM',
      submodule: 'ATTENDANCE',
      action: 'UPDATE',
      name: 'Regularize Attendance',
      description: 'Modify or regularize attendance punches',
      minimumAuthority: 'A6_SUPERVISOR'
    },
    'WFM:ATTENDANCE:DELETE': {
      code: 'WFM:ATTENDANCE:DELETE',
      module: 'WFM',
      submodule: 'ATTENDANCE',
      action: 'DELETE',
      name: 'Delete Attendance Entry',
      description: 'Remove duplicate or erroneous attendance log',
      minimumAuthority: 'A3_OFFICIAL_STAFF',
      allowedRoles: ['HR_ADMIN', 'HR', 'COMPANY_ADMIN', 'SUPER_ADMIN']
    },
    'WFM:ATTENDANCE:EXPORT': {
      code: 'WFM:ATTENDANCE:EXPORT',
      module: 'WFM',
      submodule: 'ATTENDANCE',
      action: 'EXPORT',
      name: 'Export Muster Sheet',
      description: 'Export monthly muster sheets (Form 25)',
      minimumAuthority: 'A4_REGIONAL_AREA_MANAGER'
    },
    'WFM:ATTENDANCE:APPROVE': {
      code: 'WFM:ATTENDANCE:APPROVE',
      module: 'WFM',
      submodule: 'ATTENDANCE',
      action: 'APPROVE',
      name: 'Approve Attendance Regularization',
      description: 'Approve shift adjustments and regularization requests',
      minimumAuthority: 'A5_SITE_IN_CHARGE'
    },
    'WFM:ATTENDANCE:REPORT': {
      code: 'WFM:ATTENDANCE:REPORT',
      module: 'WFM',
      submodule: 'ATTENDANCE',
      action: 'REPORT',
      name: 'Attendance Analytics Report',
      description: 'View absenteeism and late-coming trends',
      minimumAuthority: 'A5_SITE_IN_CHARGE'
    },
    'WFM:ATTENDANCE:ADMIN': {
      code: 'WFM:ATTENDANCE:ADMIN',
      module: 'WFM',
      submodule: 'ATTENDANCE',
      action: 'ADMIN',
      name: 'Attendance Policy Configuration',
      description: 'Configure shift timings, grace periods, and geofences',
      minimumAuthority: 'A2_GENERAL_MANAGER'
    },

    'WFM:SHIFT:READ': {
      code: 'WFM:SHIFT:READ',
      module: 'WFM',
      submodule: 'SHIFT',
      action: 'READ',
      name: 'View Shifts',
      description: 'View shift schedules and timing windows',
      minimumAuthority: 'A9_SUPPORT'
    },
    'WFM:SHIFT:CREATE': {
      code: 'WFM:SHIFT:CREATE',
      module: 'WFM',
      submodule: 'SHIFT',
      action: 'CREATE',
      name: 'Create Shift Definition',
      description: 'Define new working shift patterns',
      minimumAuthority: 'A5_SITE_IN_CHARGE'
    },
    'WFM:SHIFT:UPDATE': {
      code: 'WFM:SHIFT:UPDATE',
      module: 'WFM',
      submodule: 'SHIFT',
      action: 'UPDATE',
      name: 'Update Shift Definition',
      description: 'Modify shift hours and allowances',
      minimumAuthority: 'A5_SITE_IN_CHARGE'
    },
    'WFM:SHIFT:DELETE': {
      code: 'WFM:SHIFT:DELETE',
      module: 'WFM',
      submodule: 'SHIFT',
      action: 'DELETE',
      name: 'Delete Shift Definition',
      description: 'Remove unused shift schedule',
      minimumAuthority: 'A3_OFFICIAL_STAFF'
    },
    'WFM:SHIFT:EXPORT': {
      code: 'WFM:SHIFT:EXPORT',
      module: 'WFM',
      submodule: 'SHIFT',
      action: 'EXPORT',
      name: 'Export Shifts',
      description: 'Export shift definitions',
      minimumAuthority: 'A4_REGIONAL_AREA_MANAGER'
    },
    'WFM:SHIFT:APPROVE': {
      code: 'WFM:SHIFT:APPROVE',
      module: 'WFM',
      submodule: 'SHIFT',
      action: 'APPROVE',
      name: 'Approve Shift Changes',
      description: 'Authorize site shift alterations',
      minimumAuthority: 'A4_REGIONAL_AREA_MANAGER'
    },
    'WFM:SHIFT:REPORT': {
      code: 'WFM:SHIFT:REPORT',
      module: 'WFM',
      submodule: 'SHIFT',
      action: 'REPORT',
      name: 'Shift Utilization Report',
      description: 'View shift coverage metrics',
      minimumAuthority: 'A5_SITE_IN_CHARGE'
    },
    'WFM:SHIFT:ADMIN': {
      code: 'WFM:SHIFT:ADMIN',
      module: 'WFM',
      submodule: 'SHIFT',
      action: 'ADMIN',
      name: 'Shift Master Administration',
      description: 'Configure corporate shift templates',
      minimumAuthority: 'A2_GENERAL_MANAGER'
    },

    'WFM:ROSTER:READ': {
      code: 'WFM:ROSTER:READ',
      module: 'WFM',
      submodule: 'ROSTER',
      action: 'READ',
      name: 'View Shift Roster',
      description: 'View employee shift assignments',
      minimumAuthority: 'A9_SUPPORT'
    },
    'WFM:ROSTER:CREATE': {
      code: 'WFM:ROSTER:CREATE',
      module: 'WFM',
      submodule: 'ROSTER',
      action: 'CREATE',
      name: 'Generate Roster',
      description: 'Assign employees to shifts across calendar',
      minimumAuthority: 'A6_SUPERVISOR'
    },
    'WFM:ROSTER:UPDATE': {
      code: 'WFM:ROSTER:UPDATE',
      module: 'WFM',
      submodule: 'ROSTER',
      action: 'UPDATE',
      name: 'Update Roster Assignment',
      description: 'Swap or reassign employee shifts',
      minimumAuthority: 'A6_SUPERVISOR'
    },
    'WFM:ROSTER:DELETE': {
      code: 'WFM:ROSTER:DELETE',
      module: 'WFM',
      submodule: 'ROSTER',
      action: 'DELETE',
      name: 'Clear Roster',
      description: 'Remove scheduled roster period',
      minimumAuthority: 'A4_REGIONAL_AREA_MANAGER'
    },
    'WFM:ROSTER:EXPORT': {
      code: 'WFM:ROSTER:EXPORT',
      module: 'WFM',
      submodule: 'ROSTER',
      action: 'EXPORT',
      name: 'Export Roster Plan',
      description: 'Export site roster to PDF or Excel',
      minimumAuthority: 'A5_SITE_IN_CHARGE'
    },
    'WFM:ROSTER:APPROVE': {
      code: 'WFM:ROSTER:APPROVE',
      module: 'WFM',
      submodule: 'ROSTER',
      action: 'APPROVE',
      name: 'Approve Roster Plan',
      description: 'Authorize weekly or monthly site deployment plan',
      minimumAuthority: 'A5_SITE_IN_CHARGE'
    },
    'WFM:ROSTER:REPORT': {
      code: 'WFM:ROSTER:REPORT',
      module: 'WFM',
      submodule: 'ROSTER',
      action: 'REPORT',
      name: 'Roster Adherence Report',
      description: 'Compare planned roster vs actual attendance',
      minimumAuthority: 'A5_SITE_IN_CHARGE'
    },
    'WFM:ROSTER:ADMIN': {
      code: 'WFM:ROSTER:ADMIN',
      module: 'WFM',
      submodule: 'ROSTER',
      action: 'ADMIN',
      name: 'Roster Automation Engine',
      description: 'Configure auto-rostering and fatigue guard rules',
      minimumAuthority: 'A2_GENERAL_MANAGER'
    },

    'WFM:LEAVE:READ': {
      code: 'WFM:LEAVE:READ',
      module: 'WFM',
      submodule: 'LEAVE',
      action: 'READ',
      name: 'View Leave Requests',
      description: 'View personal or site leave applications',
      minimumAuthority: 'A9_SUPPORT'
    },
    'WFM:LEAVE:CREATE': {
      code: 'WFM:LEAVE:CREATE',
      module: 'WFM',
      submodule: 'LEAVE',
      action: 'CREATE',
      name: 'Apply For Leave',
      description: 'Submit new leave or compensatory off application',
      minimumAuthority: 'A9_SUPPORT'
    },
    'WFM:LEAVE:UPDATE': {
      code: 'WFM:LEAVE:UPDATE',
      module: 'WFM',
      submodule: 'LEAVE',
      action: 'UPDATE',
      name: 'Modify Leave Application',
      description: 'Cancel or update pending leave dates',
      minimumAuthority: 'A9_SUPPORT'
    },
    'WFM:LEAVE:DELETE': {
      code: 'WFM:LEAVE:DELETE',
      module: 'WFM',
      submodule: 'LEAVE',
      action: 'DELETE',
      name: 'Withdraw Leave',
      description: 'Withdraw or cancel approved leave',
      minimumAuthority: 'A5_SITE_IN_CHARGE'
    },
    'WFM:LEAVE:EXPORT': {
      code: 'WFM:LEAVE:EXPORT',
      module: 'WFM',
      submodule: 'LEAVE',
      action: 'EXPORT',
      name: 'Export Leave Ledgers',
      description: 'Export leave balances and usage',
      minimumAuthority: 'A3_OFFICIAL_STAFF'
    },
    'WFM:LEAVE:APPROVE': {
      code: 'WFM:LEAVE:APPROVE',
      module: 'WFM',
      submodule: 'LEAVE',
      action: 'APPROVE',
      name: 'Approve Leave Request',
      description: 'Approve or reject subordinate leave applications',
      minimumAuthority: 'A5_SITE_IN_CHARGE'
    },
    'WFM:LEAVE:REPORT': {
      code: 'WFM:LEAVE:REPORT',
      module: 'WFM',
      submodule: 'LEAVE',
      action: 'REPORT',
      name: 'Leave Balance Report',
      description: 'View statutory leave accruals (Earned, Sick, Casual)',
      minimumAuthority: 'A3_OFFICIAL_STAFF'
    },
    'WFM:LEAVE:ADMIN': {
      code: 'WFM:LEAVE:ADMIN',
      module: 'WFM',
      submodule: 'LEAVE',
      action: 'ADMIN',
      name: 'Leave Policy Administration',
      description: 'Configure leave types, encashment, and carry-forward',
      minimumAuthority: 'A2_GENERAL_MANAGER'
    },

    'WFM:OVERTIME:READ': {
      code: 'WFM:OVERTIME:READ',
      module: 'WFM',
      submodule: 'OVERTIME',
      action: 'READ',
      name: 'View Overtime Hours',
      description: 'View calculated overtime records',
      minimumAuthority: 'A9_SUPPORT'
    },
    'WFM:OVERTIME:CREATE': {
      code: 'WFM:OVERTIME:CREATE',
      module: 'WFM',
      submodule: 'OVERTIME',
      action: 'CREATE',
      name: 'Claim Overtime',
      description: 'Log extra hours worked beyond standard shift',
      minimumAuthority: 'A8_SEMI_SKILLED'
    },
    'WFM:OVERTIME:UPDATE': {
      code: 'WFM:OVERTIME:UPDATE',
      module: 'WFM',
      submodule: 'OVERTIME',
      action: 'UPDATE',
      name: 'Adjust Overtime Hours',
      description: 'Review and adjust logged overtime hours',
      minimumAuthority: 'A6_SUPERVISOR'
    },
    'WFM:OVERTIME:DELETE': {
      code: 'WFM:OVERTIME:DELETE',
      module: 'WFM',
      submodule: 'OVERTIME',
      action: 'DELETE',
      name: 'Reject Overtime Entry',
      description: 'Discard invalid overtime record',
      minimumAuthority: 'A5_SITE_IN_CHARGE'
    },
    'WFM:OVERTIME:EXPORT': {
      code: 'WFM:OVERTIME:EXPORT',
      module: 'WFM',
      submodule: 'OVERTIME',
      action: 'EXPORT',
      name: 'Export Overtime Summary',
      description: 'Export monthly overtime for payroll calculation',
      minimumAuthority: 'A3_OFFICIAL_STAFF'
    },
    'WFM:OVERTIME:APPROVE': {
      code: 'WFM:OVERTIME:APPROVE',
      module: 'WFM',
      submodule: 'OVERTIME',
      action: 'APPROVE',
      name: 'Authorize Overtime Payout',
      description: 'Approve overtime hours for payroll processing',
      minimumAuthority: 'A5_SITE_IN_CHARGE'
    },
    'WFM:OVERTIME:REPORT': {
      code: 'WFM:OVERTIME:REPORT',
      module: 'WFM',
      submodule: 'OVERTIME',
      action: 'REPORT',
      name: 'Overtime Spend Analysis',
      description: 'Analyze overtime spend across operational sites',
      minimumAuthority: 'A4_REGIONAL_AREA_MANAGER'
    },
    'WFM:OVERTIME:ADMIN': {
      code: 'WFM:OVERTIME:ADMIN',
      module: 'WFM',
      submodule: 'OVERTIME',
      action: 'ADMIN',
      name: 'Overtime Multiplier Rules',
      description: 'Configure statutory overtime multipliers (1.5x / 2.0x)',
      minimumAuthority: 'A2_GENERAL_MANAGER'
    },

    // -------------------------------------------------------------
    // MODULE 3: ERP FINANCE
    // -------------------------------------------------------------
    'ERP_FINANCE:PAYROLL:READ': {
      code: 'ERP_FINANCE:PAYROLL:READ',
      module: 'ERP_FINANCE',
      submodule: 'PAYROLL',
      action: 'READ',
      name: 'View Payslips / Payroll',
      description: 'View personal payslip or full company payroll register',
      minimumAuthority: 'A9_SUPPORT' // Base users see their own, scope restricts
    },
    'ERP_FINANCE:PAYROLL:CREATE': {
      code: 'ERP_FINANCE:PAYROLL:CREATE',
      module: 'ERP_FINANCE',
      submodule: 'PAYROLL',
      action: 'CREATE',
      name: 'Run Monthly Payroll',
      description: 'Generate monthly salary registers and deductions',
      minimumAuthority: 'A3_OFFICIAL_STAFF',
      allowedRoles: ['FINANCE', 'FINANCE_MANAGER', 'COMPANY_ADMIN', 'SUPER_ADMIN']
    },
    'ERP_FINANCE:PAYROLL:UPDATE': {
      code: 'ERP_FINANCE:PAYROLL:UPDATE',
      module: 'ERP_FINANCE',
      submodule: 'PAYROLL',
      action: 'UPDATE',
      name: 'Adjust Salary Components',
      description: 'Modify earnings, LOP, or variable bonus components',
      minimumAuthority: 'A3_OFFICIAL_STAFF',
      allowedRoles: ['FINANCE', 'FINANCE_MANAGER', 'COMPANY_ADMIN', 'SUPER_ADMIN']
    },
    'ERP_FINANCE:PAYROLL:DELETE': {
      code: 'ERP_FINANCE:PAYROLL:DELETE',
      module: 'ERP_FINANCE',
      submodule: 'PAYROLL',
      action: 'DELETE',
      name: 'Rollback Payroll Run',
      description: 'Cancel and delete a draft payroll computation',
      minimumAuthority: 'A2_GENERAL_MANAGER',
      allowedRoles: ['FINANCE_MANAGER', 'COMPANY_ADMIN', 'DIRECTOR_CEO', 'OWNER_PROMOTER', 'SUPER_ADMIN']
    },
    'ERP_FINANCE:PAYROLL:EXPORT': {
      code: 'ERP_FINANCE:PAYROLL:EXPORT',
      module: 'ERP_FINANCE',
      submodule: 'PAYROLL',
      action: 'EXPORT',
      name: 'Export Bank Disbursement File',
      description: 'Export NEFT/RTGS bank text files and pay registers',
      minimumAuthority: 'A3_OFFICIAL_STAFF',
      allowedRoles: ['FINANCE', 'FINANCE_MANAGER', 'COMPANY_ADMIN', 'SUPER_ADMIN']
    },
    'ERP_FINANCE:PAYROLL:APPROVE': {
      code: 'ERP_FINANCE:PAYROLL:APPROVE',
      module: 'ERP_FINANCE',
      submodule: 'PAYROLL',
      action: 'APPROVE',
      name: 'Disburse Payroll',
      description: 'Final authorization for bank salary transfer',
      minimumAuthority: 'A1_DIRECTOR_CEO',
      allowedRoles: ['DIRECTOR_CEO', 'OWNER_PROMOTER', 'FINANCE_MANAGER', 'SUPER_ADMIN']
    },
    'ERP_FINANCE:PAYROLL:REPORT': {
      code: 'ERP_FINANCE:PAYROLL:REPORT',
      module: 'ERP_FINANCE',
      submodule: 'PAYROLL',
      action: 'REPORT',
      name: 'Cost to Company (CTC) Analysis',
      description: 'Analyze labor expense and variance against budget',
      minimumAuthority: 'A2_GENERAL_MANAGER'
    },
    'ERP_FINANCE:PAYROLL:ADMIN': {
      code: 'ERP_FINANCE:PAYROLL:ADMIN',
      module: 'ERP_FINANCE',
      submodule: 'PAYROLL',
      action: 'ADMIN',
      name: 'Salary Structure Configuration',
      description: 'Configure salary heads, PF, ESIC, and PT slabs',
      minimumAuthority: 'A1_DIRECTOR_CEO'
    },

    'ERP_FINANCE:BILLING:READ': {
      code: 'ERP_FINANCE:BILLING:READ',
      module: 'ERP_FINANCE',
      submodule: 'BILLING',
      action: 'READ',
      name: 'View Invoices',
      description: 'View client invoices and payment status',
      minimumAuthority: 'A3_OFFICIAL_STAFF'
    },
    'ERP_FINANCE:BILLING:CREATE': {
      code: 'ERP_FINANCE:BILLING:CREATE',
      module: 'ERP_FINANCE',
      submodule: 'BILLING',
      action: 'CREATE',
      name: 'Generate Client Invoice',
      description: 'Create GST tax invoice based on monthly muster',
      minimumAuthority: 'A3_OFFICIAL_STAFF',
      allowedRoles: ['FINANCE', 'FINANCE_MANAGER', 'COMMERCIAL', 'COMPANY_ADMIN', 'SUPER_ADMIN']
    },
    'ERP_FINANCE:BILLING:UPDATE': {
      code: 'ERP_FINANCE:BILLING:UPDATE',
      module: 'ERP_FINANCE',
      submodule: 'BILLING',
      action: 'UPDATE',
      name: 'Update Invoice',
      description: 'Add line items, discount or credit notes',
      minimumAuthority: 'A3_OFFICIAL_STAFF'
    },
    'ERP_FINANCE:BILLING:DELETE': {
      code: 'ERP_FINANCE:BILLING:DELETE',
      module: 'ERP_FINANCE',
      submodule: 'BILLING',
      action: 'DELETE',
      name: 'Void Invoice',
      description: 'Void tax invoice with audit reason',
      minimumAuthority: 'A1_DIRECTOR_CEO'
    },
    'ERP_FINANCE:BILLING:EXPORT': {
      code: 'ERP_FINANCE:BILLING:EXPORT',
      module: 'ERP_FINANCE',
      submodule: 'BILLING',
      action: 'EXPORT',
      name: 'Export GSTR-1 File',
      description: 'Export sales register for GST filing',
      minimumAuthority: 'A3_OFFICIAL_STAFF'
    },
    'ERP_FINANCE:BILLING:APPROVE': {
      code: 'ERP_FINANCE:BILLING:APPROVE',
      module: 'ERP_FINANCE',
      submodule: 'BILLING',
      action: 'APPROVE',
      name: 'Approve Invoice Dispatch',
      description: 'Authorize sending invoice to client billing portal',
      minimumAuthority: 'A2_GENERAL_MANAGER'
    },
    'ERP_FINANCE:BILLING:REPORT': {
      code: 'ERP_FINANCE:BILLING:REPORT',
      module: 'ERP_FINANCE',
      submodule: 'BILLING',
      action: 'REPORT',
      name: 'Accounts Receivable Aging',
      description: 'Track outstanding customer invoices by aging bucket',
      minimumAuthority: 'A3_OFFICIAL_STAFF'
    },
    'ERP_FINANCE:BILLING:ADMIN': {
      code: 'ERP_FINANCE:BILLING:ADMIN',
      module: 'ERP_FINANCE',
      submodule: 'BILLING',
      action: 'ADMIN',
      name: 'Billing Engine Rules',
      description: 'Configure HSN/SAC codes, GST rates, and bank accounts',
      minimumAuthority: 'A1_DIRECTOR_CEO'
    },

    'ERP_FINANCE:INVOICE:READ': { code: 'ERP_FINANCE:INVOICE:READ', module: 'ERP_FINANCE', submodule: 'INVOICE', action: 'READ', name: 'Read Invoices', description: 'Read invoices', minimumAuthority: 'A3_OFFICIAL_STAFF' },
    'ERP_FINANCE:INVOICE:CREATE': { code: 'ERP_FINANCE:INVOICE:CREATE', module: 'ERP_FINANCE', submodule: 'INVOICE', action: 'CREATE', name: 'Create Invoices', description: 'Create invoices', minimumAuthority: 'A3_OFFICIAL_STAFF' },
    'ERP_FINANCE:INVOICE:UPDATE': { code: 'ERP_FINANCE:INVOICE:UPDATE', module: 'ERP_FINANCE', submodule: 'INVOICE', action: 'UPDATE', name: 'Update Invoices', description: 'Update invoices', minimumAuthority: 'A3_OFFICIAL_STAFF' },
    'ERP_FINANCE:INVOICE:DELETE': { code: 'ERP_FINANCE:INVOICE:DELETE', module: 'ERP_FINANCE', submodule: 'INVOICE', action: 'DELETE', name: 'Delete Invoices', description: 'Delete invoices', minimumAuthority: 'A1_DIRECTOR_CEO' },
    'ERP_FINANCE:INVOICE:EXPORT': { code: 'ERP_FINANCE:INVOICE:EXPORT', module: 'ERP_FINANCE', submodule: 'INVOICE', action: 'EXPORT', name: 'Export Invoices', description: 'Export invoices', minimumAuthority: 'A3_OFFICIAL_STAFF' },
    'ERP_FINANCE:INVOICE:APPROVE': { code: 'ERP_FINANCE:INVOICE:APPROVE', module: 'ERP_FINANCE', submodule: 'INVOICE', action: 'APPROVE', name: 'Approve Invoices', description: 'Approve invoices', minimumAuthority: 'A2_GENERAL_MANAGER' },
    'ERP_FINANCE:INVOICE:REPORT': { code: 'ERP_FINANCE:INVOICE:REPORT', module: 'ERP_FINANCE', submodule: 'INVOICE', action: 'REPORT', name: 'Invoice Reports', description: 'Invoice reporting', minimumAuthority: 'A3_OFFICIAL_STAFF' },
    'ERP_FINANCE:INVOICE:ADMIN': { code: 'ERP_FINANCE:INVOICE:ADMIN', module: 'ERP_FINANCE', submodule: 'INVOICE', action: 'ADMIN', name: 'Invoice Admin', description: 'Invoice administration', minimumAuthority: 'A1_DIRECTOR_CEO' },

    'ERP_FINANCE:COMPANY_BILLING:READ': { code: 'ERP_FINANCE:COMPANY_BILLING:READ', module: 'ERP_FINANCE', submodule: 'COMPANY_BILLING', action: 'READ', name: 'Read Subscription', description: 'Read SaaS subscription plan', minimumAuthority: 'A2_GENERAL_MANAGER' },
    'ERP_FINANCE:COMPANY_BILLING:CREATE': { code: 'ERP_FINANCE:COMPANY_BILLING:CREATE', module: 'ERP_FINANCE', submodule: 'COMPANY_BILLING', action: 'CREATE', name: 'Subscribe Plan', description: 'Subscribe to SaaS plan', minimumAuthority: 'A0_OWNER' },
    'ERP_FINANCE:COMPANY_BILLING:UPDATE': { code: 'ERP_FINANCE:COMPANY_BILLING:UPDATE', module: 'ERP_FINANCE', submodule: 'COMPANY_BILLING', action: 'UPDATE', name: 'Upgrade Plan', description: 'Upgrade or change billing plan', minimumAuthority: 'A0_OWNER' },
    'ERP_FINANCE:COMPANY_BILLING:DELETE': { code: 'ERP_FINANCE:COMPANY_BILLING:DELETE', module: 'ERP_FINANCE', submodule: 'COMPANY_BILLING', action: 'DELETE', name: 'Cancel Plan', description: 'Cancel subscription', minimumAuthority: 'A0_OWNER' },
    'ERP_FINANCE:COMPANY_BILLING:EXPORT': { code: 'ERP_FINANCE:COMPANY_BILLING:EXPORT', module: 'ERP_FINANCE', submodule: 'COMPANY_BILLING', action: 'EXPORT', name: 'Export SaaS Receipts', description: 'Export SaaS receipts', minimumAuthority: 'A2_GENERAL_MANAGER' },
    'ERP_FINANCE:COMPANY_BILLING:APPROVE': { code: 'ERP_FINANCE:COMPANY_BILLING:APPROVE', module: 'ERP_FINANCE', submodule: 'COMPANY_BILLING', action: 'APPROVE', name: 'Authorize SaaS Payment', description: 'Authorize SaaS invoice payment', minimumAuthority: 'A0_OWNER' },
    'ERP_FINANCE:COMPANY_BILLING:REPORT': { code: 'ERP_FINANCE:COMPANY_BILLING:REPORT', module: 'ERP_FINANCE', submodule: 'COMPANY_BILLING', action: 'REPORT', name: 'SaaS License Usage Report', description: 'View license utilization', minimumAuthority: 'A2_GENERAL_MANAGER' },
    'ERP_FINANCE:COMPANY_BILLING:ADMIN': { code: 'ERP_FINANCE:COMPANY_BILLING:ADMIN', module: 'ERP_FINANCE', submodule: 'COMPANY_BILLING', action: 'ADMIN', name: 'Super Admin Billing Control', description: 'Manage SaaS tiers and global pricing', minimumAuthority: 'A0_OWNER', allowedRoles: ['SUPER_ADMIN'] },

    'ERP_FINANCE:STATUTORY:READ': { code: 'ERP_FINANCE:STATUTORY:READ', module: 'ERP_FINANCE', submodule: 'STATUTORY', action: 'READ', name: 'Read Statutory Filing', description: 'Read PF / ESI challans', minimumAuthority: 'A3_OFFICIAL_STAFF' },
    'ERP_FINANCE:STATUTORY:CREATE': { code: 'ERP_FINANCE:STATUTORY:CREATE', module: 'ERP_FINANCE', submodule: 'STATUTORY', action: 'CREATE', name: 'Generate Statutory ECR', description: 'Generate PF/ESIC electronic return', minimumAuthority: 'A3_OFFICIAL_STAFF' },
    'ERP_FINANCE:STATUTORY:UPDATE': { code: 'ERP_FINANCE:STATUTORY:UPDATE', module: 'ERP_FINANCE', submodule: 'STATUTORY', action: 'UPDATE', name: 'Update Statutory Return', description: 'Modify ECR records', minimumAuthority: 'A3_OFFICIAL_STAFF' },
    'ERP_FINANCE:STATUTORY:DELETE': { code: 'ERP_FINANCE:STATUTORY:DELETE', module: 'ERP_FINANCE', submodule: 'STATUTORY', action: 'DELETE', name: 'Discard ECR Draft', description: 'Delete draft ECR', minimumAuthority: 'A2_GENERAL_MANAGER' },
    'ERP_FINANCE:STATUTORY:EXPORT': { code: 'ERP_FINANCE:STATUTORY:EXPORT', module: 'ERP_FINANCE', submodule: 'STATUTORY', action: 'EXPORT', name: 'Export ECR File', description: 'Export ECR text file for EPFO portal', minimumAuthority: 'A3_OFFICIAL_STAFF' },
    'ERP_FINANCE:STATUTORY:APPROVE': { code: 'ERP_FINANCE:STATUTORY:APPROVE', module: 'ERP_FINANCE', submodule: 'STATUTORY', action: 'APPROVE', name: 'Approve Statutory Challan', description: 'Authorize monthly statutory payments', minimumAuthority: 'A1_DIRECTOR_CEO' },
    'ERP_FINANCE:STATUTORY:REPORT': { code: 'ERP_FINANCE:STATUTORY:REPORT', module: 'ERP_FINANCE', submodule: 'STATUTORY', action: 'REPORT', name: 'Statutory Compliance Audit', description: 'Generate Form 10, Form 5 returns', minimumAuthority: 'A3_OFFICIAL_STAFF' },
    'ERP_FINANCE:STATUTORY:ADMIN': { code: 'ERP_FINANCE:STATUTORY:ADMIN', module: 'ERP_FINANCE', submodule: 'STATUTORY', action: 'ADMIN', name: 'Statutory Configuration', description: 'Configure state PT rules and wage limits', minimumAuthority: 'A1_DIRECTOR_CEO' },

    // -------------------------------------------------------------
    // MODULE 4: OPERATIONS
    // -------------------------------------------------------------
    'OPERATIONS:SITE_OPS:READ': { code: 'OPERATIONS:SITE_OPS:READ', module: 'OPERATIONS', submodule: 'SITE_OPS', action: 'READ', name: 'View Operations', description: 'View site daily operations diary', minimumAuthority: 'A8_SEMI_SKILLED' },
    'OPERATIONS:SITE_OPS:CREATE': { code: 'OPERATIONS:SITE_OPS:CREATE', module: 'OPERATIONS', submodule: 'SITE_OPS', action: 'CREATE', name: 'Log Site Event', description: 'Log gate activities, handover notes', minimumAuthority: 'A8_SEMI_SKILLED' },
    'OPERATIONS:SITE_OPS:UPDATE': { code: 'OPERATIONS:SITE_OPS:UPDATE', module: 'OPERATIONS', submodule: 'SITE_OPS', action: 'UPDATE', name: 'Update Site Diary', description: 'Update diary entries', minimumAuthority: 'A6_SUPERVISOR' },
    'OPERATIONS:SITE_OPS:DELETE': { code: 'OPERATIONS:SITE_OPS:DELETE', module: 'OPERATIONS', submodule: 'SITE_OPS', action: 'DELETE', name: 'Delete Entry', description: 'Remove invalid operational entry', minimumAuthority: 'A4_REGIONAL_AREA_MANAGER' },
    'OPERATIONS:SITE_OPS:EXPORT': { code: 'OPERATIONS:SITE_OPS:EXPORT', module: 'OPERATIONS', submodule: 'SITE_OPS', action: 'EXPORT', name: 'Export Operations Log', description: 'Export daily log sheet', minimumAuthority: 'A5_SITE_IN_CHARGE' },
    'OPERATIONS:SITE_OPS:APPROVE': { code: 'OPERATIONS:SITE_OPS:APPROVE', module: 'OPERATIONS', submodule: 'SITE_OPS', action: 'APPROVE', name: 'Sign-off Daily Log', description: 'Officer sign-off on daily muster log', minimumAuthority: 'A5_SITE_IN_CHARGE' },
    'OPERATIONS:SITE_OPS:REPORT': { code: 'OPERATIONS:SITE_OPS:REPORT', module: 'OPERATIONS', submodule: 'SITE_OPS', action: 'REPORT', name: 'Operations KPI Report', description: 'Site deployment fulfillment report', minimumAuthority: 'A5_SITE_IN_CHARGE' },
    'OPERATIONS:SITE_OPS:ADMIN': { code: 'OPERATIONS:SITE_OPS:ADMIN', module: 'OPERATIONS', submodule: 'SITE_OPS', action: 'ADMIN', name: 'Site Master Settings', description: 'Configure geofence coordinates and post orders', minimumAuthority: 'A2_GENERAL_MANAGER' },

    'OPERATIONS:GUARD_PATROL:READ': { code: 'OPERATIONS:GUARD_PATROL:READ', module: 'OPERATIONS', submodule: 'GUARD_PATROL', action: 'READ', name: 'View Patrol Runs', description: 'View guard patrol tracks and QR checkpoints', minimumAuthority: 'A8_SEMI_SKILLED' },
    'OPERATIONS:GUARD_PATROL:CREATE': { code: 'OPERATIONS:GUARD_PATROL:CREATE', module: 'OPERATIONS', submodule: 'GUARD_PATROL', action: 'CREATE', name: 'Scan Patrol Checkpoint', description: 'Scan NFC/QR checkpoint during patrol', minimumAuthority: 'A8_SEMI_SKILLED' },
    'OPERATIONS:GUARD_PATROL:UPDATE': { code: 'OPERATIONS:GUARD_PATROL:UPDATE', module: 'OPERATIONS', submodule: 'GUARD_PATROL', action: 'UPDATE', name: 'Add Patrol Remarks', description: 'Add notes or incident photos to patrol', minimumAuthority: 'A7_SKILLED' },
    'OPERATIONS:GUARD_PATROL:DELETE': { code: 'OPERATIONS:GUARD_PATROL:DELETE', module: 'OPERATIONS', submodule: 'GUARD_PATROL', action: 'DELETE', name: 'Delete Patrol Record', description: 'Remove invalid patrol entry', minimumAuthority: 'A4_REGIONAL_AREA_MANAGER' },
    'OPERATIONS:GUARD_PATROL:EXPORT': { code: 'OPERATIONS:GUARD_PATROL:EXPORT', module: 'OPERATIONS', submodule: 'GUARD_PATROL', action: 'EXPORT', name: 'Export Patrol Track', description: 'Export patrol log to client report', minimumAuthority: 'A5_SITE_IN_CHARGE' },
    'OPERATIONS:GUARD_PATROL:APPROVE': { code: 'OPERATIONS:GUARD_PATROL:APPROVE', module: 'OPERATIONS', submodule: 'GUARD_PATROL', action: 'APPROVE', name: 'Verify Patrol Run', description: 'Sign off on night patrol completeness', minimumAuthority: 'A6_SUPERVISOR' },
    'OPERATIONS:GUARD_PATROL:REPORT': { code: 'OPERATIONS:GUARD_PATROL:REPORT', module: 'OPERATIONS', submodule: 'GUARD_PATROL', action: 'REPORT', name: 'Patrol Compliance Analytics', description: 'Missed checkpoint analytics', minimumAuthority: 'A5_SITE_IN_CHARGE' },
    'OPERATIONS:GUARD_PATROL:ADMIN': { code: 'OPERATIONS:GUARD_PATROL:ADMIN', module: 'OPERATIONS', submodule: 'GUARD_PATROL', action: 'ADMIN', name: 'Patrol Route Setup', description: 'Configure checkpoint GPS & QR tags', minimumAuthority: 'A4_REGIONAL_AREA_MANAGER' },

    'OPERATIONS:VISITOR:READ': { code: 'OPERATIONS:VISITOR:READ', module: 'OPERATIONS', submodule: 'VISITOR', action: 'READ', name: 'View Visitor Register', description: 'View guest check-ins and passes', minimumAuthority: 'A8_SEMI_SKILLED' },
    'OPERATIONS:VISITOR:CREATE': { code: 'OPERATIONS:VISITOR:CREATE', module: 'OPERATIONS', submodule: 'VISITOR', action: 'CREATE', name: 'Check-in Visitor', description: 'Create visitor pass with photo & OTP', minimumAuthority: 'A8_SEMI_SKILLED' },
    'OPERATIONS:VISITOR:UPDATE': { code: 'OPERATIONS:VISITOR:UPDATE', module: 'OPERATIONS', submodule: 'VISITOR', action: 'UPDATE', name: 'Check-out Visitor', description: 'Mark visitor departure time', minimumAuthority: 'A8_SEMI_SKILLED' },
    'OPERATIONS:VISITOR:DELETE': { code: 'OPERATIONS:VISITOR:DELETE', module: 'OPERATIONS', submodule: 'VISITOR', action: 'DELETE', name: 'Blacklist Visitor', description: 'Blacklist or ban visitor record', minimumAuthority: 'A5_SITE_IN_CHARGE' },
    'OPERATIONS:VISITOR:EXPORT': { code: 'OPERATIONS:VISITOR:EXPORT', module: 'OPERATIONS', submodule: 'VISITOR', action: 'EXPORT', name: 'Export Visitor Log', description: 'Export visitor log for security review', minimumAuthority: 'A5_SITE_IN_CHARGE' },
    'OPERATIONS:VISITOR:APPROVE': { code: 'OPERATIONS:VISITOR:APPROVE', module: 'OPERATIONS', submodule: 'VISITOR', action: 'APPROVE', name: 'Pre-approve VIP Guest', description: 'Authorize VIP gate entry in advance', minimumAuthority: 'A5_SITE_IN_CHARGE' },
    'OPERATIONS:VISITOR:REPORT': { code: 'OPERATIONS:VISITOR:REPORT', module: 'OPERATIONS', submodule: 'VISITOR', action: 'REPORT', name: 'Visitor Traffic Analysis', description: 'Peak hour visitor analytics', minimumAuthority: 'A5_SITE_IN_CHARGE' },
    'OPERATIONS:VISITOR:ADMIN': { code: 'OPERATIONS:VISITOR:ADMIN', module: 'OPERATIONS', submodule: 'VISITOR', action: 'ADMIN', name: 'Gate Security Rules', description: 'Configure visitor badge printing & NDA policy', minimumAuthority: 'A2_GENERAL_MANAGER' },

    'OPERATIONS:INCIDENT:READ': { code: 'OPERATIONS:INCIDENT:READ', module: 'OPERATIONS', submodule: 'INCIDENT', action: 'READ', name: 'View Incidents', description: 'View safety and security incident reports', minimumAuthority: 'A8_SEMI_SKILLED' },
    'OPERATIONS:INCIDENT:CREATE': { code: 'OPERATIONS:INCIDENT:CREATE', module: 'OPERATIONS', submodule: 'INCIDENT', action: 'CREATE', name: 'Report Incident', description: 'Log security breach, hazard, or injury', minimumAuthority: 'A8_SEMI_SKILLED' },
    'OPERATIONS:INCIDENT:UPDATE': { code: 'OPERATIONS:INCIDENT:UPDATE', module: 'OPERATIONS', submodule: 'INCIDENT', action: 'UPDATE', name: 'Update Investigation', description: 'Add root cause analysis and corrective actions', minimumAuthority: 'A6_SUPERVISOR' },
    'OPERATIONS:INCIDENT:DELETE': { code: 'OPERATIONS:INCIDENT:DELETE', module: 'OPERATIONS', submodule: 'INCIDENT', action: 'DELETE', name: 'Delete Incident Record', description: 'Remove void incident log', minimumAuthority: 'A2_GENERAL_MANAGER' },
    'OPERATIONS:INCIDENT:EXPORT': { code: 'OPERATIONS:INCIDENT:EXPORT', module: 'OPERATIONS', submodule: 'INCIDENT', action: 'EXPORT', name: 'Export Incident Dossier', description: 'Export formal incident report to PDF', minimumAuthority: 'A4_REGIONAL_AREA_MANAGER' },
    'OPERATIONS:INCIDENT:APPROVE': { code: 'OPERATIONS:INCIDENT:APPROVE', module: 'OPERATIONS', submodule: 'INCIDENT', action: 'APPROVE', name: 'Close Incident', description: 'Formal EHS sign-off and closure', minimumAuthority: 'A3_OFFICIAL_STAFF', allowedRoles: ['EHS', 'OPS_MANAGER', 'COMPANY_ADMIN', 'SUPER_ADMIN'] },
    'OPERATIONS:INCIDENT:REPORT': { code: 'OPERATIONS:INCIDENT:REPORT', module: 'OPERATIONS', submodule: 'INCIDENT', action: 'REPORT', name: 'EHS Safety Scorecard', description: 'Lost Time Injury Frequency (LTIFR) report', minimumAuthority: 'A3_OFFICIAL_STAFF' },
    'OPERATIONS:INCIDENT:ADMIN': { code: 'OPERATIONS:INCIDENT:ADMIN', module: 'OPERATIONS', submodule: 'INCIDENT', action: 'ADMIN', name: 'Incident Matrix Setup', description: 'Configure severity thresholds and escalation matrices', minimumAuthority: 'A2_GENERAL_MANAGER' },

    'OPERATIONS:TASK:READ': { code: 'OPERATIONS:TASK:READ', module: 'OPERATIONS', submodule: 'TASK', action: 'READ', name: 'View Tasks', description: 'View assigned operational checklists', minimumAuthority: 'A9_SUPPORT' },
    'OPERATIONS:TASK:CREATE': { code: 'OPERATIONS:TASK:CREATE', module: 'OPERATIONS', submodule: 'TASK', action: 'CREATE', name: 'Create Daily Task', description: 'Assign tasks to site supervisors or guards', minimumAuthority: 'A6_SUPERVISOR' },
    'OPERATIONS:TASK:UPDATE': { code: 'OPERATIONS:TASK:UPDATE', module: 'OPERATIONS', submodule: 'TASK', action: 'UPDATE', name: 'Complete Task', description: 'Check off checklist items and submit proof', minimumAuthority: 'A8_SEMI_SKILLED' },
    'OPERATIONS:TASK:DELETE': { code: 'OPERATIONS:TASK:DELETE', module: 'OPERATIONS', submodule: 'TASK', action: 'DELETE', name: 'Cancel Task', description: 'Remove task assignment', minimumAuthority: 'A5_SITE_IN_CHARGE' },
    'OPERATIONS:TASK:EXPORT': { code: 'OPERATIONS:TASK:EXPORT', module: 'OPERATIONS', submodule: 'TASK', action: 'EXPORT', name: 'Export Checklist Log', description: 'Export completed task summaries', minimumAuthority: 'A5_SITE_IN_CHARGE' },
    'OPERATIONS:TASK:APPROVE': { code: 'OPERATIONS:TASK:APPROVE', module: 'OPERATIONS', submodule: 'TASK', action: 'APPROVE', name: 'Verify Task Completion', description: 'Verify proof of task execution', minimumAuthority: 'A6_SUPERVISOR' },
    'OPERATIONS:TASK:REPORT': { code: 'OPERATIONS:TASK:REPORT', module: 'OPERATIONS', submodule: 'TASK', action: 'REPORT', name: 'SLA Task Compliance Report', description: 'Checklist compliance rate', minimumAuthority: 'A5_SITE_IN_CHARGE' },
    'OPERATIONS:TASK:ADMIN': { code: 'OPERATIONS:TASK:ADMIN', module: 'OPERATIONS', submodule: 'TASK', action: 'ADMIN', name: 'Standard Operating Procedures', description: 'Configure recurring SOP templates', minimumAuthority: 'A4_REGIONAL_AREA_MANAGER' },

    // -------------------------------------------------------------
    // MODULE 5: EAM (Enterprise Asset Management)
    // -------------------------------------------------------------
    'EAM:ASSET:READ': { code: 'EAM:ASSET:READ', module: 'EAM', submodule: 'ASSET', action: 'READ', name: 'View Asset Register', description: 'View enterprise machinery, equipment, vehicles', minimumAuthority: 'A7_SKILLED' },
    'EAM:ASSET:CREATE': { code: 'EAM:ASSET:CREATE', module: 'EAM', submodule: 'ASSET', action: 'CREATE', name: 'Add Asset', description: 'Register new capital asset with barcode/tag', minimumAuthority: 'A3_OFFICIAL_STAFF' },
    'EAM:ASSET:UPDATE': { code: 'EAM:ASSET:UPDATE', module: 'EAM', submodule: 'ASSET', action: 'UPDATE', name: 'Update Asset Record', description: 'Update asset location, condition, or custody', minimumAuthority: 'A5_SITE_IN_CHARGE' },
    'EAM:ASSET:DELETE': { code: 'EAM:ASSET:DELETE', module: 'EAM', submodule: 'ASSET', action: 'DELETE', name: 'Decommission Asset', description: 'Scrap or write off capital asset', minimumAuthority: 'A2_GENERAL_MANAGER' },
    'EAM:ASSET:EXPORT': { code: 'EAM:ASSET:EXPORT', module: 'EAM', submodule: 'ASSET', action: 'EXPORT', name: 'Export Fixed Asset Register', description: 'Export asset database with depreciation values', minimumAuthority: 'A3_OFFICIAL_STAFF' },
    'EAM:ASSET:APPROVE': { code: 'EAM:ASSET:APPROVE', module: 'EAM', submodule: 'ASSET', action: 'APPROVE', name: 'Approve Asset Transfer', description: 'Authorize inter-site asset movement', minimumAuthority: 'A4_REGIONAL_AREA_MANAGER' },
    'EAM:ASSET:REPORT': { code: 'EAM:ASSET:REPORT', module: 'EAM', submodule: 'ASSET', action: 'REPORT', name: 'Asset Health & Downtime Report', description: 'MTBF and MTTR metrics', minimumAuthority: 'A4_REGIONAL_AREA_MANAGER' },
    'EAM:ASSET:ADMIN': { code: 'EAM:ASSET:ADMIN', module: 'EAM', submodule: 'ASSET', action: 'ADMIN', name: 'Asset Category & Depreciation Setup', description: 'Configure straight-line or WDV depreciation', minimumAuthority: 'A1_DIRECTOR_CEO' },

    'EAM:WORK_ORDER:READ': { code: 'EAM:WORK_ORDER:READ', module: 'EAM', submodule: 'WORK_ORDER', action: 'READ', name: 'View Work Orders', description: 'View maintenance work orders', minimumAuthority: 'A7_SKILLED' },
    'EAM:WORK_ORDER:CREATE': { code: 'EAM:WORK_ORDER:CREATE', module: 'EAM', submodule: 'WORK_ORDER', action: 'CREATE', name: 'Raise Work Order', description: 'Create corrective maintenance ticket', minimumAuthority: 'A6_SUPERVISOR' },
    'EAM:WORK_ORDER:UPDATE': { code: 'EAM:WORK_ORDER:UPDATE', module: 'EAM', submodule: 'WORK_ORDER', action: 'UPDATE', name: 'Execute Work Order', description: 'Log spare parts used and technician hours', minimumAuthority: 'A7_SKILLED' },
    'EAM:WORK_ORDER:DELETE': { code: 'EAM:WORK_ORDER:DELETE', module: 'EAM', submodule: 'WORK_ORDER', action: 'DELETE', name: 'Cancel Work Order', description: 'Cancel maintenance request', minimumAuthority: 'A5_SITE_IN_CHARGE' },
    'EAM:WORK_ORDER:EXPORT': { code: 'EAM:WORK_ORDER:EXPORT', module: 'EAM', submodule: 'WORK_ORDER', action: 'EXPORT', name: 'Export Work Order History', description: 'Export maintenance audit log', minimumAuthority: 'A5_SITE_IN_CHARGE' },
    'EAM:WORK_ORDER:APPROVE': { code: 'EAM:WORK_ORDER:APPROVE', module: 'EAM', submodule: 'WORK_ORDER', action: 'APPROVE', name: 'Verify Work Order Completion', description: 'Sign off on maintenance resolution', minimumAuthority: 'A5_SITE_IN_CHARGE' },
    'EAM:WORK_ORDER:REPORT': { code: 'EAM:WORK_ORDER:REPORT', module: 'EAM', submodule: 'WORK_ORDER', action: 'REPORT', name: 'Maintenance SLA Adherence', description: 'Mean Time to Repair analytics', minimumAuthority: 'A4_REGIONAL_AREA_MANAGER' },
    'EAM:WORK_ORDER:ADMIN': { code: 'EAM:WORK_ORDER:ADMIN', module: 'EAM', submodule: 'WORK_ORDER', action: 'ADMIN', name: 'Work Order Flow Config', description: 'Configure auto-assignment and criticality tiers', minimumAuthority: 'A2_GENERAL_MANAGER' },

    'EAM:MAINTENANCE:READ': { code: 'EAM:MAINTENANCE:READ', module: 'EAM', submodule: 'MAINTENANCE', action: 'READ', name: 'View PM Schedule', description: 'View preventive maintenance calendar', minimumAuthority: 'A7_SKILLED' },
    'EAM:MAINTENANCE:CREATE': { code: 'EAM:MAINTENANCE:CREATE', module: 'EAM', submodule: 'MAINTENANCE', action: 'CREATE', name: 'Schedule PM Plan', description: 'Set up recurring preventive maintenance triggers', minimumAuthority: 'A4_REGIONAL_AREA_MANAGER' },
    'EAM:MAINTENANCE:UPDATE': { code: 'EAM:MAINTENANCE:UPDATE', module: 'EAM', submodule: 'MAINTENANCE', action: 'UPDATE', name: 'Modify PM Interval', description: 'Update maintenance frequencies', minimumAuthority: 'A4_REGIONAL_AREA_MANAGER' },
    'EAM:MAINTENANCE:DELETE': { code: 'EAM:MAINTENANCE:DELETE', module: 'EAM', submodule: 'MAINTENANCE', action: 'DELETE', name: 'Delete PM Plan', description: 'Remove scheduled PM trigger', minimumAuthority: 'A2_GENERAL_MANAGER' },
    'EAM:MAINTENANCE:EXPORT': { code: 'EAM:MAINTENANCE:EXPORT', module: 'EAM', submodule: 'MAINTENANCE', action: 'EXPORT', name: 'Export PM Calendar', description: 'Export maintenance compliance timetable', minimumAuthority: 'A5_SITE_IN_CHARGE' },
    'EAM:MAINTENANCE:APPROVE': { code: 'EAM:MAINTENANCE:APPROVE', module: 'EAM', submodule: 'MAINTENANCE', action: 'APPROVE', name: 'Authorize PM Budget', description: 'Approve annual maintenance contracts', minimumAuthority: 'A1_DIRECTOR_CEO' },
    'EAM:MAINTENANCE:REPORT': { code: 'EAM:MAINTENANCE:REPORT', module: 'EAM', submodule: 'MAINTENANCE', action: 'REPORT', name: 'PM vs Breakdown Ratio', description: 'Ratio of planned vs unplanned maintenance', minimumAuthority: 'A4_REGIONAL_AREA_MANAGER' },
    'EAM:MAINTENANCE:ADMIN': { code: 'EAM:MAINTENANCE:ADMIN', module: 'EAM', submodule: 'MAINTENANCE', action: 'ADMIN', name: 'EAM System Configuration', description: 'Configure meter-based vs time-based triggers', minimumAuthority: 'A2_GENERAL_MANAGER' },

    'EAM:CUSTODY:READ': { code: 'EAM:CUSTODY:READ', module: 'EAM', submodule: 'CUSTODY', action: 'READ', name: 'View Asset Custody', description: 'View employee equipment issuance', minimumAuthority: 'A8_SEMI_SKILLED' },
    'EAM:CUSTODY:CREATE': { code: 'EAM:CUSTODY:CREATE', module: 'EAM', submodule: 'CUSTODY', action: 'CREATE', name: 'Issue Equipment to Staff', description: 'Issue walkie-talkie, baton, uniform, device', minimumAuthority: 'A6_SUPERVISOR' },
    'EAM:CUSTODY:UPDATE': { code: 'EAM:CUSTODY:UPDATE', module: 'EAM', submodule: 'CUSTODY', action: 'UPDATE', name: 'Return / Handover Equipment', description: 'Process equipment return and condition check', minimumAuthority: 'A6_SUPERVISOR' },
    'EAM:CUSTODY:DELETE': { code: 'EAM:CUSTODY:DELETE', module: 'EAM', submodule: 'CUSTODY', action: 'DELETE', name: 'Report Lost Asset', description: 'Report asset missing from custody', minimumAuthority: 'A5_SITE_IN_CHARGE' },
    'EAM:CUSTODY:EXPORT': { code: 'EAM:CUSTODY:EXPORT', module: 'EAM', submodule: 'CUSTODY', action: 'EXPORT', name: 'Export Custody Register', description: 'Export employee asset handover forms', minimumAuthority: 'A5_SITE_IN_CHARGE' },
    'EAM:CUSTODY:APPROVE': { code: 'EAM:CUSTODY:APPROVE', module: 'EAM', submodule: 'CUSTODY', action: 'APPROVE', name: 'Approve Gate Pass', description: 'Authorize returnable / non-returnable gate pass', minimumAuthority: 'A5_SITE_IN_CHARGE' },
    'EAM:CUSTODY:REPORT': { code: 'EAM:CUSTODY:REPORT', module: 'EAM', submodule: 'CUSTODY', action: 'REPORT', name: 'Custody Reconciliation Report', description: 'Audit physical equipment vs custody records', minimumAuthority: 'A4_REGIONAL_AREA_MANAGER' },
    'EAM:CUSTODY:ADMIN': { code: 'EAM:CUSTODY:ADMIN', module: 'EAM', submodule: 'CUSTODY', action: 'ADMIN', name: 'Gate Pass Governance Rules', description: 'Configure return duration and alert periods', minimumAuthority: 'A2_GENERAL_MANAGER' },

    'EAM:WARRANTY:READ': { code: 'EAM:WARRANTY:READ', module: 'EAM', submodule: 'WARRANTY', action: 'READ', name: 'View Warranty & AMC', description: 'View vendor warranties and AMC contracts', minimumAuthority: 'A5_SITE_IN_CHARGE' },
    'EAM:WARRANTY:CREATE': { code: 'EAM:WARRANTY:CREATE', module: 'EAM', submodule: 'WARRANTY', action: 'CREATE', name: 'Register Warranty', description: 'Log warranty certificates and expiration', minimumAuthority: 'A3_OFFICIAL_STAFF' },
    'EAM:WARRANTY:UPDATE': { code: 'EAM:WARRANTY:UPDATE', module: 'EAM', submodule: 'WARRANTY', action: 'UPDATE', name: 'Renew AMC Contract', description: 'Update extended warranty terms', minimumAuthority: 'A3_OFFICIAL_STAFF' },
    'EAM:WARRANTY:DELETE': { code: 'EAM:WARRANTY:DELETE', module: 'EAM', submodule: 'WARRANTY', action: 'DELETE', name: 'Terminate AMC', description: 'Terminate vendor maintenance contract', minimumAuthority: 'A2_GENERAL_MANAGER' },
    'EAM:WARRANTY:EXPORT': { code: 'EAM:WARRANTY:EXPORT', module: 'EAM', submodule: 'WARRANTY', action: 'EXPORT', name: 'Export Warranty Schedule', description: 'Export upcoming warranty expiries', minimumAuthority: 'A3_OFFICIAL_STAFF' },
    'EAM:WARRANTY:APPROVE': { code: 'EAM:WARRANTY:APPROVE', module: 'EAM', submodule: 'WARRANTY', action: 'APPROVE', name: 'Approve AMC Renewal', description: 'Authorize annual maintenance agreement payout', minimumAuthority: 'A1_DIRECTOR_CEO' },
    'EAM:WARRANTY:REPORT': { code: 'EAM:WARRANTY:REPORT', module: 'EAM', submodule: 'WARRANTY', action: 'REPORT', name: 'Warranty Claim Analytics', description: 'Track vendor SLA turnaround for warranty claims', minimumAuthority: 'A3_OFFICIAL_STAFF' },
    'EAM:WARRANTY:ADMIN': { code: 'EAM:WARRANTY:ADMIN', module: 'EAM', submodule: 'WARRANTY', action: 'ADMIN', name: 'Warranty Policy Setup', description: 'Configure vendor notification windows before expiry', minimumAuthority: 'A2_GENERAL_MANAGER' },

    // -------------------------------------------------------------
    // MODULE 6: SCM (Supply Chain Management)
    // -------------------------------------------------------------
    'SCM:INVENTORY:READ': { code: 'SCM:INVENTORY:READ', module: 'SCM', submodule: 'INVENTORY', action: 'READ', name: 'View Stock Balance', description: 'View current inventory balances and reorder levels', minimumAuthority: 'A7_SKILLED' },
    'SCM:INVENTORY:CREATE': { code: 'SCM:INVENTORY:CREATE', module: 'SCM', submodule: 'INVENTORY', action: 'CREATE', name: 'Add Inventory Item', description: 'Define new SKU or material master', minimumAuthority: 'A3_OFFICIAL_STAFF' },
    'SCM:INVENTORY:UPDATE': { code: 'SCM:INVENTORY:UPDATE', module: 'SCM', submodule: 'INVENTORY', action: 'UPDATE', name: 'Stock Adjustment / GRN', description: 'Post Goods Receipt Note (GRN) or cycle count', minimumAuthority: 'A5_SITE_IN_CHARGE' },
    'SCM:INVENTORY:DELETE': { code: 'SCM:INVENTORY:DELETE', module: 'SCM', submodule: 'INVENTORY', action: 'DELETE', name: 'Write Off Inventory', description: 'Scrap damaged or expired inventory', minimumAuthority: 'A2_GENERAL_MANAGER' },
    'SCM:INVENTORY:EXPORT': { code: 'SCM:INVENTORY:EXPORT', module: 'SCM', submodule: 'INVENTORY', action: 'EXPORT', name: 'Export Stock Valuation', description: 'Export inventory ledger (FIFO/Weighted Avg)', minimumAuthority: 'A3_OFFICIAL_STAFF' },
    'SCM:INVENTORY:APPROVE': { code: 'SCM:INVENTORY:APPROVE', module: 'SCM', submodule: 'INVENTORY', action: 'APPROVE', name: 'Approve Stock Audit', description: 'Approve annual physical stock reconciliation', minimumAuthority: 'A2_GENERAL_MANAGER' },
    'SCM:INVENTORY:REPORT': { code: 'SCM:INVENTORY:REPORT', module: 'SCM', submodule: 'INVENTORY', action: 'REPORT', name: 'Inventory Turnover Report', description: 'Dead stock and fast-moving item analysis', minimumAuthority: 'A3_OFFICIAL_STAFF' },
    'SCM:INVENTORY:ADMIN': { code: 'SCM:INVENTORY:ADMIN', module: 'SCM', submodule: 'INVENTORY', action: 'ADMIN', name: 'Warehouse Location Setup', description: 'Configure bins, racks, and safety stock thresholds', minimumAuthority: 'A2_GENERAL_MANAGER' },

    'SCM:PURCHASE_ORDER:READ': { code: 'SCM:PURCHASE_ORDER:READ', module: 'SCM', submodule: 'PURCHASE_ORDER', action: 'READ', name: 'View Purchase Orders', description: 'View requisitions and purchase orders', minimumAuthority: 'A3_OFFICIAL_STAFF' },
    'SCM:PURCHASE_ORDER:CREATE': { code: 'SCM:PURCHASE_ORDER:CREATE', module: 'SCM', submodule: 'PURCHASE_ORDER', action: 'CREATE', name: 'Raise Purchase Order', description: 'Create PO for uniforms, gear, or consumables', minimumAuthority: 'A3_OFFICIAL_STAFF' },
    'SCM:PURCHASE_ORDER:UPDATE': { code: 'SCM:PURCHASE_ORDER:UPDATE', module: 'SCM', submodule: 'PURCHASE_ORDER', action: 'UPDATE', name: 'Modify PO Quantities', description: 'Update delivery schedule or terms', minimumAuthority: 'A3_OFFICIAL_STAFF' },
    'SCM:PURCHASE_ORDER:DELETE': { code: 'SCM:PURCHASE_ORDER:DELETE', module: 'SCM', submodule: 'PURCHASE_ORDER', action: 'DELETE', name: 'Cancel Purchase Order', description: 'Cancel open PO with supplier notification', minimumAuthority: 'A2_GENERAL_MANAGER' },
    'SCM:PURCHASE_ORDER:EXPORT': { code: 'SCM:PURCHASE_ORDER:EXPORT', module: 'SCM', submodule: 'PURCHASE_ORDER', action: 'EXPORT', name: 'Export PO Register', description: 'Export procurement register for audit', minimumAuthority: 'A3_OFFICIAL_STAFF' },
    'SCM:PURCHASE_ORDER:APPROVE': { code: 'SCM:PURCHASE_ORDER:APPROVE', module: 'SCM', submodule: 'PURCHASE_ORDER', action: 'APPROVE', name: 'Authorize PO Payout', description: 'Approve PO based on financial threshold matrix', minimumAuthority: 'A1_DIRECTOR_CEO' },
    'SCM:PURCHASE_ORDER:REPORT': { code: 'SCM:PURCHASE_ORDER:REPORT', module: 'SCM', submodule: 'PURCHASE_ORDER', action: 'REPORT', name: 'Procurement Spend Analysis', description: 'Analyze spending by vendor and category', minimumAuthority: 'A2_GENERAL_MANAGER' },
    'SCM:PURCHASE_ORDER:ADMIN': { code: 'SCM:PURCHASE_ORDER:ADMIN', module: 'SCM', submodule: 'PURCHASE_ORDER', action: 'ADMIN', name: 'Procurement Approval Matrix', description: 'Configure tiered authorization thresholds', minimumAuthority: 'A1_DIRECTOR_CEO' },

    'SCM:SUPPLIER:READ': { code: 'SCM:SUPPLIER:READ', module: 'SCM', submodule: 'SUPPLIER', action: 'READ', name: 'View Supplier Directory', description: 'View approved vendors and ratings', minimumAuthority: 'A3_OFFICIAL_STAFF' },
    'SCM:SUPPLIER:CREATE': { code: 'SCM:SUPPLIER:CREATE', module: 'SCM', submodule: 'SUPPLIER', action: 'CREATE', name: 'Onboard Vendor', description: 'Register new vendor with GSTIN and MSME certs', minimumAuthority: 'A3_OFFICIAL_STAFF' },
    'SCM:SUPPLIER:UPDATE': { code: 'SCM:SUPPLIER:UPDATE', module: 'SCM', submodule: 'SUPPLIER', action: 'UPDATE', name: 'Update Vendor Profile', description: 'Update vendor bank account and contact details', minimumAuthority: 'A3_OFFICIAL_STAFF' },
    'SCM:SUPPLIER:DELETE': { code: 'SCM:SUPPLIER:DELETE', module: 'SCM', submodule: 'SUPPLIER', action: 'DELETE', name: 'Blacklist Vendor', description: 'Blacklist non-performing vendor', minimumAuthority: 'A1_DIRECTOR_CEO' },
    'SCM:SUPPLIER:EXPORT': { code: 'SCM:SUPPLIER:EXPORT', module: 'SCM', submodule: 'SUPPLIER', action: 'EXPORT', name: 'Export Vendor Master', description: 'Export vendor directory for finance auditing', minimumAuthority: 'A3_OFFICIAL_STAFF' },
    'SCM:SUPPLIER:APPROVE': { code: 'SCM:SUPPLIER:APPROVE', module: 'SCM', submodule: 'SUPPLIER', action: 'APPROVE', name: 'Approve Vendor Em邪nelment', description: 'Sign off on vendor compliance & onboarding', minimumAuthority: 'A2_GENERAL_MANAGER' },
    'SCM:SUPPLIER:REPORT': { code: 'SCM:SUPPLIER:REPORT', module: 'SCM', submodule: 'SUPPLIER', action: 'REPORT', name: 'Vendor Performance Scorecard', description: 'Track OTIF (On-Time In-Full) delivery scores', minimumAuthority: 'A3_OFFICIAL_STAFF' },
    'SCM:SUPPLIER:ADMIN': { code: 'SCM:SUPPLIER:ADMIN', module: 'SCM', submodule: 'SUPPLIER', action: 'ADMIN', name: 'Vendor Rating Engine', description: 'Configure automated vendor rating algorithms', minimumAuthority: 'A2_GENERAL_MANAGER' },

    'SCM:STOCK_TRANSFER:READ': { code: 'SCM:STOCK_TRANSFER:READ', module: 'SCM', submodule: 'STOCK_TRANSFER', action: 'READ', name: 'View Stock Transfers', description: 'View inter-site stock transit orders', minimumAuthority: 'A6_SUPERVISOR' },
    'SCM:STOCK_TRANSFER:CREATE': { code: 'SCM:STOCK_TRANSFER:CREATE', module: 'SCM', submodule: 'STOCK_TRANSFER', action: 'CREATE', name: 'Dispatch Stock Transfer', description: 'Create delivery challan and dispatch stock', minimumAuthority: 'A5_SITE_IN_CHARGE' },
    'SCM:STOCK_TRANSFER:UPDATE': { code: 'SCM:STOCK_TRANSFER:UPDATE', module: 'SCM', submodule: 'STOCK_TRANSFER', action: 'UPDATE', name: 'Receive Stock at Site', description: 'Acknowledge receipt and verify count', minimumAuthority: 'A5_SITE_IN_CHARGE' },
    'SCM:STOCK_TRANSFER:DELETE': { code: 'SCM:STOCK_TRANSFER:DELETE', module: 'SCM', submodule: 'STOCK_TRANSFER', action: 'DELETE', name: 'Cancel Stock Transfer', description: 'Cancel un-dispatched transfer order', minimumAuthority: 'A4_REGIONAL_AREA_MANAGER' },
    'SCM:STOCK_TRANSFER:EXPORT': { code: 'SCM:STOCK_TRANSFER:EXPORT', module: 'SCM', submodule: 'STOCK_TRANSFER', action: 'EXPORT', name: 'Export Delivery Challans', description: 'Export e-Way bill summaries and challans', minimumAuthority: 'A5_SITE_IN_CHARGE' },
    'SCM:STOCK_TRANSFER:APPROVE': { code: 'SCM:STOCK_TRANSFER:APPROVE', module: 'SCM', submodule: 'STOCK_TRANSFER', action: 'APPROVE', name: 'Authorize High-Value Transit', description: 'Authorize stock movement exceeding limit', minimumAuthority: 'A4_REGIONAL_AREA_MANAGER' },
    'SCM:STOCK_TRANSFER:REPORT': { code: 'SCM:STOCK_TRANSFER:REPORT', module: 'SCM', submodule: 'STOCK_TRANSFER', action: 'REPORT', name: 'In-Transit Discrepancy Report', description: 'Identify transit shrinkage and losses', minimumAuthority: 'A3_OFFICIAL_STAFF' },
    'SCM:STOCK_TRANSFER:ADMIN': { code: 'SCM:STOCK_TRANSFER:ADMIN', module: 'SCM', submodule: 'STOCK_TRANSFER', action: 'ADMIN', name: 'Transit Rules Setup', description: 'Configure transit SLA and auto-loss flags', minimumAuthority: 'A2_GENERAL_MANAGER' },

    // -------------------------------------------------------------
    // MODULE 7: CRM (Customer Relationship Management)
    // -------------------------------------------------------------
    'CRM:CLIENT:READ': { code: 'CRM:CLIENT:READ', module: 'CRM', submodule: 'CLIENT', action: 'READ', name: 'View Client Accounts', description: 'View client accounts, billing addresses, and contacts', minimumAuthority: 'A4_REGIONAL_AREA_MANAGER' },
    'CRM:CLIENT:CREATE': { code: 'CRM:CLIENT:CREATE', module: 'CRM', submodule: 'CLIENT', action: 'CREATE', name: 'Onboard Client', description: 'Register new client corporate entity', minimumAuthority: 'A3_OFFICIAL_STAFF' },
    'CRM:CLIENT:UPDATE': { code: 'CRM:CLIENT:UPDATE', module: 'CRM', submodule: 'CLIENT', action: 'UPDATE', name: 'Update Client Profile', description: 'Update client contacts and billing details', minimumAuthority: 'A3_OFFICIAL_STAFF' },
    'CRM:CLIENT:DELETE': { code: 'CRM:CLIENT:DELETE', module: 'CRM', submodule: 'CLIENT', action: 'DELETE', name: 'Deactivate Client', description: 'Archive client account', minimumAuthority: 'A1_DIRECTOR_CEO' },
    'CRM:CLIENT:EXPORT': { code: 'CRM:CLIENT:EXPORT', module: 'CRM', submodule: 'CLIENT', action: 'EXPORT', name: 'Export Client Directory', description: 'Export client accounts to Excel', minimumAuthority: 'A3_OFFICIAL_STAFF' },
    'CRM:CLIENT:APPROVE': { code: 'CRM:CLIENT:APPROVE', module: 'CRM', submodule: 'CLIENT', action: 'APPROVE', name: 'Approve Client Onboarding', description: 'Authorize credit limit and client contract', minimumAuthority: 'A1_DIRECTOR_CEO' },
    'CRM:CLIENT:REPORT': { code: 'CRM:CLIENT:REPORT', module: 'CRM', submodule: 'CLIENT', action: 'REPORT', name: 'Client Retention & Revenue', description: 'Client profitability and retention dashboard', minimumAuthority: 'A2_GENERAL_MANAGER' },
    'CRM:CLIENT:ADMIN': { code: 'CRM:CLIENT:ADMIN', module: 'CRM', submodule: 'CLIENT', action: 'ADMIN', name: 'CRM Pipeline Governance', description: 'Configure client categories and tier discounts', minimumAuthority: 'A1_DIRECTOR_CEO' },

    'CRM:CONTRACT:READ': { code: 'CRM:CONTRACT:READ', module: 'CRM', submodule: 'CONTRACT', action: 'READ', name: 'View Service Contracts', description: 'View commercial contracts and guard strength SLAs', minimumAuthority: 'A4_REGIONAL_AREA_MANAGER' },
    'CRM:CONTRACT:CREATE': { code: 'CRM:CONTRACT:CREATE', module: 'CRM', submodule: 'CONTRACT', action: 'CREATE', name: 'Create Contract', description: 'Draft service agreement with pricing and headcounts', minimumAuthority: 'A3_OFFICIAL_STAFF' },
    'CRM:CONTRACT:UPDATE': { code: 'CRM:CONTRACT:UPDATE', module: 'CRM', submodule: 'CONTRACT', action: 'UPDATE', name: 'Amend Contract', description: 'Amend rate card or manpower requirement', minimumAuthority: 'A3_OFFICIAL_STAFF' },
    'CRM:CONTRACT:DELETE': { code: 'CRM:CONTRACT:DELETE', module: 'CRM', submodule: 'CONTRACT', action: 'DELETE', name: 'Terminate Contract', description: 'Terminate service contract with notice', minimumAuthority: 'A1_DIRECTOR_CEO' },
    'CRM:CONTRACT:EXPORT': { code: 'CRM:CONTRACT:EXPORT', module: 'CRM', submodule: 'CONTRACT', action: 'EXPORT', name: 'Export Contract Dossier', description: 'Export contract summaries', minimumAuthority: 'A3_OFFICIAL_STAFF' },
    'CRM:CONTRACT:APPROVE': { code: 'CRM:CONTRACT:APPROVE', module: 'CRM', submodule: 'CONTRACT', action: 'APPROVE', name: 'Sign Contract', description: 'Executive sign-off on commercial commitment', minimumAuthority: 'A0_OWNER' },
    'CRM:CONTRACT:REPORT': { code: 'CRM:CONTRACT:REPORT', module: 'CRM', submodule: 'CONTRACT', action: 'REPORT', name: 'Contract Expiry Timetable', description: 'Track contracts due for renewal', minimumAuthority: 'A2_GENERAL_MANAGER' },
    'CRM:CONTRACT:ADMIN': { code: 'CRM:CONTRACT:ADMIN', module: 'CRM', submodule: 'CONTRACT', action: 'ADMIN', name: 'Contract Clauses Template', description: 'Configure standard indemnity and wage escalation clauses', minimumAuthority: 'A1_DIRECTOR_CEO' },

    'CRM:SLA:READ': { code: 'CRM:SLA:READ', module: 'CRM', submodule: 'SLA', action: 'READ', name: 'View SLA Target', description: 'View response time and uptime SLA benchmarks', minimumAuthority: 'A5_SITE_IN_CHARGE' },
    'CRM:SLA:CREATE': { code: 'CRM:SLA:CREATE', module: 'CRM', submodule: 'SLA', action: 'CREATE', name: 'Define SLA Rule', description: 'Set penalty parameters for guard shortfall or delay', minimumAuthority: 'A2_GENERAL_MANAGER' },
    'CRM:SLA:UPDATE': { code: 'CRM:SLA:UPDATE', module: 'CRM', submodule: 'SLA', action: 'UPDATE', name: 'Update SLA Metric', description: 'Adjust SLA threshold targets', minimumAuthority: 'A2_GENERAL_MANAGER' },
    'CRM:SLA:DELETE': { code: 'CRM:SLA:DELETE', module: 'CRM', submodule: 'SLA', action: 'DELETE', name: 'Remove SLA Rule', description: 'Delete obsolete SLA rule', minimumAuthority: 'A1_DIRECTOR_CEO' },
    'CRM:SLA:EXPORT': { code: 'CRM:SLA:EXPORT', module: 'CRM', submodule: 'SLA', action: 'EXPORT', name: 'Export SLA Scorecard', description: 'Export monthly SLA fulfillment report for client billing', minimumAuthority: 'A3_OFFICIAL_STAFF' },
    'CRM:SLA:APPROVE': { code: 'CRM:SLA:APPROVE', module: 'CRM', submodule: 'SLA', action: 'APPROVE', name: 'Waive SLA Penalty', description: 'Executive waiver for force majeure SLA breach', minimumAuthority: 'A0_OWNER' },
    'CRM:SLA:REPORT': { code: 'CRM:SLA:REPORT', module: 'CRM', submodule: 'SLA', action: 'REPORT', name: 'SLA Compliance Dashboard', description: 'Real-time incident response vs SLA contract', minimumAuthority: 'A4_REGIONAL_AREA_MANAGER' },
    'CRM:SLA:ADMIN': { code: 'CRM:SLA:ADMIN', module: 'CRM', submodule: 'SLA', action: 'ADMIN', name: 'SLA Engine Config', description: 'Configure automated penalty calculations', minimumAuthority: 'A1_DIRECTOR_CEO' },

    'CRM:SERVICE_DESK:READ': { code: 'CRM:SERVICE_DESK:READ', module: 'CRM', submodule: 'SERVICE_DESK', action: 'READ', name: 'View Client Tickets', description: 'View client complaints and service tickets', minimumAuthority: 'A5_SITE_IN_CHARGE' },
    'CRM:SERVICE_DESK:CREATE': { code: 'CRM:SERVICE_DESK:CREATE', module: 'CRM', submodule: 'SERVICE_DESK', action: 'CREATE', name: 'Log Client Complaint', description: 'Create ticket for client feedback or escalation', minimumAuthority: 'A5_SITE_IN_CHARGE' },
    'CRM:SERVICE_DESK:UPDATE': { code: 'CRM:SERVICE_DESK:UPDATE', module: 'CRM', submodule: 'SERVICE_DESK', action: 'UPDATE', name: 'Resolve Ticket', description: 'Log resolution steps and root cause', minimumAuthority: 'A5_SITE_IN_CHARGE' },
    'CRM:SERVICE_DESK:DELETE': { code: 'CRM:SERVICE_DESK:DELETE', module: 'CRM', submodule: 'SERVICE_DESK', action: 'DELETE', name: 'Close Ticket', description: 'Close ticket with client feedback rating', minimumAuthority: 'A4_REGIONAL_AREA_MANAGER' },
    'CRM:SERVICE_DESK:EXPORT': { code: 'CRM:SERVICE_DESK:EXPORT', module: 'CRM', submodule: 'SERVICE_DESK', action: 'EXPORT', name: 'Export Ticket History', description: 'Export ticket resolution audit log', minimumAuthority: 'A3_OFFICIAL_STAFF' },
    'CRM:SERVICE_DESK:APPROVE': { code: 'CRM:SERVICE_DESK:APPROVE', module: 'CRM', submodule: 'SERVICE_DESK', action: 'APPROVE', name: 'Sign off on Major Incident', description: 'Authorize formal client incident sign-off', minimumAuthority: 'A2_GENERAL_MANAGER' },
    'CRM:SERVICE_DESK:REPORT': { code: 'CRM:SERVICE_DESK:REPORT', module: 'CRM', submodule: 'SERVICE_DESK', action: 'REPORT', name: 'CSAT & NPS Scorecard', description: 'Client satisfaction metrics and turnaround time', minimumAuthority: 'A3_OFFICIAL_STAFF' },
    'CRM:SERVICE_DESK:ADMIN': { code: 'CRM:SERVICE_DESK:ADMIN', module: 'CRM', submodule: 'SERVICE_DESK', action: 'ADMIN', name: 'Service Desk Rules', description: 'Configure automated ticket assignment and escalation', minimumAuthority: 'A2_GENERAL_MANAGER' },

    // -------------------------------------------------------------
    // MODULE 8: BI (Business Intelligence)
    // -------------------------------------------------------------
    'BI:REPORT:READ': { code: 'BI:REPORT:READ', module: 'BI', submodule: 'REPORT', action: 'READ', name: 'View Standard Reports', description: 'View operational muster and finance reports', minimumAuthority: 'A4_REGIONAL_AREA_MANAGER' },
    'BI:REPORT:CREATE': { code: 'BI:REPORT:CREATE', module: 'BI', submodule: 'REPORT', action: 'CREATE', name: 'Build Custom Report', description: 'Design custom report queries', minimumAuthority: 'A3_OFFICIAL_STAFF' },
    'BI:REPORT:UPDATE': { code: 'BI:REPORT:UPDATE', module: 'BI', submodule: 'REPORT', action: 'UPDATE', name: 'Modify Report Template', description: 'Modify report filters and columns', minimumAuthority: 'A3_OFFICIAL_STAFF' },
    'BI:REPORT:DELETE': { code: 'BI:REPORT:DELETE', module: 'BI', submodule: 'REPORT', action: 'DELETE', name: 'Delete Report Template', description: 'Remove custom report layout', minimumAuthority: 'A2_GENERAL_MANAGER' },
    'BI:REPORT:EXPORT': { code: 'BI:REPORT:EXPORT', module: 'BI', submodule: 'REPORT', action: 'EXPORT', name: 'Bulk Export Data', description: 'Export large dataset across modules', minimumAuthority: 'A4_REGIONAL_AREA_MANAGER' },
    'BI:REPORT:APPROVE': { code: 'BI:REPORT:APPROVE', module: 'BI', submodule: 'REPORT', action: 'APPROVE', name: 'Publish Official Audit Report', description: 'Publish certified compliance audit report', minimumAuthority: 'A1_DIRECTOR_CEO' },
    'BI:REPORT:REPORT': { code: 'BI:REPORT:REPORT', module: 'BI', submodule: 'REPORT', action: 'REPORT', name: 'Report Execution Log', description: 'Audit who viewed or downloaded reports', minimumAuthority: 'A2_GENERAL_MANAGER' },
    'BI:REPORT:ADMIN': { code: 'BI:REPORT:ADMIN', module: 'BI', submodule: 'REPORT', action: 'ADMIN', name: 'BI Query Engine Config', description: 'Configure data warehouse sync and caching rules', minimumAuthority: 'A1_DIRECTOR_CEO' },

    'BI:ANALYTICS:READ': { code: 'BI:ANALYTICS:READ', module: 'BI', submodule: 'ANALYTICS', action: 'READ', name: 'View Analytics Dashboards', description: 'View interactive operational charts and heatmaps', minimumAuthority: 'A4_REGIONAL_AREA_MANAGER' },
    'BI:ANALYTICS:CREATE': { code: 'BI:ANALYTICS:CREATE', module: 'BI', submodule: 'ANALYTICS', action: 'CREATE', name: 'Create Custom Widget', description: 'Add chart widget to dashboard', minimumAuthority: 'A3_OFFICIAL_STAFF' },
    'BI:ANALYTICS:UPDATE': { code: 'BI:ANALYTICS:UPDATE', module: 'BI', submodule: 'ANALYTICS', action: 'UPDATE', name: 'Rearrange Dashboard', description: 'Customize dashboard card placements', minimumAuthority: 'A3_OFFICIAL_STAFF' },
    'BI:ANALYTICS:DELETE': { code: 'BI:ANALYTICS:DELETE', module: 'BI', submodule: 'ANALYTICS', action: 'DELETE', name: 'Remove Widget', description: 'Delete dashboard visualization', minimumAuthority: 'A2_GENERAL_MANAGER' },
    'BI:ANALYTICS:EXPORT': { code: 'BI:ANALYTICS:EXPORT', module: 'BI', submodule: 'ANALYTICS', action: 'EXPORT', name: 'Export Charts to PDF', description: 'Download visual dashboard summary', minimumAuthority: 'A3_OFFICIAL_STAFF' },
    'BI:ANALYTICS:APPROVE': { code: 'BI:ANALYTICS:APPROVE', module: 'BI', submodule: 'ANALYTICS', action: 'APPROVE', name: 'Approve Dashboard Theme', description: 'Set standard dashboard for company roles', minimumAuthority: 'A2_GENERAL_MANAGER' },
    'BI:ANALYTICS:REPORT': { code: 'BI:ANALYTICS:REPORT', module: 'BI', submodule: 'ANALYTICS', action: 'REPORT', name: 'Analytics Usage Insights', description: 'Track dashboard adoption across branches', minimumAuthority: 'A2_GENERAL_MANAGER' },
    'BI:ANALYTICS:ADMIN': { code: 'BI:ANALYTICS:ADMIN', module: 'BI', submodule: 'ANALYTICS', action: 'ADMIN', name: 'Analytics Aggregation Rules', description: 'Configure aggregation pipelines and rollup frequency', minimumAuthority: 'A1_DIRECTOR_CEO' },

    'BI:EXECUTIVE_BI:READ': { code: 'BI:EXECUTIVE_BI:READ', module: 'BI', submodule: 'EXECUTIVE_BI', action: 'READ', name: 'View C-Suite Executive BI', description: 'View high-level revenue, margin, headcount summary', minimumAuthority: 'A2_GENERAL_MANAGER' },
    'BI:EXECUTIVE_BI:CREATE': { code: 'BI:EXECUTIVE_BI:CREATE', module: 'BI', submodule: 'EXECUTIVE_BI', action: 'CREATE', name: 'Set Enterprise Targets', description: 'Define company EBITDA and headcount goals', minimumAuthority: 'A0_OWNER' },
    'BI:EXECUTIVE_BI:UPDATE': { code: 'BI:EXECUTIVE_BI:UPDATE', module: 'BI', submodule: 'EXECUTIVE_BI', action: 'UPDATE', name: 'Update Executive KPI', description: 'Modify target variance thresholds', minimumAuthority: 'A1_DIRECTOR_CEO' },
    'BI:EXECUTIVE_BI:DELETE': { code: 'BI:EXECUTIVE_BI:DELETE', module: 'BI', submodule: 'EXECUTIVE_BI', action: 'DELETE', name: 'Archive Annual Target', description: 'Archive financial year benchmarks', minimumAuthority: 'A0_OWNER' },
    'BI:EXECUTIVE_BI:EXPORT': { code: 'BI:EXECUTIVE_BI:EXPORT', module: 'BI', submodule: 'EXECUTIVE_BI', action: 'EXPORT', name: 'Export Board Presentation', description: 'Generate board-level PDF presentation', minimumAuthority: 'A1_DIRECTOR_CEO' },
    'BI:EXECUTIVE_BI:APPROVE': { code: 'BI:EXECUTIVE_BI:APPROVE', module: 'BI', submodule: 'EXECUTIVE_BI', action: 'APPROVE', name: 'Approve Annual Plan', description: 'Board approval of operational business plan', minimumAuthority: 'A0_OWNER' },
    'BI:EXECUTIVE_BI:REPORT': { code: 'BI:EXECUTIVE_BI:REPORT', module: 'BI', submodule: 'EXECUTIVE_BI', action: 'REPORT', name: 'Financial Margin Breakdown', description: 'Comprehensive P&L and site contribution margin', minimumAuthority: 'A1_DIRECTOR_CEO' },
    'BI:EXECUTIVE_BI:ADMIN': { code: 'BI:EXECUTIVE_BI:ADMIN', module: 'BI', submodule: 'EXECUTIVE_BI', action: 'ADMIN', name: 'Executive BI Security Gate', description: 'Configure restricted visibility to board members only', minimumAuthority: 'A0_OWNER' },

    'BI:PREDICTIVE:READ': { code: 'BI:PREDICTIVE:READ', module: 'BI', submodule: 'PREDICTIVE', action: 'READ', name: 'View Predictive Forecasts', description: 'View attrition forecast and cashflow projections', minimumAuthority: 'A2_GENERAL_MANAGER' },
    'BI:PREDICTIVE:CREATE': { code: 'BI:PREDICTIVE:CREATE', module: 'BI', submodule: 'PREDICTIVE', action: 'CREATE', name: 'Run Simulation Scenario', description: 'Run what-if scenario on wage increases or overtime', minimumAuthority: 'A2_GENERAL_MANAGER' },
    'BI:PREDICTIVE:UPDATE': { code: 'BI:PREDICTIVE:UPDATE', module: 'BI', submodule: 'PREDICTIVE', action: 'UPDATE', name: 'Calibrate Model Weights', description: 'Adjust forecasting sensitivity parameters', minimumAuthority: 'A1_DIRECTOR_CEO' },
    'BI:PREDICTIVE:DELETE': { code: 'BI:PREDICTIVE:DELETE', module: 'BI', submodule: 'PREDICTIVE', action: 'DELETE', name: 'Clear Cached Forecasts', description: 'Purge simulated projections', minimumAuthority: 'A2_GENERAL_MANAGER' },
    'BI:PREDICTIVE:EXPORT': { code: 'BI:PREDICTIVE:EXPORT', module: 'BI', submodule: 'PREDICTIVE', action: 'EXPORT', name: 'Export Forecast Dossier', description: 'Export simulation results to Excel', minimumAuthority: 'A2_GENERAL_MANAGER' },
    'BI:PREDICTIVE:APPROVE': { code: 'BI:PREDICTIVE:APPROVE', module: 'BI', submodule: 'PREDICTIVE', action: 'APPROVE', name: 'Adopt Predictive Model', description: 'Adopt forecasted headcount for next quarter hiring', minimumAuthority: 'A1_DIRECTOR_CEO' },
    'BI:PREDICTIVE:REPORT': { code: 'BI:PREDICTIVE:REPORT', module: 'BI', submodule: 'PREDICTIVE', action: 'REPORT', name: 'Forecasting Accuracy Log', description: 'Track predicted vs actual variance over time', minimumAuthority: 'A2_GENERAL_MANAGER' },
    'BI:PREDICTIVE:ADMIN': { code: 'BI:PREDICTIVE:ADMIN', module: 'BI', submodule: 'PREDICTIVE', action: 'ADMIN', name: 'Predictive Model Engine Setup', description: 'Configure forecasting algorithms', minimumAuthority: 'A0_OWNER' },

    // -------------------------------------------------------------
    // MODULE 9: BPM (Business Process Management)
    // -------------------------------------------------------------
    'BPM:APPROVAL:READ': { code: 'BPM:APPROVAL:READ', module: 'BPM', submodule: 'APPROVAL', action: 'READ', name: 'View Approvals', description: 'View pending and completed approval instances', minimumAuthority: 'A6_SUPERVISOR' },
    'BPM:APPROVAL:CREATE': { code: 'BPM:APPROVAL:CREATE', module: 'BPM', submodule: 'APPROVAL', action: 'CREATE', name: 'Submit for Approval', description: 'Submit transaction into multi-tier approval workflow', minimumAuthority: 'A9_SUPPORT' },
    'BPM:APPROVAL:UPDATE': { code: 'BPM:APPROVAL:UPDATE', module: 'BPM', submodule: 'APPROVAL', action: 'UPDATE', name: 'Reassign Approver', description: 'Reassign pending approval to another officer', minimumAuthority: 'A2_GENERAL_MANAGER' },
    'BPM:APPROVAL:DELETE': { code: 'BPM:APPROVAL:DELETE', module: 'BPM', submodule: 'APPROVAL', action: 'DELETE', name: 'Withdraw Approval Request', description: 'Cancel open approval instance', minimumAuthority: 'A5_SITE_IN_CHARGE' },
    'BPM:APPROVAL:EXPORT': { code: 'BPM:APPROVAL:EXPORT', module: 'BPM', submodule: 'APPROVAL', action: 'EXPORT', name: 'Export Approval Trail', description: 'Export complete multi-tier sign-off audit trail', minimumAuthority: 'A3_OFFICIAL_STAFF' },
    'BPM:APPROVAL:APPROVE': { code: 'BPM:APPROVAL:APPROVE', module: 'BPM', submodule: 'APPROVAL', action: 'APPROVE', name: 'Approve / Reject Transaction', description: 'Execute authoritative approval or rejection step', minimumAuthority: 'A5_SITE_IN_CHARGE' },
    'BPM:APPROVAL:REPORT': { code: 'BPM:APPROVAL:REPORT', module: 'BPM', submodule: 'APPROVAL', action: 'REPORT', name: 'Approval Bottleneck Analysis', description: 'Track approver turnaround times and delays', minimumAuthority: 'A3_OFFICIAL_STAFF' },
    'BPM:APPROVAL:ADMIN': { code: 'BPM:APPROVAL:ADMIN', module: 'BPM', submodule: 'APPROVAL', action: 'ADMIN', name: 'Workflow Builder', description: 'Design multi-tier approval steps and fallback chains', minimumAuthority: 'A2_GENERAL_MANAGER' },

    'BPM:DELEGATION:READ': { code: 'BPM:DELEGATION:READ', module: 'BPM', submodule: 'DELEGATION', action: 'READ', name: 'View Proxy Delegations', description: 'View active or upcoming proxy delegations', minimumAuthority: 'A6_SUPERVISOR' },
    'BPM:DELEGATION:CREATE': { code: 'BPM:DELEGATION:CREATE', module: 'BPM', submodule: 'DELEGATION', action: 'CREATE', name: 'Create Proxy Delegation', description: 'Delegate approval authority during absence / leave', minimumAuthority: 'A6_SUPERVISOR' },
    'BPM:DELEGATION:UPDATE': { code: 'BPM:DELEGATION:UPDATE', module: 'BPM', submodule: 'DELEGATION', action: 'UPDATE', name: 'Modify Delegation Scope', description: 'Extend or shorten delegation window', minimumAuthority: 'A6_SUPERVISOR' },
    'BPM:DELEGATION:DELETE': { code: 'BPM:DELEGATION:DELETE', module: 'BPM', submodule: 'DELEGATION', action: 'DELETE', name: 'Revoke Proxy Delegation', description: 'Immediately terminate active proxy authority', minimumAuthority: 'A6_SUPERVISOR' },
    'BPM:DELEGATION:EXPORT': { code: 'BPM:DELEGATION:EXPORT', module: 'BPM', submodule: 'DELEGATION', action: 'EXPORT', name: 'Export Delegation Audit Log', description: 'Export full proxy action history', minimumAuthority: 'A3_OFFICIAL_STAFF' },
    'BPM:DELEGATION:APPROVE': { code: 'BPM:DELEGATION:APPROVE', module: 'BPM', submodule: 'DELEGATION', action: 'APPROVE', name: 'Authorize Proxy Assignment', description: 'Admin approval for high-level executive proxy', minimumAuthority: 'A1_DIRECTOR_CEO' },
    'BPM:DELEGATION:REPORT': { code: 'BPM:DELEGATION:REPORT', module: 'BPM', submodule: 'DELEGATION', action: 'REPORT', name: 'Proxy Activity Report', description: 'Report actions executed under proxy authority', minimumAuthority: 'A3_OFFICIAL_STAFF' },
    'BPM:DELEGATION:ADMIN': { code: 'BPM:DELEGATION:ADMIN', module: 'BPM', submodule: 'DELEGATION', action: 'ADMIN', name: 'Delegation Policy Matrix', description: 'Configure maximum delegation duration and anti-chaining', minimumAuthority: 'A2_GENERAL_MANAGER' },

    'BPM:ESCALATION:READ': { code: 'BPM:ESCALATION:READ', module: 'BPM', submodule: 'ESCALATION', action: 'READ', name: 'View Escalation Rules', description: 'View SLA breach and reminder policies', minimumAuthority: 'A5_SITE_IN_CHARGE' },
    'BPM:ESCALATION:CREATE': { code: 'BPM:ESCALATION:CREATE', module: 'BPM', submodule: 'ESCALATION', action: 'CREATE', name: 'Create Escalation Policy', description: 'Set auto-escalation timer after X hours', minimumAuthority: 'A2_GENERAL_MANAGER' },
    'BPM:ESCALATION:UPDATE': { code: 'BPM:ESCALATION:UPDATE', module: 'BPM', submodule: 'ESCALATION', action: 'UPDATE', name: 'Update Escalation Policy', description: 'Modify SLA thresholds or target roles', minimumAuthority: 'A2_GENERAL_MANAGER' },
    'BPM:ESCALATION:DELETE': { code: 'BPM:ESCALATION:DELETE', module: 'BPM', submodule: 'ESCALATION', action: 'DELETE', name: 'Remove Escalation Rule', description: 'Delete escalation trigger', minimumAuthority: 'A2_GENERAL_MANAGER' },
    'BPM:ESCALATION:EXPORT': { code: 'BPM:ESCALATION:EXPORT', module: 'BPM', submodule: 'ESCALATION', action: 'EXPORT', name: 'Export Escalation Log', description: 'Export overdue and escalated transactions', minimumAuthority: 'A3_OFFICIAL_STAFF' },
    'BPM:ESCALATION:APPROVE': { code: 'BPM:ESCALATION:APPROVE', module: 'BPM', submodule: 'ESCALATION', action: 'APPROVE', name: 'Execute Manual Escalation', description: 'Manually escalate urgent blocked approval', minimumAuthority: 'A3_OFFICIAL_STAFF' },
    'BPM:ESCALATION:REPORT': { code: 'BPM:ESCALATION:REPORT', module: 'BPM', submodule: 'ESCALATION', action: 'REPORT', name: 'SLA Escalation Trend Report', description: 'Trend of transactions breaching approval SLAs', minimumAuthority: 'A3_OFFICIAL_STAFF' },
    'BPM:ESCALATION:ADMIN': { code: 'BPM:ESCALATION:ADMIN', module: 'BPM', submodule: 'ESCALATION', action: 'ADMIN', name: 'Escalation Engine Rules', description: 'Configure cron check frequency and notifications', minimumAuthority: 'A1_DIRECTOR_CEO' },

    'BPM:ROUTING_RULE:READ': { code: 'BPM:ROUTING_RULE:READ', module: 'BPM', submodule: 'ROUTING_RULE', action: 'READ', name: 'View Routing Rules', description: 'View dynamic workflow routing logic', minimumAuthority: 'A4_REGIONAL_AREA_MANAGER' },
    'BPM:ROUTING_RULE:CREATE': { code: 'BPM:ROUTING_RULE:CREATE', module: 'BPM', submodule: 'ROUTING_RULE', action: 'CREATE', name: 'Define Routing Rule', description: 'Route by department, site, or amount', minimumAuthority: 'A2_GENERAL_MANAGER' },
    'BPM:ROUTING_RULE:UPDATE': { code: 'BPM:ROUTING_RULE:UPDATE', module: 'BPM', submodule: 'ROUTING_RULE', action: 'UPDATE', name: 'Update Routing Rule', description: 'Adjust condition expressions and priorities', minimumAuthority: 'A2_GENERAL_MANAGER' },
    'BPM:ROUTING_RULE:DELETE': { code: 'BPM:ROUTING_RULE:DELETE', module: 'BPM', submodule: 'ROUTING_RULE', action: 'DELETE', name: 'Delete Routing Rule', description: 'Remove dynamic routing rule', minimumAuthority: 'A2_GENERAL_MANAGER' },
    'BPM:ROUTING_RULE:EXPORT': { code: 'BPM:ROUTING_RULE:EXPORT', module: 'BPM', submodule: 'ROUTING_RULE', action: 'EXPORT', name: 'Export Routing Matrix', description: 'Export business process routing table', minimumAuthority: 'A3_OFFICIAL_STAFF' },
    'BPM:ROUTING_RULE:APPROVE': { code: 'BPM:ROUTING_RULE:APPROVE', module: 'BPM', submodule: 'ROUTING_RULE', action: 'APPROVE', name: 'Approve Routing Changes', description: 'Authorize changes to core approval paths', minimumAuthority: 'A1_DIRECTOR_CEO' },
    'BPM:ROUTING_RULE:REPORT': { code: 'BPM:ROUTING_RULE:REPORT', module: 'BPM', submodule: 'ROUTING_RULE', action: 'REPORT', name: 'Routing Execution Audit', description: 'Inspect which rule matched which transaction', minimumAuthority: 'A3_OFFICIAL_STAFF' },
    'BPM:ROUTING_RULE:ADMIN': { code: 'BPM:ROUTING_RULE:ADMIN', module: 'BPM', submodule: 'ROUTING_RULE', action: 'ADMIN', name: 'Routing Rule Engine Setup', description: 'Configure precedence and fallback workflows', minimumAuthority: 'A1_DIRECTOR_CEO' },

    'BPM:THRESHOLD:READ': { code: 'BPM:THRESHOLD:READ', module: 'BPM', submodule: 'THRESHOLD', action: 'READ', name: 'View Threshold Limits', description: 'View financial authorization thresholds', minimumAuthority: 'A3_OFFICIAL_STAFF' },
    'BPM:THRESHOLD:CREATE': { code: 'BPM:THRESHOLD:CREATE', module: 'BPM', submodule: 'THRESHOLD', action: 'CREATE', name: 'Create Threshold Rule', description: 'Set financial limit for Single vs Multi-Tier approval', minimumAuthority: 'A1_DIRECTOR_CEO' },
    'BPM:THRESHOLD:UPDATE': { code: 'BPM:THRESHOLD:UPDATE', module: 'BPM', submodule: 'THRESHOLD', action: 'UPDATE', name: 'Modify Threshold Limit', description: 'Adjust financial limits (e.g. ₹50,000 to ₹1,00,000)', minimumAuthority: 'A1_DIRECTOR_CEO' },
    'BPM:THRESHOLD:DELETE': { code: 'BPM:THRESHOLD:DELETE', module: 'BPM', submodule: 'THRESHOLD', action: 'DELETE', name: 'Delete Threshold Rule', description: 'Remove threshold band', minimumAuthority: 'A0_OWNER' },
    'BPM:THRESHOLD:EXPORT': { code: 'BPM:THRESHOLD:EXPORT', module: 'BPM', submodule: 'THRESHOLD', action: 'EXPORT', name: 'Export Delegation of Financial Powers', description: 'Export DoFP financial matrix', minimumAuthority: 'A2_GENERAL_MANAGER' },
    'BPM:THRESHOLD:APPROVE': { code: 'BPM:THRESHOLD:APPROVE', module: 'BPM', submodule: 'THRESHOLD', action: 'APPROVE', name: 'Authorize Threshold Revision', description: 'Board/Promoter approval for financial limits', minimumAuthority: 'A0_OWNER' },
    'BPM:THRESHOLD:REPORT': { code: 'BPM:THRESHOLD:REPORT', module: 'BPM', submodule: 'THRESHOLD', action: 'REPORT', name: 'Threshold Breach Audit', description: 'Report high-value transactions triggering top tier', minimumAuthority: 'A1_DIRECTOR_CEO' },
    'BPM:THRESHOLD:ADMIN': { code: 'BPM:THRESHOLD:ADMIN', module: 'BPM', submodule: 'THRESHOLD', action: 'ADMIN', name: 'DoFP Master Governance', description: 'Configure organizational Delegation of Financial Powers', minimumAuthority: 'A0_OWNER' },

    // -------------------------------------------------------------
    // MODULE 10: GRC & ENTERPRISE SECURITY
    // -------------------------------------------------------------
    'GRC_SECURITY:SECURITY_AUDIT:READ': { code: 'GRC_SECURITY:SECURITY_AUDIT:READ', module: 'GRC_SECURITY', submodule: 'SECURITY_AUDIT', action: 'READ', name: 'View Security Audit Trail', description: 'View real-time immutable security event log', minimumAuthority: 'A2_GENERAL_MANAGER' },
    'GRC_SECURITY:SECURITY_AUDIT:CREATE': { code: 'GRC_SECURITY:SECURITY_AUDIT:CREATE', module: 'GRC_SECURITY', submodule: 'SECURITY_AUDIT', action: 'CREATE', name: 'Record Security Event', description: 'System-generated immutable audit record', minimumAuthority: 'A9_SUPPORT' },
    'GRC_SECURITY:SECURITY_AUDIT:UPDATE': { code: 'GRC_SECURITY:SECURITY_AUDIT:UPDATE', module: 'GRC_SECURITY', submodule: 'SECURITY_AUDIT', action: 'UPDATE', name: 'Annotate Audit Log', description: 'Append audit notes without mutating original record', minimumAuthority: 'A1_DIRECTOR_CEO' },
    'GRC_SECURITY:SECURITY_AUDIT:DELETE': { code: 'GRC_SECURITY:SECURITY_AUDIT:DELETE', module: 'GRC_SECURITY', submodule: 'SECURITY_AUDIT', action: 'DELETE', name: 'Purge Logs (FORBIDDEN)', description: 'Immutable zero-trust: Log deletion is strictly forbidden', minimumAuthority: 'A0_OWNER', allowedRoles: [] }, // Never allowed
    'GRC_SECURITY:SECURITY_AUDIT:EXPORT': { code: 'GRC_SECURITY:SECURITY_AUDIT:EXPORT', module: 'GRC_SECURITY', submodule: 'SECURITY_AUDIT', action: 'EXPORT', name: 'Export Security Audit Dossier', description: 'Export tamper-evident security audit log', minimumAuthority: 'A1_DIRECTOR_CEO' },
    'GRC_SECURITY:SECURITY_AUDIT:APPROVE': { code: 'GRC_SECURITY:SECURITY_AUDIT:APPROVE', module: 'GRC_SECURITY', submodule: 'SECURITY_AUDIT', action: 'APPROVE', name: 'Certify Security Audit Period', description: 'Formal quarterly sign-off on security posture', minimumAuthority: 'A0_OWNER' },
    'GRC_SECURITY:SECURITY_AUDIT:REPORT': { code: 'GRC_SECURITY:SECURITY_AUDIT:REPORT', module: 'GRC_SECURITY', submodule: 'SECURITY_AUDIT', action: 'REPORT', name: 'Security Posture Dashboard', description: 'Threat level and failed authentication frequency', minimumAuthority: 'A2_GENERAL_MANAGER' },
    'GRC_SECURITY:SECURITY_AUDIT:ADMIN': { code: 'GRC_SECURITY:SECURITY_AUDIT:ADMIN', module: 'GRC_SECURITY', submodule: 'SECURITY_AUDIT', action: 'ADMIN', name: 'Security Audit Configuration', description: 'Configure log retention and external SIEM forwarding', minimumAuthority: 'A0_OWNER', allowedRoles: ['SUPER_ADMIN', 'COMPANY_ADMIN'] },

    'GRC_SECURITY:ANOMALY:READ': { code: 'GRC_SECURITY:ANOMALY:READ', module: 'GRC_SECURITY', submodule: 'ANOMALY', action: 'READ', name: 'View Security Anomalies', description: 'View detected anomalies, scores, and evidence', minimumAuthority: 'A2_GENERAL_MANAGER' },
    'GRC_SECURITY:ANOMALY:CREATE': { code: 'GRC_SECURITY:ANOMALY:CREATE', module: 'GRC_SECURITY', submodule: 'ANOMALY', action: 'CREATE', name: 'Flag Manual Anomaly', description: 'Manually escalate suspicious user behavior', minimumAuthority: 'A3_OFFICIAL_STAFF' },
    'GRC_SECURITY:ANOMALY:UPDATE': { code: 'GRC_SECURITY:ANOMALY:UPDATE', module: 'GRC_SECURITY', submodule: 'ANOMALY', action: 'UPDATE', name: 'Update Anomaly Status', description: 'Transition status to UNDER_REVIEW, FALSE_POSITIVE, etc.', minimumAuthority: 'A2_GENERAL_MANAGER' },
    'GRC_SECURITY:ANOMALY:DELETE': { code: 'GRC_SECURITY:ANOMALY:DELETE', module: 'GRC_SECURITY', submodule: 'ANOMALY', action: 'DELETE', name: 'Dismiss Anomaly', description: 'Archive resolved anomaly record', minimumAuthority: 'A1_DIRECTOR_CEO' },
    'GRC_SECURITY:ANOMALY:EXPORT': { code: 'GRC_SECURITY:ANOMALY:EXPORT', module: 'GRC_SECURITY', submodule: 'ANOMALY', action: 'EXPORT', name: 'Export Anomaly Report', description: 'Export incident investigation timeline', minimumAuthority: 'A2_GENERAL_MANAGER' },
    'GRC_SECURITY:ANOMALY:APPROVE': { code: 'GRC_SECURITY:ANOMALY:APPROVE', module: 'GRC_SECURITY', submodule: 'ANOMALY', action: 'APPROVE', name: 'Resolve Security Incident', description: 'Authoritative sign-off on incident remediation', minimumAuthority: 'A1_DIRECTOR_CEO' },
    'GRC_SECURITY:ANOMALY:REPORT': { code: 'GRC_SECURITY:ANOMALY:REPORT', module: 'GRC_SECURITY', submodule: 'ANOMALY', action: 'REPORT', name: 'Threat Intelligence Report', description: 'Breakdown of anomalies by risk category', minimumAuthority: 'A2_GENERAL_MANAGER' },
    'GRC_SECURITY:ANOMALY:ADMIN': { code: 'GRC_SECURITY:ANOMALY:ADMIN', module: 'GRC_SECURITY', submodule: 'ANOMALY', action: 'ADMIN', name: 'Anomaly Detection Rules', description: 'Configure sensitivity thresholds for auto-detection', minimumAuthority: 'A0_OWNER', allowedRoles: ['SUPER_ADMIN', 'COMPANY_ADMIN'] },

    'GRC_SECURITY:INVESTIGATION:READ': { code: 'GRC_SECURITY:INVESTIGATION:READ', module: 'GRC_SECURITY', submodule: 'INVESTIGATION', action: 'READ', name: 'View Investigation Notes', description: 'View confidential evidence and timeline', minimumAuthority: 'A2_GENERAL_MANAGER' },
    'GRC_SECURITY:INVESTIGATION:CREATE': { code: 'GRC_SECURITY:INVESTIGATION:CREATE', module: 'GRC_SECURITY', submodule: 'INVESTIGATION', action: 'CREATE', name: 'Open Investigation Dossier', description: 'Assign investigator to critical anomaly', minimumAuthority: 'A2_GENERAL_MANAGER' },
    'GRC_SECURITY:INVESTIGATION:UPDATE': { code: 'GRC_SECURITY:INVESTIGATION:UPDATE', module: 'GRC_SECURITY', submodule: 'INVESTIGATION', action: 'UPDATE', name: 'Append Investigation Evidence', description: 'Add forensic notes, IP logs, or interview proof', minimumAuthority: 'A2_GENERAL_MANAGER' },
    'GRC_SECURITY:INVESTIGATION:DELETE': { code: 'GRC_SECURITY:INVESTIGATION:DELETE', module: 'GRC_SECURITY', submodule: 'INVESTIGATION', action: 'DELETE', name: 'Close Dossier', description: 'Archive finalized investigation dossier', minimumAuthority: 'A1_DIRECTOR_CEO' },
    'GRC_SECURITY:INVESTIGATION:EXPORT': { code: 'GRC_SECURITY:INVESTIGATION:EXPORT', module: 'GRC_SECURITY', submodule: 'INVESTIGATION', action: 'EXPORT', name: 'Export Forensic Evidence Dossier', description: 'Export signed digital evidence bundle', minimumAuthority: 'A1_DIRECTOR_CEO' },
    'GRC_SECURITY:INVESTIGATION:APPROVE': { code: 'GRC_SECURITY:INVESTIGATION:APPROVE', module: 'GRC_SECURITY', submodule: 'INVESTIGATION', action: 'APPROVE', name: 'Authorize Disciplinary / Legal Action', description: 'Authorize account suspension or legal action', minimumAuthority: 'A0_OWNER' },
    'GRC_SECURITY:INVESTIGATION:REPORT': { code: 'GRC_SECURITY:INVESTIGATION:REPORT', module: 'GRC_SECURITY', submodule: 'INVESTIGATION', action: 'REPORT', name: 'Investigation Resolution SLA', description: 'Mean time to resolve critical investigations', minimumAuthority: 'A1_DIRECTOR_CEO' },
    'GRC_SECURITY:INVESTIGATION:ADMIN': { code: 'GRC_SECURITY:INVESTIGATION:ADMIN', module: 'GRC_SECURITY', submodule: 'INVESTIGATION', action: 'ADMIN', name: 'Investigative Governance Rules', description: 'Configure chain of custody security protocols', minimumAuthority: 'A0_OWNER' },

    'GRC_SECURITY:COMPLIANCE_POLICY:READ': { code: 'GRC_SECURITY:COMPLIANCE_POLICY:READ', module: 'GRC_SECURITY', submodule: 'COMPLIANCE_POLICY', action: 'READ', name: 'View Compliance Policies', description: 'View statutory and corporate rule definitions', minimumAuthority: 'A3_OFFICIAL_STAFF' },
    'GRC_SECURITY:COMPLIANCE_POLICY:CREATE': { code: 'GRC_SECURITY:COMPLIANCE_POLICY:CREATE', module: 'GRC_SECURITY', submodule: 'COMPLIANCE_POLICY', action: 'CREATE', name: 'Define Compliance Policy', description: 'Create mandatory rest hour or overtime rule', minimumAuthority: 'A2_GENERAL_MANAGER' },
    'GRC_SECURITY:COMPLIANCE_POLICY:UPDATE': { code: 'GRC_SECURITY:COMPLIANCE_POLICY:UPDATE', module: 'GRC_SECURITY', submodule: 'COMPLIANCE_POLICY', action: 'UPDATE', name: 'Update Policy Conditions', description: 'Modify enforcement action or threshold limits', minimumAuthority: 'A2_GENERAL_MANAGER' },
    'GRC_SECURITY:COMPLIANCE_POLICY:DELETE': { code: 'GRC_SECURITY:COMPLIANCE_POLICY:DELETE', module: 'GRC_SECURITY', submodule: 'COMPLIANCE_POLICY', action: 'DELETE', name: 'Disable Policy', description: 'Retire obsolete compliance policy', minimumAuthority: 'A1_DIRECTOR_CEO' },
    'GRC_SECURITY:COMPLIANCE_POLICY:EXPORT': { code: 'GRC_SECURITY:COMPLIANCE_POLICY:EXPORT', module: 'GRC_SECURITY', submodule: 'COMPLIANCE_POLICY', action: 'EXPORT', name: 'Export Policy Rulebook', description: 'Export statutory compliance rulebook', minimumAuthority: 'A3_OFFICIAL_STAFF' },
    'GRC_SECURITY:COMPLIANCE_POLICY:APPROVE': { code: 'GRC_SECURITY:COMPLIANCE_POLICY:APPROVE', module: 'GRC_SECURITY', submodule: 'COMPLIANCE_POLICY', action: 'APPROVE', name: 'Enact Corporate Policy', description: 'Formal executive sign-off on company policy', minimumAuthority: 'A0_OWNER' },
    'GRC_SECURITY:COMPLIANCE_POLICY:REPORT': { code: 'GRC_SECURITY:COMPLIANCE_POLICY:REPORT', module: 'GRC_SECURITY', submodule: 'COMPLIANCE_POLICY', action: 'REPORT', name: 'Policy Evaluation Effectiveness', description: 'Track false alarms and transaction pass rates', minimumAuthority: 'A2_GENERAL_MANAGER' },
    'GRC_SECURITY:COMPLIANCE_POLICY:ADMIN': { code: 'GRC_SECURITY:COMPLIANCE_POLICY:ADMIN', module: 'GRC_SECURITY', submodule: 'COMPLIANCE_POLICY', action: 'ADMIN', name: 'GRC Engine Configuration', description: 'Configure automated violation blocking vs warnings', minimumAuthority: 'A1_DIRECTOR_CEO' },

    'GRC_SECURITY:VIOLATION:READ': { code: 'GRC_SECURITY:VIOLATION:READ', module: 'GRC_SECURITY', submodule: 'VIOLATION', action: 'READ', name: 'View Compliance Violations', description: 'View detected policy breaches across modules', minimumAuthority: 'A3_OFFICIAL_STAFF' },
    'GRC_SECURITY:VIOLATION:CREATE': { code: 'GRC_SECURITY:VIOLATION:CREATE', module: 'GRC_SECURITY', submodule: 'VIOLATION', action: 'CREATE', name: 'Report Manual Violation', description: 'Log manual regulatory breach finding', minimumAuthority: 'A3_OFFICIAL_STAFF' },
    'GRC_SECURITY:VIOLATION:UPDATE': { code: 'GRC_SECURITY:VIOLATION:UPDATE', module: 'GRC_SECURITY', submodule: 'VIOLATION', action: 'UPDATE', name: 'Update Remediation Plan', description: 'Document corrective actions and progress', minimumAuthority: 'A3_OFFICIAL_STAFF' },
    'GRC_SECURITY:VIOLATION:DELETE': { code: 'GRC_SECURITY:VIOLATION:DELETE', module: 'GRC_SECURITY', submodule: 'VIOLATION', action: 'DELETE', name: 'Dismiss Violation', description: 'Mark violation as false positive with audit note', minimumAuthority: 'A2_GENERAL_MANAGER' },
    'GRC_SECURITY:VIOLATION:EXPORT': { code: 'GRC_SECURITY:VIOLATION:EXPORT', module: 'GRC_SECURITY', submodule: 'VIOLATION', action: 'EXPORT', name: 'Export Violations Register', description: 'Export regulatory non-compliance log for audit', minimumAuthority: 'A3_OFFICIAL_STAFF' },
    'GRC_SECURITY:VIOLATION:APPROVE': { code: 'GRC_SECURITY:VIOLATION:APPROVE', module: 'GRC_SECURITY', submodule: 'VIOLATION', action: 'APPROVE', name: 'Sign off Violation Closure', description: 'Verify corrective action and close GRC finding', minimumAuthority: 'A1_DIRECTOR_CEO' },
    'GRC_SECURITY:VIOLATION:REPORT': { code: 'GRC_SECURITY:VIOLATION:REPORT', module: 'GRC_SECURITY', submodule: 'VIOLATION', action: 'REPORT', name: 'GRC Risk Scorecard', description: 'Company-wide compliance index and risk heat map', minimumAuthority: 'A2_GENERAL_MANAGER' },
    'GRC_SECURITY:VIOLATION:ADMIN': { code: 'GRC_SECURITY:VIOLATION:ADMIN', module: 'GRC_SECURITY', submodule: 'VIOLATION', action: 'ADMIN', name: 'Violation Escalation Engine', description: 'Configure automated BPM routing for high-risk findings', minimumAuthority: 'A1_DIRECTOR_CEO' },

    'GRC_SECURITY:PRIVILEGE_GOVERNANCE:READ': { code: 'GRC_SECURITY:PRIVILEGE_GOVERNANCE:READ', module: 'GRC_SECURITY', submodule: 'PRIVILEGE_GOVERNANCE', action: 'READ', name: 'View Privilege Matrix', description: 'View effective role permissions and scopes', minimumAuthority: 'A2_GENERAL_MANAGER' },
    'GRC_SECURITY:PRIVILEGE_GOVERNANCE:CREATE': { code: 'GRC_SECURITY:PRIVILEGE_GOVERNANCE:CREATE', module: 'GRC_SECURITY', submodule: 'PRIVILEGE_GOVERNANCE', action: 'CREATE', name: 'Assign User Role', description: 'Grant role or site scope to user account', minimumAuthority: 'A2_GENERAL_MANAGER', allowedRoles: ['COMPANY_ADMIN', 'SUPER_ADMIN', 'OWNER_PROMOTER', 'DIRECTOR_CEO'] },
    'GRC_SECURITY:PRIVILEGE_GOVERNANCE:UPDATE': { code: 'GRC_SECURITY:PRIVILEGE_GOVERNANCE:UPDATE', module: 'GRC_SECURITY', submodule: 'PRIVILEGE_GOVERNANCE', action: 'UPDATE', name: 'Modify Permissions', description: 'Elevate or restrict role capabilities', minimumAuthority: 'A1_DIRECTOR_CEO', allowedRoles: ['COMPANY_ADMIN', 'SUPER_ADMIN', 'OWNER_PROMOTER', 'DIRECTOR_CEO'] },
    'GRC_SECURITY:PRIVILEGE_GOVERNANCE:DELETE': { code: 'GRC_SECURITY:PRIVILEGE_GOVERNANCE:DELETE', module: 'GRC_SECURITY', submodule: 'PRIVILEGE_GOVERNANCE', action: 'DELETE', name: 'Revoke Access / Disable Account', description: 'Instantly revoke credentials and active sessions', minimumAuthority: 'A2_GENERAL_MANAGER', allowedRoles: ['COMPANY_ADMIN', 'SUPER_ADMIN', 'OWNER_PROMOTER', 'DIRECTOR_CEO'] },
    'GRC_SECURITY:PRIVILEGE_GOVERNANCE:EXPORT': { code: 'GRC_SECURITY:PRIVILEGE_GOVERNANCE:EXPORT', module: 'GRC_SECURITY', submodule: 'PRIVILEGE_GOVERNANCE', action: 'EXPORT', name: 'Export User Access Review (UAR)', description: 'Export quarterly User Access Review matrix for ISO/SOC2', minimumAuthority: 'A1_DIRECTOR_CEO' },
    'GRC_SECURITY:PRIVILEGE_GOVERNANCE:APPROVE': { code: 'GRC_SECURITY:PRIVILEGE_GOVERNANCE:APPROVE', module: 'GRC_SECURITY', submodule: 'PRIVILEGE_GOVERNANCE', action: 'APPROVE', name: 'Approve Privilege Escalation', description: 'Authorize elevated admin access grant', minimumAuthority: 'A0_OWNER', allowedRoles: ['SUPER_ADMIN', 'OWNER_PROMOTER'] },
    'GRC_SECURITY:PRIVILEGE_GOVERNANCE:REPORT': { code: 'GRC_SECURITY:PRIVILEGE_GOVERNANCE:REPORT', module: 'GRC_SECURITY', submodule: 'PRIVILEGE_GOVERNANCE', action: 'REPORT', name: 'Segregation of Duties (SoD) Audit', description: 'Audit conflicting permissions (e.g. Creator & Approver)', minimumAuthority: 'A1_DIRECTOR_CEO' },
    'GRC_SECURITY:PRIVILEGE_GOVERNANCE:ADMIN': { code: 'GRC_SECURITY:PRIVILEGE_GOVERNANCE:ADMIN', module: 'GRC_SECURITY', submodule: 'PRIVILEGE_GOVERNANCE', action: 'ADMIN', name: 'Zero-Trust RBAC Governance Engine', description: 'Configure zero-trust privilege boundaries and anti-forgery guards', minimumAuthority: 'A0_OWNER', allowedRoles: ['SUPER_ADMIN', 'OWNER_PROMOTER'] }
  };

  /**
   * Helper to check if a role's authority meets the minimum required authority
   */
  public static isAuthoritySufficient(userAuthority: AuthorityLevel, minAuthority: AuthorityLevel): boolean {
    const userRank = this.AUTHORITY_RANK[userAuthority] || 0;
    const minRank = this.AUTHORITY_RANK[minAuthority] || 0;
    return userRank >= minRank;
  }

  /**
   * Helper to check if user's data scope satisfies required data scope
   */
  public static isScopeSufficient(userScope: DataScope, requiredScope?: DataScope): boolean {
    if (!requiredScope) return true;
    const userRank = this.SCOPE_RANK[userScope] || 0;
    const reqRank = this.SCOPE_RANK[requiredScope] || 0;
    return userRank >= reqRank;
  }

  /**
   * Evaluates if a permission is granted for a given session and context
   */
  public static evaluatePermission(
    session: UserSession | null,
    permissionCode: StandardPermission,
    context?: AccessContext
  ): PrivilegeCheckResult {
    if (!session) {
      return { allowed: false, reason: 'Unauthenticated: No active session found.' };
    }

    // 1. Super Admin bypass (Global Administrator)
    if (session.role === 'SUPER_ADMIN') {
      return { allowed: true, userAuthority: 'A0_OWNER' };
    }

    // 2. Multi-tenant boundary validation
    if (context?.targetCompanyId && context.targetCompanyId !== session.companyId) {
      return {
        allowed: false,
        violatesTenant: true,
        reason: `Cross-tenant isolation violation: User belonging to ${session.companyId} cannot access data of ${context.targetCompanyId}.`
      };
    }

    const definition = this.PERMISSIONS[permissionCode];
    if (!definition) {
      return { allowed: false, reason: `Unknown permission definition code: ${permissionCode}` };
    }

    const userAuthority = session.authorityLevel || 'A9_SUPPORT';
    const userScope = session.dataScope || 'SELF';

    // 3. Role-specific explicit whitelist (if defined for the permission)
    if (definition.allowedRoles && definition.allowedRoles.length > 0) {
      if (!definition.allowedRoles.includes(session.role)) {
        return {
          allowed: false,
          violatesRole: true,
          requiredAuthority: definition.minimumAuthority,
          userAuthority,
          reason: `Role '${session.role}' is not in the explicit whitelist for permission ${permissionCode}.`
        };
      }
    }

    // 4. Authority Level Check
    if (!this.isAuthoritySufficient(userAuthority, definition.minimumAuthority)) {
      return {
        allowed: false,
        violatesRole: true,
        requiredAuthority: definition.minimumAuthority,
        userAuthority,
        reason: `Authority level '${userAuthority}' is below required minimum '${definition.minimumAuthority}' for ${permissionCode}.`
      };
    }

    // 5. Data Scope Contextual Checks
    if (context) {
      // Site scope restriction
      if (userScope === 'SITE') {
        const userSite = session.assignedSiteId || session.branchId;
        if (context.targetSiteId && userSite && context.targetSiteId !== userSite) {
          return {
            allowed: false,
            violatesScope: true,
            reason: `Site boundary violation: User assigned to site ${userSite} cannot access site ${context.targetSiteId}.`
          };
        }
      }

      // Region scope restriction
      if (userScope === 'REGION' || userScope === 'AREA') {
        const userRegion = session.assignedRegionId || session.regionId;
        if (context.targetRegionId && userRegion && context.targetRegionId !== userRegion) {
          return {
            allowed: false,
            violatesScope: true,
            reason: `Region boundary violation: User assigned to region ${userRegion} cannot access region ${context.targetRegionId}.`
          };
        }
      }

      // Self scope restriction
      if (userScope === 'SELF') {
        const userEmpId = session.employeeId || session.userId;
        if (context.targetOwnerId && context.targetOwnerId !== userEmpId && context.targetOwnerId !== session.userId) {
          return {
            allowed: false,
            violatesScope: true,
            reason: `Personal scope violation: User can only access self-owned records.`
          };
        }
      }
    }

    return { allowed: true, userAuthority };
  }

  /**
   * Maps legacy AppModuleKey and action to a StandardPermission code
   */
  public static mapLegacyActionToPermission(
    moduleKey: AppModuleKey,
    action: PermissionAction
  ): StandardPermission {
    switch (moduleKey) {
      case 'EMPLOYEES': return `HCM:EMPLOYEE:${action}`;
      case 'ID_BADGES': return `HCM:ID_BADGE:${action}`;
      case 'ATTENDANCE': return `WFM:ATTENDANCE:${action}`;
      case 'SHIFTS': return `WFM:SHIFT:${action}`;
      case 'SHIFT_ROSTER': return `WFM:ROSTER:${action}`;
      case 'LEAVE': return `WFM:LEAVE:${action}`;
      case 'PAYROLL': return `ERP_FINANCE:PAYROLL:${action}`;
      case 'BILLING': return `ERP_FINANCE:BILLING:${action}`;
      case 'COMPANY_BILLING': return `ERP_FINANCE:COMPANY_BILLING:${action}`;
      case 'SITE_OPERATIONS': return `OPERATIONS:SITE_OPS:${action}`;
      case 'GUARD_PATROL': return `OPERATIONS:GUARD_PATROL:${action}`;
      case 'VISITORS': return `OPERATIONS:VISITOR:${action}`;
      case 'SECURITY_INCIDENTS': return `OPERATIONS:INCIDENT:${action}`;
      case 'ASSETS': return `EAM:ASSET:${action}`;
      case 'INVENTORY': return `SCM:INVENTORY:${action}`;
      case 'CLIENTS': return `CRM:CLIENT:${action}`;
      case 'REPORTS': return `BI:REPORT:${action}`;
      case 'ANALYTICS': return `BI:ANALYTICS:${action}`;
      case 'APPROVAL_MANAGEMENT': return `BPM:APPROVAL:${action}`;
      case 'COMPLIANCE': return `GRC_SECURITY:COMPLIANCE_POLICY:${action}`;
      case 'COMPANY_MANAGEMENT': return `GRC_SECURITY:PRIVILEGE_GOVERNANCE:${action}`;
      default: return `OPERATIONS:SITE_OPS:${action}`;
    }
  }
}
