import * as fs from 'fs';

const file = 'src/types/index.ts';
let content = fs.readFileSync(file, 'utf8');

const refresherTypes = `
// ============================================================================
// MODULE 13.3: MANDATORY REFRESHERS SYSTEM
// ============================================================================
export interface MandatoryRefresherConfig {
  id: string; // Internal GUID
  companyId: string;
  courseId: string; // Link to TrainingProgramRecord or Certification
  courseName: string;
  recurrenceIntervalMonths: number;
  gracePeriodDays: number;
  targetRoles: UserRole[]; // Which roles need this refresher
  blockingPolicy: 'WARN' | 'BLOCK_ROSTER' | 'MARK_NON_DEPLOYABLE';
  createdAt: string;
  updatedAt: string;
}

export type RefresherStatus = 'ACTIVE' | 'DUE_SOON' | 'IN_GRACE_PERIOD' | 'OVERDUE_LOCKED';

export interface RefresherCompletionRecord {
  completionDate: string; // ISO String
  certificateId?: string;
  trainerName?: string;
  score?: number;
}

export interface EmployeeRefresherStatus {
  id: string; // employeeId_courseId
  companyId: string;
  employeeId: string;
  employeeName: string;
  courseId: string;
  courseName: string;
  lastCompletedDate: string; // ISO String
  nextDueDate: string; // ISO String
  gracePeriodExpiryDate: string; // ISO String
  status: RefresherStatus;
  completionHistory: RefresherCompletionRecord[];
  createdAt: string;
  updatedAt: string;
}

export interface RefresherEnrollment {
  id: string;
  companyId: string;
  sessionId: string;
  courseId: string;
  employeeId: string;
  employeeName: string;
  attendanceStatus: 'PENDING' | 'ATTENDED' | 'MISSED';
  assessmentScore?: number;
  enrolledAt: string;
}
`;

if (!content.includes('MandatoryRefresherConfig')) {
  content = content.replace(
    '// ============================================================================',
    refresherTypes + '\n// ============================================================================'
  );
  fs.writeFileSync(file, content);
  console.log('Added Mandatory Refresher Types');
} else {
  console.log('Already exists');
}
