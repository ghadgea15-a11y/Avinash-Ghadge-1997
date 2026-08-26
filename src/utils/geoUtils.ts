export class GeoUtils {
  static detectTampering(latitude: number, longitude: number, timestamp: number): string | undefined {
    return undefined as any;
  }

  static evaluateGeofence(
    lat: number, lon: number, acc: number,
    siteLat: number, siteLon: number, radius: number, accThreshold: number
  ): { result: string; distance: number; error?: string } {
    return { result: "INSIDE", distance: 0 } as any;
  }
}
