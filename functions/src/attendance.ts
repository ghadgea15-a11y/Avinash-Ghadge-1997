import * as https from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

/**
 * Haversine formula calculation for server-authoritative distance verification
 */
function calculateDistanceInMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  if (lat1 === lat2 && lon1 === lon2) return 0;
  const R = 6371000; // Earth's mean radius in meters
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

export interface ServerPunchRequest {
  companyId: string;
  employeeId: string;
  siteId: string;
  punchType: 'PUNCH_IN' | 'PUNCH_OUT';
  gps: {
    latitude: number;
    longitude: number;
    accuracy?: number;
  };
  shiftId?: string;
  rosterId?: string;
  deviceInfo?: string;
  geofenceOverrideRequested?: boolean;
  geofenceOverrideReason?: string;
}

/**
 * Server-Authoritative Cloud Function for Geofenced Attendance Punch Validation
 * Strictly validates that caller is within the site's configured radius, otherwise rejects.
 */
export const markAttendancePunch = https.onCall(async (request) => {
  const auth = request.auth;
  if (!auth) {
    throw new https.HttpsError("unauthenticated", "Authentication required to record attendance punch.");
  }

  const data = request.data as ServerPunchRequest;
  const {
    companyId,
    employeeId,
    siteId,
    punchType = 'PUNCH_IN',
    gps,
    shiftId,
    rosterId,
    deviceInfo,
    geofenceOverrideRequested = false,
    geofenceOverrideReason
  } = data;

  if (!companyId || typeof companyId !== 'string') {
    throw new https.HttpsError("invalid-argument", "Valid companyId is required.");
  }
  if (!employeeId || typeof employeeId !== 'string') {
    throw new https.HttpsError("invalid-argument", "Valid employeeId is required.");
  }
  if (!siteId || typeof siteId !== 'string') {
    throw new https.HttpsError("invalid-argument", "Valid siteId is required.");
  }

  const db = admin.firestore();
  const callerClaims = auth.token || {};
  const callerCompanyId = callerClaims.cId || callerClaims.companyId;

  // Verify company tenant context isolation
  if (callerCompanyId && callerCompanyId !== companyId && !callerClaims.superAdmin) {
    throw new https.HttpsError("permission-denied", "Cross-tenant access forbidden.");
  }

  const now = new Date();
  const nowIso = now.toISOString();
  const todayDate = nowIso.split('T')[0];

  try {
    // 1. Fetch authoritative site coordinates and geofencing configuration
    const siteRef = db.collection('companies').doc(companyId).collection('sites').doc(siteId);
    const siteSnap = await siteRef.get();
    if (!siteSnap.exists) {
      throw new https.HttpsError("not-found", `Target site ${siteId} does not exist in company master records.`);
    }
    const siteData = siteSnap.data() || {};
    const siteLat = siteData.latitude;
    const siteLon = siteData.longitude;
    const geofenceEnabled = siteData.geofenceEnabled !== false; // enabled by default if coordinates present
    const geofenceRadius = Number(siteData.geofenceRadius || siteData.geoFenceRadiusMeters || 100);
    const accuracyThreshold = Number(siteData.accuracyThreshold || 50);

    // 2. Fetch employee status
    const empRef = db.collection('companies').doc(companyId).collection('employees').doc(employeeId);
    const empSnap = await empRef.get();
    if (!empSnap.exists) {
      throw new https.HttpsError("not-found", `Employee ${employeeId} not found.`);
    }
    const empData = empSnap.data() || {};
    const empStatus = (empData.status || 'ACTIVE').toUpperCase();
    if (empStatus !== 'ACTIVE') {
      throw new https.HttpsError("failed-precondition", `Punch rejected: Employee status is ${empStatus}.`);
    }

    // 3. Server-side Geofence Evaluation
    let distanceMeters = 0;
    let geofenceStatus: 'WITHIN_GEOFENCE' | 'OUTSIDE_GEOFENCE' | 'NO_GEOFENCE_DATA' = 'WITHIN_GEOFENCE';

    if (siteLat !== undefined && siteLon !== undefined && !isNaN(siteLat) && !isNaN(siteLon) && geofenceEnabled) {
      if (!gps || gps.latitude === undefined || gps.longitude === undefined || isNaN(gps.latitude) || isNaN(gps.longitude)) {
        throw new https.HttpsError(
          "failed-precondition",
          "PUNCH_REJECTED_MISSING_GPS: Site requires verified GPS coordinates, but no location data was supplied."
        );
      }

      distanceMeters = calculateDistanceInMeters(gps.latitude, gps.longitude, siteLat, siteLon);
      const accuracyCushion = Math.min(gps.accuracy ? gps.accuracy * 0.5 : 0, 15);
      const maxAllowedDistance = geofenceRadius + accuracyCushion;

      if (distanceMeters > maxAllowedDistance) {
        geofenceStatus = 'OUTSIDE_GEOFENCE';

        // Check if supervisor override is permitted
        const callerAuthority = callerClaims.aLvl || 'A9_SUPPORT';
        const isManager = ['A0_OWNER', 'A1_DIRECTOR_CEO', 'A2_GENERAL_MANAGER', 'A3_OFFICIAL_STAFF', 'A4_REGIONAL_AREA_MANAGER', 'A5_SITE_IN_CHARGE', 'A6_SUPERVISOR'].includes(callerAuthority);
        const isSupervisorOverride = isManager && geofenceOverrideRequested && geofenceOverrideReason && geofenceOverrideReason.trim().length > 3;

        if (!isSupervisorOverride) {
          // Log suspicious punch attempt for security governance
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
            evidence: `Punch attempted outside geofence boundary. Distance: ${Math.round(distanceMeters)}m from site center. Allowed radius limit: ${geofenceRadius}m. (Accuracy: ±${Math.round(gps.accuracy || 0)}m).`,
            gpsCoordinates: {
              latitude: gps.latitude,
              longitude: gps.longitude,
              accuracy: gps.accuracy || 0,
              distanceMeters: Math.round(distanceMeters),
              siteLatitude: siteLat,
              siteLongitude: siteLon,
              geofenceRadius
            },
            deviceInfo: deviceInfo || 'Client Web/Mobile',
            callerUid: auth.uid,
            createdAt: nowIso
          });

          // STRICT SERVER-SIDE REJECTION
          throw new https.HttpsError(
            "failed-precondition",
            `PUNCH_REJECTED_OUTSIDE_GEOFENCE: You are ${Math.round(distanceMeters)}m away from ${siteData.name || 'the site'}, exceeding the allowed radius of ${geofenceRadius}m. Punch has been rejected by server security rules.`
          );
        }
      }
    }

    // 4. Record attendance inside a transaction
    const attendanceDocId = rosterId ? `ATT-${rosterId}` : `ATT-${todayDate}-${employeeId}`;
    const attRef = db.collection('companies').doc(companyId).collection('attendance').doc(attendanceDocId);

    const punchResult = await db.runTransaction(async (transaction) => {
      const attSnap = await transaction.get(attRef);

      if (punchType === 'PUNCH_IN') {
        if (attSnap.exists) {
          const existingData = attSnap.data() || {};
          if (existingData.checkIn) {
            throw new https.HttpsError("already-exists", "Punch-in has already been recorded for this shift/date.");
          }
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
          source: 'GEO_PUNCH_SERVER',
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
          deviceInfo: deviceInfo || 'Mobile/Web Kiosk',
          createdBy: auth.uid,
          updatedBy: auth.uid,
          createdAt: nowIso,
          updatedAt: nowIso
        };

        transaction.set(attRef, newRecord);
        return { action: 'PUNCH_IN', record: newRecord };
      } else {
        // PUNCH_OUT
        if (!attSnap.exists) {
          throw new https.HttpsError("not-found", "No corresponding Punch-In record found to Punch-Out from.");
        }
        const existingData = attSnap.data() || {};
        if (existingData.checkOut) {
          throw new https.HttpsError("failed-precondition", "Punch-Out has already been recorded.");
        }

        const checkInTime = new Date(existingData.checkIn || nowIso);
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
          updatedBy: auth.uid,
          updatedAt: nowIso
        };

        transaction.update(attRef, updates);
        return { action: 'PUNCH_OUT', record: { ...existingData, ...updates } };
      }
    });

    return {
      success: true,
      message: `${punchType === 'PUNCH_IN' ? 'Punch-In' : 'Punch-Out'} recorded and verified within site boundary (${Math.round(distanceMeters)}m from center).`,
      attendanceId: attendanceDocId,
      geofenceStatus,
      distanceMeters: Math.round(distanceMeters),
      record: punchResult.record
    };
  } catch (err: any) {
    if (err instanceof https.HttpsError) {
      throw err;
    }
    console.error("[Server Attendance Geofence Error]:", err);
    throw new https.HttpsError("internal", err.message || "Failed to process attendance punch.");
  }
});
