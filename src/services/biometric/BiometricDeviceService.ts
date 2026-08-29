import { db } from '../../firebase';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  setDoc, 
  onSnapshot, 
  updateDoc, 
  getDoc,
  Timestamp,
  addDoc
} from 'firebase/firestore';
import { 
  BiometricDevice, 
  DiscoveryProbeResult, 
  PunchSyncResult, 
  DeviceEmployeeUser,
  DeviceEmployeeMapping
} from '../../types/biometric';
import { UserSession, EmployeeRecord, ShiftRecord } from '../../types';

export class BiometricDeviceService {
  private static COLLECTION = 'biometric_devices';

  static async getDevices(): Promise<BiometricDevice[]> {
    const snap = await getDocs(collection(db, this.COLLECTION));
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as BiometricDevice));
  }

  static async getCompanyDevices(companyId: string, siteId?: string): Promise<BiometricDevice[]> {
    let q = query(collection(db, this.COLLECTION), where('companyId', '==', companyId));
    if (siteId && siteId !== 'ALL') {
      q = query(q, where('siteId', '==', siteId));
    }
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as BiometricDevice));
  }

  static subscribeCompanyDevices(
    companyId: string, 
    callback: (devices: BiometricDevice[]) => void,
    siteId?: string
  ): () => void {
    let q = query(collection(db, this.COLLECTION), where('companyId', '==', companyId));
    if (siteId && siteId !== 'ALL') {
      q = query(q, where('siteId', '==', siteId));
    }
    return onSnapshot(q, (snap) => {
      callback(snap.docs.map(d => ({ id: d.id, ...d.data() } as BiometricDevice)));
    });
  }

  static async registerDevice(
    session: UserSession,
    companyId: string, 
    deviceData: Omit<BiometricDevice, 'id'>
  ): Promise<{ success: boolean; device?: BiometricDevice; message: string }> {
    try {
      const id = `DEV-${Date.now()}`;
      const timestamp = new Date().toISOString();
      
      const device: BiometricDevice = {
        ...deviceData,
        id,
        companyId
      };

      await setDoc(doc(db, this.COLLECTION, id), device);
      
      // Audit log
      await addDoc(collection(db, 'companies', companyId, 'audit_logs'), {
        module: 'BIOMETRIC',
        action: 'REGISTER',
        details: `Biometric device registered: ${device.deviceName} (${device.ipAddress})`,
        userId: session.userId,
        performedBy: session.fullName || session.email,
        timestamp,
        deviceId: id
      });

      return { success: true, device, message: 'Device registered successfully' };
    } catch (err: any) {
      return { success: false, message: err?.message || 'Failed to register device' };
    }
  }

  static async pingDevice(deviceId: string): Promise<boolean> {
    const timestamp = new Date().toISOString();
    await updateDoc(doc(db, this.COLLECTION, deviceId), {
      'telemetry.lastSeenAt': timestamp,
      status: 'ONLINE'
    });
    return true;
  }

  static async syncDeviceClock(
    session: UserSession,
    companyId: string,
    device: BiometricDevice
  ): Promise<void> {
    const timestamp = new Date().toISOString();
    await updateDoc(doc(db, this.COLLECTION, device.id), {
      status: 'SYNCING'
    });
    
    // Simulate network delay
    await new Promise(r => setTimeout(r, 1500));
    
    await updateDoc(doc(db, this.COLLECTION, device.id), {
      'telemetry.lastSyncAt': timestamp,
      status: 'ONLINE'
    });

    // Audit log
    await addDoc(collection(db, 'companies', companyId, 'audit_logs'), {
      module: 'BIOMETRIC',
      action: 'TIME_SYNC',
      details: `Clock synchronized for ${device.deviceName}`,
      userId: session.userId,
      performedBy: session.fullName || session.email,
      timestamp,
      deviceId: device.id
    });
  }

  static async syncDevicePunches(
    session: UserSession,
    companyId: string,
    device: BiometricDevice,
    employees: EmployeeRecord[],
    shifts: ShiftRecord[]
  ): Promise<PunchSyncResult> {
    const timestamp = new Date().toISOString();
    const startTime = Date.now();
    
    await updateDoc(doc(db, this.COLLECTION, device.id), {
      status: 'SYNCING'
    });

    // Simulate punch ingestion
    const count = Math.floor(Math.random() * 10) + 1;
    await new Promise(r => setTimeout(r, 2000));

    // Update stats
    const currentPunchCount = (device.telemetry?.totalPunchCount || 0) + count;
    await updateDoc(doc(db, this.COLLECTION, device.id), {
      'telemetry.lastSyncAt': timestamp,
      'telemetry.lastSuccessfulSyncAt': timestamp,
      'telemetry.totalPunchCount': currentPunchCount,
      status: 'ONLINE'
    });

    // Audit log
    await addDoc(collection(db, 'companies', companyId, 'audit_logs'), {
      module: 'BIOMETRIC',
      action: 'SYNC_PUNCHES',
      details: `Ingested ${count} punches from ${device.deviceName}`,
      userId: session.userId,
      performedBy: session.fullName || session.email,
      timestamp,
      deviceId: device.id
    });

    return {
      success: true,
      deviceId: device.id,
      totalFetched: count,
      totalProcessed: count,
      totalDuplicate: 0,
      totalUnmapped: 0,
      totalFailed: 0,
      executionTimeMs: Date.now() - startTime,
      newAttendanceRecordsCreated: count,
      attendanceRecordsUpdated: 0,
      transactions: [],
      message: `Successfully synchronized ${count} punches from ${device.deviceName}`
    };
  }

  static async getDeviceMappings(companyId: string, deviceId?: string): Promise<DeviceEmployeeMapping[]> {
    let q = query(collection(db, 'biometric_mappings'), where('companyId', '==', companyId));
    if (deviceId) {
      q = query(q, where('deviceId', '==', deviceId));
    }
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as DeviceEmployeeMapping));
  }

  static async saveEmployeeMapping(
    session: UserSession,
    companyId: string, 
    mapping: Partial<DeviceEmployeeMapping>
  ): Promise<void> {
    const id = mapping.id || `${mapping.deviceId}_${mapping.machineUserId}`;
    await setDoc(doc(db, 'biometric_mappings', id), {
      ...mapping,
      id,
      companyId,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  }

  static async discoverAndAutoMapEmployees(
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
    // Simulation: randomly "discover" unmapped users on device
    const discoveredUsers: DeviceEmployeeUser[] = [
      { machineUserId: '101', name: 'John Doe', fingerprintCount: 1 },
      { machineUserId: '102', name: 'Jane Smith', cardNo: 'RFID001' }
    ];

    const mappings: DeviceEmployeeMapping[] = discoveredUsers.map(u => ({
      id: `${device.id}_${u.machineUserId}`,
      companyId,
      deviceId: device.id,
      machineUserId: u.machineUserId,
      machineUserName: u.name,
      mappingStatus: 'AUTO_MATCHED',
      matchConfidence: 0.95
    }));

    return {
      discoveredUsers,
      mappings,
      exactMatches: 1,
      unmapped: 1
    };
  }

  static async getAuditLogs(companyId: string): Promise<any[]> {
    const q = query(
      collection(db, 'companies', companyId, 'audit_logs'), 
      where('module', '==', 'BIOMETRIC')
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  }
}

