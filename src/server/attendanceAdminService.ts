import { Request, Response } from 'express';
import { getAdminDb, hasAdminCredentials } from './firebaseAdmin';


function calculateDistanceInMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  if (lat1 === lat2 && lon1 === lon2) return 0;
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export class AttendanceAdminService {
  /**
   * Server-authoritative punch endpoint handler
   */
  static async handlePunch(req: Request, res: Response): Promise<void> {
    try {
      const {
        companyId,
        employeeId,
        siteId,
        punchType = 'PUNCH_IN',
        gps,
        shiftId,
        rosterId,
        deviceInfo,
        geofenceOverrideRequested,
        geofenceOverrideReason
      } = req.body;

      if (!companyId || !employeeId || !siteId) {
        res.status(400).json({
          success: false,
          error: 'Missing required parameters: companyId, employeeId, and siteId are mandatory.'
        });
        return;
      }

      if (!hasAdminCredentials()) {
        res.status(503).json({
          success: false,
          error: 'Firebase Admin SDK not initialized on server. Fallback to client/Cloud Function verification.'
        });
        return;
      }

      const db = getFirebaseAdminDb();
      const now = new Date();
      const nowIso = now.toISOString();
      const todayDate = nowIso.split('T')[0];

      // 1. Fetch site document
      const siteRef = db.collection('companies').doc(companyId).collection('sites').doc(siteId);
      const siteSnap = await siteRef.get();
      if (!siteSnap.exists) {
        res.status(404).json({
          success: false,
          error: `Site ${siteId} does not exist in company master.`
        });
        return;
      }

      const siteData = siteSnap.data() || {};
      const siteLat = siteData.latitude;
      const siteLon = siteData.longitude;
      const geofenceEnabled = siteData.geofenceEnabled !== false;
      const geofenceRadius = Number(siteData.geofenceRadius || siteData.geoFenceRadiusMeters || 100);

      // 2. Fetch employee document
      const empRef = db.collection('companies').doc(companyId).collection('employees').doc(employeeId);
      const empSnap = await empRef.get();
      if (!empSnap.exists) {
        res.status(404).json({
          success: false,
          error: `Employee ${employeeId} not found.`
        });
        return;
      }

      const empData = empSnap.data() || {};
      if ((empData.status || 'ACTIVE').toUpperCase() !== 'ACTIVE') {
        res.status(403).json({
          success: false,
          error: `Employee status is ${empData.status}. Attendance recording denied.`
        });
        return;
      }

      // 3. Geofence evaluation
      let distanceMeters = 0;
      let geofenceStatus: 'WITHIN_GEOFENCE' | 'OUTSIDE_GEOFENCE' | 'NO_GEOFENCE_DATA' = 'WITHIN_GEOFENCE';

      if (siteLat !== undefined && siteLon !== undefined && !isNaN(siteLat) && !isNaN(siteLon) && geofenceEnabled) {
        if (!gps || gps.latitude === undefined || gps.longitude === undefined || isNaN(gps.latitude) || isNaN(gps.longitude)) {
          res.status(400).json({
            success: false,
            code: 'MISSING_GPS',
            error: 'Site has geofencing enabled. Valid GPS latitude and longitude are strictly required.'
          });
          return;
        }

        distanceMeters = calculateDistanceInMeters(gps.latitude, gps.longitude, siteLat, siteLon);
        const accuracyCushion = Math.min(gps.accuracy ? gps.accuracy * 0.5 : 0, 15);
        const maxAllowedDistance = geofenceRadius + accuracyCushion;

        if (distanceMeters > maxAllowedDistance) {
          geofenceStatus = 'OUTSIDE_GEOFENCE';

          const hasValidOverride = geofenceOverrideRequested && geofenceOverrideReason && geofenceOverrideReason.trim().length > 3;

          if (!hasValidOverride) {
            // Log security anomaly record to suspicious_punches
            const anomalyId = `SUSP-GEO-${Date.now()}-${employeeId}`;
            const anomalyRef = db.collection('companies').doc(companyId).collection('suspicious_punches').doc(anomalyId);
            await anomalyRef.set({
              id: anomalyId,
              companyId,
              employeeId,
              employeeName: empData.fullName || empData.name || employeeId,
              siteId,
              siteName: siteData.name || siteData.siteName || siteId,
              punchType,
              punchTimestamp: nowIso,
              anomalyType: 'GEOFENCE_BREACH',
              severity: 'HIGH',
              riskScore: 85,
              status: 'UNRESOLVED',
              evidence: `Punch attempted outside site radius. Distance: ${Math.round(distanceMeters)}m. Max allowed: ${geofenceRadius}m. (Accuracy: ±${Math.round(gps.accuracy || 0)}m).`,
              gpsCoordinates: {
                latitude: gps.latitude,
                longitude: gps.longitude,
                accuracy: gps.accuracy || 0,
                distanceMeters: Math.round(distanceMeters),
                siteLatitude: siteLat,
                siteLongitude: siteLon,
                geofenceRadius
              },
              deviceInfo: deviceInfo || 'Web/Mobile Punch Terminal',
              createdAt: nowIso
            });

            // STRICT REJECTION
            res.status(403).json({
              success: false,
              code: 'OUTSIDE_GEOFENCE',
              distanceMeters: Math.round(distanceMeters),
              geofenceRadius,
              error: `Punch rejected: You are ${Math.round(distanceMeters)}m away from ${siteData.name || 'the site'}, exceeding the allowed radius of ${geofenceRadius}m.`
            });
            return;
          }
        }
      }

      // 4. Record attendance
      const attendanceDocId = rosterId ? `ATT-${rosterId}` : `ATT-${todayDate}-${employeeId}`;
      const attRef = db.collection('companies').doc(companyId).collection('attendance').doc(attendanceDocId);

      if (punchType === 'PUNCH_IN') {
        const existingSnap = await attRef.get();
        if (existingSnap.exists && existingSnap.data()?.checkIn) {
          res.status(409).json({
            success: false,
            error: 'Attendance punch-in already recorded for today.'
          });
          return;
        }

        const newRecord = {
          id: attendanceDocId,
          companyId,
          employeeId,
          employeeName: empData.fullName || empData.name || employeeId,
          siteId,
          siteName: siteData.name || siteData.siteName || siteId,
          rosterId: rosterId || null,
          shiftId: shiftId || null,
          attendanceDate: todayDate,
          checkIn: nowIso,
          status: 'PRESENT',
          lateMinutes: 0,
          earlyDepartureMinutes: 0,
          workedMinutes: 0,
          overtimeMinutes: 0,
          source: 'SERVER_GEOFENCE_PUNCH',
          checkInGps: {
            latitude: gps?.latitude,
            longitude: gps?.longitude,
            accuracy: gps?.accuracy,
            distanceFromSite: Math.round(distanceMeters),
            verification: geofenceStatus,
            timestamp: nowIso,
            geofenceOverrideRequested,
            geofenceOverrideReason
          },
          deviceInfo: deviceInfo || 'Web/Mobile Client',
          createdAt: nowIso,
          updatedAt: nowIso
        };

        await attRef.set(newRecord);

        res.json({
          success: true,
          action: 'PUNCH_IN',
          attendanceId: attendanceDocId,
          distanceMeters: Math.round(distanceMeters),
          geofenceStatus,
          message: `Punch-in recorded successfully (${Math.round(distanceMeters)}m from site center).`,
          record: newRecord
        });
      } else {
        // PUNCH_OUT
        const attSnap = await attRef.get();
        if (!attSnap.exists) {
          res.status(404).json({
            success: false,
            error: 'No active Punch-In record found for today to punch out from.'
          });
          return;
        }

        const existing = attSnap.data() || {};
        if (existing.checkOut) {
          res.status(400).json({
            success: false,
            error: 'Punch-Out already recorded.'
          });
          return;
        }

        const checkInTime = new Date(existing.checkIn || nowIso);
        const workedMinutes = Math.max(0, Math.round((now.getTime() - checkInTime.getTime()) / 60000));

        const updates = {
          checkOut: nowIso,
          workedMinutes,
          netWorkedMinutes: workedMinutes,
          checkOutGps: {
            latitude: gps?.latitude,
            longitude: gps?.longitude,
            accuracy: gps?.accuracy,
            distanceFromSite: Math.round(distanceMeters),
            verification: geofenceStatus,
            timestamp: nowIso,
            geofenceOverrideRequested,
            geofenceOverrideReason
          },
          updatedAt: nowIso
        };

        await attRef.update(updates);

        res.json({
          success: true,
          action: 'PUNCH_OUT',
          attendanceId: attendanceDocId,
          distanceMeters: Math.round(distanceMeters),
          geofenceStatus,
          message: `Punch-out recorded successfully (${Math.round(distanceMeters)}m from site center).`,
          record: { ...existing, ...updates }
        });
      }
    } catch (err: any) {
      console.error('[Attendance Admin Service Punch Error]:', err);
      res.status(500).json({
        success: false,
        error: err.message || 'Internal server error processing attendance punch.'
      });
    }
  }
}
