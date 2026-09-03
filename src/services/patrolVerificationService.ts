import { 
  MultiModeCheckpoint, 
  OfflinePatrolScanRecord, 
  VerificationMethod 
} from '../types/multiModePatrol';

// Haversine formula for calculating distance in meters between two GPS coordinates
export function calculateDistanceMeters(
  lat1: number, 
  lon1: number, 
  lat2: number, 
  lon2: number
): number {
  const R = 6371e3; // Earth's radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

// Generate cryptographic SHA-256 signature binding scan details for offline proof
export async function generatePatrolSignature(
  checkpointId: string,
  guardId: string,
  timestamp: number,
  tagOrQrValue: string,
  secretKey: string = 'ENTERPRISE_PATROL_SECRET'
): Promise<string> {
  const payload = `${checkpointId}:${guardId}:${timestamp}:${tagOrQrValue}:${secretKey}`;
  if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
    try {
      const msgBuffer = new TextEncoder().encode(payload);
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', msgBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch {
      // Fallback
    }
  }
  // Simple deterministic fallback hash
  let hash = 0;
  for (let i = 0; i < payload.length; i++) {
    const char = payload.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return 'SIG-' + Math.abs(hash).toString(16).padStart(16, '0');
}

const STORAGE_KEY_CHECKPOINTS = 'security_multimode_checkpoints';
const STORAGE_KEY_QUEUE = 'security_patrol_offline_queue';

export class PatrolVerificationService {
  // Get mock checkpoints for a site or initialize with enterprise defaults
  static getCheckpoints(companyId: string, siteId: string): MultiModeCheckpoint[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_CHECKPOINTS);
      if (raw) {
        const all: MultiModeCheckpoint[] = JSON.parse(raw);
        const filtered = all.filter(c => c.companyId === companyId && (!siteId || c.siteId === siteId));
        if (filtered.length > 0) return filtered;
      }
    } catch (e) {
      console.error('Error reading checkpoints:', e);
    }

    // Default enterprise checkpoints
    const defaults: MultiModeCheckpoint[] = [
      {
        id: 'CHK-01',
        checkpointId: 'CHK-01',
        companyId,
        siteId,
        name: 'Main Server Room Vault Door',
        locationDescription: 'Building B, Floor 2, Server Room Ingress',
        verificationMethod: 'nfc',
        nfcTagId: '04:A2:8B:1F:90:77',
        gpsLatitude: 19.0760,
        gpsLongitude: 72.8777,
        gpsToleranceMeters: 25,
        secretKey: 'SEC_SRV_VAULT_KEY',
        mandatoryInstructions: 'Check physical lock, fire suppression indicator and server temperature',
        sequenceOrder: 1,
        status: 'ACTIVE',
        createdAt: Date.now() - 86400000 * 30
      },
      {
        id: 'CHK-02',
        checkpointId: 'CHK-02',
        companyId,
        siteId,
        name: 'Perimeter Fence Gate East',
        locationDescription: 'Outer perimeter boundary marker 12',
        verificationMethod: 'qr',
        qrCodeValue: 'QR_EAST_FENCE_12_SEC',
        gpsLatitude: 19.0768,
        gpsLongitude: 72.8785,
        gpsToleranceMeters: 30,
        secretKey: 'SEC_PERIM_EAST_KEY',
        mandatoryInstructions: 'Verify razor wire integrity and floodlight operational status',
        sequenceOrder: 2,
        status: 'ACTIVE',
        createdAt: Date.now() - 86400000 * 30
      },
      {
        id: 'CHK-03',
        checkpointId: 'CHK-03',
        companyId,
        siteId,
        name: 'South Parking Structure Geofence Post',
        locationDescription: 'Multi-level parking basement egress ramp',
        verificationMethod: 'gps',
        gpsLatitude: 19.0754,
        gpsLongitude: 72.8769,
        gpsToleranceMeters: 20,
        secretKey: 'SEC_PARK_GEO_KEY',
        mandatoryInstructions: 'Check emergency panic button and stairwell access door latch',
        sequenceOrder: 3,
        status: 'ACTIVE',
        createdAt: Date.now() - 86400000 * 30
      }
    ];

    try {
      localStorage.setItem(STORAGE_KEY_CHECKPOINTS, JSON.stringify(defaults));
    } catch {
      // Ignore
    }

    return defaults;
  }

  // Save new or updated checkpoint
  static saveCheckpoint(checkpoint: MultiModeCheckpoint): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_CHECKPOINTS);
      const all: MultiModeCheckpoint[] = raw ? JSON.parse(raw) : [];
      const idx = all.findIndex(c => c.checkpointId === checkpoint.checkpointId);
      if (idx >= 0) {
        all[idx] = checkpoint;
      } else {
        all.push(checkpoint);
      }
      localStorage.setItem(STORAGE_KEY_CHECKPOINTS, JSON.stringify(all));
    } catch (e) {
      console.error('Error saving checkpoint:', e);
    }
  }

  // Verify and record a scan (works 100% offline)
  static async recordScan(params: {
    checkpoint: MultiModeCheckpoint;
    guardId: string;
    guardName: string;
    currentGps?: { latitude: number; longitude: number; accuracy: number };
    scannedNfcTagId?: string;
    scannedQrCode?: string;
    tourId?: string;
  }): Promise<{ success: boolean; record: OfflinePatrolScanRecord; reason?: string }> {
    const { checkpoint, guardId, guardName, currentGps, scannedNfcTagId, scannedQrCode, tourId } = params;
    const deviceTimestamp = Date.now();
    let status: OfflinePatrolScanRecord['status'] = 'VERIFIED';
    let failureReason: string | undefined;

    // 1. Method-specific verification
    if (checkpoint.verificationMethod === 'nfc') {
      if (!scannedNfcTagId || scannedNfcTagId.trim().toUpperCase() !== (checkpoint.nfcTagId || '').trim().toUpperCase()) {
        status = 'SIGNATURE_INVALID';
        failureReason = `NFC Tag Mismatch. Scanned '${scannedNfcTagId || 'NONE'}' does not match registered tag '${checkpoint.nfcTagId}'`;
      }
    } else if (checkpoint.verificationMethod === 'qr') {
      if (!scannedQrCode || scannedQrCode.trim() !== (checkpoint.qrCodeValue || '').trim()) {
        status = 'SIGNATURE_INVALID';
        failureReason = `QR Code Mismatch. Scanned token does not match registered checkpoint QR`;
      }
    }

    // 2. GPS Tolerance verification if GPS is configured on checkpoint
    if (checkpoint.gpsLatitude && checkpoint.gpsLongitude && currentGps) {
      const dist = calculateDistanceMeters(
        currentGps.latitude,
        currentGps.longitude,
        checkpoint.gpsLatitude,
        checkpoint.gpsLongitude
      );
      const tolerance = checkpoint.gpsToleranceMeters || 30;
      if (dist > tolerance) {
        status = 'GPS_MISMATCH';
        failureReason = `GPS Boundary Exceeded: Guard location is ${Math.round(dist)}m away, exceeding ${tolerance}m allowed radius`;
      }
    }

    // 3. Cryptographic Signature Generation
    const tagOrCode = scannedNfcTagId || scannedQrCode || `${currentGps?.latitude},${currentGps?.longitude}`;
    const signature = await generatePatrolSignature(
      checkpoint.checkpointId,
      guardId,
      deviceTimestamp,
      tagOrCode,
      checkpoint.secretKey
    );

    const scanRecord: OfflinePatrolScanRecord = {
      scanId: `SCAN-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
      checkpointId: checkpoint.checkpointId,
      checkpointName: checkpoint.name,
      tourId,
      companyId: checkpoint.companyId,
      siteId: checkpoint.siteId,
      guardId,
      guardName,
      verificationMethod: checkpoint.verificationMethod,
      deviceTimestamp,
      gpsCoordinates: currentGps,
      scannedNfcTagId,
      scannedQrCode,
      signature,
      status,
      syncState: 'QUEUED',
      retryCount: 0
    };

    // Store in offline queue
    this.enqueueScan(scanRecord);

    return {
      success: status === 'VERIFIED',
      record: scanRecord,
      reason: failureReason
    };
  }

  // Enqueue scan to offline queue
  static enqueueScan(scan: OfflinePatrolScanRecord): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_QUEUE);
      const queue: OfflinePatrolScanRecord[] = raw ? JSON.parse(raw) : [];
      queue.unshift(scan);
      localStorage.setItem(STORAGE_KEY_QUEUE, JSON.stringify(queue.slice(0, 500))); // Keep last 500 scans
    } catch (e) {
      console.error('Error enqueuing patrol scan:', e);
    }
  }

  // Get current offline scan queue
  static getOfflineQueue(): OfflinePatrolScanRecord[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_QUEUE);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  // Flush and sync queued scans when online
  static async syncQueue(companyId: string): Promise<{ syncedCount: number; failedCount: number }> {
    const queue = this.getOfflineQueue();
    let synced = 0;
    let failed = 0;

    const updated = queue.map(item => {
      if (item.companyId === companyId && item.syncState === 'QUEUED') {
        if (item.status === 'VERIFIED') {
          item.syncState = 'SYNCED';
          item.syncedAt = Date.now();
          synced++;
        } else {
          item.syncState = 'FAILED';
          failed++;
        }
      }
      return item;
    });

    try {
      localStorage.setItem(STORAGE_KEY_QUEUE, JSON.stringify(updated));
    } catch (e) {
      console.error('Error updating synced queue:', e);
    }

    return { syncedCount: synced, failedCount: failed };
  }
}
