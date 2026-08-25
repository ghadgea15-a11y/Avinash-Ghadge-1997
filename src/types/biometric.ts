export type DeviceProtocol = 
  | 'ZKTECO_STANDALONE'
  | 'ZKTECO_PUSH_ADMS'
  | 'ESSL_STANDALONE'
  | 'ESSL_PUSH_API'
  | 'HIKVISION_ISAPI'
  | 'GENERIC_REST_API'
  | 'GENERIC_HTTP_API'
  | 'GENERIC_TCP_IP'
  | 'GENERIC_SDK_ADAPTER'
  | 'RFID_CARD_TERMINAL'
  | 'FINGERPRINT_TERMINAL'
  | 'FACE_RECOGNITION_TERMINAL'
  | 'UNSUPPORTED_DEVICE_PROTOCOL';

export type DeviceManufacturer = 
  | 'ZKTECO'
  | 'ESSL'
  | 'HIKVISION'
  | 'ANVIZ'
  | 'DAHUA'
  | 'REALAND'
  | 'SUPREMA'
  | 'MATRIX_COSEC'
  | 'GENERIC'
  | 'OTHER';

export type DeviceVerificationMethod = 
  | 'FINGERPRINT'
  | 'FACE'
  | 'RFID_CARD'
  | 'PASSWORD'
  | 'PALM'
  | 'IRIS'
  | 'COMBINED';

export type DeviceStatus = 
  | 'ONLINE'
  | 'OFFLINE'
  | 'AUTHENTICATION_FAILED'
  | 'PROTOCOL_UNSUPPORTED'
  | 'SYNC_ERROR'
  | 'DISABLED'
  | 'MAINTENANCE';

export type DiscoveryStepState = 
  | 'IDLE'
  | 'DISCOVERING'
  | 'REACHABLE'
  | 'IDENTIFYING'
  | 'PROTOCOL_DETECTED'
  | 'CONNECTOR_SELECTED'
  | 'AUTHENTICATING'
  | 'TESTING'
  | 'READY'
  | 'FAILED';

export type DeviceAuthType = 
  | 'NONE'
  | 'COMM_KEY'
  | 'BASIC'
  | 'DIGEST'
  | 'BEARER_TOKEN'
  | 'API_KEY'
  | 'SDK_TOKEN';

export type MappingStatus = 
  | 'AUTO_MATCHED'
  | 'MANUALLY_MAPPED'
  | 'UNMAPPED'
  | 'IGNORED';

export type TransactionProcessedStatus = 
  | 'PENDING'
  | 'PROCESSED'
  | 'DUPLICATE'
  | 'ERROR'
  | 'UNMAPPED_EMPLOYEE';

export interface DeviceCapabilities {
  supportsFingerprint: boolean;
  supportsFace: boolean;
  supportsCard: boolean;
  supportsTimeSync: boolean;
  supportsEmployeePush: boolean;
  supportsRealtimePush: boolean;
  supportsBatchDownload: boolean;
  maxUserCapacity?: number;
  maxLogCapacity?: number;
}

export interface DeviceTelemetry {
  lastSeenAt: string | null;
  lastSyncAt: string | null;
  lastSuccessfulSyncAt: string | null;
  lastPunchTimestamp: string | null;
  lastPingLatencyMs: number;
  totalUserCount: number;
  totalPunchCount: number;
  pendingTransactionCount: number;
  failedTransactionCount: number;
  consecutiveFailureCount: number;
  deviceTimeIso?: string;
  serverTimeDriftSeconds?: number;
}

export interface DeviceSyncConfig {
  syncMode: 'POLLING' | 'REALTIME_PUSH' | 'HYBRID' | 'MANUAL';
  pollIntervalSeconds: number;
  autoSyncTime: boolean;
  autoMapEmployees: boolean;
  batchChunkSize: number;
  lastSyncCursor?: string;
  isEnabled: boolean;
}

export interface BiometricDevice {
  id: string;
  companyId: string;
  siteId: string;
  siteName?: string;
  deviceName: string;
  ipAddress: string;
  port: number;
  manufacturer: DeviceManufacturer;
  model: string;
  serialNumber?: string;
  firmwareVersion?: string;
  protocol: DeviceProtocol;
  connectorId: string;
  status: DeviceStatus;
  authType: DeviceAuthType;
  authCredentialsMasked?: string; // e.g. "••••••••" - never exposed in raw
  encryptedAuthKey?: string; // backend-only
  capabilities: DeviceCapabilities;
  telemetry: DeviceTelemetry;
  syncConfig: DeviceSyncConfig;
  notes?: string;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
}

export interface DeviceEmployeeUser {
  machineUserId: string; // PIN or machine index
  machineUserName?: string;
  machineCardNo?: string;
  fingerprintCount?: number;
  faceEnrolled?: boolean;
  privilege?: 'USER' | 'ADMIN' | 'SUPERVISOR';
}

export interface DeviceEmployeeMapping {
  id: string;
  companyId: string;
  siteId: string;
  deviceId: string;
  machineUserId: string;
  machineUserName?: string;
  machineCardNo?: string;
  employeeId: string;
  employeeName: string;
  mappingStatus: MappingStatus;
  matchConfidence: number; // 0.0 to 1.0
  lastSeenPunchAt?: string;
  verifiedByAdminId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DeviceRawPunch {
  machineUserId: string;
  transactionId?: string;
  timestamp: string; // ISO 8601 or raw datetime
  verificationMethod: DeviceVerificationMethod;
  punchType?: 'IN' | 'OUT' | 'AUTO_DETECT' | 'BREAK_IN' | 'BREAK_OUT';
  rawPayload?: string;
}

export interface DevicePunchTransaction {
  id: string; // Deterministic idempotency key: ${companyId}_${deviceId}_${machineUserId}_${transactionId || punchTimestamp}
  companyId: string;
  siteId: string;
  deviceId: string;
  employeeId?: string;
  machineUserId: string;
  transactionId: string;
  punchTimestamp: string;
  receivedAt: string;
  verificationMethod: DeviceVerificationMethod;
  punchType: 'IN' | 'OUT' | 'AUTO_DETECT' | 'BREAK_IN' | 'BREAK_OUT';
  source: 'BIOMETRIC_DEVICE';
  rawReference: string;
  processedStatus: TransactionProcessedStatus;
  attendanceRecordId?: string;
  errorMessage?: string;
  processedAt?: string;
  retryCount: number;
}

export interface DeviceSyncJob {
  id: string;
  companyId: string;
  siteId: string;
  deviceId: string;
  jobType: 'SCHEDULED_POLL' | 'MANUAL_SYNC' | 'TIME_SYNC' | 'EMPLOYEE_PUSH' | 'RECOVERY_REPLAY';
  status: 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'PARTIALLY_FAILED';
  recordsFetched: number;
  recordsProcessed: number;
  recordsDuplicate: number;
  recordsFailed: number;
  executionTimeMs: number;
  errorMessage?: string;
  startedAt: string;
  completedAt?: string;
}

export interface DeviceSyncFailure {
  id: string;
  companyId: string;
  siteId: string;
  deviceId: string;
  transactionId: string;
  machineUserId: string;
  punchTimestamp: string;
  errorReason: string;
  rawPayload: string;
  retryCount: number;
  lastAttemptAt: string;
  isResolved: boolean;
  resolutionNotes?: string;
}

export interface DeviceAuditLog {
  id: string;
  companyId: string;
  siteId: string;
  deviceId: string;
  action: 
    | 'REGISTER'
    | 'AUTO_CONNECT'
    | 'TEST_CONNECTION'
    | 'SYNC_PUNCHES'
    | 'TIME_SYNC'
    | 'EMPLOYEE_MAP'
    | 'DISABLE'
    | 'ENABLE'
    | 'REMOVE'
    | 'CREDENTIAL_ROTATED'
    | 'RETRY_RECOVERY';
  performedBy: string;
  details: string;
  ipAddress?: string;
  timestamp: string;
}

export interface DiscoveryProbeResult {
  isReachable: boolean;
  latencyMs: number;
  detectedPorts: number[];
  detectedManufacturer: DeviceManufacturer;
  detectedModel: string;
  detectedProtocol: DeviceProtocol;
  connectorId: string;
  confidence: number;
  capabilities: DeviceCapabilities;
  deviceSerialNumber?: string;
  firmwareVersion?: string;
  serverTimeDriftSeconds?: number;
  deviceTimeIso?: string;
  rawBanner?: string;
  probeLogs: string[];
}

export interface TimeSyncResult {
  success: boolean;
  devicePreviousTimeIso: string;
  synchronizedTimeIso: string;
  driftSeconds: number;
  message: string;
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
