import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy 
} from 'firebase/firestore';
import { db } from '../firebase';
import { 
  PerformanceGoalRecord, 
  AppraisalCycleRecord, 
  AppraisalReviewRecord, 
  Feedback360RequestRecord, 
  PipRecord 
} from '../types/pms';
import { AuditTrailService } from './auditTrailService';
import { PushNotificationService } from './pushNotificationService';
import { BpmService } from './bpmService';

export class PmsService {
  // ============================================================
  // 1. GOAL & OKR MANAGEMENT
  // ============================================================

  static async getGoals(companyId: string, employeeId?: string, cycleId?: string): Promise<PerformanceGoalRecord[]> {
    try {
      const goalsRef = collection(db, 'companies', companyId, 'performanceGoals');
      let q = query(goalsRef);
      if (employeeId) {
        q = query(goalsRef, where('employeeId', '==', employeeId));
      } else if (cycleId) {
        q = query(goalsRef, where('cycleId', '==', cycleId));
      }
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as PerformanceGoalRecord));
    } catch (err) {
      console.warn('[PmsService] getGoals error:', err);
      return [];
    }
  }

  static async saveGoal(
    companyId: string, 
    goalData: Partial<PerformanceGoalRecord>, 
    actor: { uid: string; name: string; role: string }
  ): Promise<PerformanceGoalRecord> {
    const goalId = goalData.id || `GOAL-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
    const goalRef = doc(db, 'companies', companyId, 'performanceGoals', goalId);
    
    // Calculate total weighted progress
    let progressPercent = 0;
    if (goalData.keyResults && goalData.keyResults.length > 0) {
      const totalWeight = goalData.keyResults.reduce((sum, kr) => sum + (kr.weightage || 0), 0) || 100;
      const weightedSum = goalData.keyResults.reduce((sum, kr) => {
        const target = kr.targetMetric || 1;
        const current = Math.min(kr.currentMetric || 0, target);
        const krProgress = (current / target) * 100;
        return sum + (krProgress * ((kr.weightage || (100 / goalData.keyResults!.length)) / totalWeight));
      }, 0);
      progressPercent = Math.min(100, Math.round(weightedSum));
    }

    const now = new Date().toISOString();
    const finalRecord: PerformanceGoalRecord = {
      id: goalId,
      companyId,
      employeeId: goalData.employeeId || actor.uid,
      employeeName: goalData.employeeName || actor.name,
      departmentId: goalData.departmentId || '',
      siteId: goalData.siteId || '',
      regionId: goalData.regionId || '',
      cycleId: goalData.cycleId || 'CYCLE-DEFAULT',
      title: goalData.title || 'Untitled Goal',
      description: goalData.description || '',
      category: goalData.category || 'INDIVIDUAL',
      alignedParentGoalId: goalData.alignedParentGoalId || undefined,
      weightage: goalData.weightage || 20,
      keyResults: goalData.keyResults || [],
      status: progressPercent >= 100 ? 'COMPLETED' : (goalData.status || 'IN_PROGRESS'),
      progressPercent,
      startDate: goalData.startDate || now.split('T')[0],
      dueDate: goalData.dueDate || now.split('T')[0],
      managerComment: goalData.managerComment || '',
      selfRating: goalData.selfRating || undefined,
      managerRating: goalData.managerRating || undefined,
      calibratedRating: goalData.calibratedRating || undefined,
      createdAt: goalData.createdAt || now,
      updatedAt: now,
      createdBy: goalData.createdBy || actor.uid
    };

    await setDoc(goalRef, finalRecord, { merge: true });

    // Immutable Audit Log
    await AuditTrailService.recordEvent({
      companyId,
      actorUid: actor.uid,
      actorName: actor.name,
      actorRole: (actor as any).role || 'ADMIN',
      module: 'PERFORMANCE_MANAGEMENT',
      action: goalData.id ? 'UPDATE_GOAL' : 'CREATE_GOAL',
      description: `Goal "${finalRecord.title}" ${goalData.id ? 'updated' : 'created'} for ${finalRecord.employeeName}. Progress: ${progressPercent}%`,
      metadata: { goalId, progressPercent, weightage: finalRecord.weightage }
    });

    return finalRecord;
  }

  // ============================================================
  // 2. APPRAISAL CYCLES
  // ============================================================

  static async getAppraisalCycles(companyId: string): Promise<AppraisalCycleRecord[]> {
    try {
      const cyclesRef = collection(db, 'companies', companyId, 'appraisalCycles');
      const snap = await getDocs(cyclesRef);
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as AppraisalCycleRecord));
    } catch (err) {
      console.warn('[PmsService] getAppraisalCycles error:', err);
      return [];
    }
  }

  static async saveAppraisalCycle(
    companyId: string, 
    cycle: Partial<AppraisalCycleRecord>, 
    actor: { uid: string; name: string }
  ): Promise<AppraisalCycleRecord> {
    const cycleId = cycle.id || `CYC-${Date.now()}`;
    const cycleRef = doc(db, 'companies', companyId, 'appraisalCycles', cycleId);
    const now = new Date().toISOString();

    const record: AppraisalCycleRecord = {
      id: cycleId,
      companyId,
      name: cycle.name || 'Annual Performance Cycle',
      frequency: cycle.frequency || 'ANNUAL',
      fiscalYear: cycle.fiscalYear || '2026-2027',
      startDate: cycle.startDate || now.split('T')[0],
      endDate: cycle.endDate || now.split('T')[0],
      selfReviewDeadline: cycle.selfReviewDeadline || now.split('T')[0],
      managerReviewDeadline: cycle.managerReviewDeadline || now.split('T')[0],
      calibrationDeadline: cycle.calibrationDeadline || now.split('T')[0],
      status: cycle.status || 'ACTIVE',
      applicableDepartmentIds: cycle.applicableDepartmentIds || [],
      applicableDesignationIds: cycle.applicableDesignationIds || [],
      totalEligibleEmployees: cycle.totalEligibleEmployees || 0,
      completedReviewsCount: cycle.completedReviewsCount || 0,
      bellCurveTargetDistribution: cycle.bellCurveTargetDistribution || {
        exceptional5: 10,
        exceeds4: 25,
        meets3: 50,
        needsImprovement2: 10,
        unsatisfactory1: 5
      },
      createdAt: cycle.createdAt || now,
      updatedAt: now,
      createdBy: cycle.createdBy || actor.uid
    };

    await setDoc(cycleRef, record, { merge: true });

    // Log & Alert
    await AuditTrailService.recordEvent({
      companyId,
      actorUid: actor.uid,
      actorName: actor.name,
      actorRole: (actor as any).role || 'ADMIN',
      module: 'PERFORMANCE_MANAGEMENT',
      action: cycle.id ? 'UPDATE_APPRAISAL_CYCLE' : 'CREATE_APPRAISAL_CYCLE',
      description: `Appraisal Cycle "${record.name}" [${record.status}] saved.`,
      metadata: { cycleId }
    });

    return record;
  }

  // ============================================================
  // 3. APPRAISAL REVIEWS & WORKFLOW INTEGRATION
  // ============================================================

  static async getAppraisalReviews(companyId: string, cycleId?: string, employeeId?: string): Promise<AppraisalReviewRecord[]> {
    try {
      const revRef = collection(db, 'companies', companyId, 'appraisalReviews');
      let q = query(revRef);
      if (cycleId) q = query(revRef, where('cycleId', '==', cycleId));
      if (employeeId) q = query(revRef, where('employeeId', '==', employeeId));
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as AppraisalReviewRecord));
    } catch (err) {
      console.warn('[PmsService] getAppraisalReviews error:', err);
      return [];
    }
  }

  static async submitReviewStage(
    companyId: string,
    reviewData: Partial<AppraisalReviewRecord>,
    stageToAdvance: 'SELF' | 'MANAGER' | 'SKIP_LEVEL' | 'CALIBRATION' | 'FINAL_SIGN_OFF',
    actor: { uid: string; name: string; role: string }
  ): Promise<AppraisalReviewRecord> {
    const reviewId = reviewData.id || `REV-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const reviewRef = doc(db, 'companies', companyId, 'appraisalReviews', reviewId);
    const now = new Date().toISOString();

    let nextStage = reviewData.stage || 'SELF';
    if (stageToAdvance === 'SELF') nextStage = 'MANAGER';
    else if (stageToAdvance === 'MANAGER') nextStage = 'SKIP_LEVEL';
    else if (stageToAdvance === 'SKIP_LEVEL') nextStage = 'CALIBRATION';
    else if (stageToAdvance === 'CALIBRATION') nextStage = 'FINAL_SIGN_OFF';
    else if (stageToAdvance === 'FINAL_SIGN_OFF') nextStage = 'CLOSED';

    // Calculate rating score average
    const comps = reviewData.competencyScores || [];
    const compAvg = comps.length > 0
      ? comps.reduce((sum, c) => sum + (c.managerScore || c.selfScore || 3), 0) / comps.length
      : 3;

    // Performance-to-Payroll Advisory Recommendation
    const rating = reviewData.finalCalibratedRating || reviewData.managerOverallRating || reviewData.selfOverallRating || 3;
    const bonusMultiplier = rating >= 4.5 ? 1.5 : (rating >= 4.0 ? 1.2 : (rating >= 3.0 ? 1.0 : 0.5));
    const incrementPct = rating >= 4.5 ? 15 : (rating >= 4.0 ? 10 : (rating >= 3.0 ? 6 : 0));

    const finalRecord: AppraisalReviewRecord = {
      id: reviewId,
      companyId,
      cycleId: reviewData.cycleId || 'CYC-ANNUAL',
      cycleName: reviewData.cycleName || 'Annual Appraisal',
      employeeId: reviewData.employeeId || actor.uid,
      employeeName: reviewData.employeeName || actor.name,
      departmentId: reviewData.departmentId || '',
      siteId: reviewData.siteId || '',
      regionId: reviewData.regionId || '',
      designationId: reviewData.designationId || '',
      primaryManagerId: reviewData.primaryManagerId || '',
      skipLevelManagerId: reviewData.skipLevelManagerId || '',
      stage: nextStage,
      goalScoreWeighted: reviewData.goalScoreWeighted || 3.5,
      competencyScores: comps,
      competencyScoreAverage: Number(compAvg.toFixed(2)),
      selfOverallRating: reviewData.selfOverallRating || 0,
      selfFeedbackNotes: reviewData.selfFeedbackNotes || '',
      selfSubmittedAt: stageToAdvance === 'SELF' ? now : reviewData.selfSubmittedAt,
      managerOverallRating: reviewData.managerOverallRating || 0,
      managerFeedbackNotes: reviewData.managerFeedbackNotes || '',
      managerSubmittedAt: stageToAdvance === 'MANAGER' ? now : reviewData.managerSubmittedAt,
      skipLevelOverallRating: reviewData.skipLevelOverallRating || undefined,
      skipLevelNotes: reviewData.skipLevelNotes || undefined,
      skipLevelSubmittedAt: stageToAdvance === 'SKIP_LEVEL' ? now : reviewData.skipLevelSubmittedAt,
      finalCalibratedRating: reviewData.finalCalibratedRating || rating,
      calibratedBy: stageToAdvance === 'CALIBRATION' ? actor.name : reviewData.calibratedBy,
      calibrationNotes: reviewData.calibrationNotes || '',
      calibratedAt: stageToAdvance === 'CALIBRATION' ? now : reviewData.calibratedAt,
      performanceBonusMultiplier: bonusMultiplier,
      recommendedIncrementPercent: incrementPct,
      payrollSyncStatus: reviewData.payrollSyncStatus || 'PENDING',
      createdAt: reviewData.createdAt || now,
      updatedAt: now
    };

    // BPM Workflow routing if stage advanced to FINAL_SIGN_OFF
    if (stageToAdvance === 'CALIBRATION' && !reviewData.bpmInstanceId) {
      try {
        const bpmInst = await BpmService.submitForApproval(companyId, actor.uid, 'APPRAISAL', reviewId, 'APPRAISAL_RATING_FINALIZATION', {
          workflowId: 'WF-APPRAISAL-SIGN-OFF',
          requesterName: actor.name,
          currentTier: 1,
          status: 'PENDING_APPROVAL',
          currentApprovers: ['A2_GENERAL_MANAGER', 'A3_HR_ADMIN']
        });
        if (bpmInst) {
          finalRecord.bpmInstanceId = bpmInst.id;
        }
      } catch (bpmErr) {
        console.warn('[PmsService] BPM integration fallback:', bpmErr);
      }
    }

    await setDoc(reviewRef, finalRecord, { merge: true });

    // Immutable Audit
    await AuditTrailService.recordEvent({
      companyId,
      actorUid: actor.uid,
      actorName: actor.name,
      actorRole: (actor as any).role || 'ADMIN',
      module: 'PERFORMANCE_MANAGEMENT',
      action: `APPRAISAL_STAGE_${stageToAdvance}`,
      description: `Appraisal for ${finalRecord.employeeName} advanced to ${nextStage}. Rating: ${finalRecord.finalCalibratedRating}`,
      metadata: { reviewId, stage: nextStage, rating: finalRecord.finalCalibratedRating }
    });

    return finalRecord;
  }

  // ============================================================
  // 4. 360° FEEDBACK ENGINE
  // ============================================================

  static async getFeedbackRequests(companyId: string, employeeId?: string): Promise<Feedback360RequestRecord[]> {
    try {
      const ref = collection(db, 'companies', companyId, 'feedbackRequests');
      const snap = await getDocs(ref);
      const all = snap.docs.map(d => ({ id: d.id, ...d.data() } as Feedback360RequestRecord));
      if (employeeId) {
        return all.filter(f => f.reviewerEmployeeId === employeeId || f.targetEmployeeId === employeeId);
      }
      return all;
    } catch (err) {
      console.warn('[PmsService] getFeedbackRequests error:', err);
      return [];
    }
  }

  static async createFeedbackRequest(
    companyId: string, 
    data: Partial<Feedback360RequestRecord>,
    actor: { uid: string; name: string }
  ): Promise<Feedback360RequestRecord> {
    const id = `F360-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const ref = doc(db, 'companies', companyId, 'feedbackRequests', id);
    const now = new Date().toISOString();

    const record: Feedback360RequestRecord = {
      id,
      companyId,
      cycleId: data.cycleId || 'CYC-ANNUAL',
      targetEmployeeId: data.targetEmployeeId || '',
      targetEmployeeName: data.targetEmployeeName || 'Target Employee',
      reviewerEmployeeId: data.reviewerEmployeeId || '',
      reviewerEmployeeName: data.reviewerEmployeeName || 'Reviewer',
      relationship: data.relationship || 'PEER',
      isAnonymous: data.isAnonymous ?? true,
      status: 'PENDING',
      requestedBy: actor.name,
      dueDate: data.dueDate || now.split('T')[0],
      createdAt: now
    };

    await setDoc(ref, record);
    return record;
  }

  static async submitFeedbackResponse(
    companyId: string,
    feedbackId: string,
    response: {
      strengths: string;
      areasOfImprovement: string;
      ratingScores: { teamwork: number; communication: number; leadership: number; operationalDiscipline: number };
    },
    actor: { uid: string; name: string }
  ): Promise<void> {
    const ref = doc(db, 'companies', companyId, 'feedbackRequests', feedbackId);
    const now = new Date().toISOString();

    await updateDoc(ref, {
      strengths: response.strengths,
      areasOfImprovement: response.areasOfImprovement,
      ratingScores: response.ratingScores,
      status: 'SUBMITTED',
      submittedAt: now
    });

    await AuditTrailService.recordEvent({
      companyId,
      actorUid: actor.uid,
      actorName: actor.name,
      actorRole: (actor as any).role || 'ADMIN',
      module: 'PERFORMANCE_MANAGEMENT',
      action: 'SUBMIT_360_FEEDBACK',
      description: `360 Feedback submitted for request ${feedbackId}`,
      metadata: { feedbackId }
    });
  }

  // ============================================================
  // 5. PERFORMANCE IMPROVEMENT PLAN (PIP)
  // ============================================================

  static async getPipRecords(companyId: string, employeeId?: string): Promise<PipRecord[]> {
    try {
      const ref = collection(db, 'companies', companyId, 'pipRecords');
      let q = query(ref);
      if (employeeId) q = query(ref, where('employeeId', '==', employeeId));
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as PipRecord));
    } catch (err) {
      console.warn('[PmsService] getPipRecords error:', err);
      return [];
    }
  }

  static async savePipRecord(
    companyId: string, 
    pipData: Partial<PipRecord>, 
    actor: { uid: string; name: string }
  ): Promise<PipRecord> {
    const id = pipData.id || `PIP-${Date.now()}`;
    const ref = doc(db, 'companies', companyId, 'pipRecords', id);
    const now = new Date().toISOString();

    const record: PipRecord = {
      id,
      companyId,
      employeeId: pipData.employeeId || '',
      employeeName: pipData.employeeName || '',
      departmentId: pipData.departmentId || '',
      siteId: pipData.siteId || '',
      regionId: pipData.regionId || '',
      supervisorId: pipData.supervisorId || actor.uid,
      supervisorName: pipData.supervisorName || actor.name,
      hrInChargeId: pipData.hrInChargeId || '',
      startDate: pipData.startDate || now.split('T')[0],
      endDate: pipData.endDate || now.split('T')[0],
      reason: pipData.reason || '',
      actionPlan: pipData.actionPlan || '',
      milestones: pipData.milestones || [],
      status: pipData.status || 'ACTIVE',
      finalOutcomeSummary: pipData.finalOutcomeSummary || '',
      createdAt: pipData.createdAt || now,
      updatedAt: now
    };

    await setDoc(ref, record, { merge: true });

    await AuditTrailService.recordEvent({
      companyId,
      actorUid: actor.uid,
      actorName: actor.name,
      actorRole: (actor as any).role || 'ADMIN',
      module: 'PERFORMANCE_MANAGEMENT',
      action: pipData.id ? 'UPDATE_PIP' : 'CREATE_PIP',
      description: `PIP record [${record.status}] for ${record.employeeName} saved.`,
      metadata: { pipId: id, status: record.status }
    });

    return record;
  }
}
