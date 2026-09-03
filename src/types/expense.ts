export type ExpenseCategory = 
  | 'TRAVEL_FARE'
  | 'LODGING'
  | 'MEALS_FOOD'
  | 'FUEL_MILEAGE'
  | 'CLIENT_ENTERTAINMENT'
  | 'OFFICE_SUPPLIES'
  | 'EQUIPMENT_REPAIR'
  | 'UNIFORM_SAFETY_GEAR'
  | 'COMMUNICATION_INTERNET'
  | 'MISCELLANEOUS';

export type ExpenseClaimStatus = 
  | 'DRAFT'
  | 'SUBMITTED'
  | 'UNDER_MANAGER_REVIEW'
  | 'UNDER_FINANCE_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'PAID'
  | 'CANCELLED';

export interface ExpenseReceiptItem {
  id: string;
  category: ExpenseCategory;
  amount: number;
  taxAmount?: number;
  currency: string;
  expenseDate: string;
  merchantName: string;
  merchantGstin?: string;
  receiptDocumentUrl?: string;
  ocrExtracted: boolean;
  ocrConfidenceScore?: number;
  ocrExtractionStatus?: 'SUCCESS' | 'LOW_CONFIDENCE' | 'FAILED_MANUAL_REVIEW_REQUIRED' | 'MANUAL_ENTRY';
  requiresManualReview?: boolean;
  manualReviewReason?: string;
  description: string;
  isPolicyViolated: boolean;
  policyViolationReason?: string;
}

export interface ExpenseClaimRecord {
  id: string;
  companyId: string;
  employeeId: string;
  employeeName: string;
  costCenterId?: string;
  departmentId?: string;
  siteId?: string;
  costCenterCode?: string;
  title: string;
  totalAmount: number;
  totalTaxAmount: number;
  currency: string;
  status: ExpenseClaimStatus;
  travelRequestId?: string; // Linked travel trip if any
  items: ExpenseReceiptItem[];
  requiresManualReview?: boolean;
  manualReviewReason?: string;
  submissionDate: string;
  approvedDate?: string;
  approvedBy?: string;
  payrollMonthYear?: string; // e.g., '2026-09' when disbursed in payroll
  bpmInstanceId?: string;
  rejectionReason?: string;
  remarks?: string;
  createdAt: string;
  updatedAt: string;
}

export type TravelRequestStatus = 
  | 'DRAFT'
  | 'SUBMITTED'
  | 'APPROVED'
  | 'REJECTED'
  | 'COMPLETED'
  | 'CANCELLED';

export interface TravelRequestRecord {
  id: string;
  companyId: string;
  employeeId: string;
  employeeName: string;
  costCenterId?: string;
  purpose: string;
  originCity: string;
  destinationCity: string;
  departureDate: string;
  returnDate: string;
  estimatedBudget: number;
  advanceRequestedAmount: number;
  advanceDisbursed: boolean;
  status: TravelRequestStatus;
  bpmInstanceId?: string;
  approverId?: string;
  approverComments?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ExpensePolicyRule {
  category: ExpenseCategory;
  dailyCapAmount: number;
  receiptRequiredThreshold: number; // e.g. amounts above 200 require mandatory receipt upload
  allowedRoleLevels: string[];
}

export interface ExpensePolicyRecord {
  id: string;
  companyId: string;
  name: string;
  rules: ExpensePolicyRule[];
  mileageRatePerKm: number; // e.g. Rs 8/km for two-wheeler, Rs 14/km for four-wheeler
  perDiemAllowancePerDay: number;
  autoApproveBelowAmount?: number;
  isActive: boolean;
  updatedAt: string;
}
