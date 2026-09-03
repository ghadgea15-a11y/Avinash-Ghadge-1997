import { 
  ShiftRiskScore, 
  RelieverCandidate, 
  AutoRelieverSuggestion,
  ShiftRiskFactor 
} from '../types/aiScheduling';
import { ComplianceExpiryService } from './complianceExpiryService';

export class AiSchedulingRelieverService {
  // Transparent rule-based no-show risk evaluation
  static evaluateShiftRisk(params: {
    assignmentId: string;
    employeeId: string;
    employeeName: string;
    siteId: string;
    siteName: string;
    shiftDate: string;
    shiftType: string;
    historicalAbsentRate?: number; // e.g. 0.05
    consecutiveDaysWorked?: number; // e.g. 6
    distanceKm?: number; // e.g. 24 km
    isNightShift?: boolean;
  }): ShiftRiskScore {
    const {
      assignmentId,
      employeeId,
      employeeName,
      siteId,
      siteName,
      shiftDate,
      shiftType,
      historicalAbsentRate = 0.04,
      consecutiveDaysWorked = 3,
      distanceKm = 12,
      isNightShift = false
    } = params;

    const factors: ShiftRiskFactor[] = [];
    let score = 20; // baseline risk score

    // Factor 1: Historical Absenteeism (Weight 0.35)
    if (historicalAbsentRate > 0.10) {
      score += 30;
      factors.push({
        factorName: 'Historical Absenteeism',
        weight: 0.35,
        impact: 'NEGATIVE',
        explanation: `Guard has ${(historicalAbsentRate * 100).toFixed(1)}% past absence rate on similar shifts.`
      });
    } else {
      score -= 10;
      factors.push({
        factorName: 'Reliable Attendance Record',
        weight: 0.35,
        impact: 'POSITIVE',
        explanation: `Guard exhibits strong ${(100 - historicalAbsentRate * 100).toFixed(1)}% attendance consistency.`
      });
    }

    // Factor 2: Fatigue Index / Consecutive Days (Weight 0.25)
    if (consecutiveDaysWorked >= 6) {
      score += 25;
      factors.push({
        factorName: 'High Shift Fatigue Index',
        weight: 0.25,
        impact: 'NEGATIVE',
        explanation: `Guard has worked ${consecutiveDaysWorked} consecutive shifts without rest day.`
      });
    } else if (consecutiveDaysWorked >= 4) {
      score += 10;
      factors.push({
        factorName: 'Moderate Shift Load',
        weight: 0.25,
        impact: 'NEUTRAL',
        explanation: `${consecutiveDaysWorked} shifts worked this cycle.`
      });
    }

    // Factor 3: Transit Distance (Weight 0.20)
    if (distanceKm > 20) {
      score += 20;
      factors.push({
        factorName: 'Extended Commute Transit',
        weight: 0.20,
        impact: 'NEGATIVE',
        explanation: `${distanceKm} km transit distance exposes shift to public transport delays.`
      });
    } else {
      factors.push({
        factorName: 'Proximity Buffer',
        weight: 0.20,
        impact: 'POSITIVE',
        explanation: `Short ${distanceKm} km distance ensures rapid dispatch response.`
      });
    }

    // Factor 4: Shift Timing (Weight 0.10)
    if (isNightShift) {
      score += 10;
      factors.push({
        factorName: 'Night Shift Fatigue Anomaly',
        weight: 0.10,
        impact: 'NEGATIVE',
        explanation: 'Night shifts have 1.4x higher sudden drop-off likelihood.'
      });
    }

    // Clamp score
    const compositeScore = Math.max(5, Math.min(95, score));
    const riskLevel = compositeScore >= 70 ? 'HIGH' : compositeScore >= 40 ? 'MEDIUM' : 'LOW';

    let suggestedAction = 'Standard roster assignment.';
    if (riskLevel === 'HIGH') {
      suggestedAction = 'Pre-standby reliever required. Contact guard 90 minutes prior to shift.';
    } else if (riskLevel === 'MEDIUM') {
      suggestedAction = 'Monitor muster check-in at T-15 minutes.';
    }

    return {
      assignmentId,
      employeeId,
      employeeName,
      siteId,
      siteName,
      shiftDate,
      shiftType,
      compositeScore,
      riskLevel,
      factors,
      suggestedAction,
      evaluatedAt: Date.now()
    };
  }

  // Find and rank auto-reliever candidates for a no-show or high-risk vacancy
  static getRelieverCandidates(
    companyId: string,
    siteId: string,
    isArmedPost: boolean = false
  ): RelieverCandidate[] {
    // Pool of potential reserve / off-duty guards
    const pool = [
      {
        employeeId: 'EMP-REL-01',
        employeeName: 'Anil Jadhav',
        phoneNumber: '+91 98201 12345',
        designation: 'Security Guard Grade 1',
        proximityKm: 3.2,
        currentWeeklyHours: 36,
        maxWeeklyHours: 48,
        historicalAttendanceRate: 99.2
      },
      {
        employeeId: 'EMP-REL-02',
        employeeName: 'Mahesh Sawant',
        phoneNumber: '+91 98201 23456',
        designation: 'Senior Guard / Head Guard',
        proximityKm: 6.8,
        currentWeeklyHours: 40,
        maxWeeklyHours: 48,
        historicalAttendanceRate: 97.5
      },
      {
        employeeId: 'EMP-REL-03',
        employeeName: 'Prakash Rao',
        phoneNumber: '+91 98201 34567',
        designation: 'Armed Guard (Ex-Serviceman)',
        proximityKm: 8.5,
        currentWeeklyHours: 32,
        maxWeeklyHours: 48,
        historicalAttendanceRate: 98.8
      },
      {
        employeeId: 'EMP-REL-04',
        employeeName: 'Kishore Shinde',
        phoneNumber: '+91 98201 45678',
        designation: 'Security Guard Grade 2',
        proximityKm: 18.0,
        currentWeeklyHours: 46,
        maxWeeklyHours: 48,
        historicalAttendanceRate: 92.0
      }
    ];

    const results: RelieverCandidate[] = [];

    for (const guard of pool) {
      // 1. Check Compliance
      const complianceCheck = ComplianceExpiryService.validateGuardShiftEligibility(
        companyId,
        guard.employeeId,
        isArmedPost
      );

      const overtimeHeadroomHours = Math.max(0, guard.maxWeeklyHours - guard.currentWeeklyHours);

      // Exclude guards with 0 overtime headroom
      if (overtimeHeadroomHours <= 0) continue;

      // Calculate composite match score (100 max)
      // Proximity: up to 40 pts (closer is better)
      const proximityScore = Math.max(0, 40 - guard.proximityKm * 2);
      // Overtime headroom: up to 30 pts (more headroom is better)
      const headroomScore = Math.min(30, overtimeHeadroomHours * 3.5);
      // Attendance track record: up to 30 pts
      const trackScore = (guard.historicalAttendanceRate / 100) * 30;

      const rankingScore = Math.round(proximityScore + headroomScore + trackScore);

      results.push({
        employeeId: guard.employeeId,
        employeeName: guard.employeeName,
        phoneNumber: guard.phoneNumber,
        designation: guard.designation,
        proximityKm: guard.proximityKm,
        currentWeeklyHours: guard.currentWeeklyHours,
        maxWeeklyHours: guard.maxWeeklyHours,
        overtimeHeadroomHours,
        complianceValid: complianceCheck.allowed,
        psaraStatus: complianceCheck.allowed ? 'ACTIVE' : 'EXPIRED',
        historicalAttendanceRate: guard.historicalAttendanceRate,
        rankingScore,
        recommendationReason: `${guard.proximityKm}km away • ${overtimeHeadroomHours}h OT headroom • ${guard.historicalAttendanceRate}% attendance`
      });
    }

    return results.sort((a, b) => b.rankingScore - a.rankingScore);
  }

  // Create an active auto-reliever suggestion workflow
  static createRelieverWorkflow(
    companyId: string,
    noShowAssignmentId: string,
    siteId: string,
    siteName: string,
    originalGuardId: string,
    originalGuardName: string,
    shiftDate: string,
    shiftType: string,
    isArmedPost: boolean = false
  ): AutoRelieverSuggestion {
    const candidates = this.getRelieverCandidates(companyId, siteId, isArmedPost);

    return {
      noShowAssignmentId,
      siteId,
      siteName,
      originalGuardId,
      originalGuardName,
      shiftDate,
      shiftType,
      candidates,
      status: 'PENDING_SUPERVISOR'
    };
  }
}
