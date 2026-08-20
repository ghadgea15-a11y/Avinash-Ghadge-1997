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
      case 'TALENT_ACQUISITION':
        if (instance.transactionType === 'JOB_REQUISITION_APPROVAL') {
          const reqRef = doc(db, 'companies', instance.companyId, 'jobRequisitions', instance.sourceRecordId);
          await updateDoc(reqRef, { 
            status: 'APPROVED', 
            openingDate: now,
            updatedAt: now 
          });
        } else if (instance.transactionType === 'SELECTION_APPROVAL') {
          // 1. Fetch Selection Record
          const selRef = doc(db, 'companies', instance.companyId, 'selections', instance.sourceRecordId);
          const selSnap = await getDoc(selRef);
          if (selSnap.exists()) {
            const selection = selSnap.data() as any;
            // 2. Update Candidate Stage
            const candRef = doc(db, 'companies', instance.companyId, 'candidates', selection.candidateId);
            await updateDoc(candRef, { stage: 'SELECTED', updatedAt: now });
            
            // 3. Update Requisition Capacity
            const reqRef = doc(db, 'companies', instance.companyId, 'jobRequisitions', selection.requisitionId);
            const reqSnap = await getDoc(reqRef);
            if (reqSnap.exists()) {
              const reqData = reqSnap.data() as any;
              const newFilled = (reqData.filledPositions || 0) + 1;
              await updateDoc(reqRef, { 
                filledPositions: newFilled,
                status: newFilled >= reqData.openPositions ? 'FILLED' : 'OPEN',
                updatedAt: now 
              });
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
      case 'TALENT_ACQUISITION':
        if (instance.transactionType === 'JOB_REQUISITION_APPROVAL') {
          const reqRejectRef = doc(db, 'companies', instance.companyId, 'jobRequisitions', instance.sourceRecordId);
          await updateDoc(reqRejectRef, { 
            status: 'REJECTED', 
            statusReason: reason || 'Rejected via BPM',
            updatedAt: now 
          });
        } else if (instance.transactionType === 'SELECTION_APPROVAL') {
          // Update selection record to REJECTED if BPM rejected it
          const selRef = doc(db, 'companies', instance.companyId, 'selections', instance.sourceRecordId);
          const selSnap = await getDoc(selRef);
          if (selSnap.exists()) {
            const selection = selSnap.data() as any;
            await updateDoc(selRef, { decision: 'REJECTED', rejectionReason: reason, updatedAt: now });
            
            // Move candidate to REJECTED or back to INTERVIEW? 
            // Usually rejection from BPM means the hiring manager said no.
            const candRef = doc(db, 'companies', instance.companyId, 'candidates', selection.candidateId);
            await updateDoc(candRef, { stage: 'REJECTED', rejectionReason: reason, updatedAt: now });
          }
        }
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


