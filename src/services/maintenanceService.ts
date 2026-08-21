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
  limit,
  updateDoc,
  runTransaction
} from 'firebase/firestore';
import { db } from '../firebase';
import { 
  MaintenancePlan, 
  MaintenanceOccurrence, 
  WorkOrderRecord, 
  AssetRecord,
  UserSession
} from '../types';
import { FirestoreService } from './firestoreService';

export class MaintenanceService {
  /**
   * Calculate the next due date based on frequency and unit.
   */
  static calculateNextDueDate(startDate: string, frequency: number, unit: MaintenancePlan['frequencyUnit']): string {
    const date = new Date(startDate);
    const f = frequency > 0 ? frequency : 1;

    switch (unit) {
      case 'DAILY':
        date.setDate(date.getDate() + f);
        break;
      case 'WEEKLY':
        date.setDate(date.getDate() + (f * 7));
        break;
      case 'MONTHLY':
        date.setMonth(date.getMonth() + f);
        break;
      case 'QUARTERLY':
        date.setMonth(date.getMonth() + (f * 3));
        break;
      case 'HALF_YEARLY':
        date.setMonth(date.getMonth() + (f * 6));
        break;
      case 'YEARLY':
        date.setFullYear(date.getFullYear() + f);
        break;
      case 'CUSTOM':
        date.setDate(date.getDate() + f); // Defaulting custom to days
        break;
      default:
        date.setMonth(date.getMonth() + 1);
    }
    return date.toISOString();
  }

  /**
   * Create or Update a Maintenance Plan
   */
  static async saveMaintenancePlan(companyId: string, plan: MaintenancePlan, actor: { id: string, name: string }): Promise<boolean> {
    try {
      // 1. Validation
      if (!plan.assetId || !plan.siteId || !plan.frequency) {
        throw new Error('Asset, Site, and Frequency are required for a maintenance plan.');
      }

      // 2. Ownership Verification
      const assetRef = doc(db, 'companies', companyId, 'assets', plan.assetId);
      const assetSnap = await getDoc(assetRef);
      if (!assetSnap.exists()) {
        throw new Error('Asset does not belong to the company or does not exist.');
      }
      const assetData = assetSnap.data() as AssetRecord;
      if (['LOST', 'SCRAPPED', 'SOLD'].includes(assetData.status || '')) {
        throw new Error(`Cannot create maintenance plan for asset in ${assetData.status} state.`);
      }

      if (assetData.siteId !== plan.siteId) {
        // Warning or error? Enterprise standards usually require asset to be at the site.
        console.warn(`[MaintenanceService] Asset ${plan.assetId} is registered at site ${assetData.siteId}, but plan is for site ${plan.siteId}`);
      }

      const now = new Date().toISOString();
      const planId = plan.maintenancePlanId || plan.id || `PLAN-${Date.now()}`;
      const planRef = doc(db, 'companies', companyId, 'maintenance_plans', planId);
      
      const isNew = !plan.createdAt;
      const updatedPlan: MaintenancePlan = {
        ...plan,
        id: planId,
        maintenancePlanId: planId,
        companyId,
        createdAt: plan.createdAt || now,
        updatedAt: now
      };

      await setDoc(planRef, updatedPlan, { merge: true });

      // 3. Audit
      await FirestoreService.logAuditEvent(
        companyId,
        actor.id,
        actor.name,
        isNew ? 'MAINTENANCE_PLAN_CREATED' : 'MAINTENANCE_PLAN_UPDATED',
        `${isNew ? 'Created' : 'Updated'} maintenance plan for asset ${assetData.assetName} (${assetData.assetCode})`
      );

      // 4. Initial Occurrence Generation (if active)
      if (updatedPlan.status === 'ACTIVE') {
        await this.generateUpcomingOccurrences(companyId, updatedPlan);
      }

      return true;
    } catch (err) {
      console.error('[MaintenanceService] saveMaintenancePlan error:', err);
      return false;
    }
  }

  /**
   * Generate occurrences for a plan. Idempotent.
   */
  static async generateUpcomingOccurrences(companyId: string, plan: MaintenancePlan, monthsAhead: number = 12): Promise<void> {
    const batch = writeBatch(db);
    const horizon = new Date();
    horizon.setMonth(horizon.getMonth() + monthsAhead);

    let currentDueDate = plan.startDate || plan.nextDueDate || new Date().toISOString();
    const occurrencesCol = collection(db, 'companies', companyId, 'maintenance_occurrences');

    // To prevent infinite loops if frequency is 0 (validated in save)
    let safetyCounter = 0;
    const planId = plan.maintenancePlanId || plan.id || 'PLAN';
    while (new Date(currentDueDate) <= horizon && safetyCounter < 100) {
      // Create a stable deterministic ID for idempotency: planId_YYYY-MM-DD
      const datePart = currentDueDate.split('T')[0];
      const occurrenceId = `OCC_${planId}_${datePart}`;
      
      const occRef = doc(occurrencesCol, occurrenceId);
      
      // We only set if it doesn't exist to preserve any manual changes or WO links
      // But for simplicity in this logic, we use setDoc with merge: true for the core fields
      const occurrence: MaintenanceOccurrence = {
        id: occurrenceId,
        maintenanceOccurrenceId: occurrenceId,
        planId: planId,
        maintenancePlanId: planId,
        companyId,
        assetId: plan.assetId,
        dueDate: currentDueDate,
        status: 'UPCOMING',
        createdAt: new Date().toISOString()
      };

      // Check if it's already due or overdue based on current date
      const now = new Date();
      const due = new Date(currentDueDate);
      if (due < now) {
        occurrence.status = 'OVERDUE';
      } else if (due.getTime() - now.getTime() < 7 * 24 * 60 * 60 * 1000) {
        occurrence.status = 'DUE';
      }

      batch.set(occRef, occurrence, { merge: true });

      // Move to next
      currentDueDate = this.calculateNextDueDate(currentDueDate, plan.frequency, plan.frequencyUnit);
      safetyCounter++;
    }

    await batch.commit();
  }

  /**
   * Detect and create Work Orders for Due/Overdue occurrences.
   * This should be called by a scheduler or when an admin opens the maintenance dashboard.
   */
  static async processDueOccurrences(companyId: string, actor: { id: string, name: string }): Promise<number> {
    try {
      const occCol = collection(db, 'companies', companyId, 'maintenance_occurrences');
      const q = query(
        occCol, 
        where('status', 'in', ['DUE', 'OVERDUE']),
        where('workOrderId', '==', null) // Only those without a WO yet
      );

      const snap = await getDocs(q);
      let count = 0;

      for (const occDoc of snap.docs) {
        await runTransaction(db, async (transaction) => {
          const freshOccSnap = await transaction.get(occDoc.ref);
          if (!freshOccSnap.exists()) return;
          const occ = freshOccSnap.data() as MaintenanceOccurrence;
          
          if (occ.workOrderId) return; // Already has a WO

          const targetPlanId = occ.maintenancePlanId || occ.planId || '';
          const planSnap = await transaction.get(doc(db, 'companies', companyId, 'maintenance_plans', targetPlanId));
          if (!planSnap.exists()) return;
          const plan = planSnap.data() as MaintenancePlan;

          const occId = occ.maintenanceOccurrenceId || occ.id || 'OCC';
          const woId = `WO_MNT_${occId}`;
          const workOrder: WorkOrderRecord = {
            id: woId,
            companyId,
            siteId: plan.siteId,
            title: `Maintenance: ${plan.maintenanceType || 'Routine'} - Asset ${occ.assetId}`,
            description: `Scheduled maintenance based on plan ${plan.maintenancePlanId || plan.id}. Frequency: ${plan.frequency} ${plan.frequencyUnit || 'MONTHLY'}.`,
            category: 'MAINTENANCE',
            priority: (plan.priority as any) || 'MEDIUM',
            status: 'SUBMITTED',
            assignedTo: plan.assignedTo || plan.assignedToUid || '',
            dueAt: occ.dueDate,
            createdAt: new Date().toISOString(),
            createdBy: actor.id,
            updatedBy: actor.id,
            updatedAt: new Date().toISOString(),
            locationRequirement: 'GEOFENCE_REQUIRED',
            evidenceRequirement: true,
            approvalRequirement: true,
            checklist: [
              { id: '1', text: 'Inspect for physical damage', isRequired: true, isCompleted: false },
              { id: '2', text: 'Perform functional test', isRequired: true, isCompleted: false },
              { id: '3', text: 'Clean and lubricate (if applicable)', isRequired: false, isCompleted: false },
              { id: '4', text: 'Verify calibration (if applicable)', isRequired: false, isCompleted: false }
            ]
          };

          transaction.update(occDoc.ref, { 
            workOrderId: woId,
            status: 'PENDING',
            updatedAt: new Date().toISOString()
          });

          const woRef = doc(db, 'companies', companyId, 'work_orders', woId);
          transaction.set(woRef, workOrder);
        });

        // Notifications outside transaction to avoid repeats if transaction retries
        const occ = occDoc.data() as MaintenanceOccurrence;
        await FirestoreService.createNotification(companyId, {
          id: `NOTIF_${Date.now()}_${occ.maintenanceOccurrenceId}`,
          title: 'New Maintenance Work Order',
          message: `Work Order has been generated for asset ${occ.assetId}.`,
          type: 'INFO',
          isRead: false,
          timestamp: new Date().toISOString()
        });

        count++;
      }

      return count;
    } catch (err) {
      console.error('[MaintenanceService] processDueOccurrences error:', err);
      return 0;
    }
  }

  /**
   * Handle Work Order Status Changes (called by WorkOrder UI or Service)
   */
  static async handleWorkOrderUpdate(companyId: string, workOrder: WorkOrderRecord, actor: { id: string, name: string }): Promise<void> {
    if (!workOrder.id.startsWith('WO_MNT_')) return;

    const occurrenceId = workOrder.id.replace('WO_MNT_', '');
    const occRef = doc(db, 'companies', companyId, 'maintenance_occurrences', occurrenceId);
    const occSnap = await getDoc(occRef);
    
    if (!occSnap.exists()) return;
    const occ = occSnap.data() as MaintenanceOccurrence;

    const batch = writeBatch(db);
    const now = new Date().toISOString();

    // 1. Update Asset Status if needed
    if (workOrder.status === 'IN_PROGRESS') {
      const assetRef = doc(db, 'companies', companyId, 'assets', occ.assetId);
      batch.update(assetRef, { 
        currentStatus: 'UNDER_MAINTENANCE',
        updatedAt: now 
      });
    }

    // 2. Handle Completion
    if (workOrder.status === 'COMPLETED') {
      batch.update(occRef, { 
        status: 'COMPLETED',
        updatedAt: now 
      });

      // Update Plan's last completed date and next due date
      const planId = occ.maintenancePlanId || occ.planId || '';
      if (planId) {
        const planRef = doc(db, 'companies', companyId, 'maintenance_plans', planId);
        const planSnap = await getDoc(planRef);
        if (planSnap.exists()) {
          const plan = planSnap.data() as MaintenancePlan;
          const freq = typeof plan.frequency === 'number' ? plan.frequency : 1;
          const nextDue = this.calculateNextDueDate(now, freq, plan.frequencyUnit);
          batch.update(planRef, {
            lastCompletedDate: now,
            nextDueDate: nextDue,
            updatedAt: now
          });
        }
      }

      // Restore Asset Status (to AVAILABLE or similar)
      const assetRef = doc(db, 'companies', companyId, 'assets', occ.assetId);
      batch.update(assetRef, { 
        currentStatus: 'AVAILABLE', // Or check if it was 'DEPLOYED'
        updatedAt: now 
      });
      
      // Log Audit
      await FirestoreService.logAuditEvent(
        companyId,
        actor.id,
        actor.name,
        'MAINTENANCE_COMPLETED',
        `Maintenance completed for asset ${occ.assetId} via WO ${workOrder.id}`
      );
    }

    // 3. Handle Cancellation
    if (workOrder.status === 'CANCELLED') {
      batch.update(occRef, { 
        status: 'CANCELLED',
        updatedAt: now 
      });
      
      const assetRef = doc(db, 'companies', companyId, 'assets', occ.assetId);
      batch.update(assetRef, { 
        currentStatus: 'AVAILABLE',
        updatedAt: now 
      });
    }

    await batch.commit();
  }

  static async getMaintenancePlans(companyId: string, assetId?: string): Promise<MaintenancePlan[]> {
    try {
      const colRef = collection(db, 'companies', companyId, 'maintenance_plans');
      let q = query(colRef, orderBy('updatedAt', 'desc'));
      if (assetId) {
        q = query(colRef, where('assetId', '==', assetId), orderBy('updatedAt', 'desc'));
      }
      const snap = await getDocs(q);
      return snap.docs.map(d => d.data() as MaintenancePlan);
    } catch (err) {
      console.error('[MaintenanceService] getMaintenancePlans error:', err);
      return [];
    }
  }

  static async getMaintenanceOccurrences(companyId: string, planId?: string): Promise<MaintenanceOccurrence[]> {
    try {
      const colRef = collection(db, 'companies', companyId, 'maintenance_occurrences');
      let q = query(colRef, orderBy('dueDate', 'asc'));
      if (planId) {
        q = query(colRef, where('maintenancePlanId', '==', planId), orderBy('dueDate', 'asc'));
      }
      const snap = await getDocs(q);
      return snap.docs.map(d => d.data() as MaintenanceOccurrence);
    } catch (err) {
      console.error('[MaintenanceService] getMaintenanceOccurrences error:', err);
      return [];
    }
  }
}
