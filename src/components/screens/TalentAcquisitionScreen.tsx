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
  PhaseAScreen
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
  AlertCircle
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
  const [activeTab, setActiveTab] = useState<'CANDIDATES' | 'REQUISITIONS'>('CANDIDATES');
  const [requisitions, setRequisitions] = useState<JobRequisitionRecord[]>([]);
  const [candidates, setCandidates] = useState<CandidateRecord[]>([]);
  const [departments, setDepartments] = useState<DepartmentRecord[]>([]);
  const [sites, setSites] = useState<SiteRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [stageFilter, setStageFilter] = useState<string>('ALL');

  // Modals
  const [isCandidateModalOpen, setIsCandidateModalOpen] = useState<boolean>(false);
  const [isEditProfileModalOpen, setIsEditProfileModalOpen] = useState<boolean>(false);
  const [profileTab, setProfileTab] = useState<'SUMMARY' | 'DETAIL' | 'DOCUMENTS'>('SUMMARY');
  const [isReqModalOpen, setIsReqModalOpen] = useState<boolean>(false);
  const [selectedCandidate, setSelectedCandidate] = useState<CandidateRecord | null>(null);
  const [isConverting, setIsConverting] = useState<boolean>(false);
  const [isSavingProfile, setIsSavingProfile] = useState<boolean>(false);
  const [conversionSuccessMsg, setConversionSuccessMsg] = useState<string | null>(null);
  const [registerError, setRegisterError] = useState<string | null>(null);
  const [isRegistering, setIsRegistering] = useState<boolean>(false);

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
    departmentId: '',
    siteId: '',
    openPositions: 5,
    minExperienceYears: 1,
    salaryMinMonthly: 16000,
    salaryMaxMonthly: 22000,
    jobDescription: '',
    targetHiringDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  });

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
      unsubDeps();
      unsubSites();
    };
  }, [activeCompany?.companyId]);

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

    try {
      const reqId = `REQ-${Date.now().toString().slice(-6)}`;
      const selectedDep = departments.find(d => d.id === reqFormData.departmentId);
      const selectedSite = sites.find(s => s.id === reqFormData.siteId);

      const newReq: JobRequisitionRecord = {
        id: reqId,
        requisitionCode: `REQ-${new Date().getFullYear()}-${Date.now().toString().slice(-3)}`,
        companyId: activeCompany.companyId,
        jobTitle: reqFormData.jobTitle.trim(),
        departmentId: reqFormData.departmentId || selectedDep?.id || 'DEP-SEC',
        departmentName: selectedDep?.name || 'Security Operations',
        siteId: reqFormData.siteId || selectedSite?.id || 'SITE-GEN',
        siteName: selectedSite?.name || 'All Sites',
        openPositions: Number(reqFormData.openPositions),
        filledPositions: 0,
        minExperienceYears: Number(reqFormData.minExperienceYears),
        salaryMinMonthly: Number(reqFormData.salaryMinMonthly),
        salaryMaxMonthly: Number(reqFormData.salaryMaxMonthly),
        workforceCategory: 'OPERATIONS',
        jobDescription: reqFormData.jobDescription.trim(),
        status: 'OPEN',
        targetHiringDate: reqFormData.targetHiringDate,
        createdByUserId: userSession.userId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await FirestoreService.saveJobRequisition(activeCompany.companyId, newReq);
      setIsReqModalOpen(false);
      setReqFormData({
        jobTitle: '',
        departmentId: departments[0]?.id || '',
        siteId: sites[0]?.id || '',
        openPositions: 5,
        minExperienceYears: 1,
        salaryMinMonthly: 16000,
        salaryMaxMonthly: 22000,
        jobDescription: '',
        targetHiringDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      });
    } catch (err) {
      console.error('Error creating job requisition:', err);
    }
  };

  const handleUpdateCandidateStage = async (candidate: CandidateRecord, newStage: CandidateStage) => {
    if (!activeCompany) return;

    try {
      const updated: CandidateRecord = {
        ...candidate,
        stage: newStage,
        updatedAt: new Date().toISOString()
      };
      await FirestoreService.saveCandidate(activeCompany.companyId, updated);
      setSelectedCandidate(updated);
    } catch (err) {
      console.error('Error updating stage:', err);
    }
  };

  const handleUpdateVerification = async (candidate: CandidateRecord, field: 'aadhaar' | 'police', status: VerificationStatus) => {
    if (!activeCompany) return;

    try {
      const updated: CandidateRecord = {
        ...candidate,
        aadhaarVerificationStatus: field === 'aadhaar' ? status : candidate.aadhaarVerificationStatus,
        policeVerificationStatus: field === 'police' ? status : candidate.policeVerificationStatus,
        updatedAt: new Date().toISOString()
      };
      await FirestoreService.saveCandidate(activeCompany.companyId, updated);
      setSelectedCandidate(updated);
    } catch (err) {
      console.error('Error updating verification:', err);
    }
  };

  const handle1ClickConvert = async (candidate: CandidateRecord) => {
    if (!activeCompany || !userSession) return;

    setIsConverting(true);
    try {
      const defaultSite = sites[0]?.id || 'SITE-001';
      const defaultDep = departments[0]?.id || 'DEP-SEC';
      const actor = { id: userSession.userId, name: userSession.fullName };

      const empId = await FirestoreService.convertCandidateToEmployee(activeCompany.companyId, candidate, {
        assignedSiteId: defaultSite,
        departmentId: defaultDep,
        assignedRegionId: sites.find(s => s.id === defaultSite)?.branchId || 'REG-001',
        assignedBranchId: sites.find(s => s.id === defaultSite)?.branchId || 'BR-001',
        designation: candidate.jobTitleAppliedFor,
        joinedDate: new Date().toISOString().split('T')[0],
        employmentType: 'PERMANENT',
        role: 'GUARD',
        assignedAreaId: 'AREA-001',
      }, actor);

      if (empId) {
        setConversionSuccessMsg(`Successfully converted ${candidate.fullName} into Employee Master record!`);
        setCandidates(prev => prev.map(c => c.id === candidate.id ? { ...c, stage: 'ONBOARDED', convertedToEmployeeId: empId } : c));
        if (selectedCandidate?.id === candidate.id) {
          setSelectedCandidate(prev => prev ? { ...prev, stage: 'ONBOARDED', convertedToEmployeeId: empId } : null);
        }
      }
    } catch (err) {
      console.error('Conversion failed:', err);
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
      case 'INTERVIEW':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300">Interview</span>;
      case 'BACKGROUND_VERIFICATION':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">Verification</span>;
      case 'SELECTED':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">Selected</span>;
      case 'OFFER_EXTENDED':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300">Offer Sent</span>;
      case 'ONBOARDED':
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
            {candidates.filter(c => c.stage !== 'REJECTED' && c.stage !== 'ONBOARDED').length}
          </p>
          <span className="text-xs text-slate-500">In assessment pipeline</span>
        </div>
        <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-800/60 border-slate-700' : 'bg-white border-slate-200'}`}>
          <span className="text-xs font-semibold text-slate-500 uppercase">Selected / Ready</span>
          <p className="text-2xl font-bold mt-1 text-emerald-600 dark:text-emerald-400">
            {candidates.filter(c => c.stage === 'SELECTED' || c.stage === 'OFFER_EXTENDED').length}
          </p>
          <span className="text-xs text-slate-500">Eligible for 1-click hire</span>
        </div>
        <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-800/60 border-slate-700' : 'bg-white border-slate-200'}`}>
          <span className="text-xs font-semibold text-slate-500 uppercase">Onboarded Total</span>
          <p className="text-2xl font-bold mt-1 text-indigo-600 dark:text-indigo-400">
            {candidates.filter(c => c.stage === 'ONBOARDED').length}
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
              <option value="INTERVIEW">Interview</option>
              <option value="BACKGROUND_VERIFICATION">Background Verification</option>
              <option value="SELECTED">Selected</option>
              <option value="OFFER_EXTENDED">Offer Extended</option>
              <option value="ONBOARDED">Onboarded</option>
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
                          {c.stage === 'SELECTED' || c.stage === 'OFFER_EXTENDED' ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handle1ClickConvert(c);
                              }}
                              className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-semibold shadow-sm transition flex items-center gap-1 ml-auto"
                            >
                              <Sparkles className="w-3.5 h-3.5" />
                              <span>1-Click Hire</span>
                            </button>
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {requisitions.map((req) => (
            <div
              key={req.id}
              className={`p-5 rounded-2xl border flex flex-col justify-between ${
                isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-200'
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-teal-600 dark:text-teal-400">{req.requisitionCode}</span>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                    {req.status}
                  </span>
                </div>

                <h3 className="text-lg font-bold mt-2 text-slate-900 dark:text-slate-100">{req.jobTitle}</h3>
                
                <div className="space-y-1.5 text-xs text-slate-500 mt-3">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-3.5 h-3.5 text-slate-400" />
                    <span>Department: {req.departmentName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span>Site: {req.siteName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-3.5 h-3.5 text-slate-400" />
                    <span>Budget: ₹{req.salaryMinMonthly.toLocaleString()} - ₹{req.salaryMaxMonthly.toLocaleString()}/mo</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>Target Date: {new Date(req.targetHiringDate).toLocaleDateString()}</span>
                  </div>
                </div>

                {req.jobDescription && (
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-3 line-clamp-2">
                    {req.jobDescription}
                  </p>
                )}
              </div>

              <div className="pt-4 mt-4 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                  Openings: <strong className="text-teal-600 dark:text-teal-400">{req.openPositions}</strong>
                </span>
                <button
                  onClick={() => {
                    setCandFormData(prev => ({ ...prev, requisitionId: req.id, jobTitleAppliedFor: req.jobTitle }));
                    setIsCandidateModalOpen(true);
                  }}
                  className="px-3 py-1.5 bg-teal-50 dark:bg-teal-950/50 hover:bg-teal-100 text-teal-600 dark:text-teal-300 rounded-lg text-xs font-semibold transition"
                >
                  + Add Applicant
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Candidate Profile & Hiring Modal */}
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
                          <div className="text-[11px] text-slate-500">{selectedCandidate.aadhaarNumber || 'Not submitted'}</div>
                        </div>
                        <select
                          value={selectedCandidate.aadhaarVerificationStatus}
                          onChange={(e) => handleUpdateVerification(selectedCandidate, 'aadhaar', e.target.value as VerificationStatus)}
                          className="text-xs p-1 rounded border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700"
                        >
                          <option value="PENDING">Pending</option>
                          <option value="VERIFIED">Verified</option>
                          <option value="FAILED">Failed</option>
                        </select>
                      </div>

                      <div className="p-3 rounded-lg border bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 flex items-center justify-between">
                        <div>
                          <div className="font-semibold text-xs">Police Clearance</div>
                          <div className="text-[11px] text-slate-500">PSARA Requirement</div>
                        </div>
                        <select
                          value={selectedCandidate.policeVerificationStatus}
                          onChange={(e) => handleUpdateVerification(selectedCandidate, 'police', e.target.value as VerificationStatus)}
                          className="text-xs p-1 rounded border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700"
                        >
                          <option value="PENDING">Pending</option>
                          <option value="VERIFIED">Verified</option>
                          <option value="FAILED">Failed</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Stage Transition Control */}
                  <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-800/40 border-slate-700' : 'bg-teal-50/50 border-teal-100'}`}>
                    <h4 className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400 mb-2">Hiring Pipeline Progression</h4>
                    <div className="flex flex-wrap gap-2">
                      {(['APPLIED', 'SCREENING', 'INTERVIEW', 'BACKGROUND_VERIFICATION', 'SELECTED', 'OFFER_EXTENDED', 'REJECTED'] as CandidateStage[]).map((st) => (
                        <button
                          key={st}
                          onClick={() => handleUpdateCandidateStage(selectedCandidate, st)}
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

                  {/* 1-Click Employee Conversion Action */}
                  {selectedCandidate.stage !== 'ONBOARDED' && (
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
                        onClick={() => handle1ClickConvert(selectedCandidate)}
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

              {profileTab === 'DOCUMENTS' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-800/40 border-slate-700' : 'bg-white border-slate-200'}`}>
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-teal-50 dark:bg-teal-900/30 text-teal-600 rounded-lg">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold truncate">Resume / CV</p>
                          <p className="text-[10px] text-slate-500 uppercase tracking-wider">Primary Document</p>
                        </div>
                        {selectedCandidate.resumeUrl ? (
                          <a 
                            href={selectedCandidate.resumeUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-teal-600"
                          >
                            <ArrowRight className="w-4 h-4" />
                          </a>
                        ) : (
                          <span className="text-[10px] font-bold text-rose-500">Missing</span>
                        )}
                      </div>
                    </div>

                    <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-800/40 border-slate-700' : 'bg-white border-slate-200'}`}>
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 rounded-lg">
                          <ShieldCheck className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold truncate">Aadhaar Card</p>
                          <p className="text-[10px] text-slate-500 uppercase tracking-wider">Identity Proof</p>
                        </div>
                        <span className="text-[10px] font-bold text-slate-400">Stored</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-10 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                    <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <p className="text-xs text-slate-500 font-medium">Additional Document Repository</p>
                    <p className="text-[10px] text-slate-400 mt-1">Certificates, Background Reports, and Offer Letters will appear here.</p>
                  </div>
                </div>
              )}
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
          <div className={`w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden border ${
            isDark ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className={`p-4 border-b flex items-center justify-between ${isDark ? 'border-slate-800 bg-slate-850' : 'border-slate-200 bg-slate-50'}`}>
              <h3 className="font-bold text-lg">Create Job Requisition</h3>
              <button onClick={() => setIsReqModalOpen(false)} className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateRequisition} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1 text-slate-600 dark:text-slate-400">Position Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Senior Security Supervisor"
                  value={reqFormData.jobTitle}
                  onChange={(e) => setReqFormData(prev => ({ ...prev, jobTitle: e.target.value }))}
                  className={`w-full px-3.5 py-2 text-sm rounded-xl border focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                    isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1 text-slate-600 dark:text-slate-400">Department</label>
                  <select
                    value={reqFormData.departmentId}
                    onChange={(e) => setReqFormData(prev => ({ ...prev, departmentId: e.target.value }))}
                    className={`w-full px-3 py-2 text-sm rounded-xl border focus:outline-none ${
                      isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  >
                    {departments.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1 text-slate-600 dark:text-slate-400">Open Vacancies</label>
                  <input
                    type="number"
                    min={1}
                    value={reqFormData.openPositions}
                    onChange={(e) => setReqFormData(prev => ({ ...prev, openPositions: Number(e.target.value) }))}
                    className={`w-full px-3 py-2 text-sm rounded-xl border focus:outline-none ${
                      isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1 text-slate-600 dark:text-slate-400">Min Salary (Monthly)</label>
                  <input
                    type="number"
                    value={reqFormData.salaryMinMonthly}
                    onChange={(e) => setReqFormData(prev => ({ ...prev, salaryMinMonthly: Number(e.target.value) }))}
                    className={`w-full px-3 py-2 text-sm rounded-xl border focus:outline-none ${
                      isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1 text-slate-600 dark:text-slate-400">Max Salary (Monthly)</label>
                  <input
                    type="number"
                    value={reqFormData.salaryMaxMonthly}
                    onChange={(e) => setReqFormData(prev => ({ ...prev, salaryMaxMonthly: Number(e.target.value) }))}
                    className={`w-full px-3 py-2 text-sm rounded-xl border focus:outline-none ${
                      isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsReqModalOpen(false)}
                  className="px-4 py-2 text-sm font-semibold rounded-xl text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm font-semibold rounded-xl bg-teal-600 hover:bg-teal-700 text-white shadow-sm"
                >
                  Publish Requisition
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
