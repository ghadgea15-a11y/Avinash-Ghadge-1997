import { BpmApprovalInstance } from '../types/bpm';
import { FirestoreService } from './firestoreService';
import { db } from '../firebase';
import { doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';

export class BpmIntegrationService {
  /**
   * Helper to perform a set or update operation either via transaction or direct call.
   */
  private static async performWrite(
    ref: any,
    data: any,
    transaction?: any,
    operation: 'SET' | 'UPDATE' = 'UPDATE'
  ): Promise<void> {
    if (transaction) {
      if (operation === 'SET') {
        transaction.set(ref, data, { merge: true });
      } else {
        transaction.update(ref, data);
      }
    } else {
      if (operation === 'SET') {
        await setDoc(ref, data, { merge: true });
      } else {
        await updateDoc(ref, data);
      }
    }
  }

  /**
   * Called when a BPM workflow reaches the final APPROVED state.
   */
  static async onWorkflowApproved(instance: BpmApprovalInstance, reviewerId: string, reviewerName: string, transaction?: any): Promise<void> {
    const now = new Date().toISOString();
    const commonUpdate = { approvedBy: reviewerId, approvedAt: now, updatedAt: now };

    switch (instance.sourceModule) {
      case 'LEAVE':
        await FirestoreService.updateLeaveRequestStatus(
          instance.companyId,
          instance.sourceRecordId,
          'APPROVED',
          { uid: reviewerId, name: reviewerName, reason: 'Approved via BPM workflow' },
          transaction
        );
        break;
      case 'OVERTIME':
        if (instance.transactionType === 'OVERTIME_REQUEST') {
           await FirestoreService.updateOvertimeRequestStatus(
             instance.companyId,
             instance.sourceRecordId,
             'APPROVED',
             { uid: reviewerId, name: reviewerName, reason: 'Approved via BPM workflow' },
             transaction
           );
        } else if (instance.transactionType === 'OVERTIME_ADJUSTMENT') {
           await FirestoreService.updateOvertimeAdjustmentStatus(
             instance.companyId,
             instance.sourceRecordId,
             'APPROVED',
             { uid: reviewerId, name: reviewerName, reason: 'Approved via BPM workflow' },
             transaction
           );
        }
        break;
      case 'SCM':
        if (instance.transactionType === 'PURCHASE_ORDER') {
          const poRef = doc(db, 'companies', instance.companyId, 'purchase_orders', instance.sourceRecordId);
          await this.performWrite(poRef, { status: 'ISSUED', updatedAt: now }, transaction, 'SET');
        } else if (instance.transactionType === 'STOCK_TRANSFER') {
          const txRef = doc(db, 'companies', instance.companyId, 'inventory_transactions', instance.sourceRecordId);
          await this.performWrite(txRef, { status: 'COMPLETED', ...commonUpdate }, transaction);
        }
        break;
      case 'PAYROLL':
        if (instance.transactionType === 'SALARY_ADVANCE') {
           await FirestoreService.updateSalaryAdvanceStatus(
             instance.companyId,
             instance.sourceRecordId,
             'APPROVED',
             { uid: reviewerId, name: reviewerName },
             transaction
           );
        } else if (instance.transactionType === 'PAYMENT_BATCH') {
           const batchRef = doc(db, 'companies', instance.companyId, 'bank_payment_batches', instance.sourceRecordId);
           await this.performWrite(batchRef, { status: 'APPROVED', ...commonUpdate }, transaction);
        }
        break;
      case 'WORK_ORDERS':
      case 'WORK_ORDER':
        const woRef = doc(db, 'companies', instance.companyId, 'work_orders', instance.sourceRecordId);
        await this.performWrite(woRef, { status: 'IN_PROGRESS', ...commonUpdate }, transaction);
        break;
      case 'BILLING':
      case 'CONTRACTS':
        const contractRef = doc(db, 'companies', instance.companyId, 'contracts', instance.sourceRecordId);
        await this.performWrite(contractRef, { status: 'ACTIVE', ...commonUpdate }, transaction);
        break;
      case 'ATTENDANCE':
        const attRef = doc(db, 'companies', instance.companyId, 'attendance_adjustments', instance.sourceRecordId);
        await this.performWrite(attRef, { status: 'APPROVED', ...commonUpdate }, transaction);
        break;
      case 'MATERIAL_GATE_PASS':
        const matRef = doc(db, 'companies', instance.companyId, 'material_movement_logs', instance.sourceRecordId);
        await this.performWrite(matRef, { status: 'APPROVED', ...commonUpdate }, transaction);
        break;
      case 'SERVICE_DESK':
        const ticketRef = doc(db, 'companies', instance.companyId, 'serviceTickets', instance.sourceRecordId);
        await this.performWrite(ticketRef, { status: 'IN_PROGRESS', ...commonUpdate }, transaction);
        break;
      case 'COMPLIANCE':
        const compRef = doc(db, 'companies', instance.companyId, 'compliance_violations', instance.sourceRecordId);
        const compPayload = { 
          status: 'RESOLVED', 
          bpmStatus: 'APPROVED', 
          resolvedBy: reviewerName || reviewerId, 
          resolvedAt: now,
          resolutionNotes: `Remediation approved via BPM workflow (${instance.id})`
        };
        await this.performWrite(compRef, compPayload, transaction);
        break;
      case 'TALENT_ACQUISITION':
        if (instance.transactionType === 'JOB_REQUISITION_APPROVAL') {
          const reqRef = doc(db, 'companies', instance.companyId, 'jobRequisitions', instance.sourceRecordId);
          await this.performWrite(reqRef, { status: 'APPROVED', openingDate: now, updatedAt: now }, transaction);
        } else if (instance.transactionType === 'SELECTION_APPROVAL') {
          const selRef = doc(db, 'companies', instance.companyId, 'selections', instance.sourceRecordId);
          const selSnap = transaction ? await transaction.get(selRef) : await getDoc(selRef);
          
          if (selSnap.exists()) {
            const selection = selSnap.data() as any;
            const candRef = doc(db, 'companies', instance.companyId, 'candidates', selection.candidateId);
            const jobReqRef = doc(db, 'companies', instance.companyId, 'jobRequisitions', selection.requisitionId);
            const reqSnap = transaction ? await transaction.get(jobReqRef) : await getDoc(jobReqRef);

            await this.performWrite(candRef, { stage: 'SELECTED', updatedAt: now }, transaction);
            if (reqSnap.exists()) {
              const reqData = reqSnap.data() as any;
              const newFilled = (reqData.filledPositions || 0) + 1;
              await this.performWrite(jobReqRef, { 
                filledPositions: newFilled,
                status: newFilled >= reqData.openPositions ? 'FILLED' : 'OPEN',
                updatedAt: now 
              }, transaction);
            }
          }
        }
        break;
      default:
        console.log(`Domain integration executed for module: ${instance.sourceModule}`);
    }
  }

  /**
   * Called when a BPM workflow is REJECTED.
   */
  static async onWorkflowRejected(instance: BpmApprovalInstance, reviewerId: string, reviewerName: string, reason: string, transaction?: any): Promise<void> {
    const now = new Date().toISOString();
    const commonReject = { status: 'REJECTED', rejectedBy: reviewerId, rejectionReason: reason, updatedAt: now };

    switch (instance.sourceModule) {
      case 'COMPLIANCE':
        const compRef = doc(db, 'companies', instance.companyId, 'compliance_violations', instance.sourceRecordId);
        const compPayload = { 
          status: 'UNDER_REVIEW', 
          bpmStatus: 'REJECTED', 
          resolutionNotes: `Remediation rejected via BPM workflow (${instance.id}). Reason: ${reason}`
        };
        await this.performWrite(compRef, compPayload, transaction);
        break;
      case 'TALENT_ACQUISITION':
        if (instance.transactionType === 'JOB_REQUISITION_APPROVAL') {
          const reqRejectRef = doc(db, 'companies', instance.companyId, 'jobRequisitions', instance.sourceRecordId);
          await this.performWrite(reqRejectRef, { status: 'REJECTED', statusReason: reason || 'Rejected via BPM', updatedAt: now }, transaction);
        } else if (instance.transactionType === 'SELECTION_APPROVAL') {
          const selRef = doc(db, 'companies', instance.companyId, 'selections', instance.sourceRecordId);
          const selSnap = transaction ? await transaction.get(selRef) : await getDoc(selRef);
          if (selSnap.exists()) {
            const selection = selSnap.data() as any;
            const candRef = doc(db, 'companies', instance.companyId, 'candidates', selection.candidateId);
            await this.performWrite(selRef, { decision: 'REJECTED', rejectionReason: reason, updatedAt: now }, transaction);
            await this.performWrite(candRef, { stage: 'REJECTED', rejectionReason: reason, updatedAt: now }, transaction);
          }
        }
        break;
      case 'LEAVE':
        await FirestoreService.updateLeaveRequestStatus(
          instance.companyId,
          instance.sourceRecordId,
          'REJECTED',
          { uid: reviewerId, name: reviewerName, reason },
          transaction
        );
        break;
      case 'OVERTIME':
        if (instance.transactionType === 'OVERTIME_REQUEST') {
           await FirestoreService.updateOvertimeRequestStatus(
             instance.companyId,
             instance.sourceRecordId,
             'REJECTED',
             { uid: reviewerId, name: reviewerName, reason },
             transaction
           );
        } else if (instance.transactionType === 'OVERTIME_ADJUSTMENT') {
           await FirestoreService.updateOvertimeAdjustmentStatus(
             instance.companyId,
             instance.sourceRecordId,
             'REJECTED',
             { uid: reviewerId, name: reviewerName, reason },
             transaction
           );
        }
        break;
      case 'SCM':
        if (instance.transactionType === 'PURCHASE_ORDER') {
           const poRef = doc(db, 'companies', instance.companyId, 'purchase_orders', instance.sourceRecordId);
           await this.performWrite(poRef, { status: 'CANCELLED', updatedAt: now }, transaction, 'SET');
        } else if (instance.transactionType === 'STOCK_TRANSFER') {
           const txRef = doc(db, 'companies', instance.companyId, 'inventory_transactions', instance.sourceRecordId);
           await this.performWrite(txRef, commonReject, transaction);
        }
        break;
      case 'PAYROLL':
        if (instance.transactionType === 'SALARY_ADVANCE') {
           await FirestoreService.updateSalaryAdvanceStatus(
             instance.companyId,
             instance.sourceRecordId,
             'REJECTED',
             { uid: reviewerId, name: reviewerName },
             transaction
           );
        } else if (instance.transactionType === 'PAYMENT_BATCH') {
           const batchRef = doc(db, 'companies', instance.companyId, 'bank_payment_batches', instance.sourceRecordId);
           await this.performWrite(batchRef, commonReject, transaction);
        }
        break;
      case 'WORK_ORDERS':
      case 'WORK_ORDER':
        const woRef = doc(db, 'companies', instance.companyId, 'work_orders', instance.sourceRecordId);
        await this.performWrite(woRef, { status: 'CANCELLED', rejectionReason: reason, updatedAt: now }, transaction);
        break;
      case 'BILLING':
      case 'CONTRACTS':
        const contractRef = doc(db, 'companies', instance.companyId, 'contracts', instance.sourceRecordId);
        await this.performWrite(contractRef, { status: 'REJECTED', rejectionReason: reason, updatedAt: now }, transaction);
        break;
      case 'ATTENDANCE':
        const attRef = doc(db, 'companies', instance.companyId, 'attendance_adjustments', instance.sourceRecordId);
        await this.performWrite(attRef, commonReject, transaction);
        break;
      case 'MATERIAL_GATE_PASS':
        const matRef = doc(db, 'companies', instance.companyId, 'material_movement_logs', instance.sourceRecordId);
        await this.performWrite(matRef, { status: 'REJECTED', rejectionReason: reason, updatedAt: now }, transaction);
        break;
      case 'SERVICE_DESK':
        const ticketRef = doc(db, 'companies', instance.companyId, 'serviceTickets', instance.sourceRecordId);
        await this.performWrite(ticketRef, { status: 'REJECTED', rejectionReason: reason, updatedAt: now }, transaction);
        break;
    }
  }
}


