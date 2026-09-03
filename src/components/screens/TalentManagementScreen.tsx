import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Award, 
  Calendar, 
  FileText, 
  TrendingUp, 
  CheckCircle2, 
  ShieldCheck, 
  Send, 
  Plus, 
  Eye, 
  Sparkles, 
  Gift, 
  Star, 
  Briefcase,
  Layers,
  ChevronRight
} from 'lucide-react';
import { UserSession } from '../../types';
import { 
  CompetencySkillDefinition, 
  EmployeeSkillsMatrixRecord, 
  SuccessionPlanRecord, 
  OfferLetterRecord, 
  DayOneOnboardingRecord, 
  MasterTrainingCalendarEvent, 
  KirkpatrickTrainingEvaluation, 
  RewardNominationRecord, 
  PeerRecognitionBadge, 
  EmployeeRewardWalletRecord 
} from '../../types/talentManagement';
import { CompetencySuccessionService } from '../../services/competencySuccessionService';
import { OfferOnboardingService } from '../../services/offerOnboardingService';
import { TrainingEffectivenessService } from '../../services/trainingEffectivenessService';
import { RewardsRecognitionService } from '../../services/rewardsRecognitionService';

interface TalentManagementScreenProps {
  session: UserSession;
}

export const TalentManagementScreen: React.FC<TalentManagementScreenProps> = ({ session }) => {
  const [activeTab, setActiveTab] = useState<'PHASE_A_SUCCESSION' | 'PHASE_B_OFFERS' | 'PHASE_C_CALENDAR' | 'PHASE_D_REWARDS'>('PHASE_A_SUCCESSION');
  const [loading, setLoading] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Phase A State
  const [successionPlans, setSuccessionPlans] = useState<SuccessionPlanRecord[]>([]);
  const [selectedSkillMatrix, setSelectedSkillMatrix] = useState<EmployeeSkillsMatrixRecord | null>(null);

  // Phase B State (Offers & CTC)
  const [offerLetters, setOfferLetters] = useState<OfferLetterRecord[]>([]);
  const [onboardingChecklists, setOnboardingChecklists] = useState<DayOneOnboardingRecord[]>([]);
  const [ctcInputGross, setCtcInputGross] = useState<number>(35000);
  const [ctcInputBonus, setCtcInputBonus] = useState<number>(50000);
  const [candidateNameInput, setCandidateNameInput] = useState<string>('');
  const [jobTitleInput, setJobTitleInput] = useState<string>('Security Officer');

  // Phase C State (Training Calendar & Kirkpatrick)
  const [calendarEvents, setCalendarEvents] = useState<MasterTrainingCalendarEvent[]>([]);
  const [evaluations, setEvaluations] = useState<KirkpatrickTrainingEvaluation[]>([]);

  // Phase D State (Rewards & Recognition)
  const [nominations, setNominations] = useState<RewardNominationRecord[]>([]);
  const [recentBadges, setRecentBadges] = useState<PeerRecognitionBadge[]>([]);
  const [myWallet, setMyWallet] = useState<EmployeeRewardWalletRecord | null>(null);

  const companyId = session.companyId || 'DEFAULT_COMPANY';

  useEffect(() => {
    loadTabData();
  }, [activeTab, companyId]);

  const loadTabData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'PHASE_A_SUCCESSION') {
        const plans = await CompetencySuccessionService.getSuccessionPlans(companyId);
        setSuccessionPlans(plans);
      } else if (activeTab === 'PHASE_B_OFFERS') {
        const offers = await OfferOnboardingService.getOfferLetters(companyId);
        const checklists = await OfferOnboardingService.getOnboardingChecklists(companyId);
        setOfferLetters(offers);
        setOnboardingChecklists(checklists);
      } else if (activeTab === 'PHASE_C_CALENDAR') {
        const events = await TrainingEffectivenessService.getCalendarEvents(companyId);
        const evals = await TrainingEffectivenessService.getEvaluations(companyId);
        setCalendarEvents(events);
        setEvaluations(evals);
      } else if (activeTab === 'PHASE_D_REWARDS') {
        const noms = await RewardsRecognitionService.getNominations(companyId);
        const badges = await RewardsRecognitionService.getRecentBadges(companyId);
        const wallet = await RewardsRecognitionService.getEmployeeWallet(companyId, session.uid);
        setNominations(noms);
        setRecentBadges(badges);
        setMyWallet(wallet);
      }
    } catch (e) {
      console.error('Failed to load talent data:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!candidateNameInput.trim()) return;
    setLoading(true);
    try {
      await OfferOnboardingService.generateOfferLetter(
        session,
        companyId,
        `CAND-${Date.now()}`,
        candidateNameInput,
        `${candidateNameInput.toLowerCase().replace(/\s+/g, '')}@example.com`,
        '+91 9876543210',
        'REQ-101',
        jobTitleInput,
        'SECURITY_OPS',
        session.siteId || 'MAIN_FACILITY',
        new Date(Date.now() + 15 * 86400000).toISOString().slice(0, 10),
        ctcInputGross,
        ctcInputBonus
      );
      setSuccessMessage(`Digital Offer Letter generated for ${candidateNameInput} with CTC ₹${OfferOnboardingService.calculateCtcBreakdown(ctcInputGross, ctcInputBonus).annualCtc.toLocaleString('en-IN')}`);
      setCandidateNameInput('');
      await loadTabData();
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const calculatedCtcPreview = OfferOnboardingService.calculateCtcBreakdown(ctcInputGross, ctcInputBonus);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-4 md:p-8">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <div className="flex items-center gap-2 text-indigo-400 text-sm font-medium mb-1">
              <Briefcase className="w-4 h-4" /> Enterprise Talent Management Suite
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white">
              End-to-End Talent Lifecycle Platform
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Competencies, 9-Box Succession, Digital Offer Letters, Kirkpatrick Training ROI & Rewards Wallet
            </p>
          </div>

          {/* Wallet summary pill */}
          {myWallet && (
            <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-3 flex items-center gap-3">
              <div className="p-2 bg-amber-500/10 text-amber-400 rounded-lg">
                <Gift className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs text-slate-400 font-medium">My Reward Balance</div>
                <div className="text-base font-bold text-amber-300">
                  {myWallet.availablePointsBalance} Pts (₹{myWallet.availablePointsBalance})
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Tab Navigation */}
        <div className="flex flex-wrap gap-2 mt-6">
          <button
            onClick={() => setActiveTab('PHASE_A_SUCCESSION')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'PHASE_A_SUCCESSION'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/25'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <TrendingUp className="w-4 h-4" /> 1. Competency & 9-Box Succession
          </button>
          <button
            onClick={() => setActiveTab('PHASE_B_OFFERS')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'PHASE_B_OFFERS'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/25'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <FileText className="w-4 h-4" /> 2. Offer Letters & Day-1 Onboarding
          </button>
          <button
            onClick={() => setActiveTab('PHASE_C_CALENDAR')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'PHASE_C_CALENDAR'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/25'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Calendar className="w-4 h-4" /> 3. Training Calendar & Kirkpatrick ROI
          </button>
          <button
            onClick={() => setActiveTab('PHASE_D_REWARDS')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'PHASE_D_REWARDS'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/25'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Award className="w-4 h-4" /> 4. Rewards & Recognition Wallet
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto">
        {successMessage && (
          <div className="mb-6 p-4 bg-emerald-950/60 border border-emerald-500/30 rounded-xl text-emerald-300 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              <span>{successMessage}</span>
            </div>
            <button onClick={() => setSuccessMessage(null)} className="text-emerald-400 hover:text-emerald-200 text-sm">Dismiss</button>
          </div>
        )}

        {/* TAB 1: PHASE A - 9-BOX SUCCESSION & COMPETENCIES */}
        {activeTab === 'PHASE_A_SUCCESSION' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* 9-Box Grid Visual Matrix */}
              <div className="lg:col-span-2 bg-slate-800/60 border border-slate-700 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                      <Layers className="w-5 h-5 text-indigo-400" /> 9-Box Talent Matrix (Performance vs. Potential)
                    </h2>
                    <p className="text-xs text-slate-400">Enterprise calibration standard for leadership succession</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  {/* Top Row: High Potential (3) */}
                  <div className="p-3 bg-amber-950/40 border border-amber-800/40 rounded-lg">
                    <div className="text-xs font-semibold text-amber-400">POTENTIAL GEM</div>
                    <div className="text-[11px] text-slate-400">Low Perf / High Pot</div>
                  </div>
                  <div className="p-3 bg-indigo-950/40 border border-indigo-800/40 rounded-lg">
                    <div className="text-xs font-semibold text-indigo-400">HIGH POTENTIAL</div>
                    <div className="text-[11px] text-slate-400">Med Perf / High Pot</div>
                  </div>
                  <div className="p-3 bg-emerald-950/50 border border-emerald-500/40 rounded-lg shadow-inner">
                    <div className="text-xs font-bold text-emerald-300 flex items-center gap-1">
                      <Star className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400" /> STAR TALENT (3,3)
                    </div>
                    <div className="text-[11px] text-emerald-400/80">Ready Now for Leadership</div>
                  </div>

                  {/* Middle Row: Medium Potential (2) */}
                  <div className="p-3 bg-slate-900/60 border border-slate-700/60 rounded-lg">
                    <div className="text-xs font-semibold text-slate-300">INCONSISTENT</div>
                    <div className="text-[11px] text-slate-500">Low Perf / Med Pot</div>
                  </div>
                  <div className="p-3 bg-blue-950/40 border border-blue-800/40 rounded-lg">
                    <div className="text-xs font-semibold text-blue-400">CORE PLAYER</div>
                    <div className="text-[11px] text-slate-400">Med Perf / Med Pot</div>
                  </div>
                  <div className="p-3 bg-emerald-950/30 border border-emerald-800/40 rounded-lg">
                    <div className="text-xs font-semibold text-emerald-400">HIGH PERFORMER</div>
                    <div className="text-[11px] text-slate-400">High Perf / Med Pot</div>
                  </div>

                  {/* Bottom Row: Low Potential (1) */}
                  <div className="p-3 bg-rose-950/40 border border-rose-800/40 rounded-lg">
                    <div className="text-xs font-semibold text-rose-400">HIGH RISK / PIP</div>
                    <div className="text-[11px] text-slate-500">Low Perf / Low Pot</div>
                  </div>
                  <div className="p-3 bg-slate-900/60 border border-slate-700/60 rounded-lg">
                    <div className="text-xs font-semibold text-slate-300">EFFECTIVE WORKER</div>
                    <div className="text-[11px] text-slate-500">Med Perf / Low Pot</div>
                  </div>
                  <div className="p-3 bg-cyan-950/40 border border-cyan-800/40 rounded-lg">
                    <div className="text-xs font-semibold text-cyan-400">TRUSTED PRO</div>
                    <div className="text-[11px] text-slate-400">High Perf / Low Pot</div>
                  </div>
                </div>
              </div>

              {/* Bench Strength Card */}
              <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-6 flex flex-col justify-between">
                <div>
                  <h3 className="text-base font-bold text-white mb-2">Succession Bench Health</h3>
                  <p className="text-xs text-slate-400 mb-4">
                    Measures pipeline depth for key positions (Site In-Charge, Field Officer, Regional Manager).
                  </p>
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-xs text-slate-300 mb-1">
                        <span>Site In-Charge Bench</span>
                        <span className="font-bold text-emerald-400">80% (Robust)</span>
                      </div>
                      <div className="w-full bg-slate-700 h-2 rounded-full overflow-hidden">
                        <div className="bg-emerald-500 h-full w-[80%]" />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-xs text-slate-300 mb-1">
                        <span>Regional Head Bench</span>
                        <span className="font-bold text-amber-400">60% (Under Review)</span>
                      </div>
                      <div className="w-full bg-slate-700 h-2 rounded-full overflow-hidden">
                        <div className="bg-amber-500 h-full w-[60%]" />
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  onClick={async () => {
                    await CompetencySuccessionService.saveSuccessionPlan(
                      session,
                      companyId,
                      'Site In-Charge (Mumbai West)',
                      'OPERATIONS',
                      [
                        {
                          employeeId: 'EMP-001',
                          employeeName: 'Rahul Patil',
                          currentRole: 'Shift Supervisor',
                          performanceRating: 3,
                          potentialRating: 3,
                          nineBoxPosition: '3_3_STAR_TALENT',
                          readiness: 'READY_NOW',
                          retentionRisk: 'LOW',
                          developmentPlanNotes: 'Executive communication training',
                          nominatedAt: new Date().toISOString(),
                          nominatedBy: session.uid
                        }
                      ]
                    );
                    setSuccessMessage('Created succession plan with Star Talent nominee.');
                    loadTabData();
                  }}
                  className="mt-6 w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" /> Provision Succession Pipeline
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: PHASE B - OFFER LETTER & DAY-1 ONBOARDING */}
        {activeTab === 'PHASE_B_OFFERS' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Offer Generator Form */}
            <div className="lg:col-span-1 bg-slate-800/60 border border-slate-700 rounded-xl p-6">
              <h2 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-400" /> Digital Offer Letter Creator
              </h2>
              <p className="text-xs text-slate-400 mb-4">Calculates statutory Indian CTC components in real time.</p>

              <form onSubmit={handleGenerateOffer} className="space-y-4">
                <div>
                  <label className="text-xs text-slate-300 font-medium block mb-1">Candidate Full Name</label>
                  <input
                    type="text"
                    value={candidateNameInput}
                    onChange={(e) => setCandidateNameInput(e.target.value)}
                    placeholder="e.g. Ramesh Kadam"
                    required
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-300 font-medium block mb-1">Job Designation</label>
                  <input
                    type="text"
                    value={jobTitleInput}
                    onChange={(e) => setJobTitleInput(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-300 font-medium block mb-1">Monthly Gross Salary (INR)</label>
                  <input
                    type="number"
                    value={ctcInputGross}
                    onChange={(e) => setCtcInputGross(Number(e.target.value))}
                    min={10000}
                    step={1000}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-300 font-medium block mb-1">Annual Variable Bonus (INR)</label>
                  <input
                    type="number"
                    value={ctcInputBonus}
                    onChange={(e) => setCtcInputBonus(Number(e.target.value))}
                    min={0}
                    step={5000}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-2 mt-4"
                >
                  <Send className="w-4 h-4" /> Issue Formal Offer Letter
                </button>
              </form>
            </div>

            {/* Real-time CTC Breakdown Preview */}
            <div className="lg:col-span-2 bg-slate-800/60 border border-slate-700 rounded-xl p-6">
              <h3 className="text-base font-bold text-white mb-1">Authoritative Statutory CTC Structure</h3>
              <p className="text-xs text-slate-400 mb-4">Indian Wage Code & statutory compliance breakdown</p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-700">
                  <div className="text-[11px] text-slate-400">Monthly Gross</div>
                  <div className="text-lg font-bold text-white">₹{calculatedCtcPreview.grossMonthly.toLocaleString('en-IN')}</div>
                </div>
                <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-700">
                  <div className="text-[11px] text-slate-400">Basic (50%)</div>
                  <div className="text-lg font-bold text-indigo-400">₹{calculatedCtcPreview.basicMonthly.toLocaleString('en-IN')}</div>
                </div>
                <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-700">
                  <div className="text-[11px] text-slate-400">Est. Take Home</div>
                  <div className="text-lg font-bold text-emerald-400">₹{calculatedCtcPreview.netTakeHomeEstimatedMonthly.toLocaleString('en-IN')}</div>
                </div>
                <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-700">
                  <div className="text-[11px] text-slate-400">Annual CTC (Cost)</div>
                  <div className="text-lg font-bold text-amber-300">₹{calculatedCtcPreview.annualCtc.toLocaleString('en-IN')}</div>
                </div>
              </div>

              {/* Day 1 Onboarding Preview Tasks */}
              <div className="border-t border-slate-700 pt-4">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-300 mb-3">
                  Day-1 Automated Onboarding Tasks (Asset Pre-allocation)
                </h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-2.5 bg-slate-900/60 rounded-lg text-xs">
                    <span className="text-slate-300">1. Verification of Statutory Aadhaar / Police Clearance</span>
                    <span className="px-2 py-0.5 bg-indigo-950 text-indigo-300 rounded border border-indigo-800 text-[10px]">HR</span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 bg-slate-900/60 rounded-lg text-xs">
                    <span className="text-slate-300">2. PIN & Facial Biometric Enrollment on Site Machine</span>
                    <span className="px-2 py-0.5 bg-indigo-950 text-indigo-300 rounded border border-indigo-800 text-[10px]">Site In-Charge</span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 bg-slate-900/60 rounded-lg text-xs">
                    <span className="text-slate-300">3. Issue Uniform (2 Sets), Safety Boots & Baton PPE</span>
                    <span className="px-2 py-0.5 bg-indigo-950 text-indigo-300 rounded border border-indigo-800 text-[10px]">Site Supervisor</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: PHASE C - TRAINING CALENDAR & KIRKPATRICK ROI */}
        {activeTab === 'PHASE_C_CALENDAR' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4">
                <div className="text-xs text-slate-400">L1 Trainee CSAT</div>
                <div className="text-2xl font-bold text-indigo-400 mt-1">94%</div>
                <div className="text-[11px] text-slate-500 mt-0.5">Reaction & relevance rating</div>
              </div>
              <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4">
                <div className="text-xs text-slate-400">L2 Learning Delta</div>
                <div className="text-2xl font-bold text-emerald-400 mt-1">+35%</div>
                <div className="text-[11px] text-slate-500 mt-0.5">Post vs Pre-quiz score</div>
              </div>
              <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4">
                <div className="text-xs text-slate-400">L3 Behavior Change</div>
                <div className="text-2xl font-bold text-amber-400 mt-1">4.6 / 5.0</div>
                <div className="text-[11px] text-slate-500 mt-0.5">30-day supervisor audit</div>
              </div>
              <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4">
                <div className="text-xs text-slate-400">L4 Business ROI</div>
                <div className="text-2xl font-bold text-cyan-400 mt-1">-28%</div>
                <div className="text-[11px] text-slate-500 mt-0.5">Site incident reduction</div>
              </div>
            </div>

            <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-indigo-400" /> Master Site Training Calendar (PSARA & Security SOPs)
                </h3>
                <button
                  onClick={async () => {
                    await TrainingEffectivenessService.scheduleCalendarEvent(
                      session,
                      companyId,
                      'TRN-PSARA-01',
                      'PSARA Fire Safety & Emergency Evacuation Drill',
                      'Captain Verma (Ex-Army)',
                      'EXTERNAL_VENDOR',
                      'CLASSROOM',
                      new Date().toISOString(),
                      new Date(Date.now() + 86400000).toISOString(),
                      30,
                      'Mumbai West Regional Training Center'
                    );
                    setSuccessMessage('Scheduled PSARA drill in Master Training Calendar.');
                    loadTabData();
                  }}
                  className="py-2 px-3 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" /> Schedule Session
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-900/80 text-slate-400 uppercase text-[10px]">
                    <tr>
                      <th className="p-3">Program Title</th>
                      <th className="p-3">Trainer</th>
                      <th className="p-3">Mode</th>
                      <th className="p-3">Capacity</th>
                      <th className="p-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/50">
                    <tr className="hover:bg-slate-800/40">
                      <td className="p-3 font-medium text-white">PSARA Mandatory Security Refresher</td>
                      <td className="p-3">Capt. R. K. Nair</td>
                      <td className="p-3">Classroom / Practical</td>
                      <td className="p-3">25 / 30</td>
                      <td className="p-3"><span className="px-2 py-0.5 bg-emerald-950 text-emerald-400 rounded text-[10px]">SCHEDULED</span></td>
                    </tr>
                    <tr className="hover:bg-slate-800/40">
                      <td className="p-3 font-medium text-white">CCTV Surveillance & Intrusion Detection</td>
                      <td className="p-3">S. Kulkarni</td>
                      <td className="p-3">Virtual Live</td>
                      <td className="p-3">40 / 50</td>
                      <td className="p-3"><span className="px-2 py-0.5 bg-indigo-950 text-indigo-400 rounded text-[10px]">IN_PROGRESS</span></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: PHASE D - REWARDS & RECOGNITION */}
        {activeTab === 'PHASE_D_REWARDS' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Spot Award Nomination */}
            <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-6">
              <h2 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
                <Award className="w-5 h-5 text-amber-400" /> Spot Award Nomination
              </h2>
              <p className="text-xs text-slate-400 mb-4">Rewards are converted directly to monthly payroll variable bonuses.</p>

              <button
                onClick={async () => {
                  await RewardsRecognitionService.submitNomination(
                    session,
                    companyId,
                    'EMP-001',
                    'Suresh Patil',
                    'SECURITY',
                    'SAFETY_HERO',
                    'Zero breach during night patrol audit',
                    1000,
                    session.siteId || 'MAIN_FACILITY'
                  );
                  setSuccessMessage('Submitted Spot Award nomination for ₹1,000 (1000 pts).');
                  loadTabData();
                }}
                className="w-full py-2.5 px-4 bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-2 mb-4"
              >
                <Sparkles className="w-4 h-4" /> Nominate Safety Hero (1000 Pts)
              </button>

              <button
                onClick={async () => {
                  await RewardsRecognitionService.sendPeerKudos(
                    session,
                    companyId,
                    'EMP-002',
                    'Ajay Shinde',
                    'INTEGRITY',
                    'Returned lost high-value asset to client management with full integrity.'
                  );
                  setSuccessMessage('Sent "Shield of Integrity" Peer Badge (+50 pts).');
                  loadTabData();
                }}
                className="w-full py-2.5 px-4 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-semibold rounded-lg flex items-center justify-center gap-2"
              >
                <Gift className="w-4 h-4" /> Send Peer Kudos Badge (50 Pts)
              </button>
            </div>

            {/* Peer Recognition Wall */}
            <div className="lg:col-span-2 bg-slate-800/60 border border-slate-700 rounded-xl p-6">
              <h3 className="text-base font-bold text-white mb-2 flex items-center gap-2">
                <Star className="w-5 h-5 text-amber-400 fill-amber-400" /> Live Recognition Wall & Badges
              </h3>
              <p className="text-xs text-slate-400 mb-4">Peer-to-peer appreciation badges and spot awards across sites</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-4 bg-slate-900/80 border border-slate-700 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="p-1.5 bg-emerald-500/10 text-emerald-400 rounded-lg font-bold text-xs">🛡️ Shield of Integrity</span>
                    <span className="text-[10px] text-slate-500 ml-auto">+50 Pts</span>
                  </div>
                  <p className="text-xs text-slate-300 italic mb-2">"Returned lost client visitor pass and laptop immediately."</p>
                  <div className="text-[10px] text-slate-400">Awarded to <strong className="text-white">Ajay Shinde</strong> by Supervisor</div>
                </div>

                <div className="p-4 bg-slate-900/80 border border-slate-700 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="p-1.5 bg-amber-500/10 text-amber-400 rounded-lg font-bold text-xs">🦅 Eagle Eye Vigilance</span>
                    <span className="text-[10px] text-slate-500 ml-auto">+50 Pts</span>
                  </div>
                  <p className="text-xs text-slate-300 italic mb-2">"Detected fence perimeter gap during 03:00 AM guard tour."</p>
                  <div className="text-[10px] text-slate-400">Awarded to <strong className="text-white">Rahul Patil</strong> by Site In-Charge</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
