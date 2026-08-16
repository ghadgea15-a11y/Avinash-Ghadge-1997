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
  const [isReqModalOpen, setIsReqModalOpen] = useState<boolean>(false);
  const [selectedCandidate, setSelectedCandidate] = useState<CandidateRecord | null>(null);
  const [isConverting, setIsConverting] = useState<boolean>(false);
  const [conversionSuccessMsg, setConversionSuccessMsg] = useState<string | null>(null);

  // Candidate Form
  const [candFormData, setCandFormData] = useState({
    fullName: '',
    gender: 'MALE' as 'MALE' | 'FEMALE' | 'OTHER',
    dateOfBirth: '1995-05-15',
    phoneNumber: '',
    email: '',
    currentAddress: '',
    experienceYears: 2,
    highestEducation: '12th Standard / HSC',
    aadhaarNumber: '',
    panNumber: '',
    expectedSalaryMonthly: 18500,
    jobTitleAppliedFor: 'Security Guard / Facility Staff',
    requisitionId: ''
  });

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
    if (!activeCompany || !candFormData.fullName.trim()) return;

    try {
      const candId = `CAND-${Date.now().toString().slice(-6)}`;
      const newCand: CandidateRecord = {
        id: candId,
        candidateCode: `CAND-${Date.now().toString().slice(-4)}`,
        companyId: activeCompany.companyId,
        requisitionId: candFormData.requisitionId || undefined,
        jobTitleAppliedFor: candFormData.jobTitleAppliedFor,
        fullName: candFormData.fullName.trim(),
        gender: candFormData.gender,
        dateOfBirth: candFormData.dateOfBirth,
        phoneNumber: candFormData.phoneNumber.trim(),
        email: candFormData.email.trim() || undefined,
        currentAddress: candFormData.currentAddress.trim(),
        experienceYears: Number(candFormData.experienceYears),
        highestEducation: candFormData.highestEducation,
        aadhaarNumber: candFormData.aadhaarNumber.trim() || undefined,
        aadhaarVerificationStatus: candFormData.aadhaarNumber ? 'VERIFIED' : 'PENDING',
        panNumber: candFormData.panNumber.trim() || undefined,
        policeVerificationStatus: 'PENDING',
        expectedSalaryMonthly: Number(candFormData.expectedSalaryMonthly),
        stage: 'APPLIED',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await FirestoreService.saveCandidate(activeCompany.companyId, newCand);
      setIsCandidateModalOpen(false);
      setCandFormData({
        fullName: '',
        gender: 'MALE',
        dateOfBirth: '1995-05-15',
        phoneNumber: '',
        email: '',
        currentAddress: '',
        experienceYears: 2,
        highestEducation: '12th Standard / HSC',
        aadhaarNumber: '',
        panNumber: '',
        expectedSalaryMonthly: 18500,
        jobTitleAppliedFor: 'Security Guard / Facility Staff',
        requisitionId: ''
      });
    } catch (err) {
      console.error('Error creating candidate:', err);
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
                <h3 className="font-bold text-lg">{selectedCandidate.fullName}</h3>
                <span className="font-mono text-xs text-teal-600">{selectedCandidate.candidateCode}</span>
                {getStageBadge(selectedCandidate.stage)}
              </div>
              <button onClick={() => setSelectedCandidate(null)} className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {conversionSuccessMsg && (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 text-emerald-800 dark:text-emerald-300 rounded-xl text-xs flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 shrink-0" />
                  <span>{conversionSuccessMsg}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-slate-500 font-semibold block">Phone Number:</span>
                  <span className="text-sm font-medium">{selectedCandidate.phoneNumber}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-semibold block">Role Applied:</span>
                  <span className="text-sm font-medium">{selectedCandidate.jobTitleAppliedFor}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-semibold block">Experience & Education:</span>
                  <span className="text-sm font-medium">{selectedCandidate.experienceYears} Years • {selectedCandidate.highestEducation}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-semibold block">Expected Monthly CTC:</span>
                  <span className="text-sm font-medium">₹{selectedCandidate.expectedSalaryMonthly.toLocaleString()}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-500 font-semibold block">Address:</span>
                  <span className="text-sm font-medium">{selectedCandidate.currentAddress}</span>
                </div>
              </div>

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
            </div>
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

            <form onSubmit={handleCreateCandidate} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1 text-slate-600 dark:text-slate-400">Full Name *</label>
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

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1 text-slate-600 dark:text-slate-400">Phone Number *</label>
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
                <div>
                  <label className="block text-xs font-semibold mb-1 text-slate-600 dark:text-slate-400">Role Applied For *</label>
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
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1 text-slate-600 dark:text-slate-400">Aadhaar Number</label>
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
                  <label className="block text-xs font-semibold mb-1 text-slate-600 dark:text-slate-400">Expected CTC (Monthly)</label>
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
                <label className="block text-xs font-semibold mb-1 text-slate-600 dark:text-slate-400">Current Address</label>
                <textarea
                  rows={2}
                  value={candFormData.currentAddress}
                  onChange={(e) => setCandFormData(prev => ({ ...prev, currentAddress: e.target.value }))}
                  className={`w-full px-3.5 py-2 text-sm rounded-xl border focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                    isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCandidateModalOpen(false)}
                  className="px-4 py-2 text-sm font-semibold rounded-xl text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm font-semibold rounded-xl bg-teal-600 hover:bg-teal-700 text-white shadow-sm"
                >
                  Register Candidate
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
