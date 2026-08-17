import { db, storage } from '../firebase';
import { 
  collection, doc, setDoc, updateDoc, getDoc, getDocs, 
  query, where, orderBy, onSnapshot, writeBatch, serverTimestamp
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { 
  AssetRecord, AssetCondition, AssetMovementHistoryRecord, 
  AssetStatus, IncidentReportRecord, TaskRecord 
} from '../types';
import { EamAssetCustodyRecord, EamAssetTransferRecord, EamTransferStatus } from '../types/eam';

export class EamService {
  /**
   * Generates a custody movement record
   */
  private static createCustodyRecord(
    companyId: string,
    assetId: string,
    action: EamAssetCustodyRecord['action'],
    params: Partial<EamAssetCustodyRecord>
  ): EamAssetCustodyRecord {
    return {
      id: `CUST-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      assetId,
      companyId,
      toCustodianId: params.toCustodianId || '',
      action,
      assignedBy: params.assignedBy || 'SYSTEM',
      assignedAt: new Date().toISOString(),
      acknowledgementStatus: 'PENDING',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...params
    };
  }

  /**
   * Deploy asset to a custodian (Employee, Site, or Department)
   */
  static async deployAsset(
    companyId: string, 
    asset: AssetRecord, 
    assigneeId: string, 
    assigneeName: string, 
    siteId: string,
    assignedBy: string,
    assignedByName: string,
    condition: AssetCondition,
    expectedReturnDate?: string
  ): Promise<boolean> {
    try {
      const batch = writeBatch(db);
      const assetRef = doc(db, 'companies', companyId, 'assets', asset.id);
      
      const now = new Date().toISOString();
      const newStatus: AssetStatus = 'DEPLOYED';

      // 1. Update Asset Master
      batch.update(assetRef, {
        currentStatus: newStatus,
        status: newStatus,
        currentCustodianId: assigneeId,
        currentLocationId: siteId,
        siteId: siteId,
        assignedEmployeeId: assigneeId,
        assignedEmployeeName: assigneeName,
        condition: condition,
        expectedReturnDate: expectedReturnDate || '',
        updatedAt: now
      });

      // 2. Create EAM Custody Record
      const custodyRecord = this.createCustodyRecord(companyId, asset.id, 'DEPLOYMENT', {
        toCustodianId: assigneeId,
        toLocationId: siteId,
        assignedBy: assignedBy,
        expectedReturnDate,
        acknowledgementStatus: 'PENDING'
      });
      const custodyRef = doc(db, 'companies', companyId, 'asset_custody', custodyRecord.id);
      batch.set(custodyRef, custodyRecord);

      // 3. Create Movement Ledger (for legacy compatibility and audit)
      const moveRef = doc(db, 'companies', companyId, 'asset_movements', `MOV-${Date.now()}`);
      batch.set(moveRef, {
        id: moveRef.id,
        companyId,
        assetId: asset.id,
        assetCode: asset.assetCode,
        assetName: asset.assetName,
        action: 'DEPLOYMENT',
        employeeId: assigneeId,
        employeeName: assigneeName,
        siteId: siteId,
        conditionAtAction: condition,
        performedByUid: assignedBy,
        performedByName: assignedByName,
        timestamp: now
      });

      await batch.commit();
      return true;
    } catch (e) {
      console.error('Error deploying asset:', e);
      return false;
    }
  }

  /**
   * Acknowledge (Accept/Reject) Custody
   */
  static async acknowledgeCustody(
    companyId: string,
    assetId: string,
    custodyRecordId: string,
    custodianId: string,
    isAccepted: boolean,
    condition: AssetCondition,
    note?: string
  ): Promise<boolean> {
    try {
      const batch = writeBatch(db);
      
      const custodyRef = doc(db, 'companies', companyId, 'asset_custody', custodyRecordId);
      const assetRef = doc(db, 'companies', companyId, 'assets', assetId);
      
      const now = new Date().toISOString();
      
      batch.update(custodyRef, {
        acknowledgementStatus: isAccepted ? 'ACCEPTED' : 'REJECTED',
        acknowledgementTimestamp: now,
        conditionAtAcknowledgement: condition,
        acknowledgementNote: note || '',
        updatedAt: now
      });

      if (isAccepted) {
        batch.update(assetRef, {
          condition,
          currentStatus: 'IN_CUSTODY',
          status: 'IN_CUSTODY',
          updatedAt: now
        });
      } else {
        // If rejected, it might go back to available or requires review
        batch.update(assetRef, {
          currentStatus: 'AVAILABLE',
          status: 'AVAILABLE',
          currentCustodianId: '',
          assignedEmployeeId: '',
          assignedEmployeeName: '',
          updatedAt: now
        });
      }

      await batch.commit();
      return true;
    } catch (e) {
      console.error('Error acknowledging custody:', e);
      return false;
    }
  }

  /**
   * Request Asset Transfer
   */
  static async requestTransfer(
    companyId: string,
    asset: AssetRecord,
    fromSiteId: string,
    toSiteId: string,
    fromCustodianId: string,
    toCustodianId: string,
    requestedBy: string,
    reason?: string
  ): Promise<boolean> {
    try {
      const transferId = `TRF-${Date.now()}`;
      const trfRef = doc(db, 'companies', companyId, 'asset_transfers', transferId);
      
      const now = new Date().toISOString();
      const transferData: EamAssetTransferRecord = {
        id: transferId,
        assetId: asset.id,
        companyId,
        fromLocationId: fromSiteId,
        toLocationId: toSiteId,
        fromCustodianId,
        toCustodianId,
        requestedBy,
        requestedAt: now,
        reason,
        status: 'TRANSFER_REQUESTED',
        createdAt: now,
        updatedAt: now
      };

      await setDoc(trfRef, transferData);
      
      // Update Asset to RESERVED / PENDING TRANSFER
      const assetRef = doc(db, 'companies', companyId, 'assets', asset.id);
      await updateDoc(assetRef, {
        currentStatus: 'RESERVED',
        status: 'RESERVED',
        updatedAt: now
      });

      return true;
    } catch (e) {
      console.error('Error requesting transfer:', e);
      return false;
    }
  }

  /**
   * Receive Transferred Asset
   */
  static async receiveAsset(
    companyId: string,
    transfer: EamAssetTransferRecord,
    asset: AssetRecord,
    receivedBy: string,
    receivedByName: string,
    condition: AssetCondition,
    remarks?: string
  ): Promise<boolean> {
    try {
      const batch = writeBatch(db);
      const now = new Date().toISOString();
      
      const trfRef = doc(db, 'companies', companyId, 'asset_transfers', transfer.id);
      batch.update(trfRef, {
        status: 'COMPLETED',
        receivedBy,
        receivedAt: now,
        conditionAtReceipt: condition,
        receiptRemarks: remarks,
        updatedAt: now
      });

      const assetRef = doc(db, 'companies', companyId, 'assets', asset.id);
      batch.update(assetRef, {
        currentStatus: 'IN_CUSTODY',
        status: 'IN_CUSTODY',
        currentCustodianId: transfer.toCustodianId,
        currentLocationId: transfer.toLocationId,
        siteId: transfer.toLocationId,
        condition: condition,
        updatedAt: now
      });

      const moveRef = doc(db, 'companies', companyId, 'asset_movements', `MOV-${Date.now()}`);
      batch.set(moveRef, {
        id: moveRef.id,
        companyId,
        assetId: asset.id,
        assetCode: asset.assetCode,
        assetName: asset.assetName,
        action: 'SITE_TRANSFER',
        siteId: transfer.toLocationId,
        conditionAtAction: condition,
        performedByUid: receivedBy,
        performedByName: receivedByName,
        remarks,
        timestamp: now
      });

      await batch.commit();
      return true;
    } catch (e) {
      console.error('Error receiving asset:', e);
      return false;
    }
  }

  /**
   * Return Asset to Storage/Available
   */
  static async returnAsset(
    companyId: string,
    asset: AssetRecord,
    returnedBy: string,
    returnedByName: string,
    condition: AssetCondition,
    siteId: string,
    remarks?: string
  ): Promise<boolean> {
    try {
      const batch = writeBatch(db);
      const now = new Date().toISOString();

      const newStatus: AssetStatus = (condition === 'DAMAGED' || condition === 'UNUSABLE' || condition === 'CRITICAL') 
        ? 'UNDER_MAINTENANCE' 
        : 'AVAILABLE';

      const assetRef = doc(db, 'companies', companyId, 'assets', asset.id);
      batch.update(assetRef, {
        currentStatus: newStatus,
        status: newStatus,
        currentCustodianId: '',
        assignedEmployeeId: '',
        assignedEmployeeName: '',
        condition: condition,
        currentLocationId: siteId,
        siteId: siteId,
        updatedAt: now
      });

      const moveRef = doc(db, 'companies', companyId, 'asset_movements', `MOV-${Date.now()}`);
      batch.set(moveRef, {
        id: moveRef.id,
        companyId,
        assetId: asset.id,
        assetCode: asset.assetCode,
        assetName: asset.assetName,
        action: 'RETURN',
        siteId: siteId,
        conditionAtAction: condition,
        performedByUid: returnedBy,
        performedByName: returnedByName,
        remarks,
        timestamp: now
      });

      await batch.commit();
      return true;
    } catch (e) {
      console.error('Error returning asset:', e);
      return false;
    }
  }

  /**
   * Report Asset Lost or Damaged
   */
  static async reportException(
    companyId: string,
    asset: AssetRecord,
    type: 'LOST' | 'DAMAGED',
    reportedBy: string,
    reportedByName: string,
    siteId: string,
    description: string,
    evidenceFiles?: File[]
  ): Promise<boolean> {
    try {
      // Create Incident
      const incidentId = `INC-${Date.now()}`;
      const now = new Date().toISOString();
      const incident: IncidentReportRecord = {
        id: incidentId,
        companyId,
        siteId,
        reportedById: reportedBy,
        reportedByName,
        reportedAt: now,
        title: `Asset ${type}: ${asset.assetName} (${asset.assetCode})`,
        category: 'THEFT',
        severity: type === 'LOST' ? 'HIGH' : 'MEDIUM',
        description: `Asset ${asset.assetCode} reported ${type}. Details: ${description}`,
        status: 'OPEN',
        createdAt: now,
        updatedAt: now
      };

      const batch = writeBatch(db);
      
      const incRef = doc(db, 'companies', companyId, 'incidents', incidentId);
      batch.set(incRef, incident);

      const assetRef = doc(db, 'companies', companyId, 'assets', asset.id);
      batch.update(assetRef, {
        currentStatus: type,
        status: type,
        condition: type === 'DAMAGED' ? 'DAMAGED' : asset.condition,
        updatedAt: now
      });

      const moveRef = doc(db, 'companies', companyId, 'asset_movements', `MOV-${Date.now()}`);
      batch.set(moveRef, {
        id: moveRef.id,
        companyId,
        assetId: asset.id,
        assetCode: asset.assetCode,
        assetName: asset.assetName,
        action: type === 'LOST' ? 'LOSS_REPORT' : 'DAMAGE_REPORT',
        siteId,
        conditionAtAction: type === 'DAMAGED' ? 'DAMAGED' : asset.condition,
        performedByUid: reportedBy,
        performedByName: reportedByName,
        remarks: `Incident ${incidentId}: ${description}`,
        timestamp: now
      });

      await batch.commit();

      // We could also upload evidence files to Storage and link them
      return true;
    } catch (e) {
      console.error('Error reporting asset exception:', e);
      return false;
    }
  }

  static subscribeToTransfers(companyId: string, onData: (transfers: EamAssetTransferRecord[]) => void): () => void {
    const q = query(collection(db, 'companies', companyId, 'asset_transfers'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snap) => {
      onData(snap.docs.map(d => ({ ...d.data() } as EamAssetTransferRecord)));
    }, err => {
      console.error(err);
      onData([]);
    });
  }

  static subscribeToCustodyRecords(companyId: string, onData: (records: EamAssetCustodyRecord[]) => void): () => void {
    const q = query(collection(db, 'companies', companyId, 'asset_custody'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snap) => {
      onData(snap.docs.map(d => ({ ...d.data() } as EamAssetCustodyRecord)));
    }, err => {
      console.error(err);
      onData([]);
    });
  }
}
