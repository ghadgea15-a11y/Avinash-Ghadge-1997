import React, { useState, useEffect } from 'react';
import { 
  UserSession, 
  CompanyTenant, 
  JobRequisitionRecord, 
  CandidateRecord, 
  CandidateStage, 
  VerificationStatus,
  DepartmentRecord,
  SiteRecord,
  PhaseAScreen,
  ScreeningRecord,
  ScreeningDecision,
  ScreeningCriteriaResult,
  InterviewRecord,
  InterviewType,
  InterviewStatus,
  InterviewDecision,
  EmployeeRecord,
  SelectionRecord,
  SelectionDecision,
  BackgroundVerificationRecord,
  BgVerificationType,
  BgVerificationStatus,
  BgVerificationResult,
  CandidateDocumentRecord,
  CandidateDocumentType,
  CandidateDocVerificationStatus,
  STANDARD_CANDIDATE_DOCUMENTS,
  CandidateDocumentChecklistItem
} from '../../types';
import { FirestoreService } from '../../services/firestoreService';
import { TalentAcquisitionService } from '../../services/talentAcquisitionService';
import { useTheme } from '../../context/ThemeContext';
import { 
  UserCheck, 
  Briefcase, 
  Users, 
  Plus, 
  Search, 
  Filter, 
  CheckCircle, 
  XCircle, 
  ShieldCheck, 
  ArrowRight, 
  DollarSign, 
  MapPin, 
  Building2, 
  Calendar, 
  FileText, 
  ChevronRight,
  X,
  RefreshCw,
  Award,
  Sparkles,
  AlertCircle,
  Video,
  Clock3,
  UserPlus2,
  Trash2,
  CheckCircle2,
  Upload,
  FileCheck,
  Eye,
  AlertTriangle,
  History,
  Clock,
  RotateCcw,
  ExternalLink,
  FileBadge
} from 'lucide-react';

interface TalentAcquisitionScreenProps {
  userSession: UserSession | null;
  activeCompany: CompanyTenant | null;
  onNavigate?: (screen: PhaseAScreen) => void;
}

export const TalentAcquisitionScreen: React.FC<TalentAcquisitionScreenProps> = ({
  userSession,
  activeCompany,
  onNavigate
}) => {
  const { isDark } = useTheme();
  const [activeTab, setActiveTab] = useState<'CANDIDATES' | 'REQUISITIONS' | 'SCREENING_QUEUE' | 'INTERVIEWS' | 'SELECTION_QUEUE' | 'VERIFICATIONS'>('CANDIDATES');
  const [requisitions, setRequisitions] = useState<JobRequisitionRecord[]>([]);
  const [candidates, setCandidates] = useState<CandidateRecord[]>([]);
  const [screenings, setScreenings] = useState<ScreeningRecord[]>([]);
  const [interviews, setInterviews] = useState<InterviewRecord[]>([]);
  const [selections, setSelections] = useState<SelectionRecord[]>([]);
  const [verifications, setVerifications] = useState<BackgroundVerificationRecord[]>([]);
  const [departments, setDepartments] = useState<DepartmentRecord[]>([]);
  const [sites, setSites] = useState<SiteRecord[]>([]);
  const [employees, setEmployees] = useState<EmployeeRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [stageFilter, setStageFilter] = useState<string>('ALL');

  // Modals
  const [isCandidateModalOpen, setIsCandidateModalOpen] = useState<boolean>(false);
  const [isEditProfileModalOpen, setIsEditProfileModalOpen] = useState<boolean>(false);
  const [isScreeningModalOpen, setIsScreeningModalOpen] = useState<boolean>(false);
  const [isInterviewModalOpen, setIsInterviewModalOpen] = useState<boolean>(false);
  const [isEvaluationModalOpen, setIsEvaluationModalOpen] = useState<boolean>(false);
  const [isSelectionModalOpen, setIsSelectionModalOpen] = useState<boolean>(false);
  const [isVerificationModalOpen, setIsVerificationModalOpen] = useState<boolean>(false);
  const [isProcessVerificationModalOpen, setIsProcessVerificationModalOpen] = useState<boolean>(false);
  const [isAadhaarModalOpen, setIsAadhaarModalOpen] = useState<boolean>(false);
  const [aadhaarState, setAadhaarState] = useState<'REQUEST_CONSENT' | 'AWAITING_CONSENT' | 'PROCESSING' | 'RESULT'>('REQUEST_CONSENT');
  const [aadhaarResult, setAadhaarResult] = useState<any>(null);
  const [profileTab, setProfileTab] = useState<'SUMMARY' | 'DETAIL' | 'DOCUMENTS'>('SUMMARY');
  const [isReqModalOpen, setIsReqModalOpen] = useState<boolean>(false);
  const [selectedCandidate, setSelectedCandidate] = useState<CandidateRecord | null>(null);
  const [candidateToScreen, setCandidateToScreen] = useState<CandidateRecord | null>(null);
  const [selectedInterview, setSelectedInterview] = useState<InterviewRecord | null>(null);
  const [selectedVerification, setSelectedVerification] = useState<BackgroundVerificationRecord | null>(null);
  const [isConverting, setIsConverting] = useState<boolean>(false);
  const [conversionEligibility, setConversionEligibility] = useState<any>(null);
  const [isChecklistModalOpen, setIsChecklistModalOpen] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState<boolean>(false);
  const [isSubmittingScreening, setIsSubmittingScreening] = useState<boolean>(false);
  const [isSchedulingInterview, setIsSchedulingInterview] = useState<boolean>(false);
  const [isSubmittingEvaluation, setIsSubmittingEvaluation] = useState<boolean>(false);
  const [isSubmittingSelection, setIsSubmittingSelection] = useState<boolean>(false);
  const [isRequestingVerification, setIsRequestingVerification] = useState<boolean>(false);
  const [isUpdatingVerification, setIsUpdatingVerification] = useState<boolean>(false);
  const [conversionSuccessMsg, setConversionSuccessMsg] = useState<string | null>(null);
  const [registerError, setRegisterError] = useState<string | null>(null);
  const [isRegistering, setIsRegistering] = useState<boolean>(false);

  // Background Verification Form
  const [bgvFormData, setBgvFormData] = useState({
    type: 'EMPLOYMENT' as BgVerificationType,
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    notes: ''
  });

  // Verification Processing Form
  const [bgvProcessFormData, setBgvProcessFormData] = useState({
    status: 'IN_PROGRESS' as BgVerificationStatus,
    result: 'PENDING' as BgVerificationResult,
    findings: '',
    notes: '',
    assignedVerifierId: '',
    evidenceFile: null as File | null
  });

  // Candidate Document Verification State (Module 12 / Point 10)
  const [candidateDocuments, setCandidateDocuments] = useState<CandidateDocumentRecord[]>([]);
  const [selectedCandidateDoc, setSelectedCandidateDoc] = useState<CandidateDocumentRecord | null>(null);
  const [isUploadDocModalOpen, setIsUploadDocModalOpen] = useState<boolean>(false);
  const [isReviewDocModalOpen, setIsReviewDocModalOpen] = useState<boolean>(false);
  const [isVersionHistoryModalOpen, setIsVersionHistoryModalOpen] = useState<boolean>(false);
  const [isUploadingDoc, setIsUploadingDoc] = useState<boolean>(false);
  const [isReviewingDoc, setIsReviewingDoc] = useState<boolean>(false);
  const [docFilterCategory, setDocFilterCategory] = useState<string>('ALL');

  // Document Upload Form
  const [uploadDocFormData, setUploadDocFormData] = useState({
    documentType: 'RESUME' as CandidateDocumentType,
    documentName: '',
    isRequired: true,
    expiryDate: '',
    file: null as File | null
  });

  // Document Review Form
  const [reviewDocFormData, setReviewDocFormData] = useState({
    decision: 'VERIFIED' as 'VERIFIED' | 'REJECTED' | 'CORRECTION_REQUIRED',
    reasonOrNotes: '',
    expiryDate: ''
  });

  // Screening Form
  const [screeningFormData, setScreeningFormData] = useState({
    decision: 'SHORTLISTED' as ScreeningDecision,
    notes: '',
    rejectionReason: '',
    criteriaResults: [] as ScreeningCriteriaResult[]
  });

  // Interview Schedule Form
  const [interviewFormData, setInterviewFormData] = useState({
    type: 'GENERAL' as InterviewType,
    scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
    durationMinutes: 30,
    location: '',
    meetingLink: '',
    interviewerIds: [] as string[]
  });

  // Interview Evaluation Form
  const [evaluationFormData, setEvaluationFormData] = useState({
    decision: 'SELECTED' as InterviewDecision,
    rating: 3,
    notes: '',
    rejectionReason: '',
    criteria: [
      { criteria: 'Technical Skills', rating: 3, comments: '' },
      { criteria: 'Communication', rating: 3, comments: '' },
      { criteria: 'Experience Alignment', rating: 3, comments: '' },
      { criteria: 'Behavioral Fit', rating: 3, comments: '' }
    ]
  });
  
  // Selection Form
  const [selectionFormData, setSelectionFormData] = useState({
    decision: 'SELECTED' as SelectionDecision,
    rejectionReason: '',
    notes: ''
  });

  // Candidate Form
  const [candFormData, setCandFormData] = useState({
    fullName: '',
    gender: 'MALE' as 'MALE' | 'FEMALE' | 'OTHER',
    dateOfBirth: '1995-05-15',
    phoneNumber: '',
    email: '',
    currentAddress: '',
    permanentAddress: '',
    experienceYears: 2,
    highestEducation: '12th Standard / HSC',
    qualification: '',
    skills: '',
    aadhaarNumber: '',
    panNumber: '',
    expectedSalaryMonthly: 18500,
    jobTitleAppliedFor: 'Security Guard / Facility Staff',
    requisitionId: '',
    source: 'Direct'
  });
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [profilePhotoFile, setProfilePhotoFile] = useState<File | null>(null);

  // Profile Edit Form
  const [profileFormData, setProfileFormData] = useState<Partial<CandidateRecord>>({});

  // Requisition Form
  const [reqFormData, setReqFormData] = useState({
    jobTitle: '',
    description: '',
    departmentId: '',
    siteId: '',
    openPositions: 1,
    minExperienceYears: 0,
    salaryMinMonthly: 15000,
    salaryMaxMonthly: 25000,
    employmentType: 'FULL_TIME' as 'FULL_TIME' | 'PART_TIME' | 'CONTRACT' | 'TEMPORARY',
    workforceCategory: 'OPERATIONS' as any,
    priority: 'MEDIUM' as 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
    hiringManagerId: '',
    hiringManagerName: '',
    targetHiringDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    requiredSkills: '',
    requiredQualifications: '',
    shiftRequirement: ''
  });

  const [isSubmittingReq, setIsSubmittingReq] = useState<boolean>(false);

  useEffect(() => {
    if (!activeCompany) return;

    setLoading(true);
    const unsubReqs = FirestoreService.subscribeToJobRequisitions(activeCompany.companyId, (reqList) => {
      setRequisitions(reqList);
    });

    const unsubCands = FirestoreService.subscribeToCandidates(activeCompany.companyId, (candList) => {
      setCandidates(candList);
      setLoading(false);
    });

    const unsubScreenings = FirestoreService.subscribeToScreenings(activeCompany.companyId, (scrList) => {
      setScreenings(scrList);
    });

    const unsubInterviews = FirestoreService.subscribeToInterviews(activeCompany.companyId, (intList) => {
      setInterviews(intList);
    });

    const unsubSelections = FirestoreService.subscribeToSelections(activeCompany.companyId, (selList) => {
      setSelections(selList);
    });

    const unsubVerifications = FirestoreService.subscribeToVerifications(activeCompany.companyId, (verList) => {
      setVerifications(verList);
    });

    const unsubCandidateDocs = FirestoreService.subscribeToCandidateDocuments(activeCompany.companyId, undefined, (docList) => {
      setCandidateDocuments(docList);
    });

    const unsubEmployees = FirestoreService.subscribeToEmployees(userSession!, activeCompany.companyId, (empList: EmployeeRecord[]) => {
      setEmployees(empList);
    });

    const unsubDeps = FirestoreService.subscribeToDepartments(activeCompany.companyId, (depList) => {
      setDepartments(depList);
      if (depList.length > 0 && !reqFormData.departmentId) {
        setReqFormData(prev => ({ ...prev, departmentId: depList[0].id }));
      }
    });

    const unsubSites = FirestoreService.subscribeToSites(activeCompany.companyId, (siteList) => {
      setSites(siteList);
      if (siteList.length > 0 && !reqFormData.siteId) {
        setReqFormData(prev => ({ ...prev, siteId: siteList[0].id }));
      }
    });

    return () => {
      unsubReqs();
      unsubCands();
      unsubScreenings();
      unsubInterviews();
      unsubSelections();
      unsubVerifications();
      unsubCandidateDocs();
      unsubEmployees();
      unsubDeps();
      unsubSites();
    };
  }, [activeCompany?.companyId]);

  const handleStartScreening = (candidate: CandidateRecord) => {
    if (!candidate.requisitionId) {
      alert('This candidate is not linked to a job requisition.');
      return;
    }

    const req = requisitions.find(r => r.id === candidate.requisitionId);
    if (!req) {
      alert('Linked job requisition not found.');
      return;
    }

    const automatedResults = TalentAcquisitionService.evaluateCandidateEligibility(candidate, req);
    
    setCandidateToScreen(candidate);
    setScreeningFormData({
      decision: 'SHORTLISTED',
      notes: '',
      rejectionReason: '',
      criteriaResults: automatedResults
    });
    setIsScreeningModalOpen(true);
  };

  const handleSubmitScreening = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userSession || !candidateToScreen || !candidateToScreen.requisitionId) return;

    setIsSubmittingScreening(true);
    try {
      const score = Math.round(
        (screeningFormData.criteriaResults.filter(r => r.isMet).length / 
         screeningFormData.criteriaResults.length) * 100
      ) || 0;

      const result = await TalentAcquisitionService.submitScreeningDecision(userSession, {
        candidateId: candidateToScreen.id,
        requisitionId: candidateToScreen.requisitionId,
        decision: screeningFormData.decision,
        notes: screeningFormData.notes,
        rejectionReason: screeningFormData.rejectionReason,
        criteriaResults: screeningFormData.criteriaResults,
        overallEligibilityScore: score
      });

      if (result.success) {
        setIsScreeningModalOpen(false);
        setCandidateToScreen(null);

        // If shortlisted, automatically open interview scheduling
        if (screeningFormData.decision === 'SHORTLISTED') {
          const cand = candidates.find(c => c.id === candidateToScreen.id);
          if (cand) {
             handleStartScheduling(cand);
          }
        }
      } else {
        alert(result.error || 'Failed to submit screening');
      }
    } catch (err: any) {
      console.error('Error submitting screening:', err);
    } finally {
      setIsSubmittingScreening(false);
    }
  };

  const handleStartScheduling = (candidate: CandidateRecord) => {
    setSelectedCandidate(candidate);
    setInterviewFormData({
      type: 'GENERAL',
      scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
      durationMinutes: 30,
      location: '',
      meetingLink: '',
      interviewerIds: userSession ? [userSession.userId] : []
    });
    setIsInterviewModalOpen(true);
  };

  const handleSubmitInterview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userSession || !selectedCandidate || !selectedCandidate.requisitionId) return;

    if (interviewFormData.interviewerIds.length === 0) {
      alert('Please assign at least one interviewer.');
      return;
    }

    setIsSchedulingInterview(true);
    const selectedInterviewers = employees
      .filter(emp => interviewFormData.interviewerIds.includes(emp.authUid || ''))
      .map(emp => ({ 
        userId: emp.authUid || '', 
        fullName: `${emp.firstName} ${emp.lastName}` 
      }));

    const screening = screenings.find(s => s.candidateId === selectedCandidate.id);

    const payload: Partial<InterviewRecord> = {
      candidateId: selectedCandidate.id,
      requisitionId: selectedCandidate.requisitionId,
      screeningId: screening?.id || 'DIRECT_ENTRY',
      type: interviewFormData.type,
      scheduledAt: interviewFormData.scheduledAt,
      durationMinutes: interviewFormData.durationMinutes,
      location: interviewFormData.location,
      meetingLink: interviewFormData.meetingLink,
      interviewers: selectedInterviewers
    };

    const result = await TalentAcquisitionService.scheduleInterview(userSession, payload);
    if (result.success) {
      setIsInterviewModalOpen(false);
      setActiveTab('INTERVIEWS');
    } else {
      alert(result.error);
    }
    setIsSchedulingInterview(false);
  };

  const handleStartEvaluation = (interview: InterviewRecord) => {
    setSelectedInterview(interview);
    const cand = candidates.find(c => c.id === interview.candidateId);
    if (cand) setSelectedCandidate(cand);
    
    setEvaluationFormData({
      decision: 'SELECTED',
      rating: 3,
      notes: '',
      rejectionReason: '',
      criteria: [
        { criteria: 'Technical Skills', rating: 3, comments: '' },
        { criteria: 'Communication', rating: 3, comments: '' },
        { criteria: 'Experience Alignment', rating: 3, comments: '' },
        { criteria: 'Behavioral Fit', rating: 3, comments: '' }
      ]
    });
    setIsEvaluationModalOpen(true);
  };

  const handleSubmitEvaluation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userSession || !selectedInterview) return;

    setIsSubmittingEvaluation(true);
    const evaluation = {
      items: evaluationFormData.criteria,
      overallRating: evaluationFormData.rating,
      notes: evaluationFormData.notes
    };

    const result = await TalentAcquisitionService.submitInterviewEvaluation(
      userSession,
      selectedInterview.id,
      evaluation,
      evaluationFormData.decision,
      evaluationFormData.rejectionReason
    );

    if (result.success) {
      setIsEvaluationModalOpen(false);
    } else {
      alert(result.error);
    }
    setIsSubmittingEvaluation(false);
  };

  const handleUpdateInterviewStatus = async (interviewId: string, status: InterviewStatus) => {
    if (!userSession) return;
    const result = await TalentAcquisitionService.updateInterviewStatus(userSession, interviewId, status);
    if (!result.success) alert(result.error);
  };




  const handleInitiateAadhaarWorkflow = async (candidate: CandidateRecord) => {
    if (!userSession) return;
    
    try {
      const result = await TalentAcquisitionService.processAadhaarVerification(userSession, candidate.id);
      if (result.success) {
        alert("Aadhaar workflow initiated. Please process it in the Verifications tab.");
      } else {
        alert(result.message);
      }
    } catch (err: any) {
      alert(err.message || 'An error occurred while initiating Aadhaar Verification');
    }
  };

  const handleInitiatePoliceWorkflow = async (candidate: CandidateRecord) => {
    if (!userSession) return;
    
    try {
      const result = await TalentAcquisitionService.requestPoliceVerification(userSession, candidate.id);
      if (result.success) {
        alert("Police Verification workflow initiated. Please process it in the Verifications tab.");
      } else {
        alert(result.message);
      }
    } catch (err: any) {
      alert(err.message || 'An error occurred while requesting Police Verification');
    }
  };

  const handleStartVerificationRequest = (candidate: CandidateRecord) => {
    setSelectedCandidate(candidate);
    const sel = selections.find(s => s.candidateId === candidate.id && s.decision === 'SELECTED');
    setBgvFormData({
      type: 'EMPLOYMENT',
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      notes: ''
    });
    setIsVerificationModalOpen(true);
  };

  const handleSubmitVerificationRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userSession || !selectedCandidate) return;

    const sel = selections.find(s => s.candidateId === selectedCandidate.id && s.decision === 'SELECTED');
    if (!sel) {
      alert('Candidate must be in SELECTED state to request verification.');
      return;
    }

    setIsRequestingVerification(true);
    const result = await TalentAcquisitionService.requestBackgroundVerification(userSession, {
      candidateId: selectedCandidate.id,
      selectionId: sel.id,
      requisitionId: selectedCandidate.requisitionId || '',
      type: bgvFormData.type,
      dueDate: bgvFormData.dueDate,
      notes: bgvFormData.notes
    });

    if (result.success) {
      setIsVerificationModalOpen(false);
      setActiveTab('VERIFICATIONS');
    } else {
      alert(result.error || 'Failed to request verification');
    }
    setIsRequestingVerification(false);
  };

  const handleStartProcessingVerification = (verification: BackgroundVerificationRecord) => {
    setSelectedVerification(verification);
    setBgvProcessFormData({
      status: verification.status === 'REQUESTED' ? 'ASSIGNED' : verification.status,
      result: verification.result,
      findings: verification.findings || '',
      notes: verification.notes || '',
      assignedVerifierId: verification.assignedVerifierId || '',
      evidenceFile: null
    });
    setIsProcessVerificationModalOpen(true);
  };

  const handleSubmitVerificationProcess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userSession || !selectedVerification) return;

    if (bgvProcessFormData.result === 'FAILED' && !bgvProcessFormData.findings.trim()) {
      alert('Findings or Rejection Reason is required when a verification fails.');
      return;
    }

    setIsUpdatingVerification(true);
    
    // Handle File Upload first if present
    if (bgvProcessFormData.evidenceFile) {
      const uploadResult = await TalentAcquisitionService.uploadVerificationEvidence(
        userSession,
        selectedVerification.id,
        bgvProcessFormData.evidenceFile
      );
      if (!uploadResult.success) {
        alert(uploadResult.error || 'Failed to upload evidence');
        setIsUpdatingVerification(false);
        return;
      }
    }

    let verifierName = undefined;
    if (bgvProcessFormData.assignedVerifierId) {
      const emp = employees.find(e => e.id === bgvProcessFormData.assignedVerifierId);
      if (emp) verifierName = `${emp.firstName} ${emp.lastName}`;
    }

    const result = await TalentAcquisitionService.updateVerificationStatus(userSession, selectedVerification.id, {
      status: bgvProcessFormData.status,
      result: bgvProcessFormData.result,
      findings: bgvProcessFormData.findings,
      notes: bgvProcessFormData.notes,
      assignedVerifierId: bgvProcessFormData.assignedVerifierId || undefined,
      assignedVerifierName: verifierName
    });

    if (result.success) {
      setIsProcessVerificationModalOpen(false);
    } else {
      alert(result.error || 'Failed to update verification');
    }
    setIsUpdatingVerification(false);
  };

  const handleStartSelection = (candidate: CandidateRecord) => {
    setSelectedCandidate(candidate);
    setSelectionFormData({
      decision: 'SELECTED',
      rejectionReason: '',
      notes: ''
    });
    setIsSelectionModalOpen(true);
  };

  const handleSubmitSelection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userSession || !selectedCandidate || !selectedCandidate.requisitionId) return;

    setIsSubmittingSelection(true);
    const result = await TalentAcquisitionService.submitSelectionDecision(userSession, {
      candidateId: selectedCandidate.id,
      requisitionId: selectedCandidate.requisitionId,
      decision: selectionFormData.decision,
      rejectionReason: selectionFormData.rejectionReason,
      notes: selectionFormData.notes
    });

    if (result.success) {
      setIsSelectionModalOpen(false);
      setActiveTab('SELECTION_QUEUE');
    } else {
      alert(result.error || 'Failed to submit selection decision');
    }
    setIsSubmittingSelection(false);
  };

  const handleCreateCandidate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCompany || !userSession || !candFormData.fullName.trim()) return;

    setIsRegistering(true);
    setRegisterError(null);

    try {
      const result = await TalentAcquisitionService.registerApplicant(
        userSession,
        {
          fullName: candFormData.fullName.trim(),
          gender: candFormData.gender,
          dateOfBirth: candFormData.dateOfBirth,
          phoneNumber: candFormData.phoneNumber.trim(),
          email: candFormData.email.trim(),
          currentAddress: candFormData.currentAddress.trim(),
          permanentAddress: candFormData.permanentAddress.trim(),
          experienceYears: Number(candFormData.experienceYears),
          highestEducation: candFormData.highestEducation,
          qualification: candFormData.qualification,
          skills: candFormData.skills.split(',').map(s => s.trim()).filter(s => s !== ''),
          aadhaarNumber: candFormData.aadhaarNumber.trim() || undefined,
          panNumber: candFormData.panNumber.trim() || undefined,
          expectedSalaryMonthly: Number(candFormData.expectedSalaryMonthly),
          jobTitleAppliedFor: candFormData.jobTitleAppliedFor,
          requisitionId: candFormData.requisitionId || undefined,
          source: candFormData.source,
          siteId: candFormData.requisitionId ? requisitions.find(r => r.id === candFormData.requisitionId)?.siteId : undefined,
          siteName: candFormData.requisitionId ? requisitions.find(r => r.id === candFormData.requisitionId)?.siteName : undefined,
        },
        resumeFile || undefined
      );

      if (result.success) {
        setIsCandidateModalOpen(false);
        setCandFormData({
          fullName: '',
          gender: 'MALE',
          dateOfBirth: '1995-05-15',
          phoneNumber: '',
          email: '',
          currentAddress: '',
          permanentAddress: '',
          experienceYears: 2,
          highestEducation: '12th Standard / HSC',
          qualification: '',
          skills: '',
          aadhaarNumber: '',
          panNumber: '',
          expectedSalaryMonthly: 18500,
          jobTitleAppliedFor: 'Security Guard / Facility Staff',
          requisitionId: '',
          source: 'Direct'
        });
        setResumeFile(null);
      } else {
        setRegisterError(result.error || 'Registration failed');
      }
    } catch (err: any) {
      console.error('Error creating candidate:', err);
      setRegisterError(err.message || 'An unexpected error occurred');
    } finally {
      setIsRegistering(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCompany || !userSession || !selectedCandidate) return;

    setIsSavingProfile(true);
    try {
      const result = await TalentAcquisitionService.updateCandidateProfile(
        userSession,
        selectedCandidate.id,
        profileFormData,
        resumeFile || undefined,
        profilePhotoFile || undefined
      );

      if (result.success) {
        setIsEditProfileModalOpen(false);
        setResumeFile(null);
        setProfilePhotoFile(null);
        // Firestore subscription will update the list
      } else {
        setRegisterError(result.error || 'Update failed');
      }
    } catch (err: any) {
      console.error('Error updating profile:', err);
      setRegisterError(err.message || 'An unexpected error occurred');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleCreateRequisition = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCompany || !userSession || !reqFormData.jobTitle.trim()) return;

    setIsSubmittingReq(true);
    try {
      const selectedDep = departments.find(d => d.id === reqFormData.departmentId);
      const selectedSite = sites.find(s => s.id === reqFormData.siteId);

      const result = await TalentAcquisitionService.createJobRequisition(
        userSession,
        {
          jobTitle: reqFormData.jobTitle.trim(),
          description: reqFormData.description.trim(),
          departmentId: reqFormData.departmentId,
          departmentName: selectedDep?.name || 'Department',
          siteId: reqFormData.siteId,
          siteName: selectedSite?.name || 'Site',
          openPositions: Number(reqFormData.openPositions),
          minExperienceYears: Number(reqFormData.minExperienceYears),
          salaryMinMonthly: Number(reqFormData.salaryMinMonthly),
          salaryMaxMonthly: Number(reqFormData.salaryMaxMonthly),
          employmentType: reqFormData.employmentType,
          workforceCategory: reqFormData.workforceCategory,
          priority: reqFormData.priority,
          hiringManagerId: reqFormData.hiringManagerId || userSession.userId,
          hiringManagerName: reqFormData.hiringManagerName || userSession.fullName || 'Hiring Manager',
          targetHiringDate: reqFormData.targetHiringDate,
          requiredSkills: reqFormData.requiredSkills.split(',').map(s => s.trim()).filter(s => s),
          requiredQualifications: reqFormData.requiredQualifications.split(',').map(s => s.trim()).filter(s => s),
          shiftRequirement: reqFormData.shiftRequirement
        }
      );

      if (result.success) {
        setIsReqModalOpen(false);
        // Reset form
        setReqFormData({
          jobTitle: '',
          description: '',
          departmentId: departments[0]?.id || '',
          siteId: sites[0]?.id || '',
          openPositions: 1,
          minExperienceYears: 0,
          salaryMinMonthly: 15000,
          salaryMaxMonthly: 25000,
          employmentType: 'FULL_TIME',
          workforceCategory: 'OPERATIONS',
          priority: 'MEDIUM',
          hiringManagerId: '',
          hiringManagerName: '',
          targetHiringDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          requiredSkills: '',
          requiredQualifications: '',
          shiftRequirement: ''
        });
      } else {
        setRegisterError(result.error || 'Failed to create requisition');
      }
    } catch (err: any) {
      console.error('Error creating job requisition:', err);
      setRegisterError(err.message || 'An unexpected error occurred');
    } finally {
      setIsSubmittingReq(false);
    }
  };

  const handleSubmitReqForApproval = async (requisitionId: string) => {
    if (!activeCompany || !userSession) return;

    setIsSubmittingReq(true);
    try {
      const result = await TalentAcquisitionService.submitRequisitionForApproval(userSession, requisitionId);
      if (!result.success) {
        alert(result.error || 'Submission failed');
      }
    } catch (err: any) {
      console.error('Error submitting requisition:', err);
    } finally {
      setIsSubmittingReq(false);
    }
  };

  const handleUpdateCandidateStatus = async (candidate: CandidateRecord, newStage: CandidateStage, reason?: string) => {
    if (!activeCompany || !userSession) return;

    try {
      const result = await TalentAcquisitionService.updateCandidateStatus(userSession, candidate.id, newStage, reason, 'Manual UI Update');
      if (result.success) {
        setSelectedCandidate(prev => prev ? { 
          ...prev, 
          stage: newStage,
          rejectionReason: reason || prev.rejectionReason,
          statusHistory: [
            ...(prev.statusHistory || []),
            {
              stage: newStage,
              changedBy: userSession.userId,
              changedByName: userSession.fullName || userSession.userId,
              changedAt: new Date().toISOString(),
              reason,
              sourceEvent: 'Manual UI Update'
            }
          ]
        } : null);
      } else {
        alert(result.error || 'Failed to update status');
      }
    } catch (err) {
      console.error('Error updating candidate status:', err);
    }
  };

  // ==========================================================================
  // CANDIDATE DOCUMENT VERIFICATION HANDLERS (MODULE 12 / POINT 10)
  // ==========================================================================

  const handleOpenUploadDocModal = (
    docType?: CandidateDocumentType,
    isReq?: boolean,
    defaultName?: string
  ) => {
    const standard = STANDARD_CANDIDATE_DOCUMENTS.find(d => d.documentType === docType);
    setUploadDocFormData({
      documentType: docType || 'RESUME',
      documentName: defaultName || standard?.documentName || '',
      isRequired: isReq !== undefined ? isReq : (standard?.isRequired ?? false),
      expiryDate: '',
      file: null
    });
    setIsUploadDocModalOpen(true);
  };

  const handleUploadDocSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCompany || !userSession || !selectedCandidate) return;

    if (!uploadDocFormData.file) {
      alert('Please select a file to upload.');
      return;
    }

    setIsUploadingDoc(true);
    try {
      const result = await TalentAcquisitionService.uploadCandidateDocument(
        userSession,
        selectedCandidate.id,
        {
          documentType: uploadDocFormData.documentType,
          documentName: uploadDocFormData.documentName.trim() || undefined,
          isRequired: uploadDocFormData.isRequired,
          expiryDate: uploadDocFormData.expiryDate || undefined,
          file: uploadDocFormData.file,
          selectionId: selectedCandidate.id,
          requisitionId: selectedCandidate.requisitionId
        }
      );

      if (result.success) {
        setIsUploadDocModalOpen(false);
        setUploadDocFormData({
          documentType: 'RESUME',
          documentName: '',
          isRequired: true,
          expiryDate: '',
          file: null
        });
      } else {
        alert(result.error || 'Document upload failed');
      }
    } catch (err: any) {
      console.error('Error uploading candidate document:', err);
      alert(err.message || 'An unexpected error occurred during upload.');
    } finally {
      setIsUploadingDoc(false);
    }
  };

  const handleOpenReviewDocModal = (docRecord: CandidateDocumentRecord) => {
    setSelectedCandidateDoc(docRecord);
    setReviewDocFormData({
      decision: 'VERIFIED',
      reasonOrNotes: '',
      expiryDate: docRecord.expiryDate || ''
    });
    setIsReviewDocModalOpen(true);
  };

  const handleReviewDocSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCompany || !userSession || !selectedCandidateDoc) return;

    if (
      (reviewDocFormData.decision === 'REJECTED' || reviewDocFormData.decision === 'CORRECTION_REQUIRED') &&
      !reviewDocFormData.reasonOrNotes.trim()
    ) {
      alert(`Please provide a reason or note for ${reviewDocFormData.decision === 'REJECTED' ? 'rejecting' : 'requesting correction on'} this document.`);
      return;
    }

    setIsReviewingDoc(true);
    try {
      const result = await TalentAcquisitionService.verifyCandidateDocument(
        userSession,
        selectedCandidateDoc.id,
        reviewDocFormData.decision,
        reviewDocFormData.reasonOrNotes,
        reviewDocFormData.expiryDate || undefined
      );

      if (result.success) {
        setIsReviewDocModalOpen(false);
        setSelectedCandidateDoc(null);
        setReviewDocFormData({
          decision: 'VERIFIED',
          reasonOrNotes: '',
          expiryDate: ''
        });
      } else {
        alert(result.error || 'Verification failed');
      }
    } catch (err: any) {
      console.error('Error verifying candidate document:', err);
      alert(err.message || 'An unexpected error occurred during verification.');
    } finally {
      setIsReviewingDoc(false);
    }
  };

  const handleDeleteDoc = async (docRecord: CandidateDocumentRecord) => {
    if (!activeCompany || !userSession) return;

    const confirmed = window.confirm(
      `Are you sure you want to permanently delete '${docRecord.documentName}'? This action cannot be undone.`
    );
    if (!confirmed) return;

    try {
      const result = await TalentAcquisitionService.deleteCandidateDocument(userSession, docRecord.id);
      if (!result.success) {
        alert(result.error || 'Failed to delete document');
      }
    } catch (err: any) {
      console.error('Error deleting document:', err);
      alert(err.message || 'An error occurred while deleting document.');
    }
  };

  const handleOpenVersionHistoryModal = (docRecord: CandidateDocumentRecord) => {
    setSelectedCandidateDoc(docRecord);
    setIsVersionHistoryModalOpen(true);
  };

  

  const handlePrepareOffer = async (candidate: CandidateRecord) => {
    if (!activeCompany || !userSession) return;
    const salaryStr = window.prompt(`Enter monthly offered salary for ${candidate.fullName} (Number):`, String(candidate.expectedSalaryMonthly || 0));
    if (!salaryStr) return;
    const salary = parseInt(salaryStr, 10) || candidate.expectedSalaryMonthly || 0;

    try {
      const result = await TalentAcquisitionService.prepareOffer(
        userSession,
        activeCompany.companyId,
        candidate.id,
        candidate.requisitionId || 'REQ-UNKNOWN',
        {
          offeredDesignation: candidate.jobTitleAppliedFor,
          offeredSalaryMonthly: salary,
          currency: 'INR',
          joiningDate: new Date().toISOString().split('T')[0]
        }
      );
      if (!result.success) {
        alert(result.error);
      } else {
        alert(`Offer ${result.offerId} drafted successfully and candidate moved to OFFER_PREPARATION.`);
      }
    } catch (err: any) {
      alert(err.message || 'Error drafting offer.');
    }
  };


  const handleCheckConversion = async (candidate: CandidateRecord) => {
    if (!userSession) return;
    setIsConverting(true);
    try {
      const result = await TalentAcquisitionService.checkConversionEligibility(userSession, candidate.id);
      if (result.success) {
        setConversionEligibility(result);
        setIsChecklistModalOpen(true);
      } else {
        alert(result.error || 'Failed to check conversion eligibility');
      }
    } catch(err) {
      console.error(err);
    } finally {
      setIsConverting(false);
    }
  };

  const handle1ClickConvert = async (candidate: CandidateRecord) => {
    if (!activeCompany || !userSession) return;

    setIsConverting(true);
    try {
      const defaultSite = sites[0]?.id || 'SITE-001';
      const defaultDep = departments[0]?.id || 'DEP-SEC';
      
      const result = await TalentAcquisitionService.convertCandidateToEmployeeAtomic(userSession, candidate.id, {
        assignedSiteId: defaultSite,
        departmentId: defaultDep,
        assignedRegionId: sites.find(s => s.id === defaultSite)?.branchId || 'REG-001',
        assignedBranchId: sites.find(s => s.id === defaultSite)?.branchId || 'BR-001',
        designation: candidate.jobTitleAppliedFor,
        joinedDate: new Date().toISOString().split('T')[0],
        employmentType: 'PERMANENT',
        role: 'GUARD',
        assignedAreaId: 'AREA-001',
      });

      if (result.success && result.employeeId) {
        setIsChecklistModalOpen(false);
        setConversionSuccessMsg(`Successfully converted ${candidate.fullName} into Employee Master record!`);
        setCandidates(prev => prev.map(c => c.id === candidate.id ? { ...c, stage: 'CONVERTED_TO_EMPLOYEE', convertedToEmployeeId: result.employeeId! } : c));
        if (selectedCandidate?.id === candidate.id) {
          setSelectedCandidate(prev => prev ? { ...prev, stage: 'CONVERTED_TO_EMPLOYEE', convertedToEmployeeId: result.employeeId! } : null);
        }
      } else {
        alert(result.error || 'Conversion failed.');
      }
    } catch (err: any) {
      console.error('Conversion failed:', err);
      alert(err.message || 'Error converting candidate.');
    } finally {
      setIsConverting(false);
    }
  };

  const filteredCandidates = candidates.filter(c => {
    const matchesSearch = 
      c.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.candidateCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.jobTitleAppliedFor.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStage = stageFilter === 'ALL' || c.stage === stageFilter;
    return matchesSearch && matchesStage;
  });

  const getStageBadge = (stage: CandidateStage) => {
    switch (stage) {
      case 'APPLIED':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300">Applied</span>;
      case 'SCREENING':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300">Screening</span>;
      case 'INTERVIEW_SCHEDULED':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300">Interview</span>;
      case 'BACKGROUND_VERIFICATION':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">Verification</span>;
      case 'SELECTED':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">Selected</span>;
      case 'SELECTED':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300">Offer Sent</span>;
      case 'CONVERTED_TO_EMPLOYEE':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-teal-100 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300">Onboarded</span>;
      case 'REJECTED':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300">Rejected</span>;
    }
  };

  return (
    <div className={`p-4 md:p-6 space-y-6 min-h-screen ${isDark ? 'bg-slate-900 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-teal-600/10 text-teal-600 dark:text-teal-400 rounded-xl">
              <UserCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Talent Acquisition & ATS</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Module 12: Recruitment Requisitions, Screening, Verification & 1-Click Employee Conversion
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => activeTab === 'CANDIDATES' ? setIsCandidateModalOpen(true) : setIsReqModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-medium shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            <span>{activeTab === 'CANDIDATES' ? 'New Candidate' : 'New Job Requisition'}</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-800/60 border-slate-700' : 'bg-white border-slate-200'}`}>
          <span className="text-xs font-semibold text-slate-500 uppercase">Open Requisitions</span>
          <p className="text-2xl font-bold mt-1">{requisitions.filter(r => r.status === 'OPEN').length}</p>
          <span className="text-xs text-slate-500">Active hiring roles</span>
        </div>
        <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-800/60 border-slate-700' : 'bg-white border-slate-200'}`}>
          <span className="text-xs font-semibold text-slate-500 uppercase">Active Applicants</span>
          <p className="text-2xl font-bold mt-1 text-teal-600 dark:text-teal-400">
            {candidates.filter(c => c.stage !== 'REJECTED' && c.stage !== 'CONVERTED_TO_EMPLOYEE').length}
          </p>
          <span className="text-xs text-slate-500">In assessment pipeline</span>
        </div>
        <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-800/60 border-slate-700' : 'bg-white border-slate-200'}`}>
          <span className="text-xs font-semibold text-slate-500 uppercase">Selected / Ready</span>
          <p className="text-2xl font-bold mt-1 text-emerald-600 dark:text-emerald-400">
            {candidates.filter(c => c.stage === 'SELECTED' || c.stage === 'READY_FOR_ONBOARDING').length}
          </p>
          <span className="text-xs text-slate-500">Eligible for 1-click hire</span>
        </div>
        <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-800/60 border-slate-700' : 'bg-white border-slate-200'}`}>
          <span className="text-xs font-semibold text-slate-500 uppercase">Onboarded Total</span>
          <p className="text-2xl font-bold mt-1 text-indigo-600 dark:text-indigo-400">
            {candidates.filter(c => c.stage === 'CONVERTED_TO_EMPLOYEE').length}
          </p>
          <span className="text-xs text-slate-500">Converted to full staff</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setActiveTab('CANDIDATES')}
          className={`px-5 py-3 text-sm font-bold border-b-2 transition ${
            activeTab === 'CANDIDATES'
              ? 'border-teal-600 text-teal-600 dark:text-teal-400'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Candidate Pipeline & Verification ({candidates.length})
        </button>
        <button
          onClick={() => setActiveTab('REQUISITIONS')}
          className={`px-5 py-3 text-sm font-bold border-b-2 transition ${
            activeTab === 'REQUISITIONS'
              ? 'border-teal-600 text-teal-600 dark:text-teal-400'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Job Requisitions & Headcount ({requisitions.length})
        </button>
        <button
          onClick={() => setActiveTab('SCREENING_QUEUE')}
          className={`px-5 py-3 text-sm font-bold border-b-2 transition ${
            activeTab === 'SCREENING_QUEUE'
              ? 'border-teal-600 text-teal-600 dark:text-teal-400'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Screening Queue ({candidates.filter(c => c.stage === 'APPLIED' || c.stage === 'SCREENING').length})
        </button>
        <button
          onClick={() => setActiveTab('INTERVIEWS')}
          className={`px-5 py-3 text-sm font-bold border-b-2 transition ${
            activeTab === 'INTERVIEWS'
              ? 'border-teal-600 text-teal-600 dark:text-teal-400'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Interview Rounds ({interviews.filter(i => i.status !== 'COMPLETED' && i.status !== 'CANCELLED').length})
        </button>
        <button
          onClick={() => setActiveTab('SELECTION_QUEUE')}
          className={`px-5 py-3 text-sm font-bold border-b-2 transition ${
            activeTab === 'SELECTION_QUEUE'
              ? 'border-teal-600 text-teal-600 dark:text-teal-400'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Selection Review ({candidates.filter(c => c.stage === 'INTERVIEW_SCHEDULED').length})
        </button>
        <button
          onClick={() => setActiveTab('VERIFICATIONS')}
          className={`px-5 py-3 text-sm font-bold border-b-2 transition ${
            activeTab === 'VERIFICATIONS'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Verifications ({verifications.filter(v => v.status !== 'CLEARED' && v.status !== 'FAILED' && v.status !== 'CLOSED').length})
        </button>
      </div>

      {/* Tab 1: Candidates View */}
      {activeTab === 'CANDIDATES' && (
        <div className="space-y-4">
          {/* Search & Filter Bar */}
          <div className={`p-4 rounded-xl border flex flex-col md:flex-row items-center gap-3 justify-between ${
            isDark ? 'bg-slate-800/40 border-slate-700' : 'bg-white border-slate-200'
          }`}>
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Search candidate name, code, role..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full pl-9 pr-4 py-2 rounded-lg text-sm border focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                  isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                }`}
              />
            </div>

            <select
              value={stageFilter}
              onChange={(e) => setStageFilter(e.target.value)}
              className={`px-3 py-2 rounded-lg text-sm border focus:outline-none ${
                isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
              }`}
            >
              <option value="ALL">All Stages</option>
              <option value="APPLIED">Applied</option>
              <option value="SCREENING">Screening</option>
              <option value="INTERVIEW_SCHEDULED">Interview</option>
              <option value="BACKGROUND_VERIFICATION">Background Verification</option>
              <option value="SELECTED">Selected</option>
              <option value="SELECTED">Offer Extended</option>
              <option value="CONVERTED_TO_EMPLOYEE">Onboarded</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>

          {/* Candidates Table */}
          <div className={`rounded-xl border overflow-hidden ${isDark ? 'bg-slate-800/40 border-slate-700' : 'bg-white border-slate-200'}`}>
            {loading ? (
              <div className="p-12 text-center text-slate-500">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-teal-600" />
                <p>Loading candidate registry...</p>
              </div>
            ) : filteredCandidates.length === 0 ? (
              <div className="p-12 text-center text-slate-500">
                <Users className="w-12 h-12 mx-auto mb-3 opacity-40" />
                <h3 className="font-bold text-base text-slate-700 dark:text-slate-300">No Candidates Found</h3>
                <p className="text-sm mt-1">Register a new applicant to track screening and hiring.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className={`border-b text-xs uppercase font-semibold ${
                    isDark ? 'bg-slate-800/80 border-slate-700 text-slate-400' : 'bg-slate-100/70 border-slate-200 text-slate-600'
                  }`}>
                    <tr>
                      <th className="p-3.5">Candidate</th>
                      <th className="p-3.5">Role & Experience</th>
                      <th className="p-3.5">KYC & Verification</th>
                      <th className="p-3.5">Expected Pay</th>
                      <th className="p-3.5">Stage</th>
                      <th className="p-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                    {filteredCandidates.map((c) => (
                      <tr
                        key={c.id}
                        onClick={() => setSelectedCandidate(c)}
                        className={`cursor-pointer transition ${
                          isDark ? 'hover:bg-slate-800/60' : 'hover:bg-slate-50'
                        }`}
                      >
                        <td className="p-3.5">
                          <div className="font-bold text-slate-900 dark:text-slate-100">{c.fullName}</div>
                          <div className="text-xs text-slate-500">{c.candidateCode} • {c.phoneNumber}</div>
                        </td>
                        <td className="p-3.5">
                          <div className="font-medium text-slate-800 dark:text-slate-200">{c.jobTitleAppliedFor}</div>
                          <div className="text-xs text-slate-500">{c.experienceYears} yrs exp • {c.highestEducation}</div>
                        </td>
                        <td className="p-3.5">
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                              c.aadhaarVerificationStatus === 'VERIFIED'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                            }`}>
                              Aadhaar: {c.aadhaarVerificationStatus}
                            </span>
                            <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                              c.policeVerificationStatus === 'VERIFIED'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                            }`}>
                              Police: {c.policeVerificationStatus}
                            </span>
                          </div>
                        </td>
                        <td className="p-3.5 font-medium">
                          ₹{c.expectedSalaryMonthly.toLocaleString()}/mo
                        </td>
                        <td className="p-3.5">
                          {getStageBadge(c.stage)}
                        </td>
                        <td className="p-3.5 text-right">
                          {c.stage === 'APPLIED' ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStartScreening(c);
                              }}
                              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-sm transition flex items-center gap-1 ml-auto"
                            >
                              <ShieldCheck className="w-3.5 h-3.5" />
                              <span>Screen</span>
                            </button>
                          ) : c.stage === 'INTERVIEW_SCHEDULED' ? (
                            <div className="flex items-center gap-2 justify-end">
                              {interviews.some(i => i.candidateId === c.id && i.status === 'COMPLETED') && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleStartSelection(c);
                                  }}
                                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm transition flex items-center gap-1"
                                >
                                  <UserCheck className="w-3.5 h-3.5" />
                                  <span>Select</span>
                                </button>
                              )}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleStartScheduling(c);
                                }}
                                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-sm transition flex items-center gap-1"
                              >
                                <Calendar className="w-3.5 h-3.5" />
                                <span>Schedule</span>
                              </button>
                            </div>
                          ) : c.stage === 'SELECTED' || c.stage === 'READY_FOR_ONBOARDING' ? (
                            <div className="flex items-center gap-2 justify-end">
                              {c.stage === 'SELECTED' && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handlePrepareOffer(c);
                                  }}
                                  className="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-semibold shadow-sm transition flex items-center gap-1"
                                >
                                  <FileText className="w-3.5 h-3.5" />
                                  <span>Offer</span>
                                </button>
                              )}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleStartVerificationRequest(c);
                                }}
                                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-sm transition flex items-center gap-1"
                              >
                                <ShieldCheck className="w-3.5 h-3.5" />
                                <span>Verify</span>
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handle1ClickConvert(c);
                                }}
                                className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-semibold shadow-sm transition flex items-center gap-1"
                              >
                                <Sparkles className="w-3.5 h-3.5" />
                                <span>1-Click Hire</span>
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedCandidate(c);
                              }}
                              className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-lg transition"
                            >
                              Review
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Requisitions View */}
      {activeTab === 'REQUISITIONS' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {requisitions.length === 0 ? (
              <div className="col-span-full p-12 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl">
                <Briefcase className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                <h3 className="font-bold text-lg text-slate-700 dark:text-slate-300">No Job Requisitions</h3>
                <p className="text-sm text-slate-500 mt-1">Create your first requisition to start tracking vacancies and hiring pipeline.</p>
              </div>
            ) : (
              requisitions.map((req) => (
                <div
                  key={req.id}
                  className={`p-6 rounded-3xl border flex flex-col justify-between transition-all hover:shadow-xl ${
                    isDark ? 'bg-slate-800/40 border-slate-700' : 'bg-white border-slate-200'
                  }`}
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-1 bg-slate-100 dark:bg-slate-900 rounded text-[10px] font-mono font-bold text-slate-500">{req.requisitionCode}</span>
                        {req.priority === 'CRITICAL' && <span className="px-2 py-0.5 bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 text-[10px] font-bold rounded-full">CRITICAL</span>}
                        {req.priority === 'HIGH' && <span className="px-2 py-0.5 bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-400 text-[10px] font-bold rounded-full">HIGH</span>}
                      </div>
                      <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        req.status === 'OPEN' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400' :
                        req.status === 'PENDING_APPROVAL' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400' :
                        req.status === 'DRAFT' ? 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300' :
                        req.status === 'FILLED' ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-400' :
                        'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-400'
                      }`}>
                        {req.status.replace(/_/g, ' ')}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 leading-tight">{req.jobTitle}</h3>
                      <div className="flex items-center gap-2 mt-1 text-xs text-slate-500 font-medium">
                        <span>{req.departmentName}</span>
                        <span>•</span>
                        <span>{req.siteName}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 py-4 border-y border-slate-100 dark:border-slate-800">
                      <div>
                        <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Headcount</span>
                        <div className="flex items-end gap-1">
                          <span className="text-xl font-bold text-teal-600">{req.filledPositions}</span>
                          <span className="text-sm text-slate-400 mb-0.5">/ {req.openPositions}</span>
                        </div>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Pipeline</span>
                        <div className="flex items-center gap-1.5 mt-1">
                          <Users className="w-4 h-4 text-slate-400" />
                          <span className="text-sm font-bold">{req.pipelineCount || 0} Applicants</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 text-slate-500">
                          <DollarSign className="w-3.5 h-3.5" />
                          <span>Monthly Budget</span>
                        </div>
                        <span className="font-bold">₹{req.salaryMinMonthly.toLocaleString()} - {req.salaryMaxMonthly.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 text-slate-500">
                          <UserCheck className="w-3.5 h-3.5" />
                          <span>Hiring Manager</span>
                        </div>
                        <span className="font-bold">{req.hiringManagerName}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 text-slate-500">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>Target Joining</span>
                        </div>
                        <span className="font-bold">{new Date(req.targetHiringDate).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-6 flex flex-col gap-2">
                    {req.status === 'DRAFT' && (
                      <button
                        onClick={() => handleSubmitReqForApproval(req.id)}
                        disabled={isSubmittingReq}
                        className="w-full py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-lg transition flex items-center justify-center gap-2"
                      >
                        {isSubmittingReq ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                        Submit for Approval
                      </button>
                    )}
                    {req.status === 'OPEN' && (
                      <button
                        onClick={() => {
                          setCandFormData(prev => ({ ...prev, requisitionId: req.id, jobTitleAppliedFor: req.jobTitle }));
                          setIsCandidateModalOpen(true);
                          setActiveTab('CANDIDATES');
                        }}
                        className="w-full py-2.5 bg-teal-50 dark:bg-teal-950/40 hover:bg-teal-100 text-teal-600 dark:text-teal-400 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2"
                      >
                        <Plus className="w-4 h-4" />
                        Add New Applicant
                      </button>
                    )}
                    {(req.status === 'REJECTED' || req.status === 'DRAFT') && (
                      <button
                        className="w-full py-2.5 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl text-xs font-bold transition"
                      >
                        Edit Details
                      </button>
                    )}
                    {req.status === 'PENDING_APPROVAL' && (
                      <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-900 rounded-xl text-center">
                        <p className="text-[10px] font-bold text-amber-800 dark:text-amber-300 uppercase tracking-widest mb-1">Under BPM Approval</p>
                        <p className="text-[10px] text-amber-600 dark:text-amber-400">Waiting for departmental authorization.</p>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {activeTab === 'SCREENING_QUEUE' && (
        <div className="space-y-4">
          <div className={`p-6 rounded-3xl border ${isDark ? 'bg-slate-800/40 border-slate-700' : 'bg-white border-slate-200'}`}>
            <h2 className="text-lg font-bold mb-1 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-indigo-500" />
              Recruitment Screening Queue
            </h2>
            <p className="text-sm text-slate-500 mb-6">Review applicants against requisition criteria and decide their eligibility for interview.</p>

            {candidates.filter(c => c.stage === 'APPLIED' || c.stage === 'SCREENING').length === 0 ? (
              <div className="py-12 text-center text-slate-400">
                <CheckCircle className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p className="font-bold">Queue is empty</p>
                <p className="text-xs">No pending applications require screening at this time.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {candidates.filter(c => c.stage === 'APPLIED' || c.stage === 'SCREENING').map(c => {
                  const req = requisitions.find(r => r.id === c.requisitionId);
                  return (
                    <div 
                      key={c.id} 
                      className={`p-4 rounded-2xl border flex items-center justify-between transition-all hover:border-indigo-400 ${
                        isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-950/40 rounded-xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-lg">
                          {c.fullName.charAt(0)}
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-900 dark:text-slate-100">{c.fullName}</h4>
                          <div className="text-xs text-slate-500 flex flex-col gap-0.5">
                            <span>{c.jobTitleAppliedFor}</span>
                            {req && (
                              <span className="text-indigo-600 dark:text-indigo-400 font-medium">
                                Requisition: {req.requisitionCode} ({req.jobTitle})
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <button 
                        onClick={() => handleStartScreening(c)}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-md flex items-center gap-2"
                      >
                        <ShieldCheck className="w-4 h-4" />
                        Start Screening
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className={`p-6 rounded-3xl border ${isDark ? 'bg-slate-800/40 border-slate-700' : 'bg-white border-slate-200'}`}>
            <h3 className="text-sm font-bold mb-4 uppercase tracking-widest text-slate-500">Recent Screening History</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-slate-400 border-b border-slate-100 dark:border-slate-800">
                    <th className="py-3 px-2">Date</th>
                    <th className="py-3 px-2">Candidate</th>
                    <th className="py-3 px-2">Requisition</th>
                    <th className="py-3 px-2">Screener</th>
                    <th className="py-3 px-2">Decision</th>
                    <th className="py-3 px-2 text-right">Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {screenings.slice(0, 10).map(scr => {
                    const cand = candidates.find(c => c.id === scr.candidateId);
                    const req = requisitions.find(r => r.id === scr.requisitionId);
                    return (
                      <tr key={scr.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition">
                        <td className="py-3 px-2 font-medium">{new Date(scr.screeningDate).toLocaleDateString()}</td>
                        <td className="py-3 px-2 font-bold text-slate-700 dark:text-slate-300">{cand?.fullName || 'Deleted Candidate'}</td>
                        <td className="py-3 px-2 font-mono">{req?.requisitionCode || 'N/A'}</td>
                        <td className="py-3 px-2">{scr.screenerName}</td>
                        <td className="py-3 px-2">
                          <span className={`px-2 py-0.5 rounded-full font-bold text-[9px] uppercase ${
                            scr.decision === 'SHORTLISTED' ? 'bg-emerald-100 text-emerald-800' :
                            scr.decision === 'REJECTED' ? 'bg-rose-100 text-rose-800' :
                            'bg-amber-100 text-amber-800'
                          }`}>
                            {scr.decision}
                          </span>
                        </td>
                        <td className="py-3 px-2 text-right">
                          <span className={`font-bold ${
                            (scr.overallEligibilityScore || 0) >= 70 ? 'text-emerald-600' :
                            (scr.overallEligibilityScore || 0) >= 40 ? 'text-amber-600' :
                            'text-rose-600'
                          }`}>
                            {scr.overallEligibilityScore}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'INTERVIEWS' && (
        <div className="space-y-4">
          <div className={`p-6 rounded-3xl border ${isDark ? 'bg-slate-800/40 border-slate-700' : 'bg-white border-slate-200'}`}>
            <h2 className="text-lg font-bold mb-1 flex items-center gap-2">
              <Video className="w-5 h-5 text-indigo-500" />
              Interview Management
            </h2>
            <p className="text-sm text-slate-500 mb-6">Manage candidate interview schedules, evaluations, and hiring decisions.</p>

            {interviews.length === 0 ? (
              <div className="py-12 text-center text-slate-400">
                <Calendar className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p className="font-bold">No interviews scheduled</p>
                <p className="text-xs">Schedule an interview from the candidate pipeline or screening queue.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {interviews.map(int => {
                  const cand = candidates.find(c => c.id === int.candidateId);
                  const req = requisitions.find(r => r.id === int.requisitionId);
                  const isUpcoming = new Date(int.scheduledAt) > new Date();
                  
                  return (
                    <div 
                      key={int.id} 
                      className={`p-4 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all hover:border-indigo-400 ${
                        isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg ${
                          int.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-600' :
                          int.status === 'CANCELLED' ? 'bg-rose-100 text-rose-600' :
                          'bg-indigo-100 text-indigo-600'
                        }`}>
                          {cand?.fullName.charAt(0) || '?'}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-slate-900 dark:text-slate-100">{cand?.fullName || 'Deleted Candidate'}</h4>
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                              int.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800' :
                              int.status === 'SCHEDULED' ? 'bg-indigo-100 text-indigo-800' :
                              int.status === 'IN_PROGRESS' ? 'bg-amber-100 text-amber-800' :
                              'bg-slate-100 text-slate-800'
                            }`}>
                              {int.status}
                            </span>
                          </div>
                          <div className="text-xs text-slate-500 flex flex-col gap-0.5">
                            <div className="flex items-center gap-1.5">
                              <Briefcase className="w-3 h-3" />
                              <span>{int.type} Interview • {req?.jobTitle || 'Unknown Position'}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Clock3 className="w-3 h-3" />
                              <span className={isUpcoming && int.status === 'SCHEDULED' ? 'text-indigo-600 font-medium' : ''}>
                                {new Date(int.scheduledAt).toLocaleString()} ({int.durationMinutes} min)
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 ml-auto md:ml-0">
                        {int.status === 'SCHEDULED' && (
                          <>
                            <button 
                              onClick={() => handleUpdateInterviewStatus(int.id, 'IN_PROGRESS')}
                              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-[10px] font-bold transition flex items-center gap-1"
                            >
                              <RefreshCw className="w-3 h-3" /> Start
                            </button>
                            <button 
                              onClick={() => handleUpdateInterviewStatus(int.id, 'CANCELLED')}
                              className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-[10px] font-bold transition flex items-center gap-1"
                            >
                              <X className="w-3 h-3" /> Cancel
                            </button>
                          </>
                        )}
                        {(int.status === 'SCHEDULED' || int.status === 'IN_PROGRESS') && (
                          <button 
                            onClick={() => handleStartEvaluation(int)}
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-md flex items-center gap-2"
                          >
                            <UserCheck className="w-4 h-4" />
                            Evaluate
                          </button>
                        )}
                        {int.status === 'COMPLETED' && (
                          <div className="flex items-center gap-2">
                             <div className="text-right mr-2">
                               <p className="text-[10px] font-bold text-slate-400 uppercase">Decision</p>
                               <p className={`text-xs font-bold ${
                                 int.decision === 'SELECTED' ? 'text-emerald-600' :
                                 int.decision === 'REJECTED' ? 'text-rose-600' :
                                 'text-amber-600'
                               }`}>{int.decision}</p>
                             </div>
                             <button 
                              onClick={() => handleStartEvaluation(int)}
                              className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition"
                             >
                               <FileText className="w-4 h-4" />
                             </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 5: Selection Queue View */}
      {activeTab === 'SELECTION_QUEUE' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black tracking-tight text-slate-800 dark:text-slate-100 flex items-center gap-3">
              <div className="p-2 bg-emerald-100 dark:bg-emerald-900/40 rounded-xl text-emerald-600">
                <UserCheck className="w-6 h-6" />
              </div>
              Final Selection Review
            </h2>
            <div className="flex items-center gap-3">
               <span className="text-xs text-slate-500 font-medium italic">Pending review for candidates who completed interviews</span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {candidates.filter(c => c.stage === 'INTERVIEW_SCHEDULED').length === 0 ? (
              <div className="p-12 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl">
                <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                <h3 className="font-bold text-lg text-slate-700 dark:text-slate-300">Queue is Empty</h3>
                <p className="text-sm text-slate-500 mt-1">No candidates are currently pending a selection decision.</p>
              </div>
            ) : (
              candidates.filter(c => c.stage === 'INTERVIEW_SCHEDULED').map((c) => {
                const req = requisitions.find(r => r.id === c.requisitionId);
                const interviewList = interviews.filter(i => i.candidateId === c.id);
                const latestInt = interviewList.sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime())[0];
                const isReady = interviewList.some(i => i.status === 'COMPLETED');

                return (
                  <div 
                    key={c.id}
                    className={`p-5 rounded-2xl border transition-all hover:shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                      isDark ? 'bg-slate-800/40 border-slate-700' : 'bg-white border-slate-200 shadow-sm'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg ${
                        isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {c.fullName.charAt(0)}
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 dark:text-slate-100">{c.fullName}</h4>
                        <p className="text-xs text-slate-500 font-medium">Applied for: {c.jobTitleAppliedFor} • {req?.requisitionCode}</p>
                        <div className="flex items-center gap-3 mt-1">
                           <span className="text-[10px] uppercase font-bold text-slate-400">Interviews: {interviewList.length}</span>
                           <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                             isReady ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                           }`}>
                             {isReady ? 'Completed' : 'In Progress'}
                           </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                       <div className="text-right mr-4 hidden md:block">
                          <p className="text-[10px] font-bold text-slate-400 uppercase">Avg Rating</p>
                          <div className="flex items-center justify-end gap-1">
                             <Award className="w-3 h-3 text-amber-500" />
                             <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
                               {latestInt?.evaluation?.overallRating || 'N/A'}
                             </span>
                          </div>
                       </div>
                       
                       <button
                         onClick={() => handleStartSelection(c)}
                         disabled={!isReady}
                         className={`px-4 py-2 rounded-xl text-sm font-bold transition flex items-center gap-2 ${
                           isReady 
                             ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md' 
                             : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                         }`}
                       >
                         <UserCheck className="w-4 h-4" />
                         Make Decision
                       </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Tab 6: Background Verification Queue */}
      {activeTab === 'VERIFICATIONS' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black tracking-tight text-slate-800 dark:text-slate-100 flex items-center gap-3">
              <div className="p-2 bg-indigo-100 dark:bg-indigo-900/40 rounded-xl text-indigo-600">
                <ShieldCheck className="w-6 h-6" />
              </div>
              Background Verifications
            </h2>
            <div className="flex items-center gap-3">
               <span className="text-xs text-slate-500 font-medium italic">Track and process background verification checks</span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {verifications.length === 0 ? (
              <div className="p-12 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl">
                <ShieldCheck className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                <h3 className="font-bold text-lg text-slate-700 dark:text-slate-300">No Active Verifications</h3>
                <p className="text-sm text-slate-500 mt-1">Background check requests will appear here once initiated.</p>
              </div>
            ) : (
              verifications.map((v) => {
                const candidate = candidates.find(c => c.id === v.candidateId);
                const isOverdue = new Date(v.dueDate) < new Date() && v.status !== 'CLEARED' && v.status !== 'FAILED' && v.status !== 'CLOSED';

                return (
                  <div 
                    key={v.id}
                    className={`p-5 rounded-2xl border transition-all hover:shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                      isDark ? 'bg-slate-800/40 border-slate-700' : 'bg-white border-slate-200 shadow-sm'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg ${
                        isDark ? 'bg-slate-700 text-indigo-400' : 'bg-indigo-50 text-indigo-600'
                      }`}>
                        {v.type.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                           <h4 className="font-bold text-slate-900 dark:text-slate-100">{candidate?.fullName || 'Unknown Candidate'}</h4>
                           <span className="text-[10px] bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full font-bold text-slate-500 uppercase tracking-wider">{v.verificationCode}</span>
                        </div>
                        <p className="text-xs text-slate-500 font-medium">{v.type} Check • Requested: {new Date(v.requestDate).toLocaleDateString()}</p>
                        <div className="flex items-center gap-3 mt-1">
                           <div className="flex items-center gap-1">
                              <Calendar className={`w-3 h-3 ${isOverdue ? 'text-rose-500' : 'text-slate-400'}`} />
                              <span className={`text-[10px] font-bold ${isOverdue ? 'text-rose-500' : 'text-slate-400'}`}>
                                Due: {new Date(v.dueDate).toLocaleDateString()} {isOverdue && '(OVERDUE)'}
                              </span>
                           </div>
                           <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                             v.status === 'CLEARED' ? 'bg-emerald-100 text-emerald-700' :
                             v.status === 'FAILED' ? 'bg-rose-100 text-rose-700' :
                             v.status === 'IN_PROGRESS' || v.status === 'UNDER_REVIEW' ? 'bg-blue-100 text-blue-700' :
                             'bg-amber-100 text-amber-700'
                           }`}>
                             {v.status.replace('_', ' ')}
                           </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                       {v.evidenceReferences.length > 0 && (
                         <div className="flex -space-x-2 mr-2">
                           {v.evidenceReferences.map((e: any, idx: number) => (
                             <div key={idx} className="w-8 h-8 rounded-full border-2 border-white dark:border-slate-800 bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-[10px] font-bold text-slate-600 dark:text-slate-300">
                               <FileText className="w-3.5 h-3.5" />
                             </div>
                           ))}
                         </div>
                       )}

                       <button
                         onClick={() => handleStartProcessingVerification(v)}
                         className={`px-4 py-2 rounded-xl text-sm font-bold transition flex items-center gap-2 ${
                           isDark ? 'bg-slate-700 hover:bg-slate-600 text-slate-100' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                         }`}
                       >
                         <ArrowRight className="w-4 h-4" />
                         Process
                       </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Candidate Screening Evaluation Modal */}
      {isScreeningModalOpen && candidateToScreen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md">
          <form 
            onSubmit={handleSubmitScreening}
            className={`w-full max-w-2xl max-h-[90vh] rounded-2xl shadow-2xl overflow-hidden border flex flex-col ${
              isDark ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div className={`p-4 border-b flex items-center justify-between ${isDark ? 'border-slate-800 bg-slate-850' : 'border-slate-200 bg-slate-50'}`}>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-100 dark:bg-indigo-900/40 rounded-lg text-indigo-600">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">Eligibility Screening Evaluation</h3>
                  <p className="text-[10px] text-slate-500 font-medium">{candidateToScreen.fullName} • {candidateToScreen.candidateCode}</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setIsScreeningModalOpen(false)}
                className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Context Summary */}
              <div className="grid grid-cols-2 gap-4">
                <div className={`p-3 rounded-xl border ${isDark ? 'bg-slate-800/40 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                  <span className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Candidate Profile</span>
                  <p className="text-sm font-bold">{candidateToScreen.jobTitleAppliedFor}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{candidateToScreen.highestEducation} • {candidateToScreen.experienceYears} Years Exp</p>
                </div>
                <div className={`p-3 rounded-xl border ${isDark ? 'bg-slate-800/40 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                  <span className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Linked Requisition</span>
                  <p className="text-sm font-bold">
                    {requisitions.find(r => r.id === candidateToScreen.requisitionId)?.jobTitle || 'N/A'}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">Code: {requisitions.find(r => r.id === candidateToScreen.requisitionId)?.requisitionCode}</p>
                </div>
              </div>

              {/* Automated Eligibility Results */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5" />
                  Criteria Validation Results
                </h4>
                <div className="space-y-2">
                  {screeningFormData.criteriaResults.map((res, idx) => (
                    <div 
                      key={idx} 
                      className={`p-3 rounded-xl border flex items-start gap-3 ${
                        res.isMet 
                          ? (isDark ? 'bg-emerald-950/20 border-emerald-900/50' : 'bg-emerald-50/50 border-emerald-100') 
                          : (isDark ? 'bg-rose-950/20 border-rose-900/50' : 'bg-rose-50/50 border-rose-100')
                      }`}
                    >
                      <div className={`p-1 rounded-full mt-0.5 ${res.isMet ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>
                        {res.isMet ? <CheckCircle className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">{res.type}</span>
                          <span className={`text-[10px] font-bold ${res.isMet ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {res.isMet ? 'MATCHED' : 'NOT MET'}
                          </span>
                        </div>
                        <p className="text-xs font-medium mt-0.5 text-slate-900 dark:text-slate-100">{res.requirement}</p>
                        <p className="text-[11px] text-slate-500 mt-1 italic">{res.details}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Decision Section */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500">Screening Decision</label>
                    <select
                      required
                      value={screeningFormData.decision}
                      onChange={(e) => setScreeningFormData(prev => ({ ...prev, decision: e.target.value as ScreeningDecision }))}
                      className={`w-full p-2.5 rounded-xl border text-sm font-medium focus:ring-2 focus:ring-indigo-500 transition outline-none ${
                        isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
                      }`}
                    >
                      <option value="SHORTLISTED">SHORTLISTED</option>
                      <option value="HOLD">KEEP ON HOLD</option>
                      <option value="REJECTED">REJECTED</option>
                    </select>
                  </div>
                  {screeningFormData.decision === 'REJECTED' && (
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500">Rejection Reason</label>
                      <input
                        required
                        type="text"
                        placeholder="e.g. Qualification mismatch"
                        value={screeningFormData.rejectionReason}
                        onChange={(e) => setScreeningFormData(prev => ({ ...prev, rejectionReason: e.target.value }))}
                        className={`w-full p-2.5 rounded-xl border text-sm font-medium focus:ring-2 focus:ring-indigo-500 transition outline-none ${
                          isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
                        }`}
                      />
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500">Internal Screening Notes</label>
                  <textarea
                    rows={3}
                    placeholder="Provide additional details regarding candidate eligibility..."
                    value={screeningFormData.notes}
                    onChange={(e) => setScreeningFormData(prev => ({ ...prev, notes: e.target.value }))}
                    className={`w-full p-2.5 rounded-xl border text-sm font-medium focus:ring-2 focus:ring-indigo-500 transition outline-none resize-none ${
                      isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
                    }`}
                  />
                </div>
              </div>
            </div>

            <div className={`p-4 border-t flex items-center justify-between ${isDark ? 'bg-slate-850 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
              <div className="flex items-center gap-2">
                <div className={`p-2 rounded-lg ${isDark ? 'bg-slate-800' : 'bg-white'} border border-slate-200 dark:border-slate-700`}>
                   <span className="text-xs font-bold">Score: </span>
                   <span className={`text-sm font-bold ${
                     (screeningFormData.criteriaResults.filter(r => r.isMet).length / Math.max(1, screeningFormData.criteriaResults.length)) >= 0.7 ? 'text-emerald-600' : 'text-rose-600'
                   }`}>
                     {Math.round((screeningFormData.criteriaResults.filter(r => r.isMet).length / Math.max(1, screeningFormData.criteriaResults.length)) * 100)}%
                   </span>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsScreeningModalOpen(false)}
                  className="px-6 py-2 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingScreening}
                  className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-lg transition disabled:opacity-50 flex items-center gap-2"
                >
                  {isSubmittingScreening ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                  Submit Evaluation
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Interview Scheduling Modal */}
      {isInterviewModalOpen && selectedCandidate && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md">
          <form 
            onSubmit={handleSubmitInterview}
            className={`w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden border flex flex-col ${
              isDark ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div className={`p-4 border-b flex items-center justify-between ${isDark ? 'border-slate-800 bg-slate-850' : 'border-slate-200 bg-slate-50'}`}>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-100 dark:bg-indigo-900/40 rounded-lg text-indigo-600">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">Schedule Interview</h3>
                  <p className="text-[10px] text-slate-500 font-medium">{selectedCandidate.fullName} • {selectedCandidate.candidateCode}</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setIsInterviewModalOpen(false)}
                className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500">Interview Type</label>
                  <select
                    required
                    value={interviewFormData.type}
                    onChange={(e) => setInterviewFormData(prev => ({ ...prev, type: e.target.value as InterviewType }))}
                    className={`w-full p-2.5 rounded-xl border text-sm font-medium focus:ring-2 focus:ring-indigo-500 transition outline-none ${
                      isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
                    }`}
                  >
                    <option value="GENERAL">General Interview</option>
                    <option value="TECHNICAL">Technical Round</option>
                    <option value="HR">HR Round</option>
                    <option value="MANAGERIAL">Managerial Round</option>
                    <option value="FINAL">Final Interview</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500">Duration (Minutes)</label>
                  <input
                    type="number"
                    required
                    min="15"
                    step="15"
                    value={interviewFormData.durationMinutes}
                    onChange={(e) => setInterviewFormData(prev => ({ ...prev, durationMinutes: parseInt(e.target.value) }))}
                    className={`w-full p-2.5 rounded-xl border text-sm font-medium focus:ring-2 focus:ring-indigo-500 transition outline-none ${
                      isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
                    }`}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500">Scheduled At</label>
                <input
                  type="datetime-local"
                  required
                  value={interviewFormData.scheduledAt}
                  onChange={(e) => setInterviewFormData(prev => ({ ...prev, scheduledAt: e.target.value }))}
                  className={`w-full p-2.5 rounded-xl border text-sm font-medium focus:ring-2 focus:ring-indigo-500 transition outline-none ${
                    isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
                  }`}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500">Location / Meeting Link</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="e.g. Conference Room A or Google Meet link"
                    value={interviewFormData.location}
                    onChange={(e) => setInterviewFormData(prev => ({ ...prev, location: e.target.value, meetingLink: e.target.value }))}
                    className={`w-full pl-10 p-2.5 rounded-xl border text-sm font-medium focus:ring-2 focus:ring-indigo-500 transition outline-none ${
                      isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
                    }`}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500">Assign Interviewers (Authorized Staff)</label>
                <div className={`p-2 rounded-xl border max-h-40 overflow-y-auto space-y-1 ${
                  isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
                }`}>
                  {employees.filter(emp => emp.authUid).map(emp => (
                    <label key={emp.id} className="flex items-center gap-2 p-2 hover:bg-slate-50 dark:hover:bg-slate-700/30 rounded-lg cursor-pointer transition">
                      <input
                        type="checkbox"
                        checked={interviewFormData.interviewerIds.includes(emp.authUid || '')}
                        onChange={(e) => {
                          const id = emp.authUid!;
                          if (e.target.checked) {
                            setInterviewFormData(prev => ({ ...prev, interviewerIds: [...prev.interviewerIds, id] }));
                          } else {
                            setInterviewFormData(prev => ({ ...prev, interviewerIds: prev.interviewerIds.filter(i => i !== id) }));
                          }
                        }}
                        className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold truncate">{emp.firstName} {emp.lastName}</p>
                        <p className="text-[10px] text-slate-500 truncate">{emp.designation} • {emp.employeeId}</p>
                      </div>
                    </label>
                  ))}
                </div>
                <p className="text-[10px] text-slate-500 italic">Select one or more interviewers from the employee master.</p>
              </div>
            </div>

            <div className={`p-4 border-t flex items-center justify-end gap-3 ${isDark ? 'bg-slate-850 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
              <button
                type="button"
                onClick={() => setIsInterviewModalOpen(false)}
                className="px-6 py-2 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-700 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSchedulingInterview}
                className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-lg transition disabled:opacity-50 flex items-center gap-2"
              >
                {isSchedulingInterview ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Calendar className="w-4 h-4" />}
                Schedule Interview
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Interview Evaluation Modal */}
      {isEvaluationModalOpen && selectedInterview && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md">
          <form 
            onSubmit={handleSubmitEvaluation}
            className={`w-full max-w-xl max-h-[90vh] rounded-2xl shadow-2xl overflow-hidden border flex flex-col ${
              isDark ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div className={`p-4 border-b flex items-center justify-between ${isDark ? 'border-slate-800 bg-slate-850' : 'border-slate-200 bg-slate-50'}`}>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-100 dark:bg-emerald-900/40 rounded-lg text-emerald-600">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">Interview Evaluation</h3>
                  <p className="text-[10px] text-slate-500 font-medium">{selectedCandidate?.fullName} • {selectedInterview.type} Round</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setIsEvaluationModalOpen(false)}
                className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Scoring Section */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500">Evaluation Criteria</h4>
                <div className="space-y-3">
                  {evaluationFormData.criteria.map((item, idx) => (
                    <div key={idx} className={`p-3 rounded-xl border ${isDark ? 'bg-slate-800/40 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{item.criteria}</span>
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map(star => (
                            <button
                              key={star}
                              type="button"
                              onClick={() => {
                                const newCriteria = [...evaluationFormData.criteria];
                                newCriteria[idx].rating = star;
                                setEvaluationFormData(prev => ({ ...prev, criteria: newCriteria }));
                              }}
                              className={`p-0.5 transition ${item.rating >= star ? 'text-amber-500' : 'text-slate-300'}`}
                            >
                              <Sparkles className="w-3.5 h-3.5 fill-current" />
                            </button>
                          ))}
                        </div>
                      </div>
                      <input
                        type="text"
                        placeholder="Specific comments for this criteria..."
                        value={item.comments}
                        onChange={(e) => {
                          const newCriteria = [...evaluationFormData.criteria];
                          newCriteria[idx].comments = e.target.value;
                          setEvaluationFormData(prev => ({ ...prev, criteria: newCriteria }));
                        }}
                        className={`w-full p-2 rounded-lg border text-[11px] outline-none focus:ring-1 focus:ring-indigo-500 ${
                          isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'
                        }`}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Decision Section */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500">Final Decision</label>
                    <select
                      required
                      value={evaluationFormData.decision}
                      onChange={(e) => setEvaluationFormData(prev => ({ ...prev, decision: e.target.value as InterviewDecision }))}
                      className={`w-full p-2.5 rounded-xl border text-sm font-medium focus:ring-2 focus:ring-indigo-500 transition outline-none ${
                        isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
                      }`}
                    >
                      <option value="SELECTED">SELECTED</option>
                      <option value="FURTHER_REVIEW">FURTHER REVIEW</option>
                      <option value="HOLD">KEEP ON HOLD</option>
                      <option value="REJECTED">REJECTED</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500">Overall Rating (1-5)</label>
                    <input
                      type="number"
                      required
                      min="1"
                      max="5"
                      value={evaluationFormData.rating}
                      onChange={(e) => setEvaluationFormData(prev => ({ ...prev, rating: parseInt(e.target.value) }))}
                      className={`w-full p-2.5 rounded-xl border text-sm font-medium focus:ring-2 focus:ring-indigo-500 transition outline-none ${
                        isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
                      }`}
                    />
                  </div>
                </div>

                {evaluationFormData.decision === 'REJECTED' && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500">Rejection Reason</label>
                    <input
                      required
                      type="text"
                      placeholder="e.g. Communication barrier"
                      value={evaluationFormData.rejectionReason}
                      onChange={(e) => setEvaluationFormData(prev => ({ ...prev, rejectionReason: e.target.value }))}
                      className={`w-full p-2.5 rounded-xl border text-sm font-medium focus:ring-2 focus:ring-indigo-500 transition outline-none ${
                        isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
                      }`}
                    />
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500">Internal Evaluation Notes</label>
                  <textarea
                    rows={3}
                    placeholder="Provide additional details regarding candidate performance..."
                    value={evaluationFormData.notes}
                    onChange={(e) => setEvaluationFormData(prev => ({ ...prev, notes: e.target.value }))}
                    className={`w-full p-2.5 rounded-xl border text-sm font-medium focus:ring-2 focus:ring-indigo-500 transition outline-none resize-none ${
                      isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
                    }`}
                  />
                </div>
              </div>
            </div>

            <div className={`p-4 border-t flex items-center justify-end gap-3 ${isDark ? 'bg-slate-850 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
              <button
                type="button"
                onClick={() => setIsEvaluationModalOpen(false)}
                className="px-6 py-2 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-700 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmittingEvaluation}
                className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-lg transition disabled:opacity-50 flex items-center gap-2"
              >
                {isSubmittingEvaluation ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Submit Final Decision
              </button>
            </div>
          </form>
        </div>
      )}

      {selectedCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className={`w-full max-w-2xl max-h-[90vh] rounded-2xl shadow-2xl overflow-hidden border flex flex-col ${
            isDark ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className={`p-4 border-b flex items-center justify-between ${isDark ? 'border-slate-800 bg-slate-850' : 'border-slate-200 bg-slate-50'}`}>
              <div className="flex items-center gap-3">
                {selectedCandidate.profilePhotoUrl ? (
                  <img src={selectedCandidate.profilePhotoUrl} className="w-10 h-10 rounded-full object-cover border-2 border-teal-500" alt="" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-teal-100 dark:bg-teal-900 flex items-center justify-center text-teal-600 dark:text-teal-400">
                    <Users className="w-5 h-5" />
                  </div>
                )}
                <div>
                  <h3 className="font-bold text-lg leading-none">{selectedCandidate.fullName}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="font-mono text-[10px] font-bold text-teal-600">{selectedCandidate.candidateCode}</span>
                    {getStageBadge(selectedCandidate.stage)}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => {
                    setProfileFormData(selectedCandidate);
                    setIsEditProfileModalOpen(true);
                  }}
                  className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold hover:bg-slate-50 transition flex items-center gap-1.5"
                >
                  <FileText className="w-3.5 h-3.5" />
                  Edit Profile
                </button>
                <button onClick={() => setSelectedCandidate(null)} className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Profile Tabs */}
            <div className="flex px-4 border-b border-slate-200 dark:border-slate-800">
              <button
                onClick={() => setProfileTab('SUMMARY')}
                className={`px-4 py-2.5 text-xs font-bold border-b-2 transition ${
                  profileTab === 'SUMMARY'
                    ? 'border-teal-600 text-teal-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                Summary
              </button>
              <button
                onClick={() => setProfileTab('DETAIL')}
                className={`px-4 py-2.5 text-xs font-bold border-b-2 transition ${
                  profileTab === 'DETAIL'
                    ? 'border-teal-600 text-teal-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                Experience & Education
              </button>
              <button
                onClick={() => setProfileTab('DOCUMENTS')}
                className={`px-4 py-2.5 text-xs font-bold border-b-2 transition ${
                  profileTab === 'DOCUMENTS'
                    ? 'border-teal-600 text-teal-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                Documents
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {profileTab === 'SUMMARY' && (
                <>
                  {conversionSuccessMsg && (
                    <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 text-emerald-800 dark:text-emerald-300 rounded-xl text-xs flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 shrink-0" />
                      <span>{conversionSuccessMsg}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-xs">
                    <div>
                      <span className="text-slate-500 font-semibold block uppercase tracking-wider">Application ID</span>
                      <span className="text-sm font-bold text-teal-600">{selectedCandidate.applicationId || 'Legacy Record'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 font-semibold block uppercase tracking-wider">Phone Number</span>
                      <span className="text-sm font-medium">{selectedCandidate.phoneNumber}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 font-semibold block uppercase tracking-wider">Email Address</span>
                      <span className="text-sm font-medium">{selectedCandidate.email}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 font-semibold block uppercase tracking-wider">Role Applied</span>
                      <span className="text-sm font-medium">{selectedCandidate.jobTitleAppliedFor}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 font-semibold block uppercase tracking-wider">Experience</span>
                      <span className="text-sm font-medium">{selectedCandidate.experienceYears} Years</span>
                    </div>
                    <div>
                      <span className="text-slate-500 font-semibold block uppercase tracking-wider">Education</span>
                      <span className="text-sm font-medium">{selectedCandidate.highestEducation}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 font-semibold block uppercase tracking-wider">Qualification</span>
                      <span className="text-sm font-medium">{selectedCandidate.qualification || 'Not Specified'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 font-semibold block uppercase tracking-wider">Source</span>
                      <span className="text-sm font-medium">{selectedCandidate.source || 'Direct'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 font-semibold block uppercase tracking-wider">Applied Date</span>
                      <span className="text-sm font-medium">{new Date(selectedCandidate.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-slate-500 font-semibold block uppercase tracking-wider">Current Address</span>
                      <span className="text-sm font-medium">{selectedCandidate.currentAddress}</span>
                    </div>
                    {selectedCandidate.availabilityDate && (
                      <div>
                        <span className="text-slate-500 font-semibold block uppercase tracking-wider">Availability</span>
                        <span className="text-sm font-medium">{new Date(selectedCandidate.availabilityDate).toLocaleDateString()}</span>
                      </div>
                    )}
                    {selectedCandidate.noticePeriodDays !== undefined && (
                      <div>
                        <span className="text-slate-500 font-semibold block uppercase tracking-wider">Notice Period</span>
                        <span className="text-sm font-medium">{selectedCandidate.noticePeriodDays} Days</span>
                      </div>
                    )}
                  </div>

                  {selectedCandidate.skills && selectedCandidate.skills.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Technical & Soft Skills</span>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedCandidate.skills.map((skill, idx) => (
                          <span key={idx} className="px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded text-[10px] font-bold">
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Background Checks & KYC */}
                  <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-800/40 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                    <h4 className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400 mb-3 flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-teal-600" />
                      Statutory Background & KYC Verifications
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 rounded-lg border bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 flex items-center justify-between">
                        <div>
                          <div className="font-semibold text-xs">Aadhaar KYC</div>
                          <div className="text-[11px] text-slate-500">{selectedCandidate.aadhaarNumber ? 'XXXXXXXX' + selectedCandidate.aadhaarNumber.slice(-4) : 'Not submitted'}</div>
                        </div>
                        <div className="flex flex-col gap-1 items-end">
                           <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                             selectedCandidate.aadhaarVerificationStatus === 'VERIFIED' ? 'bg-emerald-100 text-emerald-700' :
                             selectedCandidate.aadhaarVerificationStatus === 'FAILED' ? 'bg-rose-100 text-rose-700' :
                             'bg-amber-100 text-amber-700'
                           }`}>
                             {selectedCandidate.aadhaarVerificationStatus}
                           </span>
                           {selectedCandidate.aadhaarVerificationStatus === 'PENDING' && (
                             <button
                               onClick={() => handleInitiateAadhaarWorkflow(selectedCandidate)}
                               className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                             >
                               Initiate Auth
                             </button>
                           )}
                        </div>
                      </div>

                      <div className="p-3 rounded-lg border bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 flex items-center justify-between">
                        <div>
                          <div className="font-semibold text-xs">Police Clearance</div>
                          <div className="text-[11px] text-slate-500">PSARA Requirement</div>
                        </div>
                        <div className="flex flex-col gap-1 items-end">
                           <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                             selectedCandidate.policeVerificationStatus === 'VERIFIED' ? 'bg-emerald-100 text-emerald-700' :
                             selectedCandidate.policeVerificationStatus === 'FAILED' ? 'bg-rose-100 text-rose-700' :
                             'bg-amber-100 text-amber-700'
                           }`}>
                             {selectedCandidate.policeVerificationStatus}
                           </span>
                           {selectedCandidate.policeVerificationStatus === 'PENDING' && (
                             <button
                               onClick={() => handleInitiatePoliceWorkflow(selectedCandidate)}
                               className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                             >
                               Request PV
                             </button>
                           )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Stage Transition Control */}
                  <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-800/40 border-slate-700' : 'bg-teal-50/50 border-teal-100'}`}>
                    <h4 className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400 mb-2">Hiring Pipeline Progression</h4>
                    <div className="flex flex-wrap gap-2">
                      {(['REGISTERED', 'APPLIED', 'SCREENING', 'SHORTLISTED', 'INTERVIEW_SCHEDULED', 'INTERVIEW_COMPLETED', 'SELECTED', 'OFFER_PREPARATION', 'OFFER_EXTENDED', 'OFFER_ACCEPTED', 'BACKGROUND_VERIFICATION', 'DOCUMENT_VERIFICATION', 'READY_FOR_ONBOARDING', 'ONBOARDING', 'CONVERTED_TO_EMPLOYEE', 'REJECTED', 'ON_HOLD', 'WITHDRAWN', 'DISQUALIFIED', 'VERIFICATION_FAILED'] as CandidateStage[]).map((st) => (
                        <button
                          key={st}
                          onClick={() => {
                            if (st === 'REJECTED' || st === 'ON_HOLD' || st === 'WITHDRAWN' || st === 'DISQUALIFIED' || st === 'VERIFICATION_FAILED') {
                              const reason = window.prompt(`Please provide a reason for setting status to ${st}:`);
                              if (reason !== null) {
                                handleUpdateCandidateStatus(selectedCandidate, st, reason);
                              }
                            } else {
                              handleUpdateCandidateStatus(selectedCandidate, st);
                            }
                          }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                            selectedCandidate.stage === st
                              ? 'bg-teal-600 text-white shadow-sm'
                              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          {st.replace(/_/g, ' ')}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Candidate Status History */}
                  <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-800/40 border-slate-700' : 'bg-white border-slate-200'}`}>
                    <h4 className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400 mb-4">Status History & Audit Trail</h4>
                    {(!selectedCandidate.statusHistory || selectedCandidate.statusHistory.length === 0) ? (
                      <p className="text-sm text-slate-500 italic">No status history available.</p>
                    ) : (
                      <div className="space-y-4">
                        {selectedCandidate.statusHistory.map((history, idx) => (
                          <div key={idx} className="flex gap-4">
                            <div className="flex flex-col items-center">
                              <div className="w-2.5 h-2.5 rounded-full bg-teal-500 ring-4 ring-teal-50 dark:ring-slate-800" />
                              {idx < selectedCandidate.statusHistory!.length - 1 && (
                                <div className="w-px h-full bg-slate-200 dark:bg-slate-700 mt-2" />
                              )}
                            </div>
                            <div className="pb-4">
                              <p className="text-sm font-semibold text-slate-900 dark:text-white">
                                {history.stage.replace(/_/g, ' ')}
                              </p>
                              <div className="text-xs text-slate-500 mt-1">
                                <span>{new Date(history.changedAt).toLocaleString()}</span>
                                <span className="mx-2">•</span>
                                <span>By {history.changedByName || history.changedBy}</span>
                                {history.sourceEvent && (
                                  <>
                                    <span className="mx-2">•</span>
                                    <span>{history.sourceEvent}</span>
                                  </>
                                )}
                              </div>
                              {history.reason && (
                                <p className="text-xs font-medium text-rose-600 dark:text-rose-400 mt-1">
                                  Reason: {history.reason}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* 1-Click Employee Conversion Action */}
                  {selectedCandidate.stage !== 'CONVERTED_TO_EMPLOYEE' && (
                    <div className="p-4 rounded-xl border border-teal-300 dark:border-teal-800 bg-teal-50/50 dark:bg-teal-950/40 flex items-center justify-between">
                      <div>
                        <h5 className="font-bold text-sm text-teal-900 dark:text-teal-200 flex items-center gap-1.5">
                          <Sparkles className="w-4 h-4 text-teal-600" />
                          1-Click Candidate to Employee Conversion
                        </h5>
                        <p className="text-xs text-teal-700 dark:text-teal-300 mt-0.5">
                          Generates real employee profile, ID card record, and payroll salary structure automatically.
                        </p>
                      </div>
                      <button
                        onClick={() => handleCheckConversion(selectedCandidate)}
                        disabled={isConverting}
                        className="px-4 py-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-sm transition"
                      >
                        {isConverting ? 'Provisioning Staff...' : 'Convert to Employee'}
                      </button>
                    </div>
                  )}
                </>
              )}

              {profileTab === 'DETAIL' && (
                <div className="space-y-6">
                  {/* Education */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold uppercase text-slate-500 flex items-center gap-2">
                      <Award className="w-4 h-4 text-teal-600" />
                      Education History
                    </h4>
                    {selectedCandidate.education && selectedCandidate.education.length > 0 ? (
                      <div className="space-y-3">
                        {selectedCandidate.education.map((edu, idx) => (
                          <div key={idx} className={`p-3 rounded-xl border ${isDark ? 'bg-slate-800/40 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="font-bold text-sm">{edu.degree} in {edu.fieldOfStudy}</p>
                                <p className="text-xs text-slate-500">{edu.institution}</p>
                              </div>
                              <span className="text-[10px] font-bold text-slate-400">{edu.startDate} - {edu.endDate}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-8 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                        <p className="text-xs text-slate-500">No education history recorded. Click "Edit Profile" to add.</p>
                      </div>
                    )}
                  </div>

                  {/* Experience */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold uppercase text-slate-500 flex items-center gap-2">
                      <Briefcase className="w-4 h-4 text-teal-600" />
                      Professional Experience
                    </h4>
                    {selectedCandidate.experience && selectedCandidate.experience.length > 0 ? (
                      <div className="space-y-3">
                        {selectedCandidate.experience.map((exp, idx) => (
                          <div key={idx} className={`p-3 rounded-xl border ${isDark ? 'bg-slate-800/40 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="font-bold text-sm">{exp.position}</p>
                                <p className="text-xs text-slate-500">{exp.company} {exp.location && `• ${exp.location}`}</p>
                              </div>
                              <span className="text-[10px] font-bold text-slate-400">
                                {exp.startDate} - {exp.isCurrent ? 'Present' : exp.endDate}
                              </span>
                            </div>
                            {exp.description && <p className="text-xs text-slate-600 dark:text-slate-400 mt-2">{exp.description}</p>}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-8 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                        <p className="text-xs text-slate-500">No experience history recorded. Click "Edit Profile" to add.</p>
                      </div>
                    )}
                  </div>

                  {/* Certifications */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold uppercase text-slate-500 flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-teal-600" />
                      Certifications & Licenses
                    </h4>
                    {selectedCandidate.certifications && selectedCandidate.certifications.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {selectedCandidate.certifications.map((cert, idx) => (
                          <div key={idx} className={`p-3 rounded-xl border ${isDark ? 'bg-slate-800/40 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                            <p className="font-bold text-xs">{cert.title}</p>
                            <p className="text-[10px] text-slate-500">{cert.issuingOrganization}</p>
                            <div className="flex justify-between mt-2">
                              <span className="text-[9px] text-slate-400">Issued: {cert.issueDate}</span>
                              {cert.expiryDate && <span className="text-[9px] text-rose-400">Expires: {cert.expiryDate}</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-8 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                        <p className="text-xs text-slate-500">No certifications recorded.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {profileTab === 'DOCUMENTS' && (() => {
                const candDocs = candidateDocuments.filter(d => d.candidateId === selectedCandidate.id);
                const reqDocs = STANDARD_CANDIDATE_DOCUMENTS.filter(d => d.isRequired);
                const verifiedReqCount = reqDocs.filter(rd => 
                  candDocs.some(cd => cd.documentType === rd.documentType && cd.status === 'VERIFIED')
                ).length;
                const reqProgress = Math.round((verifiedReqCount / (reqDocs.length || 1)) * 100);

                const totalVerified = candDocs.filter(d => d.status === 'VERIFIED').length;
                const totalUnderReview = candDocs.filter(d => ['SUBMITTED', 'RESUBMITTED', 'UNDER_REVIEW'].includes(d.status)).length;
                const totalActionRequired = candDocs.filter(d => ['CORRECTION_REQUIRED', 'REJECTED'].includes(d.status)).length;
                const totalExpired = candDocs.filter(d => d.isExpired || (d.expiryDate && new Date(d.expiryDate) < new Date())).length;
                const missingReqCount = reqDocs.length - verifiedReqCount;

                // Category filtering
                const filteredChecklist = docFilterCategory === 'ALL' 
                  ? STANDARD_CANDIDATE_DOCUMENTS 
                  : STANDARD_CANDIDATE_DOCUMENTS.filter(d => d.category === docFilterCategory);

                // Custom/Extra uploaded documents not in standard list
                const customUploadedDocs = candDocs.filter(d => 
                  !STANDARD_CANDIDATE_DOCUMENTS.some(sd => sd.documentType === d.documentType) || d.documentType === 'OTHER'
                );

                return (
                  <div className="space-y-6">
                    {/* Compliance & Verification Header */}
                    <div className={`p-5 rounded-2xl border ${
                      isDark ? 'bg-slate-800/60 border-slate-700' : 'bg-slate-50 border-slate-200'
                    }`}>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <ShieldCheck className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                            <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100">
                              Document Verification & Compliance
                            </h3>
                          </div>
                          <p className="text-xs text-slate-500 mt-1">
                            Verify statutory identity, background certificates, and qualification records for onboarding.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleOpenUploadDocModal()}
                          className="flex items-center gap-2 px-3.5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition shadow-sm self-start sm:self-auto"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          <span>Upload Document</span>
                        </button>
                      </div>

                      {/* Required Documents Progress */}
                      <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700/60">
                        <div className="flex justify-between items-center text-xs mb-1.5 font-bold">
                          <span className="text-slate-600 dark:text-slate-300">
                            Mandatory Documents Verified: {verifiedReqCount} of {reqDocs.length}
                          </span>
                          <span className={`${reqProgress === 100 ? 'text-emerald-600 font-extrabold' : 'text-teal-600'}`}>
                            {reqProgress}% Complete
                          </span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              reqProgress === 100 ? 'bg-emerald-500' : reqProgress >= 50 ? 'bg-teal-500' : 'bg-amber-500'
                            }`}
                            style={{ width: `${reqProgress}%` }}
                          />
                        </div>
                      </div>

                      {/* Summary Metrics Chips */}
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mt-4">
                        <div className={`p-2.5 rounded-xl text-center border ${
                          isDark ? 'bg-emerald-950/20 border-emerald-800/40 text-emerald-300' : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                        }`}>
                          <div className="text-base font-black">{totalVerified}</div>
                          <div className="text-[10px] font-bold uppercase tracking-wider">Verified</div>
                        </div>

                        <div className={`p-2.5 rounded-xl text-center border ${
                          isDark ? 'bg-indigo-950/20 border-indigo-800/40 text-indigo-300' : 'bg-indigo-50 border-indigo-200 text-indigo-800'
                        }`}>
                          <div className="text-base font-black">{totalUnderReview}</div>
                          <div className="text-[10px] font-bold uppercase tracking-wider">Under Review</div>
                        </div>

                        <div className={`p-2.5 rounded-xl text-center border ${
                          isDark ? 'bg-amber-950/20 border-amber-800/40 text-amber-300' : 'bg-amber-50 border-amber-200 text-amber-800'
                        }`}>
                          <div className="text-base font-black">{totalActionRequired}</div>
                          <div className="text-[10px] font-bold uppercase tracking-wider">Action Req.</div>
                        </div>

                        <div className={`p-2.5 rounded-xl text-center border ${
                          totalExpired > 0
                            ? isDark ? 'bg-rose-950/30 border-rose-800/60 text-rose-300' : 'bg-rose-50 border-rose-200 text-rose-800'
                            : isDark ? 'bg-slate-800/40 border-slate-700 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-600'
                        }`}>
                          <div className="text-base font-black">{totalExpired}</div>
                          <div className="text-[10px] font-bold uppercase tracking-wider">Expired</div>
                        </div>

                        <div className={`p-2.5 rounded-xl text-center border ${
                          missingReqCount > 0
                            ? isDark ? 'bg-rose-950/20 border-rose-800/40 text-rose-300' : 'bg-rose-50 border-rose-200 text-rose-800'
                            : isDark ? 'bg-slate-800/40 border-slate-700 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-600'
                        }`}>
                          <div className="text-base font-black">{missingReqCount}</div>
                          <div className="text-[10px] font-bold uppercase tracking-wider">Missing Req.</div>
                        </div>
                      </div>
                    </div>

                    {/* Category Filter Pills */}
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                      {['ALL', 'IDENTITY', 'STATUTORY', 'FINANCIAL', 'PROFESSIONAL', 'GENERAL'].map((cat) => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setDocFilterCategory(cat)}
                          className={`px-3 py-1 text-xs font-bold rounded-lg transition whitespace-nowrap ${
                            docFilterCategory === cat
                              ? 'bg-teal-600 text-white shadow-sm'
                              : isDark 
                                ? 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200' 
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          {cat === 'ALL' ? 'All Categories' : cat.charAt(0) + cat.slice(1).toLowerCase()}
                        </button>
                      ))}
                    </div>

                    {/* Standard Checklist Documents Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {filteredChecklist.map((item) => {
                        const uploadedDoc = candDocs.find(d => d.documentType === item.documentType);

                        if (uploadedDoc) {
                          const isDocExpired = uploadedDoc.isExpired || (uploadedDoc.expiryDate && new Date(uploadedDoc.expiryDate) < new Date());
                          const isExpiringSoon = !isDocExpired && uploadedDoc.expiryDate && (() => {
                            const exp = new Date(uploadedDoc.expiryDate);
                            const t30 = new Date();
                            t30.setDate(t30.getDate() + 30);
                            return exp <= t30;
                          })();

                          return (
                            <div
                              key={item.documentType}
                              className={`p-4 rounded-2xl border flex flex-col justify-between transition ${
                                isDark ? 'bg-slate-850 border-slate-700/80 hover:border-slate-600' : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm'
                              }`}
                            >
                              <div>
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex items-center gap-2.5">
                                    <div className={`p-2 rounded-xl ${
                                      uploadedDoc.status === 'VERIFIED'
                                        ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400'
                                        : uploadedDoc.status === 'REJECTED'
                                          ? 'bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400'
                                          : uploadedDoc.status === 'CORRECTION_REQUIRED'
                                            ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400'
                                            : 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400'
                                    }`}>
                                      <FileText className="w-4 h-4" />
                                    </div>
                                    <div>
                                      <div className="flex items-center gap-1.5">
                                        <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100">
                                          {uploadedDoc.documentName || item.documentName}
                                        </h4>
                                        <span className="px-1.5 py-0.5 text-[9px] font-extrabold rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                                          v{uploadedDoc.version || 1}
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-2 mt-0.5">
                                        <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                                          {item.category}
                                        </span>
                                        {item.isRequired && (
                                          <span className="text-[9px] font-bold text-rose-500">
                                            *Mandatory
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </div>

                                  {/* Status Pill */}
                                  <div>
                                    {uploadedDoc.status === 'VERIFIED' && (
                                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                                        <CheckCircle2 className="w-3 h-3" />
                                        Verified
                                      </span>
                                    )}
                                    {uploadedDoc.status === 'SUBMITTED' && (
                                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300">
                                        <Clock className="w-3 h-3" />
                                        Submitted
                                      </span>
                                    )}
                                    {uploadedDoc.status === 'RESUBMITTED' && (
                                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300">
                                        <RotateCcw className="w-3 h-3" />
                                        Resubmitted
                                      </span>
                                    )}
                                    {uploadedDoc.status === 'UNDER_REVIEW' && (
                                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                                        <Clock className="w-3 h-3" />
                                        Under Review
                                      </span>
                                    )}
                                    {uploadedDoc.status === 'CORRECTION_REQUIRED' && (
                                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                                        <AlertTriangle className="w-3 h-3" />
                                        Correction Req.
                                      </span>
                                    )}
                                    {uploadedDoc.status === 'REJECTED' && (
                                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300">
                                        <XCircle className="w-3 h-3" />
                                        Rejected
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {/* Meta details */}
                                <div className="mt-3 text-[11px] text-slate-500 space-y-1">
                                  <div className="flex justify-between items-center">
                                    <span className="truncate max-w-[180px] font-medium text-slate-700 dark:text-slate-300">
                                      {uploadedDoc.fileName || 'document_file'}
                                    </span>
                                    {uploadedDoc.fileSize && (
                                      <span className="text-[10px] text-slate-400">
                                        {(uploadedDoc.fileSize / 1024).toFixed(0)} KB
                                      </span>
                                    )}
                                  </div>

                                  {uploadedDoc.verifiedBy && (
                                    <div className="text-[10px] text-emerald-600 dark:text-emerald-400">
                                      Verified by {uploadedDoc.verifiedBy} on {new Date(uploadedDoc.verifiedAt || '').toLocaleDateString()}
                                    </div>
                                  )}

                                  {uploadedDoc.expiryDate && (
                                    <div className={`text-[10px] font-bold ${
                                      isDocExpired 
                                        ? 'text-rose-600 dark:text-rose-400' 
                                        : isExpiringSoon 
                                          ? 'text-amber-600 dark:text-amber-400' 
                                          : 'text-slate-400'
                                    }`}>
                                      {isDocExpired 
                                        ? `⚠️ Expired on ${uploadedDoc.expiryDate}` 
                                        : isExpiringSoon 
                                          ? `⚠️ Expires soon: ${uploadedDoc.expiryDate}` 
                                          : `Valid till: ${uploadedDoc.expiryDate}`}
                                    </div>
                                  )}

                                  {/* Notes or Rejection Reason Box */}
                                  {uploadedDoc.rejectionReason && (
                                    <div className="p-2 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/40 text-rose-700 dark:text-rose-300 text-[10px] mt-2">
                                      <strong>Rejection Reason:</strong> {uploadedDoc.rejectionReason}
                                    </div>
                                  )}

                                  {uploadedDoc.correctionNotes && (
                                    <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 text-amber-700 dark:text-amber-300 text-[10px] mt-2">
                                      <strong>Correction Requested:</strong> {uploadedDoc.correctionNotes}
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Action Buttons Toolbar */}
                              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-1.5">
                                <div className="flex items-center gap-1">
                                  {uploadedDoc.fileUrl && (
                                    <a
                                      href={uploadedDoc.fileUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="p-1.5 text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-950/30 rounded-lg text-xs font-bold transition flex items-center gap-1"
                                      title="Open File"
                                    >
                                      <Eye className="w-3.5 h-3.5" />
                                      <span>View</span>
                                    </a>
                                  )}

                                  {(uploadedDoc.history?.length || (uploadedDoc.version && uploadedDoc.version > 1)) ? (
                                    <button
                                      type="button"
                                      onClick={() => handleOpenVersionHistoryModal(uploadedDoc)}
                                      className="p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-xs font-medium transition flex items-center gap-1"
                                      title="Version History"
                                    >
                                      <History className="w-3.5 h-3.5" />
                                      <span>History</span>
                                    </button>
                                  ) : null}
                                </div>

                                <div className="flex items-center gap-1">
                                  {/* Re-upload / Replace */}
                                  <button
                                    type="button"
                                    onClick={() => handleOpenUploadDocModal(item.documentType, item.isRequired, item.documentName)}
                                    className="p-1.5 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 rounded-lg text-xs font-medium transition flex items-center gap-1"
                                    title="Upload New Version"
                                  >
                                    <RotateCcw className="w-3.5 h-3.5" />
                                    <span>Replace</span>
                                  </button>

                                  {/* Review & Verify Button (For HR/Admin) */}
                                  {['SUPER_ADMIN', 'COMPANY_ADMIN', 'HR_ADMIN', 'HR'].includes(userSession?.role || '') && (
                                    <button
                                      type="button"
                                      onClick={() => handleOpenReviewDocModal(uploadedDoc)}
                                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white rounded-lg text-[11px] font-bold transition flex items-center gap-1"
                                    >
                                      <FileCheck className="w-3 h-3 text-teal-400" />
                                      <span>Review</span>
                                    </button>
                                  )}

                                  {/* Delete Document */}
                                  {['SUPER_ADMIN', 'COMPANY_ADMIN', 'HR_ADMIN'].includes(userSession?.role || '') && (
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteDoc(uploadedDoc)}
                                      className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg text-xs transition"
                                      title="Delete Document"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        }

                        // Missing Document Placeholder Card
                        return (
                          <div
                            key={item.documentType}
                            className={`p-4 rounded-2xl border-2 border-dashed flex flex-col justify-between transition ${
                              item.isRequired
                                ? isDark ? 'bg-slate-900/40 border-rose-900/40' : 'bg-rose-50/30 border-rose-200'
                                : isDark ? 'bg-slate-900/20 border-slate-800' : 'bg-slate-50 border-slate-200'
                            }`}
                          >
                            <div>
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-2.5">
                                  <div className={`p-2 rounded-xl ${
                                    item.isRequired
                                      ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400'
                                      : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                                  }`}>
                                    <FileText className="w-4 h-4" />
                                  </div>
                                  <div>
                                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                      {item.documentName}
                                    </h4>
                                    <div className="flex items-center gap-2 mt-0.5">
                                      <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                                        {item.category}
                                      </span>
                                      {item.isRequired ? (
                                        <span className="text-[9px] font-bold text-rose-500">
                                          *Mandatory
                                        </span>
                                      ) : (
                                        <span className="text-[9px] font-medium text-slate-400">
                                          Optional
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                <span className={`px-2 py-0.5 text-[9px] font-bold rounded-full ${
                                  item.isRequired
                                    ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                                    : 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                                }`}>
                                  Missing
                                </span>
                              </div>

                              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2.5 leading-relaxed">
                                {item.description}
                              </p>
                            </div>

                            <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-slate-800/60 flex justify-end">
                              <button
                                type="button"
                                onClick={() => handleOpenUploadDocModal(item.documentType, item.isRequired, item.documentName)}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
                              >
                                <Upload className="w-3.5 h-3.5" />
                                <span>Upload Now</span>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Additional Custom Uploaded Documents */}
                    {customUploadedDocs.length > 0 && (
                      <div className="space-y-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                        <h4 className="text-xs font-bold uppercase text-slate-500 flex items-center gap-2">
                          <FileBadge className="w-4 h-4 text-teal-600" />
                          Supplementary & Custom Documents ({customUploadedDocs.length})
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {customUploadedDocs.map((docRec) => (
                            <div
                              key={docRec.id}
                              className={`p-4 rounded-2xl border flex flex-col justify-between ${
                                isDark ? 'bg-slate-850 border-slate-700' : 'bg-white border-slate-200'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-2.5">
                                  <div className="p-2 rounded-xl bg-teal-100 dark:bg-teal-900/40 text-teal-600">
                                    <FileText className="w-4 h-4" />
                                  </div>
                                  <div>
                                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100">
                                      {docRec.documentName}
                                    </h4>
                                    <span className="text-[10px] text-slate-400">
                                      {docRec.fileName} • {((docRec.fileSize || 0) / 1024).toFixed(0)} KB
                                    </span>
                                  </div>
                                </div>

                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  docRec.status === 'VERIFIED'
                                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                    : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300'
                                }`}>
                                  {docRec.status}
                                </span>
                              </div>

                              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                                {docRec.fileUrl && (
                                  <a
                                    href={docRec.fileUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-1.5 text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-950/30 rounded-lg text-xs font-bold transition flex items-center gap-1"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                    <span>View</span>
                                  </a>
                                )}
                                <div className="flex items-center gap-1">
                                  {['SUPER_ADMIN', 'COMPANY_ADMIN', 'HR_ADMIN', 'HR'].includes(userSession?.role || '') && (
                                    <button
                                      type="button"
                                      onClick={() => handleOpenReviewDocModal(docRec)}
                                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-[11px] font-bold transition flex items-center gap-1"
                                    >
                                      <FileCheck className="w-3 h-3 text-teal-400" />
                                      <span>Review</span>
                                    </button>
                                  )}
                                  {['SUPER_ADMIN', 'COMPANY_ADMIN', 'HR_ADMIN'].includes(userSession?.role || '') && (
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteDoc(docRec)}
                                      className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg text-xs"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Edit Profile Modal */}
      {isEditProfileModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className={`w-full max-w-2xl max-h-[90vh] rounded-2xl shadow-2xl overflow-hidden border flex flex-col ${
            isDark ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className={`p-4 border-b flex items-center justify-between ${isDark ? 'border-slate-800 bg-slate-850' : 'border-slate-200 bg-slate-50'}`}>
              <h3 className="font-bold text-lg">Edit Candidate Profile</h3>
              <button onClick={() => setIsEditProfileModalOpen(false)} className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateProfile} className="flex-1 overflow-y-auto p-6 space-y-8">
              {/* Photo & Basic Info Section */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold uppercase text-teal-600 tracking-widest">Basic Professional Details</h4>
                <div className="flex flex-col md:flex-row gap-6">
                  <div className="flex flex-col items-center gap-3">
                    <div className={`w-24 h-24 rounded-2xl border-2 border-dashed flex items-center justify-center overflow-hidden transition ${
                      isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-300'
                    }`}>
                      {profilePhotoFile ? (
                        <img src={URL.createObjectURL(profilePhotoFile)} className="w-full h-full object-cover" alt="Preview" />
                      ) : profileFormData.profilePhotoUrl ? (
                        <img src={profileFormData.profilePhotoUrl} className="w-full h-full object-cover" alt="Current" />
                      ) : (
                        <Users className="w-8 h-8 text-slate-300" />
                      )}
                    </div>
                    <label className="text-[10px] font-bold text-teal-600 cursor-pointer uppercase hover:underline">
                      Upload Photo
                      <input type="file" className="sr-only" accept="image/*" onChange={(e) => setProfilePhotoFile(e.target.files?.[0] || null)} />
                    </label>
                  </div>

                  <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Full Name</label>
                      <input 
                        type="text" 
                        value={profileFormData.fullName || ''} 
                        onChange={(e) => setProfileFormData(p => ({ ...p, fullName: e.target.value }))}
                        className={`w-full px-3 py-2 text-sm rounded-lg border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-300'}`}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Email</label>
                      <input 
                        type="email" 
                        value={profileFormData.email || ''} 
                        onChange={(e) => setProfileFormData(p => ({ ...p, email: e.target.value }))}
                        className={`w-full px-3 py-2 text-sm rounded-lg border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-300'}`}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Notice Period (Days)</label>
                      <input 
                        type="number" 
                        value={profileFormData.noticePeriodDays || ''} 
                        onChange={(e) => setProfileFormData(p => ({ ...p, noticePeriodDays: Number(e.target.value) }))}
                        className={`w-full px-3 py-2 text-sm rounded-lg border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-300'}`}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Availability Date</label>
                      <input 
                        type="date" 
                        value={profileFormData.availabilityDate?.split('T')[0] || ''} 
                        onChange={(e) => setProfileFormData(p => ({ ...p, availabilityDate: e.target.value }))}
                        className={`w-full px-3 py-2 text-sm rounded-lg border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-300'}`}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Education History */}
              <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase text-teal-600 tracking-widest">Education History</h4>
                  <button 
                    type="button" 
                    onClick={() => setProfileFormData(p => ({ 
                      ...p, 
                      education: [...(p.education || []), { institution: '', degree: '', fieldOfStudy: '', startDate: '', endDate: '' }] 
                    }))}
                    className="p-1.5 bg-teal-50 dark:bg-teal-950/40 text-teal-600 rounded-lg"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-4">
                  {(profileFormData.education || []).map((edu, idx) => (
                    <div key={idx} className={`p-4 rounded-xl border relative ${isDark ? 'bg-slate-800/30 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                      <button 
                        type="button"
                        onClick={() => setProfileFormData(p => ({ ...p, education: p.education?.filter((_, i) => i !== idx) }))}
                        className="absolute top-2 right-2 text-rose-500 hover:text-rose-600"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <input placeholder="Institution Name" value={edu.institution} onChange={(e) => {
                          const newEdu = [...(profileFormData.education || [])];
                          newEdu[idx].institution = e.target.value;
                          setProfileFormData(p => ({ ...p, education: newEdu }));
                        }} className={`px-3 py-2 text-xs rounded border ${isDark ? 'bg-slate-850 border-slate-700' : 'bg-white border-slate-200'}`} />
                        <input placeholder="Degree (e.g. B.Tech)" value={edu.degree} onChange={(e) => {
                          const newEdu = [...(profileFormData.education || [])];
                          newEdu[idx].degree = e.target.value;
                          setProfileFormData(p => ({ ...p, education: newEdu }));
                        }} className={`px-3 py-2 text-xs rounded border ${isDark ? 'bg-slate-850 border-slate-700' : 'bg-white border-slate-200'}`} />
                        <div className="flex gap-2">
                          <input type="date" value={edu.startDate} onChange={(e) => {
                            const newEdu = [...(profileFormData.education || [])];
                            newEdu[idx].startDate = e.target.value;
                            setProfileFormData(p => ({ ...p, education: newEdu }));
                          }} className={`flex-1 px-3 py-2 text-xs rounded border ${isDark ? 'bg-slate-850 border-slate-700' : 'bg-white border-slate-200'}`} />
                          <input type="date" value={edu.endDate} onChange={(e) => {
                            const newEdu = [...(profileFormData.education || [])];
                            newEdu[idx].endDate = e.target.value;
                            setProfileFormData(p => ({ ...p, education: newEdu }));
                          }} className={`flex-1 px-3 py-2 text-xs rounded border ${isDark ? 'bg-slate-850 border-slate-700' : 'bg-white border-slate-200'}`} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Work Experience */}
              <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase text-teal-600 tracking-widest">Work Experience</h4>
                  <button 
                    type="button" 
                    onClick={() => setProfileFormData(p => ({ 
                      ...p, 
                      experience: [...(p.experience || []), { company: '', position: '', startDate: '', isCurrent: false }] 
                    }))}
                    className="p-1.5 bg-teal-50 dark:bg-teal-950/40 text-teal-600 rounded-lg"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-4">
                  {(profileFormData.experience || []).map((exp, idx) => (
                    <div key={idx} className={`p-4 rounded-xl border relative ${isDark ? 'bg-slate-800/30 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                      <button 
                        type="button"
                        onClick={() => setProfileFormData(p => ({ ...p, experience: p.experience?.filter((_, i) => i !== idx) }))}
                        className="absolute top-2 right-2 text-rose-500 hover:text-rose-600"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <input placeholder="Company Name" value={exp.company} onChange={(e) => {
                          const newExp = [...(profileFormData.experience || [])];
                          newExp[idx].company = e.target.value;
                          setProfileFormData(p => ({ ...p, experience: newExp }));
                        }} className={`px-3 py-2 text-xs rounded border ${isDark ? 'bg-slate-850 border-slate-700' : 'bg-white border-slate-200'}`} />
                        <input placeholder="Position" value={exp.position} onChange={(e) => {
                          const newExp = [...(profileFormData.experience || [])];
                          newExp[idx].position = e.target.value;
                          setProfileFormData(p => ({ ...p, experience: newExp }));
                        }} className={`px-3 py-2 text-xs rounded border ${isDark ? 'bg-slate-850 border-slate-700' : 'bg-white border-slate-200'}`} />
                        <div className="flex gap-2">
                          <input type="date" value={exp.startDate} onChange={(e) => {
                            const newExp = [...(profileFormData.experience || [])];
                            newExp[idx].startDate = e.target.value;
                            setProfileFormData(p => ({ ...p, experience: newExp }));
                          }} className={`flex-1 px-3 py-2 text-xs rounded border ${isDark ? 'bg-slate-850 border-slate-700' : 'bg-white border-slate-200'}`} />
                          {!exp.isCurrent && (
                            <input type="date" value={exp.endDate} onChange={(e) => {
                              const newExp = [...(profileFormData.experience || [])];
                              newExp[idx].endDate = e.target.value;
                              setProfileFormData(p => ({ ...p, experience: newExp }));
                            }} className={`flex-1 px-3 py-2 text-xs rounded border ${isDark ? 'bg-slate-850 border-slate-700' : 'bg-white border-slate-200'}`} />
                          )}
                        </div>
                        <label className="flex items-center gap-2 text-xs cursor-pointer">
                          <input type="checkbox" checked={exp.isCurrent} onChange={(e) => {
                            const newExp = [...(profileFormData.experience || [])];
                            newExp[idx].isCurrent = e.target.checked;
                            if (e.target.checked) newExp[idx].endDate = undefined;
                            setProfileFormData(p => ({ ...p, experience: newExp }));
                          }} />
                          Currently Working Here
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Resume File Upload */}
              <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-800">
                <h4 className="text-xs font-bold uppercase text-teal-600 tracking-widest">Update Recruitment Documents</h4>
                <div className={`p-4 border-2 border-dashed rounded-2xl transition flex items-center gap-4 ${
                  isDark ? 'border-slate-700 bg-slate-800/40 hover:border-teal-500' : 'border-slate-300 bg-slate-50 hover:border-teal-500'
                }`}>
                  <FileText className="w-8 h-8 text-slate-400" />
                  <div className="flex-1">
                    <p className="text-sm font-bold">{resumeFile ? resumeFile.name : 'Update Resume / CV'}</p>
                    <p className="text-[10px] text-slate-500">PDF, DOC, DOCX up to 5MB</p>
                  </div>
                  <label className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold cursor-pointer">
                    Choose File
                    <input type="file" className="sr-only" accept=".pdf,.doc,.docx" onChange={(e) => setResumeFile(e.target.files?.[0] || null)} />
                  </label>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-6 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  disabled={isSavingProfile}
                  onClick={() => setIsEditProfileModalOpen(false)}
                  className="px-4 py-2 text-sm font-semibold rounded-xl text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingProfile}
                  className="px-6 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-sm font-bold shadow-lg disabled:opacity-50 flex items-center gap-2"
                >
                  {isSavingProfile && <RefreshCw className="w-4 h-4 animate-spin" />}
                  {isSavingProfile ? 'Saving Changes...' : 'Save Profile Details'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Candidate Modal */}
      {isCandidateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className={`w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden border ${
            isDark ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className={`p-4 border-b flex items-center justify-between ${isDark ? 'border-slate-800 bg-slate-850' : 'border-slate-200 bg-slate-50'}`}>
              <h3 className="font-bold text-lg">Register Candidate</h3>
              <button onClick={() => setIsCandidateModalOpen(false)} className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCandidate} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
              {registerError && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-400 rounded-xl text-xs flex items-center gap-2 animate-shake">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{registerError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold mb-1 text-slate-600 dark:text-slate-400 uppercase tracking-wider">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rajesh Kumar"
                  value={candFormData.fullName}
                  onChange={(e) => setCandFormData(prev => ({ ...prev, fullName: e.target.value }))}
                  className={`w-full px-3.5 py-2 text-sm rounded-xl border focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                    isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1 text-slate-600 dark:text-slate-400 uppercase tracking-wider">Email Address *</label>
                  <input
                    type="email"
                    required
                    placeholder="rajesh.k@example.com"
                    value={candFormData.email}
                    onChange={(e) => setCandFormData(prev => ({ ...prev, email: e.target.value }))}
                    className={`w-full px-3.5 py-2 text-sm rounded-xl border focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                      isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1 text-slate-600 dark:text-slate-400 uppercase tracking-wider">Phone Number *</label>
                  <input
                    type="tel"
                    required
                    placeholder="+91 9876543210"
                    value={candFormData.phoneNumber}
                    onChange={(e) => setCandFormData(prev => ({ ...prev, phoneNumber: e.target.value }))}
                    className={`w-full px-3.5 py-2 text-sm rounded-xl border focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                      isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1 text-slate-600 dark:text-slate-400 uppercase tracking-wider">Role Applied For *</label>
                  <input
                    type="text"
                    required
                    value={candFormData.jobTitleAppliedFor}
                    onChange={(e) => setCandFormData(prev => ({ ...prev, jobTitleAppliedFor: e.target.value }))}
                    className={`w-full px-3.5 py-2 text-sm rounded-xl border focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                      isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1 text-slate-600 dark:text-slate-400 uppercase tracking-wider">Application Source</label>
                  <select
                    value={candFormData.source}
                    onChange={(e) => setCandFormData(prev => ({ ...prev, source: e.target.value }))}
                    className={`w-full px-3.5 py-2 text-sm rounded-xl border focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                      isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  >
                    <option value="Direct">Direct Walk-in</option>
                    <option value="Referral">Employee Referral</option>
                    <option value="LinkedIn">LinkedIn / Job Portal</option>
                    <option value="Agency">Consultancy / Agency</option>
                    <option value="Advertisement">Newspaper / Social Media Ad</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1 text-slate-600 dark:text-slate-400 uppercase tracking-wider">Qualification</label>
                  <input
                    type="text"
                    placeholder="e.g. Diploma in Security"
                    value={candFormData.qualification}
                    onChange={(e) => setCandFormData(prev => ({ ...prev, qualification: e.target.value }))}
                    className={`w-full px-3.5 py-2 text-sm rounded-xl border focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                      isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1 text-slate-600 dark:text-slate-400 uppercase tracking-wider">Skills (Comma separated)</label>
                  <input
                    type="text"
                    placeholder="Firefighting, First Aid, Computers"
                    value={candFormData.skills}
                    onChange={(e) => setCandFormData(prev => ({ ...prev, skills: e.target.value }))}
                    className={`w-full px-3.5 py-2 text-sm rounded-xl border focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                      isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1 text-slate-600 dark:text-slate-400 uppercase tracking-wider">Aadhaar Number</label>
                  <input
                    type="text"
                    placeholder="12 digit Aadhaar"
                    value={candFormData.aadhaarNumber}
                    onChange={(e) => setCandFormData(prev => ({ ...prev, aadhaarNumber: e.target.value }))}
                    className={`w-full px-3.5 py-2 text-sm rounded-xl border focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                      isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1 text-slate-600 dark:text-slate-400 uppercase tracking-wider">Expected CTC (Monthly)</label>
                  <input
                    type="number"
                    value={candFormData.expectedSalaryMonthly}
                    onChange={(e) => setCandFormData(prev => ({ ...prev, expectedSalaryMonthly: Number(e.target.value) }))}
                    className={`w-full px-3.5 py-2 text-sm rounded-xl border focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                      isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1 text-slate-600 dark:text-slate-400 uppercase tracking-wider">Resume / CV Document</label>
                <div className={`mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-xl transition ${
                  isDark ? 'border-slate-700 hover:border-teal-500 bg-slate-800/40' : 'border-slate-300 hover:border-teal-500 bg-slate-50'
                }`}>
                  <div className="space-y-1 text-center">
                    <FileText className="mx-auto h-10 w-10 text-slate-400" />
                    <div className="flex text-sm text-slate-600 dark:text-slate-400">
                      <label className="relative cursor-pointer bg-transparent rounded-md font-bold text-teal-600 hover:text-teal-500 focus-within:outline-none">
                        <span>{resumeFile ? resumeFile.name : 'Upload a file'}</span>
                        <input 
                          type="file" 
                          className="sr-only" 
                          accept=".pdf,.doc,.docx"
                          onChange={(e) => setResumeFile(e.target.files?.[0] || null)}
                        />
                      </label>
                      {!resumeFile && <p className="pl-1 text-xs">or drag and drop</p>}
                    </div>
                    <p className="text-[10px] text-slate-500">PDF, DOC, DOCX up to 5MB</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1 text-slate-600 dark:text-slate-400 uppercase tracking-wider">Current Address</label>
                  <textarea
                    rows={2}
                    value={candFormData.currentAddress}
                    onChange={(e) => setCandFormData(prev => ({ ...prev, currentAddress: e.target.value }))}
                    className={`w-full px-3.5 py-2 text-sm rounded-xl border focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                      isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1 text-slate-600 dark:text-slate-400 uppercase tracking-wider">Permanent Address</label>
                  <textarea
                    rows={2}
                    value={candFormData.permanentAddress}
                    onChange={(e) => setCandFormData(prev => ({ ...prev, permanentAddress: e.target.value }))}
                    className={`w-full px-3.5 py-2 text-sm rounded-xl border focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                      isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  disabled={isRegistering}
                  onClick={() => setIsCandidateModalOpen(false)}
                  className="px-4 py-2 text-sm font-semibold rounded-xl text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isRegistering}
                  className="px-5 py-2 text-sm font-semibold rounded-xl bg-teal-600 hover:bg-teal-700 text-white shadow-sm disabled:opacity-50 flex items-center gap-2"
                >
                  {isRegistering && <RefreshCw className="w-4 h-4 animate-spin" />}
                  <span>{isRegistering ? 'Registering...' : 'Complete Registration'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Requisition Modal */}
      {isReqModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className={`w-full max-w-2xl max-h-[90vh] rounded-3xl shadow-2xl overflow-hidden border flex flex-col ${
            isDark ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className={`p-6 border-b flex items-center justify-between ${isDark ? 'border-slate-800 bg-slate-850' : 'border-slate-200 bg-slate-50'}`}>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-teal-100 dark:bg-teal-900/40 text-teal-600 rounded-xl">
                  <Briefcase className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-lg leading-none">Raise Recruitment Requisition</h3>
                  <p className="text-xs text-slate-500 mt-1 uppercase tracking-widest font-bold">New Vacancy Request</p>
                </div>
              </div>
              <button onClick={() => setIsReqModalOpen(false)} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateRequisition} className="flex-1 overflow-y-auto p-8 space-y-8">
              {/* Basic Details */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold uppercase text-teal-600 tracking-widest">Position & Department</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="col-span-full">
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1.5">Job Title / Vacancy Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Senior Security Supervisor"
                      value={reqFormData.jobTitle}
                      onChange={(e) => setReqFormData(prev => ({ ...prev, jobTitle: e.target.value }))}
                      className={`w-full px-4 py-2.5 text-sm rounded-xl border focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                        isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-300'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1.5">Department</label>
                    <select
                      value={reqFormData.departmentId}
                      onChange={(e) => setReqFormData(prev => ({ ...prev, departmentId: e.target.value }))}
                      className={`w-full px-4 py-2.5 text-sm rounded-xl border focus:outline-none ${
                        isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-300'
                      }`}
                    >
                      <option value="">Select Department</option>
                      {departments.map(d => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1.5">Deployment Site / Branch</label>
                    <select
                      value={reqFormData.siteId}
                      onChange={(e) => setReqFormData(prev => ({ ...prev, siteId: e.target.value }))}
                      className={`w-full px-4 py-2.5 text-sm rounded-xl border focus:outline-none ${
                        isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-300'
                      }`}
                    >
                      <option value="">Select Site</option>
                      {sites.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Hiring Requirements */}
              <div className="space-y-4 pt-6 border-t border-slate-100 dark:border-slate-800">
                <h4 className="text-xs font-bold uppercase text-teal-600 tracking-widest">Hiring Requirements & Capacity</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1.5">Open Vacancies</label>
                    <input
                      type="number"
                      min={1}
                      required
                      value={reqFormData.openPositions}
                      onChange={(e) => setReqFormData(prev => ({ ...prev, openPositions: Number(e.target.value) }))}
                      className={`w-full px-4 py-2.5 text-sm rounded-xl border focus:outline-none ${
                        isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-300'
                      }`}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1.5">Employment Type</label>
                    <select
                      value={reqFormData.employmentType}
                      onChange={(e) => setReqFormData(prev => ({ ...prev, employmentType: e.target.value as any }))}
                      className={`w-full px-4 py-2.5 text-sm rounded-xl border focus:outline-none ${
                        isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-300'
                      }`}
                    >
                      <option value="FULL_TIME">Full Time</option>
                      <option value="PART_TIME">Part Time</option>
                      <option value="CONTRACT">Contract</option>
                      <option value="TEMPORARY">Temporary</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1.5">Workforce Category</label>
                    <select
                      value={reqFormData.workforceCategory}
                      onChange={(e) => setReqFormData(prev => ({ ...prev, workforceCategory: e.target.value as any }))}
                      className={`w-full px-4 py-2.5 text-sm rounded-xl border focus:outline-none ${
                        isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-300'
                      }`}
                    >
                      <option value="OPERATIONS">Operations (PSARA)</option>
                      <option value="MANAGERIAL">Managerial</option>
                      <option value="EXECUTIVE">Executive / Staff</option>
                      <option value="TRAINING">Training Academy</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1.5">Priority Level</label>
                    <select
                      value={reqFormData.priority}
                      onChange={(e) => setReqFormData(prev => ({ ...prev, priority: e.target.value as any }))}
                      className={`w-full px-4 py-2.5 text-sm rounded-xl border focus:outline-none ${
                        isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-300'
                      }`}
                    >
                      <option value="LOW">Low</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HIGH">High</option>
                      <option value="CRITICAL">Critical</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1.5">Min Experience (Yrs)</label>
                    <input
                      type="number"
                      min={0}
                      value={reqFormData.minExperienceYears}
                      onChange={(e) => setReqFormData(prev => ({ ...prev, minExperienceYears: Number(e.target.value) }))}
                      className={`w-full px-4 py-2.5 text-sm rounded-xl border focus:outline-none ${
                        isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-300'
                      }`}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1.5">Target Joining Date</label>
                    <input
                      type="date"
                      required
                      value={reqFormData.targetHiringDate}
                      onChange={(e) => setReqFormData(prev => ({ ...prev, targetHiringDate: e.target.value }))}
                      className={`w-full px-4 py-2.5 text-sm rounded-xl border focus:outline-none ${
                        isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-300'
                      }`}
                    />
                  </div>
                </div>
              </div>

              {/* Financials & Description */}
              <div className="space-y-4 pt-6 border-t border-slate-100 dark:border-slate-800">
                <h4 className="text-xs font-bold uppercase text-teal-600 tracking-widest">Financials & Job Details</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1.5">Salary Min (Monthly)</label>
                    <div className="relative">
                      <DollarSign className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                      <input
                        type="number"
                        value={reqFormData.salaryMinMonthly}
                        onChange={(e) => setReqFormData(prev => ({ ...prev, salaryMinMonthly: Number(e.target.value) }))}
                        className={`w-full pl-9 pr-4 py-2.5 text-sm rounded-xl border focus:outline-none ${
                          isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-300'
                        }`}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1.5">Salary Max (Monthly)</label>
                    <div className="relative">
                      <DollarSign className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                      <input
                        type="number"
                        value={reqFormData.salaryMaxMonthly}
                        onChange={(e) => setReqFormData(prev => ({ ...prev, salaryMaxMonthly: Number(e.target.value) }))}
                        className={`w-full pl-9 pr-4 py-2.5 text-sm rounded-xl border focus:outline-none ${
                          isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-300'
                        }`}
                      />
                    </div>
                  </div>
                  <div className="col-span-full">
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1.5">Required Skills (Comma separated)</label>
                    <input
                      type="text"
                      placeholder="e.g. PSARA Certified, Fire Safety, First Aid, Guarding"
                      value={reqFormData.requiredSkills}
                      onChange={(e) => setReqFormData(prev => ({ ...prev, requiredSkills: e.target.value }))}
                      className={`w-full px-4 py-2.5 text-sm rounded-xl border focus:outline-none ${
                        isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-300'
                      }`}
                    />
                  </div>
                  <div className="col-span-full">
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1.5">Job Description / Responsibilities</label>
                    <textarea
                      rows={3}
                      placeholder="Detailed breakdown of duties..."
                      value={reqFormData.description}
                      onChange={(e) => setReqFormData(prev => ({ ...prev, description: e.target.value }))}
                      className={`w-full px-4 py-2.5 text-sm rounded-xl border focus:outline-none ${
                        isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-300'
                      }`}
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-6 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsReqModalOpen(false)}
                  className="px-6 py-2.5 text-sm font-bold rounded-xl text-slate-500 hover:bg-slate-100 transition"
                >
                  Save as Draft
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingReq}
                  className="px-8 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-teal-600/20 transition flex items-center gap-2"
                >
                  {isSubmittingReq && <RefreshCw className="w-4 h-4 animate-spin" />}
                  Create Requisition
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Selection Decision Modal */}
      {isSelectionModalOpen && selectedCandidate && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md">
          <form 
            onSubmit={handleSubmitSelection}
            className={`w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden border flex flex-col ${
              isDark ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div className={`p-6 border-b flex items-center justify-between ${isDark ? 'border-slate-800 bg-slate-850' : 'border-slate-200 bg-slate-50'}`}>
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-100 dark:bg-emerald-900/40 rounded-xl text-emerald-600">
                  <UserCheck className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-base">Final Selection Decision</h3>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{selectedCandidate.fullName} • {selectedCandidate.candidateCode}</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setIsSelectionModalOpen(false)}
                className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-8 space-y-6">
              <div className="space-y-4">
                <label className="block text-[11px] font-bold uppercase text-slate-500 tracking-widest">Decision Outcome</label>
                <div className="grid grid-cols-3 gap-3">
                  {(['SELECTED', 'REJECTED', 'HOLD'] as SelectionDecision[]).map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setSelectionFormData(prev => ({ ...prev, decision: opt }))}
                      className={`py-3 rounded-2xl text-xs font-bold border transition-all ${
                        selectionFormData.decision === opt
                          ? opt === 'SELECTED' ? 'bg-emerald-600 border-emerald-600 text-white shadow-lg shadow-emerald-600/20' :
                            opt === 'REJECTED' ? 'bg-rose-600 border-rose-600 text-white shadow-lg shadow-rose-600/20' :
                            'bg-amber-600 border-amber-600 text-white shadow-lg shadow-amber-600/20'
                          : isDark ? 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500' : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              {selectionFormData.decision === 'REJECTED' && (
                <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                  <label className="block text-[11px] font-bold uppercase text-rose-500 tracking-widest">Rejection Reason *</label>
                  <textarea
                    required
                    value={selectionFormData.rejectionReason}
                    onChange={(e) => setSelectionFormData(prev => ({ ...prev, rejectionReason: e.target.value }))}
                    placeholder="Provide a specific reason for rejection..."
                    rows={3}
                    className={`w-full px-4 py-3 text-sm rounded-2xl border focus:outline-none transition-all ${
                      isDark ? 'bg-slate-800 border-slate-700 focus:border-rose-500' : 'bg-slate-50 border-slate-200 focus:border-rose-400'
                    }`}
                  />
                </div>
              )}

              <div className="space-y-2">
                <label className="block text-[11px] font-bold uppercase text-slate-500 tracking-widest">Notes / Justification</label>
                <textarea
                  value={selectionFormData.notes}
                  onChange={(e) => setSelectionFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Additional context for this decision..."
                  rows={3}
                  className={`w-full px-4 py-3 text-sm rounded-2xl border focus:outline-none transition-all ${
                    isDark ? 'bg-slate-800 border-slate-700 focus:border-indigo-500' : 'bg-slate-50 border-slate-200 focus:border-indigo-400'
                  }`}
                />
              </div>

              <div className={`p-4 rounded-2xl border text-[11px] font-medium leading-relaxed ${isDark ? 'bg-slate-800/40 border-slate-700 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
                <div className="flex items-start gap-2">
                   <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                   <p>
                     {selectionFormData.decision === 'SELECTED' 
                       ? 'Selecting this candidate will trigger the approval workflow (if configured) or move them directly to the Selected stage. This will affect requisition capacity.'
                       : selectionFormData.decision === 'REJECTED'
                       ? 'Rejecting this candidate will move them to the Rejected stage and notify HR. This action is recorded in the audit trail.'
                       : 'Placing this candidate on Hold will preserve their current interview status for future reconsideration.'}
                   </p>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsSelectionModalOpen(false)}
                className="px-6 py-2.5 text-sm font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmittingSelection}
                className={`px-8 py-2.5 rounded-xl text-sm font-bold shadow-lg transition flex items-center gap-2 ${
                  selectionFormData.decision === 'REJECTED' 
                    ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/20' 
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20'
                }`}
              >
                {isSubmittingSelection && <RefreshCw className="w-4 h-4 animate-spin" />}
                Confirm Decision
              </button>
            </div>
          </form>
        </div>
      )}
      {/* Background Verification Request Modal */}
      {isVerificationModalOpen && selectedCandidate && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md">
          <form 
            onSubmit={handleSubmitVerificationRequest}
            className={`w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden border flex flex-col ${
              isDark ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div className={`p-6 border-b flex items-center justify-between ${isDark ? 'border-slate-800 bg-slate-850' : 'border-slate-200 bg-slate-50'}`}>
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-100 dark:bg-indigo-900/40 rounded-xl text-indigo-600">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-base">Request Background Verification</h3>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{selectedCandidate.fullName}</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setIsVerificationModalOpen(false)}
                className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-[11px] font-bold uppercase text-slate-500 tracking-widest">Verification Type</label>
                  <select
                    value={bgvFormData.type}
                    onChange={(e) => setBgvFormData(prev => ({ ...prev, type: e.target.value as BgVerificationType }))}
                    className={`w-full px-4 py-3 text-sm rounded-2xl border focus:outline-none transition-all ${
                      isDark ? 'bg-slate-800 border-slate-700 focus:border-indigo-500' : 'bg-slate-50 border-slate-200 focus:border-indigo-400'
                    }`}
                  >
                    <option value="EMPLOYMENT">Employment History</option>
                    <option value="EDUCATION">Education Verification</option>
                    <option value="IDENTITY">ID / Document Check</option>
                    <option value="ADDRESS">Address Verification</option>
                    <option value="REFERENCE">Professional Reference</option>
                    <option value="POLICE">Police / Criminal Record Check</option>
                    <option value="OTHER">Other / Misc Check</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="block text-[11px] font-bold uppercase text-slate-500 tracking-widest">Target Due Date</label>
                  <input
                    type="date"
                    required
                    value={bgvFormData.dueDate}
                    onChange={(e) => setBgvFormData(prev => ({ ...prev, dueDate: e.target.value }))}
                    className={`w-full px-4 py-3 text-sm rounded-2xl border focus:outline-none transition-all ${
                      isDark ? 'bg-slate-800 border-slate-700 focus:border-indigo-500' : 'bg-slate-50 border-slate-200 focus:border-indigo-400'
                    }`}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-[11px] font-bold uppercase text-slate-500 tracking-widest">Specific Instructions</label>
                <textarea
                  value={bgvFormData.notes}
                  onChange={(e) => setBgvFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Detail any specific aspects or documents to verify..."
                  rows={3}
                  className={`w-full px-4 py-3 text-sm rounded-2xl border focus:outline-none transition-all ${
                    isDark ? 'bg-slate-800 border-slate-700 focus:border-indigo-500' : 'bg-slate-50 border-slate-200 focus:border-indigo-400'
                  }`}
                />
              </div>
            </div>

            <div className="p-6 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsVerificationModalOpen(false)}
                className="px-6 py-2.5 text-sm font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isRequestingVerification}
                className="px-8 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-600/20 transition flex items-center gap-2"
              >
                {isRequestingVerification && <RefreshCw className="w-4 h-4 animate-spin" />}
                Initiate Request
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Verification Processing Modal */}
      {isProcessVerificationModalOpen && selectedVerification && (
        <div className="fixed inset-0 z-[75] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md">
          <form 
            onSubmit={handleSubmitVerificationProcess}
            className={`w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden border flex flex-col ${
              isDark ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div className={`p-6 border-b flex items-center justify-between ${isDark ? 'border-slate-800 bg-slate-850' : 'border-slate-200 bg-slate-50'}`}>
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-100 dark:bg-indigo-900/40 rounded-xl text-indigo-600">
                  <RefreshCw className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-base">Process Background Check</h3>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                    {selectedVerification.verificationCode} • {selectedVerification.type}
                  </p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setIsProcessVerificationModalOpen(false)}
                className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-[11px] font-bold uppercase text-slate-500 tracking-widest">Update Status</label>
                  <select
                    value={bgvProcessFormData.status}
                    onChange={(e) => setBgvProcessFormData(prev => ({ ...prev, status: e.target.value as BgVerificationStatus }))}
                    className={`w-full px-4 py-3 text-sm rounded-2xl border focus:outline-none transition-all ${
                      isDark ? 'bg-slate-800 border-slate-700 focus:border-indigo-500' : 'bg-slate-50 border-slate-200 focus:border-indigo-400'
                    }`}
                  >
                    <option value="ASSIGNED">Assigned</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="EVIDENCE_SUBMITTED">Evidence Submitted</option>
                    <option value="UNDER_REVIEW">Under Review</option>
                    <option value="CLEARED">Cleared / Approved</option>
                    <option value="FAILED">Failed / Rejected</option>
                    <option value="CLARIFICATION_REQUIRED">Requires Clarification</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="block text-[11px] font-bold uppercase text-slate-500 tracking-widest">Final Result</label>
                  <select
                    value={bgvProcessFormData.result}
                    onChange={(e) => setBgvProcessFormData(prev => ({ ...prev, result: e.target.value as BgVerificationResult }))}
                    className={`w-full px-4 py-3 text-sm rounded-2xl border focus:outline-none transition-all ${
                      isDark ? 'bg-slate-800 border-slate-700 focus:border-indigo-500' : 'bg-slate-50 border-slate-200 focus:border-indigo-400'
                    }`}
                  >
                    <option value="PENDING">Pending</option>
                    <option value="CLEARED">Cleared</option>
                    <option value="FAILED">Failed</option>
                    <option value="CLARIFICATION_REQUIRED">Incomplete</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-[11px] font-bold uppercase text-slate-500 tracking-widest">Assigned Verifier</label>
                <select
                  value={bgvProcessFormData.assignedVerifierId}
                  onChange={(e) => setBgvProcessFormData(prev => ({ ...prev, assignedVerifierId: e.target.value }))}
                  className={`w-full px-4 py-3 text-sm rounded-2xl border focus:outline-none transition-all ${
                    isDark ? 'bg-slate-800 border-slate-700 focus:border-indigo-500' : 'bg-slate-50 border-slate-200 focus:border-indigo-400'
                  }`}
                >
                  <option value="">-- Unassigned --</option>
                  {employees.filter(e => e.role === 'HR' || e.role === 'HR_ADMIN' || e.role === 'COMPANY_ADMIN').map(e => (
                    <option key={e.id} value={e.id}>{e.firstName} {e.lastName} ({e.role})</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="block text-[11px] font-bold uppercase text-slate-500 tracking-widest">Verification Findings</label>
                <textarea
                  value={bgvProcessFormData.findings}
                  onChange={(e) => setBgvProcessFormData(prev => ({ ...prev, findings: e.target.value }))}
                  placeholder="Summarize the findings of the background check..."
                  rows={3}
                  className={`w-full px-4 py-3 text-sm rounded-2xl border focus:outline-none transition-all ${
                    isDark ? 'bg-slate-800 border-slate-700 focus:border-indigo-500' : 'bg-slate-50 border-slate-200 focus:border-indigo-400'
                  }`}
                />
              </div>

              <div className="space-y-2">
                <label className="block text-[11px] font-bold uppercase text-slate-500 tracking-widest">Internal Notes</label>
                <textarea
                  value={bgvProcessFormData.notes}
                  onChange={(e) => setBgvProcessFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Additional context or remarks..."
                  rows={2}
                  className={`w-full px-4 py-3 text-sm rounded-2xl border focus:outline-none transition-all ${
                    isDark ? 'bg-slate-800 border-slate-700 focus:border-indigo-500' : 'bg-slate-50 border-slate-200 focus:border-indigo-400'
                  }`}
                />
              </div>

              <div className="space-y-2">
                <label className="block text-[11px] font-bold uppercase text-slate-500 tracking-widest">Upload Evidence Document (Optional)</label>
                <input
                  type="file"
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      setBgvProcessFormData(prev => ({ ...prev, evidenceFile: e.target.files![0] }));
                    }
                  }}
                  className={`w-full px-3 py-2.5 text-sm rounded-xl border focus:outline-none transition-all ${
                    isDark ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-slate-50 border-slate-300 text-slate-700'
                  }`}
                />
              </div>
            </div>

            <div className="p-6 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsProcessVerificationModalOpen(false)}
                className="px-6 py-2.5 text-sm font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isUpdatingVerification}
                className={`px-8 py-2.5 rounded-xl text-sm font-bold shadow-lg transition flex items-center gap-2 ${
                  bgvProcessFormData.result === 'FAILED' 
                    ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/20' 
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/20'
                }`}
              >
                {isUpdatingVerification && <RefreshCw className="w-4 h-4 animate-spin" />}
                Update Verification
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Upload Document Modal (Module 12 / Point 10) */}
      {isUploadDocModalOpen && selectedCandidate && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md">
          <form
            onSubmit={handleUploadDocSubmit}
            className={`w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden border flex flex-col ${
              isDark ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div className={`p-6 border-b flex items-center justify-between ${isDark ? 'border-slate-800 bg-slate-850' : 'border-slate-200 bg-slate-50'}`}>
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-teal-100 dark:bg-teal-900/40 rounded-xl text-teal-600">
                  <Upload className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-base">Upload Candidate Document</h3>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{selectedCandidate.fullName} ({selectedCandidate.candidateCode})</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsUploadDocModalOpen(false)}
                className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="space-y-2">
                <label className="block text-[11px] font-bold uppercase text-slate-500 tracking-widest">Document Type</label>
                <select
                  value={uploadDocFormData.documentType}
                  onChange={(e) => {
                    const dt = e.target.value as CandidateDocumentType;
                    const standard = STANDARD_CANDIDATE_DOCUMENTS.find(s => s.documentType === dt);
                    setUploadDocFormData(prev => ({
                      ...prev,
                      documentType: dt,
                      documentName: standard?.documentName || dt.replace(/_/g, ' '),
                      isRequired: standard?.isRequired ?? false
                    }));
                  }}
                  className={`w-full px-4 py-3 text-sm rounded-2xl border focus:outline-none transition-all ${
                    isDark ? 'bg-slate-800 border-slate-700 focus:border-teal-500' : 'bg-slate-50 border-slate-200 focus:border-teal-400'
                  }`}
                >
                  {STANDARD_CANDIDATE_DOCUMENTS.map(sd => (
                    <option key={sd.documentType} value={sd.documentType}>
                      {sd.documentName} {sd.isRequired ? '(Mandatory)' : ''}
                    </option>
                  ))}
                  <option value="OTHER">Other Custom Document</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="block text-[11px] font-bold uppercase text-slate-500 tracking-widest">Document Label / Title</label>
                <input
                  type="text"
                  required
                  value={uploadDocFormData.documentName}
                  onChange={(e) => setUploadDocFormData(prev => ({ ...prev, documentName: e.target.value }))}
                  placeholder="e.g. Police Clearance Certificate, BCA Degree"
                  className={`w-full px-4 py-3 text-sm rounded-2xl border focus:outline-none transition-all ${
                    isDark ? 'bg-slate-800 border-slate-700 focus:border-teal-500' : 'bg-slate-50 border-slate-200 focus:border-teal-400'
                  }`}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-[11px] font-bold uppercase text-slate-500 tracking-widest">Expiry Date (If Applicable)</label>
                  <input
                    type="date"
                    value={uploadDocFormData.expiryDate}
                    onChange={(e) => setUploadDocFormData(prev => ({ ...prev, expiryDate: e.target.value }))}
                    className={`w-full px-4 py-3 text-sm rounded-2xl border focus:outline-none transition-all ${
                      isDark ? 'bg-slate-800 border-slate-700 focus:border-teal-500' : 'bg-slate-50 border-slate-200 focus:border-teal-400'
                    }`}
                  />
                  <span className="text-[10px] text-slate-400">Required for licenses, PCC & passports</span>
                </div>

                <div className="flex items-center gap-3 pt-6">
                  <input
                    type="checkbox"
                    id="isRequiredDoc"
                    checked={uploadDocFormData.isRequired}
                    onChange={(e) => setUploadDocFormData(prev => ({ ...prev, isRequired: e.target.checked }))}
                    className="w-4 h-4 text-teal-600 rounded focus:ring-teal-500"
                  />
                  <label htmlFor="isRequiredDoc" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Mandatory for Onboarding
                  </label>
                </div>
              </div>

              {/* File Dropzone */}
              <div className="space-y-2">
                <label className="block text-[11px] font-bold uppercase text-slate-500 tracking-widest">Select File</label>
                <div className={`p-6 border-2 border-dashed rounded-2xl text-center transition ${
                  isDark ? 'bg-slate-800/40 border-slate-700 hover:border-teal-500' : 'bg-slate-50 border-slate-300 hover:border-teal-500'
                }`}>
                  <input
                    type="file"
                    id="candDocFileInput"
                    required
                    accept=".pdf,.jpg,.jpeg,.png,.webp"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setUploadDocFormData(prev => ({ ...prev, file: e.target.files![0] }));
                      }
                    }}
                    className="hidden"
                  />
                  <label htmlFor="candDocFileInput" className="cursor-pointer block">
                    <Upload className="w-8 h-8 text-teal-600 mx-auto mb-2" />
                    {uploadDocFormData.file ? (
                      <div>
                        <p className="text-xs font-bold text-teal-600 truncate max-w-xs mx-auto">
                          {uploadDocFormData.file.name}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          {(uploadDocFormData.file.size / 1024).toFixed(0)} KB • Click to change
                        </p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                          Click to browse or drag & drop document
                        </p>
                        <p className="text-[10px] text-slate-400 mt-1">
                          Supported formats: PDF, JPG, PNG, WEBP (Max 10MB)
                        </p>
                      </div>
                    )}
                  </label>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsUploadDocModalOpen(false)}
                className="px-6 py-2.5 text-sm font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isUploadingDoc || !uploadDocFormData.file}
                className="px-8 py-2.5 rounded-xl text-sm font-bold bg-teal-600 hover:bg-teal-700 text-white shadow-lg shadow-teal-600/20 transition flex items-center gap-2 disabled:opacity-50"
              >
                {isUploadingDoc && <RefreshCw className="w-4 h-4 animate-spin" />}
                <span>Upload & Save</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Review & Verify Document Modal (Module 12 / Point 10) */}
      {isReviewDocModalOpen && selectedCandidateDoc && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md">
          <form
            onSubmit={handleReviewDocSubmit}
            className={`w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden border flex flex-col ${
              isDark ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div className={`p-6 border-b flex items-center justify-between ${isDark ? 'border-slate-800 bg-slate-850' : 'border-slate-200 bg-slate-50'}`}>
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-slate-800 text-teal-400 rounded-xl">
                  <FileCheck className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-base">Review & Verify Document</h3>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                    {selectedCandidateDoc.documentName} (v{selectedCandidateDoc.version || 1})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsReviewDocModalOpen(false)}
                className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
              {/* Document Overview Card */}
              <div className={`p-4 rounded-2xl border flex items-center justify-between ${
                isDark ? 'bg-slate-800/40 border-slate-700' : 'bg-slate-50 border-slate-200'
              }`}>
                <div>
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    {selectedCandidateDoc.fileName}
                  </h4>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    Submitted by {selectedCandidateDoc.submittedBy} on {new Date(selectedCandidateDoc.submittedAt || selectedCandidateDoc.createdAt).toLocaleDateString()}
                  </p>
                </div>
                {selectedCandidateDoc.fileUrl && (
                  <a
                    href={selectedCandidateDoc.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold transition"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Open File</span>
                  </a>
                )}
              </div>

              {/* Decision Toggle */}
              <div className="space-y-2">
                <label className="block text-[11px] font-bold uppercase text-slate-500 tracking-widest">Verification Decision</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setReviewDocFormData(prev => ({ ...prev, decision: 'VERIFIED' }))}
                    className={`py-3 px-2 rounded-2xl text-xs font-bold border transition flex flex-col items-center gap-1.5 ${
                      reviewDocFormData.decision === 'VERIFIED'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-600/20'
                        : isDark ? 'bg-slate-800 border-slate-700 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-600'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Verified</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setReviewDocFormData(prev => ({ ...prev, decision: 'CORRECTION_REQUIRED' }))}
                    className={`py-3 px-2 rounded-2xl text-xs font-bold border transition flex flex-col items-center gap-1.5 ${
                      reviewDocFormData.decision === 'CORRECTION_REQUIRED'
                        ? 'bg-amber-600 text-white border-amber-600 shadow-md shadow-amber-600/20'
                        : isDark ? 'bg-slate-800 border-slate-700 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-600'
                    }`}
                  >
                    <AlertTriangle className="w-4 h-4" />
                    <span>Need Fix</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setReviewDocFormData(prev => ({ ...prev, decision: 'REJECTED' }))}
                    className={`py-3 px-2 rounded-2xl text-xs font-bold border transition flex flex-col items-center gap-1.5 ${
                      reviewDocFormData.decision === 'REJECTED'
                        ? 'bg-rose-600 text-white border-rose-600 shadow-md shadow-rose-600/20'
                        : isDark ? 'bg-slate-800 border-slate-700 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-600'
                    }`}
                  >
                    <XCircle className="w-4 h-4" />
                    <span>Reject</span>
                  </button>
                </div>
              </div>

              {/* Remarks / Findings */}
              <div className="space-y-2">
                <label className="block text-[11px] font-bold uppercase text-slate-500 tracking-widest">
                  {reviewDocFormData.decision === 'VERIFIED'
                    ? 'Internal Remarks (Optional)'
                    : 'Mandatory Rejection / Correction Reason'}
                </label>
                <textarea
                  required={reviewDocFormData.decision !== 'VERIFIED'}
                  value={reviewDocFormData.reasonOrNotes}
                  onChange={(e) => setReviewDocFormData(prev => ({ ...prev, reasonOrNotes: e.target.value }))}
                  placeholder={
                    reviewDocFormData.decision === 'VERIFIED'
                      ? 'e.g. Identity and signatures matched original records.'
                      : 'e.g. Scanned copy is blurred, please upload clear high-resolution document.'
                  }
                  rows={3}
                  className={`w-full px-4 py-3 text-sm rounded-2xl border focus:outline-none transition-all ${
                    isDark ? 'bg-slate-800 border-slate-700 focus:border-teal-500' : 'bg-slate-50 border-slate-200 focus:border-teal-400'
                  }`}
                />
              </div>

              {/* Expiry Date Adjustment */}
              <div className="space-y-2">
                <label className="block text-[11px] font-bold uppercase text-slate-500 tracking-widest">
                  Verified Document Expiry Date
                </label>
                <input
                  type="date"
                  value={reviewDocFormData.expiryDate}
                  onChange={(e) => setReviewDocFormData(prev => ({ ...prev, expiryDate: e.target.value }))}
                  className={`w-full px-4 py-3 text-sm rounded-2xl border focus:outline-none transition-all ${
                    isDark ? 'bg-slate-800 border-slate-700 focus:border-teal-500' : 'bg-slate-50 border-slate-200 focus:border-teal-400'
                  }`}
                />
                <span className="text-[10px] text-slate-400">Leave blank if this document has no legal expiration.</span>
              </div>
            </div>

            <div className="p-6 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsReviewDocModalOpen(false)}
                className="px-6 py-2.5 text-sm font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isReviewingDoc}
                className={`px-8 py-2.5 rounded-xl text-sm font-bold shadow-lg transition flex items-center gap-2 ${
                  reviewDocFormData.decision === 'VERIFIED'
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20'
                    : reviewDocFormData.decision === 'CORRECTION_REQUIRED'
                      ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-600/20'
                      : 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/20'
                }`}
              >
                {isReviewingDoc && <RefreshCw className="w-4 h-4 animate-spin" />}
                <span>Confirm Review</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Document Version History Modal (Module 12 / Point 10) */}
      {isVersionHistoryModalOpen && selectedCandidateDoc && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md">
          <div
            className={`w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden border flex flex-col ${
              isDark ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div className={`p-6 border-b flex items-center justify-between ${isDark ? 'border-slate-800 bg-slate-850' : 'border-slate-200 bg-slate-50'}`}>
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-100 dark:bg-indigo-900/40 rounded-xl text-indigo-600">
                  <History className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-base">Document Version History</h3>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{selectedCandidateDoc.documentName}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsVersionHistoryModalOpen(false)}
                className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              {/* Current Active Version */}
              <div className={`p-4 rounded-2xl border-2 ${
                isDark ? 'bg-slate-800/60 border-teal-600/60' : 'bg-teal-50/40 border-teal-300'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-black bg-teal-600 text-white">
                      Current v{selectedCandidateDoc.version || 1}
                    </span>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                      {selectedCandidateDoc.fileName}
                    </span>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    selectedCandidateDoc.status === 'VERIFIED'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-indigo-100 text-indigo-800'
                  }`}>
                    {selectedCandidateDoc.status}
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 mt-2 space-y-0.5">
                  <p>Uploaded by: {selectedCandidateDoc.submittedBy} on {new Date(selectedCandidateDoc.submittedAt || selectedCandidateDoc.createdAt).toLocaleString()}</p>
                  {selectedCandidateDoc.fileSize && <p>Size: {(selectedCandidateDoc.fileSize / 1024).toFixed(0)} KB</p>}
                </div>
                {selectedCandidateDoc.fileUrl && (
                  <div className="mt-3">
                    <a
                      href={selectedCandidateDoc.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-bold text-teal-600 hover:underline"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>View Current File</span>
                    </a>
                  </div>
                )}
              </div>

              {/* Historical Versions */}
              {selectedCandidateDoc.history && selectedCandidateDoc.history.length > 0 ? (
                <div className="space-y-3 pt-2">
                  <h4 className="text-xs font-bold uppercase text-slate-500 tracking-wider">
                    Previous Revisions ({selectedCandidateDoc.history.length})
                  </h4>
                  {selectedCandidateDoc.history.slice().reverse().map((ver, idx) => (
                    <div
                      key={idx}
                      className={`p-3.5 rounded-2xl border ${
                        isDark ? 'bg-slate-800/40 border-slate-700' : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                            v{ver.version}
                          </span>
                          <span className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate max-w-[200px]">
                            {ver.fileName}
                          </span>
                        </div>
                        {ver.status && (
                          <span className="text-[10px] font-bold text-slate-400">
                            {ver.status}
                          </span>
                        )}
                      </div>

                      <div className="text-[10px] text-slate-400 mt-1">
                        Uploaded by {ver.uploadedBy} on {new Date(ver.uploadedAt).toLocaleString()}
                      </div>

                      {ver.rejectionReason && (
                        <p className="text-[10px] text-rose-500 mt-1">
                          <strong>Finding:</strong> {ver.rejectionReason}
                        </p>
                      )}

                      {ver.fileUrl && (
                        <div className="mt-2">
                          <a
                            href={ver.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-600 dark:text-slate-400 hover:text-teal-600"
                          >
                            <ExternalLink className="w-3 h-3" />
                            <span>View Version {ver.version}</span>
                          </a>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 text-center py-4">No previous revisions recorded for this document.</p>
              )}
            </div>

            <div className="p-6 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setIsVersionHistoryModalOpen(false)}
                className="px-6 py-2.5 text-sm font-bold bg-slate-800 text-white hover:bg-slate-900 rounded-xl transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
