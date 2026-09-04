import { 
  MultiModeCheckpoint, 
  OfflinePatrolScanRecord, 
  VerificationMethod 
} from '../types/multiModePatrol';
import { db } from '../firebase';
import { 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  query, 
  where, 
  serverTimestamp 
} from 'firebase/firestore';
import { AuditTrailService } from './auditTrailService';

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

  return Math.round(R * c * 10) / 10;
}

// Generate cryptographic SHA-256 signature binding scan details for offline tamper-proof proof
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
  // Deterministic fallback hash
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
  /**
   * Get checkpoints for a site (Local cache + Firestore fallback)
   */
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

    // Default enterprise checkpoints for demo / initial bootstrap
    const defaults: MultiModeCheckpoint[] = [
      {
        id: 'CHK-01',
        checkpointId: 'CHK-01',
        companyId,
        siteId: siteId || 'SITE-01',
        siteName: 'T-APEX Tech Park Central',
        name: 'Main Server Room Vault Door',
        locationDescription: 'Building B, Floor 2, Server Room Ingress',
        verificationMethod: 'nfc',
        nfcTagId: '04:A2:8B:1F:90:77',
        qrCodeValue: 'QR_T-APEX_SERVER_01',
        gpsLatitude: 19.0760,
        gpsLongitude: 72.8777,
        gpsToleranceMeters: 30,
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
        siteId: siteId || 'SITE-01',
        siteName: 'T-APEX Tech Park Central',
        name: 'Perimeter Fence Gate East',
        locationDescription: 'Outer perimeter boundary marker 12',
        verificationMethod: 'qr',
        qrCodeValue: 'QR_EAST_FENCE_12_SEC',
        nfcTagId: '04:B5:7C:2E:33:91',
        gpsLatitude: 19.0768,
        gpsLongitude: 72.8785,
        gpsToleranceMeters: 35,
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
        siteId: siteId || 'SITE-01',
        siteName: 'T-APEX Tech Park Central',
        name: 'South Parking Structure Geofence Post',
        locationDescription: 'Multi-level parking basement egress ramp',
        verificationMethod: 'gps',
        qrCodeValue: 'QR_SOUTH_PARK_03',
        nfcTagId: '04:9D:3A:44:81:10',
        gpsLatitude: 19.0754,
        gpsLongitude: 72.8769,
        gpsToleranceMeters: 25,
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

  /**
   * Save or update checkpoint
   */
  static async saveCheckpoint(checkpoint: MultiModeCheckpoint): Promise<void> {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_CHECKPOINTS);
      const all: MultiModeCheckpoint[] = raw ? JSON.parse(raw) : [];
      const idx = all.findIndex(c => c.checkpointId === checkpoint.checkpointId || c.id === checkpoint.id);
      if (idx >= 0) {
        all[idx] = checkpoint;
      } else {
        all.push(checkpoint);
      }
      localStorage.setItem(STORAGE_KEY_CHECKPOINTS, JSON.stringify(all));

      // Also persist to Firestore if available
      if (checkpoint.companyId) {
        const cpDocRef = doc(db, 'companies', checkpoint.companyId, 'patrol_checkpoints', checkpoint.id || checkpoint.checkpointId);
        await setDoc(cpDocRef, {
          ...checkpoint,
          updatedAt: new Date().toISOString()
        }, { merge: true });
      }
    } catch (e) {
      console.error('Error saving checkpoint:', e);
    }
  }

  /**
   * Verify and record a scan with strict Geofence and Token checks.
   * If GPS is outside allowed radius -> REJECTS the scan with status 'GPS_MISMATCH'.
   */
  static async recordScan(params: {
    checkpoint: MultiModeCheckpoint;
    guardId: string;
    guardName: string;
    currentGps?: { latitude: number; longitude: number; accuracy: number };
    scannedNfcTagId?: string;
    scannedQrCode?: string;
    tourId?: string;
    strictGeofence?: boolean;
  }): Promise<{ 
    success: boolean; 
    record: OfflinePatrolScanRecord; 
    distanceMeters?: number;
    toleranceMeters?: number;
    reason?: string; 
  }> {
    const { 
      checkpoint, 
      guardId, 
      guardName, 
      currentGps, 
      scannedNfcTagId, 
      scannedQrCode, 
      tourId,
      strictGeofence = true 
    } = params;

    const deviceTimestamp = Date.now();
    let status: OfflinePatrolScanRecord['status'] = 'VERIFIED';
    let failureReason: string | undefined;
    let distanceMeters: number | undefined;
    const tolerance = checkpoint.gpsToleranceMeters || 30;

    // 1. Physical Token Verification (QR or NFC)
    if (checkpoint.verificationMethod === 'nfc') {
      const cleanScanned = (scannedNfcTagId || '').trim().toUpperCase();
      const expectedTag = (checkpoint.nfcTagId || '').trim().toUpperCase();
      if (!cleanScanned || (expectedTag && cleanScanned !== expectedTag)) {
        status = 'SIGNATURE_INVALID';
        failureReason = `NFC Tag Mismatch: Scanned UID '${cleanScanned || 'NONE'}' does not match registered tag '${expectedTag || 'UNSET'}'`;
      }
    } else if (checkpoint.verificationMethod === 'qr') {
      const cleanScanned = (scannedQrCode || '').trim();
      const expectedQr = (checkpoint.qrCodeValue || '').trim();
      if (!cleanScanned || (expectedQr && cleanScanned !== expectedQr)) {
        status = 'SIGNATURE_INVALID';
        failureReason = `QR Token Mismatch: Scanned code does not match registered checkpoint QR`;
      }
    }

    // 2. Strict GPS Geofence Verification
    if (checkpoint.gpsLatitude !== undefined && checkpoint.gpsLongitude !== undefined && currentGps) {
      distanceMeters = calculateDistanceMeters(
        currentGps.latitude,
        currentGps.longitude,
        checkpoint.gpsLatitude,
        checkpoint.gpsLongitude
      );

      if (distanceMeters > tolerance) {
        status = 'GPS_MISMATCH';
        failureReason = `GEOFENCE BREACH: Guard location is ${Math.round(distanceMeters)}m away from checkpoint '${checkpoint.name}' (Allowed radius: ${tolerance}m). Scan rejected.`;
      }
    }

    // 3. Cryptographic Signature Generation
    const tagOrCode = scannedNfcTagId || scannedQrCode || `${currentGps?.latitude},${currentGps?.longitude}`;
    const signature = await generatePatrolSignature(
      checkpoint.checkpointId || checkpoint.id,
      guardId,
      deviceTimestamp,
      tagOrCode,
      checkpoint.secretKey
    );

    const scanRecord: OfflinePatrolScanRecord = {
      scanId: `SCAN-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      checkpointId: checkpoint.checkpointId || checkpoint.id,
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

    // If verified, record audit trail event
    if (status === 'VERIFIED') {
      AuditTrailService.recordEvent({
        companyId: checkpoint.companyId,
        actorUid: guardId,
        actorName: guardName,
        action: 'PATROL_CHECKPOINT_VERIFIED',
        module: 'GUARD_TOUR_PATROL',
        resourceId: checkpoint.id || checkpoint.checkpointId,
        details: {
          checkpointName: checkpoint.name,
          verificationMethod: checkpoint.verificationMethod,
          distanceMeters,
          toleranceMeters: tolerance,
          geofencePassed: true,
          tourId
        }
      }).catch(() => {});
    } else {
      // Record security anomaly audit log for rejected scan
      AuditTrailService.recordEvent({
        companyId: checkpoint.companyId,
        actorUid: guardId,
        actorName: guardName,
        action: 'PATROL_SCAN_REJECTED_GEOFENCE',
        module: 'GUARD_TOUR_PATROL',
        resourceId: checkpoint.id || checkpoint.checkpointId,
        details: {
          checkpointName: checkpoint.name,
          reason: failureReason,
          distanceMeters,
          toleranceMeters: tolerance,
          status
        }
      }).catch(() => {});
    }

    return {
      success: status === 'VERIFIED',
      record: scanRecord,
      distanceMeters,
      toleranceMeters: tolerance,
      reason: failureReason
    };
  }

  /**
   * Triggers an immediate HIGH/CRITICAL alert to the Supervisor when a checkpoint is missed or overdue.
   */
  static async triggerMissedCheckpointAlert(params: {
    companyId: string;
    siteId: string;
    siteName: string;
    tourNumber: string;
    tourId: string;
    guardId: string;
    guardName: string;
    missedCheckpoints: { id: string; name: string; sequenceOrder?: number }[];
    reason?: string;
  }): Promise<{ alertId: string; incidentId: string }> {
    const { 
      companyId, 
      siteId, 
      siteName, 
      tourNumber, 
      tourId, 
      guardId, 
      guardName, 
      missedCheckpoints, 
      reason 
    } = params;

    const timestamp = new Date().toISOString();
    const alertId = `ALT-MISSED-${Date.now()}`;
    const incidentId = `INC-PTR-${Date.now()}`;
    const missedNames = missedCheckpoints.map(c => c.name).join(', ');
    const count = missedCheckpoints.length;

    // 1. Create Supervisor Alert in Firestore
    const alertPayload = {
      id: alertId,
      companyId,
      siteId,
      siteName,
      tourId,
      tourNumber,
      guardId,
      guardName,
      alertType: 'MISSED_CHECKPOINT_BREACH',
      severity: count > 1 ? 'CRITICAL' : 'HIGH',
      title: `🚨 CRITICAL ALERT: ${count} Missed Checkpoint(s) in Tour #${tourNumber}`,
      message: `Guard ${guardName} failed to scan checkpoint(s): [${missedNames}] at ${siteName}. Reason: ${reason || 'Scheduled tour completed without scanning all mandatory checkpoints.'}`,
      missedCheckpoints,
      status: 'OPEN',
      escalatedTo: 'SUPERVISOR_OPERATIONS',
      createdAt: timestamp,
      timestamp: serverTimestamp()
    };

    try {
      await setDoc(doc(db, 'companies', companyId, 'alerts', alertId), alertPayload);
    } catch (e) {
      console.warn('[PatrolVerificationService] Firestore alert notice:', e);
    }

    // 2. Create Security Incident Ticket
    const incidentPayload = {
      id: incidentId,
      companyId,
      incidentNumber: `INC-SEC-${Math.floor(10000 + Math.random() * 90000)}`,
      siteId,
      siteName,
      title: `🚨 Missed Patrol Checkpoint Incident: ${missedNames}`,
      category: 'PATROL_BREACH',
      severity: count > 1 ? 'CRITICAL' : 'HIGH',
      status: 'OPEN',
      reportedAt: timestamp,
      reportedById: guardId || 'SYSTEM_PATROL_ENGINE',
      reportedByName: guardName || 'Patrol Supervisor Watcher',
      description: `Automated Patrol Engine detected missed/skipped checkpoint(s) during active tour #${tourNumber}. Unvisited Checkpoints: ${missedNames}. Immediate supervisor verification required.`,
      assignedTo: 'Operations Supervisor',
      evidence: {
        tourId,
        tourNumber,
        missedCheckpointCount: count,
        missedCheckpoints
      },
      createdAt: timestamp
    };

    try {
      await setDoc(doc(db, 'companies', companyId, 'incident_reports', incidentId), incidentPayload);
    } catch (e) {
      console.warn('[PatrolVerificationService] Firestore incident notice:', e);
    }

    // 3. Log Immutable Audit Trail
    AuditTrailService.recordEvent({
      companyId,
      actorUid: guardId || 'SYSTEM',
      actorName: guardName || 'Patrol Watcher',
      action: 'MISSED_CHECKPOINT_SUPERVISOR_ALERT',
      module: 'GUARD_TOUR_PATROL',
      resourceId: tourId,
      details: {
        tourNumber,
        siteName,
        missedCheckpoints,
        alertId,
        incidentId
      }
    }).catch(() => {});

    return { alertId, incidentId };
  }

  // Enqueue scan to local queue
  static enqueueScan(scan: OfflinePatrolScanRecord): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_QUEUE);
      const queue: OfflinePatrolScanRecord[] = raw ? JSON.parse(raw) : [];
      queue.unshift(scan);
      localStorage.setItem(STORAGE_KEY_QUEUE, JSON.stringify(queue.slice(0, 500)));
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
}
