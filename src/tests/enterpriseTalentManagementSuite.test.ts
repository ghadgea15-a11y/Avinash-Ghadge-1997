import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CompetencySuccessionService } from '../services/competencySuccessionService';
import { OfferOnboardingService } from '../services/offerOnboardingService';
import { TrainingEffectivenessService } from '../services/trainingEffectivenessService';
import { RewardsRecognitionService } from '../services/rewardsRecognitionService';
import { SuccessionNominee } from '../types/talentManagement';

// Mock Firestore
vi.mock('../firebase', () => ({
  db: {}
}));

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  doc: vi.fn((_db, ...paths) => paths.join('/')),
  setDoc: vi.fn().mockResolvedValue(true),
  getDoc: vi.fn().mockResolvedValue({
    exists: () => true,
    data: () => ({
      id: 'mock-id',
      status: 'SUBMITTED',
      pointsAwarded: 500,
      cashEquivalentInr: 500,
      nomineeEmployeeId: 'EMP-001',
      nomineeName: 'Ajay Shinde',
      candidateId: 'CAND-001',
      candidateName: 'Ajay Shinde',
      proposedJoiningDate: '2026-10-01',
      siteId: 'SITE-MUMBAI-01',
      departmentId: 'SECURITY'
    })
  }),
  getDocs: vi.fn().mockResolvedValue({
    empty: false,
    docs: [
      {
        id: 'doc-1',
        data: () => ({ id: 'doc-1' })
      }
    ]
  }),
  query: vi.fn(),
  where: vi.fn(),
  updateDoc: vi.fn().mockResolvedValue(true)
}));

vi.mock('../services/auditTrailService', () => ({
  AuditTrailService: {
    recordEvent: vi.fn().mockResolvedValue('AUDIT-123')
  }
}));

describe('ENTERPRISE TALENT MANAGEMENT SUITE (PHASE A - D)', () => {
  const mockSession: any = {
    uid: 'HR-USER-001',
    name: 'HR Director',
    role: 'HR_ADMIN',
    authorityLevel: 'A3_HR_HEAD',
    companyId: 'COMP-ACME-01'
  };

  // ==========================================================================
  // PHASE A: COMPETENCY MODEL & 9-BOX SUCCESSION PLANNING
  // ==========================================================================
  describe('Phase A: 9-Box Grid & Succession Bench Calculation', () => {
    it('1. correctly maps Performance (1-3) and Potential (1-3) to the 9 standard box categories', () => {
      expect(CompetencySuccessionService.calculateNineBoxPosition(3, 3)).toBe('3_3_STAR_TALENT');
      expect(CompetencySuccessionService.calculateNineBoxPosition(3, 2)).toBe('3_2_HIGH_PERFORMER');
      expect(CompetencySuccessionService.calculateNineBoxPosition(3, 1)).toBe('3_1_TRUSTED_PRO');
      expect(CompetencySuccessionService.calculateNineBoxPosition(2, 3)).toBe('2_3_HIGH_POTENTIAL');
      expect(CompetencySuccessionService.calculateNineBoxPosition(2, 2)).toBe('2_2_CORE_PLAYER');
      expect(CompetencySuccessionService.calculateNineBoxPosition(2, 1)).toBe('2_1_EFFECTIVE');
      expect(CompetencySuccessionService.calculateNineBoxPosition(1, 3)).toBe('1_3_POTENTIAL_GEM');
      expect(CompetencySuccessionService.calculateNineBoxPosition(1, 2)).toBe('1_2_INCONSISTENT');
      expect(CompetencySuccessionService.calculateNineBoxPosition(1, 1)).toBe('1_1_HIGH_RISK');
    });

    it('2. calculates weighted succession bench strength based on candidate readiness tiers', () => {
      const nominees: SuccessionNominee[] = [
        {
          employeeId: 'EMP-01',
          employeeName: 'Rahul Patil',
          currentRole: 'Assistant Site In-Charge',
          performanceRating: 3,
          potentialRating: 3,
          nineBoxPosition: '3_3_STAR_TALENT',
          readiness: 'READY_NOW', // 1.0 weight
          retentionRisk: 'LOW',
          developmentPlanNotes: 'Lead high-security site audits',
          nominatedAt: '2026-09-01',
          nominatedBy: 'HR-USER-001'
        },
        {
          employeeId: 'EMP-02',
          employeeName: 'Sunil Ghadge',
          currentRole: 'Shift Supervisor',
          performanceRating: 3,
          potentialRating: 2,
          nineBoxPosition: '3_2_HIGH_PERFORMER',
          readiness: 'READY_1_YEAR', // 0.6 weight
          retentionRisk: 'LOW',
          developmentPlanNotes: 'Complete advanced PSARA L4 certification',
          nominatedAt: '2026-09-01',
          nominatedBy: 'HR-USER-001'
        }
      ];

      // Target depth = 2. Total weighted score = 1.0 + 0.6 = 1.6 / 2.0 = 80%
      const benchScore = CompetencySuccessionService.calculateBenchStrength(nominees, 2);
      expect(benchScore).toBe(80);
    });
  });

  // ==========================================================================
  // PHASE B: RECRUITMENT ATS - OFFER LETTER & CTC BREAKDOWN
  // ==========================================================================
  describe('Phase B: Offer Letter Statutory CTC Breakdown & Day-1 Onboarding', () => {
    it('3. accurately calculates Indian statutory CTC breakdown (Basic 50%, HRA 25%, PF 12%, ESI, Gratuity)', () => {
      const grossMonthly = 30000;
      const variableBonusAnnual = 50000;

      const ctc = OfferOnboardingService.calculateCtcBreakdown(grossMonthly, variableBonusAnnual);

      expect(ctc.grossMonthly).toBe(30000);
      expect(ctc.basicMonthly).toBe(15000); // 50% of 30,000
      expect(ctc.hraMonthly).toBe(7500);    // 25% of 30,000
      expect(ctc.employerPfMonthly).toBe(1800); // 12% of 15,000
      expect(ctc.employerEsiMonthly).toBe(0); // Gross > 21,000 so ESI is 0
      expect(ctc.gratuityMonthly).toBe(Math.round(15000 * 0.0481)); // 4.81% of basic

      // Annual CTC should include 12 months CTC + variable bonus
      expect(ctc.annualCtc).toBe((ctc.monthlyCtc * 12) + 50000);
      expect(ctc.netTakeHomeEstimatedMonthly).toBeGreaterThan(25000);
    });

    it('4. applies ESI for gross salary <= 21,000 INR', () => {
      const ctc = OfferOnboardingService.calculateCtcBreakdown(18000, 0);
      expect(ctc.employerEsiMonthly).toBe(Math.round(18000 * 0.0325)); // 3.25%
      expect(ctc.basicMonthly).toBe(9000);
    });
  });

  // ==========================================================================
  // PHASE C: LEARNING MANAGEMENT - KIRKPATRICK 4-LEVEL EFFECTIVENESS
  // ==========================================================================
  describe('Phase C: Kirkpatrick 4-Level Training Effectiveness Model', () => {
    it('5. computes weighted Kirkpatrick composite effectiveness index (L1 25%, L2 35%, L3 25%, L4 15%)', () => {
      const l1Csat = 90;        // 90%
      const l2PostTest = 80;    // 80%
      const l3BehaviorRating = 4.5; // 4.5 / 5 = 90%
      const l4Verified = true;  // 100%

      // Expected: (0.25 * 90) + (0.35 * 80) + (0.25 * 90) + (0.15 * 100)
      // = 22.5 + 28.0 + 22.5 + 15.0 = 88%
      const score = TrainingEffectivenessService.calculateCompositeEffectiveness(
        l1Csat,
        l2PostTest,
        l3BehaviorRating,
        l4Verified
      );

      expect(score).toBe(88);
    });
  });

  // ==========================================================================
  // PHASE D: REWARDS & RECOGNITION (R&R) AND PAYROLL SYNC ENGINE
  // ==========================================================================
  describe('Phase D: Rewards, Recognition Wallet & Direct Payroll Incentive Bridge', () => {
    it('6. credits points to employee wallet and queues cash equivalent for monthly payroll disbursement', async () => {
      const nomination = await RewardsRecognitionService.submitNomination(
        mockSession,
        'COMP-ACME-01',
        'EMP-001',
        'Ajay Shinde',
        'SECURITY',
        'SAFETY_HERO',
        'Prevented unauthorized intruder breach at Gate 3 with zero escalation',
        500,
        'SITE-MUMBAI-01'
      );

      expect(nomination.awardType).toBe('SAFETY_HERO');
      expect(nomination.pointsAwarded).toBe(500);
      expect(nomination.cashEquivalentInr).toBe(500);
      expect(nomination.status).toBe('SUBMITTED');

      const approved = await RewardsRecognitionService.approveNomination(
        mockSession,
        'COMP-ACME-01',
        nomination.id,
        '2026-09'
      );

      expect(approved.status).toBe('APPROVED');
      expect(approved.payrollBatchMonth).toBe('2026-09');
    });

    it('7. sends peer-to-peer recognition kudos badge with points credited to wallet', async () => {
      const kudos = await RewardsRecognitionService.sendPeerKudos(
        mockSession,
        'COMP-ACME-01',
        'EMP-002',
        'Suresh Patil',
        'VIGILANCE',
        'Excellent vigilance during night shift patrol!'
      );

      expect(kudos.badgeCode).toBe('VIGILANCE');
      expect(kudos.badgeName).toBe('Eagle Eye Vigilance');
      expect(kudos.pointsGiven).toBe(50);
    });
  });
});
