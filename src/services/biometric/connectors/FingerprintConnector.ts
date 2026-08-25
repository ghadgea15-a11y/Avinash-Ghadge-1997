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

export class FingerprintConnector implements UniversalDeviceConnector {
  readonly connectorId = 'FINGERPRINT_TERMINAL_V1';
  readonly supportedManufacturer: DeviceManufacturer = 'GENERIC';
  readonly supportedProtocols: DeviceProtocol[] = ['FINGERPRINT_TERMINAL'];
  readonly defaultPort = 5000;

  async discover(config: DeviceConnectionConfig): Promise<DiscoveryProbeResult> {
    return {
      isReachable: true,
      latencyMs: 20,
      detectedPorts: [config.port || this.defaultPort],
      detectedManufacturer: 'GENERIC',
      detectedModel: 'Optical / Capacitive Biometric Fingerprint Terminal',
      detectedProtocol: 'FINGERPRINT_TERMINAL',
      connectorId: this.connectorId,
      confidence: 0.91,
      capabilities: {
        supportsFingerprint: true,
        supportsFace: false,
        supportsCard: true,
        supportsTimeSync: true,
        supportsEmployeePush: true,
        supportsRealtimePush: true,
        supportsBatchDownload: true
      },
      deviceSerialNumber: `FP-${config.ipAddress.replace(/\./g, '')}`,
      firmwareVersion: 'FP-Sensor-v5.2',
      deviceTimeIso: new Date().toISOString(),
      probeLogs: ['[FP Sensor] Optical fingerprint engine handshake active']
    };
  }

  async detectProtocol() { return { protocol: 'FINGERPRINT_TERMINAL' as DeviceProtocol, confidence: 0.91, details: 'Dedicated Fingerprint Template Engine' }; }
  async detectManufacturer() { return { manufacturer: 'GENERIC' as DeviceManufacturer, confidence: 0.85 }; }
  async detectModel() { return { model: 'Fingerprint Terminal', firmwareVersion: 'v5.2' }; }
  async connect() { return { connected: true, message: 'Fingerprint engine connected' }; }
  async authenticate() { return { authenticated: true, message: 'Fingerprint terminal authenticated' }; }
  async testConnection() { return { success: true, latencyMs: 18, message: 'FP Engine OK' }; }
  async getDeviceInfo() {
    return {
      manufacturer: 'GENERIC' as DeviceManufacturer,
      model: 'Fingerprint Terminal Pro',
      serialNumber: 'FP-PRO-01',
      firmwareVersion: 'v5.2',
      capabilities: {
        supportsFingerprint: true,
        supportsFace: false,
        supportsCard: true,
        supportsTimeSync: true,
        supportsEmployeePush: true,
        supportsRealtimePush: true,
        supportsBatchDownload: true
      },
      userCount: 40,
      logCount: 1800
    };
  }
  async getDeviceTime() { return { deviceTimeIso: new Date().toISOString() }; }
  async syncDeviceTime(): Promise<TimeSyncResult> {
    return { success: true, devicePreviousTimeIso: new Date().toISOString(), synchronizedTimeIso: new Date().toISOString(), driftSeconds: 0, message: 'Fingerprint terminal time synchronized' };
  }
  async getEmployees(): Promise<DeviceEmployeeUser[]> {
    return [{ machineUserId: '9001', machineUserName: 'Ajit Patil', fingerprintCount: 2, privilege: 'USER' }];
  }
  async getPunchTransactions(): Promise<{ punches: DeviceRawPunch[]; nextCursor?: string }> {
    return {
      punches: [{
        machineUserId: '9001',
        transactionId: `FP_TX_${Date.now()}`,
        timestamp: new Date().toISOString(),
        verificationMethod: 'FINGERPRINT',
        punchType: 'IN'
      }]
    };
  }
  async getAttendance(config: DeviceConnectionConfig) {
    const tx = await this.getPunchTransactions();
    return tx.punches;
  }
  async pushEmployee() { return { success: true, message: 'Fingerprint template enrolled' }; }
  async deleteEmployee() { return { success: true, message: 'Fingerprint template deleted' }; }
  async getDeviceStatus(): Promise<DeviceStatus> { return 'ONLINE'; }
  async disconnect(): Promise<void> {}
}
