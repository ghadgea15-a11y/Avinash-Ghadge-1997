const fs = require('fs');
let content = fs.readFileSync('src/services/contractExpiryEngine.ts', 'utf8');

const importAdd = `
import { db } from '../firebase';
import { 
  ContractRecord, 
  ContractExpiryEventRecord,
  ContractExpiryMilestone,
  AppNotification
} from '../types';
`;

content = content.replace(
  /import { \n  ContractRecord, \n  ContractExpiryEventRecord,\n  ContractExpiryMilestone\n} from '\.\.\/types';/m,
  importAdd
);

const processFunc = `
  async processPendingNotifications(companyId: string): Promise<void> {
    const pendingEvents = await this.getActiveExpiryEvents(companyId);
    
    for (const evt of pendingEvents) {
      if (evt.status === 'PENDING_NOTIFICATION') {
        const notifId = crypto.randomUUID();
        const notification: AppNotification = {
          id: notifId,
          title: \`Contract Expiring Soon: \${evt.milestone} days\`,
          message: \`Contract ID \${evt.contractId} is expiring in \${evt.daysRemaining} days (on \${new Date(evt.expiryDate).toLocaleDateString()}). Please initiate renewal or termination workflow.\`,
          type: evt.daysRemaining <= 15 ? 'ALERT' : 'WARNING',
          timestamp: new Date().toISOString(),
          isRead: false,
          roleScope: ['SUPER_ADMIN', 'COMPANY_ADMIN', 'MANAGER']
        };
        
        // Save notification to company's notifications collection
        await setDoc(doc(db, 'companies', companyId, 'notifications', notifId), notification);
        
        // Update event
        await this.updateEventStatus(companyId, evt.id, 'NOTIFIED', notifId);
      }
    }
  },
`;

content = content.replace(
  "  async updateEventStatus",
  processFunc + "\n  async updateEventStatus"
);

fs.writeFileSync('src/services/contractExpiryEngine.ts', content);
