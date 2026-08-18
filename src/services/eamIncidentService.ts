import { collection, doc, getDoc, getDocs, query, where, orderBy, writeBatch, runTransaction } from 'firebase/firestore';
import { db } from '../firebase';
import { 
  AssetRecord, 
  IncidentReportRecord,
  UserSession,
  WorkOrderRecord
} from '../types';
import { FirestoreService } from './firestoreService';
import { StorageService } from './storageService';

export class EamIncidentService {
  /**
   * Report an asset as lost, damaged, missing, or stolen.
   * Atomically creates an Incident and updates the Asset state.
   */
  static async reportLossDamage(
    companyId: string,
    assetId: string,
    session: UserSession,
    reportData: {
      type: 'LOST' | 'DAMAGED' | 'MISSING' | 'STOLEN';
      severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
      damageSeverity?: 'MINOR' | 'MODERATE' | 'SEVERE' | 'TOTAL_LOSS';
      description: string;
      siteId: string;
      custodianId?: string;
      estimatedImpactAmount?: number;
      photoUrls?: string[];
      preGeneratedIncidentId?: string;
    }
  ): Promise<string> {
    try {
      const incidentId = reportData.preGeneratedIncidentId || `INC-EAM-${Date.now()}`;
      const now = new Date().toISOString();

      await runTransaction(db, async (transaction) => {
        const assetRef = doc(db, 'companies', companyId, 'assets', assetId);
        const assetSnap = await transaction.get(assetRef);
        
        if (!assetSnap.exists()) {
          throw new Error('Asset does not exist.');
        }

        const asset = assetSnap.data() as AssetRecord;

        // Determine new asset status
        const newAssetStatus = (reportData.type === 'LOST' || reportData.type === 'MISSING' || reportData.type === 'STOLEN') 
          ? 'LOST' 
          : 'DAMAGED';

        // Update Asset
        transaction.update(assetRef, {
          status: newAssetStatus,
          updatedAt: now,
          updatedBy: session.userId
        });

        // Create Incident
        const incidentRef = doc(db, 'companies', companyId, 'incident_reports', incidentId);
        const incidentData: IncidentReportRecord = {
          id: incidentId,
          companyId,
          siteId: reportData.siteId,
          reportedById: session.userId,
          reportedByName: session.fullName,
          reportedAt: now,
          title: `Asset ${reportData.type}: ${asset.assetName} (${asset.assetCode})`,
          category: reportData.type === 'DAMAGED' ? 'PROPERTY_DAMAGE' : (reportData.type === 'STOLEN' ? 'THEFT' : 'ASSET_LOSS'),
          severity: reportData.severity,
          description: reportData.description,
          status: 'REPORTED',
          
          // EAM fields
          assetId: assetId,
          custodianId: reportData.custodianId || asset.currentCustodianId,
          lossDamageType: reportData.type,
          damageSeverity: reportData.damageSeverity,
          estimatedImpactAmount: reportData.estimatedImpactAmount,
          recoveryStatus: (reportData.type === 'LOST' || reportData.type === 'MISSING' || reportData.type === 'STOLEN') ? 'NOT_RECOVERED' : undefined,
          
          photoUrls: reportData.photoUrls || [],
          timeline: [{
            timestamp: now,
            action: 'REPORTED',
            notes: `Reported by ${session.fullName}`,
            actorId: session.userId,
            actorName: session.fullName
          }],
          createdAt: now,
          updatedAt: now
        };

        transaction.set(incidentRef, incidentData);
      });

      // Audit and Notifications
      await FirestoreService.logAuditEvent(
        companyId,
        session.userId,
        session.fullName,
        `asset.${reportData.type.toLowerCase()}_reported`,
        `Asset ${assetId} reported as ${reportData.type}`
      );

      await FirestoreService.createNotification({
        id: `NOTIF_EAM_INC_${incidentId}_${Date.now()}`,
        title: `Asset ${reportData.type}`,
        message: `Asset ${assetId} has been reported as ${reportData.type}.`,
        type: 'WARNING',
        isRead: false,
        timestamp: new Date().toISOString()
      });

      return incidentId;
    } catch (err) {
      console.error('[EamIncidentService] reportLossDamage error:', err);
      throw err;
    }
  }

  /**
   * Load incidents related to an asset.
   */
  static async getAssetIncidents(companyId: string, assetId: string): Promise<IncidentReportRecord[]> {
    try {
      const q = query(
        collection(db, 'companies', companyId, 'incident_reports'),
        where('assetId', '==', assetId),
        orderBy('createdAt', 'desc')
      );
      const snap = await getDocs(q);
      return snap.docs.map(d => d.data() as IncidentReportRecord);
    } catch (err) {
      console.error('[EamIncidentService] getAssetIncidents error:', err);
      return [];
    }
  }

  /**
   * Update investigation findings and optionally resolve.
   */
  static async updateInvestigation(
    companyId: string,
    incidentId: string,
    session: UserSession,
    updateData: {
      findings?: string;
      immediateAction?: string;
      correctiveAction?: string;
      status?: IncidentReportRecord['status'];
      eamResolution?: IncidentReportRecord['eamResolution'];
      closeIncident?: boolean;
    }
  ): Promise<void> {
    const now = new Date().toISOString();
    
    await runTransaction(db, async (transaction) => {
      const incidentRef = doc(db, 'companies', companyId, 'incident_reports', incidentId);
      const incidentSnap = await transaction.get(incidentRef);
      if (!incidentSnap.exists()) throw new Error('Incident not found.');

      const incident = incidentSnap.data() as IncidentReportRecord;

      if (updateData.closeIncident && !updateData.eamResolution && !incident.eamResolution) {
        throw new Error('EAM Incident cannot be closed without a resolution state (e.g. RECOVERED, REPAIRED, REPLACED, WRITTEN_OFF).');
      }

      const updates: Partial<IncidentReportRecord> = {
        updatedAt: now
      };

      if (updateData.findings) updates.rootCause = updateData.findings; // using rootCause for findings
      if (updateData.immediateAction) updates.immediateAction = updateData.immediateAction;
      if (updateData.correctiveAction) updates.correctiveAction = updateData.correctiveAction;
      if (updateData.eamResolution) updates.eamResolution = updateData.eamResolution;
      
      if (updateData.status) updates.status = updateData.status;

      if (updateData.closeIncident) {
        updates.status = 'CLOSED';
        updates.closedAt = now;
        updates.closedById = session.userId;
        updates.closedByName = session.fullName;
      }

      // Add to timeline
      const newTimeline = [...(incident.timeline || [])];
      newTimeline.push({
        timestamp: now,
        action: updates.status || incident.status || 'UPDATED',
        notes: updateData.closeIncident ? 'Incident closed' : 'Investigation updated',
        actorId: session.userId,
        actorName: session.fullName
      });
      updates.timeline = newTimeline;

      transaction.update(incidentRef, updates);
    });

    await FirestoreService.logAuditEvent(
      companyId,
      session.userId,
      session.fullName,
      updateData.closeIncident ? 'asset.incident_closed' : 'asset.investigation_updated',
      `Investigation updated for incident ${incidentId}`
    );
  }

  /**
   * Report asset recovery (moves to RECOVERY_REPORTED status)
   */
  static async reportRecovery(
    companyId: string,
    incidentId: string,
    assetId: string,
    session: UserSession,
    recoveryData: {
      location: string;
      conditionNotes: string;
      photoUrls?: string[];
    }
  ): Promise<void> {
    const now = new Date().toISOString();

    await runTransaction(db, async (transaction) => {
      const incidentRef = doc(db, 'companies', companyId, 'incident_reports', incidentId);
      const incidentSnap = await transaction.get(incidentRef);
      if (!incidentSnap.exists()) throw new Error('Incident not found.');

      const incident = incidentSnap.data() as IncidentReportRecord;
      if (incident.recoveryStatus === 'RECOVERY_VERIFIED') {
        throw new Error('Asset recovery is already verified.');
      }

      const newTimeline = [...(incident.timeline || [])];
      newTimeline.push({
        timestamp: now,
        action: incident.status || 'RECOVERY_REPORTED',
        notes: `Recovery reported at ${recoveryData.location}. Notes: ${recoveryData.conditionNotes}`,
        actorId: session.userId,
        actorName: session.fullName
      });

      const existingPhotos = incident.photoUrls || [];

      transaction.update(incidentRef, {
        recoveryStatus: 'RECOVERY_REPORTED',
        recoveredAt: now,
        recoveredBy: session.userId,
        timeline: newTimeline,
        photoUrls: [...existingPhotos, ...(recoveryData.photoUrls || [])],
        updatedAt: now
      });
    });

    await FirestoreService.logAuditEvent(companyId, session.userId, session.fullName, 'asset.recovery_reported', `Recovery reported for asset ${assetId}`);
    
    await FirestoreService.createNotification({
      id: `NOTIF_REC_${incidentId}_${Date.now()}`,
      title: 'Asset Recovery Reported',
      message: `Asset ${assetId} recovery has been reported. Verification pending.`,
      type: 'INFO',
      isRead: false,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Verify recovery and reinstate asset conditionally.
   */
  static async verifyRecovery(
    companyId: string,
    incidentId: string,
    assetId: string,
    session: UserSession,
    assetCondition: 'GOOD' | 'FAIR' | 'POOR' | 'DAMAGED'
  ): Promise<void> {
    const now = new Date().toISOString();

    await runTransaction(db, async (transaction) => {
      const incidentRef = doc(db, 'companies', companyId, 'incident_reports', incidentId);
      const assetRef = doc(db, 'companies', companyId, 'assets', assetId);

      const incidentSnap = await transaction.get(incidentRef);
      if (!incidentSnap.exists()) throw new Error('Incident not found.');

      // Update Incident
      transaction.update(incidentRef, {
        recoveryStatus: 'RECOVERY_VERIFIED',
        eamResolution: 'RECOVERED',
        updatedAt: now
      });

      // Update Asset
      transaction.update(assetRef, {
        status: assetCondition === 'DAMAGED' ? 'DAMAGED' : 'AVAILABLE',
        condition: assetCondition,
        updatedAt: now,
        updatedBy: session.userId
      });
    });

    await FirestoreService.logAuditEvent(companyId, session.userId, session.fullName, 'asset.recovery_verified', `Recovery verified for asset ${assetId}`);
  }

  /**
   * Marks that a replacement is required and flags the asset as retired or permanently lost.
   */
  static async markReplacementRequired(
    companyId: string,
    incidentId: string,
    assetId: string,
    session: UserSession
  ): Promise<void> {
    const now = new Date().toISOString();

    await runTransaction(db, async (transaction) => {
      const incidentRef = doc(db, 'companies', companyId, 'incident_reports', incidentId);
      const assetRef = doc(db, 'companies', companyId, 'assets', assetId);

      // Update Incident
      transaction.update(incidentRef, {
        eamResolution: 'REPLACED',
        updatedAt: now
      });

      // Retire the Asset
      transaction.update(assetRef, {
        status: 'RETIRED',
        updatedAt: now,
        updatedBy: session.userId
      });
    });

    await FirestoreService.logAuditEvent(companyId, session.userId, session.fullName, 'asset.replacement_required', `Replacement required for asset ${assetId}`);
  }

  /**
   * Automatically generate a Work Order for repairing a damaged asset from an incident.
   */
  static async createRepairWorkOrder(
    companyId: string,
    incidentId: string,
    assetId: string,
    siteId: string,
    description: string,
    session: UserSession
  ): Promise<string> {
    const now = new Date().toISOString();
    const woId = `WO-REP-${Date.now()}`;

    await runTransaction(db, async (transaction) => {
      const incidentRef = doc(db, 'companies', companyId, 'incident_reports', incidentId);
      
      const workOrder: WorkOrderRecord = {
        id: woId,
        companyId,
        siteId,
        title: `Asset Repair from Incident ${incidentId}`,
        description,
        category: 'MAINTENANCE',
        priority: 'HIGH',
        status: 'DRAFT',
        locationRequirement: 'NONE',
        evidenceRequirement: true,
        approvalRequirement: true,
        createdAt: now,
        createdBy: session.userId,
        updatedBy: session.userId,
        updatedAt: now
      };

      const woRef = doc(db, 'companies', companyId, 'work_orders', woId);
      transaction.set(woRef, workOrder);

      // Link Work Order to Incident
      transaction.update(incidentRef, {
        relatedWorkOrderId: woId,
        updatedAt: now
      });
    });

    await FirestoreService.logAuditEvent(companyId, session.userId, session.fullName, 'asset.repair_requested', `Repair Work Order ${woId} created for asset ${assetId}`);
    return woId;
  }
}
