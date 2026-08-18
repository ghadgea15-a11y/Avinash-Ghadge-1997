export type KpiCategory = 
  | 'WORKFORCE' 
  | 'OPERATIONS' 
  | 'FINANCE' 
  | 'ASSETS' 
  | 'INVENTORY' 
  | 'CRM' 
  | 'SERVICE' 
  | 'COMPLIANCE' 
  | 'SECURITY';

export type KpiTrendDirection = 'UP' | 'DOWN' | 'STABLE';
export type KpiStatus = 'ON_TARGET' | 'WARNING' | 'CRITICAL' | 'NO_TARGET';

export interface KpiDefinition {
  kpiId: string;
  name: string;
  category: KpiCategory;
  description: string;
  calculationType: 'COUNT' | 'SUM' | 'AVERAGE' | 'PERCENTAGE' | 'RATIO';
  source: string;
  unit: string; // e.g., '%', 'USD', 'Count', 'Hrs'
  target?: number;
  warningThreshold?: number; // Depending on KPI, warning could be above or below target
  criticalThreshold?: number;
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY';
  active: boolean;
  visibilityPermissions: string[]; // e.g., ['A0_OWNER', 'A1_DIRECTOR_CEO']
  higherIsBetter: boolean;
}

export interface KpiValue {
  kpiId: string;
  name: string;
  category: KpiCategory;
  currentValue: number;
  previousValue: number | null;
  difference: number | null;
  percentageChange: number | null;
  trendDirection: KpiTrendDirection;
  status: KpiStatus;
  target?: number;
  unit: string;
}

export type SnapshotStatus = 'GENERATING' | 'COMPLETE' | 'PARTIAL' | 'FAILED';
export type DataQuality = 'COMPLETE' | 'PARTIAL' | 'INSUFFICIENT';

export interface KpiSnapshot {
  id: string; // SNAP_{companyId}_{snapshotDate}
  companyId: string;
  snapshotDate: string; // YYYY-MM-DD
  periodStart: string; // ISO
  periodEnd: string; // ISO
  generatedAt: string; // ISO
  timezone: string;
  values: KpiValue[];
  calculationVersion: string;
  status: SnapshotStatus;
  dataQuality: DataQuality;
  moduleDataQuality?: Record<string, DataQuality>;
  errorReason?: string;
}

// ============================================================================
// PREDICTIVE ANALYTICS TYPES
// ============================================================================

export type PredictionType = 'ATTRITION' | 'SLA_BREACH' | 'PROFITABILITY';
export type PredictionSubjectType = 'EMPLOYEE' | 'TICKET' | 'CONTRACT' | 'SITE' | 'CLIENT';
export type PredictionRiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | 'INSUFFICIENT_DATA';
export type PredictionDataQuality = 'SUFFICIENT' | 'PARTIAL' | 'INSUFFICIENT';

export interface PredictionRecord {
  id: string; // e.g., PRED_{companyId}_{type}_{subjectId}_{date}
  companyId: string;
  predictionType: PredictionType;
  subjectType: PredictionSubjectType;
  subjectId: string; // employeeId, ticketId, contractId, etc.
  subjectName?: string; // For UI convenience
  
  predictionDate: string; // YYYY-MM-DD
  analysisPeriodDays: number;
  
  riskScore: number | null; // 0-100, null if insufficient data
  riskLevel: PredictionRiskLevel;
  confidence: number | null; // 0-100
  dataQuality: PredictionDataQuality;
  
  contributingFactors: string[];
  recommendedActions: string[];
  
  modelVersion: string; // e.g., RULE_BASED_ATTRITION_V1
  generatedAt: string; // ISO
  validUntil?: string; // ISO
  
  actualOutcome?: string | null; // e.g., 'EXITED', 'BREACHED', 'PROFITABLE'
  outcomeRecordedAt?: string | null;
}

