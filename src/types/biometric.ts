export type DeviceManufacturer = 'ZKTECO' | 'ESSL' | 'HIKVISION' | 'MATRIX' | 'SUPREMA' | 'REALTIME' | 'GENERIC' | string;

export type DeviceProtocol = 'ZKTECO_STANDALONE' | 'ZKTECO_PUSH_ADMS' | 'ESSL_STANDALONE' | 'ESSL_PUSH_API' | 'FACE_RECOGNITION_TERMINAL' | 'FINGERPRINT_TERMINAL' | 'GENERIC_SDK_ADAPTER' | 'HIKVISION_ISAPI' | 'GENERIC_TCP_IP' | 'GENERIC_REST_API' | 'GENERIC_HTTP_API' | 'RFID_CARD_TERMINAL' | string;

export type DeviceStatus = 'ONLINE' | 'OFFLINE' | 'UNKNOWN' | 'SYNCING' | 'ERROR' | string;

export type MappingStatus = 'AUTO_MATCHED' | 'MANUALLY_MAPPED' | 'UNMAPPED' | 'IGNORED';

export interface DeviceCapabilities {
  supportsFingerprint: boolean;
  supportsFace: boolean;
  supportsCard: boolean;
  supportsPassword?: boolean;
  supportsTimeSync?: boolean;
  supportsEmployeePush?: boolean;
  supportsRealtimePush?: boolean;
  supportsBatchDownload?: boolean;
  maxUserCapacity?: number;
  maxLogCapacity?: number;
}

export interface DiscoveryProbeResult {
  isReachable: boolean;
  latencyMs: number;
  detectedPorts?: number[];
  detectedManufacturer?: string;
  detectedModel?: string;
  detectedProtocol?: string;
  capabilities?: DeviceCapabilities;
  probeLogs: string[];
  connectorId?: string;
  confidence?: number;
  deviceSerialNumber?: string;
  firmwareVersion?: string;
  serverTimeDriftSeconds?: number;
  deviceTimeIso?: string;
  rawBanner?: string;
}

export interface TimeSyncResult {
  success: boolean;
  devicePreviousTimeIso?: string;
  synchronizedTimeIso: string;
  driftSeconds: number;
  message: string;
}

export interface DeviceRawPunch {
  machineUserId: string;
  timestamp: string;
  transactionId?: string;
  verificationMethod?: string;
  punchType?: string;
  rawPayload?: string;
}

export interface DeviceEmployeeUser {
  machineUserId: string;
  name?: string;
  cardNo?: string;
  password?: string;
  machineUserName?: string;
  machineCardNo?: string;
  faceEnrolled?: boolean;
  fingerprintCount?: number;
  privilege?: string;
}

export interface DeviceEmployeeMapping {
  id: string;
  companyId: string;
  siteId?: string;
  deviceId: string;
  machineUserId: string;
  machineUserName?: string;
  machineCardNo?: string;
  employeeId?: string;
  employeeName?: string;
  mappingStatus: MappingStatus;
  matchConfidence: number;
}

export interface DevicePunchTransaction {
  id: string;
  companyId: string;
  siteId: string;
  deviceId: string;
  employeeId?: string;
  machineUserId: string;
  transactionId: string;
  punchTimestamp: string;
  receivedAt: string;
  verificationMethod?: string;
  punchType: string;
  source: string;
  rawReference: string;
  processedStatus: string;
  errorMessage?: string;
  attendanceRecordId?: string;
  processedAt?: string;
  retryCount: number;
}

export interface PunchSyncResult {
  success: boolean;
  deviceId: string;
  totalFetched: number;
  totalProcessed: number;
  totalDuplicate: number;
  totalUnmapped: number;
  totalFailed: number;
  executionTimeMs: number;
  newAttendanceRecordsCreated: number;
  attendanceRecordsUpdated: number;
  transactions: DevicePunchTransaction[];
  message: string;
}

export interface BiometricDevice {
  id: string;
  companyId: string;
  siteId: string;
  deviceName: string;
  ipAddress: string;
  port: number;
  macAddress?: string;
  manufacturer: string;
  model?: string;
  serialNumber?: string;
  firmwareVersion?: string;
  protocol: string;
  status: string;
  lastSeen?: string;
  lastSync?: string;
  syncIntervalMinutes: number;
  username?: string;
  password?: string;
  commKey?: string;
  apiKey?: string;
  syncConfig?: any;
  telemetry?: any;
  connectorId?: string;
  authType?: string;
  encryptedAuthKey?: string;
  capabilities?: any;
}

export interface DeviceAuditLog {
  id: string;
  companyId: string;
  deviceId: string;
  eventType: string;
  message: string;
  timestamp: string;
  details?: string;
  action?: string;
  performedBy?: string;
}

export interface DeviceSyncFailure {
  deviceId: string;
  error: string;
  timestamp: string;
  isResolved?: boolean;
  retryCount?: number;
}

export interface DeviceSyncJob {
  id: string;
  companyId: string;
  deviceId: string;
  status: string;
  startedAt: string;
  completedAt?: string;
}
