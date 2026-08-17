import { 
  ShiftRecord, 
  AttendanceRecord, 
  AttendanceStatus, 
  RosterRecord,
  OvertimePolicyRecord,
  AttendanceCalculationResult
} from '../types';
import { AttendanceCalculationEngine } from './calculationEngine';

export class WfmService {
  /**
   * Calculates the work date for a shift.
   * Usually the date the shift starts.
   */
  static getWorkDate(startTime: string, date: string): string {
    return date; // Simple implementation, can be expanded if business rules differ
  }

  /**
   * Parses "HH:mm" to minutes from start of day
   */
  static parseTimeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  /**
   * Calculates duration in minutes between two ISO strings
   */
  static calculateDurationMinutes(startIso: string, endIso: string): number {
    const start = new Date(startIso);
    const end = new Date(endIso);
    return Math.floor((end.getTime() - start.getTime()) / (1000 * 60));
  }

  /**
   * Determines if a punch is within the allowed window
   */
  static isWithinPunchWindow(date: string, shiftStartTime: string, punchTime: string): boolean {
    const rosterStart = new Date(`${date}T${shiftStartTime}:00`);
    const punch = new Date(punchTime);
    
    // Allowed window: 2 hours before shift start
    const windowStart = new Date(rosterStart.getTime() - 120 * 60 * 1000);
    return punch >= windowStart;
  }

  /**
   * Comprehensive attendance, late, early departure and overtime calculation
   */
  static calculateAttendanceMetrics(
    shift: ShiftRecord, 
    date: string,
    checkInIso?: string, 
    checkOutIso?: string,
    policy?: OvertimePolicyRecord
  ): {
    lateMinutes: number;
    earlyDepartureMinutes: number;
    workedMinutes: number;
    overtimeMinutes: number;
    scheduledMinutes?: number;
    breakMinutes?: number;
    netWorkedMinutes?: number;
    shortfallMinutes?: number;
    approvedOvertimeMinutes?: number;
    unapprovedOvertimeMinutes?: number;
    status: AttendanceStatus;
    humanExplanation?: string;
    exceptions?: string[];
  } {
    const res = AttendanceCalculationEngine.calculate({
      workDate: date,
      shift,
      checkInIso,
      checkOutIso,
      policy
    });

    return {
      lateMinutes: res.lateMinutes,
      earlyDepartureMinutes: res.earlyDepartureMinutes,
      workedMinutes: res.workedMinutes,
      overtimeMinutes: res.calculatedOvertimeMinutes,
      scheduledMinutes: res.scheduledMinutes,
      breakMinutes: res.breakMinutes,
      netWorkedMinutes: res.netWorkedMinutes,
      shortfallMinutes: res.shortfallMinutes,
      approvedOvertimeMinutes: res.approvedOvertimeMinutes,
      unapprovedOvertimeMinutes: res.unapprovedOvertimeMinutes,
      status: res.status,
      humanExplanation: res.humanExplanation,
      exceptions: res.exceptions
    };
  }

  /**
   * Formats minutes to HH:mm or Xh Ym
   */
  static formatMinutes(minutes: number): string {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  }

  static formatDuration(minutes: number): string {
    return AttendanceCalculationEngine.formatDuration(minutes);
  }
}

