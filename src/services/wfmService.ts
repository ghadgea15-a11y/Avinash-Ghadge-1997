import { 
  ShiftRecord, 
  AttendanceRecord, 
  AttendanceStatus,
  RosterRecord
} from '../types';

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
   * Calculates late and early departure minutes
   */
  static calculateAttendanceMetrics(
    shift: ShiftRecord, 
    date: string,
    checkInIso?: string, 
    checkOutIso?: string
  ): {
    lateMinutes: number;
    earlyDepartureMinutes: number;
    workedMinutes: number;
    overtimeMinutes: number;
    status: AttendanceStatus;
  } {
    let lateMinutes = 0;
    let earlyDepartureMinutes = 0;
    let workedMinutes = 0;
    let overtimeMinutes = 0;
    let status: AttendanceStatus = 'SCHEDULED';

    const shiftStart = new Date(`${date}T${shift.startTime}:00`);
    let shiftEnd = new Date(`${date}T${shift.endTime}:00`);
    
    if (shift.isCrossMidnight) {
      shiftEnd = new Date(shiftEnd.getTime() + 24 * 60 * 60 * 1000);
    }

    if (checkInIso) {
      const checkIn = new Date(checkInIso);
      const diff = Math.floor((checkIn.getTime() - shiftStart.getTime()) / (1000 * 60));
      
      if (diff > shift.gracePeriodMinutes) {
        lateMinutes = diff;
        status = 'LATE';
      } else {
        status = 'PRESENT';
      }
    }

    if (checkOutIso && checkInIso) {
      const checkOut = new Date(checkOutIso);
      workedMinutes = this.calculateDurationMinutes(checkInIso, checkOutIso);
      
      const earlyDiff = Math.floor((shiftEnd.getTime() - checkOut.getTime()) / (1000 * 60));
      if (earlyDiff > shift.earlyDepartureThresholdMinutes) {
        earlyDepartureMinutes = earlyDiff;
        if (status === 'PRESENT') status = 'EARLY_DEPARTURE';
      }

      const totalScheduledMinutes = shift.shiftDurationMinutes;
      if (workedMinutes > totalScheduledMinutes) {
        overtimeMinutes = workedMinutes - totalScheduledMinutes;
      }
    }

    return { lateMinutes, earlyDepartureMinutes, workedMinutes, overtimeMinutes, status };
  }

  /**
   * Formats minutes to HH:mm
   */
  static formatMinutes(minutes: number): string {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  }
}
