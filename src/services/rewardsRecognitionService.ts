import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  updateDoc 
} from 'firebase/firestore';
import { db } from '../firebase';
import { 
  RewardNominationRecord, 
  PeerRecognitionBadge, 
  EmployeeRewardWalletRecord, 
  AwardType, 
  UserSession 
} from '../types';
import { AuditTrailService } from './auditTrailService';

export class RewardsRecognitionService {
  public static readonly POINTS_TO_INR_CONVERSION_RATE = 1.0; // 1 Point = INR 1

  /**
   * Submits a formal Reward / Spot Award nomination
   */
  public static async submitNomination(
    session: UserSession,
    companyId: string,
    nomineeEmployeeId: string,
    nomineeName: string,
    nomineeDepartment: string,
    awardType: AwardType,
    citationReason: string,
    pointsAwarded: number,
    nomineeSiteId?: string
  ): Promise<RewardNominationRecord> {
    const timestamp = new Date().toISOString();
    const nominationId = `RWD-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const cashEquivalentInr = Math.round(pointsAwarded * this.POINTS_TO_INR_CONVERSION_RATE);

    const record: RewardNominationRecord = {
      id: nominationId,
      companyId,
      awardType,
      nomineeEmployeeId,
      nomineeName,
      nomineeDepartment,
      nomineeSiteId,
      nominatedByEmployeeId: session.uid,
      nominatedByName: session.name || 'Supervisor',
      citationReason,
      pointsAwarded,
      cashEquivalentInr,
      status: 'SUBMITTED',
      createdAt: timestamp,
      updatedAt: timestamp
    };

    await setDoc(doc(db, 'companies', companyId, 'rewardNominations', nominationId), record);

    await AuditTrailService.recordEvent(
      companyId,
      session.uid,
      'REWARD_NOMINATED',
      'REWARDS_RECOGNITION',
      nominationId,
      { nomineeEmployeeId, awardType, pointsAwarded, cashEquivalentInr }
    );

    return record;
  }

  /**
   * Approves a reward nomination and credits points to employee wallet + prepares payroll adjustment
   */
  public static async approveNomination(
    session: UserSession,
    companyId: string,
    nominationId: string,
    payrollBatchMonth: string = new Date().toISOString().slice(0, 7) // e.g. "2026-09"
  ): Promise<RewardNominationRecord> {
    const docRef = doc(db, 'companies', companyId, 'rewardNominations', nominationId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) throw new Error('Reward nomination not found');

    const timestamp = new Date().toISOString();
    const nomination = snap.data() as RewardNominationRecord;

    const updated: Partial<RewardNominationRecord> = {
      status: 'APPROVED',
      approvedBy: session.uid,
      approvedAt: timestamp,
      payrollBatchMonth,
      updatedAt: timestamp
    };

    await updateDoc(docRef, updated);

    // Credit to Employee Wallet and update pending payroll variable disbursement
    await this.creditEmployeeWallet(
      companyId,
      nomination.nomineeEmployeeId,
      nomination.nomineeName,
      nomination.pointsAwarded,
      nomination.cashEquivalentInr
    );

    await AuditTrailService.recordEvent(
      companyId,
      session.uid,
      'REWARD_APPROVED',
      'REWARDS_RECOGNITION',
      nominationId,
      { nomineeEmployeeId: nomination.nomineeEmployeeId, points: nomination.pointsAwarded, cashInr: nomination.cashEquivalentInr }
    );

    return { ...nomination, ...updated };
  }

  /**
   * Awards a Peer Recognition Badge (Peer-to-Peer Kudos)
   */
  public static async sendPeerKudos(
    session: UserSession,
    companyId: string,
    recipientEmployeeId: string,
    recipientName: string,
    badgeCode: 'INTEGRITY' | 'VIGILANCE' | 'TEAMWORK' | 'CUSTOMER_FIRST' | 'PROBLEM_SOLVER',
    message: string
  ): Promise<PeerRecognitionBadge> {
    const timestamp = new Date().toISOString();
    const badgeId = `BDG-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const pointsGiven = 50; // 50 kudos points per badge

    const badgeNames: Record<string, string> = {
      INTEGRITY: 'Shield of Integrity',
      VIGILANCE: 'Eagle Eye Vigilance',
      TEAMWORK: 'Ultimate Team Player',
      CUSTOMER_FIRST: 'Client Champion',
      PROBLEM_SOLVER: 'Master Resolver'
    };

    const record: PeerRecognitionBadge = {
      id: badgeId,
      companyId,
      badgeCode,
      badgeName: badgeNames[badgeCode] || badgeCode,
      senderEmployeeId: session.uid,
      senderName: session.name || 'Colleague',
      recipientEmployeeId,
      recipientName,
      message,
      pointsGiven,
      awardedAt: timestamp
    };

    await setDoc(doc(db, 'companies', companyId, 'recognitionBadges', badgeId), record);

    // Credit recipient's wallet
    await this.creditEmployeeWallet(
      companyId,
      recipientEmployeeId,
      recipientName,
      pointsGiven,
      pointsGiven * this.POINTS_TO_INR_CONVERSION_RATE,
      badgeNames[badgeCode]
    );

    return record;
  }

  /**
   * Credits points & cash equivalent to employee reward wallet
   */
  public static async creditEmployeeWallet(
    companyId: string,
    employeeId: string,
    employeeName: string,
    points: number,
    cashInr: number,
    newBadgeName?: string
  ): Promise<EmployeeRewardWalletRecord> {
    const timestamp = new Date().toISOString();
    const walletRef = doc(db, 'companies', companyId, 'rewardWallets', `WLT-${employeeId}`);
    const snap = await getDoc(walletRef);

    let wallet: EmployeeRewardWalletRecord;

    if (snap.exists()) {
      const existing = snap.data() as EmployeeRewardWalletRecord;
      const badges = existing.badgesEarned || [];
      if (newBadgeName && !badges.includes(newBadgeName)) {
        badges.push(newBadgeName);
      }

      wallet = {
        ...existing,
        totalPointsEarned: existing.totalPointsEarned + points,
        availablePointsBalance: existing.availablePointsBalance + points,
        totalCashEquivEarnedInr: existing.totalCashEquivEarnedInr + cashInr,
        pendingPayrollDisbursementInr: existing.pendingPayrollDisbursementInr + cashInr,
        badgesEarned: badges,
        lastUpdated: timestamp
      };
    } else {
      wallet = {
        id: `WLT-${employeeId}`,
        companyId,
        employeeId,
        employeeName,
        totalPointsEarned: points,
        totalPointsRedeemed: 0,
        availablePointsBalance: points,
        totalCashEquivEarnedInr: cashInr,
        pendingPayrollDisbursementInr: cashInr,
        badgesEarned: newBadgeName ? [newBadgeName] : [],
        lastUpdated: timestamp
      };
    }

    await setDoc(walletRef, wallet);
    return wallet;
  }

  /**
   * Fetches employee reward wallet
   */
  public static async getEmployeeWallet(companyId: string, employeeId: string): Promise<EmployeeRewardWalletRecord | null> {
    const snap = await getDoc(doc(db, 'companies', companyId, 'rewardWallets', `WLT-${employeeId}`));
    if (!snap.exists()) return null;
    return snap.data() as EmployeeRewardWalletRecord;
  }

  /**
   * Fetches all reward nominations for the tenant
   */
  public static async getNominations(companyId: string): Promise<RewardNominationRecord[]> {
    const snap = await getDocs(collection(db, 'companies', companyId, 'rewardNominations'));
    return snap.docs.map(d => d.data() as RewardNominationRecord);
  }

  /**
   * Fetches recent peer badges for the tenant
   */
  public static async getRecentBadges(companyId: string): Promise<PeerRecognitionBadge[]> {
    const snap = await getDocs(collection(db, 'companies', companyId, 'recognitionBadges'));
    return snap.docs.map(d => d.data() as PeerRecognitionBadge);
  }
}
