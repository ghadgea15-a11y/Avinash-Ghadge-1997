export type ScalabilityDomain = 
  | 'FIRESTORE_SCHEMA'
  | 'INDEXES'
  | 'QUERIES'
  | 'PAGINATION'
  | 'REALTIME_LISTENERS'
  | 'SECURITY_RULES'
  | 'WEB_RENDERING'
  | 'ANDROID_PERFORMANCE'
  | 'OFFLINE_STORAGE'
  | 'NOTIFICATIONS'
  | 'REPORTS_AGGREGATION'
  | 'AUDIT_LOGS_BACKGROUND';

export type ScalabilityTestStatus = 'IDLE' | 'FAIL' | 'ROOT_CAUSE_IDENTIFIED' | 'FIX_APPLIED' | 'RETESTING' | 'REGRESSION_CHECK' | 'PASS';

export interface ScalabilityMetric {
  id: string;
  domain: ScalabilityDomain;
  title: string;
  baseline5Sites: {
    datasetSize: string;
    readsPerQuery: number;
    latencyMs: number;
    memoryKb: number;
    status: 'OPTIMAL' | 'ACCEPTABLE' | 'DEGRADED';
  };
  scaled500Sites: {
    datasetSize: string;
    unmitigatedReads: number;
    unmitigatedLatencyMs: number;
    unmitigatedMemoryKb: number;
    mitigatedReads: number;
    mitigatedLatencyMs: number;
    mitigatedMemoryKb: number;
    efficiencyGainPercent: number;
    status: 'OPTIMAL' | 'ACCEPTABLE' | 'DEGRADED';
  };
  bottleneckDescription: string;
  rootCause: string;
  architecturalFix: string;
  securityImpact: string;
  tenantIsolationGuarantee: string;
  testStatus: ScalabilityTestStatus;
  testOutputLogs: string[];
}

export interface ScalabilityBenchmarkResult {
  timestamp: string;
  companyId: string;
  companyName: string;
  totalSitesSimulated: number;
  totalEmployeesSimulated: number;
  totalDailyTransactions: number;
  overallHealthScore: number; // 0 - 100
  domainResults: ScalabilityMetric[];
  summary: {
    totalUnmitigatedReadsPerDay: number;
    totalMitigatedReadsPerDay: number;
    costReductionFactor: string;
    p99LatencyMs: number;
    mobileMemoryFootprintMb: number;
    allTestsPassed: boolean;
  };
}

export interface CursorPaginationResult<T> {
  items: T[];
  lastVisibleDocId?: string;
  hasMore: boolean;
  totalCount?: number;
  pageSize: number;
  executionTimeMs: number;
  readsCount: number;
}
