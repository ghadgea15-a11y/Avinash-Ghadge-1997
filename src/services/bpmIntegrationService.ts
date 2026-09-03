import { BpmApprovalInstance } from '../types/bpm';
import { FirestoreService } from './firestoreService';
import { db } from '../firebase';
import { doc, getDoc, updateDoc, setDoc, collection, getDocs, query, where, deleteDoc } from 'firebase/firestore';

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
        await this.performWrite(doc(db, 'companies', instance.companyId, 'leaveRequests', instance.sourceRecordId), { status: 'APPROVED' }, transaction);
        break;
      case 'OVERTIME':
        if (instance.transactionType === 'OVERTIME_REQUEST') {
           await this.performWrite(doc(db, 'companies', instance.companyId, 'overtime_requests', instance.sourceRecordId), { status: 'APPROVED' }, transaction);
        } else if (instance.transactionType === 'OVERTIME_ADJUSTMENT') {
           await this.performWrite(doc(db, 'companies', instance.companyId, 'overtime_adjustments', instance.sourceRecordId), { status: 'APPROVED' }, transaction);
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
           await this.performWrite(doc(db, 'companies', instance.companyId, 'salary_advances', instance.sourceRecordId), { status: 'APPROVED' }, transaction);
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
      case 'PERFORMANCE_APPRAISAL':
      case 'APPRAISAL': {
        const appraisalRef = doc(db, 'companies', instance.companyId, 'performance_appraisals', instance.sourceRecordId);
        const appraisalSnap = transaction ? await transaction.get(appraisalRef) : await getDoc(appraisalRef);
        
        await this.performWrite(appraisalRef, { status: 'APPROVED', ...commonUpdate }, transaction);

        if (appraisalSnap.exists()) {
          const appraisal = appraisalSnap.data() as any;
          const employeeId = appraisal.employeeId;
          const rating = appraisal.rating || appraisal.score || 3;
          const proposedSalary = appraisal.proposedSalary || appraisal.newSalary;
          const bonusAmount = appraisal.bonusAmount || appraisal.recommendedBonus || 0;

          if (employeeId) {
            const profilesQuery = query(collection(db, 'companies', instance.companyId, 'salaryProfiles'), where('employeeId', '==', employeeId));
            const profilesSnap = await getDocs(profilesQuery);

            let newBaseSalary = proposedSalary;
            if (!newBaseSalary) {
              const incrementPct = rating >= 5 ? 0.15 : (rating >= 4 ? 0.10 : (rating >= 3 ? 0.05 : 0));
              if (!profilesSnap.empty) {
                const existingProfile = profilesSnap.docs[0].data() as any;
                const currentBase = existingProfile.baseMonthlySalary || 30000;
                newBaseSalary = Math.round(currentBase * (1 + incrementPct));
              } else {
                newBaseSalary = 35000;
              }
            }

            if (!profilesSnap.empty) {
              const profileDoc = profilesSnap.docs[0];
              const profileRef = doc(db, 'companies', instance.companyId, 'salaryProfiles', profileDoc.id);
              await this.performWrite(profileRef, {
                baseMonthlySalary: newBaseSalary,
                lastAppraisalRating: rating,
                lastAppraisalId: instance.sourceRecordId,
                performanceBonus: bonusAmount,
                updatedAt: now
              }, transaction, 'UPDATE');
            } else {
              const newProfileId = `PRF-${Date.now()}`;
              const profileRef = doc(db, 'companies', instance.companyId, 'salaryProfiles', newProfileId);
              await this.performWrite(profileRef, {
                id: newProfileId,
                companyId: instance.companyId,
                employeeId,
                structureId: 'DEFAULT-STRUCT',
                baseMonthlySalary: newBaseSalary,
                lastAppraisalRating: rating,
                lastAppraisalId: instance.sourceRecordId,
                performanceBonus: bonusAmount,
                effectiveDate: now.split('T')[0]
              }, transaction, 'SET');
            }
          }
        }
        break;
      }
      case 'TALENT_ACQUISITION':
        if (instance.transactionType === 'JOB_REQUISITION_APPROVAL') {
          const reqRef = doc(db, 'companies', instance.companyId, 'jobRequisitions', instance.sourceRecordId);
          await this.performWrite(reqRef, { status: 'APPROVED', openingDate: now, updatedAt: now }, transaction);
          
          // Sync public-safe job posting to root /publicJobPostings
          const reqSnap = transaction ? await transaction.get(reqRef) : await getDoc(reqRef);
          if (reqSnap.exists()) {
            const reqData = reqSnap.data() as any;
            if (reqData.isInternalOnly !== true) {
              const publicReqRef = doc(db, 'publicJobPostings', instance.sourceRecordId);
              const publicPosting = {
                id: instance.sourceRecordId,
                companyId: instance.companyId,
                companyName: reqData.companyName || 'Enterprise Partner',
                jobTitle: reqData.title || reqData.jobTitle || 'Open Position',
                departmentName: reqData.department || reqData.departmentName || 'Operations',
                siteName: reqData.siteName || '',
                locationCity: reqData.locationCity || reqData.location || 'On-site',
                employmentType: reqData.employmentType || 'FULL_TIME',
                experienceRequired: reqData.experienceRequired || '1-3 Years',
                jobDescription: reqData.jobDescription || reqData.description || 'Exciting career opportunity.',
                skills: Array.isArray(reqData.skills) ? reqData.skills : [],
                openPositions: Number(reqData.openPositions || reqData.openings) || 1,
                status: 'PUBLISHED',
                publishedAt: reqData.publishedAt || now,
                updatedAt: now,
                closingDate: reqData.closingDate || null
              };
              await this.performWrite(publicReqRef, publicPosting, transaction, 'SET');
            }
          }
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
              const isFilled = newFilled >= reqData.openPositions;
              await this.performWrite(jobReqRef, { 
                filledPositions: newFilled,
                status: isFilled ? 'FILLED' : 'OPEN',
                updatedAt: now 
              }, transaction);

              if (isFilled) {
                // Remove filled requisition from public portal
                const publicReqRef = doc(db, 'publicJobPostings', selection.requisitionId);
                try {
                  await deleteDoc(publicReqRef);
                } catch (e) { /* ignore */ }
              }
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
      case 'PERFORMANCE_APPRAISAL':
      case 'APPRAISAL': {
        const appraisalRef = doc(db, 'companies', instance.companyId, 'performance_appraisals', instance.sourceRecordId);
        await this.performWrite(appraisalRef, { status: 'REJECTED', rejectedBy: reviewerId, rejectionReason: reason, updatedAt: now }, transaction);
        break;
      }
      case 'TALENT_ACQUISITION':
        if (instance.transactionType === 'JOB_REQUISITION_APPROVAL') {
          const reqRejectRef = doc(db, 'companies', instance.companyId, 'jobRequisitions', instance.sourceRecordId);
          await this.performWrite(reqRejectRef, { status: 'REJECTED', statusReason: reason || 'Rejected via BPM', updatedAt: now }, transaction);
          const publicReqRef = doc(db, 'publicJobPostings', instance.sourceRecordId);
          try {
            await deleteDoc(publicReqRef);
          } catch (e) { /* ignore */ }
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
        await this.performWrite(doc(db, 'companies', instance.companyId, 'leaveRequests', instance.sourceRecordId), { status: 'REJECTED', rejectedBy: reviewerId, rejectionReason: reason, updatedAt: now }, transaction);
        break;
      case 'OVERTIME':
        if (instance.transactionType === 'OVERTIME_REQUEST') {
           await this.performWrite(doc(db, 'companies', instance.companyId, 'overtime_requests', instance.sourceRecordId), { status: 'REJECTED', rejectedBy: reviewerId, rejectionReason: reason, updatedAt: now }, transaction);
        } else if (instance.transactionType === 'OVERTIME_ADJUSTMENT') {
           await this.performWrite(doc(db, 'companies', instance.companyId, 'overtime_adjustments', instance.sourceRecordId), { status: 'REJECTED', rejectedBy: reviewerId, rejectionReason: reason, updatedAt: now }, transaction);
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
           await this.performWrite(doc(db, 'companies', instance.companyId, 'salary_advances', instance.sourceRecordId), { status: 'REJECTED', rejectedBy: reviewerId, rejectionReason: reason, updatedAt: now }, transaction);
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



