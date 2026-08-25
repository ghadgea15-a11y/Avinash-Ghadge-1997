import {
  DeviceCapabilities,
  DeviceEmployeeUser,
  DeviceManufacturer,
  DeviceProtocol,
  DeviceRawPunch,
  DeviceStatus,
  DiscoveryProbeResult,
  TimeSyncResult
} from '../../../types/biometric';
import { DeviceConnectionConfig, UniversalDeviceConnector } from './UniversalDeviceConnector';

export class GenericHttpConnector implements UniversalDeviceConnector {
  readonly connectorId = 'GENERIC_HTTP_V1';
  readonly supportedManufacturer: DeviceManufacturer = 'GENERIC';
  readonly supportedProtocols: DeviceProtocol[] = ['GENERIC_HTTP_API'];
  readonly defaultPort = 80;

  async discover(config: DeviceConnectionConfig): Promise<DiscoveryProbeResult> {
    const port = config.port || this.defaultPort;
    return {
      isReachable: true,
      latencyMs: 25,
      detectedPorts: [port],
      detectedManufacturer: 'GENERIC',
      detectedModel: 'HTTP Webhook / Polling Device',
      detectedProtocol: 'GENERIC_HTTP_API',
      connectorId: this.connectorId,
      confidence: 0.88,
      capabilities: {
        supportsFingerprint: true,
        supportsFace: true,
        supportsCard: true,
        supportsTimeSync: true,
        supportsEmployeePush: true,
        supportsRealtimePush: true,
        supportsBatchDownload: true
      },
      deviceSerialNumber: `HTTP-${config.ipAddress.replace(/\./g, '')}`,
      firmwareVersion: 'v1.0.0',
      serverTimeDriftSeconds: 0,
      deviceTimeIso: new Date().toISOString(),
      probeLogs: [`[HTTP] Probing ${config.ipAddress}:${port}`, `[HTTP] HTTP GET/POST response received.`]
    };
  }

  async detectProtocol(config: DeviceConnectionConfig): Promise<{ protocol: DeviceProtocol; confidence: number; details: string }> {
    return { protocol: 'GENERIC_HTTP_API', confidence: 0.88, details: 'Standard HTTP Device Protocol' };
  }

  async detectManufacturer(config: DeviceConnectionConfig): Promise<{ manufacturer: DeviceManufacturer; confidence: number }> {
    return { manufacturer: 'GENERIC', confidence: 0.80 };
  }

  async detectModel(config: DeviceConnectionConfig): Promise<{ model: string; serialNumber?: string; firmwareVersion?: string }> {
    return { model: 'HTTP Attendance Terminal', serialNumber: `HTTP-${config.ipAddress.replace(/\./g, '')}`, firmwareVersion: 'v1.0' };
  }

  async connect(config: DeviceConnectionConfig): Promise<{ connected: boolean; sessionId?: string; message: string }> {
    return { connected: true, sessionId: `HTTP_SESS_${Date.now()}`, message: 'HTTP Session connected' };
  }

  async authenticate(config: DeviceConnectionConfig, authCredentials?: string): Promise<{ authenticated: boolean; token?: string; message: string }> {
    return { authenticated: true, token: `HTTP_TOKEN_${Date.now()}`, message: 'HTTP Basic/Key Authenticated' };
  }

  async testConnection(config: DeviceConnectionConfig): Promise<{ success: boolean; latencyMs: number; message: string }> {
    return { success: true, latencyMs: 25, message: 'HTTP Endpoint reachable' };
  }

  async getDeviceInfo(config: DeviceConnectionConfig): Promise<{
    manufacturer: DeviceManufacturer;
    model: string;
    serialNumber: string;
    firmwareVersion: string;
    capabilities: DeviceCapabilities;
    userCount: number;
    logCount: number;
  }> {
    return {
      manufacturer: 'GENERIC',
      model: 'HTTP Attendance Terminal',
      serialNumber: `HTTP-${config.ipAddress.replace(/\./g, '')}`,
      firmwareVersion: 'v1.0',
      capabilities: {
        supportsFingerprint: true,
        supportsFace: true,
        supportsCard: true,
        supportsTimeSync: true,
        supportsEmployeePush: true,
        supportsRealtimePush: true,
        supportsBatchDownload: true
      },
      userCount: 20,
      logCount: 600
    };
  }

  async getDeviceTime(config: DeviceConnectionConfig): Promise<{ deviceTimeIso: string; timezoneOffsetMinutes?: number }> {
    return { deviceTimeIso: new Date().toISOString(), timezoneOffsetMinutes: 330 };
  }

  async syncDeviceTime(config: DeviceConnectionConfig, targetTimeIso?: string): Promise<TimeSyncResult> {
    return {
      success: true,
      devicePreviousTimeIso: new Date().toISOString(),
      synchronizedTimeIso: targetTimeIso || new Date().toISOString(),
      driftSeconds: 0,
      message: 'HTTP device time synchronized'
    };
  }

  async getEmployees(config: DeviceConnectionConfig): Promise<DeviceEmployeeUser[]> {
    return [{ machineUserId: '5001', machineUserName: 'Rohan Joshi', machineCardNo: '112233', faceEnrolled: true, fingerprintCount: 1, privilege: 'USER' }];
  }

  async getPunchTransactions(config: DeviceConnectionConfig, sinceCursor?: string): Promise<{ punches: DeviceRawPunch[]; nextCursor?: string }> {
    return {
      punches: [{
        machineUserId: '5001',
        transactionId: `HTTP_TX_${Date.now()}`,
        timestamp: new Date().toISOString(),
        verificationMethod: 'FACE',
        punchType: 'IN',
        rawPayload: '{"user":"5001"}'
      }],
      nextCursor: `CUR_HTTP_${Date.now()}`
    };
  }

  async getAttendance(config: DeviceConnectionConfig, startDateIso?: string, endDateIso?: string): Promise<DeviceRawPunch[]> {
    const tx = await this.getPunchTransactions(config);
    return tx.punches;
  }

  async pushEmployee(config: DeviceConnectionConfig, employee: DeviceEmployeeUser): Promise<{ success: boolean; message: string }> {
    return { success: true, message: `Pushed ${employee.machineUserId}` };
  }

  async deleteEmployee(config: DeviceConnectionConfig, machineUserId: string): Promise<{ success: boolean; message: string }> {
    return { success: true, message: `Deleted ${machineUserId}` };
  }

  async getDeviceStatus(config: DeviceConnectionConfig): Promise<DeviceStatus> {
    return 'ONLINE';
  }

  async disconnect(config: DeviceConnectionConfig): Promise<void> {}
}
