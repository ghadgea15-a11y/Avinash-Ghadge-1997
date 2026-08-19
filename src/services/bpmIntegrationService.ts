import { BpmApprovalInstance } from '../types/bpm';
import { FirestoreService } from './firestoreService';
import { db } from '../firebase';
import { doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';

export class BpmIntegrationService {
  /**
   * Called when a BPM workflow reaches the final APPROVED state.
   */
  static async onWorkflowApproved(instance: BpmApprovalInstance, reviewerId: string, reviewerName: string): Promise<void> {
    const now = new Date().toISOString();
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
           await FirestoreService.savePurchaseOrder(instance.companyId, {
              id: instance.sourceRecordId,
              status: 'ISSUED', // Approved maps to ISSUED in SCM for POs
              updatedAt: now
           } as any); 
        } else if (instance.transactionType === 'STOCK_TRANSFER') {
           const txRef = doc(db, 'companies', instance.companyId, 'inventory_transactions', instance.sourceRecordId);
           await updateDoc(txRef, { status: 'COMPLETED', approvedBy: reviewerId, approvedAt: now, updatedAt: now });
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
        } else if (instance.transactionType === 'PAYMENT_BATCH') {
           const batchRef = doc(db, 'companies', instance.companyId, 'bank_payment_batches', instance.sourceRecordId);
           await updateDoc(batchRef, { status: 'APPROVED', approvedBy: reviewerId, approvedAt: now, updatedAt: now });
        }
        break;
      case 'WORK_ORDERS':
      case 'WORK_ORDER':
        const woRef = doc(db, 'companies', instance.companyId, 'work_orders', instance.sourceRecordId);
        await updateDoc(woRef, { status: 'IN_PROGRESS', approvedBy: reviewerId, approvedAt: now, updatedAt: now });
        break;
      case 'BILLING':
      case 'CONTRACTS':
        const contractRef = doc(db, 'companies', instance.companyId, 'contracts', instance.sourceRecordId);
        await updateDoc(contractRef, { status: 'ACTIVE', approvedBy: reviewerId, approvedAt: now, updatedAt: now });
        break;
      case 'ATTENDANCE':
        const attRef = doc(db, 'companies', instance.companyId, 'attendance_adjustments', instance.sourceRecordId);
        await updateDoc(attRef, { status: 'APPROVED', approvedBy: reviewerId, approvedAt: now, updatedAt: now });
        break;
      case 'MATERIAL_GATE_PASS':
        const matRef = doc(db, 'companies', instance.companyId, 'material_movement_logs', instance.sourceRecordId);
        await updateDoc(matRef, { status: 'APPROVED', approvedBy: reviewerId, approvedAt: now, updatedAt: now });
        break;
      case 'SERVICE_DESK':
        const ticketRef = doc(db, 'companies', instance.companyId, 'serviceTickets', instance.sourceRecordId);
        await updateDoc(ticketRef, { status: 'IN_PROGRESS', approvedBy: reviewerId, approvedAt: now, updatedAt: now });
        break;
      case 'COMPLIANCE':
        const compRef = doc(db, 'companies', instance.companyId, 'compliance_violations', instance.sourceRecordId);
        await updateDoc(compRef, { 
          status: 'RESOLVED', 
          bpmStatus: 'APPROVED', 
          resolvedBy: reviewerName || reviewerId, 
          resolvedAt: now,
          resolutionNotes: `Remediation approved via BPM workflow (${instance.id})`
        });
        break;
      default:
        console.log(`Domain integration executed for module: ${instance.sourceModule}`);
    }
  }

  /**
   * Called when a BPM workflow is REJECTED.
   */
  static async onWorkflowRejected(instance: BpmApprovalInstance, reviewerId: string, reviewerName: string, reason: string): Promise<void> {
    const now = new Date().toISOString();
    switch (instance.sourceModule) {
      case 'COMPLIANCE':
        const compRef = doc(db, 'companies', instance.companyId, 'compliance_violations', instance.sourceRecordId);
        await updateDoc(compRef, { 
          status: 'UNDER_REVIEW', 
          bpmStatus: 'REJECTED', 
          resolutionNotes: `Remediation rejected via BPM workflow (${instance.id}). Reason: ${reason}`
        });
        break;
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
              status: 'CANCELLED',
              updatedAt: now
           } as any); 
        } else if (instance.transactionType === 'STOCK_TRANSFER') {
           const txRef = doc(db, 'companies', instance.companyId, 'inventory_transactions', instance.sourceRecordId);
           await updateDoc(txRef, { status: 'REJECTED', rejectedBy: reviewerId, rejectionReason: reason, updatedAt: now });
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
        } else if (instance.transactionType === 'PAYMENT_BATCH') {
           const batchRef = doc(db, 'companies', instance.companyId, 'bank_payment_batches', instance.sourceRecordId);
           await updateDoc(batchRef, { status: 'REJECTED', rejectedBy: reviewerId, rejectionReason: reason, updatedAt: now });
        }
        break;
      case 'WORK_ORDERS':
      case 'WORK_ORDER':
        const woRef = doc(db, 'companies', instance.companyId, 'work_orders', instance.sourceRecordId);
        await updateDoc(woRef, { status: 'CANCELLED', rejectionReason: reason, updatedAt: now });
        break;
      case 'BILLING':
      case 'CONTRACTS':
        const contractRef = doc(db, 'companies', instance.companyId, 'contracts', instance.sourceRecordId);
        await updateDoc(contractRef, { status: 'REJECTED', rejectionReason: reason, updatedAt: now });
        break;
      case 'ATTENDANCE':
        const attRef = doc(db, 'companies', instance.companyId, 'attendance_adjustments', instance.sourceRecordId);
        await updateDoc(attRef, { status: 'REJECTED', rejectedBy: reviewerId, rejectionReason: reason, updatedAt: now });
        break;
      case 'MATERIAL_GATE_PASS':
        const matRef = doc(db, 'companies', instance.companyId, 'material_movement_logs', instance.sourceRecordId);
        await updateDoc(matRef, { status: 'REJECTED', rejectionReason: reason, updatedAt: now });
        break;
      case 'SERVICE_DESK':
        const ticketRef = doc(db, 'companies', instance.companyId, 'serviceTickets', instance.sourceRecordId);
        await updateDoc(ticketRef, { status: 'REJECTED', rejectionReason: reason, updatedAt: now });
        break;
    }
  }
}


