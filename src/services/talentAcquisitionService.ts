import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { 
  CandidateRecord, 
  CandidateRegistrationResult,
  UserSession,
  AppNotification
} from '../types';
import { FirestoreService } from './firestoreService';
import { StorageService } from './storageService';
import { AuditTrailService } from './auditTrailService';

/**
 * MODULE 12 / POINT 1: Talent Acquisition - Applicant Registration
 * Handles candidate record creation, validation, duplicate prevention, and document management.
 */
export class TalentAcquisitionService {
  
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
