const fs = require('fs');
const file = 'src/types/index.ts';
let content = fs.readFileSync(file, 'utf8');

const newTypes = `
export interface LeaveBalanceDetail {
  leaveCode: string;
  leaveName: string;
  openingBalance: number;
  accrued: number;
  used: number;
  pending: number;
  adjusted: number;
  carriedForward: number;
  encashed: number;
  availableBalance: number;
}

export interface LeaveRequestRecord {
  id: string;
  companyId: string;
  employeeId: string;
  employeeName?: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  daysCount: number;
  totalDays?: number;
  reason: string;
  status: 'PENDING' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'WITHDRAWN';
  approvedBy?: string;
  rejectionReason?: string;
  appliedOn?: string;
  appliedAt?: string;
  createdAt?: string;
  updatedAt?: string;
  documents?: string[];
  [key: string]: any;
}

export interface LeavePolicyRecord {
  id: string;
  companyId: string;
  policyCode?: string;
  policyName?: string;
  leaveCode?: string;
  leaveName?: string;
  leaveType?: 'CASUAL' | 'SICK' | 'EARNED' | 'MATERNITY' | 'PATERNITY' | 'UNPAID' | 'COMP_OFF' | string;
  annualAllocation?: number;
  annualEntitlement?: number;
  carryForwardAllowed: boolean;
  maxCarryForward?: number;
  encashmentAllowed: boolean;
  minNoticeDays: number;
  applicableToGenders: 'ALL' | 'MALE' | 'FEMALE';
  status: 'ACTIVE' | 'INACTIVE';
  [key: string]: any;
}

export interface LeaveBalanceRecord {
  id: string;
  companyId: string;
  employeeId: string;
  employeeName?: string;
  year: number;
  balances: LeaveBalanceDetail[];
  accrued?: Record<string, number>;
  used?: Record<string, number>;
  lastUpdated?: string;
  updatedAt?: string;
}

export interface AbsenceRegularizationRecord {
  id: string;
  companyId: string;
  employeeId: string;
  employeeName: string;
  date: string;
  reason: string;
  adjustmentType: 'MARK_PRESENT' | 'APPLY_LEAVE' | 'MARK_HALF_DAY';
  leaveType?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  approvedBy?: string;
  createdAt: string;
}

export interface HolidayRecord {
  id: string;
  companyId: string;
  name: string;
  date: string;
  type: 'MANDATORY' | 'RESTRICTED';
  applicableRegions: string[];
}
`;

// replace previous types I inserted
content = content.replace(/export interface LeaveRequestRecord \{[\s\S]*?\}\n/g, '');
content = content.replace(/export interface LeavePolicyRecord \{[\s\S]*?\}\n/g, '');
content = content.replace(/export interface LeaveBalanceRecord \{[\s\S]*?\}\n/g, '');
content = content.replace(/export interface HolidayRecord \{[\s\S]*?\}\n/g, '');
content = content.replace(/export interface AbsenceRegularizationRecord \{[\s\S]*?\}\n/g, '');
content = content.replace(/export interface LeaveBalanceDetail \{[\s\S]*?\}\n/g, '');

content += newTypes;
fs.writeFileSync(file, content);
