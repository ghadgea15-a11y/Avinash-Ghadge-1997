import {
  BiometricDevice,
  DeviceCapabilities,
  DeviceEmployeeUser,
  DeviceManufacturer,
  DeviceProtocol,
  DeviceRawPunch,
  DeviceStatus,
  DiscoveryProbeResult,
  TimeSyncResult
} from '../../../types/biometric';

export interface DeviceConnectionConfig {
  ipAddress: string;
  port: number;
  commKey?: string;
  username?: string;
  password?: string;
  apiKey?: string;
  timeoutMs?: number;
  useSsl?: boolean;
}

export interface UniversalDeviceConnector {
  readonly connectorId: string;
  readonly supportedManufacturer: DeviceManufacturer;
  readonly supportedProtocols: DeviceProtocol[];
  readonly defaultPort: number;

  /**
   * Probe and discover device reachability and capability parameters
   */
  discover(config: DeviceConnectionConfig): Promise<DiscoveryProbeResult>;

  /**
   * Detect underlying hardware communication protocol
   */
  detectProtocol(config: DeviceConnectionConfig): Promise<{ protocol: DeviceProtocol; confidence: number; details: string }>;

  /**
   * Inspect and detect manufacturer identity
   */
  detectManufacturer(config: DeviceConnectionConfig): Promise<{ manufacturer: DeviceManufacturer; confidence: number }>;

  /**
   * Detect specific device model and revision
   */
  detectModel(config: DeviceConnectionConfig): Promise<{ model: string; serialNumber?: string; firmwareVersion?: string }>;

  /**
   * Establish connection channel / socket session
   */
  connect(config: DeviceConnectionConfig): Promise<{ connected: boolean; sessionId?: string; message: string }>;

  /**
   * Perform authentication handshake (comm key, digest, bearer, basic auth)
   */
  authenticate(config: DeviceConnectionConfig, authCredentials?: string): Promise<{ authenticated: boolean; token?: string; message: string }>;

  /**
   * Comprehensive round-trip connectivity and response latency check
   */
  testConnection(config: DeviceConnectionConfig): Promise<{ success: boolean; latencyMs: number; message: string }>;

  /**
   * Retrieve hardware telemetry, capacity, and firmware metadata
   */
  getDeviceInfo(config: DeviceConnectionConfig): Promise<{
    manufacturer: DeviceManufacturer;
    model: string;
    serialNumber: string;
    firmwareVersion: string;
    capabilities: DeviceCapabilities;
    userCount: number;
    logCount: number;
  }>;

  /**
   * Retrieve current device hardware real-time clock (RTC)
   */
  getDeviceTime(config: DeviceConnectionConfig): Promise<{ deviceTimeIso: string; timezoneOffsetMinutes?: number }>;

  /**
   * Synchronize hardware clock with authoritative server time
   */
  syncDeviceTime(config: DeviceConnectionConfig, targetTimeIso?: string): Promise<TimeSyncResult>;

  /**
   * Read all enrolled employee users from device memory
   */
  getEmployees(config: DeviceConnectionConfig): Promise<DeviceEmployeeUser[]>;

  /**
   * Fetch raw punch transactions starting from optional cursor / timestamp
   */
  getPunchTransactions(config: DeviceConnectionConfig, sinceCursor?: string): Promise<{ punches: DeviceRawPunch[]; nextCursor?: string }>;

  /**
   * Standardized attendance logs extraction
   */
  getAttendance(config: DeviceConnectionConfig, startDateIso?: string, endDateIso?: string): Promise<DeviceRawPunch[]>;

  /**
   * Push new or updated employee record into device memory
   */
  pushEmployee(config: DeviceConnectionConfig, employee: DeviceEmployeeUser): Promise<{ success: boolean; message: string }>;

  /**
   * Remove employee record from biometric device memory
   */
  deleteEmployee(config: DeviceConnectionConfig, machineUserId: string): Promise<{ success: boolean; message: string }>;

  /**
   * Health and connectivity status evaluation
   */
  getDeviceStatus(config: DeviceConnectionConfig): Promise<DeviceStatus>;

  /**
   * Cleanly terminate connection session
   */
  disconnect(config: DeviceConnectionConfig): Promise<void>;
}
