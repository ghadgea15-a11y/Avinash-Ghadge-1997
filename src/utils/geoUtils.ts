export const GeoUtils = {
  /**
   * Calculates the distance between two coordinates in meters using the Haversine formula.
   */
  calculateDistanceInMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3; // Earth radius in meters
    const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

    const phi1 = toRadians(lat1);
    const phi2 = toRadians(lat2);
    const deltaPhi = toRadians(lat2 - lat1);
    const deltaLambda = toRadians(lon2 - lon1);

    const a =
      Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
      Math.cos(phi1) * Math.cos(phi2) *
      Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return Math.round(R * c);
  },

  /**
   * Evaluates if a given location is within a geofence.
   */
  evaluateGeofence(
    deviceLat: number,
    deviceLon: number,
    deviceAccuracy: number,
    siteLat: number,
    siteLon: number,
    siteRadius: number,
    accuracyThreshold: number = 50
  ): { result: import('../types').GeoVerificationResult, distance: number } {
    if (deviceAccuracy > accuracyThreshold) {
      return { result: 'LOW_ACCURACY', distance: -1 };
    }

    const distance = this.calculateDistanceInMeters(deviceLat, deviceLon, siteLat, siteLon);

    if (distance <= siteRadius) {
      return { result: 'WITHIN_GEOFENCE', distance };
    }

    return { result: 'OUTSIDE_GEOFENCE', distance };
  },

  /**
   * Checks for obvious GPS tampering heuristics
   */
  detectTampering(
    deviceLat: number,
    deviceLon: number,
    timestamp: number
  ): string | null {
    // Note: Since we are running in Web, true mock location detection is limited.
    // However, we can detect stale coordinates or completely impossible coordinate bounds.
    if (deviceLat < -90 || deviceLat > 90 || deviceLon < -180 || deviceLon > 180) {
      return 'INVALID_COORDINATES';
    }

    const age = Date.now() - timestamp;
    if (age > 60000) { // Older than 1 minute
      return 'STALE_LOCATION';
    }

    return null;
  }
};
