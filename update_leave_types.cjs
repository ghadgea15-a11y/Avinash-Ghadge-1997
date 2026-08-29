const fs = require('fs');
const file = 'src/types/index.ts';
let content = fs.readFileSync(file, 'utf8');

const newTypes = `
export interface LeaveRequestRecord {
  id: string;
  companyId: string;
  employeeId: string;
  employeeName: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  approvedBy?: string;
  rejectionReason?: string;
  appliedOn: string;
  documents?: string[];
}

export interface LeavePolicyRecord {
  id: string;
  companyId: string;
  policyCode: string;
  policyName: string;
  leaveType: 'CASUAL' | 'SICK' | 'EARNED' | 'MATERNITY' | 'PATERNITY' | 'UNPAID' | 'COMP_OFF';
  annualAllocation: number;
  carryForwardAllowed: boolean;
  maxCarryForward?: number;
  encashmentAllowed: boolean;
  minNoticeDays: number;
  applicableToGenders: 'ALL' | 'MALE' | 'FEMALE';
  status: 'ACTIVE' | 'INACTIVE';
}

export interface LeaveBalanceRecord {
  id: string;
  companyId: string;
  employeeId: string;
  year: number;
  balances: Record<string, number>; // leaveType -> balance
  accrued: Record<string, number>;
  used: Record<string, number>;
  lastUpdated: string;
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

content = content.replace(/export interface LeaveRequestRecord \{ \[key: string\]: any; \}/g, '');
content = content.replace(/export interface LeavePolicyRecord \{ \[key: string\]: any; \}/g, '');
content = content.replace(/export interface LeaveBalanceRecord \{ \[key: string\]: any; \}/g, '');
content = content.replace(/export interface HolidayRecord \{ \[key: string\]: any; \}/g, '');
content = content.replace(/export interface LeaveBalanceDetail \{ \[key: string\]: any; \}/g, '');

content += newTypes;
fs.writeFileSync(file, content);
