export type DeviceProtocol = string;
export interface DeviceConfig {
  id: string;
  ipAddress: string;
  port: number;
  protocol: DeviceProtocol;
  username?: string;
  password?: string;
  [key: string]: any;
}
export interface NormalizedPunch {
  id: string;
  employeeId: string;
  timestamp: string;
  type: string;
  deviceId: string;
  [key: string]: any;
}
export interface BiometricDevice { [key: string]: any; }
export interface DeviceCapabilities { [key: string]: any; }
export interface DeviceEmployeeUser { [key: string]: any; }
export interface DeviceManufacturer { [key: string]: any; }
export interface DeviceRawPunch { [key: string]: any; }
export interface DeviceStatus { [key: string]: any; }
export interface DiscoveryProbeResult { [key: string]: any; }
export interface TimeSyncResult { [key: string]: any; }
