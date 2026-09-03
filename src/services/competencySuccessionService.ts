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
  CompetencySkillDefinition, 
  EmployeeSkillsMatrixRecord, 
  AssessedSkillItem, 
  SuccessionPlanRecord, 
  SuccessionNominee, 
  NineBoxGridPosition, 
  SuccessionReadiness, 
  CareerProgressionTrackRecord,
  SkillProficiencyLevel,
  UserSession 
} from '../types';
import { AuditTrailService } from './auditTrailService';

export class CompetencySuccessionService {
  /**
   * Helper: Maps Performance Rating (1-3) and Potential Rating (1-3) into standard 9-Box Grid Position
   */
  public static calculateNineBoxPosition(performance: number, potential: number): NineBoxGridPosition {
    const perfClamped = Math.max(1, Math.min(3, Math.round(performance)));
    const potClamped = Math.max(1, Math.min(3, Math.round(potential)));

    if (perfClamped === 3 && potClamped === 3) return '3_3_STAR_TALENT';
    if (perfClamped === 3 && potClamped === 2) return '3_2_HIGH_PERFORMER';
    if (perfClamped === 3 && potClamped === 1) return '3_1_TRUSTED_PRO';
    if (perfClamped === 2 && potClamped === 3) return '2_3_HIGH_POTENTIAL';
    if (perfClamped === 2 && potClamped === 2) return '2_2_CORE_PLAYER';
    if (perfClamped === 2 && potClamped === 1) return '2_1_EFFECTIVE';
    if (perfClamped === 1 && potClamped === 3) return '1_3_POTENTIAL_GEM';
    if (perfClamped === 1 && potClamped === 2) return '1_2_INCONSISTENT';
    return '1_1_HIGH_RISK';
  }

  /**
   * Helper: Calculates Bench Strength Score (0 to 100%) for a critical role
   * Weightage: Ready Now (100%), Ready in 1 Year (60%), Ready in 2 Years (30%)
   */
  public static calculateBenchStrength(nominees: SuccessionNominee[], targetBenchDepth: number = 2): number {
    if (!nominees || nominees.length === 0) return 0;

    let totalWeightedScore = 0;
    for (const nominee of nominees) {
      if (nominee.readiness === 'READY_NOW') totalWeightedScore += 1.0;
      else if (nominee.readiness === 'READY_1_YEAR') totalWeightedScore += 0.6;
      else if (nominee.readiness === 'READY_2_YEAR') totalWeightedScore += 0.3;
      else if (nominee.readiness === 'EMERGENCY_ONLY') totalWeightedScore += 0.2;
    }

    const calculatedPercent = (totalWeightedScore / targetBenchDepth) * 100;
    return Math.min(100, Math.round(calculatedPercent));
  }

  /**
   * Evaluates and updates an employee's skills matrix against role benchmark requirements
   */
  public static async assessEmployeeSkills(
    session: UserSession,
    companyId: string,
    employeeId: string,
    employeeName: string,
    designation: string,
    departmentId: string,
    assessments: Array<{ skillId: string; skillName: string; category: any; currentProficiency: SkillProficiencyLevel; requiredProficiency: SkillProficiencyLevel; evidenceNotes?: string; }>,
    siteId?: string
  ): Promise<EmployeeSkillsMatrixRecord> {
    const timestamp = new Date().toISOString();
    let totalProficiencyPct = 0;
    let gapsCount = 0;
    const trainingNeeds: string[] = [];

    const assessedSkills: AssessedSkillItem[] = assessments.map(item => {
      const gap = Math.max(0, item.requiredProficiency - item.currentProficiency);
      if (gap > 0) {
        gapsCount++;
        trainingNeeds.push(`${item.skillName} (Needs Level ${item.requiredProficiency}, Currently ${item.currentProficiency})`);
      }
      const itemScore = (item.currentProficiency / item.requiredProficiency) * 100;
      totalProficiencyPct += Math.min(100, itemScore);

      return {
        skillId: item.skillId,
        skillName: item.skillName,
        category: item.category,
        currentProficiency: item.currentProficiency,
        requiredProficiency: item.requiredProficiency,
        gap,
        evidenceNotes: item.evidenceNotes || '',
        lastAssessedAt: timestamp,
        assessedBy: session.uid || 'SYSTEM'
      };
    });

    const overallScore = assessments.length > 0 ? Math.round(totalProficiencyPct / assessments.length) : 0;
    const matrixId = `SKM-${employeeId}`;

    const record: EmployeeSkillsMatrixRecord = {
      id: matrixId,
      companyId,
      employeeId,
      employeeName,
      designation,
      departmentId,
      siteId,
      assessedSkills,
      overallCompetencyScore: overallScore,
      skillsGapCount: gapsCount,
      identifiedTrainingNeeds: trainingNeeds,
      updatedAt: timestamp
    };

    await setDoc(doc(db, 'companies', companyId, 'skillsMatrix', matrixId), record);

    await AuditTrailService.recordEvent(
      companyId,
      session.uid,
      'COMPETENCY_EVALUATED',
      'SKILLS_MATRIX',
      matrixId,
      { employeeId, overallScore, gapsCount }
    );

    return record;
  }

  /**
   * Fetches employee skills matrix
   */
  public static async getEmployeeSkillsMatrix(companyId: string, employeeId: string): Promise<EmployeeSkillsMatrixRecord | null> {
    const snap = await getDoc(doc(db, 'companies', companyId, 'skillsMatrix', `SKM-${employeeId}`));
    if (!snap.exists()) return null;
    return snap.data() as EmployeeSkillsMatrixRecord;
  }

  /**
   * Creates or updates a succession plan for a critical leadership or site role
   */
  public static async saveSuccessionPlan(
    session: UserSession,
    companyId: string,
    criticalRoleTitle: string,
    departmentId: string,
    nominees: SuccessionNominee[],
    planId?: string,
    siteId?: string,
    currentIncumbentEmployeeId?: string,
    currentIncumbentName?: string
  ): Promise<SuccessionPlanRecord> {
    const timestamp = new Date().toISOString();
    const id = planId || `SUC-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const benchScore = this.calculateBenchStrength(nominees, 2);

    const status: 'ACTIVE' | 'AT_RISK' | 'UNDER_REVIEW' = 
      benchScore >= 80 ? 'ACTIVE' : benchScore >= 40 ? 'UNDER_REVIEW' : 'AT_RISK';

    const record: SuccessionPlanRecord = {
      id,
      companyId,
      criticalRoleTitle,
      departmentId,
      siteId,
      currentIncumbentEmployeeId,
      currentIncumbentName,
      benchStrengthScore: benchScore,
      nominees,
      status,
      lastReviewedAt: timestamp,
      reviewedBy: session.uid,
      createdAt: timestamp,
      updatedAt: timestamp
    };

    await setDoc(doc(db, 'companies', companyId, 'successionPlans', id), record);

    await AuditTrailService.recordEvent(
      companyId,
      session.uid,
      'SUCCESSION_PLAN_UPDATED',
      'SUCCESSION',
      id,
      { criticalRoleTitle, benchScore, status, nomineeCount: nominees.length }
    );

    return record;
  }

  /**
   * Fetches all succession plans for the tenant
   */
  public static async getSuccessionPlans(companyId: string): Promise<SuccessionPlanRecord[]> {
    const snap = await getDocs(collection(db, 'companies', companyId, 'successionPlans'));
    return snap.docs.map(d => d.data() as SuccessionPlanRecord);
  }
}
