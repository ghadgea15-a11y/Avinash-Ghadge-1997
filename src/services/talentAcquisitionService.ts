import { collection, doc, setDoc, getDoc, getDocs, query, where, updateDoc, runTransaction } from 'firebase/firestore';
import { db } from '../firebase';
import { 
  CandidateRecord,
  EmployeeRecord, 
  CandidateRegistrationResult,
  UserSession,
  AppNotification,
  JobRequisitionRecord,
  CandidateStage,
  CandidateStatusHistory,
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
  BgVerificationResult,
  VerificationStatus,
  CandidateDocumentRecord,
  CandidateDocumentType,
  CandidateDocVerificationStatus,
  STANDARD_CANDIDATE_DOCUMENTS
} from "../types";
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
      if (candidate.stage === 'REJECTED' || candidate.stage === 'CONVERTED_TO_EMPLOYEE') {
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
          await this.updateCandidateStatus(session, candidate.id, 'SELECTED');
          await this.updateRequisitionCapacity(companyId, requisition.id, 1, 0);
        }
      } else if (newSelection.decision === 'REJECTED') {
        await this.updateCandidateStatus(session, candidate.id, 'REJECTED', newSelection.rejectionReason);
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

      if (candidate.stage !== 'SELECTED' && candidate.stage !== 'INTERVIEW_SCHEDULED') {
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

      // Sync Police or Aadhaar verification status to Candidate
      if (current.type === 'POLICE' || current.type === 'AADHAAR') {
        const candidateRef = doc(db, 'companies', companyId, 'candidates', current.candidateId);
        if (current.type === 'POLICE') {
          await updateDoc(candidateRef, {
            policeVerificationStatus: updates.result === 'CLEARED' ? 'VERIFIED' : updates.result === 'FAILED' ? 'FAILED' : 'PENDING'
          });
        }
        if (current.type === 'AADHAAR') {
          await updateDoc(candidateRef, {
            aadhaarVerificationStatus: updates.result === 'CLEARED' ? 'VERIFIED' : updates.result === 'FAILED' ? 'FAILED' : 'PENDING'
          });
        }
      }

      await this.syncCandidateVerificationStatus(session, current.candidateId);

      return { success: true };
    } catch (err: any) {
      console.error('[TalentAcquisitionService] updateVerificationStatus failure:', err);
      return { success: false, error: err.message };
    }
  }

  public static async uploadVerificationEvidence(
    session: UserSession,
    verificationId: string,
    file: File
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { companyId } = session;
      const verRef = doc(db, 'companies', companyId, 'backgroundVerifications', verificationId);
      const verSnap = await getDoc(verRef);
      if (!verSnap.exists()) return { success: false, error: 'Verification record not found.' };
      
      const current = verSnap.data() as BackgroundVerificationRecord;
      const candidateId = current.candidateId;

      const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const storagePath = `companies/${companyId}/candidates/${candidateId}/verifications/${verificationId}_${Date.now()}_${sanitizedFileName}`;
      const fileUrl = await StorageService.uploadFile(storagePath, file, session);

      const documentId = `DOC-${Date.now()}`;
      
      const newEvidence = {
        documentId,
        documentType: current.type,
        fileName: file.name,
        fileUrl,
        uploadedAt: new Date().toISOString()
      };

      await updateDoc(verRef, {
        evidenceReferences: [...(current.evidenceReferences || []), newEvidence],
        status: 'EVIDENCE_SUBMITTED',
        updatedAt: new Date().toISOString()
      });

      await AuditTrailService.logAction(
        session,
        'TALENT_ACQUISITION',
        'UPDATE',
        'BACKGROUND_VERIFICATION',
        verificationId,
        true,
        'MEDIUM',
        `Evidence uploaded for ${current.type} verification`,
        { documentId, fileName: file.name }
      );

      const notification: any = {
        id: `NOTIF-EVIDENCE-${Date.now()}`,
        title: `Verification Evidence Submitted`,
        message: `Evidence file "${file.name}" was uploaded for ${current.type} verification (Candidate ID: ${candidateId}).`,
        type: 'INFO',
        roleScope: ['HR', 'COMPANY_ADMIN'],
        timestamp: new Date().toISOString(),
        isRead: false,
        metadata: { verificationId, candidateId }
      };
      await FirestoreService.createNotification(companyId, notification);

      return { success: true };
    } catch (err: any) {
      console.error('[TalentAcquisitionService] uploadVerificationEvidence failure:', err);
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


  public static async requestPoliceVerification(
    session: UserSession,
    candidateId: string
  ): Promise<{ success: boolean; status: VerificationStatus; message: string }> {
    try {
      const candidateRef = doc(db, `companies/${session.companyId}/candidates/${candidateId}`);
      const candidateSnap = await getDoc(candidateRef);

      if (!candidateSnap.exists()) {
        throw new Error('Candidate not found');
      }

      const candidateData = candidateSnap.data();

      // Check existing verification records to prevent duplicates
      const verificationsRef = collection(db, `companies/${session.companyId}/backgroundVerifications`);
      const q = query(
        verificationsRef, 
        where('candidateId', '==', candidateId), 
        where('type', '==', 'POLICE')
      );
      
      const verificationsSnap = await getDocs(q);
      const activeVerifications = verificationsSnap.docs.filter(d => 
        d.data().status !== 'FAILED' && d.data().status !== 'CLOSED' && d.data().result !== 'FAILED'
      );

      if (activeVerifications.length > 0) {
        const active = activeVerifications[0].data();
        if (active.status === 'CLEARED' || active.result === 'CLEARED') {
           return { success: true, status: 'VERIFIED', message: 'Candidate already has a cleared Police Verification record' };
        } else {
           return { success: true, status: 'PENDING', message: 'A Police verification is already in progress' };
        }
      }

      const verificationId = `BGV-${Date.now()}-${Math.random().toString(36).substring(2,8).toUpperCase()}`;
      const code = `POLICE-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
      
      const newRecord = {
        id: verificationId,
        companyId: session.companyId,
        candidateId,
        selectionId: 'DIRECT',
        requisitionId: candidateData.requisitionId || 'UNKNOWN',
        verificationCode: code,
        type: 'POLICE',
        verificationMethod: 'MANUAL_SUBMISSION',
        requestDate: new Date().toISOString(),
        dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'REQUESTED',
        result: 'PENDING',
        notes: 'Police Verification requested. Waiting for submission.',
        evidenceReferences: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await setDoc(doc(db, `companies/${session.companyId}/backgroundVerifications/${verificationId}`), newRecord);

      await AuditTrailService.logAction(
        session,
        'TALENT_ACQUISITION',
        'UPDATE',
        'CANDIDATE_RECORD',
        candidateId,
        true,
        'MEDIUM',
        `Police verification requested and workflow initiated for ${candidateData.fullName}`,
        { verificationId }
      );
      
      const notification: any = {
        id: `NOTIF-PV-REQ-${Date.now()}`,
        title: `Police Verification Requested`,
        message: `Police Verification workflow has been initiated for candidate ${candidateData.fullName}.`,
        type: 'INFO',
        roleScope: ['HR', 'COMPANY_ADMIN'],
        timestamp: new Date().toISOString(),
        isRead: false,
        metadata: { verificationId, candidateId }
      };
      await FirestoreService.createNotification(session.companyId, notification);

      await updateDoc(candidateRef, {
        policeVerificationStatus: 'PENDING',
        updatedAt: new Date().toISOString()
      });

      return { 
        success: true, 
        status: 'PENDING', 
        message: 'Police Verification Request initiated successfully' 
      };

    } catch (err) {
      console.error('[TalentAcquisitionService] requestPoliceVerification error:', err);
      throw err;
    }
  }

  public static async processAadhaarVerification(
    session: UserSession,
    candidateId: string
  ): Promise<{ success: boolean; status: VerificationStatus; message: string }> {
    try {
      const candidateRef = doc(db, `companies/${session.companyId}/candidates/${candidateId}`);
      const candidateSnap = await getDoc(candidateRef);

      if (!candidateSnap.exists()) {
        throw new Error('Candidate not found');
      }

      const candidateData = candidateSnap.data();

      // Ensure Aadhaar number exists
      if (!candidateData.aadhaarNumber) {
        return { success: false, status: 'FAILED', message: 'Aadhaar number not provided by candidate' };
      }

      // Check existing verification records to prevent duplicates
      const verificationsRef = collection(db, `companies/${session.companyId}/backgroundVerifications`);
      const q = query(
        verificationsRef, 
        where('candidateId', '==', candidateId), 
        where('type', '==', 'AADHAAR')
      );
      
      const verificationsSnap = await getDocs(q);
      const activeVerifications = verificationsSnap.docs.filter(d => 
        d.data().status !== 'FAILED' && d.data().status !== 'CLOSED' && d.data().result !== 'FAILED'
      );

      if (activeVerifications.length > 0) {
        const active = activeVerifications[0].data();
        if (active.status === 'CLEARED' || active.result === 'CLEARED') {
           // It's already cleared
           return { success: true, status: 'VERIFIED', message: 'Candidate already has a verified Aadhaar record' };
        } else {
           // It's in progress
           return { success: true, status: 'PENDING', message: 'An Aadhaar verification is already in progress' };
        }
      }

      // 1. Record Consent
      const verificationId = `BGV-${Date.now()}-${Math.random().toString(36).substring(2,8).toUpperCase()}`;
      const code = `AADHAAR-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
      
      const newRecord = {
        id: verificationId,
        companyId: session.companyId,
        candidateId,
        selectionId: 'DIRECT',
        requisitionId: candidateData.requisitionId || 'UNKNOWN',
        verificationCode: code,
        type: 'AADHAAR',
        consentStatus: 'GRANTED',
        consentTimestamp: new Date().toISOString(),
        verificationMethod: 'OFFLINE_KYC_OR_API',
        requestDate: new Date().toISOString(),
        dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'REQUESTED',
        result: 'PENDING',
        notes: 'Aadhaar consent obtained digitally. Auth provider pending.',
        evidenceReferences: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await setDoc(doc(db, `companies/${session.companyId}/backgroundVerifications/${verificationId}`), newRecord);

      // Audit Log for consent
      await AuditTrailService.logAction(
        session,
        'TALENT_ACQUISITION',
        'UPDATE',
        'CANDIDATE_RECORD',
        candidateId,
        true,
        'MEDIUM',
        `Aadhaar verification consent recorded and workflow initiated for ${candidateData.fullName}`,
        { consent: 'GRANTED', verificationId }
      );

      const notification: any = {
        id: `NOTIF-AADHAAR-REQ-${Date.now()}`,
        title: `Aadhaar Verification Requested`,
        message: `Aadhaar Verification workflow has been initiated for candidate ${candidateData.fullName}.`,
        type: 'INFO',
        roleScope: ['HR', 'COMPANY_ADMIN'],
        timestamp: new Date().toISOString(),
        isRead: false,
        metadata: { verificationId, candidateId }
      };
      await FirestoreService.createNotification(session.companyId, notification);

      // 2. Integration Boundary (Provider not configured as per constraints)
      // We will set it to PENDING per rules: "If no authorized provider exists: Keep status Pending - Provide a safe integration boundary"
      
      await updateDoc(candidateRef, {
        aadhaarVerificationStatus: 'PENDING',
        updatedAt: new Date().toISOString()
      });

      return { 
        success: true, 
        status: 'PENDING', 
        message: 'PENDING — AUTHORIZED VERIFICATION PROVIDER NOT CONFIGURED' 
      };

    } catch (err) {
      console.error('[TalentAcquisitionService] processAadhaarVerification error:', err);
      throw err;
    }
  }

  // Old updateCandidateStatus removed

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
      const isMet = requisition.requiredQualifications.some((q: any) => candQual.includes(q.toLowerCase()));
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
      const candSkills = candidate.skills?.map((s: any) => s.toLowerCase()) || [];
      const matchedSkills = requisition.requiredSkills.filter((rs: any) => candSkills.includes(rs.toLowerCase()));
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
      if (newRecord.decision === 'SHORTLISTED') nextStage = 'INTERVIEW_SCHEDULED';
      if (newRecord.decision === 'REJECTED') nextStage = 'REJECTED';

      const stageUpdate = await this.updateCandidateStatus(session, candidate.id, nextStage, newRecord.rejectionReason);
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

      if (candidate.stage !== 'INTERVIEW_SCHEDULED' && candidate.stage !== 'SCREENING') {
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
      if (candidate.stage !== 'INTERVIEW_SCHEDULED') {
        await this.updateCandidateStatus(session, candidate.id, 'INTERVIEW_SCHEDULED');
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
        'INTERVIEW_SCHEDULED',
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
        'INTERVIEW_SCHEDULED',
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
          await this.updateCandidateStatus(session, candidate.id, nextStage, rejectionReason);
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
        'INTERVIEW_SCHEDULED',
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
        stage: 'REGISTERED', // Initial lifecycle status
        statusHistory: [{
          stage: 'REGISTERED',
          changedBy: session.userId,
          changedByName: session.fullName || session.userId,
          changedAt: new Date().toISOString(),
          sourceEvent: 'Candidate Registration'
        }],
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
        const oldResume = existingData.resumeUrl;
        const resumePath = `companies/${companyId}/candidates/${candidateId}/resumes/${Date.now()}_${resumeFile.name}`;
        resumeUrl = await StorageService.uploadFile(resumePath, resumeFile, session);
        if (oldResume && oldResume !== resumeUrl) {
          StorageService.cleanupOldFile(oldResume).catch(() => {});
        }
      }

      // 3. Photo Update
      if (photoFile) {
        if (!photoFile.type.startsWith('image/')) {
          return { success: false, error: 'Invalid photo file type (Image required).' };
        }
        if (photoFile.size > 2 * 1024 * 1024) {
          return { success: false, error: 'Photo exceeds 2MB limit.' };
        }
        const oldPhoto = existingData.profilePhotoUrl;
        const photoPath = `companies/${companyId}/candidates/${candidateId}/photos/${Date.now()}_profile.jpg`;
        profilePhotoUrl = await StorageService.uploadFile(photoPath, photoFile, session);
        if (oldPhoto && oldPhoto !== profilePhotoUrl) {
          StorageService.cleanupOldFile(oldPhoto).catch(() => {});
        }
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

  // ==========================================================================
  // CANDIDATE DOCUMENT VERIFICATION (MODULE 12 / POINT 10)
  // ==========================================================================

  /**
   * Uploads or re-uploads a candidate document with version tracking and validation.
   */
  public static async uploadCandidateDocument(
    session: UserSession,
    candidateId: string,
    params: {
      documentType: CandidateDocumentType;
      documentName?: string;
      isRequired?: boolean;
      expiryDate?: string;
      file: File;
      selectionId?: string;
      requisitionId?: string;
    }
  ): Promise<{ success: boolean; error?: string; documentId?: string; fileUrl?: string }> {
    const { companyId, userId, fullName, role } = session;

    try {
      // 1. Authorization check
      const isAuthorized = ['SUPER_ADMIN', 'COMPANY_ADMIN', 'HR_ADMIN', 'HR', 'MANAGER'].includes(role);
      if (!isAuthorized) {
        return { success: false, error: 'Unauthorized: Only HR or Admins can upload candidate verification documents.' };
      }

      // 2. Candidate Existence Check
      const candRef = doc(db, 'companies', companyId, 'candidates', candidateId);
      const candSnap = await getDoc(candRef);
      if (!candSnap.exists()) {
        return { success: false, error: 'Candidate record not found.' };
      }
      const candidate = candSnap.data() as CandidateRecord;

      const { file, documentType, expiryDate, selectionId, requisitionId } = params;

      // 3. File Validation
      if (!file) {
        return { success: false, error: 'No file provided for upload.' };
      }

      const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
      if (file.size > MAX_FILE_SIZE) {
        return { success: false, error: `File size exceeds maximum limit of 10MB (${(file.size / (1024 * 1024)).toFixed(1)}MB).` };
      }

      const allowedMimeTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
      if (!allowedMimeTypes.includes(file.type)) {
        return { success: false, error: 'Invalid file format. Please upload PDF, JPG, PNG, or WEBP.' };
      }

      // 4. Default document name & requirement metadata
      const standardDoc = STANDARD_CANDIDATE_DOCUMENTS.find(d => d.documentType === documentType);
      const documentName = params.documentName || standardDoc?.documentName || documentType.replace(/_/g, ' ');
      const isRequired = params.isRequired !== undefined ? params.isRequired : (standardDoc?.isRequired ?? false);

      // 5. Check if document of this type already exists for candidate
      const docsCol = collection(db, 'companies', companyId, 'candidateDocuments');
      const q = query(docsCol, where('candidateId', '==', candidateId), where('documentType', '==', documentType));
      const existingSnap = await getDocs(q);

      let existingDoc: CandidateDocumentRecord | null = null;
      if (!existingSnap.empty) {
        existingDoc = existingSnap.docs[0].data() as CandidateDocumentRecord;
      }

      // 6. Upload file to Storage
      const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const storagePath = `companies/${companyId}/candidates/${candidateId}/documents/${Date.now()}_${sanitizedFileName}`;
      const fileUrl = await StorageService.uploadFile(storagePath, file, session);

      // 7. Calculate Expiry
      let isExpired = false;
      if (expiryDate) {
        const exp = new Date(expiryDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        isExpired = exp < today;
      }

      const timestamp = new Date().toISOString();

      let docRecord: CandidateDocumentRecord;

      if (existingDoc) {
        // Version update
        const previousVersion = {
          version: existingDoc.version || 1,
          fileName: existingDoc.fileName || 'previous_file',
          fileUrl: existingDoc.fileUrl || '',
          storagePath: existingDoc.storagePath,
          fileSize: existingDoc.fileSize || 0,
          fileType: existingDoc.fileType || '',
          uploadedAt: existingDoc.submittedAt || existingDoc.createdAt,
          uploadedBy: existingDoc.submittedBy || 'Unknown',
          status: existingDoc.status,
          rejectionReason: existingDoc.rejectionReason,
          correctionNotes: existingDoc.correctionNotes
        };

        const newVersion = (existingDoc.version || 1) + 1;
        const history = [...(existingDoc.history || []), previousVersion];

        docRecord = {
          ...existingDoc,
          documentName,
          isRequired,
          fileUrl,
          storagePath,
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
          status: 'RESUBMITTED',
          version: newVersion,
          history,
          submittedAt: timestamp,
          submittedBy: fullName || userId,
          verifiedAt: undefined,
          verifiedBy: undefined,
          rejectionReason: undefined,
          correctionNotes: undefined,
          expiryDate: expiryDate || existingDoc.expiryDate,
          isExpired,
          selectionId: selectionId || existingDoc.selectionId,
          requisitionId: requisitionId || existingDoc.requisitionId,
          updatedAt: timestamp
        };
      } else {
        // New record creation
        const docId = `CDOC-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
        docRecord = {
          id: docId,
          companyId,
          candidateId,
          selectionId,
          requisitionId: requisitionId || candidate.requisitionId,
          documentType,
          documentName,
          isRequired,
          fileUrl,
          storagePath,
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
          status: 'SUBMITTED',
          version: 1,
          history: [],
          submittedAt: timestamp,
          submittedBy: fullName || userId,
          expiryDate,
          isExpired,
          createdAt: timestamp,
          updatedAt: timestamp
        };
      }

      // 8. Save Document Record
      await FirestoreService.saveCandidateDocument(companyId, candidateId, docRecord);

      // 9. Sync specific document URLs to candidate record if applicable
      const candidateUpdates: Partial<CandidateRecord> = {};
      if (documentType === 'RESUME') {
        candidateUpdates.resumeUrl = fileUrl;
      } else if (documentType === 'PHOTOGRAPH') {
        candidateUpdates.profilePhotoUrl = fileUrl;
      } else if (documentType === 'POLICE_CLEARANCE') {
        candidateUpdates.policeVerificationCertUrl = fileUrl;
      }

      if (Object.keys(candidateUpdates).length > 0) {
        await FirestoreService.saveCandidate(companyId, { ...candidate, ...candidateUpdates } as CandidateRecord);
      }

      // 10. Audit Trail
      await AuditTrailService.logAction(
        session,
        'TALENT_ACQUISITION',
        'CANDIDATE_DOCUMENT_UPLOADED',
        'CANDIDATE',
        candidateId,
        true,
        'LOW',
        `Document '${documentName}' (v${docRecord.version}) uploaded for candidate ${candidate.fullName} (${candidate.candidateCode})`,
        {
          documentId: docRecord.id,
          documentType,
          fileName: file.name,
          fileSize: file.size,
          version: docRecord.version,
          status: docRecord.status
        }
      );

      // 11. Notification
      const notification: any = {
        id: `NOTIF-DOC-${Date.now()}`,
        title: `Document Submitted: ${documentName}`,
        message: `${fullName || 'HR'} uploaded ${documentName} (v${docRecord.version}) for candidate ${candidate.fullName}.`,
        type: 'INFO',
        roleScope: ['HR', 'COMPANY_ADMIN'],
        timestamp: new Date().toISOString(),
        isRead: false,
        metadata: { candidateId, documentId: docRecord.id, documentType }
      };
      await FirestoreService.createNotification(companyId, notification);

      return { success: true, documentId: docRecord.id, fileUrl };
    } catch (err: any) {
      console.error('[TalentAcquisitionService] uploadCandidateDocument failure:', err);
      return { success: false, error: `Upload failed: ${err.message}` };
    }
  }

  /**
   * Reviews and verifies a candidate document with audit trail and compliance checks.
   */
  public static async verifyCandidateDocument(
    session: UserSession,
    documentId: string,
    decision: 'VERIFIED' | 'REJECTED' | 'CORRECTION_REQUIRED',
    reasonOrNotes?: string,
    expiryDate?: string
  ): Promise<{ success: boolean; error?: string }> {
    const { companyId, userId, fullName, role } = session;

    try {
      // 1. Authorization check
      const isAuthorized = ['SUPER_ADMIN', 'COMPANY_ADMIN', 'HR_ADMIN', 'HR'].includes(role);
      if (!isAuthorized) {
        return { success: false, error: 'Unauthorized: Only HR Administrators can verify candidate documents.' };
      }

      // 2. Reason validation for negative or corrective decisions
      if ((decision === 'REJECTED' || decision === 'CORRECTION_REQUIRED') && (!reasonOrNotes || !reasonOrNotes.trim())) {
        return { 
          success: false, 
          error: `Mandatory findings: Please provide a reason for marking this document as ${decision.replace(/_/g, ' ').toLowerCase()}.` 
        };
      }

      // 3. Fetch Document Record
      const docRef = doc(db, 'companies', companyId, 'candidateDocuments', documentId);
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) {
        return { success: false, error: 'Document record not found.' };
      }
      const existingDoc = docSnap.data() as CandidateDocumentRecord;

      // 4. Fetch Candidate Record for Context
      const candRef = doc(db, 'companies', companyId, 'candidates', existingDoc.candidateId);
      const candSnap = await getDoc(candRef);
      const candidate = candSnap.exists() ? (candSnap.data() as CandidateRecord) : null;

      // 5. Calculate Expiry
      const targetExpiry = expiryDate || existingDoc.expiryDate;
      let isExpired = false;
      if (targetExpiry) {
        const exp = new Date(targetExpiry);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        isExpired = exp < today;
      }

      const timestamp = new Date().toISOString();

      // 6. Update Record
      const updatedDoc: CandidateDocumentRecord = {
        ...existingDoc,
        status: decision as CandidateDocVerificationStatus,
        verifiedAt: decision === 'VERIFIED' ? timestamp : undefined,
        verifiedBy: decision === 'VERIFIED' ? (fullName || userId) : undefined,
        rejectionReason: decision === 'REJECTED' ? reasonOrNotes?.trim() : undefined,
        correctionNotes: decision === 'CORRECTION_REQUIRED' ? reasonOrNotes?.trim() : undefined,
        expiryDate: targetExpiry,
        isExpired,
        updatedAt: timestamp
      };

      await FirestoreService.saveCandidateDocument(companyId, existingDoc.candidateId, updatedDoc);

      // 7. Audit Trail
      const actionType = decision === 'VERIFIED' 
        ? 'CANDIDATE_DOCUMENT_VERIFIED' 
        : decision === 'REJECTED' 
          ? 'CANDIDATE_DOCUMENT_REJECTED' 
          : 'CANDIDATE_DOCUMENT_CORRECTION_REQUESTED';

      await AuditTrailService.logAction(
        session,
        'TALENT_ACQUISITION',
        actionType,
        'CANDIDATE',
        existingDoc.candidateId,
        true,
        decision === 'REJECTED' ? 'MEDIUM' : 'LOW',
        `Document '${existingDoc.documentName}' marked as ${decision} for candidate ${candidate?.fullName || existingDoc.candidateId}`,
        {
          documentId: existingDoc.id,
          documentType: existingDoc.documentType,
          decision,
          reasonOrNotes,
          verifiedBy: fullName || userId,
          expiryDate: targetExpiry
        }
      );

      // 8. Notification
      const notification: any = {
        id: `NOTIF-DOCREV-${Date.now()}`,
        title: `Document ${decision}: ${existingDoc.documentName}`,
        message: `${existingDoc.documentName} for ${candidate?.fullName || 'candidate'} was marked ${decision.replace(/_/g, ' ').toLowerCase()}.${reasonOrNotes ? ` Reason: ${reasonOrNotes}` : ''}`,
        type: decision === 'VERIFIED' ? 'SUCCESS' : decision === 'REJECTED' ? 'ERROR' : 'WARNING',
        roleScope: ['HR', 'COMPANY_ADMIN'],
        timestamp: new Date().toISOString(),
        isRead: false,
        metadata: { candidateId: existingDoc.candidateId, documentId: existingDoc.id, status: decision }
      };
      await FirestoreService.createNotification(companyId, notification);

      await this.syncCandidateVerificationStatus(session, existingDoc.candidateId);

      return { success: true };
    } catch (err: any) {
      console.error('[TalentAcquisitionService] verifyCandidateDocument failure:', err);
      return { success: false, error: `Verification failed: ${err.message}` };
    }
  }

  /**
   * Deletes a candidate document record and its associated storage file.
   */
  public static async deleteCandidateDocument(
    session: UserSession,
    documentId: string
  ): Promise<{ success: boolean; error?: string }> {
    const { companyId, userId, role } = session;

    try {
      const isAuthorized = ['SUPER_ADMIN', 'COMPANY_ADMIN', 'HR_ADMIN', 'HR'].includes(role);
      if (!isAuthorized) {
        return { success: false, error: 'Unauthorized: Only HR or Admins can delete candidate documents.' };
      }

      const docRef = doc(db, 'companies', companyId, 'candidateDocuments', documentId);
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) {
        return { success: false, error: 'Document not found.' };
      }
      const docData = docSnap.data() as CandidateDocumentRecord;

      // Delete storage file if path exists
      if (docData.storagePath) {
        await StorageService.deleteFile(docData.storagePath, session).catch(() => {});
      }

      // Delete firestore record
      await FirestoreService.deleteCandidateDocument(companyId, docData.candidateId, documentId);

      // Audit Trail
      await AuditTrailService.logAction(
        session,
        'TALENT_ACQUISITION',
        'CANDIDATE_DOCUMENT_DELETED',
        'CANDIDATE',
        docData.candidateId,
        true,
        'MEDIUM',
        `Document '${docData.documentName}' deleted for candidate ${docData.candidateId}`,
        { documentId, documentType: docData.documentType, fileName: docData.fileName }
      );

      return { success: true };
    } catch (err: any) {
      console.error('[TalentAcquisitionService] deleteCandidateDocument failure:', err);
      return { success: false, error: `Deletion failed: ${err.message}` };
    }
  }

  /**
   * Checks candidate documents for expired items or upcoming expiration within 30 days.
   */
  public static async checkDocumentExpirations(
    session: UserSession,
    candidateId?: string
  ): Promise<{
    expired: CandidateDocumentRecord[];
    expiringSoon: CandidateDocumentRecord[];
    totalChecked: number;
  }> {
    const { companyId } = session;
    const docsCol = collection(db, 'companies', companyId, 'candidateDocuments');
    let q = query(docsCol);
    if (candidateId) {
      q = query(docsCol, where('candidateId', '==', candidateId));
    }

    const snap = await getDocs(q);
    const allDocs = snap.docs.map(d => d.data() as CandidateDocumentRecord);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(today.getDate() + 30);

    const expired: CandidateDocumentRecord[] = [];
    const expiringSoon: CandidateDocumentRecord[] = [];

    for (const docRec of allDocs) {
      if (!docRec.expiryDate) continue;

      const expDate = new Date(docRec.expiryDate);
      if (isNaN(expDate.getTime())) continue;

      if (expDate < today) {
        expired.push(docRec);
        if (!docRec.isExpired) {
          // Update isExpired status flag
          await FirestoreService.saveCandidateDocument(companyId, docRec.candidateId || '', {
            ...docRec,
            isExpired: true,
            updatedAt: new Date().toISOString()
          });
        }
      } else if (expDate <= thirtyDaysFromNow) {
        expiringSoon.push(docRec);
      }
    }

    return {
      expired,
      expiringSoon,
      totalChecked: allDocs.length
    };
  }

  // ==========================================================================
  // CANDIDATE STATUS LIFECYCLE (MODULE 12 / POINT 11)
  // ==========================================================================

  /**
   * Centralized method to update candidate status/stage with business rules and audit history.
   * Prevents manual/unauthorized bypass of the recruitment lifecycle.
   */
  public static async updateCandidateStatus(
    session: UserSession,
    candidateId: string,
    newStage: CandidateStage,
    reason?: string,
    sourceEvent?: string,
    notes?: string
  ): Promise<{ success: boolean; error?: string }> {
    const { companyId, userId, fullName, role } = session;

    try {
      if (!['SUPER_ADMIN', 'COMPANY_ADMIN', 'HR_ADMIN', 'HR', 'HIRING_MANAGER'].includes(role)) {
        return { success: false, error: 'Unauthorized to change candidate status.' };
      }

      const candSnap = await getDoc(doc(db, 'companies', companyId, 'candidates', candidateId));
      if (!candSnap.exists()) {
        return { success: false, error: 'Candidate not found.' };
      }
      const candidate = candSnap.data() as CandidateRecord;

      const currentStage = candidate.stage;

      // Prevent identical state update
      if (currentStage === newStage) {
        return { success: true }; // No-op, already in this state
      }

      // Valid transitions and prerequisite enforcement
      const validTransitions: Record<CandidateStage, CandidateStage[]> = {
        'REGISTERED': ['APPLIED', 'SCREENING', 'REJECTED', 'WITHDRAWN'],
        'APPLIED': ['SCREENING', 'REJECTED', 'WITHDRAWN'],
        'SCREENING': ['SHORTLISTED', 'REJECTED', 'ON_HOLD', 'WITHDRAWN'],
        'SHORTLISTED': ['INTERVIEW_SCHEDULED', 'REJECTED', 'WITHDRAWN'],
        'INTERVIEW_SCHEDULED': ['INTERVIEW_COMPLETED', 'REJECTED', 'WITHDRAWN', 'SHORTLISTED'], // back to shortlisted if cancelled
        'INTERVIEW_COMPLETED': ['SELECTED', 'REJECTED', 'ON_HOLD', 'WITHDRAWN'],
        'SELECTED': ['OFFER_PREPARATION', 'BACKGROUND_VERIFICATION', 'DOCUMENT_VERIFICATION', 'READY_FOR_ONBOARDING', 'REJECTED', 'WITHDRAWN'],
        'OFFER_PREPARATION': ['OFFER_EXTENDED', 'REJECTED', 'WITHDRAWN', 'ON_HOLD'],
        'OFFER_EXTENDED': ['OFFER_ACCEPTED', 'REJECTED', 'WITHDRAWN'],
        'OFFER_ACCEPTED': ['BACKGROUND_VERIFICATION', 'DOCUMENT_VERIFICATION', 'READY_FOR_ONBOARDING', 'REJECTED', 'WITHDRAWN'],
        'BACKGROUND_VERIFICATION': ['DOCUMENT_VERIFICATION', 'READY_FOR_ONBOARDING', 'VERIFICATION_FAILED', 'REJECTED', 'WITHDRAWN'],
        'DOCUMENT_VERIFICATION': ['READY_FOR_ONBOARDING', 'VERIFICATION_FAILED', 'REJECTED', 'WITHDRAWN'],
        'READY_FOR_ONBOARDING': ['ONBOARDING', 'REJECTED', 'WITHDRAWN', 'ON_HOLD'],
        'ONBOARDING': ['CONVERTED_TO_EMPLOYEE', 'REJECTED', 'WITHDRAWN'],
        'CONVERTED_TO_EMPLOYEE': [], // Terminal
        'REJECTED': ['SCREENING', 'SHORTLISTED'], // Allow reopening
        'ON_HOLD': ['SCREENING', 'SHORTLISTED', 'INTERVIEW_COMPLETED', 'READY_FOR_ONBOARDING', 'REJECTED', 'WITHDRAWN'],
        'WITHDRAWN': ['SCREENING'], // Allow reopening
        'DISQUALIFIED': [], // Terminal
        'VERIFICATION_FAILED': ['REJECTED', 'WITHDRAWN']
      };

      const allowedNextStages = validTransitions[currentStage] || [];
      if (!allowedNextStages.includes(newStage)) {
        return { success: false, error: `Invalid status transition from ${currentStage} to ${newStage}.` };
      }

      // Special rule: Rejection requires a reason
      if (newStage === 'REJECTED' && !reason?.trim()) {
        return { success: false, error: 'Rejection requires a valid reason.' };
      }

      const timestamp = new Date().toISOString();
      const historyEntry: CandidateStatusHistory = {
        stage: newStage,
        changedBy: userId,
        changedByName: fullName || userId,
        changedAt: timestamp,
        reason,
        sourceEvent,
        notes
      };

      const updatedHistory = [...(candidate.statusHistory || [])];
      
      // Also log the very first state if history is empty
      if (updatedHistory.length === 0) {
        updatedHistory.push({
          stage: currentStage,
          changedBy: 'SYSTEM',
          changedByName: 'System',
          changedAt: candidate.createdAt,
          sourceEvent: 'Initial Registration'
        });
      }

      updatedHistory.push(historyEntry);

      const updateData: any = {
        ...candidate,
        stage: newStage,
        statusHistory: updatedHistory,
        updatedAt: timestamp
      };

      if (newStage === 'REJECTED') {
        updateData.rejectionReason = reason;
      }

      await FirestoreService.saveCandidate(companyId, updateData);

      // Handle Requisition Capacity (Module 12 / Point 3.7)
      if (candidate.requisitionId) {
        let deltaPipeline = 0;
        
        // If moving out of active pipeline (REJECTED, ONBOARDED, WITHDRAWN, DISQUALIFIED, VERIFICATION_FAILED)
        const isActive = (s: CandidateStage) => 
          s !== 'REJECTED' && 
          s !== 'CONVERTED_TO_EMPLOYEE' && 
          s !== 'WITHDRAWN' &&
          s !== 'DISQUALIFIED' &&
          s !== 'VERIFICATION_FAILED';
        
        if (isActive(currentStage) && !isActive(newStage)) {
          deltaPipeline = -1;
        } else if (!isActive(currentStage) && isActive(newStage)) {
          deltaPipeline = 1;
        }

        if (deltaPipeline !== 0) {
          await this.updateRequisitionCapacity(companyId, candidate.requisitionId, 0, deltaPipeline);
        }
      }

      // Audit Log
      await AuditTrailService.logAction(
        session,
        'TALENT_ACQUISITION',
        'CANDIDATE_STATUS',
        'CANDIDATE',
        candidateId,
        true,
        'LOW',
        `Updated candidate ${candidate.fullName} status from ${currentStage} to ${newStage}`,
        {
          previousStage: currentStage,
          newStage,
          reason,
          sourceEvent
        }
      );

      // Notify
      const notification: any = {
        id: `NOTIF-STAT-${Date.now()}`,
        title: `Candidate Status Updated: ${newStage.replace(/_/g, ' ')}`,
        message: `${candidate.fullName}'s status changed to ${newStage.replace(/_/g, ' ')}${reason ? ` - ${reason}` : ''}.`,
        type: newStage === 'REJECTED' || newStage === 'VERIFICATION_FAILED' ? 'WARNING' : 'INFO',
        roleScope: ['HR', 'COMPANY_ADMIN', 'HIRING_MANAGER'],
        timestamp,
        isRead: false,
        metadata: { candidateId, newStage }
      };
      await FirestoreService.createNotification(companyId, notification);

      return { success: true };
    } catch (err: any) {
      console.error('Error updating candidate status:', err);
      return { success: false, error: err.message || 'Failed to update candidate status.' };
    }
  }
  // --- OFFER MANAGEMENT ---
  
  static async prepareOffer(
    session: UserSession,
    companyId: string,
    candidateId: string,
    requisitionId: string,
    offerDetails: {
      offeredDesignation: string;
      offeredSalaryMonthly: number;
      currency: string;
      joiningDate: string;
      benefits?: string[];
    }
  ): Promise<{ success: boolean; error?: string; offerId?: string }> {
    try {
      if (!['SUPER_ADMIN', 'COMPANY_ADMIN', 'HR_ADMIN', 'HR'].includes(session.role)) {
        return { success: false, error: 'Unauthorized to prepare offer.' };
      }

      const candidateSnap = await getDoc(doc(db, 'companies', companyId, 'candidates', candidateId));
      if (!candidateSnap.exists()) return { success: false, error: 'Candidate not found.' };

      // Generate Offer Record
      const offerId = `OFF-${Date.now()}`;
      const offerRecord: any = {
        id: offerId,
        companyId,
        candidateId,
        requisitionId,
        offerCode: offerId,
        ...offerDetails,
        status: 'DRAFT',
        preparedBy: session.userId,
        preparedAt: new Date().toISOString()
      };

      const offerRef = doc(db, 'companies', companyId, 'offers', offerId);
      await setDoc(offerRef, offerRecord);

      // Advance Status
      await this.updateCandidateStatus(
        session, candidateId, 'OFFER_PREPARATION', 'Offer drafting initiated'
      );

      // Audit Log
      await AuditTrailService.logAction(
        session, 'TALENT_ACQUISITION', 'OFFER_PREPARED', 'OFFER', offerId, true, 'HIGH',
        `Offer prepared for candidate ${candidateId}`, { candidateId }
      );

      return { success: true, offerId };
    } catch (err: any) {
      console.error('Error preparing offer:', err);
      return { success: false, error: err.message };
    }
  }

  /**
   * Synchronizes candidate ATS stage based on background verifications and documents.
   * To be called after a verification status updates.
   */
  public static async syncCandidateVerificationStatus(
    session: UserSession,
    candidateId: string
  ): Promise<{ success: boolean; error?: string }> {
    const { companyId } = session;
    try {
      const candSnap = await getDoc(doc(db, 'companies', companyId, 'candidates', candidateId));
      if (!candSnap.exists()) return { success: false, error: 'Candidate not found.' };
      const candidate = candSnap.data() as CandidateRecord;

      // 1. Fetch all Background Verifications
      const bgQuery = query(
        collection(db, 'companies', companyId, 'backgroundVerifications'),
        where('candidateId', '==', candidateId)
      );
      const bgSnap = await getDocs(bgQuery);
      const verifications = bgSnap.docs.map(d => d.data() as BackgroundVerificationRecord);

      // 2. Fetch all Candidate Documents
      const docQuery = query(
        collection(db, 'companies', companyId, 'candidateDocuments'),
        where('candidateId', '==', candidateId)
      );
      const docSnap = await getDocs(docQuery);
      const documents = docSnap.docs.map(d => d.data() as CandidateDocumentRecord);

      // Evaluate logic
      const hasFailedBg = verifications.some(v => v.result === 'FAILED');
      const hasRejectedDoc = documents.some(d => d.status === 'REJECTED');
      const hasPendingBg = verifications.some(v => v.result === 'PENDING' || v.result === 'CLARIFICATION_REQUIRED');
      const hasPendingDoc = documents.some(d => ['SUBMITTED', 'MISSING', 'CORRECTION_REQUIRED', 'RESUBMITTED', 'UNDER_REVIEW'].includes(d.status));

      const isAadhaarVerified = candidate.aadhaarVerificationStatus === 'VERIFIED';
      const isPoliceVerified = candidate.policeVerificationStatus === 'VERIFIED';
      const isAadhaarFailed = candidate.aadhaarVerificationStatus === 'FAILED';
      const isPoliceFailed = candidate.policeVerificationStatus === 'FAILED';

      if (hasFailedBg || hasRejectedDoc || isAadhaarFailed || isPoliceFailed) {
        // Move to VERIFICATION_FAILED
        if (candidate.stage !== 'VERIFICATION_FAILED') {
          await this.updateCandidateStatus(session, candidateId, 'VERIFICATION_FAILED', 'One or more verifications/documents failed.');
        }
      } else if (!hasPendingBg && !hasPendingDoc && isAadhaarVerified && isPoliceVerified) {
        // All CLEARED and VERIFIED
        if (candidate.stage !== 'READY_FOR_ONBOARDING') {
          await this.updateCandidateStatus(session, candidateId, 'READY_FOR_ONBOARDING', 'All mandatory verifications cleared successfully.');
        }
      }

      return { success: true };
    } catch (err: any) {
      console.error('[TalentAcquisitionService] syncCandidateVerificationStatus failure:', err);
      return { success: false, error: err.message };
    }
  }


  public static async checkConversionEligibility(session: UserSession, candidateId: string) {
    try {
      const companyId = session.companyId;
      const candSnap = await getDoc(doc(db, 'companies', companyId, 'candidates', candidateId));
      if (!candSnap.exists()) return { success: false, error: 'Candidate not found' };
      const candidate = candSnap.data() as CandidateRecord;

      if (candidate.stage === 'CONVERTED_TO_EMPLOYEE' || candidate.convertedToEmployeeId) {
        return { success: false, error: 'Candidate is already converted to an employee.' };
      }

      const hasSelectedStage = candidate.statusHistory?.some((h: any) => h.stage === 'SELECTED') || candidate.stage === 'READY_FOR_ONBOARDING' || candidate.stage === 'DOCUMENT_VERIFICATION' || candidate.stage === 'BACKGROUND_VERIFICATION';

      const bgQuery = query(collection(db, 'companies', companyId, 'backgroundVerifications'), where('candidateId', '==', candidateId));
      const bgSnap = await getDocs(bgQuery);
      const bgVerifications = bgSnap.docs.map(d => d.data() as BackgroundVerificationRecord);
      const bgCompleted = bgVerifications.length > 0 && !bgVerifications.some(v => v.result !== 'CLEARED');

      const aadhaarVerified = candidate.aadhaarVerificationStatus === 'VERIFIED';
      const policeVerified = candidate.policeVerificationStatus === 'VERIFIED';

      const docQuery = query(collection(db, 'companies', companyId, 'candidateDocuments'), where('candidateId', '==', candidateId));
      const docSnap = await getDocs(docQuery);
      const documents = docSnap.docs.map(d => d.data() as CandidateDocumentRecord);
      const requiredDocs = STANDARD_CANDIDATE_DOCUMENTS.filter(d => d.isRequired);
      const uploadedDocTypes = documents.filter(d => d.status === 'VERIFIED').map(d => d.documentType);
      const docsAvailable = requiredDocs.every(req => uploadedDocTypes.includes(req.documentType));

      const infoAvailable = !!(candidate.jobTitleAppliedFor);

      const isEligible = hasSelectedStage && bgCompleted && aadhaarVerified && policeVerified && docsAvailable && infoAvailable;

      return {
        success: true,
        isEligible,
        checklist: {
          atsSelection: !!hasSelectedStage,
          backgroundVerification: bgCompleted,
          aadhaarVerification: aadhaarVerified,
          policeVerification: policeVerified,
          documents: docsAvailable,
          infoReady: infoAvailable
        }
      };

    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  public static async convertCandidateToEmployeeAtomic(
    session: UserSession,
    candidateId: string,
    employeeData: Partial<EmployeeRecord>
  ): Promise<{ success: boolean; employeeId?: string; error?: string }> {
    try {
      const companyId = session.companyId;
      const candidateRef = doc(db, 'companies', companyId, 'candidates', candidateId);
      
      const newEmployeeId = employeeData.id || `EMP-${Date.now()}`;
      const employeeRef = doc(db, 'companies', companyId, 'employees', newEmployeeId);

      const result = await runTransaction(db, async (transaction) => {
        const candidateSnap = await transaction.get(candidateRef);
        if (!candidateSnap.exists()) throw new Error('Candidate not found');
        const candidate = candidateSnap.data() as CandidateRecord;

        if (candidate.stage === 'CONVERTED_TO_EMPLOYEE' || candidate.convertedToEmployeeId) {
          throw new Error('Candidate already converted.');
        }

        if (candidate.aadhaarVerificationStatus !== 'VERIFIED' || candidate.policeVerificationStatus !== 'VERIFIED') {
           throw new Error('Candidate does not meet mandatory verification requirements for conversion.');
        }

        const newEmployee: EmployeeRecord = {
          ...employeeData,
          id: newEmployeeId,
          employeeId: employeeData.employeeId || newEmployeeId,
          employeeCode: employeeData.employeeCode || newEmployeeId,
          companyId,
          firstName: candidate.fullName.split(' ')[0],
          lastName: candidate.fullName.split(' ').slice(1).join(' ') || ' ',
          email: candidate.email || '',
          contactNumber: candidate.phoneNumber,
          dateOfBirth: candidate.dateOfBirth,
          gender: candidate.gender,
          maskedAadhaar: candidate.aadhaarNumber ? `XXXX-XXXX-${candidate.aadhaarNumber.slice(-4)}` : '',
          panNumber: candidate.panNumber || '',
          lifecycleStatus: 'ONBOARDING',
          status: 'PENDING_VERIFICATION',
          onboardingTasks: [],
          documents: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdBy: session.userId,
          updatedBy: session.userId,
          assignedSiteId: employeeData.assignedSiteId || candidate.siteId || 'SITE-001',
          departmentId: employeeData.departmentId || 'DEP-001',
          assignedRegionId: employeeData.assignedRegionId || 'REG-001',
          assignedBranchId: employeeData.assignedBranchId || 'BR-001',
          designation: employeeData.designation || candidate.jobTitleAppliedFor,
          joinedDate: employeeData.joinedDate || new Date().toISOString().split('T')[0],
          employmentType: employeeData.employmentType || 'PERMANENT',
          role: employeeData.role || 'EMPLOYEE'
        } as EmployeeRecord;

        transaction.set(employeeRef, newEmployee);

        const newHistory = [...(candidate.statusHistory || []), {
          stage: 'CONVERTED_TO_EMPLOYEE' as CandidateStage,
          changedAt: new Date().toISOString(),
          changedBy: session.userId,
          notes: `Converted to Employee ${newEmployee.employeeCode}`
        }];

        transaction.update(candidateRef, {
          stage: 'CONVERTED_TO_EMPLOYEE',
          convertedToEmployeeId: newEmployeeId,
          updatedAt: new Date().toISOString(),
          statusHistory: newHistory
        });

        if (candidate.requisitionId) {
           const requisitionRef = doc(db, 'companies', companyId, 'jobRequisitions', candidate.requisitionId);
           const reqSnap = await transaction.get(requisitionRef);
           if (reqSnap.exists()) {
              const reqData = reqSnap.data();
              const newFilled = (reqData.filledPositions || 0) + 1;
              const newPipeline = Math.max(0, (reqData.pipelineCount || 0) - 1);
              const newStatus = (newFilled >= reqData.openPositions && reqData.status === 'OPEN') ? 'FILLED' : reqData.status;
              transaction.update(requisitionRef, {
                 filledPositions: newFilled,
                 pipelineCount: newPipeline,
                 status: newStatus,
                 updatedAt: new Date().toISOString()
              });
           }
        }
        
        return { employeeId: newEmployeeId, employeeCode: newEmployee.employeeCode, fullName: candidate.fullName };
      });

      await AuditTrailService.logAction(
        session,
        'TALENT_ACQUISITION',
        'CANDIDATE_CONVERTED',
        'EMPLOYEE',
        result.employeeId,
        true,
        'HIGH',
        `Candidate ${result.fullName} converted to employee ${result.employeeCode}`,
        { candidateId, employeeId: result.employeeId, applicationId: candidateId }
      );

      const notification: any = {
        id: `NOTIF-CONV-${Date.now()}`,
        title: `Employee Converted`,
        message: `${result.fullName} has been converted to Employee (${result.employeeCode}).`,
        type: 'SUCCESS',
        roleScope: ['HR', 'COMPANY_ADMIN'],
        timestamp: new Date().toISOString(),
        isRead: false,
        metadata: { employeeId: result.employeeId, candidateId }
      };
      await FirestoreService.createNotification(companyId, notification);

      const docQuery = query(collection(db, 'companies', companyId, 'candidateDocuments'), where('candidateId', '==', candidateId));
      const docSnap = await getDocs(docQuery);
      
      if (!docSnap.empty) {
         const empDocs = docSnap.docs.map((d: any) => {
             const cDoc = d.data();
             return {
                 id: cDoc.id,
                 type: cDoc.documentType,
                 title: cDoc.documentName,
                 fileUrl: cDoc.fileUrl,
                 fileName: cDoc.fileName,
                 uploadDate: cDoc.uploadedAt,
                 status: cDoc.status === 'VERIFIED' ? 'VERIFIED' : 'PENDING'
             };
         });
         await updateDoc(employeeRef, {
             documents: empDocs
         });
      }

      return { success: true, employeeId: result.employeeId };
    } catch (err: any) {
      console.error('[TalentAcquisitionService] convertCandidateToEmployeeAtomic failure:', err);
      return { success: false, error: err.message };
    }
  }
}
