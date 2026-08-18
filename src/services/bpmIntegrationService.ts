import { BpmApprovalInstance } from '../types/bpm';
import { FirestoreService } from './firestoreService';
import { db } from '../firebase';
import { doc, getDoc, runTransaction } from 'firebase/firestore';

export class BpmIntegrationService {
  /**
   * Called when a BPM workflow reaches the final APPROVED state.
   */
  static async onWorkflowApproved(instance: BpmApprovalInstance, reviewerId: string, reviewerName: string): Promise<void> {
    switch (instance.sourceModule) {
      case 'LEAVE':
        await FirestoreService.updateLeaveRequestStatus(
          instance.companyId,
          instance.sourceRecordId,
          'APPROVED',
          { uid: reviewerId, name: reviewerName, reason: 'Approved via BPM workflow' }
        );
        break;
      case 'OVERTIME':
        if (instance.transactionType === 'OVERTIME_REQUEST') {
           await FirestoreService.updateOvertimeRequestStatus(
             instance.companyId,
             instance.sourceRecordId,
             'APPROVED',
             { uid: reviewerId, name: reviewerName, reason: 'Approved via BPM workflow' }
           );
        } else if (instance.transactionType === 'OVERTIME_ADJUSTMENT') {
           await FirestoreService.updateOvertimeAdjustmentStatus(
             instance.companyId,
             instance.sourceRecordId,
             'APPROVED',
             { uid: reviewerId, name: reviewerName, reason: 'Approved via BPM workflow' }
           );
        }
        break;
      case 'SCM':
        if (instance.transactionType === 'PURCHASE_ORDER') {
           // We only need to update the status in PO, there's no complex update logic method yet.
           await FirestoreService.savePurchaseOrder(instance.companyId, {
              id: instance.sourceRecordId,
              status: 'ISSUED', // Approved maps to ISSUED in SCM for POs
              updatedAt: new Date().toISOString()
           } as any); 
        }
        break;
      case 'PAYROLL':
        if (instance.transactionType === 'SALARY_ADVANCE') {
           await FirestoreService.updateSalaryAdvanceStatus(
             instance.companyId,
             instance.sourceRecordId,
             'APPROVED',
             { uid: reviewerId, name: reviewerName }
           );
        }
        break;
      default:
        console.log(`No domain integration needed for module: ${instance.sourceModule}`);
    }
  }

  /**
   * Called when a BPM workflow is REJECTED.
   */
  static async onWorkflowRejected(instance: BpmApprovalInstance, reviewerId: string, reviewerName: string, reason: string): Promise<void> {
    switch (instance.sourceModule) {
      case 'LEAVE':
        await FirestoreService.updateLeaveRequestStatus(
          instance.companyId,
          instance.sourceRecordId,
          'REJECTED',
          { uid: reviewerId, name: reviewerName, reason }
        );
        break;
      case 'OVERTIME':
        if (instance.transactionType === 'OVERTIME_REQUEST') {
           await FirestoreService.updateOvertimeRequestStatus(
             instance.companyId,
             instance.sourceRecordId,
             'REJECTED',
             { uid: reviewerId, name: reviewerName, reason }
           );
        } else if (instance.transactionType === 'OVERTIME_ADJUSTMENT') {
           await FirestoreService.updateOvertimeAdjustmentStatus(
             instance.companyId,
             instance.sourceRecordId,
             'REJECTED',
             { uid: reviewerId, name: reviewerName, reason }
           );
        }
        break;
      case 'SCM':
        if (instance.transactionType === 'PURCHASE_ORDER') {
           await FirestoreService.savePurchaseOrder(instance.companyId, {
              id: instance.sourceRecordId,
              status: 'CANCELLED', // Maps rejected to cancelled for now
              updatedAt: new Date().toISOString()
           } as any); 
        }
        break;
      case 'PAYROLL':
        if (instance.transactionType === 'SALARY_ADVANCE') {
           await FirestoreService.updateSalaryAdvanceStatus(
             instance.companyId,
             instance.sourceRecordId,
             'REJECTED',
             { uid: reviewerId, name: reviewerName }
           );
        }
        break;
    }
  }
}

