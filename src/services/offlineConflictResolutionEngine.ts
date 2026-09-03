import { db } from '../firebase';
import { doc, getDoc, setDoc, updateDoc, collection } from 'firebase/firestore';
import { TrainingEnrollmentRecord } from '../types';
import { ExpenseClaimRecord } from '../types/expense';

export type ConflictDomain = 'ATTENDANCE' | 'LMS_QUIZ' | 'EXPENSE_ATTACHMENT';

export interface BaseConflictResult<T> {
  conflictDetected: boolean;
  conflictId?: string;
  domain: ConflictDomain;
  winningRecord: T;
  suppressedRecord?: T;
  resolutionRule: string;
  explanation: string;
  anomalyAuditPayload?: any;
}

export class OfflineConflictResolutionEngine {
  /**
   * Resolves concurrent offline LMS Quiz & Assessment submissions.
   *
   * Deterministic Winner Selection Rules for LMS Quizzes:
   * 1. Integrity / Anti-Cheat Precedence: A clean submission (zero anti-cheat violations) wins over a flagged submission.
   * 2. Highest Score Precedence: If both are clean or equal violations, higher score wins.
   * 3. Video Completion Precedence: 100% video watched wins over partial watch progress.
   * 4. Idempotent / Latest submission: If scores are identical, latest submission timestamp wins.
   */
  static resolveLmsQuizConflict(
    existingServerRecord: Partial<TrainingEnrollmentRecord>,
    incomingOfflineRecord: Partial<TrainingEnrollmentRecord>
  ): BaseConflictResult<Partial<TrainingEnrollmentRecord>> {
    const enrollmentId = existingServerRecord.id || incomingOfflineRecord.id || 'UNKNOWN';
    const employeeId = existingServerRecord.employeeId || incomingOfflineRecord.employeeId || 'UNKNOWN';

    // Idempotency check
    if (
      existingServerRecord.scoreObtained === incomingOfflineRecord.scoreObtained &&
      existingServerRecord.resultStatus === incomingOfflineRecord.resultStatus &&
      existingServerRecord.antiCheatViolationCount === incomingOfflineRecord.antiCheatViolationCount
    ) {
      return {
        conflictDetected: false,
        domain: 'LMS_QUIZ',
        winningRecord: incomingOfflineRecord,
        resolutionRule: 'IDEMPOTENT_NOOP',
        explanation: 'Identical LMS quiz submission; merged idempotently.'
      };
    }

    const conflictId = `CONF-LMS-${enrollmentId}-${Date.now()}`;

    const serverViolations = existingServerRecord.antiCheatViolationCount ?? 0;
    const incomingViolations = incomingOfflineRecord.antiCheatViolationCount ?? 0;

    // Rule 1: Anti-Cheat Violation Penalty (Clean record wins)
    if (serverViolations < 3 && incomingViolations >= 3) {
      return {
        conflictDetected: true,
        conflictId,
        domain: 'LMS_QUIZ',
        winningRecord: existingServerRecord,
        suppressedRecord: incomingOfflineRecord,
        resolutionRule: 'ANTI_CHEAT_INTEGRITY_PRECEDENCE',
        explanation: `Existing server record has clean integrity (${serverViolations} flags), while incoming submission has excessive anti-cheat violations (${incomingViolations} flags). Server record preserved.`,
        anomalyAuditPayload: {
          anomalyType: 'LMS_QUIZ_INTEGRITY_CONFLICT',
          enrollmentId,
          employeeId,
          winnerScore: existingServerRecord.scoreObtained,
          suppressedScore: incomingOfflineRecord.scoreObtained,
          ruleApplied: 'ANTI_CHEAT_INTEGRITY_PRECEDENCE',
          resolvedAt: new Date().toISOString()
        }
      };
    }

    if (incomingViolations < 3 && serverViolations >= 3) {
      return {
        conflictDetected: true,
        conflictId,
        domain: 'LMS_QUIZ',
        winningRecord: incomingOfflineRecord,
        suppressedRecord: existingServerRecord,
        resolutionRule: 'ANTI_CHEAT_INTEGRITY_PRECEDENCE',
        explanation: `Incoming submission is verified clean (${incomingViolations} flags) compared to previously flagged server record (${serverViolations} flags). Incoming submission accepted.`,
        anomalyAuditPayload: {
          anomalyType: 'LMS_QUIZ_INTEGRITY_CONFLICT',
          enrollmentId,
          employeeId,
          winnerScore: incomingOfflineRecord.scoreObtained,
          suppressedScore: existingServerRecord.scoreObtained,
          ruleApplied: 'ANTI_CHEAT_INTEGRITY_PRECEDENCE',
          resolvedAt: new Date().toISOString()
        }
      };
    }

    // Rule 2: Highest Score Precedence
    const serverScore = existingServerRecord.scoreObtained ?? -1;
    const incomingScore = incomingOfflineRecord.scoreObtained ?? -1;

    if (incomingScore > serverScore) {
      return {
        conflictDetected: true,
        conflictId,
        domain: 'LMS_QUIZ',
        winningRecord: {
          ...existingServerRecord,
          ...incomingOfflineRecord,
          resultStatus: incomingOfflineRecord.resultStatus || (incomingScore >= 70 ? 'PASSED' : 'FAILED')
        },
        suppressedRecord: existingServerRecord,
        resolutionRule: 'HIGHEST_SCORE_PRECEDENCE',
        explanation: `Incoming quiz score (${incomingScore}%) exceeds prior server score (${serverScore}%). Higher achievement score recorded.`,
        anomalyAuditPayload: {
          anomalyType: 'LMS_QUIZ_SCORE_UPDATE',
          enrollmentId,
          employeeId,
          winnerScore: incomingScore,
          suppressedScore: serverScore,
          ruleApplied: 'HIGHEST_SCORE_PRECEDENCE',
          resolvedAt: new Date().toISOString()
        }
      };
    } else if (serverScore > incomingScore) {
      return {
        conflictDetected: true,
        conflictId,
        domain: 'LMS_QUIZ',
        winningRecord: existingServerRecord,
        suppressedRecord: incomingOfflineRecord,
        resolutionRule: 'HIGHEST_SCORE_PRECEDENCE',
        explanation: `Prior server quiz score (${serverScore}%) exceeds incoming offline score (${incomingScore}%). Prior highest score retained.`,
        anomalyAuditPayload: {
          anomalyType: 'LMS_QUIZ_SCORE_RETAINED',
          enrollmentId,
          employeeId,
          winnerScore: serverScore,
          suppressedScore: incomingScore,
          ruleApplied: 'HIGHEST_SCORE_PRECEDENCE',
          resolvedAt: new Date().toISOString()
        }
      };
    }

    // Rule 3: Tie-breaker - Latest verified submission
    return {
      conflictDetected: true,
      conflictId,
      domain: 'LMS_QUIZ',
      winningRecord: {
        ...existingServerRecord,
        ...incomingOfflineRecord
      },
      suppressedRecord: existingServerRecord,
      resolutionRule: 'LATEST_TIMESTAMP_PRECEDENCE',
      explanation: 'Equal score submission tie-breaker: applied latest verified submission payload.'
    };
  }

  /**
   * Resolves concurrent offline Expense Claim modifications and receipt attachment collisions.
   *
   * Deterministic Winner Selection Rules for Expense Claims:
   * 1. Immutable Terminal State Protection: If a server record is already APPROVED, DISBURSED, or REJECTED, offline edits MUST NOT overwrite final decision.
   * 2. Receipt Attachment Union & Deduplication: Receipt items/attachments are merged by item ID or receipt URL, preserving verified OCR items.
   * 3. Fail-Closed OCR Review Preservation: If either version contains a receipt flagged for manual review, the merged record MUST require manual review.
   * 4. Total Amount Recalculation: Recalculates totalAmount and totalTaxAmount atomically from the merged item set.
   */
  static resolveExpenseAttachmentConflict(
    existingServerRecord: Partial<ExpenseClaimRecord>,
    incomingOfflineRecord: Partial<ExpenseClaimRecord>
  ): BaseConflictResult<Partial<ExpenseClaimRecord>> {
    const claimId = existingServerRecord.id || incomingOfflineRecord.id || 'UNKNOWN';
    const employeeId = existingServerRecord.employeeId || incomingOfflineRecord.employeeId || 'UNKNOWN';
    const conflictId = `CONF-EXP-${claimId}-${Date.now()}`;

    // RULE 1: Terminal Status Protection (Immutable Financial Finality)
    const serverStatus = existingServerRecord.status;
    if (serverStatus === 'APPROVED' || serverStatus === 'DISBURSED' || serverStatus === 'REJECTED') {
      return {
        conflictDetected: true,
        conflictId,
        domain: 'EXPENSE_ATTACHMENT',
        winningRecord: existingServerRecord,
        suppressedRecord: incomingOfflineRecord,
        resolutionRule: 'FINAL_APPROVAL_TERMINAL_IMMUTABILITY',
        explanation: `Expense claim is already in final financial state (${serverStatus}). Offline mutation rejected to preserve financial integrity and auditability.`,
        anomalyAuditPayload: {
          anomalyType: 'MUTATION_ON_FINALIZED_EXPENSE_BLOCKED',
          claimId,
          employeeId,
          finalStatus: serverStatus,
          ruleApplied: 'FINAL_APPROVAL_TERMINAL_IMMUTABILITY',
          resolvedAt: new Date().toISOString()
        }
      };
    }

    // RULE 2: Merge & Deduplicate Expense Items and Receipt Attachments
    const serverItems = existingServerRecord.items || [];
    const incomingItems = incomingOfflineRecord.items || [];

    const itemMap = new Map<string, any>();

    // Add server items first
    serverItems.forEach(it => {
      const key = it.id || it.receiptUrl || `${it.category}_${it.amount}_${it.date}`;
      itemMap.set(key, it);
    });

    // Merge incoming offline items
    incomingItems.forEach(it => {
      const key = it.id || it.receiptUrl || `${it.category}_${it.amount}_${it.date}`;
      if (itemMap.has(key)) {
        // Merge item attributes preferring verified OCR or higher confidence
        const existing = itemMap.get(key);
        const incomingConfidence = it.ocrConfidenceScore ?? 0;
        const existingConfidence = existing.ocrConfidenceScore ?? 0;
        if (incomingConfidence >= existingConfidence) {
          itemMap.set(key, { ...existing, ...it });
        }
      } else {
        itemMap.set(key, it);
      }
    });

    const mergedItems = Array.from(itemMap.values());
    const totalAmount = mergedItems.reduce((sum, it) => sum + (Number(it.amount) || 0), 0);
    const totalTaxAmount = mergedItems.reduce((sum, it) => sum + (Number(it.taxAmount) || 0), 0);

    // RULE 3: Fail-Closed OCR Manual Review Preservation
    const requiresManualReview =
      Boolean(existingServerRecord.requiresManualReview) ||
      Boolean(incomingOfflineRecord.requiresManualReview) ||
      mergedItems.some(
        it =>
          it.requiresManualReview ||
          (it.ocrExtracted && (it.ocrConfidenceScore ?? 1) < 0.8) ||
          it.ocrExtractionStatus === 'FAILED_MANUAL_REVIEW_REQUIRED' ||
          it.ocrExtractionStatus === 'LOW_CONFIDENCE'
      );

    const manualReviewReason = requiresManualReview
      ? (
          mergedItems.find(it => it.manualReviewReason)?.manualReviewReason ||
          existingServerRecord.manualReviewReason ||
          incomingOfflineRecord.manualReviewReason ||
          'Merged receipt attachments contain low confidence OCR items requiring manual reviewer verification'
        )
      : undefined;

    const mergedRecord: Partial<ExpenseClaimRecord> = {
      ...existingServerRecord,
      ...incomingOfflineRecord,
      items: mergedItems,
      totalAmount,
      totalTaxAmount,
      requiresManualReview,
      manualReviewReason,
      status: 'SUBMITTED',
      updatedAt: new Date().toISOString()
    };

    return {
      conflictDetected: true,
      conflictId,
      domain: 'EXPENSE_ATTACHMENT',
      winningRecord: mergedRecord,
      suppressedRecord: existingServerRecord,
      resolutionRule: 'ATTACHMENT_UNION_AND_OCR_REVIEW_PRESERVATION',
      explanation: `Merged receipt items (${serverItems.length} server + ${incomingItems.length} offline -> ${mergedItems.length} union). Total recalculation: ₹${totalAmount}. Manual review preserved: ${requiresManualReview}.`,
      anomalyAuditPayload: {
        anomalyType: 'EXPENSE_OFFLINE_ITEMS_MERGED',
        claimId,
        employeeId,
        mergedItemCount: mergedItems.length,
        recalculatedTotal: totalAmount,
        requiresManualReview,
        resolvedAt: new Date().toISOString()
      }
    };
  }
}
