import React, { useState, useEffect } from 'react';
import { 
  Target, 
  Award, 
  RotateCcw, 
  SlidersHorizontal, 
  AlertTriangle, 
  DollarSign, 
  Plus, 
  CheckCircle2, 
  Clock, 
  UserCheck, 
  TrendingUp, 
  ChevronRight, 
  Search, 
  Filter, 
  BarChart2, 
  Layers, 
  Calendar, 
  Sparkles,
  FileText,
  Users
} from 'lucide-react';
import { CompanyTenant, UserSession, PhaseAScreen } from '../../types';
import { 
  PerformanceGoalRecord, 
  AppraisalCycleRecord, 
  AppraisalReviewRecord, 
  Feedback360RequestRecord, 
  PipRecord 
} from '../../types/pms';
import { PmsService } from '../../services/pmsService';
import { useFeedback } from '../../context/ActionFeedbackContext';

interface PerformanceManagementScreenProps {
  currentCompany: CompanyTenant;
  userSession: UserSession;
  onNavigate?: (screen: PhaseAScreen) => void;
}

type PmsTab = 'GOALS_OKRS' | 'APPRAISAL_CYCLES' | 'REVIEWS' | 'FEEDBACK_360' | 'CALIBRATION' | 'PIP';

export const PerformanceManagementScreen: React.FC<PerformanceManagementScreenProps> = ({
  currentCompany,
  userSession,
  onNavigate
}) => {
  const { showSuccess, showError } = useFeedback();
  const isSuperOrExecutive = ['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER_PROMOTER', 'DIRECTOR_CEO', 'GENERAL_MANAGER', 'HR_ADMIN', 'HR'].includes(userSession.role);
  const isManagerOrSupervisor = ['OPS_MANAGER', 'SITE_IN_CHARGE', 'SUPERVISOR', 'REGIONAL_MANAGER', 'AREA_MANAGER'].includes(userSession.role);

  const [activeTab, setActiveTab] = useState<PmsTab>('GOALS_OKRS');
  const [loading, setLoading] = useState<boolean>(true);

  // Datasets
  const [goals, setGoals] = useState<PerformanceGoalRecord[]>([]);
  const [cycles, setCycles] = useState<AppraisalCycleRecord[]>([]);
  const [reviews, setReviews] = useState<AppraisalReviewRecord[]>([]);
  const [feedbackRequests, setFeedbackRequests] = useState<Feedback360RequestRecord[]>([]);
  const [pipRecords, setPipRecords] = useState<PipRecord[]>([]);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCycleId, setSelectedCycleId] = useState<string>('ALL');

  // Modals / Forms
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [newGoal, setNewGoal] = useState<Partial<PerformanceGoalRecord>>({
    title: '',
    description: '',
    category: 'INDIVIDUAL',
    weightage: 25,
    keyResults: [
      { id: 'KR1', title: 'Target Metric', targetMetric: 100, currentMetric: 0, unit: '%', weightage: 100, updatedAt: new Date().toISOString() }
    ]
  });

  const [showCycleModal, setShowCycleModal] = useState(false);
  const [newCycle, setNewCycle] = useState<Partial<AppraisalCycleRecord>>({
    name: 'Q3 Operational & Safety Appraisal 2026',
    frequency: 'QUARTERLY',
    fiscalYear: '2026-2027',
    status: 'ACTIVE'
  });

  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [newFeedback, setNewFeedback] = useState<Partial<Feedback360RequestRecord>>({
    relationship: 'PEER',
    isAnonymous: true
  });

  const [showPipModal, setShowPipModal] = useState(false);
  const [newPip, setNewPip] = useState<Partial<PipRecord>>({
    reason: '',
    actionPlan: '',
    status: 'ACTIVE',
    milestones: [
      { id: 'M1', title: 'Attendance & SOP compliance adherence > 98%', targetDate: new Date(Date.now() + 30*86400000).toISOString().split('T')[0], successCriteria: 'Zero unannounced absents', status: 'PENDING' }
    ]
  });

  const [selectedReviewForAction, setSelectedReviewForAction] = useState<AppraisalReviewRecord | null>(null);
  const [actionRating, setActionRating] = useState<number>(4);
  const [actionNotes, setActionNotes] = useState<string>('');

  useEffect(() => {
    loadAllPmsData();
  }, [currentCompany.companyId]);

  const loadAllPmsData = async () => {
    setLoading(true);
    try {
      const cId = currentCompany.companyId;
      const [g, c, r, f, p] = await Promise.all([
        PmsService.getGoals(cId, !isSuperOrExecutive && !isManagerOrSupervisor ? userSession.uid : undefined),
        PmsService.getAppraisalCycles(cId),
        PmsService.getAppraisalReviews(cId, undefined, !isSuperOrExecutive && !isManagerOrSupervisor ? userSession.uid : undefined),
        PmsService.getFeedbackRequests(cId, !isSuperOrExecutive ? userSession.uid : undefined),
        PmsService.getPipRecords(cId, !isSuperOrExecutive && !isManagerOrSupervisor ? userSession.uid : undefined)
      ]);
      setGoals(g);
      setCycles(c);
      setReviews(r);
      setFeedbackRequests(f);
      setPipRecords(p);
    } catch (err) {
      console.warn('Error loading PMS data:', err);
      showError('Failed to load Performance data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await PmsService.saveGoal(currentCompany.companyId, {
        ...newGoal,
        employeeId: newGoal.employeeId || userSession.uid,
        employeeName: newGoal.employeeName || ((userSession.fullName || userSession.email) || 'Unknown'),
        cycleId: selectedCycleId !== 'ALL' ? selectedCycleId : 'CYC-2026-Q3'
      }, { uid: userSession.uid || 'system', name: ((userSession.fullName || userSession.email) || 'Unknown'), role: userSession.role });
      
      showSuccess('Goal created and weighted progress configured');
      setShowGoalModal(false);
      loadAllPmsData();
    } catch (err) {
      showError('Failed to save Goal');
    }
  };

  const handleCreateCycle = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await PmsService.saveAppraisalCycle(currentCompany.companyId, newCycle, { uid: userSession.uid || 'system', name: ((userSession.fullName || userSession.email) || 'Unknown') });
      showSuccess('Appraisal Cycle created and launched to organization');
      setShowCycleModal(false);
      loadAllPmsData();
    } catch (err) {
      showError('Failed to create cycle');
    }
  };

  const handleAdvanceReview = async (stage: 'SELF' | 'MANAGER' | 'SKIP_LEVEL' | 'CALIBRATION' | 'FINAL_SIGN_OFF') => {
    if (!selectedReviewForAction) return;
    try {
      const updatePayload: Partial<AppraisalReviewRecord> = {
        ...selectedReviewForAction
      };
      if (stage === 'SELF') {
        updatePayload.selfOverallRating = actionRating;
        updatePayload.selfFeedbackNotes = actionNotes;
      } else if (stage === 'MANAGER') {
        updatePayload.managerOverallRating = actionRating;
        updatePayload.managerFeedbackNotes = actionNotes;
      } else if (stage === 'CALIBRATION') {
        updatePayload.finalCalibratedRating = actionRating;
        updatePayload.calibrationNotes = actionNotes;
      }

      await PmsService.submitReviewStage(
        currentCompany.companyId,
        updatePayload,
        stage,
        { uid: userSession.uid || 'system', name: ((userSession.fullName || userSession.email) || 'Unknown'), role: userSession.role }
      );
      showSuccess(`Appraisal advanced to next workflow stage successfully.`);
      setSelectedReviewForAction(null);
      loadAllPmsData();
    } catch (err) {
      showError('Failed to advance review stage');
    }
  };

  const handleCreatePip = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await PmsService.savePipRecord(currentCompany.companyId, newPip, { uid: userSession.uid || 'system', name: ((userSession.fullName || userSession.email) || 'Unknown') });
      showSuccess('Performance Improvement Plan initiated and recorded');
      setShowPipModal(false);
      loadAllPmsData();
    } catch (err) {
      showError('Failed to create PIP');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-xl">
              <Target className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Performance Management System (PMS)</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Enterprise OKRs, 360° Appraisals, Calibration Workshops & Performance-to-Payroll Linkage
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {activeTab === 'GOALS_OKRS' && (
            <button
              onClick={() => setShowGoalModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium shadow-sm transition"
            >
              <Plus className="w-4 h-4" /> Add Goal / OKR
            </button>
          )}

          {activeTab === 'APPRAISAL_CYCLES' && isSuperOrExecutive && (
            <button
              onClick={() => setShowCycleModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium shadow-sm transition"
            >
              <Plus className="w-4 h-4" /> Launch Cycle
            </button>
          )}

          {activeTab === 'PIP' && (isSuperOrExecutive || isManagerOrSupervisor) && (
            <button
              onClick={() => setShowPipModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-sm font-medium shadow-sm transition"
            >
              <Plus className="w-4 h-4" /> Initiate PIP
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto gap-2 border-b border-slate-200 dark:border-slate-800 pb-2 scrollbar-none">
        {[
          { id: 'GOALS_OKRS', label: 'Goals & OKRs', icon: Target, count: goals.length },
          { id: 'APPRAISAL_CYCLES', label: 'Appraisal Cycles', icon: Calendar, count: cycles.length },
          { id: 'REVIEWS', label: 'Appraisal Reviews', icon: Award, count: reviews.length },
          { id: 'FEEDBACK_360', label: '360° Feedback', icon: RotateCcw, count: feedbackRequests.length },
          { id: 'CALIBRATION', label: 'Calibration Workshop', icon: SlidersHorizontal, count: reviews.filter(r => r.stage === 'CALIBRATION').length },
          { id: 'PIP', label: 'Improvement Plans (PIP)', icon: AlertTriangle, count: pipRecords.length }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as PmsTab)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition whitespace-nowrap ${
                isActive 
                  ? 'bg-indigo-600 text-white shadow-sm' 
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                isActive ? 'bg-indigo-700 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}>
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search goals, employees, reviewers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <span className="text-xs text-slate-500 whitespace-nowrap">Cycle Filter:</span>
          <select
            value={selectedCycleId}
            onChange={(e) => setSelectedCycleId(e.target.value)}
            className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="ALL">All Active Cycles</option>
            {cycles.map(c => (
              <option key={c.id} value={c.id}>{c.name} ({c.fiscalYear})</option>
            ))}
          </select>
        </div>
      </div>

      {/* TAB 1: GOALS & OKRS */}
      {activeTab === 'GOALS_OKRS' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {goals.length === 0 ? (
            <div className="col-span-full py-16 text-center bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800">
              <Target className="w-12 h-12 text-slate-400 mx-auto mb-3" />
              <h3 className="text-base font-semibold">No Goals / OKRs Defined Yet</h3>
              <p className="text-sm text-slate-500 mt-1">Set cascading organizational objectives and individual weightage-based goals.</p>
              <button
                onClick={() => setShowGoalModal(true)}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700"
              >
                <Plus className="w-4 h-4" /> Add First Goal
              </button>
            </div>
          ) : (
            goals.map(goal => (
              <div key={goal.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4 hover:border-indigo-500/50 transition">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
                      {goal.category}
                    </span>
                    <h3 className="font-semibold text-base mt-2">{goal.title}</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-1">{goal.description}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-slate-400">Weight</span>
                    <p className="text-lg font-extrabold text-indigo-600 dark:text-indigo-400">{goal.weightage}%</p>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-slate-500">Progress</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">{goal.progressPercent}%</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                    <div 
                      className={`h-full rounded-full ${goal.progressPercent >= 100 ? 'bg-emerald-500' : 'bg-indigo-600'}`}
                      style={{ width: `${goal.progressPercent}%` }}
                    />
                  </div>
                </div>

                {/* Key Results */}
                <div className="space-y-2 border-t border-slate-100 dark:border-slate-800 pt-3">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Key Results ({goal.keyResults?.length || 0})</span>
                  {goal.keyResults?.slice(0, 2).map((kr, idx) => (
                    <div key={kr.id || idx} className="flex items-center justify-between text-xs bg-slate-50 dark:bg-slate-800/50 p-2 rounded-lg">
                      <span className="truncate pr-2">{kr.title}</span>
                      <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">
                        {kr.currentMetric} / {kr.targetMetric} {kr.unit}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <span>Assigned: <strong className="text-slate-700 dark:text-slate-300">{goal.employeeName}</strong></span>
                  <span className="font-medium text-amber-600 dark:text-amber-400">Due: {goal.dueDate}</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* TAB 2: APPRAISAL CYCLES */}
      {activeTab === 'APPRAISAL_CYCLES' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {cycles.map(cycle => (
              <div key={cycle.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                      {cycle.status}
                    </span>
                    <h3 className="font-bold text-base mt-2">{cycle.name}</h3>
                    <p className="text-xs text-slate-500">{cycle.frequency} • FY {cycle.fiscalYear}</p>
                  </div>
                </div>

                <div className="space-y-2 text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl">
                  <div className="flex justify-between">
                    <span>Self-Review Deadline:</span>
                    <strong className="text-slate-900 dark:text-white">{cycle.selfReviewDeadline}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Manager Review Deadline:</span>
                    <strong className="text-slate-900 dark:text-white">{cycle.managerReviewDeadline}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Calibration Deadline:</span>
                    <strong className="text-slate-900 dark:text-white">{cycle.calibrationDeadline}</strong>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span>Target Bell-Curve (Expected):</span>
                    <span className="font-mono text-slate-500">10% / 25% / 50% / 10% / 5%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: APPRAISAL REVIEWS */}
      {activeTab === 'REVIEWS' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-500 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-6 py-3.5">Employee</th>
                  <th className="px-6 py-3.5">Appraisal Cycle</th>
                  <th className="px-6 py-3.5">Current Stage</th>
                  <th className="px-6 py-3.5">Self Rating</th>
                  <th className="px-6 py-3.5">Manager Rating</th>
                  <th className="px-6 py-3.5">Calibrated Rating</th>
                  <th className="px-6 py-3.5">Payroll Linkage</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {reviews.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-slate-500">
                      No appraisal reviews initiated for current search criteria.
                    </td>
                  </tr>
                ) : (
                  reviews.map(review => (
                    <tr key={review.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-900 dark:text-white">{review.employeeName}</div>
                        <div className="text-xs text-slate-400">{review.employeeId}</div>
                      </td>
                      <td className="px-6 py-4 text-xs font-medium">{review.cycleName}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                          review.stage === 'CLOSED' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-indigo-500/10 text-indigo-600'
                        }`}>
                          {review.stage}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-mono font-bold text-slate-700 dark:text-slate-300">
                        {review.selfOverallRating ? `${review.selfOverallRating} / 5` : '—'}
                      </td>
                      <td className="px-6 py-4 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                        {review.managerOverallRating ? `${review.managerOverallRating} / 5` : '—'}
                      </td>
                      <td className="px-6 py-4 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {review.finalCalibratedRating ? `${review.finalCalibratedRating} / 5` : '—'}
                      </td>
                      <td className="px-6 py-4 text-xs">
                        <div className="font-semibold text-slate-800 dark:text-slate-200">+{review.recommendedIncrementPercent}% Increment</div>
                        <div className="text-slate-400 font-mono">{review.performanceBonusMultiplier}x Bonus</div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => {
                            setSelectedReviewForAction(review);
                            setActionRating(review.finalCalibratedRating || review.managerOverallRating || 4);
                            setActionNotes(review.managerFeedbackNotes || '');
                          }}
                          className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 rounded-lg text-xs font-semibold"
                        >
                          Review & Advance
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: 360° FEEDBACK PORTAL */}
      {activeTab === 'FEEDBACK_360' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {feedbackRequests.map(f => (
            <div key={f.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400">
                    360° {f.relationship}
                  </span>
                  <h3 className="font-semibold text-base mt-2">Target: {f.targetEmployeeName}</h3>
                  <p className="text-xs text-slate-400">Reviewer: {f.isAnonymous ? 'Anonymized Peer' : f.reviewerEmployeeName}</p>
                </div>
                <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${f.status === 'SUBMITTED' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600'}`}>
                  {f.status}
                </span>
              </div>

              {f.status === 'SUBMITTED' && (
                <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl space-y-2 text-xs">
                  <div>
                    <strong className="text-slate-600 dark:text-slate-400">Key Strengths:</strong>
                    <p className="text-slate-800 dark:text-slate-200 mt-0.5">{f.strengths || 'Exemplary dedication to post security and proactive response.'}</p>
                  </div>
                  <div>
                    <strong className="text-slate-600 dark:text-slate-400">Areas for Growth:</strong>
                    <p className="text-slate-800 dark:text-slate-200 mt-0.5">{f.areasOfImprovement || 'Further cross-functional escalation training.'}</p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* TAB 5: RATING CALIBRATION WORKSHOP */}
      {activeTab === 'CALIBRATION' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-6">
          <div>
            <h2 className="text-lg font-bold">Rating Calibration Workshop (A2–A5 Normalization)</h2>
            <p className="text-sm text-slate-500">Normalize performance ratings against organizational Bell-Curve distribution prior to payroll sign-off.</p>
          </div>

          <div className="grid grid-cols-5 gap-3 text-center">
            {[
              { score: '5 - Outstanding', target: '10%', actual: '12%', color: 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30' },
              { score: '4 - Exceeds', target: '25%', actual: '26%', color: 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30' },
              { score: '3 - Meets', target: '50%', actual: '48%', color: 'border-blue-500 bg-blue-50 dark:bg-blue-950/30' },
              { score: '2 - Needs Imprv', target: '10%', actual: '9%', color: 'border-amber-500 bg-amber-50 dark:bg-amber-950/30' },
              { score: '1 - Unsatisfactory', target: '5%', actual: '5%', color: 'border-rose-500 bg-rose-50 dark:bg-rose-950/30' }
            ].map(b => (
              <div key={b.score} className={`p-4 rounded-xl border ${b.color}`}>
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{b.score}</span>
                <p className="text-2xl font-black mt-2 text-slate-900 dark:text-white">{b.actual}</p>
                <span className="text-[11px] text-slate-500">Target: {b.target}</span>
              </div>
            ))}
          </div>

          <div className="p-4 bg-indigo-50 dark:bg-indigo-950/30 rounded-xl border border-indigo-200 dark:border-indigo-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <DollarSign className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
              <div>
                <h4 className="text-sm font-bold">Payroll & Statutory Increment Advisory Feed</h4>
                <p className="text-xs text-slate-500">Calibrated ratings automatically calculate recommended bonus & increment percentage multipliers for Module 8 Payroll review.</p>
              </div>
            </div>
            <button
              onClick={() => showSuccess('Performance rating matrix synced to Payroll Engine as non-binding advisory data')}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm"
            >
              Sync to Payroll Engine
            </button>
          </div>
        </div>
      )}

      {/* TAB 6: PERFORMANCE IMPROVEMENT PLAN (PIP) */}
      {activeTab === 'PIP' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pipRecords.map(pip => (
              <div key={pip.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400">
                      PIP • {pip.status}
                    </span>
                    <h3 className="font-bold text-base mt-2">{pip.employeeName}</h3>
                    <p className="text-xs text-slate-500">Supervisor: {pip.supervisorName}</p>
                  </div>
                  <div className="text-right text-xs font-mono text-slate-400">
                    <div>Start: {pip.startDate}</div>
                    <div>End: {pip.endDate}</div>
                  </div>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl text-xs space-y-1.5">
                  <strong className="text-slate-700 dark:text-slate-300">Action Plan & Objective:</strong>
                  <p className="text-slate-600 dark:text-slate-400">{pip.actionPlan || 'Adherence to mandatory biometric shift timing and zero patrol misses.'}</p>
                </div>

                <div className="space-y-2">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Milestones</span>
                  {pip.milestones?.map(m => (
                    <div key={m.id} className="flex items-center justify-between text-xs bg-slate-50 dark:bg-slate-800 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700">
                      <span>{m.title}</span>
                      <span className="px-2 py-0.5 bg-amber-500/10 text-amber-600 font-bold rounded-md">{m.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL: CREATE GOAL */}
      {showGoalModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold">Define Goal / OKR</h3>
            <form onSubmit={handleCreateGoal} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Goal Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ensure 99.8% Shift Deployment across North Sector"
                  value={newGoal.title}
                  onChange={(e) => setNewGoal({ ...newGoal, title: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Category</label>
                  <select
                    value={newGoal.category}
                    onChange={(e) => setNewGoal({ ...newGoal, category: e.target.value as any })}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                  >
                    <option value="INDIVIDUAL">Individual Goal</option>
                    <option value="DEPARTMENTAL">Departmental Goal</option>
                    <option value="COMPANY_OKR">Company OKR</option>
                    <option value="COMPLIANCE_SAFETY">Compliance & Safety</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Weightage (%)</label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={newGoal.weightage}
                    onChange={(e) => setNewGoal({ ...newGoal, weightage: Number(e.target.value) })}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Description</label>
                <textarea
                  rows={3}
                  value={newGoal.description}
                  onChange={(e) => setNewGoal({ ...newGoal, description: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                  placeholder="Outline key deliverables and metrics..."
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowGoalModal(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-600 dark:text-slate-400 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700"
                >
                  Save & Weight Goal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CREATE APPRAISAL CYCLE */}
      {showCycleModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold">Launch Appraisal Cycle</h3>
            <form onSubmit={handleCreateCycle} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Cycle Name</label>
                <input
                  type="text"
                  required
                  value={newCycle.name}
                  onChange={(e) => setNewCycle({ ...newCycle, name: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Frequency</label>
                  <select
                    value={newCycle.frequency}
                    onChange={(e) => setNewCycle({ ...newCycle, frequency: e.target.value as any })}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                  >
                    <option value="ANNUAL">Annual</option>
                    <option value="HALF_YEARLY">Half-Yearly</option>
                    <option value="QUARTERLY">Quarterly</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Fiscal Year</label>
                  <input
                    type="text"
                    value={newCycle.fiscalYear}
                    onChange={(e) => setNewCycle({ ...newCycle, fiscalYear: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCycleModal(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-xl font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700"
                >
                  Launch Cycle
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADVANCE REVIEW STAGE */}
      {selectedReviewForAction && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold">Appraisal Review Stage: {selectedReviewForAction.stage}</h3>
            <p className="text-xs text-slate-500">Employee: <strong>{selectedReviewForAction.employeeName}</strong> ({selectedReviewForAction.employeeId})</p>

            <div className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Rating Score (1 to 5 Scale)</label>
                <input
                  type="number"
                  min={1}
                  max={5}
                  step={0.1}
                  value={actionRating}
                  onChange={(e) => setActionRating(Number(e.target.value))}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none font-bold text-lg text-indigo-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Evaluation & Feedback Notes</label>
                <textarea
                  rows={4}
                  value={actionNotes}
                  onChange={(e) => setActionNotes(e.target.value)}
                  placeholder="Provide qualitative feedback on goals and competencies..."
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedReviewForAction(null)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-xl font-medium"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleAdvanceReview(selectedReviewForAction.stage as any)}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700"
                >
                  Submit & Advance Stage
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
