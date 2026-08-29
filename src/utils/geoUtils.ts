import { GeoVerificationResult } from '../types';

export class GeoUtils {
  /**
   * Earth's mean radius in meters
   */
  private static readonly EARTH_RADIUS_METERS = 6371000;

  /**
   * Detect potential GPS spoofing, null island, or speed-of-light teleportation anomalies
   */
  static detectTampering(
    latitude: number, 
    longitude: number, 
    timestamp: number = Date.now(),
    lastLocation?: { latitude: number; longitude: number; timestamp: number }
  ): string | undefined {
    // 1. Boundary validity
    if (isNaN(latitude) || isNaN(longitude)) {
      return 'INVALID_COORDINATES';
    }
    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return 'OUT_OF_BOUNDS_GPS';
    }

    // 2. Null Island check (frequently default mock location emulator output)
    if (Math.abs(latitude) < 0.0001 && Math.abs(longitude) < 0.0001) {
      return 'NULL_ISLAND_MOCK_SUSPECTED';
    }

    // 3. Teleportation / Impossible Speed check if prior coordinate provided
    if (lastLocation && lastLocation.timestamp && lastLocation.timestamp < timestamp) {
      const timeDiffSeconds = (timestamp - lastLocation.timestamp) / 1000;
      if (timeDiffSeconds > 0) {
        const distanceMeters = this.calculateDistanceInMeters(
          lastLocation.latitude, lastLocation.longitude,
          latitude, longitude
        );
        const speedMps = distanceMeters / timeDiffSeconds; // meters per second
        // 300 m/s is ~1080 km/h (commercial jet speed ceiling for ground staff)
        if (speedMps > 300 && distanceMeters > 500) {
          return `IMPOSSIBLE_SPEED_TELEPORTATION (${Math.round(speedMps * 3.6)} km/h)`;
        }
      }
    }

    return undefined;
  }

  /**
   * Evaluates if GPS coordinates fall within site radius.
   * Returns precise distance in meters and definitive verification status.
   */
  static evaluateGeofence(
    lat: number, 
    lon: number, 
    acc: number = 0,
    siteLat: number, 
    siteLon: number, 
    radius: number = 100, 
    accThreshold: number = 50
  ): { result: GeoVerificationResult; distance: number; error?: string } {
    if (lat === undefined || lon === undefined || isNaN(lat) || isNaN(lon)) {
      return { result: 'NO_GEOFENCE_DATA', distance: -1, error: 'User GPS coordinates not available' };
    }

    if (siteLat === undefined || siteLon === undefined || isNaN(siteLat) || isNaN(siteLon)) {
      return { result: 'GEOFENCE_NOT_CONFIGURED', distance: 0, error: 'Site coordinates not configured' };
    }

    // Calculate real geodesic distance using Haversine algorithm
    const distance = this.calculateDistanceInMeters(lat, lon, siteLat, siteLon);

    // Accuracy tolerance consideration
    const effectiveAccuracyThreshold = Math.max(accThreshold || 50, 20);
    if (acc > effectiveAccuracyThreshold && acc > 150) {
      // Extremely poor GPS signal precision
      if (distance > radius + acc) {
        return {
          result: 'OUTSIDE_GEOFENCE',
          distance,
          error: `Outside geofence (${Math.round(distance)}m from site, allowed radius ${radius}m with poor accuracy ±${Math.round(acc)}m)`
        };
      }
      return {
        result: 'POOR_ACCURACY',
        distance,
        error: `GPS accuracy (±${Math.round(acc)}m) exceeds threshold (±${effectiveAccuracyThreshold}m)`
      };
    }

    // Standard geofence threshold check
    // Allow slight accuracy overlap cushion (up to 15 meters) for edge-of-gate detection
    const accuracyCushion = Math.min(acc > 0 ? acc * 0.5 : 0, 15);
    const maxPermittedDistance = radius + accuracyCushion;

    if (distance <= maxPermittedDistance) {
      return {
        result: 'WITHIN_GEOFENCE',
        distance
      };
    } else {
      return {
        result: 'OUTSIDE_GEOFENCE',
        distance,
        error: `User location is ${Math.round(distance)}m away from site. Maximum allowed radius is ${radius}m.`
      };
    }
  }
  
  /**
   * Great Circle / Haversine Distance Calculation between two latitude/longitude points in meters
   */
  static calculateDistanceInMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
    if (lat1 === lat2 && lon1 === lon2) {
      return 0;
    }

    const toRad = (degrees: number) => (degrees * Math.PI) / 180;

    const phi1 = toRad(lat1);
    const phi2 = toRad(lat2);
    const deltaPhi = toRad(lat2 - lat1);
    const deltaLambda = toRad(lon2 - lon1);

    const a = 
      Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
      Math.cos(phi1) * Math.cos(phi2) *
      Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return this.EARTH_RADIUS_METERS * c;
  }
}

