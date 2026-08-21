import { collection, doc, getDocs, getDoc, setDoc, query, where, Timestamp } from 'firebase/firestore';

import { db } from '../firebase';
import { 
  ContractRecord, 
  ContractExpiryEventRecord,
  ContractExpiryMilestone,
  AppNotification
} from '../types';


export const contractExpiryEngine = {
  
  async getExpiryEvents(companyId: string, contractId?: string): Promise<ContractExpiryEventRecord[]> {
    let q = query(collection(db, 'companies', companyId, 'contract_expiry_events'));
    if (contractId) {
      q = query(q, where('contractId', '==', contractId));
    }
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as ContractExpiryEventRecord);
  },

  async getActiveExpiryEvents(companyId: string): Promise<ContractExpiryEventRecord[]> {
    let q = query(collection(db, 'companies', companyId, 'contract_expiry_events'), where('status', 'in', ['PENDING_NOTIFICATION', 'NOTIFIED', 'ESCALATED']));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as ContractExpiryEventRecord);
  },

  async generateExpiryAlerts(companyId: string, contracts: ContractRecord[]): Promise<ContractExpiryEventRecord[]> {
    const activeContracts = contracts.filter(c => c.status === 'ACTIVE' || c.status === 'APPROVED' || c.status === 'EXPIRING' || c.status === 'RENEWAL_PENDING');
    const existingEvents = await this.getExpiryEvents(companyId);
    
    const newEvents: ContractExpiryEventRecord[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const milestones: ContractExpiryMilestone[] = [90, 60, 30, 15, 7, 1, 0];

    for (const contract of activeContracts) {
      if (!contract.endDate) continue;

      const endDate = new Date(contract.endDate);
      endDate.setHours(0, 0, 0, 0);
      
      const diffTime = endDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays <= 90) {
        // Find which milestone applies. It should be the smallest milestone >= diffDays
        // Actually, we should trigger events for all milestones that have passed.
        for (const milestone of milestones) {
          if (diffDays <= milestone) {
            // Check if this specific milestone event already exists for this contract and expiry date
            const eventId = `EXP-${contract.id}-${contract.endDate.split('T')[0]}-${milestone}`;
            const exists = existingEvents.some(e => e.id === eventId);
            
            if (!exists) {
              const newEvt: ContractExpiryEventRecord = {
                id: eventId,
                companyId,
                clientId: contract.clientId,
                contractId: contract.id,
                milestone,
                expiryDate: contract.endDate,
                daysRemaining: diffDays,
                detectedAt: new Date().toISOString(),
                status: 'PENDING_NOTIFICATION'
              };
              
              await setDoc(doc(db, 'companies', companyId, 'contract_expiry_events', eventId), newEvt);
              newEvents.push(newEvt);
              existingEvents.push(newEvt); // Update local cache to prevent duplicates
            }
          }
        }
        
        // Also update the contract status if it's nearing expiry and currently ACTIVE/APPROVED
        if ((contract.status === 'ACTIVE' || contract.status === 'APPROVED') && diffDays <= 90 && diffDays > 0) {
          await setDoc(doc(db, 'companies', companyId, 'contracts', contract.id), {
            status: 'EXPIRING'
          }, { merge: true });
        } else if (diffDays <= 0 && contract.status !== 'EXPIRED' && contract.status !== 'RENEWED' && contract.status !== 'CLOSED' && contract.status !== 'TERMINATED') {
          await setDoc(doc(db, 'companies', companyId, 'contracts', contract.id), {
            status: 'EXPIRED'
          }, { merge: true });
        }
      }
    }
    
    return newEvents;
  },
  

  async processPendingNotifications(companyId: string): Promise<void> {
    const pendingEvents = await this.getActiveExpiryEvents(companyId);
    
    for (const evt of pendingEvents) {
      if (evt.status === 'PENDING_NOTIFICATION') {
        const notifId = crypto.randomUUID();
        const notification: AppNotification = {
          id: notifId,
          title: `Contract Expiring Soon: ${evt.milestone} days`,
          message: `Contract ID ${evt.contractId} is expiring in ${evt.daysRemaining} days (on ${new Date(evt.expiryDate || evt.endDate || '').toLocaleDateString()}). Please initiate renewal or termination workflow.`,
          type: evt.daysRemaining <= 15 ? 'ALERT' : 'WARNING',
          timestamp: new Date().toISOString(),
          isRead: false,
          roleScope: ['SUPER_ADMIN', 'COMPANY_ADMIN', 'OPS_MANAGER']
        };
        
        // Save notification to company's notifications collection
        await setDoc(doc(db, 'companies', companyId, 'notifications', notifId), notification);
        
        // Update event
        await this.updateEventStatus(companyId, evt.id, 'NOTIFIED', notifId);
      }
    }
  },

  async updateEventStatus(companyId: string, eventId: string, status: ContractExpiryEventRecord['status'], notificationId?: string, escalationId?: string): Promise<void> {
    const updateData: Partial<ContractExpiryEventRecord> = { status };
    if (notificationId) updateData.notificationId = notificationId;
    if (escalationId) updateData.escalationId = escalationId;
    
    await setDoc(doc(db, 'companies', companyId, 'contract_expiry_events', eventId), updateData, { merge: true });
  }
};
