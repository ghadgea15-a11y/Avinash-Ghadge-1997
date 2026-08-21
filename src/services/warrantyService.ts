import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  writeBatch,
  runTransaction
} from 'firebase/firestore';
import { db } from '../firebase';
import { 
  WarrantyRecord, 
  WarrantyClaimRecord, 
  AssetRecord,
  WarrantyStatus,
  WarrantyClaimStatus,
  WorkOrderRecord,
  IncidentReportRecord
} from '../types';
import { FirestoreService } from './firestoreService';

export class WarrantyService {
  /**
   * Determine warranty status dynamically based on current date.
   */
  static calculateWarrantyStatus(
    startDate: string, 
    endDate: string, 
    currentStatus: WarrantyStatus,
    expiringThresholdDays: number = 30
  ): WarrantyStatus {
    if (currentStatus === 'CANCELLED' || currentStatus === 'CLAIM_IN_PROGRESS' || currentStatus === 'CLAIM_RESOLVED') {
      return currentStatus;
    }

    const now = new Date();
    const end = new Date(endDate);
    const start = new Date(startDate);
    
    // Calculate days difference
    const diffTime = end.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (now < start) {
      return 'ACTIVE'; // Or PENDING if we had that, but let's say ACTIVE
    }

    if (diffDays < 0) {
      return 'EXPIRED';
    } else if (diffDays <= expiringThresholdDays) {
      return 'EXPIRING_SOON';
    } else {
      return 'ACTIVE';
    }
  }

  static async getWarranties(companyId: string, assetId?: string): Promise<WarrantyRecord[]> {
    try {
      const colRef = collection(db, 'companies', companyId, 'warranties');
      let q = query(colRef, orderBy('endDate', 'desc'));
      if (assetId) {
        q = query(colRef, where('assetId', '==', assetId), orderBy('endDate', 'desc'));
      }
      const snap = await getDocs(q);
      return snap.docs.map(d => d.data() as WarrantyRecord);
    } catch (err) {
      console.error('[WarrantyService] getWarranties error:', err);
      return [];
    }
  }

  static async getWarrantyClaims(companyId: string, warrantyId?: string): Promise<WarrantyClaimRecord[]> {
    try {
      const colRef = collection(db, 'companies', companyId, 'warranty_claims');
      let q = query(colRef, orderBy('createdAt', 'desc'));
      if (warrantyId) {
        q = query(colRef, where('warrantyId', '==', warrantyId), orderBy('createdAt', 'desc'));
      }
      const snap = await getDocs(q);
      return snap.docs.map(d => d.data() as WarrantyClaimRecord);
    } catch (err) {
      console.error('[WarrantyService] getWarrantyClaims error:', err);
      return [];
    }
  }

  /**
   * Create or Update Warranty Record
   */
  static async saveWarranty(companyId: string, warranty: WarrantyRecord, actor: { id: string, name: string }): Promise<boolean> {
    try {
      // 1. Validation
      if (!warranty.assetId || !warranty.startDate || !warranty.endDate || !warranty.warrantyNumber) {
        throw new Error('Asset, Start Date, End Date, and Warranty Number are required.');
      }
      
      const sDate = new Date(warranty.startDate);
      const eDate = new Date(warranty.endDate);
      if (eDate < sDate) {
        throw new Error('End date cannot precede start date.');
      }

      const assetRef = doc(db, 'companies', companyId, 'assets', warranty.assetId);
      const assetSnap = await getDoc(assetRef);
      if (!assetSnap.exists()) {
        throw new Error('Asset does not exist in this company.');
      }

      // Check Uniqueness of Warranty Number
      const q = query(collection(db, 'companies', companyId, 'warranties'), where('warrantyNumber', '==', warranty.warrantyNumber));
      const existSnap = await getDocs(q);
      if (!existSnap.empty && existSnap.docs.some(d => d.id !== warranty.id)) {
        throw new Error('Warranty number already exists.');
      }

      // Determine correct status based on dates
      warranty.status = this.calculateWarrantyStatus(warranty.startDate, warranty.endDate, warranty.status);

      const isNew = !warranty.createdAt;
      const now = new Date().toISOString();
      const updatedWarranty: WarrantyRecord = {
        ...warranty,
        companyId,
        createdAt: warranty.createdAt || now,
        updatedAt: now,
        createdBy: warranty.createdBy || actor.id,
        updatedBy: actor.id
      };

      const docRef = doc(db, 'companies', companyId, 'warranties', warranty.id);
      await setDoc(docRef, updatedWarranty, { merge: true });

      // Audit
      await FirestoreService.logAuditEvent(
        companyId,
        actor.id,
        actor.name,
        isNew ? 'WARRANTY_CREATED' : 'WARRANTY_UPDATED',
        `${isNew ? 'Created' : 'Updated'} warranty ${warranty.warrantyNumber} for asset ${warranty.assetId}`
      );

      return true;
    } catch (err) {
      console.error('[WarrantyService] saveWarranty error:', err);
      throw err; // Re-throw to show error in UI
    }
  }

  /**
   * Update Warranty Statuses (Expiry Engine)
   * This would typically be run by a Cloud Function daily.
   */
  static async processWarrantyExpiries(companyId: string): Promise<void> {
    try {
      const colRef = collection(db, 'companies', companyId, 'warranties');
      // Look for active and expiring soon warranties to update
      const q = query(colRef, where('status', 'in', ['ACTIVE', 'EXPIRING_SOON']));
      const snap = await getDocs(q);

      const batch = writeBatch(db);
      let count = 0;

      for (const docSnap of snap.docs) {
        const warranty = docSnap.data() as WarrantyRecord;
        const newStatus = this.calculateWarrantyStatus(warranty.startDate, warranty.endDate, warranty.status);
        
        if (newStatus !== warranty.status) {
          batch.update(docSnap.ref, { 
            status: newStatus,
            updatedAt: new Date().toISOString()
          });

          // If expired or expiring soon, send notification
          if (newStatus === 'EXPIRING_SOON' || newStatus === 'EXPIRED') {
            await FirestoreService.createNotification(companyId, {
              id: `NOTIF_WARR_${newStatus}_${warranty.id}_${Date.now()}`,
              title: `Warranty ${newStatus === 'EXPIRED' ? 'Expired' : 'Expiring Soon'}`,
              message: `Warranty ${warranty.warrantyNumber} for asset ${warranty.assetId} is ${newStatus.replace('_', ' ').toLowerCase()}.`,
              type: newStatus === 'EXPIRED' ? 'WARNING' : 'INFO',
              isRead: false,
              timestamp: new Date().toISOString()
            });

            // Audit
            await FirestoreService.logAuditEvent(
              companyId,
              'SYSTEM',
              'Expiry Engine',
              newStatus === 'EXPIRED' ? 'WARRANTY_EXPIRED' : 'WARRANTY_EXPIRING',
              `Warranty ${warranty.warrantyNumber} status updated to ${newStatus}`
            );
          }
          count++;
        }
      }

      if (count > 0) {
        await batch.commit();
      }
    } catch (err) {
      console.error('[WarrantyService] processWarrantyExpiries error:', err);
    }
  }

  /**
   * Create a new Warranty Claim
   */
  static async createClaim(companyId: string, claim: WarrantyClaimRecord, actor: { id: string, name: string }): Promise<boolean> {
    try {
      const isNew = !claim.createdAt;
      const now = new Date().toISOString();

      const updatedClaim: WarrantyClaimRecord = {
        ...claim,
        companyId,
        createdAt: claim.createdAt || now,
        updatedAt: now,
        reportedBy: claim.reportedBy || actor.id,
        reportedByName: claim.reportedByName || actor.name,
      };

      await runTransaction(db, async (transaction) => {
        // Verify Warranty is eligible
        const warrantyRef = doc(db, 'companies', companyId, 'warranties', claim.warrantyId);
        const warrantySnap = await transaction.get(warrantyRef);
        if (!warrantySnap.exists()) {
          throw new Error('Warranty does not exist.');
        }
        
        const warrantyData = warrantySnap.data() as WarrantyRecord;
        if (!warrantyData.claimEligibility) {
          throw new Error('Warranty is not eligible for claims.');
        }

        const claimRef = doc(db, 'companies', companyId, 'warranty_claims', claim.id);
        transaction.set(claimRef, updatedClaim);

        // Update Warranty Status
        transaction.update(warrantyRef, { 
          status: 'CLAIM_IN_PROGRESS',
          updatedAt: now
        });
      });

      // Audit & Notification outside transaction
      await FirestoreService.logAuditEvent(
        companyId,
        actor.id,
        actor.name,
        isNew ? 'WARRANTY_CLAIM_CREATED' : 'WARRANTY_CLAIM_UPDATED',
        `${isNew ? 'Created' : 'Updated'} warranty claim for warranty ${claim.warrantyId}`
      );

      await FirestoreService.createNotification(companyId, {
        id: `NOTIF_CLAIM_${claim.id}_${Date.now()}`,
        title: 'Warranty Claim Submitted',
        message: `Claim submitted for asset ${claim.assetId} under warranty ${claim.warrantyId}.`,
        type: 'INFO',
        isRead: false,
        timestamp: new Date().toISOString()
      });

      return true;
    } catch (err) {
      console.error('[WarrantyService] createClaim error:', err);
      throw err;
    }
  }

  /**
   * Update Claim Status, optionally generating Work Order
   */
  static async updateClaimStatus(
    companyId: string, 
    claimId: string, 
    newStatus: WarrantyClaimStatus, 
    actor: { id: string, name: string },
    resolutionNotes?: string
  ): Promise<boolean> {
    try {
      let createdWoId: string | null = null;
      const now = new Date().toISOString();

      await runTransaction(db, async (transaction) => {
        const claimRef = doc(db, 'companies', companyId, 'warranty_claims', claimId);
        const claimSnap = await transaction.get(claimRef);
        if (!claimSnap.exists()) throw new Error('Claim not found.');
        
        const claim = claimSnap.data() as WarrantyClaimRecord;
        const warrantyRef = doc(db, 'companies', companyId, 'warranties', claim.warrantyId);

        const updates: Partial<WarrantyClaimRecord> = {
          status: newStatus,
          updatedAt: now
        };

        if (newStatus === 'RESOLVED' || newStatus === 'CLOSED') {
          updates.resolvedAt = now;
          updates.resolvedBy = actor.id;
          if (resolutionNotes) updates.resolutionNotes = resolutionNotes;
          
          // Reset warranty status back to normal calculation
          const warrantySnap = await transaction.get(warrantyRef);
          if (warrantySnap.exists()) {
            const wData = warrantySnap.data() as WarrantyRecord;
            const recalcStatus = this.calculateWarrantyStatus(wData.startDate, wData.endDate, 'ACTIVE');
            transaction.update(warrantyRef, { status: recalcStatus, updatedAt: now });
          }
        }

        // If SERVICE_IN_PROGRESS, maybe create a Work Order? 
        if (newStatus === 'SERVICE_IN_PROGRESS' && !claim.workOrderId) {
          const assetRef = doc(db, 'companies', companyId, 'assets', claim.assetId);
          const assetSnap = await transaction.get(assetRef);
          const assetData = assetSnap.exists() ? (assetSnap.data() as AssetRecord) : null;

          const woId = `WO_WAR_${claimId}`;
          createdWoId = woId;
          const workOrder: WorkOrderRecord = {
            id: woId,
            companyId,
            siteId: assetData?.siteId || '',
            title: `Warranty Service: Asset ${claim.assetId}`,
            description: `Warranty claim service. Issue: ${claim.issueDescription}`,
            category: 'MAINTENANCE',
            priority: (claim.priority as any) || 'MEDIUM',
            status: 'DRAFT',
            locationRequirement: 'NONE',
            evidenceRequirement: true,
            approvalRequirement: true,
            createdAt: now,
            createdBy: actor.id,
            updatedBy: actor.id,
            updatedAt: now
          };
          
          const woRef = doc(db, 'companies', companyId, 'work_orders', woId);
          transaction.set(woRef, workOrder);
          updates.workOrderId = woId;
        }

        transaction.update(claimRef, updates);
      });

      // Audit
      await FirestoreService.logAuditEvent(
        companyId,
        actor.id,
        actor.name,
        `WARRANTY_CLAIM_${newStatus}`,
        `Claim ${claimId} status updated to ${newStatus}`
      );

      // Notify
      await FirestoreService.createNotification(companyId, {
        id: `NOTIF_CLAIM_STATUS_${claimId}_${Date.now()}`,
        title: `Warranty Claim ${newStatus.replace('_', ' ')}`,
        message: `Claim ${claimId} status changed to ${newStatus}.`,
        type: newStatus === 'REJECTED' ? 'WARNING' : 'INFO',
        isRead: false,
        timestamp: new Date().toISOString()
      });

      return true;
    } catch (err) {
      console.error('[WarrantyService] updateClaimStatus error:', err);
      throw err;
    }
  }
}
