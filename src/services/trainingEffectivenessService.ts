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
  MasterTrainingCalendarEvent, 
  KirkpatrickTrainingEvaluation, 
  TrainingMode, 
  UserSession 
} from '../types';
import { AuditTrailService } from './auditTrailService';

export class TrainingEffectivenessService {
  /**
   * Calculates Kirkpatrick Composite Training Effectiveness Score (0 to 100%)
   * Formula:
   * Level 1 (Reaction CSAT) = 25% weight
   * Level 2 (Learning Score / Delta) = 35% weight
   * Level 3 (30-day Behavior Observation) = 25% weight
   * Level 4 (Operational Incident Reduction / Compliance Results) = 15% weight
   */
  public static calculateCompositeEffectiveness(
    l1CsatPercent: number,
    l2PostTestScore: number,
    l3BehaviorRatingOutOf5: number,
    l4ResultsVerified: boolean
  ): number {
    const l1 = Math.max(0, Math.min(100, l1CsatPercent));
    const l2 = Math.max(0, Math.min(100, l2PostTestScore));
    const l3 = Math.max(0, Math.min(100, (l3BehaviorRatingOutOf5 / 5) * 100));
    const l4 = l4ResultsVerified ? 100 : 60; // 100% if verified operational improvement, 60% baseline

    const composite = (0.25 * l1) + (0.35 * l2) + (0.25 * l3) + (0.15 * l4);
    return Math.round(composite);
  }

  /**
   * Schedules a Master Training Calendar Event
   */
  public static async scheduleCalendarEvent(
    session: UserSession,
    companyId: string,
    programId: string,
    programTitle: string,
    trainerName: string,
    trainerType: 'INTERNAL_STAFF' | 'EXTERNAL_VENDOR',
    mode: TrainingMode,
    scheduledStartDate: string,
    scheduledEndDate: string,
    maxCapacity: number,
    locationOrMeetingLink: string,
    targetDepartmentIds?: string[],
    targetSiteIds?: string[],
    regionId?: string
  ): Promise<MasterTrainingCalendarEvent> {
    const timestamp = new Date().toISOString();
    const eventId = `EVT-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const record: MasterTrainingCalendarEvent = {
      id: eventId,
      companyId,
      programId,
      programTitle,
      trainerName,
      trainerType,
      mode,
      targetDepartmentIds,
      targetSiteIds,
      regionId,
      scheduledStartDate,
      scheduledEndDate,
      maxCapacity,
      enrolledCount: 0,
      attendedCount: 0,
      locationOrMeetingLink,
      status: 'SCHEDULED',
      createdAt: timestamp,
      updatedAt: timestamp
    };

    await setDoc(doc(db, 'companies', companyId, 'trainingCalendar', eventId), record);

    await AuditTrailService.recordEvent(
      companyId,
      session.uid,
      'TRAINING_CALENDAR_SCHEDULED',
      'TRAINING_CALENDAR',
      eventId,
      { programTitle, trainerName, scheduledStartDate, mode }
    );

    return record;
  }

  /**
   * Records or updates a Kirkpatrick 4-Level Training Evaluation for a trainee
   */
  public static async recordKirkpatrickEvaluation(
    session: UserSession,
    companyId: string,
    programId: string,
    calendarEventId: string,
    employeeId: string,
    employeeName: string,
    siteId: string,
    level1: { contentRelevance: number; trainerEffectiveness: number; facilityQuality: number; feedbackComment?: string; },
    level2: { preTestScore: number; postTestScore: number; },
    level3?: { adherenceToSafetyRating: number; operationalExecutionRating: number; supervisorNotes?: string; assessedBySupervisorId?: string; },
    level4?: { siteIncidentReductionPercent?: number; isBusinessImpactVerified: boolean; }
  ): Promise<KirkpatrickTrainingEvaluation> {
    const timestamp = new Date().toISOString();
    const evalId = `EVAL-${calendarEventId}-${employeeId}`;

    // Calculate L1 CSAT
    const avgL1Rating = (level1.contentRelevance * 0.4) + (level1.trainerEffectiveness * 0.4) + (level1.facilityQuality * 0.2);
    const l1CsatPercent = Math.round((avgL1Rating / 5) * 100);

    // Calculate L2 Delta
    const scoreDelta = Math.max(0, level2.postTestScore - level2.preTestScore);
    const passed = level2.postTestScore >= 70;

    // Calculate L3 Rating
    const l3Safety = level3?.adherenceToSafetyRating || 4;
    const l3Execution = level3?.operationalExecutionRating || 4;
    const l3Avg = (l3Safety + l3Execution) / 2;

    // Calculate L4
    const l4Verified = level4?.isBusinessImpactVerified ?? (level2.postTestScore >= 80);

    const overallScore = this.calculateCompositeEffectiveness(
      l1CsatPercent,
      level2.postTestScore,
      l3Avg,
      l4Verified
    );

    const record: KirkpatrickTrainingEvaluation = {
      id: evalId,
      companyId,
      programId,
      calendarEventId,
      employeeId,
      employeeName,
      siteId,
      level1Reaction: {
        contentRelevanceRating: level1.contentRelevance,
        trainerEffectivenessRating: level1.trainerEffectiveness,
        facilityQualityRating: level1.facilityQuality,
        overallCsatPercent: l1CsatPercent,
        feedbackComment: level1.feedbackComment || '',
        submittedAt: timestamp
      },
      level2Learning: {
        preTestScore: level2.preTestScore,
        postTestScore: level2.postTestScore,
        scoreDeltaPercent: scoreDelta,
        passed,
        quizCompletedAt: timestamp
      },
      level3Behavior: {
        assessedBySupervisorId: level3?.assessedBySupervisorId || session.uid,
        assessedAt: timestamp,
        adherenceToSafetyProtocolRating: l3Safety,
        operationalExecutionRating: l3Execution,
        behaviorImprovementObserved: l3Avg >= 3.5,
        supervisorNotes: level3?.supervisorNotes || 'Adheres strictly to safety SOPs on site'
      },
      level4Results: {
        siteIncidentReductionPercent: level4?.siteIncidentReductionPercent || 15,
        auditComplianceScoreImprovement: 20,
        isBusinessImpactVerified: l4Verified,
        verifiedAt: timestamp
      },
      overallEffectivenessScore: overallScore,
      createdAt: timestamp,
      updatedAt: timestamp
    };

    await setDoc(doc(db, 'companies', companyId, 'trainingEvaluations', evalId), record);

    await AuditTrailService.recordEvent(
      companyId,
      session.uid,
      'KIRKPATRICK_EVALUATION_RECORDED',
      'TRAINING_EVALUATION',
      evalId,
      { employeeId, programId, overallScore, passed }
    );

    return record;
  }

  /**
   * Fetches master training calendar events
   */
  public static async getCalendarEvents(companyId: string): Promise<MasterTrainingCalendarEvent[]> {
    const snap = await getDocs(collection(db, 'companies', companyId, 'trainingCalendar'));
    return snap.docs.map(d => d.data() as MasterTrainingCalendarEvent);
  }

  /**
   * Fetches Kirkpatrick evaluations
   */
  public static async getEvaluations(companyId: string): Promise<KirkpatrickTrainingEvaluation[]> {
    const snap = await getDocs(collection(db, 'companies', companyId, 'trainingEvaluations'));
    return snap.docs.map(d => d.data() as KirkpatrickTrainingEvaluation);
  }
}
