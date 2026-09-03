// ============================================================================
// AI-ASSISTED SCHEDULING & NO-SHOW PREDICTION (MODULE 5)
// Transparent Rule-Based Scorer & Auto-Reliever Engine
// ============================================================================

export type ShiftRiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export interface ShiftRiskFactor {
  factorName: string;
  weight: number; // e.g. 0 to 1
  impact: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE';
  explanation: string;
}

export interface ShiftRiskScore {
  assignmentId: string;
  employeeId: string;
  employeeName: string;
  siteId: string;
  siteName: string;
  shiftDate: string; // YYYY-MM-DD
  shiftType: string;
  compositeScore: number; // 0 to 100
  riskLevel: ShiftRiskLevel;
  factors: ShiftRiskFactor[];
  suggestedAction?: string;
  evaluatedAt: number | string;
}

export interface RelieverCandidate {
  employeeId: string;
  employeeName: string;
  phoneNumber?: string;
  designation: string;
  proximityKm: number;
  currentWeeklyHours: number;
  maxWeeklyHours: number;
  overtimeHeadroomHours: number;
  complianceValid: boolean;
  psaraStatus: 'ACTIVE' | 'EXPIRED' | 'MISSING';
  historicalAttendanceRate: number; // e.g. 98.5%
  rankingScore: number; // Higher is better match
  recommendationReason: string;
}

export interface AutoRelieverSuggestion {
  noShowAssignmentId: string;
  siteId: string;
  siteName: string;
  originalGuardId: string;
  originalGuardName: string;
  shiftDate: string;
  shiftType: string;
  candidates: RelieverCandidate[];
  status: 'PENDING_SUPERVISOR' | 'ACCEPTED' | 'DECLINED' | 'TIMEOUT';
  selectedRelieverId?: string;
  supervisorConfirmedAt?: number | string;
  supervisorId?: string;
}
