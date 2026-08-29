import React, { useState, useEffect } from 'react';
import { 
  UserSession, 
  CompanyTenant, 
  PhaseAScreen, 
  CandidateRecord, 
  JobRequisitionRecord, 
  DepartmentRecord, 
  SiteRecord, 
  CandidateStage,
  EmployeeRecord
} from '../../types';
import { FirestoreService } from '../../services/firestoreService';
import { useTheme } from '../../context/ThemeContext';
import { TalentAcquisitionService } from '../../services/talentAcquisitionService';
import { 
  Briefcase, 
  Users, 
  UserPlus, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  Search, 
  Filter, 
  Plus, 
  ChevronRight, 
  Star, 
  FileText, 
  Mail, 
  Phone, 
  Building2, 
  MapPin, 
  AlertCircle,
  TrendingUp,
  Award,
  XCircle,
  Eye,
  Edit2,
  Trash2,
  Download,
  Check
} from 'lucide-react';
import { collection, query, getDocs, doc, setDoc, updateDoc, deleteDoc, orderBy, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';

interface TalentAcquisitionScreenProps {
  userSession: UserSession;
  activeCompany: CompanyTenant | null;
  onNavigate?: (screen: PhaseAScreen) => void;
}

export const TalentAcquisitionScreen: React.FC<TalentAcquisitionScreenProps> = ({
  userSession,
  activeCompany,
  onNavigate
}) => {
  const { isDark } = useTheme();
  const companyId = activeCompany?.companyId || userSession.companyId;

  // Active view tab
  const [activeTab, setActiveTab] = useState<'REQUISITIONS' | 'CANDIDATES' | 'INTERVIEWS' | 'ONBOARDING'>('REQUISITIONS');
  
  // Data states
  const [requisitions, setRequisitions] = useState<JobRequisitionRecord[]>([]);
  const [candidates, setCandidates] = useState<CandidateRecord[]>([]);
  const [departments, setDepartments] = useState<DepartmentRecord[]>([]);
  const [sites, setSites] = useState<SiteRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDeptFilter, setSelectedDeptFilter] = useState('ALL');
  const [selectedStageFilter, setSelectedStageFilter] = useState<string>('ALL');

  // Modal states
  const [showReqModal, setShowReqModal] = useState(false);
  const [showCandidateModal, setShowCandidateModal] = useState(false);
  const [showInterviewModal, setShowInterviewModal] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<CandidateRecord | null>(null);
  const [selectedReq, setSelectedReq] = useState<JobRequisitionRecord | null>(null);

  // Form states
  const [reqForm, setReqForm] = useState({
    title: '',
    department: '',
    designation: '',
    siteId: '',
    openings: 1,
    minSalary: '',
    maxSalary: '',
    experienceRequired: '1-3 Years',
    status: 'OPEN',
    urgency: 'MEDIUM',
    jobDescription: '',
    skills: ''
  });

  const [candidateForm, setCandidateForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    requisitionId: '',
    experienceYears: 2,
    expectedSalary: '',
    currentLocation: '',
    stage: 'APPLIED' as CandidateStage,
    rating: 3,
    resumeUrl: '',
    skills: '',
    notes: ''
  });

  const [interviewForm, setInterviewForm] = useState({
    candidateId: '',
    requisitionId: '',
    interviewerName: userSession.fullName || 'Hiring Manager',
    interviewDate: new Date(Date.now() + 86400000).toISOString().slice(0, 16),
    mode: 'IN_PERSON',
    locationOrLink: 'HQ Interview Room A',
    notes: ''
  });

  const [statusMessage, setStatusMessage] = useState<{ type: 'SUCCESS' | 'ERROR'; text: string } | null>(null);

  // Load requisitions and candidates real-time
  useEffect(() => {
    if (!companyId) return;

    setLoading(true);

    // Load master data
    Promise.all([
      FirestoreService.getDepartments(companyId),
      FirestoreService.getSites(companyId)
    ]).then(([depts, siteList]) => {
      setDepartments(depts || []);
      setSites(siteList || []);
    }).catch(console.error);

    // Listen to job requisitions
    const reqCol = collection(db, 'companies', companyId, 'jobRequisitions');
    const reqUnsub = onSnapshot(reqCol, (snap) => {
      const list: JobRequisitionRecord[] = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setRequisitions(list);
    }, (err) => {
      console.error('Failed to load requisitions:', err);
    });

    // Listen to candidates
    const candCol = collection(db, 'companies', companyId, 'candidates');
    const candUnsub = onSnapshot(candCol, (snap) => {
      const list: CandidateRecord[] = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setCandidates(list);
      setLoading(false);
    }, (err) => {
      console.error('Failed to load candidates:', err);
      setLoading(false);
    });

    return () => {
      reqUnsub();
      candUnsub();
    };
  }, [companyId]);

  // Handle Save Requisition
  const handleSaveRequisition = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId) return;

    try {
      const reqId = selectedReq?.id || `REQ-${Date.now().toString(36).toUpperCase()}`;
      const payload: JobRequisitionRecord = {
        id: reqId,
        companyId,
        title: reqForm.title,
        department: reqForm.department,
        designation: reqForm.designation,
        siteId: reqForm.siteId,
        openings: Number(reqForm.openings) || 1,
        minSalary: reqForm.minSalary,
        maxSalary: reqForm.maxSalary,
        experienceRequired: reqForm.experienceRequired,
        status: reqForm.status,
        urgency: reqForm.urgency,
        jobDescription: reqForm.jobDescription,
        skills: reqForm.skills ? reqForm.skills.split(',').map(s => s.trim()) : [],
        createdAt: selectedReq?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: userSession.uid
      };

      await setDoc(doc(db, 'companies', companyId, 'jobRequisitions', reqId), payload);
      setStatusMessage({ type: 'SUCCESS', text: `Job Requisition "${reqForm.title}" saved successfully.` });
      setShowReqModal(false);
      setSelectedReq(null);
      setTimeout(() => setStatusMessage(null), 3500);
    } catch (err: any) {
      setStatusMessage({ type: 'ERROR', text: err.message || 'Failed to save requisition.' });
    }
  };

  // Handle Save Candidate
  const handleSaveCandidate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId) return;

    try {
      const candId = selectedCandidate?.id || `CAND-${Date.now().toString(36).toUpperCase()}`;
      const payload: CandidateRecord = {
        id: candId,
        companyId,
        fullName: candidateForm.fullName,
        email: candidateForm.email,
        phone: candidateForm.phone,
        requisitionId: candidateForm.requisitionId,
        experienceYears: Number(candidateForm.experienceYears) || 0,
        expectedSalary: candidateForm.expectedSalary,
        currentLocation: candidateForm.currentLocation,
        stage: candidateForm.stage,
        rating: Number(candidateForm.rating) || 3,
        resumeUrl: candidateForm.resumeUrl,
        skills: candidateForm.skills ? candidateForm.skills.split(',').map(s => s.trim()) : [],
        notes: candidateForm.notes,
        appliedDate: selectedCandidate?.appliedDate || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: 'ACTIVE'
      };

      await setDoc(doc(db, 'companies', companyId, 'candidates', candId), payload);
      setStatusMessage({ type: 'SUCCESS', text: `Candidate ${candidateForm.fullName} registered successfully.` });
      setShowCandidateModal(false);
      setSelectedCandidate(null);
      setTimeout(() => setStatusMessage(null), 3500);
    } catch (err: any) {
      setStatusMessage({ type: 'ERROR', text: err.message || 'Failed to save candidate.' });
    }
  };

  // Handle Update Candidate Stage
  const handleUpdateStage = async (candidateId: string, newStage: CandidateStage) => {
    if (!companyId) return;
    try {
      await updateDoc(doc(db, 'companies', companyId, 'candidates', candidateId), {
        stage: newStage,
        updatedAt: new Date().toISOString()
      });
      setStatusMessage({ type: 'SUCCESS', text: `Candidate stage updated to ${newStage}.` });
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err: any) {
      setStatusMessage({ type: 'ERROR', text: err.message || 'Failed to update stage.' });
    }
  };

  // Handle Convert Hired Candidate to Employee
  const handleConvertToEmployee = async (candidate: CandidateRecord) => {
    if (!companyId) return;
    try {
      setLoading(true);
      const employeeId = `EMP-${Date.now().toString(36).toUpperCase()}`;
      
      const res = await TalentAcquisitionService.convertCandidateToEmployeeAtomic(
        userSession,
        candidate.id,
        {
          id: employeeId,
          employeeId,
          firstName: candidate.fullName?.split(' ')[0] || 'New',
          lastName: candidate.fullName?.split(' ').slice(1).join(' ') || 'Employee',
          email: candidate.email,
          phone: candidate.phone,
          department: candidate.department || 'Operations',
          designation: candidate.designation || 'Staff',
          status: 'ACTIVE',
          joiningDate: new Date().toISOString().split('T')[0],
          employmentType: 'FULL_TIME',
          baseSalary: Number(candidate.expectedSalary) || 25000,
        }
      );

      if (!res.success) {
        throw new Error(res.error || 'Failed to convert candidate.');
      }

      setStatusMessage({ 
        type: 'SUCCESS', 
        text: `Candidate ${candidate.fullName} successfully onboarded as Employee #${employeeId}!` 
      });
      setTimeout(() => setStatusMessage(null), 4500);
    } catch (err: any) {
      console.error('[TalentAcquisitionScreen] Conversion error:', err);
      setStatusMessage({ type: 'ERROR', text: err.message || 'Failed to convert candidate.' });
    } finally {
      setLoading(false);
    }
  };

  // Metrics
  const openRequisitionsCount = requisitions.filter(r => r.status === 'OPEN').length;
  const totalCandidatesCount = candidates.length;
  const activeInterviewsCount = candidates.filter(c => c.stage === 'INTERVIEW' || c.stage === 'INTERVIEW_SCHEDULED').length;
  const hiredCount = candidates.filter(c => c.stage === 'HIRED' || c.stage === 'CONVERTED_TO_EMPLOYEE').length;

  // Filtered Candidates
  const filteredCandidates = candidates.filter(cand => {
    const matchesSearch = cand.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cand.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cand.phone?.includes(searchQuery);
    const matchesStage = selectedStageFilter === 'ALL' || cand.stage === selectedStageFilter;
    return matchesSearch && matchesStage;
  });

  return (
    <div className={`h-full flex flex-col ${isDark ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-900'}`}>
      {/* Top Header */}
      <div className={`p-6 border-b ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} flex flex-col md:flex-row md:items-center md:justify-between gap-4`}>
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-600/10 text-indigo-600 dark:text-indigo-400">
              <Briefcase className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight">Talent Acquisition & Recruitment</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                End-to-end job requisitions, candidate pipeline, interviewing, and one-click employee onboarding
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => {
              setSelectedReq(null);
              setReqForm({
                title: '',
                department: departments[0]?.name || 'Operations',
                designation: 'Security Officer',
                siteId: sites[0]?.id || '',
                openings: 2,
                minSalary: '20000',
                maxSalary: '30000',
                experienceRequired: '1-3 Years',
                status: 'OPEN',
                urgency: 'MEDIUM',
                jobDescription: '',
                skills: 'Security, First Aid, Vigilance'
              });
              setShowReqModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            Post Requisition
          </button>

          <button
            onClick={() => {
              setSelectedCandidate(null);
              setCandidateForm({
                fullName: '',
                email: '',
                phone: '',
                requisitionId: requisitions[0]?.id || '',
                experienceYears: 2,
                expectedSalary: '25000',
                currentLocation: 'Mumbai',
                stage: 'APPLIED',
                rating: 4,
                resumeUrl: '',
                skills: 'Customer Service, Surveillance',
                notes: ''
              });
              setShowCandidateModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold shadow-sm transition-all"
          >
            <UserPlus className="w-4 h-4" />
            Add Candidate
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="p-6 grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className={`p-4 rounded-2xl border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} shadow-sm`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Open Positions</span>
            <Briefcase className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400">{openRequisitionsCount}</span>
            <span className="text-xs text-slate-400">Requisitions active</span>
          </div>
        </div>

        <div className={`p-4 rounded-2xl border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} shadow-sm`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Candidate Pipeline</span>
            <Users className="w-4 h-4 text-blue-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-blue-600 dark:text-blue-400">{totalCandidatesCount}</span>
            <span className="text-xs text-slate-400">Total applicants</span>
          </div>
        </div>

        <div className={`p-4 rounded-2xl border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} shadow-sm`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Interviews</span>
            <Calendar className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-amber-600 dark:text-amber-400">{activeInterviewsCount}</span>
            <span className="text-xs text-slate-400">In evaluation</span>
          </div>
        </div>

        <div className={`p-4 rounded-2xl border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} shadow-sm`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Hired & Onboarded</span>
            <Award className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{hiredCount}</span>
            <span className="text-xs text-slate-400">Talent placed</span>
          </div>
        </div>
      </div>

      {/* Status banner */}
      {statusMessage && (
        <div className={`mx-6 mb-4 p-3 rounded-xl flex items-center gap-3 text-sm font-medium ${
          statusMessage.type === 'SUCCESS' 
            ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' 
            : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
        }`}>
          {statusMessage.type === 'SUCCESS' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          {statusMessage.text}
        </div>
      )}

      {/* Navigation Tabs */}
      <div className={`px-6 border-b ${isDark ? 'border-slate-800 bg-slate-900/50' : 'border-slate-200 bg-white'} flex items-center gap-6`}>
        <button
          onClick={() => setActiveTab('REQUISITIONS')}
          className={`py-3 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'REQUISITIONS'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Briefcase className="w-4 h-4" />
          Job Requisitions ({requisitions.length})
        </button>

        <button
          onClick={() => setActiveTab('CANDIDATES')}
          className={`py-3 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'CANDIDATES'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Users className="w-4 h-4" />
          Candidate Pipeline ({candidates.length})
        </button>

        <button
          onClick={() => setActiveTab('ONBOARDING')}
          className={`py-3 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'ONBOARDING'
              ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <UserPlus className="w-4 h-4" />
          1-Click Employee Onboarding
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 p-6 overflow-y-auto">
        {loading ? (
          <div className="h-48 flex items-center justify-center text-slate-400">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mr-3"></div>
            Loading Talent Pipeline...
          </div>
        ) : activeTab === 'REQUISITIONS' ? (
          /* Requisitions View */
          <div className="space-y-4">
            {requisitions.length === 0 ? (
              <div className={`p-12 text-center rounded-2xl border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                <Briefcase className="w-12 h-12 mx-auto text-slate-400 mb-3" />
                <h3 className="text-lg font-bold">No Active Job Requisitions</h3>
                <p className="text-sm text-slate-500 mt-1 mb-4">Create your first job requisition to start hiring workforce talent.</p>
                <button
                  onClick={() => setShowReqModal(true)}
                  className="px-4 py-2 bg-indigo-600 text-white font-semibold rounded-xl text-sm hover:bg-indigo-700"
                >
                  Post First Requisition
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {requisitions.map((req) => {
                  const applicantCount = candidates.filter(c => c.requisitionId === req.id).length;
                  return (
                    <div 
                      key={req.id}
                      className={`p-5 rounded-2xl border transition-all ${
                        isDark ? 'bg-slate-900 border-slate-800 hover:border-slate-700' : 'bg-white border-slate-200 hover:border-slate-300'
                      } shadow-sm flex flex-col justify-between`}
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-500 font-bold">
                              {req.id}
                            </span>
                            <h3 className="text-lg font-bold mt-1 text-slate-900 dark:text-white">{req.title}</h3>
                          </div>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            req.status === 'OPEN'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                              : 'bg-slate-500/10 text-slate-400 border-slate-500/30'
                          }`}>
                            {req.status}
                          </span>
                        </div>

                        <div className="mt-3 space-y-1.5 text-xs text-slate-500 dark:text-slate-400">
                          <div className="flex items-center gap-2">
                            <Building2 className="w-3.5 h-3.5 text-slate-400" />
                            <span>Dept: {req.department}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <MapPin className="w-3.5 h-3.5 text-slate-400" />
                            <span>Designation: {req.designation || 'General Staff'}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Users className="w-3.5 h-3.5 text-slate-400" />
                            <span>Open Positions: <strong>{req.openings}</strong></span>
                          </div>
                          {req.minSalary && (
                            <div className="flex items-center gap-2">
                              <TrendingUp className="w-3.5 h-3.5 text-slate-400" />
                              <span>Salary Range: ₹{req.minSalary} - ₹{req.maxSalary}</span>
                            </div>
                          )}
                        </div>

                        {req.skills && req.skills.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-1">
                            {req.skills.map((skill, sIdx) => (
                              <span key={sIdx} className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium">
                                {skill}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                        <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                          {applicantCount} Applicants
                        </span>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => {
                              setSelectedReq(req);
                              setReqForm({
                                title: req.title || '',
                                department: req.department || '',
                                designation: req.designation || '',
                                siteId: req.siteId || '',
                                openings: req.openings || 1,
                                minSalary: req.minSalary || '',
                                maxSalary: req.maxSalary || '',
                                experienceRequired: req.experienceRequired || '1-3 Years',
                                status: req.status || 'OPEN',
                                urgency: req.urgency || 'MEDIUM',
                                jobDescription: req.jobDescription || '',
                                skills: Array.isArray(req.skills) ? req.skills.join(', ') : ''
                              });
                              setShowReqModal(true);
                            }}
                            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
                            title="Edit Requisition"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              setActiveTab('CANDIDATES');
                              setSearchQuery(req.id);
                            }}
                            className="text-xs font-bold text-slate-700 dark:text-slate-200 hover:underline flex items-center gap-1"
                          >
                            View Pipeline <ChevronRight className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : activeTab === 'CANDIDATES' ? (
          /* Candidates View */
          <div className="space-y-4">
            {/* Search & Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search candidates by name, email, phone, or requisition ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`w-full pl-9 pr-4 py-2 rounded-xl text-sm border outline-none ${
                    isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
                  }`}
                />
              </div>

              <select
                value={selectedStageFilter}
                onChange={(e) => setSelectedStageFilter(e.target.value)}
                className={`px-3 py-2 rounded-xl text-sm border outline-none font-medium ${
                  isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
                }`}
              >
                <option value="ALL">All Stages</option>
                <option value="APPLIED">Applied</option>
                <option value="SCREENING">Screening</option>
                <option value="INTERVIEW">Interview</option>
                <option value="OFFER">Offer Made</option>
                <option value="HIRED">Hired</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>

            {/* Candidate Table */}
            <div className={`rounded-2xl border overflow-hidden ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className={`border-b text-xs uppercase font-bold text-slate-400 ${isDark ? 'bg-slate-950/50 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                    <tr>
                      <th className="py-3 px-4">Candidate</th>
                      <th className="py-3 px-4">Contact</th>
                      <th className="py-3 px-4">Applying For</th>
                      <th className="py-3 px-4">Exp & Salary</th>
                      <th className="py-3 px-4">Rating</th>
                      <th className="py-3 px-4">Current Stage</th>
                      <th className="py-3 px-4">Verification</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredCandidates.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-slate-400">
                          No candidates found matching filter criteria.
                        </td>
                      </tr>
                    ) : (
                      filteredCandidates.map((cand) => (
                        <tr key={cand.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-slate-900 dark:text-white">{cand.fullName}</div>
                            <span className="text-[10px] font-mono text-slate-400">{cand.id}</span>
                          </td>
                          <td className="py-3.5 px-4 text-xs space-y-0.5">
                            <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                              <Mail className="w-3 h-3 text-slate-400" />
                              <span>{cand.email || 'N/A'}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                              <Phone className="w-3 h-3 text-slate-400" />
                              <span>{cand.phone || 'N/A'}</span>
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="text-xs font-mono font-bold text-indigo-500 bg-indigo-500/10 px-2 py-0.5 rounded">
                              {cand.requisitionId || 'GENERAL'}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-xs">
                            <div className="font-medium text-slate-800 dark:text-slate-200">{cand.experienceYears || 0} yrs exp</div>
                            <div className="text-slate-400">Exp: ₹{cand.expectedSalary || 'Negotiable'}</div>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-0.5 text-amber-400">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star 
                                  key={star} 
                                  className={`w-3.5 h-3.5 ${star <= (cand.rating || 3) ? 'fill-amber-400' : 'text-slate-300 dark:text-slate-700'}`} 
                                />
                              ))}
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <select
                              value={cand.stage || 'APPLIED'}
                              onChange={(e) => handleUpdateStage(cand.id, e.target.value as CandidateStage)}
                              className={`text-xs font-bold px-2 py-1 rounded-lg border outline-none ${
                                cand.stage === 'HIRED' || cand.stage === 'CONVERTED_TO_EMPLOYEE'
                                  ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30'
                                  : cand.stage === 'REJECTED'
                                  ? 'bg-rose-500/10 text-rose-500 border-rose-500/30'
                                  : cand.stage === 'INTERVIEW'
                                  ? 'bg-amber-500/10 text-amber-500 border-amber-500/30'
                                  : 'bg-indigo-500/10 text-indigo-500 border-indigo-500/30'
                              }`}
                            >
                              <option value="APPLIED">Applied</option>
                              <option value="SCREENING">Screening</option>
                              <option value="INTERVIEW">Interview</option>
                              <option value="OFFER">Offer</option>
                              <option value="HIRED">Hired</option>
                              <option value="REJECTED">Rejected</option>
                            </select>
                          </td>
                          <td className="py-3.5 px-4 text-xs">
                            <div className="flex flex-col gap-1">
                              <span className={`px-1.5 py-0.5 rounded-md border ${
                                cand.aadhaarVerificationStatus === 'VERIFIED' 
                                  ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' 
                                  : 'bg-slate-500/10 text-slate-500 border-slate-500/20'
                              }`}>
                                ID: {cand.aadhaarVerificationStatus || 'PENDING'}
                              </span>
                              <span className={`px-1.5 py-0.5 rounded-md border ${
                                cand.policeVerificationStatus === 'VERIFIED' 
                                  ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' 
                                  : 'bg-slate-500/10 text-slate-500 border-slate-500/20'
                              }`}>
                                Pol: {cand.policeVerificationStatus || 'PENDING'}
                              </span>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            {cand.stage === 'HIRED' && (
                              <button
                                onClick={() => handleConvertToEmployee(cand)}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-sm transition-all"
                              >
                                Onboard as Staff
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          /* 1-Click Onboarding View */
          <div className="space-y-4">
            <div className={`p-5 rounded-2xl border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
              <h2 className="text-lg font-bold flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                Hired Candidates Ready for Instant Onboarding
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Convert selected candidates directly into active workforce employee records in Firestore without re-entering data.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {candidates.filter(c => c.stage === 'HIRED').map(cand => (
                <div 
                  key={cand.id} 
                  className={`p-5 rounded-2xl border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} shadow-sm flex flex-col justify-between`}
                >
                  <div>
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-base font-bold text-slate-900 dark:text-white">{cand.fullName}</h3>
                        <p className="text-xs text-slate-400">{cand.email} • {cand.phone}</p>
                      </div>
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                        HIRED
                      </span>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-2 text-xs bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl">
                      <div>
                        <span className="text-slate-400">Requisition:</span>
                        <p className="font-bold text-slate-800 dark:text-slate-200">{cand.requisitionId || 'GENERAL'}</p>
                      </div>
                      <div>
                        <span className="text-slate-400">Salary Agreement:</span>
                        <p className="font-bold text-emerald-600 dark:text-emerald-400">₹{cand.expectedSalary || '25,000'}/mo</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                    <button
                      onClick={() => handleConvertToEmployee(cand)}
                      className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md transition-all"
                    >
                      <UserPlus className="w-4 h-4" />
                      Create Employee Record
                    </button>
                  </div>
                </div>
              ))}

              {candidates.filter(c => c.stage === 'HIRED').length === 0 && (
                <div className="col-span-2 p-12 text-center text-slate-400">
                  <Check className="w-10 h-10 mx-auto text-emerald-500/40 mb-2" />
                  <p className="font-medium">No candidates currently in "HIRED" status waiting for onboarding.</p>
                  <p className="text-xs mt-1">Move candidates to "HIRED" in the pipeline to enable 1-click onboarding.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modal: Create/Edit Requisition */}
      {showReqModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className={`w-full max-w-xl rounded-2xl border p-6 shadow-2xl ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-indigo-500" />
              {selectedReq ? 'Edit Job Requisition' : 'Post New Job Requisition'}
            </h2>

            <form onSubmit={handleSaveRequisition} className="space-y-3.5">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase">Job Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Senior Security Supervisor"
                  value={reqForm.title}
                  onChange={(e) => setReqForm({ ...reqForm, title: e.target.value })}
                  className={`w-full mt-1 p-2.5 rounded-xl border text-sm outline-none ${isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase">Department</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Operations"
                    value={reqForm.department}
                    onChange={(e) => setReqForm({ ...reqForm, department: e.target.value })}
                    className={`w-full mt-1 p-2.5 rounded-xl border text-sm outline-none ${isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase">Open Positions</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={reqForm.openings}
                    onChange={(e) => setReqForm({ ...reqForm, openings: parseInt(e.target.value) || 1 })}
                    className={`w-full mt-1 p-2.5 rounded-xl border text-sm outline-none ${isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase">Min Salary (₹)</label>
                  <input
                    type="text"
                    placeholder="20000"
                    value={reqForm.minSalary}
                    onChange={(e) => setReqForm({ ...reqForm, minSalary: e.target.value })}
                    className={`w-full mt-1 p-2.5 rounded-xl border text-sm outline-none ${isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase">Max Salary (₹)</label>
                  <input
                    type="text"
                    placeholder="35000"
                    value={reqForm.maxSalary}
                    onChange={(e) => setReqForm({ ...reqForm, maxSalary: e.target.value })}
                    className={`w-full mt-1 p-2.5 rounded-xl border text-sm outline-none ${isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase">Required Skills (comma separated)</label>
                <input
                  type="text"
                  placeholder="Security, Fire Safety, First Aid, Guard Monitoring"
                  value={reqForm.skills}
                  onChange={(e) => setReqForm({ ...reqForm, skills: e.target.value })}
                  className={`w-full mt-1 p-2.5 rounded-xl border text-sm outline-none ${isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                />
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowReqModal(false)}
                  className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-sm shadow-md"
                >
                  Save Requisition
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Create Candidate */}
      {showCandidateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className={`w-full max-w-xl rounded-2xl border p-6 shadow-2xl ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-emerald-500" />
              Add Candidate to Pipeline
            </h2>

            <form onSubmit={handleSaveCandidate} className="space-y-3.5">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Anand Jadhav"
                  value={candidateForm.fullName}
                  onChange={(e) => setCandidateForm({ ...candidateForm, fullName: e.target.value })}
                  className={`w-full mt-1 p-2.5 rounded-xl border text-sm outline-none ${isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase">Email</label>
                  <input
                    type="email"
                    required
                    placeholder="candidate@example.com"
                    value={candidateForm.email}
                    onChange={(e) => setCandidateForm({ ...candidateForm, email: e.target.value })}
                    className={`w-full mt-1 p-2.5 rounded-xl border text-sm outline-none ${isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase">Phone</label>
                  <input
                    type="tel"
                    required
                    placeholder="+91 9876543210"
                    value={candidateForm.phone}
                    onChange={(e) => setCandidateForm({ ...candidateForm, phone: e.target.value })}
                    className={`w-full mt-1 p-2.5 rounded-xl border text-sm outline-none ${isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase">Target Requisition</label>
                  <select
                    value={candidateForm.requisitionId}
                    onChange={(e) => setCandidateForm({ ...candidateForm, requisitionId: e.target.value })}
                    className={`w-full mt-1 p-2.5 rounded-xl border text-sm outline-none font-medium ${isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                  >
                    <option value="">General Applicant</option>
                    {requisitions.map(r => (
                      <option key={r.id} value={r.id}>{r.title} ({r.id})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase">Experience (Years)</label>
                  <input
                    type="number"
                    min="0"
                    value={candidateForm.experienceYears}
                    onChange={(e) => setCandidateForm({ ...candidateForm, experienceYears: parseFloat(e.target.value) || 0 })}
                    className={`w-full mt-1 p-2.5 rounded-xl border text-sm outline-none ${isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCandidateModal(false)}
                  className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-sm shadow-md"
                >
                  Add Candidate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
