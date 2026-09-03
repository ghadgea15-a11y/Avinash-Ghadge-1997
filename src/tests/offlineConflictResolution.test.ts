import { describe, it, expect, beforeEach } from 'vitest';
import { OfflineConflictResolutionEngine } from '../services/offlineConflictResolutionEngine';
import { TrainingEnrollmentRecord } from '../types';
import { ExpenseClaimRecord } from '../types/expense';

describe('OfflineConflictResolutionEngine', () => {

  describe('LMS Quiz & Assessment Conflict Resolution', () => {
    it('should prioritize anti-cheat clean submission over a flagged submission with excessive violations', () => {
      const serverFlaggedRecord: Partial<TrainingEnrollmentRecord> = {
        id: 'ENR-101',
        employeeId: 'EMP-01',
        scoreObtained: 95,
        antiCheatViolationCount: 5,
        resultStatus: 'FAILED'
      };

      const incomingCleanRecord: Partial<TrainingEnrollmentRecord> = {
        id: 'ENR-101',
        employeeId: 'EMP-01',
        scoreObtained: 85,
        antiCheatViolationCount: 0,
        resultStatus: 'PASSED'
      };

      const result = OfflineConflictResolutionEngine.resolveLmsQuizConflict(
        serverFlaggedRecord,
        incomingCleanRecord
      );

      expect(result.conflictDetected).toBe(true);
      expect(result.resolutionRule).toBe('ANTI_CHEAT_INTEGRITY_PRECEDENCE');
      expect(result.winningRecord.antiCheatViolationCount).toBe(0);
      expect(result.winningRecord.scoreObtained).toBe(85);
      expect(result.winningRecord.resultStatus).toBe('PASSED');
    });

    it('should select higher score when both submissions have clean anti-cheat records', () => {
      const serverRecord: Partial<TrainingEnrollmentRecord> = {
        id: 'ENR-102',
        employeeId: 'EMP-02',
        scoreObtained: 72,
        antiCheatViolationCount: 0,
        resultStatus: 'PASSED'
      };

      const incomingRecord: Partial<TrainingEnrollmentRecord> = {
        id: 'ENR-102',
        employeeId: 'EMP-02',
        scoreObtained: 92,
        antiCheatViolationCount: 0,
        resultStatus: 'PASSED'
      };

      const result = OfflineConflictResolutionEngine.resolveLmsQuizConflict(
        serverRecord,
        incomingRecord
      );

      expect(result.conflictDetected).toBe(true);
      expect(result.resolutionRule).toBe('HIGHEST_SCORE_PRECEDENCE');
      expect(result.winningRecord.scoreObtained).toBe(92);
      expect(result.suppressedRecord?.scoreObtained).toBe(72);
    });

    it('should return IDEMPOTENT_NOOP when scores and anti-cheat counts are identical', () => {
      const serverRecord: Partial<TrainingEnrollmentRecord> = {
        id: 'ENR-103',
        employeeId: 'EMP-03',
        scoreObtained: 88,
        antiCheatViolationCount: 1,
        resultStatus: 'PASSED'
      };

      const incomingRecord: Partial<TrainingEnrollmentRecord> = {
        id: 'ENR-103',
        employeeId: 'EMP-03',
        scoreObtained: 88,
        antiCheatViolationCount: 1,
        resultStatus: 'PASSED'
      };

      const result = OfflineConflictResolutionEngine.resolveLmsQuizConflict(
        serverRecord,
        incomingRecord
      );

      expect(result.conflictDetected).toBe(false);
      expect(result.resolutionRule).toBe('IDEMPOTENT_NOOP');
    });
  });

  describe('Expense Claim & Attachment Conflict Resolution', () => {
    it('should block offline mutation if server record has already reached terminal APPROVED or DISBURSED status', () => {
      const serverApprovedClaim: Partial<ExpenseClaimRecord> = {
        id: 'EXP-501',
        employeeId: 'EMP-10',
        status: 'APPROVED',
        totalAmount: 1500,
        items: [
          {
            id: 'ITM-1',
            category: 'TRAVEL',
            amount: 1500,
            date: '2026-09-01',
            receiptUrl: 'https://storage/receipt1.jpg'
          }
        ]
      };

      const incomingOfflineClaim: Partial<ExpenseClaimRecord> = {
        id: 'EXP-501',
        employeeId: 'EMP-10',
        status: 'SUBMITTED',
        totalAmount: 2500,
        items: [
          {
            id: 'ITM-1',
            category: 'TRAVEL',
            amount: 1500,
            date: '2026-09-01'
          },
          {
            id: 'ITM-2',
            category: 'MEALS',
            amount: 1000,
            date: '2026-09-01'
          }
        ]
      };

      const result = OfflineConflictResolutionEngine.resolveExpenseAttachmentConflict(
        serverApprovedClaim,
        incomingOfflineClaim
      );

      expect(result.conflictDetected).toBe(true);
      expect(result.resolutionRule).toBe('FINAL_APPROVAL_TERMINAL_IMMUTABILITY');
      expect(result.winningRecord.status).toBe('APPROVED');
      expect(result.winningRecord.totalAmount).toBe(1500);
      expect(result.winningRecord.items?.length).toBe(1);
    });

    it('should merge receipt attachments union, recalculate totals, and preserve fail-closed manual review requirement', () => {
      const serverDraftClaim: Partial<ExpenseClaimRecord> = {
        id: 'EXP-502',
        employeeId: 'EMP-20',
        status: 'SUBMITTED',
        totalAmount: 1200,
        requiresManualReview: false,
        items: [
          {
            id: 'ITM-A',
            category: 'CAB_FARE',
            amount: 1200,
            taxAmount: 60,
            date: '2026-09-01',
            receiptUrl: 'https://storage/cab.jpg',
            ocrExtracted: true,
            ocrConfidenceScore: 0.95
          }
        ]
      };

      const incomingOfflineClaim: Partial<ExpenseClaimRecord> = {
        id: 'EXP-502',
        employeeId: 'EMP-20',
        status: 'SUBMITTED',
        items: [
          {
            id: 'ITM-A',
            category: 'CAB_FARE',
            amount: 1200,
            taxAmount: 60,
            date: '2026-09-01',
            receiptUrl: 'https://storage/cab.jpg',
            ocrExtracted: true,
            ocrConfidenceScore: 0.95
          },
          {
            id: 'ITM-B',
            category: 'HOTEL',
            amount: 3400,
            taxAmount: 408,
            date: '2026-09-02',
            receiptUrl: 'https://storage/hotel_low_ocr.jpg',
            ocrExtracted: true,
            ocrConfidenceScore: 0.62, // Low OCR confidence requires manual review
            ocrExtractionStatus: 'LOW_CONFIDENCE',
            requiresManualReview: true,
            manualReviewReason: 'Blurry hotel bill requires manual approver inspection'
          }
        ]
      };

      const result = OfflineConflictResolutionEngine.resolveExpenseAttachmentConflict(
        serverDraftClaim,
        incomingOfflineClaim
      );

      expect(result.conflictDetected).toBe(true);
      expect(result.resolutionRule).toBe('ATTACHMENT_UNION_AND_OCR_REVIEW_PRESERVATION');
      expect(result.winningRecord.items?.length).toBe(2);
      expect(result.winningRecord.totalAmount).toBe(4600); // 1200 + 3400
      expect(result.winningRecord.totalTaxAmount).toBe(468); // 60 + 408
      expect(result.winningRecord.requiresManualReview).toBe(true);
      expect(result.winningRecord.manualReviewReason).toContain('Blurry hotel bill');
    });
  });
});
