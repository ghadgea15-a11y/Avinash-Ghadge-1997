import { UserSession } from './index';

export type OperationalAnomalyType = 
  | 'COST_SPIKE'
  | 'OVERTIME_SPIKE'
  | 'MAINTENANCE_SPIKE'
  | 'INCIDENT_SPIKE'
  | 'PROCUREMENT_ANOMALY'
  | 'ATTENDANCE_ANOMALY'
  | 'SECURITY_ANOMALY';

export type OperationalAnomalySeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type OperationalModuleSource = 
  | 'PAYROLL'
  | 'ATTENDANCE'
  | 'OVERTIME'
  | 'ASSETS'
  | 'MAINTENANCE'
  | 'PROCUREMENT'
  | 'INVENTORY'
  | 'INCIDENTS'
  | 'CONTRACTS'
  | 'OPERATIONS'
  | 'PATROL';

export interface OperationalSourceTransaction {
  id: string;
  module: OperationalModuleSource;
  referenceNumber: string;
  date: string;
  title: string;
  entityLevel: 'COMPANY' | 'REGION' | 'BRANCH' | 'SITE' | 'DEPARTMENT';
  entityId: string;
  entityName: string;
  regionId?: string;
  branchId?: string;
  siteId?: string;
  departmentId?: string;
  amount?: number;
  hours?: number;
  status: string;
  severity?: string;
  actorOrEmployee?: string;
  actorRole?: string;
  description: string;
  details: Record<string, any>;
}

export interface OperationalAnomaly {
  id: string;
  type: OperationalAnomalyType;
  severity: OperationalAnomalySeverity;
  title: string;
  description: string;
  entityLevel?: 'COMPANY' | 'REGION' | 'BRANCH' | 'SITE' | 'DEPARTMENT';
  entityId?: string;
  entityName?: string;
  regionId?: string;
  branchId?: string;
  siteId?: string;
  departmentId?: string;
  metricName?: string;
  currentValue?: number;
  baselineValue?: number;
  deviationPercent?: number;
  financialImpact?: number;
  rootCause?: string;
  recommendedAction?: string;
  sourceTransactionCount?: number;
  sourceTransactions?: OperationalSourceTransaction[];
  metricsContext?: Record<string, any>;
  timestamp: string;
}

export interface CostBreakdown {
  payrollGross: number;
  overtimeCost: number;
  maintenanceCost: number;
  procurementSpend: number;
  incidentLossImpact: number;
  inventoryValuation: number;
  totalOperationalCost: number;
}

export interface RiskScorecard {
  overallRiskScore: number; // 0 (Clean) - 100 (Extreme Hazard)
  riskGrade: 'LOW' | 'MODERATE' | 'ELEVATED' | 'SEVERE';
  incidentRiskScore: number;
  overtimeFatigueRiskScore: number;
  absenteeismRiskScore: number;
  maintenanceDeficitRiskScore: number;
  procurementVarianceRiskScore: number;
  activeCriticalAnomalies: number;
  activeHighAnomalies: number;
}

export interface HierarchyMetrics {
  headcount: number;
  activeEmployees: number;
  presentToday: number;
  absentToday: number;
  attendanceRate: number; // 0 - 100 %
  
  overtimeHoursTotal: number;
  overtimeCostTotal: number;
  overtimeRatePercent: number; // OT hours / Total Worked Hours %
  
  costBreakdown: CostBreakdown;
  costPerHeadcount: number;
  
  openIncidentsCount: number;
  criticalIncidentsCount: number;
  incidentLossTotal: number;
  
  activeAssetsCount: number;
  assetsInMaintenanceCount: number;
  openWorkOrdersCount: number;
  overdueWorkOrdersCount: number;
  maintenanceCostTotal: number;
  
  purchaseOrdersCount: number;
  procurementSpendTotal: number;
  inventoryItemsCount: number;
  inventoryTotalValue: number;
  
  activeContractsCount: number;
  contractTotalValue: number;
  
  riskScorecard: RiskScorecard;
  anomalies: OperationalAnomaly[];
  transactions: OperationalSourceTransaction[];
}

export interface OperationalHierarchyNode {
  id: string;
  name: string;
  code: string;
  level: 'COMPANY' | 'REGION' | 'BRANCH' | 'SITE' | 'DEPARTMENT';
  parentId?: string;
  parentName?: string;
  managerName?: string;
  metrics: HierarchyMetrics;
  children: OperationalHierarchyNode[];
}

export interface OperationalFilterOptions {
  startDate?: string;
  endDate?: string;
  regionId?: string;
  branchId?: string;
  siteId?: string;
  departmentId?: string;
  minSeverity?: OperationalAnomalySeverity;
}

export interface OperationalIntelligencePayload {
  companyId: string;
  companyName: string;
  generatedAt: string;
  periodStart: string;
  periodEnd: string;
  rootNode: OperationalHierarchyNode;
  allAnomalies: OperationalAnomaly[];
  totalCompanyCost: number;
  totalCompanyRiskScore: number;
}
