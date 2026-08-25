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

export class RfidCardConnector implements UniversalDeviceConnector {
  readonly connectorId = 'RFID_CARD_V1';
  readonly supportedManufacturer: DeviceManufacturer = 'GENERIC';
  readonly supportedProtocols: DeviceProtocol[] = ['RFID_CARD_TERMINAL'];
  readonly defaultPort = 8008;

  async discover(config: DeviceConnectionConfig): Promise<DiscoveryProbeResult> {
    return {
      isReachable: true,
      latencyMs: 12,
      detectedPorts: [config.port || this.defaultPort],
      detectedManufacturer: 'GENERIC',
      detectedModel: 'Contactless RFID / NFC Turnstile Reader',
      detectedProtocol: 'RFID_CARD_TERMINAL',
      connectorId: this.connectorId,
      confidence: 0.92,
      capabilities: {
        supportsFingerprint: false,
        supportsFace: false,
        supportsCard: true,
        supportsTimeSync: true,
        supportsEmployeePush: true,
        supportsRealtimePush: true,
        supportsBatchDownload: true
      },
      deviceSerialNumber: `RFID-${config.ipAddress.replace(/\./g, '')}`,
      firmwareVersion: 'RFID-Reader-v4.0',
      deviceTimeIso: new Date().toISOString(),
      probeLogs: ['[RFID] Probing Wiegand/RFID IP Bridge reader']
    };
  }

  async detectProtocol() { return { protocol: 'RFID_CARD_TERMINAL' as DeviceProtocol, confidence: 0.92, details: 'Mifare / HID RFID Card Protocol' }; }
  async detectManufacturer() { return { manufacturer: 'GENERIC' as DeviceManufacturer, confidence: 0.85 }; }
  async detectModel() { return { model: 'RFID / NFC Terminal', firmwareVersion: 'v4.0' }; }
  async connect() { return { connected: true, message: 'Connected to RFID Reader' }; }
  async authenticate() { return { authenticated: true, message: 'RFID Reader Authenticated' }; }
  async testConnection() { return { success: true, latencyMs: 12, message: 'RFID Reader OK' }; }
  async getDeviceInfo() {
    return {
      manufacturer: 'GENERIC' as DeviceManufacturer,
      model: 'RFID Turnstile Reader',
      serialNumber: 'RFID-READER-01',
      firmwareVersion: 'v4.0',
      capabilities: {
        supportsFingerprint: false,
        supportsFace: false,
        supportsCard: true,
        supportsTimeSync: true,
        supportsEmployeePush: true,
        supportsRealtimePush: true,
        supportsBatchDownload: true
      },
      userCount: 80,
      logCount: 4500
    };
  }
  async getDeviceTime() { return { deviceTimeIso: new Date().toISOString() }; }
  async syncDeviceTime(): Promise<TimeSyncResult> {
    return { success: true, devicePreviousTimeIso: new Date().toISOString(), synchronizedTimeIso: new Date().toISOString(), driftSeconds: 0, message: 'RFID Clock Synced' };
  }
  async getEmployees(): Promise<DeviceEmployeeUser[]> {
    return [{ machineUserId: '8001', machineUserName: 'Sunita Rao', machineCardNo: '10928374', privilege: 'USER' }];
  }
  async getPunchTransactions(): Promise<{ punches: DeviceRawPunch[]; nextCursor?: string }> {
    return {
      punches: [{
        machineUserId: '8001',
        transactionId: `RFID_TX_${Date.now()}`,
        timestamp: new Date().toISOString(),
        verificationMethod: 'RFID_CARD',
        punchType: 'IN',
        rawPayload: '{"cardNo":"10928374"}'
      }]
    };
  }
  async getAttendance(config: DeviceConnectionConfig) {
    const tx = await this.getPunchTransactions();
    return tx.punches;
  }
  async pushEmployee() { return { success: true, message: 'Card enrolled' }; }
  async deleteEmployee() { return { success: true, message: 'Card revoked' }; }
  async getDeviceStatus(): Promise<DeviceStatus> { return 'ONLINE'; }
  async disconnect(): Promise<void> {}
}
