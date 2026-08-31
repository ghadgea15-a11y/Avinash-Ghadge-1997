import { MaterialMovementRecord } from '../types';

export interface VehicleAnomalyCheckResult {
  isAnomaly: boolean;
  anomalyType?: 'EXCESSIVE_DAILY_TRIPS' | 'RAPID_TURNAROUND' | 'IRREGULAR_MULTIPLE_ENTRIES';
  severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  todayTripCount: number;
  lastTripTime?: string;
  minutesSinceLastTrip?: number;
  recentTrips: Array<{
    id: string;
    gatePassNumber: string;
    movementType: string;
    materialDescription: string;
    time: string;
    driverName?: string;
  }>;
  warningMessage?: string;
}

export class MaterialAnomalyDetector {
  /**
   * Normalizes vehicle registration number by removing spaces, dashes, dots and making uppercase.
   * e.g. "MH 12 AB 1234" -> "MH12AB1234"
   */
  static normalizePlate(plate?: string): string {
    if (!plate) return '';
    return plate.replace(/[\s\-_.]/g, '').toUpperCase().trim();
  }

  /**
   * Evaluates if a vehicle/driver is entering/exiting with unnatural frequency on the same date.
   * Thresholds:
   * 1. > 3 movements in a single 24-hour window -> MEDIUM/HIGH Anomaly
   * 2. < 30 minutes turnaround between Inward/Outward movements -> RAPID TURNAROUND Anomaly (Suspicious quick turnaround)
   * 3. >= 5 movements in a single day -> CRITICAL Anomaly (Potential theft or unmonitored shuttle)
   */
  static checkFrequencyAnomaly(params: {
    vehicleNumber?: string;
    driverPhone?: string;
    driverName?: string;
    siteId?: string;
    allMaterialLogs: MaterialMovementRecord[];
    currentDate?: Date;
  }): VehicleAnomalyCheckResult {
    const { vehicleNumber, driverPhone, allMaterialLogs, currentDate = new Date() } = params;
    const normVehicle = this.normalizePlate(vehicleNumber);
    const cleanPhone = (driverPhone || '').replace(/\D/g, '').slice(-10);

    if (!normVehicle && !cleanPhone) {
      return { isAnomaly: false, todayTripCount: 0, recentTrips: [] };
    }

    const todayStr = currentDate.toISOString().split('T')[0];
    const nowMs = currentDate.getTime();

    // Filter logs for the same day matching either vehicle plate or driver phone
    const matchingLogs = allMaterialLogs.filter(log => {
      const logDate = (log.createdAt || log.timestamp || '').substring(0, 10);
      const isToday = logDate === todayStr;
      
      const logPlate = this.normalizePlate(log.vehicleNumber);
      const logPhone = (log.driverPhone || '').replace(/\D/g, '').slice(-10);

      const vehicleMatch = normVehicle && logPlate && logPlate === normVehicle;
      const phoneMatch = cleanPhone && logPhone && logPhone === cleanPhone;

      return isToday && (vehicleMatch || phoneMatch);
    });

    // Sort matching logs descending by time (most recent first)
    matchingLogs.sort((a, b) => {
      const timeA = new Date(a.createdAt || a.timestamp || 0).getTime();
      const timeB = new Date(b.createdAt || b.timestamp || 0).getTime();
      return timeB - timeA;
    });

    const tripCount = matchingLogs.length;
    const recentTrips = matchingLogs.map(m => ({
      id: m.id,
      gatePassNumber: m.gatePassNumber || m.id,
      movementType: m.movementType || 'MOVEMENT',
      materialDescription: m.materialDescription || 'Material',
      time: m.createdAt || m.timestamp || '',
      driverName: m.driverName
    }));

    // Calculate time gap with most recent previous trip
    let minutesSinceLastTrip: number | undefined = undefined;
    if (matchingLogs.length > 0) {
      const lastTimeMs = new Date(matchingLogs[0].createdAt || matchingLogs[0].timestamp).getTime();
      minutesSinceLastTrip = Math.round((nowMs - lastTimeMs) / (1000 * 60));
    }

    // Evaluate Anomalies
    // Rule 1: CRITICAL - 5 or more trips today
    if (tripCount >= 4) {
      return {
        isAnomaly: true,
        anomalyType: 'EXCESSIVE_DAILY_TRIPS',
        severity: 'CRITICAL',
        todayTripCount: tripCount + 1, // including the pending one
        minutesSinceLastTrip,
        recentTrips,
        warningMessage: `🚨 CRITICAL ANOMALY: Vehicle ${vehicleNumber || ''} has already logged ${tripCount} movements today! This is trip #${tripCount + 1}. Potential unauthorized material shuttling.`
      };
    }

    // Rule 2: RAPID TURNAROUND - Less than 20 minutes since previous gate pass
    if (minutesSinceLastTrip !== undefined && minutesSinceLastTrip >= 0 && minutesSinceLastTrip < 20) {
      return {
        isAnomaly: true,
        anomalyType: 'RAPID_TURNAROUND',
        severity: 'HIGH',
        todayTripCount: tripCount + 1,
        minutesSinceLastTrip,
        recentTrips,
        warningMessage: `⚠️ RAPID TURNAROUND DETECTED: Vehicle entered/exited just ${minutesSinceLastTrip} mins ago (Pass #${matchingLogs[0].gatePassNumber || matchingLogs[0].id}). Verify cargo integrity.`
      };
    }

    // Rule 3: HIGH FREQUENCY - 3 or more trips today
    if (tripCount >= 2) {
      return {
        isAnomaly: true,
        anomalyType: 'IRREGULAR_MULTIPLE_ENTRIES',
        severity: 'MEDIUM',
        todayTripCount: tripCount + 1,
        minutesSinceLastTrip,
        recentTrips,
        warningMessage: `⚡ FREQUENCY ALERT: Vehicle ${vehicleNumber || ''} is making trip #${tripCount + 1} today. Supervisor verification recommended.`
      };
    }

    return {
      isAnomaly: false,
      todayTripCount: tripCount + 1,
      minutesSinceLastTrip,
      recentTrips
    };
  }
}
