import re

with open('src/types/index.ts', 'r') as f:
    content = f.read()

types_block = """
// ==========================================
// MODULE 10 / POINT 4: BULK & EXPORT GOVERNANCE
// ==========================================

export type SensitiveDataClassification = 
  | 'EMPLOYEE_PII' 
  | 'PAYROLL_SALARY' 
  | 'BANK_DISBURSEMENT' 
  | 'STATUTORY_COMPLIANCE' 
  | 'CLIENT_CONTRACT' 
  | 'OPERATIONS_SECURITY' 
  | 'INVENTORY_SCM'
  | 'GENERAL';

export type BulkOperationType = 
  | 'BULK_UPDATE' 
  | 'BULK_ASSIGN' 
  | 'BULK_PUBLISH' 
  | 'BULK_UNPUBLISH'
  | 'BULK_DELETE' 
  | 'BULK_IMPORT' 
  | 'BULK_STATUS_CHANGE' 
  | 'BULK_APPROVE'
  | 'BATCH_RECALCULATE';

export type ExportDataFormat = 'CSV' | 'EXCEL' | 'PDF' | 'BANK_CMS_FILE' | 'JSON' | 'DOCUMENT';

export interface BulkAndExportAlertRecord {
  id: string;
  companyId: string;
  category: 'BULK_EDIT' | 'AFTER_HOURS_DOWNLOAD' | 'SENSITIVE_EXPORT' | 'HIGH_VOLUME_EXPORT' | 'UNAUTHORIZED_EXPORT' | 'REPEATED_ACTIVITY';
  eventType: 'BULK_OPERATION' | 'DATA_EXPORT';
  userId: string;
  userRole: string;
  userEmployeeId?: string;
  userName?: string;
  module: string;
  entityType: string;
  operation: string;
  affectedRecordCount: number;
  exportFormat?: ExportDataFormat;
  dataClassification?: SensitiveDataClassification;
  isAfterHours: boolean;
  localTimeHour: number;
  riskScore: number;
  severity: SecuritySeverity;
  rulesTriggered: string[];
  evidence: string;
  timestamp: string;
  status: 'DETECTED' | 'UNDER_REVIEW' | 'CONFIRMED' | 'FALSE_POSITIVE' | 'RESOLVED';
  reviewedBy?: string;
  reviewedAt?: string;
  resolutionNotes?: string;
  correlationId: string;
  affectedRecordIds?: string[];
  metadata?: Record<string, any>;
}

export interface SecurityGovernanceConfig {
  companyId: string;
  businessHoursStart: number; // 0-23, default 8 (08:00)
  businessHoursEnd: number;   // 0-23, default 20 (20:00)
  bulkWarningThreshold: number; // default 25 records
  exportWarningThreshold: number; // default 100 records
  sensitiveExportNotificationThreshold: SecuritySeverity; // default 'MEDIUM'
  repeatedDownloadWindowMinutes: number; // default 10 mins
  repeatedDownloadMaxCount: number; // default 3
  updatedAt?: string;
  updatedBy?: string;
}
"""

if "export interface BulkAndExportAlertRecord" not in content:
    content = content + "\n" + types_block

with open('src/types/index.ts', 'w') as f:
    f.write(content)
