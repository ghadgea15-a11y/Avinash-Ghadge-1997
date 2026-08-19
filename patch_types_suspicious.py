import re

with open('src/types/index.ts', 'r') as f:
    content = f.read()

suspicious_model = """export interface SuspiciousMusterPunch {
  id: string;
  companyId: string;
  siteId: string;
  employeeId: string;
  attendanceId?: string;
  shiftId?: string;
  punchType: 'PUNCH_IN' | 'PUNCH_OUT';
  punchTimestamp: string;
  detectedAt: string;
  anomalyType: 'GEOFENCE_VIOLATION' | 'SHIFT_MISMATCH' | 'RAPID_PUNCH' | 'DUPLICATE_PUNCH' | 'IMPOSSIBLE_SEQUENCE' | 'INACTIVE_EMPLOYEE' | 'DEVICE_TAMPERING';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  riskScore: number;
  evidence: string;
  status: 'DETECTED' | 'UNDER_REVIEW' | 'CONFIRMED_ANOMALY' | 'FALSE_POSITIVE' | 'RESOLVED';
  reviewedBy?: string;
  reviewedAt?: string;
  resolution?: string;
  correlationId?: string;
}
"""

if "export interface SuspiciousMusterPunch" not in content:
    content = content.replace("export interface AuditTrailRecord {", suspicious_model + "\nexport interface AuditTrailRecord {")

with open('src/types/index.ts', 'w') as f:
    f.write(content)
