import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  deleteDoc,
  where,
  limit,
  orderBy
} from 'firebase/firestore';
import { db } from '../../firebase';
import { EmployeeRecord, ShiftRecord, SiteRecord, UserSession } from '../../types';
import {
  BiometricDevice,
  DeviceAuditLog,
  DeviceEmployeeMapping,
  DeviceEmployeeUser,
  DevicePunchTransaction,
  DeviceStatus,
  DeviceSyncFailure,
  DeviceSyncJob,
  DiscoveryProbeResult,
  MappingStatus,
  PunchSyncResult,
  TimeSyncResult
} from '../../types/biometric';
import { ConnectorRegistry } from './ConnectorRegistry';
import { ProtocolDetectionService } from './ProtocolDetectionService';
import { PunchNormalizationEngine } from './PunchNormalizationEngine';

export class BiometricDeviceService {
  /**
   * List all registered devices for a company tenant (with optional site filter)
   */
  public static async getCompanyDevices(companyId: string, siteId?: string): Promise<BiometricDevice[]> {
    try {
      const colRef = collection(db, 'companies', companyId, 'attendance_devices');
      const q = siteId ? query(colRef, where('siteId', '==', siteId)) : query(colRef);
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as BiometricDevice));
    } catch (err) {
      console.warn('[BiometricService] Failed to load devices from Firestore:', err);
      return [];
    }
  }

  /**
   * Realtime subscription to company biometric devices
   */
  public static subscribeCompanyDevices(
    companyId: string,
    onData: (devices: BiometricDevice[]) => void,
    siteId?: string
  ): () => void {
    try {
      const colRef = collection(db, 'companies', companyId, 'attendance_devices');
      const q = siteId ? query(colRef, where('siteId', '==', siteId)) : query(colRef);
      return onSnapshot(q, (snap) => {
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as BiometricDevice));
        onData(list);
      }, (err) => {
        console.warn('[BiometricService] Device subscription warning:', err);
      });
    } catch (err) {
      return () => {};
    }
  }

  /**
   * Register a new Biometric Device into Firestore with complete validation
   */
  public static async registerDevice(
    session: UserSession,
    companyId: string,
    deviceData: Omit<BiometricDevice, 'id' | 'createdAt' | 'createdBy' | 'updatedAt' | 'updatedBy'>
  ): Promise<{ success: boolean; device?: BiometricDevice; message: string }> {
    // 1. Multi-Tenant Authorization Check
    if (session.companyId !== companyId && session.role !== 'SUPER_ADMIN') {
      return { success: false, message: 'Unauthorized: Cross-tenant device registration denied' };
    }

    // 2. IP / Hostname Validation
    if (!ProtocolDetectionService.isValidHostAddress(deviceData.ipAddress)) {
      return { success: false, message: `Invalid IP address or hostname: ${deviceData.ipAddress}` };
    }

    const deviceId = `DEV_${deviceData.siteId}_${deviceData.ipAddress.replace(/[^a-zA-Z0-9]/g, '_')}_${deviceData.port}`;
    const now = new Date().toISOString();

    const device: BiometricDevice = {
      ...deviceData,
      id: deviceId,
      companyId,
      createdAt: now,
      createdBy: session.userId || session.employeeId,
      updatedAt: now,
      updatedBy: session.userId || session.employeeId
    };

    try {
      const ref = doc(db, 'companies', companyId, 'attendance_devices', deviceId);
      await setDoc(ref, device, { merge: true });

      // Record Audit Log
      await this.recordAuditLog(companyId, device.siteId, deviceId, session.fullName || session.userId, 'REGISTER', 
        `Registered ${device.manufacturer} device (${device.deviceName}) at ${device.ipAddress}:${device.port}`
      );

      return { success: true, device, message: `Device ${device.deviceName} registered successfully` };
    } catch (err: any) {
      return { success: false, message: err?.message || 'Failed to save device record' };
    }
  }

  /**
   * Update device settings or status
   */
  public static async updateDevice(
    session: UserSession,
    companyId: string,
    deviceId: string,
    updates: Partial<BiometricDevice>
  ): Promise<{ success: boolean; message: string }> {
    try {
      const ref = doc(db, 'companies', companyId, 'attendance_devices', deviceId);
      const now = new Date().toISOString();
      await setDoc(ref, {
        ...updates,
        updatedAt: now,
        updatedBy: session.userId || session.employeeId
      }, { merge: true });

      return { success: true, message: 'Device updated' };
    } catch (err: any) {
      return { success: false, message: err?.message || 'Update failed' };
    }
  }

  /**
   * Delete a biometric device
   */
  public static async deleteDevice(
    session: UserSession,
    companyId: string,
    deviceId: string,
    siteId: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      const ref = doc(db, 'companies', companyId, 'attendance_devices', deviceId);
      await deleteDoc(ref);

      await this.recordAuditLog(companyId, siteId, deviceId, session.fullName || session.userId, 'REMOVE', `Removed biometric device ${deviceId}`);
      return { success: true, message: 'Device removed successfully' };
    } catch (err: any) {
      return { success: false, message: err?.message || 'Delete failed' };
    }
  }

  /**
   * Execute 1-Click Test Connection
   */
  public static async testDeviceConnection(
    companyId: string,
    device: BiometricDevice
  ): Promise<{ success: boolean; latencyMs: number; message: string }> {
    const registry = ConnectorRegistry.getInstance();
    const connector = registry.getConnector(device.connectorId) || registry.resolveConnector(device.protocol, device.manufacturer);

    if (!connector) {
      return { success: false, latencyMs: 0, message: `No active connector for protocol ${device.protocol}` };
    }

    try {
      const res = await connector.testConnection({
        ipAddress: device.ipAddress,
        port: device.port,
        commKey: device.encryptedAuthKey
      });

      // Update telemetry in Firestore
      const ref = doc(db, 'companies', companyId, 'attendance_devices', device.id);
      await updateDoc(ref, {
        'status': res.success ? 'ONLINE' : 'OFFLINE',
        'telemetry.lastSeenAt': new Date().toISOString(),
        'telemetry.lastPingLatencyMs': res.latencyMs
      });

      return res;
    } catch (err: any) {
      return { success: false, latencyMs: 0, message: err?.message || 'Connection test failed' };
    }
  }

  /**
   * Synchronize Device Hardware Clock with Authoritative Time
   */
  public static async syncDeviceClock(
    session: UserSession,
    companyId: string,
    device: BiometricDevice
  ): Promise<TimeSyncResult> {
    const registry = ConnectorRegistry.getInstance();
    const connector = registry.getConnector(device.connectorId) || registry.resolveConnector(device.protocol, device.manufacturer);

    if (!connector) {
      return {
        success: false,
        devicePreviousTimeIso: new Date().toISOString(),
        synchronizedTimeIso: new Date().toISOString(),
        driftSeconds: 0,
        message: 'Connector not available for clock synchronization'
      };
    }

    const targetTime = new Date().toISOString();
    const res = await connector.syncDeviceTime({
      ipAddress: device.ipAddress,
      port: device.port,
      commKey: device.encryptedAuthKey
    }, targetTime);

    if (res.success) {
      const ref = doc(db, 'companies', companyId, 'attendance_devices', device.id);
      await updateDoc(ref, {
        'telemetry.deviceTimeIso': res.synchronizedTimeIso,
        'telemetry.serverTimeDriftSeconds': 0,
        'updatedAt': targetTime
      });

      await this.recordAuditLog(
        companyId,
        device.siteId,
        device.id,
        session.fullName || session.userId,
        'TIME_SYNC',
        `Adjusted device clock drift of ${res.driftSeconds}s to UTC ${res.synchronizedTimeIso}`
      );
    }

    return res;
  }

  /**
   * Discover Enrolled Machine Users and Generate Automatic Employee Mappings
   */
  public static async discoverAndAutoMapEmployees(
    session: UserSession,
    companyId: string,
    device: BiometricDevice,
    employees: EmployeeRecord[]
  ): Promise<{
    discoveredUsers: DeviceEmployeeUser[];
    mappings: DeviceEmployeeMapping[];
    exactMatches: number;
    unmapped: number;
  }> {
    const registry = ConnectorRegistry.getInstance();
    const connector = registry.getConnector(device.connectorId) || registry.resolveConnector(device.protocol, device.manufacturer);

    if (!connector) {
      return { discoveredUsers: [], mappings: [], exactMatches: 0, unmapped: 0 };
    }

    // 1. Fetch Users from Hardware
    const discoveredUsers = await connector.getEmployees({
      ipAddress: device.ipAddress,
      port: device.port,
      commKey: device.encryptedAuthKey
    });

    // 2. Build index maps for fast reconciliation
    const empByCode = new Map<string, EmployeeRecord>();
    const empByName = new Map<string, EmployeeRecord>();

    for (const emp of employees) {
      const code = (emp.employeeCode || emp.employeeId || emp.id || '').trim().toLowerCase();
      const empName = `${emp.firstName || ''} ${emp.lastName || ''}`.trim().toLowerCase();
      if (code) empByCode.set(code, emp);
      empByCode.set(emp.id.trim().toLowerCase(), emp);
      if (empName) empByName.set(empName, emp);
    }

    const mappings: DeviceEmployeeMapping[] = [];
    let exactMatches = 0;
    let unmapped = 0;
    const now = new Date().toISOString();

    for (const user of discoveredUsers) {
      const pin = user.machineUserId.trim().toLowerCase();
      const userName = (user.machineUserName || '').trim().toLowerCase();
      const cardNo = (user.machineCardNo || '').trim().toLowerCase();

      let matchedEmp: EmployeeRecord | undefined = undefined;
      let matchConfidence = 0.0;
      let status: MappingStatus = 'UNMAPPED';

      // Check Exact Match on Employee Code / PIN
      if (empByCode.has(pin)) {
        matchedEmp = empByCode.get(pin);
        matchConfidence = 1.0;
        status = 'AUTO_MATCHED';
      } else if (cardNo && empByCode.has(cardNo)) {
        matchedEmp = empByCode.get(cardNo);
        matchConfidence = 0.95;
        status = 'AUTO_MATCHED';
      } else if (userName && empByName.has(userName)) {
        matchedEmp = empByName.get(userName);
        matchConfidence = 0.90;
        status = 'AUTO_MATCHED';
      }

      if (matchedEmp) {
        exactMatches++;
      } else {
        unmapped++;
      }

      const mappingId = `MAP_${device.id}_${user.machineUserId}`;
      const matchedFullName = matchedEmp ? `${matchedEmp.firstName || ''} ${matchedEmp.lastName || ''}`.trim() : '';
      const mappingObj: DeviceEmployeeMapping = {
        id: mappingId,
        companyId,
        siteId: device.siteId,
        deviceId: device.id,
        machineUserId: user.machineUserId,
        machineUserName: user.machineUserName,
        machineCardNo: user.machineCardNo,
        employeeId: matchedEmp ? matchedEmp.id : '',
        employeeName: matchedFullName,
        mappingStatus: status,
        matchConfidence,
        createdAt: now,
        updatedAt: now
      };

      mappings.push(mappingObj);

      // Persist to Firestore
      try {
        const mRef = doc(db, 'companies', companyId, 'device_employee_mappings', mappingId);
        await setDoc(mRef, mappingObj, { merge: true });
      } catch (saveErr) {
        console.warn('[BiometricService] Mapping persist error:', saveErr);
      }
    }

    return {
      discoveredUsers,
      mappings,
      exactMatches,
      unmapped
    };
  }

  /**
   * Fetch All Employee Mappings for a device or company
   */
  public static async getDeviceMappings(companyId: string, deviceId?: string): Promise<DeviceEmployeeMapping[]> {
    try {
      const colRef = collection(db, 'companies', companyId, 'device_employee_mappings');
      const q = deviceId ? query(colRef, where('deviceId', '==', deviceId)) : query(colRef);
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as DeviceEmployeeMapping));
    } catch (err) {
      return [];
    }
  }

  /**
   * Manually map or update a machine user mapping
   */
  public static async saveEmployeeMapping(
    session: UserSession,
    companyId: string,
    mapping: DeviceEmployeeMapping
  ): Promise<{ success: boolean; message: string }> {
    try {
      const ref = doc(db, 'companies', companyId, 'device_employee_mappings', mapping.id);
      const now = new Date().toISOString();
      await setDoc(ref, {
        ...mapping,
        verifiedByAdminId: session.userId || session.employeeId,
        updatedAt: now
      }, { merge: true });

      return { success: true, message: 'Mapping updated successfully' };
    } catch (err: any) {
      return { success: false, message: err?.message || 'Failed to save mapping' };
    }
  }

  /**
   * Synchronize Raw Punch Transactions from Device into Attendance System
   */
  public static async syncDevicePunches(
    session: UserSession,
    companyId: string,
    device: BiometricDevice,
    employees: EmployeeRecord[],
    shifts: ShiftRecord[]
  ): Promise<PunchSyncResult> {
    const registry = ConnectorRegistry.getInstance();
    const connector = registry.getConnector(device.connectorId) || registry.resolveConnector(device.protocol, device.manufacturer);

    if (!connector) {
      return {
        success: false,
        deviceId: device.id,
        totalFetched: 0,
        totalProcessed: 0,
        totalDuplicate: 0,
        totalUnmapped: 0,
        totalFailed: 0,
        executionTimeMs: 0,
        newAttendanceRecordsCreated: 0,
        attendanceRecordsUpdated: 0,
        transactions: [],
        message: 'No connector found for punch synchronization'
      };
    }

    const startTime = Date.now();

    // 1. Fetch raw punches from hardware
    const { punches: rawPunches, nextCursor } = await connector.getPunchTransactions(
      { ipAddress: device.ipAddress, port: device.port, commKey: device.encryptedAuthKey },
      device.syncConfig.lastSyncCursor
    );

    // 2. Fetch active mappings
    const mappings = await this.getDeviceMappings(companyId, device.id);

    // 3. Normalize and process punches
    const syncRes = await PunchNormalizationEngine.processRawPunches(
      companyId,
      device.siteId,
      device.id,
      rawPunches,
      mappings,
      employees,
      shifts
    );

    // 4. Update Device Telemetry & Cursor in Firestore
    const now = new Date().toISOString();
    const devRef = doc(db, 'companies', companyId, 'attendance_devices', device.id);
    await updateDoc(devRef, {
      'status': syncRes.totalFailed > 0 ? 'SYNC_ERROR' : 'ONLINE',
      'telemetry.lastSyncAt': now,
      'telemetry.lastSuccessfulSyncAt': syncRes.totalProcessed > 0 ? now : device.telemetry.lastSuccessfulSyncAt,
      'telemetry.lastPunchTimestamp': rawPunches.length > 0 ? rawPunches[rawPunches.length - 1].timestamp : device.telemetry.lastPunchTimestamp,
      'telemetry.totalPunchCount': (device.telemetry.totalPunchCount || 0) + syncRes.totalProcessed,
      'telemetry.failedTransactionCount': (device.telemetry.failedTransactionCount || 0) + syncRes.totalFailed,
      'syncConfig.lastSyncCursor': nextCursor || device.syncConfig.lastSyncCursor
    });

    // 5. Record Sync Job Log
    const jobId = `JOB_${device.id}_${Date.now()}`;
    const jobLog: DeviceSyncJob = {
      id: jobId,
      companyId,
      siteId: device.siteId,
      deviceId: device.id,
      jobType: 'MANUAL_SYNC',
      status: syncRes.totalFailed > 0 ? 'PARTIALLY_FAILED' : 'COMPLETED',
      recordsFetched: syncRes.totalFetched,
      recordsProcessed: syncRes.totalProcessed,
      recordsDuplicate: syncRes.totalDuplicate,
      recordsFailed: syncRes.totalFailed,
      executionTimeMs: Date.now() - startTime,
      startedAt: new Date(startTime).toISOString(),
      completedAt: now
    };

    try {
      const jobRef = doc(db, 'companies', companyId, 'device_sync_jobs', jobId);
      await setDoc(jobRef, jobLog);
    } catch (jErr) {
      console.warn('[BiometricService] Job log persist warning:', jErr);
    }

    return syncRes;
  }

  /**
   * Record Immutable Audit Log
   */
  public static async recordAuditLog(
    companyId: string,
    siteId: string,
    deviceId: string,
    performedBy: string,
    action: DeviceAuditLog['action'],
    details: string
  ): Promise<void> {
    try {
      const logId = `AUD_${deviceId}_${Date.now()}`;
      const logRef = doc(db, 'companies', companyId, 'device_audit_logs', logId);
      const auditEntry: DeviceAuditLog = {
        id: logId,
        companyId,
        siteId,
        deviceId,
        action,
        performedBy,
        details,
        timestamp: new Date().toISOString()
      };
      await setDoc(logRef, auditEntry);
    } catch (err) {
      console.warn('[BiometricService] Audit log write warning:', err);
    }
  }

  /**
   * Fetch Audit Logs for a Company/Device
   */
  public static async getAuditLogs(companyId: string, deviceId?: string): Promise<DeviceAuditLog[]> {
    try {
      const colRef = collection(db, 'companies', companyId, 'device_audit_logs');
      const q = deviceId 
        ? query(colRef, where('deviceId', '==', deviceId), limit(50))
        : query(colRef, limit(50));
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as DeviceAuditLog));
    } catch (err) {
      return [];
    }
  }
}
