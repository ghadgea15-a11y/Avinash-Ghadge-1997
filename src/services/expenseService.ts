import { runTransaction, 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where 
} from 'firebase/firestore';
import { db } from '../firebase';
import { 
  ExpenseClaimRecord, 
  TravelRequestRecord, 
  ExpensePolicyRecord, 
  ExpenseReceiptItem,
  ExpenseClaimStatus
} from '../types/expense';
import { AuditTrailService } from './auditTrailService';
import { BpmService } from './bpmService';

export class ExpenseService {
  // -------------------------------------------------------------
  // EXPENSE CLAIMS
  // -------------------------------------------------------------
  static async getExpenseClaims(companyId: string, employeeId?: string): Promise<ExpenseClaimRecord[]> {
    try {
      const colRef = collection(db, 'companies', companyId, 'expenseClaims');
      const q = employeeId ? query(colRef, where('employeeId', '==', employeeId)) : colRef;
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as ExpenseClaimRecord));
    } catch (err) {
      console.error('Error fetching expense claims:', err);
      return [];
    }
  }

  static async saveExpenseClaim(
    companyId: string,
    claimData: Partial<ExpenseClaimRecord>,
    actor: { uid: string; name: string; role: string }
  ): Promise<ExpenseClaimRecord> {
    const isNew = !claimData.id;
    const docRef = isNew 
      ? doc(collection(db, 'companies', companyId, 'expenseClaims'))
      : doc(db, 'companies', companyId, 'expenseClaims', claimData.id!);

    const totalAmount = claimData.items?.reduce((acc, item) => acc + (Number(item.amount) || 0), 0) || 0;
    const totalTaxAmount = claimData.items?.reduce((acc, item) => acc + (Number(item.taxAmount) || 0), 0) || 0;

    // Check if any item failed OCR or has low confidence score (< 80%)
    const items = claimData.items || [];
    const hasManualReviewItem = items.some(
      it => it.requiresManualReview || (it.ocrExtracted && (it.ocrConfidenceScore ?? 1) < 0.80) || it.ocrExtractionStatus === 'FAILED_MANUAL_REVIEW_REQUIRED' || it.ocrExtractionStatus === 'LOW_CONFIDENCE'
    );
    const manualReviewReason = hasManualReviewItem
      ? (items.find(it => it.manualReviewReason)?.manualReviewReason || 'Contains receipt with low OCR confidence or unverified invoice details requiring manual approver review')
      : undefined;

    const record: ExpenseClaimRecord = {
      id: docRef.id,
      companyId,
      employeeId: claimData.employeeId || actor.uid,
      employeeName: claimData.employeeName || actor.name,
      departmentId: claimData.departmentId || '',
      siteId: claimData.siteId || '',
      costCenterCode: claimData.costCenterCode || 'CC-OPS-01',
      costCenterId: claimData.costCenterId,
      title: claimData.title || 'Official Site Visit Expense',
      totalAmount,
      totalTaxAmount,
      currency: 'INR',
      status: claimData.status || 'SUBMITTED',
      travelRequestId: claimData.travelRequestId,
      items,
      requiresManualReview: hasManualReviewItem || Boolean(claimData.requiresManualReview),
      manualReviewReason: manualReviewReason || claimData.manualReviewReason,
      submissionDate: claimData.submissionDate || new Date().toISOString().split('T')[0],
      remarks: claimData.remarks,
      createdAt: claimData.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await setDoc(docRef, record, { merge: true });

    // Link to BPM workflow if submitted
    if (isNew && record.status === 'SUBMITTED') {
      try {
        await BpmService.submitForApproval(companyId, actor.uid || '', 'EXPENSE', docRef.id, 'EXPENSE_CLAIM', {
          title: `Expense Reimbursement: ${record.title} (₹${record.totalAmount})`,
          amount: record.totalAmount,
          currency: 'INR',
          priority: record.totalAmount > 10000 ? 'HIGH' : 'MEDIUM'
        });
      } catch (bpmErr) {
        console.warn('BPM integration non-blocking warning:', bpmErr);
      }
    }

    await AuditTrailService.recordEvent({
      companyId,
      actorUid: actor.uid,
      actorName: actor.name,
      actorRole: actor.role,
      module: 'FINANCE',
      action: isNew ? 'EXPENSE_CLAIM_CREATED' : 'EXPENSE_CLAIM_UPDATED',
      entityId: docRef.id,
      description: `${isNew ? 'Filed' : 'Updated'} Expense Claim ₹${record.totalAmount} (${record.title})`
    });

    return record;
  }

  static async updateClaimStatus(
    companyId: string,
    claimId: string,
    status: ExpenseClaimStatus,
    actor: { uid: string; name: string; role: string },
    rejectionReason?: string
  ): Promise<void> {
    const docRef = doc(db, 'companies', companyId, 'expenseClaims', claimId);

    await runTransaction(db, async (transaction) => {
      const claimDoc = await transaction.get(docRef);
      if (!claimDoc.exists()) throw new Error('Expense claim not found');

      const claimData = claimDoc.data() as ExpenseClaimRecord;
      const currentStatus = claimData.status;

      const updateData: any = {
        status,
        updatedAt: new Date().toISOString()
      };
      if (status === 'APPROVED') {
        updateData.approvedDate = new Date().toISOString();
        updateData.approvedBy = actor.name;
      }
      if (rejectionReason) {
        updateData.rejectionReason = rejectionReason;
      }

      // If approving, handle budget conversion from hold to actual spend
      if (status === 'APPROVED' && currentStatus !== 'APPROVED') {
        let travelTrDoc: any = null;
        let trRef: any = null;
        const totalClaimSpend = Number(claimData.totalAmount) || 0;

        if (claimData.travelRequestId) {
          trRef = doc(db, 'companies', companyId, 'travelRequests', claimData.travelRequestId);
          travelTrDoc = await transaction.get(trRef);
        }

        const costCenterId = claimData.costCenterId || (travelTrDoc && travelTrDoc.exists() ? travelTrDoc.data().costCenterId : undefined);

        if (costCenterId) {
          const ccRef = doc(db, 'companies', companyId, 'cost_centres', costCenterId);
          const ccDoc = await transaction.get(ccRef);
          if (ccDoc.exists()) {
            const ccData = ccDoc.data();
            const holdToRelease = travelTrDoc && travelTrDoc.exists() 
              ? Number(travelTrDoc.data().budgetReservedAmount ?? travelTrDoc.data().estimatedBudget ?? 0)
              : 0;
            const currentReserved = Number(ccData.budgetReserved) || 0;
            const currentConsumed = Number(ccData.budgetConsumed) || 0;

            transaction.update(ccRef, {
              budgetReserved: Math.max(0, currentReserved - holdToRelease),
              budgetConsumed: currentConsumed + totalClaimSpend,
              updatedAt: new Date().toISOString()
            });
          }
        }

        // If linked to travel request, mark the travel pre-authorization as completed & settled
        if (trRef && travelTrDoc && travelTrDoc.exists()) {
          transaction.update(trRef, {
            status: 'COMPLETED',
            budgetReservedAmount: 0,
            settledExpenseClaimId: claimId,
            settledAmount: totalClaimSpend,
            updatedAt: new Date().toISOString()
          });
        }
      } else if ((status === 'REJECTED' || status === 'CANCELLED') && currentStatus === 'APPROVED') {
        // Rollback actual spend if previously approved claim is reversed
        const totalClaimSpend = Number(claimData.totalAmount) || 0;
        const costCenterId = claimData.costCenterId;
        if (costCenterId) {
          const ccRef = doc(db, 'companies', companyId, 'cost_centres', costCenterId);
          const ccDoc = await transaction.get(ccRef);
          if (ccDoc.exists()) {
            const ccData = ccDoc.data();
            const currentConsumed = Number(ccData.budgetConsumed) || 0;
            transaction.update(ccRef, {
              budgetConsumed: Math.max(0, currentConsumed - totalClaimSpend),
              updatedAt: new Date().toISOString()
            });
          }
        }
      }

      transaction.update(docRef, updateData);
    });

    await AuditTrailService.recordEvent({
      companyId,
      actorUid: actor.uid,
      actorName: actor.name,
      actorRole: actor.role,
      module: 'FINANCE',
      action: 'EXPENSE_STATUS_CHANGED',
      entityId: claimId,
      description: `Expense Claim ${claimId} marked as ${status}`
    });
  }

  // -------------------------------------------------------------
  // TRAVEL REQUESTS
  // -------------------------------------------------------------
  static async getTravelRequests(companyId: string, employeeId?: string): Promise<TravelRequestRecord[]> {
    try {
      const colRef = collection(db, 'companies', companyId, 'travelRequests');
      const q = employeeId ? query(colRef, where('employeeId', '==', employeeId)) : colRef;
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as TravelRequestRecord));
    } catch (err) {
      return [];
    }
  }

  static async approveTravelRequest(
    companyId: string,
    tr: TravelRequestRecord,
    actor: { uid: string; name: string; role: string }
  ): Promise<void> {
    await runTransaction(db, async (transaction) => {
      const trRef = doc(db, 'companies', companyId, 'travelRequests', tr.id);
      const trDoc = await transaction.get(trRef);
      if (!trDoc.exists()) {
        throw new Error('Travel request not found');
      }
      const trData = trDoc.data() as TravelRequestRecord;
      if (trData.status === 'APPROVED') {
        throw new Error('Travel request is already approved');
      }

      const costCenterId = tr.costCenterId || trData.costCenterId;
      const estimatedBudget = Number(tr.estimatedBudget ?? trData.estimatedBudget ?? 0);

      if (costCenterId) {
        const ccRef = doc(db, 'companies', companyId, 'cost_centres', costCenterId);
        const ccDoc = await transaction.get(ccRef);
        if (ccDoc.exists()) {
          const ccData = ccDoc.data();
          const budgetAllocated = Number(ccData.budgetAllocated) || 0;
          const currentReserved = Number(ccData.budgetReserved) || 0;
          const currentConsumed = Number(ccData.budgetConsumed) || 0;

          // Real-time budget validation check if allocated cap is configured (>0)
          if (budgetAllocated > 0) {
            const availableBudget = budgetAllocated - (currentReserved + currentConsumed);
            if (estimatedBudget > availableBudget) {
              throw new Error(
                `Insufficient unreserved budget in Cost Center "${ccData.name || ccData.code}". ` +
                `Total Allocated: ₹${budgetAllocated.toLocaleString('en-IN')}, ` +
                `Already Consumed: ₹${currentConsumed.toLocaleString('en-IN')}, ` +
                `Already Reserved: ₹${currentReserved.toLocaleString('en-IN')}, ` +
                `Available: ₹${Math.max(0, availableBudget).toLocaleString('en-IN')}, ` +
                `Requested: ₹${estimatedBudget.toLocaleString('en-IN')}`
              );
            }
          }

          transaction.update(ccRef, {
            budgetReserved: currentReserved + estimatedBudget,
            updatedAt: new Date().toISOString()
          });
        }
      }

      transaction.update(trRef, {
        status: 'APPROVED',
        budgetReservedAmount: estimatedBudget,
        approverId: actor.uid,
        approvedBy: actor.name,
        approvedDate: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    });

    const AuditTrailService = (await import('./auditTrailService')).AuditTrailService;
    await AuditTrailService.recordEvent({
      companyId,
      actorUid: actor.uid,
      module: 'EXPENSE',
      action: 'APPROVE',
      entity: 'TRAVEL_REQUEST',
      entityId: tr.id,
      details: `Approved travel request "${tr.purpose}" and reserved ₹${tr.estimatedBudget} against Cost Center`
    });
  }

  static async cancelTravelRequest(
    companyId: string,
    tr: TravelRequestRecord,
    actor: { uid: string; name: string; role: string }
  ): Promise<void> {
    await runTransaction(db, async (transaction) => {
      const trRef = doc(db, 'companies', companyId, 'travelRequests', tr.id);
      const trDoc = await transaction.get(trRef);
      if (!trDoc.exists()) throw new Error('Travel request not found');

      const trData = trDoc.data() as TravelRequestRecord;
      const currentStatus = trData.status;
      if (currentStatus === 'CANCELLED') return;

      const costCenterId = tr.costCenterId || trData.costCenterId;
      const holdToRelease = Number(trData.budgetReservedAmount ?? trData.estimatedBudget ?? 0);

      // If it had an approved budget hold, release it back to the Cost Center
      if (currentStatus === 'APPROVED' && costCenterId && holdToRelease > 0) {
        const ccRef = doc(db, 'companies', companyId, 'cost_centres', costCenterId);
        const ccDoc = await transaction.get(ccRef);
        if (ccDoc.exists()) {
          const ccData = ccDoc.data();
          const currentReserved = Number(ccData.budgetReserved) || 0;
          transaction.update(ccRef, {
            budgetReserved: Math.max(0, currentReserved - holdToRelease),
            updatedAt: new Date().toISOString()
          });
        }
      }

      transaction.update(trRef, {
        status: 'CANCELLED',
        budgetReservedAmount: 0,
        cancelledAt: new Date().toISOString(),
        cancelledBy: actor.uid,
        updatedAt: new Date().toISOString()
      });
    });

    const AuditTrailService = (await import('./auditTrailService')).AuditTrailService;
    await AuditTrailService.recordEvent({
      companyId,
      actorUid: actor.uid,
      module: 'EXPENSE',
      action: 'CANCEL',
      entity: 'TRAVEL_REQUEST',
      entityId: tr.id,
      details: `Cancelled travel request "${tr.purpose}" and released budget hold`
    });
  }

  static async rejectTravelRequest(
    companyId: string,
    tr: TravelRequestRecord,
    actor: { uid: string; name: string; role: string },
    rejectionReason?: string
  ): Promise<void> {
    await runTransaction(db, async (transaction) => {
      const trRef = doc(db, 'companies', companyId, 'travelRequests', tr.id);
      const trDoc = await transaction.get(trRef);
      if (!trDoc.exists()) throw new Error('Travel request not found');

      const trData = trDoc.data() as TravelRequestRecord;
      const currentStatus = trData.status;
      if (currentStatus === 'REJECTED') return;

      const costCenterId = tr.costCenterId || trData.costCenterId;
      const holdToRelease = Number(trData.budgetReservedAmount ?? trData.estimatedBudget ?? 0);

      // If rejecting an already approved request, release the hold
      if (currentStatus === 'APPROVED' && costCenterId && holdToRelease > 0) {
        const ccRef = doc(db, 'companies', companyId, 'cost_centres', costCenterId);
        const ccDoc = await transaction.get(ccRef);
        if (ccDoc.exists()) {
          const ccData = ccDoc.data();
          const currentReserved = Number(ccData.budgetReserved) || 0;
          transaction.update(ccRef, {
            budgetReserved: Math.max(0, currentReserved - holdToRelease),
            updatedAt: new Date().toISOString()
          });
        }
      }

      transaction.update(trRef, {
        status: 'REJECTED',
        budgetReservedAmount: 0,
        rejectionReason: rejectionReason || 'Travel request rejected by approver',
        rejectedAt: new Date().toISOString(),
        approverId: actor.uid,
        updatedAt: new Date().toISOString()
      });
    });

    const AuditTrailService = (await import('./auditTrailService')).AuditTrailService;
    await AuditTrailService.recordEvent({
      companyId,
      actorUid: actor.uid,
      module: 'EXPENSE',
      action: 'REJECT',
      entity: 'TRAVEL_REQUEST',
      entityId: tr.id,
      details: `Rejected travel request "${tr.purpose}"${rejectionReason ? `: ${rejectionReason}` : ''}`
    });
  }

  static async saveTravelRequest(
    companyId: string,
    travelData: Partial<TravelRequestRecord>,
    actor: { uid: string; name: string; role: string }
  ): Promise<TravelRequestRecord> {
    const isNew = !travelData.id;
    const docRef = isNew 
      ? doc(collection(db, 'companies', companyId, 'travelRequests'))
      : doc(db, 'companies', companyId, 'travelRequests', travelData.id!);

    const record: TravelRequestRecord = {
      id: docRef.id,
      companyId,
      employeeId: travelData.employeeId || actor.uid,
      employeeName: travelData.employeeName || actor.name,
      costCenterId: travelData.costCenterId || '',
      purpose: travelData.purpose || 'Site Inspection & Supervisor Audit',
      originCity: travelData.originCity || 'Mumbai',
      destinationCity: travelData.destinationCity || 'Pune',
      departureDate: travelData.departureDate || new Date().toISOString().split('T')[0],
      returnDate: travelData.returnDate || new Date(Date.now() + 2*86400000).toISOString().split('T')[0],
      estimatedBudget: Number(travelData.estimatedBudget) || 5000,
      advanceRequestedAmount: Number(travelData.advanceRequestedAmount) || 0,
      advanceDisbursed: !!travelData.advanceDisbursed,
      status: travelData.status || 'SUBMITTED',
      createdAt: travelData.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await setDoc(docRef, record, { merge: true });
    await AuditTrailService.recordEvent({
      companyId,
      actorUid: actor.uid,
      actorName: actor.name,
      actorRole: actor.role,
      module: 'FINANCE',
      action: isNew ? 'TRAVEL_REQUEST_CREATED' : 'TRAVEL_REQUEST_UPDATED',
      entityId: docRef.id,
      description: `Travel authorization for ${record.employeeName} to ${record.destinationCity} (Budget ₹${record.estimatedBudget})`
    });

    return record;
  }

  // -------------------------------------------------------------
  // EXPENSE POLICIES
  // -------------------------------------------------------------
  static async getExpensePolicy(companyId: string): Promise<ExpensePolicyRecord | null> {
    try {
      const docRef = doc(db, 'companies', companyId, 'expensePolicies', 'default');
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        return { id: snap.id, ...snap.data() } as ExpensePolicyRecord;
      }
      return null;
    } catch (err) {
      return null;
    }
  }

  static async saveExpensePolicy(
    companyId: string,
    policyData: Partial<ExpensePolicyRecord>,
    actor: { uid: string; name: string }
  ): Promise<ExpensePolicyRecord> {
    const docRef = doc(db, 'companies', companyId, 'expensePolicies', 'default');
    const record: ExpensePolicyRecord = {
      id: 'default',
      companyId,
      name: policyData.name || 'Standard Enterprise Facility Expense Policy',
      rules: policyData.rules || [
        { category: 'MEALS_FOOD', dailyCapAmount: 600, receiptRequiredThreshold: 200, allowedRoleLevels: ['ALL'] },
        { category: 'LODGING', dailyCapAmount: 2500, receiptRequiredThreshold: 500, allowedRoleLevels: ['ALL'] },
        { category: 'FUEL_MILEAGE', dailyCapAmount: 1200, receiptRequiredThreshold: 100, allowedRoleLevels: ['ALL'] }
      ],
      mileageRatePerKm: policyData.mileageRatePerKm || 9.5,
      perDiemAllowancePerDay: policyData.perDiemAllowancePerDay || 450,
      isActive: true,
      updatedAt: new Date().toISOString()
    };

    await setDoc(docRef, record, { merge: true });
    return record;
  }

  // -------------------------------------------------------------
  // AI OCR RECEIPT PARSER (FAIL-CLOSED TO MANUAL REVIEW)
  // -------------------------------------------------------------
  static async processReceiptOcr(
    imageBase64: string,
    mimeType: string = 'image/jpeg'
  ): Promise<{
    success: boolean;
    data?: Partial<ExpenseReceiptItem>;
    requiresManualReview: boolean;
    manualReviewReason?: string;
    ocrExtractionStatus: 'SUCCESS' | 'LOW_CONFIDENCE' | 'FAILED_MANUAL_REVIEW_REQUIRED';
    confidenceScore: number;
    error?: string;
  }> {
    try {
      const response = await fetch('/api/expense/ocr-receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64, mimeType })
      });

      if (!response.ok) {
        return {
          success: false,
          requiresManualReview: true,
          manualReviewReason: `Server OCR processing returned HTTP ${response.status}. Approver manual check mandatory.`,
          ocrExtractionStatus: 'FAILED_MANUAL_REVIEW_REQUIRED',
          confidenceScore: 0,
          error: `HTTP_${response.status}`
        };
      }

      const result = await response.json();
      if (!result.success || !result.data) {
        return {
          success: false,
          requiresManualReview: true,
          manualReviewReason: result.manualReviewReason || 'OCR extraction unverified. Approver manual verification mandatory.',
          ocrExtractionStatus: 'FAILED_MANUAL_REVIEW_REQUIRED',
          confidenceScore: 0,
          error: result.error || 'EXTRACTION_FAILED'
        };
      }

      return {
        success: true,
        data: {
          category: result.data.category,
          amount: result.data.totalAmount,
          taxAmount: result.data.taxAmount,
          currency: result.data.currency || 'INR',
          expenseDate: result.data.expenseDate,
          merchantName: result.data.merchantName,
          merchantGstin: result.data.merchantGstin,
          description: result.data.description,
          ocrExtracted: true,
          ocrConfidenceScore: result.data.confidenceScore,
          ocrExtractionStatus: result.data.ocrExtractionStatus,
          requiresManualReview: result.data.requiresManualReview,
          manualReviewReason: result.data.manualReviewReason
        },
        requiresManualReview: result.data.requiresManualReview,
        manualReviewReason: result.data.manualReviewReason,
        ocrExtractionStatus: result.data.ocrExtractionStatus,
        confidenceScore: result.data.confidenceScore
      };
    } catch (networkErr: any) {
      console.error('[ExpenseService] OCR API network error:', networkErr);
      // STRICT REQUIREMENT: Fail closed to manual review. Never simulate fake data!
      return {
        success: false,
        requiresManualReview: true,
        manualReviewReason: 'OCR network dispatch failed. Manual verification of invoice required.',
        ocrExtractionStatus: 'FAILED_MANUAL_REVIEW_REQUIRED',
        confidenceScore: 0,
        error: networkErr?.message || 'NETWORK_FAILURE'
      };
    }
  }
}
