import { BiometricDeviceService } from './biometric/BiometricDeviceService';
import { BiometricDevice } from '../types/biometric';
import { UserSession, EmployeeRecord, ShiftRecord } from '../types';

export class HardwareIntegrationService {
  /**
   * Universal health check for all registered hardware devices in a company.
   */
  static async performFleetHealthCheck(companyId: string): Promise<{
    total: number;
    online: number;
    offline: number;
    errors: number;
  }> {
    const devices = await BiometricDeviceService.getCompanyDevices(companyId);
    let online = 0;
    let offline = 0;
    let errors = 0;

    for (const device of devices) {
      try {
        const isAlive = await BiometricDeviceService.pingDevice(device.id);
        if (isAlive) online++;
        else offline++;
      } catch (err) {
        errors++;
      }
    }

    return {
      total: devices.length,
      online,
      offline,
      errors
    };
  }

  /**
   * Synchronizes all device clocks to server time.
   */
  static async syncAllClocks(session: UserSession, companyId: string): Promise<void> {
    const devices = await BiometricDeviceService.getCompanyDevices(companyId);
    await Promise.all(devices.map(d => BiometricDeviceService.syncDeviceClock(session, companyId, d)));
  }

  /**
   * Global punch ingestion from all active devices.
   */
  static async ingestAllPunches(
    session: UserSession, 
    companyId: string,
    employees: EmployeeRecord[],
    shifts: ShiftRecord[]
  ): Promise<{ totalPunches: number; deviceCount: number }> {
    const devices = await BiometricDeviceService.getCompanyDevices(companyId);
    const activeDevices = devices.filter(d => d.status !== 'OFFLINE');
    
    let totalPunches = 0;
    for (const device of activeDevices) {
      const result = await BiometricDeviceService.syncDevicePunches(session, companyId, device, employees, shifts);
      if (result.success) {
        totalPunches += result.totalFetched;
      }
    }

    return {
      totalPunches,
      deviceCount: activeDevices.length
    };
  }
}

