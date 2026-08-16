import React, { useState, useEffect } from 'react';
import { 
  UserSession, 
  CompanyTenant, 
  TrainingProgramRecord, 
  TrainingEnrollmentRecord,
  EmployeeRecord,
  TrainingCategory,
  PhaseAScreen
} from '../../types';
import { FirestoreService } from '../../services/firestoreService';
import { useTheme } from '../../context/ThemeContext';
import { 
  GraduationCap, 
  Award, 
  Plus, 
  Search, 
  CheckCircle, 
  Clock, 
  Sparkles, 
  X, 
  RefreshCw, 
  ShieldCheck
} from 'lucide-react';

interface TrainingLmsScreenProps {
  userSession: UserSession | null;
  activeCompany: CompanyTenant | null;
  onNavigate?: (screen: PhaseAScreen) => void;
}

export const TrainingLmsScreen: React.FC<TrainingLmsScreenProps> = ({
  userSession,
  activeCompany,
  onNavigate
}) => {
  const { isDark } = useTheme();
  const [activeTab, setActiveTab] = useState<'ENROLLMENTS' | 'PROGRAMS'>('ENROLLMENTS');
  const [programs, setPrograms] = useState<TrainingProgramRecord[]>([]);
  const [enrollments, setEnrollments] = useState<TrainingEnrollmentRecord[]>([]);
  const [employees, setEmployees] = useState<EmployeeRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Modals
  const [isEnrollModalOpen, setIsEnrollModalOpen] = useState<boolean>(false);
  const [isProgramModalOpen, setIsProgramModalOpen] = useState<boolean>(false);
  const [selectedEnrollment, setSelectedEnrollment] = useState<TrainingEnrollmentRecord | null>(null);

  // Program Form
  const [progFormData, setProgFormData] = useState({
    title: '',
    programCode: '',
    category: 'PSARA_COMPLIANCE' as TrainingCategory,
    durationHours: 8,
    isMandatoryForPSARA: true,
    validityMonths: 12,
    passScorePercentage: 70,
    description: 'Standard facility security & emergency protocols',
    trainerName: 'Senior Training Officer',
    location: 'Central Training Academy'
  });

  // Enrollment Form
  const [enrollFormData, setEnrollFormData] = useState({
    programId: '',
    employeeId: '',
    trainerName: 'Senior Training Officer',
    scheduledDate: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    if (!activeCompany) return;

    setLoading(true);
    const unsubProgs = FirestoreService.subscribeToTrainingPrograms(activeCompany.companyId, (progList) => {
      setPrograms(progList);
      if (progList.length > 0 && !enrollFormData.programId) {
        setEnrollFormData(prev => ({ ...prev, programId: progList[0].id }));
      }
    });

    const unsubEnroll = FirestoreService.subscribeToTrainingEnrollments(activeCompany.companyId, (enrList) => {
      setEnrollments(enrList);
      setLoading(false);
    });

    let unsubEmps = () => {};
    if (userSession) {
      unsubEmps = FirestoreService.subscribeToEmployees(userSession, activeCompany.companyId, (empList) => {
        setEmployees(empList);
        if (empList.length > 0 && !enrollFormData.employeeId) {
          setEnrollFormData(prev => ({ ...prev, employeeId: empList[0].id }));
        }
      });
    }

    return () => {
      unsubProgs();
      unsubEnroll();
      unsubEmps();
    };
  }, [activeCompany?.companyId, userSession?.userId]);

  const handleCreateProgram = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCompany || !progFormData.title.trim()) return;

    try {
      const progId = `TRN-PROG-${Date.now().toString().slice(-6)}`;
      const newProg: TrainingProgramRecord = {
        id: progId,
        programCode: progFormData.programCode || `TRN-${Date.now().toString().slice(-4)}`,
        companyId: activeCompany.companyId,
        title: progFormData.title.trim(),
        description: progFormData.description,
        category: progFormData.category,
        durationHours: Number(progFormData.durationHours),
        isMandatoryForPSARA: progFormData.isMandatoryForPSARA,
        validityMonths: Number(progFormData.validityMonths),
        passScorePercentage: Number(progFormData.passScorePercentage),
        trainerName: progFormData.trainerName,
        location: progFormData.location,
        status: 'ACTIVE',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await FirestoreService.saveTrainingProgram(activeCompany.companyId, newProg);
      setIsProgramModalOpen(false);
      setProgFormData({
        title: '',
        programCode: '',
        category: 'PSARA_COMPLIANCE',
        durationHours: 8,
        isMandatoryForPSARA: true,
        validityMonths: 12,
        passScorePercentage: 70,
        description: 'Standard facility security & emergency protocols',
        trainerName: 'Senior Training Officer',
        location: 'Central Training Academy'
      });
    } catch (err) {
      console.error('Error saving program:', err);
    }
  };

  const handleCreateEnrollment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCompany) return;

    try {
      const selectedEmp = employees.find(emp => emp.id === enrollFormData.employeeId);
      const selectedProg = programs.find(p => p.id === enrollFormData.programId);
      const empFullName = selectedEmp ? `${selectedEmp.firstName} ${selectedEmp.lastName}` : 'Staff';

      const enrollId = `ENR-${Date.now().toString().slice(-6)}`;
      const newEnrollment: TrainingEnrollmentRecord = {
        id: enrollId,
        companyId: activeCompany.companyId,
        programId: enrollFormData.programId || selectedProg?.id || 'PROG-01',
        programTitle: selectedProg?.title || 'Security Basics',
        employeeId: enrollFormData.employeeId || selectedEmp?.id || 'EMP-01',
        employeeName: empFullName,
        siteId: selectedEmp?.assignedSiteId || 'SITE-001',
        enrollmentDate: new Date().toISOString().split('T')[0],
        scheduledDate: enrollFormData.scheduledDate,
        attendanceStatus: 'SCHEDULED',
        resultStatus: 'ENROLLED',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await FirestoreService.saveTrainingEnrollment(activeCompany.companyId, newEnrollment);
      setIsEnrollModalOpen(false);
    } catch (err) {
      console.error('Error creating enrollment:', err);
    }
  };

  const handleCompleteAndCertify = async (enrollment: TrainingEnrollmentRecord, score: number) => {
    if (!activeCompany) return;

    try {
      const selectedProg = programs.find(p => p.id === enrollment.programId);
      const validityMonths = selectedProg?.validityMonths || 12;
      const certExpiry = new Date(Date.now() + validityMonths * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const certNum = `CERT-PSARA-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`;

      const isPassed = score >= (selectedProg?.passScorePercentage || 70);

      const updated: TrainingEnrollmentRecord = {
        ...enrollment,
        resultStatus: isPassed ? 'PASSED' : 'FAILED',
        attendanceStatus: 'PRESENT',
        scoreObtained: score,
        certificateId: isPassed ? `CERT-${Date.now().toString().slice(-6)}` : undefined,
        certificateNumber: isPassed ? certNum : undefined,
        certificateIssuedDate: isPassed ? new Date().toISOString().split('T')[0] : undefined,
        certificateExpiryDate: isPassed ? certExpiry : undefined,
        evaluatedByUserId: userSession?.userId,
        updatedAt: new Date().toISOString()
      };

      await FirestoreService.saveTrainingEnrollment(activeCompany.companyId, updated);
      setSelectedEnrollment(updated);
    } catch (err) {
      console.error('Error certifying enrollment:', err);
    }
  };

  const filteredEnrollments = enrollments.filter(e => {
    const matchesSearch = 
      e.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.programTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (e.certificateNumber && e.certificateNumber.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus = statusFilter === 'ALL' || e.resultStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className={`p-4 md:p-6 space-y-6 min-h-screen ${isDark ? 'bg-slate-900 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-purple-600/10 text-purple-600 dark:text-purple-400 rounded-xl">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Learning & Compliance (LMS)</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Module 13: PSARA Security Certification, Safety Trainings & Competency Verification
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => activeTab === 'ENROLLMENTS' ? setIsEnrollModalOpen(true) : setIsProgramModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-medium shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            <span>{activeTab === 'ENROLLMENTS' ? 'Enroll Employee' : 'New Program'}</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-800/60 border-slate-700' : 'bg-white border-slate-200'}`}>
          <span className="text-xs font-semibold text-slate-500 uppercase">Training Modules</span>
          <p className="text-2xl font-bold mt-1">{programs.length}</p>
          <span className="text-xs text-slate-500">PSARA & safety curriculum</span>
        </div>
        <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-800/60 border-slate-700' : 'bg-white border-slate-200'}`}>
          <span className="text-xs font-semibold text-slate-500 uppercase">Active Enrolled</span>
          <p className="text-2xl font-bold mt-1 text-purple-600 dark:text-purple-400">
            {enrollments.filter(e => e.resultStatus === 'ENROLLED' || e.resultStatus === 'IN_PROGRESS').length}
          </p>
          <span className="text-xs text-slate-500">In training progress</span>
        </div>
        <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-800/60 border-slate-700' : 'bg-white border-slate-200'}`}>
          <span className="text-xs font-semibold text-slate-500 uppercase">Certified Guards</span>
          <p className="text-2xl font-bold mt-1 text-emerald-600 dark:text-emerald-400">
            {enrollments.filter(e => e.resultStatus === 'PASSED').length}
          </p>
          <span className="text-xs text-slate-500">Valid certifications</span>
        </div>
        <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-800/60 border-slate-700' : 'bg-white border-slate-200'}`}>
          <span className="text-xs font-semibold text-slate-500 uppercase">Compliance Pass Rate</span>
          <p className="text-2xl font-bold mt-1 text-indigo-600 dark:text-indigo-400">
            {enrollments.length > 0 ? Math.round((enrollments.filter(e => e.resultStatus === 'PASSED').length / enrollments.length) * 100) : 100}%
          </p>
          <span className="text-xs text-slate-500">First-attempt pass</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setActiveTab('ENROLLMENTS')}
          className={`px-5 py-3 text-sm font-bold border-b-2 transition ${
            activeTab === 'ENROLLMENTS'
              ? 'border-purple-600 text-purple-600 dark:text-purple-400'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Guard Certifications & Enrollments ({enrollments.length})
        </button>
        <button
          onClick={() => setActiveTab('PROGRAMS')}
          className={`px-5 py-3 text-sm font-bold border-b-2 transition ${
            activeTab === 'PROGRAMS'
              ? 'border-purple-600 text-purple-600 dark:text-purple-400'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Course Catalog & Compliance Requirements ({programs.length})
        </button>
      </div>

      {/* Tab 1: Enrollments */}
      {activeTab === 'ENROLLMENTS' && (
        <div className="space-y-4">
          <div className={`p-4 rounded-xl border flex flex-col md:flex-row items-center gap-3 justify-between ${
            isDark ? 'bg-slate-800/40 border-slate-700' : 'bg-white border-slate-200'
          }`}>
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Search staff, course, cert #..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full pl-9 pr-4 py-2 rounded-lg text-sm border focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                  isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                }`}
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={`px-3 py-2 rounded-lg text-sm border focus:outline-none ${
                isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
              }`}
            >
              <option value="ALL">All Statuses</option>
              <option value="ENROLLED">Enrolled</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="PASSED">Passed & Certified</option>
              <option value="FAILED">Failed</option>
            </select>
          </div>

          <div className={`rounded-xl border overflow-hidden ${isDark ? 'bg-slate-800/40 border-slate-700' : 'bg-white border-slate-200'}`}>
            {loading ? (
              <div className="p-12 text-center text-slate-500">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-purple-600" />
                <p>Loading certification records...</p>
              </div>
            ) : filteredEnrollments.length === 0 ? (
              <div className="p-12 text-center text-slate-500">
                <Award className="w-12 h-12 mx-auto mb-3 opacity-40" />
                <h3 className="font-bold text-base text-slate-700 dark:text-slate-300">No Enrollments Found</h3>
                <p className="text-sm mt-1">Enroll an employee into a compliance training module.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className={`border-b text-xs uppercase font-semibold ${
                    isDark ? 'bg-slate-800/80 border-slate-700 text-slate-400' : 'bg-slate-100/70 border-slate-200 text-slate-600'
                  }`}>
                    <tr>
                      <th className="p-3.5">Employee</th>
                      <th className="p-3.5">Training Program</th>
                      <th className="p-3.5">Schedule / Completed</th>
                      <th className="p-3.5">Score & Cert #</th>
                      <th className="p-3.5">Result</th>
                      <th className="p-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                    {filteredEnrollments.map((enr) => (
                      <tr
                        key={enr.id}
                        onClick={() => setSelectedEnrollment(enr)}
                        className={`cursor-pointer transition ${
                          isDark ? 'hover:bg-slate-800/60' : 'hover:bg-slate-50'
                        }`}
                      >
                        <td className="p-3.5">
                          <div className="font-bold text-slate-900 dark:text-slate-100">{enr.employeeName}</div>
                          <div className="text-xs text-slate-500">{enr.employeeId}</div>
                        </td>
                        <td className="p-3.5">
                          <div className="font-medium text-slate-800 dark:text-slate-200">{enr.programTitle}</div>
                          <div className="text-xs text-slate-500">Status: {enr.attendanceStatus}</div>
                        </td>
                        <td className="p-3.5 text-xs text-slate-600 dark:text-slate-300">
                          <div>Scheduled: {new Date(enr.scheduledDate).toLocaleDateString()}</div>
                          {enr.certificateIssuedDate && (
                            <div className="text-emerald-600 font-semibold">Done: {new Date(enr.certificateIssuedDate).toLocaleDateString()}</div>
                          )}
                        </td>
                        <td className="p-3.5">
                          {enr.certificateNumber ? (
                            <div>
                              <span className="font-mono text-xs font-bold text-purple-600 dark:text-purple-400 block">{enr.certificateNumber}</span>
                              <span className="text-[11px] text-slate-500">Score: {enr.scoreObtained}%</span>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400">Pending Exam</span>
                          )}
                        </td>
                        <td className="p-3.5">
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                            enr.resultStatus === 'PASSED'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                              : enr.resultStatus === 'FAILED'
                              ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                              : 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300'
                          }`}>
                            {enr.resultStatus}
                          </span>
                        </td>
                        <td className="p-3.5 text-right">
                          {enr.resultStatus !== 'PASSED' ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCompleteAndCertify(enr, 88);
                              }}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm transition flex items-center gap-1 ml-auto"
                            >
                              <Award className="w-3.5 h-3.5" />
                              <span>Pass & Certify</span>
                            </button>
                          ) : (
                            <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1 justify-end">
                              <CheckCircle className="w-3.5 h-3.5" /> Certified
                            </span>
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

      {/* Tab 2: Training Program Catalog */}
      {activeTab === 'PROGRAMS' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {programs.map((prog) => (
            <div
              key={prog.id}
              className={`p-5 rounded-2xl border flex flex-col justify-between ${
                isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-200'
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-purple-600">{prog.programCode}</span>
                  {prog.isMandatoryForPSARA && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                      PSARA MANDATORY
                    </span>
                  )}
                </div>

                <h3 className="text-lg font-bold mt-2 text-slate-900 dark:text-slate-100">{prog.title}</h3>
                
                <div className="space-y-1.5 text-xs text-slate-500 mt-3">
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>Duration: {prog.durationHours} Hours</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
                    <span>Validity: {prog.validityMonths} Months</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Award className="w-3.5 h-3.5 text-slate-400" />
                    <span>Passing Criteria: {prog.passScorePercentage}% Minimum</span>
                  </div>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-400 mt-3">
                  {prog.description}
                </p>
              </div>

              <div className="pt-4 mt-4 border-t border-slate-200 dark:border-slate-700 flex justify-end">
                <button
                  onClick={() => {
                    setEnrollFormData(prev => ({ ...prev, programId: prog.id }));
                    setIsEnrollModalOpen(true);
                  }}
                  className="px-3.5 py-1.5 bg-purple-50 dark:bg-purple-950/50 hover:bg-purple-100 text-purple-600 dark:text-purple-300 rounded-lg text-xs font-semibold transition"
                >
                  + Enroll Guards
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Enroll Modal */}
      {isEnrollModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className={`w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden border ${
            isDark ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className={`p-4 border-b flex items-center justify-between ${isDark ? 'border-slate-800 bg-slate-850' : 'border-slate-200 bg-slate-50'}`}>
              <h3 className="font-bold text-lg">Enroll Employee in Training</h3>
              <button onClick={() => setIsEnrollModalOpen(false)} className="p-1.5 hover:bg-slate-200 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateEnrollment} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1 text-slate-600 dark:text-slate-400">Select Training Program *</label>
                <select
                  value={enrollFormData.programId}
                  onChange={(e) => setEnrollFormData(prev => ({ ...prev, programId: e.target.value }))}
                  className={`w-full px-3.5 py-2 text-sm rounded-xl border focus:outline-none ${
                    isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                >
                  {programs.map(p => (
                    <option key={p.id} value={p.id}>{p.title} ({p.durationHours}h)</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1 text-slate-600 dark:text-slate-400">Select Employee / Guard *</label>
                <select
                  value={enrollFormData.employeeId}
                  onChange={(e) => setEnrollFormData(prev => ({ ...prev, employeeId: e.target.value }))}
                  className={`w-full px-3.5 py-2 text-sm rounded-xl border focus:outline-none ${
                    isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                >
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName} ({emp.employeeId || emp.id})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1 text-slate-600 dark:text-slate-400">Scheduled Date *</label>
                  <input
                    type="date"
                    required
                    value={enrollFormData.scheduledDate}
                    onChange={(e) => setEnrollFormData(prev => ({ ...prev, scheduledDate: e.target.value }))}
                    className={`w-full px-3 py-2 text-sm rounded-xl border focus:outline-none ${
                      isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1 text-slate-600 dark:text-slate-400">Trainer / Officer</label>
                  <input
                    type="text"
                    value={enrollFormData.trainerName}
                    onChange={(e) => setEnrollFormData(prev => ({ ...prev, trainerName: e.target.value }))}
                    className={`w-full px-3 py-2 text-sm rounded-xl border focus:outline-none ${
                      isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEnrollModalOpen(false)}
                  className="px-4 py-2 text-sm font-semibold rounded-xl text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm font-semibold rounded-xl bg-purple-600 hover:bg-purple-700 text-white shadow-sm"
                >
                  Confirm Enrollment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Program Create Modal */}
      {isProgramModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className={`w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden border ${
            isDark ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className={`p-4 border-b flex items-center justify-between ${isDark ? 'border-slate-800 bg-slate-850' : 'border-slate-200 bg-slate-50'}`}>
              <h3 className="font-bold text-lg">Create Training Curriculum</h3>
              <button onClick={() => setIsProgramModalOpen(false)} className="p-1.5 hover:bg-slate-200 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateProgram} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1 text-slate-600 dark:text-slate-400">Course Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Fire Fighting & Emergency Evacuation"
                  value={progFormData.title}
                  onChange={(e) => setProgFormData(prev => ({ ...prev, title: e.target.value }))}
                  className={`w-full px-3.5 py-2 text-sm rounded-xl border focus:outline-none ${
                    isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1 text-slate-600 dark:text-slate-400">Duration (Hours)</label>
                  <input
                    type="number"
                    value={progFormData.durationHours}
                    onChange={(e) => setProgFormData(prev => ({ ...prev, durationHours: Number(e.target.value) }))}
                    className={`w-full px-3 py-2 text-sm rounded-xl border focus:outline-none ${
                      isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1 text-slate-600 dark:text-slate-400">Cert Validity (Months)</label>
                  <input
                    type="number"
                    value={progFormData.validityMonths}
                    onChange={(e) => setProgFormData(prev => ({ ...prev, validityMonths: Number(e.target.value) }))}
                    className={`w-full px-3 py-2 text-sm rounded-xl border focus:outline-none ${
                      isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={progFormData.isMandatoryForPSARA}
                  onChange={(e) => setProgFormData(prev => ({ ...prev, isMandatoryForPSARA: e.target.checked }))}
                  className="rounded text-purple-600"
                />
                <span>Mandatory under Private Security Agencies Regulation Act (PSARA)</span>
              </label>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsProgramModalOpen(false)}
                  className="px-4 py-2 text-sm font-semibold rounded-xl text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm font-semibold rounded-xl bg-purple-600 hover:bg-purple-700 text-white shadow-sm"
                >
                  Save Course
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
