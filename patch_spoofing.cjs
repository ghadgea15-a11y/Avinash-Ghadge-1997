const fs = require('fs');
const file = 'functions/src/attendance.ts';
let code = fs.readFileSync(file, 'utf8');

const t1 = `  gps: {
    latitude: number;
    longitude: number;
    accuracy?: number;
  };`;
const r1 = `  gps: {
    latitude: number;
    longitude: number;
    accuracy?: number;
    isMocked?: boolean;
  };`;

const t2 = `      if (!gps || gps.latitude === undefined || gps.longitude === undefined || isNaN(gps.latitude) || isNaN(gps.longitude)) {
        throw new https.HttpsError(
          "failed-precondition",
          "PUNCH_REJECTED_MISSING_GPS: Site requires verified GPS coordinates, but no location data was supplied."
        );
      }

      distanceMeters = calculateDistanceInMeters(gps.latitude, gps.longitude, siteLat, siteLon);`;
const r2 = `      if (!gps || gps.latitude === undefined || gps.longitude === undefined || isNaN(gps.latitude) || isNaN(gps.longitude)) {
        throw new https.HttpsError(
          "failed-precondition",
          "PUNCH_REJECTED_MISSING_GPS: Site requires verified GPS coordinates, but no location data was supplied."
        );
      }

      // --- ENTERPRISE GPS SPOOFING & MOCK LOCATION DETECTION ---
      let spoofingReason: string | null = null;
      if (gps.isMocked) {
        spoofingReason = 'Mock Location Provider Detected';
      } else if (Math.abs(gps.latitude) < 0.0001 && Math.abs(gps.longitude) < 0.0001) {
        spoofingReason = 'Null Island (0,0) Coordinates Detected';
      } else if (gps.latitude < -90 || gps.latitude > 90 || gps.longitude < -180 || gps.longitude > 180) {
        spoofingReason = 'Out of Bounds GPS Coordinates';
      }

      if (spoofingReason) {
        const anomalyId = \`SUSP-SPOOF-\${Date.now()}-\${employeeId}\`;
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
          anomalyType: 'GPS_SPOOFING',
          severity: 'CRITICAL',
          riskScore: 99,
          status: 'UNRESOLVED',
          evidence: \`Punch rejected due to GPS tampering: \${spoofingReason}\`,
          gpsCoordinates: {
            latitude: gps.latitude,
            longitude: gps.longitude,
            accuracy: gps.accuracy || 0,
            isMocked: gps.isMocked || false
          },
          deviceInfo: deviceInfo || 'Client Web/Mobile',
          callerUid: auth.uid,
          createdAt: nowIso
        });

        throw new https.HttpsError(
          "permission-denied",
          \`PUNCH_REJECTED_TAMPERING: Security systems detected location tampering (\${spoofingReason}). This incident has been logged.\`
        );
      }
      // --------------------------------------------------------

      distanceMeters = calculateDistanceInMeters(gps.latitude, gps.longitude, siteLat, siteLon);`;

if (code.includes(t1)) {
  code = code.replace(t1, r1);
  console.log("t1 replaced");
} else {
  console.log("t1 not found");
}

if (code.includes(t2)) {
  code = code.replace(t2, r2);
  console.log("t2 replaced");
} else {
  console.log("t2 not found");
}

fs.writeFileSync(file, code);
