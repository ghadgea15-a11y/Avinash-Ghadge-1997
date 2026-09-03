import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  updateDoc 
} from 'firebase/firestore';
import { db } from '../firebase';
import { 
  OfferLetterRecord, 
  CtcComponentBreakdown, 
  OfferLetterStatus, 
  DayOneOnboardingRecord, 
  OnboardingChecklistItem, 
  UserSession 
} from '../types';
import { AuditTrailService } from './auditTrailService';

export class OfferOnboardingService {
  /**
   * Calculates statutory & enterprise CTC components given a Gross / Base salary
   * Formula:
   * - Basic = 50% of Gross
   * - HRA = 25% of Gross (50% of Basic)
   * - Conveyance = Flat INR 1,600 / month
   * - Special Allowance = Remaining balance of Gross
   * - Employer PF = 12% of Basic (capped at INR 1,800/mo if statutory limit applies, or 12% actual)
   * - Employer ESI = 3.25% of Gross (if Gross <= 21,000 INR/mo, otherwise 0)
   * - Gratuity Provision = 4.81% of Basic
   * - Employee PF = 12% of Basic
   * - Employee ESI = 0.75% of Gross (if Gross <= 21,000 INR/mo)
   * - Net Take Home = Gross - (Employee PF + Employee ESI + PT approx 200)
   */
  public static calculateCtcBreakdown(grossMonthly: number, annualVariableBonusMax: number = 0): CtcComponentBreakdown {
    const gross = Math.max(0, Math.round(grossMonthly));
    const basicMonthly = Math.round(gross * 0.50);
    const hraMonthly = Math.round(gross * 0.25);
    const conveyanceMonthly = Math.min(1600, Math.round(gross * 0.05));
    const specialAllowanceMonthly = Math.max(0, gross - (basicMonthly + hraMonthly + conveyanceMonthly));

    // Employer Contributions
    const employerPfMonthly = Math.round(basicMonthly * 0.12);
    const employerEsiMonthly = gross <= 21000 ? Math.round(gross * 0.0325) : 0;
    const gratuityMonthly = Math.round(basicMonthly * 0.0481);

    const monthlyCtc = gross + employerPfMonthly + employerEsiMonthly + gratuityMonthly;
    const annualCtc = (monthlyCtc * 12) + annualVariableBonusMax;

    // Employee Deductions for Net Take Home
    const employeePfMonthly = Math.round(basicMonthly * 0.12);
    const employeeEsiMonthly = gross <= 21000 ? Math.round(gross * 0.0075) : 0;
    const professionalTaxMonthly = gross > 10000 ? 200 : 0;

    const netTakeHomeEstimatedMonthly = Math.max(0, gross - (employeePfMonthly + employeeEsiMonthly + professionalTaxMonthly));

    return {
      basicMonthly,
      hraMonthly,
      conveyanceMonthly,
      specialAllowanceMonthly,
      grossMonthly: gross,
      employerPfMonthly,
      employerEsiMonthly,
      gratuityMonthly,
      monthlyCtc,
      annualCtc,
      netTakeHomeEstimatedMonthly,
      variableBonusAnnualMax: annualVariableBonusMax
    };
  }

  /**
   * Creates a formal Offer Letter record in DRAFT / INTERNAL_APPROVAL_PENDING state
   */
  public static async generateOfferLetter(
    session: UserSession,
    companyId: string,
    candidateId: string,
    candidateName: string,
    candidateEmail: string,
    candidatePhone: string,
    requisitionId: string,
    jobTitle: string,
    departmentId: string,
    siteId: string,
    proposedJoiningDate: string,
    grossMonthly: number,
    variableBonusAnnual: number = 0,
    reportingManagerId?: string,
    reportingManagerName?: string,
    termsAndConditions?: string
  ): Promise<OfferLetterRecord> {
    const timestamp = new Date().toISOString();
    const offerId = `OFF-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const ctc = this.calculateCtcBreakdown(grossMonthly, variableBonusAnnual);

    const defaultTerms = termsAndConditions || 
      `This offer is contingent upon successful background verification, site medical fitness certificate, and submission of standard statutory identity documents (Aadhaar, PAN, Bank Passbook, PSARA Training Certificate if applicable). Probation period is 3 months from joining date.`;

    const record: OfferLetterRecord = {
      id: offerId,
      companyId,
      candidateId,
      candidateName,
      candidateEmail,
      candidatePhone,
      requisitionId,
      jobTitle,
      departmentId,
      siteId,
      proposedJoiningDate,
      reportingManagerId,
      reportingManagerName,
      ctc,
      termsAndConditions: defaultTerms,
      status: 'INTERNAL_APPROVAL_PENDING',
      createdAt: timestamp,
      updatedAt: timestamp
    };

    await setDoc(doc(db, 'companies', companyId, 'offerLetters', offerId), record);

    await AuditTrailService.recordEvent(
      companyId,
      session.uid,
      'OFFER_LETTER_GENERATED',
      'OFFER_LETTER',
      offerId,
      { candidateId, jobTitle, annualCtc: ctc.annualCtc, status: 'INTERNAL_APPROVAL_PENDING' }
    );

    return record;
  }

  /**
   * Approves an Offer Letter by HR / Management and marks it ready to send
   */
  public static async approveOfferLetter(
    session: UserSession,
    companyId: string,
    offerId: string
  ): Promise<OfferLetterRecord> {
    const docRef = doc(db, 'companies', companyId, 'offerLetters', offerId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) throw new Error('Offer letter not found');

    const timestamp = new Date().toISOString();
    const offer = snap.data() as OfferLetterRecord;

    const updated: Partial<OfferLetterRecord> = {
      status: 'APPROVED',
      approvedBy: session.uid,
      approvedAt: timestamp,
      updatedAt: timestamp
    };

    await updateDoc(docRef, updated);

    await AuditTrailService.recordEvent(
      companyId,
      session.uid,
      'OFFER_LETTER_APPROVED',
      'OFFER_LETTER',
      offerId,
      { candidateId: offer.candidateId, approvedBy: session.uid }
    );

    return { ...offer, ...updated };
  }

  /**
   * Candidate digital signing / acceptance of the offer letter
   */
  public static async candidateAcceptOffer(
    companyId: string,
    offerId: string,
    candidateSignatureHash: string
  ): Promise<OfferLetterRecord> {
    const docRef = doc(db, 'companies', companyId, 'offerLetters', offerId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) throw new Error('Offer letter not found');

    const timestamp = new Date().toISOString();
    const offer = snap.data() as OfferLetterRecord;

    const updated: Partial<OfferLetterRecord> = {
      status: 'ACCEPTED_BY_CANDIDATE',
      candidateSignatureHash,
      candidateResponseAt: timestamp,
      updatedAt: timestamp
    };

    await updateDoc(docRef, updated);

    // Automatically trigger Day-1 Onboarding Checklist upon candidate offer acceptance
    await this.initializeDayOneOnboarding(
      companyId,
      offer.candidateId,
      offerId,
      offer.candidateName,
      offer.proposedJoiningDate,
      offer.siteId,
      offer.departmentId
    );

    await AuditTrailService.recordEvent(
      companyId,
      'SYSTEM_CANDIDATE_PORTAL',
      'OFFER_ACCEPTED_BY_CANDIDATE',
      'OFFER_LETTER',
      offerId,
      { candidateId: offer.candidateId, signatureHash: candidateSignatureHash }
    );

    return { ...offer, ...updated };
  }

  /**
   * Initializes Day-1 Onboarding tasks and asset pre-allocation
   */
  public static async initializeDayOneOnboarding(
    companyId: string,
    candidateId: string,
    offerLetterId: string,
    employeeName: string,
    joiningDate: string,
    siteId: string,
    departmentId: string
  ): Promise<DayOneOnboardingRecord> {
    const timestamp = new Date().toISOString();
    const onboardingId = `ONB-${candidateId}`;

    const standardTasks: OnboardingChecklistItem[] = [
      {
        id: `TSK-1-${Date.now()}`,
        category: 'DOCUMENTATION',
        title: 'Statutory Document Verification',
        description: 'Verify original Aadhaar, PAN, Bank Passbook and PSARA/Police Verification',
        assignedToRole: 'HR',
        isMandatory: true,
        status: 'PENDING'
      },
      {
        id: `TSK-2-${Date.now()}`,
        category: 'IT_PROVISIONING',
        title: 'Enterprise Email & App Account Provisioning',
        description: 'Create mobile login PIN, app credentials and register employee ID',
        assignedToRole: 'IT_ADMIN',
        isMandatory: true,
        status: 'PENDING'
      },
      {
        id: `TSK-3-${Date.now()}`,
        category: 'UNIFORM_EQUIPMENT',
        title: 'Uniform, Badge & PPE Kit Allocation',
        description: 'Issue 2 sets of uniform, safety boots, baton/torch and name badge',
        assignedToRole: 'SITE_MANAGER',
        isMandatory: true,
        status: 'PENDING'
      },
      {
        id: `TSK-4-${Date.now()}`,
        category: 'ORIENTATION_TRAINING',
        title: 'Site Safety & Standard Operating Procedure Induction',
        description: 'Complete 4-hour mandatory site induction and fire safety walkthrough',
        assignedToRole: 'SITE_IN_CHARGE',
        isMandatory: true,
        status: 'PENDING'
      },
      {
        id: `TSK-5-${Date.now()}`,
        category: 'SITE_ALLOCATION',
        title: 'Biometric & Facial Muster Enrollment',
        description: 'Enroll face template and fingerprint on the site biometric punch machine',
        assignedToRole: 'SITE_SUPERVISOR',
        isMandatory: true,
        status: 'PENDING'
      }
    ];

    const record: DayOneOnboardingRecord = {
      id: onboardingId,
      companyId,
      candidateId,
      offerLetterId,
      employeeName,
      joiningDate,
      siteId,
      departmentId,
      tasks: standardTasks,
      overallProgressPercent: 0,
      idCardIssued: false,
      uniformIssued: false,
      biometricEnrolled: false,
      status: 'PRE_BOARDING',
      createdAt: timestamp,
      updatedAt: timestamp
    };

    await setDoc(doc(db, 'companies', companyId, 'onboardingChecklists', onboardingId), record);
    return record;
  }

  /**
   * Fetches all offer letters for a company
   */
  public static async getOfferLetters(companyId: string): Promise<OfferLetterRecord[]> {
    const snap = await getDocs(collection(db, 'companies', companyId, 'offerLetters'));
    return snap.docs.map(d => d.data() as OfferLetterRecord);
  }

  /**
   * Fetches onboarding checklists
   */
  public static async getOnboardingChecklists(companyId: string): Promise<DayOneOnboardingRecord[]> {
    const snap = await getDocs(collection(db, 'companies', companyId, 'onboardingChecklists'));
    return snap.docs.map(d => d.data() as DayOneOnboardingRecord);
  }
}
