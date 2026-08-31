import { Request, Response } from 'express';
import { getAdminDb } from './firebaseAdmin';

// Calculate distance in meters between two GPS coordinates using Haversine formula
function calculateDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

export class ServerAttendanceEngine {
  /**
   * Validates Geofence for punch
   */
  static async validateGeofence(
    companyId: string,
    siteId: string,
    punchLat: number,
    punchLon: number
  ): Promise<{ isInside: boolean; distanceMeters: number; allowedRadiusMeters: number; siteName: string }> {
    const db = getAdminDb();
    if (!db) throw new Error('Database connection unavailable');

    const siteDoc = await db.collection('companies').doc(companyId).collection('sites').doc(siteId).get();
    if (!siteDoc.exists) {
      throw new Error(`Site #${siteId} not found`);
    }

    const siteData = siteDoc.data() || {};
    const siteLat = siteData.latitude || siteData.lat || (siteData.location?.lat);
    const siteLon = siteData.longitude || siteData.lng || (siteData.location?.lng);
    const radius = siteData.geofenceRadius || siteData.radius || 150; // Default 150m
    const siteName = siteData.siteName || siteData.name || siteId;

    if (siteLat === undefined || siteLon === undefined) {
      // If site has no GPS configured, pass with warning
      return { isInside: true, distanceMeters: 0, allowedRadiusMeters: radius, siteName };
    }

    const distance = calculateDistanceMeters(Number(punchLat), Number(punchLon), Number(siteLat), Number(siteLon));
    return {
      isInside: distance <= radius,
      distanceMeters: Math.round(distance),
      allowedRadiusMeters: radius,
      siteName
    };
  }

  /**
   * Process Punch-In on the server with authoritative time, deduplication, and anomaly logging
   */
  static async recordPunchIn(
    companyId: string,
    payload: {
      employeeId: string;
      siteId: string;
      shiftId?: string;
      latitude?: number;
      longitude?: number;
      punchMethod?: string;
      photoUrl?: string;
      aiFaceMatchScore?: number;
      aiFaceVerified?: boolean;
      actorId?: string;
      actorName?: string;
    }
  ) {
    const db = getAdminDb();
    if (!db) throw new Error('Database connection unavailable');

    const now = new Date();
    const serverTimestampStr = now.toISOString();
    const todayDateStr = serverTimestampStr.split('T')[0];
    const punchTimeStr = now.toTimeString().split(' ')[0].substring(0, 5); // HH:mm

    const attendanceId = `ATT-${companyId}-${payload.employeeId}-${todayDateStr}`;
    const attRef = db.collection('companies').doc(companyId).collection('attendance').doc(attendanceId);

    // Geofence check
    let geofenceResult = { isInside: true, distanceMeters: 0, allowedRadiusMeters: 150, siteName: payload.siteId };
    if (payload.latitude !== undefined && payload.longitude !== undefined && payload.siteId) {
      try {
        geofenceResult = await this.validateGeofence(companyId, payload.siteId, payload.latitude, payload.longitude);
      } catch (geoErr) {
        console.warn('[AttendanceApi] Geofence validation warning:', geoErr);
      }
    }

    // Run transaction to ensure idempotency and concurrency protection
    const result = await db.runTransaction(async (t) => {
      const snap = await t.get(attRef);
      if (snap.exists) {
        const data = snap.data();
        if (data?.checkIn) {
          return { success: false, message: `Employee already punched in today at ${data.checkIn}`, alreadyPunched: true, record: data };
        }
      }

      // Fetch employee info
      const empDoc = await t.get(db.collection('companies').doc(companyId).collection('employees').doc(payload.employeeId));
      const empData = empDoc.exists ? empDoc.data() : {};
      const empName = `${empData?.firstName || ''} ${empData?.lastName || ''}`.trim() || empData?.name || payload.employeeId;

      const recordData: any = {
        id: attendanceId,
        companyId,
        employeeId: payload.employeeId,
        employeeName: empName,
        attendanceDate: todayDateStr,
        date: todayDateStr,
        siteId: payload.siteId,
        shiftId: payload.shiftId || empData?.assignedShiftId || 'DEFAULT_SHIFT',
        checkIn: punchTimeStr,
        checkInTimestamp: serverTimestampStr,
        checkInLat: payload.latitude || null,
        checkInLon: payload.longitude || null,
        checkInGeofenceVerified: geofenceResult.isInside,
        checkInDistanceMeters: geofenceResult.distanceMeters,
        checkInMethod: payload.punchMethod || 'GPS_MOBILE',
        checkInPhotoUrl: payload.photoUrl || null,
        aiFaceVerified: payload.aiFaceVerified ?? true,
        aiFaceMatchScore: payload.aiFaceMatchScore ?? 1.0,
        status: 'PRESENT',
        createdAt: serverTimestampStr,
        updatedAt: serverTimestampStr
      };

      t.set(attRef, recordData, { merge: true });

      // Log suspicious punch anomaly if geofence was violated
      if (!geofenceResult.isInside) {
        const anomalyId = `SUSP-PUNCH-${Date.now()}-${payload.employeeId}`;
        const anomalyRef = db.collection('companies').doc(companyId).collection('suspicious_punches').doc(anomalyId);
        t.set(anomalyRef, {
          id: anomalyId,
          companyId,
          employeeId: payload.employeeId,
          employeeName: empName,
          siteId: payload.siteId,
          siteName: geofenceResult.siteName,
          punchType: 'PUNCH_IN',
          punchTimestamp: serverTimestampStr,
          punchTime: punchTimeStr,
          distanceMeters: geofenceResult.distanceMeters,
          allowedRadiusMeters: geofenceResult.allowedRadiusMeters,
          severity: geofenceResult.distanceMeters > 1000 ? 'HIGH' : 'MEDIUM',
          reason: `Punch occurred ${geofenceResult.distanceMeters}m outside authorized site geofence (Max: ${geofenceResult.allowedRadiusMeters}m)`,
          status: 'FLAGGED',
          createdAt: serverTimestampStr
        });
      }

      return { success: true, message: 'Punch-In recorded successfully', record: recordData };
    });

    return result;
  }

  /**
   * Process Punch-Out on the server with authoritative time
   */
  static async recordPunchOut(
    companyId: string,
    payload: {
      employeeId: string;
      siteId: string;
      latitude?: number;
      longitude?: number;
      punchMethod?: string;
      photoUrl?: string;
      actorId?: string;
      actorName?: string;
    }
  ) {
    const db = getAdminDb();
    if (!db) throw new Error('Database connection unavailable');

    const now = new Date();
    const serverTimestampStr = now.toISOString();
    const todayDateStr = serverTimestampStr.split('T')[0];
    const punchTimeStr = now.toTimeString().split(' ')[0].substring(0, 5); // HH:mm

    const attendanceId = `ATT-${companyId}-${payload.employeeId}-${todayDateStr}`;
    const attRef = db.collection('companies').doc(companyId).collection('attendance').doc(attendanceId);

    // Geofence check
    let geofenceResult = { isInside: true, distanceMeters: 0, allowedRadiusMeters: 150, siteName: payload.siteId };
    if (payload.latitude !== undefined && payload.longitude !== undefined && payload.siteId) {
      try {
        geofenceResult = await this.validateGeofence(companyId, payload.siteId, payload.latitude, payload.longitude);
      } catch (geoErr) {
        console.warn('[AttendanceApi] Geofence validation warning:', geoErr);
      }
    }

    const result = await db.runTransaction(async (t) => {
      const snap = await t.get(attRef);
      if (!snap.exists) {
        return { success: false, message: 'No punch-in found for today. Please punch in first.' };
      }

      const currentData = snap.data() || {};
      if (currentData.checkOut) {
        return { success: false, message: `Already punched out today at ${currentData.checkOut}`, alreadyPunched: true, record: currentData };
      }

      // Calculate worked minutes
      let totalMinutesWorked = 0;
      if (currentData.checkIn) {
        const [inH, inM] = currentData.checkIn.split(':').map(Number);
        const [outH, outM] = punchTimeStr.split(':').map(Number);
        const inMins = inH * 60 + inM;
        const outMins = outH * 60 + outM;
        totalMinutesWorked = Math.max(0, outMins - inMins);
      }

      const updateData: any = {
        checkOut: punchTimeStr,
        checkOutTimestamp: serverTimestampStr,
        checkOutLat: payload.latitude || null,
        checkOutLon: payload.longitude || null,
        checkOutGeofenceVerified: geofenceResult.isInside,
        checkOutDistanceMeters: geofenceResult.distanceMeters,
        checkOutMethod: payload.punchMethod || 'GPS_MOBILE',
        totalMinutesWorked,
        totalHours: Number((totalMinutesWorked / 60).toFixed(2)),
        updatedAt: serverTimestampStr
      };

      t.update(attRef, updateData);

      return {
        success: true,
        message: 'Punch-Out recorded successfully',
        record: { ...currentData, ...updateData }
      };
    });

    return result;
  }
}

export const punchInHandler = async (req: Request, res: Response) => {
  try {
    const { companyId, employeeId, siteId, shiftId, latitude, longitude, punchMethod, photoUrl, aiFaceMatchScore, aiFaceVerified, actorId, actorName } = req.body;
    if (!companyId || !employeeId) {
      return res.status(400).json({ success: false, error: 'companyId and employeeId are required' });
    }

    const result = await ServerAttendanceEngine.recordPunchIn(companyId, {
      employeeId,
      siteId,
      shiftId,
      latitude,
      longitude,
      punchMethod,
      photoUrl,
      aiFaceMatchScore,
      aiFaceVerified,
      actorId,
      actorName
    });

    return res.json(result);
  } catch (error: any) {
    console.error('[AttendanceApi] Punch-In error:', error);
    return res.status(500).json({ success: false, error: error.message || 'Failed to record punch-in' });
  }
};

export const punchOutHandler = async (req: Request, res: Response) => {
  try {
    const { companyId, employeeId, siteId, latitude, longitude, punchMethod, photoUrl, actorId, actorName } = req.body;
    if (!companyId || !employeeId) {
      return res.status(400).json({ success: false, error: 'companyId and employeeId are required' });
    }

    const result = await ServerAttendanceEngine.recordPunchOut(companyId, {
      employeeId,
      siteId,
      latitude,
      longitude,
      punchMethod,
      photoUrl,
      actorId,
      actorName
    });

    return res.json(result);
  } catch (error: any) {
    console.error('[AttendanceApi] Punch-Out error:', error);
    return res.status(500).json({ success: false, error: error.message || 'Failed to record punch-out' });
  }
};

export const validateGeofenceHandler = async (req: Request, res: Response) => {
  try {
    const { companyId, siteId, latitude, longitude } = req.body;
    if (!companyId || !siteId || latitude === undefined || longitude === undefined) {
      return res.status(400).json({ success: false, error: 'Missing required parameters' });
    }

    const result = await ServerAttendanceEngine.validateGeofence(companyId, siteId, Number(latitude), Number(longitude));
    return res.json({ success: true, ...result });
  } catch (error: any) {
    console.error('[AttendanceApi] Geofence validation error:', error);
    return res.status(500).json({ success: false, error: error.message || 'Failed to validate geofence' });
  }
};
