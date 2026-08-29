import React, { useState, useEffect } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { PhaseAScreen, UserSession, CompanyTenant } from '../../types';
import { 
  TrainingProgramRecord, 
  TrainingEnrollmentRecord,
  TrainingSessionRecord,
  EmployeeRecord,
  TrainingCategory
} from '../../types';
import { LearningManagementService } from '../../services/learningManagementService';
import { Search, Plus, Filter, FileText, CheckCircle, XCircle, Clock, Calendar, Users, ShieldAlert, FileBadge2 } from 'lucide-react';
import { collection, query, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import { useFeedback } from '../../context/ActionFeedbackContext';

export const TrainingLmsScreen: React.FC<{
  userSession: UserSession;
  activeCompany: CompanyTenant | null;
  onNavigate: React.Dispatch<React.SetStateAction<PhaseAScreen>>;
}> = ({ userSession, activeCompany, onNavigate }) => {
  const { isDark } = useTheme();
  const { showSuccess, showError, showLoading, showCancelled, showValidationFailed, handleError } = useFeedback();
  const [activeTab, setActiveTab] = useState<'PROGRAMS' | 'SESSIONS' | 'ENROLLMENTS'>('PROGRAMS');
  
  const [programs, setPrograms] = useState<TrainingProgramRecord[]>([]);
  const [sessions, setSessions] = useState<TrainingSessionRecord[]>([]);
  const [enrollments, setEnrollments] = useState<TrainingEnrollmentRecord[]>([]);
  const [employees, setEmployees] = useState<EmployeeRecord[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [isProgramModalOpen, setIsProgramModalOpen] = useState(false);
  const [isSessionModalOpen, setIsSessionModalOpen] = useState(false);
  const [isBulkEnrollModalOpen, setIsBulkEnrollModalOpen] = useState(false);
  const [isAssessmentModalOpen, setIsAssessmentModalOpen] = useState(false);

  // Form states
  const [progFormData, setProgFormData] = useState<Partial<TrainingProgramRecord>>({
    title: '', description: '', category: 'PSARA_COMPLIANCE', durationHours: 4, validityMonths: 12, isMandatoryForPSARA: true, passScorePercentage: 70
  });

  const [sessionFormData, setSessionFormData] = useState<Partial<TrainingSessionRecord>>({
    programId: '', trainerName: '', scheduledDate: new Date().toISOString().split('T')[0], startTime: '09:00', endTime: '13:00', location: 'HQ', maxParticipants: 30
  });

  const [bulkEnrollData, setBulkEnrollData] = useState<{sessionId: string; employeeIds: string[]}>({ sessionId: '', employeeIds: [] });
  
  const [assessmentData, setAssessmentData] = useState<{enrollment: TrainingEnrollmentRecord | null, attendance: 'PRESENT'|'ABSENT', score: number, certFile: File | null}>({
    enrollment: null, attendance: 'PRESENT', score: 0, certFile: null
  });

  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);
  const [verifyCertId, setVerifyCertId] = useState('');
  const [verifyResult, setVerifyResult] = useState<any>(null);
  const [selectedCertEnrollment, setSelectedCertEnrollment] = useState<TrainingEnrollmentRecord | null>(null);

  const handleVerifyCertificate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCompany || !verifyCertId.trim()) return;
    const dismiss = showLoading('Verifying certificate signature & status...');
    try {
      const res = await LearningManagementService.verifyCertificate(activeCompany.companyId, verifyCertId.trim());
      dismiss();
      setVerifyResult(res);
      if (res.isValid) {
        showSuccess('✓ Certificate is VALID and verified.');
      } else {
        showError(`Certificate Status: ${res.status} - ${res.error || 'Invalid'}`);
      }
    } catch (err: any) {
      dismiss();
      handleError(err, 'Verification failed');
    }
  };

  const handleUpdateRisk = async (enrollmentId: string, status: 'VERIFIED' | 'REVIEW_REQUIRED' | 'SUSPICIOUS' | 'INVALIDATED', reason: string) => {
    if (!activeCompany || !userSession) return;
    const dismiss = showLoading(`Updating anti-cheat risk status to ${status}...`);
    try {
      const res = await LearningManagementService.updateAntiCheatRiskStatus(userSession, enrollmentId, status, reason);
      dismiss();
      if (res.success) {
        showSuccess(`✓ Risk status updated to ${status}`);
        loadData();
      } else {
        showError(res.error || 'Failed to update risk status');
      }
    } catch (err: any) {
      dismiss();
      handleError(err, 'Failed to update risk');
    }
  };

  const loadData = async () => {
    if (!activeCompany) return;
    setLoading(true);
    try {
      const p = await LearningManagementService.getPrograms(activeCompany.companyId);
      setPrograms(p);
      const s = await LearningManagementService.getSessions(activeCompany.companyId);
      setSessions(s);
      const e = await LearningManagementService.getEnrollments(activeCompany.companyId);
      setEnrollments(e);

      const empQ = query(collection(db, 'companies', activeCompany.companyId, 'employees'));
      const empSnap = await getDocs(empQ);
      setEmployees(empSnap.docs.map(d => d.data() as EmployeeRecord));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeCompany]);

  const handleCreateProgram = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCompany || !userSession) return;
    if (!progFormData.title?.trim()) {
      showValidationFailed('Please enter a program title.');
      return;
    }
    
    const dismiss = showLoading('Creating training program...');
    try {
      const res = await LearningManagementService.createProgram(userSession, progFormData);
      dismiss();
      if (res.success) {
        setIsProgramModalOpen(false);
        showSuccess(`✓ Training Program "${progFormData.title}" created successfully!`);
        loadData();
      } else {
        showError(res.error || 'Failed to create training program');
      }
    } catch (err: any) {
      dismiss();
      handleError(err, '✕ Program Creation Failed');
    }
  };

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCompany || !userSession) return;
    if (!sessionFormData.programId) {
      showValidationFailed('Please select a training program.');
      return;
    }
    
    const dismiss = showLoading('Scheduling training session...');
    try {
      const res = await LearningManagementService.createSession(userSession, sessionFormData);
      dismiss();
      if (res.success) {
        setIsSessionModalOpen(false);
        showSuccess('✓ Training session scheduled successfully!');
        loadData();
      } else {
        showError(res.error || 'Failed to schedule session');
      }
    } catch (err: any) {
      dismiss();
      handleError(err, '✕ Session Scheduling Failed');
    }
  };

  const handleBulkEnroll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCompany || !userSession) return;
    
    if (bulkEnrollData.employeeIds.length === 0) {
       showValidationFailed("Select at least one employee.");
       return;
    }

    const dismiss = showLoading(`Enrolling ${bulkEnrollData.employeeIds.length} employees in session...`);
    try {
      const res = await LearningManagementService.bulkEnrollEmployees(userSession, bulkEnrollData.sessionId, bulkEnrollData.employeeIds);
      dismiss();
      if (res.success) {
        setIsBulkEnrollModalOpen(false);
        showSuccess(`✓ Successfully enrolled ${res.enrolled} employees.`);
        loadData();
      } else {
        showError(res.error || 'Failed to enroll employees');
      }
    } catch (err: any) {
      dismiss();
      handleError(err, '✕ Enrollment Failed');
    }
  };

  const handleAssessmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCompany || !userSession || !assessmentData.enrollment) return;

    const dismiss = showLoading('Submitting assessment & recording score...');
    try {
      const res = await LearningManagementService.markAttendanceAndAssessment(
        userSession, 
        assessmentData.enrollment.id, 
        assessmentData.attendance, 
        assessmentData.score, 
        assessmentData.certFile || undefined
      );
      dismiss();

      if (res.success) {
        setIsAssessmentModalOpen(false);
        showSuccess('✓ Assessment and attendance recorded successfully!');
        loadData();
      } else {
        showError(res.error || 'Failed to record assessment');
      }
    } catch (err: any) {
      dismiss();
      handleError(err, '✕ Assessment Submission Failed');
    }
  };

  const toggleEmployeeSelection = (empId: string) => {
    setBulkEnrollData(prev => ({
      ...prev,
      employeeIds: prev.employeeIds.includes(empId) 
        ? prev.employeeIds.filter(id => id !== empId) 
        : [...prev.employeeIds, empId]
    }));
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-white dark:bg-slate-950 dark:bg-zinc-950">
      {/* HEADER */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-zinc-800 bg-white dark:bg-slate-900 dark:bg-zinc-900">
        <div>
          <h1 className="text-xl font-bold text-black dark:text-white flex items-center gap-2">
            <FileBadge2 className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            Learning & Compliance
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Manage PSARA training, sessions, and certifications</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setIsVerifyModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-800 dark:text-slate-200 rounded-xl text-sm font-bold shadow-sm transition-colors">
            <ShieldAlert className="w-4 h-4 text-purple-600 dark:text-purple-400" /> Verify Certificate (QR)
          </button>
          {activeTab === 'PROGRAMS' && (
            <button onClick={() => setIsProgramModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-bold shadow-sm transition-colors">
              <Plus className="w-4 h-4" /> New Program
            </button>
          )}
          {activeTab === 'SESSIONS' && (
            <button onClick={() => setIsSessionModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold shadow-sm transition-colors">
              <Plus className="w-4 h-4" /> Schedule Session
            </button>
          )}
          {activeTab === 'ENROLLMENTS' && (
            <button onClick={() => setIsBulkEnrollModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold shadow-sm transition-colors">
              <Plus className="w-4 h-4" /> Bulk Enroll
            </button>
          )}
        </div>
      </div>

      {/* TABS */}
      <div className="px-6 py-3 border-b border-slate-200 dark:border-zinc-800 bg-white dark:bg-slate-900 dark:bg-zinc-900 flex gap-6">
        {[
          { id: 'PROGRAMS', label: 'Programs & Courses' },
          { id: 'SESSIONS', label: 'Scheduled Sessions' },
          { id: 'ENROLLMENTS', label: 'Enrollments & Records' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`pb-3 text-sm font-bold border-b-2 transition-colors ${
              activeTab === tab.id 
                ? 'border-purple-600 text-purple-600 dark:text-purple-400' 
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center h-full text-slate-500 dark:text-slate-400">Loading LMS Data...</div>
        ) : (
          <div className="space-y-4">
            
            {/* PROGRAMS TAB */}
            {activeTab === 'PROGRAMS' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {programs.map(p => (
                  <div key={p.id} className="bg-white dark:bg-slate-900 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-xs font-bold px-2 py-1 bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-slate-400 dark:text-slate-300 rounded-lg">{p.programCode}</span>
                      {p.isMandatoryForPSARA && (
                        <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-1 bg-rose-100 dark:bg-rose-950/50 text-rose-700 dark:text-rose-400 rounded-lg"><ShieldAlert className="w-3 h-3"/> PSARA MANDATORY</span>
                      )}
                    </div>
                    <h3 className="font-bold text-black dark:text-white mb-1">{p.title}</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mb-4">{p.description}</p>
                    <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 dark:text-slate-400 border-t border-slate-100 dark:border-zinc-800 pt-4">
                      <div className="flex items-center gap-1"><Clock className="w-3 h-3" /> {p.durationHours} Hours</div>
                      <div className="flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Pass: {p.passScorePercentage}%</div>
                      <div className="flex items-center gap-1"><Calendar className="w-3 h-3" /> Valid: {p.validityMonths}m</div>
                      <div className="flex items-center gap-1"><Filter className="w-3 h-3" /> {p.category.replace(/_/g, ' ')}</div>
                    </div>
                  </div>
                ))}
                {programs.length === 0 && <div className="col-span-full text-center p-8 text-slate-500 dark:text-slate-400">No training programs defined.</div>}
              </div>
            )}

            {/* SESSIONS TAB */}
            {activeTab === 'SESSIONS' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {sessions.map(s => {
                  const prog = programs.find(p => p.id === s.programId);
                  const enrolledCount = enrollments.filter(e => e.sessionId === s.id).length;
                  return (
                  <div key={s.id} className="bg-white dark:bg-slate-900 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm">
                    <div className="flex justify-between items-start mb-3">
                      <h3 className="font-bold text-black dark:text-white">{prog?.title || 'Unknown Program'}</h3>
                      <span className={`text-xs font-bold px-2 py-1 rounded-lg ${
                        s.status === 'SCHEDULED' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                        s.status === 'IN_PROGRESS' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                        s.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                        'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400'
                      }`}>{s.status}</span>
                    </div>
                    <div className="space-y-2 text-sm text-slate-600 dark:text-slate-400 mb-4">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-2"><Calendar className="w-4 h-4" /> {s.scheduledDate}</span>
                        <span className="flex items-center gap-2"><Clock className="w-4 h-4" /> {s.startTime} - {s.endTime}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-2"><Users className="w-4 h-4" /> Trainer: {s.trainerName}</span>
                        <span className="flex items-center gap-2"><Filter className="w-4 h-4" /> Enrolled: {enrolledCount}/{s.maxParticipants}</span>
                      </div>
                    </div>
                    {s.status === 'SCHEDULED' && (
                      <div className="border-t border-slate-100 dark:border-zinc-800 pt-4 flex justify-end">
                        <button 
                          onClick={() => {
                            setBulkEnrollData({ sessionId: s.id, employeeIds: [] });
                            setIsBulkEnrollModalOpen(true);
                          }}
                          className="text-sm font-bold text-purple-600 hover:text-purple-700 dark:text-purple-400"
                        >
                          Enroll Candidates &rarr;
                        </button>
                      </div>
                    )}
                  </div>
                )})}
                {sessions.length === 0 && <div className="col-span-full text-center p-8 text-slate-500 dark:text-slate-400">No scheduled sessions.</div>}
              </div>
            )}

            {/* ENROLLMENTS TAB */}
            {activeTab === 'ENROLLMENTS' && (
              <div className="bg-white dark:bg-slate-900 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
                <table className="w-full text-left text-sm">
                  <thead className="bg-white dark:bg-slate-950 dark:bg-zinc-800 text-slate-600 dark:text-slate-400 dark:text-slate-300">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Employee</th>
                      <th className="px-4 py-3 font-semibold">Program</th>
                      <th className="px-4 py-3 font-semibold">Session Date</th>
                      <th className="px-4 py-3 font-semibold">Attendance</th>
                      <th className="px-4 py-3 font-semibold">Result</th>
                      <th className="px-4 py-3 font-semibold text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-zinc-800 text-slate-900 dark:text-slate-300">
                    {enrollments.map(enr => (
                      <tr key={enr.id} className="hover:bg-white dark:bg-slate-950 dark:hover:bg-zinc-800/50">
                        <td className="px-4 py-3 font-medium">{enr.employeeName}</td>
                        <td className="px-4 py-3">{enr.programTitle}</td>
                        <td className="px-4 py-3">{enr.scheduledDate}</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-bold px-2 py-1 rounded-lg ${
                            enr.attendanceStatus === 'PRESENT' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                            enr.attendanceStatus === 'ABSENT' ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400' :
                            'bg-slate-100 text-slate-900 dark:bg-zinc-800 dark:text-slate-400'
                          }`}>{enr.attendanceStatus}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-bold px-2 py-1 rounded-lg ${
                            enr.resultStatus === 'PASSED' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                            enr.resultStatus === 'FAILED' ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400' :
                            'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                          }`}>{enr.resultStatus}</span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {enr.resultStatus === 'ENROLLED' || enr.resultStatus === 'IN_PROGRESS' ? (
                            <button 
                              onClick={() => {
                                setAssessmentData({ enrollment: enr, attendance: 'PRESENT', score: 0, certFile: null });
                                setIsAssessmentModalOpen(true);
                              }}
                              className="text-xs font-bold text-purple-600 hover:text-purple-700 dark:text-purple-400"
                            >
                              Evaluate
                            </button>
                          ) : (
                            enr.certificateId ? (
                              <a href={enr.certificateId} target="_blank" rel="noreferrer" className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex justify-end items-center gap-1">
                                <FileText className="w-3 h-3" /> View Cert
                              </a>
                            ) : (
                              <span className="text-xs text-slate-400">Recorded</span>
                            )
                          )}
                        </td>
                      </tr>
                    ))}
                    {enrollments.length === 0 && (
                      <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">No enrollments found.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* CREATE PROGRAM MODAL */}
      {isProgramModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 dark:bg-zinc-900 rounded-2xl shadow-xl overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-zinc-800 flex justify-between items-center bg-white dark:bg-slate-950 dark:bg-zinc-800/50">
              <h3 className="font-bold text-black dark:text-white">Create Training Program</h3>
              <button onClick={() => setIsProgramModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:text-slate-400"><XCircle className="w-5 h-5"/></button>
            </div>
            <form onSubmit={handleCreateProgram} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1 text-slate-600 dark:text-slate-400">Program Title *</label>
                <input required type="text" value={progFormData.title} onChange={e => setProgFormData({...progFormData, title: e.target.value})} className="w-full px-3 py-2 text-sm rounded-xl border bg-transparent border-slate-300 dark:border-zinc-700 focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1 text-slate-600 dark:text-slate-400">Description</label>
                <textarea rows={2} value={progFormData.description} onChange={e => setProgFormData({...progFormData, description: e.target.value})} className="w-full px-3 py-2 text-sm rounded-xl border bg-transparent border-slate-300 dark:border-zinc-700 focus:outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold mb-1 text-slate-600 dark:text-slate-400">Category</label>
                  <select value={progFormData.category} onChange={e => setProgFormData({...progFormData, category: e.target.value as any})} className="w-full px-3 py-2 text-sm rounded-xl border bg-transparent border-slate-300 dark:border-zinc-700 focus:outline-none">
                    <option value="PSARA_COMPLIANCE">PSARA Compliance</option>
                    <option value="FIRE_SAFETY_EVACUATION">Fire Safety</option>
                    <option value="INDUSTRIAL_FIRST_AID">First Aid</option>
                    <option value="UNARMED_COMBAT_DEFENSE">Unarmed Combat</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1 text-slate-600 dark:text-slate-400">Duration (Hours)</label>
                  <input type="number" required min="1" value={progFormData.durationHours} onChange={e => setProgFormData({...progFormData, durationHours: parseInt(e.target.value)})} className="w-full px-3 py-2 text-sm rounded-xl border bg-transparent border-slate-300 dark:border-zinc-700 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1 text-slate-600 dark:text-slate-400">Passing Score (%)</label>
                  <input type="number" required min="0" max="100" value={progFormData.passScorePercentage} onChange={e => setProgFormData({...progFormData, passScorePercentage: parseInt(e.target.value)})} className="w-full px-3 py-2 text-sm rounded-xl border bg-transparent border-slate-300 dark:border-zinc-700 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1 text-slate-600 dark:text-slate-400">Validity (Months)</label>
                  <input type="number" required min="0" value={progFormData.validityMonths} onChange={e => setProgFormData({...progFormData, validityMonths: parseInt(e.target.value)})} className="w-full px-3 py-2 text-sm rounded-xl border bg-transparent border-slate-300 dark:border-zinc-700 focus:outline-none" />
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer mt-2 text-sm text-slate-900 dark:text-slate-300">
                <input type="checkbox" checked={progFormData.isMandatoryForPSARA} onChange={e => setProgFormData({...progFormData, isMandatoryForPSARA: e.target.checked})} className="rounded text-purple-600" />
                <span>Mandatory for PSARA Compliance</span>
              </label>
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-zinc-800">
                <button type="button" onClick={() => setIsProgramModalOpen(false)} className="px-4 py-2 text-sm font-bold text-slate-600 dark:text-slate-400">Cancel</button>
                <button type="submit" className="px-4 py-2 text-sm font-bold bg-purple-600 text-white rounded-xl hover:bg-purple-700">Save Program</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE SESSION MODAL */}
      {isSessionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 dark:bg-zinc-900 rounded-2xl shadow-xl overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-zinc-800 flex justify-between items-center bg-white dark:bg-slate-950 dark:bg-zinc-800/50">
              <h3 className="font-bold text-black dark:text-white">Schedule Training Session</h3>
              <button onClick={() => setIsSessionModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:text-slate-400"><XCircle className="w-5 h-5"/></button>
            </div>
            <form onSubmit={handleCreateSession} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1 text-slate-600 dark:text-slate-400">Program *</label>
                <select required value={sessionFormData.programId} onChange={e => setSessionFormData({...sessionFormData, programId: e.target.value})} className="w-full px-3 py-2 text-sm rounded-xl border bg-transparent border-slate-300 dark:border-zinc-700 focus:outline-none">
                  <option value="">Select a program...</option>
                  {programs.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold mb-1 text-slate-600 dark:text-slate-400">Date *</label>
                  <input type="date" required value={sessionFormData.scheduledDate} onChange={e => setSessionFormData({...sessionFormData, scheduledDate: e.target.value})} className="w-full px-3 py-2 text-sm rounded-xl border bg-transparent border-slate-300 dark:border-zinc-700 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1 text-slate-600 dark:text-slate-400">Trainer Name *</label>
                  <input type="text" required value={sessionFormData.trainerName} onChange={e => setSessionFormData({...sessionFormData, trainerName: e.target.value})} className="w-full px-3 py-2 text-sm rounded-xl border bg-transparent border-slate-300 dark:border-zinc-700 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1 text-slate-600 dark:text-slate-400">Start Time</label>
                  <input type="time" required value={sessionFormData.startTime} onChange={e => setSessionFormData({...sessionFormData, startTime: e.target.value})} className="w-full px-3 py-2 text-sm rounded-xl border bg-transparent border-slate-300 dark:border-zinc-700 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1 text-slate-600 dark:text-slate-400">End Time</label>
                  <input type="time" required value={sessionFormData.endTime} onChange={e => setSessionFormData({...sessionFormData, endTime: e.target.value})} className="w-full px-3 py-2 text-sm rounded-xl border bg-transparent border-slate-300 dark:border-zinc-700 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1 text-slate-600 dark:text-slate-400">Location</label>
                  <input type="text" required value={sessionFormData.location} onChange={e => setSessionFormData({...sessionFormData, location: e.target.value})} className="w-full px-3 py-2 text-sm rounded-xl border bg-transparent border-slate-300 dark:border-zinc-700 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1 text-slate-600 dark:text-slate-400">Max Capacity</label>
                  <input type="number" required min="1" value={sessionFormData.maxParticipants} onChange={e => setSessionFormData({...sessionFormData, maxParticipants: parseInt(e.target.value)})} className="w-full px-3 py-2 text-sm rounded-xl border bg-transparent border-slate-300 dark:border-zinc-700 focus:outline-none" />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-zinc-800">
                <button type="button" onClick={() => setIsSessionModalOpen(false)} className="px-4 py-2 text-sm font-bold text-slate-600 dark:text-slate-400">Cancel</button>
                <button type="submit" className="px-4 py-2 text-sm font-bold bg-blue-600 text-white rounded-xl hover:bg-blue-700">Schedule Session</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* BULK ENROLL MODAL */}
      {isBulkEnrollModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-2xl bg-white dark:bg-slate-900 dark:bg-zinc-900 rounded-2xl shadow-xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="p-4 border-b border-slate-200 dark:border-zinc-800 flex justify-between items-center bg-white dark:bg-slate-950 dark:bg-zinc-800/50 shrink-0">
              <h3 className="font-bold text-black dark:text-white">Bulk Enroll Employees</h3>
              <button onClick={() => setIsBulkEnrollModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:text-slate-400"><XCircle className="w-5 h-5"/></button>
            </div>
            <form onSubmit={handleBulkEnroll} className="flex-1 overflow-auto p-5 flex flex-col">
              <div className="mb-4 shrink-0">
                <label className="block text-xs font-semibold mb-1 text-slate-600 dark:text-slate-400">Select Session *</label>
                <select required value={bulkEnrollData.sessionId} onChange={e => setBulkEnrollData({...bulkEnrollData, sessionId: e.target.value})} className="w-full px-3 py-2 text-sm rounded-xl border bg-transparent border-slate-300 dark:border-zinc-700 focus:outline-none">
                  <option value="">Select a session...</option>
                  {sessions.filter(s => s.status === 'SCHEDULED').map(s => {
                    const prog = programs.find(p => p.id === s.programId);
                    return <option key={s.id} value={s.id}>{prog?.title} - {s.scheduledDate}</option>
                  })}
                </select>
              </div>
              <div className="flex-1 overflow-auto border border-slate-200 dark:border-zinc-800 rounded-xl mb-4">
                <table className="w-full text-left text-sm relative">
                  <thead className="bg-white dark:bg-slate-950 dark:bg-zinc-800 text-slate-600 dark:text-slate-400 dark:text-slate-300 sticky top-0 z-10">
                    <tr>
                      <th className="px-4 py-2 font-semibold w-10">
                        <input type="checkbox" className="rounded" 
                          onChange={(e) => {
                            if (e.target.checked) setBulkEnrollData(p => ({...p, employeeIds: employees.map(emp => emp.id)}));
                            else setBulkEnrollData(p => ({...p, employeeIds: []}));
                          }}
                        />
                      </th>
                      <th className="px-4 py-2 font-semibold">Employee Name</th>
                      <th className="px-4 py-2 font-semibold">Designation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-zinc-800">
                    {employees.map(emp => (
                      <tr key={emp.id} className="hover:bg-white dark:bg-slate-950 dark:hover:bg-zinc-800/50 cursor-pointer" onClick={() => toggleEmployeeSelection(emp.id)}>
                        <td className="px-4 py-2">
                          <input type="checkbox" checked={bulkEnrollData.employeeIds.includes(emp.id)} readOnly className="rounded text-emerald-600" />
                        </td>
                        <td className="px-4 py-2 font-medium">{emp.firstName} {emp.lastName}</td>
                        <td className="px-4 py-2">{emp.designation}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex justify-between items-center shrink-0 pt-4 border-t border-slate-200 dark:border-zinc-800">
                <span className="text-sm font-semibold text-slate-600 dark:text-slate-400">{bulkEnrollData.employeeIds.length} Selected</span>
                <div className="flex gap-3">
                  <button type="button" onClick={() => setIsBulkEnrollModalOpen(false)} className="px-4 py-2 text-sm font-bold text-slate-600 dark:text-slate-400">Cancel</button>
                  <button type="submit" className="px-4 py-2 text-sm font-bold bg-emerald-600 text-white rounded-xl hover:bg-emerald-700">Confirm Enrollment</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EVALUATE/ASSESSMENT MODAL */}
      {isAssessmentModalOpen && assessmentData.enrollment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 dark:bg-zinc-900 rounded-2xl shadow-xl overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-zinc-800 flex justify-between items-center bg-white dark:bg-slate-950 dark:bg-zinc-800/50">
              <h3 className="font-bold text-black dark:text-white">Evaluate Candidate</h3>
              <button onClick={() => setIsAssessmentModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:text-slate-400"><XCircle className="w-5 h-5"/></button>
            </div>
            <form onSubmit={handleAssessmentSubmit} className="p-5 space-y-4">
              <div className="bg-white dark:bg-slate-950 dark:bg-zinc-800/50 p-3 rounded-xl border border-slate-100 dark:border-zinc-800">
                <p className="text-sm font-bold text-black dark:text-slate-200">{assessmentData.enrollment.employeeName}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{assessmentData.enrollment.programTitle}</p>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1 text-slate-600 dark:text-slate-400">Attendance</label>
                <select value={assessmentData.attendance} onChange={e => setAssessmentData({...assessmentData, attendance: e.target.value as any})} className="w-full px-3 py-2 text-sm rounded-xl border bg-transparent border-slate-300 dark:border-zinc-700 focus:outline-none">
                  <option value="PRESENT">Present</option>
                  <option value="ABSENT">Absent (Fails automatically)</option>
                </select>
              </div>

              {assessmentData.attendance === 'PRESENT' && (
                <>
                  <div>
                    <label className="block text-xs font-semibold mb-1 text-slate-600 dark:text-slate-400">Assessment Score (%)</label>
                    <input type="number" min="0" max="100" value={assessmentData.score} onChange={e => setAssessmentData({...assessmentData, score: parseInt(e.target.value)})} className="w-full px-3 py-2 text-sm rounded-xl border bg-transparent border-slate-300 dark:border-zinc-700 focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1 text-slate-600 dark:text-slate-400">Upload Certificate (Optional if passed)</label>
                    <input type="file" accept=".pdf,image/*" onChange={e => setAssessmentData({...assessmentData, certFile: e.target.files?.[0] || null})} className="w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100" />
                  </div>
                </>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-zinc-800">
                <button type="button" onClick={() => setIsAssessmentModalOpen(false)} className="px-4 py-2 text-sm font-bold text-slate-600 dark:text-slate-400">Cancel</button>
                <button type="submit" className="px-4 py-2 text-sm font-bold bg-purple-600 text-white rounded-xl hover:bg-purple-700">Submit Result</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VERIFY CERTIFICATE MODAL */}
      {isVerifyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 dark:bg-zinc-900 rounded-2xl shadow-xl overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-zinc-800 flex justify-between items-center bg-white dark:bg-slate-950 dark:bg-zinc-800/50">
              <h3 className="font-bold text-black dark:text-white flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-purple-600 dark:text-purple-400" /> Verify Certificate (QR / ID)
              </h3>
              <button onClick={() => { setIsVerifyModalOpen(false); setVerifyResult(null); setVerifyCertId(''); }} className="text-slate-400 hover:text-slate-600 dark:text-slate-400"><XCircle className="w-5 h-5"/></button>
            </div>
            <form onSubmit={handleVerifyCertificate} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1 text-slate-600 dark:text-slate-400">Certificate ID / Enrollment ID *</label>
                <div className="flex gap-2">
                  <input type="text" required placeholder="e.g. ENR-1700000000-123" value={verifyCertId} onChange={e => setVerifyCertId(e.target.value)} className="flex-1 px-3 py-2 text-sm rounded-xl border bg-transparent border-slate-300 dark:border-zinc-700 focus:outline-none" />
                  <button type="submit" className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-bold">Verify</button>
                </div>
              </div>

              {verifyResult && (
                <div className={`p-4 rounded-xl border ${
                  verifyResult.status === 'VALID' ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300' :
                  verifyResult.status === 'EXPIRED' ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300' :
                  'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300'
                }`}>
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-bold text-base">Status: {verifyResult.status}</span>
                    <span className="text-xs px-2 py-1 bg-white/50 dark:bg-zinc-900/50 rounded">{verifyResult.isValid ? '✓ Trusted & Verified' : '✕ Verification Failed'}</span>
                  </div>
                  {verifyResult.enrollment ? (
                    <div className="space-y-1 text-xs">
                      <p><strong>Employee:</strong> {verifyResult.enrollment.employeeName}</p>
                      <p><strong>Course:</strong> {verifyResult.enrollment.programTitle}</p>
                      <p><strong>Score:</strong> {verifyResult.enrollment.scoreObtained}%</p>
                      <p><strong>Issued:</strong> {verifyResult.enrollment.certificateIssuedDate ? new Date(verifyResult.enrollment.certificateIssuedDate).toLocaleDateString() : 'N/A'}</p>
                      <p><strong>Expires:</strong> {verifyResult.enrollment.certificateExpiryDate ? new Date(verifyResult.enrollment.certificateExpiryDate).toLocaleDateString() : 'No Expiry'}</p>
                      {verifyResult.error && <p className="text-rose-600 dark:text-rose-400 font-semibold mt-2">{verifyResult.error}</p>}
                    </div>
                  ) : (
                    <p className="text-xs">{verifyResult.error || 'Certificate record not found.'}</p>
                  )}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-zinc-800">
                <button type="button" onClick={() => { setIsVerifyModalOpen(false); setVerifyResult(null); setVerifyCertId(''); }} className="px-4 py-2 text-sm font-bold text-slate-600 dark:text-slate-400">Close</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
