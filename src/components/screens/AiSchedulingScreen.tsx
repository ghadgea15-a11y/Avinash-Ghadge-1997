import React, { useState, useEffect } from 'react';
import { 
  BrainCircuit, 
  AlertTriangle, 
  CheckCircle2, 
  Users, 
  Clock, 
  MapPin, 
  ShieldCheck, 
  Calendar, 
  Sliders, 
  ArrowRight, 
  UserCheck, 
  Check, 
  Zap, 
  Phone,
  BarChart2
} from 'lucide-react';
import { UserSession, CompanyTenant } from '../../types';
import { 
  ShiftRiskScore, 
  RelieverCandidate, 
  AutoRelieverSuggestion 
} from '../../types/aiScheduling';
import { AiSchedulingRelieverService } from '../../services/aiSchedulingRelieverService';

interface AiSchedulingScreenProps {
  userSession: UserSession;
  activeCompany: CompanyTenant;
}

export const AiSchedulingScreen: React.FC<AiSchedulingScreenProps> = ({
  userSession,
  activeCompany
}) => {
  const companyId = activeCompany.companyId;

  // Selected shift for evaluation
  const [selectedShiftIndex, setSelectedShiftIndex] = useState<number>(0);
  const [riskScores, setRiskScores] = useState<ShiftRiskScore[]>([]);
  const [activeWorkflow, setActiveWorkflow] = useState<AutoRelieverSuggestion | null>(null);
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);
  const [confirmedDispatch, setConfirmedDispatch] = useState<boolean>(false);

  // Mock roster assignments to evaluate
  const sampleAssignments = [
    {
      assignmentId: 'SH-801',
      employeeId: 'EMP-001',
      employeeName: 'Ramesh Kumar',
      siteId: 'SITE-01',
      siteName: 'Cyber Towers Tech Park',
      shiftDate: '2026-09-03',
      shiftType: 'NIGHT (20:00 - 08:00)',
      historicalAbsentRate: 0.16,
      consecutiveDaysWorked: 6,
      distanceKm: 26,
      isNightShift: true
    },
    {
      assignmentId: 'SH-802',
      employeeId: 'EMP-002',
      employeeName: 'Suresh Patil',
      siteId: 'SITE-01',
      siteName: 'Cyber Towers Tech Park',
      shiftDate: '2026-09-03',
      shiftType: 'DAY (08:00 - 20:00)',
      historicalAbsentRate: 0.02,
      consecutiveDaysWorked: 2,
      distanceKm: 6,
      isNightShift: false
    },
    {
      assignmentId: 'SH-803',
      employeeId: 'EMP-003',
      employeeName: 'Vikram Singh',
      siteId: 'SITE-02',
      siteName: 'Nexus Global Logistics Hub',
      shiftDate: '2026-09-03',
      shiftType: 'DAY (08:00 - 20:00)',
      historicalAbsentRate: 0.08,
      consecutiveDaysWorked: 4,
      distanceKm: 14,
      isNightShift: false
    }
  ];

  const evaluateAll = () => {
    const scored = sampleAssignments.map(a => 
      AiSchedulingRelieverService.evaluateShiftRisk({
        assignmentId: a.assignmentId,
        employeeId: a.employeeId,
        employeeName: a.employeeName,
        siteId: a.siteId,
        siteName: a.siteName,
        shiftDate: a.shiftDate,
        shiftType: a.shiftType,
        historicalAbsentRate: a.historicalAbsentRate,
        consecutiveDaysWorked: a.consecutiveDaysWorked,
        distanceKm: a.distanceKm,
        isNightShift: a.isNightShift
      })
    );
    setRiskScores(scored);
  };

  useEffect(() => {
    evaluateAll();
  }, [companyId]);

  const currentScored = riskScores[selectedShiftIndex] || riskScores[0];

  const handleLaunchRelieverWorkflow = (score: ShiftRiskScore) => {
    const wf = AiSchedulingRelieverService.createRelieverWorkflow(
      companyId,
      score.assignmentId,
      score.siteId,
      score.siteName,
      score.employeeId,
      score.employeeName,
      score.shiftDate,
      score.shiftType
    );
    setActiveWorkflow(wf);
    setSelectedCandidateId(wf.candidates.length > 0 ? wf.candidates[0].employeeId : null);
    setConfirmedDispatch(false);
  };

  const handleConfirmDispatch = () => {
    if (!activeWorkflow || !selectedCandidateId) return;
    const selected = activeWorkflow.candidates.find(c => c.employeeId === selectedCandidateId);
    setConfirmedDispatch(true);
    alert(`Auto-Reliever Dispatched! Guard ${selected?.employeeName} has been assigned to ${activeWorkflow.siteName} for shift ${activeWorkflow.shiftDate}. SMS alert dispatched.`);
  };

  return (
    <div id="ai-scheduling-screen" className="flex-1 flex flex-col h-full bg-slate-50 dark:bg-slate-900 overflow-y-auto">
      {/* Top Header */}
      <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 py-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 text-xs font-bold uppercase tracking-wider bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 rounded">
                Module 5 Parity
              </span>
              <span className="text-xs text-slate-500">
                AI Scheduling & No-Show Predictor
              </span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white mt-1 flex items-center gap-2">
              <BrainCircuit className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
              <span>AI-Assisted Scheduling & Auto-Reliever Engine</span>
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Transparent rule-based scoring (fatigue index, transit distance, absenteeism) with automated standby reliever dispatch.
            </p>
          </div>
        </div>
      </div>

      <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Evaluated Shifts */}
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
            <h3 className="font-bold text-slate-900 dark:text-white text-base mb-3">
              Roster Risk Predictions (Upcoming Shifts)
            </h3>

            <div className="space-y-3">
              {riskScores.map((sc, idx) => (
                <div
                  key={sc.assignmentId}
                  onClick={() => {
                    setSelectedShiftIndex(idx);
                    setActiveWorkflow(null);
                    setConfirmedDispatch(false);
                  }}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                    selectedShiftIndex === idx
                      ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30 ring-1 ring-indigo-500'
                      : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-sm text-slate-900 dark:text-white">
                      {sc.employeeName}
                    </span>
                    <span className={`px-2 py-0.5 text-xs font-bold rounded ${
                      sc.riskLevel === 'HIGH' ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300' :
                      sc.riskLevel === 'MEDIUM' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300' :
                      'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                    }`}>
                      {sc.riskLevel} RISK ({sc.compositeScore}%)
                    </span>
                  </div>

                  <div className="text-xs text-slate-500 flex items-center justify-between mt-1">
                    <span>{sc.siteName}</span>
                    <span className="font-mono text-[11px]">{sc.shiftType}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Center & Right Column: Explainable AI Scorer & Reliever Dispatch */}
        <div className="lg:col-span-2 space-y-6">
          {currentScored && (
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-700 gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-lg text-slate-900 dark:text-white">
                      {currentScored.employeeName}
                    </span>
                    <span className="text-xs font-mono text-slate-400">ID: {currentScored.employeeId}</span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Assignment: {currentScored.siteName} | {currentScored.shiftType} on {currentScored.shiftDate}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className="text-[11px] text-slate-400 uppercase font-semibold block">Composite Risk</span>
                    <span className={`text-2xl font-black ${
                      currentScored.riskLevel === 'HIGH' ? 'text-rose-600' :
                      currentScored.riskLevel === 'MEDIUM' ? 'text-amber-600' :
                      'text-emerald-600'
                    }`}>
                      {currentScored.compositeScore}%
                    </span>
                  </div>

                  {currentScored.riskLevel === 'HIGH' && (
                    <button
                      onClick={() => handleLaunchRelieverWorkflow(currentScored)}
                      className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-lg shadow-sm flex items-center gap-2 transition-colors"
                    >
                      <Zap className="w-4 h-4" />
                      Trigger Auto-Reliever
                    </button>
                  )}
                </div>
              </div>

              {/* Explainable Factors Breakdown */}
              <div className="mt-5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5" />
                  Transparent Mathematical Factor Attribution
                </h4>

                <div className="space-y-2.5">
                  {currentScored.factors.map((f, i) => (
                    <div key={i} className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-slate-900 dark:text-white mr-2">
                          {f.factorName}
                        </span>
                        <span className="text-slate-500">{f.explanation}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-mono text-slate-400">Weight: {(f.weight * 100).toFixed(0)}%</span>
                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                          f.impact === 'NEGATIVE' ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300' :
                          f.impact === 'POSITIVE' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300' :
                          'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                        }`}>
                          {f.impact}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Auto-Reliever Dispatch Workflow Modal/Card */}
          {activeWorkflow && (
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-rose-300 dark:border-rose-900 p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-700">
                <div>
                  <h4 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <UserCheck className="w-5 h-5 text-indigo-600" />
                    <span>Auto-Reliever Candidate Matching Engine</span>
                  </h4>
                  <p className="text-xs text-slate-500">
                    Ranked by transit proximity, statutory 48h weekly overtime limits & active PSARA compliance.
                  </p>
                </div>
                <span className="px-2.5 py-1 text-xs font-bold bg-amber-100 text-amber-800 rounded-full">
                  Supervisor Confirmation Required
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {activeWorkflow.candidates.map(candidate => (
                  <div
                    key={candidate.employeeId}
                    onClick={() => setSelectedCandidateId(candidate.employeeId)}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                      selectedCandidateId === candidate.employeeId
                        ? 'border-indigo-600 bg-indigo-50/60 dark:bg-indigo-950/40 ring-2 ring-indigo-600'
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-sm text-slate-900 dark:text-white">
                        {candidate.employeeName}
                      </span>
                      <span className="text-xs font-black text-indigo-600 dark:text-indigo-400">
                        {candidate.rankingScore} Match Pts
                      </span>
                    </div>

                    <div className="text-xs text-slate-500 mb-2">
                      {candidate.designation} • {candidate.phoneNumber}
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
                      <div>
                        <span className="text-slate-400 block">Proximity:</span>
                        <span className="font-bold text-slate-700 dark:text-slate-200">{candidate.proximityKm} km</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">OT Headroom:</span>
                        <span className="font-bold text-slate-700 dark:text-slate-200">+{candidate.overtimeHeadroomHours}h left</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">PSARA License:</span>
                        <span className={`font-bold ${candidate.complianceValid ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {candidate.psaraStatus}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Attendance:</span>
                        <span className="font-bold text-slate-700 dark:text-slate-200">{candidate.historicalAttendanceRate}%</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3">
                <button
                  onClick={() => setActiveWorkflow(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmDispatch}
                  disabled={!selectedCandidateId || confirmedDispatch}
                  className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm flex items-center gap-2 transition-colors disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  <span>{confirmedDispatch ? 'Dispatched & Confirmed' : 'Confirm Reliever Dispatch'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
