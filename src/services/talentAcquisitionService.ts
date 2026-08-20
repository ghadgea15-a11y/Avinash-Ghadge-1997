import { collection, doc, getDoc, getDocs, query, where, updateDoc, runTransaction } from 'firebase/firestore';
import { db } from '../firebase';
import { 
  CandidateRecord, 
  CandidateRegistrationResult,
  UserSession,
  AppNotification,
  JobRequisitionRecord,
  CandidateStage,
  ScreeningRecord,
  ScreeningDecision,
  ScreeningCriteriaResult,
  InterviewRecord,
  InterviewStatus,
  InterviewDecision,
  SelectionRecord,
  SelectionDecision,
  BackgroundVerificationRecord,
  BgVerificationType,
  BgVerificationStatus,
  BgVerificationResult
} from '../types';
import { FirestoreService } from './firestoreService';
import { StorageService } from './storageService';
import { AuditTrailService } from './auditTrailService';
import { BpmService } from './bpmService';

/**
 * MODULE 12 / POINT 1: Talent Acquisition - Applicant Registration
 * Handles candidate record creation, validation, duplicate prevention, and document management.
 */
export class TalentAcquisitionService {

  // ==========================================================================
  // SELECTION (MODULE 12 / POINT 6)
  // ==========================================================================

  /**
   * Validates if a candidate is eligible for a final selection decision.
   */
  public static async validateSelectionEligibility(
    companyId: string,
    candidateId: string,
    requisitionId: string
  ): Promise<{ eligible: boolean; error?: string; candidate?: CandidateRecord; requisition?: JobRequisitionRecord }> {
    try {
      // 1. Fetch Candidate
      const candSnap = await getDoc(doc(db, 'companies', companyId, 'candidates', candidateId));
      if (!candSnap.exists()) return { eligible: false, error: 'Candidate not found.' };
      const candidate = candSnap.data() as CandidateRecord;

      // 2. Fetch Requisition
      const reqSnap = await getDoc(doc(db, 'companies', companyId, 'jobRequisitions', requisitionId));
      if (!reqSnap.exists()) return { eligible: false, error: 'Job Requisition not found.' };
      const requisition = reqSnap.data() as JobRequisitionRecord;

      // 3. Status Checks
      if (requisition.status !== 'OPEN') {
        return { eligible: false, error: `Requisition is currently ${requisition.status}. Only OPEN requisitions can accept selections.` };
      }

      if (requisition.filledPositions >= requisition.openPositions) {
        return { eligible: false, error: 'Requisition capacity reached. All positions are filled.' };
      }

      // 4. Stage Checks
      if (candidate.stage === 'REJECTED' || candidate.stage === 'ONBOARDED') {
        return { eligible: false, error: `Candidate is in '${candidate.stage}' stage and cannot be selected.` };
      }

      // 5. Historical Record Checks (Screening/Interview)
      // Note: We search for at least one completed interview if configured
      const intQuery = query(
        collection(db, 'companies', companyId, 'interviews'),
        where('candidateId', '==', candidateId),
        where('status', '==', 'COMPLETED')
      );
      const intSnap = await getDocs(intQuery);
      
      if (intSnap.empty) {
        // Warning: Usually interviews are required, but some quick-hires might skip. 
        // For production safety, we at least log or warn, but here we require it.
        return { eligible: false, error: 'No completed interviews found for this candidate. Selection requires at least one evaluated interview.' };
      }

      return { eligible: true, candidate, requisition };
    } catch (err: any) {
      return { eligible: false, error: err.message };
    }
  }

  /**
   * Submits a final selection decision for a candidate.
   */
  public static async submitSelectionDecision(
    session: UserSession,
    selectionData: Partial<SelectionRecord>
  ): Promise<{ success: boolean; error?: string; selectionId?: string }> {
    const { companyId, userId, fullName } = session;

    try {
      if (!selectionData.candidateId || !selectionData.requisitionId || !selectionData.decision) {
        return { success: false, error: 'Candidate, Requisition, and Decision are required.' };
      }

      if (selectionData.decision === 'REJECTED' && !selectionData.rejectionReason) {
        return { success: false, error: 'Rejection reason is mandatory when rejecting a candidate.' };
      }

      // 1. Eligibility Check
      const eligibility = await this.validateSelectionEligibility(
        companyId, 
        selectionData.candidateId, 
        selectionData.requisitionId
      );
      if (!eligibility.eligible) return { success: false, error: eligibility.error };

      const candidate = eligibility.candidate!;
      const requisition = eligibility.requisition!;

      // 2. Assemble Record
      const selectionId = doc(collection(db, 'companies', companyId, 'selections')).id;
      const selectionCode = `SEL-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

      const newSelection: SelectionRecord = {
        ...selectionData as SelectionRecord,
        id: selectionId,
        companyId,
        selectionCode,
        selectorId: userId,
        selectorName: fullName,
        selectionDate: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // 3. Handle Decision Logic
      if (newSelection.decision === 'SELECTED') {
        // 3.1 Submit to BPM if approval is required (Hiring Manager / HR Admin)
        const bpmInstance = await BpmService.submitForApproval(
          companyId,
          userId,
          'TALENT_ACQUISITION',
          selectionId,
          'SELECTION_APPROVAL',
          {
            candidateName: candidate.fullName,
            jobTitle: requisition.jobTitle,
            department: requisition.departmentName,
            selectionCode: selectionCode
          }
        );

        if (bpmInstance) {
          newSelection.bpmInstanceId = bpmInstance.id;
          // Note: Candidate stage stays as is or moves to a "Selection Pending" state if we had one.
          // For now, we'll wait for approval before moving to 'SELECTED' stage.
        } else {
          // No BPM, direct selection
          await this.updateCandidateStage(session, candidate, 'SELECTED');
          await this.updateRequisitionCapacity(companyId, requisition.id, 1, 0);
        }
      } else if (newSelection.decision === 'REJECTED') {
        await this.updateCandidateStage(session, candidate, 'REJECTED', newSelection.rejectionReason);
      } else if (newSelection.decision === 'HOLD') {
        // Hold usually preserves current state, but we log the decision record
        // Candidate remains in INTERVIEW or current stage
      }

      // 4. Persist
      const saved = await FirestoreService.saveSelectionRecord(companyId, newSelection);
      if (!saved) throw new Error('Failed to save selection record to Firestore.');

      // 5. Notification
      const notification: any = {
        id: `NOTIF-SEL-${Date.now()}`,
        title: `Selection Decision: ${candidate.fullName}`,
        message: `Decision: ${newSelection.decision}. Job: ${requisition.jobTitle}.`,
        type: newSelection.decision === 'REJECTED' ? 'WARNING' : 'SUCCESS',
        roleScope: ['HR', 'COMPANY_ADMIN'],
        timestamp: new Date().toISOString(),
        isRead: false,
        metadata: { candidateId: candidate.id, selectionId, requisitionId: requisition.id }
      };
      await FirestoreService.createNotification(companyId, notification);

      // 6. Audit
      await AuditTrailService.logAction(
        session,
        'TALENT_ACQUISITION',
        'SELECTION_DECISION_SUBMITTED',
        'CANDIDATE',
        candidate.id,
        true,
        'MEDIUM',
        `Selection decision '${newSelection.decision}' submitted for ${candidate.fullName} (${selectionCode})`,
        { selectionCode, decision: newSelection.decision, requisitionId: requisition.id }
      );

      return { success: true, selectionId };
    } catch (err: any) {
      console.error('[TalentAcquisitionService] submitSelectionDecision failure:', err);
      return { success: false, error: err.message };
    }
  }

  // ==========================================================================
  // BACKGROUND VERIFICATION (MODULE 12 / POINT 7)
  // ==========================================================================

  /**
   * Requests a new background verification for a selected candidate.
   */
  public static async requestBackgroundVerification(
    session: UserSession,
    data: {
      candidateId: string;
      selectionId: string;
      requisitionId: string;
      type: BgVerificationType;
      dueDate: string;
      notes?: string;
    }
  ): Promise<{ success: boolean; error?: string; verificationId?: string }> {
    const { companyId } = session;

    try {
      // 1. Eligibility Check
      const candSnap = await getDoc(doc(db, 'companies', companyId, 'candidates', data.candidateId));
      if (!candSnap.exists()) return { success: false, error: 'Candidate not found.' };
      const candidate = candSnap.data() as CandidateRecord;

      if (candidate.stage !== 'SELECTED' && candidate.stage !== 'INTERVIEW') {
         // Usually requested after selection, but sometimes parallel.
      }

      // 2. Prevent Duplicates of same type in active status
      const existingQuery = query(
        collection(db, 'companies', companyId, 'backgroundVerifications'),
        where('candidateId', '==', data.candidateId),
        where('type', '==', data.type),
        where('status', 'not-in', ['CLEARED', 'FAILED', 'CLOSED'])
      );
      const existingSnap = await getDocs(existingQuery);
      if (!existingSnap.empty) {
        return { success: false, error: `An active ${data.type} verification is already in progress for this candidate.` };
      }

      // 3. Assemble Record
      const verificationId = doc(collection(db, 'companies', companyId, 'backgroundVerifications')).id;
      const verificationCode = `BGV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

      const newVerification: BackgroundVerificationRecord = {
        id: verificationId,
        companyId,
        candidateId: data.candidateId,
        selectionId: data.selectionId,
        requisitionId: data.requisitionId,
        verificationCode,
        type: data.type,
        requestDate: new Date().toISOString(),
        dueDate: data.dueDate,
        status: 'REQUESTED' as BgVerificationStatus,
        result: 'PENDING' as BgVerificationResult,
        notes: data.notes,
        evidenceReferences: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // 4. Persist
      const saved = await FirestoreService.saveVerificationRecord(companyId, newVerification);
      if (!saved) throw new Error('Failed to save verification record.');

      // 5. Audit
      await AuditTrailService.logAction(
        session,
        'TALENT_ACQUISITION',
        'VERIFICATION_REQUESTED',
        'CANDIDATE',
        candidate.id,
        true,
        'LOW',
        `Background verification (${data.type}) requested for ${candidate.fullName}`,
        { verificationCode, type: data.type }
      );

      return { success: true, verificationId };
    } catch (err: any) {
      console.error('[TalentAcquisitionService] requestBackgroundVerification failure:', err);
      return { success: false, error: err.message };
    }
  }

  /**
   * Updates verification status or result.
   */
  public static async updateVerificationStatus(
    session: UserSession,
    verificationId: string,
    updates: Partial<BackgroundVerificationRecord>
  ): Promise<{ success: boolean; error?: string }> {
    const { companyId } = session;

    try {
      const verRef = doc(db, 'companies', companyId, 'backgroundVerifications', verificationId);
      const verSnap = await getDoc(verRef);
      if (!verSnap.exists()) return { success: false, error: 'Verification record not found.' };
      const current = verSnap.data() as BackgroundVerificationRecord;

      const updatedRecord: BackgroundVerificationRecord = {
        ...current,
        ...updates,
        updatedAt: new Date().toISOString()
      };

      // Business logic for results
      if (updates.result === 'CLEARED') {
        updatedRecord.status = 'CLEARED' as BgVerificationStatus;
        updatedRecord.completionDate = new Date().toISOString();
      } else if (updates.result === 'FAILED') {
        updatedRecord.status = 'FAILED' as BgVerificationStatus;
        updatedRecord.completionDate = new Date().toISOString();
      }

      await updateDoc(verRef, { ...updatedRecord });

      // Audit
      await AuditTrailService.logAction(
        session,
        'TALENT_ACQUISITION',
        'VERIFICATION_STATUS_UPDATED',
        'CANDIDATE',
        current.candidateId,
        true,
        'LOW',
        `Verification ${current.verificationCode} status updated to ${updatedRecord.status}`,
        { verificationId, status: updatedRecord.status, result: updatedRecord.result }
      );

      // Notify if cleared or failed
      if (updates.result === 'CLEARED' || updates.result === 'FAILED') {
        const notification: any = {
          id: `NOTIF-BGV-${Date.now()}`,
          title: `Verification ${updates.result}: ${current.verificationCode}`,
          message: `The ${current.type} check for candidate ID ${current.candidateId} has ${updates.result.toLowerCase()}.`,
          type: updates.result === 'FAILED' ? 'ERROR' : 'SUCCESS',
          roleScope: ['HR', 'COMPANY_ADMIN'],
          timestamp: new Date().toISOString(),
          isRead: false,
          metadata: { verificationId, candidateId: current.candidateId }
        };
        await FirestoreService.createNotification(companyId, notification);
      }

      return { success: true };
    } catch (err: any) {
      console.error('[TalentAcquisitionService] updateVerificationStatus failure:', err);
      return { success: false, error: err.message };
    }
  }

  /**
   * Adds evidence to a verification record.
   */
  public static async addVerificationEvidence(
    session: UserSession,
    verificationId: string,
    evidence: {
      documentId: string;
      documentType: string;
      fileName: string;
      fileUrl: string;
    }
  ): Promise<{ success: boolean; error?: string }> {
    const { companyId } = session;

    try {
      const verRef = doc(db, 'companies', companyId, 'backgroundVerifications', verificationId);
      const verSnap = await getDoc(verRef);
      if (!verSnap.exists()) return { success: false, error: 'Verification record not found.' };
      const current = verSnap.data() as BackgroundVerificationRecord;

      const newEvidence = {
        ...evidence,
        uploadedAt: new Date().toISOString()
      };

      await updateDoc(verRef, {
        evidenceReferences: [...current.evidenceReferences, newEvidence],
        status: 'EVIDENCE_SUBMITTED',
        updatedAt: new Date().toISOString()
      });

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  // ==========================================================================
  // JOB REQUISITIONS (MODULE 12 / POINT 3)
  // ==========================================================================

  /**
   * Creates a new job requisition in DRAFT status.
   */
  public static async createJobRequisition(
    session: UserSession,
    reqData: Partial<JobRequisitionRecord>
  ): Promise<{ success: boolean; error?: string; requisitionId?: string }> {
    const { companyId, userId } = session;

    try {
      // 1. Basic Validation
      if (!reqData.jobTitle?.trim() || !reqData.departmentId || !reqData.siteId) {
        return { success: false, error: 'Job Title, Department, and Site are required.' };
      }

      if ((reqData.openPositions || 0) <= 0) {
        return { success: false, error: 'Number of openings must be greater than zero.' };
      }

      // 2. Identity Generation
      const id = reqData.id || doc(collection(db, 'companies', companyId, 'jobRequisitions')).id;
      const requisitionCode = `REQ-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

      // 3. Assemble Record
      const newReq: JobRequisitionRecord = {
        ...reqData as JobRequisitionRecord,
        id,
        requisitionCode,
        companyId,
        status: 'DRAFT',
        filledPositions: 0,
        pipelineCount: 0,
        createdByUserId: userId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // 4. Persistence
      const saved = await FirestoreService.saveJobRequisition(companyId, newReq);
      if (!saved) throw new Error('Failed to save to Firestore');

      // 5. Audit
      await AuditTrailService.logAction(
        session,
        'TALENT_ACQUISITION',
        'REQUISITION_CREATED',
        'JOB_REQUISITION',
        id,
        true,
        'LOW',
        `Job Requisition created: ${newReq.jobTitle} (${requisitionCode})`,
        { requisitionCode }
      );

      return { success: true, requisitionId: id };
    } catch (err: any) {
      console.error('[TalentAcquisitionService] createRequisition failure:', err);
      return { success: false, error: err.message || 'Failed to create requisition' };
    }
  }

  /**
   * Submits a requisition for approval using the BPM workflow engine.
   */
  public static async submitRequisitionForApproval(
    session: UserSession,
    requisitionId: string
  ): Promise<{ success: boolean; error?: string }> {
    const { companyId, userId } = session;

    try {
      // 1. Fetch Requisition
      const reqRef = doc(db, 'companies', companyId, 'jobRequisitions', requisitionId);
      const reqSnap = await getDoc(reqRef);
      if (!reqSnap.exists()) return { success: false, error: 'Requisition not found' };

      const req = reqSnap.data() as JobRequisitionRecord;
      if (req.status !== 'DRAFT' && req.status !== 'REJECTED') {
        return { success: false, error: 'Only DRAFT or REJECTED requisitions can be submitted.' };
      }

      // 2. Submit to BPM
      const bpmInstance = await BpmService.submitForApproval(
        companyId,
        userId,
        'TALENT_ACQUISITION',
        requisitionId,
        'JOB_REQUISITION_APPROVAL',
        {
          jobTitle: req.jobTitle,
          department: req.departmentName,
          positions: req.openPositions,
          priority: req.priority,
          salaryRange: `${req.salaryMinMonthly} - ${req.salaryMaxMonthly}`
        }
      );

      if (!bpmInstance) {
        return { success: false, error: 'No approval workflow configured for Job Requisitions.' };
      }

      // 3. Update Status
      await updateDoc(reqRef, { 
        status: 'PENDING_APPROVAL', 
        bpmInstanceId: bpmInstance.id,
        updatedAt: new Date().toISOString()
      });

      // 4. Audit
      await AuditTrailService.logAction(
        session,
        'TALENT_ACQUISITION',
        'REQUISITION_SUBMITTED',
        'JOB_REQUISITION',
        requisitionId,
        true,
        'LOW',
        `Job Requisition submitted for approval: ${req.jobTitle} (${req.requisitionCode})`,
        { bpmInstanceId: bpmInstance.id }
      );

      return { success: true };
    } catch (err: any) {
      console.error('[TalentAcquisitionService] submitRequisition failure:', err);
      return { success: false, error: err.message || 'Failed to submit requisition' };
    }
  }

  /**
   * Tracks and updates vacancy capacity logic.
   * Increments filledPositions and pipelineCount based on candidate actions.
   */
  public static async updateRequisitionCapacity(
    companyId: string,
    requisitionId: string,
    deltaFilled: number,
    deltaPipeline: number
  ): Promise<void> {
    const reqRef = doc(db, 'companies', companyId, 'jobRequisitions', requisitionId);
    
    await runTransaction(db, async (transaction) => {
      const snap = await transaction.get(reqRef);
      if (!snap.exists()) return;
      
      const data = snap.data() as JobRequisitionRecord;
      const newFilled = Math.max(0, (data.filledPositions || 0) + deltaFilled);
      const newPipeline = Math.max(0, (data.pipelineCount || 0) + deltaPipeline);
      
      let newStatus = data.status;
      if (newFilled >= data.openPositions && data.status === 'OPEN') {
        newStatus = 'FILLED';
      } else if (newFilled < data.openPositions && data.status === 'FILLED') {
        newStatus = 'OPEN';
      }

      transaction.update(reqRef, {
        filledPositions: newFilled,
        pipelineCount: newPipeline,
        status: newStatus,
        updatedAt: new Date().toISOString()
      });
    });
  }

  /**
   * Updates candidate stage and handles requisition capacity adjustments.
   */
  public static async updateCandidateStage(
    session: UserSession,
    candidate: CandidateRecord,
    newStage: CandidateStage,
    reason?: string
  ): Promise<{ success: boolean; error?: string }> {
    const { companyId } = session;

    try {
      const oldStage = candidate.stage;
      if (oldStage === newStage) return { success: true };

      const candRef = doc(db, 'companies', companyId, 'candidates', candidate.id);
      
      await updateDoc(candRef, {
        stage: newStage,
        rejectionReason: reason || candidate.rejectionReason,
        updatedAt: new Date().toISOString()
      });

      // Handle Requisition Capacity (Module 12 / Point 3.7)
      if (candidate.requisitionId) {
        let deltaPipeline = 0;
        
        // If moving out of active pipeline (REJECTED or ONBOARDED)
        const isActive = (s: CandidateStage) => s !== 'REJECTED' && s !== 'ONBOARDED';
        
        if (isActive(oldStage) && !isActive(newStage)) {
          deltaPipeline = -1;
        } else if (!isActive(oldStage) && isActive(newStage)) {
          deltaPipeline = 1;
        }

        if (deltaPipeline !== 0) {
          await this.updateRequisitionCapacity(companyId, candidate.requisitionId, 0, deltaPipeline);
        }
      }

      // Audit
      await AuditTrailService.logAction(
        session,
        'TALENT_ACQUISITION',
        'CANDIDATE_STAGE_UPDATED',
        'CANDIDATE',
        candidate.id,
        true,
        'LOW',
        `Candidate ${candidate.fullName} moved from ${oldStage} to ${newStage}`,
        { oldStage, newStage, reason }
      );

      return { success: true };
    } catch (err: any) {
      console.error('[TalentAcquisitionService] updateCandidateStage failure:', err);
      return { success: false, error: err.message };
    }
  }

  // ==========================================================================
  // SCREENING (MODULE 12 / POINT 4)
  // ==========================================================================

  /**
   * Automates initial eligibility evaluation by comparing candidate profile with requisition requirements.
   */
  public static evaluateCandidateEligibility(
    candidate: CandidateRecord,
    requisition: JobRequisitionRecord
  ): ScreeningCriteriaResult[] {
    const results: ScreeningCriteriaResult[] = [];

    // 1. Qualification Check
    if (requisition.requiredQualifications && requisition.requiredQualifications.length > 0) {
      const candQual = candidate.highestEducation?.toLowerCase() || '';
      const isMet = requisition.requiredQualifications.some(q => candQual.includes(q.toLowerCase()));
      results.push({
        type: 'QUALIFICATION',
        requirement: `Required Qualifications: ${requisition.requiredQualifications.join(', ')}`,
        isMet,
        details: isMet ? `Candidate holds ${candidate.highestEducation}` : `Candidate holds ${candidate.highestEducation || 'no degree info'}`
      });
    }

    // 2. Experience Check
    const minExp = requisition.minExperienceYears || 0;
    const candExp = candidate.experienceYears || 0;
    results.push({
      type: 'EXPERIENCE',
      requirement: `Minimum Experience: ${minExp} years`,
      isMet: candExp >= minExp,
      details: `Candidate has ${candExp} years of experience`
    });

    // 3. Skills Check
    if (requisition.requiredSkills && requisition.requiredSkills.length > 0) {
      const candSkills = candidate.skills?.map(s => s.toLowerCase()) || [];
      const matchedSkills = requisition.requiredSkills.filter(rs => candSkills.includes(rs.toLowerCase()));
      const isMet = matchedSkills.length >= Math.ceil(requisition.requiredSkills.length * 0.5); // 50% match threshold
      
      results.push({
        type: 'SKILL',
        requirement: `Required Skills: ${requisition.requiredSkills.join(', ')}`,
        isMet,
        details: `Matched ${matchedSkills.length} of ${requisition.requiredSkills.length} skills: ${matchedSkills.join(', ') || 'None'}`
      });
    }

    return results;
  }

  /**
   * Submits a screening decision and updates candidate lifecycle stage.
   */
  public static async submitScreeningDecision(
    session: UserSession,
    screeningData: Partial<ScreeningRecord>
  ): Promise<{ success: boolean; error?: string }> {
    const { companyId, userId, fullName } = session;

    try {
      if (!screeningData.candidateId || !screeningData.requisitionId || !screeningData.decision) {
        return { success: false, error: 'Candidate, Requisition, and Decision are required.' };
      }

      // 1. Verification
      const candDoc = await getDoc(doc(db, 'companies', companyId, 'candidates', screeningData.candidateId));
      if (!candDoc.exists()) return { success: false, error: 'Candidate not found' };
      const candidate = candDoc.data() as CandidateRecord;

      // 2. Assembly
      const screeningId = doc(collection(db, 'companies', companyId, 'screenings')).id;
      const screeningCode = `SCR-${Date.now().toString().slice(-4)}${Math.floor(Math.random() * 99)}`;

      const newRecord: ScreeningRecord = {
        id: screeningId,
        companyId,
        candidateId: screeningData.candidateId,
        requisitionId: screeningData.requisitionId,
        screeningCode,
        screenerId: userId,
        screenerName: fullName,
        screeningDate: new Date().toISOString(),
        decision: screeningData.decision as ScreeningDecision,
        rejectionReason: screeningData.rejectionReason,
        notes: screeningData.notes,
        criteriaResults: screeningData.criteriaResults || [],
        overallEligibilityScore: screeningData.overallEligibilityScore,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // 3. Update Candidate Stage
      let nextStage: CandidateStage = 'SCREENING';
      if (newRecord.decision === 'SHORTLISTED') nextStage = 'INTERVIEW';
      if (newRecord.decision === 'REJECTED') nextStage = 'REJECTED';

      const stageUpdate = await this.updateCandidateStage(session, candidate, nextStage, newRecord.rejectionReason);
      if (!stageUpdate.success) throw new Error(stageUpdate.error);

      // 4. Persist Screening Record
      const saved = await FirestoreService.saveScreeningRecord(companyId, newRecord);
      if (!saved) throw new Error('Failed to save screening record');

      // 5. Notification
      const notification: any = {
        id: `NOTIF-SCR-${Date.now()}`,
        title: `Screening Completed: ${candidate.fullName}`,
        message: `Decision: ${newRecord.decision}. Reason: ${newRecord.rejectionReason || 'N/A'}`,
        type: newRecord.decision === 'REJECTED' ? 'WARNING' : 'SUCCESS',
        roleScope: ['HR', 'COMPANY_ADMIN'],
        timestamp: new Date().toISOString(),
        isRead: false,
        metadata: { candidateId: candidate.id, screeningId }
      };
      await FirestoreService.createNotification(companyId, notification);

      return { success: true };
    } catch (err: any) {
      console.error('[TalentAcquisitionService] submitScreeningDecision failure:', err);
      return { success: false, error: err.message };
    }
  }

  // ==========================================================================
  // INTERVIEW (MODULE 12 / POINT 5)
  // ==========================================================================

  /**
   * Schedules a new interview for a shortlisted candidate.
   */
  public static async scheduleInterview(
    session: UserSession,
    interviewData: Partial<InterviewRecord>
  ): Promise<{ success: boolean; error?: string; interviewId?: string }> {
    const { companyId } = session;

    try {
      if (!interviewData.candidateId || !interviewData.requisitionId || !interviewData.scheduledAt) {
        return { success: false, error: 'Candidate, Requisition, and Schedule Date are required.' };
      }

      // 1. Verify Candidate Eligibility
      const candDoc = await getDoc(doc(db, 'companies', companyId, 'candidates', interviewData.candidateId));
      if (!candDoc.exists()) return { success: false, error: 'Candidate not found' };
      const candidate = candDoc.data() as CandidateRecord;

      if (candidate.stage !== 'INTERVIEW' && candidate.stage !== 'SCREENING') {
        // We allow from SCREENING if they were just shortlisted, but usually Point 4 moves them to INTERVIEW
      }

      // 2. Assemble Record
      const interviewId = doc(collection(db, 'companies', companyId, 'interviews')).id;
      const interviewCode = `INT-${Date.now().toString().slice(-4)}${Math.floor(Math.random() * 99)}`;

      const newInterview: InterviewRecord = {
        ...interviewData as InterviewRecord,
        id: interviewId,
        companyId,
        interviewCode,
        status: 'SCHEDULED',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // 3. Persist
      const saved = await FirestoreService.saveInterviewRecord(companyId, newInterview);
      if (!saved) throw new Error('Failed to save interview record');

      // 4. Update Candidate if not already in INTERVIEW stage
      if (candidate.stage !== 'INTERVIEW') {
        await this.updateCandidateStage(session, candidate, 'INTERVIEW');
      }

      // 5. Notifications
      // For interviewers
      for (const interviewer of newInterview.interviewers) {
        const notification: any = {
          id: `NOTIF-INT-ASSIGN-${Date.now()}-${interviewer.userId}`,
          title: 'New Interview Assigned',
          message: `You have been assigned to interview ${candidate.fullName} for ${newInterview.type} interview on ${new Date(newInterview.scheduledAt).toLocaleString()}.`,
          type: 'INFO',
          userId: interviewer.userId,
          timestamp: new Date().toISOString(),
          isRead: false,
          metadata: { candidateId: candidate.id, interviewId }
        };
        await FirestoreService.createNotification(companyId, notification);
      }

      // 6. Audit
      await AuditTrailService.logAction(
        session,
        'TALENT_ACQUISITION',
        'INTERVIEW_SCHEDULED',
        'INTERVIEW',
        interviewId,
        true,
        'LOW',
        `Interview scheduled for ${candidate.fullName}: ${newInterview.type} on ${newInterview.scheduledAt}`,
        { candidateId: candidate.id, interviewCode }
      );

      return { success: true, interviewId };
    } catch (err: any) {
      console.error('[TalentAcquisitionService] scheduleInterview failure:', err);
      return { success: false, error: err.message };
    }
  }

  /**
   * Updates interview status (CANCELED, NO_SHOW, etc.)
   */
  public static async updateInterviewStatus(
    session: UserSession,
    interviewId: string,
    newStatus: InterviewStatus,
    reason?: string
  ): Promise<{ success: boolean; error?: string }> {
    const { companyId } = session;

    try {
      const intRef = doc(db, 'companies', companyId, 'interviews', interviewId);
      const intSnap = await getDoc(intRef);
      if (!intSnap.exists()) return { success: false, error: 'Interview not found' };
      const interview = intSnap.data() as InterviewRecord;

      const oldStatus = interview.status;
      await updateDoc(intRef, {
        status: newStatus,
        updatedAt: new Date().toISOString()
      });

      // Audit
      await AuditTrailService.logAction(
        session,
        'TALENT_ACQUISITION',
        'INTERVIEW_STATUS_UPDATED',
        'INTERVIEW',
        interviewId,
        true,
        'LOW',
        `Interview ${interview.interviewCode} status changed from ${oldStatus} to ${newStatus}`,
        { oldStatus, newStatus, reason }
      );

      return { success: true };
    } catch (err: any) {
      console.error('[TalentAcquisitionService] updateInterviewStatus failure:', err);
      return { success: false, error: err.message };
    }
  }

  /**
   * Submits interview evaluation and final decision.
   */
  public static async submitInterviewEvaluation(
    session: UserSession,
    interviewId: string,
    evaluation: InterviewRecord['evaluation'],
    decision: InterviewDecision,
    rejectionReason?: string
  ): Promise<{ success: boolean; error?: string }> {
    const { companyId } = session;

    try {
      const intRef = doc(db, 'companies', companyId, 'interviews', interviewId);
      const intSnap = await getDoc(intRef);
      if (!intSnap.exists()) return { success: false, error: 'Interview not found' };
      const interview = intSnap.data() as InterviewRecord;

      // 1. Update Interview Record
      await updateDoc(intRef, {
        status: 'COMPLETED',
        evaluation,
        decision,
        rejectionReason,
        updatedAt: new Date().toISOString()
      });

      // 2. Update Candidate Stage based on decision
      const candDoc = await getDoc(doc(db, 'companies', companyId, 'candidates', interview.candidateId));
      if (candDoc.exists()) {
        const candidate = candDoc.data() as CandidateRecord;
        let nextStage: CandidateStage = candidate.stage;

        if (decision === 'SELECTED') nextStage = 'SELECTED';
        if (decision === 'REJECTED') nextStage = 'REJECTED';
        // FURTHER_REVIEW and HOLD stay in INTERVIEW stage

        if (nextStage !== candidate.stage) {
          await this.updateCandidateStage(session, candidate, nextStage, rejectionReason);
        }
      }

      // 3. Notification to HR
      const notification: any = {
        id: `NOTIF-INT-COMP-${Date.now()}`,
        title: `Interview Evaluated: ${interview.interviewCode}`,
        message: `Evaluation completed for candidate. Decision: ${decision}.`,
        type: decision === 'REJECTED' ? 'WARNING' : 'SUCCESS',
        roleScope: ['HR', 'COMPANY_ADMIN'],
        timestamp: new Date().toISOString(),
        isRead: false,
        metadata: { interviewId, candidateId: interview.candidateId }
      };
      await FirestoreService.createNotification(companyId, notification);

      // 4. Audit
      await AuditTrailService.logAction(
        session,
        'TALENT_ACQUISITION',
        'INTERVIEW_EVALUATED',
        'INTERVIEW',
        interviewId,
        true,
        'LOW',
        `Interview evaluation submitted for ${interview.interviewCode}. Decision: ${decision}`,
        { decision, rating: evaluation?.overallRating }
      );

      return { success: true };
    } catch (err: any) {
      console.error('[TalentAcquisitionService] submitInterviewEvaluation failure:', err);
      return { success: false, error: err.message };
    }
  }

  // ==========================================================================
  // CANDIDATES (MODULE 12 / POINTS 1-2)
  // ==========================================================================

  /**
   * Checks for existing candidates with the same email or phone number to prevent duplicates.
   */
  public static async checkDuplicateApplicant(companyId: string, email: string, phoneNumber: string): Promise<CandidateRecord | null> {
    const colRef = collection(db, 'companies', companyId, 'candidates');
    
    // Check by email
    const qEmail = query(colRef, where('email', '==', email.trim()));
    const snapEmail = await getDocs(qEmail);
    if (!snapEmail.empty) return snapEmail.docs[0].data() as CandidateRecord;

    // Check by phone
    const qPhone = query(colRef, where('phoneNumber', '==', phoneNumber.trim()));
    const snapPhone = await getDocs(qPhone);
    if (!snapPhone.empty) return snapPhone.docs[0].data() as CandidateRecord;

    return null;
  }

  /**
   * Validates and registers a new applicant.
   * Includes duplicate check, requisition verification, resume upload, and notification/audit.
   */
  public static async registerApplicant(
    session: UserSession,
    applicantData: Partial<CandidateRecord>,
    resumeFile?: File
  ): Promise<CandidateRegistrationResult> {
    const { companyId } = session;
    
    // 1. Mandatory Field Validation
    if (!applicantData.fullName?.trim() || !applicantData.email?.trim() || !applicantData.phoneNumber?.trim()) {
      return { success: false, error: 'Full Name, Email, and Phone Number are required.' };
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(applicantData.email.trim())) {
      return { success: false, error: 'Invalid email format.' };
    }

    // Phone format validation (Basic length check for production safety)
    const cleanPhone = applicantData.phoneNumber.trim().replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      return { success: false, error: 'Phone number must be at least 10 digits.' };
    }

    try {
      // 2. Duplicate Prevention Logic
      const duplicate = await this.checkDuplicateApplicant(companyId, applicantData.email, applicantData.phoneNumber);
      if (duplicate) {
        return { 
          success: false, 
          isDuplicate: true, 
          error: `Duplicate Detected: A candidate with this email or phone number already exists (${duplicate.candidateCode}).`,
          candidateId: duplicate.id
        };
      }

      // 3. Job Requisition Validation (If provided)
      if (applicantData.requisitionId) {
        const reqDoc = await getDoc(doc(db, 'companies', companyId, 'jobRequisitions', applicantData.requisitionId));
        if (!reqDoc.exists()) {
          return { success: false, error: 'The specified Job Requisition was not found or has been archived.' };
        }
      }

      // 4. Identity Generation
      const candidateId = applicantData.id || doc(collection(db, 'companies', companyId, 'candidates')).id;
      const candidateCode = `CAND-${Date.now().toString().slice(-4)}${Math.floor(Math.random() * 100)}`;
      const applicationId = `APP-${Date.now().toString().slice(-6)}`;
      
      let resumeUrl = applicantData.resumeUrl;

      // 5. Document / Resume Management (Module 12 / Point 1.6)
      if (resumeFile) {
        // Validate file type (PDF/Word preferred for resumes)
        const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
        if (!allowedTypes.includes(resumeFile.type)) {
          return { success: false, error: 'Invalid file type. Please upload a PDF or Word document.' };
        }

        // Validate size (Max 5MB)
        if (resumeFile.size > 5 * 1024 * 1024) {
          return { success: false, error: 'Resume file size exceeds 5MB limit.' };
        }

        const resumePath = `companies/${companyId}/candidates/${candidateId}/resumes/${Date.now()}_${resumeFile.name}`;
        resumeUrl = await StorageService.uploadFile(resumePath, resumeFile, session);
      }

      // 6. Record Assembly
      const newCandidate: CandidateRecord = {
        ...applicantData as CandidateRecord,
        id: candidateId,
        applicationId,
        candidateCode,
        companyId,
        email: applicantData.email.trim(),
        phoneNumber: applicantData.phoneNumber.trim(),
        fullName: applicantData.fullName.trim(),
        resumeUrl,
        stage: 'APPLIED', // Controlled initial lifecycle status
        aadhaarVerificationStatus: 'PENDING',
        policeVerificationStatus: 'PENDING',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // 7. Atomic Persistence
      await FirestoreService.saveCandidate(companyId, newCandidate);

      // 7.5 Update Requisition Pipeline Count (Module 12 / Point 3.7)
      if (newCandidate.requisitionId) {
        await this.updateRequisitionCapacity(companyId, newCandidate.requisitionId, 0, 1);
      }

      // 8. Immutable Audit Trail (Module 12 / Point 1.9)
      await AuditTrailService.logAction(
        session,
        'TALENT_ACQUISITION',
        'CANDIDATE_REGISTERED',
        'CANDIDATE',
        candidateId,
        true,
        'LOW',
        `Applicant registered: ${newCandidate.fullName} (${candidateCode})`,
        { 
          applicationId, 
          requisitionId: applicantData.requisitionId,
          source: applicantData.source || 'INTERNAL'
        }
      );

      // 9. Real-time Notifications (Module 12 / Point 1.8)
      const notification: any = {
        id: `NOTIF-TA-${Date.now()}`,
        title: 'New Applicant Registered',
        message: `${newCandidate.fullName} applied for ${newCandidate.jobTitleAppliedFor}. Check candidate registry for screening.`,
        type: 'INFO',
        roleScope: ['HR', 'COMPANY_ADMIN', 'ADMIN'],
        timestamp: new Date().toISOString(),
        isRead: false,
        metadata: { candidateId, candidateCode, applicationId }
      };
      await FirestoreService.createNotification(companyId, notification);

      return { success: true, candidateId };
    } catch (err: any) {
      console.error('[TalentAcquisitionService] Registration Critical Failure:', err);
      return { 
        success: false, 
        error: `System Error: ${err.message || 'Failed to complete registration flow.'}` 
      };
    }
  }

  /**
   * Updates an existing candidate profile with full validation and audit.
   */
  public static async updateCandidateProfile(
    session: UserSession,
    candidateId: string,
    updateData: Partial<CandidateRecord>,
    resumeFile?: File,
    photoFile?: File
  ): Promise<{ success: boolean; error?: string }> {
    const { companyId } = session;

    try {
      // 1. Verify existence
      const candRef = doc(db, 'companies', companyId, 'candidates', candidateId);
      const candSnap = await getDoc(candRef);
      if (!candSnap.exists()) {
        return { success: false, error: 'Candidate profile not found.' };
      }

      const existingData = candSnap.data() as CandidateRecord;
      let resumeUrl = updateData.resumeUrl || existingData.resumeUrl;
      let profilePhotoUrl = updateData.profilePhotoUrl || existingData.profilePhotoUrl;

      // 2. Resume Update
      if (resumeFile) {
        const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
        if (!allowedTypes.includes(resumeFile.type)) {
          return { success: false, error: 'Invalid resume file type (PDF/Word required).' };
        }
        if (resumeFile.size > 5 * 1024 * 1024) {
          return { success: false, error: 'Resume exceeds 5MB limit.' };
        }
        const resumePath = `companies/${companyId}/candidates/${candidateId}/resumes/${Date.now()}_${resumeFile.name}`;
        resumeUrl = await StorageService.uploadFile(resumePath, resumeFile, session);
      }

      // 3. Photo Update
      if (photoFile) {
        if (!photoFile.type.startsWith('image/')) {
          return { success: false, error: 'Invalid photo file type (Image required).' };
        }
        if (photoFile.size > 2 * 1024 * 1024) {
          return { success: false, error: 'Photo exceeds 2MB limit.' };
        }
        const photoPath = `companies/${companyId}/candidates/${candidateId}/photos/${Date.now()}_profile.jpg`;
        profilePhotoUrl = await StorageService.uploadFile(photoPath, photoFile, session);
      }

      // 4. Assemble Final Update
      const finalUpdate: Partial<CandidateRecord> = {
        ...updateData,
        resumeUrl,
        profilePhotoUrl,
        updatedAt: new Date().toISOString()
      };

      // 5. Persistence
      await FirestoreService.saveCandidate(companyId, { ...existingData, ...finalUpdate } as CandidateRecord);

      // 6. Audit Logging
      await AuditTrailService.logAction(
        session,
        'TALENT_ACQUISITION',
        'CANDIDATE_PROFILE_UPDATED',
        'CANDIDATE',
        candidateId,
        true,
        'LOW',
        `Profile updated for: ${existingData.fullName} (${existingData.candidateCode})`,
        { 
          changes: Object.keys(updateData),
          hasNewResume: !!resumeFile,
          hasNewPhoto: !!photoFile
        }
      );

      return { success: true };
    } catch (err: any) {
      console.error('[TalentAcquisitionService] Profile Update Failure:', err);
      return { success: false, error: `System Error: ${err.message}` };
    }
  }
}
