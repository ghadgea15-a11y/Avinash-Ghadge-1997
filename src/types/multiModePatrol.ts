// ============================================================================
// MULTI-MODE PATROL VERIFICATION (GPS + QR + NFC) (MODULE 3)
// Parity with TrackTik, Silvertrac, Belfry, Novagems
// ============================================================================

export type VerificationMethod = 'gps' | 'qr' | 'nfc';

export interface MultiModeCheckpoint {
  id: string;
  checkpointId: string;
  companyId: string;
  siteId: string;
  siteName?: string;
  name: string;
  locationDescription: string;
  verificationMethod: VerificationMethod;
  qrCodeValue?: string;
  nfcTagId?: string; // Hardware NFC Tag Serial (UID)
  gpsLatitude?: number;
  gpsLongitude?: number;
  gpsToleranceMeters?: number; // Allowed radius around coordinate (e.g. 25m)
  secretKey?: string; // Checkpoint-specific cryptographic signing key for offline proof
  mandatoryInstructions?: string;
  sequenceOrder: number;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: number | string;
}

export interface OfflinePatrolScanRecord {
  scanId: string;
  checkpointId: string;
  checkpointName: string;
  tourId?: string;
  companyId: string;
  siteId: string;
  guardId: string;
  guardName: string;
  verificationMethod: VerificationMethod;
  deviceTimestamp: number; // Device UTC timestamp
  gpsCoordinates?: {
    latitude: number;
    longitude: number;
    accuracy: number;
  };
  scannedNfcTagId?: string;
  scannedQrCode?: string;
  signature: string; // HMAC-SHA256 signature binding (tagId/qrCode + timestamp + guardId + siteId)
  status: 'VERIFIED' | 'GPS_MISMATCH' | 'SIGNATURE_INVALID' | 'SUSPICIOUS_DELAY';
  syncedAt?: number;
  syncState: 'QUEUED' | 'SYNCED' | 'FAILED';
  retryCount: number;
}
