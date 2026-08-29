import { db } from '../firebase';
import { 
  collection, doc, getDocs, setDoc, query, where, 
  updateDoc, writeBatch, Timestamp, getDoc 
} from 'firebase/firestore';
import { MaintenancePlan, MaintenanceOccurrence } from '../types';

export class MaintenanceService {
  static async getMaintenancePlans(companyId: string): Promise<MaintenancePlan[]> {
    const snap = await getDocs(collection(db, 'companies', companyId, 'maintenancePlans'));
    return snap.docs.map(d => d.data() as MaintenancePlan);
  }

  static async getMaintenanceOccurrences(companyId: string): Promise<MaintenanceOccurrence[]> {
    const snap = await getDocs(collection(db, 'companies', companyId, 'maintenanceOccurrences'));
    return snap.docs.map(d => d.data() as MaintenanceOccurrence);
  }

  static async saveMaintenancePlan(
    companyId: string, 
    plan: MaintenancePlan, 
    actor: { id: string, name: string }
  ): Promise<boolean> {
    const planRef = doc(db, 'companies', companyId, 'maintenancePlans', plan.maintenancePlanId);
    await setDoc(planRef, {
      ...plan,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: actor.id,
      updatedBy: actor.id
    });
    return true;
  }

  /**
   * Scans all plans and generates occurrences for those whose nextDueDate is <= today.
   */
  static async processDueOccurrences(
    companyId: string, 
    actor: { id: string, name: string }
  ): Promise<number> {
    const plans = await this.getMaintenancePlans(companyId);
    const today = new Date().toISOString().split('T')[0];
    let createdCount = 0;
    const batch = writeBatch(db);

    for (const plan of plans) {
      if (plan.status !== 'ACTIVE') continue;
      
      const nextDue = plan.nextDueDate.split('T')[0];
      if (nextDue <= today) {
        // Create occurrence
        const occId = `OCC-${plan.maintenancePlanId}-${nextDue}`;
        const occRef = doc(db, 'companies', companyId, 'maintenanceOccurrences', occId);
        
        // Check if already exists to avoid duplicates
        const existing = await getDoc(occRef);
        if (existing.exists()) continue;

        const occurrence: MaintenanceOccurrence = {
          maintenanceOccurrenceId: occId,
          companyId,
          assetId: plan.assetId,
          maintenancePlanId: plan.maintenancePlanId,
          dueDate: plan.nextDueDate,
          status: 'DUE',
          priority: plan.priority,
          assignedTo: plan.assignedTo,
          siteId: plan.siteId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        batch.set(occRef, occurrence);

        // Update plan's nextDueDate
        const planRef = doc(db, 'companies', companyId, 'maintenancePlans', plan.maintenancePlanId);
        const nextDate = this.calculateNextDate(plan.nextDueDate, plan.frequency, plan.frequencyUnit);
        batch.update(planRef, { 
          nextDueDate: nextDate,
          lastOccurrenceDate: plan.nextDueDate,
          updatedAt: new Date().toISOString()
        });

        createdCount++;
      }
    }

    if (createdCount > 0) {
      await batch.commit();
    }
    return createdCount;
  }

  private static calculateNextDate(current: string, freq: number, unit: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY'): string {
    const date = new Date(current);
    switch (unit) {
      case 'DAILY': date.setDate(date.getDate() + freq); break;
      case 'WEEKLY': date.setDate(date.getDate() + freq * 7); break;
      case 'MONTHLY': date.setMonth(date.getMonth() + freq); break;
      case 'YEARLY': date.setFullYear(date.getFullYear() + freq); break;
    }
    return date.toISOString();
  }

  static async completeWorkOrder(companyId: string, woId: string): Promise<void> {
    const woRef = doc(db, 'companies', companyId, 'work_orders', woId);
    await updateDoc(woRef, {
      status: 'COMPLETED',
      completedAt: new Date().toISOString()
    });
  }
}
